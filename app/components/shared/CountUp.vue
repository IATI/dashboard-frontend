<script setup>
/**
 * A number that counts up to its value when it first appears.
 *
 * Takes the already-formatted string the page would otherwise print — "97%",
 * "4 quarters", "Monthly", "✓" — and animates only the leading number, keeping
 * whatever follows it. Anything that does not start with a number is rendered
 * unchanged, so the same component can sit in every metric row without the
 * caller having to know which values are numeric.
 *
 * The figure is reached, not approached: the last frame is the exact target, so
 * a rounded display never settles on the wrong number.
 */
const props = defineProps({
  value:    { type: String, required: true },
  duration: { type: Number, default: 750 },
})

// "1.6 quarters" -> ['1.6', ' quarters']
const LEADING_NUMBER = /^(-?\d+(?:\.\d+)?)([\s\S]*)$/

const parts = computed(() => props.value.match(LEADING_NUMBER))
const suffix = computed(() => (parts.value ? parts.value[2] : ''))

// Only a bare number or a percentage counts. A value whose suffix is a word
// reads wrong on the way past — "4 quarters" spends the climb as "1 quarters" —
// and counting a unit like that says nothing anyway.
const countable = computed(() => parts.value !== null && /^\s*%?$/.test(suffix.value))
const target = computed(() => (countable.value ? Number(parts.value[1]) : null))

// Count in the same precision it is written in, or 97% briefly reads 96.4%.
const decimals = computed(() => {
  const digits = parts.value?.[1] ?? ''
  const dot = digits.indexOf('.')
  return dot === -1 ? 0 : digits.length - dot - 1
})

// Starts at zero only where it is actually going to count, or the finished
// figure paints for a frame before dropping back to climb again.
const reduced = () => import.meta.client
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const current = ref(target.value !== null && import.meta.client && !reduced() ? 0 : target.value)
let frame = null

function run() {
  if (target.value === null) return
  cancelAnimationFrame(frame)

  if (reduced() || !import.meta.client || props.duration <= 0) {
    current.value = target.value
    return
  }

  const to = target.value
  const start = performance.now()
  const step = now => {
    const t = Math.min(1, (now - start) / props.duration)
    // ease-out: quick off the mark, settling rather than stopping dead
    current.value = to * (1 - Math.pow(1 - t, 3))
    if (t < 1) frame = requestAnimationFrame(step)
    else current.value = to
  }
  frame = requestAnimationFrame(step)
}

onMounted(run)
watch(target, run)
onBeforeUnmount(() => cancelAnimationFrame(frame))

const text = computed(() => (target.value === null
  ? props.value
  : current.value.toFixed(decimals.value) + suffix.value))
</script>

<template>
  <!-- tabular-nums so the row does not jiggle as the digits change width -->
  <span class="count-up">{{ text }}</span>
</template>

<style scoped>
.count-up { font-variant-numeric: tabular-nums }
</style>
