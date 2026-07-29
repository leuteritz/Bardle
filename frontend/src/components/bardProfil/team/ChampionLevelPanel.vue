<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { useGameStore } from '@/stores/gameStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useChampionLevelStore } from '@/stores/championLevelStore'
import { useActionToast } from '@/composables/useActionToast'
import {
  CHAMPION_STATS,
  ascensionStars,
  ascensionRank,
  isAscensionLevel,
  isPerkLevel,
  statEffectLabel,
  PERK_BY_ID,
} from '@/config/championLevels'
import { getChampionTier } from '@/config/championTiers'
import { CHAMPION_ROLES } from '@/config/championData'
import { MATERIALS } from '@/config/materials'
import {
  ROLE_BY_KEY,
  CHAMPION_ASCENSION_INTERVAL,
  CHAMPION_XP_BAR_HEIGHT,
  CHAMPION_LEVEL_SPLASH_HEIGHT,
  CHIMES_COST_ICON,
} from '@/config/constants'
import type { ChampionStatKey } from '@/types'

const props = defineProps<{ champion: string }>()

const battleStore = useBattleStore()
const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const levelStore = useChampionLevelStore()
const { showToast } = useActionToast()

const xpBarHeightPx = `${CHAMPION_XP_BAR_HEIGHT}px`
const splashHeightPx = `${CHAMPION_LEVEL_SPLASH_HEIGHT}px`

const splash = computed(() => battleStore.getChampionImage(props.champion))
const tier = computed(() => getChampionTier(props.champion))
const roleDef = computed(() => ROLE_BY_KEY[CHAMPION_ROLES[props.champion] ?? 'mid'])

const progress = computed(() => levelStore.progressOf(props.champion))
const level = computed(() => progress.value.level)
const cap = computed(() => levelStore.levelCap)
const stats = computed(() => levelStore.statsOf(props.champion))
const xpBar = computed(() => levelStore.xpBarOf(props.champion))
const cost = computed(() => levelStore.costOf(props.champion))
const blockReason = computed(() => levelStore.blockReasonOf(props.champion))
const canLevel = computed(() => levelStore.canLevelUp(props.champion))

const stars = computed(() => ascensionStars(level.value))
const rank = computed(() => ascensionRank(level.value))

/** Every ascension pip up to the current rank — filled ones are earned. */
const maxStars = computed(() => Math.floor(cap.value / CHAMPION_ASCENSION_INTERVAL))

const nextLevel = computed(() => level.value + 1)
const atCap = computed(() => level.value >= cap.value)

/** The next level that grants a star or a perk — whichever comes first. */
const nextMilestone = computed(() => {
  for (let l = nextLevel.value; l <= cap.value; l++) {
    if (isPerkLevel(l)) return { level: l, kind: 'perk' as const }
    if (isAscensionLevel(l)) return { level: l, kind: 'star' as const }
  }
  return null
})

// ── Stat readouts ────────────────────────────────────────────────────────────
// Each stat prints the multiplier it actually produces, so the number on the
// tile is never decorative.
function effectFor(key: ChampionStatKey): string {
  return statEffectLabel(
    key,
    stats.value[key],
    levelStore.perkEffectOf(props.champion, 'cooldownRush'),
  )
}

// ── Perks ────────────────────────────────────────────────────────────────────
const ownedPerks = computed(() =>
  Object.entries(progress.value.perks)
    .map(([lvl, id]) => ({ level: Number(lvl), perk: PERK_BY_ID[id] }))
    .filter((e) => !!e.perk)
    .sort((a, b) => a.level - b.level),
)
const perkChoices = computed(() => levelStore.perkChoicesOf(props.champion))
const hasPendingPerk = computed(() => levelStore.hasPendingPerk(props.champion))

// ── Costs ────────────────────────────────────────────────────────────────────
const materialCosts = computed(() =>
  Object.entries(cost.value.materials).map(([id, qty]) => ({
    id,
    qty,
    owned: inventoryStore.collectedMaterials[id] ?? 0,
    def: MATERIALS.find((m) => m.id === id) ?? null,
  })),
)
const affordsChimes = computed(() => gameStore.chimes >= cost.value.chimes)

