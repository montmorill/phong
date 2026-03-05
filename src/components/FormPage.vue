<script setup lang="ts">
import { ref } from 'vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

const props = defineProps<{
  title: string
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
  catch (error) {
    serverError.value = error instanceof Error
      ? error.message
      : JSON.stringify(error)
    console.error(error)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm px-4 my-auto">
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
          <slot name="submit" :loading="loading" />

          <slot name="footer" />
        </CardFooter>
      </form>
    </Card>
  </div>
</template>
