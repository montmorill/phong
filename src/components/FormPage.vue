<script setup lang="ts">
import { ref } from 'vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

const props = defineProps<{
  title: string
  submitText: string
  submittingText: string
  disabled?: boolean
  submit: () => Promise<string | void>
}>()

const loading = ref(false)
const serverError = ref('')

async function handleSubmit() {
  loading.value = true
  serverError.value = ''
  try {
    serverError.value = await props.submit() ?? ''
  }
  catch (e) {
    serverError.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex justify-center items-center">
    <div class="w-full max-w-sm px-4">
      <h1 class="text-3xl font-bold text-center mb-6">
        {{ title }}
      </h1>

      <Card>
        <form @submit.prevent="handleSubmit">
          <CardContent class="space-y-4 pt-6">
            <Alert v-if="serverError" variant="destructive">
              <AlertDescription>{{ serverError }}</AlertDescription>
            </Alert>

            <slot />
          </CardContent>

          <CardFooter class="flex-col gap-2">
            <Button
              type="submit"
              class="w-full"
              :disabled="disabled || loading"
            >
              <Spinner v-if="loading" data-icon="inline-start" />
              {{ loading ? submittingText : submitText }}
            </Button>

            <slot name="footer" />
          </CardFooter>
        </form>
      </Card>
    </div>
  </main>
</template>
