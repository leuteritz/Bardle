<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useBattleStore } from '@/stores/battleStore'
import { CHAMPION_ROLES } from '@/config/championRoles'
import ActiveBuffsPanel from './ActiveBuffsPanel.vue'
import StarPhasePanel from './StarPhasePanel.vue'

const totalChampions = Object.keys(CHAMPION_ROLES).length

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const battleStore = useBattleStore()

const { totalChimesEarned, chimesPerClick, chimesPerSecond, meeps, level, totalClicks } =
  storeToRefs(gameStore)
const { starsRescued, currentGalaxy } = storeToRefs(galaxyStore)
const { ownedChampions, currentRank } = storeToRefs(battleStore)

const championCount = computed(() => ownedChampions.value.filter((c) => c !== 'Bard').length)

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
  <div class="sv-root">
    <!-- ══ LEFT SIDEBAR: Bard + Key Stats ══ -->
    <aside class="sv-sidebar rpg-scrollbar">
      <img
        src="/img/BardAbilities/Bard.png"
        alt="Bard – The Wandering Caretaker"
        class="sv-bard-img"
      />
      <div class="sv-nameplate">
        <span class="sv-name">BARD</span>
        <span class="sv-subtitle">The Wandering Caretaker</span>
      </div>

      <!-- ─ Identity ─ -->
      <div class="sv-stat-group">
        <div class="sv-group-label">Identity</div>
        <div class="sv-stat-row">
          <span class="sv-stat-lbl">Level</span>
          <span class="sv-stat-val">{{ level }}</span>
        </div>
        <div class="sv-stat-row">
          <span class="sv-stat-lbl">Galaxy</span>
          <span class="sv-stat-val sv-val-rare">{{ currentGalaxy }}</span>
        </div>
        <div class="sv-stat-row">
          <span class="sv-stat-lbl">Rank</span>
          <span class="sv-stat-val sv-val-green">{{ currentRank.tier }} {{ currentRank.division }}</span>
        </div>
      </div>

      <!-- ─ Production ─ -->
      <div class="sv-stat-group">
        <div class="sv-group-label">Production</div>
        <div class="sv-stat-row">
          <img class="sv-stat-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
          <span class="sv-stat-lbl">Chimes / Sec</span>
          <span class="sv-stat-val">{{ $formatNumber(chimesPerSecond) }}</span>
        </div>
        <div class="sv-stat-row">
          <img class="sv-stat-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
          <span class="sv-stat-lbl">Chimes / Click</span>
          <span class="sv-stat-val">{{ $formatNumber(chimesPerClick) }}</span>
        </div>
        <div class="sv-stat-row">
          <img class="sv-stat-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
          <span class="sv-stat-lbl">Total Chimes</span>
          <span class="sv-stat-val">{{ $formatNumber(animChimes) }}</span>
        </div>
      </div>

      <!-- ─ Progress ─ -->
      <div class="sv-stat-group">
        <div class="sv-group-label">Progress</div>
        <div class="sv-stat-row">
          <img class="sv-stat-icon" src="/img/star.png" alt="" aria-hidden="true" />
          <span class="sv-stat-lbl">Stars Rescued</span>
          <span class="sv-stat-val">{{ $formatNumber(animStars) }}</span>
        </div>
        <div class="sv-stat-row">
          <img class="sv-stat-icon" src="/img/menu/TEAM.png" alt="" aria-hidden="true" />
          <span class="sv-stat-lbl">Champions</span>
          <span class="sv-stat-val">
            {{ animChampions }}<span class="sv-stat-val-sub"> / {{ totalChampions }}</span>
          </span>
        </div>
        <div class="sv-stat-row">
          <img class="sv-stat-icon" src="/img/BardAbilities/BardMeep.png" alt="" aria-hidden="true" />
          <span class="sv-stat-lbl">Meeps</span>
          <span class="sv-stat-val">{{ $formatNumber(animMeeps) }}</span>
        </div>
        <div class="sv-stat-row">
          <img class="sv-stat-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
          <span class="sv-stat-lbl">Total Clicks</span>
          <span class="sv-stat-val">{{ $formatNumber(animClicks) }}</span>
        </div>
      </div>
    </aside>

    <!-- ══ MAIN AREA: Star Phase (hero) + Augment Buffs ══ -->
    <div class="sv-main rpg-scrollbar">
      <StarPhasePanel />
      <ActiveBuffsPanel />
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════
   BARD STATS — 260px stat sidebar + stacked main
══════════════════════════════════════════════ */

.sv-root {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--rpg-bg-deep);
  color: var(--rpg-text);
}

/* ─── Left sidebar ──────────────────────────── */
.sv-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  padding: 24px 18px;
  background: var(--rpg-bg-dark);
  border-right: 1px solid var(--rpg-wood-inner);
  overflow-y: auto;
}

.sv-bard-img {
  width: 100%;
  max-width: 180px;
  height: auto;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 0 24px color-mix(in srgb, var(--rpg-gold) 22%, transparent));
}

.sv-nameplate {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sv-name {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--rpg-gold);
}
.sv-subtitle {
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}

/* ─── Stat groups ───────────────────────────── */
.sv-stat-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sv-group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  padding-bottom: 7px;
  margin-bottom: 3px;
  border-bottom: 1px solid var(--rpg-wood-inner);
}

.sv-stat-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: var(--bp-radius);
  transition: border-color 0.15s, background 0.15s;
}

.sv-stat-row:hover {
  background: #1a1008;
  border-color: #5c3310;
}

.sv-stat-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: contain;
}

.sv-stat-lbl {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sv-stat-val {
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
}
.sv-val-rare {
  color: var(--rpg-rarity-rare);
}
.sv-val-green {
  color: var(--rpg-green-light);
  font-size: 13px;
}
.sv-stat-val-sub {
  font-size: 12px;
  font-weight: 700;
  color: var(--rpg-text-dim);
}

/* ─── Main area (stacked) ───────────────────── */
.sv-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 22px;
  overflow-y: auto;
  min-width: 0;
}
.sv-main > :last-child {
  margin-bottom: 4px;
}
</style>
