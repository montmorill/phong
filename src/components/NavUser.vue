<script setup lang="ts">
import { Inbox, LogOut, Settings, User } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import UserAvatar from '@/components/UserAvatar.vue'
import { clearAuth, unreadCount } from '@/lib/api'

defineProps<{
  username: string
  nickname: string
  avatar: string
}>()

const router = useRouter()

function logout() {
  clearAuth()
  router.push('/login')
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger class="flex items-center gap-2">
      <span class="text-sm">{{ nickname }}</span>
      <UserAvatar :username="username" :nickname="nickname" :avatar="avatar" size="size-9" class="cursor-pointer" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-40">
      <DropdownMenuItem as-child>
        <RouterLink :to="`/@${username}`" class="flex items-center gap-2 cursor-pointer">
          <User class="size-4" />
          {{ $t('nav.profile') }}
        </RouterLink>
      </DropdownMenuItem>
      <DropdownMenuItem as-child>
        <RouterLink to="/inbox" class="flex items-center gap-2 cursor-pointer">
          <Inbox class="size-4" />
          {{ $t('nav.inbox') }}
          <span v-if="unreadCount > 0" class="ml-auto text-xs font-medium bg-blue-500 text-white rounded-full px-1.5 py-0.5 leading-none">
            {{ unreadCount }}
          </span>
        </RouterLink>
      </DropdownMenuItem>
      <DropdownMenuItem as-child>
        <RouterLink to="/settings" class="flex items-center gap-2 cursor-pointer">
          <Settings class="size-4" />
          {{ $t('nav.settings') }}
        </RouterLink>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        class="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
        @click="logout"
      >
        <LogOut class="size-4" />
        {{ $t('nav.logout') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
