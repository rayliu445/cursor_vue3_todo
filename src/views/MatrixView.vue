<template>
  <div class="py-6">
    <!-- 顶部标题 + 配置 -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">四象限</h1>
      <button class="btn btn-ghost btn-sm" @click="showConfig = !showConfig">
        {{ showConfig ? '收起配置' : '规则配置' }}
      </button>
    </div>

    <!-- 规则配置面板 -->
    <div v-if="showConfig" class="mb-6 max-w-md">
      <MatrixRuleConfig
        :rule-mode="matrixStore.ruleMode"
        :urgent-days="matrixStore.urgentDays"
        @update:rule-mode="matrixStore.setRuleMode"
        @update:urgent-days="matrixStore.setUrgentDays"
      />
    </div>

    <!-- 四象限网格 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Quadrant
        :quadrant-id="1"
        :label="labels[1]"
        :todos="matrixStore.groupedTodos[1]"
        border-color="border-red-400"
        bg-color="bg-red-50/30 dark:bg-red-950/10"
        @drop="handleDrop"
        @toggle="handleToggle"
        @delete="handleDelete"
      />
      <Quadrant
        :quadrant-id="2"
        :label="labels[2]"
        :todos="matrixStore.groupedTodos[2]"
        border-color="border-blue-400"
        bg-color="bg-blue-50/30 dark:bg-blue-950/10"
        @drop="handleDrop"
        @toggle="handleToggle"
        @delete="handleDelete"
      />
      <Quadrant
        :quadrant-id="3"
        :label="labels[3]"
        :todos="matrixStore.groupedTodos[3]"
        border-color="border-orange-400"
        bg-color="bg-orange-50/30 dark:bg-orange-950/10"
        @drop="handleDrop"
        @toggle="handleToggle"
        @delete="handleDelete"
      />
      <Quadrant
        :quadrant-id="4"
        :label="labels[4]"
        :todos="matrixStore.groupedTodos[4]"
        border-color="border-gray-400"
        bg-color="bg-gray-50/30 dark:bg-gray-800/10"
        @drop="handleDrop"
        @toggle="handleToggle"
        @delete="handleDelete"
      />
    </div>

    <!-- 空状态 -->
    <div
      v-if="totalActiveTodos === 0"
      class="text-center text-base-content/50 py-16"
    >
      <p class="text-lg mb-2">暂无任务</p>
      <p class="text-sm">在"待办"页面添加任务后，它们将根据优先级自动归类到四个象限</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '../stores/todo'
import { useMatrixStore, QUADRANT_LABELS } from '../stores/matrix'
import { storeToRefs } from 'pinia'
import Quadrant from '../components/matrix/Quadrant.vue'
import MatrixRuleConfig from '../components/matrix/MatrixRuleConfig.vue'

const todoStore = useTodoStore()
const matrixStore = useMatrixStore()
const { todos } = storeToRefs(todoStore)
const { fetchTodos, removeTodo, toggleTodo } = todoStore

const showConfig = ref(false)
const labels = QUADRANT_LABELS

const totalActiveTodos = computed(() => {
  return todos.value.filter(t => !t.completed).length
})

function handleDrop(todoId: string, quadrantId: 1 | 2 | 3 | 4) {
  matrixStore.moveToQuadrant(todoId, quadrantId)
}

function handleToggle(todoId: string) {
  toggleTodo(todoId)
}

function handleDelete(todoId: string) {
  if (confirm('确定要删除这个任务吗？')) {
    removeTodo(todoId)
  }
}

onMounted(() => {
  if (todos.value.length === 0) {
    fetchTodos()
  }
})
</script>
