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

      <!-- Cracked-lane highlights: lit once a lane's inhibitor falls, the winner's
           push lane intensifies after the baron resolves, the other lane fades -->
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="lane-glow-svg">
        <g
          v-for="hl in laneHighlights"
          :key="`lane-${hl.lane}-${hl.attackerTeam}`"
          class="lane-glow"
          :class="[
            `lane-glow--${hl.state}`,
            hl.attackerTeam === 1 ? 'lane-glow--blue' : 'lane-glow--red',
          ]"
        >
          <polyline :points="hl.svgPoints" class="lane-glow-under" />
          <polyline :points="hl.svgPoints" class="lane-glow-core" />
        </g>
      </svg>

      <!-- Minions -->
      <div
        v-for="dot in minions"
        :key="dot.key"
        class="minion-dot"
        :class="dot.team === 1 ? 'minion-dot--blue' : 'minion-dot--red'"
        :style="{ left: dot.x + '%', top: dot.y + '%' }"
      />

      <!-- Nexus markers: biggest structure symbol, always visible -->
      <div
        v-for="n in nexusMarkers"
        :key="`nexus-${n.team}`"
        class="nexus-marker"
        :class="[n.team === 1 ? 'nexus-marker--blue' : 'nexus-marker--red', { 'nexus-marker--dead': n.dead }]"
        :style="{ left: n.x + '%', top: n.y + '%' }"
      >
        <div v-if="!n.dead" class="nexus-core" />
        <span v-if="n.dead" class="nexus-marker-x">✕</span>
      </div>

      <!-- Structures: lane turrets, inhibitors, nexus turrets -->
      <div
        v-for="s in structureMarkers"
        :key="s.id"
        class="structure"
        :class="[
          s.tier === 'inhibitor' ? 'structure--inhib' : 'structure--turret',
          s.ownerTeam === 1 ? 'structure--blue' : 'structure--red',
          { 'structure--dead': s.destroyed },
        ]"
        :style="{ left: s.x + '%', top: s.y + '%' }"
      >
        <span v-if="s.destroyed" class="structure-x" :class="{ 'structure-x--punch': s.justDestroyed }">✕</span>
        <div
          v-if="s.destroyed && s.tier === 'inhibitor'"
          class="structure-breach"
          :class="s.ownerTeam === 1 ? 'structure-breach--red' : 'structure-breach--blue'"
        />
        <template v-if="s.justDestroyed">
          <div class="structure-burst structure-burst--gold" />
          <div class="structure-burst structure-burst--red" />
          <div class="structure-ember" />
        </template>
      </div>

      <!-- PUSH label on the winner's cracked lane once the baron has resolved -->
      <span
        v-if="pushLabel"
        class="lane-push-label"
        :class="pushLabel.team === 1 ? 'lane-push-label--blue' : 'lane-push-label--red'"
        :style="{ left: pushLabel.x + '%', top: pushLabel.y + '%' }"
      >
        PUSH
      </span>

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

      <!-- Drake marker: the live drake, or the countdown to the next one in the chain -->
      <div
        v-if="showDrake"
        class="obj-marker"
        :style="{
          left: DRAKE_POS.x + '%',
          top: DRAKE_POS.y + '%',
          '--obj-glow': drakeUp ? drakeDef.glow : 'rgba(110, 224, 160, 0.45)',
        }"
      >
        <div class="obj-img-wrap">
          <img src="/img/dragon.png" alt="Drake" class="obj-img" :class="{ 'obj-img--dormant': !drakeUp }" />
        </div>
        <span
          class="obj-label"
          :class="{ 'obj-label--countdown': !drakeUp, 'obj-label--soon': drakeSpawnSoon }"
          :style="drakeUp ? { color: drakeDef.color, textShadow: '0 0 6px ' + drakeDef.glow } : { color: '#6ee0a0' }"
        >{{ drakeLabel }}</span>
      </div>

      <!-- Baron marker -->
      <div
        v-if="showBaron"
        class="obj-marker"
        :style="{ left: BARON_POS.x + '%', top: BARON_POS.y + '%', '--obj-glow': 'rgba(168, 85, 247, 0.6)' }"
      >
        <div class="obj-img-wrap">
          <img src="/img/baron.png" alt="Baron" class="obj-img" :class="{ 'obj-img--dormant': !baronUp }" />
        </div>
        <span
          class="obj-label obj-label--baron"
          :class="{ 'obj-label--countdown': !baronUp, 'obj-label--soon': baronSpawnSoon }"
        >{{ baronLabel }}</span>
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
              {
                'champ-img--bard': champAt(pos.team, pos.idx)?.name === 'Bard',
                'champ-img--walking': pos.walking,
                'champ-img--victor': revealedWinner !== null && pos.team === revealedWinner,
              },
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
import {
  DRAKE_POS,
  BARON_POS,
  OBJECTIVE_SPAWN_SOON_T,
  STRUCTURE_BURST_GAME_SECONDS,
  FINAL_PUSH_START_T,
} from '@/config/constants'
import { DRAKE_TYPES } from '@/config/drakes'
import { BLUE_NEXUS_MAP_POSITION, RED_NEXUS_MAP_POSITION } from '@/config/battleRoutes'
import {
  ALL_STRUCTURE_IDS,
  STRUCTURE_POSITIONS,
  parseStructureId,
  crackedLaneOf,
  structureId,
  killRoutePoints,
  fullKillRoutePoints,
} from '@/utils/battleStructures'
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

