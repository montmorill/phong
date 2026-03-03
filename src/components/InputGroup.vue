<script setup lang="ts">
import { Label } from '@/components/ui/label'

defineProps<{
  label: string
  error?: string
  dirty?: boolean
}>()
</script>

<template>
  <div class="space-y-2">
    <div class="flex justify-between items-end">
      <Label>
        {{ label }}<span v-if="dirty" class="text-destructive"> *</span>
      </Label>
      <div v-if="error" class="text-xs leading-none text-destructive">{{ error }}</div>
    </div>
    <div class="flex gap-2">
      <slot name="prepend" />
      <slot />
    </div>
  </div>
</template>
