<script setup lang="ts">
import { Bell, ChevronDown, Link, Moon, Palette, Sun, SunMoon, User } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Input from '@/components/Input.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { PROVIDERS, useAvatar } from '@/composables/avatar'
import { useFields } from '@/composables/useFields'
import { useValidators } from '@/composables/useValidators'
import { api, fetchUser, unreadCount, user } from '@/lib/api'

const { t } = useI18n()

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'profile' | 'theme' | 'bind' | 'notifications'
const TABS: Tab[] = ['profile', 'theme', 'bind', 'notifications']

function getTabFromHash(): Tab {
  const hash = location.hash.slice(1) as Tab
  return TABS.includes(hash) ? hash : 'profile'
}

const activeTab = ref<Tab>(getTabFromHash())

function setTab(tab: Tab) {
  activeTab.value = tab
  history.replaceState(null, '', `#${tab}`)
}

// ── Profile ───────────────────────────────────────────────────────────────────
const { nickname } = useValidators()
const { fields, hasErrors, isDirty } = useFields({
  username: { type: 'text', autocomplete: 'username', disabled: true, value: user.value?.username },
  nickname: { type: 'text', autocomplete: 'nickname', validate: nickname, value: user.value?.nickname },
})

const { avatarProvider, avatarValue, avatarUrl, avatarString } = useAvatar(user.value?.avatar)
const initialAvatarString = ref(avatarString.value)
const avatarDirty = computed(() => avatarString.value !== initialAvatarString.value)
const avatarError = computed(() =>
  avatarValue.value && !PROVIDERS[avatarProvider.value].validate(avatarValue.value)
    ? t(`field.avatar.${avatarProvider.value}.pattern`)
    : '',
)

const profileSaving = ref(false)
const profileSaved = ref(false)

async function saveProfile() {
  profileSaving.value = true
  profileSaved.value = false
  await api.me.patch({
    nickname: fields.nickname.value.value,
    avatar: avatarString.value,
  })
  await fetchUser()
  fields.nickname.initial = fields.nickname.value.value
  initialAvatarString.value = avatarString.value
  profileSaving.value = false
  profileSaved.value = true
  setTimeout(() => profileSaved.value = false, 2000)
}

// ── Theme ─────────────────────────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark' | 'system'
const theme = ref<ThemeMode>((localStorage.getItem('theme') as ThemeMode) ?? 'system')

function applyTheme(mode: ThemeMode) {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
  }
  else if (mode === 'light') {
    document.documentElement.classList.remove('dark')
  }
  else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  }
}

watch(theme, (mode) => {
  localStorage.setItem('theme', mode)
  applyTheme(mode)
})

// ── Bind ──────────────────────────────────────────────────────────────────────
const boundQQ = ref<string | null>(null)
const bindCode = ref('')
const requesting = ref(false)
const unbinding = ref(false)
const bindError = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  const { data } = await api.me.bindings.qq.get()
  if (data)
    boundQQ.value = data.qq ?? null
})

onUnmounted(() => stopPolling())

