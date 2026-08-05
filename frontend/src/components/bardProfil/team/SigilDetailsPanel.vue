<script lang="ts">
import { ref } from 'vue'

/**
 * Is the roster strip unfolded? Module scope, not component state: the details
 * page is destroyed whenever another destination takes the rail (shop,
 * expeditions, equipment) and rebuilt on the way back — and a drawer that
 * springs open again every time you fetch an item is not a drawer. One choice,
 * kept for the session.
 */
const sharedRosterOpen = ref(true)
</script>

<script setup lang="ts">
/**
 * The role details page of the team tab — everything about one slot on one
 * surface. It used to hand progression (levels, perks, costs) off to a modal;
 * that modal is gone, so this panel is now two-column and twice as wide:
 *
 *   roster strip   a large captain card for the main plus the bench beside it —
 *                  a click switches which champion the page describes
 *   left column    the subject's portrait, XP, ascension and the Level Up button
 *   right column   stats, perks, role abilities and the role's equipment
 *
 * Subject vs role: the roster switches which CHAMPION the left column and the
 * stats/perks describe, while role abilities and equipment belong to the SLOT
 * and never change with it. Two scopes, so both are labelled.
 *
 * Swapping happens HERE too, not in a modal over the page: clicking the
 * portrait turns both columns into the picker — the compare column on the left,
 * the champion grid on the right — while the roster strip stays put and keeps
 * naming the seat being filled. See swapOpen.
 */
// `ref` is imported by the plain <script> block above — both blocks compile into
// one module, so a second import of the same binding is a duplicate, not a scope.
import { computed, watch, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useSkinStore } from '@/stores/champions/skinStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useActionToast } from '@/composables/ui/useActionToast'
import {
  ascensionRank,
  perkChoicesFor,
  statEffectLabel,
  CHAMPION_STATS,
  PERK_BY_ID,
} from '@/config/champions/championLevels'
import {
  ROLES,
  ALLIES_PER_ROLE,
  SWORN_ALLY_COUNT,
  SWORN_STAT_SHARE,
  SWORN_ICON,
  SKIN_ORIGINAL,
  SKIN_THUMB_MIN_WIDTH,
  SKIN_GRID_BASIS,
  SKIN_GRID_MIN,
  SKIN_GRID_BASIS_COMPACT,
  SKIN_GRID_MIN_COMPACT,
  SKIN_GRID_BASIS_LARGE,
  SKIN_GRID_MIN_LARGE,
  SKIN_GRID_BASIS_CHOOSING,
  SKIN_GRID_MIN_CHOOSING,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_DETAILS_LEFT_WIDTH,
  TEAM_SIGIL_MAIN_CHIP_WIDTH,
  TEAM_SIGIL_MAIN_PORTRAIT_WIDTH,
  TEAM_SIGIL_ROSTER_RAIL_HEIGHT,
  TEAM_SIGIL_ROSTER_DOT_MAIN,
  TEAM_SIGIL_ROSTER_DOT_SWORN,
  TEAM_SIGIL_ROSTER_DOT_ALLY,
  TEAM_SIGIL_ROSTER_DOT_MAIN_RATIO,
  TEAM_SIGIL_ROSTER_GRIP_WIDTH,
  TEAM_SIGIL_ROSTER_FOLD_MS,
  SIGIL_CHIP_HOVER_DIM_OPACITY,
  SIGIL_CHIP_HOVER_SWEEP_MS,
  TEAM_SIGIL_SPLASH_HEIGHT,
  TEAM_SIGIL_SPLASH_HEIGHT_COMPACT,
  TEAM_SIGIL_SPLASH_MAX_SHARE,
  ORBIT_ROLE_ABILITIES,
  OBJECTIVE_ROLE_ABILITIES,
  CHAMPION_PERK_INTERVAL,
  CHAMPION_XP_BAR_HEIGHT,
  CHAMPION_REGALIA_SIZE_ALLY,
  CHAMPION_REGALIA_SIZE_SPLASH,
  CHAMPION_REGALIA_SIZE_SPLASH_MIN,
  CHAMPION_REGALIA_SIZE_SPLASH_MAX,
  CHAMPION_REGALIA_SPLASH_HEIGHT_RATIO,
  CHAMPION_REGALIA_SPLASH_INSET_RATIO,
} from '@/config/constants'
import ChampionLevelBadge from './ChampionLevelBadge.vue'
import ChampionSwapCompare from './swap/ChampionSwapCompare.vue'
import ChampionSwapGrid from './swap/ChampionSwapGrid.vue'
import { allySlotLabel } from '@/utils/ui/format'
import {
  getChampionSkins,
  formatSkinName,
  getSkinImagePath,
  getOriginalPreviewPath,
} from '@/utils/game/champions'
import { getChampionTier } from '@/config/champions/championTiers'
import { getChampionOrigin, getOriginColor, ORIGIN_SYNERGIES } from '@/config/champions/championOrigins'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/champions/championTraits'
import { SHOP_ITEMS } from '@/config/economy/items'
import { MATERIALS } from '@/config/economy/materials'
import type { ItemCategory, ShopItem, ChampionStatKey, ChampionPerkDef } from '@/types'

const props = defineProps<{
  roleIndex: number
  /** Ally sub-slot hovered on the sigil board — its roster chip lights up here. */
  highlightedAlly?: number | null
  /** Seat the page should open on, set by a click on a board satellite.
   *  null = the role's main champion. */
  focusAlly?: number | null
  /** Bumped with every focus request. Without it, clicking the same satellite a
   *  second time would not re-focus it once the page had moved on to another
   *  chip — the sub-slot alone would not have changed. */
  focusToken?: number
  /** Open the picker straight away on that seat — an empty satellite on the
   *  board, or a command-panel request, has already asked the question. */
  focusSwap?: boolean
  /** Bumped by the tab when Escape should leave the picker rather than close
   *  the page. Only the tab listens for keys, so the request travels as a token
   *  instead of a second window listener racing the first. */
  closeSwapToken?: number
}>()

const emit = defineEmits<{
  /** Champion picked in the inline picker for `subSlot` (-1 = the main seat). */
  assign: [subSlot: number, champion: string]
  'clear-ally': [subSlot: number]
  'pick-equipment': [category: ItemCategory]
  /** Hovered ally chip — mirrored as a spotlight on the sigil board (null = none). */
  'hover-ally': [subSlot: number | null]
  /** The picker opened or closed — the tab routes Escape by it. */
  'swap-state': [open: boolean]
}>()

const panelWidthPx = `${TEAM_SIGIL_DETAILS_PANEL_WIDTH}px`
/**
 * Level medallion, sized off the splash it sits on.
 *
 * Measured rather than derived from the viewport: the splash takes whatever
 * height the left column has spare, which depends on the window AND on what
 * else the column is showing. A vh formula would have to guess at that; the
 * observer knows. The inset follows the same number, so the corner clearance
 * that keeps the regalia out of the clip edge holds at every size.
 */
const splashEl = ref<HTMLElement | null>(null)
/** 0 until the observer has reported once — see splashBadgeSize. */
const splashHeight = ref(0)
let splashObserver: ResizeObserver | null = null

// Bound to the element rather than to the mount: the splash is unmounted while
// the inline picker is open, and the page can even OPEN in that state — an
// observer wired once at mount would attach to nothing and never measure again.
watch(splashEl, (el) => {
  splashObserver?.disconnect()
  splashObserver = null
  if (!el || typeof ResizeObserver === 'undefined') return
  splashObserver = new ResizeObserver((entries) => {
    const h = entries[0]?.contentRect.height
    if (h) splashHeight.value = h
  })
  splashObserver.observe(el)
})
onBeforeUnmount(() => {
  splashObserver?.disconnect()
  splashObserver = null
})

const splashBadgeSize = computed(() => {
  // Before the first measurement the authored Full HD size stands in, so the
  // badge never renders at a placeholder size and then jumps.
  if (!splashHeight.value) return CHAMPION_REGALIA_SIZE_SPLASH
  return Math.round(
    Math.min(
      CHAMPION_REGALIA_SIZE_SPLASH_MAX,
      Math.max(
        CHAMPION_REGALIA_SIZE_SPLASH_MIN,
        splashHeight.value * CHAMPION_REGALIA_SPLASH_HEIGHT_RATIO,
      ),
    ),
  )
})
/** Corner inset that keeps every opaque regalia layer clear of the clip edge. */
const splashBadgeInsetPx = computed(
  () => `${Math.round(splashBadgeSize.value * CHAMPION_REGALIA_SPLASH_INSET_RATIO)}px`,
)
const skinThumbMinWidthPx = `${SKIN_THUMB_MIN_WIDTH}px`
const skinGridBasisPx = `${SKIN_GRID_BASIS}px`
const skinGridMinPx = `${SKIN_GRID_MIN}px`
const skinGridBasisCompactPx = `${SKIN_GRID_BASIS_COMPACT}px`
const skinGridMinCompactPx = `${SKIN_GRID_MIN_COMPACT}px`
const skinGridBasisLargePx = `${SKIN_GRID_BASIS_LARGE}px`
const skinGridMinLargePx = `${SKIN_GRID_MIN_LARGE}px`
const skinGridBasisChoosingPx = `${SKIN_GRID_BASIS_CHOOSING}px`
const skinGridMinChoosingPx = `${SKIN_GRID_MIN_CHOOSING}px`
const leftWidthPx = `${TEAM_SIGIL_DETAILS_LEFT_WIDTH}px`
const splashHeightPx = `${TEAM_SIGIL_SPLASH_HEIGHT}px`
const splashHeightCompactPx = `${TEAM_SIGIL_SPLASH_HEIGHT_COMPACT}px`
const splashMaxShare = `${TEAM_SIGIL_SPLASH_MAX_SHARE}%`
const xpBarHeightPx = `${CHAMPION_XP_BAR_HEIGHT}px`
const mainChipWidthPx = `${TEAM_SIGIL_MAIN_CHIP_WIDTH}px`
const mainPortraitWidthPx = `${TEAM_SIGIL_MAIN_PORTRAIT_WIDTH}px`
const chipDimOpacity = String(SIGIL_CHIP_HOVER_DIM_OPACITY)
const chipSweepMs = `${SIGIL_CHIP_HOVER_SWEEP_MS}ms`
const railHeightPx = `${TEAM_SIGIL_ROSTER_RAIL_HEIGHT}px`
const railDotMainPx = `${TEAM_SIGIL_ROSTER_DOT_MAIN}px`
const railDotMainWidthPx = `${Math.round(TEAM_SIGIL_ROSTER_DOT_MAIN * TEAM_SIGIL_ROSTER_DOT_MAIN_RATIO)}px`
const railDotSwornPx = `${TEAM_SIGIL_ROSTER_DOT_SWORN}px`
const railDotAllyPx = `${TEAM_SIGIL_ROSTER_DOT_ALLY}px`
const gripWidthPx = `${TEAM_SIGIL_ROSTER_GRIP_WIDTH}px`
const foldMs = `${TEAM_SIGIL_ROSTER_FOLD_MS}ms`

const battleStore = useBattleStore()
const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const itemStore = useItemStore()
const skinStore = useSkinStore()
const levelStore = useChampionLevelStore()
const { showToast } = useActionToast()

const { headerSlots, secondarySlots } = storeToRefs(battleStore)

const roleDef = computed(() => ROLES[props.roleIndex])
const main = computed(() => headerSlots.value[props.roleIndex])
const allies = computed(
  () => secondarySlots.value[props.roleIndex] ?? Array<string | null>(ALLIES_PER_ROLE).fill(null),
)

// ── Subject: which champion of the slot the page is describing ───────────────
// -1 = the role's main champion, 0…n = that ally sub-slot. An empty ally is
// never the subject — clicking its chip opens the picker instead.
const MAIN_SUBJECT = -1
// Opens on whatever seat the caller asked for — the board hands one over when a
// satellite was clicked, and nothing when a role node was.
const subject = ref(props.focusAlly ?? MAIN_SUBJECT)

// ── Swap: the picker, inline ─────────────────────────────────────────────────
// Both columns switch — compare on the left, grid on the right — while the
// roster strip above them stays exactly where it is, so the seat being filled
// never leaves the screen and switching seats mid-pick is one click.
const swapOpen = ref(!!props.focusSwap)
/** Card under the cursor in the grid. Sticky: it survives the pointer leaving
 *  the grid, so the comparison can be read and the Assign button reached. */
const candidate = ref<string | null>(null)

watch(swapOpen, (open) => emit('swap-state', open), { immediate: true })

function openSwap(seat: number) {
  subject.value = seat
  candidate.value = null
  swapOpen.value = true
}
function closeSwap() {
  swapOpen.value = false
  candidate.value = null
}
// Escape reaches the page through the tab's key handler — see closeSwapToken.
watch(
  () => props.closeSwapToken,
  () => closeSwap(),
)

// One watcher owns every reset of the subject: a role change on its own falls
// back to the main, a focus request names the seat to open on. Watching the
// token as well is what makes a repeated click on the same satellite land.
watch(
  () => [props.roleIndex, props.focusToken] as const,
  () => {
    subject.value = props.focusAlly ?? MAIN_SUBJECT
    candidate.value = null
    swapOpen.value = !!props.focusSwap
  },
)
// An ally that gets cleared (or a role that loses its bench) falls back to main
// — unless the picker is open ON that seat, which is the one case where an
// empty sub-slot is exactly where the page belongs.
watch(allies, (rows) => {
  if (swapOpen.value) return
  if (subject.value !== MAIN_SUBJECT && !rows[subject.value]) subject.value = MAIN_SUBJECT
})

/** The champion the left column and the stats/perks describe — null = empty slot. */
const champion = computed(() =>
  subject.value === MAIN_SUBJECT ? main.value : (allies.value[subject.value] ?? null),
)
const championImage = computed(() =>
  champion.value ? battleStore.getChampionImage(champion.value) : '',
)

function selectSubject(index: number) {
  // While the picker is open the strip retargets it rather than leaving it —
  // it is the seat rail of this picker, so filling a whole role is one click
  // per seat with the grid and the comparison staying put.
  if (swapOpen.value) {
    subject.value = index
    candidate.value = null
    return
  }
  // an empty ally chip has nothing to show — go straight to the picker
  if (index !== MAIN_SUBJECT && !allies.value[index]) {
    openSwap(index)
    return
  }
  subject.value = index
}

/** The splash doubles as the swap button for whichever slot is in focus. */
function swapSubject() {
  openSwap(subject.value)
}

/** Seat name as the roster strip writes it — the picker's header repeats it. */
const subjectSeatLabel = computed(() =>
  subject.value === MAIN_SUBJECT ? 'Main' : allySlotLabel(subject.value),
)

function assignChampion(name: string) {
  emit('assign', subject.value, name)
  closeSwap()
}

