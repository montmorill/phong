<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Translation, useI18n } from 'vue-i18n'
import PostCard from '@/components/PostCard.vue'
import PostCompose from '@/components/PostCompose.vue'
import { api, user } from '@/lib/api'

const props = defineProps<{ username?: string }>()

type PostItem = NonNullable<Awaited<ReturnType<typeof api.post.get>>['data']>[number]

const { t } = useI18n()

const posts = ref<PostItem[]>([])
const loading = ref(false)

const canCompose = () => !props.username || props.username === user.value?.username

async function loadPosts() {
  loading.value = true
  const { data } = await api.post.get({ query: { username: props.username } })
  if (data)
    posts.value = data
  loading.value = false
}

function onPosted() {
  loadPosts()
}

function onDeleted(id: number) {
  posts.value = posts.value.filter(item => item.id !== id)
}

function onLiked(id: number, liked: boolean, likeCount: number) {
  const item = posts.value.find(item => item.id === id)
  if (item) {
    item.liked = liked
    item.likeCount = likeCount
  }
}

let sse: EventSource | null = null

onMounted(() => {
  loadPosts()
  sse = new EventSource(`${window.location.origin}/api/sse`)
  sse.onmessage = (e) => {
    const { topic, payload } = JSON.parse(e.data) as { topic: string, payload: { username?: string } }
    if (topic === 'post.created') {
      if (!props.username || props.username === payload.username)
        loadPosts()
    }
  }
})

onUnmounted(() => {
  sse?.close()
  sse = null
})
</script>

<template>
  <div class="w-full mb-auto max-w-2xl px-4 py-8 space-y-4">
    <div v-if="username" class="flex items-center gap-2 text-sm">
      <RouterLink :to="`/@${username}`" class="text-muted-foreground hover:text-foreground">
        @{{ username }}
      </RouterLink>
      <span class="text-muted-foreground">/</span>
      <span class="font-medium">{{ t('post.title') }}</span>
    </div>

    <PostCompose v-if="canCompose() && user" @posted="onPosted" />
    <Translation v-else-if="!user && !username" keypath="post.loginRequired" class="text-center text-muted-foreground text-sm">
      <template #login>
        <RouterLink to="/login" class="link">
          {{ t('home.loginLink') }}
        </RouterLink>
      </template>
    </Translation>
    <div v-if="posts.length === 0 && !loading" class="text-center text-muted-foreground py-8">
      {{ t('post.empty') }}
    </div>
    <PostCard
      v-for="post in posts"
      :key="post.id"
      v-bind="post"
      @deleted="onDeleted"
      @liked="onLiked"
    />
  </div>
</template>
