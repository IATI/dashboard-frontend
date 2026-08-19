<script setup>
const route = useRoute()
const bannerVisible = ref(true)
</script>

<template>
  <div class="iati-design-system--enabled">
    <BAlert
      v-model="bannerVisible"
      variant="primary"
      dismissible
      style="margin: 0; border-radius: 0; border-left: none; border-right: none; border-top: none"
    >
      <strong>Development version.</strong>
      This site is a development version for the new front-end of the IATI Data Quality Dashboard.
      Data may be incomplete, provisional, or include fictional placeholder text.
      Please do not rely on or cite this data during this phase.
    </BAlert>
    <Header :active="route.meta.active ?? ''" />
    <slot />
    <Footer />
  </div>
</template>