// ── Roster ───────────────────────────────────────────────────────────────────
// The bench is not flat: the first SWORN_ALLY_COUNT sub-slots are sworn and lend
// the main a share of their own stats, so they get their own row, their own size
// and their own mark. The rest stay the headcount bench below them.
interface AllySlot {
  sub: number
  name: string | null
  label: string
}
const swornSlots = computed<AllySlot[]>(() =>
  allies.value.slice(0, SWORN_ALLY_COUNT).map((name, sub) => ({
    sub,
    name,
    label: allySlotLabel(sub),
  })),
)
const benchSlots = computed<AllySlot[]>(() =>
  allies.value.slice(SWORN_ALLY_COUNT).map((name, i) => ({
    sub: SWORN_ALLY_COUNT + i,
    name,
    label: allySlotLabel(SWORN_ALLY_COUNT + i),
  })),
)
/** Percentage the sworn share is worth — printed, never hard-coded in a string. */
const swornSharePct = computed(() => Math.round(SWORN_STAT_SHARE * 100))

// ── Roster fold ──────────────────────────────────────────────────────────────
// The strip is the tallest fixed thing on the page and, once a role is staffed,
// the least often needed: you set the seats, then you spend your time in the
// columns underneath. So it folds, and what it folds down to is not nothing —
// a rail that keeps answering the two questions the strip answers all the time:
// whose stats are being printed, and how do I get to another seat.
const rosterOpen = sharedRosterOpen

/** Every seat of the slot in strip order — the folded rail draws one dot each. */
interface RailSeat {
  sub: number
  name: string | null
  label: string
  sworn: boolean
}
const railSeats = computed<RailSeat[]>(() => [
  { sub: MAIN_SUBJECT, name: main.value, label: 'Main', sworn: false },
  ...allies.value.map((name, sub) => ({
    sub,
    name,
    label: allySlotLabel(sub),
    sworn: sub < SWORN_ALLY_COUNT,
  })),
])
/**
 * Dot portrait. 'md' — the -256 step — for every tier, including the 30px bench
 * dot the table would put on -128: the rail shows the SAME six champions the
 * strip's portraits do, and those are already 'md'. A second step here would be
 * a second download and a second decode of the same motif instead of a cache
 * hit (CLAUDE.md → "Zwei Stellen, dieselben Champions → dieselbe Stufe").
 */
function railDotImage(name: string): string {
  return battleStore.getChampionImage(name, { size: 'md' })
}

/**
 * A satellite on the sigil board is under the cursor — the strip answers with a
 * spotlight: that seat's card lights up and every OTHER card of the strip pulls
 * back, the captain included. Pointing at a champion out on the board and having
 * to hunt for its card in a row of four equally lit ones was the whole problem;
 * dimming the rest is what turns the mirror into an answer.
 *
 * The board does the same in reverse (SIGIL_ALLY_HOVER_* → sigil-ally--spotlight
 * / --dimmed), so both surfaces speak one language: one lit, the rest quiet.
 */
const boardSpotlight = computed(
  () => props.highlightedAlly !== null && props.highlightedAlly !== undefined,
)

function allyImage(ally: string): string {
  return battleStore.getChampionImage(ally, { size: 'md' })
}

/**
 * Backdrop splash of a roster card. Every seat wears one, so a card is a card at
 * all three sizes instead of the captain being a card and the rest being rows.
 *
 * The variant follows the card's WIDTH, which is what `object-fit: cover` scales
 * a wide splash by inside a short box: the sworn pair measures ~303px and takes
 * the original, the bench ~199px and takes 'lg'. The captain keeps the original
 * it already used.
 */
function chipArtImage(name: string, wide: boolean): string {
  return battleStore.getChampionImage(name, { size: wide ? 'full' : 'lg' })
}

// ── Identity ─────────────────────────────────────────────────────────────────
const tier = computed(() => (champion.value ? getChampionTier(champion.value) : null))
const origin = computed(() => (champion.value ? getChampionOrigin(champion.value) : null))
const originColor = computed(() => getOriginColor(champion.value))
const originIcon = computed(() =>
  origin.value
    ? ((ORIGIN_SYNERGIES as Record<string, { icon: string } | undefined>)[origin.value]?.icon ?? '')
    : '',
)
const traits = computed(() => (CHAMPION_TRAITS[champion.value ?? ''] ?? []).map((id) => TRAIT_BY_ID[id]))

const equippedSkin = computed(() =>
  champion.value ? skinStore.getSelectedSkin(champion.value) : SKIN_ORIGINAL,
)

/**
 * The gallery itself, right in the column — the default look first, then every
 * bundled alternate. Equipping used to mean opening a modal over the page you
 * were already reading; here the choice sits next to the portrait it changes,
 * and a pick is one click.
 *
 * Art size is 'lg' (the 512px variant): the cards render at SKIN_THUMB_MIN_WIDTH
 * or a little above, which the resolution table puts in the 111–220px band, and
 * every card shows the same champion, so one variant serves the whole grid.
 */
const skinEntries = computed(() => {
  const name = champion.value
  if (!name) return []
  const original = {
    id: SKIN_ORIGINAL,
    label: formatSkinName(SKIN_ORIGINAL),
    image: getOriginalPreviewPath(name, 'lg'),
  }
  const alternates = getChampionSkins(name)
    .filter((s) => s !== SKIN_ORIGINAL)
    .map((s) => ({ id: s, label: formatSkinName(s), image: getSkinImagePath(name, s, 'lg') }))
  return [original, ...alternates]
})

function equipSkin(id: string, label: string) {
  const name = champion.value
  if (!name || id === equippedSkin.value) return
  skinStore.setSkin(name, id)
  showToast(`${name}: ${label} equipped!`)
}

// ── Progression ──────────────────────────────────────────────────────────────
const level = computed(() => (champion.value ? levelStore.levelOf(champion.value) : 1))
const cap = computed(() => levelStore.levelCap)
const atCap = computed(() => level.value >= cap.value)
const nextLevel = computed(() => level.value + 1)
const rank = computed(() => ascensionRank(level.value))
const xpBar = computed(() =>
  champion.value ? levelStore.xpBarOf(champion.value) : { current: 0, needed: 1, pct: 0, capped: false },
)
const cost = computed(() =>
  champion.value ? levelStore.costOf(champion.value) : { chimes: 0, materials: {} },
)
const canLevel = computed(() => !!champion.value && levelStore.canLevelUp(champion.value))

/** Banked XP or an unspent perk — the medallion pings, exactly as on the board. */
function needsAttentionOf(name: string): boolean {
  return levelStore.needsAttention(name)
}
function levelOf(name: string): number {
  return levelStore.levelOf(name)
}

const materialCosts = computed(() =>
  Object.entries(cost.value.materials).map(([id, qty]) => ({
    id,
    qty,
    owned: inventoryStore.collectedMaterials[id] ?? 0,
    def: MATERIALS.find((m) => m.id === id) ?? null,
  })),
)
const affordsChimes = computed(() => gameStore.chimes >= cost.value.chimes)

function doLevelUp() {
  const name = champion.value
  if (!name) return
  if (!levelStore.levelUp(name)) return
  showToast(`${name} reached level ${levelStore.levelOf(name)}!`)
}

// ── Stats ────────────────────────────────────────────────────────────────────
// The tiles print what the champion actually fights with — for a main that
// includes what its sworn allies lend it, shown on its own line so the two are
// never confused. An ally lends rather than receives, so its tiles stay plain.
const stats = computed(() =>
  champion.value ? levelStore.effectiveStatsOf(champion.value) : null,
)
const swornBonus = computed(() =>
  champion.value ? levelStore.swornBonusOf(champion.value) : null,
)
const hasSwornBonus = computed(
  () => !!swornBonus.value && Object.values(swornBonus.value).some((v) => v > 0),
)
const cooldownRush = computed(() =>
  champion.value ? levelStore.perkEffectOf(champion.value, 'cooldownRush') : 0,
)
function statEffectOf(key: ChampionStatKey): string {
  if (!stats.value) return ''
  return statEffectLabel(key, stats.value[key], cooldownRush.value)
}
/**
 * The champion's own best stat. The four share one scale, so a bar drawn against
 * this peak answers "what is this champion FOR?" without a second number — the
 * tallest bar is the lean. Against the subject rather than a global ceiling on
 * purpose: levels have no cap worth drawing a bar to, and a bar that never fills
 * teaches nothing.
 */
const statPeak = computed(() => {
  const s = stats.value
  if (!s) return 0
  return Math.max(...CHAMPION_STATS.map((d) => s[d.key]))
})
function statShare(key: ChampionStatKey): number {
  if (!stats.value || statPeak.value <= 0) return 0
  return stats.value[key] / statPeak.value
}

// ── Perks ────────────────────────────────────────────────────────────────────
const perkChoices = computed(() =>
  champion.value ? levelStore.perkChoicesOf(champion.value) : [],
)
/** Milestone level of the unspent choice, if there is one. */
const pendingPerkLevel = computed(
  () => levelStore.pendingPerks.find((p) => p.champion === champion.value)?.level ?? null,
)

/**
 * The champion's whole perk path, not just what it owns: one slot per milestone
 * the cap allows, so a level-12 champion can already see what the ladder holds.
 * A slot is taken, open (an unspent choice waiting) or still locked.
 */
interface PerkSlot {
  level: number
  perk: ChampionPerkDef | null
  state: 'taken' | 'open' | 'locked'
  /** Milestone already passed with nothing taken — its pool ran dry. */
  exhausted: boolean
}
const perkPath = computed<PerkSlot[]>(() => {
  if (!champion.value) return []
  const taken = levelStore.progressOf(champion.value).perks
  const ownedIds = Object.values(taken)
  const slots: PerkSlot[] = []
  for (let l = CHAMPION_PERK_INTERVAL; l <= cap.value; l += CHAMPION_PERK_INTERVAL) {
    const perk = taken[l] ? (PERK_BY_ID[taken[l]] ?? null) : null
    slots.push({
      level: l,
      perk,
      state: perk ? 'taken' : pendingPerkLevel.value === l ? 'open' : 'locked',
      exhausted: !perk && level.value >= l && perkChoicesFor(l, ownedIds).length === 0,
    })
  }
  return slots
})
const takenPerkCount = computed(() => perkPath.value.filter((s) => s.state === 'taken').length)

/**
 * The path is a RAIL of beads now, not a stack of rows, and one milestone at a
 * time spells itself out underneath it.
 *
 * The stack cost ~220px of a column that has ~550px to give four blocks — five
 * rows, four of them saying nothing but "9 levels to go". The rail says the same
 * thing in one line of beads (the level is on the bead) and spends the saved
 * height on the milestone the player actually cares about, in full.
 *
 * Which one that is: whatever the player last clicked, else the unspent choice
 * (it expires, so it outranks everything), else the newest perk taken, else the
 * next one still ahead.
 */
const clickedPerkLevel = ref<number | null>(null)
/** The milestone with an unspent choice, if any — the loud one. */
const openPerkSlot = computed(() => perkPath.value.find((s) => s.state === 'open') ?? null)
const focusedPerkSlot = computed<PerkSlot | null>(() => {
  const path = perkPath.value
  if (!path.length) return null
  const clicked = path.find((s) => s.level === clickedPerkLevel.value)
  if (clicked) return clicked
  if (openPerkSlot.value) return openPerkSlot.value
  const lastTaken = [...path].reverse().find((s) => s.state === 'taken')
  if (lastTaken) return lastTaken
  return path.find((s) => s.state === 'locked') ?? path[0]
})
// A different champion has a different ladder — the level clicked on the last
// one would land on an unrelated milestone here.
watch(champion, () => {
  clickedPerkLevel.value = null
})

function pickPerk(perkId: string) {
  const name = champion.value
  if (!name) return
  if (!levelStore.choosePerk(name, perkId)) return
  showToast(`${name} learned ${PERK_BY_ID[perkId]?.name ?? perkId}!`)
}

// ── Role scope: abilities + equipment belong to the slot, not the champion ───
const orbitAbility = computed(() => ORBIT_ROLE_ABILITIES[roleDef.value.key])
const objectiveAbility = computed(() => OBJECTIVE_ROLE_ABILITIES[roleDef.value.key])
const equipment = computed(() => itemStore.slotEquipment[props.roleIndex])

const CAT_LABELS: Record<ItemCategory, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  artefact: 'Artefact',
}
const CATEGORIES: ItemCategory[] = ['weapon', 'armor', 'artefact']

function equippedItem(cat: ItemCategory): ShopItem | null {
  const id = equipment.value[cat]
  if (!id) return null
  return SHOP_ITEMS.find((i) => i.id === id) ?? null
}
const equippedCount = computed(() => CATEGORIES.filter((cat) => equipment.value[cat]).length)
</script>

