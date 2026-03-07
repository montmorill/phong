<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ScrollArea } from '@/components/ui/scroll-area'

const props = defineProps<{
  logs: LogEntry[]
  autoScroll: boolean
  emptyText: string
}>()

const { t } = useI18n()

export interface LogEntry { level: string, message: string, timestamp: number }

const logEl = ref<HTMLElement | null>(null)

const LEVEL_CLASS: Record<string, string> = {
  error: 'text-red-400',
  warn: 'text-amber-400',
  info: 'text-sky-400',
  log: 'text-foreground',
  debug: 'text-zinc-400',
  trace: 'text-muted-foreground',
}

function levelClass(level: string) {
  return LEVEL_CLASS[level] ?? 'text-muted-foreground'
}

watch(() => props.logs.length, () => {
  if (props.autoScroll)
    nextTick(() => logEl.value?.scrollTo(0, logEl.value.scrollHeight))
})
</script>

<template>
  <ScrollArea ref="logEl" class="flex-1 font-mono text-xs p-3 space-y-0.5">
    <div
      v-for="(entry, i) in logs"
      :key="i"
      class="flex gap-2 leading-5"
    >
      <span class="text-muted-foreground shrink-0">{{ t('time', entry.timestamp) }}</span>
      <span class="shrink-0 w-8 uppercase font-semibold" :class="levelClass(entry.level)">{{ entry.level }}</span>
      <span class="break-all whitespace-pre-wrap" :class="levelClass(entry.level)">{{ entry.message }}</span>
    </div>
    <div v-if="logs.length === 0" class="text-muted-foreground py-4 text-center">
      {{ emptyText }}
    </div>
  </ScrollArea>
</template>
