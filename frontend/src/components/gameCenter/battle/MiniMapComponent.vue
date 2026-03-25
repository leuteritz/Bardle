<template>
  <div
    class="group relative overflow-hidden rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 flex flex-col"
  >
    <div
      class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    />

    <div class="flex flex-col flex-1 min-h-0 p-3 space-y-2">
      <!-- Map Container -->
      <div class="flex items-center justify-center flex-1 min-h-0 overflow-hidden">
        <div
          class="relative h-full max-w-full overflow-hidden border-2 rounded-xl border-white/10 bg-gradient-to-br from-green-200 to-green-400 aspect-square"
        >
          <!-- Time -->
          <div
            class="absolute z-20 top-1 left-1 px-1.5 py-0.5 text-xs font-black text-white rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm"
          >
            {{ formatTime(battleStore.battleTime) }}
          </div>

          <!-- Score -->
          <div
            class="absolute z-20 top-1 right-1 px-1.5 py-0.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm"
          >
            <span class="text-xs font-black text-blue-300">{{ score.team1Kills }}</span>
            <span class="text-xs text-white/40"> vs </span>
            <span class="text-xs font-black text-red-300">{{ score.team2Kills }}</span>
          </div>

          <img
            src="/img/minimap.png"
            class="absolute w-full h-full pointer-events-none select-none opacity-80"
          />

          <!-- Blue Champions -->
          <div
            v-for="(champ, i) in blueChampions"
            :key="'blue-' + i"
            class="absolute transition-all duration-500 -translate-x-1/2 -translate-y-1/2"
            :style="{ left: champ.x + '%', top: champ.y + '%', zIndex: 5 }"
          >
            <img
              v-if="battleStore.team1[i]"
              :src="battleStore.getChampionImage(battleStore.team1[i].name)"
              :alt="battleStore.team1[i].name"
              class="w-[26px] h-[26px] rounded-full object-cover border-2 border-blue-400"
              :class="{ 'opacity-30 grayscale': champ.dead }"
              :style="{ boxShadow: '0 0 6px rgba(59,130,246,0.8)' }"
            />
          </div>

          <!-- Red Champions -->
          <div
            v-for="(champ, i) in redChampions"
            :key="'red-' + i"
            class="absolute transition-all duration-500 -translate-x-1/2 -translate-y-1/2"
            :style="{ left: champ.x + '%', top: champ.y + '%', zIndex: 5 }"
          >
            <img
              v-if="battleStore.team2[i]"
              :src="battleStore.getChampionImage(battleStore.team2[i].name)"
              :alt="battleStore.team2[i].name"
              class="w-[26px] h-[26px] rounded-full object-cover border-2 border-red-400"
              :class="{ 'opacity-30 grayscale': champ.dead }"
              :style="{ boxShadow: '0 0 6px rgba(239,68,68,0.6)' }"
            />
          </div>

          <div class="absolute inset-0 border pointer-events-none rounded-xl border-white/20" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'
import {
  MINIMAP_PHASE_LANING_END,
  MINIMAP_PHASE_DRAKE_END,
  MINIMAP_PHASE_MIDFIGHT_END,
  MINIMAP_PHASE_BARON_END,
  BLUE_FOUNTAIN,
  RED_FOUNTAIN,
  BLUE_NEXUS,
  RED_NEXUS,
  DRAKE_POS,
  BARON_POS,
  MID_CENTER,
} from '../../../config/constants'

interface ChampPos {
  x: number
  y: number
  dead: boolean
}

type MapPhase = 'laning' | 'drake' | 'midFight' | 'baron' | 'nexusPush'

// Lane targets per role (index 0=Top, 1=Jungle, 2=Mid, 3=Bot ADC, 4=Bot Support)
const BLUE_LANE_TARGETS = [
  { cx: 16, cy: 28 }, // Top — Mitte Top-Lane
  { cx: 24, cy: 70 }, // Jungle — Blue Buff Position
  { cx: 44, cy: 56 }, // Mid — Mitte Mid-Lane, leicht blue-side
  { cx: 85, cy: 84 }, // Bot ADC — Mitte Bot-Lane
  { cx: 85, cy: 88 }, // Bot Support — knapp hinter ADC
]
const RED_LANE_TARGETS = [
  { cx: 20, cy: 24 }, // Top — Mitte Top-Lane
  { cx: 76, cy: 30 }, // Jungle — Red Blue Buff Position
  { cx: 56, cy: 44 }, // Mid — Mitte Mid-Lane, leicht red-side
  { cx: 85, cy: 78 }, // Bot ADC — Mitte Bot-Lane
  { cx: 85, cy: 74 }, // Bot Support — knapp hinter ADC
]

function getPhaseTarget(
  isBlue: boolean,
  roleIndex: number,
  phase: MapPhase,
  isBlueWinning: boolean,
): { cx: number; cy: number; spread: number; lerpFactor: number } {
  const idx = Math.min(roleIndex, 4)

  switch (phase) {
    case 'laning': {
      const t = isBlue ? BLUE_LANE_TARGETS[idx] : RED_LANE_TARGETS[idx]
      return { ...t, spread: 4, lerpFactor: 0.35 }
    }
    case 'drake': {
      // Both teams converge on drake — blue slightly south-west, red slightly north-east
      const offset = isBlue ? -3 : 3
      return { cx: DRAKE_POS.x + offset, cy: DRAKE_POS.y + offset, spread: 6, lerpFactor: 0.12 }
    }
    case 'midFight': {
      const offset = isBlue ? -3 : 3
      return {
        cx: MID_CENTER.x + offset,
        cy: MID_CENTER.y + offset,
        spread: 6,
        lerpFactor: 0.12,
      }
    }
    case 'baron': {
      const offset = isBlue ? -3 : 3
      return {
        cx: BARON_POS.x + offset,
        cy: BARON_POS.y + offset,
        spread: 6,
        lerpFactor: 0.12,
      }
    }
    case 'nexusPush': {
      const isWinning = isBlue === isBlueWinning
      if (isWinning) {
        const nexus = isBlue ? RED_NEXUS : BLUE_NEXUS
        return { cx: nexus.x, cy: nexus.y, spread: 5, lerpFactor: 0.15 }
      } else {
        const nexus = isBlue ? BLUE_NEXUS : RED_NEXUS
        return { cx: nexus.x, cy: nexus.y, spread: 3, lerpFactor: 0.08 }
      }
    }
  }
}

