<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { TEAM_SIGIL_DETAILS_PANEL_WIDTH } from '@/config/constants'

const emit = defineEmits<{
  close: []
  /** Champions the current search spotlights — mirrored on the sigil board. */
  highlight: [champions: string[]]
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

/** Direct trait/origin hit — the card itself is what the player searched for. */
function cardNameHit(card: SynergyCard): boolean {
  const q = normalizedQuery.value
  return (
    q.length > 0 && (card.name.toLowerCase().includes(q) || card.kind.toLowerCase().includes(q))
  )
}

/** Champions a visible card spotlights: a trait/origin/effect hit lights the whole
 *  constellation, a champion-name hit only the matching champions. */
function cardHighlights(card: SynergyCard): string[] {
  const q = normalizedQuery.value
  if (!q) return []
  if (cardNameHit(card) || card.thresholds.some((t) => t.bonus.toLowerCase().includes(q))) {
    return card.champions
  }
  return card.champions.filter((c) => c.toLowerCase().includes(q))
}

function champDimmed(card: SynergyCard, name: string): boolean {
  return normalizedQuery.value.length > 0 && !cardHighlights(card).includes(name)
}

const highlightedChampions = computed(() => {
  if (!normalizedQuery.value) return []
  const names = new Set<string>()
  for (const group of sections.value) {
    for (const card of group.cards) {
      for (const champ of cardHighlights(card)) names.add(champ)
    }
  }
  return [...names]
})

/** Hovering a card temporarily spotlights its constellation (wins over the search). */
const hoveredChampions = ref<string[] | null>(null)

const effectiveHighlights = computed(() => hoveredChampions.value ?? highlightedChampions.value)

watch(effectiveHighlights, (list) => emit('highlight', list))

/** Splits text into segments so the query can be marked inline. */
function splitByQuery(text: string): { text: string; hit: boolean }[] {
  const q = normalizedQuery.value
  if (!q) return [{ text, hit: false }]
  const segments: { text: string; hit: boolean }[] = []
  const lower = text.toLowerCase()
  let pos = 0
  for (;;) {
    const idx = lower.indexOf(q, pos)
    if (idx === -1) break
    if (idx > pos) segments.push({ text: text.slice(pos, idx), hit: false })
    segments.push({ text: text.slice(idx, idx + q.length), hit: true })
    pos = idx + q.length
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), hit: false })
  return segments
}

const sections = computed(() => [
  { key: 'traits', title: 'Traits', cards: traitCards.value.filter(matchesQuery) },
  { key: 'origins', title: 'Origins', cards: originCards.value.filter(matchesQuery) },
])

const visibleCount = computed(() => sections.value.reduce((sum, g) => sum + g.cards.length, 0))

