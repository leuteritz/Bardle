import { defineStore } from 'pinia'
import { ref } from 'vue'

export type BardTabId = 'bard' | 'shop' | 'tree' | 'team' | 'kampf' | 'admin' | 'planets'

export const useUiStore = defineStore('ui', () => {
  const bardActiveTab = ref<BardTabId | null>(null)
  const rolesActiveSlot = ref(0)
  const rolesActiveSubSlot = ref(-1)
  const rolesOpenToken = ref(0)
  const planetActiveSlotId = ref<string | null>(null)
  const pendingChampionSearch = ref('')

  function openBardModal() {
    bardActiveTab.value = bardActiveTab.value !== null ? null : 'shop'
  }

  function setBardTab(id: BardTabId) {
    bardActiveTab.value = id
  }

  function closeBardModal() {
    bardActiveTab.value = null
  }

  function requestOpenRolesTab(slotIndex: number, subSlot: number = -1) {
    rolesActiveSlot.value = slotIndex
    rolesActiveSubSlot.value = subSlot
    rolesOpenToken.value++
    bardActiveTab.value = 'team'
  }

  function requestOpenPlanetsTab(slotId: string) {
    planetActiveSlotId.value = slotId
    bardActiveTab.value = 'planets'
  }

  function setRolesActiveSlot(index: number) {
    rolesActiveSlot.value = index
  }

  function requestOpenTeamTabWithSearch(name: string) {
    pendingChampionSearch.value = name
    bardActiveTab.value = 'team'
  }

  function clearPendingChampionSearch() {
    pendingChampionSearch.value = ''
  }

  return {
    bardActiveTab,
    rolesActiveSlot,
    rolesActiveSubSlot,
    rolesOpenToken,
    planetActiveSlotId,
    pendingChampionSearch,
    openBardModal,
    setBardTab,
    closeBardModal,
    requestOpenRolesTab,
    requestOpenPlanetsTab,
    setRolesActiveSlot,
    requestOpenTeamTabWithSearch,
    clearPendingChampionSearch,
  }
})
