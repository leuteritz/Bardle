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
 */
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useGameStore } from '@/stores/gameStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useItemStore } from '@/stores/itemStore'
import { useSkinStore } from '@/stores/skinStore'
import { useChampionLevelStore } from '@/stores/championLevelStore'
import { useActionToast } from '@/composables/useActionToast'
import {
  ascensionRank,
  ascensionStars,
  isAscensionLevel,
  isPerkLevel,
  perkChoicesFor,
  statEffectLabel,
  CHAMPION_STATS,
  PERK_BY_ID,
} from '@/config/championLevels'
import {
  ROLES,
  ALLIES_PER_ROLE,
  SWORN_ALLY_COUNT,
  SWORN_STAT_SHARE,
  SWORN_ICON,
  SKIN_ORIGINAL,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_DETAILS_LEFT_WIDTH,
  TEAM_SIGIL_MAIN_CHIP_WIDTH,
  TEAM_SIGIL_MAIN_PORTRAIT_WIDTH,
  TEAM_SIGIL_SPLASH_HEIGHT,
  TEAM_SIGIL_SPLASH_HEIGHT_COMPACT,
  TEAM_SIGIL_SPLASH_MAX_SHARE,
  ORBIT_ROLE_ABILITIES,
  OBJECTIVE_ROLE_ABILITIES,
  CHAMPION_ASCENSION_INTERVAL,
  CHAMPION_PERK_INTERVAL,
  CHAMPION_XP_BAR_HEIGHT,
  CHAMPION_REGALIA_SIZE_ALLY,
  CHAMPION_REGALIA_SIZE_CHIP_MAIN,
  CHAMPION_REGALIA_SIZE_PANEL,
  CHIMES_COST_ICON,
} from '@/config/constants'
import ChampionLevelBadge from './ChampionLevelBadge.vue'
import { allySlotLabel } from '@/utils/format'
import { getChampionSkins, formatSkinName } from '@/utils/champions'
import { getChampionTier } from '@/config/championTiers'
import { getChampionOrigin, getOriginColor, ORIGIN_SYNERGIES } from '@/config/championOrigins'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/championTraits'
import { SHOP_ITEMS } from '@/config/items'
import { MATERIALS } from '@/config/materials'
import type { ItemCategory, ShopItem, ChampionStatKey, ChampionPerkDef } from '@/types'

const props = defineProps<{
  roleIndex: number
  /** Ally sub-slot hovered on the sigil board — its roster chip lights up here. */
  highlightedAlly?: number | null
}>()

const emit = defineEmits<{
  swap: []
  'pick-ally': [subSlot: number]
  'clear-ally': [subSlot: number]
  'pick-equipment': [category: ItemCategory]
  /** Opens the skin gallery for a champion — allies have skins too. */
  'pick-skins': [champion: string]
  /** Hovered ally chip — mirrored as a spotlight on the sigil board (null = none). */
  'hover-ally': [subSlot: number | null]
}>()

const panelWidthPx = `${TEAM_SIGIL_DETAILS_PANEL_WIDTH}px`
const leftWidthPx = `${TEAM_SIGIL_DETAILS_LEFT_WIDTH}px`
const splashHeightPx = `${TEAM_SIGIL_SPLASH_HEIGHT}px`
const splashHeightCompactPx = `${TEAM_SIGIL_SPLASH_HEIGHT_COMPACT}px`
const splashMaxShare = `${TEAM_SIGIL_SPLASH_MAX_SHARE}%`
const xpBarHeightPx = `${CHAMPION_XP_BAR_HEIGHT}px`
const mainChipWidthPx = `${TEAM_SIGIL_MAIN_CHIP_WIDTH}px`
const mainPortraitWidthPx = `${TEAM_SIGIL_MAIN_PORTRAIT_WIDTH}px`

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
const subject = ref(MAIN_SUBJECT)