export default defineComponent({
  name: 'MiniMapComponent',
  props: {
    battleId: { type: [String, Number], default: 0 },
    score: { type: Object, default: () => ({ team1Kills: 0, team2Kills: 0 }) },
  },
  setup(props) {
    const battleStore = useBattleStore()
    let moveInterval: ReturnType<typeof setInterval> | null = null

    const blueChampions = ref<ChampPos[]>([])
    const redChampions = ref<ChampPos[]>([])

    const phase = computed((): MapPhase => {
      const t = battleStore.battleTime
      if (t < MINIMAP_PHASE_LANING_END) return 'laning'
      if (t < MINIMAP_PHASE_DRAKE_END) return 'drake'
      if (t < MINIMAP_PHASE_MIDFIGHT_END) return 'midFight'
      if (t < MINIMAP_PHASE_BARON_END) return 'baron'
      return 'nexusPush'
    })

    function formatTime(seconds: number) {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }

    function resetChampions() {
      const blueCount = battleStore.team1.length || 5
      const redCount = battleStore.team2.length || 5
      blueChampions.value = Array.from({ length: blueCount }, () => ({
        x: BLUE_FOUNTAIN.x,
        y: BLUE_FOUNTAIN.y,
        dead: false,
      }))
      redChampions.value = Array.from({ length: redCount }, () => ({
        x: RED_FOUNTAIN.x,
        y: RED_FOUNTAIN.y,
        dead: false,
      }))
    }

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t
    }

    function clamp(v: number, min: number, max: number) {
      return Math.max(min, Math.min(max, v))
    }

    function moveChampions() {
      const currentPhase = phase.value
      const isBlueWinning = battleStore.predeterminedWin === true

      blueChampions.value.forEach((champ, i) => {
        if (champ.dead) return
        const target = getPhaseTarget(true, i, currentPhase, isBlueWinning)
        const tx = target.cx + (Math.random() - 0.5) * target.spread * 2
        const ty = target.cy + (Math.random() - 0.5) * target.spread * 2
        champ.x = clamp(lerp(champ.x, tx, target.lerpFactor), 2, 98)
        champ.y = clamp(lerp(champ.y, ty, target.lerpFactor), 2, 98)
      })

      redChampions.value.forEach((champ, i) => {
        if (champ.dead) return
        const target = getPhaseTarget(false, i, currentPhase, isBlueWinning)
        const tx = target.cx + (Math.random() - 0.5) * target.spread * 2
        const ty = target.cy + (Math.random() - 0.5) * target.spread * 2
        champ.x = clamp(lerp(champ.x, tx, target.lerpFactor), 2, 98)
        champ.y = clamp(lerp(champ.y, ty, target.lerpFactor), 2, 98)
      })

      // During nexus push, progressively mark losing team as dead in last stretch
      if (currentPhase === 'nexusPush' && battleStore.battleTime >= 2520) {
        const losingTeam = isBlueWinning ? redChampions : blueChampions
        const alive = losingTeam.value.filter((c) => !c.dead)
        if (alive.length > 0 && Math.random() < 0.4) {
          alive[Math.floor(Math.random() * alive.length)].dead = true
        }
      }
    }

    function startMovement() {
      if (moveInterval) clearInterval(moveInterval)
      moveInterval = setInterval(moveChampions, 500)
    }

    // Kill event reaction
    let lastScore = { team1Kills: 0, team2Kills: 0 }
    watch(
      () => props.score,
      (newScore) => {
        if (
          newScore.team1Kills > lastScore.team1Kills ||
          newScore.team2Kills > lastScore.team2Kills
        ) {
          if (blueChampions.value.length > 0) {
            const b = blueChampions.value[0]
            if (!b.dead) {
              b.x = lerp(b.x, 48, 0.4)
              b.y = lerp(b.y, 52, 0.4)
            }
          }
          if (redChampions.value.length > 0) {
            const r = redChampions.value[0]
            if (!r.dead) {
              r.x = lerp(r.x, 52, 0.4)
              r.y = lerp(r.y, 48, 0.4)
            }
          }
        }
        lastScore = { team1Kills: newScore.team1Kills ?? 0, team2Kills: newScore.team2Kills ?? 0 }
      },
      { deep: true },
    )

    watch(
      () => battleStore.battlePhase,
      (newPhase) => {
        if (newPhase === 'playing') {
          resetChampions()
          startMovement()
        }
      },
    )

    watch(
      () => props.battleId,
      () => {
        resetChampions()
        startMovement()
      },
    )

    onMounted(() => {
      resetChampions()
      startMovement()
    })

    onUnmounted(() => {
      if (moveInterval) clearInterval(moveInterval)
    })

    return { blueChampions, redChampions, formatTime, battleStore }
  },
})
</script>
