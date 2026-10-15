/**
 * Keeps the preview to the pages that are finished, unless `?full` says otherwise.
 *
 * Client-only. The flag is remembered in localStorage, which the server cannot
 * read, so running this during prerender would send every route to the
 * organisations list in the built output.
 */
/**
 * Asgardeo returns to the app root carrying ?code, which the SDK exchanges for
 * a session. Redirecting while it is there throws it away — navigateTo does not
 * carry the query string — and the exchange then silently never happens, so the
 * user lands back on the sign-in prompt having just signed in. The redirect
 * waits; useAuth sends them on once the session is established.
 */
function isReturningFromSignIn(query) {
  return Boolean(query.code || query.error)
}

export default defineNuxtRouteMiddleware(to => {
  if (import.meta.server) return

  const { full, restore, applyQuery } = usePreviewScope()
  restore()
  applyQuery(to.query)

  if (isReturningFromSignIn(to.query)) return
  if (full.value || isPreviewPath(to.path)) return

  // Including '/', which is why a publisher following a bare link lands on the
  // list rather than a half-built overview.
  return navigateTo('/organisations')
})
