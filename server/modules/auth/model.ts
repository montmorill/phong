import type { Equal, Expect } from '@/types'
import { Type as t } from '@sinclair/typebox'

export const loginBody = t.Object({
  username: t.String({ minLength: 1 }),
  password: t.String({ minLength: 1 }),
})

export const signupBody = t.Object({
  username: t.String({ minLength: 3, maxLength: 20, pattern: '^\\w+$' }),
  nickname: t.String({ minLength: 1, maxLength: 20 }),
  password: t.String({ minLength: 8, maxLength: 20 }),
})

export const userProfile = t.Object({
  username: t.String(),
  nickname: t.String(),
  avatar: t.String(),
})

export const updateProfileBody = t.Object({
  nickname: t.String({ minLength: 1, maxLength: 20 }),
  avatar: t.String(),
})

export const changePasswordBody = t.Object({
  currentPassword: t.String({ minLength: 1 }),
  newPassword: t.String({ minLength: 8 }),
})

// @ts-expect-error - Type assertion check
type _ = Expect<Equal<UserProfile, typeof userProfile.static>>
export interface UserProfile {
  username: string
  nickname: string
  avatar: string
}
export type LoginBody = typeof loginBody.static
export type SignupBody = typeof signupBody.static
export type UpdateProfileBody = typeof updateProfileBody.static
export type ChangePasswordBody = typeof changePasswordBody.static
