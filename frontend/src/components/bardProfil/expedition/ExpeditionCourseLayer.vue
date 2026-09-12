<script setup lang="ts">
/**
 * Die Kurswahl auf der Live-Bühne: drei Kandidaten-Sterne, ihre gestrichelten
 * Kurse vom Schiff aus und das Kopf-Scrim, das die Frage stellt.
 *
 * Die EINZIGE Enthüllung vor dem Schiff — der gewählte Stern selbst erscheint
 * weiter erst nach der Wahl (`ExpeditionPlayerMarkerLayer`). Kurse sind
 * statische SVG-Pfade; beim Hover wechselt nur `opacity`.
 */
import { computed, ref } from 'vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import ExpeditionCourseNode from './ExpeditionCourseNode.vue'
import { obtainableByRole } from '@/utils/game/roleRoster'
import {
  MINIMAP_FLIGHTPATH_BEND,
  ROLE_COLORS,
  VOYAGE_COURSE_HEAD_LABEL,
  VOYAGE_COURSE_HEAD_SUB,
} from '@/config/constants'
import type { FitBox } from '@/utils/fx/galaxyPlate'

const props = defineProps<{
  box: FitBox
  width: number
  height: number
}>()

const galaxyStore = useGalaxyStore()
const battleStore = useBattleStore()
const hovered = ref<number | null>(null)

const options = computed(() => galaxyStore.courseOptions)

const roster = computed(() =>
  obtainableByRole({
    currentGalaxy: galaxyStore.currentGalaxy,
    requiredStarLevel: galaxyStore.requiredStarLevel,
    ownedChampions: battleStore.ownedChampions,
    recruitableNames: battleStore.recruitableChampions.map((r) => r.name),
  }),
)

function px(p: { x: number; y: number }): { x: number; y: number } {
  return { x: props.box.x + p.x * props.box.w, y: props.box.y + p.y * props.box.h }
}

function pct(p: { x: number; y: number }): { left: number; top: number } {
  if (props.width <= 0 || props.height <= 0) return { left: 50, top: 50 }
  const q = px(p)
  return { left: (q.x / props.width) * 100, top: (q.y / props.height) * 100 }
}

/** Dieselbe Biegung wie der spätere Flug — der Kurs zeigt, was geflogen wird. */
const paths = computed(() => {
  const o = px(galaxyStore.courseOrigin)
  return options.value.map((opt) => {
    const t = px(opt.pos)
    const dx = t.x - o.x
    const dy = t.y - o.y
    const len = Math.hypot(dx, dy)
    if (len <= 1) return ''
    const bend = len * MINIMAP_FLIGHTPATH_BEND
    const cx = (o.x + t.x) / 2 - (dy / len) * bend
    const cy = (o.y + t.y) / 2 + (dx / len) * bend
    return `M${o.x.toFixed(1)} ${o.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${t.x.toFixed(1)} ${t.y.toFixed(1)}`
  })
})

const flightMs = computed(() => options.value.map((o) => galaxyStore.flightMsForFactor(o.legFactor)))

function chart(i: number) {
  hovered.value = null
  galaxyStore.chartCourse(i)
}
</script>

<template>
  <div class="ecl">
    <svg
      class="ecl-routes"
      :viewBox="`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`"
      aria-hidden="true"
    >
      <path
        v-for="(d, i) in paths"
        :key="i"
        :d="d"
        class="ecl-route"
        :class="{ 'ecl-route--on': hovered === i }"
        :style="{ stroke: ROLE_COLORS[options[i].role] }"
      />
    </svg>

    <div class="ecl-head" role="heading" aria-level="3">
      <span class="ecl-head-scrim" aria-hidden="true" />
      <span class="ecl-head-title">{{ VOYAGE_COURSE_HEAD_LABEL }}</span>
      <span class="ecl-head-sub">{{ VOYAGE_COURSE_HEAD_SUB }}</span>
    </div>

    <div class="ecl-nodes">
      <ExpeditionCourseNode
        v-for="(opt, i) in options"
        :key="`${opt.role}-${i}`"
        :option="opt"
        :index="i"
        :left="pct(opt.pos).left"
        :top="pct(opt.pos).top"
        :flight-ms="flightMs[i]"
        :roster="roster[opt.role]"
        :hovered="hovered === i"
        @hover="hovered = $event"
        @chart="chart"
      />
    </div>
  </div>
</template>

<style scoped>
.ecl {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.ecl-routes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ecl-route {
  fill: none;
  stroke: rgba(255, 210, 120, 0.5);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 4 8;
  opacity: 0.3;
  transition: opacity 0.16s ease;
}
.ecl-route--on {
  opacity: 0.95;
}

.ecl-nodes {
  position: absolute;
  inset: 0;
}

/* Kopf-Scrim wie die Manifestreihe: Fläche ohne Kasten, oben mittig. */
.ecl-head {
  position: absolute;
  left: 50%;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 36px 16px;
  transform: translateX(-50%);
  text-align: center;
  white-space: nowrap;
}
.ecl-head-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(8, 6, 3, 0.9), rgba(8, 6, 3, 0));
  -webkit-mask-image: linear-gradient(to right, transparent, #000 18%, #000 82%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 18%, #000 82%, transparent);
}
.ecl-head-title {
  position: relative;
  font-size: clamp(17px, 1.2vw, 24px);
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #e8c040;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.9);
}
.ecl-head-sub {
  position: relative;
  font-size: clamp(12px, 0.8vw, 15px);
  letter-spacing: 0.06em;
  color: rgba(232, 220, 192, 0.75);
}
</style>
