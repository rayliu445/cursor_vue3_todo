<template>
  <div
    class="border-2 rounded-lg p-3 min-h-[200px] flex flex-col"
    :class="[borderColor, bgColor]"
    @dragover.prevent
    @drop="onDrop"
  >
    <!-- 象限标题 -->
    <div class="flex items-center justify-between mb-2 pb-2 border-b border-base-300">
      <div>
        <h3 class="font-bold text-sm">{{ label.title }}</h3>
        <p class="text-xs text-base-content/50">{{ label.subtitle }}</p>
      </div>
      <span class="badge badge-sm">{{ todos.length }}</span>
    </div>

    <!-- 任务列表 -->
    <div class="flex-1 flex flex-col gap-1.5 overflow-y-auto">
      <div
        v-for="todo in todos"
        :key="todo.id"
        class="group flex items-center gap-2 px-2 py-1.5 rounded bg-base-100 shadow-sm cursor-grab active:cursor-grabbing hover:bg-base-200 transition-colors"
        draggable="true"
        @dragstart="onDragStart(todo.id)"
      >
        <input
          type="checkbox"
          :checked="todo.completed"
          class="checkbox checkbox-xs"
          @change="handleToggle(todo.id)"
        />
        <span class="text-sm flex-1 truncate">{{ todo.title }}</span>
        <span v-if="todo.dueDate" class="text-xs text-base-content/40 flex-shrink-0">
          {{ formatDate(todo.dueDate) }}
        </span>
        <button
          class="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs text-error"
          @click="handleDelete(todo.id)"
        >
          ✕
        </button>
      </div>
      <div
        v-if="todos.length === 0"
        class="flex-1 flex items-center justify-center text-sm text-base-content/30"
      >
        将任务拖拽到此处
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '../../stores/todo'
import type { QuadrantId } from '../../stores/matrix'

const props = defineProps<{
  quadrantId: QuadrantId
  label: { title: string; subtitle: string; color: string }
  todos: Todo[]
  borderColor: string
  bgColor: string
}>()

const emit = defineEmits<{
  (e: 'drop', todoId: string, quadrantId: QuadrantId): void
  (e: 'toggle', todoId: string): void
  (e: 'delete', todoId: string): void
}>()

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function onDragStart(todoId: string) {
  // Store the todo ID and source quadrant
  const data = JSON.stringify({ todoId, fromQuadrant: props.quadrantId })
  (window as any).__dragData = data
}

function onDrop(event: DragEvent) {
  const rawData = (window as any).__dragData
  if (!rawData) return
  try {
    const { todoId } = JSON.parse(rawData)
    emit('drop', todoId, props.quadrantId)
  } catch (e) {
    // ignore
  }
  delete (window as any).__dragData
}

function handleToggle(todoId: string) {
  emit('toggle', todoId)
}

function handleDelete(todoId: string) {
  emit('delete', todoId)
}
</script>
