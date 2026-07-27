<template>
  <div class="py-6 max-w-3xl mx-auto">
    <h1 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-5">设置</h1>
    <div class="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6 w-fit">
      <button v-for="t in tabs" :key="t.id" class="px-5 py-2 text-sm font-medium rounded-lg transition-all" :class="activeTab === t.id ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'" @click="activeTab = t.id">
        <span class="mr-1.5">{{ t.icon }}</span>{{ t.label }}
      </button>
    </div>
    <div v-if="activeTab === 'storage'" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 p-5 shadow-sm">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-lg">&#x1F4BE;</div>
          <div>
            <div class="font-medium text-sm text-gray-800 dark:text-gray-100">本地存储</div>
            <div class="text-xs text-gray-400 dark:text-gray-400 mt-0.5 mb-3">数据存储在浏览器本地，关闭页面也不会丢失</div>
            <div class="flex items-center gap-2 text-xs">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
              <span class="text-green-600 dark:text-green-400 font-medium">运行正常</span>
              <span class="text-gray-200 dark:text-gray-600 mx-1">|</span>
              <span class="text-gray-400 dark:text-gray-400">IndexedDB + localStorage 双备份</span>
            </div>
          </div>
        </div>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-ghost btn-xs gap-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="exportData">&#x1F4E5; 导出</button>
        <button class="btn btn-ghost btn-xs gap-1.5 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="importData">&#x1F4E4; 导入</button>
      </div>
    </div>
    <div v-if="activeTab === 'sync'" class="space-y-3">
      <div v-if="store.isSyncEnabled" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full" :class="syncDotClass"></span>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ syncStatusText }}</span>
            <span v-if="lastSyncTime" class="text-xs text-gray-400 dark:text-gray-400">上次：{{ lastSyncTime }}</span>
          </div>
          <button class="btn btn-ghost btn-xs text-blue-500 dark:text-blue-400 gap-1" :class="{ loading: store.syncState.status === 'syncing' }" @click="handleSyncNow"><span>&#x1F504;</span> 同步</button>
        </div>
        <div v-if="syncErrorMessage" class="mt-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{{ syncErrorMessage }}</div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm overflow-hidden" :class="{ 'ring-1 ring-blue-500/20 dark:ring-blue-400/30': store.activeProvider?.enabled }">
        <div class="flex items-center justify-between px-4 py-3.5">
          <div class="flex items-center gap-3">
            <span class="text-lg">&#x2601;&#xFE0F;</span>
            <div>
              <div class="text-sm font-medium text-gray-800 dark:text-gray-100">阿里云 OSS</div>
              <div class="text-xs text-gray-400 dark:text-gray-400">国内直连，5GB 免费额度</div>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <span v-if="store.activeProvider?.enabled" class="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 rounded-full font-medium">已连接</span>
            <span v-else class="text-xs text-gray-300 dark:text-gray-500">未配置</span>
          </div>
        </div>
        <div class="border-t border-gray-50 dark:border-gray-600 px-4 py-3.5 bg-gray-50/50 dark:bg-gray-700/30">
          <div class="space-y-2.5">
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Bucket 名称</label>
              <input v-model="store.settings.providers[0].config.bucket" type="text" placeholder="如：todo-app-sync" class="input input-bordered input-xs w-full bg-white dark:bg-gray-700 dark:text-gray-200" />
            </div>
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Region（地域）</label>
              <input v-model="store.settings.providers[0].config.region" type="text" placeholder="oss-cn-hangzhou" class="input input-bordered input-xs w-full bg-white dark:bg-gray-700 dark:text-gray-200" />
            </div>
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">AccessKey ID</label>
              <input v-model="store.settings.providers[0].config.accessKeyId" type="text" placeholder="LTAI5t..." class="input input-bordered input-xs w-full bg-white dark:bg-gray-700 dark:text-gray-200" />
            </div>
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">AccessKey Secret</label>
              <input v-model="store.settings.providers[0].config.accessKeySecret" type="password" placeholder="xxxxxxxxxx" class="input input-bordered input-xs w-full bg-white dark:bg-gray-700 dark:text-gray-200" />
            </div>
            <div class="bg-blue-50/50 dark:bg-blue-900/20 rounded-lg px-3 py-2.5 text-xs text-blue-600 dark:text-blue-400 mt-2">
              首次使用？查看
              <a href="https://github.com/rayliu445/cursor_vue3_todo/blob/main/docs/aliyun-oss-guide.md" target="_blank" class="underline font-medium">阿里云 OSS 配置教程</a>
              ，3 分钟完成设置。
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600 flex gap-2">
            <button v-if="!store.activeProvider?.enabled" class="btn btn-primary btn-xs" @click="handleEnableProvider('oss-default')">连接</button>
            <button v-else class="btn btn-outline btn-error btn-xs" @click="handleDisconnect">断开</button>
            <button class="btn btn-ghost btn-xs text-gray-500 dark:text-gray-400 ml-auto" :disabled="isTesting" @click="handleTestConnection">
              <span v-if="isTesting" class="loading loading-spinner loading-xs"></span>
              <span v-else>&#x1F50C;</span>
              测试连接
            </button>
          </div>
          <div v-if="testResult !== null" class="mt-2 text-xs" :class="testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'">
            {{ testResult.ok ? '✅ ' + testResult.message : '❌ ' + testResult.message }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="activeTab === 'theme'" class="space-y-3">
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 p-5 shadow-sm">
        <div class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">外观主题</div>
        <div class="space-y-2">
          <label v-for="opt in themeOptions" :key="opt.value" class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors" :class="tm === opt.value ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/30 dark:ring-blue-400/40' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'" @click="setThemeMode(opt.value)">
            <div class="flex items-center gap-3">
              <span class="text-lg">{{ opt.icon }}</span>
              <div>
                <div class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ opt.label }}</div>
                <div class="text-xs text-gray-400 dark:text-gray-400">{{ opt.desc }}</div>
              </div>
            </div>
            <span v-if="tm === opt.value" class="text-blue-500 dark:text-blue-400 text-sm">&#x2713;</span>
          </label>
        </div>
      </div>
    </div>
    <div v-if="activeTab === 'about'" class="space-y-3">
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 p-6 shadow-sm text-center">
        <div class="text-3xl mb-2">&#x1F4CB;</div>
        <div class="text-sm font-semibold text-gray-800 dark:text-gray-100">Todo App</div>
        <div class="text-xs text-gray-400 dark:text-gray-400 mt-0.5 mb-3">对标滴答清单的个人任务管理工具</div>
        <div class="inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-full px-3 py-1.5"><span>v0.0.1</span><span class="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-600"></span><span>Vue 3 + CRDT</span></div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 p-4 shadow-sm">
        <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2.5">功能列表</div>
        <div class="grid grid-cols-2 gap-1.5 text-xs">
          <div v-for="f in features" :key="f" class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"><span class="text-green-500">&#x2713;</span>{{ f }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { themeMode as tm, setThemeMode } from '../stores/theme'

