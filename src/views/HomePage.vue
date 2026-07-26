<template>
  <div class="py-8">
    <!-- 标题区域 -->
    <h1 class="mb-6 text-3xl font-bold text-center">
      待办事项
    </h1>

    <!-- 搜索栏 -->
    <div class="mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索任务..."
        class="input input-bordered input-primary w-full"
      >
    </div>

    <!-- Todo添加表单 -->
    <div class="flex gap-2 mb-6">
      <input
        v-model="newTodoTitle"
        type="text"
        placeholder="添加新任务..."
        class="input input-bordered w-full"
        @keyup.enter="handleAddTodo"
      >
      <button
        class="btn btn-primary"
        @click="handleAddTodo"
      >
        添加
      </button>
    </div>

    <!-- Todo列表 -->
    <ul class="flex flex-col gap-4">
      <li
        v-for="todo in filteredTodos"
        :key="todo.id"
        class="flex items-center gap-4 p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
      >
        <input
          type="checkbox"
          :checked="todo.completed"
          class="checkbox"
          @change="todoStore.toggleTodo(todo.id)"
        >
        <!-- 优先级标识 -->
        <span
          v-if="todo.priority && todo.priority > 0"
          class="badge badge-xs"
          :class="{
            'badge-error': todo.priority === 5,
            'badge-warning': todo.priority === 3,
            'badge-info': todo.priority === 1,
          }"
        >
          {{ todo.priority === 5 ? '高' : todo.priority === 3 ? '中' : '低' }}
        </span>
        <span :class="{ 'line-through text-base-content/70': todo.completed }">
          {{ todo.title }}
        </span>
        <!-- 截止日期 -->
        <span
          v-if="todo.dueDate"
          class="text-xs text-base-content/50 ml-2"
        >
          {{ formatDate(todo.dueDate) }}
        </span>
        <div class="ml-auto flex gap-2">
          <button
            class="btn btn-sm btn-warning"
            @click="startEdit(todo)"
          >
            编辑
          </button>
          <button
            class="btn btn-sm btn-error"
            @click="deleteTodo(todo.id)"
          >
            删除
          </button>
        </div>
      </li>
    </ul>

    <!-- 空状态 -->
    <div
      v-if="todos.length === 0"
      class="text-center text-base-content/70 py-8"
    >
      暂无待办事项
    </div>

    <!-- 编辑对话框 -->
    <dialog ref="editDialog" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">编辑任务</h3>
        <div class="form-control">
          <input
            v-model="editTitle"
            type="text"
            class="input input-bordered w-full"
            @keyup.enter="confirmEdit"
          />
        </div>
        <div class="form-control mt-3">
          <label class="label"><span class="label-text">优先级</span></label>
          <select v-model="editPriority" class="select select-bordered w-full">
            <option :value="0">优先级：无</option>
            <option :value="1">优先级：低</option>
            <option :value="3">优先级：中</option>
            <option :value="5">优先级：高</option>
          </select>
        </div>
        <div class="form-control mt-3">
          <label class="label"><span class="label-text">截止日期</span></label>
          <input
            v-model="editDueDate"
            type="date"
            class="input input-bordered w-full"
          />
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="cancelEdit">取消</button>
          <button class="btn btn-primary" @click="confirmEdit">确认</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>关闭</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTodoStore } from '../stores/todo'
import { storeToRefs } from 'pinia'

// 使用Pinia store
const todoStore = useTodoStore()
// 使用storeToRefs保持响应性
const { todos } = storeToRefs(todoStore)
const { fetchTodos, addTodo, removeTodo } = todoStore

// 新任务输入
const newTodoTitle = ref('')

// 搜索查询
const searchQuery = ref('')

// 编辑对话框状态
const editDialog = ref<HTMLDialogElement | null>(null)
const editTarget = ref<{ id: string; title: string; priority: number; dueDate?: string } | null>(null)
const editTitle = ref('')
const editPriority = ref<0 | 1 | 3 | 5>(0)
const editDueDate = ref('')

// 格式化日期
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 过滤后的任务列表
const filteredTodos = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return todos.value

  return todos.value.filter(todo =>
    todo.title.toLowerCase().includes(query),
  )
})

// 添加任务
async function handleAddTodo() {
  if (!newTodoTitle.value.trim()) return
  await todoStore.addTodo({ title: newTodoTitle.value })
  newTodoTitle.value = ''
}

// 删除任务
async function deleteTodo(id: string) {
  if (confirm('确定要删除这个任务吗？')) {
    await removeTodo(id)
  }
}

// 开始编辑任务（使用模态框代替 prompt）
function startEdit(todo: { id: string; title: string; priority?: number; dueDate?: string }) {
  editTarget.value = { id: todo.id, title: todo.title, priority: todo.priority ?? 0, dueDate: todo.dueDate }
  editTitle.value = todo.title
  editPriority.value = (todo.priority ?? 0) as 0 | 1 | 3 | 5
  editDueDate.value = todo.dueDate ? todo.dueDate.slice(0, 10) : ''
  editDialog.value?.showModal()
}

// 确认编辑
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
  editDialog.value?.close()
  editTarget.value = null
}

// 取消编辑
function cancelEdit() {
  editDialog.value?.close()
  editTarget.value = null
}

// 组件挂载时获取任务列表
onMounted(() => {
  fetchTodos()
})
</script>
