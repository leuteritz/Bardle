<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import {
  usePlanetShopStore,
  PLANET_ROLES,
  JUNGLE_BUFF_DEFS,
  isPlanetDown,
} from '@/stores/planetShopStore'
import type { PlanetRoleType, PlanetSlot } from '@/stores/planetShopStore'
import { useUiStore } from '@/stores/uiStore'
import { formatNumber } from '@/config/numberFormat'
import { playerSlotInForeground } from '@/utils/foregroundGate'
import {
  PLANET_IMAGE_DIR,
  PLANET_IMAGE_THUMB_DIR,
  HUD_COUNTDOWN_TICK_MS,
  PLANET_RESPAWN_MS,
} from '@/config/constants'
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
  }, HUD_COUNTDOWN_TICK_MS)
  eclipseFrame = requestAnimationFrame(pollEclipse)
})
onUnmounted(() => {
  window.clearInterval(buffTicker)
  cancelAnimationFrame(eclipseFrame)
})

function buffMsLeft(slot: PlanetSlot): number {
  return slot.jungleBuff?.active ? Math.max(0, slot.jungleBuff.activeUntil - buffNow.value) : 0
}

/** Restliche Ausfallzeit eines zerstörten Planeten in ms (0 = im Orbit). */
function downMsLeft(slot: PlanetSlot): number {
  return Math.max(0, slot.downUntilMs - buffNow.value)
}

/** Restliche Ausfallzeit eines zerstörten Planeten in ganzen Sekunden. */
function downSecsLeft(slot: PlanetSlot): number {
  return Math.ceil(downMsLeft(slot) / 1000)
}

/** Restanteil der Ausfallzeit (1 → 0) für den abschmelzenden Respawn-Ring —
 *  gleiche Anzeige wie beim gefallenen Champion, nur über die deutlich
 *  längere Planeten-Ausfallzeit. */
function downProgress(slot: PlanetSlot): number {
  return Math.min(1, downMsLeft(slot) / PLANET_RESPAWN_MS)
}

