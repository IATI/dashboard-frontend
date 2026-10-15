/**
 * Who may see which organisation's assessment.
 *
 * The single authority for access in this app: the layout gate, the nav and the
 * organisations list all read it, so they cannot disagree. The rules themselves
 * are pure functions in utils/access.js, which is where they are tested; this
 * only feeds them the reactive state they need.
 *
 * A viewer sees their own organisations because Register Your Data says they
 * administer them (see useMyPublishers). A short list of named accounts sees
 * every organisation instead, for the people running the consultation.
 *
 * READ THIS BEFORE RELYING ON IT. This is a deterrent, not enforcement, for the
 * same reason the password gate it replaces was not enforcement: the site is
 * statically generated and has no server, and the assessment data comes from a
 * public API that requires no authentication at all. Anyone who opens the
 * network tab, or simply requests the API directly, can read every
 * organisation's figures regardless of what this file says. What it does
 * achieve is that the site shows a publisher only their own data, and that the
 * prerendered HTML carries no organisation content — so view-source and
 * crawlers find the sign-in prompt. Making this a real control needs
 * authentication in front of the data API, which is not in this repository.
 */
export function useAccess() {
  const { user, ready } = useAuth()
  const { slugs, state: scopeState, error: scopeError } = useMyPublishers()
  const { public: { allOrgsEmails } } = useRuntimeConfig()

  const allowList = computed(() => parseAllowList(allOrgsEmails))
  const seesAll = computed(() => seesAllOrgs(user.value, allowList.value))

  const status = computed(() => accessStatus({
    ready: ready.value,
    user: user.value,
    allowList: allowList.value,
    scopeState: scopeState.value,
    slugCount: slugs.value.size,
  }))

  return {
    status,
    seesAll,
    slugs,
    scopeError,
    /** Whether this viewer may see one organisation's page. */
    canSee: slug => canSeeOrg(status.value, slugs.value, slug),
    /** Whether a route may be rendered. */
    canOpen: path => canOpenPath(path, status.value, slugs.value),
  }
}
