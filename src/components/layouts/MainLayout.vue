<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 顶部导航 -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-50">
      <div class="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <router-link to="/" class="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
          <span class="text-base">📋</span> Todo
        </router-link>
        <nav class="flex items-center gap-0.5">
          <router-link
            v-for="item in navItems" :key="item.path"
            :to="item.path"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
            :class="isActive(item.path) ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'"
          >
            <span class="mr-1">{{ item.icon }}</span>{{ item.label }}
          </router-link>
          <!-- 主题切换 -->
          <button
            class="ml-2 w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="toggleTheme"
            :title="themeTooltip"
          >
            {{ themeIcon }}
          </button>
        </nav>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-5">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { effectiveTheme, themeMode, setThemeMode, toggleTheme as toggle } from '../../stores/theme'

const route = useRoute()

const navItems = [
  { path: '/', label: '待办', icon: '📋' },
  { path: '/calendar', label: '日历', icon: '📅' },
  { path: '/matrix', label: '四象限', icon: '🔲' },
  { path: '/completed', label: '已完成', icon: '✅' },
  { path: '/settings', label: '', icon: '⚙️' },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

// 主题切换
const themeIcon = computed(() => {
  if (themeMode.value === 'system') return '🌓'
  return effectiveTheme.value === 'dark' ? '🌙' : '☀️'
})
const themeTooltip = computed(() => {
  if (themeMode.value === 'system') return `跟随系统 (${effectiveTheme.value})`
  return effectiveTheme.value === 'dark' ? '切换亮色模式' : '切换暗黑模式'
})
function toggleTheme() { toggle() }
</script>
