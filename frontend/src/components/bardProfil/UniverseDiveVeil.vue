<script setup lang="ts">
/**
 * Der Schleier der Kamerafahrt Universe ⇄ Galaxy — und ihr Taktgeber.
 *
 * Er liegt als Geschwister ueber den Tab-Layern des Profils und traegt zwei
 * Ebenen: den Dunkelschleier und die Lichtscheibe in der Farbe der Galaxie,
 * in die man faehrt. Phase `out`: der Quellreiter zoomt (das tut er selbst),
 * hier deckt der Schleier zu und das Licht schwillt vom Fahrtpunkt bis in die
 * fernste Ecke. Dann schaltet dieser Schleier den Reiter — und wartet
 * VOYAGE_LOADER_SETTLE_FRAMES, bis die Zielplatte gemalt ist, ehe Phase `in`
 * ihn fallen laesst. Ein Timer haette den 472-ms-Erstframe des Atlas
 * uebersprungen; ein rAF feuert erst, wenn der Browser wieder rendert.
 * Geschaltet wird am `animationend` des Schleiers — dann deckt er GENAU.
 *
 * Ruhezustand des Schleiers ist DECKEND: friert `.rendering-paused` ihn ein,
 * steht Schwarz, nie ein halber Reiter. Deshalb steht er nicht in der
 * Whitelist von App.vue — anders als der Hyperspace, dessen Blitz auf Timern
 * lag, haengt hier der Fall am Frame.
 *
 * Wanduhr, nicht Spieluhr: alles hier ist reine Anzeige.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import {
  UNIVERSE_MAP_DIVE_ARRIVE_MS,
  UNIVERSE_MAP_DIVE_EASE_ARRIVE,
  UNIVERSE_MAP_DIVE_EASE_LEAVE,
  UNIVERSE_MAP_DIVE_GLOW_ALPHA,
  UNIVERSE_MAP_DIVE_GLOW_PAST,
  UNIVERSE_MAP_DIVE_GLOW_PX,
  UNIVERSE_MAP_DIVE_GLOW_SEED,
  UNIVERSE_MAP_DIVE_LEAVE_MS,
  UNIVERSE_MAP_FREED_COLOR,
  VOYAGE_LOADER_SETTLE_FRAMES,
} from '@/config/constants'

const uiStore = useUiStore()
const root = ref<HTMLElement | null>(null)
/** Fahrtpunkt im eigenen Rechteck; `cover` skaliert die Scheibe bis zur fernsten Ecke. */
const spot = ref({ x: 0, y: 0, cover: 1 })

const phase = computed(() => uiStore.universeDive?.phase ?? 'out')
const toward = computed(() => uiStore.universeDive?.toward ?? 'atlas')

let leaveTimer: ReturnType<typeof setTimeout> | null = null
let arriveTimer: ReturnType<typeof setTimeout> | null = null
let settleFrame: number | null = null

function clearAll() {
  if (leaveTimer !== null) clearTimeout(leaveTimer)
  if (arriveTimer !== null) clearTimeout(arriveTimer)
  if (settleFrame !== null) cancelAnimationFrame(settleFrame)
  leaveTimer = arriveTimer = settleFrame = null
}

function measure() {
  const d = uiStore.universeDive
  const r = root.value?.getBoundingClientRect()
  if (!d || !r) return
  const x = d.x - r.left
  const y = d.y - r.top
  const far = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y))
  spot.value = { x, y, cover: (2 * far) / UNIVERSE_MAP_DIVE_GLOW_PX }
}

/** Reiter schalten — nur, wenn die Fahrt noch steht und der Quellreiter noch offen ist. */
function switchTab() {
  const d = uiStore.universeDive
  if (!d) return false
  if (d.toward === 'atlas') {
    if (uiStore.bardActiveTab !== 'universe') return false
    uiStore.requestOpenGalaxyFromUniverse(d.galaxy)
  } else {
    if (uiStore.bardActiveTab !== 'galaxy') return false
    uiStore.returnToUniverseTab(d.galaxy)
  }
  return true
}

/**
 * Der Umschaltmoment haengt am ENDE der Schleier-Animation, nicht an einem
 * Timer: die Animation startet bis zu einen Frame nach dem Timer, und ein
 * Reiterwechsel bei 90 % Deckung zeigte den neuen Reiter einen Frame lang
 * durch. Der Timer bleibt als Netz — doppelt so lang, falls kein `animationend`
 * kommt (Ebene unsichtbar, Animationen aus).
 */
