<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useBattleStore } from '@/stores/battleStore'
import { CHAMPION_ROLES } from '@/config/championRoles'
import ActiveBuffsPanel from './ActiveBuffsPanel.vue'
import StarPhasePanel from './StarPhasePanel.vue'
import AugmentBuffPanel from '@/components/augment/AugmentBuffPanel.vue'

const totalChampions = Object.keys(CHAMPION_ROLES).length

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const battleStore = useBattleStore()

const { totalChimesEarned, chimesPerClick, chimesPerSecond, meeps, level, totalClicks } =
  storeToRefs(gameStore)
const { starsRescued, currentGalaxy } = storeToRefs(galaxyStore)
const { ownedChampions, currentRank } = storeToRefs(battleStore)

const augOpen = ref(true)
const phaseOpen = ref(true)
const hasActiveAugments = computed(() => gameStore.activeAugments.length > 0)

const championCount = computed(
  () => ownedChampions.value.filter((c) => c !== 'Bard').length,
)

const countUpProgress = ref(0)
let rafId: number

onMounted(() => {
  const startTime = performance.now()
  const duration = 1000
  function animFrame(now: number) {
    countUpProgress.value = Math.min((now - startTime) / duration, 1)
    if (countUpProgress.value < 1) rafId = requestAnimationFrame(animFrame)
  }
  rafId = requestAnimationFrame(animFrame)
})

onUnmounted(() => cancelAnimationFrame(rafId))

const animChimes = computed(() => Math.floor(totalChimesEarned.value * countUpProgress.value))
const animStars = computed(() => Math.floor(starsRescued.value * countUpProgress.value))
const animMeeps = computed(() => Math.floor(meeps.value * countUpProgress.value))
const animClicks = computed(() => Math.floor(totalClicks.value * countUpProgress.value))
const animChampions = computed(() => Math.floor(championCount.value * countUpProgress.value))
</script>

