import Papa from 'papaparse'

export function parseCSV(text) {
  const { data } = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transform: val => val.trim(),
  })
  return data
}

export function toMonthly(rows, dateKey, valKey) {
  const m = {}
  for (const r of rows) {
    const mon = r[dateKey]?.slice(0, 7)
    if (mon) m[mon] = { date: mon, value: Number(r[valKey]) }
  }
  return Object.values(m).sort((a, b) => a.date.localeCompare(b.date))
}

export function toMonthlyMulti(rows, dateKey) {
  const allKeys = rows.length ? Object.keys(rows[0]).filter(k => k !== dateKey) : []
  const m = {}
  for (const r of rows) {
    const mon = r[dateKey]?.slice(0, 7)
    if (!mon) continue
    if (!m[mon]) { m[mon] = { date: mon }; allKeys.forEach(k => { m[mon][k] = 0 }) }
    allKeys.forEach(k => { if (r[k]) m[mon][k] = Number(r[k]) })
  }
  const sorted = Object.values(m).sort((a, b) => a.date.localeCompare(b.date))
  return { labels: sorted.map(d => d.date), series: allKeys, rows: sorted }
}
