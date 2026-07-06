<script setup>
defineProps({ active: { type: String, default: '' } })
const { t, locale, toggleLocale } = useLocale()
</script>

<template>
  <header class="appbar">
    <div class="appbar__top">
      <span>{{ t('brandPlatform') }}</span>
      <span>
        <button
          @click="toggleLocale"
          style="background: none; border: 1px solid rgba(255,255,255,.35); color: #fff; font-size: .78rem; font-weight: 700; padding: 2px 8px; border-radius: 3px; cursor: pointer; letter-spacing: .5px; margin-right: 8px"
        >{{ locale === 'en' ? 'FR' : 'EN' }}</button>
        <a href="#">{{ t('navHelp') }}</a> &middot; <a href="#">{{ t('navSignIn') }}</a>
      </span>
    </div>
    <div class="appbar__main">
      <div class="appbar__logo">
        <img src="/assets/svg/logo-white.svg" alt="IATI" />
        <div class="label">{{ t('brandDashboard') }}<small>{{ t('brandSubtitle') }}</small></div>
      </div>
      <nav class="appbar__nav">
        <a :class="{ active: active === 'overall' }" href="#">{{ t('navOverview') }}</a>
        <a :class="{ active: active === 'groups' }" href="#">{{ t('navGroups') }}</a>
        <a :class="{ active: active === 'country' }" href="#">{{ t('navCountry') }}</a>
        <a :class="{ active: active === 'org' }" href="#">{{ t('navOrganisations') }}</a>
        <a href="#">{{ t('navExploring') }}</a>
        <a href="#">{{ t('navAbout') }}</a>
      </nav>
      <button class="btn btn--light">{{ t('navDownload') }}</button>
    </div>
  </header>
</template>
