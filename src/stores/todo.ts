import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDataAccess } from '../services/data-access'
import type { CRDTTodo } from '../services/crdt-doc'
import { getSyncEngine } from '../services/sync-engine'

// Todo类型定义（保持向前兼容，与 CRDTTodo 等价）
export type Todo = CRDTTodo

// 数据层变化订阅标记（避免重复订阅）
let syncRefreshSubscribed = false

export const useTodoStore = defineStore('todo', () => {
  // 状态
  const todos = ref<Todo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 延迟获取数据访问层实例（可能在初始化之前被调用）
  function getOrInitDataAccess() {
    try {
      return getDataAccess()
    } catch {
      return null
    }
  }

  // 从数据层刷新 todos
  function refreshTodos() {
    const da = getOrInitDataAccess()
    if (!da) return
    todos.value = da.getTodos() as Todo[]
  }

  // 获取所有待办事项
  async function fetchTodos() {
    loading.value = true
    error.value = null
    
    try {
      const da = getOrInitDataAccess()
      if (da) {
        // 订阅数据层变化：云端同步拉取 / 数据导入后自动刷新界面
        if (!syncRefreshSubscribed) {
          syncRefreshSubscribed = true
          da.onChange(() => { refreshTodos() })
        }
        refreshTodos()
      }
    } catch (err) {
      console.error('获取待办事项失败:', err)
      error.value = err instanceof Error ? err.message : '获取待办事项失败'
    } finally {
      loading.value = false
    }
  }

  // 获取数据访问层（安全）
  function getDA() {
    const da = getOrInitDataAccess()
    if (!da) throw new Error('DataAccess not initialized yet')
    return da
  }

  // 添加待办事项（支持完整字段）
  async function addTodo(data: { title: string; completed?: boolean; priority?: Todo['priority']; dueDate?: string; startDate?: string; content?: string; tags?: string[]; list?: string; isAllDay?: boolean }) {
    loading.value = true
    error.value = null
    
    try {
      const da = getDA()
      const newTodo = da.addTodo({
        title: data.title,
        completed: data.completed ?? false,
        priority: data.priority ?? 0,
        dueDate: data.dueDate,
        startDate: data.startDate,
        content: data.content,
        tags: data.tags,
        list: data.list,
        isAllDay: data.isAllDay,
        createdAt: new Date().toISOString(),
      })
      
      refreshTodos()
      
      // 触发同步
      getSyncEngine().scheduleWrite()
      
      return newTodo
    } catch (err) {
      console.error('添加待办事项失败:', err)
      error.value = err instanceof Error ? err.message : '添加待办事项失败'
      return null
    } finally {
      loading.value = false
    }
  }

  // 更新待办事项
  async function updateTodo(id: string, updates: Partial<Todo>) {
    loading.value = true
    error.value = null
    
    try {
      const da = getDA()
      da.updateTodo(id, updates)
      refreshTodos()
      getSyncEngine().scheduleWrite()
    } catch (err) {
      console.error('更新待办事项失败:', err)
      error.value = err instanceof Error ? err.message : '更新待办事项失败'
    } finally {
      loading.value = false
    }
  }

  // 切换待办事项完成状态
  async function toggleTodo(id: string) {
    try {
      const todo = todos.value.find((t) => t.id === id)
      if (todo) {
        const da = getDA()
        da.toggleTodo(id)
        refreshTodos()
        getSyncEngine().scheduleWrite()
      }
    } catch (err) {
      console.error('切换待办事项失败:', err)
    }
  }

  // 删除待办事项
  async function removeTodo(id: string) {
    loading.value = true
    error.value = null
    
    try {
      const da = getDA()
      da.removeTodo(id)
      refreshTodos()
      getSyncEngine().scheduleWrite()
      
      todos.value = todos.value.filter((todo) => todo.id !== id)
    } catch (err) {
      console.error('删除待办事项失败:', err)
      error.value = err instanceof Error ? err.message : '删除待办事项失败'
    } finally {
      loading.value = false
    }
  }

  // 获取已完成的待办事项
  const completedTodos = computed(() => {
    return todos.value.filter((todo) => todo.completed)
  })

  // 获取未完成的待办事项
  const pendingTodos = computed(() => {
    return todos.value.filter((todo) => !todo.completed)
  })

  // 批量添加待办事项（用于导入）
  // 幂等逻辑：按标题匹配已有任务，已存在则补齐缺失字段（如内容），不存在才新增。
  // 这样重新导入同一份数据不会重复，且能修复旧数据缺失的字段。
  async function bulkAddTodos(items: Array<{ title: string; completed?: boolean; priority?: Todo['priority']; dueDate?: string; startDate?: string; content?: string; tags?: string[]; list?: string; isAllDay?: boolean; createdAt?: string; completedTime?: string }>) {
    loading.value = true
    error.value = null
    let successCount = 0

    try {
      const da = getDA()

      // 建立标题索引（用于匹配去重）
      const byTitle = new Map<string, Todo>()
      for (const t of da.getTodos()) {
        const key = (t.title || '').trim()
        if (key && !byTitle.has(key)) byTitle.set(key, t)
      }

      const toAdd: Array<typeof items[number]> = []
      const toUpdate: Array<{ id: string; item: typeof items[number] }> = []

      for (const item of items) {
        const title = (item.title || '').trim()
        if (!title) continue
        const found = byTitle.get(title)
        if (found && found.id) {
          // 已存在：记录待补齐缺失字段
          toUpdate.push({ id: found.id, item })
        } else {
          toAdd.push(item)
          // 防止同一批导入中重复标题被重复添加
          byTitle.set(title, { id: 'pending', title } as Todo)
        }
      }

      // 1. 新增（使用批量 API：一次性插入，仅触发一次 onChange 刷新。
      //    注意：不能逐条调用 da.addTodo()——每次都会 notify() → refreshTodos()
      //    全量查询 + 整体替换 todos.value，1000+ 条时会导致 UI 卡死。）
      if (toAdd.length > 0) {
        da.bulkAddTodos(toAdd.map((item) => ({
          title: item.title,
          completed: item.completed ?? false,
          priority: item.priority ?? 0,
          dueDate: item.dueDate,
          startDate: item.startDate,
          content: item.content,
          tags: item.tags,
          list: item.list,
          isAllDay: item.isAllDay,
          completedTime: item.completedTime,
          createdAt: item.createdAt || new Date().toISOString(),
        })))
      }

      // 2. 补齐已存在任务的缺失字段（幂等：只补空字段，不覆盖已有值）
      for (const { id, item } of toUpdate) {
        const current = da.getTodoById(id)
        if (!current) continue
        const updates: Record<string, any> = {}
        if (!current.content && item.content) updates.content = item.content
        if (!current.dueDate && item.dueDate) updates.dueDate = item.dueDate
        if (!current.startDate && item.startDate) updates.startDate = item.startDate
        if (!current.priority && item.priority) updates.priority = item.priority
        if (!current.list && item.list) updates.list = item.list
        if ((!current.tags || current.tags.length === 0) && Array.isArray(item.tags) && item.tags.length > 0) updates.tags = item.tags
        if (Object.keys(updates).length > 0) {
          da.updateTodo(id, updates)
        }
      }

      successCount = toAdd.length + toUpdate.length
      refreshTodos()
      getSyncEngine().scheduleWrite()
    } catch (err) {
      console.error('批量导入失败:', err)
      error.value = err instanceof Error ? err.message : '批量导入失败'
    } finally {
      loading.value = false
    }

    return { success: successCount, total: items.length }
  }

  // 按日期范围获取待办事项
  function getTodosByDateRange(start: string, end: string) {
    return todos.value.filter((todo) => {
      if (!todo.dueDate) return false
      return todo.dueDate >= start && todo.dueDate <= end
    })
  }

  // 按优先级获取待办事项
  function getTodosByPriority(priority: Todo['priority']) {
    return todos.value.filter((todo) => todo.priority === priority)
  }

  return {
    todos,
    loading,
    error,
    fetchTodos,
    addTodo,
    updateTodo,
    toggleTodo,
    removeTodo,
    bulkAddTodos,
    getTodosByDateRange,
    getTodosByPriority,
    completedTodos,
    pendingTodos,
  }
})