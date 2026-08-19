<script setup>
const { t } = useI18n({ useScope: 'global' })
const { countries, partnerComp } = useCountryData()
const lastRefresh = '2 hours ago'

// Weighted average comprehensiveness across all country-partner pairs with a known score,
// weighted by each partner's ref24 spend in that country.
const overallCompPct = computed(() => {
  let weightedSum = 0
  let totalWeight = 0
  for (const country of countries) {
    for (const p of country.partners) {
      const c = partnerComp[p.name]
      if (c !== undefined) {
        weightedSum += p.ref24 * c
        totalWeight += p.ref24
      }
    }
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null
})

const composite = [
  { m: "May '25", v: 51, availability: 96, char: 54, value: 36 },
  { m: "Jun '25", v: 52, availability: 96, char: 55, value: 37 },
  { m: "Jul '25", v: 53, availability: 97, char: 56, value: 38 },
  { m: "Aug '25", v: 53, availability: 97, char: 57, value: 38 },
  { m: "Sep '25", v: 54, availability: 97, char: 58, value: 39 },
  { m: "Oct '25", v: 55, availability: 98, char: 58, value: 40 },
  { m: "Nov '25", v: 55, availability: 98, char: 59, value: 41 },
  { m: "Dec '25", v: 56, availability: 98, char: 59, value: 42 },
  { m: "Jan '26", v: 57, availability: 98, char: 60, value: 43 },
  { m: "Feb '26", v: 57, availability: 98, char: 60, value: 43 },
  { m: "Mar '26", v: 58, availability: 99, char: 61, value: 44 },
  { m: "Apr '26", v: 58, availability: 99, char: 61, value: 45 },
]

const coverageGroups = computed(() => [
  { label: t('cgBilat'), ref: 'OECD/DAC CRS', n: 120, cov: 65, tone: 'good' },
  { label: t('cgNL'),    ref: 'CBF',                n: 70,  cov: 43, tone: 'ok' },
  { label: t('cgUK'),    ref: 'Charity Commission', n: 55,  cov: 31, tone: 'warn' },
  { label: t('cgUS'),    ref: 'IRS 501(c)(3)',      n: 15,  cov: 15, tone: 'warn' },
])

function coverageVariant(cov) { return cov >= 60 ? 'good' : cov >= 30 ? null : 'warn' }
</script>

<template>
  <div>
    <Crumbs :path="[{ label: t('breadPublishingQuality'), href: '#' }, { label: t('navOverview') }]" />
    <TitleBar :eyebrow="t('overallEyebrow')" :title="t('overallTitle')">
      <template #meta>
        <span style="display: inline-flex; align-items: center; gap: 6px">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--green-50); display: inline-block; box-shadow: 0 0 0 3px rgba(0,196,151,.25)" />
          <strong>{{ t('overallLive') }}</strong> &middot; {{ t('overallRefreshed') }} {{ lastRefresh }}
        </span>
        <span><strong>1,719</strong> {{ t('overallStatsLine', { n: '1,719', b: '$228' }) }}</span>
        <span>
          <a href="#" style="color: #fff; text-decoration-color: var(--blue-50)">{{ t('overallMethodology') }}</a>
          &nbsp;
          <a href="#" style="color: #fff; text-decoration-color: var(--blue-50)">{{ t('overallDownload') }}</a>
        </span>
      </template>
    </TitleBar>

    <main class="main">
      <!-- Banner -->
      <BRow gutter-x="3" gutter-y="3" class="mb-sm" style="margin-top: 0">
        <BCol cols="12" md="6"><div class="callout good">
          <div class="ic">✓</div>
          <div>
            <h4>{{ t('overallGoodTitle') }}</h4>
            <p>{{ t('overallGoodText') }}</p>
          </div>
        </div></BCol>
        <BCol cols="12" md="6"><div class="callout">
          <div class="ic">!</div>
          <div>
            <h4>{{ t('overallWarnTitle') }}</h4>
            <p>{{ t('overallWarnText') }}</p>
          </div>
        </div></BCol>
      </BRow>

      <!-- Tier 1 — Availability -->
      <TierHeading :title="t('dimAvailability')" :blurb="t('tierAvailBlurb')" />
      <BRow cols="1" cols-md="2" cols-lg="3" gutter-x="3" gutter-y="3">
        <BCol><TierCard tone="warn" :title="t('cardReportingOrgs')" value="914" unit="" :label="t('cardReportingOrgsLabel')"
          trend="-75" :hint="t('cardReportingOrgsHint')"
          :spark-data="[989,914]" /></BCol>
        <BCol><TierCard tone="ok" :title="t('cardDownloadable')" value="93" :label="t('cardDownloadableLabel')"
          trend="+0.6" :hint="t('cardDownloadableHint')"
          :spark-data="[97.8,98.1,98.3,98.5,98.7,98.9,99.0,99.1,99.2,99.3,99.3,99.4]" /></BCol>
        <BCol><TierCard tone="ok" :title="t('cardStructured')" value="84" :label="t('cardStructuredLabel')"
          trend="+2.9" :hint="t('cardStructuredHint')"
          :spark-data="[95.1,95.6,96.0,96.5,96.9,97.2,97.6,97.9,98.1,98.3,98.5,98.7]" /></BCol>
      </BRow>

      <!-- Tier 2 — Overall characteristics -->
      <TierHeading :title="t('tierCharTitle')" :blurb="t('tierCharBlurb')" />
      <BRow cols="1" cols-md="2" cols-lg="4" gutter-x="3" gutter-y="3">
        <BCol><TierCard tone="ok" :title="t('dimTimeliness')" value="41" :label="t('cardTimelinessLabel')"
          trend="+1.6" :hint="t('cardTimelinessHint')"
          :spark-data="[38.9,40.5]" /></BCol>
        <BCol><TierCard tone="ok" :title="t('dimCoverage')" value="61" :label="t('cardCoverageLabel')"
          trend="+3" :hint="t('cardCoverageHint')"
          :spark-data="[54,55,56,57,57,58,58,59,59,60,60,61]" /></BCol>
        <BCol><TierCard tone="good" :title="t('dimDisaggregation')" value="85" :label="t('cardDisaggLabel')"
          trend="+1" :hint="t('cardDisaggHint')"
          :spark-data="[45,46,46,46,47,47,47,47,47,48,48,48]" /></BCol>
        <BCol><TierCard tone="warn" :title="t('dimComprehensiveness')" :value="String(overallCompPct)" :label="t('cardCompLabel')"
          trend="+1" :hint="t('cardCompHint')"
          :spark-data="[45,46,46,46,47,47,47,47,47,48,48,48]" /></BCol>
      </BRow>

      <!-- Coverage deep-dive -->
      <Card class="mt" style="border-top-color: var(--teal-70)" :kicker="t('coverageDeepLabel')">
        <BRow cols="1" cols-md="2" cols-lg="4" gutter-x="3" gutter-y="3" style="margin-top: 12px">
          <BCol v-for="g in coverageGroups" :key="g.label">
            <div style="font-size: .82rem; font-weight: 700; color: var(--teal-90)">{{ g.label }}</div>
            <div style="font-size: .72rem; color: var(--grey-60); margin-bottom: 6px">vs {{ g.ref }} &middot; {{ g.n }} {{ t('coverageOrgSuffix') }}</div>
            <Bar :pct="g.cov" :variant="coverageVariant(g.cov)" />
          </BCol>
        </BRow>
      </Card>

      <!-- Tier 3 — Added-value fields -->
      <TierHeading :title="t('tierAddedTitle')" :blurb="t('tierAddedBlurb')" />
      <BRow cols="1" cols-md="2" cols-lg="4" gutter-x="3" gutter-y="3">
        <BCol><TierCard tone="ok"   :title="t('cardForward')"   value="51" :label="t('cardForwardLabel')"
          trend="+4" :hint="t('cardForwardHint')"
          :spark-data="[42,43,44,45,46,47,48,49,49,50,50,51]" /></BCol>
        <BCol><TierCard tone="warn" :title="t('cardTraceable')" value="17" :label="t('cardTraceableLabel')"
          trend="+1" :hint="t('cardTraceableHint')"
          :spark-data="[14,14,15,15,15,16,16,16,16,17,17,17]" /></BCol>
        <BCol><TierCard tone="warn" :title="t('cardResults')"   value="22" :label="t('cardResultsLabel')"
          trend="+2" :hint="t('cardResultsHint')"
          :spark-data="[18,19,19,19,20,20,21,21,21,22,22,22]" /></BCol>
        <BCol><TierCard tone="ok"   :title="t('cardLocations')" value="48" :label="t('cardLocationsLabel')"
          trend="+6" :hint="t('cardLocationsHint')"
          :spark-data="[39,40,41,42,43,44,45,46,46,47,47,48]" /></BCol>
      </BRow>

      <!-- Composite progress chart -->
      <Card class="mt" style="border-top-color: var(--blue-50)">
        <div class="spread" style="margin-bottom: 6px">
          <div>
            <p class="sub">{{ t('compositeLabel') }}</p>
            <h3>{{ t('compositeH3') }}</h3>
          </div>
          <div class="flex-row" style="gap: 6px">
            <button class="chip active">{{ t('composite12mo') }}</button>
            <button class="chip">{{ t('composite3yr') }}</button>
            <button class="chip">{{ t('compositeAll') }}</button>
          </div>
        </div>
        <CompositeChart :data="composite" />
        <div class="stack-legend" style="margin-top: 14px">
          <span><i style="background: var(--teal-90)" />{{ t('legendComposite') }}</span>
          <span><i style="background: var(--green-50)" />{{ t('legendTier1') }}</span>
          <span><i style="background: var(--teal-50)" />{{ t('legendTier2') }}</span>
          <span><i style="background: var(--orange-50)" />{{ t('legendTier3') }}</span>
        </div>
        <p style="font-size: .8rem; color: var(--grey-60); margin: 10px 0 0">{{ t('compositeNote') }}</p>
      </Card>
    </main>
  </div>
</template>
