import type { UserProfile } from '@server/auth/model'
import type { App } from 'server'
import { treaty } from '@elysiajs/eden'
import { ref } from 'vue'

export const { api } = treaty<App>(window.location.origin, {
  headers() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
})

export const user = ref<UserProfile | null>(null)

export function setToken(token: string) {
  localStorage.setItem('token', token)
}

export function clearAuth() {
  localStorage.removeItem('token')
  user.value = null
}

export async function fetchUser() {
  if (!localStorage.getItem('token')) {
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
