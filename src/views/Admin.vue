<!-- eslint-disable no-console -->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { user } from '@/lib/api'

const router = useRouter()

onMounted(() => {
  if (!user.value?.capabilities.includes('admin'))
    router.replace('/')
})

// ── Tabs ──────────────────────────────────────────────────────────────────────
const tab = ref<'backend' | 'frontend' | 'database' | 'events'>('backend')

// ── Backend logs (WebSocket) ──────────────────────────────────────────────────
interface LogEntry { level: string, message: string, ts: number }
interface EventEntry { topic: string, payload: unknown, timestamp: number }

const backendLogs = ref<LogEntry[]>([])
const backendLogEl = ref<HTMLElement | null>(null)
const eventEntries = ref<EventEntry[]>([])
const eventLogEl = ref<HTMLElement | null>(null)
let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

const autoScroll = ref(true)

function connectWS() {
  const token = localStorage.getItem('token') ?? ''
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${location.host}/api/admin/ws?token=${encodeURIComponent(token)}`)
  ws.onmessage = ({ data }) => {
    try {
      const parsed = JSON.parse(data)
      if (parsed.type === 'ping') {
        return
      }
      if (parsed.type === 'event') {
        eventEntries.value.push({ topic: parsed.topic, payload: parsed.payload, timestamp: parsed.timestamp })
        if (eventEntries.value.length > 1000)
          eventEntries.value.shift()
        if (autoScroll.value && tab.value === 'events')
          nextTick(() => eventLogEl.value?.scrollTo(0, eventLogEl.value.scrollHeight))
        return
      }
      backendLogs.value.push(parsed)
      if (backendLogs.value.length > 1000)
        backendLogs.value.shift()
      if (autoScroll.value && tab.value === 'backend')
        nextTick(() => backendLogEl.value?.scrollTo(0, backendLogEl.value.scrollHeight))
    }
    catch {}
  }
  ws.onclose = () => {
    reconnectTimer = setTimeout(connectWS, 3000)
  }
}

// ── Frontend logs (console intercept) ────────────────────────────────────────
const frontendLogs = ref<LogEntry[]>([])
const frontendLogEl = ref<HTMLElement | null>(null)
let savedConsole = { log: console.log, warn: console.warn, error: console.error }

function captureConsole() {
  savedConsole = { log: console.log, warn: console.warn, error: console.error }
  const wrap = (level: string, orig: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      orig(...args)
      const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      frontendLogs.value.push({ level, message, ts: Date.now() })
      if (frontendLogs.value.length > 1000)
        frontendLogs.value.shift()
      if (autoScroll.value && tab.value === 'frontend')
        nextTick(() => frontendLogEl.value?.scrollTo(0, frontendLogEl.value.scrollHeight))
    }
  console.log = wrap('log', savedConsole.log)
  console.warn = wrap('warn', savedConsole.warn)
  console.error = wrap('error', savedConsole.error)
}

// ── Database ──────────────────────────────────────────────────────────────────
const tables = ref<string[]>([])
const selectedTable = ref('')
const tableRows = ref<Record<string, unknown>[]>([])
const tableColumns = computed(() => tableRows.value[0] ? Object.keys(tableRows.value[0]) : [])
const loadingTable = ref(false)

const authHeaders = computed(() => {
  const token = localStorage.getItem('token') ?? ''
  return { Authorization: `Bearer ${token}` }
})

async function loadTables() {
  const res = await fetch('/api/admin/tables', { headers: authHeaders.value })
  if (res.ok) {
    tables.value = await res.json()
    if (tables.value.length)
      selectedTable.value = tables.value[0]!
  }
}

async function loadTable() {
  if (!selectedTable.value)
    return
  loadingTable.value = true
  const res = await fetch(`/api/admin/db/${selectedTable.value}`, { headers: authHeaders.value })
  if (res.ok) {
    const data = await res.json()
    tableRows.value = data.rows
  }
  loadingTable.value = false
}

watch(selectedTable, loadTable)

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  connectWS()
  captureConsole()
  loadTables()
})

onUnmounted(() => {
  ws?.close()
  if (reconnectTimer)
    clearTimeout(reconnectTimer)
  console.log = savedConsole.log
  console.warn = savedConsole.warn
  console.error = savedConsole.error
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTs(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function levelClass(level: string) {
  if (level === 'error')
    return 'text-red-500'
  if (level === 'warn')
    return 'text-amber-500'
  if (level === 'ping')
    return 'text-green-500'
  return 'text-muted-foreground'
}

function cellValue(v: unknown) {
  if (v === null || v === undefined)
    return '—'
  if (v instanceof Date)
    return v.toLocaleString('zh-CN')
  if (typeof v === 'object')
    return JSON.stringify(v)
  return String(v)
}
</script>

<template>
  <div class="w-full flex flex-col h-screen">
    <!-- Header -->
    <div class="border-b px-4 py-3 flex items-center gap-4 shrink-0">
      <span class="font-bold">Admin</span>
      <div class="flex gap-1">
        <Button
          v-for="(label, key) in { backend: '服务端日志', frontend: '前端日志', events: '事件', database: '数据库' }"
          :key="key"
          :variant="tab === key ? 'default' : 'ghost'"
          size="sm"
          @click="tab = key as typeof tab"
        >
          {{ label }}
        </Button>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input v-model="autoScroll" type="checkbox" class="size-3">
          自动滚动
        </label>
        <Button
          v-if="tab === 'backend'"
          variant="outline"
          size="sm"
          @click="backendLogs = []"
        >
          清空
        </Button>
        <Button
          v-if="tab === 'frontend'"
          variant="outline"
          size="sm"
          @click="frontendLogs = []"
        >
          清空
        </Button>
        <Button
          v-if="tab === 'events'"
          variant="outline"
          size="sm"
          @click="eventEntries = []"
        >
          清空
        </Button>
      </div>
    </div>

    <!-- Backend logs -->
    <div
      v-show="tab === 'backend'"
      ref="backendLogEl"
      class="flex-1 overflow-y-auto font-mono text-xs p-3 space-y-0.5"
    >
      <div
        v-for="(entry, i) in backendLogs"
        :key="i"
        class="flex gap-2 leading-5"
      >
        <span class="text-muted-foreground shrink-0">{{ formatTs(entry.ts) }}</span>
        <span class="shrink-0 w-10 uppercase font-semibold" :class="levelClass(entry.level)">{{ entry.level }}</span>
        <span class="break-all whitespace-pre-wrap" :class="levelClass(entry.level)">{{ entry.message }}</span>
      </div>
      <div v-if="backendLogs.length === 0" class="text-muted-foreground py-4 text-center">
        等待日志…
      </div>
    </div>

    <!-- Frontend logs -->
    <div
      v-show="tab === 'frontend'"
      ref="frontendLogEl"
      class="flex-1 overflow-y-auto font-mono text-xs p-3 space-y-0.5"
    >
      <div
        v-for="(entry, i) in frontendLogs"
        :key="i"
        class="flex gap-2 leading-5"
      >
        <span class="text-muted-foreground shrink-0">{{ formatTs(entry.ts) }}</span>
        <span class="shrink-0 w-10 uppercase font-semibold" :class="levelClass(entry.level)">{{ entry.level }}</span>
        <span class="break-all whitespace-pre-wrap" :class="levelClass(entry.level)">{{ entry.message }}</span>
      </div>
      <div v-if="frontendLogs.length === 0" class="text-muted-foreground py-4 text-center">
        暂无前端日志
      </div>
    </div>

    <!-- Events -->
    <div
      v-show="tab === 'events'"
      ref="eventLogEl"
      class="flex-1 overflow-y-auto font-mono text-xs p-3 space-y-0.5"
    >
      <div
        v-for="(entry, i) in eventEntries"
        :key="i"
        class="flex gap-2 leading-5"
      >
        <span class="text-muted-foreground shrink-0">{{ formatTs(entry.timestamp) }}</span>
        <span class="shrink-0 text-blue-500 font-semibold">{{ entry.topic }}</span>
        <span class="break-all whitespace-pre-wrap text-muted-foreground">{{ JSON.stringify(entry.payload) }}</span>
      </div>
      <div v-if="eventEntries.length === 0" class="text-muted-foreground py-4 text-center">
        暂无事件
      </div>
    </div>

    <!-- Database -->
    <div v-show="tab === 'database'" class="flex-1 flex flex-col overflow-hidden">
      <div class="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <select
          v-model="selectedTable"
          class="text-sm border rounded px-2 py-1 bg-background"
        >
          <option v-for="t in tables" :key="t" :value="t">
            {{ t }}
          </option>
        </select>
        <Button size="sm" variant="outline" :disabled="loadingTable" @click="loadTable">
          <Spinner v-if="loadingTable" data-icon="inline-start" />
          刷新
        </Button>
        <span class="text-xs text-muted-foreground">{{ tableRows.length }} 条</span>
      </div>
      <div class="flex-1 overflow-auto">
        <table class="text-xs w-full border-collapse">
          <thead class="sticky top-0 bg-background border-b">
            <tr>
              <th
                v-for="col in tableColumns"
                :key="col"
                class="text-left px-3 py-2 font-medium text-muted-foreground border-r last:border-r-0 whitespace-nowrap"
              >
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in tableRows"
              :key="i"
              class="border-b hover:bg-muted/50"
            >
              <td
                v-for="col in tableColumns"
                :key="col"
                class="px-3 py-1.5 border-r last:border-r-0 max-w-60 truncate"
                :title="String(row[col] ?? '')"
              >
                {{ cellValue(row[col]) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="tableRows.length === 0 && !loadingTable" class="text-muted-foreground py-8 text-center text-sm">
          暂无数据
        </div>
      </div>
    </div>
  </div>
</template>