/** The current drake is up on the map: spawned and not yet resolved. */
const drakeUp = computed(
  () =>
    battleStore.drakeEventTime > 0 &&
    battleStore.battleTime >= battleStore.drakeEventTime &&
    battleStore.drakeKilledByTeam === null,
)
/** Next spawn in the chain — after a kill the marker counts down to it, or vanishes when the chain is done. */
const nextDrakeT = computed(() => battleStore.nextDrakeSpawnT)
const showDrake = computed(() => drakeUp.value || nextDrakeT.value > 0)
const drakeDef = computed(() => DRAKE_TYPES[battleStore.activeDrakeType ?? 'infernal'])
const drakeLabel = computed(() =>
  drakeUp.value ? drakeDef.value.label : battleStore.formatSpawnCountdown(nextDrakeT.value),
)
const drakeSpawnSoon = computed(
  () =>
    !drakeUp.value &&
    nextDrakeT.value > 0 &&
    nextDrakeT.value - battleStore.battleTime <= OBJECTIVE_SPAWN_SOON_T,
)

const showBaron = computed(
  () => battleStore.baronEventTime > 0 && battleStore.baronKilledByTeam === null,
)
const baronUp = computed(() => battleStore.battleTime >= battleStore.baronEventTime)
const baronLabel = computed(() =>
  baronUp.value
    ? 'Baron'
    : battleStore.formatSpawnCountdown(battleStore.baronEventTime),
)
const baronSpawnSoon = computed(
  () =>
    !baronUp.value &&
    battleStore.baronEventTime - battleStore.battleTime <= OBJECTIVE_SPAWN_SOON_T,
)

const nexusPos = computed(() =>
  battleStore.nexusDestroyedByTeam === 1 ? RED_NEXUS_MAP_POSITION : BLUE_NEXUS_MAP_POSITION,
)

const nexusMarkers = computed(() => [
  { team: 1 as const, ...BLUE_NEXUS_MAP_POSITION, dead: battleStore.nexusDestroyedByTeam === 2 },
  { team: 2 as const, ...RED_NEXUS_MAP_POSITION, dead: battleStore.nexusDestroyedByTeam === 1 },
])

interface LaneHighlight {
  lane: 'top' | 'mid' | 'bot'
  attackerTeam: 1 | 2
  state: 'pending' | 'victory' | 'faded'
  svgPoints: string
  routeOwner: 1 | 2
}

// the match winner, revealed only once the final push begins at the 50:00
// mark (baron must also have resolved — no spoilers)
const revealedWinner = computed<1 | 2 | null>(() =>
  battleStore.baronKilledByTeam !== null && battleStore.battleTime >= FINAL_PUSH_START_T
    ? (battleStore.timeline?.winner ?? null)
    : null,
)

const laneHighlights = computed<LaneHighlight[]>(() => {
  const destroyed = new Set(battleStore.destroyedStructures)
  const winner = revealedWinner.value
  const highlights: LaneHighlight[] = []
  for (const owner of [1, 2] as const) {
    const lane = crackedLaneOf(destroyed, owner)
    if (!lane) continue
    const attackerTeam = (3 - owner) as 1 | 2
    const state: LaneHighlight['state'] =
      winner === null ? 'pending' : attackerTeam === winner ? 'victory' : 'faded'
    // the winner's line spans nexus to nexus; hints stay on the defender half
    const points =
      state === 'victory' ? fullKillRoutePoints(attackerTeam, lane) : killRoutePoints(owner, lane)
    highlights.push({
      lane,
      attackerTeam,
      state,
      svgPoints: points.map((p) => `${p.x},${p.y}`).join(' '),
      routeOwner: owner,
    })
  }
  return highlights
})

