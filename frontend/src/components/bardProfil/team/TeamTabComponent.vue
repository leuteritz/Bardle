<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useHerald } from '@/composables/ui/useHerald'
import {
  ROLES,
  TEAM_TAB_MOUNT_STAGE_BOARD,
  TEAM_TAB_MOUNT_STAGE_SATELLITES,
  TEAM_TAB_MOUNT_STAGE_PANEL,
  TEAM_TAB_MOUNT_STAGE_ORNAMENTS,
  SIGIL_BOARD_SETTLE_FRAMES,
  SIGIL_DETAILS_LOADER_MIN_MS,
  SIGIL_BOARD_LOADER_MIN_MS,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_SYNERGIES_PANEL_WIDTH,
  TEAM_EQUIPMENT_PANEL_WIDTH,
  TEAM_ROLE_RAIL_HANDLE_PX,
  TEAM_ROLE_RAIL_SLIDE_MS,
  TEAM_ROLE_RAIL_HERO_COMPACT_HEIGHT,
  TEAM_SIGIL_OPEN_MS,
  TEAM_SIGIL_EASE_TRAVEL,
} from '@/config/constants'
import { getItemById } from '@/config/economy/items'
import { allySlotLabel } from '@/utils/ui/format'
import type { ItemCategory } from '@/types'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import SigilBoardComponent from './sigil/SigilBoardComponent.vue'
import SigilDetailsPanel from './SigilDetailsPanel.vue'
import TeamTabLoader from './TeamTabLoader.vue'
import TeamSidePanelShell from './TeamSidePanelShell.vue'
import EquipmentPickerPanel from '../roles/EquipmentPickerPanel.vue'
import TeamSynergiesPanel from './TeamSynergiesPanel.vue'
import { useSideRail } from '@/composables/ui/useSideRail'
import { useSigilCamera } from '@/composables/ui/useSigilCamera'

/**
 * The tab has exactly ONE right rail and everything opens into it — the role
 * details page, team synergies and the equipment picker. A modal answered a
 * question by hiding the thing the question was about.
 *
 * Only equipment is left of what were once several destinations: the shop moved
 * out into a tab of its own, and it was the one that never fit the rail anyway
 * (facets, grid and a card's page want to stand side by side, and 900 px only
 * ever fit two of the three).
 *
 * The champion picker is not on this list: it lives inside the details page (see
 * SigilDetailsPanel → swapOpen), so choosing a champion no longer covers the
 * board it is being chosen for.
 */
type TeamDestination = 'equipment' | null

const battleStore = useBattleStore()
const itemStore = useItemStore()
const uiStore = useUiStore()
const { announceReceipt } = useHerald()

// ── Gestaffelter Aufbau ──────────────────────────────────────────────────────
// Siehe TEAM_TAB_MOUNT_STAGE_*: der Tab baut sich über drei Frames auf, damit
// das Öffnen nicht in einem einzigen langen Frame stattfindet.
//
// Nur beim ERSTEN Mal. Beim Wiedereinblenden (der Tab bleibt seither gemountet,
// siehe BardProfileMenu) wäre ein erneuter Durchlauf kontraproduktiv: er risse
// Satelliten und Detailspalte aus dem DOM, um sie Frame für Frame neu zu bauen.
// Gemessen mit voller Besetzung, Öffnen über eine Rollenkarte im Command Panel
// (Median des längsten Einzelframes, 11 Läufe): 47 ms ohne erneute Staffelung,
// 56 ms mit. Das Einblenden allein ist billiger als Abriss plus Wiederaufbau.
const mountStage = ref(TEAM_TAB_MOUNT_STAGE_BOARD)
let mountFrame: number | null = null

function advanceMountStages() {
  const steps = [
    TEAM_TAB_MOUNT_STAGE_SATELLITES,
    TEAM_TAB_MOUNT_STAGE_PANEL,
    TEAM_TAB_MOUNT_STAGE_ORNAMENTS,
  ]
  const step = (i: number) => {
    if (i >= steps.length) {
      mountFrame = null
      return
    }
    mountFrame = requestAnimationFrame(() => {
      mountStage.value = steps[i]
      step(i + 1)
    })
  }
  step(0)
}

/** Die Detailseite darf erst mounten, wenn das Board steht. */
const panelReady = computed(() => mountStage.value >= TEAM_TAB_MOUNT_STAGE_PANEL)

// ── Board gebaut / Ladeschleier ──────────────────────────────────────────────
/**
 * Ob das Board in DIESER Sitzung schon einmal fertig gebaut und gezeichnet
 * wurde. Einmal `true`, bleibt es `true` — und das ist der ganze Punkt.
 *
 * Gemessen am Produktionsbuild (Full HD, voller Kader, 1600-ms-Fenster, je eine
 * frische Sitzung), Öffnen über eine Rollenkarte im Command Panel:
 *
 *   erstes Mal      308 ms längster Frame · 7 Frames über 33 ms · 767 ms verloren
 *   Wiederholungen   42 ms längster Frame · 2 Frames über 33 ms ·  68 ms verloren
 *   Grundlast        14 ms · 0 · 0 ms
 *
 * Teuer ist also fast ausschließlich das ERSTE Mal: der Tab-Layer entsteht, die
 * Aufbaustufen laufen, Portraits werden geladen und dekodiert. Danach ist alles
 * warm, und übrig bleibt ein Umbruch von zwei Frames — den sieht niemand.
 *
 * Ein Schleier auf jedem Öffnen wäre deshalb ab dem zweiten Mal reine
 * zusätzliche Wartezeit für ein Problem, das es dann nicht mehr gibt. Er läuft
 * daher genau einmal.
 */
