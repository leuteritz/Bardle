<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useSkinStore } from '@/stores/champions/skinStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useHerald } from '@/composables/ui/useHerald'
import {
  ascensionRank,
  statValueLabel,
  statDeltaLabel,
  CHAMPION_STATS,
  PERK_BY_ID,
} from '@/config/champions/championLevels'
import {
  ALLIES_PER_ROLE,
  CHAMPION_PERK_INTERVAL,
  CHAMPION_BASE_HP_BY_ROLE,
  CHAMPION_HP_PER_STAR,
  CHAMPION_LEVEL_MAX_CAP,
  CHAMPION_REGALIA_SIZE_ALLY,
  CHAMPION_REGALIA_SIZE_SPLASH,
  ROLES,
  SKIN_ORIGINAL,
  SWORN_ALLY_COUNT,
  SWORN_ICON,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
  TEAM_VALUE_PLACEHOLDER,
} from '@/config/constants'
import {
  getChampionOrigin,
  getOriginColor,
  ORIGIN_SYNERGIES,
} from '@/config/champions/championOrigins'
import { getChampionStarLevel, getChampionTier } from '@/config/champions/championTiers'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/champions/championTraits'
import { MATERIALS } from '@/config/economy/materials'
import { ITEM_RARITIES, ITEM_SETS, SHOP_ITEMS } from '@/config/economy/items'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import type { ChampionPerkDef, ChampionStatKey, ItemCategory, ShopItem } from '@/types'
import {
  getChampionSkins,
  formatSkinName,
  getOriginalPreviewPath,
  getSkinImagePath,
} from '@/utils/game/champions'
import { allySlotLabel } from '@/utils/ui/format'
import ChampionLevelBadge from './ChampionLevelBadge.vue'
import ChampionSwapCompare from './swap/ChampionSwapCompare.vue'
import ChampionSwapGrid from './swap/ChampionSwapGrid.vue'

const props = defineProps<{
  roleIndex: number
  highlightedAlly?: number | null
  focusAlly?: number | null
  focusToken?: number
  focusSwap?: boolean
  closeSwapToken?: number
}>()
const emit = defineEmits<{
  assign: [subSlot: number, champion: string]
  'clear-ally': [subSlot: number]
  'pick-equipment': [category: ItemCategory]
  'hover-ally': [subSlot: number | null]
  'swap-state': [open: boolean]
}>()

const panelWidthPx = `${TEAM_SIGIL_DETAILS_PANEL_WIDTH}px`
const MAIN_SUBJECT = -1
const CATEGORIES: ItemCategory[] = ['weapon', 'armor', 'artefact']
const GHOST_META = ['Tier', 'Origin', 'Trait']
const CAT_LABELS: Record<ItemCategory, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  artefact: 'Artefact',
}
const battleStore = useBattleStore()
const gameStore = useGameStore()
const itemStore = useItemStore()
const skinStore = useSkinStore()
const levelStore = useChampionLevelStore()
const { announceReceipt } = useHerald()
const { headerSlots, secondarySlots } = storeToRefs(battleStore)
const roleDef = computed(() => ROLES[props.roleIndex])
const main = computed(() => headerSlots.value[props.roleIndex])
const allies = computed(
  () => secondarySlots.value[props.roleIndex] ?? Array<string | null>(ALLIES_PER_ROLE).fill(null),
)
const subject = ref(props.focusAlly ?? MAIN_SUBJECT)
const swapOpen = ref(!!props.focusSwap)
const candidate = ref<string | null>(null)
const skinOpen = ref(false)
const champion = computed(() =>
  subject.value === MAIN_SUBJECT ? main.value : (allies.value[subject.value] ?? null),
)
const championImage = computed(() =>
  champion.value ? battleStore.getChampionImage(champion.value) : '',
)
const rosterSeats = computed(() => [
  { sub: MAIN_SUBJECT, name: main.value, label: 'Main', ally: false },
  ...allies.value.map((name, sub) => ({ sub, name, label: allySlotLabel(sub), ally: true })),
])
const subjectSeatLabel = computed(() =>
  subject.value === MAIN_SUBJECT ? 'Main' : allySlotLabel(subject.value),
)
const boardSpotlight = computed(
  () => props.highlightedAlly !== null && props.highlightedAlly !== undefined,
)

watch(swapOpen, (open) => emit('swap-state', open), { immediate: true })
watch(
  () => [props.roleIndex, props.focusToken] as const,
  () => {
    subject.value = props.focusAlly ?? MAIN_SUBJECT
    candidate.value = null
    swapOpen.value = !!props.focusSwap
    skinOpen.value = false
  },
)
watch(
  () => props.closeSwapToken,
  () => closeSwap(),
)
watch(allies, (slots) => {
  if (!swapOpen.value && subject.value !== MAIN_SUBJECT && !slots[subject.value])
    subject.value = MAIN_SUBJECT
})
function selectSubject(seat: number) {
  if (swapOpen.value) {
    subject.value = seat
    candidate.value = null
  } else if (seat !== MAIN_SUBJECT && !allies.value[seat]) openSwap(seat)
  else subject.value = seat
}
function openSwap(seat: number) {
  subject.value = seat
  candidate.value = null
  swapOpen.value = true
}
function closeSwap() {
  swapOpen.value = false
  candidate.value = null
}
function assignChampion(name: string) {
  emit('assign', subject.value, name)
  closeSwap()
}
function needsAttentionOf(name: string) {
  return levelStore.needsAttention(name)
}
function levelOf(name: string) {
  return levelStore.levelOf(name)
}

const tier = computed(() => (champion.value ? getChampionTier(champion.value) : null))
const origin = computed(() => (champion.value ? getChampionOrigin(champion.value) : null))
const originColor = computed(() => getOriginColor(champion.value))
const originIcon = computed(() =>
  origin.value
    ? ((ORIGIN_SYNERGIES as Record<string, { icon: string } | undefined>)[origin.value]?.icon ?? '')
    : '',
)
const traits = computed(() =>
  (CHAMPION_TRAITS[champion.value ?? ''] ?? []).map((id) => TRAIT_BY_ID[id]),
)
const equippedSkin = computed(() =>
  champion.value ? skinStore.getSelectedSkin(champion.value) : SKIN_ORIGINAL,
)
const skinEntries = computed(() =>
  champion.value
    ? [
        {
          id: SKIN_ORIGINAL,
          label: formatSkinName(SKIN_ORIGINAL),
          image: getOriginalPreviewPath(champion.value, 'lg'),
        },
        ...getChampionSkins(champion.value)
          .filter((skin) => skin !== SKIN_ORIGINAL)
          .map((skin) => ({
            id: skin,
            label: formatSkinName(skin),
            image: getSkinImagePath(champion.value!, skin, 'lg'),
          })),
      ]
    : [],
)
function equipSkin(id: string, label: string) {
  if (!champion.value || id === equippedSkin.value) return
  skinStore.setSkin(champion.value, id)
  skinOpen.value = false
  announceReceipt({
    kind: 'equip',
    headline: label,
    subline: champion.value,
    portraitSrc: battleStore.getChampionImage(champion.value, { size: 'md' }),
    mergeKey: 'equip',
  })
}

