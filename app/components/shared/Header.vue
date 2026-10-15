<script setup>
defineProps({ active: { type: String, default: '' } })
const { t, locale, setLocale } = useI18n({ useScope: 'global' })

// IATI Account sign-in. `ready` is false until the session has been checked, so
// the button stays neutral rather than flashing "Sign in" at someone who is
// already signed in.
const { user, ready, isSignedIn, signIn, signOut } = useAuth()

// One list, rendered twice: the horizontal tool nav on desktop and the slide-in
// panel on mobile. Keeping them separate is how they drift apart.
//
// Two separate filters, both applied.
//
// ?full is about how finished a page is: only the organisations pages and the
// methodology are ready, so the rest are not offered to anyone without it
// (see usePreviewScope). Access is about whose data a page shows: the
// cross-publisher views are only for accounts on the all-organisations list.
// Requiring both means ?full can never surface a link the gate would refuse.
const { full: fullSite } = usePreviewScope()
const { seesAll } = useAccess()

const ALL_NAV = [
  { key: 'overall',   to: '/',              labelKey: 'navOverview' },
  { key: 'groups',    to: '/groups/10',     labelKey: 'navGroups' },
  { key: 'country',   to: '/countries/KE',  labelKey: 'navCountry' },
  { key: 'org',       to: '/organisations', labelKey: 'navOrganisations' },
  { key: 'exploring', to: '/exploring-data', labelKey: 'navExploring' },
  { key: 'about',     to: '/about',          labelKey: 'navAbout' },
]

const navItems = computed(() =>
  ALL_NAV
    .filter(item => routeAccess(item.to) !== 'all' || (fullSite.value && seesAll.value))
    .map(item => ({ ...item, label: t(item.labelKey) })),
)

// The design system hides .iati-header__nav below 768px and expects a menu to
// take its place; without one there is no navigation at all on a phone.
// BNavbarToggle drives the BCollapse by id; this mirror of its state exists only
// because the toggle does not set aria-expanded itself, and a control that opens
// something has to say whether it is open.
const menuOpen = ref(false)
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
        <!-- The title row is the navbar: bootstrap-vue-next documents a
             BNavbarToggle targeting a BCollapse, and .header-title-row is
             already a flex row with space-between, so the burger lands to the
             right of the title and the menu wraps below it when open. The
             design system's own .iati-mobile-nav markup is CSS-only and expects
             the design system's JavaScript, so driving it from here meant
             re-implementing the backdrop, Escape handling and scroll locking by
             hand, with no focus trap and a close button the design system gives
             a height but no width, so it rendered 0px wide and invisible.
             `is-nav` inside a BNavbar closes the menu when a link is followed.
             The IATI colours are restated in iati-quality.scss. -->
        <BNavbar toggleable :container="false" class="header-title-row iati-mobile-menu">
          <div class="iati-header-title">
            <p class="iati-header-title__eyebrow">{{ t('brandEyebrow') }}</p>
            <p class="iati-header-title__heading">{{ t('brandDashboard') }}</p>
          </div>
          <BNavbarToggle
            target="iati-mobile-nav" :label="t('navMenu')"
            aria-controls="iati-mobile-nav" :aria-expanded="menuOpen"
          />
          <BCollapse id="iati-mobile-nav" v-model="menuOpen" is-nav>
            <BNavbarNav :aria-label="t('navMobileLabel')" tag="ul">
              <BNavItem
                v-for="item in navItems" :key="item.key"
                :to="item.to" :active="active === item.key"
              >{{ item.label }}</BNavItem>
            </BNavbarNav>
          </BCollapse>
        </BNavbar>
        <div class="iati-header__nav">
          <nav :aria-label="t('navToolLabel')">
            <ul class="iati-tool-nav">
              <li v-for="item in navItems" :key="item.key">
                <NuxtLink class="iati-tool-nav-link" :class="{ active: active === item.key }" :to="item.to">
                  {{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

  </header>
</template>
