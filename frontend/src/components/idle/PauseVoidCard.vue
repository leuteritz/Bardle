<script setup lang="ts">
/**
 * Eine Karte im Pause-Overlay: was der Void gerade auf die Sonne zuschickt.
 *
 * Der Void läuft während der Pause WEITER — genau wie Sterne und Bosse, und aus
 * demselben Grund: was passiv bekämpft wird (Kader und Turrets feuern auch
 * pausiert), darf auch passiv verloren gehen. Nur neue Wesen erscheinen nicht,
 * sonst legte eines den halben Weg ungesehen zurück. Genau deshalb muss die
 * Lage hier stehen: der Spieler soll entscheiden können, ob er zurückkommt, und
 * das kann er nur, wenn er sie sieht.
 *
 * EINE Karte für alle, nicht eine je Wesen — bei zwei Dutzend wäre die Reihe
 * sonst eine Wand. Sie zeigt das VORDERSTE (dasselbe, auf das sich der
 * Orbit-Beschuss bündelt) und daneben, wie viele noch dahinter kommen.
 *
 * Der Zeitbogen läuft als durchgehende Animation ab, nicht in Sekundensprüngen
 * — dasselbe Muster wie bei `PauseStarCard`: er hängt am absoluten Endzeitpunkt
 * und damit an der Uhr des Browsers statt am Abtasttakt des Overlays.
 */
import { computed, ref, watch, onMounted } from 'vue'
import {
  PAUSE_STAR_CARD_HEIGHT,
  PAUSE_STAR_CARD_PAD_X,
  PAUSE_STAR_DIAL_PX,
  PAUSE_STAR_DIAL_GAP_PX,
  PAUSE_STAR_RING_RADIUS,
  PAUSE_STAR_RING_STROKE,
  PAUSE_STAR_RING_CIRCUMFERENCE,
  PAUSE_VOID_CARD_WIDTH,
  PAUSE_VOID_URGENT_SECS,
  PAUSE_VOID_PIPS_MAX,
} from '@/config/constants'

const props = defineProps<{
  /** Restsekunden bis der vorderste einschlägt — die Zahl im Ring. */
  secs: number
  /** ABSOLUTER Zeitpunkt des Einschlags (Wanduhr, ms). */
  endsAt: number
  /** Gesamte Reisedauer desselben Wesens in ms — der Nenner des Bogens. */
  durationMs: number
  /** Name des vordersten Wesens. */
  name: string
  /** Farbe seiner Schwere. */
  color: string
  /** Bild des Bewohners — fehlt bei den kleinen, gestaltlosen Wesen. */
  dweller?: string
  /** Wie viele insgesamt unterwegs sind. */
  count: number
  /** Wie weit das vorderste heruntergeprügelt ist (0..1). */
  worn: number
}>()

const isUrgent = computed(() => props.secs <= PAUSE_VOID_URGENT_SECS)
const wornPct = computed(() => Math.round(props.worn * 100))

/** Punkte für die Wesen dahinter, gedeckelt — bei zwei Dutzend wäre eine volle
 *  Reihe eine Textur und kein Zählwerk. */
const pips = computed(() => Math.min(props.count, PAUSE_VOID_PIPS_MAX))
const overflow = computed(() => Math.max(0, props.count - PAUSE_VOID_PIPS_MAX))

// ── Zeitbogen ───────────────────────────────────────────────────────────────
// Er FÜLLT sich, während der Stern-Bogen daneben abbrennt: dort verstreicht
// eine Gelegenheit, hier rückt eine Gefahr heran. Dieselbe Mechanik, umgekehrte
// Richtung — und genau daran sind die beiden Karten auseinanderzuhalten.

const arcEl = ref<SVGCircleElement | null>(null)

function armDial(): void {
  const el = arcEl.value
  if (!el) return
  const total = Math.max(1, props.durationMs)
  const elapsed = Math.min(total, Math.max(0, total - (props.endsAt - Date.now())))
  // Ohne Zurücksetzen samt erzwungenem Reflow übernimmt der Browser die
  // laufende Animation gleichen Namens mitsamt ihrer alten Phase.
  el.style.animationName = 'none'
  void el.getBoundingClientRect()
  el.style.animationDuration = `${total}ms`
  el.style.animationDelay = `${-elapsed}ms`
  // Leeren statt setzen: der Name steht in der Klasse. Vue hängt scoped
  // Keyframes einen Scope-Suffix an (`void-dial` → `void-dial-1ad61471`) — ein
  // hier geschriebener Name träfe sie nicht mehr, die Animation liefe dann
  // stumm ins Leere. Genau dieselbe Stelle wie in PauseStarCard.
  el.style.animationName = ''
}

onMounted(armDial)
// Nur wenn sich die UHR ändert (anderes Wesen führt), nicht bei jedem Takt.
watch([() => props.endsAt, () => props.durationMs], armDial)

