<template>
  <div class="flex flex-col h-full overflow-hidden" :style="{ backgroundColor: 'var(--bg-app)' }">
    <!-- 页面头部 -->
    <div class="flex items-center justify-between px-6 h-14 border-b flex-shrink-0"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }">
      <h1 class="text-lg font-semibold" :style="{ color: 'var(--text-primary)' }">设置</h1>
    </div>

    <!-- Tab 切换栏 -->
    <div class="flex gap-1 px-4 py-3 border-b flex-shrink-0 overflow-x-auto"
      :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }">
      <button
        v-for="t in tabs" :key="t.id"
        class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 flex-shrink-0"
        :style="getTabStyle(t.id)"
        @click="activeTab = t.id"
      >
        <AppIcon :name="t.icon" :size="16" :color="activeTab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)'" />
        {{ t.label }}
      </button>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto">
      <!-- ===== 存储 ===== -->
      <div v-if="activeTab === 'storage'" class="p-6 max-w-2xl space-y-4">
        <div class="rounded-xl p-5" :style="{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              :style="{ backgroundColor: 'var(--bg-hover)' }">
              <AppIcon name="storage" :size="20" color="var(--text-secondary)" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">本地存储</div>
              <div class="text-xs mt-0.5 mb-3" :style="{ color: 'var(--text-secondary)' }">数据存储在浏览器本地，关闭页面也不会丢失</div>
              <div class="flex items-center gap-2 text-xs">
                <span class="w-2 h-2 rounded-full" style="background-color: #22c55e"></span>
                <span class="font-medium" style="color: #22c55e">运行正常</span>
                <span class="mx-1" :style="{ color: 'var(--text-tertiary)' }">|</span>
                <span :style="{ color: 'var(--text-secondary)' }">IndexedDB + localStorage 双备份</span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all duration-150"
            :style="{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }"
            @click="exportData">
            <AppIcon name="add" :size="14" color="var(--text-secondary)" />
            <span>导出数据</span>
          </button>
          <button class="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all duration-150"
            :style="{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }"
            @click="importData">
            <AppIcon name="edit" :size="14" color="var(--text-secondary)" />
            <span>导入数据</span>
          </button>
        </div>
      </div>

      <!-- ===== 同步 ===== -->
      <div v-if="activeTab === 'sync'" class="p-6 max-w-2xl space-y-4">
        <div v-if="store.isSyncEnabled" class="rounded-xl p-4"
          :style="{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: syncDotColor }"></span>
              <span class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">{{ syncStatusText }}</span>
              <span v-if="lastSyncTime" class="text-xs" :style="{ color: 'var(--text-tertiary)' }">上次：{{ lastSyncTime }}</span>
            </div>
            <button class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-150"
              :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }"
              @click="handleSyncNow">
              <AppIcon name="sync" :size="12" color="var(--text-secondary)" />
              同步
            </button>
          </div>
          <div v-if="syncErrorMessage" class="mt-2 text-xs px-3 py-2 rounded-lg"
            :style="{ backgroundColor: '#fef2f2', color: '#ef4444' }">
            {{ syncErrorMessage }}
          </div>
        </div>

        <!-- 七牛云配置卡片 -->
        <div class="rounded-xl overflow-hidden"
          :style="{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }">
          <div class="flex items-center justify-between px-5 py-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                :style="{ backgroundColor: '#f0f9ff' }">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2a10 10 0 0 1 7.07 17.07A10 10 0 0 1 4.93 4.93 10 10 0 0 1 12 2z"/>
                  <path d="M8 12l3 3 5-5"/>
                </svg>
              </div>
              <div>
                <div class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">七牛云 Kodo</div>
                <div class="text-xs" :style="{ color: 'var(--text-secondary)' }">10GB 免费存储，国内直连</div>
              </div>
            </div>
            <span v-if="store.activeProvider?.status === 'connected'" class="text-xs font-medium px-2.5 py-0.5 rounded-full"
              :style="{ backgroundColor: '#f0fdf4', color: '#22c55e' }">已连接</span>
            <span v-else-if="store.activeProvider?.status === 'connecting'" class="text-xs font-medium px-2.5 py-0.5 rounded-full"
              :style="{ backgroundColor: '#eff6ff', color: '#3b82f6' }">连接中...</span>
            <span v-else-if="store.activeProvider?.status === 'error'" class="text-xs font-medium px-2.5 py-0.5 rounded-full"
              :style="{ backgroundColor: '#fef2f2', color: '#ef4444' }">连接失败</span>
            <span v-else class="text-xs" :style="{ color: 'var(--text-tertiary)' }">未配置</span>
          </div>
          <div v-if="store.activeProvider?.status === 'error' && store.activeProvider?.lastError"
            class="px-5 py-2 text-xs" :style="{ backgroundColor: '#fef2f2', color: '#ef4444' }">
            错误：{{ store.activeProvider.lastError }}
          </div>

          <div class="px-5 py-4 border-t space-y-3"
            :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-app)' }">
            <div v-for="field in kodoFields" :key="field.key" class="space-y-1">
              <label class="text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">{{ field.label }}</label>
              <input
                v-model="store.settings.providers[0].config[field.key]"
                :type="field.type || 'text'"
                :placeholder="field.placeholder"
                class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all duration-150"
                :style="{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }"
              />
              <div v-if="field.hint" class="text-xs" :style="{ color: 'var(--text-tertiary)' }">{{ field.hint }}</div>
            </div>

            <div class="flex items-center gap-2 pt-2">
              <button v-if="!store.activeProvider?.enabled"
                class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
                :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }"
                @click="handleEnableProvider('kodo-default')">连接</button>
              <button v-else
                class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
                :style="{ backgroundColor: '#fef2f2', color: '#ef4444' }"
                @click="handleDisconnect">断开</button>
              <button class="px-4 py-2 text-sm rounded-lg transition-all duration-150 ml-auto"
                :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }"
                :disabled="isTesting"
                @click="handleTestConnection">
                <span v-if="isTesting">测试中...</span>
                <span v-else>测试连接</span>
              </button>
            </div>
            <div v-if="testResult" class="text-xs mt-1"
              :style="{ color: testResult.ok ? '#22c55e' : '#ef4444' }">
              {{ testResult.ok ? '✓ ' : '✗ ' }}{{ testResult.message }}
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 主题 ===== -->
      <div v-if="activeTab === 'theme'" class="p-6 max-w-2xl space-y-3">
        <div class="rounded-xl p-5"
          :style="{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }">
          <div class="text-sm font-medium mb-4" :style="{ color: 'var(--text-primary)' }">外观主题</div>
          <div class="space-y-2">
            <label v-for="opt in themeOptions" :key="opt.value"
              class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150"
              :style="getThemeOptionStyle(opt.value)"
              @click="setThemeMode(opt.value)">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center"
                  :style="{ backgroundColor: tm === opt.value ? 'var(--color-accent-light)' : 'var(--bg-hover)' }">
                  <AppIcon :name="opt.icon" :size="18" :color="tm === opt.value ? 'var(--color-accent)' : 'var(--text-secondary)'" />
                </div>
                <div>
                  <div class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">{{ opt.label }}</div>
                  <div class="text-xs" :style="{ color: 'var(--text-secondary)' }">{{ opt.desc }}</div>
                </div>
              </div>
              <span v-if="tm === opt.value" :style="{ color: 'var(--text-primary)' }" class="text-sm font-medium">✓</span>
            </label>
          </div>
        </div>
      </div>

      <!-- ===== 关于 ===== -->
      <div v-if="activeTab === 'about'" class="p-6 max-w-2xl space-y-3">
        <div class="rounded-xl p-8 text-center"
          :style="{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
            :style="{ backgroundColor: 'var(--color-accent-light)' }">
            <AppIcon name="about" :size="32" color="var(--color-accent)" />
          </div>
          <div class="text-base font-semibold" :style="{ color: 'var(--text-primary)' }">TinyDo</div>
          <div class="text-sm mt-0.5 mb-4" :style="{ color: 'var(--text-secondary)' }">对标滴答清单的个人任务管理工具</div>
          <div class="inline-flex items-center gap-2 text-xs rounded-full px-4 py-1.5"
            :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }">
            <span>v0.0.2</span>
            <span class="w-1 h-1 rounded-full" :style="{ backgroundColor: 'var(--text-tertiary)' }"></span>
            <span>Vue 3 + SQLite</span>
          </div>
          <div class="mt-4 flex justify-center gap-3">
            <a href="https://github.com/rayliu445" target="_blank" rel="noopener noreferrer"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-150"
              :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              作者主页
            </a>
            <a href="https://github.com/rayliu445/tinydo" target="_blank" rel="noopener noreferrer"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-150"
              :style="{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              项目仓库
            </a>
          </div>
        </div>
        <div class="rounded-xl p-5"
          :style="{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }">
          <div class="text-xs font-medium mb-3" :style="{ color: 'var(--text-secondary)' }">功能列表</div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="f in features" :key="f" class="flex items-center gap-2 text-xs"
              :style="{ color: 'var(--text-secondary)' }">
              <span :style="{ color: 'var(--text-secondary)' }">✓</span>{{ f }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { themeMode as tm, setThemeMode } from '../stores/theme'
import AppIcon from '../components/icons/AppIcon.vue'

const store = useSettingsStore()
const activeTab = ref<'storage' | 'sync' | 'theme' | 'about'>('storage')

const tabs = [
  { id: 'storage' as const, label: '存储', icon: 'storage' },
  { id: 'sync' as const, label: '同步', icon: 'sync' },
  { id: 'theme' as const, label: '主题', icon: 'palette' },
  { id: 'about' as const, label: '关于', icon: 'about' },
]

const themeOptions = [
  { value: 'light' as const, label: '亮色', icon: 'sun', desc: '始终使用亮色主题' },
  { value: 'dark' as const, label: '暗黑', icon: 'moon', desc: '始终使用暗黑主题' },
  { value: 'system' as const, label: '跟随系统', icon: 'system', desc: '自动跟随系统主题设置' },
]

const kodoFields = [
  { key: 'bucket', label: 'Bucket 名称', placeholder: '如：todo-app-sync' },
  { key: 'region', label: 'Region（地域）', placeholder: 'cn-east-1（华东）| cn-north-1（华北）| cn-south-1（华南）', hint: '七牛云控制台 → 空间概览可查看地域' },
  { key: 'accessKeyId', label: 'AccessKey ID', placeholder: 'LTAI5t...' },
  { key: 'accessKeySecret', label: 'AccessKey Secret', placeholder: 'xxxxxxxxxx', type: 'password' },
]

const features = ['日历月/周/日视图', '四象限矩阵', '滴答清单导入', 'SQLite 数据持久化', '暗黑/亮色主题', '七牛云 Kodo 云同步']

function getTabStyle(tabId: string) {
  const active = activeTab.value === tabId
  return {
    backgroundColor: active ? 'var(--color-accent-light)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
  }
}

function getThemeOptionStyle(value: string) {
  const active = tm.value === value
  return {
    backgroundColor: active ? 'var(--color-accent-light)' : 'transparent',
    borderRadius: '0.75rem',
  }
}

const syncDotColor = computed(() => {
  const s = store.syncState.status
  return s === 'idle' ? '#22c55e' : s === 'syncing' ? '#3b82f6' : s === 'error' ? '#ef4444' : '#eab308'
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
  testResult.value = await store.testKodoConnection()
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