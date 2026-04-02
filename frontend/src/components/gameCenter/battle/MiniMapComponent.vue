<template>
  <div class="relative flex flex-col overflow-hidden group minimap-panel">
    <div
      class="absolute inset-0 pointer-events-none minimap-shimmer translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    />

    <div class="flex flex-col flex-1 min-h-0 p-3 space-y-2">
      <!-- Map Container -->
      <div class="flex items-center justify-center flex-1 min-h-0 overflow-hidden">
        <div class="relative h-full max-w-full overflow-hidden aspect-square minimap-field">
          <!-- Time -->
          <div
            class="absolute z-20 top-1 left-1 px-1.5 py-0.5 text-xs font-black text-white minimap-overlay-badge"
          >
            {{ formatTime(battleStore.battleTime) }}
          </div>

          <!-- Score -->
          <div class="absolute z-20 top-1 right-1 px-1.5 py-0.5 minimap-overlay-badge">
            <span class="text-xs font-black score-blue">{{ score.team1Kills }}</span>
            <span class="text-xs score-sep"> vs </span>
            <span class="text-xs font-black score-red">{{ score.team2Kills }}</span>
          </div>

          <img
            src="/img/minimap.png"
            class="absolute w-full h-full pointer-events-none select-none opacity-80"
          />

          <!-- Blue Champions -->
          <div
            v-for="(champ, i) in blueChampions"
            :key="'blue-' + i"
            class="absolute -translate-x-1/2 -translate-y-1/2"
            :class="isSnapping ? '' : 'transition-all duration-500'"
            :style="{ left: champ.x + '%', top: champ.y + '%', zIndex: 5 }"
          >
            <img
              v-if="battleStore.team1[i]"
              :src="battleStore.getChampionImage(battleStore.team1[i].name)"
              :alt="battleStore.team1[i].name"
              class="w-[26px] h-[26px] rounded-full object-cover rpg-img minimap-champ--blue"
              :class="{ 'opacity-30 grayscale': champ.dead }"
            />
          </div>

          <!-- Red Champions -->
          <div
            v-for="(champ, i) in redChampions"
            :key="'red-' + i"
            class="absolute -translate-x-1/2 -translate-y-1/2"
            :class="isSnapping ? '' : 'transition-all duration-500'"
            :style="{ left: champ.x + '%', top: champ.y + '%', zIndex: 5 }"
          >
            <img
              v-if="battleStore.team2[i]"
              :src="battleStore.getChampionImage(battleStore.team2[i].name)"
              :alt="battleStore.team2[i].name"
              class="w-[26px] h-[26px] rounded-full object-cover rpg-img minimap-champ--red"
              :class="{ 'opacity-30 grayscale': champ.dead }"
            />
          </div>

          <div class="absolute inset-0 pointer-events-none minimap-inner-border" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
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

const BLUE_LANE_TARGETS = [
  { cx: 16, cy: 28 },
  { cx: 24, cy: 70 },
  { cx: 44, cy: 56 },
  { cx: 85, cy: 84 },
  { cx: 85, cy: 88 },
]
const RED_LANE_TARGETS = [
  { cx: 20, cy: 24 },
  { cx: 76, cy: 30 },
  { cx: 56, cy: 44 },
  { cx: 85, cy: 78 },
  { cx: 85, cy: 74 },
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
      const offset = isBlue ? -3 : 3
      return { cx: DRAKE_POS.x + offset, cy: DRAKE_POS.y + offset, spread: 6, lerpFactor: 0.12 }
    }
    case 'midFight': {
      const offset = isBlue ? -3 : 3
      return { cx: MID_CENTER.x + offset, cy: MID_CENTER.y + offset, spread: 6, lerpFactor: 0.12 }
    }
    case 'baron': {
      const offset = isBlue ? -3 : 3
      return { cx: BARON_POS.x + offset, cy: BARON_POS.y + offset, spread: 6, lerpFactor: 0.12 }
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

    // Wenn true: CSS transition-all deaktiviert → kein sichtbares Teleportieren beim Snap
    const isSnapping = ref(false)

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

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t
    }

    function clamp(v: number, min: number, max: number) {
      return Math.max(min, Math.min(max, v))
    }

    // ── NEU: Setzt alle Dots sofort auf die korrekte Phase-Position (kein Lerp) ──
    async function snapChampionsToPhase() {
      isSnapping.value = true // CSS-Transition deaktivieren

      const currentPhase = phase.value
      const isBlueWinning = battleStore.predeterminedWin === true

      blueChampions.value.forEach((champ, i) => {
        if (champ.dead) return
        const target = getPhaseTarget(true, i, currentPhase, isBlueWinning)
        champ.x = clamp(target.cx + (Math.random() - 0.5) * target.spread * 2, 2, 98)
        champ.y = clamp(target.cy + (Math.random() - 0.5) * target.spread * 2, 2, 98)
      })

      redChampions.value.forEach((champ, i) => {
        if (champ.dead) return
        const target = getPhaseTarget(false, i, currentPhase, isBlueWinning)
        champ.x = clamp(target.cx + (Math.random() - 0.5) * target.spread * 2, 2, 98)
        champ.y = clamp(target.cy + (Math.random() - 0.5) * target.spread * 2, 2, 98)
      })

      // Nach dem nächsten DOM-Frame Transition wieder einschalten
      await nextTick()
      isSnapping.value = false
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

      // ── NEU: Wenn die Battle schon läuft, sofort zur richtigen Position springen ──
      if (battleStore.battleTime > 0) {
        snapChampionsToPhase()
      }
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

    // ── NEU: Tab-Wechsel abfangen ──
    function handleVisibilityChange() {
      if (!document.hidden) {
        // Tab ist wieder aktiv → Dots sofort an die korrekte Position springen
        snapChampionsToPhase()
      }
    }

    // Kill event reaction (unverändert)
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
      // ── NEU: Listener registrieren ──
      document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onUnmounted(() => {
      if (moveInterval) clearInterval(moveInterval)
      // ── NEU: Listener aufräumen ──
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })

    return { blueChampions, redChampions, formatTime, battleStore, isSnapping }
  },
})
</script>

<style scoped>
.minimap-panel {
  background: var(--rpg-bg-deep);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
}

.minimap-shimmer {
  background: linear-gradient(to right, transparent, #5c331014, transparent);
}

.minimap-field {
  border: 2px solid var(--rpg-wood-mid);
  border-radius: 4px;
  background: linear-gradient(to bottom right, #a8d8a0, #6ab860);
}

.minimap-overlay-badge {
  background: #000000b3;
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
}

.minimap-inner-border {
  border: 1px solid #5c33104d;
  border-radius: 4px;
}

.minimap-champ--blue {
  border: 2px solid #60a5fa;
  box-shadow: 0 0 6px #3b82f6cc;
}

.minimap-champ--red {
  border: 2px solid #f87171;
  box-shadow: 0 0 6px #ef444499;
}

.score-blue {
  color: #93c5fd;
}
.score-red {
  color: #fca5a5;
}
.score-sep {
  color: #ffffff66;
}
</style>
