<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  PLANET_TAB_SUN_MIN_DIAMETER,
  PLANET_TAB_SUN_MAX_DIAMETER,
  PLANET_TAB_PLANET_DIAMETER,
  PLANET_TAB_RAIL_WIDTH_CSS,
  PLANET_TAB_RAIL_SEAM_WIDTH,
  HP_BAR_SEGMENTS,
} from '@/config/constants'
import { usePlanetTabOrbit } from '@/composables/orbit/usePlanetTabOrbit'
import { useActionToast } from '@/composables/ui/useActionToast'
import BattleReturnButton from '@/components/bardProfil/BattleReturnButton.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import PlanetRailSlot from './PlanetRailSlot.vue'
import PlanetLockedPanel from './PlanetLockedPanel.vue'
import PlanetRoleChoicePanel from './PlanetRoleChoicePanel.vue'
import PlanetStagePanel from './PlanetStagePanel.vue'

/**
 * Der Action-Toast steht über allen Tabs und zentriert deshalb im ganzen Modal.
 * Hier soll er in der BÜHNE stehen, nicht neben ihr — also meldet der Tab, wie
 * breit seine rechte Schiene ist, und die Menü-Ebene rückt die Karte darum ein.
 * Der Wert ändert sich nie, ein einziges Mal beim Aufbau genügt.
 */
const emit = defineEmits<{ 'toast-inset': [css: string] }>()

/** Schienenbreite und Naht kommen aus der Konstante — dieselben Werte gehen an
 *  den Toast, damit die beiden nicht auseinanderlaufen können. */
const railWidthCss = PLANET_TAB_RAIL_WIDTH_CSS
const railSeamWidthPx = `${PLANET_TAB_RAIL_SEAM_WIDTH}px`

onMounted(() =>
  emit('toast-inset', `calc(${PLANET_TAB_RAIL_WIDTH_CSS} + ${PLANET_TAB_RAIL_SEAM_WIDTH}px)`),
)

const uiStore = useUiStore()
const store = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()
const { showToast } = useActionToast()

/** Sichtbar = dieser Tab ist der offene. Steuert Uhr und Orbit-Schleife, die
 *  beide früher an der Lebensdauer der Komponente hingen. */
const isVisible = computed(() => uiStore.bardActiveTab === 'planets')

// ── Slot-Auswahl ───────────────────────────────────────────────────────────
const selectedSlotId = ref<string | null>(null)

function initSlot() {
  selectedSlotId.value =
    uiStore.planetActiveSlotId ??
    store.slots.find((s) => s.purchased)?.id ??
    store.slots[0]?.id ??
    null
  // Auch die abgeleitete Erst-Auswahl wandert in den Store: das Command Panel
  // markiert dieselbe Kachel und darf dafür nicht auf den ersten Klick warten.
  if (selectedSlotId.value) uiStore.setPlanetActiveSlot(selectedSlotId.value)
}

onMounted(initSlot)

watch(
  () => uiStore.planetActiveSlotId,
  (id) => {
    if (id) selectedSlotId.value = id
  },
)

function selectSlot(id: string) {
  selectedSlotId.value = id
  uiStore.setPlanetActiveSlot(id)
}

const activeSlot = computed(
  () => store.slots.find((s) => s.id === selectedSlotId.value) ?? null,
)
const activeSlotIndex = computed(() => store.slots.findIndex((s) => s.id === selectedSlotId.value))

// ── Orbit-Spiegelung ───────────────────────────────────────────────────────
// Eine einzige rAF-Schleife versorgt Rail-Kacheln und Bühne, damit beide im
// selben Frame umschalten wie das Command Panel.
const stageRef = ref<InstanceType<typeof PlanetStagePanel> | null>(null)
const { orbitBehind, isSlotEclipsed, orbitPhaseStyle } = usePlanetTabOrbit(
  selectedSlotId,
  () => stageRef.value?.orbitEl ?? null,
  isVisible,
)

