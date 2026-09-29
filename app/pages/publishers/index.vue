<script setup>
definePageMeta({ active: 'org' })
const { t, locale } = useI18n({ useScope: 'global' })

const { publishers, status } = usePublisherList()
const { lookup: organisationTypeName, map: orgTypeMap } = useCodelist('OrganisationType')

// Signed in with an IATI Account, the list narrows to the organisations that
// account administers. Signed out, it stays the full public list — the site's
// password gate is the access control there, and this is the same data the
// dashboard already publishes.
const { isSignedIn } = useAuth()
const { slugs: mySlugs, blocked: rydBlocked, status: myStatus } = useMyPublishers()

const scoped = computed(() => isSignedIn.value && myStatus.value === 'success' && !rydBlocked.value)

const PER_PAGE = 50
const search = ref('')
const filterType = ref('')
const currentPage = ref(1)
const sortBy = ref([{ key: 'name', order: 'asc' }])

const FIELDS = computed(() => [
  { key: 'name',         label: t('pubColName'), sortable: true },
  { key: 'slug',         label: t('pubColSlug'), sortable: true, thStyle: { width: '170px' } },
  { key: 'orgType',      label: t('pubColType'), sortable: true, thStyle: { width: '210px' } },
  { key: 'hqCountry',    label: t('pubColHq'),   sortable: true, thStyle: { width: '110px' } },
  { key: 'datasetCount', label: t('pubColFiles'), sortable: true, class: 'num', thStyle: { width: '90px' } },
])

// Org types present in the data, labelled from the codelist and sorted by label
const orgTypes = computed(() => {
  const codes = [...new Set(publishers.value.map(p => p.organisationType).filter(Boolean))]
  return codes
    .map(code => ({ code, label: organisationTypeName(code) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale.value))
})

const rows = computed(() => {
  const all = publishers.value.map(p => ({ ...p, orgType: organisationTypeName(p.organisationType) }))
  return scoped.value ? all.filter(p => mySlugs.value.has(p.slug)) : all
})

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return rows.value.filter(p => {
    if (filterType.value && p.organisationType !== filterType.value) return false
    if (!term) return true
    return (
      p.name?.toLowerCase().includes(term) ||
      p.slug?.toLowerCase().includes(term) ||
      p.iatiIdentifier?.toLowerCase().includes(term)
    )
  })
})

// Any filter change should return to the first page, or you land on an empty one
watch([search, filterType], () => { currentPage.value = 1 })
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: '/' },
      { label: t('navOrganisations') },
    ]" />
    <TitleBar :eyebrow="t('orgEyebrow')" :title="t('navOrganisations')" />

    <main class="main">
      <ClientOnly>
        <BAlert v-if="scoped" :model-value="true" variant="info" class="mb-sm">
          {{ t('pubScopedToYou', { n: mySlugs.size }) }}
        </BAlert>
        <BAlert v-else-if="isSignedIn && rydBlocked" :model-value="true" variant="warning" class="mb-sm">
          {{ t('pubScopeUnavailable') }}
        </BAlert>
      </ClientOnly>

      <Card flush>
        <div class="filter-bar">
          <div>
            <label>{{ t('pubSearchLabel') }}</label>
            <input v-model="search" type="text" :placeholder="t('pubSearchPlaceholder')" />
          </div>
          <div>
            <label>{{ t('pubColType') }}</label>
            <select v-model="filterType">
              <option value="">{{ t('pubAllTypes') }}</option>
              <option v-for="tp in orgTypes" :key="tp.code" :value="tp.code">{{ tp.label }}</option>
            </select>
          </div>
          <div class="filter-count">{{ t('pubCount', { n: filtered.length.toLocaleString() }) }}</div>
        </div>

        <div class="iati-table">
          <BTable
            :items="filtered"
            :fields="FIELDS"
            v-model:sort-by="sortBy"
            :per-page="PER_PAGE"
            :current-page="currentPage"
            :busy="status === 'pending'"
          >
            <template #table-busy>
              <div class="loading">{{ t('loading') }}</div>
            </template>
            <template #cell(name)="{ item }">
              <NuxtLink class="pub-link" :to="`/publishers/${item.slug}`">{{ item.name }}</NuxtLink>
            </template>
            <template #cell(slug)="{ value }">
              <span class="pub-slug">{{ value }}</span>
            </template>
            <template #cell(orgType)="{ value }">{{ value || '—' }}</template>
            <template #cell(hqCountry)="{ value }">{{ value || '—' }}</template>
            <template #cell(datasetCount)="{ value }">
              {{ value === null ? '—' : value.toLocaleString() }}
            </template>
            <template #empty>
              <div class="loading">{{ t('pubNoMatches') }}</div>
            </template>
          </BTable>
        </div>

        <div class="iati-card-footer iati-card-footer--center">
          <BPagination
            v-model="currentPage"
            :total-rows="filtered.length"
            :per-page="PER_PAGE"
            align="center"
            limit="7"
          />
        </div>
      </Card>
    </main>
  </div>
</template>

<style scoped>
.pub-link { color: var(--teal-70); text-decoration: none; font-weight: 700 }
.pub-link:hover { text-decoration: underline }
.pub-slug {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .78rem; color: var(--grey-70);
}
</style>
