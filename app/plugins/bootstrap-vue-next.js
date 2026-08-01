import { BCol, BCollapse, BPagination, BRow, BTable } from 'bootstrap-vue-next'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.component('BRow', BRow)
  nuxtApp.vueApp.component('BCol', BCol)
  nuxtApp.vueApp.component('BCollapse', BCollapse)
  nuxtApp.vueApp.component('BTable', BTable)
  nuxtApp.vueApp.component('BPagination', BPagination)
})
