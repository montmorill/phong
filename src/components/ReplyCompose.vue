<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

defineProps<{
  maxLength: number
  submitting?: boolean
  serverError?: string
  replyTo?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const content = defineModel<string>({ default: '' })
const { t } = useI18n()

const textareaRef = ref<{ $el: HTMLTextAreaElement } | null>(null)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('submit')
  }
  if (e.key === 'Escape')
    emit('cancel')
}

function focus() {
  textareaRef.value?.$el?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="border rounded-lg px-3 pt-2 pb-3 space-y-2">
    <p v-if="replyTo" class="text-xs text-muted-foreground">
      @{{ replyTo }}
    </p>
    <Textarea
      ref="textareaRef"
      v-model="content"
      :placeholder="placeholder"
      :maxlength="maxLength"
      class="border-none px-0 resize-none shadow-none focus-visible:ring-0 min-h-16"
      @keydown="handleKeydown"
    />
    <div class="flex justify-between items-center">
      <span
        class="text-xs text-muted-foreground"
        :class="{ 'text-destructive': content.length >= maxLength }"
      >
        {{ content.length }}/{{ maxLength }}
      </span>
      <div class="flex gap-2">
        <Button variant="ghost" size="sm" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </Button>
        <Button size="sm" :disabled="!content.trim() || submitting" @click="emit('submit')">
          <Spinner v-if="submitting" data-icon="inline-start" />
          {{ t('post.reply.submit') }}
        </Button>
      </div>
    </div>
    <p v-if="serverError" class="text-sm text-destructive">
      {{ serverError }}
    </p>
  </div>
</template>
