<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { TEAM_SIGIL_DETAILS_PANEL_WIDTH } from '@/config/constants'

const emit = defineEmits<{
  close: []
}>()

const panelWidthPx = `${TEAM_SIGIL_DETAILS_PANEL_WIDTH}px`

const battleStore = useBattleStore()
const synergyStore = useSynergyStore()

const {
  activeTraits,
  activeOriginSynergies,
  cpsSynergyMultiplier,
  powerSynergyMultiplier,
  dpsSynergyMultiplier,
} = storeToRefs(synergyStore)

// ── Buff summary (team-wide totals from all active synergies) ────────────────
function multToPct(mult: number): number {
  return Math.round((mult - 1) * 100)
}

const summaryChips = computed(() => [
  { key: 'cps', icon: 'game-icons:sing', label: 'Production', pct: multToPct(cpsSynergyMultiplier.value) },
  { key: 'power', icon: 'game-icons:mailed-fist', label: 'Power', pct: multToPct(powerSynergyMultiplier.value) },
  { key: 'dps', icon: 'game-icons:deadly-strike', label: 'Combat DPS', pct: multToPct(dpsSynergyMultiplier.value) },
])

// ── Unified synergy cards ────────────────────────────────────────────────────
interface SynergyCard {
  id: string
  name: string
  kind: 'Trait' | 'Origin'
  icon: string
  color: string
  count: number
  thresholds: { count: number; bonus: string }[]
  activeBonus: string | null
  nextBonus: string | null
  nextCount: number | null
  champions: string[]
  brewing: boolean
}

const traitCards = computed<SynergyCard[]>(() =>
  activeTraits.value.map((at) => ({
    id: `trait-${at.trait.id}`,
    name: at.trait.name,
    kind: 'Trait',
    icon: at.trait.icon,
    color: at.trait.color,
    count: at.count,
    thresholds: at.trait.thresholds,
    activeBonus: at.activeThreshold?.bonus ?? null,
    nextBonus: at.nextThreshold?.bonus ?? null,
    nextCount: at.nextThreshold?.count ?? null,
    champions: at.involvedChampions,
    brewing: at.activeThreshold === null,
  })),
)

const originCards = computed<SynergyCard[]>(() =>
  activeOriginSynergies.value.map((os) => ({
    id: `origin-${os.origin}`,
    name: String(os.origin),
    kind: 'Origin',
    icon: os.def.icon,
    color: os.def.color,
    count: os.count,
    thresholds: os.def.thresholds,
    activeBonus: os.activeThreshold?.bonus ?? null,
    nextBonus: os.nextThreshold?.bonus ?? null,
    nextCount: os.nextThreshold?.count ?? null,
    champions: os.involvedChampions,
    brewing: os.activeThreshold === null,
  })),
)

// ── Search (name, kind, effect texts, champion names) ───────────────────────
const searchQuery = ref('')
const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())

function matchesQuery(card: SynergyCard): boolean {
  const q = normalizedQuery.value
  if (!q) return true
  if (card.name.toLowerCase().includes(q)) return true
  if (card.kind.toLowerCase().includes(q)) return true
  if (card.thresholds.some((t) => t.bonus.toLowerCase().includes(q))) return true
  return card.champions.some((c) => c.toLowerCase().includes(q))
}

/** Highlights the avatars the player searched for inside each card. */
function champMatches(name: string): boolean {
  const q = normalizedQuery.value
  return q.length > 0 && name.toLowerCase().includes(q)
}

const sections = computed(() => [
  { key: 'traits', title: 'Traits', cards: traitCards.value.filter(matchesQuery) },
  { key: 'origins', title: 'Origins', cards: originCards.value.filter(matchesQuery) },
])

const visibleCount = computed(() => sections.value.reduce((sum, g) => sum + g.cards.length, 0))

const hasAnySynergy = computed(() => traitCards.value.length + originCards.value.length > 0)

function championImage(name: string): string {
  return battleStore.getChampionImage(name)
}
</script>