<template>
  <div class="sdp-panel" :style="{ '--rc': roleDef.color, '--rank': rank.color }">
    <!-- ══ roster strip — captain card + bench. No close button: the panel is
         dismissed by clicking the empty sigil board (or Escape), so the whole
         width belongs to the champions.

         It is a drawer, though: the grip down its right edge folds the whole
         strip into .sdp-rail and hands its height to the columns below. ══ -->
    <div class="sdp-roster-shell" :class="{ 'sdp-roster-shell--folded': !rosterOpen }">
    <div class="sdp-roster" :inert="!rosterOpen || undefined">
      <!-- the slot's captain: one large card heading the seat ladder — MAIN,
           then SWORN I / II, then the bench, so all four cards name a SEAT.
           The role itself reads from the card's colour and its tooltip; it does
           not need a word of its own on a panel that is already about one role. -->
      <button
        class="sdp-chip sdp-chip--main"
        :class="{
          'sdp-chip--active': subject === MAIN_SUBJECT,
          'sdp-chip--empty': !main,
          'sdp-chip--dimmed': boardSpotlight,
        }"
        type="button"
        :title="main ? `${main} — ${roleDef.label}` : `Assign ${roleDef.label}`"
        @click="selectSubject(MAIN_SUBJECT)"
        @mouseenter="emit('hover-ally', null)"
      >
        <!-- The captain is a poster, not a row: its splash is the whole tile and
             the seat tag and the name take its two ends. It used to crop the
             same splash a second time into a portrait column and then dim the
             copy behind the text, which left the card's lower right corner as a
             black quarter — a third of the biggest card on the strip, spent on
             nothing. An empty seat still gets the portrait well, because there
             is no art to be the card. -->
        <template v-if="main">
          <img
            :src="battleStore.getChampionImage(main)"
            :alt="main"
            class="sdp-chip-art"
            decoding="async"
          />
          <span class="sdp-chip-art-fade" aria-hidden="true" />
        </template>
        <span v-else class="sdp-chip-portrait">
          <span class="sdp-chip-plus">＋</span>
        </span>
        <span class="sdp-chip-text">
          <span class="sdp-chip-role">Main</span>
          <span class="sdp-chip-name">{{ main ?? 'Empty' }}</span>
        </span>
        <!-- No medallion on the captain. Its level is already the largest thing
             on the page — the splash badge in the left column — and a second
             seal on the card only crowded the art it sat on. The card's rank is
             told by its frame now (see the corner-bracket block in the styles);
             the small seats keep their medallion, which is the only place they
             carry a level at all. -->
      </button>

      <div class="sdp-roster-right">
        <!-- the sworn pair: half the bench's count, so twice its width, plus the
             bond mark and a bigger portrait — these two are read first -->
        <div class="sdp-sworn" @mouseleave="emit('hover-ally', null)">
          <button
            v-for="slot in swornSlots"
            :key="slot.sub"
            class="sdp-chip sdp-chip--sworn"
            :class="{
              'sdp-chip--active': subject === slot.sub,
              'sdp-chip--empty': !slot.name,
              'sdp-chip--highlight': highlightedAlly === slot.sub,
              'sdp-chip--dimmed': boardSpotlight && highlightedAlly !== slot.sub,
            }"
            type="button"
            :title="
              slot.name
                ? `${slot.name} — ${slot.label}, lends ${swornSharePct}% of its stats`
                : `Assign ${slot.label} — lends ${swornSharePct}% of its stats to the main`
            "
            @click="selectSubject(slot.sub)"
            @mouseenter="emit('hover-ally', slot.sub)"
          >
            <!-- same backdrop the captain wears, one size down -->
            <template v-if="slot.name">
              <img
                :src="chipArtImage(slot.name, true)"
                alt=""
                aria-hidden="true"
                class="sdp-chip-art"
                decoding="async"
              />
              <span class="sdp-chip-art-fade" aria-hidden="true" />
            </template>
            <span class="sdp-chip-portrait">
              <img
                v-if="slot.name"
                :src="allyImage(slot.name)"
                :alt="slot.name"
                class="sdp-chip-img"
                decoding="async"
              />
              <span v-else class="sdp-chip-plus">＋</span>
            </span>
            <span class="sdp-chip-text">
              <!-- no mark: the card's own relief carries the rank, see the
                   "sworn: raised" block in the styles. Tag and share sit on ONE
                   line so the card spends two lines, not three, and the champion
                   name gets the height that buys. -->
              <span class="sdp-chip-tagrow">
                <span class="sdp-chip-role sdp-chip-role--sworn">{{ slot.label }}</span>
                <span class="sdp-chip-note">+{{ swornSharePct }}% stats</span>
              </span>
              <span class="sdp-chip-name">{{ slot.name ?? 'Empty' }}</span>
            </span>
            <ChampionLevelBadge
              v-if="slot.name"
              :level="levelOf(slot.name)"
              :color="roleDef.color"
              :size="CHAMPION_REGALIA_SIZE_ALLY"
              :attention="needsAttentionOf(slot.name)"
              class="sdp-chip-badge"
            />
            <span
              v-if="slot.name"
              class="sdp-chip-clear"
              role="button"
              title="Remove ally"
              @click.stop="emit('clear-ally', slot.sub)"
            >
              ✕
            </span>
            <!-- The glint that arrives WITH the board's cursor — mounted by the
                 highlight itself, so moving from one satellite to the next
                 restarts it on the card that just took over. See .sdp-chip-sweep. -->
            <span
              v-if="highlightedAlly === slot.sub"
              class="sdp-chip-sweep"
              aria-hidden="true"
            />
          </button>
        </div>

        <!-- the bench: headcount only, one size down again -->
        <div class="sdp-bench" @mouseleave="emit('hover-ally', null)">
          <button
            v-for="slot in benchSlots"
            :key="slot.sub"
            class="sdp-chip sdp-chip--ally"
            :class="{
              'sdp-chip--active': subject === slot.sub,
              'sdp-chip--empty': !slot.name,
              'sdp-chip--highlight': highlightedAlly === slot.sub,
              'sdp-chip--dimmed': boardSpotlight && highlightedAlly !== slot.sub,
            }"
            type="button"
            :title="slot.name ? `${slot.name} — ${slot.label}` : `Assign ${slot.label}`"
            @click="selectSubject(slot.sub)"
            @mouseenter="emit('hover-ally', slot.sub)"
          >
            <!-- same backdrop again, at the bench's own width -->
            <template v-if="slot.name">
              <img
                :src="chipArtImage(slot.name, false)"
                alt=""
                aria-hidden="true"
                class="sdp-chip-art"
                decoding="async"
              />
              <span class="sdp-chip-art-fade" aria-hidden="true" />
            </template>
            <span class="sdp-chip-portrait">
              <img
                v-if="slot.name"
                :src="allyImage(slot.name)"
                :alt="slot.name"
                class="sdp-chip-img"
                decoding="async"
              />
              <span v-else class="sdp-chip-plus">＋</span>
            </span>
            <span class="sdp-chip-text">
              <span class="sdp-chip-role">{{ slot.label }}</span>
              <span class="sdp-chip-name">{{ slot.name ?? 'Empty' }}</span>
            </span>
            <ChampionLevelBadge
              v-if="slot.name"
              :level="levelOf(slot.name)"
              :color="roleDef.color"
              :size="CHAMPION_REGALIA_SIZE_ALLY"
              :attention="needsAttentionOf(slot.name)"
              class="sdp-chip-badge"
            />
            <span
              v-if="slot.name"
              class="sdp-chip-clear"
              role="button"
              title="Remove ally"
              @click.stop="emit('clear-ally', slot.sub)"
            >
              ✕
            </span>
            <span
              v-if="highlightedAlly === slot.sub"
              class="sdp-chip-sweep"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>

      <!-- ══ the folded rail — what the strip leaves behind ══
           Left: the SEAT, at title size — Main, Sworn II, Ally 3. The champion's
           own name is already the headline of the card right below the rail, so
           printing it twice within 60px would be the one thing a fold must not
           do; what the columns cannot say for themselves is which of the six
           seats they belong to. Right: one dot per seat, carrying the same
           ladder the cards do (the captain wider, the sworn pair rimmed, the
           bench plain), so switching subject stays ONE click while folded — the
           whole point of leaving a rail rather than nothing. -->
      <div class="sdp-rail" :inert="rosterOpen || undefined">
        <button
          class="sdp-rail-subject"
          type="button"
          title="Unfold the roster"
          @click="rosterOpen = true"
        >
          <span class="sdp-rail-seat">{{ subjectSeatLabel }}</span>
        </button>

        <div class="sdp-rail-dots" @mouseleave="emit('hover-ally', null)">
          <template v-for="seat in railSeats" :key="seat.sub">
            <!-- the captain is followed by a hairline: main | sworn sworn bench… -->
            <span v-if="seat.sub === 0" class="sdp-rail-sep" aria-hidden="true" />
            <button
              class="sdp-rail-dot"
              :class="{
                'sdp-rail-dot--main': seat.sub === MAIN_SUBJECT,
                'sdp-rail-dot--sworn': seat.sworn,
                'sdp-rail-dot--active': subject === seat.sub,
                'sdp-rail-dot--empty': !seat.name,
                'sdp-rail-dot--highlight': highlightedAlly === seat.sub,
                'sdp-rail-dot--dimmed': boardSpotlight && highlightedAlly !== seat.sub,
              }"
              type="button"
              :title="seat.name ? `${seat.name} — ${seat.label}` : `Assign ${seat.label}`"
              @click="selectSubject(seat.sub)"
              @mouseenter="emit('hover-ally', seat.sub === MAIN_SUBJECT ? null : seat.sub)"
            >
              <img
                v-if="seat.name"
                :src="railDotImage(seat.name)"
                :alt="seat.name"
                class="sdp-rail-dot-img"
                decoding="async"
              />
              <span v-else class="sdp-rail-dot-plus" aria-hidden="true">＋</span>
              <!-- No attention pip here. A gold dot is the one thing on this rail
                   that is not in the role's colour, and at 30px it read as damage
                   to the portrait rather than as a mark on it. The medallions in
                   the unfolded strip and on the sigil board already carry it. -->
            </button>
          </template>
        </div>
        <!-- No headcount here. The dots ARE the count: an unfilled seat is a
             dashed square with a ＋ in it, so "4/6" only restated what six
             squares in a row already showed. -->
      </div>

      <!-- the grip: one control for both directions, and the chevron turns over
           rather than being swapped for a second icon — a transform, so the
           fold costs the compositor nothing either way -->
      <button
        class="sdp-fold"
        type="button"
        :aria-expanded="rosterOpen"
        :title="rosterOpen ? 'Fold the roster away' : 'Unfold the roster'"
        @click="rosterOpen = !rosterOpen"
      >
        <Icon icon="lucide:chevron-up" width="26" height="26" class="sdp-fold-chevron" />
      </button>
    </div>

    <!-- ══ two columns ══ -->
    <div class="sdp-cols">
      <!-- ── LEFT — identity and progression of the subject, or, while the
           picker is open, the seated champion against the hovered one ── -->
      <div class="sdp-left">
        <ChampionSwapCompare
          v-if="swapOpen"
          :role-index="roleIndex"
          :sub-slot="subject"
          :seat-label="subjectSeatLabel"
          :current="champion"
          :candidate="candidate"
          @cancel="closeSwap"
          @assign="assignChampion"
        />

        <template v-else>
        <div
          ref="splashEl"
          class="sdp-splash"
          role="button"
          tabindex="0"
          :aria-label="champion ? 'Swap champion' : 'Select champion'"
          @click="swapSubject"
          @keydown.enter.prevent="swapSubject"
          @keydown.space.prevent="swapSubject"
        >
          <template v-if="champion">
            <img :src="championImage" :alt="champion" class="sdp-splash-img" decoding="async" />
            <div class="sdp-splash-fade" />
            <div class="sdp-splash-swap-hint">
              <Icon icon="lucide:arrow-left-right" width="18" height="18" />
              Swap Champion
            </div>
          </template>
          <div v-else class="sdp-splash-empty">
            <img :src="roleDef.image" :alt="roleDef.label" class="sdp-splash-empty-img" />
            <div class="sdp-splash-select-cta">
              <Icon icon="lucide:user-plus" width="18" height="18" />
              Select Champion
            </div>
          </div>

          <!-- Level medallion, alone in the top-left corner. It carries the
               level number, the rank colour and the regalia stage, which is
               everything the "Level x / y RANK" line used to say beside it — so
               that line is gone and this is bigger instead. -->
          <div v-if="champion" class="sdp-splash-badge">
            <ChampionLevelBadge
              :level="level"
              :color="roleDef.color"
              :size="splashBadgeSize"
              :attention="needsAttentionOf(champion)"
            />
          </div>

          <!-- hero footer — who this is, then what they are, then how far along:
               name, the tier/origin/trait chips, and the XP bar as the card's
               base. The chips used to float in the top corner on their own; down
               here they read as a subtitle to the name they describe. -->
          <div class="sdp-splash-bottom">
            <!-- Just the name. Everything about skins — picking one and seeing
                 which one is worn — lives in the gallery at the top of the right
                 column, where the lit card is the answer. -->
            <div class="sdp-name-row">
              <div class="sdp-name">{{ champion ?? 'No Champion' }}</div>
            </div>

            <div v-if="champion" class="sdp-chips">
              <span
                v-if="tier"
                class="sdp-hero-chip"
                :style="{ borderColor: tier.color, color: tier.color }"
              >
                ★{{ tier.starLevel }} {{ tier.name }}
              </span>
              <span
                v-if="origin"
                class="sdp-hero-chip"
                :style="{ borderColor: originColor, color: originColor }"
              >
                <Icon
                  v-if="originIcon.includes(':')"
                  :icon="originIcon"
                  width="15"
                  height="15"
                  class="sdp-hero-chip-icon"
                />
                {{ origin }}
              </span>
              <span
                v-for="trait in traits"
                :key="trait.id"
                class="sdp-hero-chip"
                :style="{ borderColor: trait.color, color: trait.color }"
              >
                <Icon :icon="trait.icon" width="15" height="15" class="sdp-hero-chip-icon" />
                {{ trait.name }}
              </span>
            </div>

            <div v-if="champion" class="sdp-xp">
              <div class="sdp-xp-head">
                <span class="sdp-xp-label">Experience</span>
                <span class="sdp-xp-value">
                  <template v-if="xpBar.capped">
                    Banked {{ $formatNumber(xpBar.current) }}
                  </template>
                  <template v-else>
                    {{ $formatNumber(xpBar.current) }} / {{ $formatNumber(xpBar.needed) }}
                  </template>
                </span>
              </div>
              <div class="sdp-xp-track">
                <div
                  class="sdp-xp-fill"
                  :class="{ 'sdp-xp-fill--ready': xpBar.pct >= 1 }"
                  :style="{ width: `${Math.min(100, xpBar.pct * 100)}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- advance — the primary action, and now the first thing under the XP
             bar it belongs to. It used to sit at the foot of the column with the
             whole perk ladder between it and the bar that says whether you can
             afford it; you read "5K / 120 XP" and then had to travel past five
             milestones to find the button. -->
        <div v-if="champion" class="sdp-advance">
          <!-- Price and label share the button: a price ON a button needs no
               label, because it is self-evidently the price of pressing it. What
               stays outside is only what does NOT fit that sentence — why the
               press is blocked, and what the next level is worth. -->
          <button
            class="sdp-level-btn"
            :class="{ 'sdp-level-btn--locked': !canLevel, 'sdp-level-btn--bare': atCap }"
            :disabled="!canLevel"
            :title="atCap ? 'This champion is at the level cap' : `Cost of level ${nextLevel}`"
            @click="doLevelUp"
          >
            <span class="sdp-level-btn-main">
              <Icon icon="game-icons:circle-sparks" width="22" height="22" />
              <span v-if="atCap">Level Cap Reached</span>
              <span v-else>Level Up to {{ nextLevel }}</span>
            </span>
            <span v-if="!atCap" class="sdp-level-btn-cost">
              <span class="sdp-cost" :class="{ 'sdp-cost--short': !affordsChimes }">
                <!-- the chime itself, same art the header and command panel use;
                     at 19px the 128 variant is the right step -->
                <img
                  src="/img/BardAbilities/BardChime-128.png"
                  alt="Chimes"
                  class="sdp-cost-img"
                />
                <span>{{ $formatNumber(cost.chimes) }}</span>
              </span>
              <span
                v-for="mat in materialCosts"
                :key="mat.id"
                class="sdp-cost"
                :class="{ 'sdp-cost--short': mat.owned < mat.qty }"
                :title="`${mat.def?.name ?? mat.id} — ${mat.owned} in stock`"
              >
                <img v-if="mat.def" :src="mat.def.image" :alt="mat.def.name" class="sdp-cost-img" />
                <span>{{ mat.qty }}</span>
                <span class="sdp-cost-owned">({{ mat.owned }})</span>
              </span>
            </span>
          </button>

          <!-- Nothing under the button any more. What blocks the press is on the
               pills, which turn red on exactly the line you cannot pay; what the
               coming levels are worth is what the perk path in the right column
               lays out bead by bead. Both were being said twice. -->
        </div>

        <!-- equipment — the column's second action. Slot-scoped, so it is the one
             thing here that does NOT change when the roster switches subject. -->
        <div class="sdp-gear">
          <div class="sdp-block sdp-block--equipment">
            <div class="sdp-section-head">
              <span class="sdp-section-accent">✦</span>
              <span class="sdp-section-title">Role Equipment</span>
              <div class="sdp-section-rule" />
              <span class="sdp-section-count">{{ equippedCount }}/{{ CATEGORIES.length }}</span>
            </div>
            <div class="sdp-equips">
              <button
                v-for="cat in CATEGORIES"
                :key="cat"
                class="sdp-equip"
                :class="{
                  'sdp-equip--filled': !!equippedItem(cat),
                  'sdp-equip--empty': !equippedItem(cat),
                }"
                :title="equippedItem(cat)?.name ?? `Equip ${CAT_LABELS[cat]}`"
                @click="emit('pick-equipment', cat)"
              >
                <template v-if="equippedItem(cat)">
                  <img
                    v-if="equippedItem(cat)!.icon.startsWith('/')"
                    :src="equippedItem(cat)!.icon"
                    :alt="equippedItem(cat)!.name"
                    class="sdp-equip-img"
                  />
                  <span v-else class="sdp-equip-emoji">{{ equippedItem(cat)!.icon }}</span>
                  <span class="sdp-equip-name">{{ equippedItem(cat)!.name }}</span>
                </template>
                <!-- An empty slot says so twice over: a dashed rim, the same mark
                     an empty roster seat wears, and a ＋ on the ghost. One glance
                     answers both "is there anything here" and "can I do something
                     about it". -->
                <span v-else class="sdp-equip-ghost">
                  <img
                    :src="`/img/itemShop/${cat}-128.png`"
                    :alt="CAT_LABELS[cat]"
                    class="sdp-equip-img sdp-equip-img--ghost"
                  />
                  <span class="sdp-equip-plus" aria-hidden="true">＋</span>
                </span>
                <span class="sdp-equip-cat">{{ CAT_LABELS[cat] }}</span>
              </button>
            </div>
          </div>
        </div>
        </template>
      </div>

      <!-- ── RIGHT — what the champion IS. Stats, then the perks that shaped
           them, then the kit the seat brings. Nothing here is an action: both
           buttons of this page live in the left column now, so the two sides
           split cleanly into "what you do" and "what you get". ── -->
      <div class="sdp-right" :class="{ 'sdp-right--swap': swapOpen }">
        <!-- the picker's grid — the whole column, so the cards get the width the
             modal used to take from the board -->
        <ChampionSwapGrid
          v-if="swapOpen"
          :role-key="roleDef.key"
          :role-index="roleIndex"
          :sub-slot="subject"
          @select="assignChampion"
          @preview="candidate = $event"
        />

        <template v-else>
        <!-- skins — the appearance block sits first, level with the portrait it
             changes in the left column, so the two read as one thing. Two rows
             show at a time and the rest scrolls: a champion with twelve skins
             must not push the stats off the page. -->
        <div v-if="champion && skinEntries.length > 1" class="sdp-block sdp-block--skins">
          <div class="sdp-section-head">
            <span class="sdp-section-accent">✦</span>
            <span class="sdp-section-title">Skin</span>
            <div class="sdp-section-rule" />
            <span class="sdp-section-count">{{ skinEntries.length }} looks</span>
          </div>
          <div class="sdp-skins">
            <button
              v-for="entry in skinEntries"
              :key="entry.id"
              class="sdp-skin"
              :class="{ 'sdp-skin--on': entry.id === equippedSkin }"
              type="button"
              :title="entry.label"
              :aria-pressed="entry.id === equippedSkin"
              @click="equipSkin(entry.id, entry.label)"
            >
              <img :src="entry.image" :alt="entry.label" class="sdp-skin-img" loading="lazy" />
              <span class="sdp-skin-fade" />
              <!-- One chip per card, and which one it is says everything: gold
                   means "this is the look you wear", green means "click and it
                   becomes it". The green one only appears under the cursor, so a
                   full grid stays a grid of splashes rather than of buttons. -->
              <span v-if="entry.id === equippedSkin" class="sdp-skin-chip sdp-skin-chip--on">
                ✓ Equipped
              </span>
              <span v-else class="sdp-skin-chip sdp-skin-chip--cta">Equip</span>
              <span class="sdp-skin-name">{{ entry.label }}</span>
            </button>
          </div>
        </div>

        <!-- stats -->
        <div v-if="champion && stats" class="sdp-block sdp-block--stats">
          <div class="sdp-section-head">
            <span class="sdp-section-accent">✦</span>
            <span class="sdp-section-title">Stats</span>
            <div class="sdp-section-rule" />
            <span v-if="hasSwornBonus" class="sdp-section-count sdp-section-count--sworn">
              <Icon :icon="SWORN_ICON" width="14" height="14" />
              sworn included
            </span>
            <span v-else class="sdp-section-count">{{ champion }}</span>
          </div>
          <div class="sdp-stats">
            <div
              v-for="stat in CHAMPION_STATS"
              :key="stat.key"
              class="sdp-stat"
              :style="{ '--sc': stat.color }"
              :title="stat.desc"
            >
              <Icon :icon="stat.icon" width="30" height="30" class="sdp-stat-icon" />
              <div class="sdp-stat-body">
                <div class="sdp-stat-top">
                  <span class="sdp-stat-short">{{ stat.short }}</span>
                  <span class="sdp-stat-value">{{ stats[stat.key].toFixed(1) }}</span>
                </div>
                <div class="sdp-stat-effect">
                  {{ statEffectOf(stat.key) }}
                  <span class="sdp-stat-effect-label">{{ stat.effectLabel }}</span>
                </div>
                <!-- what the sworn pair adds, kept apart from the champion's own -->
                <div v-if="swornBonus && swornBonus[stat.key] > 0" class="sdp-stat-sworn">
                  <Icon :icon="SWORN_ICON" width="11" height="11" />
                  +{{ swornBonus[stat.key].toFixed(1) }} sworn
                </div>
              </div>
              <!-- the lean, drawn against the champion's own best stat: four
                   bars, and the long one is what this champion is for. Scaled
                   inline on the fill itself, never through a variable on the
                   tile — a variable would recalculate the whole subtree. -->
              <span class="sdp-stat-meter" aria-hidden="true">
                <span
                  class="sdp-stat-meter-fill"
                  :style="{ transform: `scaleX(${statShare(stat.key)})` }"
                />
              </span>
            </div>
          </div>
        </div>

        <!-- ── perk path — every milestone the cap allows, taken or not, on one
             rail. The beads carry the state (perk sigil / gold medal / level
             number) and the line under them spells out whichever milestone is
             in focus, in full. It sits with the stats because both answer the
             same question: what has this champion become? ── -->
        <div
          v-if="champion"
          class="sdp-block sdp-block--perks"
          :class="{ 'sdp-block--choosing': !!openPerkSlot }"
        >
          <div class="sdp-section-head">
            <span class="sdp-section-accent" :class="{ 'sdp-section-accent--hot': openPerkSlot }">
              ✦
            </span>
            <span class="sdp-section-title" :class="{ 'sdp-section-title--hot': openPerkSlot }">
              Perk Path
            </span>
            <div class="sdp-section-rule" :class="{ 'sdp-section-rule--hot': openPerkSlot }" />
            <span class="sdp-section-count" :class="{ 'sdp-section-count--hot': openPerkSlot }">
              {{ openPerkSlot ? 'Pick one' : `${takenPerkCount}/${perkPath.length}` }}
            </span>
          </div>

          <div class="sdp-path">
            <div class="sdp-path-rail">
              <button
                v-for="slot in perkPath"
                :key="slot.level"
                class="sdp-pnode"
                :class="[
                  `sdp-pnode--${slot.state}`,
                  { 'sdp-pnode--focus': slot.level === focusedPerkSlot?.level },
                ]"
                :style="slot.perk ? { '--pc': slot.perk.color } : undefined"
                type="button"
                :title="slot.perk ? `${slot.perk.name} — ${slot.perk.desc}` : `Level ${slot.level}`"
                @click="clickedPerkLevel = slot.level"
              >
                <span class="sdp-pnode-bead">
                  <Icon
                    v-if="slot.perk"
                    :icon="slot.perk.icon"
                    width="26"
                    height="26"
                    class="sdp-pnode-icon"
                  />
                  <Icon
                    v-else-if="slot.state === 'open'"
                    icon="game-icons:ribbon-medal"
                    width="24"
                    height="24"
                    class="sdp-pnode-icon"
                  />
                  <span v-else class="sdp-pnode-lv">{{ slot.level }}</span>
                </span>
                <!-- A locked bead already IS its level, so the caption under it
                     would say the same thing twice. It carries the distance
                     instead, which is the only thing still unknown about it. -->
                <span v-if="slot.state === 'locked'" class="sdp-pnode-cap">
                  {{ level >= slot.level ? 'open' : `+${slot.level - level}` }}
                </span>
                <span v-else class="sdp-pnode-cap">Lv {{ slot.level }}</span>
              </button>
            </div>

            <!-- the one milestone in focus, spelled out -->
            <div
              v-if="focusedPerkSlot"
              class="sdp-pdetail"
              :class="`sdp-pdetail--${focusedPerkSlot.state}`"
              :style="focusedPerkSlot.perk ? { '--pc': focusedPerkSlot.perk.color } : undefined"
            >
              <template v-if="focusedPerkSlot.perk">
                <div class="sdp-pdetail-name">
                  {{ focusedPerkSlot.perk.name }}
                  <span class="sdp-pdetail-tag">Lv {{ focusedPerkSlot.level }}</span>
                </div>
                <div class="sdp-pdetail-desc">{{ focusedPerkSlot.perk.desc }}</div>
              </template>

              <!-- the open one needs no paragraph: the three cards right below
                   ARE the explanation, and the height a second one would take is
                   height they need -->
              <template v-else-if="focusedPerkSlot.state === 'open'">
                <div class="sdp-pdetail-name sdp-pdetail-name--open">
                  Milestone reached
                  <span class="sdp-pdetail-tag">Lv {{ focusedPerkSlot.level }}</span>
                </div>
              </template>

              <template v-else>
                <div class="sdp-pdetail-name sdp-pdetail-name--locked">
                  Level {{ focusedPerkSlot.level }}
                </div>
                <div class="sdp-pdetail-desc sdp-pdetail-desc--locked">
                  <template v-if="focusedPerkSlot.exhausted">No perk left in this pool</template>
                  <template v-else-if="level >= focusedPerkSlot.level">Choice still open</template>
                  <template v-else>
                    {{ focusedPerkSlot.level - level }} level{{
                      focusedPerkSlot.level - level === 1 ? '' : 's'
                    }}
                    to go
                  </template>
                </div>
              </template>
            </div>

            <!-- the choice, whichever bead is in focus: it expires, so it is
                 never hidden behind a click on the right bead -->
            <div v-if="openPerkSlot" class="sdp-choice">
              <button
                v-for="perk in perkChoices"
                :key="perk.id"
                class="sdp-choice-card"
                :style="{ '--pc': perk.color }"
                type="button"
                :title="perk.desc"
                @click="pickPerk(perk.id)"
              >
                <Icon :icon="perk.icon" width="26" height="26" class="sdp-choice-icon" />
                <span class="sdp-choice-text">
                  <span class="sdp-choice-name">{{ perk.name }}</span>
                  <span class="sdp-choice-desc">{{ perk.desc }}</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- role abilities — belong to the slot, not to the champion in it -->
        <div class="sdp-block sdp-block--abilities">
          <div class="sdp-section-head">
            <span class="sdp-section-accent">✦</span>
            <span class="sdp-section-title">Role Abilities</span>
            <div class="sdp-section-rule" />
            <span class="sdp-section-count">{{ roleDef.label }}</span>
          </div>
          <div class="sdp-ability-cards">
            <div class="sdp-ability-card" :title="orbitAbility.desc">
              <div class="sdp-ability-card-icon">
                <Icon
                  :icon="orbitAbility.icon"
                  width="28"
                  height="28"
                  :style="{ color: roleDef.color }"
                />
              </div>
              <div class="sdp-ability-card-text">
                <div class="sdp-ability-card-tag">Universe</div>
                <div class="sdp-ability-card-name" :style="{ color: roleDef.color }">
                  {{ orbitAbility.name }}
                </div>
                <div class="sdp-ability-card-desc">{{ orbitAbility.desc }}</div>
              </div>
            </div>
            <div class="sdp-ability-card sdp-ability-card--gold" :title="objectiveAbility.desc">
              <div class="sdp-ability-card-icon">
                <Icon :icon="objectiveAbility.icon" width="28" height="28" style="color: #e8c040" />
              </div>
              <div class="sdp-ability-card-text">
                <div class="sdp-ability-card-tag sdp-ability-card-tag--gold">
                  Objective · Baron &amp; Drake
                </div>
                <div class="sdp-ability-card-name" style="color: #e8c040">
                  {{ objectiveAbility.name }}
                </div>
                <div class="sdp-ability-card-desc">{{ objectiveAbility.desc }}</div>
              </div>
            </div>
          </div>
        </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sdp-panel {
  /* fixed-px content designed for 1920×1080 — zoom down on smaller desktops */
  zoom: var(--team-ui-scale, 1);
  width: v-bind(panelWidthPx);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #1a1008, #0d0905);
  border-left: 2px solid #5c3310;
}

