<script setup lang="ts">
/**
 * The role details page of the team tab — everything about one slot on one
 * surface. It used to hand progression (levels, perks, costs) off to a modal;
 * that modal is gone, so this panel is now two-column and twice as wide:
 *
 *   roster strip   main + the three allies, one chip each — switches the subject
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
  statEffectLabel,
  CHAMPION_STATS,
  PERK_BY_ID,
} from '@/config/championLevels'
import {
  ROLES,
  ALLIES_PER_ROLE,
  SKIN_ORIGINAL,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_SIGIL_DETAILS_LEFT_WIDTH,
  TEAM_SIGIL_ROSTER_COLUMNS,
  TEAM_SIGIL_SPLASH_HEIGHT,
  TEAM_SIGIL_SPLASH_HEIGHT_COMPACT,
  TEAM_SIGIL_SPLASH_MAX_SHARE,
  ORBIT_ROLE_ABILITIES,
  OBJECTIVE_ROLE_ABILITIES,
  CHAMPION_ASCENSION_INTERVAL,
  CHAMPION_PERK_INTERVAL,
  CHAMPION_XP_BAR_HEIGHT,
  CHAMPION_REGALIA_SIZE_ALLY,
  CHAMPION_REGALIA_SIZE_PANEL,
  CHIMES_COST_ICON,
} from '@/config/constants'
import ChampionLevelBadge from './ChampionLevelBadge.vue'
import { getChampionSkins, formatSkinName } from '@/utils/champions'
import { getChampionTier } from '@/config/championTiers'
import { getChampionOrigin, getOriginColor, ORIGIN_SYNERGIES } from '@/config/championOrigins'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/championTraits'
import { SHOP_ITEMS } from '@/config/items'
import { MATERIALS } from '@/config/materials'
import type { ItemCategory, ShopItem, ChampionStatKey } from '@/types'

const props = defineProps<{
  roleIndex: number
  /** Ally sub-slot hovered on the sigil board — its roster chip lights up here. */
  highlightedAlly?: number | null
}>()

