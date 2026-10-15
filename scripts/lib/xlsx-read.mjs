/**
 * A minimal XLSX reader: enough to pull one named column out of a sheet.
 *
 * The companion to xlsx.mjs, and hand-rolled for the same reason — the export
 * scripts should run with nothing but `node`. It exists so an annotation a human
 * has made in a spreadsheet can be read back on every re-run, instead of being
 * copied into the code once and going stale.
 *
 * It handles what Excel actually writes: a shared string table, `inlineStr`
 * cells (what xlsx.mjs itself writes), sparse rows with gaps, and sheet order
 * resolved through the workbook relationships rather than guessed from file
 * names. No formulas, no dates, no formatting — every value comes back as a
 * trimmed string.
 */
import { inflateRawSync } from 'node:zlib'
import { readFileSync } from 'node:fs'

// --- ZIP ---------------------------------------------------------------------

/**
 * Read a ZIP's entries into a map of name -> Buffer.
 *
 * Walks the central directory rather than scanning for local headers, because
 * only the central directory is authoritative about where each entry starts.
 */
function unzip(buf) {
  // The end-of-central-directory record is last, but a trailing comment can sit
  // after it, so scan back for the signature.
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('not a zip file (no end-of-central-directory record)')

  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const out = new Map()

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt zip central directory')
    const method = buf.readUInt16LE(p + 10)
    const compressedSize = buf.readUInt32LE(p + 20)
    const nameLength = buf.readUInt16LE(p + 28)
    const extraLength = buf.readUInt16LE(p + 30)
    const commentLength = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLength)

    // The local header repeats the name and extra field, at its own lengths.
    const localNameLength = buf.readUInt16LE(localOffset + 26)
    const localExtraLength = buf.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLength + localExtraLength
    const body = buf.subarray(start, start + compressedSize)

    if (method === 0) out.set(name, body)
    else if (method === 8) out.set(name, inflateRawSync(body))
    else throw new Error(`${name}: unsupported zip compression method ${method}`)

    p += 46 + nameLength + extraLength + commentLength
  }
  return out
}

// --- XML ---------------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

const decode = s => s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m
  const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))
  return Number.isFinite(n) ? String.fromCodePoint(n) : m
})

/** The text of every <t> in a fragment, concatenated — a rich string's runs. */
const textOf = xml => [...xml.matchAll(/<t(?:\s[^>]*)?\/>|<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
  .map(m => decode(m[1] ?? ''))
  .join('')

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null

// --- sheets ------------------------------------------------------------------

/** 'AB' -> 27 (zero-based column index) */
function columnIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A'
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function sharedStrings(files) {
  const xml = files.get('xl/sharedStrings.xml')
  if (!xml) return []
  return [...xml.toString('utf8').matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m => textOf(m[1]))
}

/** Sheet name -> part path, in workbook order. */
function sheetParts(files) {
  const wb = files.get('xl/workbook.xml')?.toString('utf8')
  if (!wb) throw new Error('not an xlsx file (no xl/workbook.xml)')
  const rels = new Map(
    [...(files.get('xl/_rels/workbook.xml.rels')?.toString('utf8') ?? '')
      .matchAll(/<Relationship\s[^>]*\/?>/g)]
      .map(m => [attr(m[0], 'Id'), attr(m[0], 'Target')]),
  )
  return new Map([...wb.matchAll(/<sheet\s[^>]*\/?>/g)].map(m => {
    const target = rels.get(attr(m[0], 'r:id')) ?? ''
    const path = target.replace(/^\//, '')
    return [decode(attr(m[0], 'name') ?? ''), path.startsWith('xl/') ? path : `xl/${path}`]
  }))
}

function sheetRows(files, part, shared) {
  const xml = files.get(part)?.toString('utf8')
  if (!xml) throw new Error(`missing sheet part ${part}`)

  return [...xml.matchAll(/<row(?:\s[^>]*)?\/>|<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)].map(row => {
    const cells = []
    for (const m of (row[1] ?? '').matchAll(/<c(\s[^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, head, body = ''] = m
      const type = attr(head, 't')
      const ref = attr(head, 'r')
      let value
      if (type === 's') {
        const i = Number(body.match(/<v>([\s\S]*?)<\/v>/)?.[1])
        value = shared[i] ?? ''
      } else if (type === 'inlineStr') {
        value = textOf(body)
      } else {
        // 'str' (a formula's cached text) and numbers both live in <v>.
        value = decode(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '')
      }
      // Rows are sparse: an empty cell is simply absent, so place by reference.
      cells[ref ? columnIndex(ref) : cells.length] = value.trim()
    }
    return [...cells].map(v => v ?? '')
  })
}

// --- public ------------------------------------------------------------------

/** Every sheet in a workbook, as `{ name, rows }` with rows of strings. */
export function readXlsx(path) {
  const files = unzip(readFileSync(path))
  const shared = sharedStrings(files)
  return [...sheetParts(files)].map(([name, part]) => ({
    name,
    rows: sheetRows(files, part, shared),
  }))
}

/**
 * Read a two-column mapping out of every sheet that has both headers.
 *
 * Sheets without them are skipped, which is what lets a workbook carry a notes
 * or summary tab alongside the data. A later sheet does not overwrite an
 * earlier one's answer, so the first sheet that mentions a key wins; a
 * disagreement between sheets is reported rather than silently resolved.
 *
 * @returns {{ map: Map<string, string>, conflicts: {key: string, had: string, found: string, sheet: string}[], sheets: string[] }}
 */
export function readColumnMap(path, keyHeader, valueHeader) {
  const map = new Map()
  const conflicts = []
  const sheets = []

  for (const { name, rows } of readXlsx(path)) {
    if (!rows.length) continue
    const header = rows[0]
    const k = header.indexOf(keyHeader)
    const v = header.indexOf(valueHeader)
    if (k < 0 || v < 0) continue
    sheets.push(name)

    for (const row of rows.slice(1)) {
      const key = row[k]
      const value = row[v]
      if (!key || !value) continue
      const had = map.get(key)
      if (had === undefined) map.set(key, value)
      else if (had !== value) conflicts.push({ key, had, found: value, sheet: name })
    }
  }

  if (!sheets.length) {
    throw new Error(`no sheet in ${path} has both a "${keyHeader}" and a "${valueHeader}" column`)
  }
  return { map, conflicts, sheets }
}
