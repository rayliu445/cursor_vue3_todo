<template>
  <div class="flex h-screen overflow-hidden" :style="{ backgroundColor: 'var(--bg-app)' }">
    <!-- ============ 左侧边栏 ============ -->
    <aside
      class="flex-shrink-0 flex flex-col border-r select-none"
      :style="{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-sidebar)',
        borderColor: 'var(--border-color)',
      }"
    >
      <!-- 用户区域（头像占位） -->
      <div
        class="flex items-center gap-3 px-4 h-14 border-b"
        :style="{ borderColor: 'var(--border-color)' }"
      >
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center select-none overflow-hidden"
          :style="{ backgroundColor: '#ffd6a5' }"
        >
          <!-- 像素风卡通头像 -->
          <svg viewBox="0 0 32 32" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 头发 -->
            <rect x="8" y="6" width="16" height="6" rx="2" fill="#4a3728"/>
            <rect x="6" y="8" width="4" height="4" rx="1" fill="#4a3728"/>
            <rect x="22" y="8" width="4" height="4" rx="1" fill="#4a3728"/>
            <rect x="10" y="4" width="12" height="4" rx="2" fill="#4a3728"/>
            <!-- 脸部 -->
            <rect x="8" y="10" width="16" height="12" rx="3" fill="#ffd6a5"/>
            <!-- 眼睛 -->
            <rect x="11" y="14" width="3" height="3" rx="1" fill="#333"/>
            <rect x="18" y="14" width="3" height="3" rx="1" fill="#333"/>
            <!-- 眼睛高光 -->
            <rect x="12" y="14" width="1" height="1" fill="#fff"/>
            <rect x="19" y="14" width="1" height="1" fill="#fff"/>
            <!-- 嘴巴（微笑） -->
            <path d="M13 20a3 3 0 0 0 6 0" stroke="#e88c31" stroke-width="1.2" stroke-linecap="round" fill="none"/>
            <!-- 腮红 -->
            <rect x="9" y="17" width="2" height="2" rx="1" fill="#ffb5b5" opacity="0.6"/>
            <rect x="21" y="17" width="2" height="2" rx="1" fill="#ffb5b5" opacity="0.6"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold truncate" :style="{ color: 'var(--text-primary)' }">
            TinyDo
          </div>
          <div class="text-xs truncate" :style="{ color: 'var(--text-secondary)' }">
            任务管理
          </div>
        </div>
      </div>

      <!-- 导航：两列（左列一级图标 + 中列二级清单） -->
      <div class="flex flex-1 overflow-hidden">
        <!-- 左列：添加任务 / 今天 / 日历 / 四象限 / 已完成 -->
        <nav
          class="w-14 flex-shrink-0 flex flex-col items-center gap-1 py-2 border-r overflow-y-auto"
          :style="{ borderColor: 'var(--border-color)' }"
        >
          <!-- 添加任务（第一列第一个） -->
          <button
            class="w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150"
            :style="{ backgroundColor: 'var(--color-accent-light)' }"
            title="添加任务"
            @click="handleAddTask"
          >
            <AppIcon name="add" :size="20" color="var(--color-accent)" />
          </button>
          <button
            v-for="item in primaryNavItems"
            :key="item.id"
            class="w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150"
            :style="getIconNavStyle(item)"
            :title="item.label"
            @click="navigateTo(item)"
          >
            <AppIcon :name="item.icon" :size="20" :color="isActive(item) ? 'var(--color-accent)' : 'var(--text-secondary)'" />
          </button>
          <!-- 搜索（四象限下）：展开中列搜索框，可搜所有已完成/未完成 -->
          <button
            class="w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150"
            :style="{ backgroundColor: searchActive ? 'var(--color-accent-light)' : 'transparent' }"
            title="搜索"
            @click="toggleSearch"
          >
            <AppIcon name="search" :size="20" :color="searchActive ? 'var(--color-accent)' : 'var(--text-secondary)'" />
          </button>
        </nav>

        <!-- 中列（二级）：搜索框 + 今天 / 最近7天 / 收集箱 -->
        <nav class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          <!-- 搜索框（点击左列搜索按钮展开，可搜所有已完成/未完成） -->
          <div v-if="searchActive" class="px-1 pb-1.5">
            <div class="relative">
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                placeholder="搜索所有任务（含已完成）..."
                class="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg transition-all duration-150 outline-none"
                :style="{
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--color-accent)',
                }"
                @focus="searchFocused = true"
                @blur="searchFocused = false"
              />
              <span
                class="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center"
                :style="{ color: searchFocused ? 'var(--text-secondary)' : 'var(--text-tertiary)' }"
              >
                <AppIcon name="search" :size="12" />
              </span>
              <button
                v-if="searchQuery"
                class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full cursor-pointer"
                :style="{ color: 'var(--text-tertiary)' }"
                title="清除搜索"
                @click="clearSearch"
              >
                <AppIcon name="delete" :size="12" />
              </button>
            </div>
          </div>
          <div
            v-for="item in secondaryNavItems"
            :key="item.id"
            class="relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-150"
            :class="{
              'font-medium': isActive(item),
            }"
            :style="getNavItemStyle(item)"
            @click="navigateTo(item)"
          >
            <!-- 选中指示器 -->
            <div
              v-if="isActive(item)"
              class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r sidebar-indicator"
              :style="{ backgroundColor: 'var(--color-accent)' }"
            />
            <!-- 图标 -->
            <span class="flex-shrink-0 flex items-center justify-center" :style="{ opacity: isActive(item) ? 1 : 0.6 }">
              <AppIcon :name="item.id" :size="18" :color="isActive(item) ? 'var(--text-primary)' : 'var(--text-secondary)'" />
            </span>
            <!-- 标签 -->
            <span class="flex-1 truncate">{{ item.label }}</span>
            <!-- 数量 -->
            <span
              v-if="item.count !== undefined"
              class="text-xs tabular-nums flex-shrink-0"
              :style="{ color: 'var(--text-tertiary)' }"
            >
              {{ item.count }}
            </span>
          </div>
        </nav>
      </div>

      <!-- 底部：设置 -->
      <div
        class="border-t px-2 py-3"
        :style="{ borderColor: 'var(--border-color)' }"
      >
        <router-link
          to="/settings"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
          :class="{ 'font-medium': route.path === '/settings' }"
          :style="{
            color: route.path === '/settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: route.path === '/settings' ? 'var(--color-accent-light)' : 'transparent',
          }"
        >
          <AppIcon name="settings" :size="18" :color="route.path === '/settings' ? 'var(--color-accent)' : 'var(--text-secondary)'" />
          <span>设置</span>
        </router-link>
      </div>
    </aside>

    <!-- ============ 右侧主内容 ============ -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodoStore } from '../../stores/todo'
