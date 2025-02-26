<template>
  <div class="min-h-screen bg-base-100">
    <!-- 导航栏 -->
    <nav class="navbar bg-base-200 mb-4">
      <div class="container mx-auto">
        <div class="flex-1">
          <router-link
            to="/"
            class="btn btn-ghost text-xl"
          >
            Todo App
          </router-link>
        </div>
        <div class="flex-none">
          <ul class="menu menu-horizontal px-1">
            <li>
              <router-link
                to="/"
                class="link"
                :class="{ 'link-primary': route.path === '/' }"
              >
                待办事项
              </router-link>
            </li>
            <li>
              <router-link
                to="/completed"
                class="link"
                :class="{ 'link-primary': route.path === '/completed' }"
              >
                已完成
              </router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- 主要内容区域 -->
    <main class="container mx-auto px-4">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
