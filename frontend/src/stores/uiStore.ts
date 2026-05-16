import { defineStore } from 'pinia'
import { ref } from 'vue'

export type BardTabId = 'bard' | 'shop' | 'tree' | 'team' | 'kampf' | 'admin' | 'planets' | 'roles'

export const useUiStore = defineStore('ui', () => {
  const bardActiveTab = ref<BardTabId | null>(null)
  const rolesActiveSlot = ref(0)
  const planetActiveSlotId = ref<string | null>(null)

  function openBardModal() {
    bardActiveTab.value = bardActiveTab.value !== null ? null : 'shop'
  }

  function setBardTab(id: BardTabId) {
    bardActiveTab.value = id
  }

  function closeBardModal() {
    bardActiveTab.value = null
  }

  function requestOpenRolesTab(slotIndex: number) {
    rolesActiveSlot.value = slotIndex
    bardActiveTab.value = 'roles'
  }

  function requestOpenPlanetsTab(slotId: string) {
    planetActiveSlotId.value = slotId
    bardActiveTab.value = 'planets'
  }

  return {
    bardActiveTab,
    rolesActiveSlot,
    planetActiveSlotId,
    openBardModal,
    setBardTab,
    closeBardModal,
    requestOpenRolesTab,
    requestOpenPlanetsTab,
  }
})
