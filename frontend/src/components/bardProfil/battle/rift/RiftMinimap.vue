<template>
  <div class="map-stage" @click="battleStore.clearFocusedChampion()">
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

      <!-- Jungle buff camps: monster icon glows while the buff is up; slain →
           grey + ✕ with the 5:00 respawn countdown underneath (like drake/baron) -->
      <div
        v-for="camp in buffCamps"
        :key="camp.key"
        class="buff-camp-wrap"
        :style="{ left: camp.x + '%', top: camp.y + '%' }"
      >
        <div
          class="buff-camp"
          :class="[`buff-camp--${camp.buffType}`, { 'buff-camp--cleared': camp.cleared }]"
        >
          <Icon
            :icon="camp.buffType === 'blue' ? 'game-icons:golem-head' : 'game-icons:lizardman'"
            width="11"
            height="11"
            class="buff-camp-icon"
          />
          <span v-if="camp.cleared" class="buff-camp-x">✕</span>
          <div v-if="camp.justCleared" class="buff-camp-burst" />
        </div>
        <span
          v-if="camp.cleared"
          class="buff-cd"
          :class="[`buff-cd--${camp.buffType}`, { 'buff-cd--soon': camp.spawnSoon }]"
        >{{ camp.countdown }}</span>
      </div>

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

      <!-- Kill-spot markers: a short burst wherever a kill just landed -->
      <div
        v-for="mark in killMarkers"
        :key="mark.id"
        class="kill-mark"
        :class="mark.team === 1 ? 'kill-mark--blue' : 'kill-mark--red'"
        :style="{
          left: mark.x + '%',
          top: mark.y + '%',
          '--mk-scale': String(1 + Math.min(mark.tier - 1, 4) * 0.22),
        }"
      >
        <span class="kill-mark-aoe" />
        <span class="kill-mark-ring" />
        <span class="kill-mark-flash" />
        <Icon icon="game-icons:saber-slash" class="kill-mark-icon" width="26" height="26" />
        <span v-if="mark.tier >= 2" class="kill-mark-tier">{{ mark.tier }}×</span>
      </div>

      <!-- Champions -->
      <div
        v-for="pos in positions"
        :key="`${pos.team}-${pos.idx}`"
        v-show="champAt(pos.team, pos.idx)?.name"
        class="champ-marker"
        :class="{
          'champ-marker--mvp': isMvp(pos.team, pos.idx),
          'champ-marker--focused': isFocused(pos.team, pos.idx),
          'champ-marker--dimmed': hasFocus && !isFocused(pos.team, pos.idx),
        }"
        :style="{ left: pos.x + '%', top: pos.y + '%' }"
      >
        <div class="champ-portrait-wrap">
          <!-- Spotlight ring when this champion is focused from a team card -->
          <span v-if="isFocused(pos.team, pos.idx)" class="focus-ring" aria-hidden="true" />
          <!-- Live MVP: rotating gold ring + floating crown -->
          <template v-if="isMvp(pos.team, pos.idx)">
            <span class="mvp-ring" aria-hidden="true" />
            <Icon icon="game-icons:imperial-crown" class="mvp-crown" width="18" height="18" />
          </template>
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
                'champ-img--buff-blue': champBuffs(pos.team, pos.idx).includes('blue'),
                'champ-img--buff-red': champBuffs(pos.team, pos.idx).includes('red'),
                'champ-img--mvp': isMvp(pos.team, pos.idx),
              },
            ]"
          />
          <span class="champ-level" :class="pos.team === 1 ? 'champ-level--blue' : 'champ-level--red'">
            {{ champAt(pos.team, pos.idx)?.level ?? 1 }}
          </span>
          <span v-if="pos.walking" class="walk-indicator">⟳</span>
          <span v-if="champBuffs(pos.team, pos.idx).length" class="champ-buffs">
            <span
              v-for="b in champBuffs(pos.team, pos.idx)"
              :key="b"
              class="champ-buff-orb"
              :class="`champ-buff-orb--${b}`"
            />
          </span>
        </div>
        <div class="champ-hp">
          <div class="champ-hp-fill" :class="hpClass(champAt(pos.team, pos.idx))" :style="{ width: hpWidth(pos) + '%' }" />
        </div>
        <div
          class="champ-name"
          :class="[
            pos.team === 1 ? 'champ-name--blue' : 'champ-name--red',
            { 'champ-name--mvp': isMvp(pos.team, pos.idx) },
          ]"
        >
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
          <img src="/img/dragon_icon.png" alt="Drake" class="ctrl-img" />
        </button>
        <button
          v-if="battleStore.baronJumpTarget > battleStore.battleTime"
          class="ctrl-btn ctrl-btn--baron"
          title="Jump to Baron"
          @click="battleStore.jumpToGameTime(battleStore.baronJumpTarget)"
        >
          <img src="/img/baron_icon.png" alt="Baron" class="ctrl-img" />
        </button>
        <button class="ctrl-btn ctrl-btn--skip" title="Skip battle" @click="battleStore.adminSkipToEnd()">
          ⟳ SKIP
        </button>
        <button
          class="ctrl-btn ctrl-btn--mvp"
          :class="{ 'ctrl-btn--mvp-on': battleStore.adminForceOwnMvp }"
          :title="battleStore.adminForceOwnMvp
            ? 'Forced own-team MVP: ON — a random blue champion gets MVP every battle'
            : 'Forced own-team MVP: OFF — the algorithm picks the MVP'"
          @click="battleStore.adminForceOwnMvp = !battleStore.adminForceOwnMvp"
        >
          MVP
          <span class="mvp-switch" :class="{ 'mvp-switch--on': battleStore.adminForceOwnMvp }">
            <span class="mvp-switch-knob" />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { useBattleMovement, type ChampionTrail } from '@/composables/useBattleMovement'
