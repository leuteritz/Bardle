<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { formatCompactDuration, durationSegments, toRoman, universeLabel } from '@/utils/ui/format'
import { formatNumber } from '@/config/ui/numberFormat'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import JourneyBuffStrip from './JourneyBuffStrip.vue'
import { JOURNEY_AXIS_COLORS, STATS_TAB_GAUGE } from '@/config/constants'

/** Kommandoband der Übersicht: Spielzeit, die drei Achsenringe, laufende und
 *  dauerhafte Effekte — EINE Leiste, die Zonen nur durch Haarlinien getrennt. */
const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

const { level, levelProgress, inGameTime, currentUniverse, totalUniverses } =
  storeToRefs(gameStore)
const { currentGalaxy, starsRescued, starsRequired } = storeToRefs(galaxyStore)

const playTimeSegments = computed(() => durationSegments(inGameTime.value * 1000))
const playTimeCompact = computed(() => formatCompactDuration(inGameTime.value * 1000))

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * STATS_TAB_GAUGE.RADIUS

interface JourneyGauge {
  key: string
  label: string
  value: string
  sub: string
  starIcon: boolean
  pct: number
  color: string
  full: boolean
  tip: string
}

function gaugeFont(value: string): number {
  const f = STATS_TAB_GAUGE.VALUE_FONT
  return f[Math.min(Math.max(value.length - 2, 0), f.length - 1)]
}

function gaugeOffset(pct: number): number {
  return GAUGE_CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, pct)) / 100)
}

const journeyGauges = computed<JourneyGauge[]>(() => {
  const galaxyDone = starsRescued.value >= starsRequired.value
  const universePct = (currentUniverse.value / Math.max(1, totalUniverses.value)) * 100
  return [
    {
      key: 'level',
      label: 'Level',
      value: String(level.value),
      sub: `${Math.floor(levelProgress.value)}%`,
      starIcon: false,
      pct: levelProgress.value,
      color: JOURNEY_AXIS_COLORS.level,
      full: false,
      tip:
        `Level ${level.value} — ${formatNumber(gameStore.currentLevelChimes)} of ` +
        `${formatNumber(gameStore.totalChimesThisLevel)} chimes toward level ${level.value + 1}`,
    },
    {
      key: 'galaxy',
      label: 'Galaxy',
      value: String(currentGalaxy.value),
      sub: `${starsRescued.value}/${starsRequired.value}`,
      starIcon: true,
      pct: (starsRescued.value / Math.max(1, starsRequired.value)) * 100,
      color: JOURNEY_AXIS_COLORS.galaxy,
      full: galaxyDone,
      tip: galaxyStore.needsFinalBoss
        ? `Galaxy ${currentGalaxy.value} — every star rescued, the galaxy core awaits`
        : `Galaxy ${currentGalaxy.value} — ${starsRescued.value} of ${starsRequired.value} stars rescued`,
    },
    {
      key: 'universe',
      label: 'Universe',
      value: toRoman(currentUniverse.value),
      sub: `${currentUniverse.value}/${totalUniverses.value}`,
      starIcon: false,
      pct: universePct,
      color: JOURNEY_AXIS_COLORS.universe,
      full: currentUniverse.value >= totalUniverses.value,
      tip: `${universeLabel(currentUniverse.value)} — ${currentUniverse.value} of ${totalUniverses.value}`,
    },
  ]
})
</script>

<template>
  <header class="jt-band">
    <div class="jt-seg jt-playtime" v-tip="`${playTimeCompact} spent in this universe`">
      <span v-ink-center class="jt-pt-lbl">Play Time</span>
      <div class="jt-pt-stack">
        <div class="jt-pt-readout">
          <div
            v-for="seg in playTimeSegments"
            :key="seg.unit"
            class="jt-pt-seg"
            :class="{ 'is-empty': seg.leadingZero }"
          >
            <!-- eine feste Box je Ziffer — MedievalSharp hat keine Tabellenziffern -->
            <span class="jt-pt-num">
              <span v-for="(digit, i) in seg.value" :key="i" v-ink-center class="jt-pt-digit">
                {{ digit }}
              </span>
            </span>
            <span v-ink-center class="jt-pt-unit">{{ seg.unit }}</span>
          </div>
        </div>
        <div class="jt-pt-rule" />
      </div>
    </div>

    <div
      v-for="g in journeyGauges"
      :key="g.key"
      class="jt-seg jt-gauge"
      :class="{ 'is-full': g.full }"
      :style="{
        '--gauge': g.color,
        '--gauge-max': STATS_TAB_GAUGE.MAX_PX + 'px',
        '--gauge-max-compact': STATS_TAB_GAUGE.MAX_PX_COMPACT + 'px',
      }"
      v-tip="g.tip"
    >
      <div class="jt-gauge-ring">
        <svg
          class="jt-gauge-svg"
          :viewBox="`0 0 ${STATS_TAB_GAUGE.VIEW} ${STATS_TAB_GAUGE.VIEW}`"
          aria-hidden="true"
        >
          <circle
            class="jt-gauge-track"
            :cx="STATS_TAB_GAUGE.VIEW / 2"
            :cy="STATS_TAB_GAUGE.VIEW / 2"
            :r="STATS_TAB_GAUGE.RADIUS"
            :stroke-width="STATS_TAB_GAUGE.STROKE"
          />
          <circle
            class="jt-gauge-arc"
            :cx="STATS_TAB_GAUGE.VIEW / 2"
            :cy="STATS_TAB_GAUGE.VIEW / 2"
            :r="STATS_TAB_GAUGE.RADIUS"
            :stroke-width="STATS_TAB_GAUGE.STROKE"
            :stroke-dasharray="GAUGE_CIRCUMFERENCE"
            :stroke-dashoffset="gaugeOffset(g.pct)"
            :transform="`rotate(-90 ${STATS_TAB_GAUGE.VIEW / 2} ${STATS_TAB_GAUGE.VIEW / 2})`"
          />
          <text
            class="jt-gauge-val"
            :x="STATS_TAB_GAUGE.VIEW / 2"
            :y="STATS_TAB_GAUGE.VIEW / 2"
            :font-size="gaugeFont(g.value)"
            text-anchor="middle"
            dominant-baseline="central"
          >
            {{ g.value }}
          </text>
        </svg>
      </div>
      <div class="jt-gauge-text">
        <span v-ink-center class="jt-gauge-lbl">{{ g.label }}</span>
        <span v-ink-center class="jt-gauge-sub">
          <Icon
            v-if="g.starIcon"
            class="jt-gauge-sub-ico"
            icon="ph:star-fill"
            width="11"
            height="11"
          />
          {{ g.sub }}
        </span>
      </div>
    </div>

    <div class="jt-seg jt-seg--strip">
      <JourneyBuffStrip />
    </div>
  </header>
