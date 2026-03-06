/* eslint-disable antfu/no-top-level-await */
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { i18n } from './i18n'
import { fetchUnreadCount, fetchUser, user } from './lib/api'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('@/views/Home.vue') },
    { path: '/login', component: () => import('@/views/Login.vue'), meta: { guestOnly: true } },
    { path: '/signup', component: () => import('@/views/Signup.vue'), meta: { guestOnly: true } },
    { path: '/settings', component: () => import('@/views/Settings.vue'), meta: { authRequired: true } },
    { path: '/bind', redirect: '/settings#bind' },
    { path: '/admin', component: () => import('@/views/Admin.vue'), meta: { authRequired: true, adminRequired: true } },
    { path: '/inbox', component: () => import('@/views/Inbox.vue'), meta: { authRequired: true } },
    { path: '/post', component: () => import('@/views/PostPage.vue') },
    { path: '/post/:id', component: () => import('@/views/PostDetail.vue'), props: route => ({ id: Number(route.params.id) }) },
    { path: '/@:username', component: () => import('@/views/UserPage.vue') },
  ],
})

router.beforeEach((to) => {
  if (to.meta.guestOnly && user.value)
    return '/'
  if (to.meta.authRequired && !user.value)
    return '/login'
  if (to.meta.adminRequired && !user.value?.capabilities.includes('admin'))
    return '/'
})

if (localStorage.getItem('token')) {
  await fetchUser()
  await fetchUnreadCount()
}

createApp(App).use(router).use(i18n).mount('#app')
