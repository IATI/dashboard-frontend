<script setup>
definePageMeta({ active: 'groups' })
const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const { countries, partnerComp, partnerDisagg } = useCountryData()

// Approximate mapping from IATI publisher type codes to internal group IDs.
// Groups without a clean IATI code (uk, nl, us, local) are addressed by their own ID.
const slugToGroup = {
  '10':    'bilat',
  '40':    'multi',
  '21':    'un',
  '22':    'uk',
  'nl':    'nl',
  'us':    'us',
  'local': 'local',
  '60':    'found',
}
const groupToSlug = Object.fromEntries(Object.entries(slugToGroup).map(([s, g]) => [g, s]))

const slug = (route.params.slug || '10').toString()
const initialGroup = slugToGroup[slug] ?? 'bilat'

const groupLabelKey = { bilat: 'groupBilateral', multi: 'groupMDBs', un: 'groupUN', uk: 'groupUKNGOs', nl: 'groupNLNGOs', us: 'groupUSNGOs', local: 'groupLocal', found: 'groupFoundations' }
const tGroup = (id) => t(groupLabelKey[id] || id)

// Weighted comprehensiveness and disaggregation by partner type, from country spending data.
// bilat → 'Bilateral', multi → 'Multilateral', found → 'Foundation'; other groups remain illustrative.
function weightedByType(lookup) {
  const sums = { Bilateral: 0, Multilateral: 0, Foundation: 0 }
  const weights = { Bilateral: 0, Multilateral: 0, Foundation: 0 }
  for (const country of countries) {
    for (const p of country.partners) {
      const v = lookup[p.name]
      if (v !== undefined && p.type in sums) {
        sums[p.type] += p.ref24 * v
        weights[p.type] += p.ref24
      }
    }
  }
  return {
    Bilateral:    weights.Bilateral    > 0 ? Math.round(sums.Bilateral    / weights.Bilateral)    : null,
    Multilateral: weights.Multilateral > 0 ? Math.round(sums.Multilateral / weights.Multilateral) : null,
    Foundation:   weights.Foundation   > 0 ? Math.round(sums.Foundation   / weights.Foundation)   : null,
  }
}
const compByType   = computed(() => weightedByType(partnerComp))
const disaggByType = computed(() => weightedByType(partnerDisagg))

// Timeliness: spend-weighted share of partners publishing at least quarterly (Monthly or Quarterly).
// All partners included in denominator (including non-IATI), consistent with the country page stat.
const timelinesByType = computed(() => {
  const sums = { Bilateral: 0, Multilateral: 0, Foundation: 0 }
  const weights = { Bilateral: 0, Multilateral: 0, Foundation: 0 }
  for (const country of countries) {
    for (const p of country.partners) {
      if (!(p.type in sums)) continue
      const timely = p.timeliness === 'Monthly' || p.timeliness === 'Quarterly' ? 1 : 0
      sums[p.type] += p.ref24 * timely
      weights[p.type] += p.ref24
    }
  }
  return {
    Bilateral:    weights.Bilateral    > 0 ? Math.round(100 * sums.Bilateral    / weights.Bilateral)    : null,
    Multilateral: weights.Multilateral > 0 ? Math.round(100 * sums.Multilateral / weights.Multilateral) : null,
    Foundation:   weights.Foundation   > 0 ? Math.round(100 * sums.Foundation   / weights.Foundation)   : null,
  }
})

const groupTypeMap = { bilat: 'Bilateral', multi: 'Multilateral', found: 'Foundation' }

const groupsData = [
  { id: 'bilat', n: 120, timeliness: null, coverage: 65, disaggregation: null, availability: 99, comprehensiveness: null },
  { id: 'multi', n: 120, timeliness: null, coverage: 65, disaggregation: null, availability: 99, comprehensiveness: null },
  { id: 'un',    n: 42,  timeliness: 95, coverage: 71, disaggregation: 34, availability: 100, comprehensiveness: 38 },
  { id: 'uk',    n: 55,  timeliness: 95, coverage: 31, disaggregation: 9,  availability: 96, comprehensiveness: 18 },
  { id: 'nl',    n: 70,  timeliness: 95, coverage: 43, disaggregation: 14, availability: 98, comprehensiveness: 22 },
  { id: 'us',    n: 15,  timeliness: 95, coverage: 15, disaggregation: 4,  availability: 91, comprehensiveness: 8 },
  { id: 'local', n: 15,  coverage: 15,   disaggregation: 4,  availability: 91, comprehensiveness: 8 },
  { id: 'found', n: 28,  timeliness: null, coverage: 48, disaggregation: null, availability: 97, comprehensiveness: null },
]

