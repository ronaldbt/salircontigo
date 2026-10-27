<script setup lang="ts">
const emit = defineEmits<{ flee: [] }>()

const btn = ref<HTMLButtonElement | null>(null)
const fleeing = ref(false)
const pos = ref({ x: 16, y: 16 })
let last = 0

function jump(clientX: number, clientY: number, force = false) {
  const el = btn.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const dist = Math.hypot(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2))
  if (!force && dist > 96) return
  const now = Date.now()
  if (now - last < 180) return
  last = now

  const width = rect.width || 72
  const height = rect.height || 40
  const maxX = Math.max(12, window.innerWidth - width - 12)
  const maxY = Math.max(12, window.innerHeight - height - 12)
  const blockers = [...document.querySelectorAll('.btn-yes, .btn-wide, .btn-soft, a, input, select, button:not(.runaway)')]
    .map(node => node.getBoundingClientRect())
    .filter(box => box.width > 0 && box.height > 0)
  const blocked = (x: number, y: number) => blockers.some(box =>
    x < box.right + 16 && x + width > box.left - 16 && y < box.bottom + 16 && y + height > box.top - 16,
  )
  let x = rect.left
  let y = rect.top
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const hop = 120 + Math.random() * 50
    const angle = Math.random() * Math.PI * 2
    const nextX = Math.min(maxX, Math.max(12, rect.left + Math.cos(angle) * hop))
    const nextY = Math.min(maxY, Math.max(12, rect.top + Math.sin(angle) * hop))
    const fromPointer = Math.hypot(clientX - (nextX + width / 2), clientY - (nextY + height / 2))
    x = nextX
    y = nextY
    if (fromPointer > 90 && !blocked(nextX, nextY)) break
  }
  pos.value = { x, y }
  fleeing.value = true
  emit('flee')
}

function onMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  jump(event.clientX, event.clientY)
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  event.preventDefault()
  jump(event.clientX, event.clientY, true)
}

function onTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  event.preventDefault()
  jump(touch.clientX, touch.clientY, true)
}

function onClick(event: MouseEvent) {
  event.preventDefault()
  jump(event.clientX, event.clientY, true)
}

onMounted(() => window.addEventListener('pointermove', onMove, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('pointermove', onMove))
</script>

<template>
  <span class="inline-flex min-h-11 min-w-[4.5rem] items-center justify-center">
    <Teleport to="body" :disabled="!fleeing">
      <button
        ref="btn"
        type="button"
        class="runaway"
        :class="{ 'runaway-fixed': fleeing }"
        :style="fleeing ? { left: `${pos.x}px`, top: `${pos.y}px` } : undefined"
        @pointerdown="onPointerDown"
        @touchstart="onTouchStart"
        @click="onClick"
      >
        <slot />
      </button>
    </Teleport>
  </span>
</template>
