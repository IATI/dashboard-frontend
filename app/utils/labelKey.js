/**
 * An id -> i18n key helper: ('sub', 'basic_fields') -> 'subBasicFields'.
 *
 * Shared because both an organisation's page and the About page name the same
 * components, dimensions and enum values from the same keys.
 *
 * Null-safe on purpose. A null id used to throw here, which took down the page
 * for every publisher whose reference source was unset.
 */
export const labelKey = (prefix, id) =>
  (id ? prefix + id.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase()) : null)
