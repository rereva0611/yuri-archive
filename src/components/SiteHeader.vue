<script setup>
import { inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const navigationSearch = inject('navigationSearch')
const route = useRoute()
const router = useRouter()

watch(
  () => route.path,
  () => {
    navigationSearch.text = ''
  },
)

function submitSearch() {
  const keyword = navigationSearch.text.trim()

  if (!keyword) {
    return
  }

  navigationSearch.text = keyword

  if (route.name === 'archive') {
    navigationSearch.request = { keyword }

    const query = {
      ...route.query,
      q: keyword,
    }

    for (const name of [
      'status',
      'length',
      'yuriType',
      'completed',
      'hLevel',
    ]) {
      delete query[name]
    }

    const sort = Array.isArray(query.sort)
      ? query.sort[0]
      : query.sort

    if (sort === 'rating' || sort === 'affection') {
      query.sort = sort
    } else {
      delete query.sort
    }

    return router.replace({
      name: 'archive',
      query,
      hash: route.hash,
    })
  }

  return router.push({
    name: 'archive',
    query: { q: keyword },
  })
}
</script>

<template>
  <header>
    <div class="header-inner">
      <h1 id="h1">ReReva's Yuri</h1>

      <nav>
        <ul>
          <li>
            <RouterLink to="/">首页</RouterLink>
          </li>
          <li>
            <RouterLink to="/archive">档案</RouterLink>
          </li>
          <li>
            <RouterLink to="/about">关于</RouterLink>
          </li>
          <li>
            <RouterLink to="/resources">资源</RouterLink>
          </li>
        </ul>

        <form
          id="navSearchForm"
          @submit.prevent="submitSearch"
        >
          <input
            v-model="navigationSearch.text"
            type="search"
            name="q"
            placeholder="搜索作品…"
            aria-label="搜索作品"
            autocomplete="off"
          />

          <input
            type="submit"
            value="搜索"
            :disabled="navigationSearch.text.trim() === ''"
          />
        </form>
      </nav>
    </div>
  </header>
</template>