const blockLabel = computed(() => {
  switch (blockReason.value) {
    case 'cap':
      return `Level cap reached — warp to the next galaxy to raise it`
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

function doLevelUp() {
  if (!levelStore.levelUp(props.champion)) return
  showToast(`${props.champion} reached level ${levelStore.levelOf(props.champion)}!`)
}

function pickPerk(perkId: string) {
  if (!levelStore.choosePerk(props.champion, perkId)) return
  showToast(`${props.champion} learned ${PERK_BY_ID[perkId]?.name ?? perkId}!`)
}
</script>

<template>
  <div class="clp" :style="{ '--rc': roleDef.color, '--rank': rank.color }">
    <!-- ── splash header: identity, rank band and the XP bar ── -->
    <div class="clp-splash">
      <img :src="splash" :alt="champion" class="clp-splash-img" />
      <div class="clp-splash-fade" />

      <div class="clp-splash-top">
        <div class="clp-role-badge">
          <img :src="roleDef.image" alt="" class="clp-role-badge-img" />
          <span>{{ roleDef.label }}</span>
        </div>
        <span class="clp-chip" :style="{ borderColor: tier.color, color: tier.color }">
          ★{{ tier.starLevel }} {{ tier.name }}
        </span>
      </div>

      <div class="clp-splash-bottom">
        <div class="clp-identity">
          <div class="clp-name">{{ champion }}</div>
          <div class="clp-rank-row">
            <span class="clp-rank">{{ rank.name }}</span>
            <span class="clp-stars">
              <Icon
                v-for="i in maxStars"
                :key="i"
                icon="game-icons:beveled-star"
                width="15"
                height="15"
                class="clp-star"
                :class="{ 'clp-star--on': i <= stars }"
              />
            </span>
          </div>
        </div>
        <div class="clp-level-badge">
          <Icon icon="game-icons:ribbon-medal" width="20" height="20" class="clp-level-icon" />
          <span class="clp-level-num">{{ level }}</span>
          <span class="clp-level-cap">/ {{ cap }}</span>
        </div>
      </div>
    </div>

    <!-- ── XP bar ── -->
    <div class="clp-xp">
      <div class="clp-xp-head">
        <Icon icon="game-icons:circle-sparks" width="15" height="15" class="clp-xp-icon" />
        <span class="clp-xp-label">Experience</span>
        <span class="clp-xp-value">
          <template v-if="xpBar.capped">Banked {{ $formatNumber(xpBar.current) }} — cap reached</template>
          <template v-else>
            {{ $formatNumber(xpBar.current) }} / {{ $formatNumber(xpBar.needed) }}
          </template>
        </span>
      </div>
      <div class="clp-xp-track">
        <div
          class="clp-xp-fill"
          :class="{ 'clp-xp-fill--ready': xpBar.pct >= 1 }"
          :style="{ width: `${Math.min(100, xpBar.pct * 100)}%` }"
        />
      </div>
    </div>

    <div class="clp-body">
      <!-- ── stats ── -->
      <div>
        <div class="clp-section-head">
          <span class="clp-section-accent">✦</span>
          <span class="clp-section-title">Stats</span>
          <div class="clp-section-rule" />
        </div>
        <div class="clp-stat-grid">
          <div
            v-for="stat in CHAMPION_STATS"
            :key="stat.key"
            class="clp-stat"
            :style="{ '--sc': stat.color }"
            :title="stat.desc"
          >
            <Icon :icon="stat.icon" width="26" height="26" class="clp-stat-icon" />
            <div class="clp-stat-text">
              <div class="clp-stat-top">
                <span class="clp-stat-short">{{ stat.short }}</span>
                <span class="clp-stat-value">{{ stats[stat.key].toFixed(1) }}</span>
              </div>
              <div class="clp-stat-effect">{{ effectFor(stat.key) }} {{ stat.effectLabel }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── perk choice — only while a milestone is unspent ── -->
      <div v-if="hasPendingPerk && perkChoices.length > 0" class="clp-perk-choice">
        <div class="clp-section-head">
          <span class="clp-section-accent clp-section-accent--hot">✦</span>
          <span class="clp-section-title clp-section-title--hot">Milestone — choose a perk</span>
          <div class="clp-section-rule" />
        </div>
        <div class="clp-perk-cards">
          <button
            v-for="perk in perkChoices"
            :key="perk.id"
            class="clp-perk-card"
            :style="{ '--pc': perk.color }"
            @click="pickPerk(perk.id)"
          >
            <Icon :icon="perk.icon" width="30" height="30" class="clp-perk-card-icon" />
            <div class="clp-perk-card-name">{{ perk.name }}</div>
            <div class="clp-perk-card-desc">{{ perk.desc }}</div>
          </button>
        </div>
      </div>

      <!-- ── perks already taken ── -->
      <div v-if="ownedPerks.length > 0">
        <div class="clp-section-head">
          <span class="clp-section-accent">✦</span>
          <span class="clp-section-title">Perks</span>
          <div class="clp-section-rule" />
          <span class="clp-section-count">{{ ownedPerks.length }}</span>
        </div>
        <div class="clp-perk-rows">
          <div
            v-for="entry in ownedPerks"
            :key="entry.level"
            class="clp-perk-row"
            :style="{ '--pc': entry.perk.color }"
          >
            <Icon :icon="entry.perk.icon" width="24" height="24" class="clp-perk-row-icon" />
            <div class="clp-perk-row-text">
              <div class="clp-perk-row-name">
                {{ entry.perk.name }}
                <span class="clp-perk-row-level">Lv {{ entry.level }}</span>
              </div>
              <div class="clp-perk-row-desc">{{ entry.perk.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── upgrade ── -->
      <div>
        <div class="clp-section-head">
          <span class="clp-section-accent">✦</span>
          <span class="clp-section-title">Advance</span>
          <div class="clp-section-rule" />
          <span v-if="nextMilestone" class="clp-section-count">
            {{ nextMilestone.kind === 'perk' ? 'Perk' : 'Star' }} at Lv {{ nextMilestone.level }}
          </span>
        </div>

        <div class="clp-upgrade">
          <div v-if="!atCap" class="clp-cost-row">
            <div class="clp-cost" :class="{ 'clp-cost--short': !affordsChimes }">
              <Icon :icon="CHIMES_COST_ICON" width="18" height="18" />
              <span>{{ $formatNumber(cost.chimes) }}</span>
            </div>
            <div
              v-for="mat in materialCosts"
              :key="mat.id"
              class="clp-cost"
              :class="{ 'clp-cost--short': mat.owned < mat.qty }"
              :title="mat.def?.name ?? mat.id"
            >
              <img v-if="mat.def" :src="mat.def.image" :alt="mat.def.name" class="clp-cost-img" />
              <span>{{ mat.qty }}</span>
              <span class="clp-cost-owned">({{ mat.owned }})</span>
            </div>
          </div>

          <button
            class="clp-level-btn"
            :class="{ 'clp-level-btn--locked': !canLevel }"
            :disabled="!canLevel"
            @click="doLevelUp"
          >
            <Icon icon="game-icons:circle-sparks" width="20" height="20" />
            <span v-if="atCap">Level Cap Reached</span>
            <span v-else>Level Up to {{ nextLevel }}</span>
          </button>

          <div v-if="blockLabel" class="clp-block-hint">{{ blockLabel }}</div>
          <div v-if="!atCap && isAscensionLevel(nextLevel)" class="clp-ascend-hint">
            <Icon icon="game-icons:beveled-star" width="14" height="14" />
            Ascension level — grants a star and lifts every stat
          </div>
          <div v-if="!atCap && isPerkLevel(nextLevel)" class="clp-ascend-hint">
            <Icon icon="game-icons:ribbon-medal" width="14" height="14" />
            Milestone level — opens a perk choice
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clp {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: #111008;
}

/* ── splash ── */
.clp-splash {
  position: relative;
  height: v-bind(splashHeightPx);
  flex-shrink: 0;
  overflow: hidden;
  background: #0a0704;
}
.clp-splash-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 16%;
}
.clp-splash-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 7, 4, 0.35) 0%,
    rgba(13, 9, 5, 0.5) 52%,
    rgba(13, 9, 5, 0.99) 100%
  );
}
.clp-splash-top {
  position: absolute;
  top: 11px;
  left: 12px;
  right: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.clp-role-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.68);
  border: 1px solid var(--rc);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rc);
}
.clp-role-badge-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
.clp-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.68);
  border: 1px solid;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
