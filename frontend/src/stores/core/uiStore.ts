import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ArrivalNotice,
  BardTabId,
  ChampionRole,
  FirmamentDive,
  FirmamentDiveRequest,
} from '@/types'

// Der Typ wohnt in types/ui.ts, damit die Badge-Registry ihn nennen kann, ohne
// an den Store zu ziehen. Re-Export, weil drei Stellen ihn von hier importieren.
export type { BardTabId }

export const useUiStore = defineStore('ui', () => {
  const bardActiveTab = ref<BardTabId | null>(null)
  /**
   * Solange der Galaxien-Warp läuft, bleibt das Profil zu. Der Warp fährt auf
   * der Hintergrundschleife, und die steht, sobald ein Bard-Tab offen ist —
   * das Schiff hinge mitten im Flug fest, während die Minimap-Uhr weiterläuft.
   * Gesetzt vom galaxyStore mit `setGalaxyTransitioning`.
   */
  const bardModalLocked = ref(false)
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
  // Die laufende Kamerafahrt zwischen Firmament und Atlas. Liegt HIER, damit
  // ein Escape oder Reiterwechsel sie abraeumt — sonst schaltete ihr Timer
  // 380 ms spaeter ein geschlossenes Profil wieder auf.
  const firmamentDive = ref<FirmamentDive | null>(null)
  // Was der Aufbruch hinterlaesst, bis der Herold es ansagen kann. Es liegt
  // HIER und nicht im gameStore, weil dieser Store nicht persistiert wird: ein
  // Reload kann damit keinen Sprung feiern, der lange vorbei ist — derselbe
  // Fall, gegen den HERALD_ARM_DELAY_MS mit einer Frist arbeitet.
  const pendingArrival = ref<ArrivalNotice | null>(null)
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

  function setBardModalLocked(locked: boolean) {
    bardModalLocked.value = locked
  }

  function openBardModal() {
    if (bardModalLocked.value && bardActiveTab.value === null) return
    // 'bard' und nicht 'shop': seit Laden und Sternbaum getrennte Reiter sind,
    // waere 'shop' eine Zusage auf einen bestimmten Inhalt. Journey ist der
    // Heimatreiter und traegt als einziger keinen zielabhaengigen Zustand.
    bardActiveTab.value = bardActiveTab.value !== null ? null : 'bard'
    // Zugeklappt endet auch hier das Rueckweg-Angebot — sonst stuende die Pille
    // nach Profil-zu-und-wieder-auf weiter da.
    if (bardActiveTab.value === null) {
      firmamentTabReturnPending.value = false
      firmamentDive.value = null
    }
    clearHoverMarks()
  }

  function setBardTab(id: BardTabId) {
    // Nur das AUFKLAPPEN ist gesperrt — ein Reiterwechsel im offenen Profil
    // (Admin-Wege) bleibt frei.
    if (bardModalLocked.value && bardActiveTab.value === null) return
    bardActiveTab.value = id
    // navigating by hand ends the offer to jump back to the battle tab
    battleTabReturnPending.value = false
    firmamentTabReturnPending.value = false
    firmamentDive.value = null
    clearHoverMarks()
  }

  function closeBardModal() {
    bardActiveTab.value = null
    battleTabReturnPending.value = false
    firmamentTabReturnPending.value = false
    firmamentDive.value = null
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

  /** Die Kamerafahrt beginnt. Den Reiter schaltet der Schleier selbst, wenn er
   *  deckt — ueber `requestOpenVoyagesFromFirmament` bzw. `returnToFirmamentTab`. */
  function requestFirmamentDive(req: FirmamentDiveRequest) {
    firmamentDive.value = { ...req, phase: 'out' }
  }

  /** Der Zielreiter meldet den echten Fahrtpunkt nach — beim Rueckweg kennt
   *  erst das sichtbare Firmament die Knotenmitte. */
  function anchorFirmamentDive(x: number, y: number) {
    if (firmamentDive.value) firmamentDive.value = { ...firmamentDive.value, x, y }
  }

  /** Die Zielplatte steht — der Schleier darf fallen. */
  function settleFirmamentDive() {
    if (firmamentDive.value) firmamentDive.value = { ...firmamentDive.value, phase: 'in' }
  }

  function clearFirmamentDive() {
    firmamentDive.value = null
  }

  /**
   * Der Aufbruch ist vollzogen — die Ankunft darf angesagt werden.
   *
   * Gesetzt in `executePrestigeReset`, weil dort und nur dort der Ertrag des
   * beendeten Durchlaufs noch bekannt ist: `pendingMeeps` haengt an
   * `chimesForNextUniverse`, und das steht eine Zeile spaeter auf null.
   */
  function noteArrival(universe: number, meeps: number) {
    pendingArrival.value = { universe, meeps }
  }

  function clearPendingArrival() {
    pendingArrival.value = null
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
    bardModalLocked,
    setBardModalLocked,
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
    pendingArrival,
    noteArrival,
    clearPendingArrival,
    requestOpenVoyagesFromFirmament,
    returnToFirmamentTab,
    clearPendingFirmamentGalaxy,
    firmamentDive,
    requestFirmamentDive,
    anchorFirmamentDive,
    settleFirmamentDive,
    clearFirmamentDive,
    requestOpenFirmamentDeparture,
    setHoveredChampionRole,
    setHoveredChampionSlotIndex,
    setHoveredPlanetSlotId,
    isControlsOpen,
    toggleControls,
    closeControls,
  }
})
