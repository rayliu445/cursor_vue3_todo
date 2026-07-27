<template>
  <div class="text-sm space-y-3">
    <!-- 分类模式切换 -->
    <div>
      <span class="text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">分类模式</span>
      <div class="flex gap-2 mt-1">
        <button
          class="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-150"
          :style="getModeBtnStyle('priority')"
          @click="$emit('update:ruleMode', 'priority')"
        >
          纯优先级
        </button>
        <button
          class="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-150"
          :style="getModeBtnStyle('time-priority')"
          @click="$emit('update:ruleMode', 'time-priority')"
        >
          时间+优先级
        </button>
      </div>
    </div>

    <!-- 紧急时间范围（自定义按钮组替代原生 select） -->
    <div v-if="ruleMode === 'time-priority'">
      <span class="text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">紧急时间范围</span>
      <div class="flex gap-1 mt-1">
        <button
          v-for="opt in urgentOptions"
          :key="opt.value"
          class="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-150"
          :style="getUrgentBtnStyle(opt.value)"
          @click="$emit('update:urgentDays', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- 规则说明（带示例） -->
    <div
      class="rounded-lg px-3 py-2 text-xs leading-relaxed space-y-0.5"
      :style="{ backgroundColor: 'var(--color-accent-light)', color: 'var(--text-secondary)' }"
    >
      <template v-if="ruleMode === 'priority'">
        <div class="font-medium mb-1" :style="{ color: 'var(--text-primary)' }">按优先级自动归类</div>
        <div class="flex items-center gap-1.5">
          <span class="priority-dot high" style="width:6px;height:6px;display:inline-block"></span>
          高优先级 → <strong>重要且紧急</strong>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="priority-dot medium" style="width:6px;height:6px;display:inline-block"></span>
          中优先级 → <strong>重要不紧急</strong>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="priority-dot low" style="width:6px;height:6px;display:inline-block"></span>
          低优先级 → <strong>紧急不重要</strong>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="priority-dot none" style="width:6px;height:6px;display:inline-block"></span>
          无优先级 → <strong>不重要不紧急</strong>
        </div>
      </template>
      <template v-else>
        <div class="font-medium mb-1" :style="{ color: 'var(--text-primary)' }">按优先级 + 截止日期归类</div>
        <div class="flex items-center gap-1.5">
          <span class="priority-dot high" style="width:6px;height:6px;display:inline-block"></span>
          重要（高/中优先级）且 紧急（截止日期在范围内）→ <strong>重要且紧急</strong>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="priority-dot medium" style="width:6px;height:6px;display:inline-block"></span>
          重要 但 不紧急 → <strong>重要不紧急</strong>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="priority-dot low" style="width:6px;height:6px;display:inline-block"></span>
          不重要 但 紧急 → <strong>紧急不重要</strong>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="priority-dot none" style="width:6px;height:6px;display:inline-block"></span>
          不重要 且 不紧急 → <strong>不重要不紧急</strong>
        </div>
        <div class="mt-1.5 pt-1.5 border-t" :style="{ borderColor: 'var(--border-color)' }">
          示例：截止日期<strong>3天</strong>内 + <strong>高优先级</strong> → 重要且紧急
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MatrixRuleMode } from '../../stores/matrix'

const props = defineProps<{
  ruleMode: MatrixRuleMode
  urgentDays: number
}>()

const urgentOptions = [
  { value: 0, label: '今天' },
  { value: 1, label: '1天' },
  { value: 3, label: '3天' },
  { value: 7, label: '7天' },
]

function getModeBtnStyle(mode: MatrixRuleMode) {
  const isActive = props.ruleMode === mode
  return {
    backgroundColor: isActive ? 'var(--color-accent-light)' : 'var(--bg-hover)',
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: isActive ? '600' : '400',
  }
}

function getUrgentBtnStyle(value: number) {
  const isActive = props.urgentDays === value
  return {
    backgroundColor: isActive ? 'var(--color-accent-mid)' : 'var(--bg-hover)',
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: isActive ? '600' : '400',
  }
}
</script>
