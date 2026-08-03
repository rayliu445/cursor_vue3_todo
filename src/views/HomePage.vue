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

    <!-- ===== 搜索框（仅搜索视图，可搜所有已完成/未完成） ===== -->
    <div
      v-if="currentView === 'search'"
      class="px-6 py-3 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="relative">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          placeholder="搜索所有任务（含已完成）..."
          class="w-full pl-9 pr-9 py-2 text-sm rounded-lg outline-none transition-all duration-150"
          :style="{
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)',
            border: '1px solid var(--color-accent)',
          }"
        />
        <span class="absolute left-3 top-1/2 -translate-y-1/2 flex items-center" :style="{ color: 'var(--text-tertiary)' }">
          <AppIcon name="search" :size="14" />
        </span>
        <button
          v-if="searchQuery"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full cursor-pointer"
          :style="{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-hover)' }"
          title="清除搜索"
          @click="clearSearch"
        >
          <AppIcon name="delete" :size="12" />
        </button>
      </div>
    </div>

    <!-- ===== 添加任务条 (固定于头部下方，搜索视图不显示) ===== -->
    <div
      v-if="currentView !== 'search'"
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
              backgroundColor: 'transparent',
              borderBottom: '1px solid var(--border-color)',
              paddingLeft: todo.parentId ? '3.5rem' : '1.5rem',
            }"
          >
            <!-- 子任务标记 -->
            <span
              v-if="todo.parentId"
              class="text-xs flex-shrink-0"
              :style="{ color: 'var(--text-tertiary)' }"
              title="子任务"
            >
              ↳
            </span>
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

            <!-- 任务标题 + 内容预览（点击打开详情） -->
            <div class="flex-1 min-w-0 cursor-pointer" @click="startEdit(todo)">
              <div
                class="text-sm truncate"
                :class="{ 'line-through': todo.completed }"
                :style="{
                  color: todo.completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  textDecorationColor: 'var(--text-tertiary)',
                }"
              >
                {{ todo.title }}
              </div>
              <div
                v-if="todo.content"
                class="text-xs truncate mt-0.5"
                :style="{ color: 'var(--text-tertiary)' }"
              >
                {{ todo.content }}
              </div>
            </div>

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

    <!-- 任务详情对话框（点击条目进入） -->
    <transition name="scale">
      <div
        v-if="showEditDialog"
        class="fixed inset-0 z-50 flex items-center justify-center"
        :style="{ backgroundColor: 'rgba(0,0,0,0.4)' }"
        @click.self="cancelEdit"
      >
        <div
          class="w-full max-w-md rounded-xl shadow-lg p-6 relative max-h-[85vh] overflow-y-auto"
          :style="{ backgroundColor: 'var(--bg-card)' }"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold" :style="{ color: 'var(--text-primary)' }">任务详情</h3>
            <button
              class="icon-btn w-7 h-7 flex items-center justify-center rounded-lg"
              :style="{ color: 'var(--text-tertiary)' }"
              @click="cancelEdit"
            >
              ✕
            </button>
          </div>
          <div class="space-y-4">
            <!-- 标题 -->
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">标题</label>
              <input
                v-model="editTitle"
                type="text"
                class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all duration-150"
                :style="{
                  backgroundColor: 'var(--bg-app)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }"
              />
            </div>
            <!-- 内容 -->
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">内容</label>
              <textarea
                v-model="editContent"
                rows="4"
                placeholder="任务详细内容..."
                class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all duration-150 resize-y"
                :style="{
                  backgroundColor: 'var(--bg-app)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }"
              ></textarea>
            </div>
            <!-- 完成状态 -->
            <div class="flex items-center gap-2">
              <input
                id="detail-completed"
                v-model="editCompleted"
                type="checkbox"
                class="checkbox-tick"
              />
              <label for="detail-completed" class="text-sm cursor-pointer" :style="{ color: 'var(--text-secondary)' }">已完成</label>
            </div>
            <!-- 优先级 -->
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
            <!-- 截止日期 -->
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
            <!-- 开始日期 -->
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">开始日期</label>
              <input
                v-model="editStartDate"
                type="date"
                class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all duration-150"
                :style="{
                  backgroundColor: 'var(--bg-app)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }"
              />
            </div>
            <!-- 标签 -->
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">标签</label>
              <input
                v-model="editTags"
                type="text"
                placeholder="多个标签用逗号分隔"
                class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all duration-150"
                :style="{
                  backgroundColor: 'var(--bg-app)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }"
              />
            </div>
            <!-- 清单（只读） -->
            <div v-if="editList">
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">清单</label>
              <div class="text-sm px-3 py-2 rounded-lg" :style="{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }">
                {{ editList }}
              </div>
            </div>
            <!-- 创建时间（只读） -->
            <div v-if="editCreatedAt">
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">创建时间</label>
              <div class="text-sm px-3 py-2 rounded-lg" :style="{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }">
                {{ formatFullDate(editCreatedAt) }}
              </div>
            </div>
            <!-- 子任务 -->
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">子任务</label>
              <div v-if="subTasks.length > 0" class="space-y-1">
                <div
                  v-for="st in subTasks"
                  :key="st.id"
                  class="flex items-center gap-2 px-2 py-1.5 rounded"
                  :style="{ backgroundColor: 'var(--bg-hover)' }"
                >
                  <input
                    type="checkbox"
                    :checked="st.completed"
                    class="checkbox-tick"
                    @change="todoStore.toggleTodo(st.id)"
                  />
                  <span
                    class="flex-1 text-sm truncate cursor-pointer"
                    :style="{
                      color: 'var(--text-primary)',
                      textDecoration: st.completed ? 'line-through' : 'none',
                    }"
                    @click="startEdit(st)"
                  >
                    {{ st.title }}
                  </span>
                  <button
                    class="icon-btn w-6 h-6 flex items-center justify-center rounded"
                    :style="{ color: 'var(--text-tertiary)' }"
                    title="删除子任务"
                    @click="deleteSubTask(st)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div v-else class="text-xs" :style="{ color: 'var(--text-tertiary)' }">暂无子任务</div>
              <div class="flex gap-2 mt-2">
                <input
                  v-model="newSubTaskTitle"
                  type="text"
                  placeholder="添加子任务..."
                  class="flex-1 px-3 py-1.5 text-sm rounded-lg border outline-none transition-all duration-150"
                  :style="{
                    backgroundColor: 'var(--bg-app)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }"
                  @keyup.enter="addSubTask"
                />
                <button
                  class="px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-150"
                  :style="{
                    backgroundColor: 'var(--color-accent-light)',
                    color: 'var(--text-primary)',
                  }"
                  @click="addSubTask"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
          <div class="flex justify-between gap-2 mt-6">
            <button
              class="px-4 py-2 text-sm rounded-lg transition-all duration-150"
              :style="{ backgroundColor: 'var(--bg-hover)', color: '#e74c3c' }"
              @click="deleteFromDetail"
            >
              删除
            </button>
            <div class="flex gap-2">
              <button
                class="px-4 py-2 text-sm rounded-lg transition-all duration-150"
                :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }"
                @click="cancelEdit"
              >
                取消
              </button>
              <button
                class="px-4 py-2 text-sm rounded-lg transition-all duration-150"
                :style="{
                  backgroundColor: 'var(--color-accent-light)',
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
  if (view === 'search') return 'search'
  return 'inbox'
})