const emit = defineEmits<{
  close: []
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
const rosterColumns = String(TEAM_SIGIL_ROSTER_COLUMNS)

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

// ── Roster chips ─────────────────────────────────────────────────────────────
interface RosterEntry {
  index: number
  name: string | null
  label: string
}
const roster = computed<RosterEntry[]>(() => [
  { index: MAIN_SUBJECT, name: main.value, label: roleDef.value.label },
  ...allies.value.map((name, sub) => ({ index: sub, name, label: `Ally ${sub + 1}` })),
])

function allyImage(ally: string): string {
  return battleStore.getChampionImage(ally, { size: 'md' })
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

/** Next level that opens a perk choice — null once the cap holds no more. */
const nextPerkLevel = computed(() => {
  const next =
    (Math.floor(level.value / CHAMPION_PERK_INTERVAL) + 1) * CHAMPION_PERK_INTERVAL
  return next <= cap.value ? next : null
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
const stats = computed(() => (champion.value ? levelStore.statsOf(champion.value) : null))
const cooldownRush = computed(() =>
  champion.value ? levelStore.perkEffectOf(champion.value, 'cooldownRush') : 0,
)
function statEffectOf(key: ChampionStatKey): string {
  if (!stats.value) return ''
  return statEffectLabel(key, stats.value[key], cooldownRush.value)
}

// ── Perks ────────────────────────────────────────────────────────────────────
const ownedPerks = computed(() => {
  if (!champion.value) return []
  return Object.entries(levelStore.progressOf(champion.value).perks)
    .map(([lvl, id]) => ({ level: Number(lvl), perk: PERK_BY_ID[id] }))
    .filter((e) => !!e.perk)
    .sort((a, b) => a.level - b.level)
})
const perkChoices = computed(() =>
  champion.value ? levelStore.perkChoicesOf(champion.value) : [],
)
const hasPendingPerk = computed(
  () => !!champion.value && levelStore.hasPendingPerk(champion.value),
)

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
    <!-- ══ roster strip — the slot's four champions, one chip each ══ -->
    <div class="sdp-roster">
      <div class="sdp-roster-role">
        <img :src="roleDef.image" alt="" class="sdp-roster-role-img" />
        <span>{{ roleDef.label }}</span>
      </div>

      <div class="sdp-roster-chips" @mouseleave="emit('hover-ally', null)">
        <button
          v-for="entry in roster"
          :key="entry.index"
          class="sdp-chip"
          :class="{
            'sdp-chip--active': subject === entry.index,
            'sdp-chip--empty': !entry.name,
            'sdp-chip--main': entry.index === MAIN_SUBJECT,
            'sdp-chip--highlight': entry.index >= 0 && highlightedAlly === entry.index,
          }"
          type="button"
          :title="entry.name ? `${entry.name} — ${entry.label}` : `Assign ${entry.label}`"
          @click="selectSubject(entry.index)"
          @mouseenter="emit('hover-ally', entry.index >= 0 ? entry.index : null)"
        >
          <img v-if="entry.name" :src="allyImage(entry.name)" :alt="entry.name" class="sdp-chip-img" />
          <span v-else class="sdp-chip-plus">＋</span>
          <span class="sdp-chip-text">
            <span class="sdp-chip-role">{{ entry.label }}</span>
            <span class="sdp-chip-name">{{ entry.name ?? 'Empty' }}</span>
          </span>
          <ChampionLevelBadge
            v-if="entry.name"
            :level="levelOf(entry.name)"
            :color="roleDef.color"
            :size="CHAMPION_REGALIA_SIZE_ALLY"
            :attention="needsAttentionOf(entry.name)"
            class="sdp-chip-badge"
          />
          <span
            v-if="entry.name && entry.index >= 0"
            class="sdp-chip-clear"
            role="button"
            title="Remove ally"
            @click.stop="emit('clear-ally', entry.index)"
          >
            ✕
          </span>
        </button>
      </div>

      <button class="sdp-close" aria-label="Close details" @click="emit('close')">✕</button>
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
            <img :src="championImage" :alt="champion" class="sdp-splash-img" />
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

          <div class="sdp-splash-bottom">
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
        </div>

        <!-- progression — medallion, rank ladder and the XP bar that feeds it -->
        <div v-if="champion" class="sdp-progress">
          <div class="sdp-progress-head">
            <ChampionLevelBadge
              :level="level"
              :color="roleDef.color"
              :size="CHAMPION_REGALIA_SIZE_PANEL"
              :attention="needsAttentionOf(champion)"
            />
            <div class="sdp-progress-title">
              <div class="sdp-progress-level">
                Level <b>{{ level }}</b>
                <span class="sdp-progress-cap">/ {{ cap }}</span>
              </div>
              <div class="sdp-progress-rank">{{ rank.name }}</div>
            </div>
          </div>

          <div class="sdp-stars" :title="`${stars} of ${maxStars} ascension stars`">
            <Icon
              v-for="i in maxStars"
              :key="i"
              icon="game-icons:beveled-star"
              width="15"
              height="15"
              class="sdp-star"
              :class="{ 'sdp-star--on': i <= stars }"
            />
          </div>

          <div class="sdp-xp">
            <div class="sdp-xp-head">
              <Icon icon="game-icons:circle-sparks" width="15" height="15" class="sdp-xp-icon" />
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

      <!-- ── RIGHT — stats, perks and the slot's own gear ── -->
      <div class="sdp-right">
        <!-- perk choice first: it is the only thing here that expires -->
        <div v-if="champion && hasPendingPerk && perkChoices.length > 0" class="sdp-perk-choice">
          <div class="sdp-section-head">
            <span class="sdp-section-accent sdp-section-accent--hot">✦</span>
            <span class="sdp-section-title sdp-section-title--hot">Milestone — choose a perk</span>
            <div class="sdp-section-rule sdp-section-rule--hot" />
          </div>
          <div class="sdp-perk-cards">
            <button
              v-for="perk in perkChoices"
              :key="perk.id"
              class="sdp-perk-card"
              :style="{ '--pc': perk.color }"
              @click="pickPerk(perk.id)"
            >
              <Icon :icon="perk.icon" width="34" height="34" class="sdp-perk-card-icon" />
              <div class="sdp-perk-card-name">{{ perk.name }}</div>
              <div class="sdp-perk-card-desc">{{ perk.desc }}</div>
            </button>
          </div>
        </div>

        <!-- stats -->
        <div v-if="champion && stats">
          <div class="sdp-section-head">
            <span class="sdp-section-accent">✦</span>
            <span class="sdp-section-title">Stats</span>
            <div class="sdp-section-rule" />
            <span class="sdp-section-count">{{ champion }}</span>
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
              </div>
            </div>
          </div>
        </div>

        <!-- perks taken -->
        <div v-if="champion">
          <div class="sdp-section-head">
            <span class="sdp-section-accent">✦</span>
            <span class="sdp-section-title">Perks</span>
            <div class="sdp-section-rule" />
            <span class="sdp-section-count">{{ ownedPerks.length }}</span>
          </div>
          <div v-if="ownedPerks.length > 0" class="sdp-perk-rows">
            <div
              v-for="entry in ownedPerks"
              :key="entry.level"
              class="sdp-perk-row"
              :style="{ '--pc': entry.perk.color }"
            >
              <Icon :icon="entry.perk.icon" width="26" height="26" class="sdp-perk-row-icon" />
              <div class="sdp-perk-row-text">
                <div class="sdp-perk-row-name">
                  {{ entry.perk.name }}
                  <span class="sdp-perk-row-level">Lv {{ entry.level }}</span>
                </div>
                <div class="sdp-perk-row-desc">{{ entry.perk.desc }}</div>
              </div>
            </div>
          </div>
          <div v-else class="sdp-empty-note">
            <template v-if="nextPerkLevel">
              No perks yet — the next choice opens at level {{ nextPerkLevel }}.
            </template>
            <template v-else>No perks — this champion has no milestone left.</template>
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
.sdp-roster {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}
.sdp-roster-role {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 4px;
  background: #0f0b06;
  border: 1px solid var(--rc);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rc);
}
.sdp-roster-role-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.sdp-roster-chips {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(v-bind(rosterColumns), 1fr);
  gap: 7px;
}
/* one chip per champion of the slot — the whole roster is always visible, so
   switching subject never costs a navigation step */
.sdp-chip {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px 5px;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  background: #141410;
  border: 1px solid rgba(200, 164, 90, 0.16);
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
    inset 0 0 0 1px color-mix(in srgb, var(--rc) 40%, transparent),
    0 0 14px color-mix(in srgb, var(--rc) 35%, transparent);
}
/* board hover mirrored onto the chip — same language as its own hover */
.sdp-chip--highlight {
  transform: translateY(-1px);
  border-color: var(--rc);
  box-shadow: 0 0 14px color-mix(in srgb, var(--rc) 45%, transparent);
}
.sdp-chip--empty {
  border-style: dashed;
}
.sdp-chip-img {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  object-fit: cover;
  object-position: top;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--rc) 55%, transparent);
}
.sdp-chip-plus {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #0f0b06;
  font-size: 20px;
  line-height: 1;
  color: var(--rc);
}
.sdp-chip-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sdp-chip-role {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(200, 164, 90, 0.55);
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
}
/* remove-ally affordance — only surfaces on hover so the chip stays calm */
.sdp-chip-clear {
  position: absolute;
  top: -6px;
  right: -6px;
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
.sdp-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1;
  background: rgba(30, 16, 16, 0.7);
  border: 1px solid rgba(180, 70, 50, 0.4);
  color: #d8a090;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.sdp-close:hover {
  background: rgba(120, 30, 20, 0.6);
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
.sdp-splash-bottom {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 11px;
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

/* ── progression block ── */
.sdp-progress {
  flex-shrink: 0;
  padding: 13px 14px;
  background: #16120a;
  border-bottom: 2px solid #5c3310;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.sdp-progress-head {
  display: flex;
  align-items: center;
  gap: 13px;
}
.sdp-progress-title {
  min-width: 0;
}
.sdp-progress-level {
  font-size: 17px;
  color: #dcc99a;
  line-height: 1.1;
}
.sdp-progress-level b {
  font-size: 26px;
  color: #f4e6bc;
}
.sdp-progress-cap {
  font-size: 13px;
  color: rgba(230, 220, 196, 0.4);
}
.sdp-progress-rank {
  margin-top: 3px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rank);
}
.sdp-stars {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 11px;
}
.sdp-star {
  color: #3a3428;
}
.sdp-star--on {
  color: var(--rank);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--rank) 60%, transparent));
}
.sdp-xp {
  margin-top: 12px;
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
.sdp-empty-note {
  padding: 11px 12px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px dashed rgba(200, 164, 90, 0.2);
  font-size: 12.5px;
  color: rgba(230, 220, 196, 0.45);
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

/* ── perk choice ── */
.sdp-perk-choice {
  padding: 12px;
  border-radius: 4px;
  background: #1a1008;
  border: 1px solid #c89040;
  box-shadow: inset 0 0 22px rgba(200, 144, 64, 0.12);
}
.sdp-perk-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 9px;
}
.sdp-perk-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  background: #141410;
  border: 1px solid rgba(200, 164, 90, 0.2);
  border-top: 3px solid var(--pc);
  transition:
    transform 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
}
.sdp-perk-card:hover {
  transform: translateY(-2px);
  border-color: var(--pc);
  box-shadow: 0 0 16px color-mix(in srgb, var(--pc) 38%, transparent);
}
.sdp-perk-card-icon {
  color: var(--pc);
}
.sdp-perk-card-name {
  font-size: 17px;
  color: var(--pc);
  line-height: 1.15;
}
.sdp-perk-card-desc {
  font-size: 12.5px;
  font-weight: 500;
  color: #dcc99a;
  line-height: 1.4;
}

/* ── perks taken ── */
.sdp-perk-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sdp-perk-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-left: 3px solid var(--pc);
}
.sdp-perk-row-icon {
  flex-shrink: 0;
  color: var(--pc);
}
.sdp-perk-row-text {
  flex: 1;
  min-width: 0;
}
.sdp-perk-row-name {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 15.5px;
  color: var(--pc);
  line-height: 1.15;
}
.sdp-perk-row-level {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(230, 220, 196, 0.4);
}
.sdp-perk-row-desc {
  margin-top: 3px;
  font-size: 12.5px;
  font-weight: 500;
  color: #bcae8c;
  line-height: 1.4;
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
  .sdp-progress {
    padding: 11px 14px;
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
  .sdp-splash-select-cta {
    animation: none;
    opacity: 1;
  }
}
</style>
