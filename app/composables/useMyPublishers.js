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
  const { token } = useAuth()
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

  /** True when the request never reached RYD — almost always the origin allowlist. */
  const blocked = computed(() => Boolean(error.value) && !error.value?.statusCode)

  /** Slugs only, for the membership checks. */
  const slugs = computed(() => new Set((data.value ?? []).map(p => p.slug)))

  return { publishers: data, slugs, blocked, error, status, refresh }
}