/** Restlaufzeit des Jungle-Buffs in ganzen Sekunden — trägt das Label. */
function buffSecsLeft(slot: PlanetSlot): number {
  return Math.ceil(buffMsLeft(slot) / 1000)
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

// Spiegel der Planet-Tab-Auswahl: solange der Tab offen ist, trägt genau die
// Kachel des dort gewählten Orbits eine Ziel-Markierung — der Spieler sieht auf
// einen Blick, welchen Planeten er im Modal gerade bearbeitet. Ist der Tab zu,
// gibt es keine Auswahl zu spiegeln (die letzte bleibt aber im Store erhalten,
// damit ein erneutes Öffnen wieder beim selben Orbit landet).
const selectedSlotId = computed(() =>
  uiStore.bardActiveTab === 'planets' ? uiStore.planetActiveSlotId : null,
)

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
            'cmd-planet-tile--buffed': !!slot.jungleBuff?.active,
            'cmd-planet-tile--empty-slot': slot.purchased && !slot.role,
            'cmd-planet-tile--locked': !slot.purchased && !planetStore.canUnlockPlanetSlot(index),
            'cmd-planet-tile--buy': !slot.purchased,
            'cmd-planet-tile--eclipsed': slotBehindSun(slot) && !isPlanetDown(slot),
            'cmd-planet-tile--down': isPlanetDown(slot),
            'cmd-planet-tile--selected': selectedSlotId === slot.id,
          }"
          :style="slot.purchased && slot.role ? { '--role-color': roleColor(slot.role) } : {}"
          @click="handleSlotClick(slot)"
          @mouseenter="uiStore.setHoveredPlanetSlotId(slot.id)"
          @mouseleave="uiStore.setHoveredPlanetSlotId(null)"
        >
          <template v-if="slot.purchased && slot.role">
            <img :src="roleImage(slot.role)" class="cmd-tile-planet-img" alt="" draggable="false" />
            <div class="cmd-tile-img-vignette" />

            <!-- Jungle Buff: Schimmer + Emblem mit abschmelzendem Ring, mittig
                 auf der Kachel — gleiche Bauweise wie der Ability-Kern der
                 Rollenkarten darüber. Ein zerstörter Planet trägt keinen Buff
                 bei; die Kachelmitte gehört dann allein dem Wrack-Emblem. -->
            <template v-if="slot.jungleBuff?.active && !isPlanetDown(slot)">
              <div class="cmd-buff-overlay" />
              <div
                class="cmd-buff-orb"
                :class="{ 'cmd-buff-orb--urgent': buffMsLeft(slot) < 3000 }"
                :style="{ '--buff-progress': buffProgress(slot) }"
                :title="slot.jungleBuff.buffType"
              >
                <img src="/img/roles/jungle.png" alt="" draggable="false" class="cmd-buff-img" />
                <span class="cmd-buff-timer">{{ buffSecsLeft(slot) }}s</span>
              </div>
            </template>

            <!-- Eclipse: Planet hinter der Sonne — Finsternis-Schleier plus
                 Chip am OBEREN Kachelrand, damit die Mitte dem Buff- bzw.
                 Wrack-Emblem gehört (gleiche Staffelung wie auf den
                 Rollenkarten). Bewusst ohne Transition: der Status soll sofort
                 umschalten. Ein zerstörter Planet verdrängt die Eclipse-
                 Anzeige: er ist gar nicht mehr im Orbit, "hinter der Sonne"
                 wäre dann irreführend. -->
            <template v-if="!isPlanetDown(slot)">
              <div v-if="slotBehindSun(slot)" class="cmd-eclipse-veil" />
              <div
                v-if="slotBehindSun(slot)"
                class="cmd-eclipse-medal"
                title="Behind the Sun — combat paused"
              >
                <Icon icon="game-icons:eclipse-flare" width="16" height="16" />
              </div>
            </template>

            <!-- Zerstört: Totenkopf-Emblem mit abschmelzendem Respawn-Ring,
                 füllt die Kachel. Identische Anzeige wie beim gefallenen
                 Champion in der Rollenkarte darüber — nur die deutlich längere
                 Ausfallzeit unterscheidet sich. -->
            <template v-else>
              <div class="cmd-down-veil" />
              <div class="cmd-down-hatch" />
              <div class="cmd-down-core" :title="`Destroyed — back in ${downSecsLeft(slot)}s`">
                <span class="cmd-down-ring" :style="{ '--down-progress': downProgress(slot) }">
                  <Icon icon="game-icons:broken-skull" width="22" height="22" />
                </span>
                <span class="cmd-down-timer">{{ downSecsLeft(slot) }}s</span>
              </div>
            </template>
          </template>

          <template v-else-if="slot.purchased">
            <div class="cmd-tile-icon cmd-tile-icon--empty">＋</div>
          </template>

          <template v-else>
            <div class="cmd-tile-icon cmd-tile-icon--locked">
              <img src="/img/lock.png" alt="Locked" class="lock-icon" />
            </div>
            <div v-if="planetStore.canUnlockPlanetSlot(index)" class="cmd-tile-unlock-label">
              UNLOCK
            </div>
            <div class="cmd-tile-cost-row">
              <img src="/img/BardAbilities/BardChime.png" class="cmd-tile-chime-img" alt="Chimes" />
              <span class="cmd-tile-cost-value">{{
                formatNumber(planetStore.getSlotCost(slot.id))
              }}</span>
            </div>
          </template>

          <!-- ── Ziel-Markierung: dieser Orbit ist im Planet-Tab geöffnet ──
               Reticle aus vier Eckwinkeln (HUD-Sprache, bleibt auch auf der
               60px-Kachel lesbar) + Innenschein in der Rollenfarbe. Der Keil an
               der linken Kante zeigt zum Modal und liest sich als Verbindung
               zwischen beiden Ansichten — dasselbe Gem wie in der Sidebar. -->
          <template v-if="selectedSlotId === slot.id">
            <div class="cmd-select-glow" />
            <div class="cmd-select-reticle">
              <span class="cmd-sel-corner cmd-sel-corner--tl" />
              <span class="cmd-sel-corner cmd-sel-corner--tr" />
              <span class="cmd-sel-corner cmd-sel-corner--bl" />
              <span class="cmd-sel-corner cmd-sel-corner--br" />
            </div>
            <span class="cmd-select-tether cmd-select-tether--l" />
            <span class="cmd-select-tether cmd-select-tether--r" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Durchgehend laufende Fortschrittsringe ─────────────────────────────────
   Beide Ringe beziehen ihren Wert aus dem 250ms-HUD-Ticker. Roh gesetzt würde
   der conic-gradient in 250ms-Stufen springen; über @property typisiert kann
   der Browser den Wert interpolieren und eine Transition über die Taktlänge
   füllt die Lücke linear auf. Identisch zu den Ringen der Rollenkarten in
   ChampionSelectorComponent — dort ist der Mechanismus ausführlich
   beschrieben. */
