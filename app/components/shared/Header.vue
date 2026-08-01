<script setup>
defineProps({ active: { type: String, default: '' } })
const { t, locale, setLocale } = useI18n({ useScope: 'global' })
</script>

<template>
  <header class="iati-header">
    <!-- White section: IATI logo + main IATI site nav -->
    <div class="iati-header__section iati-header__section--first">
      <div class="iati-header__container">
        <a href="https://iatistandard.org/" aria-label="Go to IATI homepage">
          <img class="iati-header__logo" alt="" src="~/assets/svg/logo-colour.svg" />
        </a>
        <nav class="iati-header__general-nav">
          <ul class="iati-piped-list">
            <li><a href="https://iatistandard.org/en/about/">{{ t('navAboutIATI') }}</a></li>
            <li><a href="https://iatistandard.org/en/using-data/">{{ t('navUseData') }}</a></li>
            <li><a href="https://iatistandard.org/en/guidance/publishing-data/">{{ t('navPublishData') }}</a></li>
            <li><a href="https://iatistandard.org/guidance/get-support/">{{ t('navContact') }}</a></li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Dark section: actions + tool title + tool nav -->
    <div class="iati-header__section iati-header__section--last iati-brand-background">
      <div class="iati-header__container iati-brand-background__content">
        <div class="iati-header__actions">
          <div class="iati-country-switcher iati-country-switcher--compact">
            <label for="lang-switcher" class="iati-country-switcher__label">Choose your language</label>
            <select id="lang-switcher" class="iati-country-switcher__control" :value="locale" @change="e => setLocale(e.target.value)">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <a href="#" class="iati-button iati-button--light hide--mobile-nav">
            <span>{{ t('navHelp') }}</span>
            <i class="iati-icon iati-icon--info"></i>
          </a>
          <a href="#" class="iati-button iati-button--light">
            <span>{{ t('navSignIn') }}</span>
          </a>
        </div>
        <div class="iati-header-title">
          <p class="iati-header-title__eyebrow">{{ t('brandEyebrow') }}</p>
          <p class="iati-header-title__heading">{{ t('brandDashboard') }}</p>
        </div>
        <div class="iati-header__nav">
          <nav>
            <ul class="iati-tool-nav">
              <li><a class="iati-tool-nav-link" :class="{ active: active === 'overall' }" href="/">{{ t('navOverview') }}</a></li>
              <li><a class="iati-tool-nav-link" :class="{ active: active === 'groups' }" href="/group">{{ t('navGroups') }}</a></li>
              <li><a class="iati-tool-nav-link" :class="{ active: active === 'country' }" href="/country">{{ t('navCountry') }}</a></li>
              <li><a class="iati-tool-nav-link" :class="{ active: active === 'org' }" href="/usaid">{{ t('navOrganisations') }}</a></li>
              <li><a class="iati-tool-nav-link" :class="{ active: active === 'exploring' }" href="/exploring-data">{{ t('navExploring') }}</a></li>
              <li><a class="iati-tool-nav-link" href="#">{{ t('navAbout') }}</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  </header>
</template>
