<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import {
  usePlanetShopStore,
  PLANET_ROLES,
  JUNGLE_BUFF_DEFS,
} from '@/stores/planetShopStore'
import type { PlanetRoleType, PlanetSlot } from '@/stores/planetShopStore'
import { useUiStore } from '@/stores/uiStore'
import { formatNumber } from '@/config/numberFormat'
import { playerSlotInForeground } from '@/utils/foregroundGate'
import { PLANET_IMAGE_DIR, PLANET_IMAGE_THUMB_DIR } from '@/config/constants'
import ChampionSelectorComponent from '@/components/bottom/command/ChampionSelectorComponent.vue'

const planetStore = usePlanetShopStore()
const uiStore = useUiStore()
const { slots } = storeToRefs(planetStore)

function roleColor(role: PlanetRoleType): string {
  return PLANET_ROLES[role].color
}

function roleImage(role: PlanetRoleType): string {
  // pre-scaled thumb: the ~700px originals blur when the browser minifies
  // them straight down to the ~60px tile
  return PLANET_ROLES[role].image.replace(PLANET_IMAGE_DIR, PLANET_IMAGE_THUMB_DIR)
}

// Ticker für den Buff-Countdown-Ring: activeUntil ist reaktiv, Date.now() nicht.
const buffNow = ref(Date.now())
let buffTicker = 0

// Eclipse-Status: die 60fps-Positions-Map (activePlayerPlanetPositions) ist
// bewusst nicht reaktiv — ein rAF-Check spiegelt Zustandswechsel SOFORT in ein
// reaktives Set (Re-Render nur beim Flip, nicht pro Frame; kein Poll-Lag mehr).
const eclipsedSlotIds = ref<ReadonlySet<string>>(new Set())
let eclipseFrame = 0

function pollEclipse() {
  const cur = eclipsedSlotIds.value
  const next = new Set<string>()
  let changed = false
  for (const slot of slots.value) {
    if (slot.purchased && slot.role && !playerSlotInForeground(slot.id)) {
      next.add(slot.id)
      if (!cur.has(slot.id)) changed = true
    }
  }
  if (changed || next.size !== cur.size) eclipsedSlotIds.value = next
  eclipseFrame = requestAnimationFrame(pollEclipse)
}

onMounted(() => {
  buffTicker = window.setInterval(() => {
    buffNow.value = Date.now()
  }, 250)
  eclipseFrame = requestAnimationFrame(pollEclipse)
})
onUnmounted(() => {
  window.clearInterval(buffTicker)
  cancelAnimationFrame(eclipseFrame)
})

function buffMsLeft(slot: PlanetSlot): number {
  return slot.jungleBuff?.active ? Math.max(0, slot.jungleBuff.activeUntil - buffNow.value) : 0
}

function buffProgress(slot: PlanetSlot): number {
  if (!slot.role || !slot.jungleBuff?.active) return 0
  return Math.min(1, buffMsLeft(slot) / JUNGLE_BUFF_DEFS[slot.role].durationMs)
}

// Eclipse: Planet fliegt gerade hinter der Sonne → nimmt nicht am Kampf teil
// (gleiches Gate wie combat-/roleBehaviorStore, per rAF verzögerungsfrei gespiegelt)
function slotBehindSun(slot: PlanetSlot): boolean {
  return eclipsedSlotIds.value.has(slot.id)
}

function handleSlotClick(slot: (typeof slots.value)[number]) {
  uiStore.requestOpenPlanetsTab(slot.id)
  if (!slot.purchased) {
    planetStore.buySlot(slot.id)
  }
}
</script>

