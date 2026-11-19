<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  work: {
    type: Object,
    required: true,
  },
})

const coverFailed = ref(false)

const title = computed(() => {
  return props.work.titles.zhCN ?? '暂未收录'
})

const coverSrc = computed(() => {
  const filename =
    props.work.cover === null || coverFailed.value ? '000.jpg' : `${props.work.id}.jpg`

  return `${import.meta.env.BASE_URL}covers/${filename}`
})
</script>

<template>
  <div class="manga-card">
    <RouterLink
      :to="{
        name: 'detail',
        params: { id: work.id },
      }"
    >
      <img
        :src="coverSrc"
        :alt="work.cover === null ? '占位图片' : `${title} 封面`"
        loading="lazy"
        @error="coverFailed = true"
      />

      <p>{{ title }}</p>
    </RouterLink>
  </div>
</template>
