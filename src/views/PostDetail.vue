<script setup lang="ts">
import type * as PostService from 'server/modules/posts/service'
import { ChevronLeft } from 'lucide-vue-next'
import { replyBody } from 'server/modules/posts/model'
import { nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PostItem from '@/components/PostItem.vue'
import ReplyCompose from '@/components/ReplyCompose.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { api, user } from '@/lib/api'

type PostData = NonNullable<ReturnType<typeof PostService.get>>
type ThreadItem = ReturnType<typeof PostService.listThread>[number]

const props = defineProps<{ id: number }>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const post = ref<PostData | null>(null)
const ancestors = ref<PostData[]>([])
const thread = ref<ThreadItem[]>([])
const loading = ref(true)
const notFound = ref(false)

const replyingToId = ref<number | null>(null)
const replyContent = ref('')
const submitting = ref(false)
const serverError = ref('')
const maxLength = replyBody.properties.content.maxLength!

const composeRef = ref<InstanceType<typeof ReplyCompose> | null>(null)

async function loadAncestors(item: PostData) {
  ancestors.value = []
  const chain: PostData[] = []
  let currentParentId = item.parentId
  while (currentParentId) {
    const { data } = await api.posts({ id: currentParentId }).get()
    if (!data)
      break
    const parent = data as PostData
    chain.unshift(parent)
    currentParentId = parent.parentId
  }
  ancestors.value = chain
}

async function load() {
  loading.value = true
  const { data: postData } = await api.posts({ id: props.id }).get()
  loading.value = false

  if (!postData) {
    notFound.value = true
    return
  }

  const item = postData as PostData
  post.value = item
  await Promise.all([loadThread(), loadAncestors(item)])

  if (route.hash === '#reply' && user.value)
    startReply(props.id)
}

async function loadThread() {
  const { data } = await api.posts({ id: props.id }).thread.get()
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
  composeRef.value?.focus()
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
  const { error } = await api.posts({ id: replyingToId.value }).reply.post({ content: replyContent.value.trim() })
  submitting.value = false
  if (error) {
    serverError.value = t('post.errors.postFailed')
    return
  }
  replyContent.value = ''
  replyingToId.value = null
  await loadThread()
}

function onLiked(_id: number, liked: boolean, likeCount: number) {
  if (post.value)
    post.value = { ...post.value, liked, likeCount }
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
      {{ t('post.notFound') }}
    </div>
    <template v-else-if="post">
      <PostItem
        v-for="ancestor in ancestors"
        :key="ancestor.id"
        v-bind="ancestor"
        class="opacity-70"
      />

      <PostItem v-bind="post" expanded @liked="onLiked" @deleted="onDeleted" @reply="startReply(post.id)" />

      <ReplyCompose
        v-if="replyingToId === post.id"
        ref="composeRef"
        v-model="replyContent"
        :max-length="maxLength"
        :submitting="submitting"
        :server-error="serverError"
        :placeholder="t('post.reply.placeholder')"
        @submit="submitReply"
        @cancel="cancelReply"
      />

      <template v-for="item in thread" :key="item.id">
        <PostItem
          v-bind="item"
          @reply="startReply(item.id)"
          @deleted="onReplyDeleted"
        />
        <ReplyCompose
          v-if="replyingToId === item.id"
          ref="composeRef"
          v-model="replyContent"
          :max-length="maxLength"
          :submitting="submitting"
          :server-error="serverError"
          :reply-to="item.nickname"
          @submit="submitReply"
          @cancel="cancelReply"
        />
      </template>
    </template>
  </div>
</template>
