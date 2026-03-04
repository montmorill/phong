<script setup lang="ts">
import { Heart, MessageSquare, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import useAvatar from '@/composables/avatar'
import useTimeStr from '@/composables/useTimeStr'
import { api, user } from '@/lib/api'

const props = defineProps<{
  id: number
  parentId?: number
  username: string
  nickname: string
  avatar: string
  content: string
  createdAt: number
  likeCount: number
  liked: boolean
  parentUsername?: string
  parentNickname?: string
  parentContent?: string
}>()

const emit = defineEmits<{
  reply: [id: number]
  deleted: [id: number]
}>()

const { t } = useI18n()
const router = useRouter()
const { avatarUrl } = useAvatar(() => props.avatar)
const timeStr = useTimeStr()

const localLiked = ref(props.liked)
const localLikeCount = ref(props.likeCount)
const deleting = ref(false)

const isOwn = computed(() => user.value?.username === props.username)
const renderedContent = computed(() => props.content.trim().replace(/\n/g, '<br>'))

function jumpToParent() {
  if (!props.parentId)
    return
  const targetId = `thread-item-${props.parentId}`
  const el = document.getElementById(targetId) ?? document.getElementById('thread-root')
  if (!el)
    return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.pushState(null, '', `#${el.id}`)
  el.classList.remove('thread-highlight')
  void el.offsetWidth // reflow to restart animation
  el.classList.add('thread-highlight')
  el.addEventListener('animationend', () => el.classList.remove('thread-highlight'), { once: true })
}

async function handleLike() {
  if (!user.value) {
    router.push('/login')
    return
  }
  const { data } = await api.tibi({ id: props.id }).like.post()
  if (data) {
    localLikeCount.value += data.liked ? 1 : -1
    localLiked.value = data.liked
  }
}

async function confirmDelete() {
  deleting.value = true
  await api.tibi({ id: props.id }).delete()
  deleting.value = false
  emit('deleted', props.id)
}
</script>

<template>
  <div :id="`thread-item-${id}`" class="flex gap-3 py-3">
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
        <span class="text-xs text-muted-foreground">{{ timeStr(createdAt) }}</span>
      </div>
      <a
        v-if="parentUsername && parentId"
        :href="`#thread-item-${parentId}`"
        class="text-xs text-muted-foreground mb-1 hover:text-foreground transition-colors block"
        @click.prevent="jumpToParent"
      >
        {{ t('tibi.replyTo', {
          nickname: parentNickname,
          content: parentContent,
        }) }}
      </a>
      <div class="text-sm" v-html="renderedContent" />
      <div class="flex items-center gap-0 -ml-2 mt-0.5">
        <Button
          variant="ghost"
          size="sm"
          class="gap-1 text-muted-foreground h-6 px-2 text-xs"
          :class="{ 'text-red-500': localLiked }"
          @click="handleLike"
        >
          <Heart class="size-3" :class="{ 'fill-current': localLiked }" />
          {{ localLikeCount || '' }}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="gap-1 text-muted-foreground h-6 px-2 text-xs"
          @click="emit('reply', id)"
        >
          <MessageSquare class="size-3" />
          {{ t('tibi.reply.submit') }}
        </Button>
        <AlertDialog v-if="isOwn">
          <AlertDialogTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              class="text-muted-foreground hover:text-destructive h-6 px-2"
            >
              <Trash2 class="size-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{{ t('tibi.deleteConfirm') }}</AlertDialogTitle>
              <AlertDialogDescription>{{ t('tibi.deleteDescription') }}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
              <AlertDialogAction
                class="bg-destructive text-white hover:bg-destructive/90"
                :disabled="deleting"
                @click.prevent="confirmDelete"
              >
                {{ t('common.delete') }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  </div>
</template>
