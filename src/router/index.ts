import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/views/CalendarView.vue'),
    },
    {
      path: '/matrix',
      name: 'matrix',
      component: () => import('@/views/MatrixView.vue'),
    },
    {
      path: '/completed',
      name: 'completed',
      component: () => import('@/views/CompletedTodos.vue'),
    },
    {
      path: '/import',
      name: 'import',
      component: () => import('@/views/ImportView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
})

export default router
