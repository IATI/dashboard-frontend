/**
 * The reporting organisations the signed-in user administers, from Register Your
 * Data. This is the authority for what a user may see: the publishers list is
 * narrowed to it, and the publisher page is guarded by it.
 *
 * `short_name` is the same identifier this app uses as its page slug, so the
 * two line up without translation.
 *
 * RYD enforces an origin allowlist, so a browser request from an unregistered
 * origin is refused before it is ever sent (the preflight returns "Disallowed
 * CORS origin"). That surfaces as a network-level failure with no status, which
 * is reported separately from an ordinary error — it needs a configuration
 * change at IATI, not a retry.
 */
export function useMyPublishers() {
  const { token, isSignedIn } = useAuth()
  const { public: { rydBase } } = useRuntimeConfig()

  const { data, error, status, refresh } = useAsyncData(
    'my-publishers',
    async () => {
      if (!token.value) return null
      const res = await $fetch(`${rydBase}/api/v1/reporting-orgs`, {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      return (res?.data ?? [])
        .map(row => ({
          slug: row?.metadata?.short_name ?? null,
          name: row?.metadata?.human_readable_name ?? null,
        }))
        .filter(row => row.slug)
    },
    { watch: [token], default: () => null, server: false },
  )

  /** Slugs only, for the membership checks. */
  const slugs = computed(() => new Set((data.value ?? []).map(p => p.slug)))

  /**
   * What the caller should actually do, rather than leaving them to infer it
   * from status/error/data:
   *
   *   public  — signed out; show everything
   *   loading — signed in, no answer from RYD yet
   *   failed  — signed in, RYD did not answer; show everything and say so
   *   scoped  — signed in and we know the list
   *
   * `failed` covers any failure, not just the CORS one. An earlier version
   * tested for a missing statusCode to single out the origin block, which was
   * too clever: the request failed, the page could not narrow, and that is all
   * the page needs to know to explain itself.
   */
  const state = computed(() => {
    if (!isSignedIn.value) return 'public'
    if (error.value) return 'failed'
    if (status.value === 'success' && data.value) return 'scoped'
    return 'loading'
  })

  return { publishers: data, slugs, state, error, status, refresh }
}
