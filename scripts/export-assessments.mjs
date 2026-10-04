#!/usr/bin/env node
/**
 * Export every reporting organisation's assessment to a spreadsheet.
 *
 * A reporting tool, not part of the site: run by hand after the API's data or
 * the methodology changes, to see every publisher's scores at once.
 *
 *   node scripts/export-assessments.mjs
 *   node scripts/export-assessments.mjs --out /tmp/scores.xlsx --limit 200
 *
 * It imports the same adapter the organisation page uses, so a methodology or
 * scoring change is picked up here without touching this file. In particular the
 * assessment comes from toAssessmentFragment, which applies the timeliness
 * correction the page applies — so a row here matches what that publisher's page
 * shows, rather than the API's raw bands.
 *
 * Flags:
 *   --out <path>        where to write (default ./iati-dq-assessments-<date>.xlsx)
 *   --limit <n>         stop after n organisations, for a quick check
 *   --page-size <n>     organisations per request (default 100)
 *   --concurrency <n>   requests in flight (default 4)
 *   --base <url>        API base (default the frontend's dashboardBase)
 */
import { writeFileSync } from 'node:fs'
import { argv } from 'node:process'
import { createRequire } from 'node:module'

import { adaptPublisher, toAssessmentFragment } from '../app/utils/adaptPublisher.js'
import { buildXlsx } from './lib/xlsx.mjs'

const methodology = createRequire(import.meta.url)('../sample-data/methodology.json')

// Matches runtimeConfig.public.dashboardBase in nuxt.config.ts.
const DEFAULT_BASE = 'https://dev2.dashboard.iatistandard.org'
// Sends Access-Control-Allow-Origin: *, and is where the page gets type names.
const CODELIST_BASE = 'https://codelists.codeforiati.org/api/json/en'

// --- arguments ---------------------------------------------------------------

function parseArgs(args) {
  const opts = {
    out: null,
    limit: Infinity,
    pageSize: 100,
    concurrency: 4,
    base: DEFAULT_BASE,
  }
  const numeric = { limit: 'limit', 'page-size': 'pageSize', concurrency: 'concurrency' }

  for (let i = 0; i < args.length; i++) {
    const flag = args[i].replace(/^--/, '')
    const value = args[++i]
    if (value === undefined) throw new Error(`--${flag} needs a value`)
    if (flag === 'out') opts.out = value
    else if (flag === 'base') opts.base = value.replace(/\/$/, '')
    else if (numeric[flag]) {
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) throw new Error(`--${flag} must be a positive number`)
      opts[numeric[flag]] = n
    } else throw new Error(`unknown flag --${flag}`)
  }

  const today = new Date().toISOString().slice(0, 10)
  opts.out ??= `iati-dq-assessments-${today}.xlsx`
  return opts
}

// --- labels ------------------------------------------------------------------

const BAND_LABEL = {
  needs_improvement: 'Needs improvement',
  good: 'Good',
  very_good: 'Very good',
  excellent: 'Excellent',
}

// Numeric equivalents, so the sheet can be sorted and pivoted without a lookup.
// Same ladder the adapter uses to pick the weakest band.
const BAND_RANK = { needs_improvement: 0, good: 1, very_good: 2, excellent: 3 }

// The enum components read as codes in the payload. These are the words the
// page shows.
const ENUM_LABEL = {
  more_than_one_year: 'More than one year',
  one_year: 'One year',
  six_months: 'Six months',
  one_quarter: 'One quarter',
  one_month: 'One month',
  less_than_annual: 'Less than annual',
  annually: 'Annually',
  six_monthly: 'Six monthly',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
}

/**
 * The dimensions and their components, in the order the page shows them.
 * `unit` says how to render a component's value:
 *   percent — 0-100, already rounded by the adapter
 *   count   — a plain number (disaggregation is a count of quarters)
 *   enum    — a code, shown as words
 *   boolean — shown as Yes/No
 */
