<template>
  <!-- One champion tile of the loading lobby: splash art under the ladder frame
       from the landing screen, its scouting line, three headline numbers and
       its own summoning bar. -->
  <div
    class="load-card"
    :class="[`load-card--${side}`, { 'load-card--ready': isReady }]"
    :style="cardStyle"
  >
    <!-- everything but the frame clips in here, so the crown can rise above -->
    <div class="card-inner">
      <img :src="artSrc" :alt="card.name" class="card-art" loading="eager" decoding="async" />
      <div class="card-scrim" />
      <div class="card-tint" />

      <!-- Head: role on the left, champion star tier on the right -->
      <div class="card-head">
        <span class="card-role">{{ roleShort }}</span>
        <span class="card-star">★{{ card.starLevel }}</span>
      </div>

      <!-- Foot: identity, scouting line, numbers, summoning bar -->
      <div class="card-foot">
        <span class="card-name">{{ card.name }}</span>

        <div class="card-scout">
          <span class="scout-origin" :style="{ color: card.originColor }">{{ card.origin }}</span>
          <span v-if="card.traits.length" class="scout-sep">·</span>
          <Icon
            v-for="trait in card.traits"
            :key="trait.id"
            :icon="trait.icon"
            width="24"
            height="24"
            class="scout-trait"
            :style="{ color: trait.color }"
            :title="trait.name"
          />
        </div>

        <div class="card-stats">
          <div v-for="stat in card.stats" :key="stat.label" class="card-stat">
            <span class="stat-value" :style="stat.color ? { color: stat.color } : undefined">
              {{ stat.value }}
            </span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>

        <div class="card-load">
          <div class="load-track">
            <div class="load-fill" :style="{ width: `${percent}%` }" />
          </div>
          <div class="load-legend">
            <span class="load-state">{{ isReady ? 'READY' : 'SUMMONING' }}</span>
            <span class="load-percent">{{ percent }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Same ladder frame the landing roster wears; it lights up once the
         champion has finished loading. -->
    <ChampionRankFrame :tier="card.frameTier" :lit="isReady" />
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { Icon } from '@iconify/vue'
import ChampionRankFrame from '../landing/ChampionRankFrame.vue'
import { useBattleStore } from '@/stores/battleStore'
import {
  LOADING_READY_PERCENT,
  RANK_FRAME_CONTENT_INSET,
  RANK_FRAME_CROWN_FOOT,
  RANK_FRAME_STYLES,
  RANK_TIER_COLORS,
  ROLE_BY_KEY,
} from '@/config/constants'
import type { LoadingScreenCard } from '@/types'

const props = defineProps<{
  card: LoadingScreenCard
  side: 'blue' | 'red'
  /** 0…100 — the tile's own summoning progress */
  percent: number
}>()

const battleStore = useBattleStore()

const artSrc = computed(() => battleStore.getChampionImage(props.card.name))
const roleShort = computed(() => ROLE_BY_KEY[props.card.role]?.short ?? props.card.role.toUpperCase())
const isReady = computed(() => props.percent >= LOADING_READY_PERCENT)

/** Frame metrics of the worn tier, so the content keeps clear of line + crown. */
const cardStyle = computed<CSSProperties>(() => {
  const frame = RANK_FRAME_STYLES[props.card.frameTier] ?? RANK_FRAME_STYLES.Iron
  return {
    '--rank-color': RANK_TIER_COLORS[props.card.frameTier] ?? '#8a9098',
    '--frame-inset': `calc(${frame.width + RANK_FRAME_CONTENT_INSET}px * var(--frame-scale, 1))`,
    '--crown-foot': `calc(${RANK_FRAME_CROWN_FOOT}px * var(--frame-scale, 1))`,
  } as CSSProperties
})
</script>

<style scoped>
.load-card {
  position: relative;
  /* visible: the frame's crown stands on the top edge and rises past it */
  overflow: visible;
  min-height: 0;
  background: #0d0b06;
  border: 1px solid rgba(122, 78, 32, 0.45);
  border-radius: 5px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
  /* the tile brightens the moment its champion is ready */
  transition:
    box-shadow 0.35s ease,
    border-color 0.35s ease,
    transform 0.35s ease;
}

.load-card--blue {
  --side-color: #93c5fd;
  --side-strong: #3b82f6;
}
.load-card--red {
  --side-color: #fca5a5;
  --side-strong: #ef4444;
}

.load-card--ready {
  border-color: color-mix(in srgb, var(--side-color) 55%, transparent);
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.55),
    0 0 22px color-mix(in srgb, var(--side-strong) 28%, transparent);
}

.card-inner {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 5px;
}

/* ── Splash art ── */
.card-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  /* still summoning: the art sits back; ready: full colour */
  filter: grayscale(45%) brightness(0.72);
  transform: scale(1.04);
  transition:
    filter 0.6s ease,
    transform 0.6s ease;
}
.load-card--ready .card-art {
  filter: none;
  transform: scale(1);
}