<template>
  <div class="sv-root rpg-scrollbar">
    <!-- ══ LEFT COLUMN: Bard ══ -->
    <div class="sv-portrait-col rpg-scrollbar">
      <img
        src="/img/BardAbilities/Bard.png"
        alt="Bard – The Wandering Caretaker"
        class="sv-bard-img"
      />
      <div class="sv-nameplate">
        <span class="sv-name">BARD</span>
        <span class="sv-subtitle">The Wandering Caretaker</span>
      </div>

      <!-- Identity chips: Level · Galaxy · Rank -->
      <div class="sv-identity">
        <div class="sv-chip sv-chip-level">
          <span class="sv-chip-lbl">Level</span>
          <span class="sv-chip-val">{{ level }}</span>
        </div>
        <div class="sv-chip sv-chip-galaxy">
          <span class="sv-chip-lbl">Galaxy</span>
          <span class="sv-chip-val">{{ currentGalaxy }}</span>
        </div>
        <div class="sv-chip sv-chip-rank">
          <span class="sv-chip-lbl">Rank</span>
          <span class="sv-chip-val">{{ currentRank.tier }} {{ currentRank.division }}</span>
        </div>
      </div>

      <ActiveBuffsPanel />
    </div>

    <!-- ══ RIGHT COLUMN ══ -->
    <div class="sv-content-col rpg-scrollbar">
      <!-- ─ HERO PRODUCTION ─ -->
      <div class="sv-block">
        <div class="sv-block-label">Production</div>

        <div class="sv-hero-grid">
          <div class="sv-hero-plate sv-hero-cps">
            <img class="sv-hero-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
            <div class="sv-hero-body">
              <span class="sv-hero-val">{{ $formatNumber(chimesPerSecond) }}</span>
              <span class="sv-hero-lbl">Chimes / Sec</span>
            </div>
          </div>
          <div class="sv-hero-plate sv-hero-cpc">
            <img class="sv-hero-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
            <div class="sv-hero-body">
              <span class="sv-hero-val">{{ $formatNumber(chimesPerClick) }}</span>
              <span class="sv-hero-lbl">Chimes / Click</span>
            </div>
          </div>
        </div>

        <div class="sv-total-strip">
          <img class="sv-total-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
          <span class="sv-total-val">{{ $formatNumber(animChimes) }}</span>
          <span class="sv-total-lbl">Total Chimes Earned</span>
        </div>
      </div>

      <!-- ─ MILESTONES ─ -->
      <div class="sv-block">
        <div class="sv-block-label">Milestones</div>

        <div class="sv-mini-stats">
          <div class="sv-ms-item sv-ms-stars">
            <img class="sv-ms-icon" src="/img/star.png" alt="" aria-hidden="true" />
            <div class="sv-ms-body">
              <span class="sv-ms-val">{{ $formatNumber(animStars) }}</span>
              <span class="sv-ms-lbl">Stars Rescued</span>
            </div>
          </div>
          <div class="sv-ms-item sv-ms-champs">
            <img class="sv-ms-icon" src="/img/menu/TEAM.png" alt="" aria-hidden="true" />
            <div class="sv-ms-body">
              <span class="sv-ms-val">{{ animChampions }}<span class="sv-ms-val-total"> / {{ totalChampions }}</span></span>
              <span class="sv-ms-lbl">Champions</span>
            </div>
          </div>
          <div class="sv-ms-item sv-ms-meeps">
            <img class="sv-ms-icon" src="/img/BardAbilities/BardMeep.png" alt="" aria-hidden="true" />
            <div class="sv-ms-body">
              <span class="sv-ms-val">{{ $formatNumber(animMeeps) }}</span>
              <span class="sv-ms-lbl">Meeps</span>
            </div>
          </div>
          <div class="sv-ms-item sv-ms-clicks">
            <img class="sv-ms-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
            <div class="sv-ms-body">
              <span class="sv-ms-val">{{ $formatNumber(animClicks) }}</span>
              <span class="sv-ms-lbl">Total Clicks</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ─ ACTIVE AUGMENTS (collapsible) ─ -->
      <div v-if="hasActiveAugments" class="cp-card">
        <div class="cp-gold-line" />
        <button
          class="cp-header"
          @click="augOpen = !augOpen"
          :aria-label="augOpen ? 'Collapse Active Augments' : 'Expand Active Augments'"
        >
          <span class="cp-title">Active Augments</span>
          <svg
            class="cp-chevron"
            :class="{ 'is-open': augOpen }"
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polyline
              points="2,4 7,10 12,4"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <div class="cp-body" :class="{ 'is-open': augOpen }">
          <AugmentBuffPanel />
        </div>
      </div>

      <!-- ─ STAR PHASE (collapsible) ─ -->
      <div class="cp-card">
        <div class="cp-gold-line" />
        <button
          class="cp-header"
          @click="phaseOpen = !phaseOpen"
          :aria-label="phaseOpen ? 'Collapse Star Phase' : 'Expand Star Phase'"
        >
          <span class="cp-title">Star Phase</span>
          <svg
            class="cp-chevron"
            :class="{ 'is-open': phaseOpen }"
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polyline
              points="2,4 7,10 12,4"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <div class="cp-body" :class="{ 'is-open': phaseOpen }">
          <StarPhasePanel />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════
   STATS VIEW — groß, luftig, nur RPG-Tokens
══════════════════════════════════════════════ */

.sv-root {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--rpg-bg-deep);
  color: var(--rpg-text);
}

/* ─── Linke Spalte ──────────────────────────── */
.sv-portrait-col {
  width: 34%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 18px;
  padding: 28px 20px;
  background: var(--rpg-bg-dark);
  border-right: 1px solid var(--rpg-wood-inner);
  overflow-y: auto;
}

.sv-bard-img {
  width: 100%;
  max-width: 240px;
  height: auto;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 28px color-mix(in srgb, var(--rpg-gold) 22%, transparent));
}

.sv-nameplate {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.sv-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--rpg-gold);
}
.sv-subtitle {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}

/* ─── Identity Chips ────────────────────────── */
.sv-identity {
  width: 100%;
  display: flex;
  gap: 6px;
}

.sv-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 6px;
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: var(--bp-radius);
  min-width: 0;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.sv-chip-lbl {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
}