const DIMENSIONS = [
  { id: 'availability', label: 'Availability', components: [
    { id: 'downloadable',       label: 'No download errors', unit: 'boolean' },
    { id: 'no_critical_errors', label: 'No critical errors',  unit: 'boolean' },
    { id: 'no_errors',          label: 'No non-critical errors', unit: 'boolean' },
  ] },
  { id: 'timeliness', label: 'Timeliness', components: [
    { id: 'timeliness', label: 'Time lag',  unit: 'enum' },
    { id: 'frequency',  label: 'Frequency', unit: 'enum' },
  ] },
  { id: 'coverage', label: 'Coverage', components: [
    { id: 'coverage',       label: 'Coverage',       unit: 'percent' },
    { id: 'disaggregation', label: 'Disaggregation', unit: 'count' },
  ] },
  { id: 'comprehensiveness', label: 'Comprehensiveness', components: [
    { id: 'organisation_fields', label: 'Organisation fields', unit: 'percent' },
    { id: 'basic_fields',        label: 'Basic fields',        unit: 'percent' },
    { id: 'financial_fields',    label: 'Financial fields',    unit: 'percent' },
    { id: 'advanced_fields',     label: 'Advanced fields',     unit: 'percent' },
  ] },
]

function componentValue(unit, value) {
  if (value === null || value === undefined) return null
  if (unit === 'boolean') return value ? 'Yes' : 'No'
  if (unit === 'enum') return ENUM_LABEL[value] ?? String(value)
  return typeof value === 'number' ? value : null
}

// --- fetching ----------------------------------------------------------------

