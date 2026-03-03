import type { TString } from '@sinclair/typebox'
import type { Composer } from 'vue-i18n'
import { signupBody } from '@server/auth/model'
import { useI18n } from 'vue-i18n'

export type FieldValidator = (value: string) => string | undefined

const { username, nickname, password } = signupBody.properties

export function validateField({ t, te }: Composer, schema: TString, value: string, field?: string): string | undefined {
  const label = field ? t(`field.${field}.label`) : ''
  if (!value)
    return t('validation.required', { label })
  if (schema.minLength && value.length < schema.minLength)
    return t('validation.minLength', { label, min: schema.minLength })
  if (schema.maxLength && value.length > schema.maxLength)
    return t('validation.maxLength', { label, max: schema.maxLength })
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
    const key = `field.${field}.pattern`
    return field && te(key) ? t(key, { label }) : t('validation.pattern', { label })
  }
}

export function useValidators(composer: Composer = useI18n()) {
  return {
    username: value => validateField(composer, username, value, 'username'),
    nickname: value => validateField(composer, nickname, value, 'nickname'),
    password: value => validateField(composer, password, value, 'password'),
  } satisfies Record<string, FieldValidator>
}