</template>

<style scoped>
/* EINE flache Leiste, keine sechs Kästen: die Zonen trennt eine Haarlinie, nicht
   ein Rahmen. Jede Höhe hier fällt eins zu eins an die Sonnenbühne darunter. */
.jt-band {
  display: grid;
  grid-template-columns: auto auto auto auto minmax(0, 1fr);
  align-items: stretch;
  min-width: 0;
  min-height: 82px;
  background: #1a1008;
  border-bottom: 1px solid #2c1806;
}

.jt-seg {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 11px 18px;
  border-right: 1px solid #2c1806;
}
.jt-seg--strip {
  display: block;
  border-right: 0;
}

/* ── Spielzeit ── */
.jt-playtime {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  border-left: 3px solid #e8c040;
  cursor: help;
}

.jt-pt-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #8a7a58;
}

.jt-pt-stack {
  display: inline-flex;
  flex-direction: column;
}

.jt-pt-readout {
  display: flex;
  align-items: flex-end;
}

.jt-pt-seg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 0 7px;
}
.jt-pt-seg:first-child {
  padding-left: 0;
}
.jt-pt-seg + .jt-pt-seg {
  border-left: 1px solid #2c2010;
}

.jt-pt-num {
  display: flex;
  font-size: 24px;
  font-weight: 900;
  line-height: 0.95;
  color: var(--rpg-gold);
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.28);
}

.jt-pt-digit {
  width: 0.66em;
  text-align: center;
}

.jt-pt-unit {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a58;
}

.jt-pt-seg.is-empty .jt-pt-num {
  color: #6b5a34;
  text-shadow: none;
}
.jt-pt-seg.is-empty .jt-pt-unit {
  color: #5a4c33;
}

.jt-pt-rule {
  width: 100%;
  height: 2px;
  margin-top: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* ── Ringe ── */
.jt-gauge {
  position: relative;
  justify-content: flex-start;
  gap: 11px;
  cursor: help;
}
.jt-gauge:hover {
  background: color-mix(in srgb, var(--gauge) 7%, transparent);
}

/* Die Achsenfarbe unterstreicht ihre Zone — statisch, kein Rahmen. */
.jt-gauge::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: color-mix(in srgb, var(--gauge) 32%, transparent);
}

.jt-gauge-ring {
  position: relative;
  width: var(--gauge-max);
  aspect-ratio: 1;
  flex-shrink: 0;
}
.jt-gauge-ring::before {
  content: '';
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--gauge) 14%, transparent) 0%,
    transparent 70%
  );
}

.jt-gauge-svg {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.jt-gauge-track {
  fill: none;
  stroke: #241a0c;
}

.jt-gauge-arc {
  fill: none;
  stroke: var(--gauge);
  stroke-linecap: round;
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--gauge) 65%, transparent));
  transition: stroke-dashoffset 0.6s ease;
}

.jt-gauge-val {
  fill: var(--gauge);
  font-weight: 900;
  letter-spacing: 0.02em;
}

.jt-gauge-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.jt-gauge-lbl {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a7a58;
  white-space: nowrap;
}

.jt-gauge-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  color: var(--rpg-text-muted);
  white-space: nowrap;
}
.jt-gauge-sub-ico {
  flex-shrink: 0;
  color: var(--gauge);
  position: relative;
  top: -1px;
}

/* Ring geschlossen: die Einheit wartet auf den Spieler — nur die Deckkraft atmet */
.jt-gauge.is-full::after {
  background: var(--gauge);
}
.jt-gauge.is-full .jt-gauge-arc {
  animation: jt-gauge-pulse 2.4s ease-in-out infinite;
}
.jt-gauge.is-full .jt-gauge-sub {
  color: var(--gauge);
}
@keyframes jt-gauge-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@media (max-height: 1100px) {
  .jt-band {
    min-height: 70px;
  }
  .jt-seg {
    padding: 8px 14px;
  }
  .jt-pt-lbl {
    font-size: 9px;
  }
  .jt-pt-num {
    font-size: 20px;
  }
  .jt-pt-unit {
    font-size: 8px;
  }
  .jt-pt-seg {
    padding: 0 5px;
  }
  .jt-gauge {
    gap: 9px;
  }
  .jt-gauge-ring {
    width: var(--gauge-max-compact);
  }
  .jt-gauge-lbl {
    font-size: 10px;
  }
  .jt-gauge-sub {
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .jt-gauge.is-full .jt-gauge-arc {
    animation: none;
  }
}
</style>
