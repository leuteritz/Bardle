<script setup lang="ts">
/**
 * Die Crews, die gerade unterwegs sind — sichtbar auf der Karte.
 *
 * Die Galaxie-Platte darunter ist ein STANDBILD und bleibt eines: sie wird nur
 * bei `paintKey`-Wechsel gemalt, diese Ebene fasst sie nicht an. Was sich
 * bewegt, ist DOM darüber.
 *
 * Zwei Teile mit verschiedenem Takt:
 *   • Die Route ist ein statisches SVG. Sie ändert sich nur, wenn eine Mission
 *     kommt oder geht oder die Fit-Box wechselt — kein Frame, und ausdrücklich
 *     kein laufendes `stroke-dasharray`.
 *   • Der Marker läuft in EINER rAF-Schleife für alle Crews, die
 *     `translate3d` direkt auf die registrierten Elemente schreibt. Höchstens
 *     fünf Missionen können gleichzeitig laufen (Rang-Deckel), das sind fünf
 *     Zuweisungen je Frame.
 *
 * Die Position wird IMMER neu aus `gameNow()` gerechnet, nie fortgeschrieben:
 * damit ist die Reise zeitraffer-treu und übersteht Tab-Wechsel und Reload.
 *
 * Pausensignal ist `isRenderingPaused` und NICHT `isIdleRenderingPaused` —
 * letzteres enthält „ein Bard-Reiter ist offen" und wäre hier immer wahr.
 */
import { computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import { generateGalaxyDots } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { setMapEl } from '@/utils/orbit/frameEls'
import { gameNow } from '@/utils/game/gameClock'
import {
  voyageLegsOf,
  voyageRouteNodesOf,
  voyageRoutePointAt,
  voyageRouteSamples,
} from '@/utils/game/voyageLegs'
import {
  EXPEDITION_COLORS,
  VOYAGE_CREW_MARKER_FACE_RATIO,
  VOYAGE_CREW_MARKER_FACE_MIN,
  VOYAGE_CREW_MARKER_FACE_MAX,
  VOYAGE_CREW_MARKER_FACES,
  VOYAGE_CREW_MARKER_PULSE_MS,
  VOYAGE_ROUTE_SAMPLES,
} from '@/config/constants'
import type { FitBox } from '@/utils/fx/galaxyPlate'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { VoyageLeg, VoyagePlacedSite, VoyageRoutePoint } from '@/types'

const props = defineProps<{
  record: CompletedGalaxyRecord
  sites: VoyagePlacedSite[]
  box: FitBox
  /** Bühnenmasse — das SVG spannt über die ganze Bühne, nicht über die Box. */
  width: number
  height: number
  /** Plattengrösse der Hafenmarken — die Crew misst sich an ihr, nicht an einer
   *  festen Zahl: auf 4K wäre sie sonst ein Fleck neben einem 96-px-Hafen. */
  plate: number
  /** Der Reiter bleibt gemountet; ohne das liefe die Schleife im Hintergrund. */
  visible: boolean
  /** Sekundentakt des Atlas — der Rückfallweg bei reduzierter Bewegung. */
  now: number
}>()

const battleStore = useBattleStore()
const { isRenderingPaused } = useRenderingPaused()

/** Das Abflugportal der Galaxie: alle Crews brechen von dort auf. */
const spawn = computed<VoyageRoutePoint>(() => generateGalaxyDots(props.record.mapSeed, 1).spawn)

/** Nur LAUFENDE Missionen — eine zurückgekehrte Crew steht wieder am Hafen. */
const travellers = computed(() =>
  props.sites.filter((s) => s.mission && s.mission.status === 'active'),
)

/**
 * Bahn, Etappen und Gesicht einer Reise — EINE Quelle für Linie und Marker.
 * Hängt nicht an der Box: die Umrechnung in Bühnenpixel passiert erst dort, wo
 * sie gebraucht wird.
 */
const voyages = computed(() =>
  travellers.value.map((site) => {
    const mission = site.mission!
    const legs = voyageLegsOf(mission)
    const color =
      EXPEDITION_COLORS.find((c) => c.key === (mission.colorKey ?? 'gold')) ?? EXPEDITION_COLORS[0]
    const crew = mission.assignedChampions
    return {
      key: site.pinKey,
      legs,
      // Der Seed streut die Bögen je Hafen — zwei Reisen zum selben Ziel lägen
      // sonst übereinander.
      nodes: voyageRouteNodesOf(
        spawn.value,
        { x: site.x, y: site.y },
        legs.length,
        Math.round(site.x * 9973 + site.y * 7919) + site.berth * 131,
      ),
      startTime: mission.startTime,
      durationMs: Math.max(1, mission.durationSeconds * 1000),
      color: color.primary,
      line: color.dim,
      glow: color.glowRgb,
      faces: crew.slice(0, VOYAGE_CREW_MARKER_FACES).map((c) => ({
        name: c.name,
        src: battleStore.getChampionImage(c.name, { size: 'sm' }),
      })),
      more: Math.max(0, crew.length - VOYAGE_CREW_MARKER_FACES),
    }
  }),
)

// ── Bahn-Cache ──────────────────────────────────────────────────────────────
// Plain, NICHT reaktiv: der rAF darf weder `box` noch `voyages` pro Frame lesen,
// sonst hängt Reaktivitäts-Tracking in jedem Frame.
interface Track {
  key: string
  nodes: VoyageRoutePoint[]
  legs: VoyageLeg[]
  startTime: number
  durationMs: number
}
let tracks: Track[] = []
const boxCache = { x: 0, y: 0, w: 0, h: 0 }

function rebuildTracks() {
  tracks = voyages.value.map((v) => ({
    key: v.key,
    nodes: v.nodes,
    legs: v.legs,
    startTime: v.startTime,
    durationMs: v.durationMs,
  }))
  boxCache.x = props.box.x
  boxCache.y = props.box.y
  boxCache.w = props.box.w
  boxCache.h = props.box.h
}

/** Die Linie in Bühnenkoordinaten — ein `d` je Reise, ohne Uhr. */
const routes = computed(() => {
  const b = props.box
  return voyages.value.map((v) => {
    const perLeg = Math.max(4, Math.round(VOYAGE_ROUTE_SAMPLES / v.legs.length))
    const d = voyageRouteSamples(v.nodes, perLeg)
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'}${(b.x + p.x * b.w).toFixed(1)} ${(b.y + p.y * b.h).toFixed(1)}`,
      )
      .join(' ')
    return { key: v.key, d, color: v.line }
  })
})

