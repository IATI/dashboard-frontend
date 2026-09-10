<script setup>
const { t } = useI18n({ useScope: 'global' })
const { unlock } = useSiteLock()

const entered = ref('')
const failed = ref(false)
const input = ref(null)

function submit() {
  failed.value = !unlock(entered.value)
  if (failed.value) {
    entered.value = ''
    input.value?.focus()
  }
}

onMounted(() => input.value?.focus())
</script>

<template>
  <div class="site-gate">
    <form class="site-gate__card" @submit.prevent="submit">
      <p class="site-gate__eyebrow">{{ t('gateEyebrow') }}</p>
      <h1 class="site-gate__title">{{ t('gateTitle') }}</h1>
      <p class="site-gate__intro">{{ t('gateIntro') }}</p>

      <label class="site-gate__label" for="site-password">{{ t('gatePassword') }}</label>
      <input
        id="site-password"
        ref="input"
        v-model="entered"
        type="password"
        class="site-gate__input"
        autocomplete="current-password"
        :aria-invalid="failed"
        :aria-describedby="failed ? 'site-gate-error' : undefined"
      >
      <p v-if="failed" id="site-gate-error" class="site-gate__error" role="alert">
        {{ t('gateWrong') }}
      </p>

      <button type="submit" class="site-gate__button">{{ t('gateEnter') }}</button>
    </form>
  </div>
</template>

<style scoped>
.site-gate {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--grey-10);
}
.site-gate__card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-top: 4px solid var(--teal-90);
  box-shadow: var(--shadow);
  padding: 28px;
}
.site-gate__eyebrow {
  font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 700;
  font-size: .78rem; text-transform: uppercase; letter-spacing: .5px;
  color: var(--teal-70); margin: 0 0 6px;
}
.site-gate__title {
  font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 800;
  font-size: 1.5rem; color: var(--teal-90); margin: 0 0 10px; line-height: 1.15;
}
.site-gate__intro { font-size: .9rem; color: var(--grey-70); margin: 0 0 20px }
.site-gate__label {
  display: block; font-size: .8rem; font-weight: 700;
  color: var(--grey-70); margin-bottom: 4px;
}
.site-gate__input {
  width: 100%; padding: 9px 10px; font-size: .95rem; font-family: inherit;
  border: 1px solid var(--grey-20); border-radius: 3px;
}
.site-gate__input:focus { outline: 2px solid var(--blue-50); outline-offset: 1px }
.site-gate__error { color: var(--red-50); font-size: .82rem; margin: 8px 0 0 }
.site-gate__button {
  margin-top: 18px; width: 100%; padding: 10px 14px;
  background: var(--teal-90); color: #fff; border: none; border-radius: 3px;
  font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 700;
  font-size: .95rem; cursor: pointer;
}
.site-gate__button:hover { background: var(--teal-80) }
</style>
