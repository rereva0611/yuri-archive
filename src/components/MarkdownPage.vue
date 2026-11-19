<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  src: {
    type: String,
    required: true,
  },
  headingPrefix: {
    type: String,
    default: '',
  },
  sectionLabels: {
    type: Array,
    default: () => [],
  },
})

const route = useRoute()

const html = ref('')
const loading = ref(true)
const error = ref('')
const sections = ref([])
const contentElement = ref(null)

function scrollToHeading(id, event) {
  if (!id) return

  if (
    event &&
    (event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey)
  ) {
    return
  }

  const headings = contentElement.value?.querySelectorAll('h2') ?? []
  const target = Array.from(headings).find(heading => heading.id === id)

  target?.scrollIntoView()
}

watch(
  () => route.hash,
  hash => scrollToHeading(hash.slice(1)),
  { flush: 'post' },
)

async function loadContent() {
  loading.value = true
  error.value = ''
  sections.value = []

  try {
    const url = `${import.meta.env.BASE_URL}${props.src}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('text/html')) {
      throw new Error('未找到正文文件')
    }

    const markdown = await response.text()
    html.value = await marked.parse(markdown)
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : '内容加载失败'
  } finally {
    loading.value = false
  }

  if (error.value) return

  await nextTick()

  if (!contentElement.value) return

  sections.value = Array.from(
    contentElement.value.querySelectorAll('h2'),
  ).map((heading, index) => {
    heading.id = props.headingPrefix
      ? `${props.headingPrefix}${index}`
      : heading.textContent

    return {
      id: heading.id,
      title: heading.textContent,
    }
  })

  scrollToHeading(route.hash.slice(1))
}

onMounted(loadContent)
</script>

<template>
  <main class="aboutLayout">
    <aside>
      <h2>{{ title }}</h2>

      <ul>
        <li v-for="(section, index) in sections" :key="section.id">
          <RouterLink
            :to="{
              name: route.name,
              query: route.query,
              hash: `#${section.id}`,
            }"
            @click="scrollToHeading(section.id, $event)"
          >
            {{ sectionLabels[index] ?? section.title }}
          </RouterLink>
        </li>
      </ul>
    </aside>

    <article v-if="loading" class="aboutContent">
      <p role="status">正在加载内容…</p>
    </article>

    <article v-else-if="error" class="aboutContent">
      <p role="alert">内容加载失败：{{ error }}</p>

      <button type="button" @click="loadContent">
        重试
      </button>
    </article>

    <article
      v-else
      ref="contentElement"
      class="aboutContent"
      v-html="html"
    ></article>
  </main>
</template>