.sv-chip-val {
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.sv-chip-level:hover  { border-color: #5c3310; box-shadow: 0 0 8px color-mix(in srgb, var(--rpg-gold) 30%, transparent); }
.sv-chip-galaxy:hover { border-color: #4a3a6a; box-shadow: 0 0 8px color-mix(in srgb, var(--rpg-rarity-rare) 30%, transparent); }
.sv-chip-galaxy .sv-chip-val { color: var(--rpg-rarity-rare); }
.sv-chip-rank:hover   { border-color: #4a5a3a; box-shadow: 0 0 8px color-mix(in srgb, var(--rpg-green-top) 30%, transparent); }
.sv-chip-rank .sv-chip-val { color: var(--rpg-green-light); font-size: 12px; }

/* ─── Rechte Spalte ─────────────────────────── */
.sv-content-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 22px;
  overflow-y: auto;
  min-width: 0;
}
.sv-content-col > :last-child {
  margin-bottom: 0;
}

/* ─── Block ─────────────────────────────────── */
.sv-block {
  margin-bottom: 30px;
}
.sv-block-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rpg-wood-inner);
}

/* ─── Hero Production ───────────────────────── */
.sv-hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.sv-hero-plate {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 18px;
  background: linear-gradient(to bottom, #16130a, #100e07);
  border: 1px solid #5c3310;
  border-radius: var(--bp-radius);
  box-shadow: inset 0 0 0 1px #2a1a08;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.sv-hero-plate:hover {
  border-color: #7a4e20;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 0 14px color-mix(in srgb, var(--rpg-gold) 28%, transparent);
}

.sv-hero-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  object-fit: contain;
  transition: filter 0.15s;
}
.sv-hero-plate:hover .sv-hero-icon {
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--rpg-gold) 70%, transparent));
}

.sv-hero-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.sv-hero-val {
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sv-hero-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
}

/* Total-Chimes-Streifen */
.sv-total-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: var(--bp-radius);
}
.sv-total-icon {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  object-fit: contain;
}
.sv-total-val {
  font-size: 18px;
  font-weight: 900;
  color: var(--rpg-gold);
  line-height: 1;
}
.sv-total-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
  margin-left: auto;
}

/* ─── Mini-Stats (Milestones 2×2) ───────────── */
.sv-mini-stats {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.sv-ms-item {
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: var(--bp-radius);
  padding: 14px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.15s, box-shadow 0.15s;
}

.sv-ms-stars:hover  { box-shadow: 0 0 8px color-mix(in srgb, #a87ed8 30%, transparent); }
.sv-ms-champs:hover { box-shadow: 0 0 8px color-mix(in srgb, #6080cc 30%, transparent); }
.sv-ms-meeps:hover  { box-shadow: 0 0 8px color-mix(in srgb, #52b830 30%, transparent); }
.sv-ms-clicks:hover { box-shadow: 0 0 8px color-mix(in srgb, #e8c040 30%, transparent); }

.sv-ms-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  object-fit: contain;
  transition: filter 0.15s;
}
.sv-ms-stars:hover  .sv-ms-icon { filter: drop-shadow(0 0 5px #a87ed8); }
.sv-ms-champs:hover .sv-ms-icon { filter: drop-shadow(0 0 5px #6080cc); }
.sv-ms-meeps:hover  .sv-ms-icon { filter: drop-shadow(0 0 5px #52b830); }
.sv-ms-clicks:hover .sv-ms-icon { filter: drop-shadow(0 0 5px #e8c040); }

.sv-ms-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.sv-ms-val {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sv-ms-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
}
.sv-ms-val-total {
  font-size: 15px;
  font-weight: 700;
  color: var(--rpg-text-dim);
}

/* ─── Collapsible Panels ────────────────────── */
.cp-card {
  border: 2px solid #7a4e20;
  box-shadow: inset 0 0 0 1px #5c3310;
  background: #111008;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 30px;
}

.cp-gold-line {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c040, #d4a020, #c89040, #5c3310);
}

.cp-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: #1e1006;
  border: none;
  border-bottom: 2px solid #5c3310;
  cursor: pointer;
  color: #c89040;
  transition: background 0.15s ease, color 0.15s ease;
}

.cp-header:hover {
  background: #2a1508;
  color: #e8c040;
}

.cp-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.cp-chevron {
  flex-shrink: 0;
  transition: transform 0.25s ease;
}

.cp-chevron.is-open {
  transform: rotate(180deg);
}

.cp-body {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 0.35s ease, opacity 0.25s ease;
}

.cp-body.is-open {
  max-height: 1200px;
  opacity: 1;
}

/* Remove redundant border/spacing from StarPhasePanel when embedded */
:deep(.spp-root) {
  margin-bottom: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

:deep(.spp-section-label) {
  display: none;
}
</style>
