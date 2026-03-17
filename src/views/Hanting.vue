<script setup lang="ts">
import type { FeedbackType } from 'server/modules/hanting/service'
import { Dices, Eye, EyeOff, Flag, Star } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { Translation, useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, user } from '@/lib/api'

interface FeedbackCount {
  type: string
  count: number
}

interface Word {
  id: number
  wordNumber: number
  level: number
  word: string
  competition: string
  flag: number
  pinyin: string
  definition: string
  example: string
  feedback: FeedbackCount[]
  userFeedback: string[]
}

const { t, te } = useI18n()

const word = ref<Word | null>(null)
const loading = ref(true)
const totalCount = ref(0)
const showAnswer = ref(false)
const showFeedback = ref(false)
const competitions = ref<string[]>([])

const filterQuery = ref<{
  flag?: number
  level?: number
  competition?: string
}>({})

const hasActiveFilters = computed(() => filterQuery.value.flag !== undefined
  || filterQuery.value.level !== undefined
  || !!filterQuery.value.competition)
const isEmpty = computed(() => !loading.value && totalCount.value === 0 && !word.value)

const stars = computed(() => {
  if (!word.value || word.value.level === 0 || word.value.flag === 2)
    return 0
  return 4 - word.value.level
})

const rubyPairs = computed(() => {
  if (!word.value)
    return []
  const chars = [...word.value.word]
  const pinyins = word.value.pinyin.split(/\s+/)
  return chars.map((char, i) => ({
    char,
    pinyin: pinyins[i] || '',
  }))
})

const competitionLabel = computed(() => {
  if (!word.value)
    return ''
  const key = `hanting.competition.${word.value.competition}`
  return te(key) ? t(key) : word.value.competition
})

function competitionName(code: string) {
  const key = `hanting.competition.${code}`
  return te(key) ? t(key) : code
}

function feedbackCount(type: string) {
  return word.value?.feedback.find(f => f.type === type)?.count ?? 0
}

function hasFeedback(type: string) {
  return word.value?.userFeedback.includes(type) ?? false
}

async function loadRandom() {
  loading.value = true
  showAnswer.value = false
  showFeedback.value = false

  if (totalCount.value === 0) {
    loading.value = false
    word.value = null
    return
  }

  const { data } = await api.hanting.random.get({ query: filterQuery.value })
  if (data) {
    word.value = data as unknown as Word
    loading.value = false
  }
  else {
    loading.value = false
    word.value = null
  }
}

async function loadCount() {
  const { data } = await api.hanting.count.get({ query: filterQuery.value })
  if (data)
    totalCount.value = data.count
}

async function loadCompetitions() {
  const { data } = await api.hanting.competitions.get()
  if (data)
    competitions.value = data
}

function resetFilters() {
  filterQuery.value = {}
}

async function refreshRandomByFilters() {
  await loadCount()

  if (totalCount.value === 0) {
    showAnswer.value = false
    showFeedback.value = false
    word.value = null
    loading.value = false
    return
  }

  await loadRandom()
}

async function submitFeedback(type: FeedbackType) {
  if (!word.value)
    return
  const { data } = await api.hanting({ id: word.value.id }).feedback.post({ type })
  if (!data)
    return
  if (data.action === 'added') {
    word.value.userFeedback.push(type)
    const existing = word.value.feedback.find(f => f.type === type)
    if (existing)
      existing.count++
    else
      word.value.feedback.push({ type, count: 1 })
  }
  else if (data.action === 'removed') {
    word.value.userFeedback = word.value.userFeedback.filter(t => t !== type)
    const existing = word.value.feedback.find(f => f.type === type)
    if (existing)
      existing.count = Math.max(0, existing.count - 1)
  }
}

watch(filterQuery, () => {
  refreshRandomByFilters()
}, { deep: true })

onMounted(async () => {
  await loadCompetitions()
  await refreshRandomByFilters()
})
</script>

