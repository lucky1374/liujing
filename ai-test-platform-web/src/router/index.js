import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue')
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('../views/Projects.vue')
      },
      {
        path: 'test-cases',
        name: 'TestCases',
        component: () => import('../views/TestCases.vue')
      },
      {
        path: 'test-scripts',
        name: 'TestScripts',
        component: () => import('../views/TestScripts.vue')
      },
      {
        path: 'test-tasks',
        name: 'TestTasks',
        component: () => import('../views/TestTasks.vue')
      },
      {
        path: 'test-data',
        name: 'TestData',
        component: () => import('../views/TestData.vue')
      },
      {
        path: 'defects',
        name: 'Defects',
        component: () => import('../views/Defects.vue')
      },
      {
        path: 'test-reports',
        name: 'TestReports',
        component: () => import('../views/TestReports.vue')
      },
      {
        path: 'environments',
        name: 'Environments',
        component: () => import('../views/Environments.vue')
      },
      {
        path: 'troubleshooting-guide',
        name: 'TroubleshootingGuide',
        component: () => import('../views/TroubleshootingGuide.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (!userStore.token && to.path !== '/login') {
    next('/login')
  } else {
    next()
  }
})

export default router
