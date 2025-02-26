<template>
  <div class="py-8">
    <!-- 标题区域 -->
    <h1 class="mb-6 text-3xl font-bold text-center">
      待办事项
    </h1>

    <!-- Todo添加表单 -->
    <div class="flex gap-2 mb-6">
      <input
        v-model="newTodo"
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
        v-for="todo in todos"
        :key="todo.id"
        class="flex items-center gap-4 p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
      >
        <input
          type="checkbox"
          :checked="todo.completed"
          class="checkbox"
          @change="toggleTodo(todo.id)"
        >
        <span :class="{ 'line-through text-base-content/70': todo.completed }">
          {{ todo.title }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTodoStore } from '../stores/todo'
import { storeToRefs } from 'pinia'

// 使用Pinia store
const todoStore = useTodoStore()
// 使用storeToRefs保持响应性
const { todos } = storeToRefs(todoStore)
const { fetchTodos, addTodo, removeTodo, toggleTodoStatus } = todoStore

// 新任务输入
const newTodo = ref('')

// 添加任务
async function handleAddTodo() {
  if (!newTodo.value.trim()) return
  await addTodo(newTodo.value)
  newTodo.value = '' // 清空输入
}

// 删除任务
async function deleteTodo(id: number) {
  if (confirm('确定要删除这个任务吗？')) {
    await removeTodo(id)
  }
}

// 切换任务状态
async function toggleTodo(id: number) {
  await toggleTodoStatus(id)
}

// 开始编辑任务
function startEdit(todo: { id: number; title: string }) {
  const newTitle = prompt('编辑任务', todo.title)
  if (newTitle && newTitle !== todo.title) {
    todoStore.updateTodo(todo.id, newTitle)
  }
}

// 组件挂载时获取任务列表
onMounted(() => {
  fetchTodos()
})
</script>
