<script setup>
const props = defineProps({
  sectionId: { type: String, required: true },
  artboard: { type: Object, required: true },
  label: { type: String, default: '' },
  order: { type: Array, default: () => [] },
})

const emit = defineEmits(['rename', 'reorder', 'focus'])
const frameRef = ref(null)

function onGripDown(e) {
  e.preventDefault()
  e.stopPropagation()
  const me = frameRef.value
  if (!me) return
  const scale = me.getBoundingClientRect().width / me.offsetWidth || 1
  const peers = Array.from(
    document.querySelectorAll(`[data-dc-section="${props.sectionId}"] [data-dc-slot]`)
  )
  const homes = peers.map((el) => ({ el, id: el.dataset.dcSlot, x: el.getBoundingClientRect().left }))
  const slotXs = homes.map((h) => h.x)
  const startIdx = props.order.indexOf(props.artboard.id)
  const startX = e.clientX
  let liveOrder = props.order.slice()

  me.classList.add('dc-dragging')

  const layout = () => {
    for (const h of homes) {
      if (h.id === props.artboard.id) continue
      const slot = liveOrder.indexOf(h.id)
      h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`
    }
  }

  const move = (ev) => {
    const dx = ev.clientX - startX
    me.style.transform = `translateX(${dx / scale}px)`
    const cur = homes[startIdx].x + dx
    let nearest = 0, best = Infinity
    for (let i = 0; i < slotXs.length; i++) {
      const d = Math.abs(slotXs[i] - cur)
      if (d < best) { best = d; nearest = i }
    }
    if (liveOrder.indexOf(props.artboard.id) !== nearest) {
      liveOrder = props.order.filter((k) => k !== props.artboard.id)
      liveOrder.splice(nearest, 0, props.artboard.id)
      layout()
    }
  }

  const up = () => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', up)
    const finalSlot = liveOrder.indexOf(props.artboard.id)
    me.classList.remove('dc-dragging')
    me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`
    setTimeout(() => {
      for (const h of homes) { h.el.style.transition = 'none'; h.el.style.transform = '' }
      if (liveOrder.join('|') !== props.order.join('|')) emit('reorder', liveOrder)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = ''
        })
      )
    }, 180)
  }

  //document.addEventListener('pointermove', move)
  //document.addEventListener('pointerup', up)
}
</script>

<template>
  <div
    v-if="artboard"
    ref="frameRef"
    :data-dc-slot="artboard.id"
    style="position: relative; flex-shrink: 0"
  >
    <!-- Label row above card -->
    <div
      class="dc-labelrow"
      style="position: absolute; bottom: 100%; left: -4px; margin-bottom: 4px;"
      :style="{ color: 'var(--dc-label)' }"
    >
      <div class="dc-grip" @pointerdown="onGripDown" title="Drag to reorder">
        <svg width="9" height="13" viewBox="0 0 9 13" fill="currentColor">
          <circle cx="2" cy="2" r="1.1"/><circle cx="7" cy="2" r="1.1"/>
          <circle cx="2" cy="6.5" r="1.1"/><circle cx="7" cy="6.5" r="1.1"/>
          <circle cx="2" cy="11" r="1.1"/><circle cx="7" cy="11" r="1.1"/>
        </svg>
      </div>
      <div class="dc-labeltext" @click="emit('focus')" title="Click to focus">
        <DCEditable
          :model-value="label"
          @update:model-value="(v) => emit('rename', v)"
          @click.stop
          :custom-style="{ fontSize: '15px', fontWeight: '500', color: 'var(--dc-label)', lineHeight: '1' }"
        />
      </div>
    </div>

    <!-- Expand / focus button -->
    <button class="dc-expand" @click="emit('focus')" @pointerdown.stop title="Focus">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <path d="M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"/>
      </svg>
    </button>

    <!-- Card -->
    <div
      class="dc-card"
      :style="{
        borderRadius: '2px',
        boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
        overflow: 'hidden',
        width: artboard.width + 'px',
        height: artboard.height + 'px',
        background: '#fff',
        ...artboard.style,
      }"
    >
      <component :is="artboard.ContentComponent" />
    </div>
  </div>
</template>
