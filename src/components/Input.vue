<script setup lang="ts">
import type { FieldValidator } from '@/composables/useValidators'
import { watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const { validate } = defineProps<{
  id: string
  label: string
  disabled?: boolean
  optional?: boolean
  dirty?: boolean
  validate?: FieldValidator
  error?: string
}>()

const modelValue = defineModel<string>('value')
const emit = defineEmits<{ 'update:error': [string] }>()

watch(() => modelValue.value, (newValue) => {
  emit('update:error', validate?.(newValue || '') || '')
})
</script>

<template>
  <div class="space-y-2">
    <div class="flex justify-between items-end">
      <Label :for="id">
        {{ label }}
        <span v-if="!optional || dirty" class="text-destructive">*</span>
      </Label>
      <div v-if="error" class="text-xs leading-none text-destructive">
        {{ error }}
      </div>
    </div>
    <div class="flex gap-2">
      <slot name="prepend" />
      <Input
        :id="id"
        v-bind="$attrs"
        spellcheck="false"
        :required="!optional"
        :class="error && 'border-destructive'"
        :disabled="disabled"
        :model-value="modelValue"
        @update:model-value="modelValue = $event as string"
      />
    </div>
  </div>
</template>
