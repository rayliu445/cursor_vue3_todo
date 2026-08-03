<template>
  <transition name="scale">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center"
      :style="{ backgroundColor: 'rgba(0,0,0,0.4)' }"
      @click.self="close"
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
            @click="close"
          >
            ✕
          </button>
        </div>
        <div class="space-y-3">
          <!-- 标题 -->
          <div>
            <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">标题</label>
            <input
              v-model="editTitle"
              type="text"
              class="w-full px-3 py-2 text-base font-medium rounded-lg border outline-none transition-all duration-150"
              :style="{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }"
            />
          </div>
          <!-- 内容（主要编辑区域，占大空间） -->
          <div>
            <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">内容</label>
            <textarea
              v-model="editContent"
              rows="10"
              placeholder="任务详细内容..."
              class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all duration-150 resize-y min-h-[220px] leading-relaxed"
              :style="{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }"
            ></textarea>
          </div>
          <!-- 完成状态 + 优先级（一行紧凑） -->
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap" :style="{ color: 'var(--text-secondary)' }">
              <input
                v-model="editCompleted"
                type="checkbox"
                class="checkbox-tick"
              />
              已完成
            </label>
            <div class="flex-1 flex gap-1.5">
              <button
                v-for="p in priorityOptions"
                :key="p.value"
                class="flex-1 py-1.5 text-xs rounded-lg transition-all duration-150 font-medium"
                :style="getPriorityBtnStyle(p.value, editPriority === p.value)"
                @click="editPriority = p.value"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
          <!-- 截止/开始日期（两列紧凑） -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">截止日期</label>
              <input
                v-model="editDueDate"
                type="date"
                class="w-full px-3 py-1.5 text-sm rounded-lg border outline-none transition-all duration-150"
                :style="{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }"
              />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">开始日期</label>
              <input
                v-model="editStartDate"
                type="date"
                class="w-full px-3 py-1.5 text-sm rounded-lg border outline-none transition-all duration-150"
                :style="{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }"
              />
            </div>
          </div>
          <!-- 标签 -->
          <div>
            <label class="block text-xs font-medium mb-1" :style="{ color: 'var(--text-secondary)' }">标签</label>
            <input
              v-model="editTags"
              type="text"
              placeholder="多个标签用逗号分隔"
              class="w-full px-3 py-1.5 text-sm rounded-lg border outline-none transition-all duration-150"
              :style="{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }"
            />
          </div>
          <!-- 只读信息（清单/创建时间，紧凑一行） -->
          <div v-if="editList || editCreatedAt" class="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs" :style="{ color: 'var(--text-tertiary)' }">
            <span v-if="editList">清单：{{ editList }}</span>
            <span v-if="editCreatedAt">创建时间：{{ formatFullDate(editCreatedAt) }}</span>
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
                  @click="openSub(st)"
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
              @click="close"
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTodoStore } from '../stores/todo'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  modelValue: boolean
  todoId: string | null
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const { removeTodo } = todoStore

// 当前编辑的任务（按 id 从 store 实时获取）
// 支持在详情内切换到子任务（overrideId 覆盖外部传入的 todoId）
const overrideId = ref<string | null>(null)
const effectiveId = computed(() => overrideId.value ?? props.todoId)
const target = computed(() =>
  effectiveId.value ? todos.value.find(t => t.id === effectiveId.value) ?? null : null,
)

// 编辑字段
const editTitle = ref('')
const editContent = ref('')
const editPriority = ref<0 | 1 | 3 | 5>(0)
const editDueDate = ref('')
const editStartDate = ref('')
const editTags = ref('')
const editCompleted = ref(false)
const editList = ref('')
const editCreatedAt = ref('')
const newSubTaskTitle = ref('')

const priorityOptions = [
  { value: 0, label: '无' },
  { value: 1, label: '低' },
  { value: 3, label: '中' },
  { value: 5, label: '高' },
]

function getPriorityBtnStyle(value: number, isSelected: boolean) {
  return {
    backgroundColor: isSelected ? 'var(--color-accent-light)' : 'var(--bg-hover)',
    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: isSelected ? '600' : '400',
    border: '1px solid ' + (isSelected ? 'var(--border-color)' : 'transparent'),
  }
}

// 打开/切换目标时初始化
watch(
  () => [props.modelValue, effectiveId.value] as const,
  () => {
    if (props.modelValue && target.value) {
      initFields(target.value)
    }
  },
  { immediate: true },
)

function initFields(todo: any) {
  editTitle.value = todo.title ?? ''
  editContent.value = todo.content ?? ''
  editPriority.value = (todo.priority ?? 0) as 0 | 1 | 3 | 5
  editDueDate.value = todo.dueDate ? todo.dueDate.slice(0, 10) : ''
  editStartDate.value = todo.startDate ? todo.startDate.slice(0, 10) : ''
  editTags.value = (todo.tags ?? []).join(', ')
  editCompleted.value = !!todo.completed
  editList.value = todo.list ?? ''
  editCreatedAt.value = todo.createdAt ?? ''
  newSubTaskTitle.value = ''
}

function close() {
  // 重置内部切换目标，避免下次打开详情仍显示上次点开的子任务
  overrideId.value = null
  emit('update:modelValue', false)
}

async function confirmEdit() {
  const t = target.value
  if (!t || !editTitle.value.trim()) return
  const updates: Record<string, any> = {
    title: editTitle.value.trim(),
    // 空内容传 null 而不是 undefined：undefined 时 sqlite 不会更新 content 字段，清空无法保存
    content: editContent.value.trim() || null,
    priority: editPriority.value,
    dueDate: editDueDate.value ? new Date(editDueDate.value).toISOString() : undefined,
    startDate: editStartDate.value ? new Date(editStartDate.value).toISOString() : undefined,
    tags: editTags.value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
    completed: editCompleted.value,
  }
  if (editCompleted.value && !t.completed) {
    updates.completedTime = new Date().toISOString()
  } else if (!editCompleted.value && t.completed) {
    updates.completedTime = undefined
  }
  await todoStore.updateTodo(t.id, updates)
  close()
}

async function deleteFromDetail() {
  const t = target.value
  if (!t) return
  if (confirm('确定要删除这个任务吗？')) {
    await removeTodo(t.id)
    close()
  }
}

// 子任务
const subTasks = computed(() => {
  const t = target.value
  if (!t) return []
  return todos.value.filter(x => x.parentId === t.id)
})

async function addSubTask() {
  const t = target.value
  if (!t || !newSubTaskTitle.value.trim()) return
  await todoStore.addTodo({
    title: newSubTaskTitle.value.trim(),
    priority: 0,
    // 继承父任务的日期：今天/最近7天视图按日期过滤，
    // 不带日期的子任务会被过滤掉导致“创建了却看不到”
    dueDate: t.dueDate,
    startDate: t.startDate,
    parentId: t.id,
  })
  newSubTaskTitle.value = ''
}

async function deleteSubTask(st: any) {
  if (confirm('确定要删除这个子任务吗？')) {
    await removeTodo(st.id)
  }
}

function openSub(st: any) {
  // 在详情对话框内切换到子任务详情
  switchTarget(st.id)
}

// 内部切换详情目标（覆盖外部传入的 todoId）
function switchTarget(id: string) {
  overrideId.value = id
}

function formatFullDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>
