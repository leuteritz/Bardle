<template>
  <div class="map-stage">
    <div class="map-square">
      <img src="/img/minimap.png" alt="Minimap" class="map-bg" />
      <div class="map-vignette" />

      <!-- Per-champion movement trails: fade toward the tail, vanish when standing -->
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="trail-svg">
        <template v-for="trail in trails" :key="`trail-${trail.team}-${trail.idx}`">
          <line
            v-for="(seg, i) in trailSegments(trail)"
            :key="i"
            :x1="seg.x1"
            :y1="seg.y1"
            :x2="seg.x2"
            :y2="seg.y2"
            :stroke="trailColor(trail)"
            :stroke-opacity="((i + 1) / trailSegments(trail).length) * 0.55"
            :stroke-width="0.4 + ((i + 1) / trailSegments(trail).length) * 0.4"
            stroke-linecap="round"
          />
        </template>
      </svg>

      <!-- Minions -->
      <div
        v-for="dot in minions"
        :key="dot.key"
        class="minion-dot"
        :class="dot.team === 1 ? 'minion-dot--blue' : 'minion-dot--red'"
        :style="{ left: dot.x + '%', top: dot.y + '%' }"
      />

      <!-- Active fight FX -->
      <div
        v-for="(fight, fi) in battleStore.activeFights"
        :key="`fight-${fight.x}-${fight.y}-${fight.until}`"
        class="fight-fx"
        :style="{ left: fight.x + '%', top: fight.y + '%' }"
      >
        <div class="fight-aoe" />
        <div class="clash-ring clash-ring--gold" />
        <div class="clash-ring clash-ring--red" />
        <span class="fight-star">★</span>
        <span class="dmg-float" :style="{ animationDelay: (fi * 0.4) + 's' }">-{{ 180 + ((fight.until * 7) % 420) }}</span>
        <span class="dmg-float dmg-float--second" :style="{ animationDelay: (fi * 0.4 + 0.7) + 's' }">-{{ 90 + ((fight.until * 13) % 260) }}</span>
      </div>

      <!-- Drake marker -->
      <div v-if="showDrake" class="obj-marker" :style="{ left: DRAKE_POS.x + '%', top: DRAKE_POS.y + '%' }">
        <div class="obj-img-wrap">
          <div class="obj-spin-ring obj-spin-ring--drake" />
          <img src="/img/dragon.png" alt="Drake" class="obj-img obj-img--drake" />
        </div>
        <span class="obj-label obj-label--drake">{{ drakeLabel }}</span>
      </div>

      <!-- Baron marker -->
      <div v-if="showBaron" class="obj-marker" :style="{ left: BARON_POS.x + '%', top: BARON_POS.y + '%' }">
        <div class="obj-img-wrap">
          <div v-if="baronUp" class="obj-spin-ring obj-spin-ring--baron" />
          <img src="/img/baron.png" alt="Baron" class="obj-img obj-img--baron" :class="{ 'obj-img--dormant': !baronUp }" />
        </div>
        <span class="obj-label obj-label--baron">{{ baronLabel }}</span>
      </div>

      <!-- Nexus explosion -->
      <div
        v-if="battleStore.nexusDestroyedByTeam !== null"
        class="nexus-boom"
        :style="{ left: nexusPos.x + '%', top: nexusPos.y + '%' }"
      >
        <div class="nexus-ring" />
        <span class="nexus-label">NEXUS DESTROYED</span>
      </div>

      <!-- Champions -->
      <div
        v-for="pos in positions"
        :key="`${pos.team}-${pos.idx}`"
        v-show="champAt(pos.team, pos.idx)?.name"
        class="champ-marker"
        :style="{ left: pos.x + '%', top: pos.y + '%' }"
      >
        <div class="champ-portrait-wrap">
          <img
            :src="battleStore.getChampionImage(champAt(pos.team, pos.idx)?.name ?? '')"
            :alt="champAt(pos.team, pos.idx)?.name"
            class="champ-img"
            :class="[
              pos.team === 1 ? 'champ-img--blue' : 'champ-img--red',
              { 'champ-img--bard': champAt(pos.team, pos.idx)?.name === 'Bard', 'champ-img--walking': pos.walking },
            ]"
          />
          <span class="champ-level" :class="pos.team === 1 ? 'champ-level--blue' : 'champ-level--red'">
            {{ champAt(pos.team, pos.idx)?.level ?? 1 }}
          </span>
          <span v-if="pos.walking" class="walk-indicator">⟳</span>
        </div>
        <div class="champ-hp">
          <div class="champ-hp-fill" :class="hpClass(champAt(pos.team, pos.idx))" :style="{ width: hpWidth(pos) + '%' }" />
        </div>
        <div class="champ-name" :class="pos.team === 1 ? 'champ-name--blue' : 'champ-name--red'">
          {{ champAt(pos.team, pos.idx)?.name }}
        </div>
      </div>

      <!-- Controls -->
      <div class="map-controls">
        <button
          v-if="battleStore.drakeJumpTarget > battleStore.battleTime"
          class="ctrl-btn ctrl-btn--drake"
          title="Jump to Drake"
          @click="battleStore.jumpToGameTime(battleStore.drakeJumpTarget)"
        >
          <img src="/img/dragon.png" alt="Drake" class="ctrl-img" />
        </button>
        <button
          v-if="battleStore.baronJumpTarget > battleStore.battleTime"
          class="ctrl-btn ctrl-btn--baron"
          title="Jump to Baron"
          @click="battleStore.jumpToGameTime(battleStore.baronJumpTarget)"
        >
          <img src="/img/baron.png" alt="Baron" class="ctrl-img" />
        </button>
        <button class="ctrl-btn ctrl-btn--skip" title="Skip battle" @click="battleStore.adminSkipToEnd()">
          ⟳ SKIP
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useBattleMovement, type ChampionTrail } from '@/composables/useBattleMovement'
import { DRAKE_POS, BARON_POS, BLUE_NEXUS, RED_NEXUS } from '@/config/constants'
import type { ChampionState } from '@/types'

