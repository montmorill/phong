<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import PostList from '@/components/PostList.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAvatar } from '@/composables/avatar'
import { api, user } from '@/lib/api'

defineOptions({ name: 'UserPage' })

const route = useRoute()
const { t } = useI18n()

const pageUsername = computed(() => route.params.username as string)

interface PublicProfile {
  username: string
  nickname: string
  avatar: string
  isFollowing: boolean
  followerCount: number
  followingCount: number
}
const profile = ref<PublicProfile | null>(null)
const notFound = ref(false)
const following = ref(false)
const followLoading = ref(false)

const { avatarUrl } = useAvatar(() => profile.value?.avatar)

const isSelf = computed(() => user.value?.username === pageUsername.value)

async function load() {
  profile.value = null
  notFound.value = false
  const { data, error } = await api.users({ username: pageUsername.value }).get()
  if (error || !data) {
    notFound.value = true
  }
  else {
    profile.value = data as PublicProfile
    following.value = profile.value.isFollowing
  }
}

async function toggleFollow() {
  if (!profile.value)
    return
  followLoading.value = true
  const { data } = await api.users({ username: profile.value.username }).follow.post()
  if (data) {
    following.value = data.following
    profile.value.followerCount = data.following
      ? profile.value.followerCount + 1
      : profile.value.followerCount - 1
  }
  followLoading.value = false
}

function getViewport() {
  return document.querySelector<HTMLElement>('[data-reka-scroll-area-viewport]')
}

let savedScrollTop = 0

onDeactivated(() => {
  savedScrollTop = getViewport()?.scrollTop ?? 0
})

onActivated(() => {
  getViewport()!.scrollTop = savedScrollTop
})

onMounted(load)
watch(pageUsername, () => {
  savedScrollTop = 0
  load()
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
        <div class="flex justify-center space-x-4 mt-2">
          <span class="text-sm">{{ profile.followingCount }} {{ $t('userPage.following') }}</span>
          <span class="text-sm">{{ profile.followerCount }} {{ $t('userPage.followers') }}</span>
        </div>
      </div>
      <Button
        v-if="user && !isSelf"
        :variant="following ? 'outline' : 'default'"
        size="sm"
        class="rounded-full px-5"
        :disabled="followLoading"
        @click="toggleFollow"
      >
        {{ following ? t('userPage.unfollow') : t('userPage.follow') }}
      </Button>
    </div>
    <PostList :key="pageUsername" :username="pageUsername" disable-user-link />
  </div>

  <div v-else-if="notFound">
    <p class="text-muted-foreground">{{ t('userPage.notFound') }}</p>
  </div>
</template>
