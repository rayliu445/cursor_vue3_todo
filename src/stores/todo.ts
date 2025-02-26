import { defineStore } from 'pinia'
import { ref } from 'vue'

// Todo类型定义
interface Todo {
  id: number
  title: string
  completed: boolean
}

// JSON Server的基础URL
const API_BASE_URL = 'http://localhost:3001'

export const useTodoStore = defineStore('todo', () => {
  // 状态
  const todos = ref<Todo[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 获取所有任务
  async function fetchTodos() {
    isLoading.value = true
    try {
      const response = await fetch(`${API_BASE_URL}/todos`)
      todos.value = await response.json()
    } catch (e) {
      error.value = '获取任务列表失败'
      console.error(e)
    } finally {
      isLoading.value = false
    }
  }

  // 添加任务
  async function addTodo(title: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          completed: false,
        }),
      })
      const newTodo = await response.json()
      todos.value.push(newTodo)
    } catch (e) {
      error.value = '添加任务失败'
      console.error(e)
    }
  }

  // 删除任务
  async function removeTodo(id: number) {
    try {
      await fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'DELETE',
      })
      todos.value = todos.value.filter(todo => todo.id !== id)
    } catch (e) {
      error.value = '删除任务失败'
      console.error(e)
    }
  }

  // 切换任务状态
  async function toggleTodoStatus(id: number) {
    try {
      const todo = todos.value.find(t => t.id === id)
      if (!todo) return

      const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !todo.completed,
        }),
      })
      const updatedTodo = await response.json()
      const index = todos.value.findIndex(t => t.id === id)
      todos.value[index] = updatedTodo
    } catch (e) {
      error.value = '更新任务状态失败'
      console.error(e)
    }
  }

  // 更新任务
  async function updateTodo(id: number, title: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
        }),
      })
      const updatedTodo = await response.json()
      const index = todos.value.findIndex(t => t.id === id)
      if (index !== -1) {
        todos.value[index] = updatedTodo
      }
    } catch (e) {
      error.value = '更新任务失败'
      console.error(e)
    }
  }

  return {
    todos,
    isLoading,
    error,
    fetchTodos,
    addTodo,
    removeTodo,
    toggleTodoStatus,
    updateTodo,
  }
})
