<script setup lang="ts">
import DOMPurify from 'dompurify'
import { ChevronLeft, Mail, Reply, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { api, fetchUnreadCount } from '@/lib/api'

interface MailItem {
  id: number
  fromAddress: string
  subject: string
  html: string
  text: string
  createdAt: string | number | Date
}

const props = defineProps<{ id: number }>()

const { t, d } = useI18n()
const router = useRouter()

const mail = ref<MailItem | null>(null)
const loading = ref(true)
const notFound = ref(false)
const deleting = ref(false)

const safeHtml = computed(() => mail.value?.html ? DOMPurify.sanitize(mail.value.html) : '')
const mailDate = computed(() => mail.value ? new Date(mail.value.createdAt) : null)
const replyUsername = computed(() => mail.value?.fromAddress.split('@')[0] ?? '')
const replySubject = computed(() => {
  const value = mail.value?.subject.trim() ?? ''
  if (!value)
    return ''
  return /^re:/i.test(value) ? value : `Re: ${value}`
})

async function load() {
  loading.value = true
  notFound.value = false
  const { data } = await (api.mail({ id: props.id }) as any).get()
  loading.value = false

  if (!data) {
    notFound.value = true
    mail.value = null
    return
  }

  mail.value = data as MailItem
  await fetchUnreadCount()
}

async function deleteMail() {
  if (!mail.value)
    return

  deleting.value = true
  await (api.mail({ id: mail.value.id }) as any).delete()
  await fetchUnreadCount()
  deleting.value = false
  router.push('/inbox')
}

function replyMail() {
  if (!replyUsername.value)
    return

  router.push({
    path: '/mail/compose',
    query: {
      to: replyUsername.value,
      subject: replySubject.value,
    },
  })
}

onMounted(load)
watch(() => props.id, load)
</script>

<template>
  <div class="w-full mb-auto max-w-2xl px-4 py-8 space-y-4">
    <Button variant="ghost" size="sm" class="gap-1 -ml-2 text-muted-foreground" @click="router.back()">
      <ChevronLeft class="size-4" />
      {{ t('common.back') }}
    </Button>

    <div v-if="loading" class="flex justify-center py-8">
      <Spinner />
    </div>
    <div v-else-if="notFound" class="text-center text-muted-foreground py-8">
      {{ t('mail.notFound') }}
    </div>
    <div v-else-if="mail" class="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      <div class="flex items-start gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Mail class="size-5" />
        </div>
        <div class="min-w-0 flex-1 space-y-1">
          <h1 class="text-xl font-semibold break-words">
            {{ mail.subject || t('mail.noSubject') }}
          </h1>
          <p class="text-sm text-muted-foreground break-all">
            {{ t('mail.from') }}{{ mail.fromAddress }}
          </p>
          <p v-if="mailDate" class="text-xs text-muted-foreground">
            {{ t('mail.receivedAt') }}{{ d(mailDate, 'long') }}
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" class="gap-1.5" @click="replyMail">
            <Reply class="size-4" />
            {{ t('mail.reply') }}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger as-child>
              <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive hover:bg-destructive/10" :disabled="deleting">
                <Trash2 class="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{{ t('mail.deleteConfirm') }}</AlertDialogTitle>
                <AlertDialogDescription>{{ t('mail.deleteDescription') }}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                <AlertDialogAction
                  class="bg-destructive text-white hover:bg-destructive/90"
                  :disabled="deleting"
                  @click.prevent="deleteMail"
                >
                  <Spinner v-if="deleting" data-icon="inline-start" />
                  {{ deleting ? t('mail.deleting') : t('mail.delete') }}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      <div v-if="mail.text" class="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
        {{ mail.text }}
      </div>
      <div v-else-if="safeHtml" class="prose prose-sm max-w-none dark:prose-invert" v-html="safeHtml" />
      <p v-else class="text-sm text-muted-foreground">
        {{ t('mail.emptyBody') }}
      </p>
    </div>
  </div>
</template>
