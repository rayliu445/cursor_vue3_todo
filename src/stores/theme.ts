import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'todo-app-theme'

// ============ 响应式状态 ============

const _mode = ref<ThemeMode>(loadTheme())
const _systemDark = ref(false)

// ============ 计算属性 ============

/** 当前实际应用的主题（light/dark，不返回 system） */
export const effectiveTheme = computed(() => {
  if (_mode.value === 'system') {
    return _systemDark.value ? 'dark' : 'light'
  }
  return _mode.value
})

/** 当前模式设置 */
export const themeMode = computed(() => _mode.value)

// ============ 方法 ============

/** 设置主题模式 */
export function setThemeMode(mode: ThemeMode) {
  _mode.value = mode
  saveTheme(mode)
  applyTheme()
}

/** 切换 light/dark（system 模式切到相反值） */
export function toggleTheme() {
  if (_mode.value === 'system') {
    setThemeMode(_systemDark.value ? 'light' : 'dark')
  } else {
    setThemeMode(_mode.value === 'light' ? 'dark' : 'light')
  }
}

// ============ 内部逻辑 ============

function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {}
  return 'system'
}

function saveTheme(mode: ThemeMode) {
  try { localStorage.setItem(THEME_KEY, mode) } catch {}
}

function applyTheme() {
  const theme = effectiveTheme.value
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
}

function updateSystemDark() {
  _systemDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (_mode.value === 'system') applyTheme()
}

/** 初始化主题系统 */
export function initTheme() {
  applyTheme()
  updateSystemDark()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateSystemDark)

  // 监听 mode 变化自动应用
  watch(_mode, applyTheme)
}
