const STORAGE_KEY = 'iati-dq-unlocked'

/**
 * A shared password gate for the whole site.
 *
 * This is a deterrent, NOT security. The site is statically generated, so there
 * is no server to check against — the password lives in the client bundle and
 * anyone who looks will find it. It exists only to stop people stumbling across
 * a provisional dashboard, and must not be relied on to protect anything.
 *
 * What it does achieve: because the layout renders the gate rather than the page
 * until unlocked, the prerendered HTML contains no dashboard content, so
 * view-source and crawlers see the gate instead.
 */
export function useSiteLock() {
  const { public: { sitePassword } } = useRuntimeConfig()
  const unlocked = useState('site-unlocked', () => false)

  /** No password configured means the gate is disabled entirely. */
  const required = computed(() => Boolean(sitePassword))

  /** Restore a previous unlock. Client-only: there is no localStorage on the server. */
  function restore() {
    if (!import.meta.client || !sitePassword) return
    try {
      if (localStorage.getItem(STORAGE_KEY) === sitePassword) unlocked.value = true
    } catch {
      // private mode or blocked storage — the visitor just re-enters it
    }
  }

  function unlock(entered) {
    if (entered !== sitePassword) return false
    unlocked.value = true
    try {
      localStorage.setItem(STORAGE_KEY, sitePassword)
    } catch { /* not fatal; unlock lasts for this page load */ }
    return true
  }

  return { unlocked, required, restore, unlock }
}
