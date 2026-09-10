import { BAlert, BCol, BCollapse, BPagination, BProgress, BProgressBar, BRow, BTable, BTooltip } from 'bootstrap-vue-next'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.component('BAlert', BAlert)
  nuxtApp.vueApp.component('BTooltip', BTooltip)
  nuxtApp.vueApp.component('BProgress', BProgress)
  nuxtApp.vueApp.component('BProgressBar', BProgressBar)
  nuxtApp.vueApp.component('BRow', BRow)
  nuxtApp.vueApp.component('BCol', BCol)
  nuxtApp.vueApp.component('BCollapse', BCollapse)
  nuxtApp.vueApp.component('BTable', BTable)
  nuxtApp.vueApp.component('BPagination', BPagination)
})