const boardBuilt = ref(false)
let settleFrame: number | null = null

function cancelBoardSettle() {
  if (settleFrame === null) return
  cancelAnimationFrame(settleFrame)
  settleFrame = null
}

/**
 * Zählt bis zu dem Frame, ab dem das Board wirklich steht. Bricht der Spieler
 * vorher ab (Tab zu), bleibt `boardBuilt` false — dann war es eben noch nicht
 * gebaut, und der nächste Versuch bekommt seinen Schleier zurecht wieder.
 */
function scheduleBoardSettle() {
  cancelBoardSettle()
  let left = SIGIL_BOARD_SETTLE_FRAMES
  const step = () => {
    // Erst muss die letzte Aufbaustufe stehen, dann noch ein paar Frames für
    // das Zeichnen selbst — der Frame, in dem der Layer sichtbar wird, ist der
    // teuerste von allen und liegt nach dem Setzen der Stufe.
    if (mountStage.value < TEAM_TAB_MOUNT_STAGE_ORNAMENTS || --left > 0) {
      settleFrame = requestAnimationFrame(step)
      return
    }
    settleFrame = null
    boardBuilt.value = true
  }
  settleFrame = requestAnimationFrame(step)
}

/* Zurückgenommen: ein eigener `rail`-Schleier für den ersten Aufbau der
   Detailseite. Ihre Kosten sind kein Frame, sondern Bilddekodierungen über rund
   eine Sekunde — die fielen hinter dem Schleier hervor und machten den ZWEITEN
   Klick teuer (67–86 → 170–192 ms). */

/** Der Schleier steht — die Detailseite ist noch nicht gemountet. */
const detailsPending = ref(false)
/** Startzeitpunkt des Ladens, Basis der Zeitangabe im Schleier. */
const detailsStartedAt = ref(0)
let detailsTimer: ReturnType<typeof setTimeout> | null = null
/**
 * Vom Aufziehen des Schleiers bis zum Ende seines Ausblendens. Solange gleitet
 * die Schiene NICHT herein: der Schleier deckt sie vollständig, die Bewegung
 * liefe unsichtbar mit und wäre nach dem Aufdecken als Nachzucken zu sehen.
 */
const veilCovering = ref(false)
/**
 * Wie weit der Schleier deckt — es gibt genau drei Wege in den Tab, und jeder
 * bringt etwas anderes hervor:
 *
 * `tab`   über eine Rollenkarte im Command Panel: Board UND Detailseite
 *         entstehen gleichzeitig neu. Gewartet wird wegen der Seite ohnehin —
 *         den Aufbau des Boards mit abzudecken kostet daher keine zusätzliche
 *         Zeit, spart aber das sichtbare Zusammenwachsen des Sigils daneben
 *         (gemessen 125 ms längster Frame).
 * `board` über die Tab-Leiste des Bard-Profils: es entsteht nur das Board, ohne
 *         gewählte Rolle. Der Schleier zeigt entsprechend nur das Sigil-Skelett
 *         und steht kürzer (SIGIL_BOARD_LOADER_MIN_MS).
 * `rail`  eine Rolle wird angeklickt, während das Board schon steht — dann darf
 *         nur die Schiene verdeckt werden. Was der Spieler bereits sieht,
 *         nachträglich zuzudecken, wäre ein Rückschritt.
 */
const veilScope = ref<'rail' | 'tab' | 'board'>('rail')

/** Ohne Detailseite wird nur auf das Board gewartet — also auch kürzer. */
const loaderMinMs = computed(() =>
  veilScope.value === 'board' ? SIGIL_BOARD_LOADER_MIN_MS : SIGIL_DETAILS_LOADER_MIN_MS,
)

function cancelDetailsLoad() {
  if (detailsTimer !== null) {
    clearTimeout(detailsTimer)
    detailsTimer = null
  }
  detailsPending.value = false
}

/** Schleier hoch — was dahinter entsteht, mountet erst, wenn das Board durch ist. */
function startDetailsLoad(scope: 'rail' | 'tab' | 'board' = 'rail') {
  cancelDetailsLoad()
  detailsStartedAt.value = performance.now()
  veilScope.value = scope
  detailsPending.value = true
  veilCovering.value = true
}

/**
 * Der Tab geht auf — als erster Mount oder als Wiedereinblenden.
 *
 * Steht das Board schon (siehe boardBuilt), ist hier NICHTS zu tun: das
 * Wiedereinblenden kostet zwei Frames, und davor einen Schleier zu setzen wäre
 * nur Wartezeit ohne Gegenwert.
 *
 * Sonst: hat eine Öffnungs-Anfrage bereits einen Schleier aufgezogen, bleibt es
 * dabei; andernfalls deckt der Board-Schleier den Aufbau des Sigils ab. Diese
 * Reihenfolge ist der Grund, warum hier geprüft und nicht einfach gesetzt wird —
 * der Watcher der Anfrage steht weiter oben in der Reihe und war schon dran,
 * wenn dieser hier läuft.
 */
