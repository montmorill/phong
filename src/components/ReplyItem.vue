<script setup lang="ts">
import { computed } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import useAvatar from '@/composables/avatar'

const props = defineProps<{
  id: number
  username: string
  nickname: string
  avatar: string
  content: string
  createdAt: number
}>()

const { avatarUrl } = useAvatar(() => props.avatar)

const timeStr = computed(() => {
  const diff = Date.now() - props.createdAt
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return new Date(props.createdAt).toLocaleDateString('zh-CN')
})

const renderedContent = computed(() => props.content.trim().replace(/\n/g, '<br>'))
</script>

<template>
  <div class="flex gap-3">
    <RouterLink :to="`/@${username}`" class="shrink-0">
      <Avatar class="size-7 border">
        <AvatarImage :src="avatarUrl" :alt="username" />
        <AvatarFallback>{{ nickname.slice(0, 2) }}</AvatarFallback>
      </Avatar>
    </RouterLink>
    <div class="flex-1 min-w-0">
      <div class="flex items-baseline gap-2 mb-0.5">
        <RouterLink :to="`/@${username}`" class="text-sm font-medium hover:underline">
          {{ nickname }}
        </RouterLink>
        <span class="text-xs text-muted-foreground">{{ timeStr }}</span>
      </div>
      <div class="text-sm" v-html="renderedContent" />
    </div>
  </div>
</template>
