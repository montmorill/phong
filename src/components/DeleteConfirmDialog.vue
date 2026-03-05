<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

defineProps<{
  deleting?: boolean
  buttonClass?: string
}>()

const emit = defineEmits<{ confirm: [] }>()
const { t } = useI18n()
</script>

<template>
  <AlertDialog>
    <AlertDialogTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="text-muted-foreground hover:text-destructive" :class="[buttonClass]"
      >
        <Trash2 />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('post.deleteConfirm') }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t('post.deleteDescription') }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-white hover:bg-destructive/90"
          :disabled="deleting"
          @click.prevent="emit('confirm')"
        >
          {{ t('common.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