import {
  DRAKE_POS,
  BARON_POS,
  OBJECTIVE_SPAWN_SOON_T,
  STRUCTURE_BURST_GAME_SECONDS,
  FINAL_PUSH_START_T,
  JUNGLE_BUFF_RESPAWN_T,
  KILL_MARK_WINDOW_T,
} from '@/config/constants'
import { DRAKE_TYPES } from '@/config/drakes'
import { BLUE_NEXUS_MAP_POSITION, RED_NEXUS_MAP_POSITION, JUNGLE_BUFF_CAMPS } from '@/config/battleRoutes'
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

/** True for the champion currently leading the live MVP race (both teams). */
function isMvp(team: 1 | 2, idx: number): boolean {
  return battleStore.liveMvpId === `${team}-${idx}`
}

/** A team-column card is currently spotlighting one champion. */
const hasFocus = computed(() => battleStore.focusedChampionId !== '')
/** True for the champion the player clicked to spotlight. */
function isFocused(team: 1 | 2, idx: number): boolean {
  return battleStore.focusedChampionId === `${team}-${idx}`
}

/**
 * Kills that landed in the last KILL_MARK_WINDOW_T game-seconds — each drives a
 * short burst marker on the map at the exact spot the kill happened. Tinted by
 * the killer's team; multikills (double/triple/…) render larger + tagged.
 */
const killMarkers = computed(() => {
  const now = battleStore.battleTime
  const events = battleStore.timeline?.events
  if (!events) return []
  const out: Array<{ id: string; x: number; y: number; team: 1 | 2; tier: number }> = []
  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    if (e.type !== 'kill' || !e.location) continue
    if (e.t <= now && e.t > now - KILL_MARK_WINDOW_T) {
      out.push({
        id: `${i}-${e.t}`,
        x: e.location.x,
        y: e.location.y,
        team: (e.team ?? 1) as 1 | 2,
        tier: e.multikillTier ?? 1,
      })
    }
  }
  return out
})

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

/** All four buff camps. Slain camps count down their 5:00 respawn, then read as up again. */
const buffCamps = computed(() => {
  const now = battleStore.battleTime
  const out = []
  for (const team of [1, 2] as const) {
    for (const buffType of ['blue', 'red'] as const) {
      const pos = JUNGLE_BUFF_CAMPS[team][buffType]
      let lastClearT = -Infinity
      for (const e of battleStore.buffFeed) {
        if (e.team === team && e.buffType === buffType && e.t <= now && e.t > lastClearT)
          lastClearT = e.t
      }
      const respawnT = lastClearT + JUNGLE_BUFF_RESPAWN_T
      const cleared = now < respawnT
      out.push({
        key: `buff-${team}-${buffType}`,
        x: pos.x,
        y: pos.y,
        buffType,
        cleared,
        justCleared: cleared && now - lastClearT < STRUCTURE_BURST_GAME_SECONDS,
        countdown: cleared ? battleStore.formatSpawnCountdown(respawnT) : '',
        spawnSoon: cleared && respawnT - now <= OBJECTIVE_SPAWN_SOON_T,
      })
    }
  }
  return out
})

