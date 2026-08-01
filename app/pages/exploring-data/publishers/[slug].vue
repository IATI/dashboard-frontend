<script setup>
definePageMeta({ active: 'exploring' })
const route = useRoute()
const slug = route.params.slug
const { public: { dashboardBase: BASE } } = useRuntimeConfig()
const C = { teal90: '#155366', teal70: '#448093', teal50: '#73adbf', orange: '#ff7264', grey20: '#dadada', grey60: '#686868', blue: '#06dbe4', green: '#00c497' }

const ORG_TYPES = {
  '10': 'Government', '15': 'Other Public Sector', '21': 'International NGO',
  '22': 'National NGO', '23': 'Regional NGO', '30': 'Public Private Partnership',
  '40': 'Multilateral', '60': 'Foundation', '70': 'Private Sector',
  '71': 'Private Sector (Provider Country)', '72': 'Private Sector (Recipient Country)',
  '73': 'Private Sector (Third Country)', '80': 'Academic, Training and Research', '90': 'Other',
}


function fmtBytes(n) {
  n = Number(n)
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} kB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1073741824).toFixed(2)} GB`
}

function fmtDate(iso) { return iso ? iso.slice(0, 10) : '—' }
function fmtNum(n) { const v = Number(n); return isNaN(v) || v === 0 ? '—' : v.toLocaleString() }

function fmtBudgetAmount(amount) {
  const n = Number(amount)
  if (!n) return null
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toFixed(0)
}

const TYPE_COLORS = [C.teal90, C.blue, C.green, C.orange, C.teal70, '#9b59b6', '#e67e22', '#1abc9c', C.teal50]

const COUNTRY_NAMES = {
  AF:'Afghanistan',AL:'Albania',DZ:'Algeria',AD:'Andorra',AO:'Angola',AG:'Antigua and Barbuda',AR:'Argentina',AM:'Armenia',AU:'Australia',AT:'Austria',AZ:'Azerbaijan',BS:'Bahamas',BH:'Bahrain',BD:'Bangladesh',BB:'Barbados',BY:'Belarus',BE:'Belgium',BZ:'Belize',BJ:'Benin',BT:'Bhutan',BO:'Bolivia',BA:'Bosnia and Herzegovina',BW:'Botswana',BR:'Brazil',BN:'Brunei',BF:'Burkina Faso',BI:'Burundi',CV:'Cabo Verde',KH:'Cambodia',CM:'Cameroon',CA:'Canada',CF:'Central African Republic',TD:'Chad',CL:'Chile',CN:'China',CO:'Colombia',KM:'Comoros',CG:'Congo',CD:'Dem. Rep. Congo',CR:'Costa Rica',CI:"Côte d'Ivoire",HR:'Croatia',CU:'Cuba',CY:'Cyprus',CZ:'Czechia',DK:'Denmark',DJ:'Djibouti',DM:'Dominica',DO:'Dominican Republic',EC:'Ecuador',EG:'Egypt',SV:'El Salvador',GQ:'Equatorial Guinea',ER:'Eritrea',EE:'Estonia',SZ:'Eswatini',ET:'Ethiopia',FJ:'Fiji',FI:'Finland',FR:'France',GA:'Gabon',GM:'Gambia',GE:'Georgia',DE:'Germany',GH:'Ghana',GR:'Greece',GD:'Grenada',GT:'Guatemala',GN:'Guinea',GW:'Guinea-Bissau',GY:'Guyana',HT:'Haiti',HN:'Honduras',HU:'Hungary',IS:'Iceland',IN:'India',ID:'Indonesia',IR:'Iran',IQ:'Iraq',IE:'Ireland',IL:'Israel',IT:'Italy',JM:'Jamaica',JP:'Japan',JO:'Jordan',KZ:'Kazakhstan',KE:'Kenya',KI:'Kiribati',KW:'Kuwait',KG:'Kyrgyzstan',LA:'Lao PDR',LV:'Latvia',LB:'Lebanon',LS:'Lesotho',LR:'Liberia',LY:'Libya',LI:'Liechtenstein',LT:'Lithuania',LU:'Luxembourg',MG:'Madagascar',MW:'Malawi',MY:'Malaysia',MV:'Maldives',ML:'Mali',MT:'Malta',MH:'Marshall Islands',MR:'Mauritania',MU:'Mauritius',MX:'Mexico',FM:'Micronesia',MD:'Moldova',MC:'Monaco',MN:'Mongolia',ME:'Montenegro',MA:'Morocco',MZ:'Mozambique',MM:'Myanmar',NA:'Namibia',NR:'Nauru',NP:'Nepal',NL:'Netherlands',NZ:'New Zealand',NI:'Nicaragua',NE:'Niger',NG:'Nigeria',MK:'North Macedonia',NO:'Norway',OM:'Oman',PK:'Pakistan',PW:'Palau',PA:'Panama',PG:'Papua New Guinea',PY:'Paraguay',PE:'Peru',PH:'Philippines',PL:'Poland',PT:'Portugal',QA:'Qatar',RO:'Romania',RU:'Russia',RW:'Rwanda',KN:'Saint Kitts and Nevis',LC:'Saint Lucia',VC:'Saint Vincent and the Grenadines',WS:'Samoa',SM:'San Marino',ST:'Sao Tome and Principe',SA:'Saudi Arabia',SN:'Senegal',RS:'Serbia',SC:'Seychelles',SL:'Sierra Leone',SG:'Singapore',SK:'Slovakia',SI:'Slovenia',SB:'Solomon Islands',SO:'Somalia',ZA:'South Africa',SS:'South Sudan',ES:'Spain',LK:'Sri Lanka',SD:'Sudan',SR:'Suriname',SE:'Sweden',CH:'Switzerland',SY:'Syria',TW:'Taiwan',TJ:'Tajikistan',TZ:'Tanzania',TH:'Thailand',TL:'Timor-Leste',TG:'Togo',TO:'Tonga',TT:'Trinidad and Tobago',TN:'Tunisia',TR:'Turkey',TM:'Turkmenistan',TV:'Tuvalu',UG:'Uganda',UA:'Ukraine',AE:'UAE',GB:'United Kingdom',US:'United States',UY:'Uruguay',UZ:'Uzbekistan',VU:'Vanuatu',VE:'Venezuela',VN:'Vietnam',YE:'Yemen',ZM:'Zambia',ZW:'Zimbabwe',XK:'Kosovo',
}

const [
  { data: pubMeta },
  { data: actCount },
  { data: filesCount },
  { data: orgFilesCount },
  { data: fileSizeRaw },
  { data: versions },
  { data: actCsvRaw },
  { data: fileCsvRaw },
  { data: orgFileCsvRaw },
  { data: fsSizeCsvRaw },
  { data: validationCsvRaw },
  { data: versionsCsvRaw },
  { data: budgetCounts },
  { data: budgetSums },
  { data: fileActivities },
  { data: fileSizes },
  { data: fileOrgs },
  { data: fileVersionsData },
  { data: invertedValidation },
  { data: invertedInvalidXml },
  { data: invertedNonstdRoots },
  { data: invertedElements },
  { data: codelistsByVersion },
] = await Promise.all([
  useFetch(`${BASE}/api/reporting-orgs/${slug}`),
  useFetch(`${BASE}/stats/current/aggregated-publisher/${slug}/activities.json`),
  useFetch(`${BASE}/stats/current/aggregated-publisher/${slug}/activity_files.json`),
  useFetch(`${BASE}/stats/current/aggregated-publisher/${slug}/organisation_files.json`),
  useFetch(`${BASE}/stats/current/aggregated-publisher/${slug}/file_size.json`),
  useFetch(`${BASE}/stats/current/aggregated-publisher/${slug}/versions.json`),
  useFetch(`${BASE}/generated/img/publishers/${slug}_activities.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/generated/img/publishers/${slug}_activity_files.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/generated/img/publishers/${slug}_organisation_files.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/generated/img/publishers/${slug}_file_size.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/generated/img/publishers/${slug}_validation.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/generated/img/publishers/${slug}_versions.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/stats/current/aggregated-publisher/${slug}/count_budgets_by_type_by_year.json`),
  useFetch(`${BASE}/stats/current/aggregated-publisher/${slug}/sum_budgets_by_type_by_year.json`),
  useFetch(`${BASE}/stats/current/inverted-file-publisher/${slug}/activities.json`),
  useFetch(`${BASE}/stats/current/inverted-file-publisher/${slug}/file_size.json`),
  useFetch(`${BASE}/stats/current/inverted-file-publisher/${slug}/organisations.json`),
  useFetch(`${BASE}/stats/current/inverted-file-publisher/${slug}/versions.json`),
  useFetch(`${BASE}/stats/current/inverted-file-publisher/${slug}/validation.json`),
  useFetch(`${BASE}/stats/current/inverted-file-publisher/${slug}/invalidxml.json`),
  useFetch(`${BASE}/stats/current/inverted-file-publisher/${slug}/nonstandardroots.json`),
  useFetch(`${BASE}/stats/current/inverted-file-publisher/${slug}/elements.json`),
  useFetch(`${BASE}/stats/current/aggregated-publisher/${slug}/codelist_values_by_major_version.json`),
])

// --- Meta ---
const notFound = computed(() => pubMeta.value === null)
const pubName = computed(() => pubMeta.value?.human_readable_name ?? slug)
const orgType = computed(() => {
  const code = pubMeta.value?.organisation_type
  return code ? `${ORG_TYPES[code] ?? code} (${code})` : '—'
})
const versionList = computed(() => Object.keys(versions.value ?? {}).sort())

// --- Time series ---
const actSeries = computed(() => actCsvRaw.value ? toMonthly(parseCSV(actCsvRaw.value), 'date', 'value') : [])
const fileSeries = computed(() => fileCsvRaw.value ? toMonthly(parseCSV(fileCsvRaw.value), 'date', 'value') : [])
const orgFileSeries = computed(() => orgFileCsvRaw.value ? toMonthly(parseCSV(orgFileCsvRaw.value), 'date', 'value') : [])
const fsSizeSeries = computed(() => fsSizeCsvRaw.value ? toMonthly(parseCSV(fsSizeCsvRaw.value), 'date', 'value') : [])
const validationSeries = computed(() => validationCsvRaw.value ? toMonthly(parseCSV(validationCsvRaw.value), 'date', 'fail') : [])
const versionsMulti = computed(() => versionsCsvRaw.value ? toMonthlyMulti(parseCSV(versionsCsvRaw.value), 'date') : { labels: [], series: [], rows: [] })

// --- Chart.js chart data ---
function lineDataset(label, series, color, bgColor = 'transparent') {
  return {
    label,
    data: series.map(d => d.value),
    borderColor: color,
    backgroundColor: bgColor,
    fill: bgColor !== 'transparent', tension: 0.3, pointRadius: 0, borderWidth: 2,
  }
}

const actChartData = computed(() => ({
  labels: actSeries.value.map(d => d.date),
  datasets: [lineDataset('Activities', actSeries.value, C.teal90, 'rgba(21,83,102,0.08)')],
}))
const fileChartData = computed(() => ({
  labels: fileSeries.value.map(d => d.date),
  datasets: [lineDataset('Activity Files', fileSeries.value, C.blue, 'rgba(6,219,228,0.08)')],
}))
const orgFileChartData = computed(() => ({
  labels: orgFileSeries.value.map(d => d.date),
  datasets: [lineDataset('Org Files', orgFileSeries.value, C.green, 'rgba(0,196,151,0.08)')],
}))
const fsSizeChartData = computed(() => ({
  labels: fsSizeSeries.value.map(d => d.date),
  datasets: [lineDataset('File Size (bytes)', fsSizeSeries.value, C.orange, 'rgba(255,114,100,0.08)')],
}))
const validationChartData = computed(() => ({
  labels: validationSeries.value.map(d => d.date),
  datasets: [lineDataset('Failing files', validationSeries.value, C.orange, 'rgba(255,114,100,0.08)')],
}))
const versionsChartData = computed(() => {
  const { labels, series, rows } = versionsMulti.value
  return {
    labels,
    datasets: series.map((ver, i) => ({
      label: ver,
      data: rows.map(r => r[ver] || 0),
      borderColor: TYPE_COLORS[i % TYPE_COLORS.length],
      backgroundColor: 'transparent',
      fill: false, tension: 0.3, pointRadius: 0, borderWidth: 2,
    })),
  }
})

const chartOpts = {
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10 }, color: C.grey60, maxRotation: 0 } },
    y: { beginAtZero: true, grid: { color: C.grey20 }, ticks: { font: { size: 10 }, color: C.grey60 } },
  },
}
const versionsChartOpts = {
  ...chartOpts,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { boxWidth: 14, font: { size: 10 }, padding: 8 } },
    tooltip: { mode: 'index', intersect: false },
  },
}
const fsSizeOpts = {
  ...chartOpts,
  scales: {
    ...chartOpts.scales,
    y: { beginAtZero: true, grid: { color: C.grey20 }, ticks: { font: { size: 10 }, color: C.grey60, callback: (v) => fmtBytes(v) } },
  },
}

// Budget table
const budgetTableSimple = computed(() => {
  const counts = budgetCounts.value ?? {}
  const sums = budgetSums.value ?? {}
  const yearSet = new Set()
  for (const byYear of Object.values(counts)) Object.keys(byYear).forEach(y => yearSet.add(y))

  function getSum(type, year) {
    const byCur = sums[type] ?? {}
    const entries = Object.entries(byCur).map(([cur, byYear]) => {
      const v = byYear[year]
      return v != null ? { cur, v } : null
    }).filter(Boolean)
    return entries
  }

  return [...yearSet].sort((a, b) => b - a).map(year => ({
    year,
    countOrig: counts['1']?.[year] ?? 0,
    countRev:  counts['2']?.[year] ?? 0,
    sumsOrig: getSum('1', year),
    sumsRev:  getSum('2', year),
  })).filter(r => r.countOrig + r.countRev > 0)
})

// --- Files per dataset table ---
const filesTable = computed(() => {
  const acts = fileActivities.value
  if (!acts) return []
  const sizes = fileSizes.value ?? {}
  const orgs  = fileOrgs.value ?? {}
  const vers  = fileVersionsData.value ?? {}

  const versionByFile = {}
  for (const [ver, files] of Object.entries(vers)) {
    for (const fname of Object.keys(files)) versionByFile[fname] = ver
  }

  return Object.keys(acts).sort().map(name => ({
    name,
    activities: acts[name] ?? 0,
    organisations: orgs[name] ?? 0,
    fileSize: sizes[name] ?? 0,
    version: versionByFile[name] ?? '—',
  }))
})

// --- Errors ---
const errors = computed(() => {
  const validation = invertedValidation.value ?? {}
  const invalidXml = invertedInvalidXml.value ?? {}
  const nonstdRoots = invertedNonstdRoots.value ?? {}

  const failingValidation = Object.keys(validation.fail ?? {}).sort()
  const failingXml = Object.keys(invalidXml).filter(k => invalidXml[k] > 0).sort()
  const failingRoots = Object.keys(nonstdRoots).filter(k => nonstdRoots[k] > 0).sort()

  return { failingValidation, failingXml, failingRoots, anyError: failingValidation.length + failingXml.length + failingRoots.length > 0 }
})

// --- Elements table ---
// inverted-file-publisher/elements.json: { element: { dataset: activityCount } }
// Activity count = sum of per-file values; file count = number of keys
const elementsTable = computed(() => {
  const inv = invertedElements.value
  if (!inv) return []
  return Object.entries(inv)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([el, fileCounts]) => ({
      element: el,
      count: Object.values(fileCounts).reduce((s, v) => s + v, 0),
      fileCount: Object.keys(fileCounts).length,
    }))
})

// --- Table state ---
const filesSortBy = ref([{ key: 'name', order: 'asc' }])
const FILES_FIELDS = [
  { key: 'name',          label: 'Dataset short name', sortable: true },
  { key: 'activities',   label: 'Activities',          sortable: true, class: 'num' },
  { key: 'organisations',label: 'Organisations',       sortable: true, class: 'num' },
  { key: 'fileSize',     label: 'File size',           sortable: true, class: 'num' },
  { key: 'version',      label: 'Version',             sortable: true },
]

const ELEMENTS_PER_PAGE = 50
const elementPage = ref(1)
const elementsSortBy = ref([{ key: 'element', order: 'asc' }])
const ELEMENTS_FIELDS = [
  { key: 'element',   label: 'Element / Attribute', sortable: true },
  { key: 'count',     label: 'Activities / Orgs',   sortable: true, class: 'num' },
  { key: 'fileCount', label: 'Files',                sortable: true, class: 'num' },
]

const budgetSortBy = ref([{ key: 'year', order: 'desc' }])
const BUDGET_FIELDS = [
  { key: 'year',      label: 'Year',             sortable: true },
  { key: 'countOrig', label: 'Count (Original)', sortable: true, class: 'num' },
  { key: 'sumsOrig',  label: 'Sum (Original)',                   class: 'num' },
  { key: 'countRev',  label: 'Count (Revised)',  sortable: true, class: 'num' },
  { key: 'sumsRev',   label: 'Sum (Revised)',                    class: 'num' },
]

const countriesSortBy = ref([{ key: 'code', order: 'asc' }])
const COUNTRIES_FIELDS = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
]

const VALIDATION_FIELDS = [
  { key: 'dataset', label: 'Dataset' },
  { key: 'url',     label: 'Validator' },
]
const validationItems = computed(() =>
  errors.value.failingValidation.map(name => ({
    dataset: name,
    url: `https://validator.iatistandard.org/report/${name}`,
  }))
)