/* ══ roster strip ══ */
/* stretch, not center: the captain card runs the full height of both rows.
 *
 * Height is a SHARE of the panel, not the content's own height. The page was
 * laid out at 1920×1080, where the content height is all there is; on a taller
 * desktop the same fixed strip leaves the page short of its own bottom edge.
 * A share fixes that continuously — no breakpoint to fall between — and the two
 * px bounds keep both ends honest: 150px is the height the strip was designed
 * at (Full HD lands on it and nothing moves), 240px is where the captain's
 * splash stops gaining anything from more room.
 *
 * Percentages resolve against the panel, which is stretched to a definite
 * height by the tab's flex row — see .sdp-panel.
 *
 * The shell owns that height, the surface and the fold; .sdp-roster below only
 * lays the cards out inside it. That is why the background and the bottom
 * border live up here — folded, the strip's own box is gone and the rail is
 * what the player sees, but the panel's header edge must not move with it. */
.sdp-roster-shell {
  position: relative;
  flex-shrink: 0;
  height: clamp(150px, 18%, 240px);
  overflow: hidden;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  /* One-shot on a click, never per frame — the only place on this page where a
     layout property is allowed to animate. Everything INSIDE the shell rides
     transform/opacity alongside it, so the frames in between stay cheap. */
  transition: height v-bind(foldMs) cubic-bezier(0.33, 1, 0.68, 1);
}
.sdp-roster-shell--folded {
  height: v-bind(railHeightPx);
}
.sdp-roster {
  height: 100%;
  display: flex;
  align-items: stretch;
  gap: 12px;
  /* the grip claims the right edge — the cards stop short of it rather than
     running underneath */
  padding: 10px calc(v-bind(gripWidthPx) + 8px) 10px 12px;
  transition:
    opacity calc(v-bind(foldMs) * 0.6),
    transform v-bind(foldMs);
}
.sdp-roster-shell--folded .sdp-roster {
  opacity: 0;
  transform: translateY(-16px);
  pointer-events: none;
}

