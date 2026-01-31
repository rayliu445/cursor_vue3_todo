import { defineStore } from 'pinia'
import { ref } from 'vue'

// Todo类型定义
interface Todo {
  id: number | string
  title: string
  completed: boolean
  createdAt?: string
}

export const useTodoStore = defineStore('todo', () => {
  // 状态
  const todos = ref<Todo[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 检查是否在Electron环境中
  function isElectronEnvironment() {
    return typeof window !== 'undefined' && (window as any).electronAPI
  }

  // 获取所有任务
  async function fetchTodos() {
    isLoading.value = true
    try {
      if (isElectronEnvironment()) {
        // 在Electron环境中使用IPC
        todos.value = await (window as any).electronAPI.getTodos()
      } else {
        // 在浏览器环境中，不执行HTTP请求，仅清空或保持现有数据
        todos.value = []
      }
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
      if (isElectronEnvironment()) {
        // 在Electron环境中使用IPC
        const newTodo = await (window as any).electronAPI.addTodo({ title })
        todos.value.push(newTodo)
      } else {
        // 在浏览器环境中，模拟添加（仅在内存中）
        const newTodo: Todo = {
          id: Date.now().toString(),
          title,
          completed: false,
          createdAt: new Date().toISOString(),
        }
        todos.value.push(newTodo)
      }
    } catch (e) {
      error.value = '添加任务失败'
      console.error(e)
    }
  }

  // 删除任务
  async function removeTodo(id: number | string) {
    try {
      if (isElectronEnvironment()) {
        // 在Electron环境中使用IPC
        await (window as any).electronAPI.removeTodo(id)
        todos.value = todos.value.filter(todo => todo.id !== id)
      } else {
        // 在浏览器环境中，模拟删除（仅在内存中）
        todos.value = todos.value.filter(todo => todo.id !== id)
      }
    } catch (e) {
      error.value = '删除任务失败'
      console.error(e)
    }
  }

  // 切换任务状态
  async function toggleTodoStatus(id: number | string) {
    try {
      if (isElectronEnvironment()) {
        // 在Electron环境中使用IPC
        const updatedTodo = await (window as any).electronAPI.toggleTodo(id)
        const index = todos.value.findIndex(t => t.id === id)
        if (index !== -1) {
          todos.value[index] = updatedTodo
        }
      } else {
        // 在浏览器环境中，模拟切换状态（仅在内存中）
        const index = todos.value.findIndex(t => t.id === id)
        if (index !== -1) {
          todos.value[index] = {
            ...todos.value[index],
            completed: !todos.value[index].completed,
          }
        }
      }
    } catch (e) {
      error.value = '更新任务状态失败'
      console.error(e)
    }
  }

  // 更新任务
  async function updateTodo(id: number | string, title: string) {
    try {
      if (isElectronEnvironment()) {
        // 在Electron环境中使用IPC
        const updatedTodo = await (window as any).electronAPI.updateTodo(id, { title })
        const index = todos.value.findIndex(t => t.id === id)
        if (index !== -1) {
          todos.value[index] = updatedTodo
        }
      } else {
        // 在浏览器环境中，模拟更新（仅在内存中）
        const index = todos.value.findIndex(t => t.id === id)
        if (index !== -1) {
          todos.value[index] = {
            ...todos.value[index],
            title,
          }
        }
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