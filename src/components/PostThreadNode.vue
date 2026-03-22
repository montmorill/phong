<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import PostItem from '@/components/PostItem.vue'

interface ThreadNode {
  id: number
  parentId: number
  title?: string
  content: string
  username: string
  nickname: string
  avatar: string
  createdAt: number
  likeCount: number
  replyCount?: number
  liked: boolean
  children: ThreadNode[]
  parentUsername?: string
  parentNickname?: string
  parentContent?: string
}

const props = withDefaults(defineProps<{
  node: ThreadNode
  depth: number
  replyingToId: number | null
  maxExpandedDepth?: number
}>(), {
  maxExpandedDepth: 3,
})

const emit = defineEmits<{
  reply: [id: number]
  deleted: [id: number]
  quoteClick: [id: number]
}>()

defineSlots<{
  composer: (props: { node: ThreadNode }) => any
}>()

function countDescendants(node: ThreadNode): number {
  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0)
}

const hasChildren = computed(() => props.node.children.length > 0)
const descendantCount = computed(() => countDescendants(props.node))
const collapsed = ref(hasChildren.value && props.depth >= props.maxExpandedDepth)
const flattenChildren = computed(() => props.depth >= props.maxExpandedDepth)
const postItemProps = computed(() => {
  const { children, parentId, parentUsername, parentNickname, parentContent, ...rest } = props.node
  return rest
})

function toggleCollapsed() {
  if (!hasChildren.value)
    return
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div class="thread-node" :class="{ 'thread-node-nested': depth > 1 }">
    <span v-if="depth > 1" class="thread-branch" aria-hidden="true">
      <button
        v-if="hasChildren"
        type="button"
        class="thread-toggle"
        @click="toggleCollapsed"
      >
        <Minus v-if="!collapsed" class="size-3.5" />
        <Plus v-else class="size-3.5" />
      </button>
    </span>

    <div class="thread-body">
      <PostItem
        v-bind="postItemProps"
        expanded
        replyable
        @reply="emit('reply', node.id)"
        @deleted="emit('deleted', node.id)"
        @quote-click="emit('quoteClick', $event)"
      />

      <div v-if="replyingToId === node.id" class="thread-compose">
        <slot name="composer" :node="node" />
      </div>

      <button
        v-if="hasChildren && collapsed"
        type="button"
        class="thread-more"
        @click="toggleCollapsed"
      >
        <span class="thread-more-icon">
          <Plus class="size-3.5" />
        </span>
        展开 {{ descendantCount }} 条更深回复
      </button>

      <div
        v-if="hasChildren && !collapsed"
        class="thread-children"
        :class="{ 'thread-children-flat': flattenChildren }"
      >
        <div
          v-for="(child, index) in node.children"
          :key="child.id"
          class="thread-child"
          :class="{ 'thread-child-last': index === node.children.length - 1 }"
        >
          <PostThreadNode
            :node="child"
            :depth="depth + 1"
            :replying-to-id="replyingToId"
            :max-expanded-depth="maxExpandedDepth"
            @reply="emit('reply', $event)"
            @deleted="emit('deleted', $event)"
            @quote-click="emit('quoteClick', $event)"
          >
            <template #composer="slotProps">
              <slot name="composer" :node="slotProps.node" />
            </template>
          </PostThreadNode>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thread-node {
  min-width: 0;
}

.thread-node-nested {
  position: relative;
}

.thread-body {
  min-width: 0;
}

.thread-branch {
  position: absolute;
  left: -1.45rem;
  top: 1.15rem;
  z-index: 2;
  width: 1.45rem;
  height: 1.1rem;
}

.thread-toggle {
  position: absolute;
  top: 0;
  left: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  transform: translate(-50%, -50%);
  border: 1px solid color-mix(in oklch, var(--border) 90%, transparent);
  border-radius: 999px;
  background: color-mix(in oklch, var(--background) 96%, white);
  color: color-mix(in oklch, var(--foreground) 78%, transparent);
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
}

.thread-toggle:hover {
  background: color-mix(in oklch, var(--muted) 86%, white);
  color: var(--foreground);
}

.thread-compose {
  margin-top: 0.9rem;
}

.thread-more {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.8rem;
  border: 0;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 0.875rem;
  transition: color 150ms ease;
}

.thread-more:hover {
  color: var(--foreground);
}

.thread-more-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  border: 1px solid color-mix(in oklch, var(--border) 90%, transparent);
  border-radius: 999px;
  background: color-mix(in oklch, var(--background) 96%, white);
}

.thread-children {
  position: relative;
  margin-top: 1rem;
  padding-left: 2rem;
}

.thread-children-flat {
  padding-left: 1rem;
}

.thread-child {
  position: relative;
  min-width: 0;
}

.thread-child + .thread-child {
  margin-top: 1rem;
}

.thread-child::before {
  content: "";
  position: absolute;
  left: -1.45rem;
  top: -1rem;
  bottom: -1rem;
  width: 2px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--border) 82%, transparent);
}

.thread-child::after {
  content: "";
  position: absolute;
  left: -1.45rem;
  top: 1.15rem;
  width: 1.45rem;
  height: 1.1rem;
  border-left: 2px solid color-mix(in oklch, var(--border) 82%, transparent);
  border-bottom: 2px solid color-mix(in oklch, var(--border) 82%, transparent);
  border-bottom-left-radius: 0.92rem;
}

.thread-child-last::before {
  bottom: auto;
  height: 2.35rem;
}

.thread-children-flat .thread-child::before {
  left: -0.7rem;
}

.thread-children-flat .thread-child::after {
  left: -0.7rem;
  width: 0.7rem;
}

.thread-children-flat .thread-node-nested > .thread-branch {
  left: -0.7rem;
  width: 0.7rem;
}
</style>
