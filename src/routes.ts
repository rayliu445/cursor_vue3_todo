import HomePage from './views/HomePage.vue'
// import About from './views/About.vue'
// import NotFound from './views/NotFound.vue'

export const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/completed',
    name: 'completed',
    component: () => import('./views/CompletedTodos.vue'),
  },
]
