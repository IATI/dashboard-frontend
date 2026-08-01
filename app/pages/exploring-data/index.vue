<script setup>
definePageMeta({ active: 'exploring' })
const { t } = useI18n({ useScope: 'global' })

const sections = [
  { key: 'publishers',   href: '/exploring-data/publishers',   icon: '🏛' },
  { key: 'activities',   href: '/exploring-data/activities',   icon: '📈' },
  { key: 'files',        href: '/exploring-data/files',        icon: '📦' },
  { key: 'versions',     href: '/exploring-data/versions',     icon: '🏷' },
  { key: 'organisation', href: '/exploring-data/organisation', icon: '🏢' },
  { key: 'booleans',     href: '/exploring-data/booleans',     icon: '✓' },
]
</script>

<template>
  <div>
    <Crumbs :path="[{ label: t('breadPublishingQuality'), href: '#' }, { label: t('exploreBreadcrumb') }]" />
    <TitleBar :eyebrow="t('exploreEyebrow')" :title="t('exploreTitle')">
      <template #meta>
        <span>{{ t('exploreSubtitle') }}</span>
      </template>
    </TitleBar>

    <main class="main">
      <BRow cols="1" cols-md="2" cols-lg="3" gutter-x="3" gutter-y="3">
        <BCol v-for="s in sections" :key="s.key">
          <a
            :href="s.href"
            class="iati-card iati-card--nav"
            style="padding: 28px 24px; height: 100%; display: block"
          >
            <div class="iati-card__icon">{{ s.icon }}</div>
            <h3>{{ t(`explore${s.key.charAt(0).toUpperCase() + s.key.slice(1)}Title`) }}</h3>
            <p class="sub" style="margin: 0">
              {{ t(`explore${s.key.charAt(0).toUpperCase() + s.key.slice(1)}Subtitle`) }}
            </p>
          </a>
        </BCol>
      </BRow>
    </main>
  </div>
</template>