function onLeaveEnd() {
  if (leaveTimer === null) return
  clearTimeout(leaveTimer)
  leaveTimer = null
  if (!switchTab()) return
  let left = VOYAGE_LOADER_SETTLE_FRAMES
  const step = () => {
    if (left > 0) {
      left--
      settleFrame = requestAnimationFrame(step)
      return
    }
    settleFrame = null
    uiStore.settleUniverseDive()
    // setTimeout, nicht gameTimeout(): reine Anzeige.
    arriveTimer = setTimeout(() => {
      arriveTimer = null
      uiStore.clearUniverseDive()
    }, UNIVERSE_MAP_DIVE_ARRIVE_MS)
  }
  step()
}

function run() {
  clearAll()
  measure()
  leaveTimer = setTimeout(onLeaveEnd, UNIVERSE_MAP_DIVE_LEAVE_MS * 2)
}

onMounted(run)
watch(
  () => (uiStore.universeDive ? `${uiStore.universeDive.toward}:${uiStore.universeDive.galaxy}` : null),
  (key) => (key === null ? clearAll() : run()),
)
// Der Zielreiter ankert nach — das Licht folgt ihm.
watch(() => [uiStore.universeDive?.x, uiStore.universeDive?.y], measure)
onUnmounted(clearAll)

const glowStyle = computed(() => ({
  left: `${spot.value.x}px`,
  top: `${spot.value.y}px`,
  '--udv-cover': String(spot.value.cover),
  '--udv-accent': uiStore.universeDive?.accent ?? UNIVERSE_MAP_FREED_COLOR,
}))

const glowPx = `${UNIVERSE_MAP_DIVE_GLOW_PX}px`
const glowHalf = `${-UNIVERSE_MAP_DIVE_GLOW_PX / 2}px`
const glowAlpha = String(UNIVERSE_MAP_DIVE_GLOW_ALPHA)
const glowSeed = String(UNIVERSE_MAP_DIVE_GLOW_SEED)
const glowPast = String(UNIVERSE_MAP_DIVE_GLOW_PAST)
const leaveDur = `${UNIVERSE_MAP_DIVE_LEAVE_MS}ms`
const arriveDur = `${UNIVERSE_MAP_DIVE_ARRIVE_MS}ms`
const easeLeave = UNIVERSE_MAP_DIVE_EASE_LEAVE
const easeArrive = UNIVERSE_MAP_DIVE_EASE_ARRIVE
</script>

<template>
  <div ref="root" class="udv" :class="[`udv--${phase}`, `udv--to-${toward}`]" aria-hidden="true">
    <div class="udv-veil" @animationend="phase === 'out' && onLeaveEnd()" />
    <div class="udv-glow" :style="glowStyle" />
  </div>
</template>

<style scoped>
.udv {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

/* Ruhend DECKEND — siehe Kopf. */
.udv-veil {
  position: absolute;
  inset: 0;
  background: #05050b;
  opacity: 1;
}
.udv--out .udv-veil {
  animation: udv-veil-in v-bind(leaveDur) v-bind(easeLeave) both;
}
.udv--in .udv-veil {
  animation: udv-veil-out v-bind(arriveDur) v-bind(easeArrive) forwards;
}
@keyframes udv-veil-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes udv-veil-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* Statischer Verlauf; bewegt werden nur transform und opacity. */
.udv-glow {
  position: absolute;
  width: v-bind(glowPx);
  height: v-bind(glowPx);
  margin: v-bind(glowHalf) 0 0 v-bind(glowHalf);
  border-radius: 50%;
  background: radial-gradient(circle, var(--udv-accent) 0%, transparent 70%);
  opacity: 0;
}
.udv--out .udv-glow {
  animation: udv-glow-in v-bind(leaveDur) v-bind(easeLeave) both;
}
/* Nach dem Durchgang waechst das Licht weiter und verblasst … */
.udv--in.udv--to-atlas .udv-glow {
  animation: udv-glow-past v-bind(arriveDur) v-bind(easeArrive) forwards;
}
/* … beim Rueckweg faellt es in den Knoten zurueck. */
.udv--in.udv--to-universe .udv-glow {
  animation: udv-glow-back v-bind(arriveDur) v-bind(easeArrive) forwards;
}
@keyframes udv-glow-in {
  from {
    transform: scale(v-bind(glowSeed));
    opacity: 0;
  }
  to {
    transform: scale(var(--udv-cover, 1));
    opacity: v-bind(glowAlpha);
  }
}
@keyframes udv-glow-past {
  from {
    transform: scale(var(--udv-cover, 1));
    opacity: v-bind(glowAlpha);
  }
  to {
    transform: scale(calc(var(--udv-cover, 1) * v-bind(glowPast)));
    opacity: 0;
  }
}
@keyframes udv-glow-back {
  from {
    transform: scale(var(--udv-cover, 1));
    opacity: v-bind(glowAlpha);
  }
  to {
    transform: scale(v-bind(glowSeed));
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .udv-veil,
  .udv-glow {
    animation: none;
  }
}
</style>
