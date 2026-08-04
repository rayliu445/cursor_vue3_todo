<template>
  <div class="flex flex-col h-full overflow-hidden" :style="{ backgroundColor: 'var(--bg-app)' }">
    <!-- ===== 页面头部 ===== -->
    <div
      class="flex items-center justify-between px-6 h-14 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-semibold" :style="{ color: 'var(--text-primary)' }">笔记</h1>
        <!-- 归档切换：笔记（未归档）/ 归档 -->
        <div class="flex items-center gap-1">
          <button
            class="px-2.5 py-1 text-xs rounded-md transition-all duration-150 font-medium"
            :style="getTabStyle(false)"
            @click="showArchived = false"
          >
            笔记
            <span v-if="notes.length" class="ml-0.5 opacity-70">{{ notes.length }}</span>
          </button>
          <button
            class="px-2.5 py-1 text-xs rounded-md transition-all duration-150 font-medium"
            :style="getTabStyle(true)"
            @click="showArchived = true"
          >
            归档
            <span v-if="archivedNotes.length" class="ml-0.5 opacity-70">{{ archivedNotes.length }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 添加笔记条（仅未归档 tab 显示） ===== -->
    <div
      v-if="!showArchived"
      class="px-6 py-3 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="flex items-center gap-2">
        <div
          class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 cursor-text"
          :style="{
            backgroundColor: 'var(--bg-app)',
            border: newTitle ? '1px solid var(--text-secondary)' : '1px solid transparent',
          }"
          @click="focusTitle"
        >
          <span class="flex-shrink-0 flex items-center" :style="{ color: 'var(--text-secondary)' }">
            <AppIcon name="notes" :size="18" />
          </span>
          <input
            ref="titleInputRef"
            v-model="newTitle"
            type="text"
            placeholder="笔记标题..."
            class="flex-1 bg-transparent text-sm outline-none"
            :style="{ color: 'var(--text-primary)' }"
            @keyup.enter="addNote"
          />
          <button
            v-if="newTitle.trim()"
            class="text-sm font-medium px-3 py-1 rounded-md transition-all duration-150"
            :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }"
            @click="addNote"
          >
            添加
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 笔记列表 ===== -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="displayNotes.length > 0" class="py-2">
        <div
          v-for="note in displayNotes"
          :key="note.id"
          class="group flex items-start gap-3 px-6 py-3 cursor-pointer transition-all duration-150 border-b"
          :style="{
            borderColor: 'var(--border-color)',
            backgroundColor: 'transparent',
          }"
          @click="openDetail(note)"
          @contextmenu.prevent="onNoteContextMenu($event, note)"
        >
          <span class="flex-shrink-0 flex items-center mt-0.5" :style="{ color: 'var(--text-tertiary)' }">
            <AppIcon :name="note.completed ? 'archive' : 'notes'" :size="16" />
          </span>
          <div class="flex-1 min-w-0">
            <div
              class="text-sm truncate"
              :style="{ color: note.completed ? 'var(--text-tertiary)' : 'var(--text-primary)' }"
            >
              {{ note.title }}
            </div>
            <div
              v-if="note.content"
              class="text-xs mt-1 whitespace-pre-wrap line-clamp-2"
              :style="{ color: 'var(--text-tertiary)' }"
            >
              {{ note.content }}
            </div>
            <div v-if="note.completedTime" class="text-xs mt-1" :style="{ color: 'var(--text-tertiary)' }">
              归档于 {{ formatDate(note.completedTime) }}
            </div>
          </div>
          <!-- 悬停操作 -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              class="icon-btn w-7 h-7 flex items-center justify-center rounded-lg"
              :style="{ color: 'var(--text-tertiary)' }"
              :title="note.completed ? '恢复' : '归档'"
              @click.stop="toggleArchive(note)"
            >
              <AppIcon :name="note.completed ? 'restore' : 'archive'" :size="14" />
            </button>
            <button
              class="icon-btn w-7 h-7 flex items-center justify-center rounded-lg"
              :style="{ color: 'var(--text-tertiary)' }"
              title="删除"
              @click.stop="removeNote(note)"
            >
              <AppIcon name="delete" :size="14" />
            </button>
          </div>
        </div>
      </div>
      <EmptyState
        v-else
        :icon="showArchived ? 'archive' : 'notes'"
        :text="showArchived ? '还没有归档的笔记' : '还没有笔记，添加一个吧'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useTodoStore, type Todo } from '../stores/todo'
