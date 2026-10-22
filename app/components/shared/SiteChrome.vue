<script setup>
/**
 * The banner, header, page and footer.
 *
 * Extracted from the layout only so the layout can render it in two places —
 * directly for a public route, and inside the access gate's ClientOnly for a
 * guarded one — without the markup being written twice and drifting.
 */
defineProps({ active: { type: String, default: '' } })
const banner = defineModel('banner', { type: Boolean, default: true })

/**
 * The provisional-data notice is off unless asked for; see showDevBanner in
 * nuxt.config.ts for how to turn it back on. The dismiss state above still
 * applies when it is shown.
 */
const { public: { showDevBanner } } = useRuntimeConfig()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div>
    <BAlert
      v-if="showDevBanner"
      v-model="banner"
      variant="primary"
      dismissible
      style="margin: 0; border-radius: 0; border-left: none; border-right: none; border-top: none"
    >
      <!-- One message with slots rather than a row of fragments, so the
           sentence stays translatable: a translator can move the links and the
           date within it, which concatenated pieces would not allow. -->
      <i18n-t keypath="bannerBody" tag="span" scope="global">
        <template #title><strong>{{ t('bannerTitle') }}</strong></template>
        <template #methodology>
          <NuxtLink to="/about">{{ t('bannerMethodology') }}</NuxtLink>
        </template>
        <template #connect>
          <a :href="CONNECT_URL" target="_blank" rel="noopener">{{ t('bannerConnect') }}</a>
        </template>
        <template #github>
          <a :href="FEEDBACK_URL" target="_blank" rel="noopener">{{ t('bannerGithub') }}</a>
        </template>
        <template #deadline><strong>{{ t('bannerDeadline') }}</strong></template>
      </i18n-t>
    </BAlert>
    <Header :active="active" />
    <slot />
    <Footer />
  </div>
</template>
