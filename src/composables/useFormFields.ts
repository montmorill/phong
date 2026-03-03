import type { HTMLAttributes, InputAutoCompleteAttribute, InputTypeHTMLAttribute, Ref } from 'vue'
import type { FieldValidator } from '@/composables/useValidators'
import { computed, ref } from 'vue'

interface FieldOptions {
  type?: InputTypeHTMLAttribute
  autocomplete?: InputAutoCompleteAttribute
  inputmode?: HTMLAttributes['inputmode']
  validate?: FieldValidator
  optional?: boolean
  disabled?: boolean
  value?: string
}

export interface Field extends Omit<FieldOptions, 'value'> {
  initial: string
  value: Ref<string>
  error: Ref<string>
}

export function useFormFields<const T extends Record<string, FieldOptions>>(configs: T) {
  const fields = Object.fromEntries(
    Object.entries(configs).map(([key, config]) => [
      key,
      {
        ...config,
        initial: config.value ?? '',
        value: ref(config.value ?? ''),
        error: ref(''),
      },
    ]),
  ) as { [K in keyof T]: Field }

  const filled = computed(() =>
    Object.values(fields).every(f => f.optional || f.disabled || Boolean(f.value.value)),
  )
  const hasErrors = computed(() =>
    Object.values(fields).some(f => Boolean(f.error.value)),
  )
  const isDirty = computed(() =>
    Object.values(fields).some(f => !f.disabled && f.value.value !== f.initial),
  )

  return { fields, filled, hasErrors, isDirty }
}