/** Cosmetic buff orbs on a champion's minimap marker — whoever slew the camp carries them. */
function champBuffs(team: 1 | 2, idx: number): Array<'blue' | 'red'> {
  return battleStore.championBuffs(team, idx).map((b) => b.type)
}

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
  /* opaque base: the map art is 65% opacity — without this the cosmic
     starfield behind the board would twinkle through the map itself */
  background: #111008;
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

/* ── Jungle buff camps ── */
/* Up: dark badge disc, buff-colored monster icon + ring, breathing glow.
   Slain: badge dims to grey, icon desaturates, red ✕ stamps over it and the
   respawn countdown ticks underneath (same pattern as drake/baron). */
.buff-camp-wrap {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  z-index: 1;
}
.buff-camp {
  position: relative;
  /* scales with the square minimap (cqmin) — clearly bigger than champ dots,
     still below the drake/baron sprites in the hierarchy */
  width: clamp(24px, 6.5cqmin, 40px);
  height: clamp(24px, 6.5cqmin, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid;
  background: rgba(10, 8, 6, 0.78);
}
.buff-camp-icon {
  width: 62%;
  height: 62%;
}
.buff-camp--blue {
  border-color: rgba(147, 197, 253, 0.85);
  animation: buff-glow-blue 2.2s ease-in-out infinite;
}
.buff-camp--red {
  border-color: rgba(252, 165, 165, 0.85);
  animation: buff-glow-red 2.2s ease-in-out infinite;
}
.buff-camp--blue .buff-camp-icon {
  color: #93c5fd;
  filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.9));
}
.buff-camp--red .buff-camp-icon {
  color: #fca5a5;
  filter: drop-shadow(0 0 3px rgba(239, 68, 68, 0.9));
}

@keyframes buff-glow-blue {
  0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 11px rgba(59, 130, 246, 0.95); }
}
@keyframes buff-glow-red {
  0%, 100% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.5); }
  50% { box-shadow: 0 0 11px rgba(239, 68, 68, 0.95); }
}

/* Slain state — clearly "not up": grey badge, muted icon, red ✕ stamp */
.buff-camp--cleared {
  border-color: #4a4436;
  background: rgba(10, 8, 6, 0.88);
  animation: none;
  box-shadow: none;
}
.buff-camp--cleared .buff-camp-icon {
  color: #6a6456;
  filter: none;
  opacity: 0.65;
}
.buff-camp-x {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -54%) rotate(-12deg);
  font-size: clamp(16px, 4.2cqmin, 26px);
  font-weight: 700;
  color: #ff4a3a;
  text-shadow: 0 0 3px #000, 0 0 7px rgba(255, 74, 58, 0.55);
  line-height: 1;
}

/* Kill moment: short expanding ring burst in the buff's color */
.buff-camp-burst {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 2px solid;
  animation: clash-ring 0.9s ease-out 3;
  opacity: 0;
}
.buff-camp--blue .buff-camp-burst { border-color: rgba(96, 165, 250, 0.85); }
.buff-camp--red .buff-camp-burst { border-color: rgba(248, 113, 113, 0.85); }

/* Respawn countdown under the slain camp — drake/baron countdown language,
   one step smaller than their 13px timers so the hierarchy stays intact */
