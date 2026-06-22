<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { useShopStore } from '@/stores/shopStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useBattleStore } from '@/stores/battleStore'
import { CHAMPION_ROLES } from '@/config/championRoles'
import ActiveBuffsPanel from './ActiveBuffsPanel.vue'
import StarPhasePanel from './StarPhasePanel.vue'
import AugmentBuffPanel from '@/components/augment/AugmentBuffPanel.vue'

const totalChampions = Object.keys(CHAMPION_ROLES).length

const gameStore = useGameStore()
const shopStore = useShopStore()
const galaxyStore = useGalaxyStore()
const battleStore = useBattleStore()

const { totalChimesEarned, chimesPerClick, chimesPerSecond, meeps } = storeToRefs(gameStore)
const { starsRescued } = storeToRefs(galaxyStore)
const { ownedChampions } = storeToRefs(battleStore)
const { buildingStats } = storeToRefs(shopStore)

const augOpen = ref(true)
const phaseOpen = ref(true)
const hasActiveAugments = computed(() => gameStore.activeAugments.length > 0)

const animated = ref(false)
const countUpProgress = ref(0)
let rafId: number

onMounted(() => {
  const startTime = performance.now()
  const duration = 1000
  function animFrame(now: number) {
    countUpProgress.value = Math.min((now - startTime) / duration, 1)
    if (countUpProgress.value < 1) rafId = requestAnimationFrame(animFrame)
    else animated.value = true
  }
  rafId = requestAnimationFrame(animFrame)
})

onUnmounted(() => cancelAnimationFrame(rafId))

const animChimes = computed(() => Math.floor(totalChimesEarned.value * countUpProgress.value))
const animStars = computed(() => Math.floor(starsRescued.value * countUpProgress.value))
const animMeeps = computed(() => Math.floor(meeps.value * countUpProgress.value))
const animChampions = computed(() =>
  Math.floor(ownedChampions.value.filter((c) => c !== 'Bard').length * countUpProgress.value),
)

const maxCPS = computed(() => {
  const vals = buildingStats.value.map((b) => b.currentCPS)
  return vals.length > 0 ? Math.max(...vals) : 1
})


</script>

<template>
  <div class="sv-root rpg-scrollbar">
    <!-- ══ LEFT COLUMN: Bard ══ -->
    <div class="sv-portrait-col">
      <img
        src="/img/BardAbilities/Bard.png"
        alt="Bard – The Wandering Caretaker"
        class="sv-bard-img"
      />
      <div class="sv-nameplate">
        <span class="sv-name">BARD</span>
        <span class="sv-subtitle">The Wandering Caretaker</span>
      </div>

      <div class="sv-mini-stats">
        <div class="sv-ms-item sv-ms-chimes">
          <img class="sv-ms-icon" src="/img/BardAbilities/BardChime.png" alt="Chimes" />
          <div class="sv-ms-body">
            <span class="sv-ms-val">{{ $formatNumber(animChimes) }}</span>
            <span class="sv-ms-lbl">Total Chimes</span>
          </div>
        </div>
        <div class="sv-ms-item sv-ms-stars">
          <img class="sv-ms-icon" src="/img/star.png" alt="Stars" />
          <div class="sv-ms-body">
            <span class="sv-ms-val">{{ $formatNumber(animStars) }}</span>
            <span class="sv-ms-lbl">Stars Rescued</span>
          </div>
        </div>
        <div class="sv-ms-item sv-ms-meeps">
          <img class="sv-ms-icon" src="/img/BardAbilities/BardMeep.png" alt="Meeps" />
          <div class="sv-ms-body">
            <span class="sv-ms-val">{{ $formatNumber(animMeeps) }}</span>
            <span class="sv-ms-lbl">Meeps</span>
          </div>
        </div>
        <div class="sv-ms-item sv-ms-champs">
          <img class="sv-ms-icon" src="/img/menu/TEAM.png" alt="Champions" />
          <div class="sv-ms-body">
            <span class="sv-ms-val">{{ animChampions }}<span class="sv-ms-val-total"> / {{ totalChampions }}</span></span>
            <span class="sv-ms-lbl">Champions</span>
          </div>
        </div>
        <div class="sv-ms-item sv-ms-cps">
          <img class="sv-ms-icon" src="/img/BardAbilities/BardChime.png" alt="Chimes/s" />
          <div class="sv-ms-body">
            <span class="sv-ms-val">{{ $formatNumber(chimesPerSecond) }}</span>
            <span class="sv-ms-lbl">Chimes / Sec</span>
          </div>
        </div>
        <div class="sv-ms-item sv-ms-cpc">
          <img class="sv-ms-icon" src="/img/BardAbilities/BardChime.png" alt="Chimes/click" />
          <div class="sv-ms-body">
            <span class="sv-ms-val">{{ $formatNumber(chimesPerClick) }}</span>
            <span class="sv-ms-lbl">Chimes / Click</span>
          </div>
        </div>
      </div>

      <ActiveBuffsPanel />
    </div>

    <!-- ══ RIGHT COLUMN ══ -->
    <div class="sv-content-col rpg-scrollbar">

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

      <!-- ─ GEBÄUDE ─ -->
      <div class="sv-block">
        <div class="sv-block-label">Buildings</div>

        <ul class="sv-building-list" role="list">
          <li v-for="(b, index) in buildingStats" :key="b.id" class="sv-building-row">
            <div class="sv-rank">#{{ index + 1 }}</div>

            <img :src="b.icon" :alt="b.name" class="sv-building-icon" />

            <div class="sv-building-info">
              <!-- Zeile 1: Name + Count + aktueller CPS -->
              <div class="sv-building-top">
                <span class="sv-building-name">{{ b.name }}</span>
                <span class="sv-building-count">×{{ b.level }}</span>
                <span class="sv-building-output sv-val-green">
                  {{ $formatNumber(b.currentCPS) }}/s
                </span>
              </div>

              <!-- Zeile 2: Gesamt produziert + Anteil -->
              <div class="sv-building-produced">
                <span class="sv-produced-val">{{ $formatNumber(b.lifetimeProduction) }}</span>
                <span class="sv-produced-lbl">produced</span>
                <span class="sv-produced-pct">{{ b.efficiency }}%</span>
              </div>

              <!-- Zeile 3: CPS-Balken -->
              <div class="rpg-progress-track sv-bar-track">
                <div
                  class="rpg-progress-bar sv-bar-fill"
                  :style="{
                    width: animated && maxCPS > 0 ? `${(b.currentCPS / maxCPS) * 100}%` : '0%',
                  }"
                />
              </div>
            </div>
          </li>
        </ul>
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
  width: 36%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 20px;
  padding: 28px 20px;
  background: var(--rpg-bg-dark);
  border-right: 1px solid var(--rpg-wood-inner);
  overflow-y: auto;
}

