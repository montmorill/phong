import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  username: text('username').notNull().unique().primaryKey(),
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
})

export const postLikes = sqliteTable('post_likes', {
  postId: integer('post_id').notNull().references(() => posts.id),
  username: text('username').notNull().references(() => users.username),
}, table => [
  primaryKey({ columns: [table.postId, table.username] }),
])

export const userBindings = sqliteTable('user_bindings', {
  username: text('username').notNull().references(() => users.username),
  platform: text('platform').notNull(), // 'qq' | 'github' | 'weibo'
  platformId: text('platform_id').notNull(),
}, table => [
  primaryKey({ columns: [table.username, table.platform] }),
])

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().references(() => users.username),
  type: text('type').notNull(), // 'like' | 'reply'
  actorUsername: text('actor_username').notNull().references(() => users.username),
  postId: integer('post_id').notNull(),
  replyId: integer('reply_id'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