function beginTabOpen() {
  if (boardBuilt.value) return
  scheduleBoardSettle()
  if (detailsPending.value) return
  startDetailsLoad('board')
}

// ── Tab UI state ─────────────────────────────────────────────────────────────
/**
 * Der Übergang gehört der Phasenmaschine, nicht mehr einem nackten `ref`.
 * `role` ist das frühere `selectedRole` — was Schiene und Seite zeigen; die
 * Kamera und das Subjekt der Seite hinken ihm um je einen Takt hinterher.
 *
 * Deckt der Ladeschleier, wird gesetzt statt gefahren: eine Fahrt unter einer
 * deckenden Fläche ist nicht zu sehen und zuckt beim Aufdecken nach.
 */
const {
  role: selectedRole,
  cameraRole,
  panelRole,
  phase: camPhase,
  panelHeld,
  requestRole,
  onStageTransitionEnd,
  snap: snapCamera,
} = useSigilCamera({
  // Nur ein Schleier, der das BOARD deckt, darf die Fahrt unterdrücken. Der
  // Schienen-Schleier deckt nur die Seite; daneben fährt die Kamera sichtbar.
  covered: () => veilCovering.value && veilScope.value !== 'rail',
})

/**
 * Die ECHTE Seite entsteht erst, wenn die Kamera steht — weiterhin hinter dem
 * Skelett.
 *
 * Sie lief einmal zwei Frames nach dem Klick an, also MITTEN in der Fahrt. Das
 * setzt darauf, dass die Bühnen-Transition im Kompositor liegt und ein
 * blockierter Hauptthread sie nicht anhält — belegen liess sich das nicht, und
 * eine stotternde Kamera ist genau der Befund, der diesen Umbau ausgelöst hat.
 * Jetzt fährt sie auf einem freien Hauptthread, und der teure Aufbau fällt
 * danach in eine Zeit, in der sich sichtbar nichts mehr bewegt.
 *
 * Einmal scharf, bleibt es scharf: ein Rollenwechsel schwenkt die Kamera erneut,
 * darf die schon stehende Seite aber nicht abreissen.
 */
const panelArmed = ref(false)
/** Die Detailseite hat ihren Aufbau hinter sich (`@ready`). */
const panelBuilt = ref(false)

watch([panelHeld, camPhase], ([held, phase]) => {
  if (!held) {
    panelArmed.value = false
    panelBuilt.value = false
    return
  }
  if (phase === 'idle') panelArmed.value = true
})

// Aufgedeckt wird, sobald DREIERLEI gilt: das Board steht, die Seite steht, und
// der Schleier hat lange genug gestanden, um als Ladevorgang gelesen zu werden.
//
// Die Mindeststandzeit deckt die Fahrt mit ab (SIGIL_DETAILS_LOADER_MIN_MS >
// TEAM_SIGIL_TRAVEL_MS, gebunden in sigilCamera.spec).
watch([boardBuilt, detailsPending, panelBuilt, panelHeld], ([built, pending, ready, held]) => {
  if (!built || !pending || detailsTimer !== null) return
  if (held && !ready) return
  const shown = performance.now() - detailsStartedAt.value
  detailsTimer = setTimeout(
    () => {
      detailsTimer = null
      detailsPending.value = false
    },
    Math.max(0, loaderMinMs.value - shown),
  )
})

/** Team synergies side panel — mutually exclusive with the role details panel. */
const synergiesOpen = ref(false)
/** Champions spotlighted by the synergies search — mirrored on the sigil board. */
const searchHighlights = ref<string[]>([])

watch(synergiesOpen, (open) => {
  if (!open) searchHighlights.value = []
})
/** Ally row hovered in the details panel — spotlighted on the sigil board. */
const hoveredAllySub = ref<number | null>(null)
/** Ally satellite hovered on the board — highlighted in the details panel. */
const boardHoveredAlly = ref<number | null>(null)

/**
 * The seat under the cursor, wherever the cursor happens to be — and it drives
 * BOTH surfaces, which is what makes the two read as one thing: the board
 * spotlights that satellite and pulls its four siblings back, the roster strip
 * lights that card and pulls the rest back, in the same moment.
 *
 * Feeding the board's own hover back to the board is the point. Without it,
 * pointing straight at a satellite dimmed the panel but left the board itself
 * unchanged, so the same gesture looked like two different effects depending on
 * which half of the tab your hand was over.
 *
 * The panel's hover wins a tie: it is the more deliberate of the two, and it is
 * the one still standing when the pointer travels from the board onto a card.
 */
const spotlightAlly = computed(() => hoveredAllySub.value ?? boardHoveredAlly.value)

watch(
  selectedRole,
  (index) => {
    hoveredAllySub.value = null
    boardHoveredAlly.value = null
    // Auswahl ins UI-Store spiegeln, damit das Command Panel dieselbe
    // Rollenkarte markiert (ein Watcher deckt alle Pfade ab: Board-Klick,
    // Panel schließen, Synergien öffnen, externe Öffnungs-Anfrage).
    uiStore.setTeamActiveRole(index)
  },
  { immediate: true },
)
/**
 * Whether the equipment picker owns the rail.
 *
 * It is opened FROM the details page for the role that page is on, so it takes
 * the rail WITHOUT clearing `selectedRole` — closing it drops straight back onto
 * the page it came from, and the board keeps its camera on that role the whole
 * time.
 */
