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
  replyable?: boolean
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
  if (props.expanded || props.replyable)
    emit('reply')
  else
    router.push(`/post/${props.id}#reply`)
}
</script>

<template>
  <article
    class="px-4 py-3 border rounded-xl bg-card transition-colors"
    :class="{ 'hover:bg-muted/40 cursor-pointer': !expanded }"
    @click="!expanded && router.push(`/post/${id}`)"
  >
    <div class="flex items-center gap-2 min-w-0" @click.stop>
      <component :is="disableUserLink ? 'span' : RouterLink" :to="`/@${username}`" class="shrink-0">
        <UserAvatar :username="username" :nickname="nickname" :avatar="avatar" size="size-7" />
      </component>
      <component
        :is="disableUserLink ? 'span' : RouterLink"
        :to="`/@${username}`"
        class="font-bold text-sm shrink-0"
        :class="{ 'hover:underline': !disableUserLink }"
      >
        {{ nickname }}
      </component>
      <span class="text-sm text-muted-foreground truncate">@{{ username }}</span>
      <span class="text-muted-foreground text-sm shrink-0">· {{ timeStr(createdAt) }}</span>
    </div>

    <div
      v-if="parentId && parentNickname"
      class="mt-2 px-3 py-2 border rounded-lg text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors line-clamp-2"
      @click.stop="router.push(`/post/${parentId}`)"
    >
      <span class="font-medium text-foreground">{{ parentNickname }}</span>
      <span v-if="parentContent">：{{ parentContent }}</span>
    </div>

    <div class="mt-2">
      <p v-if="title" class="font-bold text-sm mb-1">{{ title }}</p>
      <div
        ref="contentRef"
        class="text-sm leading-relaxed wrap-break-word"
        :class="{ 'line-clamp-6': !expanded }"
        v-html="renderedContent"
      />
      <span
        v-if="overflows"
        class="text-xs text-muted-foreground hover:underline cursor-pointer mt-0.5 inline-block"
      >
        {{ t('post.readMore') }}
      </span>
    </div>

    <div class="flex items-center mt-2 -ml-2 select-none">
      <Button
        variant="ghost"
        size="sm"
        class="gap-1.5 h-8 px-2 text-sm text-muted-foreground rounded-full hover:text-sky-500 hover:bg-sky-500/10"
        @click.stop="handleReplyClick"
      >
        <MessageSquare class="size-4" />
        <span v-if="replyCount !== undefined" class="tabular-nums">{{ replyCount || '' }}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="gap-1.5 h-8 px-2 text-sm rounded-full transition-colors"
        :class="localLiked
          ? 'text-rose-500 hover:bg-rose-500/10'
          : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10'"
        @click.stop="handleLike"
      >
        <Heart class="size-4" :class="{ 'fill-current': localLiked }" />
        <span v-if="localLikeCount" class="tabular-nums">{{ localLikeCount }}</span>
      </Button>
      <span v-if="isOwn" @click.stop>
        <DeleteConfirmDialog
          :deleting="deleting"
          button-class="h-8 px-2 rounded-full"
          @confirm="confirmDelete"
        />
      </span>
    </div>
  </article>
</template>
