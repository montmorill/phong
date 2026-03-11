import type { UserProfile } from '@server/auth/model'
import type { App } from 'server'
import { treaty } from '@elysiajs/eden'
import { useStorage } from '@vueuse/core'
import { ref } from 'vue'

export const TOKEN = useStorage('token', '')

export const { api } = treaty<App>(window.location.origin, {
  headers() {
    return TOKEN.value ? { Authorization: `Bearer ${TOKEN.value}` } : {}
  },
})

export const user = ref<UserProfile | null>(null)
export const unreadCount = ref(0)

export async function fetchUnreadCount() {
  if (!user.value)
    return
  const { data } = await api.notifications.unread.get()
  if (data)
    unreadCount.value = data.count
}

export function clearAuth() {
  TOKEN.value = ''
  user.value = null
}

export async function fetchUser() {
  if (!TOKEN.value) {
    user.value = null
    return
  }

  const { data, error } = await api.me.get()
  if (error) {
    clearAuth()
    return
  }

  return user.value = data
}
