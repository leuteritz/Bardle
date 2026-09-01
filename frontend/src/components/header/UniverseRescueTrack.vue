<script setup lang="ts">
/**
 * Die Fortschrittszeile der Universe-Rettung: der Balken, der Prestige-Button
 * und der Übergang zwischen beiden.
 *
 * Beide liegen absolut auf demselben Feld (inset: 0) — gleiche Maße und
 * gleiche Position ergeben sich damit aus der Struktur, statt am Button
 * nachgerechnet zu werden. Genau deshalb sind sie EINE Komponente und nicht
 * zwei: was sie verbindet, ist das gemeinsame Feld und der Wisch zwischen
 * ihnen, und beides ließe sich über eine Komponentengrenze hinweg nur mit
 * geteiltem Layout-Wissen aufrechterhalten.
 *
 * Die Meilenstein-Rauten bleiben bewusst außerhalb: sie stehen auch dann
 * noch, wenn der Button den Balken abgelöst hat.
 *
 * Der Button öffnet KEINEN Kasten mehr. Er führt ins Firmament, wo die drei
 * Wege als Portale im schwarzen Raum stehen — der Reiter zeigt denselben
 * Übergang für jede vergangene Bahn ohnehin schon als Bild.
 */
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useUiStore } from '@/stores/core/uiStore'
import { formatNumber } from '@/config/ui/numberFormat'
import { UNIVERSE_BAR_TICK_PERCENTS, UNIVERSE_BAR_FILL_INSET_PX } from '@/config/constants'

const props = defineProps<{
  /** Hover-Zustand der umgebenden Zeile — hebt Fassung und Kontur hervor. */
  glow?: boolean
}>()

const gameStore = useGameStore()
const uiStore = useUiStore()

const progress = computed(() => gameStore.universeRescueProgress)

/* Eigener Hover-Zustand statt des Zeilen-Hovers aus der Elternkomponente:
   der deckt auch die Meilenstein-Rauten mit ab, "über dem Balken" ist
   genau dieses Element. */
const isBarHovered = ref(false)

/* Im Ruhezustand der Prozentwert, beim Hovern die Zahlen dahinter:
   gesammelte und benötigte Chimes. Der Balken beantwortet damit beide
   Fragen — wie weit noch, und wie viel genau. */
const barText = computed(() =>
  isBarHovered.value
    ? `${formatNumber(gameStore.chimesForNextUniverse)}/${formatNumber(gameStore.chimesToUniverseRescue)}`
    : `${progress.value.toFixed(1)}%`,
)

/* Der Balken trägt keine Meep-Zahl mehr: Ausbeute und Fraß stehen an der
   Meep-Kachel darüber, in Klammern hinter dem Bestand (UniverseStatsRow).
   Dort gehören sie hin — der Spieler liest, was er HAT und was er BEKOMMT,
   in einem Blick, statt die zweite Zahl eine Zeile tiefer zu suchen. */

/* Die Prozentzahl steht mittig im Balken und wird beim Füllen von der Goldkante
   überlaufen — eine einzelne Textfarbe ist dann zwangsläufig irgendwann
   falsch. Statt einer Umschaltschwelle liegen zwei identisch positionierte
   Ebenen übereinander: hell für den dunklen Track, dunkel für den Füller.
   Die dunkle wird exakt an der Füllkante abgeschnitten, sodass jedes Zeichen
   — und bei halb überlaufener Zahl jede Zeichenhälfte — die Farbe trägt, die
   auf ihrem Untergrund lesbar ist. */
const fillClipStyle = computed(() => ({
  clipPath: `inset(0 max(0px, calc(100% - ${progress.value}% - ${UNIVERSE_BAR_FILL_INSET_PX}px)) 0 0)`,
}))

const glowClass = computed(() => (props.glow ? 'is-glowing' : null))
</script>

