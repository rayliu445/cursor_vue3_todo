<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="mb-6 text-3xl font-bold text-center">
      已完成的任务
    </h1>

    <!-- 返回首页链接 -->
    <router-link
      to="/"
      class="btn btn-link mb-4"
    >
      返回首页
    </router-link>

    <!-- 已完成任务列表 -->
    <div class="flex flex-col gap-4">
      <div
        v-for="todo in completedTodos"
        :key="todo.id"
        class="flex items-center gap-4 p-4 bg-base-200 rounded-lg"
      >
        <input
          type="checkbox"
          :checked="todo.completed"
          class="checkbox checkbox-sm"
          @change="handleToggle(todo.id)"
        />
        <span class="line-through flex-1">{{ todo.title }}</span>
        <span v-if="todo.priority && todo.priority > 0" class="badge badge-xs" :class="{
          'badge-error': todo.priority === 5,
          'badge-warning': todo.priority === 3,
          'badge-info': todo.priority === 1,
        }">
          {{ todo.priority === 5 ? '高' : todo.priority === 3 ? '中' : '低' }}
        </span>
        <span v-if="todo.completedTime" class="text-xs text-base-content/40">
          {{ formatDate(todo.completedTime) }}
        </span>
        <button
          class="btn btn-error btn-sm ml-auto"
          @click="deleteTodo(todo.id)"
        >
          删除
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-if="todos.length === 0"
      class="text-center text-base-content/70 py-8"
    >
      暂无任务数据
    </div>
    <div
      v-else-if="completedTodos.length === 0"
      class="text-center text-base-content/50 py-8"
    >
      还没有已完成的任务
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTodoStore } from '../stores/todo'
import { storeToRefs } from 'pinia'

const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const { fetchTodos, removeTodo, toggleTodo } = todoStore

// 计算属性：筛选已完成的任务
const completedTodos = computed(() => {
  return todos.value.filter(todo => todo.completed)
})

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
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
