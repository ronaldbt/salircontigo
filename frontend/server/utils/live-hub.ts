type Chunk = { id: number, bytes: Uint8Array }

type Hub = {
  mime: string
  header: Uint8Array | null
  lead: Uint8Array
  chunks: Chunk[]
  next: number
  waiters: Array<() => void>
}

const rooms = new Map<string, Hub>()

function hub(code: string) {
  let current = rooms.get(code)
  if (!current) {
    current = { mime: '', header: null, lead: new Uint8Array(), chunks: [], next: 1, waiters: [] }
    rooms.set(code, current)
  }
  return current
}

function wake(current: Hub) {
  const pending = current.waiters.splice(0)
  for (const waiter of pending) waiter()
}

export function clearLive(code: string) {
  const current = rooms.get(code)
  if (!current) return
  current.mime = ''
  current.header = null
  current.lead = new Uint8Array()
  current.chunks = []
  current.next = 1
  wake(current)
}

function concat(left: Uint8Array, right: Uint8Array) {
  if (!left.length) return right
  const merged = new Uint8Array(left.length + right.length)
  merged.set(left, 0)
  merged.set(right, left.length)
  return merged
}

function isWebm(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
}

export function pushLive(code: string, bytes: Uint8Array, mime: string) {
  const current = hub(code)
  if (mime) current.mime = mime
  if (!current.header) {
    if (isWebm(bytes) && current.lead.length && current.lead.length < 32) current.lead = new Uint8Array()
    current.lead = concat(current.lead, bytes)
    if (current.lead.length < 2048 || !isWebm(current.lead)) return
    current.header = current.lead
    current.lead = new Uint8Array()
    wake(current)
    return
  }
  const payload = current.lead.length ? concat(current.lead, bytes) : bytes
  current.lead = new Uint8Array()
  current.chunks.push({ id: current.next, bytes: payload })
  current.next += 1
  if (current.chunks.length > 40) current.chunks.shift()
  wake(current)
}

function pack(current: Hub, after: number) {
  return {
    mime: current.mime,
    header: current.header ? Buffer.from(current.header).toString('base64') : '',
    chunks: current.chunks.filter(chunk => chunk.id > after).map(chunk => ({
      id: chunk.id,
      data: Buffer.from(chunk.bytes).toString('base64'),
    })),
  }
}

function hasFresh(current: Hub, after: number) {
  if (after < 0) return Boolean(current.header)
  return current.chunks.some(chunk => chunk.id > after)
}

export function readLive(code: string, after: number) {
  const current = hub(code)
  if (hasFresh(current, after)) return Promise.resolve(pack(current, after))
  return new Promise<ReturnType<typeof pack>>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const index = current.waiters.indexOf(finish)
      if (index >= 0) current.waiters.splice(index, 1)
      resolve(pack(rooms.get(code) || current, after))
    }
    const timer = setTimeout(finish, 8000)
    current.waiters.push(finish)
  })
}