<template>
  <div class="cmd-hud">
    <div class="cmd-panel">
      <!-- ── Champion portrait cards (with role ability tracking) ── -->
      <ChampionSelectorComponent />

      <!-- ── Planet dock: single row of 6 ── -->
      <div class="cmd-planet-dock">
        <div
          v-for="(slot, index) in slots"
          :key="slot.id"
          class="cmd-planet-tile"
          :class="{
            'cmd-planet-tile--filled': slot.purchased && !!slot.role,
            'cmd-planet-tile--buffed': !!(slot.jungleBuff?.active),
            'cmd-planet-tile--empty-slot': slot.purchased && !slot.role,
            'cmd-planet-tile--locked': !slot.purchased && !planetStore.canUnlockPlanetSlot(index),
            'cmd-planet-tile--buy': !slot.purchased,
            'cmd-planet-tile--eclipsed': slotBehindSun(slot),
          }"
          :style="slot.purchased && slot.role ? { '--role-color': roleColor(slot.role) } : {}"
          @click="handleSlotClick(slot)"
          @mouseenter="uiStore.setHoveredPlanetSlotId(slot.id)"
          @mouseleave="uiStore.setHoveredPlanetSlotId(null)"
        >
          <template v-if="slot.purchased && slot.role">
            <img :src="roleImage(slot.role)" class="cmd-tile-planet-img" alt="" draggable="false" />
            <div class="cmd-tile-img-vignette" />

            <!-- Jungle Buff: Schimmer, Einkreis-Ring + Countdown-Chip -->
            <div v-if="slot.jungleBuff?.active" class="cmd-buff-overlay" />
            <div v-if="slot.jungleBuff?.active" class="cmd-buff-ring" />
            <div
              v-if="slot.jungleBuff?.active"
              class="cmd-buff-chip"
              :class="{ 'cmd-buff-chip--urgent': buffMsLeft(slot) < 3000 }"
              :style="{ '--buff-progress': buffProgress(slot) }"
              :title="slot.jungleBuff.buffType"
            >
              <img src="/img/roles/jungle.png" alt="" draggable="false" />
            </div>

            <!-- Eclipse: Planet hinter der Sonne — kühler Schatten + Medaillon
                 unten mittig (oben mittig sitzt der Jungle-Buff-Chip).
                 Bewusst ohne Transition: der Status soll sofort umschalten. -->
            <div v-if="slotBehindSun(slot)" class="cmd-eclipse-veil" />
            <div
              v-if="slotBehindSun(slot)"
              class="cmd-eclipse-medal"
              title="Behind the Sun — combat paused"
            >
              <Icon icon="game-icons:eclipse-flare" width="24" height="24" />
            </div>
          </template>

          <template v-else-if="slot.purchased">
            <div class="cmd-tile-icon cmd-tile-icon--empty">＋</div>
          </template>

          <template v-else>
            <div class="cmd-tile-icon cmd-tile-icon--locked">
              <img src="/img/lock.png" alt="Locked" class="lock-icon" />
            </div>
            <div v-if="planetStore.canUnlockPlanetSlot(index)" class="cmd-tile-unlock-label">UNLOCK</div>
            <div class="cmd-tile-cost-row">
              <img src="/img/BardAbilities/BardChime.png" class="cmd-tile-chime-img" alt="Chimes" />
              <span class="cmd-tile-cost-value">{{ formatNumber(planetStore.getSlotCost(slot.id)) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cmd-hud {
  /* lives inside the unified bottom-bar shell — bg comes from the shell */
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 2;
  width: 440px;
  height: 443px;
  pointer-events: none;
  transform-origin: bottom right;
  transform: scale(var(--hud-scale, 1));
}

@media (max-width: 600px) {
  .cmd-hud {
    display: none;
  }
}

.cmd-panel {
  position: absolute;
  /* oben 22px = 2px Frame-Inset + 20px Abstand zur Rahmenlinie — damit ist der
     Abstand oben identisch mit den 20px links und die 40px-Rundung der ersten
     Rollenkarte liegt konzentrisch im 60px-Bogen der Panel-Silhouette */
  inset: 22px 20px 16px 20px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Planet dock row ── */
.cmd-planet-dock {
  flex: none;
  height: 118px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  min-width: 0;
}

.cmd-planet-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  border-radius: 5px;
  overflow: hidden;
  border: 2px solid rgba(122, 78, 32, 0.45);
  background: linear-gradient(180deg, rgba(52, 26, 10, 0.55), rgba(28, 13, 5, 0.72));
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.cmd-planet-tile:hover {
  border-color: rgba(200, 144, 64, 0.75);
  box-shadow:
    0 0 12px rgba(200, 144, 64, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.5);
  transform: translateY(-1px);
}
.cmd-planet-tile:active {
  transform: translateY(0) scale(0.97);
}

/* filled: role-colored frame */
.cmd-planet-tile--filled {
  padding: 0;
  border-color: color-mix(in srgb, var(--role-color, #c89040) 90%, transparent);
  background: linear-gradient(170deg, #1e1208 0%, #150f04 100%);
  box-shadow: 0 0 10px -1px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
}
.cmd-planet-tile--filled:hover {
  border-color: var(--role-color, #c89040);
  box-shadow:
    0 0 14px -1px color-mix(in srgb, var(--role-color, #c89040) 65%, transparent),
    0 2px 8px rgba(0, 0, 0, 0.5);
}

.cmd-tile-planet-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.18s ease;
}
.cmd-planet-tile:hover .cmd-tile-planet-img {
  transform: scale(1.06);
}

.cmd-tile-img-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 32%, transparent 38%, rgba(6, 3, 1, 0.78));
  pointer-events: none;
  z-index: 1;
}

/* ── Empty / locked / buy states ── */
.cmd-tile-icon {
  position: relative;
  z-index: 1;
  font-size: 26px;
  line-height: 1;
  text-align: center;
  transition: transform 0.15s;
}
.cmd-planet-tile:hover .cmd-tile-icon {
  transform: scale(1.15);
}

.cmd-planet-tile--empty-slot {
  border: 2px dashed var(--rpg-slot-empty-border, rgba(82, 184, 48, 0.52));
  background: linear-gradient(180deg, rgba(8, 18, 6, 0.7), rgba(5, 12, 4, 0.85));
  box-shadow: inset 0 0 14px rgba(52, 160, 24, 0.06);
  animation: cmd-empty-breathe 3s ease-in-out infinite;
}
.cmd-planet-tile--empty-slot:hover {
  border-color: var(--rpg-slot-empty-border-hover, rgba(110, 192, 64, 0.82));
  box-shadow:
    inset 0 0 14px rgba(82, 184, 48, 0.12),
    0 0 8px rgba(82, 184, 48, 0.2);
}

.cmd-tile-icon--empty {
  color: rgba(116, 212, 72, 0.75);
  font-size: 26px;
  text-shadow: 0 0 10px rgba(82, 184, 48, 0.38);
  animation: cmd-empty-icon-pulse 3s ease-in-out infinite;
}

.cmd-planet-tile--locked {
  background: linear-gradient(170deg, #1a1408 0%, #120e04 100%);
  border: 2px solid rgba(122, 78, 32, 0.35);
  box-shadow: none;
  opacity: 0.55;
  filter: grayscale(40%);
  cursor: not-allowed;
}
.cmd-planet-tile--locked:hover {
  border-color: rgba(122, 78, 32, 0.45);
  box-shadow: none;
  transform: none;
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) {
  background: linear-gradient(180deg, rgba(18, 30, 10, 0.72), rgba(12, 20, 6, 0.82));
  border: 2px solid rgba(110, 192, 64, 0.45);
  box-shadow:
    0 0 8px rgba(110, 192, 64, 0.18),
    inset 0 0 10px rgba(110, 192, 64, 0.04);
  animation: cmd-afford-pulse 2.2s ease-in-out infinite;
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked):hover {
  border-color: #6ec040;
  box-shadow:
    0 0 18px rgba(110, 192, 64, 0.6),
    0 0 36px rgba(110, 192, 64, 0.18),
    inset 0 0 12px rgba(110, 192, 64, 0.08);
  transform: translateY(-1px) scale(1.03);
  animation: none;
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) .cmd-tile-chime-img {
  filter: drop-shadow(0 0 4px rgba(232, 192, 64, 0.8));
  animation: cmd-chime-bob 1.5s ease-in-out infinite;
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) .cmd-tile-cost-value {
  color: #f0d060;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.6);
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) .cmd-tile-icon--locked {
  filter: sepia(1) saturate(3) hue-rotate(80deg) brightness(1.1);
}

@keyframes cmd-afford-pulse {
  0%,
  100% {
    border-color: rgba(110, 192, 64, 0.35);
    box-shadow:
      0 0 6px rgba(110, 192, 64, 0.15),
      inset 0 0 8px rgba(110, 192, 64, 0.03);
  }
  50% {
    border-color: #6ec040;
    box-shadow:
      0 0 16px rgba(110, 192, 64, 0.55),
      0 0 28px rgba(110, 192, 64, 0.16),
      inset 0 0 10px rgba(110, 192, 64, 0.08);
  }
}

@keyframes cmd-chime-bob {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-2px) scale(1.1);
  }
}

@keyframes cmd-empty-breathe {
  0%,
  100% {
    border-color: rgba(82, 184, 48, 0.38);
  }
  50% {
    border-color: rgba(82, 184, 48, 0.68);
  }
}

@keyframes cmd-empty-icon-pulse {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

.cmd-tile-icon--locked {
  display: flex;
  align-items: center;
  justify-content: center;
}
.cmd-tile-icon--locked .lock-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: 0.85;
}

.cmd-tile-cost-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 4px;
  padding: 2px 6px;
}

.cmd-tile-chime-img {
  width: 15px;
  height: 15px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.cmd-tile-cost-value {
  font-size: 12px;
  font-weight: 800;
  color: #e8c040;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.cmd-tile-unlock-label {
  position: relative;
  z-index: 1;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #90e050;
  text-shadow: 0 0 6px rgba(144, 224, 80, 0.7);
}

/* ── Jungle Buff states ─────────────────────────────────────────────────────
   Gleiche Designsprache wie der Countdown-Chip am Orbit-Planeten:
   Jungle-Grün, weicher Puls-Glow und ein konischer Ring, der mit der
   Buff-Restdauer abschmilzt. */
.cmd-planet-tile--buffed {
  border-color: #5ce66a !important;
  box-shadow:
    0 0 16px rgba(92, 230, 106, 0.8),
    0 0 34px rgba(92, 230, 106, 0.35),
    inset 0 1px 0 rgba(140, 255, 150, 0.18);
}

.cmd-buff-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(92, 230, 106, 0.16) 0%, transparent 65%);
  pointer-events: none;
  z-index: 3;
}

/* Einkreis-Ring: pulsierender Kreis um den Buff-Chip oben mittig
   (Ring-Zentrum = Chip-Zentrum: top 5px + 18px halbe Chip-Höhe = 23px) */
.cmd-buff-ring {
  position: absolute;
  top: 23px;
  left: 50%;
  width: 46px;
  aspect-ratio: 1;
  margin: 0;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid rgba(92, 230, 106, 0.85);
  box-shadow:
    0 0 10px rgba(92, 230, 106, 0.7),
    0 0 22px rgba(92, 230, 106, 0.35),
    inset 0 0 10px rgba(92, 230, 106, 0.3);
  pointer-events: none;
  z-index: 4;
}

/* Countdown-Chip (oben mittig — unten mittig sitzt das Eclipse-Medaillon,
   beide gleich groß, damit die Kachel symmetrisch bleibt) */
.cmd-buff-chip {
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(22, 42, 26, 0.96), rgba(6, 14, 8, 0.96));
  display: grid;
  place-items: center;
  z-index: 5;
  pointer-events: none;
  box-shadow:
    0 0 6px rgba(92, 230, 106, 0.5),
    0 1px 4px rgba(0, 0, 0, 0.55);
}

.cmd-buff-chip::before {
  content: '';
  position: absolute;
  inset: -2.5px;
  border-radius: 50%;
  background: conic-gradient(
    #5ce66a calc(var(--buff-progress, 1) * 360deg),
    rgba(92, 230, 106, 0.14) 0
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
  filter: drop-shadow(0 0 3px rgba(92, 230, 106, 0.7));
}

.cmd-buff-chip img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 2px rgba(92, 230, 106, 0.7));
}

.cmd-buff-chip--urgent::before {
  background: conic-gradient(
    #ff5040 calc(var(--buff-progress, 1) * 360deg),
    rgba(255, 80, 64, 0.16) 0
  );
  filter: drop-shadow(0 0 3px rgba(255, 64, 64, 0.8));
}

/* ── Eclipse: Planet hinter der Sonne ──
   Kachel kühlt ab (Grayscale, Rollen-Glow aus), dunkler Schleier legt sich
   über das Planetenbild, goldener ✦-Chip atmet oben rechts — gleiche
   Designsprache wie der Eclipse-Status im StarFightModal. */
.cmd-planet-tile--eclipsed {
  border-color: rgba(122, 78, 32, 0.4);
  box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.6);
}
.cmd-planet-tile--eclipsed .cmd-tile-planet-img {
  filter: grayscale(65%) brightness(0.5) saturate(0.6);
}
.cmd-tile-planet-img {
  transition: transform 0.18s ease, filter 0.4s ease;
}

