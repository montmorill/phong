<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'

const { t } = useI18n()

type NotifType = 'like' | 'reply' | 'post' | 'mail'
const NOTIF_TYPES: NotifType[] = ['like', 'reply', 'post', 'mail']

const notifPrefs = ref<Record<NotifType, boolean> | null>(null)

const { data } = await api.me['notification-prefs'].get()
if (data)
  notifPrefs.value = data

watch(notifPrefs, (prefs) => {
  if (prefs)
    api.me['notification-prefs'].patch({ ...prefs })
}, { deep: true })
</script>

<template>
  <div v-if="notifPrefs" class="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle class="text-base">{{ t('settings.notifications.subscribe') }}</CardTitle>
      </CardHeader>
      <CardContent class="divide-y">
        <div
          v-for="type in NOTIF_TYPES"
          :key="type"
          class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
        >
          <div>
            <p class="text-sm font-medium">{{ t(`settings.notifications.type.${type}.label`) }}</p>
            <p class="text-xs text-muted-foreground">{{ t(`settings.notifications.type.${type}.desc`) }}</p>
          </div>
          <Switch v-model="notifPrefs[type]" />
        </div>
      </CardContent>
    </Card>
  </div>
</template>