const pushLabel = computed(() => {
  const hl = laneHighlights.value.find((h) => h.state === 'victory')
  if (!hl) return null
  // sits on the lane between 2nd tower and inhib turret, away from the nexus cluster
  const inner = STRUCTURE_POSITIONS[structureId(hl.routeOwner, hl.lane, 'inner')]
  const inhibTurret = STRUCTURE_POSITIONS[structureId(hl.routeOwner, hl.lane, 'inhibTurret')]
  return {
    team: hl.attackerTeam,
    x: (inner.x + inhibTurret.x) / 2,
    y: (inner.y + inhibTurret.y) / 2,
  }
})

const structureMarkers = computed(() => {
  const destroyed = new Set(battleStore.destroyedStructures)
  return ALL_STRUCTURE_IDS.map((id) => {
    const { ownerTeam, tier } = parseStructureId(id)
    const pos = STRUCTURE_POSITIONS[id]
    const feed = battleStore.structureFeed.find((f) => f.id === id)
    return {
      id,
      x: pos.x,
      y: pos.y,
      ownerTeam,
      tier,
      destroyed: destroyed.has(id),
      justDestroyed:
        feed !== undefined && battleStore.battleTime - feed.t < STRUCTURE_BURST_GAME_SECONDS,
    }
  })
})
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

/* ── Cracked-lane highlights ── */
.lane-glow-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.lane-glow polyline {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.lane-glow--blue {
  color: #60a5fa;
}
.lane-glow--red {
  color: #f87171;
}

.lane-glow-under {
  stroke-width: 1.3;
  opacity: 0.12;
}
.lane-glow-core {
  stroke-width: 0.45;
  stroke-dasharray: 1.5 2.5;
  opacity: 0.5;
  /* dash flows toward the defender's nexus (points are outer tower → nexus) */
  animation: lane-dash-flow 2.2s linear infinite;
}

.lane-glow--pending {
  animation: lane-glow-pulse 2.6s ease-in-out infinite;
}
.lane-glow--victory .lane-glow-under {
  stroke-width: 1.8;
  opacity: 0.2;
}
.lane-glow--victory .lane-glow-core {
  stroke-width: 0.65;
  opacity: 0.8;
  animation-duration: 0.9s;
  filter: drop-shadow(0 0 2px currentColor);
}
.lane-glow--faded {
  opacity: 0.08;
}
.lane-glow--faded .lane-glow-core {
  animation: none;
}

@keyframes lane-dash-flow {
  to {
    /* multiple of the dash period (1.5 + 2.5) so the loop is seamless */
    stroke-dashoffset: -8;
  }
}
@keyframes lane-glow-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.7;
  }
}

.lane-push-label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 8px;
  font-weight: bold;
  letter-spacing: 1.5px;
  padding: 1px 4px;
  border-radius: 4px;
  border: 1px solid;
  background: rgba(10, 10, 8, 0.75);
  pointer-events: none;
  animation: lane-glow-pulse 1.4s ease-in-out infinite;
}
.lane-push-label--blue {
  color: #60a5fa;
  border-color: rgba(96, 165, 250, 0.7);
  text-shadow: 0 0 6px rgba(59, 130, 246, 0.8);
}
.lane-push-label--red {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.7);
  text-shadow: 0 0 6px rgba(239, 68, 68, 0.8);
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

/* ── Structures ── */
/* Standing: subtle team-colored ring around the turret icon drawn on the
   minimap PNG itself. Destroyed: dark disc covering the icon + red ✕. */
.structure {
  position: absolute;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
}
.structure--turret {
  border-radius: 2px;
}
.structure--inhib {
  width: 14px;
  height: 14px;
  transform: translate(-50%, -50%) rotate(45deg);
  border-radius: 3px;
}
.structure--blue {
  border: 2px solid rgba(96, 165, 250, 0.8);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.6);
}
.structure--red {
  border: 2px solid rgba(248, 113, 113, 0.8);
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.55);
}
.structure--dead {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  border: 1px solid #4a4436;
  background: rgba(10, 8, 6, 0.88);
  box-shadow: none;
}
.structure--inhib.structure--dead {
  transform: translate(-50%, -50%);
}
.structure-x {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -54%) rotate(-12deg);
  font-size: 14px;
  font-weight: 700;
  color: #ff4a3a;
  text-shadow: 0 0 4px #000, 0 0 9px rgba(255, 74, 58, 0.55);
  line-height: 1;
}
.structure-x--punch {
  animation: structure-x-punch 0.5s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.structure-burst {
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  border: 2px solid;
  animation: clash-ring 0.9s ease-out 3;
  opacity: 0;
}
.structure-burst--gold {
  border-color: rgba(232, 192, 64, 0.85);
}
.structure-burst--red {
  border-color: rgba(255, 74, 58, 0.7);
  animation-delay: 0.3s;
}
.structure-ember {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 120, 40, 0.55), transparent 65%);
  animation: structure-ember-fade 1.6s ease-out forwards;
}

