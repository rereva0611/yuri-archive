<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const base = import.meta.env.BASE_URL
const characterImage = `${base}data/七海灯子小糸侑.png`
const placeholderCover = `${base}covers/000.jpg`

const works = ref([])
const loadState = ref('loading')

const coverTrack = ref(null)
const coverTooltip = ref(null)
const scrollDuration = ref(null)
const activeCover = ref(null)

// 计算阅读统计数据
const stats = computed(() => {
  if (loadState.value !== 'ready') return null

  const counts = { planned: 0, reading: 0, completed: 0, total: works.value.length }

  for (const work of works.value) {
    const status = work.personal.status
    if (status === 'planned' || status === 'reading' || status === 'completed') {
      counts[status]++
    }
  }

  return counts
})

// 计算精选作品列表
const featuredWorks = computed(() => works.value.filter(work => {
  const rating = work.personal.rating ?? 0
  const affection = work.personal.affection ?? 0
  return !(rating < 4 && affection < 4)
}))

// 计算封面轮播的滚动动画持续时间
function positionCoverTooltip() {
  const tooltip = coverTooltip.value
  if (!activeCover.value || !tooltip) return

  const cover = activeCover.value.getBoundingClientRect()
  let left = cover.left + cover.width / 2 - tooltip.offsetWidth / 2

  if (left < 8) left = 8
  if (left + tooltip.offsetWidth > window.innerWidth - 8) {
    left = window.innerWidth - tooltip.offsetWidth - 8
  }

  tooltip.style.left = `${left}px`
  tooltip.style.top = `${Math.max(8, cover.top - tooltip.offsetHeight - 8)}px`
}

// 显示封面提示框
function showCoverTooltip(event) {
  activeCover.value = event.currentTarget
  nextTick(positionCoverTooltip)
}

// 预加载封面图片并计算滚动动画持续时间
async function prepareCarousel() {
  if (featuredWorks.value.length === 0) return

  await nextTick()
  const track = coverTrack.value
  if (!track) return

  for (const image of track.querySelectorAll('img')) {
    try {
      await image.decode()
    } catch {
      if (
        image.complete &&
        image.naturalWidth === 0 &&
        image.getAttribute('src') !== placeholderCover
      ) {
        image.src = placeholderCover
        await image.decode().catch(() => {})
      }
    }
    if (coverTrack.value !== track) return
  }

  const groupWidth = track.querySelector('#coverGroup').getBoundingClientRect().width
  scrollDuration.value = `${groupWidth / 50}s`
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// 加载作品数据
async function loadWorks() {
  loadState.value = 'loading'

  try {
    const response = await fetch(`${base}data/works.json`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    if (
      !Array.isArray(data) ||
      !data.every(work =>
        typeof work?.id === 'string' &&
        work.id.trim() !== '' &&
        isObject(work.titles) &&
        isObject(work.personal),
      )
    ) {
      throw new Error('作品数据格式错误')
    }

    works.value = data
    loadState.value = 'ready'
  } catch (error) {
    loadState.value = 'error'
    console.error(error)
    return
  }

  await prepareCarousel()
}

onMounted(() => {
  window.addEventListener('scroll', positionCoverTooltip)
  window.addEventListener('resize', positionCoverTooltip)
  loadWorks()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', positionCoverTooltip)
  window.removeEventListener('resize', positionCoverTooltip)
})
</script>

<template>
  <main class="homePage">
    <img class="homeCharacter" :src="characterImage" alt="" />

    <section class="welcome">
      <h2>ReReva's<br />Yuri Archive</h2>
      <p>一个不知名百合豚的馆藏</p>
    </section>

    <section class="stats" aria-label="阅读统计">
      <div class="stats-items">
        <p><span id="plannedCount">{{ stats?.planned ?? '—' }}</span>计划</p>
        <p><span id="readingCount">{{ stats?.reading ?? '—' }}</span>在读</p>
        <p><span id="completedCount">{{ stats?.completed ?? '—' }}</span>已读</p>
        <RouterLink class="statsArchive" :to="{ name: 'archive' }">
          <span id="totalCount">{{ stats?.total ?? '—' }}</span>收录
        </RouterLink>
      </div>
    </section>

    <section
      class="collection"
      aria-label="封面轮播"
      :class="{ isReady: scrollDuration !== null }"
      :hidden="loadState === 'ready' && featuredWorks.length === 0"
    >
      <p id="worksStatus" :hidden="loadState === 'ready'">
        <span id="worksStatusText" role="status">
          {{ loadState === 'error' ? '作品数据加载失败。' : '正在加载作品…' }}
        </span>
        <button
          id="retryWorks"
          type="button"
          :hidden="loadState !== 'error'"
          :disabled="loadState !== 'error'"
          @click="loadWorks"
        >
          重试
        </button>
      </p>

      <div class="coverViewport">
        <div
          id="coverTrack"
          ref="coverTrack"
          class="coverTrack"
          :style="{ '--scrollDuration': scrollDuration }"
        >
          <div
            v-for="group in (featuredWorks.length ? 2 : 1)"
            :id="group === 1 ? 'coverGroup' : undefined"
            :key="group"
            class="coverGroup"
            :class="{ coverGroupCopy: group === 2 }"
          >
            <RouterLink
              v-for="work in featuredWorks"
              :key="work.id"
              :to="{ name: 'detail', params: { id: work.id } }"
              :data-title="work.titles.zhCN === null ? '暂未收录' : String(work.titles.zhCN)"
              @mouseenter="showCoverTooltip"
              @mouseleave="activeCover = null"
            >
              <img
                :src="work.cover === null ? placeholderCover : `${base}covers/${work.id}.jpg`"
                :alt="work.titles.zhCN === null ? '作品封面' : `${work.titles.zhCN} 封面`"
              />
            </RouterLink>
          </div>
        </div>
      </div>

      <div
        id="coverTooltip"
        ref="coverTooltip"
        class="coverTooltip"
        :hidden="activeCover === null"
      >
        {{ activeCover?.dataset.title }}
      </div>
    </section>
  </main>
</template>