.clp-splash-bottom {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 11px;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}
.clp-identity {
  flex: 1;
  min-width: 0;
}
.clp-name {
  font-size: 27px;
  color: #f4e6bc;
  line-height: 1.05;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.clp-rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.clp-rank {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rank);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
}
.clp-stars {
  display: flex;
  gap: 1px;
}
.clp-star {
  color: #3a3428;
}
.clp-star--on {
  color: var(--rank);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--rank) 60%, transparent));
}
.clp-level-badge {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid #c89040;
}
.clp-level-icon {
  color: #e8c040;
  align-self: center;
}
.clp-level-num {
  font-size: 22px;
  line-height: 1;
  color: #e8c040;
}
.clp-level-cap {
  font-size: 12px;
  color: rgba(230, 220, 196, 0.45);
}

/* ── xp bar ── */
.clp-xp {
  flex-shrink: 0;
  padding: 9px 14px 11px;
  background: #1a1008;
  border-bottom: 2px solid #5c3310;
}
.clp-xp-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}
.clp-xp-icon {
  color: #6ec0e0;
}
.clp-xp-label {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c8a860;
}
.clp-xp-value {
  margin-left: auto;
  font-size: 12.5px;
  color: #dcc99a;
}
.clp-xp-track {
  height: v-bind(xpBarHeightPx);
  border-radius: 4px;
  background: #0a0805;
  border: 1px solid #3e200a;
  overflow: hidden;
}
.clp-xp-fill {
  height: 100%;
  background: linear-gradient(to right, #2e6a8a, #4e96e0);
  transition: width 0.3s ease-out;
}
/* enough XP banked — the bar switches to the buyable green */
.clp-xp-fill--ready {
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.5);
}