const activeDestination = ref<TeamDestination>(null)
const equipCategory = ref<ItemCategory>('weapon')

const railChoice = ref<boolean | null>(null)
const railFolded = computed(
  () =>
    railChoice.value ??
    (selectedRole.value === null && !synergiesOpen.value && activeDestination.value === null),
)
const railPanelWidth = computed(() => {
  if (activeDestination.value === 'equipment') return TEAM_EQUIPMENT_PANEL_WIDTH
  if (synergiesOpen.value && selectedRole.value === null) return TEAM_SIGIL_SYNERGIES_PANEL_WIDTH
  return TEAM_SIGIL_DETAILS_PANEL_WIDTH
})
const railZoneWidth = computed(
  () =>
    `${railFolded.value ? TEAM_ROLE_RAIL_HANDLE_PX : railPanelWidth.value + TEAM_ROLE_RAIL_HANDLE_PX}px`,
)
const railPanelWidthPx = computed(() => `${railPanelWidth.value}px`)
const railHandleWidth = `${TEAM_ROLE_RAIL_HANDLE_PX}px`
const railSlideMs = `${TEAM_ROLE_RAIL_SLIDE_MS}ms`
const roleHeroCompactHeight = `${TEAM_ROLE_RAIL_HERO_COMPACT_HEIGHT}px`
const { inert: railInert } = useSideRail({
  folded: railFolded,
  slideMs: TEAM_ROLE_RAIL_SLIDE_MS,
})

/**
 * Steht der Ladeschleier gerade in der Schiene? Bewusst abgeleitet statt
 * mitgeführt: damit nimmt JEDER Weg, der die Spalte wegräumt — Escape, Klick
 * ins leere Board, eine Schienen-Destination — den Schleier gleich mit, ohne
 * dass jeder dieser Wege ihn einzeln kennen müsste.
 */
const detailsVeilVisible = computed(() => {
  if (!detailsPending.value || activeDestination.value !== null) return false
  // Der Board-Schleier wartet auf gar keine Rolle — alle anderen schon.
  return veilScope.value === 'board' || selectedRole.value !== null
})
const railVeilVisible = computed(() => detailsVeilVisible.value && veilScope.value === 'rail')
const tabVeilVisible = computed(() => detailsVeilVisible.value && veilScope.value !== 'rail')

/**
 * Der Übergang, mit dem die Schiene wechselt — normalerweise das Hereingleiten,
 * unter dem Schleier ein harter Schnitt: die Detailseite mountet DAHINTER und
 * wird durch sein Ausblenden aufgedeckt, eine zusätzliche Bewegung wäre erst
 * unsichtbar und dann ein Nachzucken.
 */
const railTransition = computed(() => {
  if (veilCovering.value && activeDestination.value === null) return 'sdp-instant'
  // Fährt die SCHIENE gerade, trägt sie den Inhalt mit — ein zweiter Slide auf
  // derselben Achse liefe doppelt so weit und läse sich als Nachziehen.
  if (camPhase.value === 'leave') return 'sdp-instant'
  return 'sdp-slide'
})

const railEnterMs = `${TEAM_SIGIL_OPEN_MS}ms`
const easeTravel = TEAM_SIGIL_EASE_TRAVEL

/**
 * Was das BOARD abzieht, um neben der Schiene zu sitzen.
 *
 * Es hängt an `cameraRole`, nicht an `selectedRole`: dadurch rückt das Board
 * schon im ersten Takt auf seine Endlage, und wenn die Schiene danach hereinfährt,
 * muss die Kamera nicht ein zweites Mal fahren. Sie bewegt sich genau einmal.
 */
const boardFolded = computed(
  () =>
    railChoice.value ??
    (cameraRole.value === null && !synergiesOpen.value && activeDestination.value === null),
)
const sidePanelWidth = computed(() =>
  boardFolded.value ? TEAM_ROLE_RAIL_HANDLE_PX : railPanelWidth.value + TEAM_ROLE_RAIL_HANDLE_PX,
)

const roleIndex = computed(() => selectedRole.value ?? uiStore.rolesActiveSlot)
const roleDef = computed(() => ROLES[roleIndex.value])
const currentEquipment = computed(() => itemStore.slotEquipment[roleIndex.value])

// ── Selection ────────────────────────────────────────────────────────────────
/** Seat the details page should open on — only a board satellite names one. */
const focusAlly = ref<number | null>(null)
/** Bumped with every focus request, see the panel's `focusToken` prop. */
const focusToken = ref(0)
/** Whether that request should land straight in the inline picker. */
const focusSwap = ref(false)
/** True while the details page has the picker open — Escape routes by it. */
const swapOpen = ref(false)
/** Bumped to ask the page to leave the picker (Escape), see `closeSwapToken`. */
const closeSwapToken = ref(0)
const skinsOpen = ref(false)
/** Same token trick as the picker — the skin gallery lives in the page too. */
const closeSkinsToken = ref(0)

function focusSeat(subSlot: number | null, swap = false) {
  focusAlly.value = subSlot
  focusSwap.value = swap
  focusToken.value++
}

