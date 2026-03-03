<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Input from '@/components/Input.vue'
import FormPage from '@/components/FormPage.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useFields } from '@/composables/useFields'
import { useValidators } from '@/composables/useValidators'
import { api, fetchUser, setToken } from '@/lib/api'

const { t, te } = useI18n()
const router = useRouter()
const { username, nickname, password } = useValidators()

const { fields, filled, hasErrors } = useFields({
  username: { type: 'text', autocomplete: 'username', validate: username },
  nickname: { type: 'text', autocomplete: 'nickname', validate: nickname },
  password: { type: 'password', autocomplete: 'new-password', validate: password },
  confirmPassword: { type: 'password', autocomplete: 'new-password', validate: validateConfirmPassword },
})

function validateConfirmPassword(value: string) {
  if (!value)
    return t('validation.required')
  if (value !== fields.password.value.value)
    return t('field.confirmPassword.mismatch')
  return ''
}

async function handleSubmit(): Promise<string | void> {
  const { data, error } = await api.signup.post({
    username: fields.username.value.value,
    nickname: fields.nickname.value.value,
    password: fields.password.value.value,
  })

  if (error) {
    const key = error.value?.message
    return key && te(key) ? t(key) : t('error.signupFailed')
  }

  setToken(data.token)
  await fetchUser()
  router.push('/')
}
</script>

<template>
  <FormPage :title="t('signup.title')" :submit="handleSubmit">
    <Input
      v-for="field, key in fields"
      :id="key" :key="key" v-bind="field"
      v-model:value="field.value.value"
      v-model:error="field.error.value"
      :label="t(`field.${key}.label`)"
      :placeholder="t(`field.${key}.placeholder`)"
    />

    <template #submit="{ loading }">
      <Button type="submit" class="w-full" :disabled="!filled || hasErrors || loading">
        <Spinner v-if="loading" data-icon="inline-start" />
        {{ loading ? t('signup.submitting') : t('signup.submit') }}
      </Button>
    </template>

    <template #footer>
      <p class="text-center text-sm text-muted-foreground">
        {{ t('signup.hasAccount') }}
        <RouterLink to="/login" class="text-foreground underline underline-offset-4 hover:text-primary">
          {{ t('signup.loginLink') }}
        </RouterLink>
      </p>
    </template>
  </FormPage>
</template>
