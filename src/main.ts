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
    { path: '/settings', component: () => import('@/views/Profile.vue'), meta: { authRequired: true } },
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
})

if (localStorage.getItem('token')) {
  // eslint-disable-next-line antfu/no-top-level-await
  await fetchUser()
  // eslint-disable-next-line antfu/no-top-level-await
  await fetchUnreadCount()
}

createApp(App).use(router).use(i18n).mount('#app')
