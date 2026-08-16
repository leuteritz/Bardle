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
  TEAM_SHOP_PANEL_WIDTH,
  TEAM_EXPEDITION_PANEL_WIDTH,
  TEAM_EQUIPMENT_PANEL_WIDTH,
} from '@/config/constants'
import { getChampionRoles } from '@/config/champions/championData'
import { allySlotLabel } from '@/utils/ui/format'
import type { ChampionRole, ItemCategory } from '@/types'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import SigilBoardComponent from './sigil/SigilBoardComponent.vue'
import SigilDetailsPanel from './SigilDetailsPanel.vue'
import TeamTabLoader from './TeamTabLoader.vue'
import TeamSidePanelShell from './TeamSidePanelShell.vue'
import EquipmentPickerPanel from '../roles/EquipmentPickerPanel.vue'
import ChampionShopComponent from './championShop/ChampionShopComponent.vue'
import TeamSynergiesPanel from './TeamSynergiesPanel.vue'
import ExpeditionComponent from './expedition/ExpeditionComponent.vue'

/**
 * The tab has exactly ONE right rail and everything opens into it — the role
 * details page, team synergies, and the three board destinations that used to be
 * modals over the whole tab. A modal answered a question by hiding the thing the
 * question was about: the shop covered the very sigil the player recruits for.
 *
 * The champion picker is not on this list: it lives inside the details page (see
 * SigilDetailsPanel → swapOpen), so choosing a champion no longer covers the
 * board it is being chosen for.
 */
type TeamDestination = 'shop' | 'expedition' | 'equipment' | null

const ROLE_INDEX = Object.fromEntries(ROLES.map((r, i) => [r.key, i])) as Partial<
  Record<ChampionRole, number>
>

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

// Aufgedeckt wird, sobald BEIDES gilt: das Board steht, und der Schleier hat
// lange genug gestanden, um als Ladevorgang gelesen zu werden.
watch([boardBuilt, detailsPending], ([built, pending]) => {
  if (!built || !pending || detailsTimer !== null) return
  const shown = performance.now() - detailsStartedAt.value
  detailsTimer = setTimeout(
    () => {
      detailsTimer = null
      detailsPending.value = false
    },
    Math.max(0, loaderMinMs.value - shown),
  )
})

// ── Tab UI state ─────────────────────────────────────────────────────────────
/** null = details panel closed (sigil fills the tab). */
const selectedRole = ref<number | null>(null)
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
 * Which board destination owns the rail, if any.
 *
 * Shop and expeditions are destinations of their own and push the details page
 * out of the rail. Equipment is different: it is opened FROM the details page
 * for the role that page is on, so it takes the rail WITHOUT clearing
 * `selectedRole` — closing it drops straight back onto the page it came from,
 * and the board keeps its camera on that role the whole time.
 */
const activeDestination = ref<TeamDestination>(null)
const shopRole = ref<ChampionRole | 'all'>('all')
const equipCategory = ref<ItemCategory>('weapon')

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

/**
 * Der Übergang, mit dem die Schiene wechselt — normalerweise das Hereingleiten,
 * unter dem Schleier ein harter Schnitt: die Detailseite mountet DAHINTER und
 * wird durch sein Ausblenden aufgedeckt, eine zusätzliche Bewegung wäre erst
 * unsichtbar und dann ein Nachzucken.
 */
const railTransition = computed(() =>
  veilCovering.value && activeDestination.value === null ? 'sdp-instant' : 'sdp-slide',
)

/** Width the board has to subtract to fit itself beside the open rail. */
const sidePanelWidth = computed(() => {
  switch (activeDestination.value) {
    case 'shop':
      return TEAM_SHOP_PANEL_WIDTH
    case 'expedition':
      return TEAM_EXPEDITION_PANEL_WIDTH
    case 'equipment':
      return TEAM_EQUIPMENT_PANEL_WIDTH
  }
  if (selectedRole.value !== null) return TEAM_SIGIL_DETAILS_PANEL_WIDTH
  return synergiesOpen.value ? TEAM_SIGIL_SYNERGIES_PANEL_WIDTH : 0
})

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

function focusSeat(subSlot: number | null, swap = false) {
  focusAlly.value = subSlot
  focusSwap.value = swap
  focusToken.value++
}

function selectRole(index: number) {
  synergiesOpen.value = false
  activeDestination.value = null
  // Geht die Spalte NEU auf, während das Board noch aufbaut, übernimmt der
  // Ladeschleier ihren Platz — steht das Board schon, mountet sie sofort.
  const opening = selectedRole.value === null
  selectedRole.value = index
  focusSeat(null)
  uiStore.setRolesActiveSlot(index)
  if (opening && !boardBuilt.value) startDetailsLoad()
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
  selectedRole.value = null
}

