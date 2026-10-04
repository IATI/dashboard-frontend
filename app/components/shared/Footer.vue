<script setup>
const { locale, setLocale } = useI18n({ useScope: 'global' })
</script>

<template>
  <footer class="iati-footer iati-brand-background">
    <div class="iati-brand-background__content">
      <div class="iati-footer__section iati-footer__section--last">
        <div class="iati-footer__container">
          <nav :aria-label="t('navFooterLabel')">
            <ul class="iati-piped-list iati-footer__legal-nav">
              <li><a href="https://web-terms.iatistandard.org/en/latest/privacy-policy/">Privacy</a></li>
              <li><a href="https://web-terms.iatistandard.org/en/latest/cookie-policy/">Cookies</a></li>
              <li><a href="https://web-terms.iatistandard.org/en/latest/copyright/">Copyright</a></li>
              <li><a href="https://web-terms.iatistandard.org/en/latest/data-removal/">Data Removal</a></li>
            </ul>
          </nav>
          <div class="iati-footer__actions">
            <div class="iati-country-switcher">
              <label for="footer-lang-switcher" class="iati-country-switcher__label">Choose your language</label>
              <select id="footer-lang-switcher" class="iati-country-switcher__control" :value="locale" @change="e => setLocale(e.target.value)">
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
          <div class="iati-footer__social">
            <a href="https://www.linkedin.com/company/international-aid-transparency-initiative/" aria-label="LinkedIn">
              <i class="iati-icon iati-icon--linkedin"></i>
            </a>
            <a href="https://x.com/IATI_aid" aria-label="X">
              <i class="iati-icon iati-icon--x"></i>
            </a>
            <a href="https://www.youtube.com/channel/UCAVH1gcgJXElsj8ENC-bDQQ" aria-label="YouTube">
              <i class="iati-icon iati-icon--youtube"></i>
            </a>
            <a href="https://www.facebook.com/IATIaid/" aria-label="Facebook">
              <i class="iati-icon iati-icon--facebook"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
