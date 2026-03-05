<script setup lang="ts">
import { Heart, MessageSquare } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import useTimeStr from '@/composables/useTimeStr'
import { api, user } from '@/lib/api'

const props = defineProps<{
  id: number
  title?: string
  content: string
  username: string
  nickname: string
  avatar: string
  createdAt: number
  likeCount: number
  replyCount: number
  liked: boolean
  expanded?: boolean
}>()
const emit = defineEmits<{
  deleted: [id: number]
  liked: [id: number, liked: boolean, likeCount: number]
  reply: []
}>()

const { t } = useI18n()
const router = useRouter()
const timeStr = useTimeStr()

const renderedContent = computed(() =>
  props.content.trim().replace(/\n/g, '<br>'),
)

const isOwn = computed(() => user.value?.username === props.username)
const deleting = ref(false)

const contentRef = ref<HTMLElement | null>(null)
const overflows = ref(false)

onMounted(() => {
  if (!props.expanded) {
    requestAnimationFrame(() => {
      if (contentRef.value)
        overflows.value = contentRef.value.scrollHeight > contentRef.value.clientHeight
    })
  }
})

async function handleLike() {
  if (!user.value) {
    router.push('/login')
    return
  }
  const { data } = await api.posts({ id: props.id }).like.post()
  if (data) {
    emit('liked', props.id, data.liked, props.likeCount + (data.liked ? 1 : -1))
  }
}

async function confirmDelete() {
  deleting.value = true
  await api.posts({ id: props.id }).delete()
  deleting.value = false
  emit('deleted', props.id)
}
</script>

<template>
  <Card>
    <CardContent class="pt-4">
      <div class="flex items-center gap-2 mb-3 select-none">
        <RouterLink :to="`/@${username}/post`">
          <UserAvatar :username="username" :nickname="nickname" :avatar="avatar" />
        </RouterLink>
        <div class="flex flex-col leading-none gap-0.5">
          <RouterLink :to="`/@${username}`" class="text-sm font-medium hover:underline">
            {{ nickname }}
          </RouterLink>
          <span class="text-xs text-muted-foreground">{{ timeStr(createdAt) }}</span>
        </div>
      </div>
      <div :class="expanded ? '' : 'cursor-pointer'" @click="router.push(`/post/${props.id}`)">
        <p v-if="title" class="font-semibold text-sm mb-1">{{ title }}</p>
        <div class="relative">
          <div
            ref="contentRef"
            class="max-w-none"
            :style="expanded ? '' : 'max-height: 12rem; overflow: hidden'"
            v-html="renderedContent"
          />
          <div
            v-if="overflows"
            class="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-card to-transparent flex items-end"
          >
            <span class="text-xs text-muted-foreground">{{ t('post.readMore') }}</span>
          </div>
        </div>
      </div>
      <div class="flex flex-row-reverse items-center gap-1 select-none mt-1">
        <Button
          variant="ghost"
          size="sm"
          class="gap-1 text-muted-foreground h-7 px-2 leading-none"
          :class="{ 'text-red-500': liked }"
          @click="handleLike"
        >
          <Heart class="size-4" :class="{ 'fill-current': liked }" />
          {{ likeCount }}
        </Button>
        <Button
          variant="ghost" size="sm"
          class="gap-1 text-muted-foreground h-7 px-2 leading-none"
          @click="expanded ? emit('reply') : router.push(`/post/${props.id}#reply`)"
        >
          <MessageSquare class="size-4" />
          {{ replyCount }}
        </Button>
        <DeleteConfirmDialog
          v-if="isOwn"
          :deleting="deleting"
          button-class="h-7 px-2 leading-none"
          @confirm="confirmDelete"
        />
      </div>
    </CardContent>
  </Card>
</template>
