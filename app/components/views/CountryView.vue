<script setup>
const { countries, partnerDisagg, partnerComp } = useCountryData()
const { t } = useI18n({ useScope: 'global' })

const countryId = ref('KE')
const source = ref('crs') // 'crs' | 'iati'

const country = computed(() => countries.find((c) => c.id === countryId.value))
const countryName = (id) => t('country' + id)

const spendKey = computed(() => (source.value === 'crs' ? 'ref24' : 'iati25'))
const spendLabel = computed(() => (source.value === 'crs' ? t('countryRankCRS') : t('countryRankIATI')))

const timelinessMap = { Monthly: 'timeMonthly', Quarterly: 'timeQuarterly', 'Six-Monthly': 'timeSixMonthly', Annual: 'timeAnnual', 'Less than Annual': 'timeLessAnnual' }
const tTimeliness = (val) => val ? t(timelinessMap[val] ?? val) : null

const ranked = computed(() =>
  [...country.value.partners].sort((a, b) => b[spendKey.value] - a[spendKey.value])
)

const totalSpend = computed(() => country.value.partners.reduce((s, p) => s + p[spendKey.value], 0))

// Coverage is always measured against the authoritative OECD/CRS reference,
// regardless of which column the table is currently sorted/displayed by.
const coveredSpend = computed(() =>
  country.value.partners.filter((p) => p.onIati).reduce((s, p) => s + p.ref24, 0)
)
const totalRefSpend = computed(() => country.value.partners.reduce((s, p) => s + p.ref24, 0))
const spendCoveredPct = computed(() => Math.round((100 * coveredSpend.value) / totalRefSpend.value))

// Share of shown publishers that are IATI members (Availability dimension).
const availabilityPct = computed(() => {
  const n = country.value.partners.filter((p) => p.onIati).length
  return Math.round((100 * n) / country.value.partners.length)
})

// Share of shown publishers meeting the framework's "Good" Timeliness threshold
// (quarterly or monthly reporting).
const timelinessPct = computed(() => {
  const n = country.value.partners.filter((p) => p.timeliness === 'Monthly' || p.timeliness === 'Quarterly').length
  return Math.round((100 * n) / country.value.partners.length)
})

const missing = computed(() => country.value.partners.filter((p) => !p.onIati))
const missingSpendPct = computed(() =>
  Math.round((100 * missing.value.reduce((s, p) => s + p.ref24, 0)) / totalRefSpend.value)
)

// Biggest-impact target: largest reference spend among partners who are missing,
// publish no data for this sector, or have weak coverage (below the "Good" threshold).
const impactTarget = computed(() => {
  const candidates = country.value.partners.filter((p) => !p.onIati || p.score === null || p.score < 40)
  return candidates.sort((a, b) => b.ref24 - a.ref24)[0]
})

