/** 飞花令游戏逻辑（纯函数，无副作用） */

export interface FeiHuaLingState {
  keyword: string
  activePlayers: string[]  // 当前仍在局的玩家（按出场顺序）
  turnIndex: number        // 当前轮到 activePlayers[turnIndex]
  usedLines: Set<string>   // 已使用的诗句（防止重复）
  turnTimeoutMs: number    // 每轮限时（毫秒）
}

export interface MoveResult {
  isCurrentPlayer: boolean
  valid: boolean           // 仅当 isCurrentPlayer 时有意义
  nextPlayer: string | null // null 表示游戏结束
  winner: string | null    // 游戏结束时的获胜者
}

export function createGame(keyword: string, players: string[], turnTimeoutMs: number): FeiHuaLingState {
  return { keyword, activePlayers: [...players], turnIndex: 0, usedLines: new Set(), turnTimeoutMs }
}

export function currentPlayer(state: FeiHuaLingState): string {
  return state.activePlayers[state.turnIndex]
}

/**
 * 处理一次出牌。
 * - 不是当前玩家：原样返回（不影响游戏状态）
 * - 是当前玩家：校验诗句，通过则推进，失败则淘汰
 */
export function processMove(
  state: FeiHuaLingState,
  username: string,
  content: string,
): { result: MoveResult, newState: FeiHuaLingState } {
  const cp = currentPlayer(state)

  if (cp !== username) {
    return { result: { isCurrentPlayer: false, valid: true, nextPlayer: cp, winner: null }, newState: state }
  }

  const valid = content.includes(state.keyword) && !state.usedLines.has(content)

  if (valid) {
    const newUsedLines = new Set(state.usedLines)
    newUsedLines.add(content)
    const newTurnIndex = (state.turnIndex + 1) % state.activePlayers.length
    const newState: FeiHuaLingState = { ...state, turnIndex: newTurnIndex, usedLines: newUsedLines }
    return {
      result: { isCurrentPlayer: true, valid: true, nextPlayer: currentPlayer(newState), winner: null },
      newState,
    }
  }

  // 淘汰当前玩家
  const newActivePlayers = state.activePlayers.filter(p => p !== username)
  if (newActivePlayers.length <= 1) {
    const winner = newActivePlayers[0] ?? null
    return {
      result: { isCurrentPlayer: true, valid: false, nextPlayer: null, winner },
      newState: { ...state, activePlayers: newActivePlayers, turnIndex: 0 },
    }
  }

  const newTurnIndex = state.turnIndex % newActivePlayers.length
  const newState: FeiHuaLingState = { ...state, activePlayers: newActivePlayers, turnIndex: newTurnIndex }
  return {
    result: { isCurrentPlayer: true, valid: false, nextPlayer: currentPlayer(newState), winner: null },
    newState,
  }
}

/**
 * 玩家断线/离开时，将其从游戏中移除。
 */
export function removePlayer(
  state: FeiHuaLingState,
  username: string,
): { newState: FeiHuaLingState, winner: string | null, gameOver: boolean } {
  const idx = state.activePlayers.indexOf(username)
  if (idx === -1)
    return { newState: state, winner: null, gameOver: false }

  const newActivePlayers = state.activePlayers.filter(p => p !== username)
  if (newActivePlayers.length <= 1) {
    return {
      newState: { ...state, activePlayers: newActivePlayers, turnIndex: 0 },
      winner: newActivePlayers[0] ?? null,
      gameOver: true,
    }
  }

  // 若被移除的玩家在当前指针之前，指针前移一位
  let newTurnIndex = state.turnIndex
  if (idx < state.turnIndex)
    newTurnIndex--
  newTurnIndex = newTurnIndex % newActivePlayers.length

  return {
    newState: { ...state, activePlayers: newActivePlayers, turnIndex: newTurnIndex },
    winner: null,
    gameOver: false,
  }
}