/* ── the folded rail ────────────────────────────────────────────────────────
   Absolute, so it costs the shell no height of its own and the two states can
   cross-fade instead of reflowing into each other. It is only ever as tall as
   the folded shell, which is exactly TEAM_SIGIL_ROSTER_RAIL_HEIGHT. */
.sdp-rail {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: v-bind(railHeightPx);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 calc(v-bind(gripWidthPx) + 10px) 0 12px;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition:
    opacity calc(v-bind(foldMs) * 0.6),
    transform v-bind(foldMs);
}
.sdp-roster-shell--folded .sdp-rail {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
/* The seat, as the rail's title — and a second way back out of the fold. No box
   around it and no mark in front of it: a chip would read as one more control
   on a rail that already has seven, and an accent glyph would compete with the
   ✦ that opens every section head in the columns below. The word alone, at
   title size, is the whole left half. */
.sdp-rail-subject {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 2px 4px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}
.sdp-rail-seat {
  min-width: 0;
  font-size: 26px;
  line-height: 1;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #e8c040;
  /* static, never animated — a title's weight, not a running glow */
  text-shadow:
    0 0 14px color-mix(in srgb, var(--rc) 45%, transparent),
    0 2px 0 #1a0e04;
  transition: color 0.15s;
}
.sdp-rail-subject:hover .sdp-rail-seat {
  color: #f8e08c;
}

/* One dot per seat, carrying the SAME ladder the cards do — captain wider,
   sworn pair rimmed, bench plain. A row of six identical squares would have
   thrown away the one thing the strip teaches. */
.sdp-rail-dots {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.sdp-rail-sep {
  width: 1px;
  height: 30px;
  margin: 0 5px;
  background: #3e200a;
}
/* the bench sets the base — the two ranks above it only step up from here */
.sdp-rail-dot {
  position: relative;
  width: v-bind(railDotAllyPx);
  height: v-bind(railDotAllyPx);
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
  border-radius: 4px;
  background: #100e0a;
  border: 1px solid color-mix(in srgb, var(--rc) 22%, transparent);
  cursor: pointer;
  transition:
    transform 0.15s,
    border-color 0.15s,
    opacity 0.16s;
}
.sdp-rail-dot:hover {
  transform: translateY(-2px);
  border-color: var(--rc);
}
/* The captain: half again as tall as the bench and landscape on top of that, so
   its art gets a crop where the others get a face. Size is the first thing the
   rail says, before any rim or corner mark is read. */
.sdp-rail-dot--main {
  width: v-bind(railDotMainWidthPx);
  height: v-bind(railDotMainPx);
  border-width: 3px;
  border-color: color-mix(in srgb, var(--rc) 80%, transparent);
}
.sdp-rail-dot--sworn {
  width: v-bind(railDotSwornPx);
  height: v-bind(railDotSwornPx);
  border-width: 2px;
  border-color: color-mix(in srgb, var(--rc) 48%, transparent);
}
.sdp-rail-dot--empty {
  border-style: dashed;
}
.sdp-rail-dot--active {
  border-color: var(--rc);
  box-shadow: 0 0 0 1px var(--rc);
}
/* the board's spotlight reaches the rail as well: one lit, the rest quiet —
   the same language the cards speak, see .sdp-chip--dimmed */
.sdp-rail-dot--dimmed {
  opacity: v-bind(chipDimOpacity);
}
.sdp-rail-dot--highlight {
  border-color: var(--rc);
  transform: translateY(-2px);
}
.sdp-rail-dot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sdp-rail-dot-plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 15px;
  line-height: 1;
  color: color-mix(in srgb, var(--rc) 55%, #6b5c44);
}

/* ── the grip ───────────────────────────────────────────────────────────────
   A drawer edge down the right side rather than a button dropped on the strip:
   it is the full height of whatever state the shell is in, so it is in the same
   place open OR folded and never covers a card. */
.sdp-fold {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: v-bind(gripWidthPx);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-left: 2px solid #5c3310;
  background: linear-gradient(90deg, #1a0f06, #241505 60%, #180d04);
  color: color-mix(in srgb, var(--rc) 50%, #c8a860);
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}
.sdp-fold:hover {
  color: #f4dc90;
  background: linear-gradient(
    90deg,
    #1a0f06,
    color-mix(in srgb, var(--rc) 26%, #2c1a08) 60%,
    #180d04
  );
}
/* The wood the whole panel is framed in, run down the grip's inner edge — the
   plate reads as part of the frame rather than a button dropped on top of it. */
.sdp-fold::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: #3e200a;
}
/* one icon, turned over — no second name to keep in sync, and a transform is
   free where an icon swap would remount an SVG */
.sdp-fold-chevron {
  position: relative;
  z-index: 1;
  transition: transform v-bind(foldMs) cubic-bezier(0.33, 1, 0.68, 1);
}
.sdp-roster-shell--folded .sdp-fold-chevron {
  transform: rotate(180deg);
}
/* One card per champion of the slot — the whole roster is always visible, so
   switching subject never costs a navigation step. No card frames its portrait:
   the image runs the card's full height, edge to edge, and only the card itself
   has a border. Variants differ in the width of that portrait column, nothing
   else, so captain / sworn / bench read as one family at three sizes. */
.sdp-chip {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  background: #141410;
  /* Rank ladder — the WEIGHT of the frame is the hierarchy, and it is the same
     frame at three strengths rather than three different looks: the captain
     carries the heaviest rim, the sworn pair one step down and identical to each
     other, the bench the faintest. Both values ride on custom properties, so a
     tier is one declaration and the three can never drift apart. box-sizing is
     border-box, so the extra width costs the row no layout. */
  --chip-rim: 1px;
  --chip-rim-a: 20%;
  border: var(--chip-rim) solid color-mix(in srgb, var(--rc) var(--chip-rim-a), transparent);
  /* The tier's own relief — raised for the sworn pair, sunken for the bench.
     It rides a variable and every state below stacks its glow ON it rather than
     replacing it, so selecting or hovering a card never flattens its rank. The
     default is a no-op shadow, not `none`: `none` cannot be a term in a list. */
  --chip-lift: 0 0 0 0 transparent;
  box-shadow: var(--chip-lift);
  transition:
    transform 0.15s,
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s,
    /* the spotlight's own channel — see .sdp-chip--dimmed */ opacity 0.16s;
}
.sdp-chip:hover {
  transform: translateY(-1px);
  border-color: var(--rc);
}
/* selection and board-hover are styled at the very bottom of this stylesheet —
   they have to win over the tier blocks, which set `background` at the same
   specificity and would otherwise take an active card's surface back */
.sdp-chip--empty {
  border-style: dashed;
}
/* the portrait column — the size step between captain, sworn and bench lives
   here and nowhere else */
.sdp-chip-portrait {
  position: relative;
  width: 50px;
  flex-shrink: 0;
  align-self: stretch;
}

/* The captain card — full height of the strip and the only card whose portrait
   runs edge to edge: no well, no border, no inset. The champion's own splash
   continues behind the text, so the card reads as one image, not an image in a
   box. Everything the card gave up in padding, the text column takes back. */
.sdp-chip--main {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  align-items: stretch;
  width: v-bind(mainChipWidthPx);
  padding: 0;
  gap: 0;
  /* top of the ladder — the heaviest rim on the strip */
  --chip-rim: 3px;
  --chip-rim-a: 80%;
}
/* ── the backdrop splash ──────────────────────────────────────────────────────
   Every seated card wears one, captain to bench: it is what makes a roster entry
   a CARD, and a strip where only the first one has a backdrop reads as one card
   followed by three list rows. The seat ladder is already told by width, rim and
   relief — the backdrop is the family resemblance underneath all three.

   The art is decoration only. It is clipped by the card's own overflow, sits
   under everything readable, and never animates. */
.sdp-chip-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 18%;
  opacity: 0.34;
}
.sdp-chip-art-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(12, 9, 5, 0.94) 0%,
    rgba(12, 9, 5, 0.7) 52%,
    rgba(12, 9, 5, 0.25) 100%
  );
}
/* A sworn or bench card is a sliver of the same splash — a fifth of the
   captain's height under text that spans nearly its whole width. So the crop
   sits lower (the band that is head and shoulders rather than helmet), the art
   is dimmer, and the veil stays heavy all the way to the right edge instead of
   opening up: on this card there is no clear right half for it to open into. */
.sdp-chip--sworn .sdp-chip-art,
.sdp-chip--ally .sdp-chip-art {
  object-position: center 26%;
  opacity: 0.36;
}
.sdp-chip--sworn .sdp-chip-art-fade,
.sdp-chip--ally .sdp-chip-art-fade {
  background: linear-gradient(
    90deg,
    rgba(12, 9, 5, 0.94) 0%,
    rgba(12, 9, 5, 0.8) 46%,
    rgba(12, 9, 5, 0.42) 100%
  );
}
/* Everything readable sits above the art. Only the in-flow children need it —
   the remove-✕ is already positioned and paints later in source order anyway,
   and giving it `position: relative` here would take its corner away from it. */
.sdp-chip > .sdp-chip-portrait,
.sdp-chip > .sdp-chip-text,
.sdp-chip > .sdp-chip-badge {
  position: relative;
  z-index: 1;
}
.sdp-chip-name {
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}
/* only an EMPTY captain has a portrait column — a well for the ＋ */
.sdp-chip--main .sdp-chip-portrait {
  width: v-bind(mainPortraitWidthPx);
  height: auto;
  align-self: stretch;
}
.sdp-chip--main .sdp-chip-plus {
  border-radius: 3px 0 0 3px;
  border-width: 0 1px 0 0;
}
/* The art carries the card, so it is not dimmed — the veil does the darkening,
   and only where type has to sit on it: heavy along the bottom edge under the
   name, heavy along the left under the tag, and open across the upper right,
   which is where a splash keeps its subject. Two gradients on the layer that
   was already there, so the poster costs no element and nothing per frame. */
/* Head and shoulders, not the whole splash. The tile is 250×167 against a ~1.7
   splash, so `cover` alone shows nearly the source's full width — the same wide
   view the hero card below already gives, at a third of the size, which made the
   two read as one picture printed twice. Magnifying the crop turns the tile into
   a close-up: the roster names WHO sits here, the hero card shows them.

   Scale rather than a tighter object-position, because object-position can only
   slide the window, not close it.

   1.25 around 40% is where a contact sheet of twelve champions settled. Tighter
   (1.4 around 26%, the first try) reads as a macro rather than a portrait: it
   takes the top off Braum's head and cuts Ahri at the chin, because an origin
   that high pushes everything above it out of frame. Looser than 1.15 and the
   tile is the hero card again. 250 × 1.25 = 313px stays well inside the source,
   so the tile is still downsampling. Static transform: the card already clips
   it, and nothing here animates. */
.sdp-chip--main .sdp-chip-art {
  opacity: 1;
  object-position: center 14%;
  transform: scale(1.25);
  transform-origin: 50% 40%;
}
.sdp-chip--main .sdp-chip-art-fade {
  background:
    linear-gradient(
      0deg,
      rgba(10, 7, 4, 0.94) 0%,
      rgba(10, 7, 4, 0.62) 26%,
      rgba(10, 7, 4, 0.12) 58%,
      transparent 78%
    ),
    linear-gradient(
      90deg,
      rgba(10, 7, 4, 0.82) 0%,
      rgba(10, 7, 4, 0.34) 44%,
      transparent 76%
    );
}
/* The two ends of the card, not the top of it: the seat tag heads the tile and
   the champion's name sits on its bottom edge, with the splash between them.
   That is what turns the leftover space into the subject of the card instead of
   into a black corner under the text. Both hug the LEFT edge, which is what
   leaves the whole right half of the card to the art — and to the frame. */
.sdp-chip--main > .sdp-chip-text {
  justify-content: space-between;
  gap: 6px;
  padding: 10px 12px 10px 12px;
}
/* the captain's tag is styled with the other two — see "seat tag" below */
/* The champion is the headline of its own card, and the headline grew with the
   card: dropping the portrait column handed the text the tile's whole width
   (226px against the 129px it used to share), so the ceiling that pinned it to
   22px is gone. 26px still seats the longest bundled name without an ellipsis. */
.sdp-chip--main .sdp-chip-name {
  font-size: 26px;
}
.sdp-chip--main .sdp-chip-plus {
  font-size: 28px;
}
/* Two rows to the captain's right: the sworn pair on top, the bench below.
   Both are grow-flex rows rather than one grid — each row fills its own width
   whatever its count is, so neither ever leaves a dead cell. */
.sdp-roster-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.sdp-sworn,
.sdp-bench {
  display: flex;
  gap: 7px;
}
/* The rows do not split the strip evenly: the sworn pair gets the taller share.
   A height step is the difference that lands before any detail does — it reads
   from across the panel, where a rim width or a note does not. The two shares
   still add up to the same strip, so nothing below moves. */
.sdp-sworn {
  flex: 1.34;
}
.sdp-bench {
  flex: 1;
}
.sdp-chip--sworn,
.sdp-chip--ally {
  flex: 1 1 0;
  min-width: 0;
}

/* ── sworn: raised ────────────────────────────────────────────────────────────
   The pair is not a slightly different bench card, it is a card on a different
   PLANE. It sits on the strip — lit surface, a lip of role colour along its top
   edge, a shadow cast underneath — where the bench sits in it, sunken and flat.
   Relief separates the two even when both are unselected, which a rim weight
   alone did not do at a glance.

   Both wear the SAME everything: they are one rank, not a first and a second. */
.sdp-chip--sworn {
  --chip-rim: 2px;
  --chip-rim-a: 48%;
  --chip-lift:
    inset 0 1px 0 color-mix(in srgb, var(--rc) 55%, transparent),
    0 4px 10px rgba(0, 0, 0, 0.6);
  background: linear-gradient(168deg, #241a0c, #16130d 70%);
}
/* the bench closes the ladder — faintest rim, and recessed rather than raised:
   flat, a shade below the strip's own surface, with the light falling in */
.sdp-chip--ally {
  --chip-rim: 1px;
  --chip-rim-a: 20%;
  --chip-lift: inset 0 2px 4px rgba(0, 0, 0, 0.55);
  background: #100e0a;
}

/* No ornament on the art — no corner brackets, no liner, nothing laid over the
   champion. The seat ladder is carried by SIZE (and on the cards additionally
   by the rim weight and relief above), which is the one signal that survives
   being glanced at. Anything drawn on top of the portrait competes with the
   portrait, and the portrait is the thing worth looking at. */
.sdp-chip--sworn .sdp-chip-portrait {
  width: 64px;
}
/* the portrait is cut on its inner edge like the sworn plate on the sigil board
   — same rank, same silhouette, on both surfaces */
.sdp-chip--sworn .sdp-chip-img,
.sdp-chip--sworn .sdp-chip-plus {
  clip-path: polygon(0 0, 100% 0, calc(100% - 9px) 100%, 0 100%);
}
/* the cut IS the edge — a border alongside it would only be sliced at an angle */
.sdp-chip--sworn .sdp-chip-plus {
  border-right: none;
}
/* 18px clears every one of the 165 champion names inside the sworn card's
   190px text column — nothing here has to truncate */
.sdp-chip--sworn .sdp-chip-name {
  font-size: 18px;
}
/* the sworn tag is styled with the other two — see "seat tag" below */
.sdp-chip-note {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(232, 192, 64, 0.7);
  white-space: nowrap;
}
/* an empty sworn seat loses the lit surface but KEEPS the relief — the rank
   belongs to the seat, not to whoever is sitting in it */
.sdp-chip--sworn.sdp-chip--empty {
  background: #17140e;
}
.sdp-chip--empty .sdp-chip-note {
  color: rgba(200, 164, 90, 0.4);
}
.sdp-chip-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 14%;
  border: none;
  border-radius: 3px 0 0 3px;
}
.sdp-chip-plus {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px 0 0 3px;
  background: #0f0b06;
  border-right: 1px dashed color-mix(in srgb, var(--rc) 45%, transparent);
  font-size: 20px;
  line-height: 1;
  color: var(--rc);
}
.sdp-chip-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* a tag needs air under it that a bare line of text did not */
  gap: 4px;
  /* the padding the card gave up when its portrait went edge to edge */
  padding: 6px 4px 6px 10px;
}
/* ── seat tag ─────────────────────────────────────────────────────────────────
   Every card names its seat in the SAME object — a small uppercase tag — filled
   at the top of the ladder and outlined below it, the ordinary primary /
   secondary pair. That is what makes MAIN, SWORN and ALLY read as one system at
   three weights rather than as three differently sized pieces of text.

   The tag is deliberately small on every card: it labels the seat, it is not the
   content. The CHAMPION carries the size — 22 / 18 / 14 px down the ladder — so
   a name reads first and its seat second, which is the order a player wants.

   `align-self` keeps the tag hugging its own text; as a stretched flex item it
   would run the whole column and stop being a tag. */