<template>
  <div class="tsp-panel">
    <div class="tsp-goldline" />
    <header class="tsp-head">
      <Icon icon="game-icons:linked-rings" width="20" height="20" class="tsp-head-icon" />
      <span class="tsp-head-title">Team Synergies</span>
      <button class="tsp-close" aria-label="Close synergies" @click="emit('close')">✕</button>
    </header>

    <!-- ── search (shared rpg-search pattern) ── -->
    <div class="tsp-search">
      <div class="rpg-search-wrap">
        <Icon
          icon="game-icons:magnifying-glass"
          width="14"
          height="14"
          class="rpg-search-icon"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search synergies, effects or champions..."
          class="rpg-search w-full pl-9 pr-9 py-2.5"
          aria-label="Search synergies, effects or champions"
        />
        <button
          class="search-clear-btn"
          :class="{ 'search-clear-btn--visible': searchQuery.length > 0 }"
          aria-label="Clear search"
          @click="searchQuery = ''"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="tsp">
    <!-- ── team-wide buff totals ── -->
    <div class="tsp-summary">
      <div
        v-for="chip in summaryChips"
        :key="chip.key"
        class="tsp-chip"
        :class="{ 'tsp-chip--zero': chip.pct === 0 }"
      >
        <Icon :icon="chip.icon" width="26" height="26" class="tsp-chip-icon" />
        <span class="tsp-chip-label">{{ chip.label }}</span>
        <span class="tsp-chip-value">+{{ chip.pct }}%</span>
      </div>
    </div>

    <!-- ── trait / origin sections ── -->
    <template v-if="hasAnySynergy && visibleCount > 0">
      <template v-for="group in sections" :key="group.key">
        <section v-if="group.cards.length > 0" class="tsp-section">
        <div class="tsp-section-head">
          <span class="tsp-section-title">✦ {{ group.title }}</span>
          <div class="tsp-section-rule" />
          <span class="tsp-section-count">{{ group.cards.length }}</span>
        </div>
        <div class="tsp-grid">
          <article
            v-for="card in group.cards"
            :key="card.id"
            class="tsp-card"
            :class="{ 'tsp-card--brewing': card.brewing }"
            :style="{ '--sc': card.color }"
          >
            <div class="tsp-card-head">
              <div class="tsp-hex">
                <Icon
                  v-if="card.icon.includes(':')"
                  :icon="card.icon"
                  width="18"
                  height="18"
                  class="tsp-hex-icon"
                />
                <span v-else class="tsp-hex-icon">{{ card.icon }}</span>
              </div>
              <div class="tsp-card-title">
                <span class="tsp-card-name">{{ card.name }}</span>
                <span class="tsp-card-kind">{{ card.kind }}</span>
              </div>
              <!-- threshold pips: one segment per tier, filled when reached -->
              <div class="tsp-pips">
                <span
                  v-for="t in card.thresholds"
                  :key="t.count"
                  class="tsp-pip"
                  :class="{ 'tsp-pip--reached': card.count >= t.count }"
                  :title="t.bonus"
                >
                  {{ t.count }}
                </span>
              </div>
              <span class="tsp-card-count">{{ card.count }}</span>
            </div>

            <div class="tsp-card-bonus">
              <template v-if="card.activeBonus">
                <span class="tsp-bonus-active">{{ card.activeBonus }}</span>
              </template>
              <span v-else class="tsp-bonus-none">Not active yet</span>
              <span v-if="card.nextBonus" class="tsp-bonus-next">
                Next: {{ card.nextBonus }} at {{ card.nextCount }}
              </span>
              <span v-else-if="card.activeBonus" class="tsp-bonus-next">Max tier reached</span>
            </div>

            <div class="tsp-card-champs">
              <img
                v-for="champ in card.champions"
                :key="champ"
                :src="championImage(champ)"
                :alt="champ"
                :title="champ"
                class="tsp-champ"
                :class="{ 'tsp-champ--match': champMatches(champ) }"
              />
            </div>
          </article>
        </div>
        </section>
      </template>
    </template>

    <div v-else-if="hasAnySynergy" class="tsp-empty">
      <Icon icon="game-icons:linked-rings" width="34" height="34" class="tsp-empty-icon" />
      <span>No synergies match "{{ searchQuery.trim() }}".</span>
    </div>

    <div v-else class="tsp-empty">
      <Icon icon="game-icons:linked-rings" width="34" height="34" class="tsp-empty-icon" />
      <span>No active synergies yet — field champions that share traits or origins.</span>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* ── side panel shell (mirrors SigilDetailsPanel) ── */
