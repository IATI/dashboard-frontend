import { createBootstrap, BAlert, BCol, BCollapse, BModal, BNavbar, BNavbarNav, BNavbarToggle, BNavItem, BPagination, BProgress, BProgressBar, BRow, BTable, BTooltip } from 'bootstrap-vue-next'

export default defineNuxtPlugin(nuxtApp => {
  // Components are registered individually rather than installing the whole
  // library, but the plugin itself is still needed: it provides the shared
  // registry that lets BNavbarToggle find the BCollapse named by its `target`.
  // Without it the toggle renders and does nothing.
  nuxtApp.vueApp.use(createBootstrap())

  nuxtApp.vueApp.component('BAlert', BAlert)
  nuxtApp.vueApp.component('BNavbar', BNavbar)
  nuxtApp.vueApp.component('BNavbarToggle', BNavbarToggle)
  nuxtApp.vueApp.component('BNavbarNav', BNavbarNav)
  nuxtApp.vueApp.component('BNavItem', BNavItem)
  nuxtApp.vueApp.component('BTooltip', BTooltip)
  nuxtApp.vueApp.component('BModal', BModal)
  nuxtApp.vueApp.component('BProgress', BProgress)
  nuxtApp.vueApp.component('BProgressBar', BProgressBar)
  nuxtApp.vueApp.component('BRow', BRow)
  nuxtApp.vueApp.component('BCol', BCol)
  nuxtApp.vueApp.component('BCollapse', BCollapse)
  nuxtApp.vueApp.component('BTable', BTable)
  nuxtApp.vueApp.component('BPagination', BPagination)
})