.cmd-eclipse-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(6, 8, 16, 0.4), rgba(2, 3, 8, 0.62));
  pointer-events: none;
  z-index: 2;
}

/* Medaillon unten mittig — Gegenstück zum Jungle-Buff-Chip oben mittig,
   beide 36px → keine Überlappung, symmetrisches Kachel-Layout */
.cmd-eclipse-medal {
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 35% 30%, rgba(38, 26, 8, 0.95), rgba(10, 7, 3, 0.95));
  border: 2px solid #5c3310;
  box-shadow:
    0 0 0 1px rgba(200, 144, 64, 0.35),
    0 0 12px rgba(232, 192, 64, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.7);
  color: #e8c040;
  z-index: 6;
  pointer-events: none;
  animation: cmd-eclipse-breathe 1.6s ease-in-out infinite alternate;
}
.cmd-eclipse-medal :deep(svg) {
  filter: drop-shadow(0 0 4px rgba(232, 192, 64, 0.55));
}

@keyframes cmd-eclipse-breathe {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cmd-planet-tile--empty-slot,
  .cmd-tile-icon--empty,
  .cmd-planet-tile--buy:not(.cmd-planet-tile--locked),
  .cmd-planet-tile--buy:not(.cmd-planet-tile--locked) .cmd-tile-chime-img,
  .cmd-eclipse-medal {
    animation: none;
  }
}
</style>
