<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  tag: { type: String, default: 'span' },
  customStyle: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'click'])

const el = ref(null)

onMounted(() => {
  if (el.value) el.value.textContent = props.modelValue
})

watch(() => props.modelValue, (v) => {
  if (el.value && document.activeElement !== el.value) {
    el.value.textContent = v
  }
})
</script>

<template>
  <component
    :is="tag"
    ref="el"
    class="dc-editable"
    contenteditable="true"
    :style="customStyle"
    @click="emit('click', $event)"
    @pointerdown.stop
    @blur="emit('update:modelValue', $event.currentTarget.textContent)"
    @keydown.enter.prevent="$event.currentTarget.blur()"
  />
</template>
