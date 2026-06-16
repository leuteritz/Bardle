<template>
  <div class="relative flex flex-col overflow-hidden group minimap-panel">
    <div
      class="absolute inset-0 pointer-events-none minimap-shimmer translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    />

    <div class="flex flex-col flex-1 min-h-0 p-3 space-y-2">
      <!-- Map Container -->
      <div class="flex items-center justify-center flex-1 min-h-0 overflow-hidden">
        <div class="relative h-full max-w-full overflow-hidden aspect-square minimap-field">
          <!-- Kill Announcement Banner -->
          <Transition name="announce-fade">
            <div
              v-if="announcement"
              class="absolute z-30 left-1/2 -translate-x-1/2 top-[12%] pointer-events-none announcement-banner"
              :class="announcement.team === 1 ? 'announcement-banner--blue' : 'announcement-banner--red'"
            >
              <img :src="announcement.icon" class="w-[14px] h-[14px] object-cover rounded-full flex-shrink-0" />
              <span class="announcement-text">{{ announcement.text }}</span>
            </div>
          </Transition>

          <!-- Time -->
          <div
            class="absolute z-20 top-1 left-1 px-1.5 py-0.5 text-xs font-black text-white minimap-overlay-badge"
          >
            {{ formatTime(battleStore.battleTime) }}
          </div>

          <!-- Score badge + scoreboard tooltip -->
          <div
            class="absolute z-20 top-1 right-1 score-trigger"
            @mouseenter="showScoreboard = true"
            @mouseleave="showScoreboard = false"
          >
            <div class="px-1.5 py-0.5 minimap-overlay-badge score-badge-hover">
              <span class="text-xs font-black score-blue">{{ score.team1Kills }}</span>
              <span class="text-xs score-sep"> vs </span>
              <span class="text-xs font-black score-red">{{ score.team2Kills }}</span>
            </div>

            <!-- Scoreboard tooltip (hover reveal) -->
            <div v-show="showScoreboard" class="score-tooltip">
              <div class="score-tooltip-team">
                <span class="score-tooltip-badge score-tooltip-badge--blue">BLUE</span>
                <div
                  v-for="(champ, i) in battleStore.team1.filter((c) => c.name)"
                  :key="'tt1-' + i"
                  class="score-tooltip-row"
                >
                  <span class="score-tooltip-name score-tooltip-name--blue">{{ champ.name }}</span>
                  <span class="score-tooltip-kda">
                    <span class="kda-k">{{ champ.kills }}</span>
                    <span class="kda-s">/</span>
                    <span class="kda-d">{{ champ.deaths }}</span>
                    <span class="kda-s">/</span>
                    <span class="kda-a">{{ champ.assists }}</span>
                  </span>
                </div>
              </div>
              <div class="score-tooltip-divider" />
              <div class="score-tooltip-team">
                <span class="score-tooltip-badge score-tooltip-badge--red">RED</span>
                <div
                  v-for="(champ, i) in battleStore.team2.filter((c) => c.name)"
                  :key="'tt2-' + i"
                  class="score-tooltip-row"
                >
                  <span class="score-tooltip-name score-tooltip-name--red">{{ champ.name }}</span>
                  <span class="score-tooltip-kda">
                    <span class="kda-k">{{ champ.kills }}</span>
                    <span class="kda-s">/</span>
                    <span class="kda-d">{{ champ.deaths }}</span>
                    <span class="kda-s">/</span>
                    <span class="kda-a">{{ champ.assists }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <img
            src="/img/minimap.png"
            class="absolute w-full h-full pointer-events-none select-none opacity-30"
          />

          <!-- Blue Champions -->
          <div
            v-for="(champ, i) in blueChampions"
            :key="'blue-' + i"
            class="absolute -translate-x-1/2 -translate-y-1/2 minimap-champ-wrapper"
            :class="isSnapping ? '' : 'transition-all duration-500'"
            :style="{ left: champ.x + '%', top: champ.y + '%', zIndex: 5 }"
          >
            <img
              v-if="battleStore.team1[i]?.name"
              :src="battleStore.getChampionImage(battleStore.team1[i].name)"
              :alt="battleStore.team1[i].name"
              class="minimap-champ-img rpg-img minimap-champ--blue"
              :class="{
                'opacity-30 grayscale': champ.dead,
                'minimap-champ--buffed': phase === 'nexusPush' && predeterminedWin === true,
              }"
            />
            <span v-if="battleStore.team1[i]?.name" class="minimap-champ-tooltip">{{ battleStore.team1[i].name }}</span>
          </div>

          <!-- Red Champions -->
          <div
            v-for="(champ, i) in redChampions"
            :key="'red-' + i"
            class="absolute -translate-x-1/2 -translate-y-1/2 minimap-champ-wrapper"
            :class="isSnapping ? '' : 'transition-all duration-500'"
            :style="{ left: champ.x + '%', top: champ.y + '%', zIndex: 5 }"
          >
            <img
              v-if="battleStore.team2[i]?.name"
              :src="battleStore.getChampionImage(battleStore.team2[i].name)"
              :alt="battleStore.team2[i].name"
              class="minimap-champ-img rpg-img minimap-champ--red"
              :class="{
                'opacity-30 grayscale': champ.dead,
                'minimap-champ--buffed': phase === 'nexusPush' && predeterminedWin === false,
              }"
            />
            <span v-if="battleStore.team2[i]?.name" class="minimap-champ-tooltip">{{ battleStore.team2[i].name }}</span>
          </div>

          <!-- Drake Dot -->
          <Transition name="obj-fade">
            <div
              v-if="drakeVisible"
              class="absolute -translate-x-1/2 -translate-y-1/2 minimap-champ-wrapper"
              :style="{ left: '66%', top: '69%', zIndex: 6 }"
            >
              <div class="drake-dot" :class="{ 'drake-fighting': drakeFighting }">
                <img
                  src="/img/dragon.png"
                  class="minimap-obj-img drake-icon"
                />
              </div>
              <span class="minimap-champ-tooltip">Dragon</span>
            </div>
          </Transition>

          <!-- Baron Dot -->
          <Transition name="obj-fade">
            <div
              v-if="baronVisible"
              class="absolute -translate-x-1/2 -translate-y-1/2 minimap-champ-wrapper"
              :style="{ left: '33%', top: '33%', zIndex: 6 }"
            >
              <div class="baron-dot" :class="{ 'baron-fighting': baronFighting }">
                <img
                  src="/img/baron.png"
                  class="minimap-obj-img baron-icon"
                />
              </div>
              <span class="minimap-champ-tooltip">Baron Nashor</span>
            </div>
          </Transition>

          <!-- Skip battle button — arcane portal style, bottom-left -->
          <button
            v-if="battleStore.battlePhase === 'playing'"
            class="skip-portal-btn"
            title="Skip to end"
            @click="battleStore.adminSkipToEnd()"
          >
            <div class="skip-portal-ring" />
            <Icon icon="game-icons:magic-portal" style="color: #c084fc; position: relative; z-index: 1;" width="22" height="22" />
            <span class="skip-portal-label">SKIP</span>
          </button>

          <!-- Chat toggle button — bottom-right -->
          <button
            class="chat-toggle-btn"
            :class="{ 'chat-toggle-btn--active': chatOpen }"
            title="Toggle chat"
            @click="$emit('toggle-chat')"
          >
            <Icon icon="game-icons:chat-bubble" style="color: #e8c040;" width="20" height="20" />
          </button>

          <div class="absolute inset-0 pointer-events-none minimap-inner-border" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
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
  components: { Icon },
  emits: ['toggle-chat'],
  props: {
    battleId: { type: [String, Number], default: 0 },
    score: { type: Object, default: () => ({ team1Kills: 0, team2Kills: 0 }) },
    chatOpen: { type: Boolean, default: false },
  },
  setup(props) {
    const showScoreboard = ref(false)
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
      if (announceTimer) clearTimeout(announceTimer)
    })

    // Kill announcement banner
    const announcement = ref<{ text: string; icon: string; team: 1 | 2 } | null>(null)
    let announceTimer: ReturnType<typeof setTimeout> | null = null

    function showAnnouncement(text: string, icon: string, team: 1 | 2) {
      if (announceTimer) clearTimeout(announceTimer)
      announcement.value = { text, icon, team }
      announceTimer = setTimeout(() => {
        announcement.value = null
      }, 5000)
    }

    watch(
      () => battleStore.drakeAlive,
      (alive) => {
        if (!alive && battleStore.drakeKilledByTeam) {
          const team = battleStore.drakeKilledByTeam
          const name = team === 1 ? 'Blue Team' : 'Red Team'
          showAnnouncement(`Dragon slain by ${name}`, '/img/dragon.png', team)
        }
      },
    )

    watch(
      () => battleStore.baronKilledByTeam,
      (team) => {
        if (team) {
          const name = team === 1 ? 'Blue Team' : 'Red Team'
          showAnnouncement(`Baron slain by ${name}`, '/img/baron.png', team)
        }
      },
    )

    const baronVisible = computed(() => {
      const t = battleStore.battleTime
      return t >= 1200 && t < 2200
    })

    const baronFighting = computed(() => {
      const t = battleStore.battleTime
      return t >= 1500 && t < 2200
    })

    const drakeVisible = computed(() => {
      return battleStore.battleTime >= 300 && battleStore.drakeAlive
    })

    const drakeFighting = computed(() => {
      const t = battleStore.battleTime
      return t >= 700 && t < 1200 && battleStore.drakeAlive
    })

    const predeterminedWin = computed(() => battleStore.predeterminedWin)

    return {
      blueChampions,
      redChampions,
      formatTime,
      battleStore,
      isSnapping,
      phase,
      baronVisible,
      baronFighting,
      drakeVisible,
      drakeFighting,
      predeterminedWin,
      announcement,
      showScoreboard,
    }
  },
})
</script>

