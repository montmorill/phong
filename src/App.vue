<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NavBrand from '@/components/NavBrand.vue'
import NavUser from '@/components/NavUser.vue'
import { unreadCount, user } from '@/lib/api'

let sse: EventSource | null = null

onMounted(() => {
  if (!user.value)
    return
  sse = new EventSource(`${window.location.origin}/api/events/sse`)
  sse.onmessage = (e) => {
    const event = JSON.parse(e.data) as { topic: string, payload: { recipientUsername?: string } }
    if (event.topic.startsWith('notify.') && event.payload.recipientUsername === user.value?.username)
      unreadCount.value++
  }
})

onUnmounted(() => {
  sse?.close()
  sse = null
})

const mainRef = ref<HTMLElement | null>(null)
const scrollPositions = new Map<string, number>()
const router = useRouter()

router.beforeEach((_, from) => {
  if (mainRef.value)
    scrollPositions.set(from.path, mainRef.value.scrollTop)
})

router.afterEach((to) => {
  const saved = scrollPositions.get(to.path)
  requestAnimationFrame(() => {
    if (mainRef.value)
      mainRef.value.scrollTop = saved ?? 0
  })
})
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <header class="h-16 px-8 border-b w-full flex justify-between items-center select-none">
      <NavBrand />
      <NavUser v-if="user" v-bind="user" />
    </header>
    <main ref="mainRef" class="h-[calc(100vh-4em)] overflow-y-auto flex flex-col items-center">
      <RouterView v-slot="{ Component }">
        <KeepAlive include="PostPage">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>
  </div>
</template>
