<script setup lang="ts">
import { computed, nextTick, ref, watch, onMounted, onUnmounted } from 'vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { invalidateHudField } from '@/utils/ui/hudField'
import { useMissionFace } from '@/composables/ui/useMissionFace'
import { missionObjectiveLine } from '@/config/progression/missions'
import { useUiStore } from '@/stores/core/uiStore'
import { useMissionStore } from '@/stores/progression/missionStore'
import {
  MISSION_DEBUT_BREATHS,
  MISSION_DEBUT_BREATH_MS,
  MISSION_HANDOVER_BREATHS,
  MISSION_HANDOVER_BREATH_MS,
  MISSION_RISE_MS,
  MISSION_RISE_STAGGER_MS,
  MISSION_SHEEN_MS,
} from '@/config/constants'

/**
 * Woran Bard als Nächstes arbeitet — ganz oben in der Kartenspalte.
 *
 * Sie ist das einzige DAUERHAFTE Glied der Spalte, und daraus folgt alles
 * andere an ihr: sie steht immer zuerst, sie faltet nie, und sie nimmt an den
 * Dichtestufen des Containers NICHT teil (`.hc--anchored`). Ihre Kante ist die
 * einzige der sechs Karten, die in der HUD-Kontur steht — Void- und
 * Drifter-Bahnen klemmen gegen sie. Wüchse sie mit, sobald eine zweite Karte
 * auftaucht, verschöbe sich das freie Feld im Sekundentakt.
 *
 * Sie hat KEINEN eigenen Takt: der Store rechnet im Sekundentakt aus
 * `gameStore.tick()`, und ein Ziel ohne Frist braucht nichts Feineres.
 *
 * Zwei Zeremonien, nur `opacity`/`transform`, Ende per `animationend`:
 * der Auftakt beim frischen Spielstand (einmal je Sitzung) und die Übergabe,
 * sobald nach dem Abschlussblitz das neue Ziel steht.
 */

/** Einmal je Sitzung — die Spalte unmountet bei offenem Profil-Tab. */
let debutShown = false

/** Gesicht und Abschlussblitz teilt die Karte mit der Wayfinder-Zeile im
 *  Pause-Overlay — beim Blitz steht der Store schon eine Stufe weiter. */
const { face, flashing } = useMissionFace()
const uiStore = useUiStore()
const missionStore = useMissionStore()

type Phase = 'idle' | 'debut' | 'handover'
const phase = ref<Phase>('idle')
const glowEl = ref<HTMLElement>()

watch(flashing, (now, was) => {
  if (!was || now || !face.value) return
  // Erst zurücksetzen: zwei Einlösungen kurz nacheinander sind zwei Übergaben.
  phase.value = 'idle'
  nextTick(() => {
    phase.value = 'handover'
  })
})

/** Der Innenschein läuft in beiden Phasen am längsten — sein Ende ist das Ende. */
function onCeremonyEnd(e: AnimationEvent) {
  if (e.target === glowEl.value) phase.value = 'idle'
}

const debutBreaths = String(MISSION_DEBUT_BREATHS)
const debutBreathMs = `${MISSION_DEBUT_BREATH_MS}ms`
const handoverBreaths = String(MISSION_HANDOVER_BREATHS)
const handoverBreathMs = `${MISSION_HANDOVER_BREATH_MS}ms`
const sheenMs = `${MISSION_SHEEN_MS}ms`
const riseMs = `${MISSION_RISE_MS}ms`
const rise2Ms = `${MISSION_RISE_STAGGER_MS}ms`
const rise3Ms = `${MISSION_RISE_STAGGER_MS * 2}ms`

/** Nennt die Stufe einen Reiter, führt die Karte per Klick dorthin. */
const linkTab = computed(() => (flashing.value ? undefined : face.value?.def.tab))
function openTab() {
  if (linkTab.value) uiStore.setBardTab(linkTab.value)
}

const tooltip = computed(() => {
  const f = face.value
  if (!f) return ''
  return `${f.def.name} — ${missionObjectiveLine(f.def)}. ${f.def.blurb} · ${
    flashing.value ? 'Claimed' : f.rewardLabel
  }`
})

// ── Unterkante veröffentlichen ───────────────────────────────────────────────
// Die einzige Karte, die das noch tut. Vorher meldeten alle sechs ihre Kante an
// den `documentElement`, damit sich die Spalte per `max()`-Kette stapeln konnte
// — die Stapelung macht jetzt Flex, und die Kontur soll weiterhin NUR den
// Wayfinder kennen: die fünf flüchtigen aufzunehmen hiesse, das freie Feld im
// Sekundentakt zu verschieben.
//
// `invalidateHudField()` gehört dazu: der Zwischenspeicher der Kontur keyt nur
// auf Fenstermaß und Header-Bogen und sähe einen Missionswechsel sonst nicht.
// Das ist billig, weil die Karte ihre Höhe nur dann ändert.
const root = ref<HTMLElement>()
let resizeObserver: ResizeObserver | null = null