<template>
  <div class="w-full mb-auto max-w-2xl px-4 py-8 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">
        {{ t('hanting.title') }}
      </h1>
      <span class="text-sm text-muted-foreground">{{ t('hanting.total', { count: totalCount }) }}</span>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <Select
        :model-value="filterQuery.flag?.toString() ?? 'all'"
        @update:model-value="v => filterQuery.flag = v === 'all' ? undefined : Number(v)"
      >
        <SelectTrigger class="w-auto min-w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {{ t('hanting.filter.flagAll') }}
          </SelectItem>
          <SelectItem value="0">
            {{ t('hanting.filter.flagNormal') }}
          </SelectItem>
          <SelectItem value="1">
            {{ t('hanting.filter.flagGuzong') }}
          </SelectItem>
          <SelectItem value="2">
            {{ t('hanting.filter.flagEasterEgg') }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        :model-value="filterQuery.level?.toString() ?? 'all'"
        @update:model-value="v => filterQuery.level = v === 'all' ? undefined : Number(v)"
      >
        <SelectTrigger class="w-auto min-w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {{ t('hanting.filter.levelAll') }}
          </SelectItem>
          <SelectItem v-for="l in [1, 2, 3, 0]" :key="l" :value="l.toString()">
            {{ l === 0 ? '☆' : '★'.repeat(4 - l) }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        :model-value="filterQuery.competition ?? 'all'"
        @update:model-value="v => filterQuery.competition = v === 'all' ? undefined : v"
      >
        <SelectTrigger class="w-auto min-w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {{ t('hanting.filter.competitionAll') }}
          </SelectItem>
          <SelectItem v-for="c in competitions" :key="c" :value="c">
            {{ c }} · {{ competitionName(c) }}
          </SelectItem>
        </SelectContent>
      </Select>

      <div class="grow" />

      <Button variant="outline" size="sm" class="gap-1.5" :disabled="totalCount === 0" @click="loadRandom">
        <Dices class="size-4" />
        {{ t('hanting.random') }}
      </Button>
    </div>

    <div v-if="word" class="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground font-mono">#{{ word.wordNumber }}</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {{ competitionLabel }}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <span v-if="word.flag === 1" class="text-sm font-bold text-amber-500" :title="t('hanting.flag.guzong')">*</span>
          <span v-else-if="word.flag === 2" class="text-sm" :title="t('hanting.flag.easterEgg')">{{ '🥚'.repeat(3 - stars) }}</span>
          <div v-if="stars > 0" class="flex items-center gap-0.5">
            <Star v-for="i in stars" :key="i" class="size-3.5 fill-yellow-400 text-yellow-400" />
            <Star v-for="i in 3 - stars" :key="`e${i}`" class="size-3.5 text-muted-foreground/30" />
          </div>
        </div>
      </div>

      <div class="text-center py-4 space-y-4">
        <p class="text-3xl font-bold">
          <ruby v-for="{ char, pinyin } in rubyPairs" :key="char" class="mx-1">
            <span class="transition-[filter] duration-200" :class="!showAnswer && 'blur-md'">{{ char }}</span>
            <rp>(</rp>
            <rt class="text-sm font-normal text-muted-foreground">{{ pinyin }}</rt>
            <rp>)</rp>
          </ruby>
        </p>
        <p v-if="word.definition" class="text-sm text-muted-foreground">
          {{ word.definition }}
        </p>
        <p v-if="word.example" class="text-sm text-muted-foreground text-start whitespace-pre-wrap">
          {{ word.example }}
        </p>
      </div>

      <div class="flex items-center justify-center gap-2 pt-2">
        <Button variant="outline" size="sm" class="gap-1.5" @click="showAnswer = !showAnswer">
          <EyeOff v-if="showAnswer" class="size-4" />
          <Eye v-else class="size-4" />
          {{ showAnswer ? t('hanting.hideAnswer') : t('hanting.showAnswer') }}
        </Button>
        <Button variant="outline" size="sm" class="gap-1.5" @click="showFeedback = !showFeedback">
          <Flag class="size-4" />
          {{ t('hanting.feedback.title') }}
        </Button>
      </div>

      <div v-if="showFeedback" class="flex flex-wrap justify-center gap-1.5">
        <template v-if="user">
          <button
            v-for="type in ['pinyin', 'definition', 'example', 'duplicate', 'other'] as const"
            :key="type"
            class="text-xs px-2 py-1 rounded-full border transition-colors"
            :class="hasFeedback(type) && 'bg-muted text-muted-foreground hover:text-foreground'"
            @click="submitFeedback(type)"
          >
            {{ t(`hanting.feedback.${type}`) }}
            <span v-if="feedbackCount(type)" class="ml-0.5 opacity-60">{{ feedbackCount(type) }}</span>
          </button>
        </template>
        <Translation v-else keypath="hanting.feedback.loginRequired" tag="p" class="text-xs text-muted-foreground">
          <template #login>
            <RouterLink to="/login" class="link">
              {{ t('hanting.feedback.loginLink') }}
            </RouterLink>
          </template>
        </Translation>
      </div>
    </div>

    <div v-else-if="isEmpty" class="rounded-xl border border-dashed bg-card/60 px-6 py-10 text-center space-y-3">
      <p class="text-base font-medium text-foreground">
        {{ hasActiveFilters ? t('hanting.emptyFilteredTitle') : t('hanting.emptyTitle') }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ hasActiveFilters ? t('hanting.emptyFilteredHint') : t('hanting.emptyHint') }}
      </p>
      <Button v-if="hasActiveFilters" variant="outline" size="sm" @click="resetFilters">
        {{ t('hanting.clearFilters') }}
      </Button>
    </div>

    <div v-else class="text-center text-muted-foreground py-8">
      {{ t('hanting.notFound') }}
    </div>
  </div>
</template>