function selectRole(index: number) {
  synergiesOpen.value = false
  activeDestination.value = null
  // NICHT `false`: ein erzwungenes Aufklappen führe die Schiene schon im ersten
  // Takt herein, und der gehört allein der Kamera. `railFolded` fällt so auf
  // `selectedRole === null` zurück — genau der gewünschte Takt.
  railChoice.value = null
  // Jedes Öffnen bekommt sein Skelett: ohne es stünde rechts die leere Fläche,
  // in die die Seite gleich einfährt, und das liest sich als kaputt statt als
  // Ladevorgang. Läuft schon ein Schleier (Tab-Aufbau), bleibt dessen Reichweite.
  if (selectedRole.value === null && !detailsPending.value) startDetailsLoad('rail')
  requestRole(index)
  focusSeat(null)
  uiStore.setRolesActiveSlot(index)
}

/**
 * A satellite on the sigil board opens the DETAILS PAGE on that champion — it
 * used to jump straight into the swap modal, which threw the player out of the
 * page they were on to answer a question they had not asked.
 *
 * An empty seat is the one exception: it has no champion to describe, so the
 * page opens with its picker already up. That is exactly what the page does
 * when one of its own empty chips is clicked (see selectSubject there), so
 * board and page answer a click the same way. Swapping a seated champion stays
 * one click away — its portrait on the page is the swap button.
 */
function selectAlly(index: number, subSlot: number) {
  const seated = (battleStore.secondarySlots[index] ?? [])[subSlot] ?? null
  selectRole(index)
  focusSeat(subSlot, !seated)
}

function closePanel() {
  requestRole(null)
  railChoice.value = null
}

/** Empty board clicked — dismisses whatever the rail is showing, one layer at a
 *  time: equipment falls back to the page that opened it, everything else
 *  closes the rail outright. */
function dismissPanels() {
  if (activeDestination.value === 'equipment') {
    activeDestination.value = null
    return
  }
  requestRole(null)
  synergiesOpen.value = false
  // Den Override freigeben, sonst bliebe die Zone offen und das Board links.
  railChoice.value = null
}

function openSynergies() {
  activeDestination.value = null
  // Gesetzt, nicht gefahren: die Schiene bleibt offen und tauscht nur ihren
  // Inhalt. Ein Ausfahr-Takt hielte das Synergien-Panel bloss auf.
  snapCamera(null)
  synergiesOpen.value = true
  railChoice.value = false
}

/** Opened from the details page — keeps `selectedRole`, so closing returns there. */
function openEquipment(category: ItemCategory) {
  equipCategory.value = category
  activeDestination.value = 'equipment'
}

function closeDestination() {
  activeDestination.value = null
}

function handleRoleRailClick(index: number) {
  if (!railFolded.value && selectedRole.value === index && activeDestination.value === null) {
    closePanel()
    return
  }
  selectRole(index)
}

/** A champion picked in the details page's inline picker. */
function assignChampion(subSlot: number, champion: string) {
  const seated =
    subSlot === -1
      ? battleStore.setHeaderSlot(roleIndex.value, champion)
      : battleStore.setSecondarySlot(roleIndex.value, subSlot, champion)
  // Ein Reisender wird abgelehnt — ohne diese Zeile quittierte der Herold eine
  // Platzierung, die nicht stattgefunden hat.
  if (!seated) {
    announceReceipt({
      kind: 'warning',
      headline: `${champion} is away`,
      subline: 'Champions in the field cannot take a seat',
      countable: false,
      mergeKey: 'assign/away',
    })
    return
  }
  announceReceipt({
    kind: 'assign',
    headline: champion,
    subline: subSlot === -1 ? roleDef.value.label : allySlotLabel(subSlot),
    portraitSrc: battleStore.getChampionImage(champion, { size: 'md' }),
    mergeKey: 'assign',
  })
}

function clearAlly(subSlot: number) {
  battleStore.clearSecondarySlot(roleIndex.value, subSlot)
}

/** Anlegen und Ablegen quittieren beide — ein Skin tat es längst, ein Item
 *  nicht, und es ist dieselbe Handlung am selben Champion. Gemeinsamer
 *  `mergeKey` mit den Skins: wer sein Team ausrüstet, bekommt EINE Karte. */
function handleEquipFromPicker(itemId: string, category: ItemCategory) {
  const item = getItemById(itemId)
  if (!item) return
  const unequipping = currentEquipment.value[category] === itemId
  if (unequipping) {
    itemStore.unequipItem(roleIndex.value, category)
  } else if (!itemStore.equipItem(roleIndex.value, itemId)) {
    return
  }
  announceReceipt({
    kind: 'equip',
    eyebrow: unequipping ? 'UNEQUIPPED' : undefined,
    headline: item.name,
    subline: roleDef.value.label,
    portraitSrc: item.icon,
    imageRound: false,
    mergeKey: 'equip',
  })
}

// ── External navigation hooks ────────────────────────────────────────────────
/**
 * Consumes a "open the team tab on this slot" request from elsewhere (command
 * panel, battle roster, striker squad).
 *
 * A request that names an ally sub-slot asks for that seat's picker, which is
 * now the details page's own — one page opens, not a page and a modal over it.
 * The two-frame defer that used to sit here went with the modal: the inline
 * grid is windowed (useVirtualGrid), so it lays out a dozen cards, not 160.
 */
