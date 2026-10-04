/**
 * Keeps the preview to the pages that are finished, unless `?full` says otherwise.
 *
 * Client-only. The flag is remembered in localStorage, which the server cannot
 * read, so running this during prerender would send every route to the
 * organisations list in the built output.
 */
export default defineNuxtRouteMiddleware(to => {
  if (import.meta.server) return

  const { full, restore, applyQuery } = usePreviewScope()
  restore()
  applyQuery(to.query)

  if (full.value || isPreviewPath(to.path)) return

  // Including '/', which is why a publisher following a bare link lands on the
  // list rather than a half-built overview.
  return navigateTo('/organisations')
})
