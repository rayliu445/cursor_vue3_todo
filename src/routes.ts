import HomePage from './views/HomePage.vue'

export const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('./views/CalendarView.vue'),
  },
  {
    path: '/matrix',
    name: 'matrix',
    component: () => import('./views/MatrixView.vue'),
  },
  {
    path: '/completed',
    name: 'completed',
    component: () => import('./views/CompletedTodos.vue'),
  },
  {
    path: '/notes',
    name: 'notes',
    component: () => import('./views/NotesView.vue'),
  },
  {
    path: '/import',
    name: 'import',
    component: () => import('./views/ImportView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./views/SettingsView.vue'),
  },
]