/** Empty board clicked — dismisses whatever the rail is showing, one layer at a
 *  time: equipment falls back to the page that opened it, everything else
 *  closes the rail outright. */
function dismissPanels() {
  if (activeDestination.value === 'equipment') {
    activeDestination.value = null
    return
  }
  activeDestination.value = null
  selectedRole.value = null
  synergiesOpen.value = false
}

// ── Rail destinations ────────────────────────────────────────────────────────
/** Shop and expeditions replace whatever the rail holds — see activeDestination. */
function openDestination(destination: Exclude<TeamDestination, null | 'equipment'>) {
  selectedRole.value = null
  synergiesOpen.value = false
  activeDestination.value = destination
}

function openShop(role: ChampionRole | 'all' = 'all') {
  shopRole.value = role
  openDestination('shop')
}

function openExpedition() {
  openDestination('expedition')
}

/**
 * The board's two entrances toggle: clicking the button whose rail is already
 * up closes it again, so the same button both opens and dismisses. Only from
 * the BOARD — openShop(role) coming from a role card is a request for a
 * specific role and must never be answered by closing anything.
 */
function toggleShop() {
  if (activeDestination.value === 'shop') closeDestination()
  else openShop('all')
}

function toggleExpedition() {
  if (activeDestination.value === 'expedition') closeDestination()
  else openExpedition()
}

/** Which board entrance is currently showing its rail — lights that button. */
const boardActiveAction = computed<'shop' | 'expedition' | null>(() =>
  activeDestination.value === 'shop' || activeDestination.value === 'expedition'
    ? activeDestination.value
    : null,
)

function openSynergies() {
  activeDestination.value = null
  selectedRole.value = null
  synergiesOpen.value = true
}

/** Opened from the details page — keeps `selectedRole`, so closing returns there. */
function openEquipment(category: ItemCategory) {
  equipCategory.value = category
  activeDestination.value = 'equipment'
}

function closeDestination() {
  activeDestination.value = null
}

