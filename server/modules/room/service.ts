import type { RoomClient, ServerMessageMap } from './model'
import { asc, desc, eq } from 'drizzle-orm'
import { db, roomMessages, rooms, users } from '../../db'
import * as FeiHuaLing from './games/feihualing'

// ── In-memory room WS clients ─────────────────────────────────────────────────

export const roomClients = new Map<number, Map<object, RoomClient>>()

// ── In-memory 飞花令游戏状态 ──────────────────────────────────────────────────

export const roomGames = new Map<number, FeiHuaLing.FeiHuaLingState>()

// ── In-memory 飞花令邀请状态 ──────────────────────────────────────────────────

export interface PendingInvite {
  keyword: string
  host: string
  invitedPlayers: string[]
  responses: Map<string, boolean>
  timer: ReturnType<typeof setTimeout>
  turnTimeoutMs: number
}

export const roomPendingInvites = new Map<number, PendingInvite>()

export interface PendingVote {
  submitter: string
  content: string
  voters: string[]
  responses: Map<string, boolean>
  timer: ReturnType<typeof setTimeout>
  finalize: () => void
}

export const roomVotes = new Map<number, PendingVote>()

// ── 回合计时器 ────────────────────────────────────────────────────────────────

export const TURN_TIMEOUT_MS = 30_000
export const roomTimers = new Map<number, ReturnType<typeof setTimeout>>()

export function clearGameTimer(roomId: number) {
  const t = roomTimers.get(roomId)
  if (t) {
    clearTimeout(t)
    roomTimers.delete(roomId)
  }
}

// ── WS broadcast helpers ──────────────────────────────────────────────────────

export function broadcastRoom(roomId: number, data: string) {
  const clients = roomClients.get(roomId)
  if (!clients)
    return
  for (const client of clients.values())
    client.send(data)
}

export function send<T extends keyof ServerMessageMap>(roomId: number, type: T, payload: ServerMessageMap[T]) {
  broadcastRoom(roomId, JSON.stringify({ type, ...payload }))
}

export function broadcastRoster(roomId: number) {
  const clients = roomClients.get(roomId)
  if (!clients)
    return
  const userList = [...clients.values()].map(c => ({
    username: c.username,
    nickname: c.nickname,
    avatar: c.avatar,
  }))
  send(roomId, 'roster', { users: userList })
}

/** 统一处理客户端断开（WS close 或心跳超时均调用此函数） */
export function handleClientLeave(roomId: number, rawKey: object) {
  const clients = roomClients.get(roomId)
  if (!clients)
    return
  const client = clients.get(rawKey)
  if (!client)
    return

  clients.delete(rawKey)
  if (clients.size === 0)
    roomClients.delete(roomId)

  // 若有进行中的飞花令，将该玩家移出游戏
  const game = roomGames.get(roomId)
  if (game) {
    const { newState, winner, gameOver } = FeiHuaLing.removePlayer(game, client.username)
    if (gameOver) {
      roomGames.delete(roomId)
      clearGameTimer(roomId)
      send(roomId, 'game_end', { reason: 'winner', winner: winner ?? undefined })
    }
    else {
      roomGames.set(roomId, newState)
    }
  }

  broadcastRoster(roomId)
  send(roomId, 'leave', { username: client.username })
}

// ── 心跳超时清理（每 60s 检查，超过 90s 未 ping 视为掉线）────────────────────

setInterval(() => {
  const now = Date.now()
  for (const [roomId, clients] of roomClients) {
    for (const rawKey of [...clients.keys()]) {
      if (now - clients.get(rawKey)!.lastPing > 90_000)
        handleClientLeave(roomId, rawKey)
    }
  }
}, 60_000)

// ── DB operations ─────────────────────────────────────────────────────────────

export function listRooms() {
  return db
    .select({
      id: rooms.id,
      name: rooms.name,
      createdBy: rooms.createdBy,
      createdAt: rooms.createdAt,
    })
    .from(rooms)
    .orderBy(asc(rooms.createdAt))
}

export function findRoom(roomId: number) {
  return db.select({ id: rooms.id, createdBy: rooms.createdBy }).from(rooms).where(eq(rooms.id, roomId))
}

export function getUserInfo(username: string) {
  return db
    .select({ nickname: users.nickname, avatar: users.avatar })
    .from(users)
    .where(eq(users.username, username))
}

export function createRoom(username: string, name: string) {
  return db.insert(rooms).values({ name, createdBy: username }).returning()
}

export function updateRoom(roomId: number, name: string) {
  return db.update(rooms).set({ name }).where(eq(rooms.id, roomId)).returning()
}

export function deleteRoom(roomId: number) {
  return db.delete(rooms).where(eq(rooms.id, roomId))
}

export function deleteRoomMessages(roomId: number) {
  return db.delete(roomMessages).where(eq(roomMessages.roomId, roomId))
}

export async function saveMessage(roomId: number, username: string, content: string) {
  const [saved] = await db
    .insert(roomMessages)
    .values({ roomId, username, content })
    .returning()

  const [userInfo] = await db
    .select({ nickname: users.nickname, avatar: users.avatar })
    .from(users)
    .where(eq(users.username, username))

  return { saved: saved!, userInfo }
}

export async function listMessages(roomId: number) {
  const rows = await db
    .select({
      id: roomMessages.id,
      content: roomMessages.content,
      createdAt: roomMessages.createdAt,
      username: roomMessages.username,
      nickname: users.nickname,
      avatar: users.avatar,
    })
    .from(roomMessages)
    .innerJoin(users, eq(roomMessages.username, users.username))
    .where(eq(roomMessages.roomId, roomId))
    .orderBy(desc(roomMessages.createdAt))
    .limit(200)
  return rows.reverse()
}
