<script setup lang="ts">
import { Translation, useI18n } from 'vue-i18n'
import { Separator } from '@/components/ui/separator'
import useHitokoto from '@/composables/hitokoto'
import { user } from '@/lib/api'

const { t } = useI18n()
const { hitokoto, fromLine } = useHitokoto()
</script>

<template>
  <div class="space-y-4">
    <div class="text-center">
      <RouterLink to="/post" class="link">
        {{ t('nav.post') }}
      </RouterLink>
    </div>
    <Separator />
    <Translation v-if="!user" keypath="home.notLoggedIn" tag="p">
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
    <div v-if="hitokoto" class="text-muted-foreground italic text-sm flex flex-col">
      <span class="pr-[2em]">{{ hitokoto.hitokoto }}</span>
      <span class="pl-[2em] self-end">{{ fromLine }}</span>
    </div>
  </div>
</template>
