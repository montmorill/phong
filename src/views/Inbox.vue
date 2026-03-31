<script setup lang="ts">
import { Check, Inbox } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { parseAvatar, PROVIDERS } from '@/composables/useAvatar'
import useTimeStr from '@/composables/useTimeStr'
import { api, unreadCount } from '@/lib/api'

interface NotificationItem {
  id: number
  type: 'like' | 'reply' | 'post' | 'mail'
  actorUsername?: string
  actorLabel: string
  actorAvatar?: string
  postId?: number | null
  postContent?: string | null
  replyId?: number
  replyContent?: string
  emailId?: number | null
  emailSubject?: string | null
  emailFromAddress?: string | null
  read: boolean
  createdAt: number
}

interface Actor {
  username: string
  nickname: string
  avatar?: string
}

interface DisplayItem {
  ids: number[]
  unreadIds: number[]
  type: 'like' | 'reply' | 'post' | 'mail'
  actors: [Actor, ...Actor[]]
  postId?: number | null
  postContent?: string | null
  replyId?: number
  replyContent?: string
  emailId?: number | null
  emailSubject?: string | null
  emailFromAddress?: string | null
  read: boolean
  createdAt: number
}

const { t } = useI18n()
const router = useRouter()
const timeStr = useTimeStr()

const displayItems = ref<DisplayItem[]>([])
const loading = ref(true)
const markingAllRead = ref(false)
const hasUnreadItems = computed(() => displayItems.value.some(item => item.unreadIds.length > 0))

let observer: IntersectionObserver | null = null

function markItemReadLocally(item: DisplayItem) {
  const count = item.unreadIds.length
  item.unreadIds = []
  item.read = true
  unreadCount.value = Math.max(0, unreadCount.value - count)
}

async function markItemRead(item: DisplayItem) {
  if (!item.unreadIds.length)
    return
  const ids = [...item.unreadIds]
  markItemReadLocally(item)
  await Promise.all(ids.map(id => (api.notifications as any)[id].read.post()))
}

async function markAllRead() {
  if (!hasUnreadItems.value)
    return

  markingAllRead.value = true
  await api.notifications.read.post()
  unreadCount.value = 0
  for (const item of displayItems.value) {
    item.unreadIds = []
    item.read = true
  }
  markingAllRead.value = false
}

function setupLikeObserver() {
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const key = Number((entry.target as HTMLElement).dataset.itemKey)
      if (entry.isIntersecting) {
        const item = displayItems.value.find(i => i.ids[0] === key && i.type === 'like')
        if (item?.unreadIds.length) {
          markItemRead(item)
          observer?.unobserve(entry.target)
        }
      }
    }
  })
}

function setLikeItemRef(item: DisplayItem, el: unknown) {
  if (!observer)
    return
  if (el instanceof HTMLElement) {
    el.dataset.itemKey = String(item.ids[0])
    observer.observe(el)
  }
}

onMounted(async () => {
  setupLikeObserver()

  const { data } = await api.notifications.get()
  loading.value = false
  if (!data)
    return

  const likesByPost = new Map<number, DisplayItem>()
  const result: DisplayItem[] = []

  for (const item of data as NotificationItem[]) {
    const actor = {
      username: item.actorUsername ?? item.actorLabel,
      nickname: item.actorLabel,
      avatar: item.actorAvatar,
    }
    if (item.type === 'like') {
      const existing = likesByPost.get(item.postId!)
      if (existing) {
        existing.ids.push(item.id)
        existing.actors.push(actor)
        if (!item.read) {
          existing.unreadIds.push(item.id)
          existing.read = false
        }
      }
      else {
        const merged: DisplayItem = {
          ids: [item.id],
          unreadIds: item.read ? [] : [item.id],
          type: 'like',
          actors: [actor],
          postId: item.postId,
          postContent: item.postContent,
          read: item.read,
          createdAt: item.createdAt,
        }
        likesByPost.set(item.postId!, merged)
        result.push(merged)
      }
    }
    else {
      result.push({
        ids: [item.id],
        unreadIds: item.read ? [] : [item.id],
        type: item.type,
        actors: [actor],
        postId: item.postId,
        postContent: item.postContent,
        replyId: item.replyId,
        replyContent: item.replyContent,
        emailId: item.emailId,
        emailSubject: item.emailSubject,
        emailFromAddress: item.emailFromAddress,
        read: item.read,
        createdAt: item.createdAt,
      })
    }
  }

  result.sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))
  displayItems.value = result
  await nextTick()
  scrollToSaved()
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})

