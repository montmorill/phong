import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export type NotificationType = 'like' | 'reply' | 'post' | 'mail'
export const NOTIFICATION_TYPES: NotificationType[] = ['like', 'reply', 'post', 'mail']

export const users = sqliteTable('users', {
  username: text('username').notNull().primaryKey(),
  nickname: text('nickname').notNull(),
  password: text('password').notNull(),
  avatar: text('avatar').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const userCapabilities = sqliteTable('user_capabilities', {
  username: text('username').notNull().references(() => users.username),
  capability: text('capability').notNull(),
}, table => [
  primaryKey({ columns: [table.username, table.capability] }),
])

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id'),
  title: text('title'),
  content: text('content').notNull(),
  username: text('username').notNull().references(() => users.username),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
})

export const postLikes = sqliteTable('post_likes', {
  postId: integer('post_id').notNull().references(() => posts.id),
  username: text('username').notNull().references(() => users.username),
}, table => [
  primaryKey({ columns: [table.postId, table.username] }),
])

export const userBindings = sqliteTable('user_bindings', {
  username: text('username').notNull().references(() => users.username),
  platform: text('platform').notNull(),
  platformId: text('platform_id').notNull(),
}, table => [
  primaryKey({ columns: [table.username, table.platform] }),
])

export const userFollows = sqliteTable('user_follows', {
  followerUsername: text('follower_username').notNull().references(() => users.username),
  followingUsername: text('following_username').notNull().references(() => users.username),
}, table => [
  primaryKey({ columns: [table.followerUsername, table.followingUsername] }),
])

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().references(() => users.username),
  type: text('type').notNull(),
  actorUsername: text('actor_username').references(() => users.username),
  actorLabel: text('actor_label'),
  postId: integer('post_id'),
  replyId: integer('reply_id'),
  emailId: integer('email_id'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const notificationPrefs = sqliteTable('notification_prefs', {
  username: text('username').notNull().references(() => users.username),
  type: text('type').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
}, table => [
  primaryKey({ columns: [table.username, table.type] }),
])

export const rooms = sqliteTable('rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdBy: text('created_by').notNull().references(() => users.username),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const roomMessages = sqliteTable('room_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: integer('room_id').notNull().references(() => rooms.id),
  username: text('username').notNull().references(() => users.username),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const gravatarAccounts = sqliteTable('gravatar_accounts', {
  username: text('username').notNull().primaryKey().references(() => users.username),
  wpPassword: text('wp_password').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }),
})

export const emails = sqliteTable('emails', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().references(() => users.username),
  fromAddress: text('from_address').notNull(),
  subject: text('subject').notNull().default(''),
  html: text('html').notNull().default(''),
  text: text('text').notNull().default(''),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const hitokoto = sqliteTable('hitokoto', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  from: text('from').notNull(),
  fromWho: text('from_who'),
  creator: text('creator').notNull().references(() => users.username),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
