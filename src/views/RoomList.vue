<script setup lang="ts">
import { MessageSquare, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, user } from '@/lib/api'

interface Room {
  id: number
  name: string
  createdBy: string
  createdAt: Date
  onlineCount: number
}

const rooms = ref<Room[]>([])
const loading = ref(false)
const newRoomName = ref('')
const creating = ref(false)
const router = useRouter()
const deletingRoom = ref<Room | null>(null)
const renamingId = ref<number | null>(null)
const renameDraft = ref('')

async function loadRooms() {
  loading.value = true
  const { data } = await api.rooms.get()
  if (data)
    rooms.value = data
  loading.value = false
}

async function createRoom() {
  const name = newRoomName.value.trim()
  if (!name)
    return
  if (name.length < 2)
    return
  creating.value = true
  const { data } = await api.rooms.post({ name })
  if (data) {
    rooms.value.push({ ...data, onlineCount: 0 })
    newRoomName.value = ''
    router.push(`/rooms/${data.id}`)
  }
  creating.value = false
}

function startRename(room: Room) {
  renamingId.value = room.id
  renameDraft.value = room.name
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(`input[data-room-rename-id="${room.id}"]`)
    input?.focus()
    input?.select()
  })
}

async function saveRename(room: Room) {
  const name = renameDraft.value.trim()
  if (!name || name.length < 2 || name === room.name) {
    renamingId.value = null
    return
  }
  const { data } = await api.rooms({ id: String(room.id) }).patch({ name })
  if (data) {
    const r = rooms.value.find(r => r.id === room.id)
    if (r)
      r.name = data.name
  }
  renamingId.value = null
}

async function confirmDelete() {
  const room = deletingRoom.value
  if (!room)
    return
  const { error } = await api.rooms({ id: String(room.id) }).delete()
  if (!error)
    rooms.value = rooms.value.filter(r => r.id !== room.id)
  deletingRoom.value = null
}

onMounted(loadRooms)
</script>

<template>
  <div class="w-full max-w-lg mx-auto py-8 px-4 flex flex-col gap-6">
    <h1 class="text-2xl font-bold flex items-center gap-2">
      <MessageSquare class="size-6" />
      {{ $t('room.title') }}
    </h1>

    <!-- Create room -->
    <div v-if="user" class="flex gap-2">
      <Input
        v-model="newRoomName"
        :placeholder="$t('room.createPlaceholder')"
        minlength="2"
        maxlength="50"
        class="flex-1"
        @keydown.enter="createRoom"
      />
      <Button :disabled="newRoomName.trim().length < 2 || creating" @click="createRoom">
        <Plus class="size-4" />
        {{ $t('room.create') }}
      </Button>
    </div>

    <!-- Room list -->
    <div v-if="loading" class="text-center text-muted-foreground py-12 text-sm">
      {{ $t('room.loading') }}
    </div>
    <div v-else-if="rooms.length === 0" class="text-center text-muted-foreground py-12 text-sm">
      {{ $t('room.empty') }}
    </div>
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="room in rooms"
        :key="room.id"
        class="flex items-center gap-3 border rounded-lg px-4 py-3 hover:bg-muted/50 transition-colors group"
        :class="renamingId !== room.id && 'cursor-pointer'"
        @click="renamingId !== room.id && router.push(`/rooms/${room.id}`)"
      >
        <MessageSquare class="size-5 text-muted-foreground shrink-0" />

        <!-- Inline rename input -->
        <Input
          v-if="renamingId === room.id"
          v-model="renameDraft"
          :data-room-rename-id="room.id"
          autofocus
          :placeholder="$t('room.renamePlaceholder')"
          minlength="2"
          maxlength="50"
          class="flex-1 h-7 text-sm"
          @keydown.enter="saveRename(room)"
          @keydown.esc="renamingId = null"
          @blur="saveRename(room)"
          @click.stop
        />
        <span v-else class="flex-1 min-w-0 font-medium truncate">
          {{ room.name }}
          <span class="text-xs text-muted-foreground font-normal ml-1">@{{ room.createdBy }}</span>
          <span v-if="room.onlineCount" class="text-xs text-muted-foreground font-normal ml-2">· {{ $t('room.online', { count: room.onlineCount }) }}</span>
        </span>

        <template v-if="user?.username === room.createdBy && renamingId !== room.id">
          <button
            class="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
            @click.stop="startRename(room)"
          >
            <Pencil class="size-4" />
          </button>
          <button
            class="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
            @click.stop="deletingRoom = room"
          >
            <Trash2 class="size-4" />
          </button>
        </template>
      </li>
    </ul>

    <!-- Delete confirm dialog -->
    <AlertDialog :open="!!deletingRoom" @update:open="val => { if (!val) deletingRoom = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ deletingRoom ? $t('room.deleteConfirm', { name: deletingRoom.name }) : '' }}</AlertDialogTitle>
          <AlertDialogDescription>{{ $t('room.deleteDescription') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-white hover:bg-destructive/90"
            @click.prevent="confirmDelete"
          >
            {{ $t('common.delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
