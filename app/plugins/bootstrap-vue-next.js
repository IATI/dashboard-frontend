import { BAlert, BCol, BCollapse, BPagination, BRow, BTable, BTooltip } from 'bootstrap-vue-next'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.component('BAlert', BAlert)
  nuxtApp.vueApp.component('BTooltip', BTooltip)
  nuxtApp.vueApp.component('BRow', BRow)
  nuxtApp.vueApp.component('BCol', BCol)
  nuxtApp.vueApp.component('BCollapse', BCollapse)
  nuxtApp.vueApp.component('BTable', BTable)
  nuxtApp.vueApp.component('BPagination', BPagination)
})
