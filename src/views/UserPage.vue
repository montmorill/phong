<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAvatar } from '@/composables/avatar'
import { api } from '@/lib/api'

const route = useRoute()
const { t } = useI18n()

const pageUsername = route.params.username as string

interface PublicProfile { username: string, nickname: string, avatar: string }
const profile = ref<PublicProfile | null>(null)
const notFound = ref(false)

const { avatarUrl } = useAvatar(() => profile.value?.avatar)

onMounted(async () => {
  const { data, error } = await api.users({ username: pageUsername }).get()
  if (error || !data)
    notFound.value = true
  else
    profile.value = data as PublicProfile
})
</script>

<template>
  <div v-if="profile" class="space-y-4">
    <Avatar class="size-24 border">
      <AvatarImage :src="avatarUrl" :alt="profile.username" />
      <AvatarFallback>{{ profile.nickname.slice(0, 2) }}</AvatarFallback>
    </Avatar>
    <div class="text-center">
      <p class="text-xl font-bold">{{ profile.nickname }}</p>
      <p class="text-sm text-muted-foreground">@{{ profile.username }}</p>
    </div>
    <div class="text-center">
      <RouterLink :to="`/@${profile.username}/post`" class="link">
        {{ t('nav.post') }}
      </RouterLink>
    </div>
  </div>

  <div v-else-if="notFound">
    <p class="text-muted-foreground">{{ t('userPage.notFound') }}</p>
  </div>
</template>
