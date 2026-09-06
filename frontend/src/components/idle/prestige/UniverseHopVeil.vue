<script setup lang="ts">
/**
 * Der Schleier des Universumssprungs — und sein Taktgeber.
 *
 * Global, nicht im Profil: das Profil schliesst mitten im Sprung. Drei Ebenen,
 * alle nur transform/opacity: der Dunkelschleier, die Glutscheibe im Ton des
 * Zieluniversums am angeklickten Portal, und der Wash an der Schwelle. Der
 * Flug selbst faehrt auf dem Sternfeld-Canvas (utils/orbit/universeHop.ts).
 *
 * Gate: der Schleier deckt zu, das Licht schwillt vom Portal bis in die
 * fernste Ecke. Am `animationend` schliesst er das Profil (darunter, unsichtbar),
 * sperrt es, schaltet die Phase auf `flight` — die Sternschleife laeuft an und
 * startet die Maschine — und wartet die Anlauf- und Setzframes, ehe er hebt.
 * Ruhezustand ist TRANSPARENT: eine Zeremonie mit Ende, deshalb in der
 * `.rendering-paused`-Whitelist von App.vue (anders als der Dive-Schleier).
 *
 * Nur Wanduhr, nichts hier aendert Spielzustand — bis auf das Netz: kommt die
 * Schleife nie an (Fenster ohne Fokus), beendet `finishUniverseHop` den Sprung.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useGameStore } from '@/stores/core/gameStore'
import {
  FIRMAMENT_DIVE_EASE_ARRIVE,
  FIRMAMENT_DIVE_EASE_LEAVE,
  FIRMAMENT_DIVE_GLOW_ALPHA,
  FIRMAMENT_DIVE_GLOW_PAST,
  FIRMAMENT_DIVE_GLOW_PX,
  FIRMAMENT_DIVE_GLOW_SEED,
  IDLE_RESUME_DELAY_FRAMES,
  UNIVERSE_HOP_GATE_LIFT_MS,
  UNIVERSE_HOP_GATE_MS,
  UNIVERSE_HOP_WASH_ALPHA,
  UNIVERSE_HOP_WASH_MS,
  UNIVERSE_HOP_WASH_PEAK,
  VOYAGE_LOADER_SETTLE_FRAMES,
} from '@/config/constants'
import { UNIVERSE_HOP_TOTAL_MS } from '@/utils/orbit/universeHop'

const HUD_OUT_CLASS = 'uhop-hud-out'
const HUD_IN_CLASS = 'uhop-hud-in'

const uiStore = useUiStore()
const gameStore = useGameStore()

const hop = computed(() => uiStore.universeHop)
const phase = computed(() => hop.value?.phase ?? 'gate')

const lifting = ref(false)
const veilGone = ref(false)
const washKey = ref(0)
const washDone = ref(false)
/** `cover` skaliert die Glutscheibe bis zur fernsten Ecke. */
const spot = ref({ x: 0, y: 0, cover: 1 })

const stage = computed(() =>
  veilGone.value ? 'gone' : lifting.value ? 'lift' : phase.value === 'gate' ? 'gate' : 'hold',
)

let gateTimer: ReturnType<typeof setTimeout> | null = null
let flightNet: ReturnType<typeof setTimeout> | null = null
let settleFrame: number | null = null
let gateEnded = false

function clearAll() {
  if (gateTimer !== null) clearTimeout(gateTimer)
  if (flightNet !== null) clearTimeout(flightNet)
  if (settleFrame !== null) cancelAnimationFrame(settleFrame)
  gateTimer = flightNet = settleFrame = null
}

function setHudClasses(out: boolean, inn: boolean) {
  const cl = document.documentElement.classList
  cl.toggle(HUD_OUT_CLASS, out)
  cl.toggle(HUD_IN_CLASS, inn)
}

function measure() {
  const h = hop.value
  if (!h) return
  const w = window.innerWidth
  const vh = window.innerHeight
  const far = Math.hypot(Math.max(h.x, w - h.x), Math.max(h.y, vh - h.y))
  spot.value = { x: h.x, y: h.y, cover: (2 * far) / FIRMAMENT_DIVE_GLOW_PX }
}

/**
 * Der Umschaltmoment haengt am ENDE der Schleier-Animation, nicht an einem
 * Timer — bei 90 % Deckung saehe man den Reiter einen Frame lang verschwinden.
 * Der Timer bleibt als Netz, doppelt so lang.
 */
function onGateEnd() {
  if (gateEnded || !hop.value) return
  gateEnded = true
  if (gateTimer !== null) clearTimeout(gateTimer)
  gateTimer = null
  uiStore.closeBardModal()
  uiStore.setBardModalLocked(true)
  uiStore.setUniverseHopPhase('flight')
  // Die Schleife laeuft erst IDLE_RESUME_DELAY_FRAMES nach dem Schliessen
  // wieder an; danach setzen sich Maschine und Sprites, ehe der Schleier hebt.
  let left = IDLE_RESUME_DELAY_FRAMES + VOYAGE_LOADER_SETTLE_FRAMES
  const step = () => {
    if (left > 0) {
      left--
      settleFrame = requestAnimationFrame(step)
      return
    }
    settleFrame = null
    lifting.value = true
  }
  step()
  flightNet = setTimeout(() => {
    flightNet = null
    gameStore.finishUniverseHop()
  }, UNIVERSE_HOP_TOTAL_MS * 2)
}

function onWashAnimationEnd(e: AnimationEvent) {
  if (e.animationName.includes('uhop-wash-out')) washDone.value = true
}

