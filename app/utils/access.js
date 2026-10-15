/**
 * Who may see which organisation's assessment — the decision itself.
 *
 * Pure functions, separate from the composable that feeds them reactive state,
 * so the rules can be tested directly rather than inferred from the rendered
 * page. useAccess is the thin wrapper; this is what actually decides.
 *
 * See useAccess for the important caveat about what this protects.
 */

/**
 * What a route requires of the viewer.
 *
 *   public — no sign-in. The methodology, which describes the framework and
 *            carries no organisation's data.
 *   own    — signed in. Shows only the organisations the viewer administers.
 *   all    — signed in AND on the all-organisations list. These pages are
 *            inherently cross-publisher: overviews, peer groups, country
 *            views, and the data-exploration pages.
 *
 * Anything unrecognised requires `all`, so a page added later is closed until
 * someone decides otherwise rather than open by default.
 */
export function routeAccess(path) {
  if (path === '/about') return 'public'
  if (path === '/organisations' || path.startsWith('/organisations/')) return 'own'
  return 'all'
}

/** The organisation a route is about, or null. '/organisations/afdb' -> 'afdb' */
export function routeOrgSlug(path) {
  const m = /^\/organisations\/([^/]+)\/?$/.exec(path)
  return m ? decodeURIComponent(m[1]) : null
}

/** The configured all-organisations accounts, lower-cased. */
export function parseAllowList(value) {
  return new Set(
    String(value ?? '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(e => e.toLowerCase()),
  )
}

/**
 * The identities one account could be matched on, lower-cased.
 *
 * Asgardeo supplies `email` for some accounts and only a `username` for others,
 * and prefixes the username with its userstore ("DEFAULT/alice"), so the bare
 * form is included too.
 */
export function accountIdentities(user) {
  if (!user) return []
  const username = String(user.username ?? '')
  const bare = username.includes('/') ? username.split('/').slice(1).join('/') : username
  return [user.email, username, bare]
    .filter(Boolean)
    .map(s => String(s).trim().toLowerCase())
}

/** Whether this account is on the all-organisations list. */
export function seesAllOrgs(user, allowList) {
  if (!user) return false
  const allowed = allowList instanceof Set ? allowList : parseAllowList(allowList)
  return accountIdentities(user).some(id => allowed.has(id))
}

/**
 * What the viewer's situation is:
 *
 *   loading    — still establishing who this is
 *   signed-out — nobody is signed in
 *   all        — sees every organisation
 *   scoped     — sees the organisations in `slugs`
 *   none       — signed in, but administers no organisation
 *   failed     — signed in, RYD did not answer; sees nothing
 *
 * Fails closed: an account whose organisations could not be established is
 * 'failed', which grants nothing.
 */
export function accessStatus({ ready, user, allowList, scopeState, slugCount }) {
  if (!ready) return 'loading'
  if (!user) return 'signed-out'
  if (seesAllOrgs(user, allowList)) return 'all'
  if (scopeState === 'failed') return 'failed'
  if (scopeState !== 'scoped') return 'loading'
  return slugCount > 0 ? 'scoped' : 'none'
}

/** Whether one organisation's page may be opened. */
export function canSeeOrg(status, slugs, slug) {
  if (status === 'all') return true
  if (status !== 'scoped') return false
  const set = slugs instanceof Set ? slugs : new Set(slugs ?? [])
  return set.has(slug)
}

/**
 * Whether a route may be rendered.
 *
 * The organisations list is open to anyone signed in whose scope is known,
 * because it narrows itself; an organisation's own page is checked by slug.
 */
export function canOpenPath(path, status, slugs) {
  const level = routeAccess(path)
  if (level === 'public') return true
  if (status === 'loading' || status === 'signed-out' || status === 'failed') return false
  if (level === 'all') return status === 'all'
  const slug = routeOrgSlug(path)
  if (!slug) return status === 'all' || status === 'scoped' || status === 'none'
  return canSeeOrg(status, slugs, slug)
}
