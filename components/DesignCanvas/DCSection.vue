<script setup>
const props = defineProps({
  id: { type: String, default: undefined },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  gap: { type: Number, default: 48 },
})

const ctx = inject('dcCtx', null)
const sectionId = computed(() => props.id ?? props.title)

// DCArtboard children register themselves here (source order)
const artboards = ref([])

function registerArtboard(data) {
  if (!artboards.value.find((a) => a.id === data.id)) {
    artboards.value.push(data)
  }
  ctx?.registerArtboard(`${sectionId.value}/${data.id}`, {
    sectionId: sectionId.value,
    ...data,
  })
}

function unregisterArtboard(id) {
  artboards.value = artboards.value.filter((a) => a.id !== id)
  ctx?.unregisterArtboard(`${sectionId.value}/${id}`, sectionId.value, id)
}

provide('dcSectionCtx', { sectionId, registerArtboard, unregisterArtboard })

// Persisted state from DesignCanvas
const sec = computed(() => ctx?.sections.value[sectionId.value] || {})

// Effective render order: persisted → fallback to source
const srcIds = computed(() => artboards.value.map((a) => a.id))
const order = computed(() => {
  const kept = (sec.value.order || []).filter((k) => srcIds.value.includes(k))
  return [...kept, ...srcIds.value.filter((k) => !kept.includes(k))]
})

const artboardsById = computed(() =>
  Object.fromEntries(artboards.value.map((a) => [a.id, a]))
)

const displayTitle = computed(() => sec.value.title ?? props.title)

function onRenameTitle(v) {
  ctx?.patchSection(sectionId.value, { title: v })
}

function onRenameLabel(artboardId, v) {
  ctx?.patchSection(sectionId.value, (x) => ({
    labels: { ...(x?.labels || {}), [artboardId]: v },
  }))
}

function onReorder(newOrder) {
  ctx?.patchSection(sectionId.value, { order: newOrder })
}

function getLabel(artboardId) {
  return (sec.value.labels || {})[artboardId] ?? artboardsById.value[artboardId]?.label
}

onMounted(() => {
  ctx?.registerSection(sectionId.value, { title: props.title, subtitle: props.subtitle })
})

onUnmounted(() => {
  ctx?.unregisterSection(sectionId.value)
})
</script>

<template>
  <div :data-dc-section="sectionId" style="margin-bottom: 80px; position: relative">
    <!-- Section header -->
    <div style="padding: 0 60px 56px">
      <DCEditable
        tag="div"
        :model-value="displayTitle"
        @update:model-value="onRenameTitle"
        :custom-style="{
          fontSize: '28px', fontWeight: '600',
          color: 'var(--dc-title)', letterSpacing: '-0.4px',
          marginBottom: '6px', display: 'inline-block',
        }"
      />
      <div v-if="subtitle" :style="{ fontSize: '16px', color: 'var(--dc-subtitle)' }">{{ subtitle }}</div>
    </div>

    <!-- Headless DCArtboard components register themselves; no visible output -->
    <div style="display: none">
      <slot />
    </div>

    <!-- Artboard frames in persisted / source order -->
    <div :style="{ display: 'flex', gap: gap + 'px', padding: '0 60px', alignItems: 'flex-start', width: 'max-content' }">
      <DCArtboardFrame
        v-for="id in order"
        :key="id"
        :section-id="sectionId"
        :artboard="artboardsById[id]"
        :label="getLabel(id)"
        :order="order"
        @rename="(v) => onRenameLabel(id, v)"
        @reorder="onReorder"
        @focus="() => ctx?.setFocus(`${sectionId}/${id}`)"
      />
    </div>
  </div>
</template>
