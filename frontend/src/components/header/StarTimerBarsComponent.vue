<template>
  <div class="star-timer-bars-host">
    <TransitionGroup name="bar-slide" tag="div" class="star-timer-bars">
      <div v-for="entry in sortedEntries" :key="entry.starId" class="timer-bar-row">
        <div class="bar-side bar-side--left">
          <div
            class="bar-fill"
            :style="{
              transform: `scaleX(${entry.fillRatio})`,
              '--c1': entry.palette.outer,
              '--c2': entry.palette.mid,
              '--c3': entry.palette.inner,
              '--glow': entry.palette.glow,
            }"
          />
        </div>

        <div
          class="bar-center"
          :style="{
            '--icon-color': entry.palette.mid,
            '--text-color': entry.palette.inner,
          }"
        >
          <span class="bar-icon">{{ entry.starType === 'champion' ? '♛' : '✦' }}</span>
          <span class="bar-value">{{ entry.valueStr }}</span>
        </div>

        <div class="bar-side bar-side--right">
          <div
            class="bar-fill bar-fill--mirrored"
            :style="{
              transform: `scaleX(${entry.fillRatio})`,
              '--c1': entry.palette.outer,
              '--c2': entry.palette.mid,
              '--c3': entry.palette.inner,
              '--glow': entry.palette.glow,
            }"
          />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStarGroupStore } from '../../stores/starGroupStore'
import { usePlanetBossStore } from '../../stores/planetBossStore'

const starGroupStore = useStarGroupStore()
const planetBossStore = usePlanetBossStore()
const now = ref(Date.now())

let ticker: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 200)
})
onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})

interface Palette {
  outer: string
  mid: string
  inner: string
  glow: string
}

interface BarEntry {
  starId: string
  starType: 'resource' | 'champion' | 'galaxy_boss'
  valueStr: string
  fillRatio: number
  sortKey: number
  palette: Palette
}

const palettes: Palette[] = [
  {
    outer: '#b86a22',
    mid: '#d9923b',
    inner: '#f0c98b',
    glow: 'rgba(217, 146, 59, 0.28)',
  },
  {
    outer: '#b55b1f',
    mid: '#d67f37',
    inner: '#ebb77d',
    glow: 'rgba(214, 127, 55, 0.27)',
  },
  {
    outer: '#ae4f1d',
    mid: '#cc7234',
    inner: '#e8a976',
    glow: 'rgba(204, 114, 52, 0.26)',
  },
  {
    outer: '#a6471b',
    mid: '#c86831',
    inner: '#e39b6d',
    glow: 'rgba(200, 104, 49, 0.25)',
  },
  {
    outer: '#9d4019',
    mid: '#bd5e2d',
    inner: '#dc8f67',
    glow: 'rgba(189, 94, 45, 0.24)',
  },
]

function fmtMs(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function getBossRemainingMs(planetId: string): number | null {
  const boss = planetBossStore.activeBosses.find((b) => b.planetId === planetId)
  if (!boss) return null
  return Math.max(0, boss.enrageTimerMs - (now.value - boss.startTime))
}

function getSharedStarRemainingMs(star: {
  starType: 'resource' | 'champion' | 'galaxy_boss'
  planetSlots: { planetId: string; cleared: boolean }[]
  spawnedAt?: number
  durationMs?: number
}): number {
  const activePlanetIds = star.planetSlots.filter((p) => !p.cleared).map((p) => p.planetId)

  const bossRemainings = activePlanetIds
    .map((planetId) => getBossRemainingMs(planetId))
    .filter((v): v is number => v !== null)

  if (bossRemainings.length > 0) {
    return Math.min(...bossRemainings)
  }

  if (star.spawnedAt !== undefined && star.durationMs !== undefined) {
    return Math.max(0, star.spawnedAt + star.durationMs - now.value)
  }

  return 0
}

const sortedEntries = computed<BarEntry[]>(() => {
  const raw: Omit<BarEntry, 'palette'>[] = []

  for (const star of starGroupStore.activeStars) {
    const total = star.planetSlots.length
    const cleared = star.planetSlots.filter((p) => p.cleared).length
    const allCleared = total > 0 && cleared >= total

    if (star.starType === 'resource') {
      const remaining = allCleared ? 0 : getSharedStarRemainingMs(star)
      const durationFromBoss =
        star.planetSlots
          .filter((p) => !p.cleared)
          .map(
            (p) =>
              planetBossStore.activeBosses.find((b) => b.planetId === p.planetId)?.enrageTimerMs,
          )
          .find((v): v is number => typeof v === 'number' && v > 0) ??
        star.durationMs ??
        0

      const fillRatio = durationFromBoss > 0 ? remaining / durationFromBoss : 0

      raw.push({
        starId: star.id,
        starType: 'resource',
        valueStr: fmtMs(remaining),
        fillRatio: clamp01(fillRatio),
        sortKey: remaining,
      })
    } else if (star.starType === 'champion') {
      const ratio = allCleared || total <= 0 ? 0 : 1 - cleared / total

      raw.push({
        starId: star.id,
        starType: 'champion',
        valueStr: `${cleared}/${total}`,
        fillRatio: clamp01(ratio),
        sortKey: Number.MAX_SAFE_INTEGER,
      })
    }
  }

  raw.sort((a, b) => a.sortKey - b.sortKey)

  return raw.map((entry, index) => ({
    ...entry,
    palette: palettes[index % palettes.length],
  }))
})
</script>

<style scoped>
.star-timer-bars-host {
  position: fixed;
  top: var(--header-total-height, 50px);
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 1400px;
  padding-inline: 1rem;
  z-index: 119;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.star-timer-bars {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.timer-bar-row {
  display: grid;
  grid-template-columns: 1fr clamp(200px, 20vw, 280px) 1fr;
  align-items: center;
  height: 18px;
}

.bar-side {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

.bar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 100%;
  background: linear-gradient(to right, var(--c1) 0%, var(--c2) 56%, var(--c3) 100%);
  box-shadow:
    0 0 6px var(--glow),
    0 0 14px var(--glow),
    inset 0 1px 0 rgba(255, 236, 190, 0.18),
    inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  transition: transform 0.2s linear;
  will-change: transform;
}

.bar-side--left .bar-fill {
  left: 0;
  transform-origin: right center;
  border-radius: 0 3px 3px 0;
}

.bar-fill--mirrored {
  right: 0;
  left: auto;
  transform-origin: left center !important;
  background: linear-gradient(to left, var(--c1) 0%, var(--c2) 56%, var(--c3) 100%) !important;
  border-radius: 3px 0 0 3px;
}

.bar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding-inline: 8px;
  background: transparent;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.bar-icon {
  color: var(--icon-color);
  filter: drop-shadow(0 0 4px var(--icon-color));
}

.bar-value {
  color: var(--text-color);
  filter: drop-shadow(0 0 3px var(--icon-color));
}

.bar-slide-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.bar-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.bar-slide-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.bar-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
