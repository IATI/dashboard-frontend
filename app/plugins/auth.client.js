/**
 * Restores the IATI Account session once per page load, and completes the
 * redirect back from Asgardeo when one is in progress.
 *
 * Client-only: the SDK is a browser SDK, and this site is statically generated
 * so there is no server session to read.
 */
export default defineNuxtPlugin(nuxtApp => {
  const { restore } = useAuth()
  // Deliberately not awaited — a slow or failing identity provider must not
  // hold up the first render. The header shows its signed-out state until
  // `ready` flips.
  nuxtApp.hook('app:mounted', () => { restore() })
})
