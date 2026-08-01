<script setup>
import { Line } from 'vue-chartjs'
defineProps({
  data: { type: Object, required: true },
  options: { type: Object, default: () => ({}) },
})
</script>
<template>
  <Line :data="data" :options="options" />
</template>
