import { t } from 'elysia'

export const signupBody = t.Object({
  username: t.String({ minLength: 3, maxLength: 20, pattern: '^\\w+$' }),
  nickname: t.String({ minLength: 1, maxLength: 20 }),
  password: t.String({ minLength: 8, maxLength: 20 }),
})
export type SignupBody = typeof signupBody.static

export const loginBody = t.Object({
  username: t.String({ minLength: 1 }),
  password: t.String({ minLength: 1 }),
})
export type LoginBody = typeof loginBody.static

export const updateProfileBody = t.Object({
  nickname: t.String({ minLength: 1, maxLength: 20 }),
  avatar: t.String(),
})
export type UpdateProfileBody = typeof updateProfileBody.static

export const changePasswordBody = t.Object({
  currentPassword: t.String({ minLength: 1 }),
  newPassword: t.String({ minLength: 8 }),
})
export type ChangePasswordBody = typeof changePasswordBody.static

export const capability = t.Union([
  t.Literal('event.subscribe'),
  t.Literal('event.publish'),
])
export type Capability = typeof capability.static

export const userProfile = t.Object({
  username: t.String(),
  nickname: t.String(),
  avatar: t.String(),
  capabilities: t.Array(capability),
})
export type UserProfile = typeof userProfile.static