const level = computed(() => (champion.value ? levelStore.levelOf(champion.value) : 1))
const cap = computed(() => levelStore.levelCap)
const atCap = computed(() => level.value >= cap.value)
const nextLevel = computed(() => level.value + 1)
const rank = computed(() => ascensionRank(level.value))
const xpBar = computed(() =>
  champion.value
    ? levelStore.xpBarOf(champion.value)
    : { current: 0, needed: 1, pct: 0, capped: false },
)
const cost = computed(() =>
  champion.value ? levelStore.costOf(champion.value) : { chimes: 0, materials: {} },
)
const canLevel = computed(() => !!champion.value && levelStore.canLevelUp(champion.value))
const materialCosts = computed(() =>
  Object.entries(cost.value.materials).map(([id, qty]) => ({
    id,
    qty,
    def: MATERIALS.find((material) => material.id === id) ?? null,
  })),
)
const affordsChimes = computed(() => gameStore.chimes >= cost.value.chimes)
function doLevelUp() {
  if (!champion.value || !levelStore.levelUp(champion.value)) return
  announceReceipt({
    kind: 'levelup',
    headline: champion.value,
    subline: `Level ${levelStore.levelOf(champion.value)}`,
    portraitSrc: battleStore.getChampionImage(champion.value, { size: 'md' }),
    delta: { value: 1, unit: 'levels', unitOne: 'level' },
    mergeKey: `levelup/champ/${champion.value}`,
  })
}

const stats = computed(() => (champion.value ? levelStore.effectiveStatsOf(champion.value) : null))
const swornBonus = computed(() => (champion.value ? levelStore.swornBonusOf(champion.value) : null))
const hasSwornBonus = computed(
  () => !!swornBonus.value && Object.values(swornBonus.value).some((value) => value > 0),
)
const cooldownRush = computed(() =>
  champion.value ? levelStore.perkEffectOf(champion.value, 'cooldownRush') : 0,
)
const statPeak = computed(() =>
  stats.value ? Math.max(...CHAMPION_STATS.map((stat) => stats.value![stat.key])) : 0,
)
const championMaxHp = computed(() => {
  if (!champion.value) return 0
  const role = roleDef.value.key
  return Math.round(
    CHAMPION_BASE_HP_BY_ROLE[role] *
      (1 + (getChampionStarLevel(champion.value) - 1) * CHAMPION_HP_PER_STAR) *
      levelStore.vitalityMultOf(champion.value),
  )
})
const statCtx = computed(() => ({
  role: roleDef.value.key,
  maxHp: championMaxHp.value,
  cooldownRush: cooldownRush.value,
}))
function statValueOf(key: ChampionStatKey) {
  return stats.value ? statValueLabel(key, stats.value, statCtx.value) : ''
}
function statDeltaOf(key: ChampionStatKey) {
  return stats.value ? statDeltaLabel(key, stats.value, statCtx.value) : ''
}
function statDisplayName(key: ChampionStatKey) {
  return {
    power: 'Damage power',
    vitality: 'Max HP',
    focus: 'Ability cooldown',
    fortune: 'Loot rewards',
  }[key]
}
function statShare(key: ChampionStatKey) {
  return stats.value && statPeak.value > 0 ? stats.value[key] / statPeak.value : 0
}

interface PerkSlot {
  level: number
  perk: ChampionPerkDef | null
  state: 'taken' | 'open' | 'locked'
}
const perkChoices = computed(() => (champion.value ? levelStore.perkChoicesOf(champion.value) : []))
const pendingPerkLevel = computed(
  () => levelStore.pendingPerks.find((perk) => perk.champion === champion.value)?.level ?? null,
)
// Ohne Champion traegt der Pfad dieselben Meilensteine, nur alle gesperrt.
const perkPath = computed<PerkSlot[]>(() => {
  const taken: Record<number, string> = champion.value
    ? levelStore.progressOf(champion.value).perks
    : {}
  const path: PerkSlot[] = []
  for (
    let milestone = CHAMPION_PERK_INTERVAL;
    milestone <= CHAMPION_LEVEL_MAX_CAP;
    milestone += CHAMPION_PERK_INTERVAL
  ) {
    const perk = taken[milestone] ? (PERK_BY_ID[taken[milestone]] ?? null) : null
    path.push({
      level: milestone,
      perk,
      state: perk ? 'taken' : pendingPerkLevel.value === milestone ? 'open' : 'locked',
    })
  }
  return path
})
const takenPerkCount = computed(
  () => perkPath.value.filter((slot) => slot.state === 'taken').length,
)
const perkCountLabel = computed(
  () =>
    `${champion.value ? takenPerkCount.value : TEAM_VALUE_PLACEHOLDER}/${perkPath.value.length}`,
)
const activePerks = computed(() =>
  perkPath.value.filter((slot): slot is PerkSlot & { perk: ChampionPerkDef } => !!slot.perk),
)
const unfilledPerks = computed(() => perkPath.value.filter((slot) => !slot.perk))
const clickedPerkLevel = ref<number | null>(null)
const openPerkSlot = computed(() => perkPath.value.find((slot) => slot.state === 'open') ?? null)
const focusedPerkSlot = computed<PerkSlot | null>(() => {
  const path = perkPath.value
  return (
    path.find((slot) => slot.level === clickedPerkLevel.value) ??
    openPerkSlot.value ??
    [...path].reverse().find((slot) => slot.state === 'taken') ??
    path.find((slot) => slot.state === 'locked') ??
    path[0] ??
    null
  )
})
watch(champion, () => {
  clickedPerkLevel.value = null
})
function pickPerk(perkId: string) {
  if (!champion.value || !levelStore.choosePerk(champion.value, perkId)) return
  announceReceipt({
    kind: 'perk',
    headline: PERK_BY_ID[perkId]?.name ?? perkId,
    subline: champion.value,
    portraitSrc: battleStore.getChampionImage(champion.value, { size: 'md' }),
    mergeKey: 'perk/champ',
  })
}

const equipment = computed(() => itemStore.slotEquipment[props.roleIndex])
const equippedCount = computed(
  () => CATEGORIES.filter((category) => equipment.value[category]).length,
)
function equippedItem(category: ItemCategory): ShopItem | null {
  const id = equipment.value[category]
  return id ? (SHOP_ITEMS.find((item) => item.id === id) ?? null) : null
}
function equipmentEffectLine(item: ShopItem): string {
  const effects: string[] = []
  if (item.effects.powerMultiplier) {
    effects.push(`+${Math.round((item.effects.powerMultiplier - 1) * 100)}% Combat Power`)
  }
  if (item.effects.cpsMultiplier) {
    effects.push(`+${Math.round((item.effects.cpsMultiplier - 1) * 100)}% Chimes / sec`)
  }
  return effects.join(' · ')
}
function equipmentDetailLine(item: ShopItem): string {
  const set = item.setId ? ITEM_SETS.find((entry) => entry.setId === item.setId) : null
  if (set) return `${set.setName} set · ${set.description}`
  return item.description
}
function equipmentRarityLabel(item: ShopItem): string {
  return ITEM_RARITIES.find((rarity) => rarity.id === item.rarity)?.label ?? item.rarity
}
function perkStatLine(perk: ChampionPerkDef): string {
  const stats = Object.entries(perk.stats ?? {}).map(([key, value]) => {
    const stat = CHAMPION_STATS.find((entry) => entry.key === key)
    return `+${formatNumberCompact(value)} ${stat?.short ?? key}`
  })
  return stats.join(' · ')
}
</script>

