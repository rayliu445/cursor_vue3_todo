<template>
  <div class="flex flex-col h-full overflow-hidden" :style="{ backgroundColor: 'var(--bg-app)' }">
    <!-- 页面头部 -->
    <div
      class="flex items-center justify-between px-6 h-14 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-semibold" :style="{ color: 'var(--text-primary)' }">已完成</h1>
        <span
          class="text-xs px-2 py-0.5 rounded-full"
          :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }"
        >
          {{ completedTodos.length }}
        </span>
      </div>
    </div>

    <!-- 已完成任务列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="completedTodos.length > 0" class="py-2">
        <div
          v-for="todo in completedTodos"
          :key="todo.id"
          class="flex items-center gap-3 px-6 py-3 transition-all duration-150 cursor-pointer"
          :style="{
            borderBottom: '1px solid var(--border-color)',
            paddingLeft: todo.parentId ? '3.5rem' : '1.5rem',
          }"
          @click="openDetail(todo)"
        >
          <span
            v-if="todo.parentId"
            class="text-xs flex-shrink-0"
            :style="{ color: 'var(--text-tertiary)' }"
            title="子任务"
          >
            ↳
          </span>
          <input
            type="checkbox"
            :checked="todo.completed"
            class="checkbox-tick"
            @click.stop
            @change="handleToggle(todo.id)"
          />
          <span
            class="priority-dot"
            :class="{
              high: todo.priority === 5,
              medium: todo.priority === 3,
              low: todo.priority === 1,
              none: !todo.priority || todo.priority === 0,
            }"
          />
          <span class="flex-1 min-w-0">
            <span
              class="block text-sm truncate line-through"
              :style="{ color: 'var(--text-tertiary)' }"
            >
              {{ todo.title }}
            </span>
            <span
              v-if="todo.content"
              class="block text-xs truncate mt-0.5"
              :style="{ color: 'var(--text-tertiary)' }"
            >
              {{ todo.content }}
            </span>
          </span>
          <span
            v-if="todo.completedTime"
            class="text-xs flex-shrink-0"
            :style="{ color: 'var(--text-tertiary)' }"
          >
            {{ formatDate(todo.completedTime) }}
          </span>
          <button
            class="icon-btn w-7 h-7 flex items-center justify-center rounded-lg"
            :style="{ color: 'var(--text-tertiary)' }"
            title="删除"
            @click="deleteTodo(todo.id)"
          >
            <AppIcon name="delete" :size="14" />
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="30" width="80" height="60" rx="8" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="35" y1="50" x2="85" y2="50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="35" y1="62" x2="70" y2="62" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="35" y1="74" x2="60" y2="74" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="70" cy="30" r="14" stroke="#e88c31" stroke-width="2" fill="#fdf6ed"/>
          <polyline points="64,30 68,34 76,26" stroke="#e88c31" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="text-sm" :style="{ color: 'var(--text-tertiary)' }">还没有已完成的任务</p>
      </div>
    </div>

    <!-- 任务详情对话框（点击条目进入） -->
    <TaskDetailDialog v-model="showDetail" :todo-id="detailId" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTodoStore, sortWithHierarchy } from '../stores/todo'
import { storeToRefs } from 'pinia'
import AppIcon from '../components/icons/AppIcon.vue'
import TaskDetailDialog from '../components/TaskDetailDialog.vue'

const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const { fetchTodos, removeTodo, toggleTodo } = todoStore

const completedTodos = computed(() => {
  // 层级排序：父任务在前，已完成子任务紧跟其后
  return sortWithHierarchy(todos.value.filter(todo => todo.completed))
})

// 任务详情对话框
const showDetail = ref(false)
const detailId = ref<string | null>(null)
function openDetail(todo: { id: string }) {
  detailId.value = todo.id
  showDetail.value = true
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const today = new Date()
  if (dateStr.startsWith(today.toISOString().slice(0, 10))) return '今天'
  return `${month}/${day}`
}

async function deleteTodo(id: string) {
  if (confirm('确定要删除这个任务吗？')) {
    await removeTodo(id)
  }
}

function handleToggle(id: string) {
  toggleTodo(id)
}

onMounted(() => {
  if (todos.value.length === 0) {
    fetchTodos()
  }
})
</script>
