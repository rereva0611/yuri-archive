<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const base = import.meta.env.BASE_URL
const placeholderCover = `${base}covers/000.jpg`

const work = ref(null)
const loading = ref(true)
const loadFailed = ref(false)
const coverSrc = ref('')
const bangumi = reactive({ score: '—', count: '' })
const anilist = reactive({ score: '—', count: '' })

let requestId = 0

function joinLine(values) {
  return values
    .filter(value => value !== null && value !== undefined && value !== '')
    .join(' · ')
}

const display = computed(() => {
  const detail = work.value
  if (!detail) return null

  const authors = []

  if (detail.authors !== null) {
    for (const author of detail.authors) {
      if (author.name !== null && author.name !== '') {
        authors.push(author.name)
      }
    }
  }

  const completed = detail.publication.completed === true
    ? '已完结'
    : detail.publication.completed === false
      ? '未完结'
      : null

  const rating = detail.personal.rating
  const affection = detail.personal.affection
  const hLevel = detail.tags.hLevel

  return {
    otherTitles: joinLine([
      detail.titles.zhTW,
      detail.titles.ja,
      detail.titles.en,
    ]),
    meta: joinLine([
      authors.join(', '),
      detail.publication.firstPublishedYear,
      completed,
    ]),
    ratingSymbols: rating == null
      ? ''
      : '1'.repeat(rating) + '0'.repeat(5 - rating),
    affectionSymbols: affection == null
      ? ''
      : '1'.repeat(affection) + '0'.repeat(5 - affection),
    length: detail.tags.length === 'long'
      ? '长篇'
      : detail.tags.length === 'short' ? '短篇' : '',
    yuriType: detail.tags.yuriType === 'full'
      ? '真百'
      : detail.tags.yuriType === 'light' ? '轻百' : '',
    hColor: hLevel === 1
      ? '#4e8b64'
      : hLevel === 2 ? '#b7932f' : hLevel === 3 ? '#c46464' : '',
    initialCover: detail.cover !== null
      ? `${base}covers/${detail.id}.jpg`
      : placeholderCover,
    coverAlt: detail.cover !== null
      ? `${detail.titles.zhCN} 封面`
      : '占位图片',
    hasEvaluation: [
      rating,
      affection,
      detail.analysis?.yuriFocus,
      detail.analysis?.emotionalDepth,
      detail.community?.bangumi?.id,
      detail.community?.anilist?.id,
    ].some(value => value != null),
  }
})

async function loadPlatformScore(platform, id, currentRequest) {
  const target = platform === 'bangumi' ? bangumi : anilist
  if (id == null) return

  target.count = '加载中…'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)

  try {
    let response

    if (platform === 'bangumi') {
      response = await fetch(`https://api.bgm.tv/v0/subjects/${id}`, {
        signal: controller.signal,
      })
    } else {
      response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: `
            query ($id: Int!) {
              Media(id: $id, type: MANGA) {
                averageScore
                stats {
                  scoreDistribution {
                    amount
                  }
                }
              }
            }
          `,
          variables: { id },
        }),
      })
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    if (currentRequest !== requestId) return

    let score
    let count

    if (platform === 'bangumi') {
      score = data.rating.score
      count = data.rating.total
    } else {
      if (data.errors?.length) {
        throw new Error(data.errors[0].message)
      }

      const media = data.data?.Media
      const distribution = media?.stats?.scoreDistribution

      if (!Array.isArray(distribution)) {
        throw new Error('未取得 AniList 评分人数')
      }

      score = media.averageScore
      count = distribution.reduce((total, item) => total + item.amount, 0)
    }

    target.score = count === 0 || score === null
      ? '—'
      : platform === 'bangumi' ? score.toFixed(1) : score

    target.count = count === 0
      ? '暂无评分'
      : `${count.toLocaleString('zh-CN')} 人评分`
  } catch (error) {
    if (currentRequest !== requestId) return

    target.score = '—'
    target.count = '读取失败'
    console.error(platform + ' 评分读取失败', error)
  } finally {
    clearTimeout(timer)
  }
}

