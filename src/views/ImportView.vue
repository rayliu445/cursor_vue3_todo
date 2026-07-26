<template>
  <div class="py-6 max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">导入滴答清单数据</h1>

    <!-- 文件选择区 -->
    <div
      v-if="!importStore.previewItems.length"
      class="border-2 border-dashed border-base-300 rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer"
      @click="triggerFileInput"
      @dragover.prevent
      @drop.prevent="handleFileDrop"
    >
      <div class="flex flex-col items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <div>
          <p class="font-medium">点击选择文件或拖拽文件到此区域</p>
          <p class="text-sm text-base-content/50 mt-1">支持 TickTick 导出的 CSV 或 JSON 格式</p>
        </div>
        <div class="flex gap-3 text-xs text-base-content/40">
          <span>📄 CSV 文件</span>
          <span>📦 JSON 备份</span>
        </div>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".csv,.json"
        class="hidden"
        @change="handleFileSelect"
      />
    </div>

    <!-- 解析中 -->
    <div v-if="importStore.isParsing" class="text-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-3 text-base-content/60">正在解析文件...</p>
    </div>

    <!-- 解析错误 -->
    <div v-if="importStore.parseError" class="alert alert-error mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <div>
        <p class="font-medium">解析错误</p>
        <p class="text-sm">{{ importStore.parseError }}</p>
      </div>
      <button class="btn btn-sm" @click="importStore.reset()">重新选择</button>
    </div>

    <!-- 预览表格 -->
    <div v-if="importStore.previewItems.length > 0 && !importStore.isParsing">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="font-medium">
            已解析 {{ importStore.previewItems.length }} 条任务
          </p>
          <p class="text-sm text-base-content/50">请确认导入内容，检查字段映射是否正确</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" @click="importStore.reset()">取消</button>
          <button
            class="btn btn-primary btn-sm"
            :disabled="isImporting"
            @click="handleImport"
          >
            {{ isImporting ? '导入中...' : '确认导入' }}
          </button>
        </div>
      </div>

      <!-- 导入结果 -->
      <div v-if="importResult" class="alert alert-success mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>导入成功！共导入 {{ importResult.success }}/{{ importResult.total }} 条任务</span>
      </div>

      <!-- 预览列表 -->
      <div class="overflow-x-auto border border-base-300 rounded-lg">
        <table class="table table-zebra table-sm">
          <thead>
            <tr>
              <th>标题</th>
              <th>优先级</th>
              <th>截止日期</th>
              <th>清单</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in importStore.previewItems.slice(0, 100)" :key="index">
              <td class="max-w-[200px] truncate">{{ item.title }}</td>
              <td>
                <span
                  class="badge badge-xs"
                  :class="{
                    'badge-error': item.priority === 5,
                    'badge-warning': item.priority === 3,
                    'badge-info': item.priority === 1,
                  }"
                >
                  {{ item.priority === 5 ? '高' : item.priority === 3 ? '中' : item.priority === 1 ? '低' : '无' }}
                </span>
              </td>
              <td class="text-sm">{{ item.dueDate ? item.dueDate.slice(0, 10) : '-' }}</td>
              <td class="text-sm">{{ item.list || '-' }}</td>
              <td>
                <span class="badge badge-xs" :class="item.completed ? 'badge-success' : 'badge-ghost'">
                  {{ item.completed ? '已完成' : '未完成' }}
                </span>
              </td>
            </tr>
            <tr v-if="importStore.previewItems.length > 100">
              <td colspan="5" class="text-center text-sm text-base-content/50">
                ... 还有 {{ importStore.previewItems.length - 100 }} 条记录
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 格式说明 -->
    <div v-if="!importStore.previewItems.length" class="mt-8 card bg-base-200">
      <div class="card-body p-4">
        <h3 class="font-medium text-sm">如何从滴答清单导出数据</h3>
        <ol class="text-sm text-base-content/70 space-y-1 mt-2 list-decimal list-inside">
          <li>打开滴答清单应用</li>
          <li>进入「设置」→「数据导出」</li>
          <li>选择导出格式：CSV 或 JSON</li>
          <li>将导出的文件拖拽到上方区域即可导入</li>
        </ol>
        <div class="divider my-2"></div>
        <h3 class="font-medium text-sm">支持的字段</h3>
        <div class="text-sm text-base-content/70 mt-1">
          <p>标题、内容、优先级、截止日期、开始日期、完成状态、标签、清单、创建时间</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useImportStore, type ImportResult } from '../stores/import'

const importStore = useImportStore()
const fileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const importResult = ref<ImportResult | null>(null)

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    importResult.value = null
    await importStore.parseFile(file)
  }
}

async function handleFileDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    importResult.value = null
    await importStore.parseFile(file)
  }
}

async function handleImport() {
  isImporting.value = true
  try {
    importResult.value = await importStore.executeImport()
  } finally {
    isImporting.value = false
  }
}
</script>
