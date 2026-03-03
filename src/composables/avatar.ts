import type { HTMLAttributes, InputAutoCompleteAttribute, InputTypeHTMLAttribute, MaybeRefOrGetter } from 'vue'
import type { Awaitable } from '@/types'
import { computed, ref, toValue, watchEffect } from 'vue'
import defaultAvatar from '@/assets/default-avatar.svg'

export interface AvatarProvider {
  validate: (value: string) => boolean
  resolve: (value: string) => Awaitable<string>
  type?: InputTypeHTMLAttribute
  autocomplete?: InputAutoCompleteAttribute
  inputmode?: HTMLAttributes['inputmode']
}

export const PROVIDERS = {
  qq: {
    validate: (value: string) => /^\d{5,12}$/.test(value),
    resolve(value: string) {
      return /^\d{5,12}$/.test(value) ? `https://q.qlogo.cn/g?b=qq&s=640&nk=${value}` : ''
    },
    inputmode: 'numeric',
  },
  gravatar: {
    validate: (value: string) => value.includes('@') && value.includes('.'),
    resolve: async (value: string) => {
      if (!value.includes('@') || !value.includes('.'))
        return ''
      const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value.toLowerCase()))
      const hash = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
      return `https://www.gravatar.com/avatar/${hash}?s=640&d=404`
    },
    type: 'email',
    inputmode: 'email',
    autocomplete: 'email',
  },
} satisfies Record<string, AvatarProvider>

export type AvatarProviderId = keyof typeof PROVIDERS

export interface Avatar {
  provider: AvatarProviderId
  value: string
}

export function parseAvatar(avatar: string | undefined): Avatar {
  if (!avatar)
    return { provider: 'qq', value: '' }
  const colonIdx = avatar.indexOf(':')
  if (colonIdx !== -1) {
    const maybeProvider = avatar.slice(0, colonIdx)
    if (maybeProvider in PROVIDERS) {
      return {
        provider: maybeProvider as AvatarProviderId,
        value: avatar.slice(colonIdx + 1),
      }
    }
  }
  return { provider: 'qq', value: '' }
}

export function useAvatar(avatar: MaybeRefOrGetter<string | undefined>) {
  const initial = parseAvatar(toValue(avatar))
  const avatarProvider = ref<AvatarProviderId>(initial.provider)
  const avatarValue = ref(initial.value)
  const avatarUrl = ref(defaultAvatar)

  watchEffect(() => {
    const { provider, value } = parseAvatar(toValue(avatar))
    avatarProvider.value = provider
    avatarValue.value = value
  })

  watchEffect(async () => {
    avatarUrl.value = (await PROVIDERS[avatarProvider.value].resolve(avatarValue.value)) || defaultAvatar
  })

  const avatarString = computed(() => `${avatarProvider.value}:${avatarValue.value}`)

  return { avatarProvider, avatarValue, avatarUrl, avatarString }
}

export default useAvatar
