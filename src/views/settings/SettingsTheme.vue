<script setup lang="ts">
import { Check, Languages, Moon, Palette, Sun, SunMoon } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { applyTheme, getInitialLocale, getInitialTheme, LOCALE_STORAGE_KEY, LOCALES, THEME_STORAGE_KEY } from '@/lib/appearance'

const { t, locale } = useI18n({ useScope: 'global' })

const theme = ref(getInitialTheme())
const currentLocale = ref(getInitialLocale())

watch(theme, (mode) => {
  localStorage.setItem(THEME_STORAGE_KEY, mode)
  applyTheme(mode)
})

watch(currentLocale, (value) => {
  localStorage.setItem(LOCALE_STORAGE_KEY, value)
  locale.value = value
})
</script>

<template>
  <div class="space-y-8">
    <p class="text-sm text-muted-foreground">
      {{ t('settings.appearanceHint') }}
    </p>
    <section class="space-y-4">
      <div class="flex items-center gap-2 text-sm font-medium">
        <Palette class="size-4 text-muted-foreground" />
        <span>{{ t('settings.appearance.themeTitle') }}</span>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.appearance.themeDescription') }}
      </p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          v-for="mode in (['light', 'dark', 'system'] as const)"
          :key="mode"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors cursor-pointer"
          :class="theme === mode ? 'border-primary bg-muted' : 'border-border hover:bg-muted/50'"
          @click="theme = mode"
        >
          <Sun v-if="mode === 'light'" class="size-6" />
          <Moon v-else-if="mode === 'dark'" class="size-6" />
          <SunMoon v-else class="size-6" />
          <span class="text-sm font-medium">{{ t(`settings.theme.${mode}`) }}</span>
        </button>
      </div>
    </section>

    <section class="space-y-4">
      <div class="flex items-center gap-2 text-sm font-medium">
        <Languages class="size-4 text-muted-foreground" />
        <span>{{ t('settings.appearance.languageTitle') }}</span>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.appearance.languageDescription') }}
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="code in LOCALES"
          :key="code"
          class="flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer"
          :class="currentLocale === code ? 'border-primary bg-muted' : 'border-border hover:bg-muted/50'"
          @click="currentLocale = code"
        >
          <div class="flex items-center gap-3">
            <Languages class="size-4 text-muted-foreground" />
            <div>
              <div class="text-sm font-medium">{{ t(`settings.language.${code}`) }}</div>
              <div class="text-xs text-muted-foreground">{{ code }}</div>
            </div>
          </div>
          <Check v-if="currentLocale === code" class="size-4 text-primary" />
        </button>
      </div>
    </section>
  </div>
</template>
