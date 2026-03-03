<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import FormField from '@/components/FormField.vue'
import FormPage from '@/components/FormPage.vue'
import { useFormFields } from '@/composables/useFormFields'
import { useValidators } from '@/composables/useValidators'
import { api, fetchUser, setToken } from '@/lib/api'

const { t, te } = useI18n()
const router = useRouter()
const { username, nickname, password } = useValidators()

const { fields, filled, hasErrors } = useFormFields({
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
  <FormPage
    :title="t('signup.title')"
    :submit-text="t('signup.submit')"
    :submitting-text="t('signup.submitting')"
    :disabled="!filled || hasErrors"
    :submit="handleSubmit"
  >
    <FormField
      v-for="field, key in fields"
      :id="key" :key="key" v-bind="field"
      v-model:value="field.value.value"
      v-model:error="field.error.value"
      :label="t(`field.${key}.label`)"
      :placeholder="t(`field.${key}.placeholder`)"
    />

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
