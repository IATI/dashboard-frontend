/**
 * A minimal XLSX writer: enough of SpreadsheetML for a flat data export.
 *
 * Hand-rolled rather than pulled from npm so the export scripts stay runnable
 * with nothing but `node` — no install step before an occasional manual run,
 * and no dependency added to the frontend for something the frontend does not
 * use. It covers only what a data sheet needs: inline strings, numbers, a bold
 * frozen header row, autofilter and column widths. No formulas, no formatting,
 * no shared string table.
 *
 * An .xlsx file is a ZIP of XML parts, so most of this is the ZIP container.
 */
import { deflateRawSync } from 'node:zlib'

// --- ZIP ---------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

// 1980-01-01, the earliest a DOS timestamp can express. Fixed rather than "now"
// so two runs over identical data produce byte-identical files, which makes it
// obvious whether a re-run actually changed anything.
const DOS_EPOCH_DATE = 33
const DOS_EPOCH_TIME = 0

/** @param {{name: string, data: Buffer}[]} entries */
function zip(entries) {
  const parts = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const body = deflateRawSync(entry.data, { level: 9 })
    const crc = crc32(entry.data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)   // local file header signature
    local.writeUInt16LE(20, 4)           // version needed
    local.writeUInt16LE(0, 6)            // flags
    local.writeUInt16LE(8, 8)            // method: deflate
    local.writeUInt16LE(DOS_EPOCH_TIME, 10)
    local.writeUInt16LE(DOS_EPOCH_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    parts.push(local, name, body)

    const dir = Buffer.alloc(46)
    dir.writeUInt32LE(0x02014b50, 0)     // central directory signature
    dir.writeUInt16LE(20, 4)             // version made by
    dir.writeUInt16LE(20, 6)             // version needed
    dir.writeUInt16LE(0, 8)              // flags
    dir.writeUInt16LE(8, 10)             // method: deflate
    dir.writeUInt16LE(DOS_EPOCH_TIME, 12)
    dir.writeUInt16LE(DOS_EPOCH_DATE, 14)
    dir.writeUInt32LE(crc, 16)
    dir.writeUInt32LE(body.length, 20)
    dir.writeUInt32LE(entry.data.length, 24)
    dir.writeUInt16LE(name.length, 28)
    dir.writeUInt32LE(offset, 42)        // offset of this entry's local header
    central.push(dir, name)

    offset += local.length + name.length + body.length
  }

  const directory = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)       // end of central directory signature
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)

  return Buffer.concat([...parts, directory, end])
}

// --- SpreadsheetML -----------------------------------------------------------

const esc = value => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Control characters are not representable in XML 1.0 and Excel rejects the
  // file outright if one slips through. Publisher descriptions do contain them.
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')

/** 0 -> 'A', 25 -> 'Z', 26 -> 'AA' */
function columnName(index) {
  let name = ''
  for (let n = index + 1; n > 0;) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = (n - 1 - rem) / 26
  }
  return name
}

function cell(ref, value, style) {
  const s = style ? ` s="${style}"` : ''
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') {
    // NaN and Infinity have no SpreadsheetML representation; leave the cell blank.
    if (!Number.isFinite(value)) return ''
    return `<c r="${ref}"${s}><v>${value}</v></c>`
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`
}

function sheetXml({ columns, rows }) {
  const lastCol = columnName(Math.max(columns.length - 1, 0))
  const lastRow = rows.length + 1
  const ref = `A1:${lastCol}${lastRow}`

  const cols = columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 16}" customWidth="1"/>`)
    .join('')

  const header = `<row r="1">${
    columns.map((c, i) => cell(`${columnName(i)}1`, c.header, 1)).join('')
  }</row>`

  const body = rows.map((row, r) => `<row r="${r + 2}">${
    columns.map((c, i) => cell(`${columnName(i)}${r + 2}`, row[c.key])).join('')
  }</row>`).join('')

  // Element order is fixed by the schema: dimension, sheetViews, sheetFormatPr,
  // cols, sheetData, then autoFilter.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${ref}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${header}${body}</sheetData><autoFilter ref="${ref}"/></worksheet>`
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

/**
 * Build an .xlsx as a Buffer.
 *
 * @param {{name: string, columns: {key: string, header: string, width?: number}[], rows: object[]}[]} sheets
 */
export function buildXlsx(sheets) {
  if (!sheets.length) throw new Error('an xlsx needs at least one sheet')

  const file = (name, xml) => ({ name, data: Buffer.from(xml, 'utf8') })

  const sheetRels = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('')

  return zip([
    file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${
      sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
    }<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),

    file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),

    file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${
      sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
    }</sheets></workbook>`),

    file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),

    ...sheets.map((s, i) => file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s))),

    file('xl/styles.xml', STYLES),
  ])
}
