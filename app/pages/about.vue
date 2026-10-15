<script setup>
/**
 * A brief explanation of the methodology, for publishers arriving from the
 * consultation email.
 *
 * Short by design: it is the one-page account of how an assessment is reached,
 * the full reasoning lives in the proposal document, which is linked. The two
 * things it does carry in full are the thresholds and the indicator
 * descriptions, because those are what someone looking at their own assessment
 * needs in front of them.
 *
 * Both tables are generated rather than written out: the thresholds come from
 * the same methodology.json the assessment is scored against, and the indicator
 * rows from the framework's own list and the shared description file. A
 * threshold change therefore cannot leave this page stating the old one.
 */
import methodology from '~~/sample-data/methodology.json'

definePageMeta({ active: 'about' })
const { t } = useI18n({ useScope: 'global' })
const { full: fullSite } = usePreviewScope()
const { seesAll } = useAccess()
const { indicatorHelp, indicatorNote, componentHelp, indicatorName } = useIndicatorHelp()

useHead({ title: () => `${t('aboutTitle')} — ${t('brandDashboard')}` })

const BANDS = ['good', 'very_good', 'excellent']

// Mirrors the organisation page's panel order, so the dimensions read the same
// way in both places.
const DIMENSIONS = [
  { id: 'availability',      why: 'aboutDimAvailabilityWhy',
    components: ['downloadable', 'no_critical_errors', 'no_errors'] },
  { id: 'timeliness',        why: 'aboutDimTimelinessWhy',
    components: ['frequency', 'timeliness'] },
  { id: 'coverage',          why: 'aboutDimCoverageWhy',
    components: ['coverage', 'disaggregation'] },
  { id: 'comprehensiveness', why: 'aboutDimComprehensivenessWhy',
    components: ['organisation_fields', 'basic_fields', 'financial_fields', 'advanced_fields'] },
]

/**
 * How one component's requirement for one band reads.
 *
 * Empty string, not a dash, where a band asks nothing of a component: the
 * cell is genuinely blank, and the intro says so. Advanced fields is the only
 * one today — it has no "good" threshold, because the first star does not
 * require it.
 */
function threshold(componentId, band) {
  const meta = methodology.components[componentId]
  const value = meta?.thresholds?.[band]
  if (value === undefined) return ''
  if (meta.unit === 'percent') return `${value}%`
  if (meta.unit === 'count')   return t('aboutThresholdQuarters', { n: value })
  if (meta.unit === 'boolean') return t('aboutThresholdAll')
  return t(labelKey('value', value))
}

/**
 * Collapses a run of identical requirements into one cell spanning them.
 *
 * Several components ask the same thing of more than one category — every
 * availability check must pass for all three, and monthly publishing earns both
 * very good and excellent — and repeating the words three times across a row
 * reads as three separate requirements that happen to coincide. One cell
 * spanning the columns says what is actually true.
 *
 * Blanks never merge. An empty cell means that category asks nothing of this
 * component, and two categories asking nothing are not one shared requirement.
 */
function mergeRuns(values) {
  const out = []
  for (const text of values) {
    const last = out.at(-1)
    if (last && text && last.text === text) last.span++
    else out.push({ text, span: 1 })
  }
  return out
}

const dimensions = computed(() => DIMENSIONS.map(dim => ({
  ...dim,
  label: t(labelKey('dim', dim.id)),
  rows: dim.components.map(id => ({
    id,
    label: t(labelKey('sub', id)),
    help: componentHelp(id),
    cells: mergeRuns(BANDS.map(band => threshold(id, band))),
  })),
})))

const categories = [
  { category: 'needs_improvement', what: 'aboutCategoryNeedsImprovementWhat' },
  { category: 'good',              what: 'aboutCategoryGoodWhat' },
  { category: 'very_good',         what: 'aboutCategoryVeryGoodWhat' },
  { category: 'excellent',         what: 'aboutCategoryExcellentWhat' },
].map(r => ({ ...r, label: t(labelKey('category', r.category)) }))

// One flat list, with a sub-heading row per component, so the whole set can be
// read down the page or scanned by number.
const indicatorGroups = computed(() => FRAMEWORK_INDICATORS.map(group => ({
  id: group.component,
  label: t(labelKey('sub', group.component)),
  help: componentHelp(group.component),
  rows: group.ids.map(id => ({
    id,
    number: indicatorNumber(id),
    name: indicatorName(id),
    help: indicatorHelp(id),
    note: indicatorNote(id),
  })),
})))

