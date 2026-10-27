<script setup lang="ts">
const petals = [
  { icon: '🌸', left: '7%', top: '12%', fontSize: '22px', animationDelay: '0s' },
  { icon: '🌸', left: '86%', top: '16%', fontSize: '16px', animationDelay: '0.8s' },
  { icon: '❀', left: '18%', top: '78%', fontSize: '14px', animationDelay: '1.4s' },
  { icon: '🌸', left: '78%', top: '72%', fontSize: '20px', animationDelay: '0.4s' },
  { icon: '✿', left: '32%', top: '6%', fontSize: '12px', animationDelay: '1.1s' },
  { icon: '🌸', left: '92%', top: '46%', fontSize: '15px', animationDelay: '1.8s' },
  { icon: '❀', left: '4%', top: '42%', fontSize: '13px', animationDelay: '0.2s' },
]
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <span
      v-for="petal in petals"
      :key="`${petal.left}-${petal.top}`"
      class="petal"
      :style="{ left: petal.left, top: petal.top, fontSize: petal.fontSize, animationDelay: petal.animationDelay }"
    >{{ petal.icon }}</span>
  </div>
</template>
