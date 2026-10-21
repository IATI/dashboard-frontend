<script setup>
// useRouter().currentRoute, not useRoute(). The two disagree here: useRoute()
// is updated after a navigation settles, and following a link out of the gate
// left it reporting the route the app first loaded while the router had
// already moved on — so the gate kept rendering for the old route and the
// methodology link appeared to do nothing. currentRoute is the live one.
const router = useRouter()
const path = computed(() => router.currentRoute.value.path)
const bannerVisible = ref(true)

/**
 * Access is decided here rather than in route middleware.
 *
 * Everything the decision rests on is client-only — the OIDC session lives in
 * the browser and the organisation list comes from RYD after sign-in — and this
 * site is statically generated. Rendering the gate INSTEAD of the page means
 * the prerendered HTML of a guarded route carries no organisation data, which a
 * redirect could not achieve: the page would have had to render first.
 *
 * This is separate from ?full, which is about how finished a page is rather
 * than whose data it shows; see usePreviewScope and routeAccess.
 *
 * See useAccess for what this does and does not protect. In short: it shows a
 * publisher only their own assessment, and it is not a security boundary,
 * because the data API behind it is public.
 */
const { status, canOpen } = useAccess()

/**
 * A public route renders normally, server and client alike. Wrapping it in the
 * gate's ClientOnly would stop it being prerendered and flash a "checking
 * access" card at a page that needs no access.
 */
const isPublic = computed(() => routeAccess(path.value) === 'public')
const allowed = computed(() => canOpen(path.value))
const orgSlug = computed(() => routeOrgSlug(path.value))
/** From the live route for the same reason as `path`: a stale one highlights the previous page. */
const activeNav = computed(() => router.currentRoute.value.meta.active ?? '')
</script>

<template>
  <div class="iati-design-system--enabled">
    <!-- The chrome and the page, shown when this viewer may see them -->
    <template v-if="isPublic">
      <SiteChrome :active="activeNav" v-model:banner="bannerVisible">
        <slot />
      </SiteChrome>
    </template>

    <ClientOnly v-else>
      <AccessGate v-if="!allowed" :status="status" :slug="orgSlug" />
      <SiteChrome v-else :active="activeNav" v-model:banner="bannerVisible">
        <slot />
      </SiteChrome>

      <!-- Server-rendered and pre-hydration markup for a guarded route. The
           gate's signed-out wording would be wrong here: on the server nobody
           is signed in yet, and offering "sign in" before the session has been
           checked would flash at someone who is already signed in. -->
      <template #fallback>
        <AccessGate status="loading" />
      </template>
    </ClientOnly>
  </div>
</template>