const FRAMEWORK_URL = 'https://iatistandard.org/en/news/reimagining-data-quality-consultation/'
// Where the consultation happens: one issue per indicator and per component.
const FEEDBACK_URL = 'https://github.com/IATI/dashboard-feedback/issues'
const TESTS_URL = 'https://github.com/IATI/dashboard-tests'
const VALIDATOR_URL = 'https://validator.iatistandard.org/'
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: fullSite && seesAll ? '/' : null },
      { label: t('aboutBreadcrumb') },
    ]" />
    <TitleBar :eyebrow="t('aboutEyebrow')" :title="t('aboutTitle')" />

    <main class="main">
      <p class="about-lead">{{ t('aboutLead') }}</p>

      <!-- First, before any of the detail: these numbers are not final. -->
      <BAlert :model-value="true" variant="warning" class="about-draft">
        <h2 class="about-draft__title">{{ t('aboutDraftTitle') }}</h2>
        <p>{{ t('aboutDraftBody') }}</p>
        <p>
          {{ t('aboutDraftFeedback') }}
          <a :href="`mailto:${SUPPORT_EMAIL}`">{{ t('aboutDraftContact', { email: SUPPORT_EMAIL }) }}</a>
        </p>
        <p class="mb-0">
          {{ t('aboutDraftGithub') }}
          <a :href="FEEDBACK_URL">{{ t('aboutDraftGithubLink') }}</a>
        </p>
      </BAlert>

      <BRow gutter-x="3" gutter-y="3" class="mt">
        <BCol cols="12" lg="7">
          <Card :kicker="t('aboutHowTitle')">
            <div class="about-prose">
              <p>{{ t('aboutHowBody') }}</p>
              <p>{{ t('aboutHowWeakest') }}</p>
              <p>{{ t('aboutHowIntention') }}</p>
              <p>{{ t('aboutHowWeighting') }}</p>
              <p>{{ t('aboutHowFocus') }}</p>
            </div>
          </Card>
        </BCol>
        <BCol cols="12" lg="5">
          <Card :kicker="t('aboutCategoriesTitle')">
            <div class="iati-table">
              <table class="about-table about-table--categories">
              <caption class="visually-hidden">{{ t('aboutCategoriesTitle') }}</caption>
              <thead>
                <tr>
                  <th scope="col">{{ t('aboutCategoriesCol') }}</th>
                  <th scope="col">{{ t('aboutCategoriesMeans') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cat in categories" :key="cat.category">
                  <th scope="row" class="about-table__category">
                    <span class="about-table__category-name">{{ cat.label }}</span>
                    <Stars :category="cat.category" size="sm" decorative />
                  </th>
                  <td>{{ t(cat.what) }}</td>
                </tr>
              </tbody>
              </table>
            </div>
          </Card>
        </BCol>
      </BRow>

      <Card :kicker="t('aboutDimensionsTitle')" class="mt">
        <p class="about-prose">{{ t('aboutDimensionsIntro') }}</p>

        <div class="about-dimensions">
          <section v-for="dim in dimensions" :key="dim.id" class="about-dimension">
            <h3 class="about-dimension__title">{{ dim.label }}</h3>
            <p class="about-dimension__why">{{ t(dim.why) }}</p>
            <div class="iati-table">
              <table class="about-table">
              <caption class="visually-hidden">{{ dim.label }}</caption>
              <thead>
                <tr>
                  <th scope="col">{{ t('aboutColComponent') }}</th>
                  <th scope="col" class="about-table__measures">{{ t('aboutColMeasures') }}</th>
                  <th v-for="(band, i) in BANDS" :key="band" scope="col" class="about-table__band">
                    <span class="about-table__band-name">{{ t(labelKey('category', band)) }}</span>
                    <Stars :category="band" size="sm" decorative />
                    <span class="visually-hidden">{{ i + 1 }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dim.rows" :key="row.id">
                  <th scope="row">{{ row.label }}</th>
                  <td class="about-table__measures">{{ row.help }}</td>
                  <td
                    v-for="(cell, i) in row.cells" :key="i"
                    :colspan="cell.span > 1 ? cell.span : undefined"
                    class="about-table__band"
                  >
                    <span v-if="cell.text">{{ cell.text }}</span>
                    <span v-else class="about-table__blank">
                      <span class="visually-hidden">{{ t('aboutThresholdNotRequired') }}</span>
                    </span>
                  </td>
                </tr>
              </tbody>
              </table>
            </div>
          </section>
        </div>
      </Card>

      <Card :kicker="t('aboutIndicatorsTitle')" class="mt">
        <div class="about-prose">
          <p>{{ t('aboutIndicatorsIntro') }}</p>
          <p>{{ t('aboutIndicatorsOrgFileNote') }}</p>
        </div>

        <div class="iati-table">
          <table class="about-table about-table--indicators">
          <caption class="visually-hidden">{{ t('aboutIndicatorsTitle') }}</caption>
          <thead>
            <tr>
              <th scope="col" class="about-table__number">#</th>
              <th scope="col">{{ t('aboutColIndicator') }}</th>
              <th scope="col">{{ t('aboutColMeasures') }}</th>
              <th scope="col">{{ t('aboutColNotes') }}</th>
            </tr>
          </thead>
          <!-- A tbody per component: the group heading is a row so it stays with
               its indicators however the table is read. -->
          <tbody v-for="group in indicatorGroups" :key="group.id">
            <tr class="about-table__group">
              <th scope="colgroup" colspan="4">
                <span class="about-table__group-name">{{ group.label }}</span>
                <span class="about-table__group-help">{{ group.help }}</span>
              </th>
            </tr>
            <tr v-for="row in group.rows" :key="row.id">
              <td class="about-table__number">{{ row.number }}</td>
              <th scope="row">{{ row.name }}</th>
              <td>{{ row.help }}</td>
              <td class="about-table__note">{{ row.note }}</td>
            </tr>
          </tbody>
          </table>
        </div>
      </Card>

      <Card :kicker="t('aboutSourceTitle')" class="mt mb">
        <div class="about-prose">
          <p>
            {{ t('aboutSourceFramework') }}
            <a :href="FRAMEWORK_URL">{{ t('aboutSourceLinkFramework') }}</a>
          </p>
          <p>{{ t('aboutSourceValidator') }} <a :href="VALIDATOR_URL">{{ t('aboutSourceLinkValidator') }}</a></p>
          <p>{{ t('aboutSourceCoverage') }}</p>
          <p>{{ t('aboutSourceSnapshot') }}</p>
          <p>{{ t('aboutSourceStats') }} <a :href="TESTS_URL">{{ t('aboutSourceLinkTests') }}</a></p>
        </div>
      </Card>
    </main>
  </div>
</template>
