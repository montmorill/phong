<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import FormField from '@/components/FormField.vue'
import FormPage from '@/components/FormPage.vue'
import { useFormFields } from '@/composables/useFormFields'
import { useValidators } from '@/composables/useValidators'
import { api, fetchUser, setToken } from '@/lib/api'

const router = useRouter()
const { t, te } = useI18n()
const { username, password } = useValidators()
const { fields, filled, hasErrors } = useFormFields({
  username: { type: 'text', autocomplete: 'username', validate: username },
  password: { type: 'password', autocomplete: 'current-password', validate: password },
})

async function handleSubmit(): Promise<string | void> {
  const { data, error } = await api.login.post({
    username: fields.username.value.value,
    password: fields.password.value.value,
  })

  if (error) {
    const key = error.value?.message
    return key && te(key) ? t(key) : t('error.loginFailed')
  }

  setToken(data.token)
  await fetchUser()
  router.push('/')
}
</script>

<template>
  <FormPage
    :title="t('login.title')"
    :submit-text="t('login.submit')"
    :submitting-text="t('login.submitting')"
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
        {{ t('login.noAccount') }}
        <RouterLink to="/signup" class="text-foreground underline underline-offset-4 hover:text-primary">
          {{ t('login.signupLink') }}
        </RouterLink>
      </p>
    </template>
  </FormPage>
</template>
