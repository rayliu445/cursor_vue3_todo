import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Todo类型定义
export interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

export const useTodoStore = defineStore('todo', () => {
  // 状态
  const todos = ref<Todo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取所有待办事项
  async function fetchTodos() {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch('http://localhost:3001/todos')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      todos.value = await response.json()
    } catch (err) {
      console.error('获取待办事项失败:', err)
      error.value = err instanceof Error ? err.message : '获取待办事项失败'
    } finally {
      loading.value = false
    }
  }

  // 添加待办事项
  async function addTodo(title: string) {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch('http://localhost:3001/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          completed: false,
          createdAt: new Date().toISOString(),
        }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const newTodo: Todo = await response.json()
      todos.value.push(newTodo)
    } catch (err) {
      console.error('添加待办事项失败:', err)
      error.value = err instanceof Error ? err.message : '添加待办事项失败'
    } finally {
      loading.value = false
    }
  }

  // 更新待办事项
  async function updateTodo(id: string, updates: Partial<Todo>) {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`http://localhost:3001/todos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const updatedTodo: Todo = await response.json()
      const index = todos.value.findIndex((todo) => todo.id === id)
      if (index !== -1) {
        todos.value[index] = updatedTodo
      }
    } catch (err) {
      console.error('更新待办事项失败:', err)
      error.value = err instanceof Error ? err.message : '更新待办事项失败'
    } finally {
      loading.value = false
    }
  }

  // 切换待办事项完成状态
  async function toggleTodo(id: string) {
    const todo = todos.value.find((t) => t.id === id)
    if (todo) {
      await updateTodo(id, { completed: !todo.completed })
    }
  }

  // 删除待办事项
  async function removeTodo(id: string) {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`http://localhost:3001/todos/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
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

  return {
    todos,
    loading,
    error,
    fetchTodos,
    addTodo,
    updateTodo,
    toggleTodo,
    removeTodo,
    completedTodos,
    pendingTodos,
  }
})