import { storeToRefs } from 'pinia'
import AppIcon from '../icons/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)

// 获取今天和最近7天的任务数量
const todayCount = computed(() => {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return todos.value.filter(t => !t.completed && t.dueDate && t.dueDate.startsWith(todayStr)).length
})

const next7Count = computed(() => {
  const today = new Date()
  const next7 = new Date(today)
  next7.setDate(next7.getDate() + 7)
  const todayStr = today.toISOString().slice(0, 10)
  const next7Str = next7.toISOString().slice(0, 10)
  return todos.value.filter(t => {
    if (!t.dueDate || t.completed) return false
    return t.dueDate >= todayStr && t.dueDate <= next7Str
  }).length
})

const allCount = computed(() => {
  return todos.value.filter(t => !t.completed).length
})

const completedCount = computed(() => {
  return todos.value.filter(t => t.completed).length
})

interface NavItem {
  id: string
  label: string
  path: string
  count?: number | string
}

interface PrimaryNavItem {
  id: string
  label: string
  icon: string
  path: string
}

// 左列（一级图标）：日历 / 四象限（“今天”由中列切换，“已完成”通过搜索查找）
const primaryNavItems: PrimaryNavItem[] = [
  { id: 'calendar', label: '日历', icon: 'calendar', path: '/calendar' },
  { id: 'matrix', label: '四象限', icon: 'matrix', path: '/matrix' },
]

// 添加任务：跳到收集箱、清空搜索（避免残留关键词过滤新任务）、聚焦添加输入框
function handleAddTask() {
  router.push('/')
  setSearch('')
  window.dispatchEvent(new CustomEvent('tinydo-focus-add'))
}

// 中列（二级清单）：今天 / 最近7天 / 收集箱
const secondaryNavItems = computed<NavItem[]>(() => [
  { id: 'today', label: '今天', path: '/?view=today', count: todayCount.value || '' },
  { id: 'next7', label: '最近7天', path: '/?view=next7', count: next7Count.value || '' },
  { id: 'inbox', label: '收集箱', path: '/', count: allCount.value || '' },
])

function getIconNavStyle(item: PrimaryNavItem) {
  const active = isActive(item)
  return {
    backgroundColor: active ? 'var(--color-accent-light)' : 'transparent',
  }
}

function isActive(item: NavItem): boolean {
  if (item.id === 'inbox') return route.path === '/' && !route.query.view
  if (item.id === 'today') return route.path === '/' && route.query.view === 'today'
  if (item.id === 'next7') return route.path === '/' && route.query.view === 'next7'
  return route.path === item.path
}

function getNavItemStyle(item: NavItem) {
  const active = isActive(item)
  return {
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    backgroundColor: active ? 'var(--color-accent-light)' : 'transparent',
  }
}

function navigateTo(item: NavItem) {
  if (item.id === 'inbox') {
    router.push('/')
  } else if (item.id === 'today') {
    router.push('/?view=today')
  } else if (item.id === 'next7') {
    router.push('/?view=next7')
  } else {
    router.push(item.path)
  }
}

import { useGlobalSearch } from '../../stores/search'
const { searchQuery, setSearch } = useGlobalSearch()
const searchFocused = ref(false)
const searchActive = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

// 点击左列搜索按钮：展开中列搜索框并聚焦（搜索含已完成/未完成）
function toggleSearch() {
  searchActive.value = !searchActive.value
  if (searchActive.value) {
    router.push('/')
    nextTick(() => searchInputRef.value?.focus())
  } else {
    setSearch('')
  }
}

// 清除搜索词（保持搜索框打开）
function clearSearch() {
  setSearch('')
  nextTick(() => searchInputRef.value?.focus())
}

// 监听搜索输入变化
watch(searchQuery, (val) => {
  setSearch(val)
})

onMounted(() => {
  todoStore.fetchTodos()
  // 恢复上次搜索状态
  const saved = sessionStorage.getItem('todo-search-query')
  if (saved && saved !== searchQuery.value) {
    searchQuery.value = saved
  }
})
</script>
