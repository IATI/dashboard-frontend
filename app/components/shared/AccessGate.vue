<script setup>
/**
 * Shown instead of a page the viewer may not see.
 *
 * Rendered by the layout rather than reached by a redirect, so the prerendered
 * HTML of every guarded route carries this instead of organisation data, and so
 * a publisher following a link from the consultation email lands on an
 * explanation rather than being bounced to a list.
 *
 * The wording distinguishes the cases deliberately. "Sign in" is an action the
 * viewer can take; "this is not your organisation" is not, and saying so is
 * more use than a generic refusal. It never confirms whether an organisation
 * exists, because the slug came from the URL and may be a guess.
 */
const props = defineProps({
  /** A useAccess() status: 'loading' | 'signed-out' | 'scoped' | 'none' | 'failed' | 'all' */
  status: { type: String, required: true },
  /** The organisation the viewer asked for, when the route named one. */
  slug:   { type: String, default: null },
})

const { t } = useI18n({ useScope: 'global' })
const { signIn } = useAuth()
const { slugs } = useAccess()

const body = computed(() => {
  if (props.status === 'signed-out') return 'gateSignedOut'
  if (props.status === 'failed')     return 'gateFailed'
  if (props.status === 'none')       return 'gateNoOrgs'
  // 'scoped' and we are still here: signed in, but not for this page
  return props.slug ? 'gateNotYours' : 'gateNotPermitted'
})

/** Somewhere to go that is not a dead end. */
const ownOrg = computed(() => (slugs.value.size === 1 ? [...slugs.value][0] : null))
</script>

<template>
  <div class="access-gate">
    <div class="access-gate__card">
      <p class="access-gate__eyebrow">{{ t('brandEyebrow') }}</p>

      <template v-if="status === 'loading'">
        <h1 class="access-gate__title">{{ t('gateChecking') }}</h1>
        <p class="access-gate__intro" aria-live="polite">{{ t('gateCheckingBody') }}</p>
      </template>

      <template v-else>
        <h1 class="access-gate__title">{{ t('gateTitle') }}</h1>
        <p class="access-gate__intro">{{ t(body) }}</p>

        <button
          v-if="status === 'signed-out'"
          type="button" class="iati-button access-gate__action" @click="signIn()"
        >
          <span>{{ t('navSignIn') }}</span>
        </button>

        <p v-if="ownOrg && status !== 'signed-out'" class="access-gate__alt">
          <NuxtLink :to="`/organisations/${ownOrg}`">{{ t('gateGoToYours') }}</NuxtLink>
        </p>
        <p v-else-if="status === 'scoped'" class="access-gate__alt">
          <NuxtLink to="/organisations">{{ t('gateGoToList') }}</NuxtLink>
        </p>

        <p class="access-gate__help">
          {{ t('gateHelp') }}
          <a :href="`mailto:${SUPPORT_EMAIL}`">{{ SUPPORT_EMAIL }}</a>
        </p>
        <p class="access-gate__help">
          <NuxtLink to="/about">{{ t('gateAboutLink') }}</NuxtLink>
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Carried over from the password gate this replaces, so an unauthenticated
   visitor meets the same card they did before. */
.access-gate {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--grey-10);
}
.access-gate__card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-top: 4px solid var(--teal-90);
  box-shadow: var(--shadow);
  padding: 28px;
}
.access-gate__eyebrow {
  font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 700;
  font-size: .78rem; text-transform: uppercase; letter-spacing: .5px;
  color: var(--teal-70); margin: 0 0 6px;
}
.access-gate__title {
  font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 800;
  font-size: 1.5rem; color: var(--teal-90); margin: 0 0 10px; line-height: 1.15;
}
.access-gate__intro { font-size: .95rem; line-height: 1.55; color: var(--grey-70); margin: 0 }
.access-gate__action { margin-top: 20px }
.access-gate__alt { margin: 16px 0 0; font-size: .9rem }
.access-gate__help {
  margin: 16px 0 0; font-size: .82rem; color: var(--grey-60);
}
.access-gate__help + .access-gate__help { margin-top: 6px }
</style>