const members = [
  { name: 'USAID',                        pid: 'US-GOV-1',        cov: 81, comprehensiveness: 12, timeliness: 100, score: 78, change: '+2' },
  { name: 'UK FCDO',                       pid: 'GB-GOV-1',        cov: 74, comprehensiveness: 38, timeliness: 100, score: 84, change: '+1' },
  { name: 'European Commission — DG International Partnerships', pid: 'XI-IATI-EC_INTPA', cov: 69, comprehensiveness: 21, timeliness: 100, score: 74, change: '+3' },
  { name: 'Germany — BMZ',                 pid: 'DE-1',            cov: 58, comprehensiveness: 11, timeliness: 96,  score: 62, change: '−1' },
  { name: 'Sida (Sweden)',                 pid: 'SE-0',            cov: 88, comprehensiveness: 54, timeliness: 100, score: 91, change: '+2' },
  { name: 'Netherlands — MFA',             pid: 'XM-DAC-7',       cov: 84, comprehensiveness: 48, timeliness: 100, score: 88, change: '+1' },
]

const active = ref(initialGroup)
const g = computed(() => {
  const base = groupsData.find((x) => x.id === active.value)
  const type = groupTypeMap[active.value]
  const comp       = type ? compByType.value[type]       : null
  const disagg     = type ? disaggByType.value[type]     : null
  const timeliness = type ? timelinesByType.value[type]  : null
  return {
    ...base,
    comprehensiveness: comp       ?? base.comprehensiveness,
    disaggregation:    disagg     ?? base.disaggregation,
    timeliness:        timeliness ?? base.timeliness,
  }
})

const benchmarks = computed(() => [
  { n: t('dimAvailability'),      all: 97, here: g.value.availability },
  { n: t('dimTimeliness'),        all: 18, here: g.value.timeliness },
  { n: t('dimCoverage'),          all: 54, here: g.value.coverage },
  { n: t('dimDisaggregation'),    all: 97, here: g.value.disaggregation },
  { n: t('dimComprehensiveness'), all: 97, here: g.value.comprehensiveness },
])

const bars = computed(() => [
  { label: t('barInProgress'), v: 6,  c: 'grey' },
  { label: t('barGood'),       v: 34, c: 'var(--teal-20)' },
  { label: t('barVeryGood'),   v: 42, c: 'var(--teal-40)' },
  { label: t('barExcellent'),  v: 20, c: 'var(--green-50)' },
])

function levelFor(pct) {
  if (pct >= 75) return 'good'
  if (pct >= 50) return 'ok'
  if (pct >= 25) return 'warn'
  return 'bad'
}
function barVariantFor(pct) {
  if (pct >= 75) return 'good'
  if (pct >= 50) return null
  if (pct >= 25) return 'warn'
  return 'bad'
}
function changeClass(change) {
  if (change.startsWith('+')) return 'heat heat-5'
  if (change.startsWith('−')) return 'heat heat-2'
  return 'heat heat-3'
}
</script>