const battleStore = useBattleStore()
const { positions, minions, trails } = useBattleMovement()

interface TrailSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

function trailSegments(trail: ChampionTrail): TrailSegment[] {
  const segs: TrailSegment[] = []
  for (let i = 1; i < trail.points.length; i++) {
    segs.push({
      x1: trail.points[i - 1].x,
      y1: trail.points[i - 1].y,
      x2: trail.points[i].x,
      y2: trail.points[i].y,
    })
  }
  return segs
}

function trailColor(trail: ChampionTrail): string {
  if (trail.isBard) return '#e8c040'
  return trail.team === 1 ? '#60a5fa' : '#f87171'
}

function champAt(team: 1 | 2, idx: number): ChampionState | undefined {
  return team === 1 ? battleStore.team1[idx] : battleStore.team2[idx]
}

function hpClass(champ: ChampionState | undefined): string {
  const hp = champ?.hpPercent ?? 100
  if (hp > 60) return 'hp--high'
  if (hp > 35) return 'hp--mid'
  return 'hp--low'
}

function hpWidth(pos: { team: 1 | 2; idx: number; walking: boolean }): number {
  if (pos.walking) return 100
  return champAt(pos.team, pos.idx)?.hpPercent ?? 100
}

const showDrake = computed(
  () => battleStore.drakeEventTime > 0 && battleStore.drakeKilledByTeam === null,
)
const drakeUp = computed(() => battleStore.battleTime >= battleStore.drakeEventTime)
const drakeLabel = computed(() =>
  drakeUp.value
    ? 'CONTESTED'
    : `SPAWN ${battleStore.formatTime(Math.max(0, battleStore.drakeEventTime - battleStore.battleTime))}`,
)

const showBaron = computed(
  () => battleStore.baronEventTime > 0 && battleStore.baronKilledByTeam === null,
)
const baronUp = computed(() => battleStore.battleTime >= battleStore.baronEventTime)
const baronLabel = computed(() =>
  baronUp.value
    ? 'BARON UP'
    : `SPAWN ${battleStore.formatTime(Math.max(0, battleStore.baronEventTime - battleStore.battleTime))}`,
)

const nexusPos = computed(() =>
  battleStore.nexusDestroyedByTeam === 1 ? RED_NEXUS : BLUE_NEXUS,
)
</script>

<style scoped>
.map-stage {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  min-height: 0;
  min-width: 0;
  /* size container so the square below can measure BOTH axes (cqw/cqh) */
  container-type: size;
}

/* Always a perfect square: the smaller container axis wins, never stretches */
.map-square {
  position: relative;
  width: min(100cqw, 100cqh);
  height: min(100cqw, 100cqh);
}

.map-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.65;
}

.map-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 70px rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

/* ── Movement trails ── */
.trail-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ── Minions ── */
.minion-dot {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: left 0.5s linear, top 0.5s linear;
}
.minion-dot--blue {
  background: #7fb0ff;
  box-shadow: 0 0 4px #3b82f6;
}
.minion-dot--red {
  background: #ff8a8a;
  box-shadow: 0 0 4px #ef4444;
}

/* ── Fight FX ── */
.fight-fx {
  position: absolute;
  width: 14px;
  height: 14px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.fight-aoe {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 64px;
  height: 64px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(232, 192, 64, 0.16), transparent 70%);
  animation: aoe-pulse 1.6s ease-in-out infinite;
}