function onVeilAnimationEnd() {
  if (stage.value === 'gate') onGateEnd()
  else if (stage.value === 'lift') veilGone.value = true
}

function run() {
  clearAll()
  gateEnded = false
  lifting.value = false
  veilGone.value = false
  washKey.value = 0
  washDone.value = false
  measure()
  setHudClasses(true, false)
  gateTimer = setTimeout(onGateEnd, UNIVERSE_HOP_GATE_MS * 2)
}

function end() {
  clearAll()
  setHudClasses(false, false)
}

watch(
  () => hop.value?.target ?? null,
  (target) => (target === null ? end() : run()),
  { immediate: true },
)

watch(phase, (p) => {
  if (p === 'threshold') {
    washDone.value = false
    washKey.value++
  } else if (p === 'arrive') {
    setHudClasses(false, true)
  }
})

onUnmounted(end)

const glowStyle = computed(() => ({
  left: `${spot.value.x}px`,
  top: `${spot.value.y}px`,
  '--uhop-cover': String(spot.value.cover),
  '--uhop-accent': hop.value?.accent ?? '#ffffff',
}))
const washStyle = computed(() => ({ backgroundColor: hop.value?.accent ?? '#ffffff' }))

const glowPx = `${FIRMAMENT_DIVE_GLOW_PX}px`
const glowHalf = `${-FIRMAMENT_DIVE_GLOW_PX / 2}px`
const glowAlpha = String(FIRMAMENT_DIVE_GLOW_ALPHA)
const glowSeed = String(FIRMAMENT_DIVE_GLOW_SEED)
const glowPast = String(FIRMAMENT_DIVE_GLOW_PAST)
const gateDur = `${UNIVERSE_HOP_GATE_MS}ms`
const liftDur = `${UNIVERSE_HOP_GATE_LIFT_MS}ms`
// Zwei Animationen statt eines Keyframe-Prozents: v-bind() kann kein Selektor sein.
const washInMs = Math.round(UNIVERSE_HOP_WASH_PEAK * UNIVERSE_HOP_WASH_MS)
const washInDur = `${washInMs}ms`
const washOutDur = `${UNIVERSE_HOP_WASH_MS - washInMs}ms`
const washAlpha = String(UNIVERSE_HOP_WASH_ALPHA)
const easeLeave = FIRMAMENT_DIVE_EASE_LEAVE
const easeArrive = FIRMAMENT_DIVE_EASE_ARRIVE
</script>

<template>
  <Teleport to="body">
    <div v-if="hop" class="uhop" :class="`uhop--${stage}`" aria-hidden="true">
      <div v-if="!veilGone" class="uhop-veil" @animationend="onVeilAnimationEnd" />
      <div v-if="!veilGone" class="uhop-glow" :style="glowStyle" />
      <div
        v-if="washKey > 0 && !washDone"
        :key="washKey"
        class="uhop-wash"
        :style="washStyle"
        @animationend="onWashAnimationEnd"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.uhop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
  pointer-events: none;
}

/* Ruhend transparent — siehe Kopf. Zwischen Gate und Heben haelt `hold`. */
.uhop-veil {
  position: absolute;
  inset: 0;
  background: #05050b;
  opacity: 0;
}
.uhop--gate .uhop-veil {
  animation: uhop-veil-in v-bind(gateDur) v-bind(easeLeave) both;
}
.uhop--hold .uhop-veil {
  opacity: 1;
}
.uhop--lift .uhop-veil {
  animation: uhop-veil-out v-bind(liftDur) v-bind(easeArrive) forwards;
}
@keyframes uhop-veil-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes uhop-veil-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* Statischer Verlauf; bewegt werden nur transform und opacity. */
.uhop-glow {
  position: absolute;
  width: v-bind(glowPx);
  height: v-bind(glowPx);
  margin: v-bind(glowHalf) 0 0 v-bind(glowHalf);
  border-radius: 50%;
  background: radial-gradient(circle, var(--uhop-accent) 0%, transparent 70%);
  opacity: 0;
}
.uhop--gate .uhop-glow {
  animation: uhop-glow-in v-bind(gateDur) v-bind(easeLeave) both;
}
.uhop--hold .uhop-glow {
  transform: scale(var(--uhop-cover, 1));
  opacity: v-bind(glowAlpha);
}
.uhop--lift .uhop-glow {
  animation: uhop-glow-past v-bind(liftDur) v-bind(easeArrive) forwards;
}
@keyframes uhop-glow-in {
  from {
    transform: scale(v-bind(glowSeed));
    opacity: 0;
  }
  to {
    transform: scale(var(--uhop-cover, 1));
    opacity: v-bind(glowAlpha);
  }
}
@keyframes uhop-glow-past {
  from {
    transform: scale(var(--uhop-cover, 1));
    opacity: v-bind(glowAlpha);
  }
  to {
    transform: scale(calc(var(--uhop-cover, 1) * v-bind(glowPast)));
    opacity: 0;
  }
}

/* Der Wash an der Schwelle: im Zielton, kein Weiss. Verlaesst das DOM am Ende. */
.uhop-wash {
  position: absolute;
  inset: 0;
  opacity: 0;
  animation:
    uhop-wash-in v-bind(washInDur) ease-out forwards,
    uhop-wash-out v-bind(washOutDur) ease-out v-bind(washInDur) forwards;
}
@keyframes uhop-wash-in {
  from {
    opacity: 0;
  }
  to {
    opacity: v-bind(washAlpha);
  }
}
@keyframes uhop-wash-out {
  from {
    opacity: v-bind(washAlpha);
  }
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .uhop-veil,
  .uhop-glow,
  .uhop-wash {
    animation: none;
  }
}
</style>
