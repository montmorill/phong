<script setup lang="ts">
import type * as PostService from '@server/posts/service'
import { ChevronLeft } from 'lucide-vue-next'
import { nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PostCompose from '@/components/PostCompose.vue'
import PostItem from '@/components/PostItem.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { api, user } from '@/lib/api'

type PostData = NonNullable<ReturnType<typeof PostService.get>>
type ThreadItem = ReturnType<typeof PostService.listThread>[number]

const props = defineProps<{ id: number }>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const post = ref<PostData | null>(null)
const parentNickname = ref<string | undefined>()
const parentContent = ref<string | undefined>()
const thread = ref<ThreadItem[]>([])
const loading = ref(true)
const notFound = ref(false)

const replyingToId = ref<number | null>(null)
const composeRef = ref<InstanceType<typeof PostCompose> | null>(null)

function setComposeRef(el: unknown) {
  composeRef.value = (el as InstanceType<typeof PostCompose>) ?? null
}

async function loadParent(parentId: number) {
  const { data } = await api.posts({ id: parentId }).get()
  if (data) {
    const p = data as PostData
    parentNickname.value = p.nickname
    parentContent.value = p.content.slice(0, 60)
  }
}

async function load() {
  post.value = null
  parentNickname.value = undefined
  parentContent.value = undefined
  thread.value = []
  notFound.value = false
  replyingToId.value = null
  loading.value = true
  const { data: postData } = await api.posts({ id: props.id }).get()
  loading.value = false

  if (!postData) {
    notFound.value = true
    return
  }

  const item = postData as PostData
  post.value = item
  const tasks: Promise<void>[] = [loadThread()]
  if (item.parentId)
    tasks.push(loadParent(item.parentId))
  await Promise.all(tasks)

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
  composeRef.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

async function onReplyPosted() {
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
watch(() => props.id, load)
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
        v-bind="post"
        expanded
        :parent-nickname="parentNickname"
        :parent-content="parentContent"
        @liked="onLiked"
        @deleted="onDeleted"
        @reply="startReply(post.id)"
      />

      <PostCompose
        v-if="replyingToId === post.id"
        :ref="setComposeRef"
        :parent-id="post.id"
        @posted="onReplyPosted"
        @cancel="replyingToId = null"
      />

      <template v-if="thread.length">
        <div class="flex items-center gap-3">
          <span class="text-sm font-semibold">{{ t('post.comments') }}</span>
          <Separator class="flex-1" />
        </div>
        <div class="space-y-3">
          <template v-for="item in thread" :key="item.id">
            <PostItem
              v-bind="item"
              replyable
              @reply="startReply(item.id)"
              @deleted="onReplyDeleted"
            />
            <PostCompose
              v-if="replyingToId === item.id"
              :ref="setComposeRef"
              :parent-id="item.id"
              :reply-to="item.nickname"
              @posted="onReplyPosted"
              @cancel="replyingToId = null"
            />
          </template>
        </div>
      </template>
    </template>
  </div>
</template>
