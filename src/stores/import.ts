import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTodoStore, type Todo } from './todo'
import { storeToRefs } from 'pinia'

export interface ImportResult {
  success: number
  total: number
  errors: string[]
}

// TickTick 优先级映射
const PRIORITY_MAP: Record<string, 0 | 1 | 3 | 5> = {
  '5': 5,
  '4': 3,
  '3': 3,
  '2': 1,
  '1': 1,
  '0': 0,
  '高': 5,
  '中': 3,
  '低': 1,
  '无': 0,
  '': 0,
}

export const useImportStore = defineStore('import', () => {
  const previewItems = ref<any[]>([])
  const isParsing = ref(false)
  const parseError = ref<string | null>(null)

  function reset() {
    previewItems.value = []
    isParsing.value = false
    parseError.value = null
  }

  // 解析 TickTick JSON 格式
  function parseTickTickJSON(jsonText: string): any[] {
    const data = JSON.parse(jsonText)
    let tasks: any[] = []

    // TickTick JSON 备份可能有多种结构
    if (Array.isArray(data)) {
      tasks = data
    } else if (data.tasks && Array.isArray(data.tasks)) {
      tasks = data.tasks
    } else if (data.todoList && Array.isArray(data.todoList)) {
      tasks = data.todoList
    } else if (data.records && Array.isArray(data.records)) {
      tasks = data.records
    } else {
      // 尝试找第一个数组字段
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          tasks = data[key]
          break
        }
      }
    }

    return tasks.map((item: any) => ({
      title: item.title || item.Title || '',
      content: item.content || item.Content || '',
      priority: parsePriority(item.priority ?? item.Priority),
      dueDate: normalizeDate(item.dueDate ?? item.DueDate ?? item.due_date ?? ''),
      startDate: normalizeDate(item.startDate ?? item.StartDate ?? item.start_date ?? ''),
      completed: item.status === 1 || item.completed === true || item.Status === '1' || item.Status === 'completed',
      completedTime: normalizeDate(item.completedTime ?? item.completed_time ?? ''),
      tags: parseTags(item.tags ?? item.Tags ?? item.tag ?? ''),
      list: item.list ?? item.List ?? item.projectId ?? item.folder ?? '',
      createdAt: normalizeDate(item.createdAt ?? item.createdTime ?? item.created_time ?? ''),
      isAllDay: item.allDay ?? item.isAllDay ?? false,
      taskId: item.taskId ?? item.task_id ?? '',
      parentId: item.parentId ?? item.parent_id ?? '',
    })).filter((item: any) => item.title)
  }

  // 解析 TickTick CSV 格式
  function parseTickTickCSV(csvText: string): any[] {
    // 第一步：将 CSV 文本按行解析（处理多行引号字段和元数据头）
    function splitCSVLines(text: string): string[] {
      const lines: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of text) {
        if (char === '"') {
          inQuotes = !inQuotes
        }
        if (char === '\n' && !inQuotes) {
          lines.push(current)
          current = ''
        } else {
          current += char
        }
      }
      if (current.trim()) lines.push(current)
      return lines
    }

    const rawLines = splitCSVLines(csvText).filter(line => line.trim())

    // 解析 CSV 行（支持引号内逗号）
    function parseCSVLine(line: string): string[] {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    // 查找实际的列头行（跳过 TickTick 的元数据头）
    let headerIdx = -1
    for (let i = 0; i < rawLines.length; i++) {
      const parts = parseCSVLine(rawLines[i])
      if (parts.some(p => /Title|标题|任务标题/i.test(p))) {
        headerIdx = i
        break
      }
    }

    if (headerIdx === -1) {
      throw new Error('CSV 文件格式无效：找不到列头行（需要 Title 列）')
    }

    const headers = parseCSVLine(rawLines[headerIdx])
    const items: any[] = []

    for (let i = headerIdx + 1; i < rawLines.length; i++) {
      const values = parseCSVLine(rawLines[i])
      const item: Record<string, string> = {}
      headers.forEach((h, idx) => {
        item[h.trim()] = values[idx] || ''
      })
      items.push(item)
    }

    // 字段映射
    return items.map(item => ({
      title: item.Title || item.title || item['任务标题'] || '',
      content: item.Content || item.content || item['内容'] || item['备注'] || '',
      priority: parsePriority(item.Priority || item.priority || item['优先级']),
      dueDate: normalizeDate(item['Due Date'] || item.DueDate || item.dueDate || item['截止日期'] || item['到期日'] || ''),
      startDate: normalizeDate(item['Start Date'] || item.StartDate || item.startDate || item['开始日期'] || ''),
      completed: item.Status === '1' || item.Status === '2' || item.Status === 'completed' || item['状态'] === '已完成' || item.completed === 'true',
      completedTime: normalizeDate(item['Completed Time'] || item.completedTime || item['完成时间'] || ''),
      tags: parseTags(item.Tags || item.tags || item['标签'] || ''),
      taskId: item.taskId || item['Task Id'] || '',
      parentId: item.parentId || item['Parent Id'] || '',
      list: item.List || item.list || item['清单'] || item['列表'] || '',
      createdAt: normalizeDate(item['Created Time'] || item.createdAt || item['创建时间'] || ''),
    })).filter((item: any) => item.title)
  }

  // 解析优先级
  function parsePriority(val: any): 0 | 1 | 3 | 5 {
    if (val === null || val === undefined) return 0
    const key = String(val).trim()
    return PRIORITY_MAP[key] ?? 0
  }

  // 解析标签
  function parseTags(val: any): string[] {
    if (!val) return []
    if (Array.isArray(val)) return val.filter(Boolean).map(String)
    return String(val).split(/[,;，；、]/).map(t => t.trim()).filter(Boolean)
  }

  // 标准化日期格式
  function normalizeDate(val: string): string {
    if (!val) return ''
    // 尝试解析各种日期格式
    const trimmed = val.trim()

    // 已经是 ISO 格式
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return trimmed
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed
    }

    // YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}/.test(trimmed)) {
      return trimmed.replace(/\//g, '-')
    }

    // MM/DD/YYYY 或 M/D/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      const parts = trimmed.split('/')
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
    }

    // 时间戳
    const ts = Number(trimmed)
    if (!isNaN(ts) && ts > 1000000000000) {
      return new Date(ts).toISOString()
    }

    return trimmed
  }

  // 解析文件
  function parseFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      isParsing.value = true
      parseError.value = null

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const fileName = file.name.toLowerCase()
          let items: any[]

          if (fileName.endsWith('.json')) {
            items = parseTickTickJSON(text)
          } else if (fileName.endsWith('.csv')) {
            items = parseTickTickCSV(text)
          } else {
            // 尝试自动检测格式
            try {
              items = parseTickTickJSON(text)
            } catch {
              items = parseTickTickCSV(text)
            }
          }

          previewItems.value = items
          isParsing.value = false
          resolve(items)
        } catch (err) {
          parseError.value = err instanceof Error ? err.message : '解析文件失败'
          isParsing.value = false
          reject(err)
        }
      }

      reader.onerror = () => {
        parseError.value = '读取文件失败'
        isParsing.value = false
        reject(new Error('读取文件失败'))
      }

      reader.readAsText(file)
    })
  }

  // 执行导入
  async function executeImport(): Promise<ImportResult> {
    const todoStore = useTodoStore()
    const errors: string[] = []

    const result = await todoStore.bulkAddTodos(previewItems.value)

    return {
      success: result.success,
      total: previewItems.value.length,
      errors,
    }
  }

  return {
    previewItems,
    isParsing,
    parseError,
    reset,
    parseFile,
    executeImport,
  }
})
