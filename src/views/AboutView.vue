<script setup>
import MarkdownPage from '../components/MarkdownPage.vue'

const page = {
  title: '关于本站',
  src: 'data/about.md',
  headingPrefix: '',
  sectionLabels: [],
}
</script>

<template>
  <MarkdownPage v-bind="page" />
</template>