@property --down-progress {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}

@property --buff-progress {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}

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
  border: 2px solid rgba(122, 78, 32, 0.75);
  background: linear-gradient(180deg, rgba(52, 26, 10, 0.55), rgba(28, 13, 5, 0.72));
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

/* ── Zweistufiger Rahmen ────────────────────────────────────────────────────
   Dunkle Innenfase direkt hinter der Außenkante — dieselbe Bauweise wie der
   Holzrahmen der Modals (`inset 0 0 0 2px`). Sie trennt die farbige Kante
   sauber vom Inhalt und lässt den Rahmen auf der schmalen Kachel so tragend
   wirken wie der Kartenrahmen der Champions darüber.
   Bewusst als eigenes Overlay statt als box-shadow der Kachel: die
   Zustandsklassen (Buff, Eclipse, Zerstört, Auswahl) schreiben allesamt ihren
   eigenen box-shadow und würden die Fase sonst überschreiben. z-index 4 hält
   sie über Bild, Vignette und Schleiern, aber unter den mittigen Emblemen. */
.cmd-planet-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  border-radius: 3px;
  box-shadow:
    inset 0 0 0 2px rgba(6, 4, 2, 0.8),
    inset 0 0 10px rgba(0, 0, 0, 0.45);
}

/* ── Akzentkante am Kachelfuß ───────────────────────────────────────────────
   Gegenstück zur Rollen-Kopfleiste über den Champion-Karten: gleiche Sprache,
   gleiche Farbquelle — nur gespiegelt an den unteren Rand gesetzt. Die beiden
   Slot-Reihen lesen sich dadurch als ein System, bleiben aber klar
   unterscheidbar (Karte trägt oben, Kachel unten). */
.cmd-planet-tile::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  z-index: 4;
  pointer-events: none;
  background: rgba(122, 78, 32, 0.6);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.cmd-planet-tile:hover {
  border-color: rgba(200, 144, 64, 0.9);
  box-shadow:
    0 0 12px rgba(200, 144, 64, 0.22),
    0 2px 8px rgba(0, 0, 0, 0.5);
  transform: translateY(-1px);
}
.cmd-planet-tile:hover::after {
  background: rgba(200, 144, 64, 0.85);
  box-shadow: 0 0 8px rgba(200, 144, 64, 0.45);
}
.cmd-planet-tile:active {
  transform: translateY(0) scale(0.97);
}

/* filled: role-colored frame — voll deckend wie der Kartenrahmen der Champions,
   damit belegter Planet und belegte Rolle dieselbe Rahmenstärke tragen */