<template>
  <div class="rescue-slot">
    <Transition name="prestige-reveal">
      <div
        v-if="!gameStore.prestigeAvailable"
        key="bar"
        class="rpg-bar-wrap"
        :class="glowClass"
        @mouseenter="isBarHovered = true"
        @mouseleave="isBarHovered = false"
      >
        <div class="rpg-bar-fill" :style="{ width: progress + '%' }">
          <div class="rpg-bar-gloss" />
          <!-- Ein einzelner Schräg-Schimmer, der per transform über den Balken
               wandert (GPU) — statt eines dauerhaft laufenden Streifenmusters,
               das als Paint-Animation jede Frame den Header neu zeichnen ließe. -->
          <div class="rpg-bar-sweep" />
        </div>
        <div class="rpg-segments" aria-hidden="true">
          <div
            v-for="tick in UNIVERSE_BAR_TICK_PERCENTS"
            :key="tick"
            class="rpg-segment-line"
            :class="{ 'rpg-segment-line--passed': progress >= tick }"
            :style="{ left: tick + '%' }"
          />
        </div>
        <div class="rpg-bar-border" />
        <div class="rpg-bar-text">
          <span v-ink-center.x.y class="rpg-bar-pct">{{ barText }}</span>
        </div>
        <!-- Deckungsgleiche zweite Ebene in Dunkel, an der Füllkante
             abgeschnitten — siehe fillClipStyle. -->
        <div class="rpg-bar-text rpg-bar-text--on-fill" :style="fillClipStyle" aria-hidden="true">
          <span v-ink-center.x.y class="rpg-bar-pct rpg-bar-pct--dark">{{ barText }}</span>
        </div>
      </div>

      <button
        v-else
        key="prestige"
        class="prestige-btn"
        :class="glowClass"
        aria-label="Universe rescued — open the Firmament and choose a way on"
        @click.stop="uiStore.requestOpenFirmamentDeparture()"
      >
        <span class="prestige-shine" aria-hidden="true" />
        <span v-ink-center.x.y class="prestige-label">Prestige</span>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
/* Das gemeinsame Feld von Balken und Prestige-Button. Beide liegen darin
   absolut auf inset: 0 — identische Maße und Position ohne eine einzige
   nachgerechnete Höhe, und beim Umschalten kann nichts springen. */
.rescue-slot {
  position: relative;
  width: 100%;
  min-width: 0;
  height: var(--rescue-track-h);
  flex-shrink: 0;
}

/* ================================================================
   FORTSCHRITTSBALKEN — ohne Beschriftung, nur der Prozentwert. Was der
   Balken misst, sagt der Tooltip der Zeile; im Header zählt die Zahl.
   ================================================================ */
.rpg-bar-wrap {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.65),
    inset 0 1px 5px rgba(0, 0, 0, 0.8);
  background: #0d0904;
  transition: box-shadow 0.25s ease;
}

.rpg-bar-wrap.is-glowing {
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.65),
    0 0 14px rgba(255, 200, 60, 0.5),
    inset 0 1px 5px rgba(0, 0, 0, 0.8);
}

.rpg-bar-border {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  border: 1px solid rgba(200, 144, 64, 0.42);
  pointer-events: none;
  z-index: 3;
}

/* Verlauf waagerecht in Laufrichtung statt als gewölbte Röhre — flacher,
   ruhiger, und der Balken liest sich als eine Bewegung. */
.rpg-bar-fill {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  min-width: 5px;
  border-radius: 3px;
  background: linear-gradient(to right, #b8791c 0%, #e0a828 55%, #f5d666 100%);
  transition: width 1.1s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  z-index: 1;
}

/* Helle Fortschrittskante: markiert den Stand punktgenau, auch wenn der
   Balken selbst durch die Segmente läuft. */
.rpg-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 2px;
  background: #fff4c8;
  box-shadow: 0 0 8px rgba(255, 230, 140, 0.9);
}

.rpg-bar-gloss {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 42%;
  background: linear-gradient(to bottom, rgba(255, 250, 210, 0.22) 0%, transparent 100%);
  pointer-events: none;
}

