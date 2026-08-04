/**
 * 全局右键快捷菜单状态（模块级响应式，各视图共享）
 */
import { reactive } from 'vue'

export interface ContextMenuItem {
  label: string
  icon: string
  danger?: boolean
  handler: () => void
}

export const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  items: [] as ContextMenuItem[],
})

export function showContextMenu(e: MouseEvent, items: ContextMenuItem[]) {
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.items = items
  contextMenu.visible = true
}

export function hideContextMenu() {
  contextMenu.visible = false
}