function publishBottom() {
  const rect = root.value?.getBoundingClientRect()
  const style = document.documentElement.style
  style.setProperty('--wayfinder-bottom', `${rect?.bottom ?? 0}px`)
  // Die rechte Kante gehört dazu, weil die Kontur sie braucht und sie nirgends
  // sonst als Zahl steht: sie folgt aus `left` plus `clamp()`, und ein `calc()`
  // löst `getComputedStyle` nicht auf.
  style.setProperty('--wayfinder-right', `${rect?.right ?? 0}px`)
  invalidateHudField()
}

onMounted(() => {
  if (!root.value) return
  resizeObserver = new ResizeObserver(publishBottom)
  resizeObserver.observe(root.value)
  publishBottom()
  const fresh =
    missionStore.index === 0 && missionStore.caughtUp === 0 && missionStore.totalMissionsClaimed === 0
  if (fresh && !debutShown && face.value) {
    debutShown = true
    phase.value = 'debut'
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  const style = document.documentElement.style
  style.setProperty('--wayfinder-bottom', '0px')
  style.setProperty('--wayfinder-right', '0px')
  invalidateHudField()
})
</script>

<template>
  <div
    ref="root"
    class="hc hc--anchored wf"
    :class="{
      'wf--done': flashing,
      'wf--link': !!linkTab,
      'wf--debut': phase === 'debut',
      'wf--handover': phase === 'handover',
    }"
    :style="{ '--hc-color': face?.color }"
    :title="tooltip"
    @click="openTab"
    @animationend="onCeremonyEnd"
    :role="linkTab ? 'button' : 'status'"
  >
    <!-- Die Kartenfläche IST der Balken. Der Schlüssel wechselt beim
         Missionswechsel und baut das Element neu, damit die Füllung nicht von
         voll auf leer zurückläuft; beim Abschlussblitz bleibt er stehen und
         sie läuft sichtbar voll. -->
    <span
      :key="face?.id"
      class="hc-fill"
      :style="{ transform: `scaleX(${face?.ratio ?? 0})` }"
      aria-hidden="true"
    ></span>
    <span
      :key="`${face?.id}-edge`"
      class="hc-edge"
      :style="{ transform: `translateX(${(face?.ratio ?? 0) * 100}%)` }"
      aria-hidden="true"
    ></span>

    <!-- Zeremonie-Ebenen: vor dem Text, damit sie ohne z-index darunter liegen. -->
    <span ref="glowEl" class="wf-glow" aria-hidden="true"></span>
    <span class="wf-sheen" aria-hidden="true"></span>

    <span class="hc-over wf-name">{{ face?.name }}</span>
    <span class="hc-over wf-task">{{ face?.task }}</span>

    <!-- Zähler links, Lohn rechts: der Lohn trägt keine eigene Fläche, nur die
         Kapitelfarbe. -->
    <div class="hc-over wf-foot">
      <span class="wf-count">
        {{ formatNumber(face?.progress ?? 0) }}/{{ formatNumber(face?.target ?? 0) }}
      </span>
      <div class="wf-boon">
        <span v-for="part in face?.rewardParts ?? []" :key="part.unit" class="wf-boon__part">
          <img v-if="part.image" :src="part.image" class="wf-boon__art" alt="" aria-hidden="true" />
          <span v-else class="wf-boon__mono" aria-hidden="true">{{ part.mono }}</span>
          <span class="wf-boon__amount">{{ part.amount }}</span>
          <span class="wf-boon__unit">{{ part.unit }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Fläche, Rahmen, Schatten und Skala kommen aus `.hc-*` (rpg-theme.css). Hier
   steht nur, was allein diese Karte weiß.

   Jede Zeilenhöhe steht FEST. Die Kante der Karte hängt in der HUD-Kontur, und
   eine mit dem Missionsnamen wechselnde Höhe liesse das freie Feld wandern. */
.wf {
  padding-bottom: var(--hc-pad-y);
}

.wf--link {
  cursor: pointer;
}
.wf--link:hover .wf-task {
  color: #e8c040;
}

/* Goldene Oberkante — sie markiert das eine DAUERHAFTE Glied der Spalte gegen
   die flüchtigen Karten darunter. Statisch, nie animiert. */
.wf::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #c89040, #5c3310);
  pointer-events: none;
}

.wf--done {
  --hc-color: #6ec040;
}

.wf--done .hc-fill,
.wf--done .hc-edge {
  transition-duration: 0.25s;
}