const pageTitle = computed(() => {
  switch (currentView.value) {
    case 'today': return '今天'
    case 'next7': return '最近7天'
    case 'search': return '搜索'
    default: return '收集箱'
  }
})

const emptyMessage = computed(() => {
  switch (currentView.value) {
    case 'today': return '今天没有待办任务'
    case 'next7': return '最近7天没有待办任务'
    case 'search': return '输入关键词搜索所有任务（含已完成）'
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

// 监听左列按钮：添加任务聚焦输入框 / 搜索聚焦搜索框
onMounted(() => {
  window.addEventListener('tinydo-focus-add', () => {
    nextTick(() => addInputRef.value?.focus())
  })
  window.addEventListener('tinydo-focus-search', () => {
    nextTick(() => searchInputRef.value?.focus())
  })
})

// 进入搜索视图时确保自动聚焦搜索框（不依赖事件时序）
watch(() => route.query.view, (v) => {
  if (v === 'search') {
    nextTick(() => nextTick(() => searchInputRef.value?.focus()))
  }
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
const { searchQuery, setSearch } = useGlobalSearch()
const searchInputRef = ref<HTMLInputElement | null>(null)

function clearSearch() {
  setSearch('')
  nextTick(() => searchInputRef.value?.focus())
}

// ============ 任务过滤 ============
const filteredTodos = computed(() => {
  // 搜索视图：全量搜索（含已完成）
  if (currentView.value === 'search') {
    const query = searchQuery.value.toLowerCase().trim()
    if (!query) return []
    return todos.value.filter(t => t.title.toLowerCase().includes(query))
  }

  // 其他视图按视图过滤（不受搜索词影响）
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

// ============ 任务详情对话框 ============
const showEditDialog = ref(false)
const editTarget = ref<{
  id: string; title: string; completed: boolean; priority: number;
  dueDate?: string; startDate?: string; content?: string; tags?: string[];
  list?: string; createdAt?: string;
} | null>(null)
const editTitle = ref('')
const editContent = ref('')
const editPriority = ref<0 | 1 | 3 | 5>(0)
const editDueDate = ref('')
const editStartDate = ref('')
const editTags = ref('')
const editCompleted = ref(false)
const editList = ref('')
const editCreatedAt = ref('')

function startEdit(todo: any) {
  editTarget.value = {
    id: todo.id, title: todo.title, completed: !!todo.completed,
    priority: todo.priority ?? 0, dueDate: todo.dueDate,
    startDate: todo.startDate, content: todo.content,
    tags: todo.tags ?? [], list: todo.list ?? '', createdAt: todo.createdAt,
  }
  editTitle.value = todo.title ?? ''
  editContent.value = todo.content ?? ''
  editPriority.value = (todo.priority ?? 0) as 0 | 1 | 3 | 5
  editDueDate.value = todo.dueDate ? todo.dueDate.slice(0, 10) : ''
  editStartDate.value = todo.startDate ? todo.startDate.slice(0, 10) : ''
  editTags.value = (todo.tags ?? []).join(', ')
  editCompleted.value = !!todo.completed
  editList.value = todo.list ?? ''
  editCreatedAt.value = todo.createdAt ?? ''
  showEditDialog.value = true
}

async function confirmEdit() {
  if (!editTarget.value || !editTitle.value.trim()) return
  const target = editTarget.value
  const updates: Record<string, any> = {
    title: editTitle.value.trim(),
    content: editContent.value.trim() || undefined,
    priority: editPriority.value,
    dueDate: editDueDate.value ? new Date(editDueDate.value).toISOString() : undefined,
    startDate: editStartDate.value ? new Date(editStartDate.value).toISOString() : undefined,
    tags: editTags.value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
    completed: editCompleted.value,
  }
  // 完成状态变化时维护完成时间
  if (editCompleted.value && !target.completed) {
    updates.completedTime = new Date().toISOString()
  } else if (!editCompleted.value && target.completed) {
    updates.completedTime = undefined
  }
  await todoStore.updateTodo(target.id, updates)
  showEditDialog.value = false
  editTarget.value = null
}

function cancelEdit() {
  showEditDialog.value = false
  editTarget.value = null
}

async function deleteFromDetail() {
  if (!editTarget.value) return
  if (confirm('确定要删除这个任务吗？')) {
    await removeTodo(editTarget.value.id)
    showEditDialog.value = false
    editTarget.value = null
  }
}

// ============ 子任务 ============
const newSubTaskTitle = ref('')
const subTasks = computed(() => {
  if (!editTarget.value) return []
  return todos.value.filter(t => t.parentId === editTarget.value.id)
})

async function addSubTask() {
  if (!editTarget.value || !newSubTaskTitle.value.trim()) return
  await todoStore.addTodo({
    title: newSubTaskTitle.value.trim(),
    priority: 0,
    parentId: editTarget.value.id,
  })
  newSubTaskTitle.value = ''
}

async function deleteSubTask(t: any) {
  if (confirm('确定要删除这个子任务吗？')) {
    await removeTodo(t.id)
  }
}

// ============ 工具函数 ============
function formatFullDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
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