<template>
  <div>
    <Crumbs :path="[{ label: t('breadPublishingQuality'), href: '/' }, { label: t('navGroups') }]" />
    <TitleBar :eyebrow="t('groupEyebrow')" :title="t('groupTitle')">
      <template #meta>
        <span><strong>{{ g.n }}</strong> {{ t('groupPublishers') }}</span>
        <span><strong>{{ t('groupReference') }}</strong> {{ t('groupReferenceSources') }}</span>
        <span><strong>{{ t('groupPeriod') }}</strong> {{ t('groupReferencePeriod') }}</span>
      </template>
    </TitleBar>

    <main class="main">
      <div class="chips">
        <button
          v-for="x in groupsData"
          :key="x.id"
          :class="['chip', { active: x.id === active }]"
          @click="active = x.id"
        >
          {{ tGroup(x.id) }} <span style="opacity: .6; font-weight: 400">({{ x.n }})</span>
        </button>
      </div>

      <!-- Headline stats -->
      <BRow cols="1" cols-md="3" cols-lg="5" gutter-x="3" gutter-y="3" class="mb-sm">
        <BCol><Card>
          <p class="iati-card__subtitle">{{ t('dimAvailability') }}</p>
          <div :class="`bignum ${levelFor(g.availability)}`">{{ g.availability }}<span style="font-size: 1.2rem">%</span>
            <small>{{ t('groupAvailSmall') }}</small>
            <small>{{ t('groupMedian', { n: g.n }) }}</small>
          </div>
        </Card></BCol>
        <BCol><Card>
          <p class="iati-card__subtitle">{{ t('dimTimeliness') }}</p>
          <div :class="`bignum ${levelFor(g.timeliness)}`">{{ g.timeliness }}<span style="font-size: 1.2rem">%</span>
            <small>{{ t('groupTimelinessSmall') }}</small>
            <small>{{ t('groupMedian', { n: g.n }) }}</small></div>
        </Card></BCol>
        <BCol><Card>
          <p class="iati-card__subtitle">{{ t('dimCoverage') }}</p>
          <div :class="`bignum ${levelFor(g.coverage)}`">{{ g.coverage }}<span style="font-size: 1.2rem">%</span>
            <small>{{ t('groupCoverageSmall') }}</small>
            <small>{{ t('groupMedian', { n: g.n }) }}</small></div>
        </Card></BCol>
        <BCol><Card>
          <p class="iati-card__subtitle">{{ t('dimDisaggregation') }}</p>
          <div :class="`bignum ${levelFor(g.disaggregation)}`">{{ g.disaggregation }}<span style="font-size: 1.2rem">%</span>
            <small>{{ t('groupDisaggSmall') }}</small>
            <small>{{ t('groupMedian', { n: g.n }) }}</small></div>
        </Card></BCol>
        <BCol><Card>
          <p class="iati-card__subtitle">{{ t('dimComprehensiveness') }}</p>
          <div :class="`bignum ${levelFor(g.comprehensiveness)}`">{{ g.comprehensiveness }}<span style="font-size: 1.2rem">%</span><small>{{ t('groupMedian', { n: g.n }) }}</small></div>
        </Card></BCol>
      </BRow>

      <!-- Distribution + comparison -->
      <BRow gutter-x="3" gutter-y="3" class="mt">
        <BCol cols="12" md="6"><Card :kicker="t('groupDistTitle')" :title="tGroup(active)">
          <div style="display: flex; align-items: flex-end; gap: 8px; height: 140px; margin-top: 18px">
            <div v-for="b in bars" :key="b.label" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px">
              <div :style="{ width: '100%', background: b.c, height: b.v * 2.6 + 'px' }" />
              <div style="font-size: .75rem; font-weight: 700; color: var(--grey-70)">{{ b.v }}</div>
              <div style="font-size: .7rem; color: var(--grey-60)">{{ b.label }}</div>
            </div>
          </div>
          <p style="font-size: .8rem; color: var(--grey-60); margin: 10px 0 0">
            {{ t('groupDistNote') }}
            {{ t('groupDistBand', { label: tGroup(active).toLowerCase() }) }}
          </p>
        </Card></BCol>

        <BCol cols="12" md="6"><Card :kicker="t('groupCompareTitle')" :title="t('groupCompareH3')">
          <div style="margin-top: 14px">
            <div v-for="r in benchmarks" :key="r.n" style="margin-bottom: 14px">
              <div class="spread" style="margin-bottom: 4px; font-size: .85rem">
                <strong>{{ r.n }}</strong>
                <span style="color: var(--grey-60)">{{ t('groupThisGroup') }} <strong style="color: var(--teal-90)">{{ r.here }}%</strong> · {{ t('groupAllPublishers') }} {{ r.all }}%</span>
              </div>
              <div style="position: relative; height: 14px; background: var(--grey-10); border: 1px solid var(--grey-20)">
                <span :style="{ position: 'absolute', top: 0, left: 0, height: '100%', width: r.all + '%', background: 'var(--grey-30)' }" />
                <span :style="{ position: 'absolute', top: '-2px', bottom: '-2px', width: '3px', left: r.here + '%', background: 'var(--teal-90)' }" />
              </div>
            </div>
          </div>
        </Card></BCol>
      </BRow>

      <!-- Member table -->
      <h2 class="section-title mt">{{ t('groupTableH2', { label: tGroup(active) }) }}</h2>
      <Card flush>
        <div class="iati-table">
          <table>
            <thead>
              <tr>
                <th>{{ t('groupColPublisher') }}</th>
                <th style="width: 130px">{{ t('dimCoverage') }}</th>
                <th style="width: 130px">{{ t('dimTimeliness') }}</th>
                <th style="width: 130px">{{ t('dimComprehensiveness') }}</th>
                <th style="width: 120px">{{ t('groupColAssessment') }}</th>
                <th style="width: 80px">{{ t('groupColYoY') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in members" :key="m.pid">
                <td class="org">{{ m.name }}<small>{{ m.pid }}</small></td>
                <td><Bar :pct="m.cov" :variant="barVariantFor(m.cov)" /></td>
                <td><Bar :pct="m.timeliness" :variant="barVariantFor(m.timeliness)" /></td>
                <td><Bar :pct="m.comprehensiveness" :variant="barVariantFor(m.comprehensiveness)" /></td>
                <td><Score :level="levelFor(m.score)" show-stars>{{ m.score }}</Score></td>
                <td><span :class="changeClass(m.change)">{{ m.change }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <p style="font-size: .8rem; color: var(--grey-60); margin-top: 8px">
        {{ t('groupTableNote', { n: g.n }) }} <a href="#">{{ t('groupDownloadCSV') }}</a>.
      </p>
    </main>
  </div>
</template>
