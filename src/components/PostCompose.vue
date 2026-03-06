<script setup lang="ts">
import { createPostBody } from '@server/posts/model'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import UserAvatar from '@/components/UserAvatar.vue'
import { validateField } from '@/composables/useValidators'
import { api, user } from '@/lib/api'

const props = defineProps<{
  parentId?: number
  replyTo?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  posted: []
  cancel: []
}>()

const composer = useI18n()
const { t } = composer

const maxLength = createPostBody.properties.content.maxLength!
const titleMaxLength = createPostBody.properties.title.maxLength!
const contentSchema = createPostBody.properties.content
const titleSchema = createPostBody.properties.title

const title = ref('')
const content = ref('')
const submitting = ref(false)
const serverError = ref('')

const titleError = computed(() =>
  title.value ? validateField(composer, titleSchema, title.value, 'post.title') : undefined,
)
const contentError = computed(() =>
  content.value ? validateField(composer, contentSchema, content.value, 'post.content') : undefined,
)

const textareaRef = ref<{ $el: HTMLTextAreaElement } | null>(null)

function autoResize() {
  const el = textareaRef.value?.$el
  if (!el)
    return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

watch(content, async () => {
  await nextTick()
  autoResize()
})

async function submit() {
  if (!content.value.trim() || contentError.value)
    return
  if (!props.parentId && titleError.value)
    return
  submitting.value = true
  serverError.value = ''
  const { error } = props.parentId
    ? await api.posts({ id: props.parentId }).reply.post({ content: content.value.trim() })
    : await api.posts.post({ title: title.value.trim() || undefined, content: content.value.trim() })
  submitting.value = false
  if (error) {
    serverError.value = t('post.errors.postFailed')
    return
  }
  title.value = ''
  content.value = ''
  emit('posted')
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.parentId)
    return
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
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
  <div class="px-4 pt-3 pb-3 border rounded-xl bg-card">
    <div class="flex items-center gap-2 mb-2">
      <UserAvatar
        v-if="user"
        :username="user.username"
        :nickname="user.nickname"
        :avatar="user.avatar"
        size="size-7"
      />
      <span v-if="user" class="font-bold text-sm">{{ user.nickname }}</span>
      <span v-if="replyTo" class="text-xs text-muted-foreground">
        {{ t('post.replyTo', { nickname: replyTo }) }}
      </span>
    </div>

    <div class="min-w-0">
      <Input
        v-if="!parentId"
        v-model="title"
        :placeholder="t('field.post.title.placeholder')"
        :maxlength="titleMaxLength"
        class="border-none px-0 shadow-none focus-visible:ring-0 font-bold text-base"
      />

      <Textarea
        ref="textareaRef"
        v-model="content"
        :placeholder="placeholder ?? (parentId ? t('post.reply.placeholder') : t('post.compose.placeholder'))"
        :maxlength="maxLength"
        class="border-none px-0 resize-none shadow-none focus-visible:ring-0 text-base mt-1 overflow-hidden"
        style="min-height: 4.5rem"
        @keydown="handleKeydown"
      />

      <div class="flex items-center justify-between pt-3 border-t mt-1">
        <span
          class="text-sm text-muted-foreground select-none"
          :class="{ 'text-destructive': contentError }"
        >
          {{ content.length }}/{{ maxLength }}
        </span>
        <div class="flex items-center gap-2">
          <Button
            v-if="parentId"
            variant="ghost"
            size="sm"
            class="rounded-full"
            @click="emit('cancel')"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            class="rounded-full font-bold px-5"
            size="sm"
            :disabled="!content.trim() || !!contentError || submitting"
            @click="submit"
          >
            <Spinner v-if="submitting" data-icon="inline-start" />
            {{ parentId ? t('post.reply.submit') : t('post.compose.submit') }}
          </Button>
        </div>
      </div>
      <p v-if="serverError" class="text-sm text-destructive mt-2">
        {{ serverError }}
      </p>
    </div>
  </div>
</template>