// Weighted average comprehensiveness across partners that have a score, weighted by ref24 spend.
const compPct = computed(() => {
  let weightedSum = 0
  let totalWeight = 0
  for (const p of country.value.partners) {
    const c = partnerComp[p.name]
    if (c !== undefined) {
      weightedSum += p.ref24 * c
      totalWeight += p.ref24
    }
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null
})

function levelFor(score) {
  if (score === null || score === undefined) return 'bad'
  if (score >= 80) return 'good'
  if (score >= 60) return 'good'
  if (score >= 40) return 'ok'
  return 'warn'
}
function barVariantFor(pct) {
  if (pct >= 60) return 'good'
  if (pct >= 40) return null
  return 'warn'
}
function pctOfTotal(p) {
  return Math.round((100 * p[spendKey.value]) / totalSpend.value)
}
function timelinessLevel(t) {
  if (t === 'Monthly' || t === 'Quarterly') return 'good'
  if (t === 'Six-Monthly') return 'ok'
  if (t === 'Annual') return 'warn'
  return 'bad'
}
function metricLevel(v) {
  if (v >= 80) return 'good'
  if (v >= 60) return 'ok'
  return 'warn'
}
</script>

<template>
  <div>
    <Crumbs :path="[{ label: t('breadPublishingQuality'), href: '#' }, { label: t('navCountry') }, { label: countryName(country.id) }]" />
    <TitleBar :eyebrow="t('countryEyebrow')" :title="countryName(country.id)">
      <template #meta>
        <span><strong>{{ country.partners.length }}</strong> {{ t('countryMetaPartners') }}</span>
        <span><strong>{{ t('countryMetaSector') }}</strong> Health &amp; Population (CRS 12000&ndash;14000)</span>
        <span><strong>{{ t('countryMetaReference') }}</strong> OECD/DAC CRS, 2024 (latest full year)</span>
        <span><strong>{{ t('countryMetaRanked') }}</strong> {{ spendLabel }}</span>
      </template>
    </TitleBar>

    <main class="main">
      <!-- Selectors -->
      <div class="spread mb-sm" style="flex-wrap: wrap; gap: 14px">
        <div class="flex-row">
          <label style="font-weight: 700; font-size: .85rem; color: var(--grey-70)">{{ t('countrySelectLabel') }}</label>
          <select
            v-model="countryId"
            style="padding: 8px 10px; font-family: 'Hanken Grotesk'; font-weight: 600; font-size: .9rem; background: #fff; box-shadow: inset 0 0 0 1px var(--grey-20); border: none"
          >
            <option v-for="c in countries" :key="c.id" :value="c.id">{{ countryName(c.id) }}</option>
          </select>
        </div>
        <div class="flex-row">
          <span style="font-weight: 700; font-size: .85rem; color: var(--grey-70)">{{ t('countryRankLabel') }}</span>
          <div class="chips" style="margin-bottom: 0">
            <button :class="['chip', { active: source === 'crs' }]" @click="source = 'crs'">{{ t('countryRankCRS') }}</button>
            <button :class="['chip', { active: source === 'iati' }]" @click="source = 'iati'">{{ t('countryRankIATI') }}</button>
          </div>
        </div>
      </div>

      <!-- Headline stats -->
      <BRow cols="1" cols-md="3" cols-lg="5" gutter-x="3" gutter-y="3" class="mb-sm">
        <BCol><Card>
          <p class="sub">{{ t('dimAvailability') }}</p>
          <div :class="`bignum ${availabilityPct >= 60 ? 'good' : 'warn'}`">{{ availabilityPct }}<span style="font-size: 1.2rem">%</span>
            <small>{{ t('countryAvailSmall') }}</small>
          </div>
        </Card></BCol>
        <BCol><Card accent="blue">
          <p class="sub">{{ t('dimTimeliness') }}</p>
          <div :class="`bignum ${timelinessPct >= 60 ? 'good' : 'warn'}`">{{ timelinessPct }}<span style="font-size: 1.2rem">%</span>
            <small>{{ t('countryTimelinessSmall') }}</small>
          </div>
        </Card></BCol>
        <BCol><Card>
          <p class="sub">{{ t('dimCoverage') }}</p>
          <div :class="`bignum ${spendCoveredPct >= 60 ? 'good' : 'warn'}`">{{ spendCoveredPct }}<span style="font-size: 1.2rem">%</span>
            <small>{{ t('countryCoverageSmall') }}</small>
          </div>
        </Card></BCol>
        <BCol><Card>
          <p class="sub">{{ t('dimDisaggregation') }}</p>
          <div :class="`bignum ${country.disagg >= 80 ? 'good' : country.disagg >= 60 ? 'ok' : 'warn'}`">{{ country.disagg }}<span style="font-size: 1.2rem">%</span>
            <small>{{ t('countryDisaggSmall') }}</small>
          </div>
        </Card></BCol>
        <BCol><Card>
          <p class="sub">{{ t('dimComprehensiveness') }}</p>
          <div :class="`bignum ${compPct >= 80 ? 'good' : compPct >= 60 ? 'ok' : 'warn'}`">{{ compPct }}<span style="font-size: 1.2rem">%</span>
            <small>{{ t('countryCompSmall') }}</small>
          </div>
        </Card></BCol>
      </BRow>

      <!-- Insight callouts -->
      <BRow gutter-x="3" gutter-y="3" class="mb-sm">
        <BCol cols="12" md="6"><div class="callout info">
          <div class="ic">i</div>
          <div>
            <h4>{{ t('countryTargetTitle') }}</h4>
            <p v-if="impactTarget">
              <strong>{{ impactTarget.name }}</strong> ({{ Math.round((100 * impactTarget.ref24) / totalRefSpend) }}% {{ t('countryOfRefSpend') }}) {{ t('countryIs') }}
              {{ !impactTarget.onIati ? t('countryNotYetPublishing') : impactTarget.score === null ? t('countryNoSectorData') : t('countryLowCoverage') }}.
              {{ t('countryEngageImpact') }} {{ countryName(country.id) }}.
            </p>
          </div>
        </div></BCol>
        <BCol cols="12" md="6"><div class="callout">
          <div class="ic">!</div>
          <div>
            <h4>{{ t('countryMissingTitle') }}</h4>
            <p>
              {{ t('countryMissingText1') }} {{ missing.length }} {{ t('countryMissingText2') }} <a href="#">{{ t('countryRequestData') }}</a>
            </p>
          </div>
        </div></BCol>
      </BRow>

      <!-- Table -->
      <h2 class="section-title mt">{{ t('countryTableH2') }} {{ countryName(country.id) }}</h2>
      <Card flush>
        <div class="iati-table">
          <table>
            <thead>
              <tr>
                <th>{{ t('countryColPartner') }}</th>
                <th style="width: 110px">{{ t('countryColSpend') }} ({{ spendLabel }})</th>
                <th style="width: 65px">{{ t('countryColShare') }}</th>
                <th style="width: 110px">{{ t('countryColOnIATI') }}</th>
                <th style="width: 110px">{{ t('countryColCoverage') }}</th>
                <th style="width: 115px">{{ t('countryColTimeliness') }}</th>
                <th style="width: 100px">{{ t('countryColDisagg') }}</th>
                <th style="width: 110px">{{ t('countryColComp') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in ranked" :key="p.name">
                <td class="org">{{ p.name }}<small>{{ p.type }}</small></td>
                <td class="num">${{ p[spendKey].toFixed(1) }}m</td>
                <td class="num">{{ pctOfTotal(p) }}%</td>
                <td>
                  <Score v-if="!p.onIati" level="bad">{{ t('scoreNotOnIATI') }}</Score>
                  <Score v-else-if="p.score === null" level="warn">{{ t('scoreNoSectorData') }}</Score>
                  <Score v-else :level="levelFor(p.score)">{{ t('scorePublishing') }}</Score>
                </td>
                <td>
                  <Bar v-if="p.onIati && p.score !== null" :pct="p.score" :variant="barVariantFor(p.score)" :label="p.score + '%'" />
                  <span v-else style="color: var(--grey-60); font-size: .82rem">&mdash;</span>
                </td>
                <td>
                  <Score v-if="p.timeliness" :level="timelinessLevel(p.timeliness)">{{ tTimeliness(p.timeliness) }}</Score>
                  <span v-else style="color: var(--grey-60); font-size: .82rem">&mdash;</span>
                </td>
                <td>
                  <Score v-if="p.onIati && partnerDisagg[p.name] !== undefined" :level="metricLevel(partnerDisagg[p.name])">{{ partnerDisagg[p.name] }}%</Score>
                  <span v-else style="color: var(--grey-60); font-size: .82rem">&mdash;</span>
                </td>
                <td>
                  <Score v-if="p.onIati && partnerComp[p.name] !== undefined" :level="metricLevel(partnerComp[p.name])">{{ partnerComp[p.name] }}%</Score>
                  <span v-else style="color: var(--grey-60); font-size: .82rem">&mdash;</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <p style="font-size: .8rem; color: var(--grey-60); margin-top: 8px">
        {{ t('countryNote').replace('{n}', country.partners.length) }}
      </p>
    </main>
  </div>
</template>
