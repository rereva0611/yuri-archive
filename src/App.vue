<script setup>
import { provide, reactive } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'

const navigationSearch = reactive({
  text: '',
  request: null,
})

provide('navigationSearch', navigationSearch)
</script>

<template>
  <SiteHeader />

  <RouterView />

  <SiteFooter />
</template>