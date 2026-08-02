<template>
  <div class="flex flex-col h-full overflow-hidden" :style="{ backgroundColor: 'var(--bg-app)' }">
    <!-- ===== 页面头部 ===== -->
    <div
      class="flex items-center justify-between px-6 h-14 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-semibold" :style="{ color: 'var(--text-primary)' }">
          {{ pageTitle }}
        </h1>
        <span
          v-if="filteredTodos.length > 0"
          class="text-xs px-2 py-0.5 rounded-full"
          :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }"
        >
          {{ filteredTodos.length }}
        </span>
      </div>
    </div>

    <!-- ===== 添加任务条 (固定于头部下方) ===== -->
    <div
      class="px-6 py-3 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="flex items-center gap-2">
        <div
          class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 cursor-text"
          :style="{
            backgroundColor: 'var(--bg-app)',
            border: showAddOptions || newTodoTitle.trim() ? '1px solid var(--text-secondary)' : '1px solid transparent',
          }"
          @click="focusInput"
        >
          <span class="flex-shrink-0 flex items-center">
            <AppIcon name="add" :size="18" color="var(--text-secondary)" />
          </span>
          <input
            ref="addInputRef"
            v-model="newTodoTitle"
            type="text"
            placeholder="添加任务..."
            class="flex-1 bg-transparent text-sm outline-none"
            :style="{ color: 'var(--text-primary)' }"
            @keyup.enter="handleAddTodo"
            @focus="showAddOptions = true"
          />
          <button
            v-if="newTodoTitle.trim()"
            class="text-sm font-medium px-3 py-1 rounded-md transition-all duration-150"
            :style="{
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--text-primary)',
            }"
            @click="handleAddTodo"
          >
            添加
          </button>
        </div>
      </div>
      <!-- 展开选项 -->
      <transition name="slide-down">
        <div v-if="showAddOptions || newTodoTitle.trim()" class="flex items-center gap-4 mt-3 ml-2">
          <div class="flex items-center gap-2">
            <span class="text-xs" :style="{ color: 'var(--text-secondary)' }">优先级</span>
            <div class="flex gap-1">
              <button
                v-for="p in priorityOptions"
                :key="p.value"
                class="px-2.5 py-1 text-xs rounded-md transition-all duration-150 font-medium"
                :style="getPriorityBtnStyle(p.value)"
                @click="newTodoPriority = p.value"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs" :style="{ color: 'var(--text-secondary)' }">日期</span>
            <input
              v-model="newTodoDueDate"
              type="date"
              class="px-2 py-1 text-xs rounded-md border transition-all duration-150"
              :style="{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }"
            />
          </div>
        </div>
      </transition>
    </div>

    <!-- ===== 任务列表 (可滚动) ===== -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="filteredTodos.length > 0" class="py-2">
        <transition-group name="list" tag="div">
          <div
            v-for="todo in filteredTodos"
            :key="todo.id"
            class="group flex items-center gap-3 px-6 py-3 transition-all duration-150 cursor-pointer"
            :style="{
              backgroundColor: todo === editingTodo ? 'var(--bg-hover)' : 'transparent',
              borderBottom: '1px solid var(--border-color)',
            }"
            @mouseenter="hoveredTodo = todo.id"
            @mouseleave="hoveredTodo = null"
          >
            <!-- 复选框 -->
            <input
              type="checkbox"
              :checked="todo.completed"
              class="checkbox-tick"
              @change="todoStore.toggleTodo(todo.id)"
            />

            <!-- 优先级圆点 -->
            <span
              class="priority-dot"
              :class="{
                high: todo.priority === 5,
                medium: todo.priority === 3,
                low: todo.priority === 1,
                none: !todo.priority || todo.priority === 0,
              }"
            />

            <!-- 任务标题 -->
            <span
              v-if="editingTodo !== todo"
              class="flex-1 text-sm truncate"
              :class="{ 'line-through': todo.completed }"
              :style="{
                color: todo.completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                textDecorationColor: 'var(--text-tertiary)',
              }"
              @click="startInlineEdit(todo)"
            >
              {{ todo.title }}
            </span>

            <!-- 内联编辑输入框 -->
            <input
              v-else
              ref="inlineEditRef"
              v-model="editTitle"
              type="text"
              class="flex-1 text-sm px-2 py-0.5 rounded border outline-none"
              :style="{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--color-accent)',
                color: 'var(--text-primary)',
              }"
              @keyup.enter="confirmInlineEdit"
              @keyup.escape="cancelInlineEdit"
              @blur="confirmInlineEdit"
            />

            <!-- 截止日期 -->
            <span
              v-if="todo.dueDate"
              class="text-xs flex-shrink-0"
              :style="{ color: 'var(--text-tertiary)' }"
            >
              {{ formatDate(todo.dueDate) }}
            </span>

            <!-- 悬停操作按钮 -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                class="icon-btn w-7 h-7 flex items-center justify-center rounded-lg"
                :style="{ color: 'var(--text-tertiary)' }"
                title="编辑"
                @click="startEdit(todo)"
              >
                <AppIcon name="edit" :size="14" />
              </button>
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
        </transition-group>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="30" width="80" height="60" rx="8" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="35" y1="50" x2="85" y2="50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="35" y1="62" x2="70" y2="62" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="35" y1="74" x2="60" y2="74" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="90" cy="30" r="14" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="90" y1="24" x2="90" y2="36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="84" y1="30" x2="96" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p class="text-sm" :style="{ color: 'var(--text-tertiary)' }">
          {{ emptyMessage }}
        </p>
      </div>
    </div>

    <!-- 编辑对话框（完整编辑） -->
    <transition name="scale">
      <div
        v-if="showEditDialog"
        class="fixed inset-0 z-50 flex items-center justify-center"
        :style="{ backgroundColor: 'rgba(0,0,0,0.4)' }"
        @click.self="cancelEdit"
      >
        <div
          class="w-full max-w-md rounded-xl shadow-lg p-6 relative"
          :style="{ backgroundColor: 'var(--bg-card)' }"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold" :style="{ color: 'var(--text-primary)' }">编辑任务</h3>
            <button
              class="icon-btn w-7 h-7 flex items-center justify-center rounded-lg"
              :style="{ color: 'var(--text-tertiary)' }"
              @click="cancelEdit"
            >
              ✕
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">任务内容</label>
              <input
                v-model="editTitle"
                type="text"
                class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all duration-150"
                :style="{
                  backgroundColor: 'var(--bg-app)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }"
                @keyup.enter="confirmEdit"
              />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">优先级</label>
              <div class="flex gap-2">
                <button
                  v-for="p in priorityOptions"
                  :key="p.value"
                  class="flex-1 py-2 text-sm rounded-lg transition-all duration-150 font-medium"
                  :style="getPriorityBtnStyle(p.value, editPriority === p.value)"
                  @click="editPriority = p.value"
                >
                  {{ p.label }}
                </button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">截止日期</label>
              <input
                v-model="editDueDate"
                type="date"
                class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all duration-150"
                :style="{
                  backgroundColor: 'var(--bg-app)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }"
              />
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button
              class="px-4 py-2 text-sm rounded-lg transition-all duration-150"
              :style="{
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
              }"
              @click="cancelEdit"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm rounded-lg transition-all duration-150"
              :style="{
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                fontWeight: 500,
              }"
              @click="confirmEdit"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useTodoStore } from '../stores/todo'
