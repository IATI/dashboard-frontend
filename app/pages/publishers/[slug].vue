<script setup>
definePageMeta({ active: 'org' })
const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const slug = route.params.slug

const orgMeta = {
  usaid: { org: 'USAID', name: 'United States Agency for International Development (USAID)' },
  eu:    { org: 'EU',    name: 'EU - International Partnerships' },
}

const meta    = orgMeta[slug] || orgMeta.usaid
const org     = meta.org
const orgName = meta.name

const orgData = {
  usaid: {
    overall: 78, traceability: 0.63,
    orgIds: 42, publisherID: 'US-GOV-1', publisherType: 'Government', totalDisbursements: '66.6bn',
    dimensions: [
      { k: 'dimAvailability', pct: 100, metrics: [
        { k: 'subDownloadable',     v: true },
        { k: 'subPassesValidation', v: true },
        { k: 'subNoCriticalErrors', v: true },
      ]},
      { k: 'dimTimeliness', pct: 100, metrics: [
        { k: 'subTimeliness', v: 100 },
        { k: 'subFrequency',  v: 92 },
      ]},
      { k: 'dimCoverage', pct: 95, metrics: [
        { k: 'subCoverage',       v: 95 },
        { k: 'dimDisaggregation', v: 100 },
      ]},
      { k: 'dimComprehensiveness', pct: 81, metrics: [
        { k: 'subOrgFields',       v: 88 },
        { k: 'subBasicFields',     v: 99 },
        { k: 'subFinancialFields', v: 79 },
        { k: 'subAdvancedFields',  v: 58 },
      ]},
    ],
    coverageRows: [
      { y: '2023',       iati: 55.8, ref: 60.4 },
      { y: '2024',       iati: 66.6, ref: 74.1 },
      { y: '2025',       iati: 53.7, ref: 66.1 },
      { y: '2026 (YTD)', iati: 5.4,  ref: 25.3, partial: true },
    ],
    indicatorData: [
      { g: 'indGroupAvailability', items: [
        { nk: 'indFilesReg',    hk: 'hintFilesReg',    p: 100, w: 'good' },
        { nk: 'indSchemaValid', hk: 'hintSchemaValid', p: 100, w: 'good' },
        { nk: 'indOrgFile',     hk: 'hintOrgFile',     p: 100, w: 'good' },
        { nk: 'indTotalBudget', hk: 'hintTotalBudget', p: 0,   w: 'bad', flag: true },
      ]},
      { g: 'indGroupCoverage', items: [
        { nk: 'indCov2024', hk: 'hintCov2024', p: 81, w: 'good' },
        { nk: 'indCov2023', hk: 'hintCov2023', p: 74, w: null },
        { nk: 'indCov2025', hk: 'hintCov2025', p: 64, w: null },
      ]},
      { g: 'indGroupFinancial', items: [
        { nk: 'indCommitments',   p: 97, w: 'good' },
        { nk: 'indDisbursements', p: 99, w: 'good' },
        { nk: 'indCapital',       hk: 'hintCapital',   p: 42, w: 'warn' },
        { nk: 'indDisaggTx',      hk: 'hintDisaggTx',  p: 71, w: null },
      ]},
      { g: 'indGroupTraceability', items: [
        { nk: 'indOutgoing',   hk: 'hintOutgoing',   p: 12, w: 'bad', flag: true },
        { nk: 'indOrgIDs',     hk: 'hintOrgIDs',     p: 96, w: 'good' },
        { nk: 'indDownstream', hk: 'hintDownstream', p: 34, w: 'warn' },
      ]},
      { g: 'indGroupProjectInfo', items: [
        { nk: 'indSectors',    p: 99, w: 'good' },
        { nk: 'indRecipient',  p: 96, w: 'good' },
        { nk: 'indGeo',        p: 48, w: 'warn' },
        { nk: 'indDocs',       p: 88, w: 'good' },
        { nk: 'indResults',    p: 22, w: 'bad' },
        { nk: 'indConditions', p: 6,  w: 'bad' },
      ]},
    ]
  },
  eu: {
    overall: 45, traceability: 100,
    orgIds: 29, publisherID: 'XI-IATI-EC_INTPA', publisherType: 'Other Public Sector', totalDisbursements: '897m',
    dimensions: [
      { k: 'dimAvailability', pct: 100, metrics: [
        { k: 'subDownloadable',     v: true },
        { k: 'subPassesValidation', v: true },
        { k: 'subNoCriticalErrors', v: false },
      ]},
      { k: 'dimTimeliness', pct: 100, metrics: [
        { k: 'subTimeliness', v: 100 },
        { k: 'subFrequency',  v: 88 },
      ]},
      { k: 'dimCoverage', pct: 35, metrics: [
        { k: 'subCoverage',       v: 35 },
        { k: 'dimDisaggregation', v: 100 },
      ]},
      { k: 'dimComprehensiveness', pct: 85, metrics: [
        { k: 'subOrgFields',       v: 91 },
        { k: 'subBasicFields',     v: 100 },
        { k: 'subFinancialFields', v: 84 },
        { k: 'subAdvancedFields',  v: 62 },
      ]},
    ],
    coverageRows: [
      { y: '2023',       iati: 55.8, ref: 60.4 },
      { y: '2024',       iati: 66.6, ref: 74.1 },
      { y: '2025',       iati: 53.7, ref: 66.1 },
      { y: '2026 (YTD)', iati: 5.4,  ref: 25.3, partial: true },
    ],
    indicatorData: [
      { g: 'indGroupAvailability', items: [
        { nk: 'indFilesReg',    hk: 'hintFilesReg',    p: 100, w: 'good' },
        { nk: 'indSchemaValid', hk: 'hintSchemaValid', p: 100, w: 'good' },
        { nk: 'indOrgFile',     hk: 'hintOrgFile',     p: 100, w: 'good' },
        { nk: 'indTotalBudget', hk: 'hintTotalBudget', p: 0,   w: 'bad', flag: true },
      ]},
      { g: 'indGroupCoverage', items: [
        { nk: 'indCov2024', hk: 'hintCov2024', p: 35, w: 'good' },
        { nk: 'indCov2023', hk: 'hintCov2023', p: 35, w: null },
        { nk: 'indCov2025', hk: 'hintCov2025', p: 35, w: null },
      ]},
      { g: 'indGroupFinancial', items: [
        { nk: 'indCommitments',   p: 91,  w: 'good' },
        { nk: 'indDisbursements', p: 84,  w: 'good' },
        { nk: 'indCapital',       hk: 'hintCapital',  p: 100, w: 'good' },
        { nk: 'indDisaggTx',      hk: 'hintDisaggTx', p: 71,  w: null },
      ]},
      { g: 'indGroupTraceability', items: [
        { nk: 'indOutgoing', hk: 'hintOutgoing', p: 0.32, w: 'bad', flag: true },
        { nk: 'indOrgIDs',   hk: 'hintOrgIDs',  p: 29,   w: 'good' },
      ]},
      { g: 'indGroupComprehensiveness', items: [
        { nk: 'indSectors',    p: 100, w: 'good' },
        { nk: 'indRecipient',  p: 100, w: 'good' },
        { nk: 'indGeo',        p: 58,  w: 'good' },
        { nk: 'indDocs',       p: 64,  w: 'good' },
        { nk: 'indResults',    p: 26,  w: 'bad' },
        { nk: 'indConditions', p: 0,   w: 'bad' },
      ]},
    ]
  }
}

