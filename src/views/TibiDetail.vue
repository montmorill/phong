<script setup lang="ts">
import { replyBody } from '@server/tibi/model'
import { ChevronLeft } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ReplyItem from '@/components/ReplyItem.vue'
import TibiCard from '@/components/TibiCard.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { api, user } from '@/lib/api'

interface TibiItem {
  id: number
  parentId?: number
  title?: string
  content: string
  username: string
  nickname: string
  avatar: string
  createdAt: number
  likeCount: number
  liked: boolean
}

const props = defineProps<{ id: number }>()

const { t } = useI18n()
const router = useRouter()

const tibi = ref<TibiItem | null>(null)
const replies = ref<TibiItem[]>([])
const loading = ref(true)
const notFound = ref(false)

const replyContent = ref('')
const submitting = ref(false)
const serverError = ref('')
const maxLength = replyBody.properties.content.maxLength!

async function load() {
  loading.value = true
  const [{ data: tibiData }, { data: repliesData }] = await Promise.all([
    api.tibi({ id: props.id }).get(),
    api.tibi({ id: props.id }).replies.get(),
  ])
  loading.value = false
  if (!tibiData) {
    notFound.value = true
    return
  }
  tibi.value = tibiData as TibiItem
  replies.value = (repliesData ?? []) as TibiItem[]
}

function onLiked(_id: number, liked: boolean, likeCount: number) {
  if (tibi.value)
    tibi.value = { ...tibi.value, liked, likeCount }
}

function onDeleted() {
  router.back()
}

async function submitReply() {
  if (!replyContent.value.trim())
    return
  submitting.value = true
  serverError.value = ''
  const { error } = await api.tibi({ id: props.id }).reply.post({ content: replyContent.value.trim() })
  submitting.value = false
  if (error) {
    serverError.value = t('tibi.errors.postFailed')
    return
  }
  replyContent.value = ''
  const { data } = await api.tibi({ id: props.id }).replies.get()
  if (data)
    replies.value = data as TibiItem[]
}

onMounted(load)
</script>

<template>
  <div class="w-full mb-auto max-w-2xl px-4 py-8 space-y-4">
    <Button variant="ghost" size="sm" class="gap-1 -ml-2 text-muted-foreground" @click="router.back()">
      <ChevronLeft class="size-4" />
      {{ t('common.back') }}
    </Button>

    <div v-if="loading" class="flex justify-center py-8">
      <Spinner />
    </div>
    <div v-else-if="notFound" class="text-center text-muted-foreground py-8">
      {{ t('tibi.notFound') }}
    </div>
    <template v-else-if="tibi">
      <TibiCard v-bind="tibi" :collapsible="false" expanded @liked="onLiked" @deleted="onDeleted" />

      <div v-if="replies.length" class="space-y-4 pt-2">
        <p class="text-xs text-muted-foreground font-medium select-none">
          {{ t('tibi.replyCount', replies.length) }}
        </p>
        <ReplyItem v-for="reply in replies" :key="reply.id" v-bind="reply" />
      </div>

      <Card v-if="user">
        <CardContent class="pt-4 pb-3">
          <Textarea
            v-model="replyContent"
            :placeholder="t('tibi.reply.placeholder')"
            :maxlength="maxLength"
            class="border-none px-0 resize-none shadow-none focus-visible:ring-0 min-h-18"
          />
        </CardContent>
        <CardFooter class="pt-3 flex justify-between items-center">
          <span
            class="text-xs text-muted-foreground select-none"
            :class="{ 'text-destructive': replyContent.length >= maxLength }"
          >
            {{ replyContent.length }}/{{ maxLength }}
          </span>
          <Button size="sm" :disabled="!replyContent.trim() || submitting" @click="submitReply">
            <Spinner v-if="submitting" data-icon="inline-start" />
            {{ t('tibi.reply.submit') }}
          </Button>
        </CardFooter>
        <p v-if="serverError" class="px-6 pb-4 text-sm text-destructive">
          {{ serverError }}
        </p>
      </Card>
    </template>
  </div>
</template>