.tsp-panel {
  width: v-bind(panelWidthPx);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #1a1008, #0d0905);
  border-left: 2px solid #5c3310;
}
.tsp-goldline {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
}
.tsp-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  flex-shrink: 0;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}
.tsp-head-icon {
  color: #e8c040;
  flex-shrink: 0;
}
.tsp-head-title {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8c040;
}
.tsp-close {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 4px;
  background: rgba(14, 10, 4, 0.85);
  border: 1px solid #5c3310;
  color: #c89040;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}
.tsp-close:hover {
  color: #ffdddd;
  border-color: #cc6050;
  background: rgba(60, 20, 14, 0.7);
}

/* ── search row (below header, does not scroll) ── */
.tsp-search {
  padding: 10px 14px;
  flex-shrink: 0;
  background: #1e1006;
  border-bottom: 1px solid #5c3310;
}

/* ── scrollable content ── */
.tsp {
  flex: 1;
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
.tsp::-webkit-scrollbar {
  width: 4px;
}
.tsp::-webkit-scrollbar-track {
  background: #111;
}
.tsp::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* ── buff summary chips ── */
.tsp-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tsp-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 5px;
  background: #111008;
  border: 1px solid #5c3310;
  box-shadow: inset 0 0 0 1px rgba(92, 51, 16, 0.35);
}
.tsp-chip--zero {
  opacity: 0.5;
  filter: grayscale(55%);
}
.tsp-chip-icon {
  color: #e8c040;
  flex-shrink: 0;
}
.tsp-chip-value {
  font-size: 22px;
  line-height: 1;
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.35);
}
.tsp-chip-label {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 164, 90, 0.6);
}

/* ── sections ── */
.tsp-section {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.tsp-section-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tsp-section-title {
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8c040;
}
.tsp-section-rule {
  flex: 1;
  height: 1px;
  background: rgba(200, 164, 90, 0.16);
}
.tsp-section-count {
  font-size: 11px;
  color: rgba(230, 220, 196, 0.4);
}

/* ── cards ── */
.tsp-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.tsp-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 14px;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-left: 3px solid var(--sc);
}
.tsp-card--brewing {
  opacity: 0.5;
  filter: grayscale(55%);
}
.tsp-card-head {
  display: flex;
  align-items: center;
  gap: 9px;
}
.tsp-hex {
  width: 30px;
  height: 33px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: var(--sc);
}
.tsp-hex-icon {
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
.tsp-card-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.tsp-card-name {
  font-size: 16px;
  font-weight: 700;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tsp-card-kind {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(230, 220, 196, 0.4);
}
.tsp-pips {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}
.tsp-pip {
  min-width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 12px;
  line-height: 1;
  color: rgba(230, 220, 196, 0.35);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(200, 164, 90, 0.14);
}
.tsp-pip--reached {
  color: #0a0806;
  font-weight: 700;
  background: var(--sc);
  border-color: var(--sc);
  box-shadow: 0 0 7px color-mix(in srgb, var(--sc) 55%, transparent);
}
.tsp-card-count {
  min-width: 26px;
  text-align: right;
  font-size: 20px;
  color: var(--sc);
  flex-shrink: 0;
}

/* ── bonus text ── */
.tsp-card-bonus {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 11px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(200, 164, 90, 0.1);
}
.tsp-bonus-active {
  font-size: 14.5px;
  color: #e8c040;
}
.tsp-bonus-none {
  font-size: 13.5px;
  color: rgba(230, 220, 196, 0.45);
}
.tsp-bonus-next {
  font-size: 12px;
  color: rgba(230, 220, 196, 0.4);
}

/* ── champion avatars ── */
.tsp-card-champs {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.tsp-champ {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  object-position: top;
  background: #141410;
  border: 1px solid color-mix(in srgb, var(--sc) 60%, transparent);
}
/* avatar matching the current search query lights up */
.tsp-champ--match {
  border-color: #e8c060;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.55);
}

/* ── empty state ── */
.tsp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 46px 20px;
  text-align: center;
  font-size: 14px;
  color: rgba(200, 164, 90, 0.5);
}
.tsp-empty-icon {
  color: rgba(200, 164, 90, 0.35);
}
</style>
