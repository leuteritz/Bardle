<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { formatCompactDuration, durationSegments, toRoman } from '@/utils/ui/format'
import { formatNumber } from '@/config/ui/numberFormat'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { STATS_TAB_GAUGE } from '@/config/constants'
import { universes } from '@/config/progression/universes'
import StatsColumnHeader from './StatsColumnHeader.vue'
import StatCategoryAccordion from './StatCategoryAccordion.vue'
import WayfinderSection from './WayfinderSection.vue'

/**
 * Left column of the Bard-Stats deck: how far this run has come.
 * Play time as a chronometer, Level / Galaxy / Universe as progress dials, and
 * the full stat catalogue below — all filtered by the column's own search.
 */
const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()

const { level, levelProgress, inGameTime, currentUniverse, totalUniverses } =
  storeToRefs(gameStore)
const { currentGalaxy, starsRescued, starsRequired } = storeToRefs(galaxyStore)

const journeySearch = ref('')

/* ── Play time — split into odometer blocks for the hero readout ── */
const playTimeSegments = computed(() => durationSegments(inGameTime.value * 1000))
/** Same duration in one line — the readout's tooltip. */
const playTimeCompact = computed(() => formatCompactDuration(inGameTime.value * 1000))

/* ── Journey gauges — Level / Galaxy / Universe as progress rings ──
   Each of the three headline numbers doubles as a dial: the ring around it
   shows how far the run has come inside that unit (chimes to next level,
   stars rescued in this galaxy, universes prestiged), so the trio reads as
   progress instead of three loose numbers. */
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * STATS_TAB_GAUGE.RADIUS

interface JourneyGauge {
  key: string
  label: string
  /** the headline readout drawn inside the ring */
  value: string
  /** small line under the ring — the fraction the ring visualises */
  sub: string
  /** show the rescued-star glyph in front of `sub` (galaxy only) */
  starIcon: boolean
  /** 0–100, drives the arc length */
  pct: number
  color: string
  /** ring closed — the unit is finished and waits on the player */
  full: boolean
  tip: string
}

/** Value font size in viewBox units, stepped down by readout length. */
function gaugeFont(value: string): number {
  const f = STATS_TAB_GAUGE.VALUE_FONT
  return f[Math.min(Math.max(value.length - 2, 0), f.length - 1)]
}

function gaugeOffset(pct: number): number {
  return GAUGE_CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, pct)) / 100)
}

const journeyGauges = computed<JourneyGauge[]>(() => {
  const universeName = universes[currentUniverse.value - 1]?.name ?? 'Unknown universe'
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
      color: '#e8c040',
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
      color: '#9a6fd0',
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
      color: '#52b830',
      full: currentUniverse.value >= totalUniverses.value,
      tip: `${universeName} — universe ${currentUniverse.value} of ${totalUniverses.value}`,
    },
  ]
})
</script>

