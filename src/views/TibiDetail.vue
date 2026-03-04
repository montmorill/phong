<script setup lang="ts">
import { replyBody } from '@server/tibi/model'
import { ChevronLeft } from 'lucide-vue-next'
import { nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import ReplyItem from '@/components/ReplyItem.vue'
import TibiCard from '@/components/TibiCard.vue'
import { Button } from '@/components/ui/button'
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
  replyCount: number
  liked: boolean
  rootId: number
}

interface ThreadItem {
  id: number
  parentId: number
  content: string
  username: string
  nickname: string
  avatar: string
  createdAt: number
  likeCount: number
  liked: boolean
  parentUsername?: string
  parentNickname?: string
  parentContent?: string
}

const props = defineProps<{ id: number }>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const tibi = ref<TibiItem | null>(null)
const thread = ref<ThreadItem[]>([])
const loading = ref(true)
const notFound = ref(false)

const replyingToId = ref<number | null>(null)
const replyContent = ref('')
const submitting = ref(false)
const serverError = ref('')
const maxLength = replyBody.properties.content.maxLength!

const composeRef = ref<HTMLElement | null>(null)

async function load() {
  loading.value = true
  const { data: tibiData } = await api.tibi({ id: props.id }).get()
  loading.value = false

  if (!tibiData) {
    notFound.value = true
    return
  }

  const item = tibiData as TibiItem
  if (item.rootId !== item.id) {
    router.replace(`/tibi/${item.rootId}`)
    return
  }

  tibi.value = item
  await loadThread()

  if (route.hash === '#reply' && user.value)
    startReply(props.id)
}

async function loadThread() {
  const { data } = await api.tibi({ id: props.id }).thread.get()
  if (data)
    thread.value = data as ThreadItem[]
}

async function startReply(targetId: number) {
  if (!user.value) {
    router.push('/login')
    return
  }
  replyingToId.value = targetId
  await nextTick()
  composeRef.value?.querySelector('textarea')?.focus()
}

function cancelReply() {
  replyingToId.value = null
  replyContent.value = ''
  serverError.value = ''
}

async function submitReply() {
  if (!replyContent.value.trim() || !replyingToId.value)
    return
  submitting.value = true
  serverError.value = ''
  const { error } = await api.tibi({ id: replyingToId.value }).reply.post({ content: replyContent.value.trim() })
  submitting.value = false
  if (error) {
    serverError.value = t('tibi.errors.postFailed')
    return
  }
  replyContent.value = ''
  replyingToId.value = null
  await loadThread()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submitReply()
  }
  if (e.key === 'Escape')
    cancelReply()
}

function onLiked(_id: number, liked: boolean, likeCount: number) {
  if (tibi.value)
    tibi.value = { ...tibi.value, liked, likeCount }
}

function onDeleted() {
  router.back()
}

function onReplyDeleted(id: number) {
  thread.value = thread.value.filter(item => item.id !== id)
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
      <div id="thread-root">
        <TibiCard v-bind="tibi" expanded @liked="onLiked" @deleted="onDeleted" @reply="startReply(tibi.id)" />
      </div>

      <div v-if="replyingToId === tibi.id" ref="composeRef" class="border rounded-lg p-3 space-y-2">
        <Textarea
          v-model="replyContent"
          :placeholder="t('tibi.reply.placeholder')"
          :maxlength="maxLength"
          class="border-none px-0 resize-none shadow-none focus-visible:ring-0 min-h-16"
          @keydown="handleKeydown"
        />
        <div class="flex justify-between items-center">
          <span class="text-xs text-muted-foreground" :class="{ 'text-destructive': replyContent.length >= maxLength }">
            {{ replyContent.length }}/{{ maxLength }}
          </span>
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" @click="cancelReply">{{ t('common.cancel') }}</Button>
            <Button size="sm" :disabled="!replyContent.trim() || submitting" @click="submitReply">
              <Spinner v-if="submitting" data-icon="inline-start" />
              {{ t('tibi.reply.submit') }}
            </Button>
          </div>
        </div>
        <p v-if="serverError" class="text-sm text-destructive">{{ serverError }}</p>
      </div>

      <div v-if="thread.length" class="divide-y">
        <template v-for="item in thread" :key="item.id">
          <div>
            <ReplyItem
              v-bind="item"
              @reply="startReply(item.id)"
              @deleted="onReplyDeleted"
            />
            <div v-if="replyingToId === item.id" ref="composeRef" class="border rounded-lg p-3 space-y-2 mb-2 ml-10">
              <p class="text-xs text-muted-foreground">@{{ item.nickname }}</p>
              <Textarea
                v-model="replyContent"
                :maxlength="maxLength"
                class="border-none px-0 resize-none shadow-none focus-visible:ring-0 min-h-16"
                @keydown="handleKeydown"
              />
              <div class="flex justify-between items-center">
                <span class="text-xs text-muted-foreground" :class="{ 'text-destructive': replyContent.length >= maxLength }">
                  {{ replyContent.length }}/{{ maxLength }}
                </span>
                <div class="flex gap-2">
                  <Button variant="ghost" size="sm" @click="cancelReply">{{ t('common.cancel') }}</Button>
                  <Button size="sm" :disabled="!replyContent.trim() || submitting" @click="submitReply">
                    <Spinner v-if="submitting" data-icon="inline-start" />
                    {{ t('tibi.reply.submit') }}
                  </Button>
                </div>
              </div>
              <p v-if="serverError" class="text-sm text-destructive">{{ serverError }}</p>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