<style scoped>
.minimap-shimmer {
  background: linear-gradient(to right, transparent, #5c331014, transparent);
}

.minimap-field {
  --champ-size: 44px;
  --obj-size: 50px;
  border: 2px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  background: transparent;
}

.minimap-overlay-badge {
  background: #000000b3;
  border: 1px solid var(--rpg-border-row);
  border-radius: var(--bp-radius);
}

.minimap-champ-img {
  width: var(--champ-size);
  height: var(--champ-size);
  border-radius: 50%;
  object-fit: cover;
  image-rendering: auto;
  transition: transform 0.15s ease;
}

.minimap-champ-wrapper:hover .minimap-champ-img {
  transform: scale(1.18);
}

.minimap-obj-img {
  width: var(--obj-size);
  height: var(--obj-size);
  border-radius: 50%;
  object-fit: cover;
  image-rendering: auto;
}

.minimap-champ-tooltip {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background: #16140e;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #e8c040;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
  z-index: 50;
}

.minimap-champ-wrapper:hover .minimap-champ-tooltip {
  opacity: 1;
}

.minimap-champ--blue {
  border: 2px solid #60a5fa;
  box-shadow: 0 0 10px #3b82f6cc, 0 0 20px #3b82f640;
}

.minimap-champ--red {
  border: 2px solid #f87171;
  box-shadow: 0 0 10px #ef4444aa, 0 0 20px #ef444430;
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

.drake-dot {
  position: relative;
}

.drake-icon {
  border: 2px solid #22c55e;
  box-shadow: 0 0 12px #22c55ecc, 0 0 24px #22c55e40;
}

.drake-dot.drake-fighting::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid #22c55e;
  animation: drake-pulse 1.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes drake-pulse {
  0%,
  100% {
    opacity: 0.9;
    transform: scale(1);
  }
  50% {
    opacity: 0.1;
    transform: scale(1.5);
  }
}

.baron-dot {
  position: relative;
}

.baron-icon {
  border: 2px solid #a855f7;
  box-shadow: 0 0 12px #a855f7cc, 0 0 24px #a855f740;
}

.baron-dot.baron-fighting::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid #a855f7;
  animation: baron-pulse 1.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes baron-pulse {
  0%,
  100% {
    opacity: 0.9;
    transform: scale(1);
  }
  50% {
    opacity: 0.1;
    transform: scale(1.5);
  }
}

.minimap-champ--buffed {
  border-color: #a855f7 !important;
  box-shadow: 0 0 10px #a855f7cc !important;
}

.announcement-banner {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: var(--bp-radius);
  background: rgba(17, 16, 8, 0.88);
  border: 1px solid #5c3310;
  white-space: nowrap;
}

.announcement-banner--blue {
  border-color: #3b82f6;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
}

.announcement-banner--red {
  border-color: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
}

.announcement-text {
  font-size: 9px;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.3px;
}

.announce-fade-enter-active {
  transition: opacity 0.3s ease;
}
.announce-fade-leave-active {
  transition: opacity 0.8s ease;
}
.announce-fade-enter-from,
.announce-fade-leave-to {
  opacity: 0;
}

/* ═══════════════════════════════════════════
   SCORE TRIGGER & SCOREBOARD TOOLTIP
   ═══════════════════════════════════════════ */
.score-trigger {
  cursor: pointer;
  position: absolute;
}

.score-badge-hover {
  transition: border-color 0.15s ease;
}
.score-trigger:hover .score-badge-hover {
  border-color: #e8c04066;
}

.score-tooltip {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 50;
  min-width: 180px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  padding: 8px;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.score-tooltip-team {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.score-tooltip-badge {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.5px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid;
  display: inline-block;
  margin-bottom: 3px;
}
.score-tooltip-badge--blue {
  background: #3b82f620;
  border-color: #3b82f650;
  color: #93c5fd;
}
.score-tooltip-badge--red {
  background: #ef444420;
  border-color: #ef444450;
  color: #fca5a5;
}

.score-tooltip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 1px 2px;
}

.score-tooltip-name {
  font-size: 10px;
  font-weight: 700;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.score-tooltip-name--blue { color: #bfdbfe; }
.score-tooltip-name--red  { color: #fecaca; }

.score-tooltip-kda {
  display: flex;
  align-items: center;
  gap: 1px;
  font-size: 10px;
  flex-shrink: 0;
}
.kda-k { color: #6ee7b7; font-weight: 700; }
.kda-d { color: #fca5a5; font-weight: 700; }
.kda-a { color: #93c5fd; font-weight: 700; }
.kda-s { color: #ffffff33; }

.score-tooltip-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #5c3310, transparent);
  margin: 6px 0;
}

/* ═══════════════════════════════════════════
   SKIP PORTAL BUTTON
   ═══════════════════════════════════════════ */
.skip-portal-btn {
  position: absolute;
  bottom: 3%;
  left: 3%;
  z-index: 30;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: rgba(16, 8, 24, 0.82);
  border: 2px solid #7a4e20;
  border-radius: 50%;
  cursor: pointer;
  padding: 6px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.2);
}
.skip-portal-btn:hover {
  border-color: #c084fc;
  box-shadow: 0 0 18px rgba(168, 85, 247, 0.55);
}

.skip-portal-ring {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1px solid rgba(168, 85, 247, 0.35);
  animation: portal-pulse 2.4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes portal-pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%       { opacity: 0.1; transform: scale(1.2); }
}

.skip-portal-label {
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #c084fc;
  line-height: 1;
}

/* ═══════════════════════════════════════════
   CHAT TOGGLE BUTTON
   ═══════════════════════════════════════════ */
.chat-toggle-btn {
  position: absolute;
  bottom: 3%;
  right: 3%;
  z-index: 30;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 16, 8, 0.82);
  border: 2px solid #7a4e20;
  border-radius: 4px;
  cursor: pointer;
  padding: 6px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.chat-toggle-btn:hover,
.chat-toggle-btn--active {
  border-color: #e8c040;
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.4);
}

/* ═══════════════════════════════════════════
   OBJECTIVE APPEAR / DISAPPEAR TRANSITION
   ═══════════════════════════════════════════ */
.obj-fade-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.obj-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.obj-fade-enter-from,
.obj-fade-leave-to {
  opacity: 0;
}

/* ═══════════════════════════════════════════
   REDUCED MOTION
   ═══════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .minimap-champ-img,
  .minimap-obj-img,
  .minimap-champ-tooltip { transition: none; }
  .minimap-champ-wrapper:hover .minimap-champ-img { transform: none; }
  .obj-fade-enter-active,
  .obj-fade-leave-active { transition: none; }
  .drake-dot.drake-fighting::after,
  .baron-dot.baron-fighting::after { animation: none; }
  .skip-portal-ring { animation: none; }
}
</style>
