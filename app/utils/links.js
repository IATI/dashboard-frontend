/**
 * Where feedback goes.
 *
 * Constants rather than message text: vue-i18n compiles every message and reads
 * a bare @ as a linked-message marker, and these URLs are repeated across the
 * banner, the About page and every organisation's page, which is three places
 * to miss when one of them changes. Same reasoning as SUPPORT_EMAIL.
 */

/** One issue per indicator and per component. */
export const FEEDBACK_URL = 'https://github.com/IATI/dashboard-feedback/issues'

/** The consultation thread on IATI Connect: indicators and rating thresholds. */
export const CONNECT_URL = 'https://connect.iatistandard.org/post/reimagining-iati-data-quality-phase-3-consultation-%E2%80%93-indicators-and-rating-thresholds-13901602?pid=1345126177'
