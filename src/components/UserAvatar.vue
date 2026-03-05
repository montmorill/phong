<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import useAvatar from '@/composables/avatar'

const props = defineProps<{
  username: string
  nickname: string
  avatar: string
  size?: string
}>()

const { avatarUrl } = useAvatar(() => props.avatar)
</script>

<template>
  <Avatar :class="[size ?? 'size-8', 'border']">
    <AvatarImage :src="avatarUrl" :alt="username" />
    <AvatarFallback>{{ nickname.slice(0, 2) }}</AvatarFallback>
  </Avatar>
</template>
