<template>
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body p-4">
      <h3 class="card-title text-sm">矩阵规则配置</h3>

      <!-- 分类模式 -->
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text text-sm">纯优先级模式</span>
          <input
            type="radio"
            name="ruleMode"
            class="radio radio-primary radio-sm"
            :checked="ruleMode === 'priority'"
            @change="$emit('update:ruleMode', 'priority')"
          />
        </label>
        <label class="label cursor-pointer">
          <span class="label-text text-sm">时间 + 优先级模式</span>
          <input
            type="radio"
            name="ruleMode"
            class="radio radio-primary radio-sm"
            :checked="ruleMode === 'time-priority'"
            @change="$emit('update:ruleMode', 'time-priority')"
          />
        </label>
      </div>

      <!-- 紧急时间范围（time-priority 模式） -->
      <div v-if="ruleMode === 'time-priority'" class="form-control">
        <label class="label">
          <span class="label-text text-sm">紧急时间范围</span>
        </label>
        <select
          class="select select-bordered select-sm"
          :value="urgentDays"
          @change="$emit('update:urgentDays', Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="0">今天内</option>
          <option :value="1">1天内</option>
          <option :value="3">3天内</option>
          <option :value="7">本周内（7天）</option>
        </select>
      </div>

      <!-- 规则说明 -->
      <div class="text-xs text-base-content/50 mt-2 space-y-1">
        <p v-if="ruleMode === 'priority'">
          <strong>高</strong>优先级 → 重要且紧急<br />
          <strong>中</strong>优先级 → 重要不紧急<br />
          <strong>低</strong>优先级 → 紧急不重要<br />
          <strong>无</strong>优先级 → 不重要不紧急
        </p>
        <p v-else>
          <strong>重要</strong> = 高/中优先级<br />
          <strong>紧急</strong> = 截止日期在设定范围内<br />
          可拖拽任务到其他象限手动调整
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MatrixRuleMode } from '../../stores/matrix'

defineProps<{
  ruleMode: MatrixRuleMode
  urgentDays: number
}>()

defineEmits<{
  (e: 'update:ruleMode', mode: MatrixRuleMode): void
  (e: 'update:urgentDays', days: number): void
}>()
</script>