async function getJson(url, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (cause) {
      // The stats payloads are large and the occasional page times out; a whole
      // run is too slow to throw away over one of them.
      if (attempt >= attempts) throw new Error(`failed after ${attempts} tries: ${url}`, { cause })
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}

const pageUrl = (base, page, pageSize) =>
  `${base}/api/reporting-orgs/?page=${page}&page_size=${pageSize}&show_stats=1`

/**
 * Walk the paged list, handing each page's organisations to `onPage`.
 *
 * Pages are fetched a few at a time but handled in order, and each page is
 * released once handled: the full set of stats payloads is a few hundred
 * megabytes, which is worth not holding all at once.
 */
async function eachPage(opts, onPage) {
  const first = await getJson(pageUrl(opts.base, 1, opts.pageSize))
  const total = Math.min(first.count ?? first.results.length, opts.limit)
  const pages = Math.ceil(total / opts.pageSize)

  await onPage(first.results, 1, pages)

  for (let page = 2; page <= pages; page += opts.concurrency) {
    const batch = []
    for (let i = 0; i < opts.concurrency && page + i <= pages; i++) {
      batch.push(getJson(pageUrl(opts.base, page + i, opts.pageSize)))
    }
    const settled = await Promise.all(batch)
    for (const [i, body] of settled.entries()) await onPage(body.results, page + i, pages)
  }

  return total
}

// --- rows --------------------------------------------------------------------

const STALE_AFTER_MONTHS = 24   // as on the organisation page

function monthsSince(yearMonth) {
  if (!yearMonth) return null
  const [y, m] = String(yearMonth).split('-').map(Number)
  if (!y || !m) return null
  const now = new Date()
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
}

/**
 * The one-line caveat the page would show this publisher, or '' for none.
 * Mutually exclusive, in the page's order of precedence — an organisation with
 * no activity file is not also "stopped publishing".
 */
function dataStatus(stats) {
  if (!stats) return 'No statistics available'
  if (!stats.activityCount) return 'No activity file'
  if (!stats.transactionTotal) return 'No transactions'
  const months = monthsSince(stats.lastPublished)
  if (months !== null && months > STALE_AFTER_MONTHS) {
    return `Last published ${Math.floor(months / 12)}+ years ago`
  }
  return ''
}

/** ISO timestamp -> 'YYYY-MM-DD', which is what a spreadsheet wants. */
const toDate = value => (value ? String(value).slice(0, 10) : null)

function buildRow(raw, typeName) {
  const publisher = adaptPublisher(raw, methodology)
  const stats = publisher.stats
  const assessment = stats ? toAssessmentFragment({ publisher }, methodology) : null
  const coverage = stats?.coverage ?? null

  const row = {
    organisation_identifier: publisher.identity.iatiIdentifier,
    short_name: publisher.identity.shortName,
    name: publisher.identity.name,
    organisation_type: typeName,
    organisation_type_code: publisher.identity.organisationType,
    hq_country: raw.hq_country || null,
    first_publication_date: toDate(raw.first_publication_date),

    overall: BAND_LABEL[assessment?.overall?.category] ?? null,
    overall_rank: BAND_RANK[assessment?.overall?.category] ?? null,
  }

  for (const dim of DIMENSIONS) {
    const scored = assessment?.dimensions?.[dim.id] ?? null
    row[`${dim.id}_band`] = BAND_LABEL[scored?.category] ?? null
    row[`${dim.id}_rank`] = BAND_RANK[scored?.category] ?? null
    for (const comp of dim.components) {
      const measured = scored?.components?.[comp.id] ?? null
      row[comp.id] = componentValue(comp.unit, measured?.value)
      row[`${comp.id}_band`] = BAND_LABEL[measured?.category] ?? null
    }
  }

  // Context for reading the scores: why coverage might be absent, how much data
  // there is, and when it was last touched.
  row.data_status = dataStatus(stats)
  row.activities = stats?.activityCount ?? null
  row.activity_files = stats?.datasetCount ?? null
  row.transaction_total = stats?.transactionTotal ?? null
  row.last_published = stats?.lastPublished ?? null
  row.most_recent_transaction = toDate(stats?.mostRecentTransactionDate)
  row.validation_pass = stats?.validation?.pass ?? null
  row.validation_fail = stats?.validation?.fail ?? null
  row.coverage_has_reference = coverage ? (coverage.hasReference ? 'Yes' : 'No') : null
  row.coverage_reference_source = coverage?.referenceSource ?? null
  row.coverage_reference_year = coverage?.referenceYear ?? null
  row.iati_spending_usd = coverage?.iatiSpendingUsd ?? null
  row.reference_value_usd = coverage?.referenceValueUsd ?? null
  row.website = publisher.identity.website || null

  return row
}

// --- sheets ------------------------------------------------------------------

function columns() {
  const cols = [
    { key: 'organisation_identifier', header: 'Organisation identifier', width: 26 },
    { key: 'short_name',              header: 'Short name',              width: 18 },
    { key: 'name',                    header: 'Name of organisation',    width: 44 },
    { key: 'organisation_type',       header: 'Organisation type',       width: 24 },
    { key: 'organisation_type_code',  header: 'Type code',               width: 10 },
    { key: 'hq_country',              header: 'HQ country',              width: 11 },
    { key: 'first_publication_date',  header: 'First published',         width: 15 },
    { key: 'overall',                 header: 'Overall assessment',      width: 19 },
    { key: 'overall_rank',            header: 'Overall (0-3)',           width: 13 },
  ]

  for (const dim of DIMENSIONS) {
    cols.push({ key: `${dim.id}_band`, header: `${dim.label}`, width: 19 })
    cols.push({ key: `${dim.id}_rank`, header: `${dim.label} (0-3)`, width: 15 })
    for (const comp of dim.components) {
      const suffix = comp.unit === 'percent' ? ' (%)' : comp.unit === 'count' ? ' (quarters)' : ''
      cols.push({ key: comp.id, header: `${comp.label}${suffix}`, width: 20 })
      cols.push({ key: `${comp.id}_band`, header: `${comp.label} band`, width: 20 })
    }
  }

  return cols.concat([
    { key: 'data_status',              header: 'Data status',               width: 28 },
    { key: 'activities',               header: 'Activities',                width: 12 },
    { key: 'activity_files',           header: 'Activity files',            width: 13 },
    { key: 'transaction_total',        header: 'Transactions',              width: 13 },
    { key: 'last_published',           header: 'Last published',            width: 14 },
    { key: 'most_recent_transaction',  header: 'Most recent transaction',   width: 22 },
    { key: 'validation_pass',          header: 'Validation pass',           width: 15 },
    { key: 'validation_fail',          header: 'Validation fail',           width: 15 },
    { key: 'coverage_has_reference',   header: 'Has reference figure',      width: 19 },
    { key: 'coverage_reference_source', header: 'Reference source',         width: 18 },
    { key: 'coverage_reference_year',  header: 'Reference year',            width: 14 },
    { key: 'iati_spending_usd',        header: 'IATI spending (USD)',       width: 20 },
    { key: 'reference_value_usd',      header: 'Reference spending (USD)',  width: 23 },
    { key: 'website',                  header: 'Website',                   width: 34 },
  ])
}

/** A sheet explaining the bands and thresholds, so the file travels on its own. */
function notesSheet(opts, generated, count) {
  const rows = [
    { a: 'Generated', b: generated },
    { a: 'Source', b: `${opts.base}/api/reporting-orgs/?show_stats=1` },
    { a: 'Organisations', b: String(count) },
    { a: '', b: '' },
    { a: 'Bands', b: 'Needs improvement (0), Good (1), Very good (2), Excellent (3)' },
    { a: 'Dimension band', b: 'The weakest of its components, except timeliness, which uses the methodology’s joint rule for time lag and frequency.' },
    { a: 'Overall assessment', b: 'The weakest of the four dimension bands.' },
    { a: 'Blank cells', b: 'Not measured, which is not the same as zero — coverage is blank where the organisation has no reference spending figure to be compared against.' },
    { a: '', b: '' },
    { a: 'Thresholds', b: '' },
  ]
  for (const dim of DIMENSIONS) {
    for (const comp of dim.components) {
      const meta = methodology.components?.[comp.id]
      if (!meta) continue
      const t = meta.thresholds ?? {}
      const describe = band => (band in t ? String(t[band]) : 'any')
      rows.push({
        a: `${dim.label}: ${comp.label}`,
        b: `good ${describe('good')}, very good ${describe('very_good')}, excellent ${describe('excellent')} (${meta.unit})`,
      })
    }
  }
  return {
    name: 'Notes',
    columns: [{ key: 'a', header: 'Field', width: 34 }, { key: 'b', header: 'Value', width: 110 }],
    rows,
  }
}

// --- main --------------------------------------------------------------------

async function main() {
  const opts = parseArgs(argv.slice(2))
  const started = Date.now()

  process.stderr.write('Loading organisation types…\n')
  const typeList = await getJson(`${CODELIST_BASE}/OrganisationType.json`)
  const typeNames = new Map((typeList.data ?? []).map(item => [String(item.code), item.name]))

  const rows = []
  const failures = []

  const total = await eachPage(opts, (results, page, pages) => {
    for (const raw of results) {
      if (rows.length >= opts.limit) break
      try {
        rows.push(buildRow(raw, typeNames.get(String(raw.organisation_type)) ?? null))
      } catch (error) {
        // One malformed publisher should not lose the other two thousand.
        failures.push(`${raw.short_name}: ${error.message}`)
      }
    }
    process.stderr.write(`\rPage ${page}/${pages} — ${rows.length} organisations`)
  })

  process.stderr.write('\n')

  rows.sort((a, b) => (a.short_name ?? '').localeCompare(b.short_name ?? ''))

  const generated = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  writeFileSync(opts.out, buildXlsx([
    { name: 'Assessments', columns: columns(), rows },
    notesSheet(opts, generated, rows.length),
  ]))

  const seconds = ((Date.now() - started) / 1000).toFixed(0)
  process.stderr.write(`Wrote ${opts.out} — ${rows.length} of ${total} organisations in ${seconds}s\n`)
  if (failures.length) {
    process.stderr.write(`${failures.length} could not be adapted:\n  ${failures.join('\n  ')}\n`)
  }
}

main().catch(error => {
  process.stderr.write(`\n${error.message}\n`)
  process.exitCode = 1
})