.sdp-chip-role {
  align-self: flex-start;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--rc) 30%, transparent);
  background: rgba(0, 0, 0, 0.28);
  font-size: 8px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(210, 186, 140, 0.7);
}
/* the sworn tag: the same outline drawn in the role's own colour — one step
   above the bench's muted one, one below the captain's filled one */
.sdp-chip-role--sworn {
  padding: 2px 8px;
  border-color: color-mix(in srgb, var(--rc) 60%, transparent);
  background: color-mix(in srgb, var(--rc) 14%, transparent);
  font-size: 9.5px;
  line-height: 1.25;
  color: var(--rc);
}
/* the captain's is the one FILLED tag on the strip — dark ink on solid role
   colour, the same inversion the sigil board gives a selected role node. Solid
   beats large: it tops the ladder without taking a pixel from the champion's own
   name, which is what the card is actually about. */
.sdp-chip--main .sdp-chip-role {
  padding: 3px 10px;
  border-color: var(--rc);
  background: var(--rc);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: #14100a;
}

/* the sworn pair shares its tag line with the share it lends */
.sdp-chip-tagrow {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.sdp-chip-tagrow .sdp-chip-role {
  align-self: center;
}
.sdp-chip-name {
  font-size: 14px;
  line-height: 1.1;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sdp-chip--empty .sdp-chip-name {
  color: rgba(230, 220, 196, 0.35);
}
/* ── the selected card ────────────────────────────────────────────────────────
   Which champion the page below is describing has to be unmistakable, because
   every other card in the strip looks like a perfectly good thing to be reading.
   Four signals carry it, and deliberately none of them is one the rank ladder
   already uses — so "selected" can never be mistaken for "higher tier":

     ring     a detached outline around the whole card
     surface  lit from the role colour instead of the flat card black
     glow     a warm halo the unselected cards never carry

   The ring is the one that lands: set off from the card by a gap in the strip's
   own colour, it cannot be misread as a heavier tier rim the way a thicker
   border or a bar along the foot could — both of those sit exactly where the
   rank ladder already draws.

   The card is deliberately NOT lifted with it. The rows are 7px apart and the
   ring already spends 5 of those; a 2px rise on top left the bench cards' rings
   touching the sworn cards above them. Measured, not guessed — every card now
   keeps 2px of air on its tightest side. */

/* ── board spotlight ──────────────────────────────────────────────────────────
   Pointing at a satellite out on the sigil board asks one question — "which of
   these cards is that?" — and the strip answers it the way a stage does: one
   card takes the light, the others step back. The lit card alone was not the
   answer, because four cards side by side are all lit enough to look like the
   subject; the DIM is what makes the eye land.

   Everything here is transform and opacity, the two channels that stay on the
   compositor. Nothing per-frame touches a shadow or a filter: the rim, the halo
   and the surface switch ONCE on the class change and then hold, which is what
   the performance rules allow a state to do. Six cards can flip at once and it
   costs the same as one.

   Written BEFORE the selected block on purpose: a card can be spotlit and be the
   page's subject at the same time, and selection has to win. */

/* the quiet ones — pulled back, not hidden. A roster card carries a splash, a
   name and a medallion, so it survives an opacity that would erase a bare board
   satellite; the backdrop art gives up more than the card does, so the name
   stays the last thing readable on a dimmed card. */
.sdp-chip--dimmed {
  opacity: v-bind(chipDimOpacity);
  transform: scale(0.985);
}
.sdp-chip--dimmed .sdp-chip-art {
  opacity: 0.14;
}
/* the ✕ never surfaces on a card the cursor is not actually over */
.sdp-chip--dimmed .sdp-chip-clear {
  opacity: 0;
}

/* the lit one — the card's own hover language, one step further: it rises a
   little more, its splash comes up out of the veil, and a rim of role colour
   rings it. Not the selected card's DETACHED ring: that gap belongs to "this is
   what the page is showing", and the two states have to stay tellable apart. */
.sdp-chip--highlight {
  transform: translateY(-2px) scale(1.012);
  z-index: 2;
  border-color: var(--rc);
  box-shadow:
    var(--chip-lift),
    inset 0 0 0 1px color-mix(in srgb, var(--rc) 34%, transparent),
    0 0 0 2px color-mix(in srgb, var(--rc) 60%, transparent),
    0 6px 18px rgba(0, 0, 0, 0.5),
    0 0 20px color-mix(in srgb, var(--rc) 45%, transparent);
}
/* only a satellite is ever spotlit, so this is the sworn/bench veil coming up —
   the captain's art is at full strength already and never carries this class */
.sdp-chip--highlight .sdp-chip-art {
  opacity: 0.55;
}
.sdp-chip--highlight .sdp-chip-name {
  color: #f4e6bc;
}
/* the bench card is the sunken tier — while it holds the light it comes up to
   the sworn pair's plane, so the spotlight is never read as a rank change but
   the flat card still visibly reacts */
.sdp-chip--ally.sdp-chip--highlight {
  background: linear-gradient(168deg, #221a0e, #16130d 72%);
}

/* ── the glint ────────────────────────────────────────────────────────────────
   One diagonal band of role colour crossing the card, once, the moment the light
   arrives — the same gesture the regalia frame gives a role node out on the
   board, so the two surfaces answer a cursor with the same motion. It is mounted
   by v-if, so sliding from one satellite to the next replays it on whichever
   card just took over instead of animating nothing.

   A single element, translated: no shadow, no filter, no repaint of the card
   under it. The card's own overflow does the clipping, so the band can be wider
   than the tile and still cost nothing. */
.sdp-chip-sweep {
  position: absolute;
  inset: -30% -70%;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(
    100deg,
    transparent 40%,
    color-mix(in srgb, var(--rc) 30%, transparent) 47%,
    rgba(255, 246, 220, 0.28) 50%,
    color-mix(in srgb, var(--rc) 30%, transparent) 53%,
    transparent 60%
  );
  transform: translate3d(-60%, 0, 0);
  animation: sdp-chip-sweep v-bind(chipSweepMs) cubic-bezier(0.24, 0.6, 0.32, 1) 1 both;
}
@keyframes sdp-chip-sweep {
  0% {
    transform: translate3d(-60%, 0, 0);
    opacity: 0;
  }
  22% {
    opacity: 1;
  }
  100% {
    transform: translate3d(60%, 0, 0);
    opacity: 0;
  }
}

.sdp-chip--active {
  border-color: var(--rc);
  background: linear-gradient(168deg, color-mix(in srgb, var(--rc) 24%, #17110a), #1a1309 74%);
  box-shadow:
    var(--chip-lift),
    inset 0 0 0 1px color-mix(in srgb, var(--rc) 45%, transparent),
    /* the detached ring: a gap in the strip's own colour, then the ring itself.
       Set off from the card rather than drawn on it, so it cannot be read as a
       heavier tier rim — and box-shadow is not clipped by the card's own
       overflow, which an element outside its bounds would have been. */
      0 0 0 3px #1e1006,
    0 0 0 5px color-mix(in srgb, var(--rc) 85%, transparent),
    0 6px 16px rgba(0, 0, 0, 0.55),
    0 0 24px color-mix(in srgb, var(--rc) 40%, transparent);
}
/* the selected card does not answer a hover: clicking it is a no-op, and the
   plain hover rise would push its ring into the row above */
.sdp-chip--active:hover,
.sdp-chip--active.sdp-chip--highlight {
  transform: none;
}
.sdp-chip--active .sdp-chip-name {
  color: #f4e6bc;
}
/* the outlined tags fill in a little when their card is the subject; the
   captain's tag is solid already and keeps its dark ink */
.sdp-chip--sworn.sdp-chip--active .sdp-chip-role,
.sdp-chip--ally.sdp-chip--active .sdp-chip-role {
  border-color: var(--rc);
  background: color-mix(in srgb, var(--rc) 22%, transparent);
  color: color-mix(in srgb, var(--rc) 45%, #f4e6bc);
}
.sdp-chip-badge {
  flex-shrink: 0;
  align-self: center;
  margin-right: 9px;
}
/* Remove-ally affordance — only surfaces on hover so the chip stays calm. Sits
   over the portrait's top-left corner: the card clips now, and the right edge
   belongs to the level medallion. */
.sdp-chip-clear {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 19px;
  height: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(10, 5, 5, 0.9);
  border: 1px solid rgba(180, 60, 45, 0.55);
  color: #d88;
  font-size: 9px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}
.sdp-chip:hover .sdp-chip-clear {
  opacity: 1;
}
.sdp-chip-clear:hover {
  background: rgba(120, 30, 20, 0.9);
  color: #fff;
}
/* ══ columns ══ */
.sdp-cols {
  flex: 1;
  min-height: 0;
  display: flex;
}
.sdp-left {
  width: v-bind(leftWidthPx);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 2px solid #5c3310;
}
/* The column does NOT scroll. Its four blocks divide the height it has and each
   one fits itself into its share — that is the whole contract of this side of
   the page, and every rule below exists to keep it: the two blocks with a
   variable amount to show (the skin gallery, the perk choice) scroll INSIDE
   their share, the two with a fixed amount (stats, role abilities) shrink their
   type and padding by height class instead.
   A scrollbar here would hide the block a player is not currently looking at,
   which on a page whose job is "what is this champion" is the one thing it must
   not do. */
.sdp-right {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 12px;
}
/* While the picker holds the column it owns its own scrolling: the grid keeps
   its header pinned and scrolls the cards under it. The details layout's gap
   goes with it — the grid is one child that fills the column outright. */
.sdp-right--swap {
  gap: 0;
}
/* ── how the four blocks divide a column that cannot scroll ───────────────────
 * Two kinds of block, and they get opposite flex contracts:
 *
 *   VARIABLE (skins, perk path) — how much they have to show depends on the
 *   champion: two skins or twelve, a quiet ladder or an open choice. They GROW
 *   into spare height and SHRINK when there is none (`flex: n 1 …`), and their
 *   body scrolls inside whatever share it ends up with.
 *
 *   FIXED (stats, role abilities) — always exactly four tiles and two cards.
 *   They grow but never shrink (`flex: n 0 auto`), so their content is never
 *   clipped; where the column is short they get smaller through the height-class
 *   media queries at the bottom of this file, not through flex.
 *
 * The grow factors say what a block can DO with more height, not how tall it is.
 * A splash card and a stat plate both read better bigger, so those two take the
 * lion's share on 2K and 4K; the perk rail is one line of beads and a paragraph,
 * so past a point extra height is just air, and the caps stop it there.
 *
 * The floor is what makes the no-scroll promise hold: skins keep one full row,
 * the path keeps its rail and one detail line, and those two floors plus the two
 * fixed blocks fit the shortest supported column (Full HD, ~598px) with room to
 * spare — measured, not estimated. */
.sdp-block {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
/* First in line for spare height and first to give it back (shrink 6 against the
   path's 1): the gallery is the block that can lose a row without losing an
   answer, because what it loses is still one scroll away. */
.sdp-block--skins {
  flex: 4 6 auto;
  min-height: 0;
}
.sdp-block--stats {
  flex: 3 0 auto;
  max-height: 444px;
}
/* A rail and one clamped paragraph — a known, small height, so it takes its
   content and never gives it back. The skin grid is the one block that yields
   when the column is short, because it is the one that can (it scrolls). */
.sdp-block--perks {
  flex: 2 0 auto;
  min-height: 0;
  max-height: 460px;
}
/* While a choice is open the block leads the column — the cards under the rail
   are the one thing on this page that expires — and it is allowed to give way
   again, since the choice can scroll inside it. */
.sdp-block--choosing {
  flex-grow: 5;
  flex-shrink: 1;
  max-height: 620px;
}
/* Two cards need the height of two cards — no more, and never less. */
.sdp-block--abilities {
  flex: 0 0 auto;
}
/* Equipment lives in the LEFT column now (see .sdp-gear) — it keeps the same
   grow-never-shrink contract there, and the cap is what stops three buttons
   from becoming three tall wells on a 4K screen. */
.sdp-block--equipment {
  flex: 1 0 auto;
  max-height: 300px;
}
/* the section body takes the block's growth; the head above it stays put */
.sdp-block > .sdp-stats,
.sdp-block > .sdp-ability-cards,
.sdp-block > .sdp-equips {
  flex: 1 0 auto;
  min-height: 0;
}
/* grid rows and flex tiles then stretch into it rather than sitting on top */
.sdp-block > .sdp-stats,
.sdp-block > .sdp-ability-cards {
  align-content: stretch;
}

/* ── splash ── */
/* Grows into whatever height the left column has left over — the portrait is
   the thing worth making bigger, not the gap above the Level Up button. */
.sdp-splash {
  position: relative;
  /* Grow factor 4 against the perk path's 1: on a tall desktop four fifths of
     the spare height go to the portrait, which is the part of this column that
     is actually worth more pixels, and the path still stops the column ending
     short once the portrait hits its share cap. */
  flex: 4 1 v-bind(splashHeightPx);
  min-height: v-bind(splashHeightCompactPx);
  max-height: v-bind(splashMaxShare);
  overflow: hidden;
  cursor: pointer;
  background: #0a0704;
}
.sdp-splash:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}
.sdp-splash-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 16%;
  transition:
    transform 0.25s ease-out,
    filter 0.25s;
}
.sdp-splash:hover .sdp-splash-img {
  transform: scale(1.04);
  filter: brightness(0.75);
}
.sdp-splash-swap-hint {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) translateY(4px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid #c89040;
  color: #e8c040;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.sdp-splash:hover .sdp-splash-swap-hint,
.sdp-splash:focus-visible .sdp-splash-swap-hint {
  opacity: 1;
  transform: translate(-50%, -50%) translateY(0);
}
.sdp-splash-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 26%,
    rgba(13, 9, 5, 0.55) 58%,
    rgba(13, 9, 5, 0.99) 100%
  );
}
.sdp-splash-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.sdp-splash-empty-img {
  width: 88px;
  height: 88px;
  opacity: 0.4;
  object-fit: contain;
}
.sdp-splash-select-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px dashed var(--rc);
  background: rgba(0, 0, 0, 0.45);
  color: var(--rc);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  animation: sdp-cta-pulse 2s ease-in-out infinite;
}
@keyframes sdp-cta-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
/* Chips ride in the footer's flow now, between the name and the XP bar, so they
   need no corner reserve and no absolute placement — they simply wrap under the
   name as a subtitle would. */
.sdp-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}
.sdp-hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}
.sdp-hero-chip-icon {
  color: #fff;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85));
  flex-shrink: 0;
}
/* hero footer — stacked over the base of the portrait, so the card reads as one
   object: rank line, name, then the XP bar as its bottom edge */
.sdp-splash-bottom {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 11px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* Medallion in the top-left corner, alone up there now that the chips have
   moved down to the name. Above the fade, so it keeps its contrast wherever the
   splash happens to be bright.

   The inset is derived from the badge's own diameter rather than typed as a
   corner margin: the regalia grows ornaments with level, and the splash clips.
   See CHAMPION_REGALIA_SPLASH_INSET_RATIO for the measured overhangs. */
.sdp-splash-badge {
  position: absolute;
  top: v-bind(splashBadgeInsetPx);
  left: v-bind(splashBadgeInsetPx);
  z-index: 3;
  pointer-events: none;
}
.sdp-name-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.sdp-name {
  flex: 1;
  min-width: 0;
  font-size: 32px;
  color: #f4e6bc;
  line-height: 1;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* ── skin grid ───────────────────────────────────────────────────────────────
   Splash cards in TWO columns rather than three. A skin is a picture, and the
   whole point of the block is recognising which picture you are wearing — at the
   old ~136px a splash was a smear you had to hover to identify. Two columns give
   each card ~208px (see SKIN_THUMB_MIN_WIDTH for the arithmetic), which is
   enough to read the champion, the pose and the colour of the skin at a glance.
   Cards stay fixed-size so twelve skins cannot reflow the column, and only the
   equipped one is lit: the rest sit at reduced opacity so the current look is
   findable without a badge on every card.

   Hover and selection move opacity and transform only — the strip sits over a
   board that keeps orbiting, and a border-colour transition on a dozen cards is
   exactly the kind of per-frame raster work the project bans. The equipped
   card's frame and glow are a STATIC state, switched without a transition. */
.sdp-skins {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(v-bind(skinThumbMinWidthPx), 1fr));
  /* TWO WHOLE ROWS, whatever height the block ends up with. The percentage is
     resolved against the grid's own (definite) height, so the rows divide the
     share exactly — no dead band under the second row on one resolution and no
     card sliced in half on the next. Rows past the second scroll inside the grid;
     the column itself never does. */
  grid-auto-rows: calc((100% - 10px) / 2);
  gap: 10px;
  /* asks for two comfortable rows, accepts down to two legible ones */
  flex: 1 1 v-bind(skinGridBasisPx);
  min-height: v-bind(skinGridMinPx);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  align-content: start;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
/* While a choice is open the gallery steps back to a single row and hands the
   height to the three cards — the choice expires, the skins do not. One row, not
   two half ones: the row formula switches to 100% with it. */
.sdp-right:has(.sdp-block--choosing) .sdp-skins {
  grid-auto-rows: 100%;
  flex-basis: v-bind(skinGridBasisChoosingPx);
  min-height: v-bind(skinGridMinChoosingPx);
}
/* and the ability paragraphs give up their last line for the same few seconds —
   the perk descriptions are what is being compared right now */
.sdp-right:has(.sdp-block--choosing) .sdp-ability-card-desc {
  -webkit-line-clamp: 1;
}
.sdp-skins::-webkit-scrollbar {
  width: 7px;
}
.sdp-skins::-webkit-scrollbar-track {
  background: #111;
}
.sdp-skins::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 4px;
}
.sdp-skin {
  position: relative;
  width: 100%;
  /* fills its row — the row height is the grid's business (grid-auto-rows), not
     the card's. An `aspect-ratio` here would be circular and collapse the row:
     the row needs the card's height, the card's height would need its width, and
     the width only exists once the row is laid out. */
  height: 100%;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  border-radius: 4px;
  border: 1px solid #3e3a30;
  background: #141410;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55);
  opacity: 0.62;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.sdp-skin:hover {
  opacity: 1;
  transform: translateY(-3px);
}
.sdp-skin:focus-visible {
  opacity: 1;
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}
.sdp-skin--on {
  opacity: 1;
  border-color: #c89040;
  box-shadow:
    inset 0 0 0 1px #5c3310,
    0 0 14px rgba(232, 192, 64, 0.22);
}
/* The card is a window on the art: the image sits a touch oversized and slides
   back into place on hover, so the splash reads as the surface of the card
   rather than as a thumbnail glued into a frame. Transform only. */
.sdp-skin-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
  display: block;
  transition: transform 0.22s ease-out;
}
.sdp-skin:hover .sdp-skin-img {
  transform: scale(1.06);
}
.sdp-skin-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 58%;
  background: linear-gradient(
    to top,
    rgba(8, 6, 3, 0.96) 0%,
    rgba(8, 6, 3, 0.62) 45%,
    transparent 100%
  );
  pointer-events: none;
}
.sdp-skin-name {
  position: absolute;
  left: 9px;
  right: 9px;
  bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.15;
  color: #f4e6bc;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  pointer-events: none;
}
/* ── the one chip: gold = worn, green = the click that would change it ── */
.sdp-skin-chip {
  position: absolute;
  top: 7px;
  right: 7px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  line-height: 1.2;
  white-space: nowrap;
  border: 1px solid;
  pointer-events: none;
}
.sdp-skin-chip--on {
  color: #f0d68a;
  background: rgba(12, 8, 3, 0.86);
  border-color: #c89040;
}
.sdp-skin-chip--cta {
  color: #0c1a06;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border-color: #6ec040;
  opacity: 0;
  transform: translateY(-3px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.sdp-skin:hover .sdp-skin-chip--cta,
.sdp-skin:focus-visible .sdp-skin-chip--cta {
  opacity: 1;
  transform: translateY(0);
}
/* The gear block is the left column's only padded child — the splash runs edge
   to edge and the advance block brings its own padding. It also carries the
   column's growth now that the perk path has left: the splash takes four fifths
   of any spare height and the gear the rest, so bigger item art is where the
   leftover lands instead of a black band above the column's bottom edge. */
.sdp-gear {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 14px 14px;
}

/* ── hero footer readouts ── */
.sdp-xp-label,
.sdp-xp-value {
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
}
.sdp-xp-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}
.sdp-xp-label {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c8a860;
}
.sdp-xp-value {
  margin-left: auto;
  font-size: 12.5px;
  color: #dcc99a;
}
.sdp-xp-track {
  height: v-bind(xpBarHeightPx);
  border-radius: 4px;
  background: #0a0805;
  border: 1px solid #3e200a;
  overflow: hidden;
}
.sdp-xp-fill {
  height: 100%;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--rc) 45%, #0a0805),
    var(--rc)
  );
  transition: width 0.3s ease-out;
}
/* enough XP banked — the bar switches to the buyable green */
.sdp-xp-fill--ready {
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.5);
}

