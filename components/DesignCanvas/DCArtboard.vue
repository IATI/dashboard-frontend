<!--
  Headless marker component. Captures slot content and registers
  it with the parent DCSection for rendering in DCArtboardFrame.
-->
<script setup>
const props = defineProps({
  id: { type: String, default: undefined },
  label: { type: String, default: undefined },
  width: { type: Number, default: 260 },
  height: { type: Number, default: 480 },
  style: { type: Object, default: () => ({}) },
})

const slots = useSlots()
const secCtx = inject('dcSectionCtx', null)
const artboardId = computed(() => props.id ?? props.label)

onMounted(() => {
  if (!secCtx) return
  const renderFn = slots.default
  // Wrap slot in a stable component definition so repeated renders
  // don't trigger unnecessary remounts in DCArtboardFrame.
  const ContentComponent = {
    name: `ArtboardContent-${artboardId.value}`,
    setup: () => () => renderFn?.() ?? [],
  }
  secCtx.registerArtboard({
    id: artboardId.value,
    label: props.label ?? props.id,
    width: props.width,
    height: props.height,
    style: props.style,
    ContentComponent,
  })
})

onUnmounted(() => {
  secCtx?.unregisterArtboard(artboardId.value)
})
</script>

<template><!-- headless: renders nothing, registration only --></template>