async function requestCode() {
  requesting.value = true
  bindError.value = ''
  try {
    const { data, error: err } = await api.me.bindings.qq.request.post(undefined)
    if (err || !data) {
      bindError.value = t('bind.requestFailed')
      return
    }
    bindCode.value = data.code
    startPolling()
  }
  catch {
    bindError.value = t('bind.requestFailed')
  }
  finally {
    requesting.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    const { data } = await api.me.bindings.qq.get()
    if (data?.qq) {
      boundQQ.value = data.qq
      bindCode.value = ''
      stopPolling()
    }
  }, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function cancelBind() {
  bindCode.value = ''
  bindError.value = ''
  stopPolling()
}

async function unbind() {
  unbinding.value = true
  bindError.value = ''
  try {
    await api.me.bindings.qq.delete()
    boundQQ.value = null
  }
  catch {
    bindError.value = t('bind.unbindFailed')
  }
  finally {
    unbinding.value = false
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────
const markingAllRead = ref(false)
const allMarked = ref(false)

async function markAllRead() {
  markingAllRead.value = true
  await api.notifications.read.post()
  unreadCount.value = 0
  markingAllRead.value = false
  allMarked.value = true
}

type NotifType = 'like' | 'reply' | 'post'
const NOTIF_TYPES: NotifType[] = ['like', 'reply', 'post']

const notifPrefs = ref<Record<NotifType, boolean>>({ like: true, reply: true, post: true })

onMounted(async () => {
  const { data } = await api.me['notification-prefs'].get()
  if (data)
    notifPrefs.value = data as Record<NotifType, boolean>
  // Start watching only after initial load, so the assignment above doesn't trigger a PATCH
  watch(notifPrefs, prefs => api.me['notification-prefs'].patch(prefs), { deep: true })
})
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
          {{ t(`settings.tabs.${tab}`) }}
        </button>
      </nav>

      <Separator class="sm:hidden" />
      <div class="hidden sm:block w-px bg-border shrink-0" />

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <!-- Profile Tab -->
        <div v-if="activeTab === 'profile'" class="space-y-4">
          <div class="flex justify-center mb-2">
            <Avatar class="size-20 border">
              <AvatarImage :src="avatarUrl" :alt="user?.username" />
              <AvatarFallback>{{ user?.nickname?.slice(0, 2) }}</AvatarFallback>
            </Avatar>
          </div>

          <Input
            v-for="field, key in fields"
            :id="key" :key="key" v-bind="field"
            v-model:value="field.value.value"
            v-model:error="field.error.value"
            :label="$t(`field.${key}.label`)"
            :placeholder="$t(`field.${key}.placeholder`)"
            :dirty="!field.disabled && field.value.value !== field.initial"
            optional
          />

          <Input
            id="avatar"
            v-model:value="avatarValue"
            :label="$t('field.avatar.label')"
            :error="avatarError"
            :dirty="avatarDirty"
            :inputmode="PROVIDERS[avatarProvider].inputmode"
            :placeholder="$t(`field.avatar.${avatarProvider}.placeholder`)"
            optional
          >
            <template #prepend>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="outline" class="shrink-0 gap-1">
                    {{ t(`field.avatar.${avatarProvider}.label`) }}
                    <ChevronDown class="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup v-model="avatarProvider">
                    <DropdownMenuRadioItem
                      v-for="provider in Object.keys(PROVIDERS)"
                      :key="provider" :value="provider"
                    >
                      {{ t(`field.avatar.${provider}.label`) }}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </template>
          </Input>

          <Button
            class="w-full"
            :disabled="!(isDirty || avatarDirty) || hasErrors || !!avatarError || profileSaving"
            @click="saveProfile"
          >
            <Spinner v-if="profileSaving" data-icon="inline-start" />
            {{ profileSaved ? t('profile.saved') : profileSaving ? t('profile.saving') : t('profile.save') }}
          </Button>
        </div>

        <!-- Theme Tab -->
        <div v-else-if="activeTab === 'theme'" class="space-y-4">
          <p class="text-sm text-muted-foreground">
            {{ t('settings.themeHint') }}
          </p>
          <div class="grid grid-cols-3 gap-3">
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
        </div>

        <!-- Bind Tab -->
        <div v-else-if="activeTab === 'bind'" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-base flex items-center justify-between">
                {{ t('bind.qq') }}
                <span v-if="boundQQ" class="text-xs font-normal text-green-600 dark:text-green-400">
                  {{ t('bind.bound') }}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <Alert v-if="bindError" variant="destructive">
                <AlertDescription>{{ bindError }}</AlertDescription>
              </Alert>

              <template v-if="boundQQ">
                <p class="text-sm text-muted-foreground">
                  {{ t('bind.currentQQ') }}<strong>{{ boundQQ }}</strong>
                </p>
                <Button variant="outline" class="w-full" :disabled="unbinding" @click="unbind">
                  <Spinner v-if="unbinding" data-icon="inline-start" />
                  {{ t('bind.unbind') }}
                </Button>
              </template>

              <template v-else-if="!bindCode">
                <p class="text-sm text-muted-foreground">
                  {{ t('bind.intro') }}
                </p>
                <Button class="w-full" :disabled="requesting" @click="requestCode">
                  <Spinner v-if="requesting" data-icon="inline-start" />
                  {{ t('bind.getCode') }}
                </Button>
              </template>

              <template v-else>
                <p class="text-sm text-muted-foreground">
                  {{ t('bind.codeHint') }}
                </p>
                <div class="rounded-md bg-muted px-4 py-3 text-center">
                  <span class="text-2xl font-mono font-bold tracking-widest">{{ bindCode }}</span>
                </div>
                <p class="text-xs text-muted-foreground text-center">
                  {{ t('bind.waitingHint') }}
                </p>
                <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Spinner class="size-3" />
                  {{ t('bind.polling') }}
                </div>
                <Button variant="outline" class="w-full" @click="cancelBind">
                  {{ t('bind.cancel') }}
                </Button>
              </template>
            </CardContent>
          </Card>
        </div>

        <!-- Notifications Tab -->
        <div v-else-if="activeTab === 'notifications'" class="space-y-4">
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

          <Card>
            <CardHeader>
              <CardTitle class="text-base">{{ t('settings.notifications.inbox') }}</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <p class="text-sm text-muted-foreground">
                {{ t('settings.notifications.markAllReadHint') }}
              </p>
              <Button
                variant="outline"
                class="w-full"
                :disabled="markingAllRead || allMarked"
                @click="markAllRead"
              >
                <Spinner v-if="markingAllRead" data-icon="inline-start" />
                {{ allMarked ? t('settings.notifications.markAllReadDone') : t('settings.notifications.markAllRead') }}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
