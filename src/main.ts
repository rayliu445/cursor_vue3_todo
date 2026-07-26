import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import { routes } from './routes'
import { createDataAccess } from './services/data-access'
import { getSyncEngine } from './services/sync-engine'
import { initTheme } from './stores/theme'
import './index.css'

// ============ 创建 Vue 应用（先挂载，不阻塞 UI） ============
const app = createApp(App)
const pinia = createPinia()

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

app.use(pinia)
app.use(router)
app.mount('#app')

// 初始化主题
initTheme()

// ============ 异步初始化数据层（不阻塞渲染） ============
async function initializeDataLayer() {
  try {
    const dataAccess = createDataAccess()
    await dataAccess.initialize()
    console.log('[App] CRDT data layer initialized')

    // 通知 store 刷新数据
    const { useTodoStore } = await import('./stores/todo')
    const store = useTodoStore()
    store.fetchTodos()
    console.log('[App] Todos refreshed after data layer init')
  } catch (err) {
    console.error('[App] Data layer init failed (app still works):', err)
  }
}

initializeDataLayer()
