<template>
  <div class="flex flex-col h-full overflow-hidden" :style="{ backgroundColor: 'var(--bg-app)' }">
    <!-- 页面头部 -->
    <div
      class="flex items-center justify-between px-6 h-14 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-semibold" :style="{ color: 'var(--text-primary)' }">四象限</h1>
        <span
          class="text-xs px-2 py-0.5 rounded-full"
          :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }"
        >
          {{ totalActiveTodos }}
        </span>
      </div>
      <button
        class="px-3 py-1.5 text-sm rounded-lg transition-all duration-150"
        :style="{
          backgroundColor: showConfig ? 'var(--color-accent-mid)' : 'var(--bg-hover)',
          color: showConfig ? 'var(--text-primary)' : 'var(--text-secondary)',
        }"
        @click="showConfig = !showConfig"
      >
        {{ showConfig ? '收起' : '规则' }}
      </button>
    </div>

    <!-- 规则配置面板 -->
    <transition name="slide-down">
      <div v-if="showConfig" class="flex-shrink-0 px-6 py-4 border-b" :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }">
        <MatrixRuleConfig
          :rule-mode="matrixStore.ruleMode"
          :urgent-days="matrixStore.urgentDays"
          @update:rule-mode="matrixStore.setRuleMode"
          @update:urgent-days="matrixStore.setUrgentDays"
        />
      </div>
    </transition>

    <!-- 四象限网格 -->
    <div class="flex-1 overflow-y-auto p-4">
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
      class="flex flex-col items-center justify-center py-16"
      :style="{ color: 'var(--text-tertiary)' }"
    >
      <p class="text-base mb-1">暂无任务</p>
      <p class="text-sm">在收集箱添加任务后自动归类到四个象限</p>
    </div>
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
  return todos.value.filter(t => !t.completed && t.kind !== 'NOTE').length
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
