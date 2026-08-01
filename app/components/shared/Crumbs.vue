<script setup>
defineProps({
  path: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="crumbs">
    <div class="crumbs__inner">
      <nav class="iati-breadcrumb" aria-label="breadcrumb">
        <!-- Mobile: link to the parent item -->
        <div v-if="path.length > 1" class="iati-breadcrumb__previous">
          <span class="iati-icon iati-icon--chevron-left" aria-hidden="true"></span>
          <NuxtLink v-if="path[path.length - 2]?.href" :to="path[path.length - 2].href" class="iati-breadcrumb-link">
            {{ path[path.length - 2].label }}
          </NuxtLink>
          <span v-else>{{ path[path.length - 2]?.label }}</span>
        </div>
        <!-- Desktop: full list with auto "/" separators via CSS -->
        <ol class="iati-breadcrumb__list">
          <li v-for="(p, i) in path" :key="i">
            <NuxtLink v-if="p.href" :to="p.href" class="iati-breadcrumb-link">{{ p.label }}</NuxtLink>
            <span v-else :aria-current="i === path.length - 1 ? 'page' : undefined">{{ p.label }}</span>
          </li>
        </ol>
      </nav>
    </div>
  </div>
</template>