import { storeToRefs } from 'pinia'
import AppIcon from '../components/icons/AppIcon.vue'
import { showContextMenu, type ContextMenuItem } from '../stores/context-menu'
import EmptyState from '../components/EmptyState.vue'

const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const { addTodo, removeTodo, fetchTodos, setArchived } = todoStore

const newTitle = ref('')
const titleInputRef = ref<HTMLInputElement | null>(null)

// 归档切换：false=未归档笔记，true=已归档
const showArchived = ref(false)

// 未归档笔记：kind=NOTE 且未完成
const notes = computed(() => {
  return todos.value
    .filter(t => t.kind === 'NOTE' && !t.completed)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
})

// 已归档笔记：kind=NOTE 且已完成（归档日期按 completedTime，新的在前）
const archivedNotes = computed(() => {
  return todos.value
    .filter(t => t.kind === 'NOTE' && t.completed)
    .sort((a, b) => (b.completedTime || b.createdAt || '').localeCompare(a.completedTime || a.createdAt || ''))
})

const displayNotes = computed(() => showArchived.value ? archivedNotes.value : notes.value)

function getTabStyle(isArchived: boolean) {
  const selected = showArchived.value === isArchived
  return {
    backgroundColor: selected ? 'var(--color-accent-light)' : 'var(--bg-hover)',
    color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: selected ? '600' : '400',
    border: '1px solid ' + (selected ? 'var(--border-color)' : 'transparent'),
  }
}

// 归档 / 恢复（归档 = 标记完成，日期为当天）
function toggleArchive(note: Todo) {
  setArchived(note.id, !note.completed)
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function focusTitle() {
  titleInputRef.value?.focus()
}

// 添加笔记：只输入标题（和普通任务一致），内容在右侧详情面板编辑
async function addNote() {
  const title = newTitle.value.trim()
  if (!title) return
  const note = await addTodo({
    title,
    kind: 'NOTE',
    priority: 0,
  })
  newTitle.value = ''
  // 自动在右侧第四列详情面板打开新笔记，便于立即编辑内容
  if (note && note.id) {
    todoStore.openDetail(note.id)
  }
  nextTick(() => titleInputRef.value?.focus())
}

async function removeNote(note: Todo) {
  if (confirm('确定要删除这个笔记吗？')) {
    await removeTodo(note.id)
  }
}

// 详情（右侧第四列面板，全局共享）
function openDetail(note: Todo) {
  todoStore.openDetail(note.id)
}

// 右键快捷菜单（笔记条目）：未归档可归档，已归档可恢复
function onNoteContextMenu(e: MouseEvent, note: Todo) {
  const items: ContextMenuItem[] = []
  if (note.completed) {
    items.push({ label: '恢复归档', icon: 'restore', handler: () => setArchived(note.id, false) })
  } else {
    items.push({ label: '归档', icon: 'archive', handler: () => setArchived(note.id, true) })
  }
  items.push(
    {
      label: '转为任务',
      icon: 'today',
      handler: () => todoStore.convertKind(note.id, 'TASK'),
    },
    { label: '编辑', icon: 'edit', handler: () => openDetail(note) },
    { label: '删除', icon: 'delete', danger: true, handler: () => removeNote(note) },
  )
  showContextMenu(e, items)
}

onMounted(() => {
  fetchTodos()
})
</script>
