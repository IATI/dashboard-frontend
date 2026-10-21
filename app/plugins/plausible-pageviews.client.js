/**
 * Sends the pageviews, instead of letting the tracker send them itself.
 *
 * The tracker reports whatever is in the address bar, and sign-in returns the
 * browser to the app root carrying the OpenID authorization code:
 *
 *   {"n":"pageview","u":"https://…/?code=SECRET&session_state=…"}
 *
 * That code is single-use, already spent by the time anything renders, and
 * bound to a PKCE verifier that never leaves the browser, so it is not much of
 * a secret by then. It is still a credential, and sending it to an analytics
 * service is avoidable: the module's automatic pageviews are off (see
 * nuxt.config) and these go out with the OpenID parameters removed.
 *
 * Only those parameters are removed. Everything else survives, so campaign
 * tagging on a link to the dashboard still works.
 */
const OPENID_PARAMS = [
  'code', 'state', 'session_state', 'error', 'error_description', 'error_uri',
]

export default defineNuxtPlugin(nuxtApp => {
  const router = useRouter()

  // The address bar, less anything the identity provider put there.
  function cleanUrl() {
    const url = new URL(window.location.href)
    for (const param of OPENID_PARAMS) url.searchParams.delete(param)
    return url.href
  }

  // The tracker fires one pageview per navigation; a replace() that only strips
  // the callback parameters is the same page, and should not count twice.
  let last = null
  function send() {
    const url = cleanUrl()
    if (url === last) return
    last = url
    useTrackPageview({ url })
  }

  // After hydration, so the first pageview carries the route the user actually
  // landed on rather than the one the server rendered.
  nuxtApp.hook('app:mounted', () => {
    send()
    router.afterEach(() => nextTick(send))
  })
})
