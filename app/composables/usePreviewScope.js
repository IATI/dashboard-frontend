/**
 * Which pages the preview shows.
 *
 * For the publisher preview only the organisations list and an organisation's
 * own page are finished, so everything else is out of reach by default and the
 * nav does not offer it. `?full` opens the rest up, `?full=0` closes it again.
 *
 * The choice is remembered, because a flag that only lived in the query string
 * would be lost on the first internal link and would have to be re-typed on
 * every page. It is a per-browser convenience, not access control: the site's
 * password gate is what keeps the preview private, and anyone who reads this
 * file can find the flag.
 */
const STORAGE_KEY = 'iati-dq-full'

/**
 * Pages a publisher is sent to. Everything else needs the flag.
 *
 * /about is in the preview because the consultation email points publishers at
 * the methodology, and an organisation's page links to it.
 */
export function isPreviewPath(path) {
  return path === '/about' || path === '/organisations' || path.startsWith('/organisations/')
}

export function usePreviewScope() {
  const full = useState('preview-full', () => false)

  /** Restore a previous `?full`. Client-only: there is no localStorage on the server. */
  function restore() {
    if (!import.meta.client) return
    try {
      full.value = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      // private mode or blocked storage — the flag just lasts this page load
    }
  }

  /** `?full` turns it on, `?full=0` or `?full=false` turns it off, absent leaves it. */
  function applyQuery(query = {}) {
    if (!import.meta.client || !('full' in query)) return
    const value = String(query.full ?? '')
    full.value = value !== '0' && value !== 'false'
    try {
      localStorage.setItem(STORAGE_KEY, full.value ? '1' : '0')
    } catch { /* not fatal; the flag lasts this page load */ }
  }

  return { full, restore, applyQuery }
}
