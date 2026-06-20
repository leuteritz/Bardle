import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChampionRole } from '../types'

export type BardTabId = 'bard' | 'shop' | 'tree' | 'team' | 'kampf' | 'admin' | 'planets'

export const useUiStore = defineStore('ui', () => {
  const bardActiveTab = ref<BardTabId | null>(null)
  const rolesActiveSlot = ref(0)
  const rolesActiveSubSlot = ref(-1)
  const rolesOpenToken = ref(0)
  const planetActiveSlotId = ref<string | null>(null)
  const pendingChampionSearch = ref('')
  const hoveredChampionRole = ref<ChampionRole | null>(null)
  const hoveredChampionSlotIndex = ref<number | null>(null)
  const hoveredPlanetSlotId = ref<string | null>(null)

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

  function setHoveredChampionRole(role: ChampionRole | null) {
    hoveredChampionRole.value = role
  }

  function setHoveredChampionSlotIndex(index: number | null) {
    hoveredChampionSlotIndex.value = index
  }

  function setHoveredPlanetSlotId(id: string | null) {
    hoveredPlanetSlotId.value = id
  }

  return {
    bardActiveTab,
    rolesActiveSlot,
    rolesActiveSubSlot,
    rolesOpenToken,
    planetActiveSlotId,
    pendingChampionSearch,
    hoveredChampionRole,
    hoveredChampionSlotIndex,
    hoveredPlanetSlotId,
    openBardModal,
    setBardTab,
    closeBardModal,
    requestOpenRolesTab,
    requestOpenPlanetsTab,
    setRolesActiveSlot,
    requestOpenTeamTabWithSearch,
    clearPendingChampionSearch,
    setHoveredChampionRole,
    setHoveredChampionSlotIndex,
    setHoveredPlanetSlotId,
  }
})
