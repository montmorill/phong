import { renderMarkdownBasic } from '@/composables/useMarkdown'

export interface RoomMentionOption {
  id: number
  name: string
}

export function renderRoomMessageHtml(content: string, rooms: RoomMentionOption[]): string {
  const roomMap = new Map(rooms.map(room => [room.id, room.name]))
  const linked = content
    .replace(/(^|[\s(])@([\w-]+)/g, (_, prefix: string, username: string) => {
      return `${prefix}[@${username}](/@${username})`
    })
    .replace(/(^|[\s(])_(\d+)_/g, (_, prefix: string, roomId: string) => {
      const id = Number(roomId)
      const label = roomMap.get(id)?.trim() ? `#${roomMap.get(id)}` : `#${roomId}`
      return `${prefix}[${label}](/rooms/${roomId})`
    })

  return renderMarkdownBasic(linked)
}

export function makeReplyPreview(content: string, limit = 72): string {
  const plain = content
    .replace(/\s+/g, ' ')
    .trim()

  if (plain.length <= limit)
    return plain
  return `${plain.slice(0, Math.max(0, limit - 1))}…`
}
