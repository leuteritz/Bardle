<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { invalidateHudField } from '@/utils/ui/hudField'
import { useMissionFace } from '@/composables/ui/useMissionFace'
import { missionObjectiveLine } from '@/config/progression/missions'

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
 */

/** Gesicht und Abschlussblitz teilt die Karte mit der Wayfinder-Zeile im
 *  Pause-Overlay — beim Blitz steht der Store schon eine Stufe weiter. */
const { face, flashing } = useMissionFace()

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
    :class="{ 'wf--done': flashing }"
    :style="{ '--hc-color': face?.color }"
    :title="tooltip"
    role="status"
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
