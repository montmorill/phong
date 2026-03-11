import type { ClientMsg } from './model'
import { Elysia } from 'elysia'
import { requireAuth } from '../auth/guard'
import { jwtPlugin } from '../jwt'
import * as FeiHuaLing from './games/feihualing'
import { roomNameBody, wsQuery } from './model'
import * as RoomService from './service'

// ── 邀请逻辑 ──────────────────────────────────────────────────────────────────

const INVITE_TIMEOUT_MS = 10_000

function finalizeInvite(roomId: number) {
  const invite = RoomService.roomPendingInvites.get(roomId)
  if (!invite)
    return
  clearTimeout(invite.timer)
  RoomService.roomPendingInvites.delete(roomId)

  const accepted = invite.invitedPlayers.filter(p => invite.responses.get(p) === true)
  if (accepted.length < 2) {
    RoomService.send(roomId, 'game_invite_cancelled', { reason: 'no_players' })
    return
  }

  const gameState = FeiHuaLing.createGame(invite.keyword, accepted, invite.turnTimeoutMs)
  RoomService.roomGames.set(roomId, gameState)
  const deadline = scheduleTurn(roomId)
  RoomService.send(roomId, 'game_start', {
    keyword: gameState.keyword,
    players: gameState.activePlayers,
    currentPlayer: FeiHuaLing.currentPlayer(gameState),
    turnDeadline: deadline,
    turnTimeoutMs: invite.turnTimeoutMs,
  })
}

// ── 回合超时逻辑 ──────────────────────────────────────────────────────────────

/** 开始当前玩家的计时，返回 deadline（ms 时间戳） */
function scheduleTurn(roomId: number): number {
  RoomService.clearGameTimer(roomId)
  const timeout = RoomService.roomGames.get(roomId)?.turnTimeoutMs ?? RoomService.TURN_TIMEOUT_MS
  const deadline = Date.now() + timeout
  RoomService.roomTimers.set(roomId, setTimeout(() => onTurnTimeout(roomId), timeout))
  return deadline
}

/** 回合超时：自动淘汰当前玩家 */
function onTurnTimeout(roomId: number) {
  const game = RoomService.roomGames.get(roomId)
  if (!game)
    return

  const cp = FeiHuaLing.currentPlayer(game)
  const { result, newState } = FeiHuaLing.processMove(game, cp, '') // 空字符串 = 不含关键字 = 淘汰

  if (!result.isCurrentPlayer)
    return

  if (result.nextPlayer === null) {
    RoomService.roomGames.delete(roomId)
    RoomService.clearGameTimer(roomId)
    RoomService.send(roomId, 'game_end', { reason: 'winner', winner: result.winner ?? undefined })
  }
  else {
    RoomService.roomGames.set(roomId, newState)
    const deadline = scheduleTurn(roomId)
    RoomService.send(roomId, 'game_invalid', {
      username: cp,
      nextPlayer: result.nextPlayer,
      winner: result.winner,
      turnDeadline: deadline,
    })
  }
}

// ── Elysia 路由 ───────────────────────────────────────────────────────────────

