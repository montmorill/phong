<script setup lang="ts">
import { Heart, MessageSquare } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import { Button } from '@/components/ui/button'
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
  replyCount?: number
  liked: boolean
  expanded?: boolean
  disableUserLink?: boolean
  parentId?: number
  parentNickname?: string
  parentContent?: string
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
const localLiked = ref(props.liked)
const localLikeCount = ref(props.likeCount)

watch(() => props.liked, v => (localLiked.value = v))
watch(() => props.likeCount, v => (localLikeCount.value = v))

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
    localLikeCount.value += data.liked ? 1 : -1
    localLiked.value = data.liked
    emit('liked', props.id, localLiked.value, localLikeCount.value)
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
  <div class="rounded-lg border bg-card text-card-foreground">
    <div class="flex gap-3 px-4 pt-4 pb-1">
      <div class="shrink-0">
        <component :is="disableUserLink ? 'span' : RouterLink" :to="`/@${username}`">
          <UserAvatar :username="username" :nickname="nickname" :avatar="avatar" />
        </component>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-1.5 select-none">
          <component
            :is="disableUserLink ? 'span' : RouterLink"
            :to="`/@${username}`"
            class="text-sm font-semibold"
            :class="{ 'hover:underline': !disableUserLink }"
          >
            {{ nickname }}
          </component>
          <span class="text-xs text-muted-foreground">· {{ timeStr(createdAt) }}</span>
        </div>
        <RouterLink
          v-if="parentId && parentNickname"
          :to="`/post/${parentId}`"
          class="text-xs text-muted-foreground hover:text-foreground transition-colors block mb-0.5"
        >
          {{ t('post.replyTo', { nickname: parentNickname, content: parentContent }) }}
        </RouterLink>
        <RouterLink :to="`/post/${id}`" class="block mt-1">
          <p v-if="title" class="font-semibold text-sm mb-0.5">{{ title }}</p>
          <div class="relative">
            <div
              ref="contentRef"
              class="text-sm"
              :style="expanded ? undefined : 'max-height: 12rem; overflow: hidden'"
              v-html="renderedContent"
            />
            <div
              v-if="overflows"
              class="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-card to-transparent"
            />
          </div>
        </RouterLink>
      </div>
    </div>
    <div class="flex items-center px-2 py-1.5 justify-between select-none">
      <div class="flex gap-0">
        <Button
          variant="ghost"
          size="sm"
          class="gap-1 h-7 px-2 leading-none text-muted-foreground"
          @click="handleReplyClick"
        >
          <MessageSquare class="size-4" />
          <span v-if="replyCount !== undefined">{{ replyCount }}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="gap-1 h-7 px-2 leading-none"
          :class="localLiked ? 'text-red-500' : 'text-muted-foreground'"
          @click="handleLike"
        >
          <Heart class="size-4" :class="{ 'fill-current': localLiked }" />
          {{ localLikeCount || '' }}
        </Button>
      </div>
      <div class="flex items-center gap-1">
        <RouterLink
          v-if="overflows"
          :to="`/post/${id}`"
          class="text-xs text-muted-foreground hover:underline"
        >
          {{ t('post.readMore') }}
        </RouterLink>
        <DeleteConfirmDialog
          v-if="isOwn"
          :deleting="deleting"
          button-class="h-7 px-2 leading-none"
          @confirm="confirmDelete"
        />
      </div>
    </div>
  </div>
</template>