.rpg-bar-sweep {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 32%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 255, 255, 0.28) 50%,
    transparent 100%
  );
  animation: barSweep 4.5s ease-in-out infinite;
  pointer-events: none;
}

/* Zehn gleiche Segmente statt vier Skalenstriche: die Trennlinien liegen
   über dem Füller und geben ihm eine ablesbare Rasterung. */
.rpg-segments {
  position: absolute;
  inset: 2px;
  pointer-events: none;
  z-index: 2;
}

.rpg-segment-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.45);
  transition:
    background 0.4s ease,
    box-shadow 0.4s ease;
}

/* Überschrittene Trennlinie: bleibt dunkel (sonst verschwindet sie im hellen
   Gold), bekommt aber einen warmen Schein — der Balken zeigt damit selbst,
   welche Abschnitte versiegelt sind. */
.rpg-segment-line--passed {
  background: rgba(58, 26, 0, 0.8);
  box-shadow: 0 0 6px rgba(255, 216, 120, 0.55);
}

/* Die Prozentzahl steht auf beiden Achsen mittig im Balken. Kein Glow
   hinter der Schrift — auf dem hellen Goldfüller trägt allein der harte
   dunkle Schlagschatten die Lesbarkeit. */
.rpg-bar-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
}

/* Nur bis zur Füllkante sichtbar. Dieselbe Dauer und Kurve wie die Breite
   des Füllers, sonst läuft der Farbwechsel dem Gold hinterher. */
.rpg-bar-text--on-fill {
  z-index: 6;
  transition: clip-path 1.1s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Einziger Text im Balken. Ohne Namen daneben darf die Zahl größer stehen —
   sie ist jetzt die Beschriftung. */
.rpg-bar-pct {
  font-size: clamp(11px, calc(var(--header-height) * 0.17), 19px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Die Ebene auf dem hellen Goldfüller — dieselbe Lösung wie beim
   Forge-Badge im Header, statt Weiß mit Schlagschatten. */
.rpg-bar-pct--dark {
  color: #2a1608;
  text-shadow: 0 1px 0 rgba(255, 240, 180, 0.55);
}

/* Weg in Prozent der EIGENEN Breite (32% des Füllers): von left:-40% bis
   hinter die rechte Kante sind das 140/32 ≈ 437% — so bleibt der Lauf bei
   jedem Füllstand und jeder Auflösung derselbe, ohne px-Annahme. */
@keyframes barSweep {
  0% {
    transform: translateX(0);
  }
  55%,
  100% {
    transform: translateX(437%);
  }
}

/* ================================================================
   PRESTIGE BUTTON — liegt auf demselben Feld wie der Balken, tritt aber
   bewusst nicht als weitere gefüllte Fläche auf: der Balken WAR die
   Fläche, und sie ist voll. Stattdessen eine dunkle Fassung in Amethyst
   mit kräftiger Goldkontur und einer goldenen Kopfleiste — der Header
   öffnet hier eine Tür, statt einen Riegel zu zeigen. Die Wortmarke steht allein und weit gesperrt in der Mitte.
   ================================================================ */
.prestige-btn {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  font-size: clamp(11px, calc(var(--header-height) * 0.17), 19px);
  font-weight: 800;
  /* Ohne flankierende Zeichen trägt die Sperrung allein die Breite des
     Balkens — eng gesetzt schwämme das Wort in der Fläche. Den Überhang,
     den CSS hinter das letzte Zeichen setzt, rechnet v-ink-center am
     Label wieder heraus. */
  letter-spacing: 0.3em;
  text-transform: uppercase;
  background: linear-gradient(
    to bottom,
    rgba(168, 108, 246, 0.26) 0%,
    rgba(74, 36, 140, 0.2) 45%,
    rgba(14, 8, 30, 0.92) 100%
  );
  background-color: #180d2c;
  color: #f5d666;
  border: 1px solid rgba(232, 192, 64, 0.72);
  border-radius: 4px;
  cursor: pointer;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.65),
    inset 0 -7px 14px rgba(0, 0, 0, 0.45);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    filter 0.18s ease;
}

/* Goldene Kopfleiste des Knopfes — sie sitzt INNERHALB der Kontur (top/left/
   right: 1px) und rundet mit ihr ab, liegt also auf dem Knopf statt über ihm. */
.prestige-btn::before {
  content: '';
  position: absolute;
  top: 1px;
  left: 1px;
  right: 1px;
  height: 2px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  pointer-events: none;
}

/* Der atmende Schein liegt auf einer eigenen Ebene und variiert nur seine
   opacity: eine box-shadow-Keyframe-Animation wäre eine Paint-Animation
   und ließe den halben Header jede Frame neu zeichnen (dasselbe Muster
   wie bei den Notification-Badges im Header). */
.prestige-btn::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 4px;
  pointer-events: none;
  box-shadow:
    0 0 12px rgba(168, 108, 246, 0.75),
    0 0 26px rgba(232, 192, 64, 0.35);
  opacity: 0;
  animation: prestigePulse 2.6s ease-in-out infinite;
}

/* Eigene Ebene nur fürs Clipping des Schimmers — läge overflow: hidden auf
   dem Button selbst, würde es seinen Glow gleich mit abschneiden. */
.prestige-shine {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 4px;
  pointer-events: none;
}

/* Derselbe wandernde Schräg-Schimmer wie im Balken (transform, GPU) — er
   nimmt die Laufrichtung auf, in der sich der Balken gefüllt hat. */
.prestige-shine::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 30%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 245, 205, 0.42) 50%,
    transparent 100%
  );
  animation: prestigeSweep 3.4s ease-in-out infinite;
}

