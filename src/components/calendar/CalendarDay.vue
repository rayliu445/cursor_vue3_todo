<template>
  <div>
    <!-- 日视图 -->
    <div class="border border-base-300 rounded-lg">
      <!-- 日期头 -->
      <div class="flex items-center justify-between p-4 border-b border-base-300 bg-base-200/50">
        <div>
          <span class="text-2xl font-bold">{{ dayInfo.dayNum }}</span>
          <span class="text-base-content/60 ml-2">周{{ dayInfo.weekName }}, {{ dayInfo.month }}月</span>
        </div>
        <div class="text-sm text-base-content/50">
          {{ dayInfo.todos.length }} 个任务
        </div>
      </div>

      <!-- 添加表单 -->
      <div class="p-3 border-b border-base-300 flex gap-2">
        <input
          v-model="newTodoTitle"
          type="text"
          placeholder="在此添加任务..."
          class="input input-bordered input-sm w-full"
          @keyup.enter="handleAddTodo"
        />
        <select v-model="newTodoPriority" class="select select-bordered select-sm">
          <option :value="0">优先级</option>
          <option :value="1">低</option>
          <option :value="3">中</option>
          <option :value="5">高</option>
        </select>
        <button class="btn btn-primary btn-sm" @click="handleAddTodo">添加</button>
      </div>

      <!-- 任务列表 -->
      <div class="divide-y divide-base-300">
        <div
          v-for="todo in dayInfo.todos"
          :key="todo.id"
          class="flex items-center gap-3 p-3 hover:bg-base-200 transition-colors"
        >
          <input
            type="checkbox"
            :checked="todo.completed"
            class="checkbox checkbox-sm"
            @change="$emit('toggle-todo', todo.id)"
          />
          <span
            class="w-2 h-2 rounded-full flex-shrink-0"
            :class="getPriorityDot(todo.priority)"
          ></span>
          <span
            class="flex-1"
            :class="{ 'line-through text-base-content/50': todo.completed }"
          >
            {{ todo.title }}
          </span>
          <span v-if="todo.priority && todo.priority > 0" class="badge badge-xs" :class="getPriorityBadge(todo.priority)">
            {{ todo.priority === 5 ? '高' : todo.priority === 3 ? '中' : '低' }}
          </span>
        </div>
        <div
          v-if="dayInfo.todos.length === 0"
          class="text-center text-base-content/30 py-12"
        >
          当天暂无任务
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTodoStore } from '../../stores/todo'
import type { Todo } from '../../stores/todo'

const props = defineProps<{
  currentDate: Date
  todos: Todo[]
}>()

const emit = defineEmits<{
  (e: 'add-todo', dateStr: string): void
  (e: 'toggle-todo', id: string): void
}>()

const todoStore = useTodoStore()

const newTodoTitle = ref('')
const newTodoPriority = ref<0 | 1 | 3 | 5>(0)

const weekNames = ['日', '一', '二', '三', '四', '五', '六']

function formatDateStr(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getPriorityDot(priority?: number) {
  if (!priority || priority === 0) return 'bg-base-300'
  switch (priority) {
    case 5: return 'bg-red-500'
    case 3: return 'bg-orange-500'
    case 1: return 'bg-blue-500'
    default: return 'bg-base-300'
  }
}

function getPriorityBadge(priority?: number) {
  if (!priority) return ''
  switch (priority) {
    case 5: return 'badge-error'
    case 3: return 'badge-warning'
    case 1: return 'badge-info'
    default: return ''
  }
}

const dateStr = computed(() => formatDateStr(props.currentDate))

const dayInfo = computed(() => {
  const d = props.currentDate
  const ds = formatDateStr(d)
  return {
    dateStr: ds,
    dayNum: d.getDate(),
    month: d.getMonth() + 1,
    weekName: weekNames[d.getDay()],
    todos: props.todos.filter(t => t.dueDate && t.dueDate.slice(0, 10) === ds),
  }
})

async function handleAddTodo() {
  if (!newTodoTitle.value.trim()) return
  await todoStore.addTodo({
    title: newTodoTitle.value,
    priority: newTodoPriority.value,
    dueDate: dateStr.value,
  })
  newTodoTitle.value = ''
  newTodoPriority.value = 0
}
</script>