/* ══ perk path ══════════════════════════════════════════════════════════════
   One bead per milestone the cap allows, on one rail, and the milestone in focus
   spelled out underneath. A bead is taken (perk sigil in the perk's colour),
   open (gold medal, the only thing on this page that expires) or locked (the
   level number, dim).

   It used to be a stack: five rows, each with its own icon well and two lines of
   text. That cost ~220px of a column which has ~550px to hand out to four
   blocks, and four of those rows only ever said "9 levels to go". Laid along a
   rail the same five milestones cost ~70px, the state still reads at a glance,
   and the height that frees up goes to the two blocks that have something to
   show: the skin gallery and the stats. */
.sdp-path {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  /* Only ever engages while a choice is open on a short desktop — the rail plus
     one detail line always fits. */
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.sdp-path::-webkit-scrollbar {
  width: 6px;
}
.sdp-path::-webkit-scrollbar-track {
  background: #111;
}
.sdp-path::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 3px;
}
/* the rail — beads spread evenly, one line drawn behind them */
.sdp-path-rail {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}
.sdp-path-rail::before {
  content: '';
  position: absolute;
  left: 8%;
  right: 8%;
  top: 22px;
  height: 2px;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--rc) 55%, transparent),
    rgba(200, 164, 90, 0.14)
  );
}
.sdp-pnode {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
  /* transform only — five of these sit over a board that keeps orbiting */
  transition: transform 0.15s ease;
}
.sdp-pnode:hover {
  transform: translateY(-2px);
}
.sdp-pnode:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
  border-radius: 4px;
}
.sdp-pnode-bead {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #141410;
  border: 2px solid rgba(200, 164, 90, 0.18);
}
.sdp-pnode-icon {
  color: var(--pc, #c8a860);
}
.sdp-pnode-lv {
  font-size: 16px;
  line-height: 1;
  color: rgba(200, 164, 90, 0.45);
}
.sdp-pnode-cap {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(230, 220, 196, 0.35);
  white-space: nowrap;
}
/* taken — the bead carries the perk's own colour */
.sdp-pnode--taken .sdp-pnode-bead {
  background: linear-gradient(160deg, color-mix(in srgb, var(--pc) 26%, #141410), #0d0b07);
  border-color: color-mix(in srgb, var(--pc) 70%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--pc) 30%, transparent);
}
.sdp-pnode--taken .sdp-pnode-cap {
  color: rgba(230, 220, 196, 0.5);
}
/* open — it expires, so it is the loudest thing in the block */
.sdp-pnode--open .sdp-pnode-bead {
  position: relative;
  background: linear-gradient(160deg, #2a1c08, #0d0b07);
  border-color: #e8c040;
  box-shadow: 0 0 16px rgba(232, 192, 64, 0.4);
}
/* The waiting pulse rides a layer of its own and fades in and out. The glow
   itself is rasterised ONCE and then only composited — animating the bead's own
   box-shadow would re-raster the box on every frame, over a board that is
   orbiting behind it. */
.sdp-pnode--open .sdp-pnode-bead::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 6px;
  box-shadow: 0 0 22px rgba(232, 192, 64, 0.6);
  pointer-events: none;
  animation: sdp-node-wait 2s ease-in-out infinite;
}
.sdp-pnode--open .sdp-pnode-icon {
  color: #e8c040;
}
.sdp-pnode--open .sdp-pnode-cap {
  color: #e8c040;
}
.sdp-pnode--locked {
  opacity: 0.55;
}
/* the bead being read below — a ring, no glow, so it never competes with the
   gold one */
.sdp-pnode--focus .sdp-pnode-bead {
  border-color: #c89040;
}
.sdp-pnode--focus .sdp-pnode-cap {
  color: #e8dcc0;
}
@keyframes sdp-node-wait {
  0%,
  100% {
    opacity: 0.28;
  }
  50% {
    opacity: 1;
  }
}

/* ── the milestone in focus, in full ── */
.sdp-pdetail {
  flex: 0 0 auto;
  padding: 8px 11px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-left: 3px solid var(--pc, rgba(200, 164, 90, 0.4));
}
.sdp-pdetail--open {
  border-left-color: #e8c040;
}
.sdp-pdetail-name {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 16px;
  line-height: 1.15;
  color: var(--pc, #c8a860);
}
.sdp-pdetail-name--open {
  color: #e8c040;
}
.sdp-pdetail-name--locked {
  color: rgba(200, 164, 90, 0.62);
}
.sdp-pdetail-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(230, 220, 196, 0.4);
}
.sdp-pdetail-desc {
  margin-top: 3px;
  font-size: 12.5px;
  font-weight: 500;
  color: #bcae8c;
  line-height: 1.35;
  /* two lines is every perk description in the game; the clamp is the guarantee
     that a longer one can never push the block past its share */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.sdp-pdetail-desc--locked {
  color: rgba(230, 220, 196, 0.32);
}

/* The choice itself — three cards SIDE BY SIDE under the rail, always visible
   while it is open, whichever bead is being read.
   Side by side rather than stacked because it is a choice: three options in one
   glance read as "pick one of these", a column of three reads as a list you work
   through. It also costs a third of the height, which is what lets the whole
   choice sit in the block without the column scrolling. */
.sdp-choice {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.sdp-choice-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 8px 9px;
  min-width: 0;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  background: #141410;
  border: 1px solid rgba(200, 164, 90, 0.2);
  border-top: 3px solid var(--pc);
  transition: transform 0.15s;
}
.sdp-choice-card:hover {
  transform: translateY(-3px);
}
.sdp-choice-card:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}
.sdp-choice-icon {
  flex-shrink: 0;
  color: var(--pc);
}
.sdp-choice-text {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sdp-choice-name {
  font-size: 14px;
  line-height: 1.1;
  color: var(--pc);
}
.sdp-choice-desc {
  font-size: 11px;
  font-weight: 500;
  color: #dcc99a;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* ── advance block ── */
.sdp-advance {
  flex-shrink: 0;
  padding: 12px 14px 14px;
  background: #1a1008;
}
/* ── the advance button, price included ──────────────────────────────────────
   Label on one end, price on the other. Everything the block used to spend on a
   separate cost row and a second hint line is gone, and the button reads as the
   shop pattern every player already knows: this is what it does, this is what it
   costs, and the pill that has gone red is the one you cannot pay. */
/* Label at one end, price at the other — but wrapping, because an ascension step
   carries three pills and those plus the label are wider than the column. When
   they no longer fit side by side the price drops to its own line INSIDE the
   button rather than squeezing the label into two lines, which is what an
   unwrapped row did (measured: a 69px button with "Level Up to 5" broken across
   two rows). */
.sdp-level-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 7px 10px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #0d1a06;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    filter 0.15s,
    transform 0.15s;
}
/* The label never breaks — it is three short words and reads as one line or not
   at all. `flex: 1` lets it claim the row's slack so the price still sits hard
   right when both fit. */
.sdp-level-btn-main {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
}
/* at the cap there is no price, so the label takes the middle again */
.sdp-level-btn--bare {
  justify-content: center;
}
/* On its own line the price centres; beside the label it stays hard right. */
.sdp-level-btn-cost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 1 auto;
}
.sdp-level-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}
/* Locked keeps the house treatment, minus the grayscale: the price lives on
   this button, and while it is locked the price is exactly what the player needs
   to read. Desaturating it would grey out the one pill that says which resource
   is missing. The flat dark surface and the dimmed label carry the state on
   their own, and the red hint below spells it out at full contrast. */
.sdp-level-btn--locked {
  background: linear-gradient(to bottom, #2c2c26, #1a1a16);
  border-color: #3e3a30;
  color: rgba(230, 220, 196, 0.45);
  cursor: not-allowed;
}
/* The price pills — dark ink on the live button, light on the locked one. Kept
   at the larger size they were given outside the button; the label gives up the
   width, since "LEVEL UP TO 25" is short and the number is what gets read. */
.sdp-cost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 4px;
  background: rgba(8, 20, 4, 0.28);
  border: 1px solid rgba(13, 26, 6, 0.4);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: #0d1a06;
}
.sdp-cost--short {
  background: rgba(74, 14, 8, 0.3);
  border-color: rgba(120, 30, 20, 0.55);
}
.sdp-level-btn--locked .sdp-cost {
  background: rgba(0, 0, 0, 0.42);
  border-color: rgba(200, 164, 90, 0.28);
  color: #e8dcc0;
}
/* can't pay this line — the pill flips to the error red */
.sdp-level-btn--locked .sdp-cost--short {
  border-color: rgba(204, 96, 80, 0.7);
  color: #e08878;
}
.sdp-cost-img {
  width: 19px;
  height: 19px;
  object-fit: contain;
}
.sdp-cost-owned {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.6;
}
/* ── section headings (right column) ── */
.sdp-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
}
.sdp-section-accent {
  font-size: 12px;
  color: var(--rc);
}
.sdp-section-accent--hot {
  color: #e8c040;
}
.sdp-section-title {
  font-size: 14px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #c8a860;
}
.sdp-section-title--hot {
  color: #e8c040;
}
.sdp-section-rule {
  flex: 1;
  height: 1px;
  background: rgba(200, 164, 90, 0.16);
}
.sdp-section-rule--hot {
  background: rgba(232, 192, 64, 0.35);
}
/* The readout on the right of a heading — "3/5", "10 looks", the champion's
   name. It carries as much as the heading itself does (how far along the perk
   path is, how many skins there are), so it is set at heading size rather than
   as fine print; the colour, not the size, is what keeps it second. */
