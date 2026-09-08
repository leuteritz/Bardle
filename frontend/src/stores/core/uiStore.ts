import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ArrivalNotice,
  BardTabId,
  ChampionRole,
  UniverseDive,
  UniverseDiveRequest,
  UniverseHop,
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
  // Sprungziel des Galaxy-Atlas, gesetzt von ausserhalb des Reiters (Universe).
  // Wird EINMAL verbraucht — der Reiter bleibt gemountet, ein stehender Wert
  // spränge bei jedem weiteren Besuch erneut.
  const pendingGalaxyTarget = ref<{ galaxy: number; pinKey: string | null } | null>(null)
  // Dasselbe fuer die Live-Buehne: der Klick auf die Minimap meint die LAUFENDE
  // Galaxie, und die steht in keinem Archiv — sie hat deshalb keine Nummer im
  // Gepaeck, nur die Ansage. Schliesst sich mit pendingGalaxyTarget aus.
  const pendingGalaxyLive = ref(false)
  // true, solange der Galaxy-Reiter aus dem Universe heraus betreten wurde
  const universeTabReturnPending = ref(false)
  // Galaxie, auf die das Universe beim Zurueckkommen zeigt — es raeumt seine
  // eigene Auswahl beim Verlassen ab, ohne diesen Zeiger kaeme man auf eine
  // leere Bahn zurueck. Nur die NUMMER: auf welcher Bahn sie liegt, steht im
  // Archiv, und dorthin greift der uiStore nicht.
  const pendingUniverseGalaxy = ref<number | null>(null)
  // Die laufende Kamerafahrt zwischen Universe und Atlas. Liegt HIER, damit
  // ein Escape oder Reiterwechsel sie abraeumt — sonst schaltete ihr Timer
  // 380 ms spaeter ein geschlossenes Profil wieder auf.
  const universeDive = ref<UniverseDive | null>(null)
  // Der laufende Universumssprung. Anders als `universeDive` raeumt ihn kein
  // Reiterwechsel ab — das Profil schliesst mitten im Sprung, die Zeremonie
  // laeuft weiter. Abgeraeumt wird er von `gameStore.finishUniverseHop`.
  const universeHop = ref<UniverseHop | null>(null)
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
      universeTabReturnPending.value = false
      universeDive.value = null
    }
    clearHoverMarks()
  }

  function setBardTab(id: BardTabId) {
    // Nur das AUFKLAPPEN ist gesperrt — ein Reiterwechsel im offenen Profil
    // (Admin-Wege) bleibt frei.
    if (bardModalLocked.value && bardActiveTab.value === null) return
    if (id === 'galaxy') {
      pendingGalaxyTarget.value = null
      pendingGalaxyLive.value = true
    }
    bardActiveTab.value = id
    // navigating by hand ends the offer to jump back to the battle tab
    battleTabReturnPending.value = false
    universeTabReturnPending.value = false
    universeDive.value = null
    clearHoverMarks()
  }

  function closeBardModal() {
    bardActiveTab.value = null
    battleTabReturnPending.value = false
    universeTabReturnPending.value = false
    universeDive.value = null
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
  function requestOpenGalaxyTab(galaxy: number, pinKey: string | null = null) {
    pendingGalaxyLive.value = false
    pendingGalaxyTarget.value = { galaxy, pinKey }
    bardActiveTab.value = 'galaxy'
    clearHoverMarks()
  }

  function clearPendingGalaxyTarget() {
    pendingGalaxyTarget.value = null
  }

  /** Der Klick auf die Minimap: „zeig mir DAS hier gross". Kein Ziel, keine
   *  Marke — die laufende Galaxie ist immer dieselbe. */
  function requestOpenGalaxyLive() {
    pendingGalaxyTarget.value = null
    pendingGalaxyLive.value = true
    bardActiveTab.value = 'galaxy'
    clearHoverMarks()
  }

  function clearPendingGalaxyLive() {
    pendingGalaxyLive.value = false
  }

  /** Der Sprung von der Universe-Bahn auf die Karte. Setzt NUR die Flagge dazu
   *  — das Sprungziel besorgt `requestOpenGalaxyTab`. */
  function requestOpenGalaxyFromUniverse(galaxy: number) {
    requestOpenGalaxyTab(galaxy)
    universeTabReturnPending.value = true
  }

  /** Der Rueckweg. `galaxy` ist die GERADE im Atlas gewaehlte, nicht die, mit
   *  der man kam: wer dort weitergeklickt hat, soll im Universe dort stehen. */
  function returnToUniverseTab(galaxy: number | null) {
    universeTabReturnPending.value = false
    pendingUniverseGalaxy.value = galaxy
    bardActiveTab.value = 'universe'
    clearHoverMarks()
  }

  function clearPendingUniverseGalaxy() {
    pendingUniverseGalaxy.value = null
  }

  /** Die Kamerafahrt beginnt. Den Reiter schaltet der Schleier selbst, wenn er
   *  deckt — ueber `requestOpenGalaxyFromUniverse` bzw. `returnToUniverseTab`. */
  function requestUniverseDive(req: UniverseDiveRequest) {
    universeDive.value = { ...req, phase: 'out' }
  }

  /** Der Zielreiter meldet den echten Fahrtpunkt nach — beim Rueckweg kennt
   *  erst das sichtbare Universe die Knotenmitte. */
  function anchorUniverseDive(x: number, y: number) {
    if (universeDive.value) universeDive.value = { ...universeDive.value, x, y }
  }

  /** Die Zielplatte steht — der Schleier darf fallen. */
  function settleUniverseDive() {
    if (universeDive.value) universeDive.value = { ...universeDive.value, phase: 'in' }
  }

  function clearUniverseDive() {
    universeDive.value = null
  }

  function beginUniverseHop(req: UniverseHop) {
    universeHop.value = { ...req }
  }

  function setUniverseHopPhase(phase: UniverseHop['phase']) {
    if (universeHop.value) universeHop.value = { ...universeHop.value, phase }
  }

  function clearUniverseHop() {
    universeHop.value = null
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
   * Der Weg vom Prestige-Knopf im Header ins Universe — dorthin, wo der
   * Aufbruch als BILD steht.
   *
   * Kein `openBardModal()`: das TOGGELT und schloesse ein bereits offenes
   * Profil. Und keine Auswahl mitzugeben ist Absicht — der Reiter steht beim
   * Betreten ohnehin auf der laufenden Bahn, und genau dort haengen die drei
   * Portale.
   */
  function requestOpenUniverseDeparture() {
    bardActiveTab.value = 'universe'
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
    pendingGalaxyTarget,
    requestOpenGalaxyTab,
    clearPendingGalaxyTarget,
    pendingGalaxyLive,
    requestOpenGalaxyLive,
    clearPendingGalaxyLive,
    universeTabReturnPending,
    pendingUniverseGalaxy,
    pendingArrival,
    noteArrival,
    clearPendingArrival,
    requestOpenGalaxyFromUniverse,
    returnToUniverseTab,
    clearPendingUniverseGalaxy,
    universeDive,
    requestUniverseDive,
    anchorUniverseDive,
    settleUniverseDive,
    clearUniverseDive,
    universeHop,
    beginUniverseHop,
    setUniverseHopPhase,
    clearUniverseHop,
    requestOpenUniverseDeparture,
    setHoveredChampionRole,
    setHoveredChampionSlotIndex,
    setHoveredPlanetSlotId,
    isControlsOpen,
    toggleControls,
    closeControls,
  }
})
