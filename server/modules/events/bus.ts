import { EventEmitter } from 'node:events'

export interface AppEventMap {
  'user.registered': {
    username: string
  }
  'post.created': {
    username: string
    postId: number
  }
  'post.liked': {
    postId: number
    actorUsername: string
    liked: boolean
  }
  'post.replied': {
    parentId: number
    actorUsername: string
    replyId: number
  }
  'notify.post.liked': {
    recipientUsername: string
    recipientBindings: Record<string, string>
    actorUsername: string
    actorNickname: string
    actorAvatar?: string
    postId: number
    postContent: string
  }
  'notify.post.created': {
    recipientUsername: string
    recipientBindings: Record<string, string>
    actorUsername: string
    actorNickname: string
    actorAvatar?: string
    postId: number
    postContent?: string
  }
  'notify.post.replied': {
    recipientUsername: string
    recipientBindings: Record<string, string>
    actorUsername: string
    actorNickname: string
    actorAvatar?: string
    postId: number
    postContent: string
    replyId: number
    replyContent?: string
  }
}

export type AppEvent = {
  [K in keyof AppEventMap]: { topic: K, payload: AppEventMap[K], timestamp: number }
}[keyof AppEventMap]

class EventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(0)
  }

  publish<T extends keyof AppEventMap>(topic: T, payload: AppEventMap[T]): void
  publish(topic: string, payload: unknown): void
  publish(topic: string, payload: unknown): void {
    const event = { topic, payload, timestamp: Date.now() }
    this.emit('event', event)
  }
}

export const bus = new EventBus()
