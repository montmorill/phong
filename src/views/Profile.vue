<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormField from '@/components/FormField.vue'
import FormPage from '@/components/FormPage.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PROVIDERS, useAvatar } from '@/composables/avatar'
import { useFormFields } from '@/composables/useFormFields'
import { useValidators } from '@/composables/useValidators'
import { api, fetchUser, user } from '@/lib/api'

const { t } = useI18n()

const { avatarProvider, avatarValue, avatarUrl, avatarString } = useAvatar(user.value?.avatar)

const { nickname } = useValidators()
const { fields, filled, hasErrors, isDirty: fieldsDirty } = useFormFields({
  username: { type: 'text', autocomplete: 'username', disabled: true, value: user.value?.username },
  nickname: { type: 'text', autocomplete: 'nickname', validate: nickname, value: user.value?.nickname },
})

const initialAvatarString = avatarString.value
const avatarDirty = computed(() => avatarString.value !== initialAvatarString)
const isDirty = computed(() => fieldsDirty.value || avatarDirty.value)
const avatarError = computed(() =>
  avatarValue.value && !PROVIDERS[avatarProvider.value].validate(avatarValue.value)
    ? t(`field.avatar.${avatarProvider.value}.pattern`)
    : '',
)

async function handleSubmit(): Promise<string | void> {
  await api.me.patch({
    nickname: fields.nickname.value.value,
    avatar: avatarString.value,
  })
  await fetchUser()
}
</script>

<template>
  <FormPage
    :title="$t('profile.title')"
    :submit-text="$t('profile.save')"
    :submitting-text="$t('profile.saving')"
    :disabled="!filled || hasErrors || !!avatarError || !isDirty"
    :submit="handleSubmit"
  >
    <div class="flex justify-center mb-2">
      <Avatar class="size-20 border">
        <AvatarImage :src="avatarUrl" :alt="user?.username" />
        <AvatarFallback>{{ user?.nickname?.slice(0, 2) }}</AvatarFallback>
      </Avatar>
    </div>

    <FormField
      v-for="field, key in fields"
      :id="key" :key="key" v-bind="field"
      v-model:value="field.value.value"
      v-model:error="field.error.value"
      :label="$t(`field.${key}.label`)"
      :placeholder="$t(`field.${key}.placeholder`)"
      :dirty="!field.disabled && field.value.value !== field.initial"
    />

    <div class="space-y-2">
      <div class="flex justify-between items-end">
        <Label>{{ $t('field.avatar.label') }}<span v-if="avatarDirty" class="text-destructive"> *</span></Label>
        <div v-if="avatarError" class="text-xs leading-none text-destructive">{{ avatarError }}</div>
      </div>
      <div class="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="shrink-0 gap-1">
              {{ $t(`field.avatar.${avatarProvider}.label`) }}
              <ChevronDown class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup v-model="avatarProvider">
              <DropdownMenuRadioItem
                v-for="provider in Object.keys(PROVIDERS)"
                :key="provider"
                :value="provider"
                @select="avatarValue = ''"
              >
                {{ $t(`field.avatar.${provider}.label`) }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          v-model="avatarValue"
          :inputmode="PROVIDERS[avatarProvider].inputmode"
          :placeholder="$t(`field.avatar.${avatarProvider}.placeholder`)"
          :class="avatarError && 'border-destructive'"
          spellcheck="false"
        />
      </div>
    </div>
  </FormPage>
</template>
