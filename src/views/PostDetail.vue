<script setup lang="ts">
import type * as PostService from 'server/modules/posts/service'
import { ChevronLeft } from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PostCompose from '@/components/PostCompose.vue'
import PostItem from '@/components/PostItem.vue'
import PostThreadNode from '@/components/PostThreadNode.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { api, user } from '@/lib/api'

type PostData = NonNullable<ReturnType<typeof PostService.get>>
type ThreadItem = ReturnType<typeof PostService.listThread>[number]
type AncestorItem = ReturnType<typeof PostService.listAncestors>[number]
type ThreadNode = ThreadItem & { children: ThreadNode[] }

const props = defineProps<{ id: number }>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const post = ref<PostData | null>(null)
const ancestors = ref<AncestorItem[]>([])
const thread = ref<ThreadItem[]>([])
const loading = ref(true)
const notFound = ref(false)

const replyingToId = ref<number | null>(null)
const composeRef = ref<InstanceType<typeof PostCompose> | null>(null)

const threadTree = computed<ThreadNode[]>(() => {
  const rootId = post.value?.id
  if (!rootId)
    return []

  const nodeMap = new Map<number, ThreadNode>()
  for (const item of thread.value)
    nodeMap.set(item.id, { ...item, children: [] })

  const roots: ThreadNode[] = []
  for (const item of thread.value) {
    const node = nodeMap.get(item.id)!
    if (item.parentId === rootId) {
      roots.push(node)
      continue
    }
    nodeMap.get(item.parentId)?.children.push(node)
  }

  return roots
})

function setComposeRef(el: unknown) {
  composeRef.value = (el as InstanceType<typeof PostCompose>) ?? null
}

async function loadAncestors() {
  const { data } = await (api.posts({ id: props.id }) as any).ancestors.get()
  if (data)
    ancestors.value = data as AncestorItem[]
}

async function load() {
  post.value = null
  ancestors.value = []
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
    tasks.push(loadAncestors())
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
  if (replyingToId.value === targetId) {
    replyingToId.value = null
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
  const removed = new Set<number>([id])
  let changed = true
  while (changed) {
    changed = false
    for (const item of thread.value) {
      if (removed.has(item.parentId) && !removed.has(item.id)) {
        removed.add(item.id)
        changed = true
      }
    }
  }
  thread.value = thread.value.filter(item => !removed.has(item.id))
}

function onQuoteClick(parentId: number) {
  const el = document.getElementById(`post-${parentId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-2', 'ring-primary')
    setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1000)
  }
  else {
    router.push(`/post/${parentId}`)
  }
}

onMounted(load)
watch(() => props.id, load)
</script>

<template>
  <div class="w-full mb-auto max-w-2xl px-4 py-8">
    <Button variant="ghost" size="sm" class="gap-1 -ml-2 mb-4 text-muted-foreground" @click="router.back()">
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
      <template v-for="(ancestor, i) in ancestors" :key="ancestor.id">
        <div
          class="px-3 py-2 border rounded-lg text-sm text-muted-foreground cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors truncate"
          @click="onQuoteClick(ancestor.id)"
        >
          <span class="font-medium text-foreground">{{ ancestor.nickname }}</span>
          {{ `: ${ancestor.content}` }}
        </div>
        <div
          class="ml-5 w-0.5 bg-border"
          :class="i < ancestors.length - 1 ? 'h-3' : 'h-4'"
        />
      </template>
      <PostItem
        v-bind="post"
        expanded
        @liked="onLiked"
        @deleted="onDeleted"
        @reply="startReply(post.id)"
        @quote-click="onQuoteClick"
      />

      <template v-if="replyingToId === post.id">
        <div class="ml-6 w-0.5 h-4 bg-border" />
        <PostCompose
          :ref="setComposeRef"
          :parent-id="post.id"
          @posted="onReplyPosted"
          @cancel="replyingToId = null"
        />
      </template>

      <template v-if="thread.length">
        <div class="flex items-center gap-3 my-4">
          <span class="text-sm font-semibold">{{ t('post.comments') }}</span>
          <Separator class="flex-1" />
        </div>
        <div class="space-y-3">
          <PostThreadNode
            v-for="(item, index) in threadTree"
            :key="item.id"
            :node="item"
            :depth="1"
            :guides="[]"
            :is-last="index === threadTree.length - 1"
            :replying-to-id="replyingToId"
            @reply="startReply"
            @deleted="onReplyDeleted"
            @quote-click="onQuoteClick"
          >
            <template #composer="{ node }">
              <PostCompose
                :ref="setComposeRef"
                :parent-id="node.id"
                :reply-to="node.nickname"
                @posted="onReplyPosted"
                @cancel="replyingToId = null"
              />
            </template>
          </PostThreadNode>
        </div>
      </template>
    </template>
  </div>
</template>
