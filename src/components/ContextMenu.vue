<template>
  <Teleport to="body">
    <template v-if="contextMenu.visible">
      <!-- 遮罩：点击 / 右键任意处关闭 -->
      <div class="fixed inset-0 z-[900]" @click="hide" @contextmenu.prevent="hide" />
      <!-- 菜单 -->
      <div
        class="fixed z-[910] min-w-[170px] py-1 rounded-lg shadow-lg border"
        :style="{
          left: menuLeft + 'px',
          top: menuTop + 'px',
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }"
      >
        <button
          v-for="item in contextMenu.items"
          :key="item.label"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors duration-100"
          :style="{ color: item.danger ? '#e74c3c' : 'var(--text-primary)' }"
          @mouseenter="hoverBg = item.label"
          @mouseleave="hoverBg = ''"
          @click="run(item)"
        >
          <span
            class="w-4 flex-shrink-0 flex items-center justify-center"
            :style="{ color: item.danger ? '#e74c3c' : 'var(--text-tertiary)' }"
          >
            <AppIcon :name="item.icon" :size="15" />
          </span>
          <span
            class="flex-1 truncate rounded px-1 py-0.5 -mx-1"
            :style="{ backgroundColor: hoverBg === item.label ? 'var(--bg-hover)' : 'transparent' }"
          >
            {{ item.label }}
          </span>
        </button>
      </div>
    </template>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from './icons/AppIcon.vue'
import { contextMenu, hideContextMenu } from '../stores/context-menu'

const hoverBg = ref('')

// 贴近屏幕边缘时向左/向上收（菜单约 170x200）
const menuLeft = computed(() => Math.min(contextMenu.x, window.innerWidth - 190))
const menuTop = computed(() => Math.min(contextMenu.y, window.innerHeight - 220))

function hide() {
  hideContextMenu()
}

function run(item: { handler: () => void }) {
  hide()
  item.handler()
}
</script>
