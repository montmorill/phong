<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Input from '@/components/Input.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { PROVIDERS, useAvatar } from '@/composables/useAvatar'
import { useFields } from '@/composables/useFields'
import { useValidators } from '@/composables/useValidators'
import { api, fetchUser, TOKEN, user } from '@/lib/api'

const { data: gravatarStatus } = await api.me.gravatar.get()
const gravatarConnected = ref(gravatarStatus?.connected ?? false)
const gravatarAuthorizeUrl = ref(gravatarStatus?.authorizeUrl ?? '')
const gravatarError = ref('')

async function connectGravatar() {
  gravatarError.value = ''
  const popup = window.open(gravatarAuthorizeUrl.value, 'gravatar-oauth', 'width=600,height=700')
  const code = await new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), 5 * 60 * 1000)
    window.addEventListener('message', function handler(e) {
      if (e.origin === location.origin && e.data?.type === 'gravatar:code') {
        clearTimeout(timer)
        window.removeEventListener('message', handler)
        resolve(e.data.code)
      }
    })
  })
  popup?.close()
  if (!code) {
    gravatarError.value = 'Authorization cancelled or timed out'
    return
  }
  const { error } = await api.me.gravatar.connect.post({ code })
  if (error) {
    gravatarError.value = (error.value as any)?.message ?? 'Failed to connect Gravatar'
    return
  }
  gravatarConnected.value = true
}

const { t } = useI18n()

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
watch(avatarProvider, () => {
  avatarValue.value = ''
})

const avatarUploading = ref(false)
const fileInput = ref<HTMLInputElement>()

async function onAvatarFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file)
    return
  avatarUploading.value = true
  const form = new FormData()
  form.append('image', file)
  await fetch('/api/me/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN.value}` },
    body: form,
  })
  await fetchUser()
  avatarUploading.value = false
}

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
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-center mb-2">
      <button type="button" class="relative group leading-0" @click="fileInput?.click()">
        <Avatar class="size-20 border">
          <AvatarImage :src="avatarUrl" :alt="user?.username" />
          <AvatarFallback>{{ user?.nickname?.slice(0, 2) }}</AvatarFallback>
        </Avatar>
        <div class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Spinner v-if="avatarUploading" class="text-white" />
          <span v-else class="text-white text-xs">{{ $t('profile.uploadAvatar') }}</span>
        </div>
      </button>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onAvatarFileChange">
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
      variant="outline"
      class="w-full"
      :disabled="gravatarConnected"
      @click="connectGravatar"
    >
      {{ gravatarConnected ? $t('profile.gravatarConnected') : $t('profile.connectGravatar') }}
    </Button>
    <p v-if="gravatarError" class="text-sm text-destructive">{{ gravatarError }}</p>

    <Button
      class="w-full"
      :disabled="!(isDirty || avatarDirty) || hasErrors || !!avatarError || profileSaving"
      @click="saveProfile"
    >
      <Spinner v-if="profileSaving" data-icon="inline-start" />
      {{ profileSaved ? t('profile.saved') : profileSaving ? t('profile.saving') : t('profile.save') }}
    </Button>
  </div>
</template>