<template>
  <section class="sf-panel sf-col">
    <StatsColumnHeader v-model="journeySearch" title="Journey" placeholder="Search stats…" />

    <div class="sf-p-body sf-stats-body rpg-scrollbar">
      <!-- Idle play-time — the panel's hero stat, read like a chronometer:
           all four units from the very first tick, empty ones dimmed. -->
      <div class="sf-playtime" :title="`${playTimeCompact} spent in this universe`">
        <span class="sf-pt-lbl">Play Time</span>
        <!-- Readout and gold rule share a wrapper so the rule always ends
             exactly with the last digit block -->
        <div class="sf-pt-stack">
          <div class="sf-pt-readout">
            <div
              v-for="seg in playTimeSegments"
              :key="seg.unit"
              class="sf-pt-seg"
              :class="{ 'is-empty': seg.leadingZero }"
            >
              <!-- One fixed box per digit — MedievalSharp has no tabular
                   figures, so only this keeps the readout from breathing -->
              <span class="sf-pt-num">
                <span v-for="(digit, i) in seg.value" :key="i" v-ink-center class="sf-pt-digit">
                  {{ digit }}
                </span>
              </span>
              <span v-ink-center class="sf-pt-unit">{{ seg.unit }}</span>
            </div>
          </div>
          <div class="sf-pt-rule" />
        </div>
      </div>

      <!-- Level / Galaxy / Universe — each number sits inside its own
           progress ring, so the trio shows position AND progress -->
      <div class="sf-gauges">
        <div
          v-for="g in journeyGauges"
          :key="g.key"
          class="sf-gauge"
          :class="{ 'is-full': g.full }"
          :style="{
            '--gauge': g.color,
            '--gauge-max': STATS_TAB_GAUGE.MAX_PX + 'px',
            '--gauge-max-compact': STATS_TAB_GAUGE.MAX_PX_COMPACT + 'px',
          }"
          :title="g.tip"
        >
          <span v-ink-center class="sf-gauge-lbl">{{ g.label }}</span>
          <div class="sf-gauge-ring">
            <svg
              class="sf-gauge-svg"
              :viewBox="`0 0 ${STATS_TAB_GAUGE.VIEW} ${STATS_TAB_GAUGE.VIEW}`"
              aria-hidden="true"
            >
              <circle
                class="sf-gauge-track"
                :cx="STATS_TAB_GAUGE.VIEW / 2"
                :cy="STATS_TAB_GAUGE.VIEW / 2"
                :r="STATS_TAB_GAUGE.RADIUS"
                :stroke-width="STATS_TAB_GAUGE.STROKE"
              />
              <circle
                class="sf-gauge-arc"
                :cx="STATS_TAB_GAUGE.VIEW / 2"
                :cy="STATS_TAB_GAUGE.VIEW / 2"
                :r="STATS_TAB_GAUGE.RADIUS"
                :stroke-width="STATS_TAB_GAUGE.STROKE"
                :stroke-dasharray="GAUGE_CIRCUMFERENCE"
                :stroke-dashoffset="gaugeOffset(g.pct)"
                :transform="`rotate(-90 ${STATS_TAB_GAUGE.VIEW / 2} ${STATS_TAB_GAUGE.VIEW / 2})`"
              />
              <!-- Value lives in the SVG so it scales with the ring instead
                   of needing its own breakpoints -->
              <text
                class="sf-gauge-val"
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
          <span v-ink-center class="sf-gauge-sub">
            <Icon
              v-if="g.starIcon"
              class="sf-gauge-sub-ico"
              icon="ph:star-fill"
              width="11"
              height="11"
            />
            {{ g.sub }}
          </span>
        </div>
      </div>

      <StatCategoryAccordion :query="journeySearch" />

      <!-- Die Leiter der Wanderung am Fuß der Journey-Spalte — spiegelbildlich
           zum Codex am Fuß der Mittelspalte. Diese Spalte scrollt ohnehin, eine
           Sektion hier kostet keine Höhe. -->
      <WayfinderSection />
    </div>
  </section>
</template>

<style scoped>
/* ─── Journey column ─────────────────────────────────────────────
   Frameless like its two siblings: no per-panel border, the shared cosmic
   backdrop shows through and only the deck's hairline divider sets it apart. */
.sf-panel {
  position: relative;
  z-index: 1;
  background: transparent;
}

.sf-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.sf-p-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
}

.sf-stats-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Idle play-time hero — a chronometer readout: small label, four equal digit
   blocks starting hard left, closed by the modal gold rule. */
.sf-playtime {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  margin-bottom: 6px;
  cursor: help;
}

.sf-pt-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}

.sf-pt-stack {
  display: inline-flex;
  flex-direction: column;
}

.sf-pt-readout {
  display: flex;
  align-items: flex-end;
  gap: 0;
}

/* Four equal blocks — clock face, not a headline: the same weight everywhere
   keeps "00 DAYS" from shouting on a fresh save. A hairline separates them. */
.sf-pt-seg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 0 11px;
}
.sf-pt-seg:first-child {
  padding-left: 0;
}
.sf-pt-seg + .sf-pt-seg {
  border-left: 1px solid #2c2010;
}