.buff-cd {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  padding: 0 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.7);
  white-space: nowrap;
}
.buff-cd--blue { color: #93c5fd; }
.buff-cd--red { color: #fca5a5; }
.buff-cd--soon {
  animation: spawn-soon 1.2s ease-in-out infinite;
}
.buff-cd--blue.buff-cd--soon { --obj-glow: rgba(59, 130, 246, 0.9); }
.buff-cd--red.buff-cd--soon { --obj-glow: rgba(239, 68, 68, 0.9); }

/* Cosmetic buff auras on the jungler's map marker — bold orbs with a
   breathing halo ring at the portrait edge, readable at map scale */
.champ-buffs {
  position: absolute;
  bottom: -4px;
  right: -7px;
  display: flex;
  gap: 3px;
}
.champ-buff-orb {
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.75);
}
.champ-buff-orb::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1.5px solid;
  animation: champ-buff-halo 1.8s ease-out infinite;
}
.champ-buff-orb--blue {
  background: radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1d4ed8);
  box-shadow: 0 0 8px rgba(59, 130, 246, 1);
}
.champ-buff-orb--blue::after {
  border-color: rgba(147, 197, 253, 0.9);
}
.champ-buff-orb--red {
  background: radial-gradient(circle at 35% 30%, #fecaca, #ef4444 55%, #b91c1c);
  box-shadow: 0 0 8px rgba(239, 68, 68, 1);
}
.champ-buff-orb--red::after {
  border-color: rgba(252, 165, 165, 0.9);
}
@keyframes champ-buff-halo {
  0% { opacity: 0.9; transform: scale(0.8); }
  100% { opacity: 0; transform: scale(1.7); }
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
  transition: left 0.5s linear, top 0.5s linear, opacity 0.25s ease;
  z-index: 4;
}
/* Live MVP floats above the pack so its crown/ring never hides behind others */
.champ-marker--mvp {
  z-index: 7;
}
/* ── Team-card spotlight ── */
/* Non-focused dots recede so the picked champion pops */
.champ-marker--dimmed {
  opacity: 0.28;
}
/* Focused dot floats above everything and scales up a touch */
.champ-marker--focused {
  z-index: 8;
}

.champ-portrait-wrap {
  position: relative;
  transition: transform 0.2s ease;
}
.champ-marker--focused .champ-portrait-wrap {
  transform: scale(1.28);
}

/* Bright neutral spotlight ring hugging the focused portrait (behind the face) */
.focus-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 48px;
  height: 48px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.95);
  box-shadow:
    0 0 12px rgba(255, 255, 255, 0.6),
    inset 0 0 8px rgba(255, 255, 255, 0.4);
  z-index: -1;
  pointer-events: none;
}

/* ── Live MVP highlight ── */
/* Rotating conic gold ring hugging the portrait — masked hollow so only the
   halo around the dot shows. Sits behind the face (negative z-index). */
.mvp-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 54px;
  height: 54px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #a5720c,
    #ffe884,
    #e8c040,
    #fff6d0,
    #e8c040,
    #a5720c
  );
  -webkit-mask: radial-gradient(circle, transparent 62%, #000 64%);
  mask: radial-gradient(circle, transparent 62%, #000 64%);
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.85));
  animation: mvp-ring-spin 3.2s linear infinite;
  z-index: -1;
  pointer-events: none;
}
@keyframes mvp-ring-spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* Floating crown above the MVP portrait */
.mvp-crown {
  position: absolute;
  top: -17px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffe07a;
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.95)) drop-shadow(0 1px 1px #000);
  animation: mvp-crown-bob 1.8s ease-in-out infinite;
  z-index: 3;
}
@keyframes mvp-crown-bob {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-2.5px);
  }
}