function applyRolesOpenRequest() {
  const slot = uiStore.rolesActiveSlot
  const subSlot = uiStore.rolesActiveSubSlot
  uiStore.clearRolesOpenPending()
  synergiesOpen.value = false
  activeDestination.value = null
  railChoice.value = null

  // Kam die Anfrage aus dem Command Panel, wird der Tab im selben Flush
  // sichtbar — hier entsteht ALLES neu, also deckt der Schleier auch das Board
  // ab und gibt am Ende einen fertigen Tab frei (siehe veilScope). Er steht vor
  // der Auswahl, damit die Kamera unter ihm setzt statt zu fahren.
  if (selectedRole.value === null && !boardBuilt.value) startDetailsLoad('tab')
  // Die Auswahl fällt SOFORT, nicht erst nach dem Laden: sie bestimmt die
  // Breite der Schiene und damit die Kamera des Boards. Beides muss vom ersten
  // Frame an stimmen, sonst rückt das Board beim Aufdecken noch einmal nach.
  requestRole(slot)
  focusSeat(subSlot < 0 ? null : subSlot, subSlot >= 0)
}

watch(() => uiStore.rolesOpenToken, applyRolesOpenRequest)

// Escape unwinds one layer at a time: the details page's own picker, then
// whatever the rail is showing. Only this handler listens for the key — the
// picker lives in a child, so the request travels down as a token rather than
// as a second window listener racing this one.
function onEsc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (activeDestination.value !== null) {
    closeDestination()
  } else if (swapOpen.value) {
    closeSwapToken.value++
  } else if (skinsOpen.value) {
    closeSkinsToken.value++
  } else if (synergiesOpen.value) {
    synergiesOpen.value = false
    railChoice.value = null
  } else if (selectedRole.value !== null) {
    closePanel()
  } else {
    // Nichts mehr abzuwickeln — dieses Escape gehört dem Profil-Modal, das sich
    // damit ganz schließt.
    return
  }
  // Verbraucht: das Modal darüber prüft `defaultPrevented` und bleibt stehen.
  // Ohne diese Meldung fiele mit der innersten Ebene gleich das ganze Profil zu.
  e.preventDefault()
}

// ── Sichtbarkeit statt Lebensdauer ───────────────────────────────────────────
/**
 * Der Tab wird nach dem ersten Öffnen nicht mehr abgerissen, sondern nur noch
 * versteckt (siehe BardProfileMenu). Alles, was früher an Mount und Unmount
 * hing, hängt deshalb jetzt hieran — sonst bliebe der Escape-Handler dauerhaft
 * am Fenster und verbrauchte die Taste auch im Idle-Orbit.
 */
const isVisible = computed(() => uiStore.bardActiveTab === 'team')

/**
 * Der Tab beginnt jedes Mal frisch: Board ohne Detailseite, keine Schiene, kein
 * Rest der letzten Sitzung.
 *
 * Zurückgesetzt wird beim VERLASSEN, nicht beim Betreten. Eine Öffnungs-Anfrage
 * (`requestOpenRolesTab`) setzt Rolle und Tab im selben Flush — ein Reset beim
 * Betreten liefe mit ihr um die Wette und löschte je nach Watcher-Reihenfolge
 * genau die Rolle, die geöffnet werden sollte.
 */
function resetTabState() {
  // Ein noch laufender Ladevorgang gehört zu einem Tab, der bereits zu ist — er
  // dürfte die Spalte nicht nachträglich doch noch aufschlagen.
  cancelDetailsLoad()
  cancelBoardSettle()
  panelArmed.value = false
  veilCovering.value = false
  // `boardBuilt` bleibt bewusst stehen: was einmal gebaut ist, ist gebaut. Das
  // Wiedereinblenden kostet zwei Frames (gemessen 42 ms längster Frame gegen
  // 308 ms beim ersten Mal) — dafür braucht es keinen Schleier mehr.
  snapCamera(null)
  synergiesOpen.value = false
  activeDestination.value = null
  railChoice.value = null
  searchHighlights.value = []
  hoveredAllySub.value = null
  boardHoveredAlly.value = null
  focusAlly.value = null
  focusSwap.value = false
  swapOpen.value = false
  skinsOpen.value = false
}

watch(isVisible, (visible) => {
  if (visible) {
    window.addEventListener('keydown', onEsc)
    beginTabOpen()
    return
  }
  window.removeEventListener('keydown', onEsc)
  // Die gespiegelte Auswahl fällt mit (über den selectedRole-Watcher), sonst
  // bliebe im Command Panel eine Markierung ohne offenes Panel stehen.
  resetTabState()
})

onMounted(() => {
  advanceMountStages()
  if (isVisible.value) window.addEventListener('keydown', onEsc)
  // the tab may have just been opened BY a requestOpenRolesTab call — the token
  // watcher above wasn't registered yet, so consume the pending request here
  if (uiStore.rolesOpenPending) applyRolesOpenRequest()
  // …und erst DANACH der Schleier, damit er der Anfrage nicht vorgreift
  beginTabOpen()
})
onUnmounted(() => {
  if (mountFrame !== null) cancelAnimationFrame(mountFrame)
  cancelDetailsLoad()
  cancelBoardSettle()
  window.removeEventListener('keydown', onEsc)
  uiStore.setTeamActiveRole(null)
})
</script>

