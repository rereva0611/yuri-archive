<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MangaCard from '../components/MangaCard.vue'

const navigationSearch = inject('navigationSearch')
const route = useRoute()
const router = useRouter()

// 作品数据
const works = ref([])
const loading = ref(true)
const error = ref('')

// 其他筛选条件
const lengthFilter = ref('')
const yuriTypeFilter = ref('')
const completedFilter = ref('')
const hLevelFilter = ref('')

// 排序条件（id升序）
const sortFilter = ref('id')

function queryString(value) {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first : ''
}

function queryOption(value, options, fallback = '') {
  const text = queryString(value)
  return options.includes(text) ? text : fallback
}

// 已提交的关键词和阅读状态直接从 URL 读取
const keyword = computed(() => queryString(route.query.q).trim())
const statusFilter = computed(() =>
  queryOption(route.query.status, ['planned', 'reading', 'completed', 'unknown']),
)
const searchText = ref(keyword.value)

watch(keyword, (value) => {
  searchText.value = value
})

function restoreOtherFilters(query) {
  lengthFilter.value = queryOption(query.length, ['long', 'short'])

  yuriTypeFilter.value = queryOption(query.yuriType, ['full', 'light'])

  sortFilter.value = queryOption(query.sort, ['id', 'rating', 'affection'], 'id')

  const completed = queryString(query.completed)

  completedFilter.value = completed === 'true' ? true : completed === 'false' ? false : ''

  const hLevel = queryOption(query.hLevel, ['1', '2', '3'])

  hLevelFilter.value = hLevel === '' ? '' : Number(hLevel)
}

watch(() => route.query, restoreOtherFilters, { immediate: true })

function updateQuery(changes) {
  const query = { ...route.query }

  for (const [name, value] of Object.entries(changes)) {
    if (value === '' || (name === 'sort' && value === 'id')) {
      delete query[name]
    } else {
      query[name] = String(value)
    }
  }

  return router.replace({
    name: 'archive',
    query,
    hash: route.hash,
  })
}

function saveOtherFilters(changes = {}) {
  return updateQuery({
    length: lengthFilter.value,
    yuriType: yuriTypeFilter.value,
    completed: completedFilter.value,
    hLevel: hLevelFilter.value,
    sort: sortFilter.value,
    ...changes,
  })
}

// 计算排序后的作品列表
const sortedWorks = computed(() => {
  const sortBy = sortFilter.value
  const list = [...filteredWorks.value]

  return list.sort((a, b) => {
    if (sortBy !== 'id') {
      const difference = (b.personal[sortBy] ?? -1) - (a.personal[sortBy] ?? -1)

      if (difference !== 0) {
        return difference
      }
    }

    return Number(a.id) - Number(b.id)
  })
})

// 计算过滤后的作品列表
const filteredWorks = computed(() => {
  const query = keyword.value.toLowerCase()

  return works.value.filter((work) => {
    const titles = Object.values(work.titles).filter(Boolean).join(' ').toLowerCase()

    const matchesSearch = titles.includes(query)

    const matchesStatus =
      statusFilter.value === '' || (work.personal.status ?? 'unknown') === statusFilter.value

    const matchesLength = lengthFilter.value === '' || work.tags.length === lengthFilter.value

    const matchesYuriType =
      yuriTypeFilter.value === '' || work.tags.yuriType === yuriTypeFilter.value

    const matchesCompleted =
      completedFilter.value === '' || work.publication.completed === completedFilter.value

    const matchesHLevel = hLevelFilter.value === '' || work.tags.hLevel === hLevelFilter.value

    return (
      matchesSearch &&
      matchesStatus &&
      matchesLength &&
      matchesYuriType &&
      matchesCompleted &&
      matchesHLevel
    )
  })
})

watch(
  () => navigationSearch.request,
  (request) => {
    if (request) {
      searchText.value = request.keyword
    }
  },
)

function applySearch() {
  return updateQuery({ q: searchText.value.trim() })
}

function clearSearchWhenEmpty(event) {
  if (event.target.value === '') {
    return updateQuery({ q: '' })
  }
}

