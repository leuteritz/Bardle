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
  perkChoicesFor,
  statEffectLabel,
  CHAMPION_STATS,
  PERK_BY_ID,
} from '@/config/champions/championLevels'
import {
  ALLIES_PER_ROLE,
  CHAMPION_PERK_INTERVAL,
  CHAMPION_BASE_HP_BY_ROLE,
  CHAMPION_HP_PER_STAR,
  CHAMPION_REGALIA_SIZE_ALLY,
  CHAMPION_REGALIA_SIZE_SPLASH,
  ROLES,
  SKIN_ORIGINAL,
  SWORN_ALLY_COUNT,
  SWORN_ICON,
  TEAM_SIGIL_DETAILS_PANEL_WIDTH,
} from '@/config/constants'
import {
  getChampionOrigin,
  getOriginColor,
  ORIGIN_SYNERGIES,
} from '@/config/champions/championOrigins'
import { getChampionStarLevel, getChampionTier } from '@/config/champions/championTiers'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/champions/championTraits'
import { MATERIALS } from '@/config/economy/materials'
import { SHOP_ITEMS } from '@/config/economy/items'
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
function statEffectOf(key: ChampionStatKey) {
  return stats.value ? statEffectLabel(key, stats.value[key], cooldownRush.value) : ''
}
function statReadoutOf(key: ChampionStatKey) {
  if (key === 'vitality') return `${championMaxHp.value.toLocaleString()} HP · ${statEffectOf(key)}`
  const stat = CHAMPION_STATS.find((entry) => entry.key === key)
  return `${statEffectOf(key)} ${stat?.effectLabel ?? ''}`
}
function statShare(key: ChampionStatKey) {
  return stats.value && statPeak.value > 0 ? stats.value[key] / statPeak.value : 0
}