import { storeToRefs } from 'pinia'
import AppIcon from '../components/icons/AppIcon.vue'

const route = useRoute()
const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const { fetchTodos, removeTodo } = todoStore

// ============ 页面标题和过滤器 ============
const currentView = computed(() => {
  const view = route.query.view as string | undefined
  if (view === 'today') return 'today'
  if (view === 'next7') return 'next7'
  return 'inbox'
})

const pageTitle = computed(() => {
  switch (currentView.value) {
    case 'today': return '今天'
    case 'next7': return '最近7天'
    default: return '收集箱'
  }
})

const emptyMessage = computed(() => {
  switch (currentView.value) {
    case 'today': return '今天没有待办任务'
    case 'next7': return '最近7天没有待办任务'
    default: return '还没有任务，添加一个吧'
  }
})

// ============ 新任务输入 ============
const addInputRef = ref<HTMLInputElement | null>(null)
const newTodoTitle = ref('')
const newTodoPriority = ref<0 | 1 | 3 | 5>(3)
const newTodoDueDate = ref(getTodayStr())
const showAddOptions = ref(false)

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function focusInput() {
  addInputRef.value?.focus()
}

// 监听左列“添加任务”按钮：跳转到本页后自动聚焦输入框
onMounted(() => {
  window.addEventListener('tinydo-focus-add', () => {
    nextTick(() => addInputRef.value?.focus())
  })
})

const priorityOptions = [
  { value: 0, label: '无' },
  { value: 1, label: '低' },
  { value: 3, label: '中' },
  { value: 5, label: '高' },
]