function resetFilters() {
  searchText.value = ''
  lengthFilter.value = ''
  yuriTypeFilter.value = ''
  completedFilter.value = ''
  hLevelFilter.value = ''

  sortFilter.value = 'id'

  navigationSearch.text = ''

  return saveOtherFilters({ q: '', status: '' })
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// 加载作品数据
async function loadWorks() {
  loading.value = true
  error.value = ''

  try {
    const url = `${import.meta.env.BASE_URL}data/works.json`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    // 验证数据格式
    if (
      !Array.isArray(data) ||
      !data.every(
        (work) =>
          typeof work?.id === 'string' &&
          work.id.trim() !== '' &&
          isObject(work.titles) &&
          isObject(work.personal) &&
          isObject(work.tags) &&
          isObject(work.publication),
      )
    ) {
      throw new Error('作品数据格式错误')
    }

    works.value = data
  } catch (err) {
    error.value = err instanceof Error ? err.message : '作品数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadWorks)
</script>

<template>
  <main class="aboutLayout archiveLayout">
    <aside class="archiveFilters">
      <h2>筛选作品</h2>

      <form id="archiveSearchForm" @submit.prevent="applySearch">
        <label for="archiveSearch">作品检索</label>

        <div class="archiveSearchBox">
          <input
            id="archiveSearch"
            v-model="searchText"
            type="search"
            placeholder="输入作品名"
            autocomplete="off"
            @input="clearSearchWhenEmpty"
          />

          <button type="submit">搜索</button>
        </div>
      </form>

      <label for="sortFilter">排序方式</label>
      <select id="sortFilter" v-model="sortFilter" @change="saveOtherFilters()">
        <option value="id">默认排序</option>
        <option value="rating">站长评分</option>
        <option value="affection">站长喜爱</option>
      </select>

      <label for="statusFilter">站长阅读状态</label>
      <select
        id="statusFilter"
        :value="statusFilter"
        @change="updateQuery({ status: $event.target.value })"
      >
        <option value="">全部状态</option>
        <option value="planned">计划</option>
        <option value="reading">在读</option>
        <option value="completed">已读</option>
        <option value="unknown">未知</option>
      </select>

      <label for="lengthFilter">篇幅</label>
      <select id="lengthFilter" v-model="lengthFilter" @change="saveOtherFilters()">
        <option value="">全部篇幅</option>
        <option value="long">长篇</option>
        <option value="short">短篇</option>
      </select>

      <label for="yuriTypeFilter">百合类型</label>
      <select id="yuriTypeFilter" v-model="yuriTypeFilter" @change="saveOtherFilters()">
        <option value="">全部类型</option>
        <option value="full">真百</option>
        <option value="light">轻百</option>
      </select>

      <label for="completedFilter">完结状态</label>
      <select id="completedFilter" v-model="completedFilter" @change="saveOtherFilters()">
        <option value="">全部状态</option>
        <option :value="true">已完结</option>
        <option :value="false">未完结</option>
      </select>

      <label for="hLevelFilter">H Level</label>
      <select id="hLevelFilter" v-model="hLevelFilter" @change="saveOtherFilters()">
        <option value="">全部级别</option>
        <option :value="1">1 级</option>
        <option :value="2">2 级</option>
        <option :value="3">3 级</option>
      </select>
    </aside>

    <section class="archiveContent" aria-label="作品列表">
      <p v-if="loading" role="status">正在加载作品…</p>

      <div v-else-if="error" role="alert">
        <p>作品数据加载失败：{{ error }}</p>

        <button id="retryWorks" type="button" @click="loadWorks">重试</button>
      </div>

      <template v-else>
        <div class="archiveHeading">
          <p class="archiveLoadStatus" role="status">
            找到 {{ filteredWorks.length }} 部作品 （共 {{ works.length }} 部）
          </p>

          <button id="resetFilters" type="button" @click="resetFilters">重置</button>
        </div>

        <div v-if="filteredWorks.length > 0" id="workList">
          <MangaCard v-for="work in sortedWorks" :key="work.id" :work="work" />
        </div>

        <p v-else-if="works.length === 0">暂无收录作品。</p>

        <p v-else>没有找到符合条件的作品。</p>
      </template>
    </section>
  </main>
</template>