interface PerkSlot {
  level: number
  perk: ChampionPerkDef | null
  state: 'taken' | 'open' | 'locked'
  exhausted: boolean
}
const perkChoices = computed(() => (champion.value ? levelStore.perkChoicesOf(champion.value) : []))
const pendingPerkLevel = computed(
  () => levelStore.pendingPerks.find((perk) => perk.champion === champion.value)?.level ?? null,
)
const perkPath = computed<PerkSlot[]>(() => {
  if (!champion.value) return []
  const taken = levelStore.progressOf(champion.value).perks
  const ownedIds = Object.values(taken)
  const path: PerkSlot[] = []
  for (
    let milestone = CHAMPION_PERK_INTERVAL;
    milestone <= cap.value;
    milestone += CHAMPION_PERK_INTERVAL
  ) {
    const perk = taken[milestone] ? (PERK_BY_ID[taken[milestone]] ?? null) : null
    path.push({
      level: milestone,
      perk,
      state: perk ? 'taken' : pendingPerkLevel.value === milestone ? 'open' : 'locked',
      exhausted:
        !perk && level.value >= milestone && perkChoicesFor(milestone, ownedIds).length === 0,
    })
  }
  return path
})
const takenPerkCount = computed(
  () => perkPath.value.filter((slot) => slot.state === 'taken').length,
)
const activePerks = computed(() =>
  perkPath.value.filter((slot): slot is PerkSlot & { perk: ChampionPerkDef } => !!slot.perk),
)
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
              class="sdp-empty-state"
              ><Icon icon="lucide:user-plus" width="22" height="22" /> Assign champion</span
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
        <div v-if="champion && stats" class="sdp-section">
          <div class="sdp-section-head">
            <span>Combat stats</span
            ><small v-if="hasSwornBonus"
              ><Icon :icon="SWORN_ICON" width="13" height="13" /> Sworn included</small
            >
          </div>
          <div class="sdp-stat-grid">
            <article
              v-for="stat in CHAMPION_STATS"
              :key="stat.key"
              class="sdp-stat"
              :style="{ '--sc': stat.color }"
              v-tip="stat.desc"
            >
              <Icon :icon="stat.icon" width="24" height="24" />
              <div>
                <small>{{ stat.short }}</small
                ><strong>{{ stats[stat.key].toFixed(1) }}</strong
                ><span>{{ statReadoutOf(stat.key) }}</span>
              </div>
              <i><b :style="{ transform: `scaleX(${statShare(stat.key)})` }" /></i>
            </article>
          </div>
        </div>
        <div class="sdp-section">
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
                ><strong>{{ equippedItem(category)!.name }}</strong></template
              ><template v-else
                ><img
                  :src="`/img/itemShop/${category}-128.png`"
                  :alt="CAT_LABELS[category]"
                /><strong>Equip {{ CAT_LABELS[category] }}</strong></template
              >
            </button>
          </div>
        </div>
        <div
          v-if="champion"
          class="sdp-section sdp-section--perks"
          :class="{ 'sdp-section--open': openPerkSlot }"
        >
          <div class="sdp-section-head">
            <span>Perk path</span
            ><small>{{
              openPerkSlot ? 'Choose a perk' : `${takenPerkCount}/${perkPath.length}`
            }}</small>
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
          <div v-if="activePerks.length" class="sdp-active-perks" aria-label="Active perks">
            <article
              v-for="slot in activePerks"
              :key="slot.level"
              class="sdp-active-perk"
              :style="{ '--pc': slot.perk.color }"
              v-tip="`Level ${slot.level} · ${slot.perk.desc}`"
            >
              <Icon :icon="slot.perk.icon" width="25" height="25" />
              <div>
                <small>Level {{ slot.level }}</small><strong>{{ slot.perk.name }}</strong
                ><span>{{ slot.perk.desc }}</span>
              </div>
            </article>
          </div>
          <div v-else-if="focusedPerkSlot" class="sdp-perk-empty">
            <Icon
              v-if="focusedPerkSlot.state === 'open'"
              icon="game-icons:ribbon-medal"
              width="21"
              height="21"
            />
            <Icon v-else icon="lucide:lock-keyhole" width="19" height="19" />
            <span>{{
              focusedPerkSlot.state === 'open'
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
                ><small>{{ perk.desc }}</small></span
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
  min-height: 372px;
  display: grid;
  grid-template-columns: 48% minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto auto;
  column-gap: 20px;
  padding: 16px 20px;
  border-bottom: 2px solid #3e200a;
  background: color-mix(in srgb, var(--rc) 16%, #141410);
}
.sdp-portrait {
  position: relative;
  grid-row: 1 / 4;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  padding: 0;
  border: 2px solid #7a4e20;
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
  align-self: end;
  padding: 0 6px 20px;
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
  font-size: 52px;
  font-weight: 400;
  line-height: 1;
}
.sdp-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  margin-top: 9px;
  font-size: 13px;
}
.sdp-meta span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.sdp-progression {
  padding: 0 6px 19px;
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
.sdp-level-button {
  grid-column: 2;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 48px;
  padding: 12px;
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
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 20px 16px;
  background: color-mix(in srgb, var(--rc) 6%, #111008);
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
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
.sdp-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding-top: 9px;
}
.sdp-stat {
  position: relative;
  min-height: 94px;
  display: grid;
  grid-template-columns: 35px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--sc) 36%, #3e200a);
  border-radius: 4px;
  background: linear-gradient(125deg, color-mix(in srgb, var(--sc) 10%, #15140e), #15140e 65%);
  color: var(--sc);
}
.sdp-stat > svg {
  width: 29px;
  height: 29px;
}
.sdp-stat div {
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1px 5px;
}
.sdp-stat small {
  grid-column: 1;
  font-size: 10px;
  letter-spacing: 0.08em;
}
.sdp-stat strong {
  grid-column: 2;
  grid-row: 1;
  font-size: 29px;
  font-weight: 400;
}
.sdp-stat div span {
  grid-column: 1 / -1;
  overflow: hidden;
  color: #bcae91;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdp-stat i {
  position: absolute;
  right: 12px;
  bottom: 9px;
  left: 12px;
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
  min-height: 56px;
  padding: 8px 12px;
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
  width: 27px;
  height: 27px;
  object-fit: contain;
}
.sdp-equipment-icon {
  font-size: 22px;
  text-align: center;
}
.sdp-equipment strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
  text-overflow: ellipsis;
}
.sdp-section--perks {
  flex: 0 0 auto;
}
.sdp-section--open {
  background: #16140e;
}
.sdp-perk-rail {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 5px;
  padding: 13px 15px 8px;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  padding: 0 0 8px;
}
.sdp-active-perk {
  min-width: 0;
  display: grid;
  grid-template-columns: 31px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 67px;
  padding: 9px;
  border: 1px solid color-mix(in srgb, var(--pc) 52%, #3e200a);
  border-left: 3px solid var(--pc);
  border-radius: 3px;
  background: linear-gradient(105deg, color-mix(in srgb, var(--pc) 11%, #171610), #171610);
  color: var(--pc);
}
.sdp-active-perk div {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.sdp-active-perk small {
  color: #a99b80;
  font-size: 9px;
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
  display: -webkit-box;
  overflow: hidden;
  color: #c0b294;
  font-size: 10px;
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
    min-height: 300px;
  }
  .sdp-portrait {
    min-height: 0;
  }
  .sdp-identity {
    padding-block: 9px 6px;
  }
  .sdp-identity h2 {
    font-size: 40px;
  }
  .sdp-workspace {
    gap: 7px;
    padding: 10px;
  }
  .sdp-section--perks {
    flex-basis: 170px;
  }
  .sdp-stat {
    min-height: 78px;
    padding: 9px;
  }
  .sdp-skin {
    height: 52px;
  }
}
</style>
