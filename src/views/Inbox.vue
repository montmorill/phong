<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { parseAvatar, PROVIDERS } from '@/composables/avatar'
import useTimeStr from '@/composables/useTimeStr'
import { api, unreadCount } from '@/lib/api'

interface NotificationItem {
  id: number
  type: 'like' | 'reply'
  actorUsername: string
  actorNickname: string
  actorAvatar: string
  postId: number
  postContent: string
  replyId?: number
  read: boolean
  createdAt: number
}

const { t } = useI18n()
const router = useRouter()
const timeStr = useTimeStr()

const items = ref<NotificationItem[]>([])
const loading = ref(true)

onMounted(async () => {
  const { data } = await api.notifications.get()
  loading.value = false
  if (data)
    items.value = data as NotificationItem[]
  await api.notifications.read.post()
  unreadCount.value = 0
})

function resolveAvatarUrl(avatar: string): string {
  const { provider, value } = parseAvatar(avatar)
  if (provider === 'qq' && value)
    return PROVIDERS.qq.resolve(value)
  return ''
}

function navigate(item: NotificationItem) {
  router.push(item.type === 'reply' ? `/post/${item.postId}#reply` : `/post/${item.postId}`)
}
</script>

<template>
  <div class="w-full mb-auto max-w-2xl px-4 py-8 space-y-4">
    <div class="flex items-center gap-2">
      <Inbox class="size-5" />
      <h1 class="text-lg font-semibold">
        {{ t('inbox.title') }}
      </h1>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <Spinner />
    </div>
    <div v-else-if="!items.length" class="text-center text-muted-foreground py-8">
      {{ t('inbox.empty') }}
    </div>
    <div v-else class="space-y-1">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
        :class="{ 'opacity-60': item.read }"
        @click="navigate(item)"
      >
        <Avatar class="size-8 border shrink-0">
          <AvatarImage :src="resolveAvatarUrl(item.actorAvatar)" :alt="item.actorUsername" />
          <AvatarFallback>{{ item.actorNickname.slice(0, 2) }}</AvatarFallback>
        </Avatar>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-sm font-medium">{{ item.actorNickname }}</span>
            <span class="text-sm text-muted-foreground">{{ t(`inbox.${item.type}d`) }}</span>
            <span v-if="!item.read" class="size-1.5 rounded-full bg-blue-500 shrink-0" />
          </div>
          <p class="text-xs text-muted-foreground mt-0.5 truncate">{{ item.postContent }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">{{ timeStr(item.createdAt) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