/* Gold border + breathing glow on the MVP portrait (keeps team/buff box-shadow) */
.champ-img--mvp {
  border-color: #ffe884 !important;
  animation: mvp-img-glow 1.6s ease-in-out infinite;
}
@keyframes mvp-img-glow {
  0%,
  100% {
    box-shadow: 0 0 8px 1px rgba(232, 192, 64, 0.75);
  }
  50% {
    box-shadow: 0 0 15px 4px rgba(232, 192, 64, 1);
  }
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
/* Buff carrier: bold outer ring in the buff's color, separated from the
   team border by a dark gap so it reads instantly on both team colors */
.champ-img--buff-blue {
  box-shadow:
    0 0 0 2px #0d0c08,
    0 0 0 4px #60a5fa,
    0 0 16px rgba(59, 130, 246, 1);
}
.champ-img--buff-red {
  box-shadow:
    0 0 0 2px #0d0c08,
    0 0 0 4px #f87171,
    0 0 16px rgba(239, 68, 68, 1);
}
/* both buffs: concentric blue + red double ring */
.champ-img--buff-blue.champ-img--buff-red {
  box-shadow:
    0 0 0 2px #0d0c08,
    0 0 0 4px #60a5fa,
    0 0 0 5.5px #0d0c08,
    0 0 0 7.5px #f87171,
    0 0 18px rgba(239, 68, 68, 0.9);
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
.champ-name--mvp {
  color: #ffe07a !important;
  font-weight: 700;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.9), 0 1px 2px #000;
}

/* ── Kill-spot markers ──
   A short burst — expanding ring + flash + slash icon — at the exact spot a
   kill landed, tinted by the killer's team. Multikills scale up via --mk-scale
   and get a count tag. Sits under the champion dots (z-index 3). */
.kill-mark {
  position: absolute;
  width: 0;
  height: 0;
  transform: translate(-50%, -50%) scale(var(--mk-scale, 1));
  pointer-events: none;
  z-index: 3;
}
.kill-mark--blue { --kc: 96, 165, 250; }
.kill-mark--red { --kc: 248, 113, 113; }

/* Soft danger zone: a wide tinted circle that holds, so the kill area reads as
   a place on the map — not just a fleeting icon. */
.kill-mark-aoe {
  position: absolute;
  left: 0;
  top: 0;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--kc), 0.32), rgba(var(--kc), 0.12) 55%, transparent 72%);
  box-shadow: inset 0 0 12px rgba(var(--kc), 0.35);
  animation: kill-aoe 2.6s ease-out forwards;
}
.kill-mark-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 2.5px solid rgba(var(--kc), 0.95);
  box-shadow: 0 0 14px rgba(var(--kc), 0.7);
  animation: kill-ring 2.4s ease-out forwards;
}
.kill-mark-flash {
  position: absolute;
  left: 0;
  top: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 240, 220, 0.95),
    rgba(var(--kc), 0.55) 45%,
    transparent 70%
  );
  animation: kill-flash 1.2s ease-out forwards;
}
.kill-mark-icon {
  position: absolute;
  left: 0;
  top: 0;
  color: #fff;
  filter: drop-shadow(0 0 5px rgba(var(--kc), 1)) drop-shadow(0 1px 1px #000);
  animation: kill-icon 2.4s ease-out forwards;
}
.kill-mark-tier {
  position: absolute;
  left: 0;
  top: 0;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.35;
  color: #1e1006;
  background: linear-gradient(to bottom, #ffe9a0, #e8c060 55%, #c89040);
  border: 1px solid #8a5c18;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.7), 0 1px 2px rgba(0, 0, 0, 0.6);
  animation: kill-tier 2.4s ease-out forwards;
}

@keyframes kill-aoe {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
  14% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  70% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(1.12); opacity: 0; }
}
@keyframes kill-ring {
  0% { transform: translate(-50%, -50%) scale(0.35); opacity: 0.95; }
  55% { opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.85); opacity: 0; }
}
@keyframes kill-flash {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
}
@keyframes kill-icon {
  0% { transform: translate(-50%, -50%) scale(1.7) rotate(-12deg); opacity: 0; }
  12% { transform: translate(-50%, -50%) scale(1) rotate(0); opacity: 1; }
  75% { transform: translate(-50%, -50%) scale(1) rotate(0); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.05); opacity: 0; }
}
@keyframes kill-tier {
  0% { transform: translate(9px, -20px) scale(0.6); opacity: 0; }
  16% { transform: translate(9px, -20px) scale(1); opacity: 1; }
  80% { transform: translate(9px, -20px) scale(1); opacity: 1; }
  100% { transform: translate(9px, -20px) scale(1); opacity: 0; }
}

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

/* ── Admin toggle: forced own-team MVP ── */
.ctrl-btn--mvp {
  border-color: #5c3310;
  color: #8a7238;
  transition: border-color 0.2s, color 0.2s, box-shadow 0.2s;
}
.ctrl-btn--mvp-on {
  border-color: #e8c040;
  color: #ffe28a;
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.45);
}
.mvp-switch {
  position: relative;
  width: 22px;
  height: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid #5c3310;
  transition: background 0.2s, border-color 0.2s;
  flex-shrink: 0;
}
.mvp-switch--on {
  background: rgba(232, 192, 64, 0.35);
  border-color: #e8c040;
}
.mvp-switch-knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8a7238;
  transition: transform 0.2s, background 0.2s;
}
.mvp-switch--on .mvp-switch-knob {
  transform: translateX(10px);
  background: #ffe28a;
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.9);
}
.ctrl-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
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
  .buff-camp--blue,
  .buff-camp--red,
  .buff-camp-burst,
  .buff-cd--soon,
  .champ-buff-orb::after,
  .lane-glow--pending,
  .lane-glow-core,
  .lane-push-label,
  .structure-breach,
  .champ-img--victor,
  .mvp-ring,
  .mvp-crown,
  .champ-img--mvp,
  .kill-mark-aoe,
  .kill-mark-ring,
  .kill-mark-flash,
  .kill-mark-icon,
  .kill-mark-tier {
    animation: none;
  }
}
</style>