// ── Gemeinsame Uhr für alle Countdowns (Buff-Dauer, Respawn) ───────────────
/**
 * Läuft nur, solange der Tab auch zu sehen ist. Er wird nach dem ersten Öffnen
 * nicht mehr abgerissen (siehe BardProfileMenu), ein an die Lebensdauer
 * gebundenes Intervall tickte sonst für immer weiter — mitsamt der Countdowns,
 * die es neu berechnen lässt, während niemand hinsieht.
 */
const now = ref(Date.now())
let nowInterval = 0

function startClock() {
  if (nowInterval) return
  now.value = Date.now()
  nowInterval = window.setInterval(() => {
    now.value = Date.now()
  }, 500)
}

function stopClock() {
  if (!nowInterval) return
  window.clearInterval(nowInterval)
  nowInterval = 0
}

watch(isVisible, (visible) => {
  if (visible) {
    // Beim Betreten dieselbe Ableitung wie früher beim Mount — der Store kann
    // inzwischen eine andere Kachel angefragt haben.
    initSlot()
    startClock()
  } else {
    stopClock()
  }
})

onMounted(() => {
  if (isVisible.value) startClock()
})
onUnmounted(stopClock)

const jungleBuffSecsLeft = computed(() => {
  const jb = activeSlot.value?.jungleBuff
  if (!jb?.active) return 0
  return Math.max(0, Math.ceil((jb.activeUntil - now.value) / 1000))
})

function buySlot(slotId: string) {
  store.buySlot(slotId)
  showToast('Planet orbit slot unlocked!', 'unlock')
}

// Current Sun-Phase colors for the stage backdrop sun (mirrors SunComponent vars).
const sunPhaseStyle = computed(() => {
  if (solarStore.isCometState) {
    return {
      '--phase-core': COMET_PHASE_DATA.core,
      '--phase-mid': COMET_PHASE_DATA.mid,
      '--phase-edge': COMET_PHASE_DATA.edge,
      '--phase-primary': COMET_PHASE_DATA.accent,
      '--phase-glow': COMET_PHASE_DATA.glow,
      '--pulse-speed': COMET_PHASE_DATA.pulseSpeed,
      '--ps-sun-d': `${PLANET_TAB_SUN_MIN_DIAMETER}px`,
      '--ps-planet-d': `${PLANET_TAB_PLANET_DIAMETER}px`,
    }
  }
  const phase = STAR_PHASE_DATA[store.currentSunStage] ?? STAR_PHASE_DATA[0]
  // Scale the stage sun proportionally to the real Sun-Phase radius (the same
  // value SunComponent uses), normalized over the data's own min/max so it adapts
  // if phases change, then mapped into a safe diameter band that keeps the fixed
  // orbit framed by the sun.
  const radii = STAR_PHASE_DATA.map((p) => p.radius)
  const minR = Math.min(...radii)
  const maxR = Math.max(...radii)
  const t = maxR === minR ? 0 : (phase.radius - minR) / (maxR - minR)
  const sunD =
    PLANET_TAB_SUN_MIN_DIAMETER + t * (PLANET_TAB_SUN_MAX_DIAMETER - PLANET_TAB_SUN_MIN_DIAMETER)
  return {
    '--phase-core': phase.core,
    '--phase-mid': phase.mid,
    '--phase-edge': phase.edge,
    '--phase-primary': phase.phasePrimary,
    '--phase-glow': phase.phaseGlow,
    '--pulse-speed': phase.pulseSpeed,
    '--ps-sun-d': `${Math.round(sunD)}px`,
    '--ps-planet-d': `${PLANET_TAB_PLANET_DIAMETER}px`,
  }
})
</script>

