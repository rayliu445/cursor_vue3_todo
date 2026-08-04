<template>
  <div class="flex flex-col h-full overflow-hidden" :style="{ backgroundColor: 'var(--bg-app)' }">
    <!-- ===== 页面头部 ===== -->
    <div
      class="flex items-center justify-between px-6 h-14 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-semibold" :style="{ color: 'var(--text-primary)' }">笔记</h1>
        <span
          v-if="notes.length > 0"
          class="text-xs px-2 py-0.5 rounded-full"
          :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }"
        >
          {{ notes.length }}
        </span>
      </div>
    </div>

    <!-- ===== 添加笔记条 ===== -->
    <div
      class="px-6 py-3 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="flex items-center gap-2">
        <div
          class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 cursor-text"
          :style="{
            backgroundColor: 'var(--bg-app)',
            border: newTitle || newContent ? '1px solid var(--text-secondary)' : '1px solid transparent',
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
          <input
            v-model="newContent"
            type="text"
            placeholder="内容（可选）..."
            class="flex-1 bg-transparent text-sm outline-none"
            :style="{ color: 'var(--text-secondary)' }"
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
      <div v-if="notes.length > 0" class="py-2">
        <div
          v-for="note in notes"
          :key="note.id"
          class="group flex items-start gap-3 px-6 py-3 cursor-pointer transition-all duration-150 border-b"
          :style="{
            borderColor: 'var(--border-color)',
            backgroundColor: 'transparent',
          }"
          @click="openDetail(note)"
        >
          <span class="flex-shrink-0 flex items-center mt-0.5" :style="{ color: 'var(--text-tertiary)' }">
            <AppIcon name="notes" :size="16" />
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate" :style="{ color: 'var(--text-primary)' }">
              {{ note.title }}
            </div>
            <div
              v-if="note.content"
              class="text-xs mt-1 whitespace-pre-wrap line-clamp-2"
              :style="{ color: 'var(--text-tertiary)' }"
            >
              {{ note.content }}
            </div>
          </div>
          <!-- 悬停操作 -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              class="icon-btn w-7 h-7 flex items-center justify-center rounded-lg"
              :style="{ color: 'var(--text-tertiary)' }"
              title="编辑"
              @click.stop="openDetail(note)"
            >
              <AppIcon name="edit" :size="14" />
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
      <div
        v-else
        class="flex flex-col items-center justify-center py-16 gap-3"
      >
        <AppIcon name="notes" :size="48" color="var(--text-tertiary)" />
        <p class="text-sm" :style="{ color: 'var(--text-tertiary)' }">还没有笔记，添加一个吧</p>
      </div>
    </div>

    <!-- 详情（复用任务详情对话框，笔记模式下主要编辑内容） -->
    <TaskDetailDialog v-model="showDetail" :todo-id="detailId" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useTodoStore } from '../stores/todo'
import { storeToRefs } from 'pinia'
import AppIcon from '../components/icons/AppIcon.vue'
import TaskDetailDialog from '../components/TaskDetailDialog.vue'

const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const { addTodo, removeTodo, fetchTodos } = todoStore

const newTitle = ref('')
const newContent = ref('')
const titleInputRef = ref<HTMLInputElement | null>(null)

// 笔记列表：kind=NOTE，新的在前
const notes = computed(() => {
  return todos.value
    .filter(t => t.kind === 'NOTE')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
})

function focusTitle() {
  titleInputRef.value?.focus()
}

async function addNote() {
  const title = newTitle.value.trim()
  if (!title) return
  await addTodo({
    title,
    content: newContent.value.trim() || undefined,
    kind: 'NOTE',
    priority: 0,
  })
  newTitle.value = ''
  newContent.value = ''
  nextTick(() => titleInputRef.value?.focus())
}

async function removeNote(note: any) {
  if (confirm('确定要删除这个笔记吗？')) {
    await removeTodo(note.id)
  }
}

// 详情
const showDetail = ref(false)
const detailId = ref<string | null>(null)
function openDetail(note: any) {
  detailId.value = note.id
  showDetail.value = true
}

onMounted(() => {
  fetchTodos()
})
</script>