.cmd-planet-tile--filled {
  padding: 0;
  border-color: var(--role-color, #c89040);
  background: linear-gradient(170deg, #1e1208 0%, #150f04 100%);
  box-shadow: 0 0 12px -1px color-mix(in srgb, var(--role-color, #c89040) 55%, transparent);
}
.cmd-planet-tile--filled:hover {
  border-color: var(--role-color, #c89040);
  box-shadow:
    0 0 16px -1px color-mix(in srgb, var(--role-color, #c89040) 75%, transparent),
    0 2px 8px rgba(0, 0, 0, 0.5);
}
.cmd-planet-tile--filled::after,
.cmd-planet-tile--filled:hover::after {
  background: var(--role-color, #c89040);
  box-shadow: 0 0 9px color-mix(in srgb, var(--role-color, #c89040) 70%, transparent);
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
  border: 2px dashed var(--rpg-slot-empty-border, rgba(82, 184, 48, 0.7));
  background: linear-gradient(180deg, rgba(8, 18, 6, 0.7), rgba(5, 12, 4, 0.85));
  box-shadow: inset 0 0 14px rgba(52, 160, 24, 0.06);
  animation: cmd-empty-breathe 3s ease-in-out infinite;
}
.cmd-planet-tile--empty-slot:hover {
  border-color: var(--rpg-slot-empty-border-hover, rgba(110, 192, 64, 0.95));
  box-shadow:
    inset 0 0 14px rgba(82, 184, 48, 0.12),
    0 0 8px rgba(82, 184, 48, 0.2);
}
/* gestrichelter Rahmen → die Fußkante bleibt durchgezogen und hält die Kachel
   trotzdem am Boden zusammen */
.cmd-planet-tile--empty-slot::after,
.cmd-planet-tile--empty-slot:hover::after {
  background: rgba(82, 184, 48, 0.72);
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.35);
}

.cmd-tile-icon--empty {
  color: rgba(116, 212, 72, 0.75);
  font-size: 26px;
  text-shadow: 0 0 10px rgba(82, 184, 48, 0.38);
  animation: cmd-empty-icon-pulse 3s ease-in-out infinite;
}

/* ── Gesperrt: Schloss steht, die Chimes reichen noch nicht ─────────────────
   Der Rahmen trägt trotzdem schon die volle Gold-Fassung des Systems: die
   Kachel ist ein vollwertiger Slot, sie ist nur noch nicht bezahlt. Gedämpft
   wird ausschließlich der INHALT (Schloss und Kostenzeile) — früher lagen
   opacity und grayscale auf der ganzen Kachel und haben den Rahmen gleich
   mit entfärbt, wodurch die Reihe an ihrem Ende ausfranste.
   Gold statt Grün: Grün ist im Dock reserviert für "jetzt kaufbar" bzw. "Rolle
   frei" — die gesperrte Kachel bleibt dadurch auf einen Blick unterscheidbar,
   zusätzlich zu ihrem ruhenden Rahmen (kein Puls, kein Hover-Lift). */
.cmd-planet-tile--locked {
  background: linear-gradient(170deg, #1a1408 0%, #120e04 100%);
  border: 2px solid rgba(200, 144, 64, 0.62);
  box-shadow:
    0 0 8px rgba(200, 144, 64, 0.1),
    inset 0 0 12px rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
}
.cmd-planet-tile--locked:hover {
  border-color: rgba(200, 144, 64, 0.8);
  box-shadow:
    0 0 10px rgba(200, 144, 64, 0.18),
    inset 0 0 12px rgba(0, 0, 0, 0.5);
  transform: none;
}
.cmd-planet-tile--locked::after,
.cmd-planet-tile--locked:hover::after {
  background: rgba(200, 144, 64, 0.7);
  box-shadow: none;
}

/* Nur der Inhalt liegt im Halbschatten — er benennt den fehlenden Kauf, der
   Rahmen gehört bereits zum System */
.cmd-planet-tile--locked .cmd-tile-icon--locked,
.cmd-planet-tile--locked .cmd-tile-cost-row {
  opacity: 0.6;
  filter: grayscale(45%);
  transition: opacity 0.2s ease;
}
.cmd-planet-tile--locked:hover .cmd-tile-icon--locked,
.cmd-planet-tile--locked:hover .cmd-tile-cost-row {
  opacity: 0.8;
}

.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) {
  background: linear-gradient(180deg, rgba(18, 30, 10, 0.72), rgba(12, 20, 6, 0.82));
  border: 2px solid rgba(110, 192, 64, 0.65);
  box-shadow:
    0 0 8px rgba(110, 192, 64, 0.18),
    inset 0 0 10px rgba(110, 192, 64, 0.04);
  animation: cmd-afford-pulse 2.2s ease-in-out infinite;
}
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked)::after,
.cmd-planet-tile--buy:not(.cmd-planet-tile--locked):hover::after {
  background: #6ec040;
  box-shadow: 0 0 10px rgba(110, 192, 64, 0.6);
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
    border-color: rgba(110, 192, 64, 0.55);
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
    border-color: rgba(82, 184, 48, 0.55);
  }
  50% {
    border-color: rgba(82, 184, 48, 0.9);
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

/* ── Ausgewählt: dieser Orbit ist gerade im Planet-Tab offen ────────────────
   Markiert genau die Kachel, die im Modal bearbeitet wird. Rollenfarbe, wenn
   der Slot eine Rolle trägt — sonst Gold, damit auch leere und gesperrte Slots
   sichtbar markiert werden. Alles nur Overlay: kein Layout-Shift, keine
   Konkurrenz zu Buff-/Eclipse-/Zerstört-Zuständen, die weiter darunter laufen. */
.cmd-planet-tile--selected {
  --sel: var(--role-color, #e8c040);
  border-color: var(--sel);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--sel) 55%, transparent),
    0 0 18px color-mix(in srgb, var(--sel) 45%, transparent),
    0 4px 14px rgba(0, 0, 0, 0.6),
    inset 0 0 18px color-mix(in srgb, var(--sel) 12%, transparent);
  transform: translateY(-2px);
  animation: cmd-select-pulse 2s ease-in-out infinite;
  z-index: 2;
}

.cmd-planet-tile--selected:hover {
  transform: translateY(-3px);
}

/* Fußkante zieht in die Auswahlfarbe mit — auf leeren und gesperrten Kacheln
   ist sie die einzige farbige Kante, sie muss die Markierung also mittragen */
.cmd-planet-tile--selected::after,
.cmd-planet-tile--selected:hover::after {
  background: var(--sel);
  box-shadow: 0 0 12px color-mix(in srgb, var(--sel) 75%, transparent);
}

/* Kaufbare Kacheln tragen ihren eigenen grünen Puls mit höherer Spezifität —
   als Auswahl muss die Markierung ihn übersteuern, sonst bliebe nur das
   Reticle übrig. */
.cmd-planet-tile--selected.cmd-planet-tile--buy:not(.cmd-planet-tile--locked) {
  border-color: var(--sel);
  animation: cmd-select-pulse 2s ease-in-out infinite;
}

/* Bei gesperrten Kacheln liegt der Halbschatten auf Schloss und Kostenzeile —
   als Auswahl treten beide wieder voll hervor (der Rahmen ist ohnehin schon
   farbig und wird von der Markierung nur übernommen). */
.cmd-planet-tile--selected.cmd-planet-tile--locked .cmd-tile-icon--locked,
.cmd-planet-tile--selected.cmd-planet-tile--locked .cmd-tile-cost-row {
  opacity: 0.95;
  filter: none;
}

/* Innenschein in der Auswahlfarbe, über Vignette und Schleiern */
.cmd-select-glow {
  position: absolute;
  inset: 0;
  z-index: 7;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 50%,
    color-mix(in srgb, var(--sel, #e8c040) 16%, transparent) 0%,
    transparent 70%
  );
}

/* Vier Eckwinkel — HUD-Reticle statt zweitem Rahmen */
.cmd-select-reticle {
  position: absolute;
  inset: 0;
  z-index: 8;
  pointer-events: none;
}

.cmd-sel-corner {
  position: absolute;
  width: 11px;
  height: 11px;
  border: 2px solid var(--sel, #e8c040);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--sel, #e8c040) 70%, transparent));
}

.cmd-sel-corner--tl {
  top: 3px;
  left: 3px;
  border-right: none;
  border-bottom: none;
  border-radius: 4px 0 0 0;
}
.cmd-sel-corner--tr {
  top: 3px;
  right: 3px;
  border-left: none;
  border-bottom: none;
  border-radius: 0 4px 0 0;
}
.cmd-sel-corner--bl {
  bottom: 3px;
  left: 3px;
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 4px;
}
.cmd-sel-corner--br {
  bottom: 3px;
  right: 3px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 4px 0;
}

/* Keile an beiden Seitenkanten — fassen die Kachel symmetrisch ein und zeigen
   von links zum geöffneten Modal. Die Kachel clippt sie zur Hälfte, wodurch sie
   als eingeschobene Spitzen lesen. */
.cmd-select-tether {
  position: absolute;
  z-index: 8;
  top: 50%;
  width: 11px;
  height: 11px;
  border-radius: 2px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--sel, #e8c040) 85%, white) 0%,
    var(--sel, #e8c040) 100%
  );
  box-shadow: 0 0 10px color-mix(in srgb, var(--sel, #e8c040) 70%, transparent);
  pointer-events: none;
}

.cmd-select-tether--l {
  left: 0;
  transform: translate(-50%, -50%) rotate(45deg);
}

.cmd-select-tether--r {
  right: 0;
  transform: translate(50%, -50%) rotate(45deg);
}

@keyframes cmd-select-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--sel) 45%, transparent),
      0 0 14px color-mix(in srgb, var(--sel) 32%, transparent),
      0 4px 14px rgba(0, 0, 0, 0.6),
      inset 0 0 16px color-mix(in srgb, var(--sel) 10%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--sel) 75%, transparent),
      0 0 26px color-mix(in srgb, var(--sel) 60%, transparent),
      0 4px 14px rgba(0, 0, 0, 0.6),
      inset 0 0 22px color-mix(in srgb, var(--sel) 18%, transparent);
  }
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
.cmd-planet-tile--buffed::after,
.cmd-planet-tile--buffed:hover::after {
  background: #5ce66a;
  box-shadow: 0 0 12px rgba(92, 230, 106, 0.75);
}

.cmd-buff-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(92, 230, 106, 0.16) 0%, transparent 65%);
  pointer-events: none;
  z-index: 3;
}

/* Buff-Emblem mittig auf der Kachel — baugleich mit dem Ability-Kern der
   Rollenkarten: beleuchtete Fassung in der Buff-Farbe, abschmelzender
   conic-Ring, atmender Glow. Der frühere Aufbau (Chip oben plus separater
   46px-Ring drumherum) war ein Fremdkörper gegenüber den Karten und belegte
   die obere Kachelzone, die jetzt der Eclipse-Chip trägt.
   46px ist die Obergrenze: die Kachel ist 60px breit (400px Dock / 6 Spalten
   minus 8px Gaps) und hat 2px Rahmen, also 56px Innenbreite — der Ring misst
   mit seinem 2.5px-Überstand 51px und behält damit 2.5px Luft zum Rand.
   Nach unten bleiben bei --hud-scale 0.66 (Full HD) rund 30 reale Pixel —
   darunter verliert das Emblem seine Lesbarkeit. */
.cmd-buff-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(
    circle at 38% 30%,
    rgba(78, 176, 92, 0.6) 0%,
    rgba(12, 36, 16, 0.96) 100%
  );
  color: #ddffdd;
  z-index: 5;
  pointer-events: none;
  /* Taktlänge = HUD_COUNTDOWN_TICK_MS */
  transition: --buff-progress 250ms linear;
  animation: cmd-buff-breathe 1.9s ease-in-out infinite;
}

/* Das Rollenbild ist freigestellt (RGBA) und steht deshalb vollständig in der
   Fassung, statt rund beschnitten zu werden: `contain` zeigt das ganze Motiv,
   `center` setzt es exakt in die Ringmitte.
   Maßgeblich ist die DIAGONALE, nicht die Höhe: ein hochformatiges Rechteck
   (jungle.png ist 393x610, Seitenverhältnis 0.644) berührt den Kreis mit
   seinen Ecken. Halbdiagonale = Höhe · 0.5949 — bei den früheren 84% eines
   42px-Rings ergab das exakt 21px, also genau den Kreisradius: die Ecken
   lagen auf der Ringlinie und das Motiv ragte oben wie unten heraus.
   74% von 46px = 34px Höhe → 21.9px Breite → 20.25px Halbdiagonale. Bei 23px
   Innenradius bleiben so rund 2.7px Luft ringsum, das Motiv liegt vollständig
   und mittig in der Fassung. Der Höhenanteil (34px) übertrifft dabei sogar
   den alten Wert, das Emblem bleibt also gleich gut lesbar.
   Für volle Schärfe bräuchte es ein vorskaliertes Asset unter
   /img/roles/thumb/ (wie es die Planeten unter /img/planets/thumb/ haben). */
.cmd-buff-img {
  width: 48%;
  height: 74%;
  object-fit: contain;
  object-position: center;
  display: block;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85));
}

/* Restlaufzeit unter der Fassung — wie das Label der Rollenkarten und des
   Wrack-Emblems platziert */
.cmd-buff-timer {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.03em;
  text-indent: 0.03em;
  color: #b6f5be;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.98),
    0 0 6px rgba(0, 0, 0, 0.9),
    0 0 12px rgba(92, 230, 106, 0.6);
}

.cmd-buff-orb::before {
  content: '';
  position: absolute;
  inset: -2.5px;
  border-radius: 50%;
  background: conic-gradient(
    #5ce66a calc(var(--buff-progress, 1) * 360deg),
    rgba(92, 230, 106, 0.14) 0
  );
  -webkit-mask: radial-gradient(
    farthest-side,
    transparent calc(100% - 2.5px),
    #000 calc(100% - 2px)
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
  filter: drop-shadow(0 0 3px rgba(92, 230, 106, 0.7));
}

@keyframes cmd-buff-breathe {
  0%,
  100% {
    box-shadow:
      inset 0 1px 0 rgba(140, 255, 150, 0.5),
      inset 0 0 10px rgba(0, 0, 0, 0.45),
      0 2px 6px rgba(0, 0, 0, 0.6),
      0 0 10px rgba(92, 230, 106, 0.4);
  }
  50% {
    box-shadow:
      inset 0 1px 0 rgba(160, 255, 170, 0.65),
      inset 0 0 10px rgba(0, 0, 0, 0.35),
      0 2px 6px rgba(0, 0, 0, 0.6),
      0 0 20px rgba(92, 230, 106, 0.8);
  }
}

/* Letzte Sekunden: Ring und Fassung kippen ins Warnrot, der Puls hört auf */
.cmd-buff-orb--urgent {
  background: radial-gradient(
    circle at 38% 30%,
    rgba(184, 74, 58, 0.6) 0%,
    rgba(38, 12, 10, 0.96) 100%
  );
  animation: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 170, 150, 0.5),
    inset 0 0 10px rgba(0, 0, 0, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.6),
    0 0 14px rgba(255, 80, 64, 0.6);
}

.cmd-buff-orb--urgent::before {
  background: conic-gradient(
    #ff5040 calc(var(--buff-progress, 1) * 360deg),
    rgba(255, 80, 64, 0.16) 0
  );
  filter: drop-shadow(0 0 3px rgba(255, 64, 64, 0.8));
}

.cmd-buff-orb--urgent .cmd-buff-timer {
  color: #ffc0b0;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.98),
    0 0 6px rgba(0, 0, 0, 0.9),
    0 0 12px rgba(255, 80, 64, 0.6);
}

/* ── Eclipse: Planet hinter der Sonne ──
   Kachel kühlt ab (Grayscale, Rollen-Glow aus), dunkler Schleier legt sich
   über das Planetenbild, goldener ✦-Chip atmet oben rechts — gleiche
   Designsprache wie der Eclipse-Status im StarFightModal. */
/* Rahmen kippt von warm auf kalt — die Kachel steht nicht mehr im Sonnenlicht */
.cmd-planet-tile--eclipsed {
  border-color: rgba(46, 62, 100, 0.8);
  box-shadow: inset 0 0 18px rgba(4, 8, 20, 0.7);
}
.cmd-planet-tile--eclipsed::after,
.cmd-planet-tile--eclipsed:hover::after {
  background: rgba(58, 78, 124, 0.9);
  box-shadow: none;
}
.cmd-planet-tile--eclipsed .cmd-tile-planet-img {
  filter: grayscale(65%) brightness(0.5) saturate(0.6);
}
.cmd-tile-planet-img {
  transition:
    transform 0.18s ease,
    filter 0.4s ease;
}

/* Finsternis-Motiv wie auf den Rollenkarten darüber, nur auf das Kachelformat
   gezogen: kalter Kernschatten füllt die Kachel, die verdeckte Sonne glimmt
   als Korona über den oberen Rand. Der Zustand ist damit am Kachelgrund
   ablesbar, nicht nur am Medaillon. */
.cmd-eclipse-veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 150% 42% at 50% -8%,
      rgba(240, 200, 80, 0.24) 0%,
      rgba(150, 104, 34, 0.08) 46%,
      transparent 74%
    ),
    radial-gradient(ellipse at 50% 58%, rgba(12, 18, 38, 0.7) 0%, rgba(3, 5, 12, 0.88) 100%);
  pointer-events: none;
  z-index: 2;
  animation: cmd-eclipse-drift 4.5s ease-in-out infinite alternate;
}

@keyframes cmd-eclipse-drift {
  from {
    opacity: 0.8;
  }
  to {
    opacity: 1;
  }
}

/* ── Zerstört: Planet ist aus dem Orbit raus und wartet auf seinen Respawn ──
   Deutlich härter als die Eclipse — die Kachel liegt komplett brach, das
   Planetenbild ist fast ausgelöscht, ein rotes Wrack-Emblem trägt den Timer. */
.cmd-planet-tile--down {
  border-color: rgba(150, 62, 48, 0.8);
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.78);
}
.cmd-planet-tile--down::after,
.cmd-planet-tile--down:hover::after {
  background: #963e30;
  box-shadow: 0 0 9px rgba(204, 96, 80, 0.45);
}
.cmd-planet-tile--down .cmd-tile-planet-img {
  filter: grayscale(100%) brightness(0.28) contrast(0.8);
}

