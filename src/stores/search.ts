/**
 * 全局搜索状态共享
 * 侧边栏搜索框 → 各个页面视图
 */
import { ref } from 'vue'

// 模块级响应式状态，所有导入此文件的组件共享同一实例
const searchQuery = ref('')

export function useGlobalSearch() {
  function setSearch(query: string) {
    searchQuery.value = query
    // 同步到 sessionStorage 供非 Vue 环境使用
    try {
      sessionStorage.setItem('todo-search-query', query)
    } catch {}
  }

  function getSearch(): string {
    // 首次读取时尝试从 sessionStorage 恢复
    if (!searchQuery.value) {
      try {
        const saved = sessionStorage.getItem('todo-search-query')
        if (saved) searchQuery.value = saved
      } catch {}
    }
    return searchQuery.value
  }

  return {
    searchQuery,
    setSearch,
    getSearch,
  }
}