.sv-bard-img {
  width: 100%;
  max-width: 260px;
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

/* ─── Block ─────────────────────────────────── */
.sv-block {
  margin-bottom: 36px;
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

/* ─── Mini-Stats (linke Spalte, 2×3) ─────────── */
.sv-mini-stats {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.sv-ms-item {
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: var(--bp-radius);
  padding: 12px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.15s, box-shadow 0.15s;
}

.sv-ms-chimes:hover { box-shadow: 0 0 8px color-mix(in srgb, #e8c040 30%, transparent); }
.sv-ms-stars:hover  { box-shadow: 0 0 8px color-mix(in srgb, #a87ed8 30%, transparent); }
.sv-ms-meeps:hover  { box-shadow: 0 0 8px color-mix(in srgb, #52b830 30%, transparent); }
.sv-ms-champs:hover { box-shadow: 0 0 8px color-mix(in srgb, #6080cc 30%, transparent); }
.sv-ms-cps:hover    { box-shadow: 0 0 8px color-mix(in srgb, #e8c040 30%, transparent); }
.sv-ms-cpc:hover    { box-shadow: 0 0 8px color-mix(in srgb, #e8a040 30%, transparent); }

.sv-ms-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  object-fit: contain;
  transition: filter 0.15s;
}
.sv-ms-chimes:hover .sv-ms-icon { filter: drop-shadow(0 0 5px #e8c040); }
.sv-ms-stars:hover  .sv-ms-icon { filter: drop-shadow(0 0 5px #a87ed8); }
.sv-ms-meeps:hover  .sv-ms-icon { filter: drop-shadow(0 0 5px #52b830); }
.sv-ms-champs:hover .sv-ms-icon { filter: drop-shadow(0 0 5px #6080cc); }
.sv-ms-cps:hover    .sv-ms-icon { filter: drop-shadow(0 0 5px #e8c040); }
.sv-ms-cpc:hover    .sv-ms-icon { filter: drop-shadow(0 0 5px #e8a040); }

.sv-ms-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.sv-ms-val {
  font-size: 18px;
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
  font-size: 14px;
  font-weight: 700;
  color: var(--rpg-text-dim);
}

/* ─── Gebäude-Liste ─────────────────────────── */
.sv-building-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.sv-building-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 6px;
  border-bottom: 1px solid var(--rpg-bg-row);
  transition: background 0.1s;
}
.sv-building-row:last-child {
  border-bottom: none;
}
.sv-building-row:hover {
  background: var(--rpg-bg-hover);
}

/* Rang */
.sv-rank {
  font-size: 11px;
  font-weight: 700;
  color: var(--rpg-text-dim);
  min-width: 22px;
  text-align: right;
  flex-shrink: 0;
}

.sv-building-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
}

.sv-building-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Zeile 1: Name + Count + Output */
.sv-building-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.sv-building-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--rpg-gold-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.sv-building-count {
  font-size: 13px;
  color: var(--rpg-text-dim);
  flex-shrink: 0;
}
.sv-building-output {
  font-size: 14px;
  font-weight: 700;
  margin-left: auto;
  flex-shrink: 0;
}

/* Zeile 2: Gesamt produziert + % */
.sv-building-produced {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sv-produced-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--rpg-gold);
}
.sv-produced-lbl {
  font-size: 10px;
  color: var(--rpg-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.sv-produced-pct {
  font-size: 11px;
  font-weight: 700;
  color: var(--rpg-orange);
  margin-left: auto;
}

/* Zeile 3: CPS-Bar */
.sv-bar-track {
  height: 5px;
}
.sv-bar-fill {
  height: 100%;
  transition: width 0.85s ease;
}

/* ─── Collapsible Panels ────────────────────── */
.cp-card {
  border: 2px solid #7a4e20;
  box-shadow: inset 0 0 0 1px #5c3310;
  background: #111008;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 20px;
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