.clash-ring {
  position: absolute;
  inset: -30px;
  border-radius: 50%;
  border: 2px solid;
  animation: clash-ring 1.4s ease-out infinite;
}
.clash-ring--gold { border-color: rgba(232, 192, 64, 0.7); }
.clash-ring--red {
  border-color: rgba(248, 113, 113, 0.6);
  animation-delay: 0.5s;
}

.fight-star {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 15px;
  color: #e8c040;
  text-shadow: 0 0 8px #000;
}

.dmg-float {
  position: absolute;
  left: 50%;
  top: -6px;
  font-size: 13px;
  font-weight: 700;
  color: #ff5a4a;
  text-shadow: 0 0 6px #000;
  animation: dmg-float 1.8s ease-out infinite;
}
.dmg-float--second {
  color: #ffd24a;
  font-size: 11px;
  left: 70%;
}

/* ── Objective markers ── */
.obj-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
}

.obj-img-wrap {
  position: relative;
  width: 44px;
  height: 44px;
}

.obj-spin-ring {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 2px solid;
  border-right-color: transparent !important;
  border-bottom-color: transparent !important;
  animation: obj-spin 3s linear infinite;
}
.obj-spin-ring--drake { border-color: #22c55e; }
.obj-spin-ring--baron { border-color: #a855f7; }

.obj-img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}
.obj-img--drake {
  border: 2px solid #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.7);
}
.obj-img--baron {
  border: 2px solid #a855f7;
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
}
.obj-img--dormant {
  opacity: 0.75;
  filter: grayscale(0.4);
}

.obj-label {
  font-size: 9px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 3px;
  padding: 0 5px;
  white-space: nowrap;
}
.obj-label--drake { color: #6ee0a0; }
.obj-label--baron { color: #c9a0f5; }

/* ── Nexus explosion ── */
.nexus-boom {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  z-index: 5;
}
.nexus-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 3px solid rgba(232, 192, 64, 0.9);
  animation: clash-ring 1.2s ease-out infinite;
}
.nexus-label {
  margin-top: 16px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #e8c040;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 3px;
  padding: 1px 6px;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.7);
  white-space: nowrap;
}

/* ── Champions ── */
.champ-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  transition: left 0.5s linear, top 0.5s linear;
  z-index: 4;
}

.champ-portrait-wrap {
  position: relative;
}

.champ-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid;
  transition: filter 0.3s;
}
.champ-img--blue {
  border-color: #60a5fa;
  box-shadow: 0 0 9px rgba(59, 130, 246, 0.8);
}
.champ-img--red {
  border-color: #f87171;
  box-shadow: 0 0 9px rgba(239, 68, 68, 0.65);
}
.champ-img--bard {
  border-color: #e8c040 !important;
  box-shadow: 0 0 12px rgba(232, 192, 64, 0.9) !important;
}
.champ-img--walking {
  filter: grayscale(0.7) brightness(0.75);
}

.champ-level {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.champ-level--blue {
  background: #0d1830;
  border: 1px solid #60a5fa;
  color: #cfe0ff;
}
.champ-level--red {
  background: #300d0d;
  border: 1px solid #f87171;
  color: #ffd0d0;
}

.walk-indicator {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 11px;
  color: #e8c040;
  text-shadow: 0 0 4px #000;
  animation: obj-spin 1.4s linear infinite;
}

.champ-hp {
  width: 36px;
  height: 4px;
  margin-top: 2px;
  background: #3a1010;
  border-radius: 2px;
  overflow: hidden;
}
.champ-hp-fill {
  height: 100%;
  transition: width 0.5s ease;
}
.hp--high { background: #37d14a; }
.hp--mid { background: #c9d137; }
.hp--low { background: #d15a37; }

.champ-name {
  margin-top: 1px;
  font-size: 8px;
  text-shadow: 0 1px 2px #000;
  white-space: nowrap;
}
.champ-name--blue { color: #cfe0ff; }
.champ-name--red { color: #ffd0d0; }

/* ── Controls ── */
.map-controls {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  gap: 6px;
  z-index: 10;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  background: rgba(13, 12, 8, 0.85);
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #e8c040;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 1px;
  cursor: pointer;
}
.ctrl-btn:hover {
  border-color: #c89040;
  background: rgba(30, 22, 8, 0.95);
}
.ctrl-btn--skip {
  border-color: #6b3aa0;
  color: #c084fc;
}
.ctrl-img {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
}

/* ── Animations ── */
@keyframes clash-ring {
  0% { opacity: 0.9; transform: scale(0.4); }
  100% { opacity: 0; transform: scale(2.2); }
}

@keyframes aoe-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes dmg-float {
  0% { opacity: 0; transform: translate(-50%, 0) scale(0.7); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -42px) scale(1.1); }
}

@keyframes obj-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .clash-ring,
  .dmg-float,
  .fight-aoe,
  .obj-spin-ring,
  .walk-indicator,
  .nexus-ring {
    animation: none;
  }
}
</style>
