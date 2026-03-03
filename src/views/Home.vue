<script setup lang="ts">
import { Translation, useI18n } from 'vue-i18n'
import useHitokoto from '@/composables/hitokoto'
import { user } from '@/lib/api'

const { t } = useI18n()
const { hitokoto, fromLine } = useHitokoto()
</script>

<template>
  <main class="flex flex-col items-center justify-center gap-4">
    <p v-if="user">
      {{ t('home.welcome', user) }}
    </p>
    <Translation v-else keypath="home.notLoggedIn" tag="p">
      <template #login>
        <RouterLink to="/login" class="link">
          {{ t('home.loginLink') }}
        </RouterLink>
      </template>
      <template #signup>
        <RouterLink to="/signup" class="link">
          {{ t('home.signupLink') }}
        </RouterLink>
      </template>
    </Translation>
    <Translation keypath="home.joinGroup" tag="p">
      <template #group>
        <a href="https://qm.qq.com/q/DNU3nJxnwY" target="_blank" class="link">
          {{ t('home.joinGroupName') }}
        </a>
      </template>
    </Translation>
    <p v-if="hitokoto" class="text-muted-foreground italic text-sm flex flex-col">
      <span class="pr-[2em]">{{ hitokoto.hitokoto }}</span>
      <span class="pl-[2em] self-end">{{ fromLine }}</span>
    </p>
  </main>
</template>