.sf-pt-num {
  display: flex;
  font-size: 36px;
  font-weight: 900;
  line-height: 0.95;
  color: var(--rpg-gold);
  text-shadow: 0 0 16px rgba(232, 192, 64, 0.3);
}

/* Every digit gets the same box regardless of its own glyph width, so the
   readout holds its width while the clock counts up and nothing shifts. */
.sf-pt-digit {
  width: 0.66em;
  text-align: center;
}

.sf-pt-unit {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #8a7a58;
}

/* Units that have not started counting yet — present, but visibly still empty */
.sf-pt-seg.is-empty .sf-pt-num {
  color: #6b5a34;
  text-shadow: none;
}
.sf-pt-seg.is-empty .sf-pt-unit {
  color: #5a4c33;
}

/* The modal's signature gold line, cut to the readout's width */
.sf-pt-rule {
  width: 100%;
  height: 2px;
  margin-top: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* Level / Galaxy / Universe — the panel's headline trio. Each number sits in
   its own dial: the ring around it is the progress inside that unit (chimes
   to the next level, stars rescued, universes prestiged), so one glance gives
   both the position and how far it has come. The ring is SVG in a square
   viewBox, so it scales with the drag-resizable column without breakpoints. */
.sf-gauges {
  display: flex;
  gap: 8px;
}

.sf-gauge {
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px 9px;
  background: #141008;
  border: 1px solid #241a0c;
  border-radius: 6px;
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
}
.sf-gauge:hover {
  border-color: color-mix(in srgb, var(--gauge) 45%, #241a0c);
  box-shadow: 0 0 12px color-mix(in srgb, var(--gauge) 18%, transparent);
}

.sf-gauge-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a58;
  white-space: nowrap;
}

.sf-gauge-ring {
  position: relative;
  width: 100%;
  max-width: var(--gauge-max);
  aspect-ratio: 1;
}
/* Faint colored haze inside the dial so the ring reads as lit, not drawn */
.sf-gauge-ring::before {
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

.sf-gauge-svg {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.sf-gauge-track {
  fill: none;
  stroke: #241a0c;
}

.sf-gauge-arc {
  fill: none;
  stroke: var(--gauge);
  stroke-linecap: round;
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--gauge) 65%, transparent));
  transition: stroke-dashoffset 0.6s ease;
}

.sf-gauge-val {
  fill: var(--gauge);
  font-weight: 900;
  letter-spacing: 0.02em;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--gauge) 40%, transparent));
}

.sf-gauge-sub {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1;
  color: var(--rpg-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sf-gauge-sub-ico {
  flex-shrink: 0;
  color: var(--gauge);
  /* the round-star glyph sits low in its viewBox — lift it onto the text's
     optical center */
  position: relative;
  top: -1px;
}

/* Ring closed — the unit is finished and waiting on the player (every star
   rescued, last universe reached): the arc breathes instead of sitting still */
.sf-gauge.is-full {
  border-color: color-mix(in srgb, var(--gauge) 50%, #241a0c);
}
.sf-gauge.is-full .sf-gauge-arc {
  animation: sf-gauge-pulse 2.4s ease-in-out infinite;
}
.sf-gauge.is-full .sf-gauge-sub {
  color: var(--gauge);
}
@keyframes sf-gauge-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--gauge) 60%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 9px var(--gauge));
  }
}

/* Full HD / WUXGA: the flattest viewports — keep the hero commanding but
   reclaim rows, and shrink the dials without changing what they say. */
@media (max-height: 1100px) {
  .sf-pt-num {
    font-size: 30px;
  }
  .sf-pt-seg {
    padding: 0 9px;
  }
  .sf-gauge-ring {
    max-width: var(--gauge-max-compact);
  }
  .sf-gauge {
    padding: 8px 6px 7px;
    gap: 5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sf-gauge.is-full .sf-gauge-arc {
    animation: none;
  }
}
</style>
