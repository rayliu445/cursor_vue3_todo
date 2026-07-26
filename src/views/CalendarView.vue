<template>
  <div class="py-6">
    <!-- 日历顶部工具栏 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-sm" @click="goToday">今天</button>
        <button class="btn btn-ghost btn-sm" @click="prevPeriod">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button class="btn btn-ghost btn-sm" @click="nextPeriod">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
        <h2 class="text-xl font-bold ml-2">{{ headerTitle }}</h2>
      </div>
      <div class="join">
        <button
          class="join-item btn btn-sm"
          :class="{ 'btn-active': viewMode === 'month' }"
          @click="viewMode = 'month'"
        >月</button>
        <button
          class="join-item btn btn-sm"
          :class="{ 'btn-active': viewMode === 'week' }"
          @click="viewMode = 'week'"
        >周</button>
        <button
          class="join-item btn btn-sm"
          :class="{ 'btn-active': viewMode === 'day' }"
          @click="viewMode = 'day'"
        >日</button>
      </div>
    </div>

    <!-- 视图切换 -->
    <CalendarMonth
      v-if="viewMode === 'month'"
      :current-date="currentDate"
      :todos="todos"
      @select-date="selectDate"
      @add-todo="handleQuickAdd"
      @toggle-todo="handleToggleTodo"
    />
    <CalendarWeek
      v-else-if="viewMode === 'week'"
      :current-date="currentDate"
      :todos="todos"
      @select-date="selectDate"
      @add-todo="handleQuickAdd"
      @toggle-todo="handleToggleTodo"
    />
    <CalendarDay
      v-else
      :current-date="currentDate"
      :todos="todos"
      @add-todo="handleQuickAdd"
      @toggle-todo="handleToggleTodo"
    />

    <!-- 快速添加任务弹窗 -->
    <dialog ref="addDialog" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">添加任务</h3>
        <div class="flex flex-col gap-3">
          <input
            v-model="quickAddTitle"
            type="text"
            placeholder="任务标题"
            class="input input-bordered w-full"
            @keyup.enter="confirmQuickAdd"
          />
          <div class="flex gap-2">
            <select v-model="quickAddPriority" class="select select-bordered select-sm flex-1">
              <option :value="0">优先级：无</option>
              <option :value="1">优先级：低</option>
              <option :value="3">优先级：中</option>
              <option :value="5">优先级：高</option>
            </select>
          </div>
          <p class="text-sm text-base-content/60">日期：{{ quickAddDateStr }}</p>
        </div>
        <div class="modal-action">
          <button class="btn btn-sm" @click="closeAddDialog">取消</button>
          <button class="btn btn-sm btn-primary" @click="confirmQuickAdd">添加</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>关闭</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTodoStore, type Todo } from '../stores/todo'
import { storeToRefs } from 'pinia'
import CalendarMonth from '../components/calendar/CalendarMonth.vue'
import CalendarWeek from '../components/calendar/CalendarWeek.vue'
import CalendarDay from '../components/calendar/CalendarDay.vue'

const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const { fetchTodos, addTodo, toggleTodo } = todoStore

// 当前视图日期
const currentDate = ref(new Date())
const viewMode = ref<'month' | 'week' | 'day'>('month')

// 快速添加任务
const addDialog = ref<HTMLDialogElement | null>(null)
const quickAddTitle = ref('')
const quickAddDate = ref('')
const quickAddPriority = ref<0 | 1 | 3 | 5>(0)
const quickAddDateStr = computed(() => {
  if (!quickAddDate.value) return ''
  return quickAddDate.value
})

// 标题
const headerTitle = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  const day = currentDate.value.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  switch (viewMode.value) {
    case 'month':
      return `${year}年${month}月`
    case 'week': {
      const weekStart = getWeekStart(currentDate.value)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
    }
    case 'day':
      return `${year}年${month}月${day}日 周${weekdays[currentDate.value.getDay()]}`
    default:
      return ''
  }
})

function getWeekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

function prevPeriod() {
  const d = new Date(currentDate.value)
  switch (viewMode.value) {
    case 'month':
      d.setMonth(d.getMonth() - 1)
      break
    case 'week':
      d.setDate(d.getDate() - 7)
      break
    case 'day':
      d.setDate(d.getDate() - 1)
      break
  }
  currentDate.value = d
}

function nextPeriod() {
  const d = new Date(currentDate.value)
  switch (viewMode.value) {
    case 'month':
      d.setMonth(d.getMonth() + 1)
      break
    case 'week':
      d.setDate(d.getDate() + 7)
      break
    case 'day':
      d.setDate(d.getDate() + 1)
      break
  }
  currentDate.value = d
}

function goToday() {
  currentDate.value = new Date()
}

function selectDate(dateStr: string) {
  quickAddDate.value = dateStr
  quickAddTitle.value = ''
  quickAddPriority.value = 0
  addDialog.value?.showModal()
}

function closeAddDialog() {
  addDialog.value?.close()
}

async function confirmQuickAdd() {
  if (!quickAddTitle.value.trim()) return
  await addTodo({
    title: quickAddTitle.value,
    priority: quickAddPriority.value,
    dueDate: quickAddDate.value,
  })
  quickAddTitle.value = ''
  closeAddDialog()
}

function handleQuickAdd(dateStr: string) {
  selectDate(dateStr)
}

function handleToggleTodo(id: string) {
  toggleTodo(id)
}

onMounted(() => {
  fetchTodos()
})
</script>
