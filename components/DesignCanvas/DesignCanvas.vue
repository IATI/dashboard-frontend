<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  minScale: { type: Number, default: 0.1 },
  maxScale: { type: Number, default: 8 },
})

// ── State ──────────────────────────────────────────────────────
const sections = ref({})
const focus = ref(null)
const ready = ref(false)

// Global registry for focus overlay: slotId → artboard entry
const focusRegistry = ref({})

// Section metadata for focus overlay navigation
const sectionOrder = ref([])
const sectionMeta = ref({})  // sectionId → { title, subtitle, slotIds }

// ── Persistence ────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json'
let didRead = false
let skipNextWrite = false

onMounted(async () => {
  try {
    const r = await fetch('./' + DC_STATE_FILE)
    if (r.ok) {
      const saved = await r.json()
      if (saved?.sections) {
        skipNextWrite = true
        sections.value = saved.sections
      }
    }
  } catch {}
  didRead = true
  ready.value = true
})

watch(
  sections,
  (newVal) => {
    if (!didRead) return
    if (skipNextWrite) { skipNextWrite = false; return }
    setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({ sections: newVal })).catch?.(() => {})
    }, 250)
  },
  { deep: true }
)

// ── API ────────────────────────────────────────────────────────
function setFocus(slotId) { focus.value = slotId }

function patchSection(id, patch) {
  const current = sections.value[id] || {}
  const next = typeof patch === 'function' ? patch(current) : patch
  sections.value = { ...sections.value, [id]: { ...current, ...next } }
}

function registerSection(id, { title, subtitle }) {
  if (!sectionOrder.value.includes(id)) sectionOrder.value.push(id)
  if (!sectionMeta.value[id]) {
    sectionMeta.value[id] = { title, subtitle, slotIds: [] }
  }
}

function unregisterSection(id) {
  sectionOrder.value = sectionOrder.value.filter((s) => s !== id)
  delete sectionMeta.value[id]
}

function registerArtboard(slotId, data) {
  focusRegistry.value[slotId] = data
  const { sectionId, id } = data
  if (sectionMeta.value[sectionId] && !sectionMeta.value[sectionId].slotIds.includes(id)) {
    sectionMeta.value[sectionId].slotIds.push(id)
  }
}

function unregisterArtboard(slotId, sectionId, artboardId) {
  delete focusRegistry.value[slotId]
  if (sectionMeta.value[sectionId]) {
    sectionMeta.value[sectionId].slotIds = sectionMeta.value[sectionId].slotIds.filter((id) => id !== artboardId)
  }
}

// ── Provide to children ────────────────────────────────────────
provide('dcCtx', {
  sections,
  focus,
  setFocus,
  patchSection,
  registerSection,
  unregisterSection,
  registerArtboard,
  unregisterArtboard,
  sectionOrder,
  sectionMeta,
  focusRegistry,
})

// ── Keyboard: Esc exits focus ──────────────────────────────────
const onKey = (e) => { if (e.key === 'Escape') setFocus(null) }
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <DCViewport :min-scale="minScale" :max-scale="maxScale">
    <template v-if="ready">
      <slot />
    </template>
  </DCViewport>

  <Teleport to="body">
    <DCFocusOverlay v-if="focus && focusRegistry[focus]" />
  </Teleport>
</template>