<template>
  <div class="ps-tab" :style="[{ '--hp-seg': HP_BAR_SEGMENTS }, sunPhaseStyle]">
    <!-- Cosmic backdrop of the tab. The rail covers its own share of it with a
         solid panel, so what is left of the starfield is what the stage shows —
         which is where it belongs. The phase vars live on this root, so the near
         stars still carry the sun's tint. -->
    <CosmicStageBackground />

    <!-- Full-height split: left stage + right slot rail — the same hand the team
         tab plays, where the board sits left and its details page right. The tabs
         of one profile must not mirror each other.
         No in-tab header — Chimes/CPS live permanently in the global app header. -->
    <div class="ps-split">
      <!-- LEFT DETAIL ──────────────────────────────────────────────── -->
      <!-- sunPhaseStyle stays on the wrapper too: the stage's own children read
           --ps-sun-d / --phase-* from here. -->
      <div class="ps-detail" :style="sunPhaseStyle">
        <!-- Jungle-buff takeover: while the selected slot is buffed the whole
             detail panel is rimmed with an animated emerald veil and a bold,
             centered banner reads out the active buff + remaining duration. -->
        <Transition name="ps-buff-veil">
          <div v-if="activeSlot?.jungleBuff?.active" class="ps-buff-overlay" aria-hidden="true">
            <span class="ps-buff-veil-edge" />
            <div class="ps-buff-banner">
              <span class="ps-buff-banner-emblem">
                <img class="ps-buff-banner-leaf" src="/img/roles/jungle-128.png" alt="" />
              </span>
              <div class="ps-buff-banner-text">
                <span class="ps-buff-banner-kicker">Jungle Buff</span>
                <span class="ps-buff-banner-name">{{ activeSlot.jungleBuff.buffType }}</span>
                <span class="ps-buff-banner-mult"
                  >×{{ activeSlot.jungleBuff.multiplier }} power</span
                >
              </div>
              <div class="ps-buff-banner-timer">
                <span class="ps-buff-banner-secs">{{ jungleBuffSecsLeft }}</span>
                <span class="ps-buff-banner-unit">sec left</span>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Drei Slot-Zustände: versiegelt → Rollenwahl → bespielte Bühne -->
        <PlanetLockedPanel
          v-if="activeSlot && !activeSlot.purchased"
          :planet="activeSlot"
          :slot-index="activeSlotIndex"
          @buy="buySlot"
        />

        <PlanetRoleChoicePanel
          v-else-if="activeSlot && activeSlot.purchased && !activeSlot.role"
          :slot-id="activeSlot.id"
        />

        <PlanetStagePanel
          v-else-if="activeSlot && activeSlot.purchased && activeSlot.role"
          ref="stageRef"
          :planet="activeSlot"
          :orbit-behind="orbitBehind"
          :orbit-phase-style="orbitPhaseStyle"
          :phase-style="sunPhaseStyle"
          :now="now"
        />

        <!-- Return-to-Star-Fight CTA — floats bottom-right, available in every
             slot state; only visible while the jumped-from star fight is live. -->
        <BattleReturnButton />
      </div>

      <!-- Gold seam — the only hard edge between stage and rail. It stands in for
           the team page's plain wooden border-left: same job, this tab's own
           language. -->
      <span class="ps-rail-seam" aria-hidden="true" />

      <!-- RIGHT RAIL ──────────────────────────────────────────────── -->
      <div class="ps-rail">
        <PlanetRailSlot
          v-for="(slot, slotIndex) in store.slots"
          :key="slot.id"
          :planet="slot"
          :slot-index="slotIndex"
          :selected="selectedSlotId === slot.id"
          :eclipsed="isSlotEclipsed(slot)"
          :now="now"
          @select="selectSlot"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────────── */
.ps-tab {
  position: relative;
  height: 100%;
  overflow: hidden;
  /* Deep-space base for the shared starfield — one surface for the WHOLE tab,
     rail included. Everything above it is layered with z-index. */
  background: #0b0a06;
  display: flex;
  flex-direction: column;
}

/* Depth wash over the shared starfield: a warm bloom bleeding out of the sun's
   side and a cold counter-tone in the far corner. Flat radial tints only — no
   blur, no texture. */
