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
    const percent = totalRawCPS.value > 0 && hasCPS ? (rawCPS / totalRawCPS.value) * 100 : 0
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
  <div class="sv-root rpg-scrollbar">
    <!-- ══ LINKE SPALTE: Bard ══ -->
    <div class="sv-portrait-col">
      <img
        src="/img/BardAbilities/Bard.png"
        alt="Bard – The Wandering Caretaker"
        class="sv-bard-img"
      />
      <div class="sv-nameplate">
        <span class="sv-name">BARD</span>
        <span class="sv-subtitle">The Wandering Caretaker</span>
      </div>
    </div>

    <!-- ══ RECHTE SPALTE ══ -->
    <div class="sv-content-col rpg-scrollbar">
      <!-- ─ STATISTIKEN ─ -->
      <div class="sv-block">
        <div class="sv-block-label">Statistiken</div>
        <div class="sv-stat-grid">
          <div class="sv-stat">
            <div class="sv-stat-val">{{ $formatNumber(totalChimesEarned) }}</div>
            <div class="sv-stat-lbl">Gesamt-Chimes</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val sv-val-green">{{ $formatNumber(chimesPerSecond) }}</div>
            <div class="sv-stat-lbl">Chimes / Sek.</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val sv-val-blue">{{ $formatNumber(totalClicks) }}</div>
            <div class="sv-stat-lbl">Klicks</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val">{{ level }}</div>
            <div class="sv-stat-lbl">Level</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val sv-val-muted">{{ currentUniverse }}</div>
            <div class="sv-stat-lbl">Universum</div>
          </div>

          <div class="sv-stat">
            <div class="sv-stat-val sv-val-muted sv-val-sm">{{ sessionTime }}</div>
            <div class="sv-stat-lbl">Session</div>
          </div>
        </div>
      </div>

      <!-- ─ GEBÄUDE ─ -->
      <div class="sv-block">
        <div class="sv-block-label">Gebäude</div>

        <ul class="sv-building-list" role="list">
          <li
            v-for="b in buildingRows"
            :key="b.id"
            class="sv-building-row"
            :class="{ 'sv-building-row--locked': b.level === 0 }"
          >
            <img :src="b.icon" :alt="b.name" class="sv-building-icon" />

            <div class="sv-building-info">
              <div class="sv-building-top">
                <span class="sv-building-name">{{ b.name }}</span>
                <span class="sv-building-count">×{{ b.level }}</span>
                <span class="sv-building-value" :class="b.isCPS ? 'sv-val-green' : 'sv-val-blue'">
                  {{ b.isCPS ? `${$formatNumber(b.value)}/s` : `+${b.value}/Klick` }}
                </span>
              </div>

              <div v-if="b.isCPS" class="rpg-progress-track sv-bar-track">
                <div
                  class="rpg-progress-bar sv-bar-fill"
                  :style="{
                    width: animated && maxPercent > 0 ? `${(b.percent / maxPercent) * 100}%` : '0%',
                  }"
                />
              </div>
              <div v-else class="sv-click-tag">⚔ Click Power</div>
            </div>

            <div v-if="b.isCPS && b.level > 0" class="sv-pct-badge">
              {{ Math.round(b.percent) }}%
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════
   STATS VIEW — groß, luftig, nur RPG-Tokens
══════════════════════════════════════════════ */

.sv-root {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--rpg-bg-deep);
  color: var(--rpg-text);
  font-family: var(--rpg-font-mono);
}

/* ─── Linke Spalte ──────────────────────────── */
.sv-portrait-col {
  width: 36%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 28px 20px;
  background: var(--rpg-bg-dark);
  border-right: 1px solid var(--rpg-wood-inner);
}

.sv-bard-img {
  width: 100%;
  max-width: 260px;
  height: auto;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 28px color-mix(in srgb, var(--rpg-gold) 22%, transparent));
}

.sv-nameplate {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.sv-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--rpg-gold);
  font-family: var(--rpg-font-mono);
}
.sv-subtitle {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}

/* ─── Rechte Spalte ─────────────────────────── */
.sv-content-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 22px;
  overflow-y: auto;
  min-width: 0;
}

/* ─── Block ─────────────────────────────────── */
.sv-block {
  margin-bottom: 36px;
}
.sv-block-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rpg-wood-inner);
}

/* ─── Stat-Grid (3×2) ───────────────────────── */
.sv-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.sv-stat {
  padding: 18px 14px;
  background: var(--rpg-bg-dark);
  display: flex;
  flex-direction: column;
  gap: 7px;
  transition: background 0.12s;
}
.sv-stat:hover {
  background: var(--rpg-bg-hover);
}

.sv-stat-val {
  font-family: var(--rpg-font-mono);
  font-size: 26px;
  font-weight: 900;
  color: var(--rpg-gold);
  line-height: 1;
}
.sv-val-green {
  color: var(--rpg-green-top);
}
.sv-val-blue {
  color: var(--rpg-blue);
}
.sv-val-muted {
  color: var(--rpg-text-muted);
}
.sv-val-sm {
  font-size: 20px;
}

.sv-stat-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
}

/* ─── Gebäude-Liste ─────────────────────────── */
.sv-building-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.sv-building-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 6px;
  border-bottom: 1px solid var(--rpg-bg-row);
  transition: background 0.1s;
}
.sv-building-row:last-child {
  border-bottom: none;
}
.sv-building-row:hover {
  background: var(--rpg-bg-hover);
}
.sv-building-row--locked {
  opacity: 0.35;
  filter: grayscale(60%);
}

.sv-building-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
}

.sv-building-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sv-building-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.sv-building-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--rpg-gold-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  font-family: var(--rpg-font-mono);
}
.sv-building-count {
  font-size: 13px;
  color: var(--rpg-text-dim);
  flex-shrink: 0;
  font-family: var(--rpg-font-mono);
}
.sv-building-value {
  font-size: 14px;
  font-weight: 700;
  margin-left: auto;
  flex-shrink: 0;
  font-family: var(--rpg-font-mono);
}

/* Fortschritts-Bar */
.sv-bar-track {
  height: 5px;
}
.sv-bar-fill {
  height: 100%;
  transition: width 0.85s ease;
}

/* Click-Power-Tag */
.sv-click-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-dim);
  font-family: var(--rpg-font-mono);
}

/* Prozent-Abzeichen */
.sv-pct-badge {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--rpg-gold-dim);
  min-width: 38px;
  text-align: right;
  font-family: var(--rpg-font-mono);
}
</style>