<template>
  <div class="team-tab">
    <!-- shared cosmic backdrop — spans the ENTIRE tab content, edge to edge,
         beneath the sigil board and every slide-in rail. -->
    <CosmicStageBackground />

    <!-- ══ LEFT — Battle Sigil ══ -->
    <SigilBoardComponent
      :selected-role="cameraRole"
      :cam-phase="camPhase"
      :mount-stage="mountStage"
      :side-panel-width="sidePanelWidth"
      :search-highlights="searchHighlights"
      :hovered-ally="spotlightAlly"
      @select-role="selectRole"
      @select-ally="selectAlly"
      @hover-ally="boardHoveredAlly = $event"
      @open-synergies="openSynergies"
      @deselect="dismissPanels"
      @camera-settled="onStageTransitionEnd"
    />

    <!-- ══ RIGHT — the one rail: equipment, role details or synergies ══
         One Transition for all of them, so swapping what the rail holds is a
         single slide, not a close followed by an open. -->
    <div class="team-rail-zone">
      <Transition name="sdv" @after-leave="veilCovering = false">
        <TeamTabLoader
          v-if="railVeilVisible"
          class="team-rail-loader"
          :role-index="selectedRole"
          :started-at="detailsStartedAt"
          cover="rail"
        />
      </Transition>

      <div
        class="team-rail-slide"
        :class="{ 'team-rail-slide--parked': railFolded }"
        :inert="railInert"
      >
        <Transition :name="railTransition" mode="out-in">
          <TeamSidePanelShell
            v-if="activeDestination === 'equipment'"
            key="equipment"
            title="Equipment"
            icon="game-icons:open-treasure-chest"
            :subtitle="`Equip the ${roleDef.label} champion`"
            :width="TEAM_EQUIPMENT_PANEL_WIDTH"
            @close="closeDestination"
          >
            <EquipmentPickerPanel
              :initial-category="equipCategory"
              :current-equipment="currentEquipment"
              @equip="handleEquipFromPicker"
            />
          </TeamSidePanelShell>

          <div
            v-else-if="panelHeld && panelReady && panelArmed"
            key="details"
            class="team-role-detail"
          >
            <SigilDetailsPanel
              :role-index="panelRole ?? roleIndex"
              :highlighted-ally="boardHoveredAlly"
              :focus-ally="focusAlly"
              :focus-token="focusToken"
              :focus-swap="focusSwap"
              :close-swap-token="closeSwapToken"
              :close-skins-token="closeSkinsToken"
              @assign="assignChampion"
              @clear-ally="clearAlly"
              @pick-equipment="openEquipment"
              @hover-ally="hoveredAllySub = $event"
              @swap-state="swapOpen = $event"
              @skins-state="skinsOpen = $event"
              @ready="panelBuilt = true"
            />
          </div>
          <TeamSynergiesPanel
            v-else-if="synergiesOpen && panelReady"
            key="synergies"
            @close="synergiesOpen = false"
            @highlight="searchHighlights = $event"
          />
        </Transition>
      </div>

      <nav class="team-role-rail-nav" aria-label="Team roles">
        <button
          v-for="(role, index) in ROLES"
          :key="role.key"
          type="button"
          class="team-role-rail-button"
          :class="{ 'team-role-rail-button--active': selectedRole === index && !railFolded }"
          :style="{ '--role-color': role.color }"
          :aria-label="`${role.label} details`"
          :aria-current="selectedRole === index && !railFolded ? 'page' : undefined"
          :aria-expanded="selectedRole === index && !railFolded"
          v-tip="`${role.label} details`"
          @click="handleRoleRailClick(index)"
        >
          <strong class="trr-word">{{ role.short }}</strong>
        </button>
      </nav>
    </div>

    <!-- ══ Ladeschleier der Detailspalte ══
         Sitzt IM Flex-Fluss und belegt exakt die Breite der Seite, die gleich
         kommt: das Board rechnet seine Kamera also vom ersten Frame an mit dem
         endgültigen Layout, und nichts rückt beim Aufdecken noch einmal nach.
         Beim Verschwinden verlässt er den Fluss (siehe .sdv-leave-active), die
         Seite nimmt seinen Platz im SELBEN Frame ein — es gibt keinen Frame
         ohne Schiene, in dem das Board kurz breiter würde. -->
    <Transition name="sdv" @after-leave="veilCovering = false">
      <TeamTabLoader
        v-if="tabVeilVisible"
        :role-index="selectedRole"
        :started-at="detailsStartedAt"
        :cover="veilScope"
      />
    </Transition>
  </div>
</template>

<style scoped>
.team-tab {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) v-bind(railZoneWidth);
  height: 100%;
  min-height: 0;
  overflow: clip;
  background: #111008; /* same deep-space base as Shop / Planets / Skill Tree */
}