.sdp-section-count {
  font-size: 15px;
  letter-spacing: 0.06em;
  color: rgba(230, 220, 196, 0.55);
}
.sdp-section-count--hot {
  color: #e8c040;
}
/* ── stats — four large tiles, two per row ── */
.sdp-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}
.sdp-stat {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 4px;
  overflow: hidden;
  background: #1c1c18;
  border: 1px solid rgba(200, 164, 90, 0.14);
  border-left: 3px solid var(--sc);
}
/* the lean meter — a rail along the tile's bottom edge, filled to the stat's
   share of the champion's best. Costs one element and one composited scale. */
.sdp-stat-meter {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.55);
}
.sdp-stat-meter-fill {
  display: block;
  height: 100%;
  transform-origin: left center;
  background: linear-gradient(90deg, color-mix(in srgb, var(--sc) 40%, #0a0805), var(--sc));
  transition: transform 0.3s ease-out;
}
.sdp-stat-icon {
  flex-shrink: 0;
  color: var(--sc);
}
.sdp-stat-body {
  flex: 1;
  min-width: 0;
}
.sdp-stat-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.sdp-stat-short {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(200, 164, 90, 0.6);
}
.sdp-stat-value {
  margin-left: auto;
  font-size: 27px;
  line-height: 1;
  color: #f4e6bc;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}
.sdp-stat-effect {
  margin-top: 5px;
  font-size: 13px;
  font-weight: 700;
  color: var(--sc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sdp-stat-effect-label {
  font-weight: 500;
  color: rgba(230, 220, 196, 0.45);
}
/* the sworn share, never mixed into the champion's own number */
.sdp-stat-sworn {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(232, 192, 64, 0.8);
}
.sdp-section-count--sworn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(232, 192, 64, 0.75);
}

/* ── role abilities ── */
.sdp-ability-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}
/* Tightened along with the block above: less padding, a smaller icon well and a
   closer line height. The two cards keep every word they had — only the air
   around them went to the skin gallery. */
.sdp-ability-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-left: 3px solid var(--rc);
}
.sdp-ability-card--gold {
  border-left-color: #c89040;
}
.sdp-ability-card-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #141410;
  border: 1px solid rgba(220, 180, 90, 0.3);
}
.sdp-ability-card-text {
  flex: 1;
  min-width: 0;
}
.sdp-ability-card-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 164, 90, 0.6);
}
.sdp-ability-card-tag--gold {
  color: rgba(232, 192, 64, 0.75);
}
.sdp-ability-card-name {
  font-size: 17px;
  line-height: 1.15;
  margin-top: 2px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}
/* Clamped, because this block never shrinks: the longest ability text in the
   game would otherwise decide how much height the two blocks above it get. The
   full wording stays one hover away (title on the card). */
.sdp-ability-card-desc {
  font-size: 12px;
  font-weight: 500;
  color: #dcc99a;
  line-height: 1.35;
  margin-top: 3px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* ── equipment ── */
.sdp-equips {
  display: flex;
  gap: 9px;
}
.sdp-equip {
  position: relative;
  flex: 1;
  /* a floor, not a height — the row stretches with its block on tall desktops */
  min-height: 104px;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  border-radius: 4px;
  background: radial-gradient(circle at 50% 34%, #1a140c, #0a0808);
  border: 1px solid rgba(200, 164, 90, 0.14);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition:
    transform 0.15s,
    border-color 0.15s;
}
.sdp-equip--filled {
  border-color: rgba(220, 180, 90, 0.55);
  box-shadow: inset 0 0 14px rgba(200, 144, 64, 0.12);
}
/* an open slot wears the dashed rim an open roster seat wears — one mark for
   "nothing here yet" across the whole page */
.sdp-equip--empty {
  border-style: dashed;
  border-color: rgba(200, 164, 90, 0.3);
}
.sdp-equip:hover {
  transform: translateY(-2px);
  border-color: #c89040;
}
.sdp-equip-ghost {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* the ＋ rides the ghost's lower right, the same corner the roster puts its
   affordances in — small, so it reads as an invitation and not as a warning */
.sdp-equip-plus {
  position: absolute;
  right: -7px;
  bottom: -3px;
  width: 17px;
  height: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #141410;
  border: 1px solid rgba(200, 164, 90, 0.4);
  font-size: 11px;
  line-height: 1;
  color: #c8a860;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.sdp-equip:hover .sdp-equip-plus {
  background: #2a1c08;
  border-color: #c89040;
  color: #e8c040;
}
.sdp-equip-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 0 7px rgba(200, 144, 64, 0.5));
}
.sdp-equip-img--ghost {
  width: 34px;
  height: 34px;
  opacity: 0.28;
  filter: none;
}
.sdp-equip-emoji {
  font-size: 38px;
  line-height: 1;
}
.sdp-equip-name {
  max-width: 100%;
  padding: 0 6px;
  font-size: 11px;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sdp-equip-cat {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(200, 164, 90, 0.55);
  text-transform: uppercase;
}

/* Full HD class viewports — the flattest desktops we target. The splash gives
   back height so the progression block and the pinned Level Up button below it
   never get squeezed out of the left column. */
/* ══ height classes ═════════════════════════════════════════════════════════
 * The right column cannot scroll, so on the flattest desktops the four blocks
 * have to fit into ~598px (Full HD) or ~627px (WUXGA) instead of the ~767px a 2K
 * screen gives them. That is a fifth of the height gone, and it comes out of
 * type and padding here rather than out of a block: every block keeps every word
 * it has at every resolution, it just sets it tighter where the column is short.
 * Measured floors — nothing below is guesswork, see the audit in the commit. */
@media (max-height: 1100px) {
  .sdp-splash {
    flex-basis: v-bind(splashHeightCompactPx);
  }
  .sdp-name {
    font-size: 28px;
  }
  .sdp-equip {
    height: 92px;
  }
  /* the column itself */
  .sdp-right {
    padding: 10px 12px;
    gap: 8px;
  }
  .sdp-section-head {
    margin-bottom: 6px;
  }
  .sdp-section-title {
    font-size: 12.5px;
  }
  .sdp-section-count {
    font-size: 13.5px;
  }
  /* skins — still two whole rows and two columns, one step shorter */
  .sdp-skins {
    gap: 8px;
    grid-auto-rows: calc((100% - 8px) / 2);
    flex-basis: v-bind(skinGridBasisCompactPx);
    min-height: v-bind(skinGridMinCompactPx);
  }
  .sdp-skin-name {
    font-size: 12.5px;
    left: 7px;
    right: 7px;
    bottom: 6px;
  }
  .sdp-skin-chip {
    top: 5px;
    right: 5px;
    padding: 2px 6px;
    font-size: 9px;
  }
  /* stats — the number stays the loudest thing in the tile */
  .sdp-stats {
    gap: 7px;
  }
  .sdp-stat {
    padding: 6px 9px;
    gap: 8px;
  }
  .sdp-stat-icon {
    width: 22px;
    height: 22px;
  }
  .sdp-stat-value {
    font-size: 19px;
  }
  .sdp-stat-effect {
    margin-top: 2px;
    font-size: 11px;
  }
  .sdp-stat-sworn {
    font-size: 10.5px;
  }
  /* perk rail */
  .sdp-path {
    gap: 7px;
  }
  .sdp-pnode-bead {
    width: 38px;
    height: 38px;
  }
  .sdp-path-rail::before {
    top: 19px;
  }
  .sdp-pnode-cap {
    font-size: 9px;
  }
  .sdp-pdetail {
    padding: 6px 9px;
  }
  .sdp-pdetail-name {
    font-size: 14.5px;
  }
  .sdp-pdetail-desc {
    font-size: 11.5px;
  }
  .sdp-choice-card {
    padding: 6px 8px;
    gap: 4px;
  }
  .sdp-choice-icon {
    width: 22px;
    height: 22px;
  }
  .sdp-choice-name {
    font-size: 13px;
  }
  .sdp-choice-desc {
    font-size: 10.5px;
  }
  /* role abilities — two lines instead of three, everything else unchanged */
  .sdp-ability-cards {
    gap: 7px;
  }
  .sdp-ability-card {
    padding: 6px 8px;
    gap: 8px;
  }
  .sdp-ability-card-icon {
    width: 28px;
    height: 28px;
  }
  .sdp-ability-card-tag {
    font-size: 9px;
  }
  .sdp-ability-card-name {
    font-size: 14px;
    margin-top: 1px;
  }
  .sdp-ability-card-desc {
    font-size: 10.5px;
    line-height: 1.3;
    margin-top: 2px;
    -webkit-line-clamp: 2;
  }
}

/* 4K and taller — the column has ~1400px and the same four blocks. Left alone
   they would sit in a sea of gap and read as a page designed for a smaller
   screen; every step below spends that height on the content itself. */
@media (min-height: 1601px) {
  /* three rows, not two taller ones — a 208px-wide card at 250px tall is a
     portrait crop of a landscape splash, and a third row shows three more skins
     instead */
  .sdp-skins {
    gap: 12px;
    grid-auto-rows: calc((100% - 24px) / 3);
    flex-basis: v-bind(skinGridBasisLargePx);
    min-height: v-bind(skinGridMinLargePx);
  }
  .sdp-skin-name {
    font-size: 16px;
  }
  .sdp-skin-chip {
    font-size: 11px;
    padding: 4px 9px;
  }
  .sdp-section-title {
    font-size: 15.5px;
  }
  .sdp-section-count {
    font-size: 19px;
  }
  .sdp-stat-value {
    font-size: 31px;
  }
  .sdp-stat-effect {
    font-size: 14.5px;
  }
  .sdp-pnode-bead {
    width: 54px;
    height: 54px;
  }
  .sdp-path-rail::before {
    top: 27px;
  }
  .sdp-pnode-cap {
    font-size: 11.5px;
  }
  .sdp-pdetail-name {
    font-size: 18px;
  }
  .sdp-pdetail-desc {
    font-size: 14px;
  }
  .sdp-ability-card-name {
    font-size: 19px;
  }
  /* the one place the third line fits without costing another block anything */
  .sdp-ability-card-desc {
    font-size: 13.5px;
    -webkit-line-clamp: 3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sdp-splash-select-cta,
  .sdp-pnode--open .sdp-pnode-bead::after {
    animation: none;
    opacity: 1;
  }
  /* the spotlight keeps its light and its dim — only the travelling glint goes */
  .sdp-chip-sweep {
    animation: none;
    opacity: 0;
  }
}
</style>
