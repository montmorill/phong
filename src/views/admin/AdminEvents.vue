<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue'

const props = defineProps<{
  entries: EventEntry[]
  autoScroll: boolean
}>()

const { t } = useI18n()

export interface EventEntry { topic: string, payload: unknown, timestamp: number }

const logEl = ref<HTMLElement | null>(null)

watch(() => props.entries.length, () => {
  if (props.autoScroll)
    nextTick(() => logEl.value?.scrollTo(0, logEl.value.scrollHeight))
})
</script>

<template>
  <ScrollArea ref="logEl" class="flex-1 font-mono text-xs p-3 space-y-0.5">
    <div
      v-for="(entry, index) in entries"
      :key="index"
      class="flex gap-2 leading-5"
    >
      <span class="text-muted-foreground shrink-0">{{ t('time', entry.timestamp) }}</span>
      <span class="shrink-0 text-blue-500 font-semibold">{{ entry.topic }}</span>
      <span class="break-all whitespace-pre-wrap text-muted-foreground">{{ JSON.stringify(entry.payload) }}</span>
    </div>
    <div v-if="entries.length === 0" class="text-muted-foreground py-4 text-center">
      暂无事件
    </div>
  </ScrollArea>
</template>
