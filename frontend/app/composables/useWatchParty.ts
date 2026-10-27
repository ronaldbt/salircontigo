import type { WatchState } from '#shared/types'

type Ice = RTCIceCandidateInit

function peerConfig(): RTCConfiguration {
  return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
}

function isLocal() {
  if (!import.meta.client) return false
  const host = location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function pickMime(stream: MediaStream) {
  const hasAudio = stream.getAudioTracks().length > 0
  const types = hasAudio
    ? ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8', 'video/webm']
    : ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm']
  return types.find(type => MediaRecorder.isTypeSupported(type) && MediaSource.isTypeSupported(type)) || ''
}

function bytesFrom(data: string) {
  const raw = atob(data)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

function waitForIce(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, 4000)
    peer.addEventListener('icegatheringstatechange', () => {
      if (peer.iceGatheringState === 'complete') {
        window.clearTimeout(timer)
        resolve()
      }
    })
  })
}

export function useWatchParty(state: Ref<WatchState | null>) {
  const remoteVideo = ref<HTMLVideoElement | null>(null)
  const sharing = ref(false)
  const needsSound = ref(false)
  const linkState = ref('')
  const notice = ref('')
  const watching = ref(false)
  const localStream = ref<MediaStream | null>(null)
  const remoteStream = ref<MediaStream | null>(null)

  let pc: RTCPeerConnection | null = null
  let recorder: MediaRecorder | null = null
  let mediaUrl = ''
  let playerToken = 0
  let playerGeneration = -1
  let postedOfferFor = -1
  let answeredFor = -1
  let appliedAnswerFor = -1
  let seenIce = new Set<number>()
  let iceQueue: Ice[] = []
  let busy = false
  let timer = 0

  function role() {
    return state.value?.role === 'host' || state.value?.role === 'guest' ? state.value.role : ''
  }

  function teardownPeer() {
    pc?.close()
    pc = null
    iceQueue = []
    remoteStream.value = null
  }

  function stopRecorder() {
    const current = recorder
    recorder = null
    if (!current || current.state === 'inactive') return
    current.ondataavailable = null
    current.stop()
  }

  function stopPlayer() {
    playerToken += 1
    playerGeneration = -1
    watching.value = false
    const video = remoteVideo.value
    if (video && mediaUrl) {
      video.removeAttribute('src')
      video.load()
    }
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl)
      mediaUrl = ''
    }
  }

  function stopLocal() {
    stopRecorder()
    localStream.value?.getTracks().forEach(track => track.stop())
    localStream.value = null
    sharing.value = false
  }

  function canTakeIce(generation: number) {
    if (!pc || !state.value) return false
    if (state.value.sharer === role()) return appliedAnswerFor === generation && Boolean(pc.remoteDescription)
    return answeredFor === generation && Boolean(pc.currentRemoteDescription)
  }

  async function flushIce(generation: number) {
    if (!canTakeIce(generation) || !pc) return
    const pending = iceQueue
    iceQueue = []
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate)
      }
      catch {
        // A late candidate from the previous try is safe to drop.
      }
    }
  }

  function createPc(generation: number) {
    teardownPeer()
    seenIce = new Set()
    const next = new RTCPeerConnection(peerConfig())
    next.onicecandidate = (event) => {
      if (!event.candidate || !state.value) return
      $fetch(`/api/watch/${state.value.code}/signal`, {
        method: 'POST',
        body: { kind: 'ice', payload: JSON.stringify(event.candidate.toJSON()), generation },
      }).catch(() => {})
    }
    next.ontrack = (event) => {
      remoteStream.value = event.streams[0] || new MediaStream([event.track])
    }
    next.onconnectionstatechange = () => {
      linkState.value = next.connectionState
    }
    next.oniceconnectionstatechange = () => {
      if (next.iceConnectionState === 'failed') notice.value = 'watchIceFailed'
      if (next.iceConnectionState === 'connected' || next.iceConnectionState === 'completed') {
        if (notice.value === 'watchIceFailed') notice.value = ''
      }
    }
    pc = next
    return next
  }

  async function publishOffer(generation: number) {
    const stream = localStream.value
    const code = state.value?.code
    if (!stream || !code) return
    const peer = createPc(generation)
    for (const track of stream.getTracks()) peer.addTrack(track, stream)
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    await waitForIce(peer)
    await $fetch(`/api/watch/${code}/signal`, {
      method: 'POST',
      body: { kind: 'offer', payload: peer.localDescription?.sdp || offer.sdp || '', generation },
    })
    postedOfferFor = generation
  }

  function publishRecording(code: string, stream: MediaStream) {
    stopRecorder()
    const mime = pickMime(stream)
    const next = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    next.ondataavailable = (event) => {
      if (!event.data.size) return
      void event.data.arrayBuffer().then((buffer) => {
        fetch(`/api/watch/${code}/live`, {
          method: 'POST',
          body: buffer,
          headers: {
            'content-type': 'application/octet-stream',
            'x-citasi-mime': next.mimeType || mime,
          },
        }).catch(() => {})
      })
    }
    next.start(250)
    recorder = next
  }

  function appendBuffer(source: SourceBuffer, bytes: Uint8Array) {
    return new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (error?: unknown) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        source.removeEventListener('updateend', done)
        source.removeEventListener('error', failAppend)
        if (error) reject(error)
        else resolve()
      }
      const done = () => finish()
      const failAppend = () => finish(new Error('append'))
      const timer = window.setTimeout(() => finish(new Error('append')), 4000)
      source.addEventListener('updateend', done)
      source.addEventListener('error', failAppend)
      try {
        source.appendBuffer(bytes)
      }
      catch (error) {
        finish(error)
      }
    })
  }

  async function trimBuffer(source: SourceBuffer, video: HTMLVideoElement) {
    if (source.updating || !source.buffered.length) return
    const start = source.buffered.start(0)
    if (video.currentTime - start < 12) return
    const removeEnd = video.currentTime - 4
    if (removeEnd <= start) return
    await new Promise<void>((resolve) => {
      source.addEventListener('updateend', () => resolve(), { once: true })
      try {
        source.remove(start, removeEnd)
      }
      catch {
        resolve()
      }
    })
  }

  async function playLocal(code: string, generation: number) {
    stopPlayer()
    const token = playerToken
    playerGeneration = generation
    const video = await waitForVideo()
    if (!video || token !== playerToken) return
    const media = new MediaSource()
    mediaUrl = URL.createObjectURL(media)
    video.srcObject = null
    video.src = mediaUrl
    await new Promise<void>((resolve) => {
      if (media.readyState === 'open') resolve()
      else media.addEventListener('sourceopen', () => resolve(), { once: true })
    })
    if (token !== playerToken || media.readyState !== 'open') return
    let source: SourceBuffer | null = null
    let after = -1
    let headerDone = false
    while (token === playerToken) {
      let page: { mime: string, header: string, chunks: { id: number, data: string }[] }
      try {
        const response = await fetch(`/api/watch/${code}/live?after=${after}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('live')
        page = await response.json()
      }
      catch {
        await new Promise(resolve => window.setTimeout(resolve, 400))
        continue
      }
      if (token !== playerToken) return
      const headerBytes = page.header ? bytesFrom(page.header) : null
      if (!source && headerBytes && headerBytes.length >= 64) {
        try {
          source = media.addSourceBuffer(page.mime || 'video/webm;codecs=vp8')
          try { source.mode = 'sequence' }
          catch { /* Segments mode still plays a fresh recording. */ }
        }
        catch {
          notice.value = 'watchShareFailed'
          return
        }
      }
      if (!source) continue
      try {
        if (headerBytes && !headerDone) {
          await appendBuffer(source, headerBytes)
          headerDone = true
          watching.value = true
          linkState.value = 'connected'
          await showPicture(video)
        }
        for (const chunk of page.chunks) {
          if (token !== playerToken) return
          await appendBuffer(source, bytesFrom(chunk.data))
          after = chunk.id
        }
        await trimBuffer(source, video)
      }
      catch {
        notice.value = 'watchShareFailed'
        return
      }
      if (!page.chunks.length) await new Promise(resolve => window.setTimeout(resolve, 200))
    }
  }

  function waitForVideo() {
    if (remoteVideo.value) return Promise.resolve(remoteVideo.value)
    return new Promise<HTMLVideoElement | null>((resolve) => {
      let tries = 0
      const timerId = window.setInterval(() => {
        tries += 1
        if (remoteVideo.value || tries > 20) {
          window.clearInterval(timerId)
          resolve(remoteVideo.value)
        }
      }, 50)
    })
  }

  async function showPicture(video: HTMLVideoElement) {
    video.muted = true
    try {
      await video.play()
      video.muted = false
      await video.play()
      needsSound.value = false
    }
    catch {
      video.muted = true
      needsSound.value = true
      await video.play().catch(() => {})
    }
  }

  async function answer(current: WatchState) {
    const peer = createPc(current.generation)
    await peer.setRemoteDescription({ type: 'offer', sdp: current.offer })
    const reply = await peer.createAnswer()
    await peer.setLocalDescription(reply)
    await waitForIce(peer)
    await $fetch(`/api/watch/${current.code}/signal`, {
      method: 'POST',
      body: { kind: 'answer', payload: peer.localDescription?.sdp || reply.sdp || '', generation: current.generation },
    })
    answeredFor = current.generation
    await flushIce(current.generation)
  }

  async function takeIce(current: WatchState) {
    const mine = role()
    for (const candidate of current.candidates) {
      if (candidate.sender === mine || seenIce.has(candidate.id)) continue
      seenIce.add(candidate.id)
      try {
        iceQueue.push(JSON.parse(candidate.payload) as Ice)
      }
      catch {
        seenIce.delete(candidate.id)
      }
    }
    await flushIce(current.generation)
  }

  async function sync(current: WatchState) {
    if (!current.joined) return
    if (isLocal()) {
      if (!current.sharer || current.sharer === role()) {
        if (!current.sharer) stopPlayer()
        return
      }
      stopLocal()
      if (playerGeneration !== current.generation) void playLocal(current.code, current.generation)
      return
    }
    if (!current.sharer) {
      teardownPeer()
      postedOfferFor = -1
      answeredFor = -1
      appliedAnswerFor = -1
      return
    }
    if (current.sharer !== role()) stopLocal()
    if (current.sharer === role() && localStream.value && current.answer && appliedAnswerFor !== current.generation && pc && postedOfferFor === current.generation) {
      await pc.setRemoteDescription({ type: 'answer', sdp: current.answer })
      appliedAnswerFor = current.generation
      await flushIce(current.generation)
    }
    else if (current.sharer !== role() && current.offer && answeredFor !== current.generation) {
      await answer(current)
    }
    await takeIce(current)
  }

  async function pull() {
    const code = state.value?.code
    if (!code || busy) return
    busy = true
    try {
      const next = await $fetch<WatchState>(`/api/watch/${code}`)
      state.value = next
      await sync(next)
    }
    catch {
      // The next poll retries.
    }
    finally {
      busy = false
    }
  }

  async function capture() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      notice.value = 'watchNoMedia'
      return null
    }
    try {
      return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    }
    catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotAllowedError' || name === 'AbortError') return null
      try {
        return await navigator.mediaDevices.getDisplayMedia({ video: true })
      }
      catch {
        return null
      }
    }
  }

  async function startShare() {
    notice.value = ''
    const code = state.value?.code
    if (!code) return
    stopPlayer()
    const stream = await capture()
    if (!stream) {
      if (!notice.value) notice.value = 'watchShareFailed'
      return
    }
    stopLocal()
    localStream.value = stream
    sharing.value = true
    const [videoTrack] = stream.getVideoTracks()
    if (videoTrack) videoTrack.onended = () => { void stopShare() }
    try {
      const started = await $fetch<{ generation: number }>(`/api/watch/${code}/signal`, {
        method: 'POST',
        body: { kind: 'start' },
      })
      postedOfferFor = -1
      if (isLocal()) publishRecording(code, stream)
      else await publishOffer(started.generation)
    }
    catch {
      stopLocal()
      notice.value = 'watchShareFailed'
    }
  }

  async function stopShare() {
    const code = state.value?.code
    stopLocal()
    teardownPeer()
    stopPlayer()
    if (!code) return
    await $fetch(`/api/watch/${code}/signal`, { method: 'POST', body: { kind: 'stop' } }).catch(() => {})
  }

  async function send(body: string) {
    const code = state.value?.code
    const text = body.trim()
    if (!code || !text) return
    await $fetch(`/api/watch/${code}/message`, { method: 'POST', body: { body: text } })
    await pull()
  }

  function enableSound() {
    const video = remoteVideo.value
    if (!video) return
    needsSound.value = false
    video.muted = false
    video.play().then(() => {
      needsSound.value = false
    }).catch(() => {
      needsSound.value = true
    })
  }

  function paintStage() {
    const video = remoteVideo.value
    if (!video) return
    if (isLocal() && !sharing.value) return
    const stream = sharing.value ? localStream.value : remoteStream.value
    if (mediaUrl && sharing.value) {
      URL.revokeObjectURL(mediaUrl)
      mediaUrl = ''
      video.removeAttribute('src')
    }
    video.srcObject = stream
    video.muted = sharing.value || needsSound.value
    if (!stream) return
    video.play().catch(() => {
      if (!sharing.value) needsSound.value = true
    })
  }

  watch([sharing, localStream, remoteStream, remoteVideo], paintStage)

  onMounted(() => {
    pull()
    timer = window.setInterval(pull, 1000)
  })

  onUnmounted(() => {
    window.clearInterval(timer)
    if (sharing.value) void stopShare()
    else {
      teardownPeer()
      stopPlayer()
    }
  })

  return {
    remoteVideo,
    sharing,
    needsSound,
    linkState,
    notice,
    watching,
    localStream,
    remoteStream,
    startShare,
    stopShare,
    send,
    enableSound,
    pull,
  }
}
