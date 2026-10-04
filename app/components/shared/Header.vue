<script setup>
defineProps({ active: { type: String, default: '' } })
const { t, locale, setLocale } = useI18n({ useScope: 'global' })

// IATI Account sign-in. `ready` is false until the session has been checked, so
// the button stays neutral rather than flashing "Sign in" at someone who is
// already signed in.
const { user, ready, isSignedIn, signIn, signOut } = useAuth()

// One list, rendered twice: the horizontal tool nav on desktop and the slide-in
// panel on mobile. Keeping them separate is how they drift apart.
const navItems = computed(() => [
  { key: 'overall',   to: '/',              label: t('navOverview') },
  { key: 'groups',    to: '/groups/10',     label: t('navGroups') },
  { key: 'country',   to: '/countries/KE',  label: t('navCountry') },
  { key: 'org',       to: '/organisations', label: t('navOrganisations') },
  { key: 'exploring', to: '/exploring-data', label: t('navExploring') },
])

// The design system hides .iati-header__nav below 768px and expects this panel
// to take its place; without it there is no navigation at all on a phone. Its
// CSS is driven entirely by the --open class, so it is toggled from here rather
// than by loading the design system's own JS.
const menuOpen = ref(false)
watch(menuOpen, open => {
  if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <header class="iati-header">
    <!-- White section: IATI logo + main IATI site nav -->
    <div class="iati-header__section iati-header__section--first">
      <div class="iati-header__container">
        <a href="https://iatistandard.org/" aria-label="Go to IATI homepage">
          <img class="iati-header__logo" alt="" src="~/assets/svg/logo-colour.svg" />
        </a>
        <nav class="iati-header__general-nav" :aria-label="t('navPrimaryLabel')">
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
          <ClientOnly>
            <button
              v-if="isSignedIn" type="button" class="iati-button iati-button--light"
              :title="user?.email || undefined" @click="signOut()"
            >
              <span>{{ t('navSignOutAs', { name: user?.name || t('navAccount') }) }}</span>
            </button>
            <button
              v-else-if="ready" type="button" class="iati-button iati-button--light"
              @click="signIn()"
            >
              <span>{{ t('navSignIn') }}</span>
            </button>
            <template #fallback>
              <span class="iati-button iati-button--light is-placeholder">
                <span>{{ t('navSignIn') }}</span>
              </span>
            </template>
          </ClientOnly>
        </div>
        <div class="header-title-row">
          <div class="iati-header-title">
            <p class="iati-header-title__eyebrow">{{ t('brandEyebrow') }}</p>
            <p class="iati-header-title__heading">{{ t('brandDashboard') }}</p>
          </div>
          <button
            type="button" class="iati-menu-toggle iati-menu-toggle--open"
            aria-controls="iati-mobile-nav" :aria-expanded="menuOpen"
            @click="menuOpen = true"
          >
            <span class="iati-menu-toggle__label">{{ t('navMenu') }}</span>
          </button>
        </div>
        <div class="iati-header__nav">
          <nav :aria-label="t('navToolLabel')">
            <ul class="iati-tool-nav">
              <li v-for="item in navItems" :key="item.key">
                <NuxtLink class="iati-tool-nav-link" :class="{ active: active === item.key }" :to="item.to">
                  {{ item.label }}
                </NuxtLink>
              </li>
              <li><a class="iati-tool-nav-link" href="#">{{ t('navAbout') }}</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <div
      id="iati-mobile-nav" class="iati-mobile-nav"
      :class="{ 'iati-mobile-nav--open': menuOpen }"
      @keydown.esc="menuOpen = false"
    >
      <div class="iati-mobile-nav__overlay" @click="menuOpen = false"></div>
      <div class="iati-mobile-nav__menu">
        <div class="iati-mobile-nav__header">
          <p class="iati-mobile-nav__label">{{ t('navMenu') }}</p>
          <button
            type="button" class="iati-menu-toggle iati-menu-toggle--close"
            :aria-label="t('navCloseMenu')" @click="menuOpen = false"
          ></button>
        </div>
        <nav :aria-label="t('navMobileLabel')">
          <ul>
            <li v-for="item in navItems" :key="item.key" class="iati-mobile-nav__item">
              <NuxtLink class="iati-mobile-nav__link" :to="item.to" @click="menuOpen = false">
                {{ item.label }}
              </NuxtLink>
            </li>
            <li class="iati-mobile-nav__item">
              <a class="iati-mobile-nav__link" href="#" @click="menuOpen = false">{{ t('navAbout') }}</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </header>
</template>
