/**
 * The address to send people to for help.
 *
 * A constant rather than part of the message text, because vue-i18n compiles
 * every message and reads a bare @ as a linked-message marker: an email address
 * written into a locale string fails the whole page at render. Messages take an
 * {email} placeholder and the component passes this in.
 */
export const SUPPORT_EMAIL = 'support@iatistandard.org'
