<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PostItem from '@/components/PostItem.vue'
import { api } from '@/lib/api'

const props = defineProps<{
  username?: string
  disableUserLink?: boolean
}>()

const { t } = useI18n()

type PostData = NonNullable<Awaited<ReturnType<typeof api.posts.get>>['data']>[number]

const posts = ref<PostData[]>([])
const loaded = ref(false)

async function load() {
  const { data } = await api.posts.get({ query: { username: props.username } })
  if (data)
    posts.value = data
  loaded.value = true
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

onMounted(load)
defineExpose({ reload: load })
</script>

<template>
  <div v-if="loaded && posts.length === 0" class="text-center text-muted-foreground py-8">
    {{ t('post.empty') }}
  </div>
  <div v-else class="space-y-3">
    <PostItem
      v-for="post in posts"
      :key="post.id"
      v-bind="post"
      :disable-user-link="disableUserLink"
      @deleted="onDeleted"
      @liked="onLiked"
    />
  </div>
</template>
