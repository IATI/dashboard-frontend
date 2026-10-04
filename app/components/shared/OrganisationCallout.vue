<script setup>
defineProps({
  variant: { type: String, default: '' },   // 'good' | 'info' | '' (default = warn)
  icon:    { type: String, default: '!' },
  title:   { type: String, required: true },
  // h3 when it sits inside a Card, whose kicker or title is the h2; h2 when it
  // stands on its own at the top of a page.
  headingLevel: { type: String, default: 'h3' },
})
</script>

<template>
  <div :class="['callout', variant]">
    <div class="ic">{{ icon }}</div>
    <div>
      <component :is="headingLevel">{{ title }}</component>
      <slot />
    </div>
  </div>
</template>