.prestige-label {
  position: relative;
  line-height: 1;
  white-space: nowrap;
}

.prestige-btn:hover {
  transform: scale(1.02);
  border-color: #ffe080;
  color: #fff3c4;
  filter: brightness(1.1);
}

.prestige-btn:active {
  transform: scale(0.97);
}

.prestige-btn.is-glowing {
  border-color: rgba(255, 224, 128, 0.9);
}

@keyframes prestigePulse {
  0%,
  100% {
    opacity: 0.15;
  }
  50% {
    opacity: 1;
  }
}

/* Weg in Prozent der EIGENEN Breite, gleiche Rechnung wie bei barSweep:
   von left: -40% bis hinter die rechte Kante sind das 140/30 ≈ 467%. */
@keyframes prestigeSweep {
  0% {
    transform: translateX(0);
  }
  60%,
  100% {
    transform: translateX(467%);
  }
}

/* ================================================================
   ÜBERGANG BALKEN → BUTTON
   Der Button wischt in derselben Richtung herein, in der sich der
   Balken gefüllt hat — links nach rechts. Der volle Goldbalken bleibt
   darunter stehen und blendet erst aus, wenn der Wisch über ihm ist;
   damit liest sich der Wechsel als Fortsetzung des Füllens, nicht als
   Austausch zweier Elemente.
   ================================================================ */
.prestige-reveal-enter-active {
  transition:
    clip-path 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease;
  z-index: 2;
}

.prestige-reveal-enter-from {
  clip-path: inset(0 100% 0 0);
  opacity: 0.35;
}

.prestige-reveal-enter-to {
  clip-path: inset(0 0 0 0);
}

/* Rückweg (Prestige ausgeführt): der Balken darf einfach aufblenden. */
.prestige-reveal-leave-active {
  transition: opacity 0.4s ease 0.12s;
}

.prestige-reveal-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .rpg-bar-sweep,
  .prestige-btn::after,
  .prestige-shine::after {
    animation: none;
  }

  /* Ohne Puls bleibt der Schein sichtbar, statt ganz zu verschwinden. */
  .prestige-btn::after {
    opacity: 0.6;
  }

  .prestige-reveal-enter-active {
    transition: opacity 0.22s ease;
  }

  .prestige-reveal-enter-from {
    clip-path: none;
    opacity: 0;
  }
}
</style>