.card-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(6, 5, 3, 0.97) 0%,
    rgba(6, 5, 3, 0.82) 38%,
    rgba(6, 5, 3, 0.16) 66%,
    rgba(6, 5, 3, 0.5) 100%
  );
}

/* Side wash: the tile states which half of the rift it belongs to */
.card-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--side-strong) 30%, transparent),
    transparent 58%
  );
  mix-blend-mode: screen;
  opacity: 0.55;
}

/* ── Head row ── */
.card-head {
  position: absolute;
  top: calc(var(--crown-foot, 5px) + clamp(4px, 0.6vh, 9px));
  left: calc(var(--frame-inset, 7px) + clamp(6px, 0.55vw, 11px));
  right: calc(var(--frame-inset, 7px) + clamp(6px, 0.55vw, 11px));
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.card-role {
  font-size: clamp(11px, 1.4vh, 16px);
  font-weight: 800;
  letter-spacing: 0.16em;
  line-height: 1;
  color: var(--side-color);
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 12px color-mix(in srgb, var(--side-strong) 45%, transparent);
}

.card-star {
  font-size: clamp(11px, 1.4vh, 16px);
  font-weight: 700;
  line-height: 1;
  color: #e8c040;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* ── Foot ── */
.card-foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 0.55vh, 7px);
  padding: clamp(6px, 0.9vh, 11px) calc(var(--frame-inset, 7px) + clamp(6px, 0.5vw, 11px))
    calc(var(--frame-inset, 7px) + clamp(5px, 0.8vh, 10px));
}

.card-name {
  font-size: clamp(15px, 2.2vh, 27px);
  color: #fff;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.95);
}

/* Scouting line: origin plus the champion's trait marks */
.card-scout {
  display: flex;
  align-items: center;
  gap: clamp(3px, 0.35vw, 6px);
  min-width: 0;
}

.scout-origin {
  font-size: clamp(8px, 1.05vh, 12px);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.scout-sep {
  font-size: clamp(8px, 1.05vh, 12px);
  color: #7a6a44;
}

.scout-trait {
  width: clamp(13px, 1.7vh, 20px);
  height: clamp(13px, 1.7vh, 20px);
  flex-shrink: 0;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.95));
}

/* ── Three headline numbers ── */
.card-stats {
  display: flex;
  gap: 4px;
  padding-top: clamp(4px, 0.6vh, 8px);
  border-top: 1px solid color-mix(in srgb, var(--side-strong) 32%, transparent);
}

/* equal shares, so two-cell (scouted enemy) and three-cell (own career) tiles
   read as the same component */
.card-stat {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.stat-value {
  font-size: clamp(13px, 1.9vh, 23px);
  font-weight: 700;
  line-height: 1.05;
  color: #e8e2d0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
}

.stat-label {
  margin-top: 1px;
  font-size: clamp(7px, 0.9vh, 10px);
  font-weight: 700;
  letter-spacing: 1.4px;
  color: rgba(232, 226, 208, 0.5);
  white-space: nowrap;
}

/* ── Summoning bar ── */
.card-load {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.load-track {
  position: relative;
  height: clamp(4px, 0.6vh, 7px);
  background: #14110a;
  border: 1px solid #2c2416;
  border-radius: 4px;
  overflow: hidden;
}

.load-fill {
  height: 100%;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--side-strong) 80%, #000),
    var(--side-color)
  );
  box-shadow: 0 0 10px color-mix(in srgb, var(--side-strong) 55%, transparent);
  /* the width comes from the phase clock (~10 steps/s) — the transition keeps
     the fill gliding between those steps instead of stepping visibly */
  transition: width 0.12s linear;
}
.load-card--ready .load-fill {
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.55);
}

.load-legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: clamp(7px, 0.9vh, 10px);
  font-weight: 700;
  letter-spacing: 1.4px;
  line-height: 1;
}

.load-state {
  color: rgba(232, 226, 208, 0.5);
}
.load-card--ready .load-state {
  color: #74d448;
}

.load-percent {
  color: var(--side-color);
  font-variant-numeric: tabular-nums;
}
.load-card--ready .load-percent {
  color: #74d448;
}

/* Full HD and flatter viewports: the tile keeps every row, just tighter */
@media (max-height: 1100px) {
  .card-foot {
    gap: 3px;
    padding-bottom: calc(var(--frame-inset, 7px) + 5px);
  }
  .stat-label {
    letter-spacing: 1px;
  }
}

/* Short viewports: the scouting line is the first thing to go */
@media (max-height: 880px) {
  .card-scout {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-art,
  .load-fill,
  .load-card {
    transition: none;
  }
}
</style>
