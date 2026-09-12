<script setup lang="ts">
/**
 * Ein Kandidaten-Stern der Kurswahl — Rollenfarbe, Rollenglyph, Flugzeit.
 *
 * DOM statt Platte: die Wahl ist flüchtig, die Platte ein Standbild. Der
 * Körper ist EIN Canvas je Knoten, einmal gemalt; die atmenden Ringe liegen
 * auf eigener Ebene mit statischem Schein, animiert wird nur `opacity`.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import ExpeditionCourseTooltip from './ExpeditionCourseTooltip.vue'
import { drawRoleStar, rolePaletteFromHex } from '@/components/bottom/minimap/minimapDraw'
import { formatMinuteClock } from '@/utils/ui/format'
import { STAR_BODY_SPRITE_SPAN } from '@/config/constants'
import {
  ROLE_BY_KEY,
  ROLE_COLORS,
  VOYAGE_COURSE_HIT_PX,
  VOYAGE_COURSE_R_PX,
  VOYAGE_COURSE_RING_PERIOD_MS,
  VOYAGE_TIP_GAP_PX,
  VOYAGE_TIP_OPEN_DELAY_MS,
  VOYAGE_TIP_WIDTH,
} from '@/config/constants'
import type { CourseOption } from '@/utils/game/courseCandidates'
import type { RosterChampion } from '@/utils/game/roleRoster'

const props = defineProps<{
  option: CourseOption
  index: number
  left: number
  top: number
  flightMs: number
  roster: RosterChampion[]
  hovered: boolean
}>()
const emit = defineEmits<{ hover: [number | null]; chart: [number] }>()

const def = computed(() => ROLE_BY_KEY[props.option.role])
const accent = computed(() => ROLE_COLORS[props.option.role])
const label = computed(
  () => `${def.value.label} star — ${formatMinuteClock(props.flightMs)} flight, click to set course`,
)

const bodyPx = VOYAGE_COURSE_R_PX * 2
const canvasPx = bodyPx * STAR_BODY_SPRITE_SPAN
const canvas = ref<HTMLCanvasElement | null>(null)

function paint() {
  const el = canvas.value
  if (!el) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.max(1, Math.round(canvasPx * dpr))
  el.height = Math.max(1, Math.round(canvasPx * dpr))
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, canvasPx, canvasPx)
  drawRoleStar(ctx, canvasPx / 2, canvasPx / 2, VOYAGE_COURSE_R_PX, rolePaletteFromHex(accent.value), 0)
}

onMounted(paint)
watch(accent, paint)

const hitPx = `${VOYAGE_COURSE_HIT_PX}px`
const canvasSize = `${canvasPx}px`
const ringPeriod = `${VOYAGE_COURSE_RING_PERIOD_MS}ms`
</script>

<template>
  <RpgBadgeTooltip
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
    :accent="accent"
  >
    <template #default>
      <button
        type="button"
        class="ecn"
        :class="{ 'ecn--on': hovered }"
        :style="{ left: `${left}%`, top: `${top}%`, '--ecn-ink': accent }"
        :aria-label="label"
        @mouseenter="emit('hover', index)"
        @mouseleave="emit('hover', null)"
        @focus="emit('hover', index)"
        @blur="emit('hover', null)"
        @click="emit('chart', index)"
      >
        <span class="ecn-rings" aria-hidden="true">
          <span class="ecn-ring ecn-ring--a" />
          <span class="ecn-ring ecn-ring--b" />
        </span>
        <span class="ecn-glow" aria-hidden="true" />
        <canvas ref="canvas" class="ecn-body" :width="canvasPx" :height="canvasPx" aria-hidden="true" />
        <span class="ecn-glyph" aria-hidden="true">
          <Icon :icon="def.icon" width="24" height="24" />
        </span>
        <span class="ecn-tag" aria-hidden="true">
          <span class="ecn-tag-role">{{ def.short }}</span>
          <span class="ecn-tag-time">{{ formatMinuteClock(flightMs) }}</span>
        </span>
      </button>
    </template>
    <template #tip>
      <ExpeditionCourseTooltip
        :role="option.role"
        :flight-ms="flightMs"
        :roster="roster"
        :accent="accent"
      />
    </template>
  </RpgBadgeTooltip>
</template>

<style scoped>
.ecn {
  position: absolute;
  width: v-bind(hitPx);
  height: v-bind(hitPx);
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  transform: translate(-50%, -50%);
  cursor: pointer;
  pointer-events: auto;
}
.ecn--on {
  z-index: 3;
}

.ecn-body {
  position: absolute;
  left: 50%;
  top: 50%;
  width: v-bind(canvasSize);
  height: v-bind(canvasSize);
  margin: calc(v-bind(canvasSize) / -2) 0 0 calc(v-bind(canvasSize) / -2);
  pointer-events: none;
}

/* Statischer Schein, nur seine Deckkraft wechselt beim Hover. */
.ecn-glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(v-bind(hitPx) * 1.6);
  height: calc(v-bind(hitPx) * 1.6);
  margin: calc(v-bind(hitPx) * -0.8) 0 0 calc(v-bind(hitPx) * -0.8);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--ecn-ink) 40%, transparent) 0%,
    color-mix(in srgb, var(--ecn-ink) 12%, transparent) 45%,
    transparent 72%
  );
  opacity: 0.35;
  transition: opacity 0.16s ease;
  pointer-events: none;
}
.ecn--on .ecn-glow {
  opacity: 1;
}

.ecn-rings {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.ecn-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  border: 2px solid var(--ecn-ink);
  opacity: 0;
  animation: ecn-breathe v-bind(ringPeriod) ease-in-out infinite;
}
.ecn-ring--a {
  width: calc(v-bind(hitPx) * 0.72);
  height: calc(v-bind(hitPx) * 0.72);
  margin: calc(v-bind(hitPx) * -0.36) 0 0 calc(v-bind(hitPx) * -0.36);
}
.ecn-ring--b {
  width: calc(v-bind(hitPx) * 0.98);
  height: calc(v-bind(hitPx) * 0.98);
  margin: calc(v-bind(hitPx) * -0.49) 0 0 calc(v-bind(hitPx) * -0.49);
  animation-delay: calc(v-bind(ringPeriod) / -2);
}
.ecn--on .ecn-ring {
  animation: none;
  opacity: 0.9;
}

@keyframes ecn-breathe {
  0%,
  100% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.6;
  }
}

.ecn-glyph {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
  pointer-events: none;
}

.ecn-tag {
  position: absolute;
  left: 50%;
  top: 100%;
  display: flex;
  align-items: center;
  gap: 0.4em;
  padding: 2px 8px;
  transform: translateX(-50%);
  white-space: nowrap;
  background: #111008;
  border: 1px solid var(--ecn-ink);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.3;
  pointer-events: none;
}
.ecn-tag-role {
  font-weight: 900;
  letter-spacing: 0.14em;
  color: var(--ecn-ink);
}
.ecn-tag-time {
  font-weight: 700;
  color: #e8c040;
}

@media (prefers-reduced-motion: reduce) {
  .ecn-ring {
    animation: none;
    opacity: 0.4;
  }
}
</style>
