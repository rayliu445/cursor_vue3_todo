import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTodoStore, type Todo } from './todo'
import { storeToRefs } from 'pinia'

export type QuadrantId = 1 | 2 | 3 | 4
export type MatrixRuleMode = 'priority' | 'time-priority'

export const QUADRANT_LABELS: Record<QuadrantId, { title: string; subtitle: string; color: string }> = {
  1: { title: '重要且紧急', subtitle: '立即执行', color: 'border-l-red-500 bg-red-50 dark:bg-red-950/20' },
  2: { title: '重要不紧急', subtitle: '计划执行', color: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20' },
  3: { title: '紧急不重要', subtitle: '委托他人', color: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20' },
  4: { title: '不重要不紧急', subtitle: '尽量不做', color: 'border-l-gray-400 bg-gray-50 dark:bg-gray-800/20' },
}

export const useMatrixStore = defineStore('matrix', () => {
  // 矩阵规则配置
  const ruleMode = ref<MatrixRuleMode>('priority')
  // 紧急时间范围（天），用于 time-priority 模式
  const urgentDays = ref(1)
  // 显示哪些清单（默认全部）
  const showAllLists = ref(true)
  const selectedLists = ref<string[]>([])

  const todoStore = useTodoStore()
  const { todos } = storeToRefs(todoStore)

  // 判断任务所属象限
  function getQuadrant(todo: Todo): QuadrantId {
    if (ruleMode.value === 'priority') {
      // 纯优先级模式
      switch (todo.priority) {
        case 5: return 1
        case 3: return 2
        case 1: return 3
        default: return 4
      }
    } else {
      // 时间+优先级模式
      const isUrgent = isDueSoon(todo, urgentDays.value)
      const isImportant = todo.priority === 5 || todo.priority === 3

      if (isImportant && isUrgent) return 1
      if (isImportant && !isUrgent) return 2
      if (!isImportant && isUrgent) return 3
      return 4
    }
  }

  // 判断是否在紧急时间范围内
  function isDueSoon(todo: Todo, days: number): boolean {
    if (!todo.dueDate) return false
    const now = new Date()
    const due = new Date(todo.dueDate)
    const diffTime = due.getTime() - now.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    return diffDays <= days
  }

  // 按象限分组
  const groupedTodos = computed(() => {
    const groups: Record<QuadrantId, Todo[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    }

    for (const todo of todos.value) {
      // 跳过已完成与笔记（kind=NOTE 不进四象限）
      if (todo.completed || todo.kind === 'NOTE') continue
      const q = getQuadrant(todo)
      groups[q].push(todo)
    }

    return groups
  })

  // 将任务移动到指定象限（更新优先级）
  async function moveToQuadrant(todoId: string, quadrant: QuadrantId) {
    const priorityMap: Record<QuadrantId, Todo['priority']> = {
      1: 5,  // 重要且紧急 → 高优先级
      2: 3,  // 重要不紧急 → 中优先级
      3: 1,  // 紧急不重要 → 低优先级
      4: 0,  // 不重要不紧急 → 无优先级
    }

    const todo = todos.value.find(t => t.id === todoId)
    if (!todo) return

    await todoStore.updateTodo(todoId, {
      priority: priorityMap[quadrant],
    })
  }

  // 更新规则
  function setRuleMode(mode: MatrixRuleMode) {
    ruleMode.value = mode
  }

  function setUrgentDays(days: number) {
    urgentDays.value = days
  }

  return {
    ruleMode,
    urgentDays,
    showAllLists,
    selectedLists,
    groupedTodos,
    getQuadrant,
    moveToQuadrant,
    setRuleMode,
    setUrgentDays,
  }
})