// ── Die eine Schleife ───────────────────────────────────────────────────────
const markerEls = new Map<string, HTMLElement>()
let frame: number | null = null

const reduceMotion =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

function place(now: number) {
  for (const t of tracks) {
    const el = markerEls.get(t.key)
    if (!el) continue
    const p = Math.min(1, Math.max(0, (now - t.startTime) / t.durationMs))
    const pt = voyageRoutePointAt(t.nodes, t.legs, p)
    el.style.transform = `translate3d(${(boxCache.x + pt.x * boxCache.w).toFixed(1)}px, ${(
      boxCache.y +
      pt.y * boxCache.h
    ).toFixed(1)}px, 0)`
  }
}

function tick() {
  // Immer zuerst neu anmelden, dann VOR dem Schreiben aussteigen: ab- und
  // wieder anzumelden kostet mehr als der leere Durchlauf.
  frame = requestAnimationFrame(tick)
  if (!props.visible || isRenderingPaused.value) return
  place(gameNow())
}

function startLoop() {
  if (frame !== null || reduceMotion?.matches) return
  frame = requestAnimationFrame(tick)
}
function stopLoop() {
  if (frame === null) return
  cancelAnimationFrame(frame)
  frame = null
}

const active = computed(() => voyages.value.length > 0)

watch(
  [voyages, () => props.box],
  () => {
    rebuildTracks()
    // Ein frisch gerenderter Marker muss vor dem ersten Paint an seiner Stelle
    // stehen, sonst blitzt er in der Ecke auf.
    nextTick(() => place(gameNow()))
  },
  { immediate: true, deep: false },
)

watch(
  [active, () => props.visible],
  ([hasAny, visible]) => {
    if (hasAny && visible) startLoop()
    else stopLoop()
  },
  { immediate: true },
)

/** Reduzierte Bewegung: keine Schleife, nur der Sekundentakt des Atlas. */
watch(
  () => props.now,
  () => {
    if (reduceMotion?.matches && props.visible) place(gameNow())
  },
)

