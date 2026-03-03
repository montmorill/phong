<script setup lang="ts">
import type { FieldValidator } from '@/composables/useValidators'
import { watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const { validate } = defineProps<{
  id: string
  label: string
  optional?: boolean
  disabled?: boolean
  dirty?: boolean
  validate?: FieldValidator
}>()

const modelValue = defineModel<string>('value')
const validationError = defineModel<string>('error')

watch(() => modelValue.value, (newValue) => {
  validationError.value = validate?.(newValue || '') || ''
})
</script>

<template>
  <div class="space-y-2">
    <div class="flex justify-between items-end">
      <Label :for="id">
        {{ label }}
        <span v-if="!optional || dirty" class="text-destructive">*</span>
      </Label>
      <div v-if="validationError" class="text-xs leading-none text-destructive">
        {{ validationError }}
      </div>
    </div>
    <Input
      :id="id"
      v-bind="$attrs"
      spellcheck="false"
      :required="!optional"
      :class="validationError && 'border-destructive'"
      :disabled="disabled"
      :model-value="modelValue"
      @update:model-value="modelValue = $event as string"
    />
  </div>
</template>
