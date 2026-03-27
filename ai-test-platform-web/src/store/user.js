import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    token.value = res.data.access_token
    userInfo.value = res.data.user
    localStorage.setItem('token', token.value)
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    return res.data
  }

  const logout = () => {
    token.value = ''
    userInfo.value = {}
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return { token, userInfo, login, logout }
})