onMounted(() => nextTick(() => place(gameNow())))
onBeforeUnmount(() => {
  stopLoop()
  markerEls.clear()
})

const face = computed(() =>
  Math.round(
    Math.min(
      VOYAGE_CREW_MARKER_FACE_MAX,
      Math.max(VOYAGE_CREW_MARKER_FACE_MIN, props.plate * VOYAGE_CREW_MARKER_FACE_RATIO),
    ),
  ),
)
const faceSize = computed(() => `${face.value}px`)
const markerSize = computed(() => `${face.value + 8}px`)
const overlap = computed(() => `${-Math.round(face.value * 0.27)}px`)
const pulseMs = `${VOYAGE_CREW_MARKER_PULSE_MS}ms`
</script>

<template>
  <div v-show="active" class="ecml" aria-hidden="true">
    <svg class="ecml-routes" :viewBox="`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`">
      <path
        v-for="r in routes"
        :key="r.key"
        :d="r.d"
        class="ecml-route"
        :style="{ stroke: r.color }"
      />
    </svg>

    <div
      v-for="m in voyages"
      :key="m.key"
      :ref="(el) => setMapEl(markerEls, m.key, el as HTMLElement)"
      class="ecml-marker"
      :style="{ '--cm-c': m.color, '--cm-glow': m.glow }"
    >
      <span class="ecml-body">
        <span class="ecml-pulse" />
        <span class="ecml-faces">
          <img v-for="f in m.faces" :key="f.name" :src="f.src" :alt="''" class="ecml-face" />
          <span v-if="m.more" class="ecml-more">+{{ m.more }}</span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Reine Anzeigeebene: der Klick auf Hafen und Bühnengrund muss überall
   durchkommen. Sie liegt über der Legende, unter dem Datenband und unter den
   anklickbaren Marken — die DOM-Reihenfolge in ExpeditionGalaxyMap entscheidet. */
.ecml {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.ecml-routes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.ecml-route {
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-dasharray: 5 7;
  opacity: 0.62;
}

/* Nullgrosse Hülle wie beim Drifter — der Körper zentriert sich im Kind, der
   Frame schreibt nur `transform` an die Hülle. */
.ecml-marker {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  will-change: transform;
}

/**
 * RUND heisst unterwegs, ECKIG heisst Ort. Die Hafenmarken sind Platten mit
 * Rahmen; wäre der reisende Marker auch eine, sähe die Karte aus, als stünden
 * dort zwei Häfen nebeneinander. Er trägt deshalb keinen eigenen Körper —
 * nur die runden Gesichter mit ihrem Ring.
 */
.ecml-body {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  /* Die Hülle ist 0×0 — ohne `max-content` presst ihr Shrink-to-fit die
     Gesichter auf wenige Pixel zusammen. */
  width: max-content;
  height: v-bind(markerSize);
}

/* Eigene Ebene mit statischem Schein; animiert wird nur ihre opacity. */
.ecml-pulse {
  position: absolute;
  left: 50%;
  top: 50%;
  width: v-bind(markerSize);
  height: v-bind(markerSize);
  margin: calc(v-bind(markerSize) / -2) 0 0 calc(v-bind(markerSize) / -2);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--cm-glow), 0.55) 0%, rgba(var(--cm-glow), 0) 70%);
  animation: ecml-breathe v-bind(pulseMs) ease-in-out infinite;
}
@keyframes ecml-breathe {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 0.7;
  }
}

.ecml-faces {
  position: relative;
  display: flex;
  align-items: center;
}
/* Überlappend statt nebeneinander: eine fünfköpfige Crew bliebe sonst breiter
   als der Hafen, auf den sie zuläuft. */
.ecml-face {
  width: v-bind(faceSize);
  flex-shrink: 0;
  height: v-bind(faceSize);
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 2px solid var(--cm-c);
  background: #14100a;
  box-shadow: 0 0 8px rgba(var(--cm-glow), 0.5);
}
.ecml-face + .ecml-face {
  margin-left: v-bind(overlap);
}
.ecml-more {
  margin-left: -4px;
  padding: 1px 4px;
  font-size: 10px;
  font-weight: 800;
  color: #e8c040;
  background: #14100a;
  border: 1px solid var(--cm-c);
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .ecml-pulse {
    animation: none;
    opacity: 0.4;
  }
}
</style>