async function loadWork(id) {
  const currentRequest = ++requestId

  loading.value = true
  loadFailed.value = false
  work.value = null
  coverSrc.value = ''
  bangumi.score = anilist.score = '—'
  bangumi.count = anilist.count = ''
  document.title = "详情｜ReReva's yuri"

  try {
    let data = []

    if (id) {
      const response = await fetch(`${base}data/works.json`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      data = await response.json()
      if (!Array.isArray(data)) throw new Error('作品数据格式错误')
    }

    if (currentRequest !== requestId) return

    work.value = data.find(detail => detail.id === id) ?? null
    if (!work.value) return

    coverSrc.value = display.value.initialCover
    document.title = work.value.titles.zhCN ?? ''

    loadPlatformScore(
      'bangumi',
      work.value.community?.bangumi?.id,
      currentRequest,
    )
    loadPlatformScore(
      'anilist',
      work.value.community?.anilist?.id,
      currentRequest,
    )
  } catch (error) {
    if (currentRequest !== requestId) return

    loadFailed.value = true
    work.value = null
    console.error(error)
  } finally {
    if (currentRequest === requestId) {
      loading.value = false
    }
  }
}

watch(
  () => route.params.id,
  id => loadWork(id?.trim()),
  { immediate: true },
)

function reloadPage() {
  window.location.reload()
}

onBeforeUnmount(() => {
  requestId++
})
</script>

<template>
  <main>
    <p v-if="loading" id="detailStatus" role="status">正在加载作品…</p>

    <p v-else-if="loadFailed" id="detailStatus" role="status">
      作品详情加载失败。<a href="" @click.prevent="reloadPage">重试</a>
    </p>

    <p v-else-if="!work" id="detailStatus" role="status">
      找不到这部作品。<RouterLink :to="{ name: 'archive' }">返回档案</RouterLink>
    </p>

    <article v-else class="detailLayout">
      <div class="detailCover">
        <img
          :key="work.id"
          id="workCover"
          :src="coverSrc"
          :alt="display.coverAlt"
          @error.once="work.cover !== null && (coverSrc = placeholderCover)"
        />
      </div>

      <div class="detailContent">
        <section class="detailPanel detailInfo">
          <h2 id="workTitleZhCN">{{ work.titles.zhCN }}</h2>

          <p
            id="workOtherTitles"
            class="detailLine"
            :hidden="!display.otherTitles"
          >
            {{ display.otherTitles }}
          </p>

          <p id="workMeta" class="detailLine" :hidden="!display.meta">
            {{ display.meta }}
          </p>

          <div class="detailPersonal">
            <span id="workPersonalStatus"></span>
          </div>

          <div class="detailEvaluation" :hidden="!display.hasEvaluation">
            <span
              id="workPersonalAffection"
              class="ratingSymbols"
              title="喜爱程度"
              :hidden="work.personal.affection == null"
            >
              <span style="font-size: 12px; letter-spacing: 0; color: #7f8fa3; margin-right: 4px">喜爱</span>
              <img
                v-for="(symbol, index) in display.affectionSymbols"
                :key="index"
                :src="base + 'stars and hearts/' + (symbol === '1' ? '实心.png' : '空心.png')"
                :alt="symbol === '1' ? '♥' : '♡'"
                width="18"
                height="18"
              />
            </span>

            <span
              id="workPersonalRating"
              class="ratingSymbols"
              title="个人评分"
              :hidden="work.personal.rating == null"
            >
              <span style="font-size: 12px; letter-spacing: 0; color: #7f8fa3; margin-right: 4px">评分</span>
              <img
                v-for="(symbol, index) in display.ratingSymbols"
                :key="index"
                :src="base + 'stars and hearts/' + (symbol === '1' ? '实星.png' : '空星.png')"
                :alt="symbol === '1' ? '★' : '☆'"
                width="18"
                height="18"
              />
            </span>

            <p :hidden="work.analysis?.yuriFocus == null">
              百合浓度：<span id="workYuriFocus">{{ work.analysis?.yuriFocus }}</span>
            </p>

            <p :hidden="work.analysis?.emotionalDepth == null">
              情感深度：<span id="workEmotionalDepth">{{ work.analysis?.emotionalDepth }}</span>
            </p>

            <div
              class="platformRating"
              :hidden="work.community?.bangumi?.id == null"
            >
              <div class="platformInfo">
                <span class="platformName">BGM</span>
                <span id="bangumiCount" class="platformCount">{{ bangumi.count }}</span>
              </div>
              <div class="platformScore">
                <strong id="bangumiScore">{{ bangumi.score }}</strong>
                <small>/10</small>
              </div>
            </div>

            <div
              class="platformRating"
              :hidden="work.community?.anilist?.id == null"
            >
              <div class="platformInfo">
                <span class="platformName">AniList</span>
                <span id="anilistCount" class="platformCount">{{ anilist.count }}</span>
              </div>
              <div class="platformScore">
                <strong id="anilistScore">{{ anilist.score }}</strong>
                <small>/100</small>
              </div>
            </div>
          </div>

          <div class="detailTags">
            <span id="workTagLength" :hidden="!display.length">
              {{ display.length }}
            </span>
            <span id="workTagYuriLevel" :hidden="!display.yuriType">
              {{ display.yuriType }}
            </span>
            <span
              id="workTagHLevel"
              :hidden="work.tags.hLevel == null || work.tags.hLevel === ''"
              :style="{ color: display.hColor }"
            >H</span>
          </div>
        </section>

        <section
          id="workReviewSection"
          class="detailPanel"
          :hidden="!work.personal.review"
        >
          <h3 class="reviewHeading">评语</h3>
          <p id="workReview" class="reviewText">{{ work.personal.review || '' }}</p>
        </section>
      </div>
    </article>
  </main>
</template>