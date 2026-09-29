/**
 * Sign-in with an IATI Account, via Asgardeo (WSO2) OIDC.
 *
 * Mirrors IATI's own SPA example: the same tenant, client and scopes, and the
 * same SDK. `ryd` / `ryd:reporting_org` are what let the access token read which
 * reporting organisations the signed-in user administers (see useMyPublishers).
 *
 * Everything here is client-only. The SDK touches `window` on import and keeps
 * its tokens in the browser, and this site is statically generated, so there is
 * no server side to authenticate on. The import is dynamic so the SDK never
 * reaches the server bundle.
 */

// One client per page load, shared by every caller of useAuth().
let clientPromise = null

/**
 * Where to return after sign-in. Asgardeo always sends us back to the app root
 * (one registered redirect URL covers the whole site), so the page the user
 * started on is remembered here and restored once the redirect completes.
 *
 * sessionStorage rather than localStorage: it should not outlive the tab, and a
 * second tab signing in should not hijack this one's destination.
 */
const RETURN_KEY = 'iati-dq-signin-return'

/** Only ever a path within this app — never an absolute or protocol-relative URL. */
function isSafeReturnPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
}

/**
 * Asgardeo matches this against the app's registered redirect URLs exactly, so
 * it is derived from wherever the app is actually being served rather than
 * hardcoded — localhost in development, the Pages URL in production. Both have
 * to be registered against the client for sign-in to succeed.
 */
function appOrigin() {
  const { app } = useRuntimeConfig()
  return new URL(app.baseURL || '/', window.location.origin).href
}

function getClient() {
  if (!import.meta.client) return null
  if (!clientPromise) {
    const { public: { auth } } = useRuntimeConfig()
    clientPromise = import('@asgardeo/auth-spa').then(async ({ AsgardeoSPAClient }) => {
      const client = AsgardeoSPAClient.getInstance()
      await client.initialize({
        clientID: auth.clientId,
        baseUrl: auth.baseUrl,
        signInRedirectURL: appOrigin(),
        signOutRedirectURL: appOrigin(),
        scope: auth.scope.split(' ').filter(Boolean),
      })
      return client
    })
  }
  return clientPromise
}

export function useAuth() {
  const router = useRouter()

  // Shared across components; `ready` distinguishes "not signed in" from
  // "we have not looked yet", so the header does not flash a Sign in button at
  // someone who is already signed in.
  const user = useState('auth:user', () => null)
  const token = useState('auth:token', () => null)
  const ready = useState('auth:ready', () => false)
  const error = useState('auth:error', () => null)

  const isSignedIn = computed(() => Boolean(user.value))

  /**
   * Completes a redirect back from Asgardeo if that is why we are here, then
   * restores an existing session. Called once from the client plugin.
   */
  async function restore() {
    const client = await getClient()
    if (!client) return

    // Read this before the SDK processes and cleans the URL: it is what
    // distinguishes "just came back from Asgardeo" from an ordinary page load,
    // and only the former should navigate anywhere.
    const returning = new URLSearchParams(window.location.search).has('code')

    try {
      // No-op unless the URL carries an authorization code.
      await client.signIn({ callOnlyOnRedirect: true })
    } catch (e) {
      error.value = e?.message ?? 'Sign-in failed'
    }

    if (returning) restoreReturnPath()

    try {
      if (await client.isAuthenticated()) {
        const info = await client.getBasicUserInfo()
        user.value = { ...info, name: displayName(info) }
        token.value = await client.getAccessToken()
      }
    } catch (e) {
      error.value = e?.message ?? 'Could not restore the session'
    } finally {
      ready.value = true
    }
  }

  /** Navigate back to wherever sign-in was started from, once only. */
  function restoreReturnPath() {
    let path = null
    try {
      path = sessionStorage.getItem(RETURN_KEY)
      sessionStorage.removeItem(RETURN_KEY)
    } catch { /* blocked storage — stay on the root */ }

    if (isSafeReturnPath(path) && path !== router.currentRoute.value.fullPath) {
      // replace, not push: the redirect should not leave a back-button trap.
      router.replace(path)
    }
  }

  async function signIn() {
    error.value = null
    // Stash before redirecting — signIn() navigates away and nothing after it runs.
    try {
      sessionStorage.setItem(RETURN_KEY, router.currentRoute.value.fullPath)
    } catch { /* blocked storage — sign-in still works, just returns to the root */ }
    const client = await getClient()
    await client?.signIn()
  }

  async function signOut() {
    const client = await getClient()
    user.value = null
    token.value = null
    await client?.signOut()
  }

  return { user, token, ready, error, isSignedIn, restore, signIn, signOut }
}

/** Asgardeo prefixes the username with its userstore ("DEFAULT/alice"). */
function displayName(info) {
  const username = String(info?.username ?? '')
  const bare = username.includes('/') ? username.split('/').slice(1).join('/') : username
  return info?.displayName || bare || info?.email || null
}
