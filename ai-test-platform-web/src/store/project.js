import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useProjectStore = defineStore('project', () => {
  const selectedProjectId = ref(localStorage.getItem('selectedProjectId') || '')
  const projects = ref([])

  const setProjects = (list = []) => {
    projects.value = list
    if (selectedProjectId.value && !list.some((item) => item.id === selectedProjectId.value)) {
      setSelectedProjectId('')
    }
  }

  const setSelectedProjectId = (projectId) => {
    selectedProjectId.value = projectId || ''
    localStorage.setItem('selectedProjectId', selectedProjectId.value)
  }

  const selectedProject = computed(() => projects.value.find((item) => item.id === selectedProjectId.value) || null)

  return {
    selectedProjectId,
    selectedProject,
    projects,
    setProjects,
    setSelectedProjectId
  }
})
