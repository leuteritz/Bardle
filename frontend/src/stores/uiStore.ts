import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const pendingBardTab = ref<string | null>(null)
  const rolesActiveSlot = ref(0)

  function requestOpenRolesTab(slotIndex: number) {
    rolesActiveSlot.value = slotIndex
    pendingBardTab.value = 'roles'
  }

  function clearPendingBardTab() {
    pendingBardTab.value = null
  }

  return { pendingBardTab, rolesActiveSlot, requestOpenRolesTab, clearPendingBardTab }
})
