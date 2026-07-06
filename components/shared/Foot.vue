<script setup>
const { t } = useLocale()
</script>
<template>
  <footer class="foot">
    <div class="foot__inner">
      <div>{{ t('footMockup') }}</div>
      <div><a href="#">{{ t('footMethodology') }}</a> &middot; <a href="#">CSV/JSON</a> &middot; <a href="#">{{ t('footFeedback') }}</a></div>
    </div>
  </footer>
</template>
