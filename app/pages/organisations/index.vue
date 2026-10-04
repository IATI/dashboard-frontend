<script setup>
definePageMeta({ active: 'org' })
const { t, locale } = useI18n({ useScope: 'global' })

const { publishers, status, refresh, fetchedAt } = usePublisherList()

// The list is fetched once per session, so say how old it is rather than
// leaving the reader to assume it is live.
const fetchedAtLabel = computed(() => {
  if (!fetchedAt.value) return null
  return new Date(fetchedAt.value).toLocaleTimeString(locale.value, {
    hour: 'numeric', minute: '2-digit',
  })
})
const { lookup: organisationTypeName, map: orgTypeMap } = useCodelist('OrganisationType')

// Signed in with an IATI Account, the list narrows to the organisations that
// account administers. Signed out, it stays the full public list — the site's
// password gate is the access control there, and this is the same data the
// dashboard already publishes.
const { publishers: myOrgs, slugs: mySlugs, state: scopeState, error: scopeError } = useMyPublishers()

const scoped = computed(() => scopeState.value === 'scoped')

// An account can administer an organisation the dashboard has no record of —
// it is registered in RYD but has never published IATI data, so there are no
// statistics to show. Without this the page would just say "0 publishers".
const notPublished = computed(() => {
  if (!scoped.value) return []
  const known = new Set(publishers.value.map(p => p.slug))
  return (myOrgs.value ?? []).filter(o => !known.has(o.slug))
})
const notPublishedNames = computed(() =>
  notPublished.value.map(o => o.name || o.slug).join(', '),
)

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
// Ordered by code, not by label. The OrganisationType codes are grouped by
// kind — 10s government, 20s NGO, 40 multilateral, 60 foundation, 70s private
// sector, 80 academic — so the numeric order carries meaning that sorting the
// names alphabetically throws away. It also keeps the order stable across
// languages, where the names sort differently.
const orgTypes = computed(() => {
  const codes = [...new Set(publishers.value.map(p => p.organisationType).filter(Boolean))]
  return codes
    .map(code => ({ code, label: organisationTypeName(code) }))
    .sort((a, b) => {
      const an = Number(a.code)
      const bn = Number(b.code)
      // Any non-numeric code sorts after the numeric ones, by its own text.
      if (Number.isNaN(an) || Number.isNaN(bn)) return String(a.code).localeCompare(String(b.code))
      return an - bn
    })
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
    <TitleBar :title="t('navOrganisations')" />

    <main class="main">
      <ClientOnly>
        <BAlert v-if="scoped" :model-value="true" :variant="rows.length ? 'info' : 'warning'" class="mb-sm">
          <template v-if="!mySlugs.size">{{ t('pubScopedNone') }}</template>
          <template v-else-if="!rows.length">{{ t('pubScopedNotPublished', { orgs: notPublishedNames }) }}</template>
          <template v-else>
            {{ t('pubScopedToYou', mySlugs.size) }}
            <span v-if="notPublished.length" class="scope-error">
              {{ t('pubScopedSomeMissing', { orgs: notPublishedNames }) }}
            </span>
          </template>
        </BAlert>
        <BAlert v-else-if="scopeState === 'failed'" :model-value="true" variant="warning" class="mb-sm">
          {{ t('pubScopeUnavailable') }}
          <span v-if="scopeError" class="scope-error">{{ scopeError.message }}</span>
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
          <div class="filter-count">
            <span>{{ t('pubCount', { n: filtered.length.toLocaleString() }) }}</span>
            <span v-if="fetchedAtLabel" class="filter-count__meta">
              {{ t('pubLoadedAt', { time: fetchedAtLabel }) }}
              <button
                type="button" class="link-button"
                :disabled="status === 'pending'"
                @click="refresh()"
              >{{ status === 'pending' ? t('pubRefreshing') : t('pubRefresh') }}</button>
            </span>
          </div>
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
              <NuxtLink class="pub-link" :to="`/organisations/${item.slug}`">{{ item.name }}</NuxtLink>
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
