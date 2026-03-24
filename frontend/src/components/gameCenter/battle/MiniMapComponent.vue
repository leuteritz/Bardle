<template>
  <div
    class="group relative overflow-hidden rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
  >
    <div
      class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    />

    <div class="p-3 space-y-2">
      <!-- Header -->
      <div class="flex items-center gap-2">
        <div
          class="flex items-center justify-center w-6 h-6 border rounded-lg bg-gradient-to-br from-white/10 to-white/5 border-white/15"
        >
          <span class="text-xs">🗺️</span>
        </div>
        <span
          class="text-xs font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
        >
          Battle Map
        </span>
        <div class="flex items-center gap-1 ml-auto">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span class="text-xs text-emerald-300 font-bold">Live</span>
        </div>
      </div>

      <!-- Map -->
      <div
        class="relative w-full max-w-[192px] mx-auto overflow-hidden border-2 rounded-xl border-white/10 bg-gradient-to-br from-green-200 to-green-400 aspect-square"
      >
        <!-- Time -->
        <div
          class="absolute z-10 top-1 left-1 px-1.5 py-0.5 text-xs font-black text-white rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm"
        >
          {{ formatTime(battleStore.battleTime) }}
        </div>
        <!-- Score -->
        <div
          class="absolute z-10 top-1 right-1 px-1.5 py-0.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm"
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
          class="absolute transition-all duration-500"
          :style="{
            left: champ.x + '%',
            top: champ.y + '%',
            zIndex: i === 0 ? 2 : 1,
          }"
        >
          <div
            class="border rounded-full shadow-lg"
            :class="
              i === 0
                ? 'w-3 h-3 bg-blue-400 border-blue-600'
                : 'w-3 h-3 bg-blue-500 border-blue-700'
            "
            :style="{ boxShadow: '0 0 6px rgba(59,130,246,0.8)' }"
          />
        </div>

        <!-- Red Champions -->
        <div
          v-for="(champ, i) in redChampions"
          :key="'red-' + i"
          class="absolute transition-all duration-500"
          :style="{ left: champ.x + '%', top: champ.y + '%', zIndex: 1 }"
        >
          <div
            class="w-3 h-3 bg-red-500 border border-red-700 rounded-full"
            style="box-shadow: 0 0 6px rgba(239, 68, 68, 0.6)"
          />
        </div>

        <div class="absolute inset-0 border pointer-events-none rounded-xl border-white/20" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'

interface ChampPos {
  x: number
  y: number
}