/**
 * Statischer Rückfall für `prefers-reduced-motion` (dort schaltet die CSS-Regel
 * die Animation ab) — und damit der Bogen schon im ersten Frame richtig steht.
 * `secs` ist die Abhängigkeit, die den Wert im Sekundentakt nachführt.
 */
const dashOffset = computed(() => {
  void props.secs
  const total = Math.max(1, props.durationMs)
  const left = Math.min(1, Math.max(0, (props.endsAt - Date.now()) / total))
  // Umgekehrt zur Stern-Karte: dort leert sich der Bogen, hier füllt er sich.
  return PAUSE_STAR_RING_CIRCUMFERENCE * left
})
</script>

<template>
  <div
    class="pvc"
    :class="{ 'pvc--urgent': isUrgent }"
    :style="{
      '--pvc-color': color,
      '--pvc-w': `${PAUSE_VOID_CARD_WIDTH}px`,
      '--pvc-h': `${PAUSE_STAR_CARD_HEIGHT}px`,
      '--pvc-pad': `${PAUSE_STAR_CARD_PAD_X}px`,
      '--pvc-dial': `${PAUSE_STAR_DIAL_PX}px`,
      '--pvc-gap': `${PAUSE_STAR_DIAL_GAP_PX}px`,
      '--pvc-circ': PAUSE_STAR_RING_CIRCUMFERENCE,
    }"
    :title="`${name} — ${secs}s until it reaches the sun`"
  >
    <!-- Zifferblatt -->
    <div class="pvc-dial" aria-hidden="true">
      <svg class="pvc-dial__svg" viewBox="0 0 100 100">
        <circle
          class="pvc-dial__track"
          cx="50"
          cy="50"
          :r="PAUSE_STAR_RING_RADIUS"
          :stroke-width="PAUSE_STAR_RING_STROKE"
        />
        <circle
          ref="arcEl"
          class="pvc-dial__arc"
          cx="50"
          cy="50"
          :r="PAUSE_STAR_RING_RADIUS"
          :stroke-width="PAUSE_STAR_RING_STROKE"
          :stroke-dasharray="PAUSE_STAR_RING_CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
      <span class="pvc-dial__secs">{{ secs }}</span>
    </div>

    <!-- Was kommt -->
    <div class="pvc-body">
      <!-- Das Wesen selbst — kein Icon, sondern dasselbe Bild, das draussen im
           Schlund steht. Es liegt HINTER dem Text und läuft nach links ins
           Dunkel aus, statt als eigene Spalte neben ihm zu stehen: nebeneinander
           blieben von 208 px nur 56 für die Schrift, und „The Unmaking" wurde
           zu „The Un…". So bekommt das Bild mehr Fläche als vorher UND der Name
           seine volle Breite. Die kleinen Wesen haben kein Bild (sie sind
           gestaltlos), für sie steht der gezeichnete Schlund. -->
      <div class="pvc-art" aria-hidden="true">
        <img
          v-if="dweller"
          :src="dweller"
          alt=""
          class="pvc-art__img"
          draggable="false"
          @dragstart.prevent
        />
        <span v-else class="pvc-art__maw"></span>
        <span class="pvc-art__veil"></span>
      </div>

      <span class="pvc-head__name">{{ name }}</span>

      <!-- Wie viele dahinter noch kommen. Der erste Punkt ist das vorderste
           selbst, deshalb hebt er sich ab. -->
      <span class="pvc-pips" :aria-label="`${count} inbound`">
        <span
          v-for="i in pips"
          :key="i"
          class="pvc-pip"
          :class="{ 'pvc-pip--lead': i === 1 }"
        ></span>
        <span v-if="overflow > 0" class="pvc-pips__more">+{{ overflow }}</span>
      </span>

      <!-- Was der Orbit inzwischen geschafft hat — er feuert auch pausiert.
           Die Zahl steht daneben und nicht nur der Balken: „wie weit bin ich?"
           ist die Frage, die entscheidet, ob man zurückkommt. -->
      <span class="pvc-worn-row">
        <span class="pvc-worn">
          <span class="pvc-worn__fill" :style="{ transform: `scaleX(${worn})` }"></span>
        </span>
        <span class="pvc-worn__pct">{{ wornPct }}%</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.pvc {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--pvc-gap);
  width: var(--pvc-w);
  height: var(--pvc-h);
  padding: 0 var(--pvc-pad);
  background: #140b20;
  border: 1px solid color-mix(in srgb, var(--pvc-color) 45%, #2a1030);
  border-left: 3px solid var(--pvc-color);
  border-radius: 5px;
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.7);
}

/* Der Umschlag ist einmalig, keine Dauerschleife — Farbe und Rahmen dürfen
   deshalb eine Transition tragen (Performance-Regel 2). */
.pvc {
  transition:
    border-color 0.3s ease,
    background 0.3s ease;
}

.pvc--urgent {
  background: #22060c;
  border-color: #cc6050;
}

