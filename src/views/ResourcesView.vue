<script setup>
import MarkdownPage from '../components/MarkdownPage.vue'

const page = {
  title: '资源索引',
  src: 'data/resources.md',
  headingPrefix: 'resource-',
  sectionLabels: [
    '百合',
    '漫画',
    '动画',
    'Galgame',
    '作品资料库',
    '电子书',
  ],
}
</script>

<template>
  <MarkdownPage v-bind="page" />
</template>