import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/completed',
      name: 'completed',
      // 路由懒加载示例
      component: () => import('@/views/CompletedTodos.vue'),
    },
  ],
})

export default router
