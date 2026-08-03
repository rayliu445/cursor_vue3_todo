<template>
  <div class="flex h-screen overflow-hidden" :style="{ backgroundColor: 'var(--bg-app)' }">
    <!-- ============ 左侧边栏 ============ -->
    <aside
      class="flex-shrink-0 flex flex-col border-r select-none transition-all duration-150"
      :style="{
        width: showSecondaryNav ? 'var(--sidebar-width)' : '56px',
        backgroundColor: 'var(--bg-sidebar)',
        borderColor: 'var(--border-color)',
      }"
    >
      <!-- 用户区域（头像占位） -->
      <div
        class="flex items-center gap-3 h-14 border-b flex-shrink-0"
        :style="{
          paddingLeft: showSecondaryNav ? '16px' : '12px',
          paddingRight: showSecondaryNav ? '16px' : '12px',
          borderColor: 'var(--border-color)',
        }"
      >
        <div
          class="w-8 h-8 flex-shrink-0 flex items-center justify-center select-none overflow-hidden"
          :style="{ borderRadius: '50%', backgroundColor: '#ffe3b3' }"
        >
          <!-- 像素柴犬头像 -->
          <svg viewBox="0 0 32 32" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
            <!-- 左耳（棕，圆润） -->
            <rect x="5" y="3" width="5" height="4" fill="#d99a4e"/>
            <rect x="4" y="7" width="7" height="2" fill="#d99a4e"/>
            <!-- 左耳内（深棕） -->
            <rect x="6" y="5" width="2" height="3" fill="#b3762f"/>
            <!-- 右耳（棕，圆润） -->
            <rect x="22" y="3" width="5" height="4" fill="#d99a4e"/>
            <rect x="21" y="7" width="7" height="2" fill="#d99a4e"/>
            <!-- 右耳内（深棕） -->
            <rect x="24" y="5" width="2" height="3" fill="#b3762f"/>
            <!-- 头顶（棕） -->
            <rect x="9" y="7" width="14" height="2" fill="#d99a4e"/>
            <!-- 脸颊（棕，更圆） -->
            <rect x="8" y="8" width="16" height="1" fill="#d99a4e"/>
            <rect x="7" y="9" width="18" height="8" fill="#d99a4e"/>
            <!-- 白色眉毛点（柴犬标志） -->
            <rect x="10" y="9" width="2" height="1" fill="#fdf3e3"/>
            <rect x="20" y="9" width="2" height="1" fill="#fdf3e3"/>
            <!-- 眼睛（黑，更大更亮） -->
            <rect x="10" y="11" width="4" height="4" fill="#3b2a1a"/>
            <rect x="18" y="11" width="4" height="4" fill="#3b2a1a"/>
            <!-- 眼睛高光（白） -->
            <rect x="11" y="11" width="2" height="2" fill="#fff"/>
            <rect x="19" y="11" width="2" height="2" fill="#fff"/>
            <!-- 白色下巴/嘴部（倒心形白面具） -->
            <rect x="11" y="13" width="10" height="1" fill="#fdf3e3"/>
            <rect x="10" y="14" width="12" height="2" fill="#fdf3e3"/>
            <rect x="9" y="16" width="14" height="3" fill="#fdf3e3"/>
            <rect x="8" y="19" width="16" height="3" fill="#fdf3e3"/>
            <rect x="9" y="22" width="14" height="2" fill="#fdf3e3"/>
            <rect x="11" y="24" width="10" height="1" fill="#fdf3e3"/>
            <!-- 鼻子（黑） -->
            <rect x="13" y="15" width="6" height="3" fill="#3b2a1a"/>
            <!-- 嘴（黑） -->
            <rect x="15" y="18" width="2" height="2" fill="#3b2a1a"/>
            <rect x="12" y="20" width="8" height="1" fill="#3b2a1a"/>
            <!-- 腮红（粉，可爱） -->
            <rect x="7" y="14" width="2" height="2" fill="#ffb3a7" opacity="0.85"/>
            <rect x="23" y="14" width="2" height="2" fill="#ffb3a7" opacity="0.85"/>
          </svg>
        </div>
        <div v-if="showSecondaryNav" class="flex-1 min-w-0">
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
          <!-- 添加任务（第一列第一个）：动作按钮，非导航项，不保持选中态 -->
          <button
            class="w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150 icon-btn"
            style="background-color: transparent"
            title="添加任务"
            @click="handleAddTask"
          >
            <AppIcon name="add" :size="20" color="var(--text-secondary)" />
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
          <!-- 搜索（四象限下）：进入搜索视图，可搜所有已完成/未完成 -->
          <button
            class="w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150"
            :style="{ backgroundColor: isSearchView ? 'var(--color-accent-light)' : 'transparent' }"
            title="搜索"
            @click="openSearch"
          >
            <AppIcon name="search" :size="20" :color="isSearchView ? 'var(--color-accent)' : 'var(--text-secondary)'" />
          </button>
        </nav>

        <!-- 中列（二级）：今天 / 最近7天 / 收集箱（仅任务列表视图显示，日历/四象限/搜索时隐藏） -->
        <nav v-if="showSecondaryNav" class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
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
          <span v-if="showSecondaryNav">设置</span>
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

// 是否搜索视图（/?view=search）
const isSearchView = computed(() => route.path === '/' && route.query.view === 'search')

// 中列是否显示：仅任务列表类视图（收集箱/今天/最近7天）；日历/四象限/搜索/设置时隐藏，左侧收窄为图标列
const showSecondaryNav = computed(() => {
  if (route.path !== '/') return false
  const view = route.query.view as string | undefined
  return view !== 'search'
})

// 打开搜索视图：中列隐藏，内容页顶部显示搜索框，可搜所有已完成/未完成
function openSearch() {
  router.push('/?view=search')
  nextTick(() => {
    window.dispatchEvent(new CustomEvent('tinydo-focus-search'))
  })
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

onMounted(() => {
  todoStore.fetchTodos()
  // 恢复上次搜索状态
  const saved = sessionStorage.getItem('todo-search-query')
  if (saved && saved !== searchQuery.value) {
    searchQuery.value = saved
  }
})
</script>
