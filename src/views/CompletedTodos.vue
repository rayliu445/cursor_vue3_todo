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
        <span class="line-through">{{ todo.title }}</span>
        <button
          class="btn btn-error btn-sm ml-auto"
          @click="deleteTodo(todo.id)"
        >
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTodoStore } from '../stores/todo'
import { storeToRefs } from 'pinia'

const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const { removeTodo } = todoStore

// 计算属性：筛选已完成的任务
const completedTodos = computed(() => {
  return todos.value.filter(todo => todo.completed)
})

async function deleteTodo(id: number) {
  await removeTodo(id)
}
</script>