.team-rail-zone {
  position: relative;
  min-width: 0;
  min-height: 0;
}
.team-role-rail-nav {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  width: v-bind(railHandleWidth);
  border-left: 3px solid #5c3310;
  background: #111008;
}
.team-role-rail-button {
  min-height: 0;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 2px;
  border: 0;
  border-left: 3px solid color-mix(in srgb, var(--role-color) 55%, #241a0c);
  border-bottom: 1px solid #493116;
  background: #141410;
  color: color-mix(in srgb, var(--role-color) 62%, #cdbb96);
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    border-left-color 0.14s ease,
    color 0.14s ease;
}
.team-role-rail-button:last-child {
  border-bottom: 0;
}
/* Hover und aktiv sind ZWEI Zustände: geteilt verschwand die offene Rolle,
   sobald der Zeiger auf einem Nachbarn stand. */
.team-role-rail-button:hover {
  background: color-mix(in srgb, var(--role-color) 14%, #141410);
  border-left-color: var(--role-color);
  color: color-mix(in srgb, var(--role-color) 85%, #f0e6d0);
}
.team-role-rail-button--active {
  background: color-mix(in srgb, var(--role-color) 26%, #12100a);
  border-left-color: var(--role-color);
  /* Inset statt breiterer Border — sonst schrumpft die Innenbreite und das Wort
     springt beim Wechsel um 2px. */
  box-shadow: inset 2px 0 0 var(--role-color);
  color: #f4ecd8;
}
.team-role-rail-button:focus-visible {
  outline: 2px solid var(--role-color);
  outline-offset: -2px;
}
/* Gekippt statt geschrumpft: das Segment ist bis 380px hoch, aber nur 37px
   breit nutzbar. Eigenständig gegenüber `.sr-handle-word` — das ist der EINE
   Fold-Griff mit EINEM Wort, dies eine Fünf-Wege-Navigation je Rollenfarbe. */
.trr-word {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  font-size: clamp(16px, 1.75vh, 22px);
  font-weight: 800;
  letter-spacing: 0.26em;
  line-height: 1;
  white-space: nowrap;
  text-indent: 0.13em; /* halber Nachlauf des letzten Zeichens */
}
.team-rail-slide {
  position: absolute;
  top: 0;
  right: v-bind(railHandleWidth);
  bottom: 0;
  z-index: 1;
  width: v-bind(railPanelWidthPx);
  transition: transform v-bind(railSlideMs) ease;
}
.team-rail-slide--parked {
  transform: translateX(100%);
}
.team-role-detail {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--sr-surface);
}
/* Die Seite beginnt direkt mit der Sitzreihe. Eine waagerechte Rollenzeile
   darüber sagte dasselbe wie die senkrechte Leiste am rechten Rand. */
.team-role-detail :deep(.sdp-panel) {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.team-rail-loader {
  position: absolute;
  inset: 0 v-bind(railHandleWidth) 0 auto;
  z-index: 3;
}

@media (prefers-reduced-motion: reduce) {
  .team-rail-slide,
  .team-role-rail-button {
    transition: none;
  }
}

@media (max-height: 1100px) {
  .team-role-detail :deep(.sdp-hero) {
    flex: 0 1 v-bind(roleHeroCompactHeight);
    height: v-bind(roleHeroCompactHeight);
    min-height: 0;
  }
}

/* rail slide-in — shared by the details page, the synergies panel and the
   equipment picker, so they all enter and leave on the same motion */
.sdp-slide-enter-active {
  transition: transform v-bind(railEnterMs) v-bind(easeTravel);
}
.sdp-slide-leave-active {
  transition: transform 0.12s cubic-bezier(0.55, 0, 1, 0.45);
}
.sdp-slide-enter-from,
.sdp-slide-leave-to {
  transform: translateX(100%);
}
/* Harter Schnitt: gilt nur, während der Ladeschleier die Schiene deckt — die
   Detailseite mountet dahinter und wird durch sein Ausblenden aufgedeckt. */
.sdp-instant-enter-active,
.sdp-instant-leave-active {
  transition: none;
}

/* ── Ladeschleier ──
   BEWUSST ohne Einblendung: er ist ab dem ersten Frame voll deckend da. Eine
   Blende von 200 ms hieße 200 ms lang halbdurchsichtig — und dahinter sähe man
   genau das Zusammenwachsen des Boards, das er verdecken soll. Sichtbar wird er
   ohnehin sanft, weil das Modal um ihn herum aufgeht (modal-pop).

   Hinaus wird er absolut über die Schiene gelegt. Das ist der Kern des ganzen
   Übergangs: er gibt seinen Platz im Fluss im selben Frame frei, in dem die
   Detailseite ihn einnimmt, und blendet danach über ihr weg — der teure
   Mount-Frame liegt vollständig hinter einer deckenden Fläche. */
/* Das Skelett der Schiene poppt nicht: es gleitet in derselben Zeit herein wie
   die Schiene, die es vertritt. Nur `transform` — deckend bleibt es ab Frame 1
   (siehe den Kommentar über .sdv-leave-active). */
.sdv-enter-from.team-rail-loader {
  transform: translateX(100%);
}
.sdv-enter-active.team-rail-loader {
  transition: transform v-bind(railEnterMs) v-bind(easeTravel);
}

.sdv-leave-active {
  /* `!important`, weil hier zwei scoped Regeln gleicher Spezifität gegeneinander
     stehen: die des Schleiers (position: relative) und diese. Wer gewinnt, hinge
     sonst an der Reihenfolge der Style-Injektion — und die ist keine Zusage. */
  position: absolute !important;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  transition: opacity 0.32s ease;
}
.sdv-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sdp-slide-enter-active,
  .sdp-slide-leave-active {
    transition: opacity 0.15s ease !important;
  }
  .sdp-slide-enter-from,
  .sdp-slide-leave-to {
    transform: none !important;
    opacity: 0;
  }
}
</style>
