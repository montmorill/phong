<script setup lang="ts">
import { Bell, Link, Palette, Quote, User } from 'lucide-vue-next'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Separator } from '@/components/ui/separator'
import SettingsBind from './settings/SettingsBind.vue'
import SettingsHitokoto from './settings/SettingsHitokoto.vue'
import SettingsNotifications from './settings/SettingsNotifications.vue'
import SettingsProfile from './settings/SettingsProfile.vue'
import SettingsTheme from './settings/SettingsTheme.vue'

const { t } = useI18n()

type Tab = 'profile' | 'theme' | 'bind' | 'notifications' | 'hitokoto'
const TABS: Tab[] = ['profile', 'theme', 'bind', 'notifications', 'hitokoto']

function getTabFromHash(): Tab {
  const hash = location.hash.slice(1) as Tab
  return TABS.includes(hash) ? hash : 'profile'
}

const activeTab = ref<Tab>(getTabFromHash())

function setTab(tab: Tab) {
  activeTab.value = tab
  history.replaceState(history.state, '', `#${tab}`)
}
</script>

<template>
  <div class="w-full max-w-3xl px-4 py-8 mb-auto">
    <h1 class="text-2xl font-bold mb-6">
      {{ t('settings.title') }}
    </h1>

    <div class="flex gap-6 flex-col sm:flex-row">
      <!-- Sidebar nav -->
      <nav class="flex sm:flex-col gap-1 sm:w-44 shrink-0 overflow-x-auto">
        <button
          v-for="tab in TABS"
          :key="tab"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors whitespace-nowrap cursor-pointer"
          :class="activeTab === tab ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50'"
          @click="setTab(tab)"
        >
          <User v-if="tab === 'profile'" class="size-4 shrink-0" />
          <Palette v-else-if="tab === 'theme'" class="size-4 shrink-0" />
          <Link v-else-if="tab === 'bind'" class="size-4 shrink-0" />
          <Bell v-else-if="tab === 'notifications'" class="size-4 shrink-0" />
          <Quote v-else-if="tab === 'hitokoto'" class="size-4 shrink-0" />
          {{ t(`settings.tabs.${tab}`) }}
        </button>
      </nav>

      <Separator class="sm:hidden" />
      <div class="hidden sm:block w-px bg-border shrink-0" />

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <Suspense v-if="activeTab === 'profile'">
          <SettingsProfile />
          <template #fallback>
            <div class="flex justify-center py-8">
              <div class="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            </div>
          </template>
        </Suspense>
        <SettingsTheme v-else-if="activeTab === 'theme'" />
        <SettingsBind v-else-if="activeTab === 'bind'" />
        <Suspense v-else-if="activeTab === 'notifications'">
          <SettingsNotifications />
          <template #fallback>
            <div class="flex justify-center py-8">
              <div class="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            </div>
          </template>
        </Suspense>
        <SettingsHitokoto v-else-if="activeTab === 'hitokoto'" />
      </div>
    </div>
  </div>
</template>
