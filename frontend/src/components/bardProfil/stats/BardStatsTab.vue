<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { useShopStore } from '@/stores/shopStore'

const SESSION_START = Date.now()

const gameStore = useGameStore()
const shopStore = useShopStore()

const { totalChimesEarned, chimesPerSecond, totalClicks, level, currentUniverse } =
  storeToRefs(gameStore)

const animated = ref(false)
const sessionSeconds = ref(Math.floor((Date.now() - SESSION_START) / 1000))
let sessionTimer: ReturnType<typeof setInterval>

onMounted(() => {
  sessionTimer = setInterval(() => {
    sessionSeconds.value = Math.floor((Date.now() - SESSION_START) / 1000)
  }, 1000)
  nextTick(() => {
    animated.value = true
  })
})

onUnmounted(() => clearInterval(sessionTimer))

const sessionTime = computed(() => {
  const s = sessionSeconds.value
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
})

const totalRawCPS = computed(() =>
  shopStore.shopUpgrades
    .filter((u) => (u.baseCPS ?? 0) > 0 && u.level > 0)
    .reduce((sum, u) => sum + (u.baseCPS ?? 0) * u.level, 0),
)

interface BuildingRow {
  id: string
  name: string
  icon: string
  level: number
  percent: number
  value: number
  isCPS: boolean
}

const buildingRows = computed((): BuildingRow[] => {
  return shopStore.shopUpgrades.map((u) => {
    const hasCPS = (u.baseCPS ?? 0) > 0
    const rawCPS = hasCPS ? (u.baseCPS ?? 0) * u.level : 0
    const percent =
      totalRawCPS.value > 0 && hasCPS ? (rawCPS / totalRawCPS.value) * 100 : 0
    const value = hasCPS
      ? totalRawCPS.value > 0
        ? Math.floor((rawCPS / totalRawCPS.value) * chimesPerSecond.value)
        : 0
      : (u.baseCPC ?? 0) * u.level

    return { id: u.id, name: u.name, icon: u.icon, level: u.level, percent, value, isCPS: hasCPS }
  })
})

const maxPercent = computed(() => {
  const percents = buildingRows.value.filter((r) => r.isCPS).map((r) => r.percent)
  return percents.length > 0 ? Math.max(...percents) : 100
})
</script>

<template>
  <div class="flex h-full">
    <!-- Left: Bard Image -->
    <div class="bard-col flex items-center justify-center flex-shrink-0">
      <img src="/img/BardAbilities/Bard.png" alt="Bard" class="bard-img object-contain" />
    </div>

    <!-- Right: Stats -->
    <div class="flex-1 flex flex-col gap-3 p-4 overflow-y-auto stats-scroll min-w-0">
      <!-- Global Stats -->
      <div class="stat-panel">
        <div class="panel-title">STATISTIKEN</div>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-lbl">Gesamt-Chimes</div>
            <div class="stat-val">{{ $formatNumber(totalChimesEarned) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Chimes / Sek.</div>
            <div class="stat-val">{{ $formatNumber(chimesPerSecond) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Klicks</div>
            <div class="stat-val">{{ $formatNumber(totalClicks) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Level</div>
            <div class="stat-val">{{ level }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Universum</div>
            <div class="stat-val">{{ currentUniverse }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Session</div>
            <div class="stat-val session-time">{{ sessionTime }}</div>
          </div>
        </div>
      </div>

      <!-- Building Breakdown -->
      <div class="stat-panel">
        <div class="panel-title">GEBÄUDE</div>
        <div class="buildings">
          <div
            v-for="b in buildingRows"
            :key="b.id"
            class="building-row"
            :class="{ 'building-row--locked': b.level === 0 }"
          >
            <img :src="b.icon" :alt="b.name" class="building-icon" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="building-name truncate">{{ b.name }}</span>
                <span class="building-count flex-shrink-0">×{{ b.level }}</span>
                <span class="building-value ml-auto flex-shrink-0">
                  {{ b.isCPS ? `${$formatNumber(b.value)} /s` : `+${b.value} /Klick` }}
                </span>
              </div>
              <div v-if="b.isCPS" class="progress-track">
                <div
                  class="progress-fill"
                  :style="{
                    width:
                      animated && maxPercent > 0
                        ? `${(b.percent / maxPercent) * 100}%`
                        : '0%',
                  }"
                />
              </div>
              <div v-else class="cpc-label">Click Power</div>
            </div>
            <div v-if="b.isCPS && b.level > 0" class="pct-badge">
              {{ Math.round(b.percent) }}%
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bard-col {
  width: 35%;
  background: #0e0c05;
  border-right: 2px solid #2a1a08;
}

.bard-img {
  max-height: 85%;
  max-width: 90%;
  filter: drop-shadow(0 0 24px rgba(200, 150, 30, 0.35));
}

.stats-scroll {
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.stat-panel {
  background: #111008;
  border: 2px solid #7a4e20;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.panel-title {
  padding: 8px 14px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15em;
  color: #c89040;
  background: #1a1006;
  border-bottom: 2px solid #3a2008;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: #2a1a08;
}

.stat-card {
  background: #111008;
  padding: 14px 12px;
  text-align: center;
}

.stat-lbl {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 150, 60, 0.55);
  margin-bottom: 5px;
}

.stat-val {
  font-size: 20px;
  font-weight: 900;
  color: #e8c040;
  line-height: 1;
}

.session-time {
  font-size: 15px;
}

.buildings {
  display: flex;
  flex-direction: column;
}

.building-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #1a1006;
  transition: background 0.12s;
}

.building-row:last-child {
  border-bottom: none;
}

.building-row:hover {
  background: #161008;
}

.building-row--locked {
  opacity: 0.35;
}

.building-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  flex-shrink: 0;
}

.building-name {
  font-size: 12px;
  font-weight: 700;
  color: #c8a050;
}

.building-count {
  font-size: 11px;
  color: #7a6030;
}

.building-value {
  font-size: 12px;
  font-weight: 700;
  color: #e8c040;
}

.progress-track {
  height: 5px;
  background: #1c1c18;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(to right, #2e7a1a, #52b830);
  border-radius: 3px;
  transition: width 0.8s ease;
}

.pct-badge {
  font-size: 10px;
  font-weight: 700;
  color: rgba(200, 160, 60, 0.7);
  min-width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.cpc-label {
  font-size: 9px;
  color: rgba(255, 200, 80, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
</style>