<template>
  <section class="sdp-panel" :style="{ '--rc': roleDef.color }">
    <header class="sdp-roster">
      <div class="sdp-seat-list" @mouseleave="emit('hover-ally', null)">
        <div
          v-for="seat in rosterSeats"
          :key="seat.sub"
          class="sdp-seat"
          :class="{
            'sdp-seat--active': subject === seat.sub,
            'sdp-seat--empty': !seat.name,
            'sdp-seat--main': !seat.ally,
            'sdp-seat--sworn': seat.ally && seat.sub < SWORN_ALLY_COUNT,
            'sdp-seat--ally': seat.ally && seat.sub >= SWORN_ALLY_COUNT,
            'sdp-seat--highlight': highlightedAlly === seat.sub,
            'sdp-seat--dimmed': boardSpotlight && seat.ally && highlightedAlly !== seat.sub,
          }"
        >
          <button
            class="sdp-seat-select"
            type="button"
            :aria-label="seat.name ? `${seat.label}: ${seat.name}` : `Assign ${seat.label}`"
            v-tip="seat.name ? `${seat.name} · ${seat.label}` : `Assign ${seat.label}`"
            @click="selectSubject(seat.sub)"
            @mouseenter="emit('hover-ally', seat.ally ? seat.sub : null)"
          >
            <img
              v-if="seat.name"
              :src="battleStore.getChampionImage(seat.name, { size: 'md' })"
              alt=""
            /><Icon v-else icon="lucide:plus" width="18" height="18" /><span
              class="sdp-seat-label"
              >{{ seat.label }}</span
            >
            <ChampionLevelBadge
              v-if="seat.name"
              :level="levelOf(seat.name)"
              :color="roleDef.color"
              :size="CHAMPION_REGALIA_SIZE_ALLY"
              :attention="needsAttentionOf(seat.name)"
              class="sdp-seat-level"
            />
          </button>
          <button
            v-if="seat.ally && seat.name"
            class="sdp-seat-remove"
            type="button"
            v-tip="`Remove ${seat.name}`"
            :aria-label="`Remove ${seat.name}`"
            @click="emit('clear-ally', seat.sub)"
          >
            <Icon icon="lucide:x" width="14" height="14" />
          </button>
        </div>
      </div>
    </header>

    <div class="sdp-content" :class="{ 'sdp-content--swap': swapOpen }">
      <ChampionSwapCompare
        v-if="swapOpen"
        class="sdp-swap-compare"
        :role-index="roleIndex"
        :sub-slot="subject"
        :seat-label="subjectSeatLabel"
        :current="champion"
        :candidate="candidate"
        @cancel="closeSwap"
        @assign="assignChampion"
      />
      <div v-else class="sdp-hero">
        <button
          class="sdp-portrait"
          type="button"
          :aria-label="champion ? `Change ${champion}` : 'Select champion'"
          @click="openSwap(subject)"
        >
          <template v-if="champion"
            ><img :src="championImage" :alt="champion" /><span
              class="sdp-portrait-shade"
            /><ChampionLevelBadge
              :level="level"
              :color="roleDef.color"
              :size="CHAMPION_REGALIA_SIZE_SPLASH"
              :attention="needsAttentionOf(champion)"
              class="sdp-hero-level"
            /><span class="sdp-portrait-change"
              ><Icon icon="lucide:repeat-2" width="16" height="16" /> Change</span
            ></template
          >
          <template v-else
            ><img :src="roleDef.image" :alt="roleDef.label" class="sdp-empty-art" /><span
              class="sdp-portrait-shade"
            /><span class="sdp-ghost-regalia" aria-hidden="true">{{ TEAM_VALUE_PLACEHOLDER }}</span
            ><span class="sdp-empty-state"
              ><span class="sdp-empty-mark"
                ><span class="sdp-empty-ring" aria-hidden="true" /><Icon
                  icon="lucide:user-plus"
                  width="26"
                  height="26" /></span
              ><strong>Assign champion</strong
              ><span class="sdp-empty-caption"
                ><small class="sdp-empty-hint">Click to browse the roster</small
                ><small class="sdp-empty-cta">Open the roster</small></span
              ></span
            ></template
          >
        </button>
        <template v-if="champion">
          <button
            v-if="skinEntries.length > 1"
            class="sdp-skin-trigger"
            type="button"
            :aria-expanded="skinOpen"
            @click="skinOpen = !skinOpen"
          >
            <Icon icon="lucide:palette" width="16" height="16" />
            <span>Skins</span>
            <em>{{ skinEntries.length }}</em>
            <Icon
              :icon="skinOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
              width="15"
              height="15"
            />
          </button>
          <div v-if="skinOpen" class="sdp-skin-popover">
            <div class="sdp-skin-popover-head">
              <span>Choose appearance</span
              ><small>{{
                equippedSkin === SKIN_ORIGINAL ? 'Original' : formatSkinName(equippedSkin)
              }}</small>
            </div>
            <div class="sdp-skin-list">
              <button
                v-for="entry in skinEntries"
                :key="entry.id"
                type="button"
                class="sdp-skin"
                :class="{ 'sdp-skin--selected': entry.id === equippedSkin }"
                :aria-pressed="entry.id === equippedSkin"
                v-tip="entry.label"
                @click="equipSkin(entry.id, entry.label)"
              >
                <img :src="entry.image" :alt="entry.label" /><span>{{ entry.label }}</span>
              </button>
            </div>
          </div>
          <div class="sdp-identity">
            <p class="sdp-seat-name">{{ subjectSeatLabel }}</p>
            <h2>{{ champion }}</h2>
            <div class="sdp-meta">
              <span v-if="tier" :style="{ color: tier.color }">★ {{ tier.name }}</span
              ><span v-if="origin" :style="{ color: originColor }"
                ><Icon v-if="originIcon" :icon="originIcon" width="14" height="14" />{{
                  origin
                }}</span
              ><span v-for="trait in traits" :key="trait.id" :style="{ color: trait.color }"
                ><Icon :icon="trait.icon" width="14" height="14" />{{ trait.name }}</span
              >
            </div>
          </div>
          <div class="sdp-progression">
            <div class="sdp-xp-head">
              <span
                >Level {{ level }} <small>{{ rank.name }}</small></span
              ><span v-if="xpBar.capped">{{ $formatNumber(xpBar.current) }} banked</span
              ><span v-else
                >{{ $formatNumber(xpBar.current) }} / {{ $formatNumber(xpBar.needed) }} XP</span
              >
            </div>
            <div class="sdp-xp-track">
              <span :style="{ transform: `scaleX(${Math.min(1, xpBar.pct)})` }" />
            </div>
          </div>
          <div v-if="stats" class="sdp-hero-stat-block">
            <div class="sdp-hero-stat-head">
              <span>Combat stats</span
              ><small v-if="hasSwornBonus"
                ><Icon :icon="SWORN_ICON" width="13" height="13" /> Sworn included</small
              >
            </div>
            <div class="sdp-hero-stat-grid">
              <article
                v-for="stat in CHAMPION_STATS"
                :key="stat.key"
                class="sdp-stat"
                :style="{ '--sc': stat.color }"
                v-tip="stat.desc"
              >
                <Icon :icon="stat.icon" width="24" height="24" />
                <div>
                  <small>{{ statDisplayName(stat.key) }}</small
                  ><strong>{{ statValueOf(stat.key) }}</strong
                  ><span>{{ statDeltaOf(stat.key) }}</span>
                </div>
                <i><b :style="{ transform: `scaleX(${statShare(stat.key)})` }" /></i>
              </article>
            </div>
          </div>
          <button
            class="sdp-level-button"
            :class="{ 'sdp-level-button--locked': !canLevel }"
            type="button"
            :disabled="!canLevel"
            v-tip="atCap ? 'This champion is at the level cap' : `Cost of level ${nextLevel}`"
            @click="doLevelUp"
          >
            <span
              ><Icon icon="game-icons:circle-sparks" width="20" height="20" />{{
                atCap ? 'Level Cap Reached' : `Level Up · ${nextLevel}`
              }}</span
            ><span v-if="!atCap" class="sdp-level-cost"
              ><img src="/img/BardAbilities/BardChime-128.png" alt="Chimes" />{{
                $formatNumber(cost.chimes)
              }}<template v-for="material in materialCosts" :key="material.id"
                ><img v-if="material.def" :src="material.def.image" :alt="material.def.name" />{{
                  material.qty
                }}</template
              ></span
            >
          </button>
          <p v-if="!affordsChimes && !atCap" class="sdp-shortfall">More Chimes are needed.</p>
        </template>
        <template v-else>
          <div class="sdp-identity sdp-ghost" aria-hidden="true">
            <p class="sdp-seat-name">{{ subjectSeatLabel }}</p>
            <h2 class="sdp-ghost-name">Empty Seat</h2>
            <div class="sdp-meta">
              <span v-for="facet in GHOST_META" :key="facet" class="sdp-ghost-chip"
                >{{ facet }} {{ TEAM_VALUE_PLACEHOLDER }}</span
              >
            </div>
          </div>
          <div class="sdp-progression sdp-ghost" aria-hidden="true">
            <div class="sdp-xp-head">
              <span
                >Level {{ TEAM_VALUE_PLACEHOLDER }} <small>Unranked</small></span
              ><span>{{ TEAM_VALUE_PLACEHOLDER }} / {{ TEAM_VALUE_PLACEHOLDER }} XP</span>
            </div>
            <div class="sdp-xp-track sdp-xp-track--ghost"><span /></div>
          </div>
          <div class="sdp-hero-stat-block sdp-ghost">
            <div class="sdp-hero-stat-head"><span>Combat stats</span><small>Preview</small></div>
            <div class="sdp-hero-stat-grid">
              <article
                v-for="stat in CHAMPION_STATS"
                :key="stat.key"
                class="sdp-stat sdp-stat--ghost"
                :style="{ '--sc': stat.color }"
                v-tip="stat.desc"
              >
                <Icon :icon="stat.icon" width="24" height="24" />
                <div>
                  <small>{{ statDisplayName(stat.key) }}</small
                  ><strong>{{ TEAM_VALUE_PLACEHOLDER }}</strong
                  ><span>{{ stat.effectLabel }}</span>
                </div>
                <i><b /></i>
              </article>
            </div>
          </div>
          <button
            class="sdp-level-button sdp-level-button--ghost"
            type="button"
            v-tip="`Assign a champion to ${subjectSeatLabel}`"
            @click="openSwap(subject)"
          >
            <span
              ><Icon icon="lucide:user-plus" width="20" height="20" />Choose champion</span
            ><span class="sdp-ghost-note">Levels, perks and stats unlock</span>
          </button>
        </template>
      </div>
      <ChampionSwapGrid
        v-if="swapOpen"
        class="sdp-swap-grid"
        :role-key="roleDef.key"
        :role-index="roleIndex"
        :sub-slot="subject"
        @select="assignChampion"
        @preview="candidate = $event"
      />
      <div v-else class="sdp-workspace">
        <div class="sdp-section sdp-section--equipment">
          <div class="sdp-section-head">
            <span>Role equipment</span><small>{{ equippedCount }}/{{ CATEGORIES.length }}</small>
          </div>
          <div class="sdp-equipment-list">
            <button
              v-for="category in CATEGORIES"
              :key="category"
              type="button"
              class="sdp-equipment"
              :class="{ 'sdp-equipment--empty': !equippedItem(category) }"
              v-tip="equippedItem(category)?.name ?? `Equip ${CAT_LABELS[category]}`"
              @click="emit('pick-equipment', category)"
            >
              <template v-if="equippedItem(category)"
                ><img
                  v-if="equippedItem(category)!.icon.startsWith('/')"
                  :src="equippedItem(category)!.icon"
                  :alt="equippedItem(category)!.name"
                /><Icon
                  v-else-if="equippedItem(category)!.icon.includes(':')"
                  :icon="equippedItem(category)!.icon"
                  width="28"
                  height="28"
                  class="sdp-equipment-icon"
                /><span v-else class="sdp-equipment-icon">{{ equippedItem(category)!.icon }}</span
                ><span class="sdp-equipment-copy"
                  ><span class="sdp-equipment-head"
                    ><strong>{{ equippedItem(category)!.name }}</strong
                    ><small>{{ equipmentRarityLabel(equippedItem(category)!) }}</small></span
                  ><span class="sdp-equipment-stats">{{
                    equipmentEffectLine(equippedItem(category)!)
                  }}</span
                  ><small>{{ equipmentDetailLine(equippedItem(category)!) }}</small></span
              ></template
              ><template v-else
                ><img
                  :src="`/img/itemShop/${category}-128.png`"
                  :alt="CAT_LABELS[category]"
                /><span class="sdp-equipment-copy"
                  ><strong>Equip {{ CAT_LABELS[category] }}</strong
                  ><small>Choose a relic to strengthen this role.</small></span
              ></template
              >
            </button>
          </div>
        </div>
        <div
          class="sdp-section sdp-section--perks"
          :class="{ 'sdp-section--open': openPerkSlot, 'sdp-ghost': !champion }"
        >
          <div class="sdp-section-head">
            <span>Perk path</span
            ><small>{{ openPerkSlot ? 'Choose a perk' : perkCountLabel }}</small>
          </div>
          <div class="sdp-perk-rail">
            <button
              v-for="slot in perkPath"
              :key="slot.level"
              class="sdp-perk-node"
              :class="[
                `sdp-perk-node--${slot.state}`,
                { 'sdp-perk-node--active': slot.level === focusedPerkSlot?.level },
              ]"
              :style="slot.perk ? { '--pc': slot.perk.color } : undefined"
              type="button"
              v-tip="slot.perk ? `${slot.perk.name} · ${slot.perk.desc}` : `Level ${slot.level}`"
              @click="clickedPerkLevel = slot.level"
            >
              <Icon v-if="slot.perk" :icon="slot.perk.icon" width="20" height="20" /><Icon
                v-else-if="slot.state === 'open'"
                icon="game-icons:ribbon-medal"
                width="19"
                height="19"
              /><span v-else>{{ slot.level }}</span>
            </button>
          </div>
          <div
            v-if="!champion"
            class="sdp-active-perks sdp-ghost-perks"
            aria-label="Perk milestones"
          >
            <article
              v-for="slot in perkPath"
              :key="'ghost-' + slot.level"
              class="sdp-active-perk sdp-active-perk--locked"
            >
              <Icon icon="lucide:lock-keyhole" width="22" height="22" />
              <span class="sdp-active-perk-copy"
                ><span class="sdp-active-perk-head"
                  ><small class="sdp-active-perk-level">Lv. {{ slot.level }}</small
                  ><strong class="sdp-active-perk-name">Locked</strong></span
                ><small class="sdp-ghost-perk-hint">Future milestone</small></span
              >
            </article>
          </div>
          <div v-else-if="activePerks.length" class="sdp-active-perks" aria-label="Active perks">
            <article
              v-for="slot in activePerks"
              :key="slot.level"
              class="sdp-active-perk"
              :style="{ '--pc': slot.perk.color }"
              v-tip="`Level ${slot.level} · ${slot.perk.desc}`"
            >
              <Icon :icon="slot.perk.icon" width="25" height="25" />
              <span class="sdp-active-perk-copy"
                ><span class="sdp-active-perk-head"
                  ><small class="sdp-active-perk-level">Lv. {{ slot.level }}</small
                  ><strong class="sdp-active-perk-name">{{ slot.perk.name }}</strong></span
                ><span>{{ perkStatLine(slot.perk) }}</span
                ><p>{{ slot.perk.desc }}</p></span
              >
            </article>
            <article
              v-for="slot in unfilledPerks"
              :key="'unfilled-' + slot.level"
              class="sdp-active-perk sdp-active-perk--locked"
              :class="{ 'sdp-active-perk--open': slot.state === 'open' }"
            >
              <Icon
                :icon="slot.state === 'open' ? 'game-icons:ribbon-medal' : 'lucide:lock-keyhole'"
                width="25"
                height="25"
              />
              <span class="sdp-active-perk-copy"
                ><span class="sdp-active-perk-head"
                  ><small class="sdp-active-perk-level">Lv. {{ slot.level }}</small
                  ><strong class="sdp-active-perk-name">{{
                    slot.state === 'open' ? 'Choose a perk' : 'Locked'
                  }}</strong></span
                ><span>{{
                  slot.state === 'open' ? 'One final elite choice remains.' : 'Future milestone'
                }}</span
                ><p>{{
                  slot.state === 'open'
                    ? 'Select a remaining elite perk below.'
                    : 'Unlocks when this role reaches level ' + slot.level + '.'
                }}</p></span
              >
            </article>
          </div>
          <div v-else class="sdp-perk-empty">
            <Icon
              v-if="openPerkSlot"
              icon="game-icons:ribbon-medal"
              width="21"
              height="21"
            />
            <Icon v-else icon="lucide:lock-keyhole" width="19" height="19" />
            <span>{{
              openPerkSlot
                ? 'Milestone reached — choose a perk below.'
                : `First perk unlocks at level ${CHAMPION_PERK_INTERVAL}.`
            }}</span>
          </div>
          <div v-if="openPerkSlot" class="sdp-perk-choices">
            <button
              v-for="perk in perkChoices"
              :key="perk.id"
              type="button"
              :style="{ '--pc': perk.color }"
              v-tip="perk.desc"
              @click="pickPerk(perk.id)"
            >
              <Icon :icon="perk.icon" width="22" height="22" /><span
                ><strong>{{ perk.name }}</strong
                ><em>{{ perkStatLine(perk) }}</em><small>{{ perk.desc }}</small></span
              >
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sdp-panel {
  width: v-bind(panelWidthPx);
  min-height: 0;
  flex: 0 0 auto;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--rc) 10%, #111008);
  border-left: 3px solid #5c3310;
  color: #f0dfb3;
}
.sdp-roster {
  min-height: 108px;
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: color-mix(in srgb, var(--rc) 18%, #111008);
  border-bottom: 3px solid #5c3310;
}
.sdp-seat-list {
  min-width: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 1.22fr repeat(2, 1.08fr) repeat(3, minmax(0, 0.87fr));
  gap: 8px;
}
.sdp-seat {
  position: relative;
  min-width: 0;
  height: 86px;
  overflow: hidden;
  border: 1px solid #493116;
  background: color-mix(in srgb, var(--rc) 12%, #141410);
  border-radius: 4px;
  opacity: 1;
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.sdp-seat--active {
  border: 2px solid var(--rc);
}
.sdp-seat--main {
  border: 2px solid color-mix(in srgb, var(--rc) 74%, #e8c040);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, #fff2b5 32%, transparent),
    0 0 14px color-mix(in srgb, var(--rc) 28%, transparent);
}
.sdp-seat--sworn {
  border-color: color-mix(in srgb, var(--rc) 62%, #8b632c);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rc) 18%, transparent);
}
.sdp-seat--ally {
  border-color: color-mix(in srgb, var(--rc) 34%, #493116);
}
.sdp-seat--empty {
  border-style: dashed;
  color: #a18b63;
}
.sdp-seat--highlight {
  transform: translateY(-2px);
  border-color: var(--rc);
}
.sdp-seat--dimmed {
  opacity: 0.42;
}
.sdp-seat-select {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: #141410;
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.sdp-seat-select img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.82;
}
.sdp-seat--main .sdp-seat-select img {
  transform: scale(1.04);
}
.sdp-seat-select::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, #100d08 4%, transparent 75%);
}
.sdp-seat-select > svg {
  position: absolute;
  inset: 0;
  margin: auto;
}
.sdp-seat-label {
  position: absolute;
  z-index: 1;
  bottom: 5px;
  left: 7px;
  color: #e8c040;
  font-size: 11px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.sdp-seat-level {
  position: absolute;
  z-index: 2;
  top: 3px;
  right: 3px;
}
.sdp-seat-remove {
  position: absolute;
  z-index: 3;
  top: 3px;
  left: 3px;
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  padding: 0;
  border: 1px solid #7d4033;
  border-radius: 3px;
  background: #27110d;
  color: #eab0a2;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.sdp-seat:hover .sdp-seat-remove,
.sdp-seat:focus-within .sdp-seat-remove {
  opacity: 1;
}
.sdp-content {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sdp-content--swap {
  display: grid;
  grid-template-columns: 43% 57%;
}
.sdp-hero {
  position: relative;
  min-width: 0;
  min-height: 294px;
  display: grid;
  grid-template-columns: 48% minmax(0, 1fr);
  grid-template-rows: auto auto auto auto;
  column-gap: 20px;
  padding: 10px 20px;
  border-bottom: 2px solid #3e200a;
  background: color-mix(in srgb, var(--rc) 16%, #141410);
}
.sdp-portrait {
  position: relative;
  grid-row: 1 / 5;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  padding: 0;
  outline: 2px solid #7a4e20;
  outline-offset: -2px;
  border-radius: 4px;
  background: #111008;
  color: #f0dfb3;
  cursor: pointer;
}
.sdp-portrait > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}
.sdp-portrait:hover > img {
  transform: scale(1.025);
}
.sdp-portrait > img,
.sdp-portrait-change {
  transition:
    transform 0.18s,
    opacity 0.18s;
}
.sdp-portrait-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, #0c0b08 1%, transparent 55%);
}
.sdp-hero-level {
  position: absolute;
  top: 14px;
  left: 14px;
}
.sdp-portrait-change {
  position: absolute;
  right: 10px;
  top: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 7px;
  border: 1px solid #8b632c;
  border-radius: 3px;
  background: #111008;
  color: #e8c040;
  font-size: 12px;
  opacity: 0;
}
.sdp-portrait:hover .sdp-portrait-change,
.sdp-portrait:focus-visible .sdp-portrait-change {
  opacity: 1;
}
.sdp-skin-trigger {
  position: absolute;
  z-index: 3;
  top: 16px;
  right: 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 33px;
  padding: 6px 9px;
  border: 1px solid #8b632c;
  border-radius: 4px;
  background: color-mix(in srgb, #111008 88%, var(--rc));
  color: #f0dfb3;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.sdp-skin-trigger:hover,
.sdp-skin-trigger[aria-expanded='true'] {
  border-color: #e8c040;
  color: #e8c040;
}
.sdp-skin-trigger em {
  min-width: 17px;
  padding: 1px 4px;
  border-radius: 9px;
  background: var(--rc);
  color: #111008;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
  text-align: center;
}
.sdp-skin-popover {
  position: absolute;
  z-index: 5;
  top: 57px;
  right: 20px;
  left: 20px;
  padding: 10px;
  border: 1px solid #8b632c;
  border-radius: 5px;
  background: #111008;
  box-shadow: 0 14px 30px #000c;
}
.sdp-skin-popover-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px 8px;
  border-bottom: 1px solid #3e200a;
  color: #e8c040;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sdp-skin-popover-head small {
  overflow: hidden;
  color: #bcae91;
  font-size: 10px;
  letter-spacing: 0;
  text-overflow: ellipsis;
  text-transform: none;
  white-space: nowrap;
}
.sdp-empty-art {
  opacity: 0.38;
}
.sdp-empty-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 8px;
  color: #e8c040;
  font-size: 15px;
}
.sdp-empty-state svg {
  margin: auto;
}
.sdp-identity {
  align-self: start;
  padding: 8px 6px 5px;
}
.sdp-seat-name {
  margin: 0 0 2px;
  color: var(--rc);
  font-size: 11px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.sdp-identity h2 {
  margin: 0;
  color: #f3d57b;
  font-size: 40px;
  font-weight: 400;
  line-height: 1;
}
.sdp-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  margin-top: 4px;
  font-size: 11px;
}
.sdp-meta span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.sdp-progression {
  padding: 0 6px 5px;
}
.sdp-xp-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  color: #e8c040;
  font-size: 16px;
}
.sdp-xp-head small {
  color: var(--rc);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sdp-xp-track {
  height: 9px;
  overflow: hidden;
  background: #050504;
  border: 1px solid #5c3310;
}
.sdp-xp-track span {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left;
  background: linear-gradient(90deg, var(--rc), #e8c040);
}
.sdp-hero-stat-block {
  grid-column: 2;
  padding: 0;
}
.sdp-hero-stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 27px;
  border-bottom: 1px solid #5c3310;
  color: #e8c040;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sdp-hero-stat-head small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #a59675;
  font-size: 10px;
}
.sdp-level-button {
  grid-column: 2;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  padding: 9px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #f6edcd;
  cursor: pointer;
  font: inherit;
}
.sdp-level-button > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.sdp-level-cost {
  color: #fff3c2;
  font-size: 14px;
}
.sdp-level-cost img {
  width: 17px;
  height: 17px;
  object-fit: contain;
}
.sdp-level-button--locked {
  border-color: #5c4c35;
  background: #29281e;
  color: #9e9279;
  cursor: not-allowed;
}
.sdp-shortfall {
  grid-column: 2;
  margin: 7px 0 0;
  color: #cc6050;
  font-size: 11px;
  text-align: right;
}
.sdp-workspace {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 20px 16px;
  background: color-mix(in srgb, var(--rc) 6%, #111008);
  overflow: hidden;
}
.sdp-section {
  min-width: 0;
  border: 0;
  background: transparent;
}
.sdp-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 28px;
  padding: 0;
  background: transparent;
  border-bottom: 1px solid #5c3310;
  color: #e8c040;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sdp-section-head small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #a59675;
  font-size: 10px;
}
.sdp-hero-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding-top: 8px;
}
.sdp-stat {
  position: relative;
  min-height: 70px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  padding: 8px 9px;
  border: 1px solid color-mix(in srgb, var(--sc) 54%, #3e200a);
  border-radius: 4px;
  background: linear-gradient(115deg, color-mix(in srgb, var(--sc) 16%, #181710), #171610 72%);
  color: var(--sc);
}
.sdp-stat > svg {
  width: 27px;
  height: 27px;
}
.sdp-stat div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-align: center;
}
.sdp-stat small {
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.08em;
}
/* Der konkrete Wert ist die Aussage der Karte — die Punktzahl dahinter steht nirgends. */
.sdp-stat strong {
  max-width: 100%;
  overflow: hidden;
  font-size: 27px;
  font-weight: 400;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdp-stat div span {
  max-width: 100%;
  overflow: hidden;
  color: #bcae91;
  font-size: 12px;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdp-stat i {
  position: absolute;
  right: 10px;
  bottom: 5px;
  left: 10px;
  height: 3px;
  background: #2a251c;
}
.sdp-stat i b {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left;
  background: var(--sc);
}
.sdp-equipment-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  padding: 7px 0 0;
}
.sdp-equipment {
  min-width: 0;
  display: grid;
  grid-template-columns: 29px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 50px;
  padding: 5px 12px;
  border: 0;
  border-right: 1px solid #3e200a;
  border-radius: 0;
  background: transparent;
  color: #ebd8a2;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.sdp-equipment:hover {
  background: #1c1c18;
}
.sdp-equipment--empty {
  color: #9b8e72;
}
.sdp-equipment img {
  width: 29px;
  height: 29px;
  object-fit: contain;
}
.sdp-equipment-icon {
  font-size: 24px;
  text-align: center;
}
.sdp-equipment strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.2;
  text-overflow: ellipsis;
}
.sdp-equipment-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
  text-align: center;
}
.sdp-equipment-head {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}
.sdp-equipment-head small {
  flex: 0 0 auto;
  color: #a59675;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.sdp-equipment-stats {
  display: -webkit-box;
  overflow: hidden;
  color: #e8c040;
  font-size: 12px;
  line-height: 1.15;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.sdp-equipment-copy > small {
  display: -webkit-box;
  overflow: hidden;
  color: #bcae91;
  font-size: 10px;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.sdp-section--perks {
  flex: 0 0 auto;
}
.sdp-section--open {
  background: #16140e;
}
.sdp-perk-rail {
  display: none;
}
.sdp-perk-rail::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: 29px;
  right: 28px;
  left: 28px;
  height: 1px;
  background: #5c3310;
}
.sdp-perk-node {
  position: relative;
  z-index: 1;
  width: 33px;
  height: 33px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid #59452c;
  border-radius: 50%;
  background: #1c1c18;
  color: #9f9174;
  cursor: pointer;
  font: inherit;
  font-size: 10px;
}
.sdp-perk-node--taken {
  border-color: var(--pc);
  color: var(--pc);
}
.sdp-perk-node--open {
  border-color: #e8c040;
  color: #e8c040;
}
.sdp-perk-node--active {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}
.sdp-active-perks {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 5px;
  padding: 5px 0 0;
}
.sdp-active-perk {
  min-width: 0;
  display: grid;
  grid-template-columns: 26px 48px 142px minmax(0, 1fr);
  gap: 7px;
  align-items: center;
  min-height: 39px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--pc) 52%, #3e200a);
  border-left: 3px solid var(--pc);
  border-radius: 3px;
  background: linear-gradient(105deg, color-mix(in srgb, var(--pc) 11%, #171610), #171610);
  color: var(--pc);
}
.sdp-active-perk-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.sdp-active-perk-head {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.sdp-active-perk small {
  color: #a99b80;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sdp-active-perk strong {
  overflow: hidden;
  color: var(--pc);
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdp-active-perk span {
  overflow: hidden;
  color: #c0b294;
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdp-active-perk-copy > span:not(.sdp-active-perk-head) {
  color: var(--pc);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.15;
  text-align: center;
  white-space: normal;
}
.sdp-active-perk p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #c0b294;
  font-size: 11px;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.sdp-perk-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 51px;
  margin-bottom: 8px;
  padding: 9px;
  border: 1px dashed #59452c;
  background: #171610;
  color: #a99b80;
  font-size: 12px;
}
.sdp-perk-choices {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin: 0 9px 9px;
}
.sdp-perk-choices button {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px;
  border: 1px solid var(--pc);
  border-radius: 3px;
  background: #1c1c18;
  color: var(--pc);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.sdp-perk-choices span {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.sdp-perk-choices strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdp-perk-choices small {
  display: -webkit-box;
  overflow: hidden;
  color: #bcae91;
  font-size: 9px;
  line-height: 1.15;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.sdp-perk-choices em {
  overflow: hidden;
  color: var(--pc);
  font-size: 10px;
  font-style: normal;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdp-skin-list {
  display: flex;
  gap: 6px;
  padding: 10px 0 0;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.sdp-skin {
  position: relative;
  min-width: 116px;
  height: 78px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #493116;
  border-radius: 3px;
  background: #141410;
  color: #f0dfb3;
  cursor: pointer;
}
.sdp-skin img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.74;
}
.sdp-skin span {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 4px 5px;
  overflow: hidden;
  background: #100d08;
  font-size: 9px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdp-skin--selected {
  border: 2px solid #e8c040;
}
.sdp-swap-compare,
.sdp-swap-grid {
  min-width: 0;
  min-height: 0;
}
.sdp-swap-compare {
  border-bottom: 2px solid #3e200a;
}
@media (max-height: 1100px) {
  .sdp-roster {
    min-height: 92px;
    padding-block: 6px;
  }
  .sdp-seat {
    height: 74px;
  }
  .sdp-hero {
    min-height: 294px;
  }
  .sdp-portrait {
    min-height: 0;
  }
  .sdp-identity {
    padding-block: 9px 6px;
  }
  .sdp-identity h2 {
    font-size: 36px;
  }
  .sdp-workspace {
    gap: 7px;
    padding: 10px;
  }
  .sdp-section--perks {
    flex-basis: 170px;
  }
  .sdp-skin {
    height: 52px;
  }
}

.sdp-panel {
  background: #111008;
  border-left-color: #7a4e20;
}
.sdp-roster {
  min-height: 94px;
  padding: 9px 14px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--rc) 24%, #111008), #111008 72%);
}
.sdp-seat-list {
  gap: 10px;
}
.sdp-seat {
  height: 74px;
  border-color: #5c3310;
  background: #141410;
}
.sdp-seat--main {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #fff2b5 32%, transparent);
}
.sdp-seat-label {
  bottom: 6px;
  left: 8px;
  font-size: 12px;
}
.sdp-hero {
  min-height: 364px;
  grid-template-columns: minmax(286px, 39%) minmax(0, 1fr);
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  column-gap: 24px;
  padding: 14px 18px;
  background: linear-gradient(115deg, color-mix(in srgb, var(--rc) 16%, #17150e), #141410 58%);
}
.sdp-portrait {
  grid-row: 1 / 6;
  outline-color: #7a4e20;
}
.sdp-identity {
  padding: 5px 0 2px;
}
.sdp-seat-name {
  margin-bottom: 4px;
  font-size: 12px;
}
.sdp-identity h2 {
  font-size: clamp(42px, 3vw, 54px);
  letter-spacing: 0.02em;
}
.sdp-meta {
  gap: 6px 12px;
  margin-top: 7px;
  font-size: 12px;
}
.sdp-meta span {
  padding: 2px 0;
}
.sdp-skin-trigger {
  top: 14px;
  right: 18px;
  min-height: 35px;
  font-size: 12px;
}
.sdp-progression {
  padding: 5px 0 10px;
}
.sdp-xp-head {
  margin-bottom: 7px;
  font-size: 18px;
}
.sdp-xp-head small {
  font-size: 12px;
}
.sdp-xp-track {
  height: 10px;
}
.sdp-level-button {
  grid-column: 2;
  min-height: 48px;
  margin-top: 10px;
  padding: 10px 12px;
  font-size: 16px;
}
.sdp-level-cost {
  font-size: 16px;
}
.sdp-shortfall {
  margin-top: 4px;
  font-size: 12px;
}
.sdp-workspace {
  display: grid;
  grid-template-columns: minmax(248px, 0.8fr) minmax(0, 1.2fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
  padding: 12px 18px 14px;
  background: #111008;
  overflow: auto;
  container-type: inline-size;
}
.sdp-section {
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #3e200a;
  background: #15140f;
}
.sdp-section-head {
  flex: 0 0 auto;
  min-height: 42px;
  padding: 0 12px;
  border-bottom: 2px solid #5c3310;
  background: linear-gradient(90deg, color-mix(in srgb, var(--rc) 18%, #1e1006), #1e1006);
  font-size: 14px;
}
.sdp-section-head small {
  font-size: 11px;
}
.sdp-equipment-list {
  flex: 1;
  min-height: 0;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 7px;
  padding: 9px;
}
.sdp-equipment {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-content: center;
  justify-items: center;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
  padding: 12px 14px;
  border: 1px solid #493116;
  background: #1c1c18;
  text-align: center;
}
.sdp-equipment:hover {
  background: color-mix(in srgb, var(--rc) 14%, #1c1c18);
}
.sdp-equipment img {
  width: 54px;
  height: 54px;
}
.sdp-equipment-icon {
  font-size: 40px;
}
.sdp-equipment strong {
  display: -webkit-box;
  max-width: 100%;
  font-size: 19px;
  line-height: 1.05;
  text-align: center;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow-wrap: anywhere;
}
.sdp-equipment-copy {
  width: 100%;
  align-content: center;
  justify-items: center;
  gap: 7px;
}
.sdp-equipment-head {
  justify-content: center;
  display: grid;
  justify-items: center;
  gap: 2px;
  text-align: center;
}
.sdp-equipment-head small {
  font-size: 11px;
}
.sdp-equipment-stats {
  max-width: 100%;
  font-size: 16px;
  line-height: 1.1;
  text-align: center;
  overflow-wrap: anywhere;
}
.sdp-equipment-copy > small {
  font-size: 12px;
  line-height: 1.15;
  text-align: center;
}
.sdp-section--equipment {
  grid-column: 1;
  grid-row: 1;
}
.sdp-section--perks {
  grid-column: 2;
  grid-row: 1;
}
.sdp-active-perks {
  flex: 1;
  min-height: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
}
.sdp-active-perk {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-content: center;
  justify-items: center;
  gap: 7px;
  min-height: 0;
  padding: 12px 10px;
  border-left-width: 4px;
  overflow: hidden;
}
.sdp-active-perk > svg {
  grid-row: 1;
  align-self: center;
  margin-top: 0;
  width: 40px;
  height: 40px;
}
.sdp-active-perk-copy {
  width: 100%;
  display: grid;
  align-self: center;
  align-content: center;
  justify-content: center;
  justify-items: center;
  gap: 6px;
  text-align: center;
}
.sdp-active-perk-head {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-align: center;
}
.sdp-active-perk .sdp-active-perk-level {
  display: block;
  color: #d0c09a;
  font-size: 14px;
  letter-spacing: 0.08em;
  line-height: 1;
}
.sdp-active-perk small {
  align-self: center;
  font-size: 12px;
}
.sdp-active-perk-name {
  display: block;
  max-width: 100%;
}
.sdp-active-perk strong {
  align-self: center;
  font-size: 23px;
  line-height: 1.05;
  text-align: center;
  white-space: normal;
}
.sdp-active-perk > span.sdp-active-perk-copy {
  display: grid;
}
.sdp-active-perk-copy span {
  display: block;
}
.sdp-active-perk-copy > span:not(.sdp-active-perk-head) {
  font-size: 15px;
  text-align: center;
}
.sdp-active-perk p {
  width: 100%;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.15;
  text-align: center;
}
.sdp-active-perk--locked {
  --pc: #8e8067;
  border-color: #56462d;
  background: #171610;
}
.sdp-active-perk--locked > svg {
  color: #a99b80;
}
.sdp-active-perk--locked .sdp-active-perk-level {
  color: #a99b80;
}
.sdp-active-perk--locked .sdp-active-perk-name {
  color: #c0b294;
}
.sdp-active-perk--open {
  border-color: #e8c040;
  background: #211d10;
}
.sdp-perk-empty {
  flex: 1;
  justify-content: center;
  margin: 10px;
  font-size: 15px;
}
.sdp-perk-choices {
  margin: 0 10px 10px;
}
/* Blueprint: ein leerer Sitz zeigt die Gestalt dessen, was kommt, statt eines Lochs. */
.sdp-panel {
  --gk: #7e7360;
}
.sdp-ghost-regalia {
  position: absolute;
  top: 14px;
  left: 14px;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border: 2px dashed color-mix(in srgb, var(--rc) 34%, transparent);
  border-radius: 50%;
  color: #8a7c62;
  font-size: 18px;
}
.sdp-empty-state {
  gap: 11px;
  justify-items: center;
}
.sdp-empty-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
}
.sdp-empty-ring {
  position: absolute;
  inset: 0;
  border: 2px dashed color-mix(in srgb, var(--rc) 38%, transparent);
  border-radius: 50%;
  animation: sdp-empty-breathe 3.6s ease-in-out infinite;
}
.sdp-portrait:hover .sdp-empty-ring,
.sdp-portrait:focus-visible .sdp-empty-ring {
  border-style: solid;
  border-color: var(--rc);
  animation: none;
}
.sdp-empty-state strong {
  font-size: 19px;
  font-weight: 400;
  letter-spacing: 0.04em;
}
.sdp-empty-caption {
  display: grid;
}
.sdp-empty-hint,
.sdp-empty-cta {
  grid-area: 1 / 1;
  font-size: 12px;
  transition: opacity 0.2s;
}
.sdp-empty-hint {
  color: #8a7c62;
}
.sdp-empty-cta {
  color: var(--rc);
  opacity: 0;
}
.sdp-portrait:hover .sdp-empty-hint,
.sdp-portrait:focus-visible .sdp-empty-hint {
  opacity: 0;
}
.sdp-portrait:hover .sdp-empty-cta,
.sdp-portrait:focus-visible .sdp-empty-cta {
  opacity: 1;
}
@keyframes sdp-empty-breathe {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
.sdp-ghost-name {
  color: var(--gk);
}
.sdp-ghost-chip {
  padding: 2px 8px;
  border: 1px dashed #493116;
  border-radius: 4px;
  color: var(--gk);
}
.sdp-ghost .sdp-xp-head,
.sdp-ghost .sdp-xp-head small,
.sdp-ghost .sdp-hero-stat-head {
  color: var(--gk);
}
.sdp-xp-track--ghost {
  border-color: #493116;
  border-style: dashed;
}
.sdp-xp-track--ghost span {
  transform: scaleX(0);
}
/* Kein grayscale auf den Stat-Icons: ihre Farbe IST der Name des Werts. */
.sdp-stat--ghost {
  border-color: #493116;
  border-style: dashed;
  background: #15140e;
}
.sdp-stat--ghost > svg {
  opacity: 0.55;
}
.sdp-stat--ghost strong,
.sdp-stat--ghost small,
.sdp-stat--ghost div span {
  color: var(--gk);
}
.sdp-stat--ghost i b {
  transform: scaleX(0);
}
.sdp-level-button--ghost {
  border-color: #8b632c;
  background: #1c1c18;
  color: #e8c040;
}
.sdp-level-button--ghost:hover,
.sdp-level-button--ghost:focus-visible {
  border-color: var(--rc);
  background: color-mix(in srgb, var(--rc) 14%, #1c1c18);
}
.sdp-ghost-note {
  color: var(--gk);
  font-size: 12px;
}
.sdp-equipment--empty {
  border-color: #493116;
  border-style: dashed;
}
/* Die volle Perk-Karte braucht 81 px, die Zeile im Raster gibt 53 her — der
   Ghost legt dieselbe Flaeche daher quer statt gestapelt. */
.sdp-ghost-perks .sdp-active-perk {
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  align-items: center;
  justify-items: start;
  gap: 11px;
  padding: 8px 13px;
  border-color: #493116;
  border-style: dashed;
  border-left-style: solid;
  text-align: left;
}
.sdp-ghost-perks .sdp-active-perk > svg {
  width: 24px;
  height: 24px;
}
.sdp-ghost-perks .sdp-active-perk-copy {
  justify-content: start;
  justify-items: start;
  gap: 2px;
  text-align: left;
}
.sdp-ghost-perks .sdp-active-perk-head {
  align-items: flex-start;
  text-align: left;
}
.sdp-ghost-perks .sdp-active-perk strong {
  font-size: 17px;
  text-align: left;
}
.sdp-ghost-perks .sdp-active-perk small.sdp-ghost-perk-hint {
  align-self: start;
  color: var(--gk);
  font-size: 13px;
  text-align: left;
}
@media (prefers-reduced-motion: reduce) {
  .sdp-empty-ring {
    animation: none;
  }
}
@media (max-height: 1100px) {
  .sdp-roster { min-height: 84px; padding-block: 5px; }
  .sdp-seat { height: 68px; }
  .sdp-hero { min-height: 330px; padding-block: 11px; }
  .sdp-identity h2 { font-size: 39px; }
  .sdp-stat { min-height: 59px; padding-block: 6px; }
  .sdp-stat strong { font-size: 22px; }
  .sdp-stat div span { font-size: 11px; }
  .sdp-level-button { min-height: 42px; margin-top: 7px; }
  .sdp-workspace {
    grid-template-columns: minmax(210px, 0.8fr) minmax(0, 1.2fr);
    gap: 8px;
    padding: 8px 10px 10px;
  }
  .sdp-section-head { min-height: 35px; }
  .sdp-equipment-list, .sdp-active-perks { gap: 6px; padding: 7px; }
  .sdp-equipment { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto; gap: 6px; padding: 10px 8px; }
  .sdp-equipment img { width: 44px; height: 44px; }
  .sdp-equipment-icon { font-size: 34px; }
  .sdp-equipment strong { font-size: 18px; }
  .sdp-equipment-stats { font-size: 14px; }
  .sdp-equipment-copy > small { font-size: 10px; }
  .sdp-active-perk { gap: 5px; padding: 9px 7px; }
  .sdp-active-perk > svg { width: 34px; height: 34px; }
  .sdp-active-perk .sdp-active-perk-level { font-size: 12px; }
  .sdp-active-perk strong { font-size: 20px; }
  .sdp-active-perk-copy > span:not(.sdp-active-perk-head) { font-size: 13px; }
  .sdp-active-perk p { font-size: 11px; }
  .sdp-ghost-regalia { width: 52px; height: 52px; font-size: 16px; }
  .sdp-empty-mark { width: 64px; height: 64px; }
  .sdp-empty-state { gap: 9px; }
  .sdp-empty-state strong { font-size: 17px; }
  .sdp-ghost-chip { padding: 1px 6px; }
  .sdp-ghost-perks .sdp-active-perk small.sdp-ghost-perk-hint { display: none; }
}
</style>