export default new Elysia({ prefix: '/rooms' })
  .use(jwtPlugin)

  .get('/', () => RoomService.listRooms())

  .ws('/ws/:roomId', {
    query: wsQuery,
    async open(ws) {
      const { token } = ws.data.query
      const { roomId: roomIdStr } = ws.data.params
      const roomId = Number(roomIdStr)

      const payload = await ws.data.jwt.verify(token)
      if (!payload || typeof payload.sub !== 'string') {
        ws.close()
        return
      }
      const username = payload.sub

      const [room] = await RoomService.findRoom(roomId)
      if (!room) {
        ws.close()
        return
      }

      const [userInfo] = await RoomService.getUserInfo(username)

      if (!RoomService.roomClients.has(roomId))
        RoomService.roomClients.set(roomId, new Map())

      RoomService.roomClients.get(roomId)!.set(ws.raw, {
        username,
        nickname: userInfo?.nickname ?? username,
        avatar: userInfo?.avatar ?? '',
        lastPing: Date.now(),
        send: data => ws.send(data),
      })

      RoomService.broadcastRoster(roomId)
      RoomService.send(roomId, 'join', { username })
    },

    async message(ws, msg) {
      const { roomId: roomIdStr } = ws.data.params
      const roomId = Number(roomIdStr)
      const client = RoomService.roomClients.get(roomId)?.get(ws.raw)
      if (!client)
        return

      const clientMsg = msg as ClientMsg
      if (typeof clientMsg !== 'object' || clientMsg === null)
        return

      // ── 心跳 ────────────────────────────────────────────────────────────────

      if (clientMsg.type === 'ping') {
        client.lastPing = Date.now()
        client.send(JSON.stringify({ type: 'pong' }))
        return
      }

      // ── 飞花令指令 ────────────────────────────────────────────────────────────

      if (clientMsg.type === 'game_start_fhl') {
        const { keyword, players, timeoutMs } = clientMsg
        const timeout = Math.min(Math.max(timeoutMs ?? RoomService.TURN_TIMEOUT_MS, 5_000), 300_000)
        const kw = keyword?.trim()
        if (kw && players?.length && !RoomService.roomGames.has(roomId) && !RoomService.roomPendingInvites.has(roomId)) {
          const responses = new Map<string, boolean>([[client.username, true]])
          const timer = setTimeout(() => finalizeInvite(roomId), INVITE_TIMEOUT_MS)
          RoomService.roomPendingInvites.set(roomId, { keyword: kw, host: client.username, invitedPlayers: players, responses, timer, turnTimeoutMs: timeout })
          const [hostInfo] = await RoomService.getUserInfo(client.username)
          RoomService.send(roomId, 'game_invite', {
            keyword: kw,
            host: client.username,
            hostNickname: hostInfo?.nickname ?? client.username,
            players,
            deadline: Date.now() + INVITE_TIMEOUT_MS,
          })
          if (players.every(p => responses.has(p)))
            finalizeInvite(roomId)
        }
        return
      }

      if (clientMsg.type === 'game_invite_response') {
        const invite = RoomService.roomPendingInvites.get(roomId)
        if (invite && invite.invitedPlayers.includes(client.username)) {
          invite.responses.set(client.username, clientMsg.accepted)
          if (invite.invitedPlayers.every(p => invite.responses.has(p)))
            finalizeInvite(roomId)
        }
        return
      }

      if (clientMsg.type === 'game_end_fhl') {
        if (RoomService.roomGames.has(roomId)) {
          RoomService.roomGames.delete(roomId)
          RoomService.clearGameTimer(roomId)
          RoomService.send(roomId, 'game_end', { reason: 'command' })
        }
        return
      }

      if (clientMsg.type !== 'message')
        return

      const content = clientMsg.content?.trim()
      if (!content)
        return

      // ── 飞花令消息校验 ──────────────────────────────────────────────────────

      const game = RoomService.roomGames.get(roomId)
      if (game) {
        const { result, newState } = FeiHuaLing.processMove(game, client.username, content)

        const { saved, userInfo } = await RoomService.saveMessage(roomId, client.username, content)
        RoomService.send(roomId, 'message', {
          id: saved.id,
          username: client.username,
          nickname: userInfo?.nickname ?? client.username,
          avatar: userInfo?.avatar ?? '',
          content: saved.content,
          createdAt: saved.createdAt,
        })

        if (result.isCurrentPlayer) {
          if (result.nextPlayer === null) {
            RoomService.roomGames.delete(roomId)
            RoomService.clearGameTimer(roomId)
            RoomService.send(roomId, 'game_end', { reason: 'winner', winner: result.winner ?? undefined })
          }
          else if (result.valid) {
            RoomService.roomGames.set(roomId, newState)
            const deadline = scheduleTurn(roomId)
            RoomService.send(roomId, 'game_valid', {
              username: client.username,
              nextPlayer: result.nextPlayer,
              turnDeadline: deadline,
            })
          }
          else {
            RoomService.roomGames.set(roomId, newState)
            const deadline = scheduleTurn(roomId)
            RoomService.send(roomId, 'game_invalid', {
              username: client.username,
              nextPlayer: result.nextPlayer,
              winner: result.winner,
              turnDeadline: deadline,
            })
          }
        }
        return
      }

      // ── 普通消息 ────────────────────────────────────────────────────────────

      const { saved, userInfo } = await RoomService.saveMessage(roomId, client.username, content)
      RoomService.send(roomId, 'message', {
        id: saved.id,
        username: client.username,
        nickname: userInfo?.nickname ?? client.username,
        avatar: userInfo?.avatar ?? '',
        content: saved.content,
        createdAt: saved.createdAt,
      })
    },

    close(ws) {
      const { roomId: roomIdStr } = ws.data.params
      const roomId = Number(roomIdStr)
      RoomService.handleClientLeave(roomId, ws.raw)
    },
  })

  .use(requireAuth)

  .post('/', async ({ username, body }) => {
    const [room] = await RoomService.createRoom(username, body.name)
    return room!
  }, { body: roomNameBody })

  .get('/:id/messages', ({ params }) => RoomService.listMessages(Number(params.id)))

  .patch('/:id', async ({ username, params, body, status }) => {
    const roomId = Number(params.id)
    const [room] = await RoomService.findRoom(roomId)
    if (!room)
      return status(404, { message: 'error.notFound' })
    if (room.createdBy !== username)
      return status(403, { message: 'error.forbidden' })
    const [updated] = await RoomService.updateRoom(roomId, body.name)
    return updated!
  }, { body: roomNameBody })

  .delete('/:id', async ({ username, params, status }) => {
    const roomId = Number(params.id)
    const [room] = await RoomService.findRoom(roomId)
    if (!room)
      return status(404, { message: 'error.notFound' })
    if (room.createdBy !== username)
      return status(403, { message: 'error.forbidden' })
    await RoomService.deleteRoomMessages(roomId)
    await RoomService.deleteRoom(roomId)
    return { ok: true }
  })