/* ── body ── */
.clp-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 13px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.clp-body::-webkit-scrollbar {
  width: 4px;
}
.clp-body::-webkit-scrollbar-track {
  background: #111;
}
.clp-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.clp-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.clp-section-accent {
  font-size: 12px;
  color: var(--rc);
}
.clp-section-accent--hot {
  color: #e8c040;
}
.clp-section-title {
  font-size: 13.5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #c8a860;
}
.clp-section-title--hot {
  color: #e8c040;
}
.clp-section-rule {
  flex: 1;
  height: 1px;
  background: rgba(200, 164, 90, 0.16);
}
.clp-section-count {
  font-size: 11px;
  color: rgba(230, 220, 196, 0.45);
}

/* ── stats ── */
.clp-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.clp-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid rgba(200, 164, 90, 0.14);
  border-left: 3px solid var(--sc);
}
.clp-stat-icon {
  flex-shrink: 0;
  color: var(--sc);
}
.clp-stat-text {
  flex: 1;
  min-width: 0;
}
.clp-stat-top {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.clp-stat-short {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(200, 164, 90, 0.6);
}
.clp-stat-value {
  margin-left: auto;
  font-size: 17px;
  line-height: 1;
  color: #f0e2ba;
}
.clp-stat-effect {
  margin-top: 3px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--sc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── perk choice ── */
.clp-perk-choice {
  padding: 11px;
  border-radius: 4px;
  background: #1a1008;
  border: 1px solid #c89040;
  box-shadow: inset 0 0 18px rgba(200, 144, 64, 0.1);
}
.clp-perk-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.clp-perk-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
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
.clp-perk-card:hover {
  transform: translateY(-1px);
  border-color: var(--pc);
  box-shadow: 0 0 14px color-mix(in srgb, var(--pc) 35%, transparent);
}
.clp-perk-card-icon {
  color: var(--pc);
}
.clp-perk-card-name {
  font-size: 16px;
  color: var(--pc);
  line-height: 1.15;
}
.clp-perk-card-desc {
  font-size: 12.5px;
  font-weight: 500;
  color: #dcc99a;
  line-height: 1.4;
}

/* ── owned perks ── */
.clp-perk-rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.clp-perk-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-left: 3px solid var(--pc);
}
.clp-perk-row-icon {
  flex-shrink: 0;
  color: var(--pc);
}
.clp-perk-row-text {
  flex: 1;
  min-width: 0;
}
.clp-perk-row-name {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 14.5px;
  color: var(--pc);
  line-height: 1.15;
}
.clp-perk-row-level {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(230, 220, 196, 0.4);
}
.clp-perk-row-desc {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 500;
  color: #bcae8c;
  line-height: 1.35;
}

/* ── upgrade ── */
.clp-upgrade {
  padding: 11px;
  border-radius: 4px;
  background: #1a1008;
  border: 1px solid rgba(200, 164, 90, 0.16);
}
.clp-cost-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 10px;
}
.clp-cost {
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
.clp-cost--short {
  border-color: rgba(204, 96, 80, 0.55);
  color: #cc6050;
}
.clp-cost-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
.clp-cost-owned {
  font-size: 11px;
  color: rgba(230, 220, 196, 0.4);
}
.clp-level-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  cursor: pointer;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #0d1a06;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    filter 0.15s,
    transform 0.15s;
}
.clp-level-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}
.clp-level-btn--locked {
  background: linear-gradient(to bottom, #2c2c26, #1a1a16);
  border-color: #3e3a30;
  color: rgba(230, 220, 196, 0.4);
  cursor: not-allowed;
  opacity: 0.6;
  filter: grayscale(55%);
}
.clp-block-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #cc6050;
  text-align: center;
}
.clp-ascend-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 7px;
  font-size: 12px;
  color: #e8c040;
}
</style>
