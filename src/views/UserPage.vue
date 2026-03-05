<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import PostList from '@/components/PostList.vue'
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
  <div v-if="profile" class="w-full mb-auto max-w-2xl px-4 py-8 space-y-4">
    <div class="my-42 space-y-4 text-center">
      <Avatar class="size-24 border mx-auto">
        <AvatarImage :src="avatarUrl" :alt="profile.username" />
        <AvatarFallback>{{ profile.nickname.slice(0, 2) }}</AvatarFallback>
      </Avatar>
      <div>
        <p class="text-xl font-bold">{{ profile.nickname }}</p>
        <p class="text-sm text-muted-foreground">@{{ profile.username }}</p>
      </div>
    </div>
    <PostList :username="pageUsername" disable-user-link />
  </div>

  <div v-else-if="notFound">
    <p class="text-muted-foreground">{{ t('userPage.notFound') }}</p>
  </div>
</template>
