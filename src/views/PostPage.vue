<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Translation, useI18n } from 'vue-i18n'
import PostCompose from '@/components/PostCompose.vue'
import PostList from '@/components/PostList.vue'
import { user } from '@/lib/api'

const { t } = useI18n()

const postList = ref<InstanceType<typeof PostList> | null>(null)

let sse: EventSource | null = null

onMounted(() => {
  sse = new EventSource(`${window.location.origin}/api/sse`)
  sse.onmessage = (e) => {
    const { topic } = JSON.parse(e.data) as { topic: string }
    if (topic === 'post.created')
      postList.value?.reload()
  }
})

onUnmounted(() => {
  sse?.close()
  sse = null
})
</script>

<template>
  <div class="w-full mb-auto max-w-2xl px-4 py-8 space-y-4">
    <PostCompose v-if="user" @posted="postList?.reload()" />
    <div v-else class="text-center text-muted-foreground text-sm pb-4">
      <Translation keypath="post.loginRequired">
        <template #login>
          <RouterLink to="/login" class="link">
            {{ t('home.loginLink') }}
          </RouterLink>
        </template>
      </Translation>
    </div>
    <PostList ref="postList" />
  </div>
</template>