.ps-tab::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /* Anchors follow the stage, which now sits left — the bloom belongs on the
     sun's side, and the two cold/warm corner tones on the far one. */
  background:
    radial-gradient(
      110% 90% at 38% 42%,
      color-mix(in srgb, var(--phase-glow, #ff8c42) 12%, transparent) 0%,
      transparent 62%
    ),
    radial-gradient(80% 70% at 100% 100%, rgba(46, 34, 96, 0.22) 0%, transparent 64%),
    radial-gradient(70% 60% at 96% 0%, rgba(92, 51, 16, 0.2) 0%, transparent 60%);
}

/* ── Split layout (full height, no header) ─────────────────────────────────── */
.ps-split {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Right rail: 6 slots filling the full column height — the seat the team tab
   gives its details page, and now the same surface too.
 *
 * COLOUR: the flat deep base (--rpg-bg-deep), not the old translucent scrim. The
 * scrim let the shared starfield through, which read as a second kind of space
 * next to every other panel of the profile; the stage keeps that starfield and
 * the rail is now plainly a panel on it. Width is unchanged.
 *
 * LAYER: `position: relative` + z-index is what makes the opacity count — the
 * tab's .cosmic-stage-bg is absolutely positioned at z-index 0 and would
 * otherwise paint OVER a static panel however opaque its background is (same
 * trap the team page documents on .sdp-panel). */
.ps-rail {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: v-bind(railWidthCss);
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.8vh, 12px);
  padding: clamp(8px, 1vh, 14px);
  background: var(--rpg-bg-deep, #111008);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* Vertical gold seam — same language as the modal goldline, turned 90°. Sits as
   its own flex item so the rail can scroll without dragging it along. */
.ps-rail-seam {
  position: relative;
  z-index: 2;
  flex: 0 0 v-bind(railSeamWidthPx);
  align-self: stretch;
  background: linear-gradient(
    to bottom,
    #5c3310,
    #c89040 16%,
    #e8c060 50%,
    #c89040 84%,
    #5c3310
  );
  box-shadow:
    0 0 14px rgba(200, 144, 64, 0.35),
    0 0 3px rgba(232, 192, 96, 0.6);
}

/* Left detail panel — column layout: stage (flexible, dominates) on top +
   compact horizontal upgrade dock pinned to the bottom. The sun system gets
   the full remaining width AND height, so it stays the visual hero. */
.ps-detail {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.ps-rail::-webkit-scrollbar,
.ps-detail::-webkit-scrollbar {
  width: 6px;
}

.ps-rail::-webkit-scrollbar-track,
.ps-detail::-webkit-scrollbar-track {
  background: #111;
}

.ps-rail::-webkit-scrollbar-thumb,
.ps-detail::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 3px;
}

/* Star-fight return CTA floats in the bottom-right corner (footer is gone), clear
   of the bottom-center hero. Overrides the component's default centered anchor. */
.ps-detail :deep(.brb) {
  left: auto;
  right: clamp(14px, 1.5vw, 28px);
  bottom: clamp(14px, 1.6vh, 26px);
  transform: none;
}

.ps-detail :deep(.brb:hover) {
  transform: translateY(-1px);
}

.ps-detail :deep(.brb:active) {
  transform: scale(0.97);
}

.ps-detail :deep(.brb-slide-enter-from),
.ps-detail :deep(.brb-slide-leave-to) {
  transform: translateY(12px);
}

/* ── Narrow-window fallback ─────────────────────────────────────────────────── */
/* Below common desktop widths the three dock zones would squeeze each other —
   stack them and let the detail column scroll while the stage keeps a sane
   minimum height. */
@media (max-width: 950px) {
  .ps-detail {
    overflow-y: auto;
  }
}

/* ── Jungle Buff — full-panel takeover (edge veil + centered banner) ─────────── */
/* Overlay fills the whole detail panel but never eats clicks: pointer-events are
   off, so the upgrade dock underneath stays fully usable. */
.ps-buff-overlay {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

/* Emerald rim veil — dense at the border, fully transparent through the middle
   so the sun + orbiting planet read cleanly. A pulsing inset glow + a soft edge
   wash sell the "charged" state. */
.ps-buff-veil-edge {
  position: absolute;
  inset: 0;
  border: 2px solid #5ce66a;
  background: radial-gradient(
    118% 92% at 50% 50%,
    transparent 52%,
    rgba(92, 230, 106, 0.06) 74%,
    rgba(92, 230, 106, 0.16) 90%,
    rgba(92, 230, 106, 0.28) 100%
  );
  box-shadow:
    inset 0 0 6px 1px rgba(92, 230, 106, 0.4),
    inset 0 0 55px 8px rgba(92, 230, 106, 0.16),
    inset 0 0 120px 26px rgba(92, 230, 106, 0.1);
  animation: ps-buff-veil-pulse 2.2s ease-in-out infinite;
}

/* Centered top banner — bold, high-contrast, readable across every desktop res. */
.ps-buff-banner {
  position: absolute;
  top: clamp(12px, 2.4vh, 26px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: clamp(10px, 1vw, 16px);
  padding: clamp(7px, 0.9vh, 12px) clamp(14px, 1.1vw, 22px) clamp(7px, 0.9vh, 12px)
    clamp(9px, 0.8vw, 14px);
  background: linear-gradient(135deg, #163d20 0%, #0a1a0e 100%);
  border: 2px solid #5ce66a;
  border-radius: 5px;
  box-shadow:
    0 6px 22px rgba(0, 0, 0, 0.6),
    0 0 22px rgba(92, 230, 106, 0.4),
    inset 0 1px 0 rgba(160, 240, 128, 0.35);
  white-space: nowrap;
}

/* Framed leaf emblem */
.ps-buff-banner-emblem {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(38px, 4.4vh, 56px);
  height: clamp(38px, 4.4vh, 56px);
  background: radial-gradient(circle at 50% 36%, #1e4425 0%, #0a180d 100%);
  border: 1px solid #5ce66a;
  border-radius: 5px;
  box-shadow: inset 0 0 10px rgba(92, 230, 106, 0.35);
}

.ps-buff-banner-leaf {
  width: 78%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 0 5px rgba(92, 230, 106, 0.8));
}

.ps-buff-banner-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.1;
}

.ps-buff-banner-kicker {
  font-size: clamp(0.6rem, 1.1vh, 0.78rem);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7fdc8f;
}

.ps-buff-banner-name {
  font-size: clamp(1.05rem, 2vh, 1.55rem);
  font-weight: 900;
  letter-spacing: 0.01em;
  color: #eafff0;
  text-shadow: 0 0 10px rgba(92, 230, 106, 0.55);
}

.ps-buff-banner-mult {
  font-size: clamp(0.72rem, 1.25vh, 0.92rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #5ce66a;
}

/* Big countdown block — the "how long is left" the request calls out. */
.ps-buff-banner-timer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: clamp(52px, 5vw, 76px);
  margin-left: clamp(2px, 0.4vw, 8px);
  padding: clamp(3px, 0.5vh, 7px) clamp(8px, 0.7vw, 12px);
  background: rgba(6, 20, 10, 0.72);
  border: 1px solid #3a8040;
  border-radius: 5px;
}

.ps-buff-banner-secs {
  font-size: clamp(1.35rem, 2.9vh, 2.1rem);
  font-weight: 900;
  line-height: 1;
  color: #6ee7b7;
  text-shadow: 0 0 12px rgba(92, 230, 106, 0.6);
  font-variant-numeric: tabular-nums;
}

.ps-buff-banner-unit {
  margin-top: 2px;
  font-size: clamp(0.56rem, 1vh, 0.72rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8fd8a0;
}

/* Veil + banner enter/leave */
.ps-buff-veil-enter-active,
.ps-buff-veil-leave-active {
  transition: opacity 260ms ease;
}

.ps-buff-veil-enter-active .ps-buff-banner,
.ps-buff-veil-leave-active .ps-buff-banner {
  transition:
    opacity 260ms ease,
    transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ps-buff-veil-enter-from,
.ps-buff-veil-leave-to {
  opacity: 0;
}

.ps-buff-veil-enter-from .ps-buff-banner,
.ps-buff-veil-leave-to .ps-buff-banner {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.94);
}

@keyframes ps-buff-veil-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
</style>
