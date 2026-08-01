<script setup>
const route = useRoute()
</script>

<template>
  <div class="iati-design-system--enabled">
    <Header :active="route.meta.active ?? ''" />
    <slot />
    <Footer />
  </div>
</template>