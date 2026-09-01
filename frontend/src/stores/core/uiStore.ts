import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BardTabId, ChampionRole } from '@/types'

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
  // Sprungziel des Voyages-Atlas, gesetzt von ausserhalb des Reiters (Minimap).
  // Wird EINMAL verbraucht — der Reiter bleibt gemountet, ein stehender Wert
  // spränge bei jedem weiteren Besuch erneut.
  const pendingVoyageTarget = ref<{ galaxy: number; pinKey: string | null } | null>(null)
  // true, solange der Voyages-Reiter aus dem Firmament heraus betreten wurde
  const firmamentTabReturnPending = ref(false)
  // Galaxie, auf die das Firmament beim Zurueckkommen zeigt — es raeumt seine
  // eigene Auswahl beim Verlassen ab, ohne diesen Zeiger kaeme man auf eine
  // leere Bahn zurueck. Nur die NUMMER: auf welcher Bahn sie liegt, steht im
  // Archiv, und dorthin greift der uiStore nicht.
  const pendingFirmamentGalaxy = ref<number | null>(null)
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
    // 'bard' und nicht 'shop': seit Laden und Sternbaum getrennte Reiter sind,
    // waere 'shop' eine Zusage auf einen bestimmten Inhalt. Journey ist der
    // Heimatreiter und traegt als einziger keinen zielabhaengigen Zustand.
    bardActiveTab.value = bardActiveTab.value !== null ? null : 'bard'
    // Zugeklappt endet auch hier das Rueckweg-Angebot — sonst stuende die Pille
    // nach Profil-zu-und-wieder-auf weiter da.
    if (bardActiveTab.value === null) firmamentTabReturnPending.value = false
    clearHoverMarks()
  }

  function setBardTab(id: BardTabId) {
    bardActiveTab.value = id
    // navigating by hand ends the offer to jump back to the battle tab
    battleTabReturnPending.value = false
    firmamentTabReturnPending.value = false
    clearHoverMarks()
  }

  function closeBardModal() {
    bardActiveTab.value = null
    battleTabReturnPending.value = false
    firmamentTabReturnPending.value = false
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

  function requestOpenShopTabWithSearch(name: string) {
    pendingChampionSearch.value = name
    bardActiveTab.value = 'shop'
  }

  function clearPendingChampionSearch() {
    pendingChampionSearch.value = ''
  }

  /** Reiter auf UND scharfstellen — `openBardModal()` bleibt aussen vor, es
   *  TOGGELT und schlösse ein bereits offenes Profil. */
  function requestOpenVoyagesTab(galaxy: number, pinKey: string | null = null) {
    pendingVoyageTarget.value = { galaxy, pinKey }
    bardActiveTab.value = 'expedition'
    clearHoverMarks()
  }

  function clearPendingVoyageTarget() {
    pendingVoyageTarget.value = null
  }

  /** Der Sprung von der Firmament-Bahn auf die Karte. Setzt NUR die Flagge dazu
   *  — das Sprungziel besorgt derselbe Weg, den die Minimap schon geht. */
  function requestOpenVoyagesFromFirmament(galaxy: number) {
    requestOpenVoyagesTab(galaxy)
    firmamentTabReturnPending.value = true
  }

  /** Der Rueckweg. `galaxy` ist die GERADE im Atlas gewaehlte, nicht die, mit
   *  der man kam: wer dort weitergeklickt hat, soll im Firmament dort stehen. */
  function returnToFirmamentTab(galaxy: number | null) {
    firmamentTabReturnPending.value = false
    pendingFirmamentGalaxy.value = galaxy
    bardActiveTab.value = 'firmament'
    clearHoverMarks()
  }

  function clearPendingFirmamentGalaxy() {
    pendingFirmamentGalaxy.value = null
  }

  /**
   * Der Weg vom Prestige-Knopf im Header ins Firmament — dorthin, wo der
   * Aufbruch als BILD steht.
   *
   * Kein `openBardModal()`: das TOGGELT und schloesse ein bereits offenes
   * Profil. Und keine Auswahl mitzugeben ist Absicht — der Reiter steht beim
   * Betreten ohnehin auf der laufenden Bahn, und genau dort haengen die drei
   * Portale.
   */
  function requestOpenFirmamentDeparture() {
    bardActiveTab.value = 'firmament'
    clearHoverMarks()
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
    requestOpenShopTabWithSearch,
    clearPendingChampionSearch,
    pendingVoyageTarget,
    requestOpenVoyagesTab,
    clearPendingVoyageTarget,
    firmamentTabReturnPending,
    pendingFirmamentGalaxy,
    requestOpenVoyagesFromFirmament,
    returnToFirmamentTab,
    clearPendingFirmamentGalaxy,
    requestOpenFirmamentDeparture,
    setHoveredChampionRole,
    setHoveredChampionSlotIndex,
    setHoveredPlanetSlotId,
    isControlsOpen,
    toggleControls,
    closeControls,
  }
})