// LoL-Rollen: index 0=Top, 1=Jungle, 2=Mid, 3=ADC, 4=Support
// Zielzone basierend auf Rolle und Phase – gibt Mittelpunkt und Streuradius zurück
function getRoleTarget(
  isBlue: boolean,
  roleIndex: number,
  phase: 'early' | 'mid' | 'late',
): { cx: number; cy: number; spread: number } {
  // Blue base: unten-links, Red base: oben-rechts (LoL-Standard)
  const blueTargets: Record<'early' | 'mid' | 'late', { cx: number; cy: number; spread: number }[]> = {
    early: [
      { cx: 12, cy: 22, spread: 5 },  // Top – oben-links Lane
      { cx: 25, cy: 48, spread: 8 },  // Jungle – obere Junglemitte
      { cx: 30, cy: 62, spread: 5 },  // Mid – Mid-Lane
      { cx: 68, cy: 80, spread: 5 },  // ADC – Bot-Lane
      { cx: 60, cy: 84, spread: 5 },  // Support – Bot-Lane
    ],
    mid: [
      { cx: 30, cy: 38, spread: 8 },  // Top – roamt zu Objectives
      { cx: 48, cy: 68, spread: 10 }, // Jungle – Drake-Bereich (~50,70)
      { cx: 44, cy: 52, spread: 8 },  // Mid – Midlane-Kontroverse
      { cx: 54, cy: 72, spread: 8 },  // ADC – roamt Drake
      { cx: 46, cy: 65, spread: 8 },  // Support – roamt Drake
    ],
    late: [
      { cx: 46, cy: 46, spread: 10 }, // Top – Teamfight Mitte
      { cx: 48, cy: 52, spread: 10 }, // Jungle – Teamfight Mitte
      { cx: 50, cy: 50, spread: 8 },  // Mid – Teamfight Mitte
      { cx: 44, cy: 54, spread: 10 }, // ADC – Teamfight Mitte
      { cx: 42, cy: 56, spread: 8 },  // Support – Teamfight Mitte
    ],
  }
  const redTargets: Record<'early' | 'mid' | 'late', { cx: number; cy: number; spread: number }[]> = {
    early: [
      { cx: 88, cy: 78, spread: 5 },  // Top – unten-rechts Lane
      { cx: 72, cy: 52, spread: 8 },  // Jungle – untere Junglemitte
      { cx: 68, cy: 36, spread: 5 },  // Mid – Mid-Lane
      { cx: 32, cy: 18, spread: 5 },  // ADC – Top-Lane (Bot für Rot)
      { cx: 40, cy: 14, spread: 5 },  // Support – Top-Lane
    ],
    mid: [
      { cx: 68, cy: 60, spread: 8 },  // Top – roamt zu Objectives
      { cx: 50, cy: 30, spread: 10 }, // Jungle – Baron-Bereich (~45,28)
      { cx: 54, cy: 46, spread: 8 },  // Mid – Midlane-Kontrolle
      { cx: 44, cy: 28, spread: 8 },  // ADC – roamt Baron
      { cx: 52, cy: 33, spread: 8 },  // Support – roamt Baron
    ],
    late: [
      { cx: 54, cy: 54, spread: 10 }, // Top – Teamfight Mitte
      { cx: 52, cy: 48, spread: 10 }, // Jungle – Teamfight Mitte
      { cx: 50, cy: 50, spread: 8 },  // Mid – Teamfight Mitte
      { cx: 56, cy: 46, spread: 10 }, // ADC – Teamfight Mitte
      { cx: 58, cy: 44, spread: 8 },  // Support – Teamfight Mitte
    ],
  }
  const idx = Math.min(roleIndex, 4)
  return isBlue ? blueTargets[phase][idx] : redTargets[phase][idx]
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

    // Phase basierend auf Game-Zeit (0-1800s = 0-30 Spielminuten)
    const phase = computed((): 'early' | 'mid' | 'late' => {
      const t = battleStore.battleTime
      if (t < 600) return 'early'
      if (t < 1200) return 'mid'
      return 'late'
    })

    function formatTime(seconds: number) {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }

    function resetChampions() {
      // Startpositionen in % – rollenbasiert (0=Top, 1=Jungle, 2=Mid, 3=ADC, 4=Support)
      // Blau: base unten-links; Rot: base oben-rechts
      blueChampions.value = [
        { x: 12, y: 22 },  // Top
        { x: 25, y: 48 },  // Jungle
        { x: 30, y: 62 },  // Mid
        { x: 68, y: 80 },  // ADC
        { x: 60, y: 84 },  // Support
      ]
      redChampions.value = [
        { x: 88, y: 78 },  // Top
        { x: 72, y: 52 },  // Jungle
        { x: 68, y: 36 },  // Mid
        { x: 32, y: 18 },  // ADC
        { x: 40, y: 14 },  // Support
      ]
    }

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t
    }

    function clamp(v: number, min: number, max: number) {
      return Math.max(min, Math.min(max, v))
    }

    function moveChampions() {
      const currentPhase = phase.value

      blueChampions.value.forEach((champ, i) => {
        const target = getRoleTarget(true, i, currentPhase)
        const tx = target.cx + (Math.random() - 0.5) * target.spread * 2
        const ty = target.cy + (Math.random() - 0.5) * target.spread * 2
        champ.x = clamp(lerp(champ.x, tx, 0.2) + (Math.random() - 0.5) * 2, 2, 95)
        champ.y = clamp(lerp(champ.y, ty, 0.2) + (Math.random() - 0.5) * 2, 2, 95)
      })

      redChampions.value.forEach((champ, i) => {
        const target = getRoleTarget(false, i, currentPhase)
        const tx = target.cx + (Math.random() - 0.5) * target.spread * 2
        const ty = target.cy + (Math.random() - 0.5) * target.spread * 2
        champ.x = clamp(lerp(champ.x, tx, 0.2) + (Math.random() - 0.5) * 2, 2, 95)
        champ.y = clamp(lerp(champ.y, ty, 0.2) + (Math.random() - 0.5) * 2, 2, 95)
      })
    }

    function startMovement() {
      if (moveInterval) clearInterval(moveInterval)
      moveInterval = setInterval(moveChampions, 500)
    }

    // Bei Kill-Event: einen Dot jedes Teams kurz zur Mitte ziehen (Teamfight-Signal)
    let lastScore = { team1Kills: 0, team2Kills: 0 }
    watch(
      () => props.score,
      (newScore) => {
        if (
          newScore.team1Kills > lastScore.team1Kills ||
          newScore.team2Kills > lastScore.team2Kills
        ) {
          // Ersten Dot jedes Teams kurz Richtung Mitte (50,50) ziehen
          if (blueChampions.value.length > 0) {
            const b = blueChampions.value[0]
            b.x = lerp(b.x, 48, 0.4)
            b.y = lerp(b.y, 52, 0.4)
          }
          if (redChampions.value.length > 0) {
            const r = redChampions.value[0]
            r.x = lerp(r.x, 52, 0.4)
            r.y = lerp(r.y, 48, 0.4)
          }
        }
        lastScore = { team1Kills: newScore.team1Kills ?? 0, team2Kills: newScore.team2Kills ?? 0 }
      },
      { deep: true },
    )

    // Reset wenn neue Battle startet (battlePhase wechselt zu 'playing')
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
