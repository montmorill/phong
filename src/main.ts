/* eslint-disable antfu/no-top-level-await */
import type { Capability } from 'server/modules/auth/model'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { i18n } from './i18n'
import { fetchUnreadCount, fetchUser, user } from './lib/api'
import { applyTheme, getInitialTheme } from './lib/appearance'
import { hasCapability } from './lib/capabilities'
import './style.css'

if ('scrollRestoration' in history)
  history.scrollRestoration = 'manual'

applyTheme(getInitialTheme())

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('@/views/Home.vue') },
    { path: '/login', component: () => import('@/views/Login.vue'), meta: { guestOnly: true } },
    { path: '/signup', component: () => import('@/views/Signup.vue'), meta: { guestOnly: true } },
    { path: '/settings', component: () => import('@/views/Settings.vue'), meta: { authRequired: true } },
    { path: '/admin', component: () => import('@/views/Admin.vue'), meta: { authRequired: true, capabilityRequired: 'admin:view' } },
    { path: '/admin/studio', component: () => import('@/views/AdminStudio.vue'), meta: { authRequired: true, capabilityRequired: 'admin:view' } },
    { path: '/inbox', component: () => import('@/views/Inbox.vue'), meta: { authRequired: true } },
    { path: '/mail/compose', component: () => import('@/views/MailCompose.vue'), meta: { authRequired: true } },
    { path: '/mail/:id', component: () => import('@/views/MailDetail.vue'), props: route => ({ id: Number(route.params.id) }), meta: { authRequired: true } },
    { path: '/rooms', component: () => import('@/views/RoomList.vue') },
    { path: '/rooms/:id', component: () => import('@/views/RoomChat.vue'), props: route => ({ id: Number(route.params.id) }) },
    { path: '/post', component: () => import('@/views/PostPage.vue') },
    { path: '/post/:id', component: () => import('@/views/PostDetail.vue'), props: route => ({ id: Number(route.params.id) }) },
    { path: '/hanting', component: () => import('@/views/Hanting.vue') },
    { path: '/hanting/:key', component: () => import('@/views/Hanting.vue'), props: (route) => {
      const key = String(route.params.key)
      const match = key.match(/^(\d+)([a-z])?$/)
      return { wordId: Number(match?.[1]), variant: match?.[2] ? match[2].charCodeAt(0) - 97 : 0 }
    } },
    { path: '/@:username', component: () => import('@/views/UserPage.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFound.vue') },
  ],
})

router.beforeEach((to) => {
  if (to.meta.guestOnly && user.value)
    return '/'
  if (to.meta.authRequired && !user.value)
    return '/login'
  const requiredCapability = to.meta.capabilityRequired as Capability | undefined
  if (requiredCapability && !hasCapability(user.value?.capabilities, requiredCapability))
    return '/'
})

if (localStorage.getItem('token')) {
  await fetchUser()
  await fetchUnreadCount()
}

createApp(App).use(router).use(i18n).mount('#app')
