<script setup>
const props = defineProps({ 
  level: { type: String, required: true },
  showStars: { type: Boolean, default: false }
})


const stars = computed(() => {
  if (props.level == 'good') return 2
  if (props.level == 'ok') return 1
  return 0
})
</script>

<template>
  <span :class="`score score--${level}`">
    <template v-if="showStars">
      <span v-for="n in 3" :key="n" :style="{ color: n <= stars ? 'var(--green-50)' : 'var(--grey-20)', fontSize: '.9rem' }">★</span>
    </template>
    <template v-else>
      <span class="dot" />
    </template>
    <slot />
  </span>
</template>
