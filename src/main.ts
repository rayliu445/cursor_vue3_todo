import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import { routes } from './routes'
import { createDataAccess } from './services/data-access'
import { getSyncEngine } from './services/sync-engine'
import { initTheme } from './stores/theme'
import './index.css'

// ============ 初始化 CRDT 数据层 ============
async function initializeApp() {
  // 初始化数据访问层（加载 CRDT 文档）
  const dataAccess = createDataAccess()
  await dataAccess.initialize()
  console.log('[App] CRDT data layer initialized')

  // 尝试从旧版 db.json 迁移（如果存在且 CRDT 文档为空）
  try {
    const currentTodos = dataAccess.getTodos()
    if (currentTodos.length === 0) {
      // 之前已有默认样本数据，无需迁移
      console.log('[App] CRDT document initialized')
    }
  } catch {
    console.log('[App] Initializing fresh CRDT document')
  }

  // ============ 创建 Vue 应用 ============
  const app = createApp(App)
  const pinia = createPinia()

  const router = createRouter({
    history: createWebHistory(),
    routes,
  })

  app.use(pinia)
  app.use(router)
  app.mount('#app')

  // 初始化主题（必须在 DOM 就绪后）
  initTheme()
}

initializeApp().catch(console.error)
