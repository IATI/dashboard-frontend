<script setup>
const props = defineProps({
  minScale: { type: Number, default: 0.1 },
  maxScale: { type: Number, default: 8 },
})

const vpRef = ref(null)
const worldRef = ref(null)
const tf = { x: 0, y: 0, scale: 1 }

function apply() {
  const el = worldRef.value
  if (el) el.style.transform = `translate3d(${tf.x}px, ${tf.y}px, 0) scale(${tf.scale})`
}

const gridSvg = computed(() => {
  const encoded = encodeURIComponent(`rgba(0,0,0,0.06)`)
  return `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encoded}' stroke-width='1'/%3E%3C/svg%3E")`
})

onMounted(() => {
  const vp = vpRef.value
  if (!vp) return

  const zoomAt = (cx, cy, factor) => {
    const r = vp.getBoundingClientRect()
    const px = cx - r.left, py = cy - r.top
    const next = Math.min(props.maxScale, Math.max(props.minScale, tf.scale * factor))
    const k = next / tf.scale
    tf.x = px - (px - tf.x) * k
    tf.y = py - (py - tf.y) * k
    tf.scale = next
    apply()
  }

  const isMouseWheel = (e) =>
    e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40)

  let isGesturing = false

  const onWheel = (e) => {
    e.preventDefault()
    if (isGesturing) return
    if (e.ctrlKey) {
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01))
    } else if (isMouseWheel(e)) {
      zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18))
    } else {
      tf.x -= e.deltaX
      tf.y -= e.deltaY
      apply()
    }
  }

  let gsBase = 1
  const onGestureStart = (e) => { e.preventDefault(); isGesturing = true; gsBase = tf.scale }
  const onGestureChange = (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, (gsBase * e.scale) / tf.scale) }
  const onGestureEnd = (e) => { e.preventDefault(); isGesturing = false }

  let drag = null
  const onPointerDown = (e) => {
    const onBg = !e.target.closest('[data-dc-slot], .dc-editable')
    if (!(e.button === 1 || (e.button === 0 && onBg))) return
    e.preventDefault()
    vp.setPointerCapture(e.pointerId)
    drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY }
    vp.style.cursor = 'grabbing'
  }
  const onPointerMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return
    tf.x += e.clientX - drag.lx
    tf.y += e.clientY - drag.ly
    drag.lx = e.clientX; drag.ly = e.clientY
    apply()
  }
  const onPointerUp = (e) => {
    if (!drag || e.pointerId !== drag.id) return
    vp.releasePointerCapture(e.pointerId)
    drag = null
    vp.style.cursor = ''
  }

  // vp.addEventListener('wheel', onWheel, { passive: false })
  // vp.addEventListener('gesturestart', onGestureStart, { passive: false })
  // vp.addEventListener('gesturechange', onGestureChange, { passive: false })
  // vp.addEventListener('gestureend', onGestureEnd, { passive: false })
  // vp.addEventListener('pointerdown', onPointerDown)
  // vp.addEventListener('pointermove', onPointerMove)
  // vp.addEventListener('pointerup', onPointerUp)
  // vp.addEventListener('pointercancel', onPointerUp)

  onUnmounted(() => {
    // vp.removeEventListener('wheel', onWheel)
    // vp.removeEventListener('gesturestart', onGestureStart)
    // vp.removeEventListener('gesturechange', onGestureChange)
    // vp.removeEventListener('gestureend', onGestureEnd)
    // vp.removeEventListener('pointerdown', onPointerDown)
    // vp.removeEventListener('pointermove', onPointerMove)
    // vp.removeEventListener('pointerup', onPointerUp)
    // vp.removeEventListener('pointercancel', onPointerUp)
  })
})
</script>

<template>
  <div
    ref="vpRef"
    :style="{
      height: '100vh', width: '100vw',
      background: 'var(--dc-bg)',
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: 'var(--dc-font)',
      boxSizing: 'border-box',
    }"
  >
    <div
      ref="worldRef"
      :style="{
        position: 'absolute', top: 0, left: 0,
        transformOrigin: '0 0',
        willChange: 'transform',
        width: 'max-content', minWidth: '100%',
        minHeight: '100%',
        padding: '60px 0 80px',
      }"
    >
      <div :style="{
        position: 'absolute', inset: '-6000px',
        backgroundImage: gridSvg, backgroundSize: '120px 120px',
        pointerEvents: 'none', zIndex: -1,
      }" />
      <slot />
    </div>
  </div>
</template>
