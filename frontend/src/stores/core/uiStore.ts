import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BardTabId, ChampionRole } from '@/types'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'

// Der Typ wohnt in types/ui.ts, damit die Badge-Registry ihn nennen kann, ohne
// an den Store zu ziehen. Re-Export, weil drei Stellen ihn von hier importieren.
export type { BardTabId }

export const useUiStore = defineStore('ui', () => {
  const bardActiveTab = ref<BardTabId | null>(null)
  const rolesActiveSlot = ref(0)
  const rolesActiveSubSlot = ref(-1)
  const rolesOpenToken = ref(0)
  // true while a requestOpenRolesTab call has not been consumed yet — lets the
  // team tab apply the request on mount (the token watcher registers too late
  // when the tab is opened by the request itself)
  const rolesOpenPending = ref(false)
  // true while the team tab was entered from the battle landing's roster
  const battleTabReturnPending = ref(false)
  const planetActiveSlotId = ref<string | null>(null)
  // Rolle, deren Details-Panel im Team-Tab gerade offen ist (null = Sigil füllt
  // den Tab, keine Auswahl). Gegenstück zu planetActiveSlotId: das Command Panel
  // markiert damit dieselbe Rollenkarte, die im Modal bearbeitet wird.
  const teamActiveRoleIndex = ref<number | null>(null)
  const pendingChampionSearch = ref('')
  const hoveredChampionRole = ref<ChampionRole | null>(null)
  // Stern-ID des laufenden Kampfs, wenn der Team-Tab aus dem StarFight-Modal
  // heraus geöffnet wurde — solange gesetzt (und der Stern lebt), zeigt das
  // Profil-Modal einen "Return to Battle"-Button für den Rücksprung
  const battleReturnStarId = ref<string | null>(null)
  const hoveredChampionSlotIndex = ref<number | null>(null)
  const hoveredPlanetSlotId = ref<string | null>(null)
  // Controls-Panel (Übersicht aller Tastenkürzel). Liegt hier statt in der
  // Komponente, weil es aus zwei Richtungen geöffnet wird: über das Kürzel
  // selbst und über die Keycap-Leiste am unteren Bildrand.
  const isControlsOpen = ref(false)

  /**
   * Rollen- und Planeten-Hover markieren dieselbe Karte bzw. Kachel im Command
   * Panel und werden von mehreren Ansichten gesetzt (Battle-Roster, Sigil-Board,
   * Planet-Leiste, Panel selbst). Die Tabs werden per v-show nur versteckt, nie
   * unmountet — ohne dieses Aufräumen bliebe die Markierung nach einem
   * Tab-Wechsel stehen, weil das mouseleave des verdeckten Elements nie kommt.
   * Ein Ort dafür, statt in jeder Ansicht.
   */
  function clearHoverMarks() {
    hoveredChampionSlotIndex.value = null
    hoveredPlanetSlotId.value = null
  }

  function openBardModal() {
    bardActiveTab.value = bardActiveTab.value !== null ? null : 'shop'
    clearHoverMarks()
  }

  function setBardTab(id: BardTabId) {
    // Dasselbe Tor wie die Reiterleiste, und zwar hier, weil auch Kopfzeilen-
    // Marken, Tastenkürzel und das Admin-Panel hier hereinkommen.
    if (id === 'expedition' && !useExpeditionChartStore().isUnlocked) return
    bardActiveTab.value = id
    // navigating by hand ends the offer to jump back to the battle tab
    battleTabReturnPending.value = false
    clearHoverMarks()
  }

  function closeBardModal() {
    bardActiveTab.value = null
    battleTabReturnPending.value = false
    clearHoverMarks()
  }

  /** Set while the team tab was opened from the battle landing's empty role
   *  slots — the team tab then offers a one-click way back. */
  function requestRoleFillFromBattle(slotIndex: number) {
    requestOpenRolesTab(slotIndex)
    battleTabReturnPending.value = true
  }

  function returnToBattleTab() {
    battleTabReturnPending.value = false
    bardActiveTab.value = 'battle'
    clearHoverMarks()
  }

  function requestOpenRolesTab(slotIndex: number, subSlot: number = -1) {
    rolesActiveSlot.value = slotIndex
    rolesActiveSubSlot.value = subSlot
    rolesOpenToken.value++
    rolesOpenPending.value = true
    bardActiveTab.value = 'team'
    // the card that was clicked is about to be hidden, so its mouseleave never
    // fires — the team tab's own selection takes the mark from here
    clearHoverMarks()
  }

  function clearRolesOpenPending() {
    rolesOpenPending.value = false
  }

  function requestOpenPlanetsTab(slotId: string) {
    planetActiveSlotId.value = slotId
    bardActiveTab.value = 'planets'
    clearHoverMarks()
  }

  // Der Planet-Tab schreibt seine Auswahl hierher zurück, damit dieselbe Kachel
  // im Command Panel mitmarkiert werden kann — eine Quelle für beide Ansichten.
  function setPlanetActiveSlot(slotId: string) {
    planetActiveSlotId.value = slotId
  }

  function setRolesActiveSlot(index: number) {
    rolesActiveSlot.value = index
  }

  // Der Team-Tab schreibt seine Rollen-Auswahl hierher zurück, damit dieselbe
  // Karte im Command Panel mitmarkiert werden kann — eine Quelle für beide
  // Ansichten (analog zu setPlanetActiveSlot).
  function setTeamActiveRole(index: number | null) {
    teamActiveRoleIndex.value = index
  }

  function requestOpenTeamTabWithSearch(name: string) {
    pendingChampionSearch.value = name
    bardActiveTab.value = 'team'
  }

  function clearPendingChampionSearch() {
    pendingChampionSearch.value = ''
  }

  function setBattleReturn(starId: string) {
    battleReturnStarId.value = starId
  }

  function clearBattleReturn() {
    battleReturnStarId.value = null
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

  function toggleControls() {
    isControlsOpen.value = !isControlsOpen.value
  }

  function closeControls() {
    isControlsOpen.value = false
  }

  return {
    bardActiveTab,
    rolesActiveSlot,
    rolesActiveSubSlot,
    rolesOpenToken,
    rolesOpenPending,
    battleTabReturnPending,
    planetActiveSlotId,
    teamActiveRoleIndex,
    pendingChampionSearch,
    battleReturnStarId,
    setBattleReturn,
    clearBattleReturn,
    hoveredChampionRole,
    hoveredChampionSlotIndex,
    hoveredPlanetSlotId,
    openBardModal,
    setBardTab,
    closeBardModal,
    requestOpenRolesTab,
    requestRoleFillFromBattle,
    returnToBattleTab,
    clearRolesOpenPending,
    requestOpenPlanetsTab,
    setPlanetActiveSlot,
    setRolesActiveSlot,
    setTeamActiveRole,
    requestOpenTeamTabWithSearch,
    clearPendingChampionSearch,
    setHoveredChampionRole,
    setHoveredChampionSlotIndex,
    setHoveredPlanetSlotId,
    isControlsOpen,
    toggleControls,
    closeControls,
  }
})