watch(
  () => props.roleIndex,
  () => {
    subject.value = MAIN_SUBJECT
  },
)
// an ally that gets cleared (or a role that loses its bench) falls back to main
watch(allies, (rows) => {
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
  // an empty ally chip has nothing to show — go straight to the picker
  if (index !== MAIN_SUBJECT && !allies.value[index]) {
    emit('pick-ally', index)
    return
  }
  subject.value = index
}

/** The splash doubles as the swap button for whichever slot is in focus. */
function swapSubject() {
  if (subject.value === MAIN_SUBJECT) emit('swap')
  else emit('pick-ally', subject.value)
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

function allyImage(ally: string): string {
  return battleStore.getChampionImage(ally, { size: 'md' })
}

/**
 * Der Kapitäns-Chip ist der einzige, dessen Portrait über die volle Höhe der
 * Roster-Leiste läuft: TEAM_SIGIL_MAIN_PORTRAIT_WIDTH breit, aber gemessene
 * ~120 px hoch. Maßgeblich ist die längste Kante, und die liegt knapp über
 * CHAMPION_ART_MD_MAX_EDGE — mit 'md' wäre ausgerechnet der Main der unschärfste
 * Kopf der Seite.
 */
function mainChipImage(name: string): string {
  return battleStore.getChampionImage(name, { size: 'lg' })
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

/** Alternate skins bundled for the subject (excluding the default look). */
const skinCount = computed(() =>
  champion.value ? getChampionSkins(champion.value).filter((s) => s !== SKIN_ORIGINAL).length : 0,
)
const equippedSkinName = computed(() =>
  champion.value ? formatSkinName(skinStore.getSelectedSkin(champion.value)) : '',
)

function openSkins() {
  if (champion.value) emit('pick-skins', champion.value)
}

// ── Progression ──────────────────────────────────────────────────────────────
const level = computed(() => (champion.value ? levelStore.levelOf(champion.value) : 1))
const cap = computed(() => levelStore.levelCap)
const atCap = computed(() => level.value >= cap.value)
const nextLevel = computed(() => level.value + 1)
const rank = computed(() => ascensionRank(level.value))
const stars = computed(() => ascensionStars(level.value))
const maxStars = computed(() => Math.floor(cap.value / CHAMPION_ASCENSION_INTERVAL))
const xpBar = computed(() =>
  champion.value ? levelStore.xpBarOf(champion.value) : { current: 0, needed: 1, pct: 0, capped: false },
)
const cost = computed(() =>
  champion.value ? levelStore.costOf(champion.value) : { chimes: 0, materials: {} },
)
const canLevel = computed(() => !!champion.value && levelStore.canLevelUp(champion.value))
const blockReason = computed(() =>
  champion.value ? levelStore.blockReasonOf(champion.value) : null,
)

/** Banked XP or an unspent perk — the medallion pings, exactly as on the board. */
function needsAttentionOf(name: string): boolean {
  return levelStore.needsAttention(name)
}
function levelOf(name: string): number {
  return levelStore.levelOf(name)
}

/** The next level that grants a star or a perk — whichever comes first. */
const nextMilestone = computed(() => {
  for (let l = nextLevel.value; l <= cap.value; l++) {
    if (isPerkLevel(l)) return { level: l, kind: 'perk' as const }
    if (isAscensionLevel(l)) return { level: l, kind: 'star' as const }
  }
  return null
})

const blockLabel = computed(() => {
  switch (blockReason.value) {
    case 'cap':
      return 'Level cap reached'
    case 'xp':
      return 'Not enough XP — send this champion into battle'
    case 'chimes':
      return 'Not enough chimes'
    case 'materials':
      return 'Missing materials'
    default:
      return ''
  }
})

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
         width belongs to the champions. ══ -->
    <div class="sdp-roster">
      <!-- the slot's captain: one large card heading the seat ladder — MAIN,
           then SWORN I / II, then the bench, so all four cards name a SEAT.
           The role itself reads from the card's colour and its tooltip; it does
           not need a word of its own on a panel that is already about one role. -->
      <button
        class="sdp-chip sdp-chip--main"
        :class="{ 'sdp-chip--active': subject === MAIN_SUBJECT, 'sdp-chip--empty': !main }"
        type="button"
        :title="main ? `${main} — ${roleDef.label}` : `Assign ${roleDef.label}`"
        @click="selectSubject(MAIN_SUBJECT)"
        @mouseenter="emit('hover-ally', null)"
      >
        <!-- the captain's own splash, dimmed to a backdrop: the card reads as a
             card rather than as one more row -->
        <template v-if="main">
          <img
            :src="battleStore.getChampionImage(main)"
            alt=""
            aria-hidden="true"
            class="sdp-chip-art"
            decoding="async"
          />
          <span class="sdp-chip-art-fade" aria-hidden="true" />
        </template>
        <span class="sdp-chip-portrait">
          <img v-if="main" :src="mainChipImage(main)" :alt="main" class="sdp-chip-img" decoding="async" />
          <span v-else class="sdp-chip-plus">＋</span>
        </span>
        <span class="sdp-chip-text">
          <span class="sdp-chip-role">Main</span>
          <span class="sdp-chip-name">{{ main ?? 'Empty' }}</span>
        </span>
        <ChampionLevelBadge
          v-if="main"
          :level="levelOf(main)"
          :color="roleDef.color"
          :size="CHAMPION_REGALIA_SIZE_CHIP_MAIN"
          :attention="needsAttentionOf(main)"
          class="sdp-chip-badge"
        />
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
            }"
            type="button"
            :title="slot.name ? `${slot.name} — ${slot.label}` : `Assign ${slot.label}`"
            @click="selectSubject(slot.sub)"
            @mouseenter="emit('hover-ally', slot.sub)"
          >
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
          </button>
        </div>
      </div>
    </div>

    <!-- ══ two columns ══ -->
    <div class="sdp-cols">
      <!-- ── LEFT — identity and progression of the subject ── -->
      <div class="sdp-left">
        <div
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
              <Icon icon="game-icons:cycle" width="18" height="18" />
              Swap Champion
            </div>
          </template>
          <div v-else class="sdp-splash-empty">
            <img :src="roleDef.image" :alt="roleDef.label" class="sdp-splash-empty-img" />
            <div class="sdp-splash-select-cta">
              <Icon icon="game-icons:cycle" width="18" height="18" />
              Select Champion
            </div>
          </div>

          <div v-if="champion" class="sdp-splash-top">
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

          <!-- hero footer — the progression readout rides the portrait itself:
               medallion, rank ladder, name and the XP bar as the card's base.
               Folding it in here is what frees the column below for the path. -->
          <div class="sdp-splash-bottom">
            <div v-if="champion" class="sdp-hero-row">
              <ChampionLevelBadge
                :level="level"
                :color="roleDef.color"
                :size="CHAMPION_REGALIA_SIZE_PANEL"
                :attention="needsAttentionOf(champion)"
              />
              <div class="sdp-hero-meta">
                <div class="sdp-hero-level">
                  Level <b>{{ level }}</b>
                  <span class="sdp-hero-cap">/ {{ cap }}</span>
                  <span class="sdp-hero-rank">{{ rank.name }}</span>
                </div>
                <div class="sdp-stars" :title="`${stars} of ${maxStars} ascension stars`">
                  <Icon
                    v-for="i in maxStars"
                    :key="i"
                    icon="game-icons:beveled-star"
                    width="14"
                    height="14"
                    class="sdp-star"
                    :class="{ 'sdp-star--on': i <= stars }"
                  />
                </div>
              </div>
            </div>

            <div class="sdp-name-row">
              <div class="sdp-name">{{ champion ?? 'No Champion' }}</div>
              <button
                v-if="champion && skinCount > 0"
                class="sdp-skins-btn"
                type="button"
                :title="`Equipped: ${equippedSkinName}`"
                @click.stop="openSkins"
              >
                <Icon icon="game-icons:cape" width="17" height="17" />
                <span>Skins</span>
                <span class="sdp-skins-btn-count">{{ skinCount }}</span>
              </button>
            </div>

            <div v-if="champion" class="sdp-xp">
              <div class="sdp-xp-head">
                <Icon icon="game-icons:circle-sparks" width="14" height="14" class="sdp-xp-icon" />
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

        <!-- the perk path owns the rest of the column and scrolls on its own -->
        <div v-if="champion" class="sdp-mid">
        <!-- ── perk path — every milestone the cap allows, taken or not, strung
             on one spine so the whole ladder reads at a glance ── -->
        <div class="sdp-path">
          <div class="sdp-section-head sdp-section-head--path">
            <span class="sdp-section-accent">✦</span>
            <span class="sdp-section-title">Perk Path</span>
            <div class="sdp-section-rule" />
            <span class="sdp-section-count">{{ takenPerkCount }}/{{ perkPath.length }}</span>
          </div>

          <div class="sdp-path-track">
            <div
              v-for="slot in perkPath"
              :key="slot.level"
              class="sdp-node"
              :class="[`sdp-node--${slot.state}`]"
              :style="slot.perk ? { '--pc': slot.perk.color } : undefined"
            >
              <!-- the spine bead: perk sigil once taken, milestone level until then -->
              <div class="sdp-node-bead">
                <Icon
                  v-if="slot.perk"
                  :icon="slot.perk.icon"
                  width="30"
                  height="30"
                  class="sdp-node-icon"
                />
                <Icon
                  v-else-if="slot.state === 'open'"
                  icon="game-icons:ribbon-medal"
                  width="28"
                  height="28"
                  class="sdp-node-icon"
                />
                <span v-else class="sdp-node-lv">{{ slot.level }}</span>
              </div>

              <div class="sdp-node-body">
                <template v-if="slot.perk">
                  <div class="sdp-node-name">
                    {{ slot.perk.name }}
                    <span class="sdp-node-tag">Lv {{ slot.level }}</span>
                  </div>
                  <div class="sdp-node-desc">{{ slot.perk.desc }}</div>
                </template>

                <template v-else-if="slot.state === 'open'">
                  <div class="sdp-node-name sdp-node-name--open">
                    Milestone reached
                    <span class="sdp-node-tag">Lv {{ slot.level }}</span>
                  </div>
                  <div class="sdp-node-desc">Pick one — the others stay in the pool.</div>
                  <div class="sdp-choice">
                    <button
                      v-for="perk in perkChoices"
                      :key="perk.id"
                      class="sdp-choice-card"
                      :style="{ '--pc': perk.color }"
                      @click="pickPerk(perk.id)"
                    >
                      <Icon :icon="perk.icon" width="30" height="30" class="sdp-choice-icon" />
                      <span class="sdp-choice-text">
                        <span class="sdp-choice-name">{{ perk.name }}</span>
                        <span class="sdp-choice-desc">{{ perk.desc }}</span>
                      </span>
                    </button>
                  </div>
                </template>

                <template v-else>
                  <div class="sdp-node-name sdp-node-name--locked">Level {{ slot.level }}</div>
                  <div class="sdp-node-desc sdp-node-desc--locked">
                    <template v-if="slot.exhausted">No perk left in this pool</template>
                    <template v-else-if="level >= slot.level">Choice still open</template>
                    <template v-else>
                      {{ slot.level - level }} level{{ slot.level - level === 1 ? '' : 's' }} to go
                    </template>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
        </div>

        <!-- advance — the primary action, pinned so it never scrolls away -->
        <div v-if="champion" class="sdp-advance">
          <div v-if="!atCap" class="sdp-cost-row">
            <div class="sdp-cost" :class="{ 'sdp-cost--short': !affordsChimes }">
              <Icon :icon="CHIMES_COST_ICON" width="18" height="18" />
              <span>{{ $formatNumber(cost.chimes) }}</span>
            </div>
            <div
              v-for="mat in materialCosts"
              :key="mat.id"
              class="sdp-cost"
              :class="{ 'sdp-cost--short': mat.owned < mat.qty }"
              :title="mat.def?.name ?? mat.id"
            >
              <img v-if="mat.def" :src="mat.def.image" :alt="mat.def.name" class="sdp-cost-img" />
              <span>{{ mat.qty }}</span>
              <span class="sdp-cost-owned">({{ mat.owned }})</span>
            </div>
          </div>

          <button
            class="sdp-level-btn"
            :class="{ 'sdp-level-btn--locked': !canLevel }"
            :disabled="!canLevel"
            @click="doLevelUp"
          >
            <Icon icon="game-icons:circle-sparks" width="20" height="20" />
            <span v-if="atCap">Level Cap Reached</span>
            <span v-else>Level Up to {{ nextLevel }}</span>
          </button>

          <div v-if="blockLabel" class="sdp-block-hint">{{ blockLabel }}</div>
          <div v-if="!atCap && isAscensionLevel(nextLevel)" class="sdp-next-hint">
            <Icon icon="game-icons:beveled-star" width="14" height="14" />
            Ascension level — grants a star and lifts every stat
          </div>
          <div v-else-if="!atCap && isPerkLevel(nextLevel)" class="sdp-next-hint">
            <Icon icon="game-icons:ribbon-medal" width="14" height="14" />
            Milestone level — opens a perk choice
          </div>
          <div v-else-if="nextMilestone" class="sdp-next-hint sdp-next-hint--muted">
            <Icon
              :icon="
                nextMilestone.kind === 'perk'
                  ? 'game-icons:ribbon-medal'
                  : 'game-icons:beveled-star'
              "
              width="14"
              height="14"
            />
            Next {{ nextMilestone.kind === 'perk' ? 'perk' : 'star' }} at level
            {{ nextMilestone.level }}
          </div>
        </div>
      </div>

      <!-- ── RIGHT — stats and the slot's own gear (perks live on the left) ── -->
      <div class="sdp-right">
        <!-- stats -->
        <div v-if="champion && stats">
          <div class="sdp-section-head">
            <span class="sdp-section-accent">✦</span>
            <span class="sdp-section-title">Stats</span>
            <div class="sdp-section-rule" />
            <span v-if="hasSwornBonus" class="sdp-section-count sdp-section-count--sworn">
              <Icon :icon="SWORN_ICON" width="12" height="12" />
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
            </div>
          </div>
        </div>

        <!-- role abilities — belong to the slot, not to the champion in it -->
        <div>
          <div class="sdp-section-head">
            <span class="sdp-section-accent">✦</span>
            <span class="sdp-section-title">Role Abilities</span>
            <div class="sdp-section-rule" />
            <span class="sdp-section-count">{{ roleDef.label }}</span>
          </div>
          <div class="sdp-ability-cards">
            <div class="sdp-ability-card">
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
            <div class="sdp-ability-card sdp-ability-card--gold">
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

        <!-- equipment — also slot-scoped: the loadout stays when champions swap -->
        <div>
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
              :class="{ 'sdp-equip--filled': !!equippedItem(cat) }"
              :title="equippedItem(cat)?.name ?? CAT_LABELS[cat]"
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
              <img
                v-else
                :src="`/img/itemShop/${cat}-128.png`"
                :alt="CAT_LABELS[cat]"
                class="sdp-equip-img sdp-equip-img--ghost"
              />
              <span class="sdp-equip-cat">{{ CAT_LABELS[cat] }}</span>
            </button>
          </div>
        </div>
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
/* stretch, not center: the captain card runs the full height of both rows */
.sdp-roster {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 10px 12px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
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
    box-shadow 0.15s;
}
.sdp-chip:hover {
  transform: translateY(-1px);
  border-color: var(--rc);
}
.sdp-chip--active {
  background: #241608;
  border-color: var(--rc);
  box-shadow:
    var(--chip-lift),
    inset 0 0 0 1px color-mix(in srgb, var(--rc) 40%, transparent),
    0 0 14px color-mix(in srgb, var(--rc) 35%, transparent);
}
/* board hover mirrored onto the chip — same language as its own hover */
.sdp-chip--highlight {
  transform: translateY(-1px);
  border-color: var(--rc);
  box-shadow:
    var(--chip-lift),
    0 0 14px color-mix(in srgb, var(--rc) 45%, transparent);
}
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
/* the art is decoration — everything readable sits above it */
.sdp-chip--main > .sdp-chip-portrait,
.sdp-chip--main > .sdp-chip-text,
.sdp-chip--main > .sdp-chip-badge {
  position: relative;
  z-index: 1;
}
.sdp-chip--main .sdp-chip-name {
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}
.sdp-chip--main .sdp-chip-portrait {
  width: v-bind(mainPortraitWidthPx);
  height: auto;
  align-self: stretch;
}
.sdp-chip--main .sdp-chip-img {
  border: none;
  border-radius: 3px 0 0 3px;
  object-position: center 14%;
}
.sdp-chip--main .sdp-chip-plus {
  border-radius: 3px 0 0 3px;
  border-width: 0 1px 0 0;
}
/* Anchored high: the tag heads the card and the champion's name follows
   directly under it, the way the card is read. The seal takes the opposite
   corner (see the badge rule above) so the two never share a line, and the
   splash art keeps the diagonal between them. */
.sdp-chip--main > .sdp-chip-text {
  justify-content: flex-start;
  gap: 6px;
  padding: 10px 12px 8px 11px;
}
/* The captain's medallion leaves the flex row and pins to the card's LOWER
   corner like a seal. As a row item it charged the text column 38px of its 137,
   so the champion's name ran into an ellipsis; out of the flow it costs the text
   nothing. Bottom rather than top because the caption sits high — the seal takes
   the corner the text does not, and the two never meet on a line. */
.sdp-chip--main > .sdp-chip-badge {
  position: absolute;
  bottom: 9px;
  right: 10px;
  align-self: auto;
  margin-right: 0;
}
/* the captain's tag is styled with the other two — see "seat tag" below */
/* The champion is the headline of its own card. 22px is the ceiling the 129px
   text column allows: 2 of 165 names truncate there, 9 do at 24px. */
.sdp-chip--main .sdp-chip-name {
  font-size: 22px;
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
.sdp-chip--active .sdp-chip-name {
  color: #f4e6bc;
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
.sdp-right {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.sdp-right::-webkit-scrollbar {
  width: 4px;
}
.sdp-right::-webkit-scrollbar-track {
  background: #111;
}
.sdp-right::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* ── splash ── */
/* Grows into whatever height the left column has left over — the portrait is
   the thing worth making bigger, not the gap above the Level Up button. */
.sdp-splash {
  position: relative;
  flex: 1 1 v-bind(splashHeightPx);
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
.sdp-splash-top {
  position: absolute;
  top: 11px;
  left: 12px;
  right: 12px;
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
.sdp-hero-row {
  display: flex;
  align-items: center;
  gap: 11px;
}
.sdp-hero-meta {
  min-width: 0;
}
.sdp-hero-level {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 15px;
  color: #dcc99a;
  line-height: 1.1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
}
.sdp-hero-level b {
  font-size: 23px;
  color: #f4e6bc;
}
.sdp-hero-cap {
  font-size: 12px;
  color: rgba(230, 220, 196, 0.45);
}
.sdp-hero-rank {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rank);
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
.sdp-skins-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(200, 144, 64, 0.55);
  color: #e8c040;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    background 0.15s;
}
.sdp-skins-btn:hover {
  border-color: #c89040;
  background: rgba(30, 16, 6, 0.85);
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.25);
}
.sdp-skins-btn-count {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(200, 144, 64, 0.18);
  border: 1px solid rgba(200, 144, 64, 0.35);
  font-size: 11px;
  line-height: 1.3;
  color: #f0d870;
}

/* ── the perk path owns the middle of the left column ──
   Content-sized, not a second greedy flex child: a short path (all milestones
   still locked) hands its slack to the portrait above instead of padding itself
   out, and a long one (an open choice) shrinks and scrolls on its own. */
.sdp-mid {
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.sdp-mid::-webkit-scrollbar {
  width: 4px;
}
.sdp-mid::-webkit-scrollbar-track {
  background: #111;
}
.sdp-mid::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* ── hero footer readouts ── */
.sdp-stars {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 5px;
}
.sdp-star {
  color: #3a3428;
}
.sdp-star--on {
  color: var(--rank);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--rank) 60%, transparent));
}
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
.sdp-xp-icon {
  color: #6ec0e0;
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
   One node per milestone the cap allows, strung on a single spine. A node is
   taken (perk sigil, full colour), open (gold, carries the choice cards) or
   locked (dim, counts down the levels). Reading top to bottom answers both
   "what did I pick?" and "what is still ahead?" without a second view. */
.sdp-path {
  padding: 13px 14px 16px;
}
.sdp-section-head--path {
  margin-bottom: 11px;
}
.sdp-path-track {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* the spine — one line behind every bead, drawn from the first to the last */
.sdp-path-track::before {
  content: '';
  position: absolute;
  left: 23px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--rc) 55%, transparent),
    rgba(200, 164, 90, 0.14)
  );
}
.sdp-node {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.sdp-node-bead {
  position: relative;
  z-index: 1;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #141410;
  border: 2px solid rgba(200, 164, 90, 0.18);
}
.sdp-node-icon {
  color: var(--pc, #c8a860);
}
.sdp-node-lv {
  font-size: 17px;
  line-height: 1;
  color: rgba(200, 164, 90, 0.45);
}
.sdp-node-body {
  flex: 1;
  min-width: 0;
  padding-top: 3px;
}
.sdp-node-name {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 17px;
  line-height: 1.15;
  color: var(--pc, #c8a860);
}
.sdp-node-tag {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(230, 220, 196, 0.4);
}
.sdp-node-desc {
  margin-top: 4px;
  font-size: 12.5px;
  font-weight: 500;
  color: #bcae8c;
  line-height: 1.4;
}

/* taken — the bead carries the perk's own colour */
.sdp-node--taken .sdp-node-bead {
  background: linear-gradient(160deg, color-mix(in srgb, var(--pc) 26%, #141410), #0d0b07);
  border-color: color-mix(in srgb, var(--pc) 70%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--pc) 30%, transparent);
}

/* open — the only thing on this page that expires, so it is the loudest */
.sdp-node--open .sdp-node-bead {
  background: linear-gradient(160deg, #2a1c08, #0d0b07);
  border-color: #e8c040;
  box-shadow: 0 0 16px rgba(232, 192, 64, 0.4);
  animation: sdp-node-wait 2s ease-in-out infinite;
}
.sdp-node--open .sdp-node-icon {
  color: #e8c040;
}
.sdp-node-name--open {
  color: #e8c040;
}
@keyframes sdp-node-wait {
  0%,
  100% {
    box-shadow: 0 0 12px rgba(232, 192, 64, 0.3);
  }
  50% {
    box-shadow: 0 0 22px rgba(232, 192, 64, 0.6);
  }
}

/* Locked — present but quiet; it is a promise, not an action. Compact too: a
   locked slot has nothing to read, and every row it saves is a row the taken
   perks above it get to keep on screen. */
.sdp-node--locked {
  opacity: 0.62;
  align-items: center;
}
.sdp-node--locked .sdp-node-bead {
  width: 36px;
  height: 36px;
  margin-left: 6px;
}
.sdp-node--locked .sdp-node-body {
  padding-top: 0;
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.sdp-node-name--locked {
  font-size: 14.5px;
  color: rgba(200, 164, 90, 0.6);
}
.sdp-node-desc--locked {
  margin-top: 0;
  font-size: 12px;
  color: rgba(230, 220, 196, 0.32);
  white-space: nowrap;
}
.sdp-node--locked .sdp-node-lv {
  font-size: 14px;
}

/* the choice itself — full-width cards inside the open node */
.sdp-choice {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 9px;
}
.sdp-choice-card {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 11px;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  background: #141410;
  border: 1px solid rgba(200, 164, 90, 0.2);
  border-left: 3px solid var(--pc);
  transition:
    transform 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
}
.sdp-choice-card:hover {
  transform: translateX(3px);
  border-color: var(--pc);
  box-shadow: 0 0 16px color-mix(in srgb, var(--pc) 38%, transparent);
}
.sdp-choice-icon {
  flex-shrink: 0;
  color: var(--pc);
}
.sdp-choice-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.sdp-choice-name {
  font-size: 16px;
  line-height: 1.1;
  color: var(--pc);
}
.sdp-choice-desc {
  font-size: 12px;
  font-weight: 500;
  color: #dcc99a;
  line-height: 1.35;
}

/* ── advance block ── */
.sdp-advance {
  flex-shrink: 0;
  padding: 12px 14px 14px;
  background: #1a1008;
}
.sdp-cost-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 10px;
}
.sdp-cost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 4px;
  background: #141410;
  border: 1px solid rgba(200, 164, 90, 0.22);
  font-size: 13px;
  font-weight: 600;
  color: #e8c040;
}
/* can't pay this line — flip it to the error red */
.sdp-cost--short {
  border-color: rgba(204, 96, 80, 0.55);
  color: #cc6050;
}
.sdp-cost-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
.sdp-cost-owned {
  font-size: 11px;
  color: rgba(230, 220, 196, 0.4);
}
.sdp-level-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #0d1a06;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    filter 0.15s,
    transform 0.15s;
}
.sdp-level-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}
.sdp-level-btn--locked {
  background: linear-gradient(to bottom, #2c2c26, #1a1a16);
  border-color: #3e3a30;
  color: rgba(230, 220, 196, 0.4);
  cursor: not-allowed;
  opacity: 0.6;
  filter: grayscale(55%);
}
.sdp-block-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #cc6050;
  text-align: center;
}
.sdp-next-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 7px;
  font-size: 12px;
  color: #e8c040;
}
.sdp-next-hint--muted {
  color: rgba(200, 164, 90, 0.55);
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
.sdp-section-count {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: rgba(230, 220, 196, 0.4);
}
/* ── stats — four large tiles, two per row ── */
.sdp-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}
.sdp-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 13px;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid rgba(200, 164, 90, 0.14);
  border-left: 3px solid var(--sc);
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
.sdp-ability-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-left: 3px solid var(--rc);
}
.sdp-ability-card--gold {
  border-left-color: #c89040;
}
.sdp-ability-card-icon {
  width: 46px;
  height: 46px;
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
.sdp-ability-card-desc {
  font-size: 13px;
  font-weight: 500;
  color: #dcc99a;
  line-height: 1.45;
  margin-top: 4px;
}

/* ── equipment ── */
.sdp-equips {
  display: flex;
  gap: 9px;
}
.sdp-equip {
  position: relative;
  flex: 1;
  height: 104px;
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
.sdp-equip:hover {
  transform: translateY(-2px);
  border-color: #c89040;
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
@media (max-height: 1100px) {
  .sdp-splash {
    flex-basis: v-bind(splashHeightCompactPx);
  }
  .sdp-name {
    font-size: 28px;
  }
  .sdp-stat {
    padding: 10px 12px;
  }
  .sdp-stat-value {
    font-size: 24px;
  }
  .sdp-equip {
    height: 92px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sdp-splash-select-cta,
  .sdp-node--open .sdp-node-bead {
    animation: none;
    opacity: 1;
  }
}
</style>
