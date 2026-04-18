<template>
  <TransitionGroup name="bar-slide" tag="div" class="star-timer-bars">
    <div
      v-for="entry in sortedEntries"
      :key="entry.starId"
      class="timer-bar-row"
      :class="`timer-bar-row--${entry.starType}`"
    >
      <div class="bar-label">
        <span class="bar-icon">{{ entry.starType === 'champion' ? '♛' : '✦' }}</span>
        <span class="bar-name">{{ entry.label }}</span>
        <span class="bar-value">{{ entry.valueStr }}</span>
      </div>
      <div class="bar-track">
        <div
          class="bar-fill"
          :class="`bar-fill--${entry.starType}`"
          :style="{ transform: `scaleX(${entry.ratio})` }"
        />
      </div>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStarGroupStore } from '../../stores/starGroupStore'

const starGroupStore = useStarGroupStore()
const now = ref(Date.now())

let ticker: ReturnType<typeof setInterval> | null = null
onMounted(() => { ticker = setInterval(() => { now.value = Date.now() }, 500) })
onUnmounted(() => { if (ticker) clearInterval(ticker) })

interface BarEntry {
  starId: string
  starType: 'resource' | 'champion' | 'galaxy_boss'
  label: string
  valueStr: string
  ratio: number
  sortKey: number
}

function fmtMs(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
}

const sortedEntries = computed<BarEntry[]>(() => {
  const entries: BarEntry[] = []

  for (const star of starGroupStore.activeStars) {
    if (star.starType === 'resource') {
      const remaining =
        star.spawnedAt !== undefined && star.durationMs !== undefined
          ? Math.max(0, star.spawnedAt + star.durationMs - now.value)
          : 0
      const ratio =
        star.durationMs && star.durationMs > 0 ? remaining / star.durationMs : 0
      entries.push({
        starId: star.id,
        starType: 'resource',
        label: 'Ressource',
        valueStr: fmtMs(remaining),
        ratio,
        sortKey: remaining,
      })
    } else if (star.starType === 'champion') {
      const total = star.planetSlots.length
      const cleared = star.planetSlots.filter((p) => p.cleared).length
      const ratio = total > 0 ? cleared / total : 0
      entries.push({
        starId: star.id,
        starType: 'champion',
        label: 'Champion',
        valueStr: `${cleared}/${total}`,
        ratio,
        sortKey: Number.MAX_SAFE_INTEGER,
      })
    }
  }

  // Resource-Sterne nach kürzester Restzeit oben, Champion danach
  entries.sort((a, b) => a.sortKey - b.sortKey)
  return entries
})
</script>

<style scoped>
.star-timer-bars {
  position: fixed;
  top: var(--header-total-height, 60px);
  left: 0;
  right: 0;
  z-index: 119;
  pointer-events: none;
  display: flex;
  flex-direction: column;
}

.timer-bar-row {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 3px 0 2px;
  border-bottom: 1px solid #3e200a;
  background: rgba(17, 10, 4, 0.92);
}

.bar-label {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px 2px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  line-height: 1;
}

.timer-bar-row--resource .bar-icon,
.timer-bar-row--resource .bar-name {
  color: #60b8ff;
  text-shadow: 0 0 6px rgba(60, 140, 255, 0.6);
}
.timer-bar-row--resource .bar-value {
  color: #a8d4ff;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  min-width: 28px;
  text-align: right;
}

.timer-bar-row--champion .bar-icon,
.timer-bar-row--champion .bar-name {
  color: #e8c040;
  text-shadow: 0 0 6px rgba(232, 192, 40, 0.55);
}
.timer-bar-row--champion .bar-value {
  color: #f0d060;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  min-width: 28px;
  text-align: right;
}

.bar-track {
  height: 3px;
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  width: 100%;
  transform-origin: center;
  transition: transform 0.5s linear;
}

.bar-fill--resource {
  background: linear-gradient(to right, #1040a8, #2060c8 40%, #60b8ff 50%, #2060c8 60%, #1040a8);
}

.bar-fill--champion {
  background: linear-gradient(to right, #5c3310, #c89040 40%, #e8c060 50%, #c89040 60%, #5c3310);
}

/* Transition animations */
.bar-slide-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.bar-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
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
