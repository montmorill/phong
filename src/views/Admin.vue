<script setup lang="ts">
import type { LogEntry } from './admin/AdminLog.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { user } from '@/lib/api'
import AdminDatabase from './admin/AdminDatabase.vue'
import AdminLog from './admin/AdminLog.vue'

const router = useRouter()

onMounted(() => {
  if (!user.value?.capabilities.includes('admin'))
    router.replace('/')
})

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = keyof typeof TABS
const TABS = {
  backend: '服务端日志',
  database: '数据库',
}

function getTabFromHash(): Tab {
  const hash = location.hash.slice(1) as Tab
  return Object.keys(TABS).includes(hash) ? hash : 'backend'
}

const tab = ref<Tab>(getTabFromHash())

function setTab(t: Tab) {
  tab.value = t
  history.replaceState(null, '', `#${t}`)
}

window.addEventListener('hashchange', () => {
  tab.value = getTabFromHash()
})

// ── Backend logs (WebSocket) ──────────────────────────────────────────────────
const LOG_PAGE_SIZE = 500
const backendLogs = ref<LogEntry[]>([])
const autoScroll = ref(true)
const logPage = ref(0)
const totalLogPages = computed(() => Math.max(1, Math.ceil(backendLogs.value.length / LOG_PAGE_SIZE)))
const pagedLogs = computed(() => backendLogs.value.slice(logPage.value * LOG_PAGE_SIZE, (logPage.value + 1) * LOG_PAGE_SIZE))

watch(() => backendLogs.value.length, () => {
  if (autoScroll.value)
    logPage.value = totalLogPages.value - 1
})
watch(autoScroll, (val) => {
  if (val)
    logPage.value = totalLogPages.value - 1
})

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function connectWS() {
  const token = localStorage.getItem('token') ?? ''
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${location.host}/api/admin/ws?token=${encodeURIComponent(token)}`)
  ws.onmessage = ({ data }) => {
    try {
      const parsed = JSON.parse(data)
      if (parsed.type === 'ping' || parsed.type === 'event')
        return
      backendLogs.value.push(parsed)
      if (backendLogs.value.length > 1000)
        backendLogs.value.shift()
    }
    catch {}
  }
  ws.onclose = () => {
    reconnectTimer = setTimeout(connectWS, 3000)
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(connectWS)

onUnmounted(() => {
  ws?.close()
  if (reconnectTimer)
    clearTimeout(reconnectTimer)
})
</script>

<template>
  <div class="w-full flex flex-col h-[calc(100vh-4em)]">
    <!-- Header -->
    <div class="border-b px-4 py-3 flex items-center gap-4 shrink-0">
      <span class="font-bold">Admin</span>
      <div class="flex gap-1">
        <Button
          v-for="(label, key) in TABS"
          :key="key"
          :variant="tab === key ? 'default' : 'ghost'"
          size="sm"
          @click="setTab(key as Tab)"
        >
          {{ label }}
        </Button>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <template v-if="tab === 'backend'">
          <label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input v-model="autoScroll" type="checkbox" class="size-3">
            自动滚动
          </label>
          <span class="text-xs text-muted-foreground">{{ logPage + 1 }}/{{ totalLogPages }}</span>
          <Button variant="ghost" size="sm" :disabled="logPage === 0" @click="logPage--">‹</Button>
          <Button variant="ghost" size="sm" :disabled="logPage >= totalLogPages - 1" @click="logPage++">›</Button>
          <Button variant="outline" size="sm" @click="backendLogs = []">
            清空
          </Button>
        </template>
      </div>
    </div>

    <!-- Content -->
    <AdminLog v-show="tab === 'backend'" :logs="pagedLogs" :auto-scroll="autoScroll" empty-text="等待日志…" />
    <AdminDatabase v-show="tab === 'database'" />
  </div>
</template>
