<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { user } from '@/lib/api'
import { hasCapability } from '@/lib/capabilities'

const router = useRouter()
const canViewAdmin = computed(() => hasCapability(user.value?.capabilities, 'admin:view'))
const studioUrl = computed(() => '/api/admin/studio/')

onMounted(() => {
  if (!canViewAdmin.value)
    router.replace('/')
})
</script>

<template>
  <div class="w-full h-full min-h-0 flex flex-col overflow-hidden">
    <div class="border-b px-4 py-3 flex items-center justify-between gap-4 shrink-0">
      <div>
        <h1 class="font-bold">Drizzle Studio</h1>
        <p class="text-sm text-muted-foreground">
          通过管理员鉴权代理访问 Drizzle Studio。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="router.push('/admin/log')">
          返回 Admin
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
