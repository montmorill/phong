<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { EventEntry } from './admin/AdminEvents.vue'
import type { LogEntry } from './admin/AdminLog.vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { user } from '@/lib/api'
import AdminDatabase from './admin/AdminDatabase.vue'
import AdminEvents from './admin/AdminEvents.vue'
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
  frontend: '前端日志',
  events: '事件',
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
const backendLogs = ref<LogEntry[]>([])
const eventEntries = ref<EventEntry[]>([])
const autoScroll = ref(true)
let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function connectWS() {
  const token = localStorage.getItem('token') ?? ''
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${location.host}/api/admin/ws?token=${encodeURIComponent(token)}`)
  ws.onmessage = ({ data }) => {
    try {
      const parsed = JSON.parse(data)
      if (parsed.type === 'ping')
        return
      if (parsed.type === 'event') {
        eventEntries.value.push({ topic: parsed.topic, payload: parsed.payload, timestamp: parsed.timestamp })
        if (eventEntries.value.length > 1000)
          eventEntries.value.shift()
        return
      }
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

// ── Frontend logs (console intercept) ────────────────────────────────────────
const frontendLogs = ref<LogEntry[]>([])
const savedConsole = {
  trace: console.trace,
  debug: console.debug,
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
}

function captureConsole() {
  const wrap = (level: string, orig: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      orig(...args)
      const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      frontendLogs.value.push({ level, message, timestamp: Date.now() })
      if (frontendLogs.value.length > 1000)
        frontendLogs.value.shift()
    }
  console.trace = wrap('trace', savedConsole.trace)
  console.debug = wrap('debug', savedConsole.debug)
  console.log = wrap('log', savedConsole.log)
  console.info = wrap('info', savedConsole.info)
  console.warn = wrap('warn', savedConsole.warn)
  console.error = wrap('error', savedConsole.error)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  connectWS()
  captureConsole()
})

onUnmounted(() => {
  ws?.close()
  if (reconnectTimer)
    clearTimeout(reconnectTimer)
  console.trace = savedConsole.trace
  console.debug = savedConsole.debug
  console.log = savedConsole.log
  console.info = savedConsole.info
  console.warn = savedConsole.warn
  console.error = savedConsole.error
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
        <label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input v-model="autoScroll" type="checkbox" class="size-3">
          自动滚动
        </label>
        <Button v-if="tab === 'backend'" variant="outline" size="sm" @click="backendLogs = []">
          清空
        </Button>
        <Button v-if="tab === 'frontend'" variant="outline" size="sm" @click="frontendLogs = []">
          清空
        </Button>
        <Button v-if="tab === 'events'" variant="outline" size="sm" @click="eventEntries = []">
          清空
        </Button>
      </div>
    </div>

    <!-- Content -->
    <AdminLog v-show="tab === 'backend'" :logs="backendLogs" :auto-scroll="autoScroll" empty-text="等待日志…" />
    <AdminLog v-show="tab === 'frontend'" :logs="frontendLogs" :auto-scroll="autoScroll" empty-text="暂无前端日志" />
    <AdminEvents v-show="tab === 'events'" :entries="eventEntries" :auto-scroll="autoScroll" />
    <AdminDatabase v-show="tab === 'database'" />
  </div>
</template>