/* Blutroter Schleier über dem Planetenbild */
.cmd-down-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 40%, rgba(60, 10, 6, 0.5), rgba(3, 2, 4, 0.88) 85%);
  pointer-events: none;
  z-index: 2;
}

/* Warnschraffur — HUD-Sprache für "Slot außer Gefecht" */
.cmd-down-hatch {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -45deg,
    rgba(204, 96, 80, 0.09) 0 6px,
    transparent 6px 14px
  );
  pointer-events: none;
  z-index: 3;
}

/* Wie der Down-Kern der Rollenkarten aufgebaut: der Container ist exakt so
   groß wie das Emblem und liegt auf der Kachelmitte, der Timer hängt absolut
   darunter. Buff-Emblem und Wrack-Emblem sitzen damit an derselben Stelle. */
.cmd-down-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 6;
  pointer-events: none;
}

/* Totenkopf-Emblem mit Respawn-Ring: der Ring schmilzt über die Ausfallzeit ab —
   baugleich mit dem Revive-Ring der Champion-Karte, nur eine Stufe kleiner,
   damit er auf der schmalen Kachel nicht an die Ränder stößt */
.cmd-down-ring {
  position: relative;
  /* gleiche Maße wie .cmd-buff-orb — beide belegen dieselbe Kachelmitte, ein
     Wechsel Buff → Wrack darf die Fassung nicht springen lassen */
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 35% 30%, rgba(44, 14, 10, 0.96), rgba(10, 4, 4, 0.96));
  color: #e08070;
  box-shadow:
    0 0 10px rgba(204, 96, 80, 0.35),
    0 2px 6px rgba(0, 0, 0, 0.7);
  /* Taktlänge = HUD_COUNTDOWN_TICK_MS */
  transition: --down-progress 250ms linear;
}

