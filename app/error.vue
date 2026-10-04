<script setup>
// Nuxt renders this instead of a page for any fatal error, including the 404
// thrown when a publisher slug is not in the Registry.
//
// It deliberately does NOT use the default layout: the layout is where the
// password gate lives, and an error page that rendered inside it would either
// sit behind the gate or leak past it depending on unlock state. The header and
// footer are included directly instead.
const props = defineProps({
  error: { type: Object, default: () => ({}) },
})

const { t } = useI18n({ useScope: 'global' })

const notFound = computed(() => props.error?.statusCode === 404)
const title = computed(() => (notFound.value ? t('errNotFoundTitle') : t('errGenericTitle')))
const intro = computed(() => (notFound.value ? t('errNotFoundIntro') : t('errGenericIntro')))

// statusMessage carries the detail we set when throwing, e.g. which slug was
// missing. Shown only in development — in production it is noise to a reader.
const detail = computed(() => (import.meta.dev ? props.error?.statusMessage : null))

function leave(to) {
  clearError({ redirect: to })
}
</script>

<template>
  <div class="iati-design-system--enabled">
    <Header active="" />

    <main class="main">
      <Card class="error-page">
        <p class="error-page__code">{{ error?.statusCode || 500 }}</p>
        <h1 class="error-page__title">{{ title }}</h1>
        <p class="error-page__intro">{{ intro }}</p>
        <p v-if="detail" class="error-page__detail">{{ detail }}</p>

        <div class="error-page__actions">
          <button type="button" class="error-page__button" @click="leave('/organisations')">
            {{ t('errBrowsePublishers') }}
          </button>
          <button type="button" class="error-page__link" @click="leave('/')">
            {{ t('errGoHome') }}
          </button>
        </div>
      </Card>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.error-page { max-width: 620px; margin: 40px auto }
.error-page__code {
  font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 800;
  font-size: 3rem; line-height: 1; color: var(--teal-50); margin: 0 0 8px;
}
.error-page__title {
  font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 800;
  font-size: 1.6rem; color: var(--teal-90); margin: 0 0 10px; line-height: 1.15;
}
.error-page__intro { font-size: .95rem; color: var(--grey-70); margin: 0 }
.error-page__detail {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .8rem; color: var(--grey-60);
  background: var(--grey-10); border: 1px solid var(--grey-20);
  padding: 8px 10px; margin: 14px 0 0; overflow-wrap: anywhere;
}
.error-page__actions {
  display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 24px;
}
.error-page__button {
  padding: 10px 18px; background: var(--teal-90); color: #fff;
  border: none; border-radius: 3px; cursor: pointer;
  font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 700; font-size: .95rem;
}
.error-page__button:hover { background: var(--teal-80) }
.error-page__link {
  background: none; border: none; padding: 0; cursor: pointer;
  color: var(--teal-70); font-family: inherit; font-size: .9rem; text-decoration: underline;
}
</style>