/* Broken inhibitor gate: persistent ring in the attacker's color marks the push entry */
.structure-breach {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1.5px solid;
  pointer-events: none;
  animation: breach-pulse 1.8s ease-in-out infinite;
}
.structure-breach--blue {
  border-color: #60a5fa;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.7);
}
.structure-breach--red {
  border-color: #f87171;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
}

@keyframes breach-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.1);
  }
}

/* ── Nexus markers ── */
.nexus-marker {
  position: absolute;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%) rotate(45deg);
  border-radius: 4px;
  border: 2px solid;
  pointer-events: none;
  z-index: 3;
}
.nexus-marker--blue {
  border-color: #60a5fa;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.75);
}
.nexus-marker--red {
  border-color: #f87171;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
}
.nexus-core {
  position: absolute;
  inset: 4px;
  border-radius: 2px;
  animation: aoe-pulse 2.6s ease-in-out infinite;
}
.nexus-marker--blue .nexus-core {
  background: radial-gradient(circle, rgba(96, 165, 250, 0.95), rgba(29, 78, 216, 0.45));
}
.nexus-marker--red .nexus-core {
  background: radial-gradient(circle, rgba(248, 113, 113, 0.95), rgba(185, 28, 28, 0.45));
}
.nexus-marker--dead {
  border-color: #4a4436;
  background: rgba(10, 8, 6, 0.9);
  box-shadow: none;
}
.nexus-marker-x {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -52%) rotate(-45deg);
  font-size: 16px;
  font-weight: 700;
  color: #ff4a3a;
  text-shadow: 0 0 5px #000, 0 0 10px rgba(255, 74, 58, 0.6);
  line-height: 1;
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
  /* scales with the square minimap (100cqmin) so the sprite stays pit-sized on all resolutions */
  width: clamp(44px, 12cqmin, 78px);
}

/* Unframed sprite at natural aspect ratio — crisp downscale, glow follows the PNG alpha contour */
.obj-img {
  width: 100%;
  height: auto;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))
    drop-shadow(0 0 7px var(--obj-glow, rgba(168, 85, 247, 0.5)));
}
.obj-img--dormant {
  opacity: 0.75;
  filter: grayscale(0.4) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

.obj-label {
  font-size: 10px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 3px;
  padding: 0 5px;
  white-space: nowrap;
}
.obj-label--baron { color: #c9a0f5; }

/* Pre-spawn countdown — timer digits only, larger and steady */
.obj-label--countdown {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  line-height: 1.3;
  padding: 0 6px;
}
/* Last displayed minute before spawn — soft "get ready" pulse in objective color */
.obj-label--soon {
  animation: spawn-soon 1.2s ease-in-out infinite;
}
@keyframes spawn-soon {
  0%, 100% { text-shadow: none; }
  50% { text-shadow: 0 0 8px var(--obj-glow, rgba(168, 85, 247, 0.9)); }
}

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
  color: #60a5fa;
  box-shadow: 0 0 9px rgba(59, 130, 246, 0.8);
}
.champ-img--red {
  border-color: #f87171;
  color: #f87171;
  box-shadow: 0 0 9px rgba(239, 68, 68, 0.65);
}
.champ-img--bard {
  border-color: #e8c040 !important;
  box-shadow: 0 0 12px rgba(232, 192, 64, 0.9) !important;
}
/* Winning team once the baron has revealed the outcome — breathing team glow */
.champ-img--victor {
  animation: victor-pulse 1.6s ease-in-out infinite;
}
@keyframes victor-pulse {
  0%,
  100% {
    box-shadow: 0 0 9px currentColor;
  }
  50% {
    box-shadow: 0 0 18px 3px currentColor;
  }
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
  /* clears the kill-feed bar, which overlays the bottom 10px of the map stage */
  bottom: 16px;
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

@keyframes structure-x-punch {
  0% { transform: translate(-50%, -54%) rotate(-12deg) scale(2.4); opacity: 0; }
  100% { transform: translate(-50%, -54%) rotate(-12deg) scale(1); opacity: 1; }
}

@keyframes structure-ember-fade {
  0% { opacity: 1; transform: scale(0.6); }
  100% { opacity: 0; transform: scale(1.6); }
}

@media (prefers-reduced-motion: reduce) {
  .clash-ring,
  .dmg-float,
  .fight-aoe,
  .obj-label--soon,
  .walk-indicator,
  .structure-burst,
  .structure-ember,
  .structure-x--punch,
  .nexus-core,
  .nexus-ring,
  .lane-glow--pending,
  .lane-glow-core,
  .lane-push-label,
  .structure-breach,
  .champ-img--victor {
    animation: none;
  }
}
</style>