const d = computed(() => orgData[slug] || orgData.usaid)

const overall           = computed(() => d.value.overall)
const publisherID       = computed(() => d.value.publisherID)
const totalDisbursements = computed(() => d.value.totalDisbursements)
const coverageRows      = computed(() => d.value.coverageRows)

const indicators = computed(() =>
  d.value.indicatorData.map(group => ({
    g: t(group.g),
    items: group.items.map(it => ({ ...it, n: t(it.nk), h: it.hk ? t(it.hk) : '' }))
  }))
)

const dimensions = computed(() =>
  d.value.dimensions.map(dim => ({
    key:     dim.k,
    label:   t(dim.k),
    pct:     dim.pct,
    metrics: dim.metrics.map(m => ({ label: t(m.k), value: m.v })),
  }))
)
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: '#' },
      { label: t('navOrganisations'), href: '#' },
      { label: orgName },
    ]" />
    <TitleBar :eyebrow="t('orgEyebrow')" :title="orgName">
      <template #meta>
        <span><strong>{{ t('orgReportingID') }}</strong> {{ publisherID }}</span>
        <span><strong>{{ t('orgType') }}</strong> {{ d.publisherType }}</span>
        <span><strong>{{ t('orgLastUpdated') }}</strong> 12 Apr 2026</span>
        <span><strong>{{ t('orgDisbursed') }}</strong> ${{ totalDisbursements }}</span>
      </template>
    </TitleBar>

    <main class="main">
      <!-- Hero — score + alerts -->
      <BRow gutter-x="4" class="mb-sm">
        <BCol cols="12" md="12"><Card :kicker="t('orgOverallQuality')">
          <div class="hero-metrics">
            <div class="hero-metrics__gauge">
              <Gauge :show-pct="false" :pct="overall" size="160px" :color="overall > 50 ? 'var(--green-50)' : 'grey'" :label="overall > 50 ? t('orgVeryGood') : t('orgPublished')" />
            </div>
            <div class="hero-metrics__cards">
              <DimensionCard
                v-for="dim in dimensions" :key="dim.key"
                :label="dim.label"
                :pct="dim.pct"
                :metrics="dim.metrics"
              />
            </div>
          </div>
          </Card>
        </BCol>
        <!--
        <BCol cols="12" md="3"><div class="col">
          <OrganisationCallout variant="good" icon="✓" :title="t('orgCalloutAvailTitle')">
            <p>{{ t('orgCalloutAvailText') }} <a href="#">{{ t('orgViewDetails') }}</a></p>
          </OrganisationCallout>
          <OrganisationCallout :title="t('orgCalloutActionTitle')">
            <template v-if="slug === 'eu'">
              <i18n-t keypath="orgEUAction" tag="p">
                <template #emphasis><strong>{{ t('orgEUActionBold') }}</strong></template>
              </i18n-t>
            </template>
            <template v-else>
              <i18n-t keypath="orgUSAIDAction" tag="p">
                <template #emphasis><strong>{{ t('orgUSAIDActionBold') }}</strong></template>
              </i18n-t>
            </template>
          </OrganisationCallout>
          <OrganisationCallout variant="info" icon="i" :title="t('orgCalloutPeersTitle')">
            <i18n-t keypath="orgCalloutPeersText" tag="p">
              <template #emphasis><strong>{{ t('orgCalloutPeersTextBold') }}</strong></template>
            </i18n-t>
            <a href="#">{{ t('orgOpenGroup') }}</a>
          </OrganisationCallout>
        </div></BCol>
        -->
      </BRow>

      <Card class="mt" :kicker="t('orgSummaryTitle')">
        <OrgFinancialChart :org-id="d.publisherID" />
      </Card>

      <!-- Prioritised issues -->
      <Card class="mt" :kicker="t('orgIssuesTitle')">
        <div class="iati-table">
        <table>
          <thead>
            <tr>
              <th style="width: 50px">#</th>
              <th>{{ t('orgColIssue') }}</th>
              <th>{{ t('orgColWhy') }}</th>
              <th style="width: 140px">{{ t('orgColCurrent') }}</th>
              <th style="width: 130px">{{ t('orgColTrend') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num">1</td>
              <td class="org">{{ t('orgIssue1n') }}<small>{{ t('orgIssue1s') }}</small></td>
              <td>{{ t('orgIssue1w') }}</td>
              <td><Bar :pct="6" variant="bad" /></td>
              <td><span class="heat heat-1">−2</span></td>
            </tr>
            <tr>
              <td class="num">2</td>
              <td class="org">{{ t('orgIssue2n') }}<small>{{ t('orgIssue2s') }}</small></td>
              <td>{{ t('orgIssue2w') }}</td>
              <td><Bar :pct="12" variant="bad" /></td>
              <td><span class="heat heat-1">−4</span></td>
            </tr>
            <tr>
              <td class="num">3</td>
              <td class="org">{{ t('orgIssue3n') }}<small>{{ t('orgIssue3s') }}</small></td>
              <td>{{ t('orgIssue3w') }}</td>
              <td><Bar :pct="22" variant="bad" /></td>
              <td><span class="heat heat-3">±0</span></td>
            </tr>
            <tr>
              <td class="num">4</td>
              <td class="org">{{ t('orgIssue4n') }}<small>{{ t('orgIssue4s') }}</small></td>
              <td>{{ t('orgIssue4w') }}</td>
              <td><Bar :pct="0" variant="bad" /></td>
              <td><span class="heat heat-0">N/A</span></td>
            </tr>
            <tr>
              <td class="num">5</td>
              <td class="org">{{ t('orgIssue5n') }}</td>
              <td>{{ t('orgIssue5w') }}</td>
              <td><Bar :pct="48" variant="warn" /></td>
              <td><span class="heat heat-4">+3</span></td>
            </tr>
          </tbody>
        </table>
        </div>
      </Card>

      <!-- Coverage chart + all indicators -->
      <BRow gutter-x="3" gutter-y="3" class="mt">
        <BCol cols="12" md="6"><Card :kicker="t('orgCoverageTitle')" :title="t('orgIATIvsCRS', { org })">
          <div class="mt">
            <div v-for="r in coverageRows" :key="r.y" class="mb-md">
              <div class="spread spread--sm">
                <strong>{{ r.y }}</strong>
                <span>${{ r.iati.toFixed(1) }} bn / ${{ r.ref.toFixed(1) }} bn ({{ Math.round(100 * r.iati / r.ref) }}%)</span>
              </div>
              <div class="bar bar--lg bar--track">
                <span :style="{ width: Math.min(100, 100 * r.iati / r.ref) + '%', background: r.partial ? 'var(--teal-50)' : 'var(--green-50)' }" />
              </div>
            </div>
          </div>
          <p class="coverage-note">{{ t('orgCoverageNote') }}</p>
        </Card></BCol>

        <BCol cols="12" md="6"><Card :kicker="t('orgAllIndicators')" :title="t('orgByGroup')">
          <div class="mt-sm">
            <div v-for="group in indicators" :key="group.g" class="mb-md">
              <div class="indicator-group-heading">{{ group.g }}</div>
              <Indicator
                v-for="(it, i) in group.items"
                :key="i"
                :name="it.n"
                :hint="it.h || ''"
                :pct="it.p"
                :variant="it.w"
              />
            </div>
          </div>
        </Card></BCol>
      </BRow>
    </main>
  </div>
</template>
