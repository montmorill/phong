<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { user } from '@/lib/api'
import { hasCapability } from '@/lib/capabilities'

const router = useRouter()
const canViewAdmin = computed(() => hasCapability(user.value?.capabilities, 'admin:view'))
const studioLoading = ref(false)
const studioUrl = computed(() => '/api/admin/studio/proxy/')

async function openStudio() {
  studioLoading.value = true
  try {
    const res = await fetch('/api/admin/studio/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
      },
    })
    if (!res.ok)
      return undefined
  }
  finally {
    studioLoading.value = false
  }
}

onMounted(async () => {
  if (!canViewAdmin.value) {
    router.replace('/')
    return
  }

  await openStudio()
})
</script>

<template>
  <div class="w-full h-full min-h-0 flex flex-col overflow-hidden">
    <div class="border-b px-4 py-3 flex items-center justify-between gap-4 shrink-0">
      <div>
        <h1 class="font-bold">Drizzle Studio</h1>
        <p class="text-sm text-muted-foreground">
          通过管理员鉴权代理访问本机 Studio，不直接暴露独立端口。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="router.push('/admin')">
          返回 Admin
        </Button>
        <Button variant="outline" size="sm" :disabled="studioLoading" @click="openStudio">
          {{ studioLoading ? '启动中…' : '重连 Studio' }}
        </Button>
      </div>
    </div>
    <iframe
      :src="studioUrl"
      class="flex-1 w-full bg-background"
      title="Drizzle Studio"
      referrerpolicy="no-referrer"
    />
  </div>
</template>