/* ── Zifferblatt ── */
.pvc-dial {
  position: relative;
  flex-shrink: 0;
  width: var(--pvc-dial);
  height: var(--pvc-dial);
}

.pvc-dial__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  overflow: visible;
}

.pvc-dial__track {
  fill: none;
  stroke: #2a1030;
}

/* Der Bogen füllt sich stetig: Dauer und (negative) Verzögerung schreibt
   `armDial` inline, der NAME steht hier, damit Vues Scope-Suffix an den
   Keyframes greift. Kein `transition` auf stroke-dashoffset — die Animation
   führt den Wert selbst, beides zusammen zöge gegeneinander. */
.pvc-dial__arc {
  fill: none;
  stroke: var(--pvc-color);
  stroke-linecap: round;
  animation-name: void-dial;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  transition: stroke 300ms ease;
}

.pvc--urgent .pvc-dial__arc {
  stroke: #ff8a7a;
}

/* Der Bogen FÜLLT sich — beim Stern läuft derselbe Bogen leer (`dial-drain`).
   Dort verstreicht eine Gelegenheit, hier rückt eine Gefahr heran, und genau
   daran sind die beiden Karten in einer Reihe auseinanderzuhalten. Der Umfang
   kommt als Variable herein, damit er nicht neben dem Radius verwaist. */
@keyframes void-dial {
  from {
    stroke-dashoffset: var(--pvc-circ);
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Ohne Animation (reduced motion) trägt das `stroke-dashoffset`-Attribut aus
   dem Template den Stand — die Regel oben darf ihn dann nicht überschreiben. */
@media (prefers-reduced-motion: reduce) {
  .pvc-dial__arc {
    animation-name: none;
  }
}

.pvc-dial__secs {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}

.pvc--urgent .pvc-dial__secs {
  color: #ff9a86;
}

/* ── Körper ── */
.pvc-body {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  flex: 1;
  /* Das Bild darf bis an die Kartenkante laufen; die Karte selbst clippt. */
  align-self: stretch;
  padding: 6px 0;
}

/* ── Bildnis ── */
/* Dasselbe Bild wie draussen im Schlund, an der rechten Kante angeschnitten und
   nach links ausblendend. Alles statisch — das Overlay steht, hier bewegt sich
   nichts. */
.pvc-art {
  position: absolute;
  top: -1px;
  right: calc(-1 * var(--pvc-pad));
  bottom: -1px;
  width: 78%;
  overflow: hidden;
  pointer-events: none;
}

.pvc-art__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 62% 30%;
  transform: scale(1.12);
  opacity: 0.9;
}

/* Die kleinen Wesen sind gestaltlos — für sie steht der Schlund selbst. */
.pvc-art__maw {
  position: absolute;
  top: 50%;
  right: 14%;
  width: 54%;
  height: 62%;
  border-radius: 50%;
  transform: translateY(-50%) rotate(-14deg);
  background: radial-gradient(ellipse, #05030a 0%, #0b0616 55%, transparent 100%);
  box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--pvc-color) 65%, transparent);
}

/* Der Verlauf nach links ist der Grund, warum der Text lesbar bleibt: er ist
   dort dicht, wo Schrift steht, und gibt das Bild erst rechts frei. */
.pvc-art__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, #140b20 0%, rgba(20, 11, 32, 0.92) 34%, rgba(20, 11, 32, 0.42) 72%, rgba(20, 11, 32, 0.25) 100%),
    linear-gradient(to bottom, rgba(20, 11, 32, 0.5), transparent 30%, transparent 70%, rgba(20, 11, 32, 0.5));
}

/* Text über dem Bild. */
.pvc-head__name,
.pvc-pips,
.pvc-worn-row {
  position: relative;
  z-index: 1;
}

.pvc-head__name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.1;
  color: #f0e4c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Der Name steht über dem Bild — ohne diesen Schatten verlöre er sich in
     dessen hellen Stellen. */
  text-shadow: 0 1px 4px rgba(5, 3, 10, 0.95);
}

/* ── Zählwerk ── */
.pvc-pips {
  display: flex;
  align-items: center;
  gap: 3px;
}

.pvc-pip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pvc-color) 55%, #2a1030);
}

.pvc-pip--lead {
  width: 7px;
  height: 7px;
  background: var(--pvc-color);
}

.pvc-pips__more {
  margin-left: 2px;
  font-size: 9.5px;
  font-weight: 800;
  color: #b8a878;
  font-variant-numeric: tabular-nums;
}

/* ── Fortschritt des Orbits ── */
.pvc-worn-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pvc-worn__pct {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  color: #9ae86a;
  font-variant-numeric: tabular-nums;
}

.pvc-worn {
  position: relative;
  display: block;
  flex: 1;
  min-width: 0;
  height: 4px;
  background: #0b0616;
  border-radius: 3px;
  overflow: hidden;
}

.pvc-worn__fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: linear-gradient(to right, #2e7a1a, #52b830);
}

</style>
