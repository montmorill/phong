<script setup lang="ts">
import { Heart, MessageSquare } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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
  disableUserLink?: boolean
}>()

const emit = defineEmits<{
  deleted: [id: number]
  liked: [id: number, liked: boolean, likeCount: number]
  reply: []
}>()

const { t } = useI18n()
const router = useRouter()
const timeStr = useTimeStr()

const renderedContent = computed(() => props.content.trim().replace(/\n/g, '<br>'))
const isOwn = computed(() => user.value?.username === props.username)

const contentRef = ref<HTMLElement | null>(null)
const overflows = ref(false)
const deleting = ref(false)

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

function handleReplyClick() {
  if (props.expanded)
    emit('reply')
  else
    router.push(`/post/${props.id}#reply`)
}
</script>

<template>
  <Card>
    <CardHeader class="pb-3 gap-2 select-none">
      <div class="flex items-center gap-2">
        <component :is="disableUserLink ? 'span' : RouterLink" :to="`/@${username}`">
          <UserAvatar :username="username" :nickname="nickname" :avatar="avatar" />
        </component>
        <div class="flex flex-col leading-none gap-0.5">
          <component
            :is="disableUserLink ? 'span' : RouterLink"
            :to="`/@${username}`"
            class="text-sm font-medium"
            :class="{ 'hover:underline': !disableUserLink }"
          >
            {{ nickname }}
          </component>
          <span class="text-xs text-muted-foreground">{{ timeStr(createdAt) }}</span>
        </div>
      </div>
    </CardHeader>
    <CardContent class="pb-2" :class="{ 'cursor-pointer': !expanded }">
      <RouterLink :to="`/post/${id}`" class="max-w-none">
        <CardTitle v-if="title" class="text-base">{{ title }}</CardTitle>
        <div class="relative">
          <div
            ref="contentRef"
            class="max-w-none"
            :style="expanded ? undefined : 'max-height: 12rem; overflow: hidden'"
            v-html="renderedContent"
          />
          <div
            v-if="overflows"
            class="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-card to-transparent"
          />
        </div>
      </RouterLink>
    </CardContent>
    <CardFooter class="relative flex-row-reverse items-start justify-between select-none">
      <div class="flex gap-1">
        <DeleteConfirmDialog
          v-if="isOwn"
          :deleting="deleting"
          button-class="h-7 px-2 leading-none"
          @confirm="confirmDelete"
        />
        <Button
          variant="ghost"
          size="sm"
          class="gap-1 h-7 px-2 leading-none text-muted-foreground"
          @click="handleReplyClick"
        >
          <MessageSquare class="size-4" />
          {{ replyCount }}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="gap-1 h-7 px-2 leading-none"
          :class="liked ? 'text-red-500' : 'text-muted-foreground'"
          @click="handleLike"
        >
          <Heart class="size-4" :class="{ 'fill-current': liked }" />
          {{ likeCount }}
        </Button>
      </div>
      <div v-if="overflows" class="text-xs text-muted-foreground">
        <RouterLink :to="`/post/${id}`" class="hover:underline">{{ t('post.readMore') }}</RouterLink>
      </div>
    </CardFooter>
  </Card>
</template>
