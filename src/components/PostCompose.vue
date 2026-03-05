<script setup lang="ts">
import { createPostBody } from 'server/modules/posts/model'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { validateField } from '@/composables/useValidators'
import { api } from '@/lib/api'

const emit = defineEmits<{ posted: [] }>()

const composer = useI18n()
const { t } = composer

const title = ref('')
const content = ref('')
const submitting = ref(false)
const serverError = ref('')

const titleMaxLength = createPostBody.properties.title.maxLength!
const titleSchema = createPostBody.properties.title
const maxLength = createPostBody.properties.content.maxLength!
const contentSchema = createPostBody.properties.content

const titleError = computed(() =>
  title.value ? validateField(composer, titleSchema, title.value, 'post.title') : undefined,
)
const contentError = computed(() =>
  content.value ? validateField(composer, contentSchema, content.value, 'post.content') : undefined,
)

async function submit() {
  if (!content.value || contentError.value || titleError.value)
    return
  submitting.value = true
  serverError.value = ''
  const { error } = await api.posts.post({
    title: title.value.trim() || undefined,
    content: content.value.trim(),
  })
  submitting.value = false
  if (error) {
    serverError.value = t('post.errors.postFailed')
    return
  }
  title.value = ''
  content.value = ''
  emit('posted')
}
</script>

<template>
  <Card>
    <CardContent class="px-4 pt-4 pb-3 space-y-3">
      <Input
        v-model="title"
        :placeholder="t('field.post.title.placeholder')"
        :maxlength="titleMaxLength"
        class="border-none px-0 shadow-none focus-visible:ring-0 font-medium"
      />
      <Separator />
      <Textarea
        v-model="content"
        :placeholder="t('post.compose.placeholder')"
        :maxlength="maxLength"
        class="border-none px-0 resize-none shadow-none focus-visible:ring-0 min-h-18"
      />
    </CardContent>
    <CardFooter class="px-4 pt-3 pb-4 justify-between">
      <span
        class="text-xs text-muted-foreground select-none"
        :class="{ 'text-destructive': contentError }"
      >
        {{ content.length }}/{{ maxLength }}
      </span>
      <Button
        size="sm"
        :disabled="!content || !!contentError || submitting"
        @click="submit"
      >
        <Spinner v-if="submitting" data-icon="inline-start" />
        {{ t('post.compose.submit') }}
      </Button>
    </CardFooter>
    <p v-if="serverError" class="px-4 pb-3 text-sm text-destructive">
      {{ serverError }}
    </p>
  </Card>
</template>