/** A champion picked in the details page's inline picker. */
function assignChampion(subSlot: number, champion: string) {
  if (subSlot === -1) {
    battleStore.setHeaderSlot(roleIndex.value, champion)
  } else {
    battleStore.setSecondarySlot(roleIndex.value, subSlot, champion)
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

function handleEquipFromPicker(itemId: string, category: ItemCategory) {
  if (currentEquipment.value[category] === itemId) {
    itemStore.unequipItem(roleIndex.value, category)
  } else {
    itemStore.equipItem(roleIndex.value, itemId)
  }
}

function handleShopRoleChange(role: ChampionRole | 'all') {
  shopRole.value = role
  if (role !== 'all') {
    const idx = ROLE_INDEX[role]
    if (idx !== undefined) uiStore.setRolesActiveSlot(idx)
  }
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

  // Steht die Spalte schon, ist nichts einzublenden — nur ihr Inhalt wechselt.
  const opening = selectedRole.value === null
  // Die Auswahl fällt SOFORT, nicht erst nach dem Laden: sie bestimmt die
  // Breite der Schiene und damit die Kamera des Boards. Beides muss vom ersten
  // Frame an stimmen, sonst rückt das Board beim Aufdecken noch einmal nach.
  selectedRole.value = slot
  focusSeat(subSlot < 0 ? null : subSlot, subSlot >= 0)

  // Kam die Anfrage aus dem Command Panel, wird der Tab im selben Flush
  // sichtbar — hier entsteht ALLES neu, also deckt der Schleier auch das Board
  // ab und gibt am Ende einen fertigen Tab frei (siehe veilScope).
  if (opening && !boardBuilt.value) startDetailsLoad('tab')
}

watch(() => uiStore.rolesOpenToken, applyRolesOpenRequest)

watch(
  () => uiStore.pendingChampionSearch,
  (name) => {
    if (!name) return
    const roles = getChampionRoles(name)
    openShop(roles.length > 0 ? roles[0] : 'all')
  },
  { immediate: true },
)

/** True while the shop rail shows a card's detail over its grid. */
const shopDetailOpen = ref(false)
/** Bumped to ask the shop to leave that detail (Escape), see `closeDetailToken`. */
const closeShopDetailToken = ref(0)

// Escape unwinds one layer at a time: the shop's detail, the details page's own
// picker, then whatever the rail is showing. Only this handler listens for the
// key — both of those live in children, so the request travels down as a token
// rather than as a second window listener racing this one.
function onEsc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (activeDestination.value === 'shop' && shopDetailOpen.value) {
    closeShopDetailToken.value++
  } else if (activeDestination.value !== null) {
    closeDestination()
  } else if (swapOpen.value) {
    closeSwapToken.value++
  } else if (synergiesOpen.value) {
    synergiesOpen.value = false
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
  veilCovering.value = false
  // `boardBuilt` bleibt bewusst stehen: was einmal gebaut ist, ist gebaut. Das
  // Wiedereinblenden kostet zwei Frames (gemessen 42 ms längster Frame gegen
  // 308 ms beim ersten Mal) — dafür braucht es keinen Schleier mehr.
  selectedRole.value = null
  synergiesOpen.value = false
  activeDestination.value = null
  searchHighlights.value = []
  hoveredAllySub.value = null
  boardHoveredAlly.value = null
  focusAlly.value = null
  focusSwap.value = false
  swapOpen.value = false
  shopDetailOpen.value = false
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
      :selected-role="selectedRole"
      :mount-stage="mountStage"
      :side-panel-width="sidePanelWidth"
      :search-highlights="searchHighlights"
      :hovered-ally="spotlightAlly"
      :active-action="boardActiveAction"
      @select-role="selectRole"
      @select-ally="selectAlly"
      @hover-ally="boardHoveredAlly = $event"
      @open-shop="toggleShop"
      @open-expedition="toggleExpedition"
      @open-synergies="openSynergies"
      @deselect="dismissPanels"
    />

    <!-- ══ RIGHT — the one rail: board destination, role details or synergies ══
         One Transition for all of them, so opening the shop while the details
         page is up is a single slide, not a close followed by an open. -->
    <Transition :name="railTransition" mode="out-in">
      <TeamSidePanelShell
        v-if="activeDestination === 'shop'"
        key="shop"
        title="Shop"
        icon="game-icons:shopping-bag"
        :width="TEAM_SHOP_PANEL_WIDTH"
        hide-header
        @close="closeDestination"
      >
        <!-- Unified shop: champions + items in one grid, the card detail slides
             in over it (the rail has no room for a permanent detail column).
             Neither a title stripe nor a close button — the search row is the
             top of the rail, and the rail closes the way the details page does:
             a click on the board it stands in front of, or Escape. -->
        <ChampionShopComponent
          :initial-role="shopRole"
          :close-detail-token="closeShopDetailToken"
          @role-change="handleShopRoleChange"
          @detail-state="shopDetailOpen = $event"
        />
      </TeamSidePanelShell>

      <TeamSidePanelShell
        v-else-if="activeDestination === 'expedition'"
        key="expedition"
        title="Expeditions"
        icon="game-icons:campfire"
        :width="TEAM_EXPEDITION_PANEL_WIDTH"
        hide-header
        @close="closeDestination"
      >
        <!-- Same deal as the shop: no title stripe and no ✕. The command bar
             with the ledger rank is the top of the rail, and a second press on
             the Expedition button closes it again. -->
        <ExpeditionComponent />
      </TeamSidePanelShell>

      <TeamSidePanelShell
        v-else-if="activeDestination === 'equipment'"
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

      <SigilDetailsPanel
        v-else-if="selectedRole !== null && panelReady && !detailsPending"
        key="details"
        :role-index="selectedRole"
        :highlighted-ally="boardHoveredAlly"
        :focus-ally="focusAlly"
        :focus-token="focusToken"
        :focus-swap="focusSwap"
        :close-swap-token="closeSwapToken"
        @assign="assignChampion"
        @clear-ally="clearAlly"
        @pick-equipment="openEquipment"
        @hover-ally="hoveredAllySub = $event"
        @swap-state="swapOpen = $event"
      />
      <TeamSynergiesPanel
        v-else-if="synergiesOpen && panelReady"
        key="synergies"
        @close="synergiesOpen = false"
        @highlight="searchHighlights = $event"
      />
    </Transition>

    <!-- ══ Ladeschleier der Detailspalte ══
         Sitzt IM Flex-Fluss und belegt exakt die Breite der Seite, die gleich
         kommt: das Board rechnet seine Kamera also vom ersten Frame an mit dem
         endgültigen Layout, und nichts rückt beim Aufdecken noch einmal nach.
         Beim Verschwinden verlässt er den Fluss (siehe .sdv-leave-active), die
         Seite nimmt seinen Platz im SELBEN Frame ein — es gibt keinen Frame
         ohne Schiene, in dem das Board kurz breiter würde. -->
    <Transition name="sdv" @after-leave="veilCovering = false">
      <TeamTabLoader
        v-if="detailsVeilVisible"
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
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #111008; /* same deep-space base as Shop / Planets / Skill Tree */
}
/* rail slide-in — shared by the details page, the synergies panel and every
   board destination, so they all enter and leave on the same motion */
.sdp-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