const store = useSettingsStore()
const activeTab = ref<'storage' | 'sync' | 'theme' | 'about'>('storage')
const expanded = ref<string | null>(null)

const tabs = [
  { id: 'storage' as const, label: '存储', icon: '💾' },
  { id: 'sync' as const, label: '同步', icon: '🔄' },
  { id: 'theme' as const, label: '主题', icon: '🎨' },
  { id: 'about' as const, label: '关于', icon: '📋' },
]

const themeOptions = [
  { value: 'light' as const, label: '亮色', icon: '☀️', desc: '始终使用亮色主题' },
  { value: 'dark' as const, label: '暗黑', icon: '🌙', desc: '始终使用暗黑主题' },
  { value: 'system' as const, label: '跟随系统', icon: '🌓', desc: '自动跟随系统主题设置' },
]

const features = ['日历月/周/日视图', '四象限矩阵', '滴答清单导入', 'CRDT 数据同步', '本地持久化', '阿里云 OSS 云同步']

const syncDotClass = computed(() => {
  const s = store.syncState.status
  return { 'bg-green-500': s === 'idle', 'bg-blue-500 animate-pulse': s === 'syncing', 'bg-red-500': s === 'error', 'bg-yellow-500': s === 'offline' }
})
const syncStatusText = computed(() => ({ idle: '同步正常', syncing: '同步中…', error: '同步出错', offline: '离线' })[store.syncState.status] || '未知')
const lastSyncTime = computed(() => { const t = store.syncState.lastSyncTime; return t ? new Date(t).toLocaleString('zh-CN') : null })
const syncErrorMessage = computed(() => store.syncState.lastError)

function handleEnableProvider(id: string) { store.toggleProvider(id) }
function handleDisconnect() { store.disconnectProvider() }
async function handleSyncNow() { await store.syncNow() }

const isTesting = ref(false)
const testResult = ref<{ ok: boolean; message: string } | null>(null)
async function handleTestConnection() {
  isTesting.value = true
  testResult.value = null
  testResult.value = await store.testOSSConnection()
  isTesting.value = false
}

async function exportData() {
  const { getDataAccess } = await import('../services/data-access')
  const json = getDataAccess().exportJSON()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = 'todo-backup-' + new Date().toISOString().slice(0, 10) + '.json'
  a.click(); URL.revokeObjectURL(a.href)
}
async function importData() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = '.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const { getDataAccess } = await import('../services/data-access')
      getDataAccess().importJSON(await file.text())
      alert('导入成功！刷新页面查看。')
    } catch { alert('导入失败，请检查文件格式。') }
  }
  input.click()
}
</script>