// --- Recipient countries ---
const recipientCountries = computed(() => {
  const d = codelistsByVersion.value
  if (!d) return []
  const allCodes = new Set()
  for (const verData of Object.values(d)) {
    for (const [key, vals] of Object.entries(verData)) {
      if (key.includes('recipient-country') && key.includes('@code')) {
        Object.keys(vals).forEach(c => allCodes.add(c))
      }
    }
  }
  return [...allCodes].sort().map(code => ({ code, name: COUNTRY_NAMES[code] ?? code }))
})
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: 'Publishing Quality', href: '#' },
      { label: 'Exploring Data', href: '/exploring-data' },
      { label: 'Publishers', href: '/exploring-data/publishers' },
      { label: pubName },
    ]" />
    <TitleBar eyebrow="Reporting Org" :title="pubName">
      <template #meta>
        <span v-if="pubMeta?.organisation_identifier" style="font-family: monospace; font-size: .9rem">
          {{ pubMeta.organisation_identifier }}
        </span>
        <span v-if="pubMeta?.description" style="font-size: .9rem; line-height: 1.55; display: block; max-width: 820px">{{ pubMeta.description }}</span>
      </template>
    </TitleBar>

    <main class="main">
      <!-- Not found -->
      <Card loading v-if="notFound">
        Publisher <strong>{{ slug }}</strong> not found.
        <br><a href="/exploring-data/publishers" style="color: var(--teal-70)">← Back to publishers list</a>
      </Card>

      <template v-else>
        <!-- ─── HEADLINES ─── -->
        <BRow gutter-x="3" gutter-y="3" class="mb-sm">
          <!-- Info table -->
          <BCol cols="12" md="6"><Card title="Headlines">
            <div class="iati-table"><table style="margin: 0">
              <tbody>
                <tr>
                  <td style="color: var(--grey-60); width: 44%">Short name</td>
                  <td><code style="font-size: .85rem">{{ pubMeta?.short_name ?? slug }}</code></td>
                </tr>
                <tr v-if="pubMeta?.organisation_type">
                  <td style="color: var(--grey-60)">Organisation type</td>
                  <td>{{ orgType }}</td>
                </tr>
                <tr v-if="pubMeta?.hq_country">
                  <td style="color: var(--grey-60)">HQ Country</td>
                  <td>{{ pubMeta.hq_country }}</td>
                </tr>
                <tr v-if="pubMeta?.region">
                  <td style="color: var(--grey-60)">Region</td>
                  <td>{{ pubMeta.region }}</td>
                </tr>
                <tr>
                  <td style="color: var(--grey-60)">First published</td>
                  <td>{{ fmtDate(pubMeta?.first_publication_date) }}</td>
                </tr>
                <tr>
                  <td style="color: var(--grey-60)">Datasets</td>
                  <td>{{ pubMeta?.dataset_count?.toLocaleString() ?? '—' }}</td>
                </tr>
                <tr v-if="versionList.length">
                  <td style="color: var(--grey-60)">IATI versions</td>
                  <td>
                    <code
                      v-for="v in versionList" :key="v"
                      style="font-size: .82rem; background: var(--grey-10); padding: 1px 5px; border-radius: 3px; margin-right: 4px"
                    >{{ v }}</code>
                  </td>
                </tr>
                <tr v-if="pubMeta?.website">
                  <td style="color: var(--grey-60)">Website</td>
                  <td><a :href="pubMeta.website" target="_blank" style="color: var(--teal-70); word-break: break-all">{{ pubMeta.website }}</a></td>
                </tr>
                <tr v-if="pubMeta?.data_portal_url">
                  <td style="color: var(--grey-60)">Data portal</td>
                  <td><a :href="pubMeta.data_portal_url" target="_blank" style="color: var(--teal-70); word-break: break-all">{{ pubMeta.data_portal_url }}</a></td>
                </tr>
                <tr>
                  <td style="color: var(--grey-60)">View elsewhere</td>
                  <td style="font-size: .85rem; line-height: 2">
                    <a :href="`https://d-portal.iatistandard.org/ctrack.html?reporting_ref=${pubMeta?.organisation_identifier}`" target="_blank" style="color: var(--teal-70); display: block">D-Portal</a>
                    <a :href="`https://validator.iatistandard.org/organisation/${slug}`" target="_blank" style="color: var(--teal-70); display: block">IATI Validator</a>
                    <a :href="`${BASE}/api/reporting-orgs/${slug}`" target="_blank" style="color: var(--teal-70); display: block">Dashboard API (JSON)</a>
                    <a :href="`${BASE}/stats/current/aggregated-publisher/${slug}/`" target="_blank" style="color: var(--teal-70); display: block">All stats (JSON directory)</a>
                  </td>
                </tr>
              </tbody>
            </table></div>
          </Card></BCol>

          <!-- Key stats column -->
          <BCol cols="12" md="6"><div class="col" style="gap: 12px">
            <Card>
              <p class="sub" style="margin: 0 0 4px">Activities</p>
              <div class="bignum" style="font-size: 2.4rem">{{ actCount != null ? Number(actCount).toLocaleString() : '—' }}</div>
            </Card>
            <BRow gutter-x="3">
              <BCol><Card>
                <p class="sub" style="margin: 0 0 4px; font-size: .78rem">Activity files</p>
                <div class="bignum" style="font-size: 1.8rem">{{ filesCount != null ? Number(filesCount).toLocaleString() : '—' }}</div>
              </Card></BCol>
              <BCol><Card>
                <p class="sub" style="margin: 0 0 4px; font-size: .78rem">Organisation files</p>
                <div class="bignum" style="font-size: 1.8rem">{{ orgFilesCount != null ? Number(orgFilesCount).toLocaleString() : '—' }}</div>
              </Card></BCol>
            </BRow>
            <Card>
              <p class="sub" style="margin: 0 0 4px">Total file size</p>
              <div class="bignum" style="font-size: 2rem">{{ fmtBytes(fileSizeRaw) }}</div>
            </Card>
          </div></BCol>
        </BRow>

        <!-- ─── CHARTS ─── -->
        <!-- Row 1: Activities + Activity Files -->
        <BRow gutter-x="3" gutter-y="3" class="mb-sm">
          <BCol cols="12" md="6"><Card>
            <h3 style="font-size: .95rem">Activities over time</h3>
            <div v-if="!actSeries.length" class="loading">Loading…</div>
            <div v-else class="chart" style="height: 180px"><LineChart :data="actChartData" :options="chartOpts" /></div>
          </Card></BCol>
          <BCol cols="12" md="6"><Card>
            <h3 style="font-size: .95rem">Activity files over time</h3>
            <div v-if="!fileSeries.length" class="loading">Loading…</div>
            <div v-else class="chart" style="height: 180px"><LineChart :data="fileChartData" :options="chartOpts" /></div>
          </Card></BCol>
        </BRow>

        <!-- Row 2: Org Files + File Size -->
        <BRow gutter-x="3" gutter-y="3" class="mb-sm">
          <BCol cols="12" md="6"><Card>
            <h3 style="font-size: .95rem">Organisation files over time</h3>
            <div v-if="!orgFileSeries.length" class="loading">Loading…</div>
            <div v-else class="chart" style="height: 180px"><LineChart :data="orgFileChartData" :options="chartOpts" /></div>
          </Card></BCol>
          <BCol cols="12" md="6"><Card>
            <h3 style="font-size: .95rem">Total file size over time</h3>
            <div v-if="!fsSizeSeries.length" class="loading">Loading…</div>
            <div v-else class="chart" style="height: 180px"><LineChart :data="fsSizeChartData" :options="fsSizeOpts" /></div>
          </Card></BCol>
        </BRow>

        <!-- Row 3: Validation + Versions -->
        <BRow gutter-x="3" gutter-y="3" class="mb-sm">
          <BCol cols="12" md="6"><Card>
            <h3 style="font-size: .95rem">Files failing schema validation</h3>
            <div v-if="!validationSeries.length" class="loading">Loading…</div>
            <div v-else class="chart" style="height: 180px"><LineChart :data="validationChartData" :options="chartOpts" /></div>
          </Card></BCol>
          <BCol cols="12" md="6"><Card>
            <h3 style="font-size: .95rem">Files per version</h3>
            <div v-if="!versionsMulti.labels.length" class="loading">Loading…</div>
            <div v-else class="chart" style="height: 210px"><LineChart :data="versionsChartData" :options="versionsChartOpts" /></div>
          </Card></BCol>
        </BRow>

        <!-- ─── ERRORS ─── -->
        <Card title="Errors" class="mb-sm">

          <div v-if="invertedValidation === null" style="padding: 20px; color: var(--grey-60); font-size: .85rem">Loading…</div>

          <div v-else-if="!errors.anyError" style="padding: 16px 20px; font-size: .88rem; color: var(--grey-70)">
            No data quality issues were found.
          </div>

          <template v-else>
            <!-- Validation failures -->
            <template v-if="errors.failingValidation.length">
              <div style="padding: 12px 20px 4px; font-weight: 700; font-size: .88rem; border-top: 1px solid var(--grey-20)">
                Files failing schema validation
                <a :href="`${BASE}/stats/current/inverted-file-publisher/${slug}/validation.json`" target="_blank" style="font-weight: 400; font-size: .78rem; color: var(--teal-70); margin-left: 8px">(J)</a>
              </div>
              <div class="iati-table">
                <BTable :items="validationItems" :fields="VALIDATION_FIELDS">
                  <template #cell(dataset)="{ value }">
                    <span style="font-family: monospace; font-size: .82rem">{{ value }}</span>
                  </template>
                  <template #cell(url)="{ value }">
                    <a :href="value" target="_blank" style="color: var(--teal-70); font-size: .82rem">Validate</a>
                  </template>
                </BTable>
              </div>
            </template>

            <!-- Invalid XML -->
            <template v-if="errors.failingXml.length">
              <div style="padding: 12px 20px 4px; font-weight: 700; font-size: .88rem; border-top: 1px solid var(--grey-20)">
                Files where XML is not well-formed
                <a :href="`${BASE}/stats/current/inverted-file-publisher/${slug}/invalidxml.json`" target="_blank" style="font-weight: 400; font-size: .78rem; color: var(--teal-70); margin-left: 8px">(J)</a>
              </div>
              <ul style="margin: 6px 20px 12px; padding-left: 18px; font-size: .85rem; font-family: monospace">
                <li v-for="name in errors.failingXml" :key="name">{{ name }}</li>
              </ul>
            </template>

            <!-- Non-standard roots -->
            <template v-if="errors.failingRoots.length">
              <div style="padding: 12px 20px 4px; font-weight: 700; font-size: .88rem; border-top: 1px solid var(--grey-20)">
                Files with non-standard roots
                <a :href="`${BASE}/stats/current/inverted-file-publisher/${slug}/nonstandardroots.json`" target="_blank" style="font-weight: 400; font-size: .78rem; color: var(--teal-70); margin-left: 8px">(J)</a>
              </div>
              <ul style="margin: 6px 20px 12px; padding-left: 18px; font-size: .85rem; font-family: monospace">
                <li v-for="name in errors.failingRoots" :key="name">{{ name }}</li>
              </ul>
            </template>
          </template>
        </Card>

        <!-- ─── FINANCIAL ─── -->
        <Card v-if="budgetTableSimple.length" title="Financial — Budgets" class="mb-sm">
          <p style="margin: 12px 20px; font-size: .82rem; color: var(--grey-70)">
            Figures calculated from <code>&lt;budget&gt;</code> elements. Budget type 1 = Original, type 2 = Revised.
            <a :href="`${BASE}/stats/current/aggregated-publisher/${slug}/sum_budgets_by_type_by_year.json`" target="_blank" style="color: var(--teal-70); font-size: .8rem">(Sums JSON)</a>
            <a :href="`${BASE}/stats/current/aggregated-publisher/${slug}/count_budgets_by_type_by_year.json`" target="_blank" style="color: var(--teal-70); font-size: .8rem; margin-left: 8px">(Counts JSON)</a>
          </p>
          <div class="iati-table">
            <BTable :items="budgetTableSimple" :fields="BUDGET_FIELDS" v-model:sort-by="budgetSortBy">
              <template #cell(year)="{ value }"><strong>{{ value }}</strong></template>
              <template #cell(countOrig)="{ value }">{{ fmtNum(value) }}</template>
              <template #cell(countRev)="{ value }">{{ fmtNum(value) }}</template>
              <template #cell(sumsOrig)="{ item }">
                <span v-if="item.sumsOrig.length" style="font-family: monospace; font-size: .82rem">
                  <span v-for="s in item.sumsOrig" :key="s.cur">{{ fmtBudgetAmount(s.v) }} {{ s.cur }} </span>
                </span>
                <span v-else>—</span>
              </template>
              <template #cell(sumsRev)="{ item }">
                <span v-if="item.sumsRev.length" style="font-family: monospace; font-size: .82rem">
                  <span v-for="s in item.sumsRev" :key="s.cur">{{ fmtBudgetAmount(s.v) }} {{ s.cur }} </span>
                </span>
                <span v-else>—</span>
              </template>
            </BTable>
          </div>
        </Card>

        <!-- ─── EXPLORING DATA — FILES ─── -->
        <Card title="Exploring Data — Files">
          <template #actions>
            <div style="display: flex; gap: 14px">
              <a :href="`${BASE}/stats/current/inverted-file-publisher/${slug}/activities.json`" target="_blank">Activities (J)</a>
              <a :href="`${BASE}/stats/current/inverted-file-publisher/${slug}/file_size.json`" target="_blank">File Size (J)</a>
              <a :href="`${BASE}/stats/current/inverted-file-publisher/${slug}/versions.json`" target="_blank">Versions (J)</a>
            </div>
          </template>

          <div v-if="!filesTable.length" class="loading" style="padding: 40px">Loading…</div>
          <div v-else class="iati-table">
            <BTable :items="filesTable" :fields="FILES_FIELDS" v-model:sort-by="filesSortBy">
              <template #cell(name)="{ value }">
                <a :href="`https://validator.iatistandard.org/report/${value}`" target="_blank" style="font-family: monospace; font-size: .82rem; color: var(--teal-70); text-decoration: none">{{ value }}</a>
              </template>
              <template #cell(activities)="{ value }">{{ fmtNum(value) }}</template>
              <template #cell(organisations)="{ value }">{{ value > 0 ? fmtNum(value) : '—' }}</template>
              <template #cell(fileSize)="{ value }">{{ fmtBytes(value) }}</template>
              <template #cell(version)="{ value }"><code style="font-size: .82rem">{{ value }}</code></template>
            </BTable>
          </div>
        </Card>

        <!-- ─── EXPLORING DATA — RECIPIENT COUNTRIES ─── -->
        <Card v-if="recipientCountries.length" title="Exploring Data — Recipient Countries" class="mb-sm">
          <template #actions>
            <a :href="`${BASE}/stats/current/aggregated-publisher/${slug}/codelist_values_by_major_version.json`" target="_blank">(J)</a>
          </template>
          <div class="iati-table">
            <BTable :items="recipientCountries" :fields="COUNTRIES_FIELDS" v-model:sort-by="countriesSortBy">
              <template #cell(code)="{ value }"><code style="font-size: .85rem">{{ value }}</code></template>
            </BTable>
          </div>
        </Card>

        <!-- ─── EXPLORING DATA — ELEMENTS ─── -->
        <Card title="Exploring Data — Elements and Attributes Published">
          <template #actions>
            <a :href="`${BASE}/stats/current/inverted-file-publisher/${slug}/elements.json`" target="_blank">(J)</a>
          </template>
          <div v-if="!elementsTable.length" class="loading" style="padding: 40px">Loading…</div>
          <template v-else>
            <div class="iati-table">
              <BTable :items="elementsTable" :fields="ELEMENTS_FIELDS" v-model:sort-by="elementsSortBy" :per-page="ELEMENTS_PER_PAGE" :current-page="elementPage">
                <template #cell(element)="{ value }">
                  <span style="font-family: monospace; font-size: .78rem; word-break: break-all">{{ value }}</span>
                </template>
                <template #cell(count)="{ value }">{{ value.toLocaleString() }}</template>
              </BTable>
            </div>
            <div v-if="elementsTable.length > ELEMENTS_PER_PAGE" class="iati-card-footer iati-card-footer--center">
              <BPagination v-model="elementPage" :total-rows="elementsTable.length" :per-page="ELEMENTS_PER_PAGE" align="center" />
            </div>
          </template>
        </Card>
      </template>
    </main>
  </div>
</template>
