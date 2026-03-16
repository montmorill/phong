<script setup lang="ts">
import { Translation, useI18n } from 'vue-i18n'
import { Separator } from '@/components/ui/separator'
import useHitokoto from '@/composables/useHitokoto'
import { user } from '@/lib/api'

const { t } = useI18n()
const { hitokoto } = useHitokoto()
</script>

<template>
  <div class="space-y-4 text-center my-auto p-8">
    <p>
      <template v-if="user">
        {{ t('home.welcome', { nickname: user.nickname }) }}
      </template>
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
    </p>
    <div class="space-x-2">
      <RouterLink to="/post" class="link">
        {{ t('nav.post') }}
      </RouterLink>
      <RouterLink to="/rooms" class="link">
        {{ t('nav.rooms') }}
      </RouterLink>
      <RouterLink to="/hanting" class="link">
        {{ t('nav.hanting') }}
      </RouterLink>
    </div>
    <Separator />
    <p>
      <Translation keypath="home.joinGroup" tag="p">
        <template #group>
          <a href="https://qm.qq.com/q/DNU3nJxnwY" target="_blank" class="link whitespace-nowrap">
            {{ t('home.joinGroupName') }}
          </a>
        </template>
      </Translation>
    </p>
    <div v-if="hitokoto" class="text-muted-foreground italic text-sm flex flex-col w-fit mx-auto max-w-[80vw]">
      <span class="pr-[2em] text-start whitespace-pre-wrap truncate">{{ hitokoto.content }}</span>
      <span class="pl-[2em] self-end">——{{ hitokoto.from }}</span>
    </div>
  </div>
</template>
