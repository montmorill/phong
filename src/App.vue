<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
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
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <header class="h-16 px-8 border-b w-full flex justify-between items-center select-none">
      <NavBrand />
      <NavUser v-if="user" v-bind="user" />
    </header>
    <main class="h-[calc(100vh-4em)] overflow-y-scroll flex flex-col items-center">
      <RouterView />
    </main>
  </div>
</template>