/* ── Zeremonien ── Innenschein: statischer Schein, nur seine Deckkraft atmet. */
.wf-glow {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  opacity: 0;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px var(--hc-color, var(--rpg-gold)),
    inset 0 0 1.4em color-mix(in srgb, var(--hc-color, var(--rpg-gold)) 45%, transparent);
}

.wf--debut .wf-glow {
  animation: wf-breathe v-bind(debutBreathMs) ease-in-out v-bind(debutBreaths);
}

.wf--handover .wf-glow {
  animation: wf-breathe v-bind(handoverBreathMs) ease-in-out v-bind(handoverBreaths);
}

/* Lichtstreifen — EIN Lauf über die Karte. */
.wf-sheen {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 38%;
  opacity: 0;
  transform: translateX(-120%) skewX(-18deg);
  background: linear-gradient(100deg, transparent, rgba(242, 234, 210, 0.22), transparent);
  pointer-events: none;
}

.wf--debut .wf-sheen,
.wf--handover .wf-sheen {
  animation: wf-sheen v-bind(sheenMs) cubic-bezier(0.2, 0.7, 0.3, 1) 1;
}

/* Textaufstieg nur bei der Übergabe — beim Auftakt steht die Karte schon. */
.wf--handover .wf-name,
.wf--handover .wf-task,
.wf--handover .wf-foot {
  animation: wf-rise v-bind(riseMs) cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

.wf--handover .wf-task {
  animation-delay: v-bind(rise2Ms);
}

.wf--handover .wf-foot {
  animation-delay: v-bind(rise3Ms);
}

@keyframes wf-breathe {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

@keyframes wf-sheen {
  0% {
    opacity: 0;
    transform: translateX(-120%) skewX(-18deg);
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(220%) skewX(-18deg);
  }
}

@keyframes wf-rise {
  from {
    opacity: 0;
    transform: translateY(0.45em);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Gleiche Spezifität wie die Phasenregeln, sonst gewinnen die. */
@media (prefers-reduced-motion: reduce) {
  .wf--debut .wf-glow,
  .wf--handover .wf-glow,
  .wf--debut .wf-sheen,
  .wf--handover .wf-sheen,
  .wf--handover .wf-name,
  .wf--handover .wf-task,
  .wf--handover .wf-foot {
    animation: none;
  }
}

.wf-name,
.wf-task,
.wf-count {
  overflow: hidden;
}

/* Eine Zeile über die volle Breite: die 41 Namen gehen bis 23 Zeichen, und die
   Spalte trägt auf Full HD 380 px. */
.wf-name {
  display: block;
  height: 1.2em;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 1.28em;
  font-weight: 800;
  line-height: 1.2;
  color: #f2ead2;
}

/* Die Anweisung — was der Spieler tun soll. */
.wf-task {
  height: 1.35em;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 1.06em;
  line-height: 1.35;
  color: var(--hc-dim);
}

/* Zähler und Lohn teilen den Fuss; beide sind an ihrer Seite verankert, also
   wandert nichts, wenn eine Zahl eine Stelle gewinnt. */
.wf-foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75em;
  height: 1.66em;
}

.wf-count {
  flex: 0 0 auto;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 1.13em;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: #b89b5a;
  font-variant-numeric: tabular-nums;
}

.wf-boon {
  flex: 0 1 auto;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 0.75em;
  min-width: 0;
}

.wf-boon__part {
  display: flex;
  align-items: baseline;
  gap: 0.3em;
  min-width: 0;
}

.wf-boon__art {
  align-self: center;
  flex-shrink: 0;
  width: 1.2em;
  height: 1.2em;
  object-fit: contain;
}

/* Vier Materialien haben kein Artwork — gleiche Kantenlänge wie ein Bild,
   damit die Felder in Flucht bleiben (Muster der Header-Materialzeile). */
.wf-boon__mono {
  align-self: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.2em;
  height: 1.2em;
  font-size: 0.95em;
  color: var(--hc-color, var(--rpg-gold));
}

.wf-boon__amount {
  font-size: 1.5em;
  font-weight: 900;
  line-height: 1;
  color: var(--hc-color, var(--rpg-gold));
  font-variant-numeric: tabular-nums;
}

.wf-boon__unit {
  font-size: 0.7em;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hc-mute);
}

/* Die Kompaktstufe greift an der SPALTENBREITE, nicht am Viewport-Namen:
   darunter fällt `--hud-col-w` unter rund 350 px und bei 1536 (Full HD @125 %)
   auf den Boden 232. Dort bekommt die Aufgabe zwei Zeilen zurück, und die
   Einheit des Lohns weicht ins `title` — Icon und Zahl tragen ihn allein. */
@media (max-width: 1800px) {
  .wf-task {
    height: 2.7em;
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .wf-boon__unit {
    display: none;
  }
}
</style>