/** Jump chips: scroll the panel body to a section without manual scrolling. */
function scrollToSection(key: string) {
  document
    .getElementById(`tsp-section-${key}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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
      <div v-if="normalizedQuery" class="tsp-search-result">
        {{ visibleCount }} {{ visibleCount === 1 ? 'synergy' : 'synergies' }} ·
        {{ highlightedChampions.length }}
        {{ highlightedChampions.length === 1 ? 'champion' : 'champions' }}
      </div>

      <!-- section jump chips — scroll straight to Traits / Origins -->
      <div class="tsp-jump">
        <button
          v-for="group in sections"
          :key="`jump-${group.key}`"
          class="tsp-jump-btn"
          :disabled="group.cards.length === 0"
          @click="scrollToSection(group.key)"
        >
          {{ group.title }}
          <span class="tsp-jump-count">{{ group.cards.length }}</span>
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
        <section v-if="group.cards.length > 0" :id="`tsp-section-${group.key}`" class="tsp-section">
        <div class="tsp-section-head">
          <span class="tsp-section-title">{{ group.title }}</span>
          <span class="tsp-section-spacer"></span>
        </div>
        <div class="tsp-grid">
          <article
            v-for="card in group.cards"
            :key="card.id"
            class="tsp-card"
            :class="{ 'tsp-card--brewing': card.brewing, 'tsp-card--hit': cardNameHit(card) }"
            :style="{ '--sc': card.color }"
            @mouseenter="hoveredChampions = card.champions"
            @mouseleave="hoveredChampions = null"
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
                <span class="tsp-card-name">
                  <template v-for="(seg, i) in splitByQuery(card.name)" :key="i">
                    <span v-if="seg.hit" class="tsp-mark">{{ seg.text }}</span>
                    <template v-else>{{ seg.text }}</template>
                  </template>
                </span>
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
              <span v-if="card.activeBonus" class="tsp-bonus-active">
                <template v-for="(seg, i) in splitByQuery(card.activeBonus)" :key="i">
                  <span v-if="seg.hit" class="tsp-mark">{{ seg.text }}</span>
                  <template v-else>{{ seg.text }}</template>
                </template>
              </span>
              <span v-else class="tsp-bonus-none">Not active yet</span>
              <span v-if="card.nextBonus" class="tsp-bonus-next">
                Next:
                <template v-for="(seg, i) in splitByQuery(card.nextBonus)" :key="i">
                  <span v-if="seg.hit" class="tsp-mark">{{ seg.text }}</span>
                  <template v-else>{{ seg.text }}</template>
                </template>
                at {{ card.nextCount }}
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
                :class="{
                  'tsp-champ--match': champMatches(champ),
                  'tsp-champ--dim': champDimmed(card, champ),
                }"
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
.tsp-search-result {
  margin-top: 7px;
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: rgba(200, 164, 90, 0.6);
}

/* inline query mark inside names and bonus texts */
.tsp-mark {
  background: rgba(232, 192, 64, 0.22);
  color: #f0d870;
  border-radius: 2px;
  padding: 0 1px;
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
/* Section headline — big glowing title + gradient underline (same design as the
   Expedition sections and the Champion Shop tier headers) */
.tsp-section-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 2px 2px 10px;
}
.tsp-section-head::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    #e8c040,
    rgba(232, 192, 64, 0.35) 55%,
    transparent
  );
}
.tsp-section-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  line-height: 1;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.45);
  white-space: nowrap;
}
.tsp-section-spacer {
  flex: 1;
}

/* ── section jump — segmented control, full width ── */
.tsp-jump {
  display: flex;
  align-items: stretch;
  gap: 3px;
  margin-top: 9px;
  padding: 3px;
  background: #14100a;
  border: 1px solid #3e200a;
  border-radius: 5px;
}
.tsp-jump-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 0;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: #c8a860;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  cursor: pointer;
  position: relative;
  transition: color 0.15s, background 0.15s;
}
/* gold underline sweeps in on hover — same language as the section headlines */
.tsp-jump-btn::after {
  content: '';
  position: absolute;
  left: 14%;
  right: 14%;
  bottom: 3px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(to right, #e8c040, rgba(232, 192, 64, 0.3));
  opacity: 0;
  transform: scaleX(0.6);
  transform-origin: left;
  transition: opacity 0.18s, transform 0.18s;
}
.tsp-jump-btn:hover:not(:disabled) {
  color: #e8c040;
  background: rgba(232, 192, 64, 0.07);
}
.tsp-jump-btn:hover:not(:disabled)::after {
  opacity: 1;
  transform: scaleX(1);
}
.tsp-jump-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.tsp-jump-count {
  min-width: 24px;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid #5c3310;
  color: #e8c040;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
  font-variant-numeric: tabular-nums;
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
  transition:
    transform 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
}
/* hover mirrors the search-hit look — panel and board speak the same language */
.tsp-card:hover {
  transform: translateY(-1px);
  border-color: var(--sc);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--sc) 35%, transparent),
    0 0 14px color-mix(in srgb, var(--sc) 40%, transparent);
}
.tsp-card--brewing {
  opacity: 0.5;
  filter: grayscale(55%);
}
/* the searched trait/origin itself — glows in its synergy color */
.tsp-card--hit {
  border-color: var(--sc);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--sc) 35%, transparent),
    0 0 14px color-mix(in srgb, var(--sc) 40%, transparent);
}
.tsp-card--hit .tsp-hex {
  animation: tsp-hex-pulse 1.6s ease-in-out infinite;
}
@keyframes tsp-hex-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--sc) 60%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 10px var(--sc));
  }
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
/* spotlight: avatars not part of the current search recede */
.tsp-champ--dim {
  opacity: 0.45;
  filter: grayscale(45%);
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

@media (prefers-reduced-motion: reduce) {
  .tsp-card--hit .tsp-hex {
    animation: none !important;
  }
}
</style>
