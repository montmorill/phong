<script setup lang="ts">
import type { UserProfile } from '@server/auth/model'
import { Inbox, Link, LogOut, Settings, ShieldCheck, User } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import UserAvatar from '@/components/UserAvatar.vue'
import { clearAuth, unreadCount, user } from '@/lib/api'

defineProps<UserProfile>()

const router = useRouter()

function logout() {
  clearAuth()
  router.push('/login')
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger class="flex items-center gap-2 cursor-pointer">
      <span class="text-sm">{{ nickname }}</span>
      <div class="relative">
        <UserAvatar :username="username" :nickname="nickname" :avatar="avatar" size="size-9" />
        <span v-if="unreadCount > 0" class="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-blue-500 border-2 border-background" />
      </div>
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
        <RouterLink to="/bind" class="flex items-center gap-2 cursor-pointer">
          <Link class="size-4" />
          {{ $t('nav.bind') }}
        </RouterLink>
      </DropdownMenuItem>
      <DropdownMenuItem as-child>
        <RouterLink to="/settings" class="flex items-center gap-2 cursor-pointer">
          <Settings class="size-4" />
          {{ $t('nav.settings') }}
        </RouterLink>
      </DropdownMenuItem>
      <DropdownMenuItem v-if="user?.capabilities.includes('admin')" as-child>
        <RouterLink to="/admin" class="flex items-center gap-2 cursor-pointer">
          <ShieldCheck class="size-4" />
          {{ $t('nav.admin') }}
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