function resolveAvatarUrl(avatar: string): string {
  const { provider, value } = parseAvatar(avatar)
  if (provider === 'qq' && value)
    return PROVIDERS.qq.resolve(value)
  return ''
}

function scrollToSaved() {
  const scrollToId = sessionStorage.getItem('scrollToInbox')
  if (!scrollToId)
    return
  sessionStorage.removeItem('scrollToInbox')
  const el = document.getElementById(scrollToId)
  const viewport = document.querySelector<HTMLElement>('[data-reka-scroll-area-viewport]')
  if (el && viewport) {
    const elTop = el.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop
    viewport.scrollTop = elTop - (viewport.clientHeight - el.offsetHeight) / 2
  }
}

async function navigate(item: DisplayItem) {
  if (item.type !== 'like' && item.unreadIds.length)
    await markItemRead(item)
  sessionStorage.setItem('scrollToInbox', `notif-${item.ids[0]}`)
  if (item.type === 'mail' && item.emailId) {
    router.push(`/mail/${item.emailId}`)
    return
  }
  if (item.postId)
    router.push(`/post/${item.postId}`)
}
</script>

<template>
  <div class="w-full mb-auto max-w-2xl px-4 py-8 space-y-4">
    <div class="flex items-center gap-2">
      <Inbox class="size-5" />
      <h1 class="text-lg font-semibold">
        {{ t('inbox.title') }}
      </h1>
      <div class="ml-auto flex items-center gap-2">
        <Button
          v-if="displayItems.length"
          variant="outline"
          size="sm"
          :disabled="markingAllRead || !hasUnreadItems"
          @click="markAllRead"
        >
          <Spinner v-if="markingAllRead" data-icon="inline-start" />
          {{ hasUnreadItems ? t('settings.notifications.markAllRead') : t('settings.notifications.markAllReadDone') }}
        </Button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <Spinner />
    </div>
    <div v-else-if="!displayItems.length" class="text-center text-muted-foreground py-8">
      {{ t('inbox.empty') }}
    </div>
    <div v-else class="space-y-1">
      <template v-for="item in displayItems" :key="item.ids[0]">
        <div
          :id="`notif-${item.ids[0]}`"
          :ref="item.type === 'like' ? (el) => setLikeItemRef(item, el) : undefined"
          class="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          :class="{ 'opacity-80': item.read }"
          @click="navigate(item)"
        >
          <div class="flex flex-col shrink-0 -space-y-5">
            <Avatar
              v-for="actor in item.actors.slice(0, 3)"
              :key="actor.username"
              class="size-8 border-2 border-background shrink-0"
            >
              <AvatarImage :src="resolveAvatarUrl(actor.avatar ?? '')" :alt="actor.username" />
              <AvatarFallback>{{ actor.nickname.slice(0, 2) }}</AvatarFallback>
            </Avatar>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-sm font-medium">
                <template v-for="(actor, i) in item.actors.slice(0, 3)" :key="actor.username">
                  {{ actor.nickname }}
                  <span
                    v-if="i < item.actors.slice(0, 3).length - 1"
                    class="text-muted-foreground font-normal"
                  >{{ t('inbox.likeActorsSep') }}</span>
                </template>
                <span
                  v-if="item.actors.length > 3"
                  class="text-muted-foreground font-normal"
                >{{ t('inbox.likeActors', { count: item.actors.length }) }}</span>
              </span>
              <span class="text-sm text-muted-foreground">{{ t(`inbox.${item.type}`) }}</span>
              <span v-if="!item.read" class="size-1.5 rounded-full bg-blue-500 shrink-0" />
            </div>
            <p v-if="item.type === 'mail'" class="text-xs text-muted-foreground mt-0.5 truncate">
              {{ item.emailSubject || t('mail.noSubject') }}
            </p>
            <p v-else class="text-xs text-muted-foreground mt-0.5 truncate">{{ item.postContent }}</p>
            <p v-if="item.type === 'mail' && item.emailFromAddress" class="text-xs mt-0.5 truncate">
              {{ item.emailFromAddress }}
            </p>
            <p v-else-if="item.replyContent" class="text-xs mt-0.5 truncate">{{ item.replyContent }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ timeStr(item.createdAt) }}</p>
          </div>
          <Button
            v-if="!item.read && item.type !== 'like'"
            variant="ghost"
            size="icon"
            class="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            @click.stop="markItemRead(item)"
          >
            <Check class="size-4" />
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>
