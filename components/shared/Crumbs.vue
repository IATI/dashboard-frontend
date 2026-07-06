<script setup>
defineProps({
  path: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="crumbs">
    <div class="crumbs__inner">
      <template v-for="(p, i) in path" :key="i">
        <span v-if="i > 0" class="sep">/</span>
        <a v-if="p.href" :href="p.href">{{ p.label }}</a>
        <span v-else>{{ p.label }}</span>
      </template>
    </div>
  </div>
</template>