.cmd-down-ring::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: conic-gradient(
    #ff5040 calc(var(--down-progress, 1) * 360deg),
    rgba(255, 80, 64, 0.14) 0
  );
  -webkit-mask: radial-gradient(
    farthest-side,
    transparent calc(100% - 3px),
    #000 calc(100% - 2.5px)
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px));
  filter: drop-shadow(0 0 4px rgba(255, 80, 64, 0.7));
}

.cmd-down-ring :deep(svg) {
  filter: drop-shadow(0 0 6px rgba(204, 96, 80, 0.7));
  animation: cmd-down-pulse 1.4s ease-in-out infinite alternate;
}

/* sitzt wie das Label der Rollenkarten unter dem Emblem. 15px sind auf der
   schmalen Kachel die Untergrenze: bei --hud-scale 0.66 bleiben davon knapp
   10 reale Pixel, gerade noch sicher lesbar für zwei Ziffern in tabular-nums. */
.cmd-down-timer {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.03em;
  text-indent: 0.03em;
  color: #f0b0a0;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.98),
    0 0 6px rgba(0, 0, 0, 0.9),
    0 0 12px rgba(255, 80, 64, 0.55);
}

@keyframes cmd-down-pulse {
  from {
    opacity: 0.55;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cmd-down-core :deep(svg) {
    animation: none;
  }
}

/* Chip am oberen Kachelrand — gleiche Staffelung wie auf den Rollenkarten:
   Eclipse oben, Buff- bzw. Wrack-Emblem in der Mitte. 24px sind bewusst
   kleiner als das mittige Emblem: der Chip benennt den Zustand nur, getragen
   wird er vom Finsternis-Schleier über der ganzen Kachel. */
.cmd-eclipse-medal {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
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
  .cmd-planet-tile--selected,
  .cmd-planet-tile--selected.cmd-planet-tile--buy:not(.cmd-planet-tile--locked),
  .cmd-eclipse-medal,
  .cmd-eclipse-veil {
    animation: none;
  }
}
</style>