function getPriorityBtnStyle(value: number, isSelected?: boolean) {
  const selected = isSelected !== undefined ? isSelected : newTodoPriority.value === value
  const dotColors: Record<number, string> = {
    0: '#bfbfbf',
    1: '#3498db',
    3: '#e88c31',
    5: '#e74c3c',
  }
  return {
    backgroundColor: selected ? 'var(--color-accent-light)' : 'var(--bg-hover)',
    color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: selected ? '600' : '400',
    border: '1px solid ' + (selected ? 'var(--border-color)' : 'transparent'),
  }
}

// ============ 搜索（从侧边栏共享） ============
import { useGlobalSearch } from '../stores/search'
const { searchQuery } = useGlobalSearch()

// ============ 任务过滤 ============
const filteredTodos = computed(() => {
  let list = todos.value

  // 按视图过滤
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const next7 = new Date(today)
  next7.setDate(next7.getDate() + 7)
  const next7Str = next7.toISOString().slice(0, 10)

  switch (currentView.value) {
    case 'today':
      list = list.filter(t => !t.completed && t.dueDate && t.dueDate.startsWith(todayStr))
      break
    case 'next7':
      list = list.filter(t => {
        if (!t.dueDate || t.completed) return false
        return t.dueDate >= todayStr && t.dueDate <= next7Str
      })
      break
    default:
      list = list.filter(t => !t.completed)
  }

  // 搜索过滤
  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    list = list.filter(t => t.title.toLowerCase().includes(query))
  }

  return list
})

// ============ 操作 ============
// 添加任务
async function handleAddTodo() {
  if (!newTodoTitle.value.trim()) return
  await todoStore.addTodo({
    title: newTodoTitle.value,
    priority: newTodoPriority.value,
    dueDate: newTodoDueDate.value ? new Date(newTodoDueDate.value).toISOString() : undefined,
  })
  newTodoTitle.value = ''
  newTodoPriority.value = 3
  newTodoDueDate.value = getTodayStr()
  showAddOptions.value = false
}

// 删除任务
async function deleteTodo(id: string) {
  if (confirm('确定要删除这个任务吗？')) {
    await removeTodo(id)
  }
}

// ============ 内联编辑 ============
const editingTodo = ref<{ id: string; title: string; priority?: number; dueDate?: string } | null>(null)
const inlineEditRef = ref<HTMLInputElement | null>(null)
const editTitle = ref('')
const hoveredTodo = ref<string | null>(null)

function startInlineEdit(todo: { id: string; title: string; priority?: number; dueDate?: string }) {
  editingTodo.value = todo
  editTitle.value = todo.title
  nextTick(() => {
    inlineEditRef.value?.focus()
    inlineEditRef.value?.select()
  })
}

async function confirmInlineEdit() {
  if (!editingTodo.value) return
  if (editTitle.value.trim() && editTitle.value !== editingTodo.value.title) {
    await todoStore.updateTodo(editingTodo.value.id, { title: editTitle.value.trim() })
  }
  editingTodo.value = null
}

function cancelInlineEdit() {
  editingTodo.value = null
}

// ============ 完整编辑对话框 ============
const showEditDialog = ref(false)
const editTarget = ref<{ id: string; title: string; priority: number; dueDate?: string } | null>(null)
const editPriority = ref<0 | 1 | 3 | 5>(0)
const editDueDate = ref('')

function startEdit(todo: { id: string; title: string; priority?: number; dueDate?: string }) {
  editTarget.value = { id: todo.id, title: todo.title, priority: todo.priority ?? 0, dueDate: todo.dueDate }
  editTitle.value = todo.title
  editPriority.value = (todo.priority ?? 0) as 0 | 1 | 3 | 5
  editDueDate.value = todo.dueDate ? todo.dueDate.slice(0, 10) : ''
  showEditDialog.value = true
}

async function confirmEdit() {
  if (!editTarget.value || !editTitle.value.trim()) return
  const updates: Record<string, any> = { title: editTitle.value }
  if (editPriority.value !== editTarget.value.priority) {
    updates.priority = editPriority.value
  }
  if (editDueDate.value) {
    updates.dueDate = new Date(editDueDate.value).toISOString()
  } else {
    updates.dueDate = undefined
  }
  await todoStore.updateTodo(editTarget.value.id, updates)
  showEditDialog.value = false
  editTarget.value = null
}

function cancelEdit() {
  showEditDialog.value = false
  editTarget.value = null
}

// ============ 工具函数 ============
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (dateStr.startsWith(today.toISOString().slice(0, 10))) return '今天'
  if (dateStr.startsWith(tomorrow.toISOString().slice(0, 10))) return '明天'
  return `${month}/${day}`
}

// 初始化
onMounted(() => {
  fetchTodos()
})
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 200ms ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
