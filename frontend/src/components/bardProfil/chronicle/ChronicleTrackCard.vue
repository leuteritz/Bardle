<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { toRoman } from '@/utils/ui/format'
import { CHRONICLE_STAGES_PER_TRACK } from '@/config/constants'
import type { ChronicleTrackView } from '@/types'

/**
 * Eine Bahn des Chronicle als Karte: was sie zählt, wie weit sie geschrieben
 * ist und was ihre erreichte Stufe gerade bewirkt. Beim Hover tauscht die
 * untere Hälfte gegen die vollständige Leiter I–V.
 *
 * Rein darstellend — Fortschritt, Schwelle und Wirkung kommen fertig aus
 * `achievementStore.trackViews`. Die Karte rechnet nichts nach, damit die Zahl
 * auf dem Balken und die Zahl, die der Bonus wirklich benutzt, nicht
 * auseinanderlaufen können.
 */
const props = defineProps<{ track: ChronicleTrackView }>()

const maxed = computed(() => props.track.stage >= CHRONICLE_STAGES_PER_TRACK)

/**
 * Die fünf Segmente des Fortschrittsbalkens.
 *
 * Ein Balken statt zweier Leisten: vorher standen Stufenpunkte und ein
 * Fortschrittsbalken übereinander und sagten dasselbe zweimal — wie weit bin
 * ich, und wie weit bin ich. Jetzt trägt ein Element beides, weil das Segment
 * der laufenden Stufe TEILGEFÜLLT ist.
 */
const segments = computed(() =>
  Array.from({ length: CHRONICLE_STAGES_PER_TRACK }, (_, i) => {
    if (i < props.track.stage) return { fill: 1, done: true, active: false }
    if (i === props.track.stage) return { fill: props.track.progress, done: false, active: true }
    return { fill: 0, done: false, active: false }
  }),
)

/** Wirkung mit eingesetztem Wert; ohne Stufe steht dort, was die erste bringt. */
const effectLine = computed(() => {
  const value = props.track.stage > 0 ? props.track.value : props.track.stages[0].value
  return props.track.effect.replace('{v}', String(value))
})

/** Die Leiter für den Hover: jede Stufe mit ihrer Schwelle und ihrem Wert. */
const ladder = computed(() =>
  props.track.stages.map((stage, i) => ({
    numeral: toRoman(i + 1),
    threshold: stage.threshold,
    value: stage.value,
    done: i < props.track.stage,
    /** Die Stufe, an der gerade gearbeitet wird — sie bekommt den Rahmen. */
    next: i === props.track.stage,
  })),
)

/** Rabatt-Bahnen zählen nach unten; das Vorzeichen gehört zur Aussage. */
const sign = computed(() => (props.track.effect.includes('−{v}') ? '−' : '+'))
</script>

<template>
  <article
    class="ct-card"
    :class="{ 'ct-card--maxed': maxed, 'ct-card--dormant': track.stage === 0 }"
    :style="{ '--tc': track.color }"
  >
    <!-- Farbkante links: die Bahn ist auf einen Blick zuzuordnen, ohne dass die
         Fläche selbst gefärbt werden muss. Statisch. -->
    <span class="ct-edge" />
    <!-- Schein für den Hover. Eigene Ebene mit statischem Verlauf, animiert wird
         nur ihre Opazität — ein Schein direkt am Rahmen hieße, die Box samt
         Schatten pro Frame neu zu rastern. -->
    <span class="ct-sheen" />

    <div class="ct-head">
      <span class="ct-icon-box">
        <Icon :icon="track.icon" width="30" height="30" class="ct-icon" />
      </span>
      <span class="ct-titles">
        <span class="ct-name">{{ track.name }}</span>
        <span class="ct-blurb">{{ track.blurb }}</span>
      </span>
      <span class="ct-stage">
        <span class="ct-stage-num">
          <template v-if="track.stage > 0">{{ toRoman(track.stage) }}</template>
          <template v-else>—</template>
        </span>
        <span class="ct-stage-of">{{ track.stage }}/{{ CHRONICLE_STAGES_PER_TRACK }}</span>
      </span>
    </div>

    <!-- Ein Balken, fünf Segmente. Das laufende ist teilgefüllt. -->
    <div class="ct-segs">
      <span
        v-for="(seg, i) in segments"
        :key="i"
        class="ct-seg"
        :class="{ 'ct-seg--done': seg.done, 'ct-seg--active': seg.active }"
      >
        <!-- Der Füllstand skaliert per transform statt über die Breite: derselbe
             Grund wie überall im Spiel — Breite erzwingt Layout, transform
             bleibt Compositor-Arbeit. -->
        <span class="ct-seg-fill" :style="{ transform: `scaleX(${seg.fill})` }" />
      </span>
    </div>

    <!-- Untere Zone: Ruhezustand und Leiter liegen ÜBEREINANDER, gleiche Fläche.
         Deshalb klappt hier nichts in der Höhe auf — ein wachsendes Element
         würde in einem Raster jede Nachbarkarte pro Frame neu umbrechen, und
         aus dem Scroll-Container ragen darf ohnehin nichts. -->
    <div class="ct-swap">
      <div class="ct-swap-rest">
        <span v-if="maxed" class="ct-count ct-count--done">
          {{ $formatNumber(track.current) }} {{ track.unit }} · complete
        </span>
        <span v-else class="ct-count">
          {{ $formatNumber(track.current) }}
          <span class="ct-count-sep">/</span>
          {{ $formatNumber(track.nextThreshold ?? 0) }}
          <span class="ct-count-unit">{{ track.unit }}</span>
        </span>
        <span class="ct-effect">
          <span class="ct-effect-text">{{ effectLine }}</span>
          <span v-if="track.stage === 0" class="ct-effect-pending">at I</span>
        </span>
      </div>

      <div class="ct-swap-ladder" aria-hidden="true">
        <span class="ct-ladder-cap">Milestones</span>
        <div class="ct-ladder">
          <span
            v-for="step in ladder"
            :key="step.numeral"
            class="ct-step"
            :class="{ 'ct-step--done': step.done, 'ct-step--next': step.next }"
          >
            <span class="ct-step-num">{{ step.numeral }}</span>
            <span class="ct-step-goal">{{ $formatNumber(step.threshold) }}</span>
            <span class="ct-step-val">{{ sign }}{{ step.value }}%</span>
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════
   Eine Chronicle-Bahn. Holzrahmen wie jede Karte im Profil, die Bahnfarbe
   liegt als `--tc` am Wurzelelement und färbt Kante, Icon, Stufenzeichen und
   Segmente — eine Variable statt fünf gleichlautender Regeln je Bahn.

   Alles Bewegte ist `transform` oder `opacity`. Acht Karten stehen gleichzeitig
   auf dem Schirm; ein Schein, der am Rahmen selbst hängt, würde jede von ihnen
   pro Frame neu rastern lassen — deshalb liegt er als eigene Ebene darunter und
   wird nur ein- und ausgeblendet.
════════════════════════════════════════════════════════════════════════════ */
.ct-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 14px 13px 17px;
  overflow: hidden;
  background: #1a1008;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px #2c1806;
  /* Nur transform — der Rahmenwechsel darunter läuft über die eigene
     Schein-Ebene, nicht über border-color. */
  transition: transform 0.16s ease-out;
}

.ct-card:hover {
  transform: translateY(-3px);
  z-index: 1;
}

/* ─ Farbkante links ─ */
.ct-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--tc);
  opacity: 0.85;
}
.ct-card--dormant .ct-edge {
  opacity: 0.35;
}

/* ─ Hover-Schein: statischer Verlauf, nur die Opazität bewegt sich ─ */
.ct-sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(120% 90% at 0% 0%, rgba(232, 192, 64, 0.1), transparent 62%);
  transition: opacity 0.16s ease-out;
}
.ct-card:hover .ct-sheen {
  opacity: 1;
}

/* Ausgereizt: die Bahnfarbe übernimmt den Rahmen. Statischer Zustand, kein
   Puls — der Umschlag findet einmal im Spielleben statt. */
.ct-card--maxed {
  border-color: var(--tc);
  background: #1c1208;
}

/* Noch keine Stufe: gedämpft, aber lesbar. Kein grayscale-Filter — der würde
   die Karte in eine eigene Ebene zwingen, achtmal. */
.ct-card--dormant .ct-icon,
.ct-card--dormant .ct-name {
  opacity: 0.72;
}

/* ─ Kopf: Icon, Name, Stufenzeichen ─ */
.ct-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}

.ct-icon-box {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 4px;
}

.ct-icon {
  color: var(--tc);
}

.ct-titles {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.ct-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--tc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ct-blurb {
  font-size: 12px;
  line-height: 1.25;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Das Zahlzeichen trägt die Karte — es ist die Antwort auf „wie weit bin ich".
   Die kleine Bruchzeile darunter fängt die Rückfrage „von wie vielen" ab. */
.ct-stage {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  min-width: 34px;
}

.ct-stage-num {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  color: var(--tc);
}

.ct-stage-of {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #6b5a3c;
  font-variant-numeric: tabular-nums;
}

.ct-card--dormant .ct-stage-num {
  color: #6b5a3c;
}

/* ─ Ein Balken aus fünf Segmenten ─ */
.ct-segs {
  position: relative;
  display: flex;
  gap: 3px;
}

.ct-seg {
  position: relative;
  flex: 1;
  height: 7px;
  overflow: hidden;
  background: #0d0b06;
  border: 1px solid #2c1806;
  border-radius: 2px;
}

.ct-seg-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: var(--tc);
  /* Der Füllstand wächst weich mit, wenn der Zähler springt (ein Boss, eine
     Expedition). Nur `transform` — das läuft auf dem Compositor. */
  transition: transform 0.3s ease-out;
}

/* Erledigte Segmente stehen satt, das laufende bleibt etwas heller als der
   Untergrund, damit man sieht, WO gearbeitet wird. */
.ct-seg--done {
  border-color: var(--tc);
}
.ct-seg--active {
  border-color: #6b4a1e;
}

/* ─ Untere Zone: Ruhezustand ⇄ Leiter, gleiche Fläche ─ */
.ct-swap {
  position: relative;
  /* Höhe für BEIDE Zustände. Fest, weil sonst der Tausch die Kartenhöhe ändern
     würde — und damit das Raster.
     Bemessen an der Leiter, nicht am Ruhezustand: sie ist der höhere der beiden
     Inhalte, und ihre Zahlen sollen ohne Zusammenquetschen lesbar bleiben. Der
     Platz ist da — drei Kartenzeilen brauchen auf Full HD 460 der 545 px, die
     der Scroll-Bereich hergibt. */
  min-height: 66px;
}

.ct-swap-rest,
.ct-swap-ladder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  transition: opacity 0.16s ease-out;
}

.ct-swap-rest {
  justify-content: center;
  gap: 5px;
  opacity: 1;
}

.ct-swap-ladder {
  gap: 3px;
  opacity: 0;
  pointer-events: none;
}

.ct-card:hover .ct-swap-rest {
  opacity: 0;
}
.ct-card:hover .ct-swap-ladder {
  opacity: 1;
}

/* ─ Ruhezustand: Stand und Wirkung ─ */
.ct-count {
  font-size: 13px;
  color: #d8cbb0;
  font-variant-numeric: tabular-nums;
}
.ct-count-sep {
  color: #6b5a3c;
}
.ct-count-unit,
.ct-count--done {
  color: var(--rpg-text-muted);
}
.ct-count--done {
  font-size: 13px;
  color: var(--tc);
}

.ct-effect {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  line-height: 1.3;
}

.ct-effect-text {
  color: #e8c040;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ct-card--dormant .ct-effect-text {
  color: #8a7a5a;
}

/* Was die erste Stufe brächte — als Aussicht, nicht als geltender Wert. */
.ct-effect-pending {
  flex-shrink: 0;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b5a3c;
}

/* ─ Hover: die Leiter I–V ─ */
.ct-ladder-cap {
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6b5a3c;
}

.ct-ladder {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 3px;
  flex: 1;
}

.ct-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 3px 1px;
  background: #141410;
  border: 1px solid #2c1806;
  border-radius: 3px;
  min-width: 0;
}

.ct-step-num {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: #6b5a3c;
}

.ct-step-goal {
  font-size: 11px;
  line-height: 1.1;
  color: var(--rpg-text-muted);
  font-variant-numeric: tabular-nums;
}

.ct-step-val {
  font-size: 11px;
  line-height: 1.1;
  color: #8a7a5a;
  font-variant-numeric: tabular-nums;
}

/* Geschriebene Stufen: Zeichen und Wert in der Bahnfarbe. */
.ct-step--done {
  background: #1e1408;
  border-color: var(--tc);
}
.ct-step--done .ct-step-num,
.ct-step--done .ct-step-val {
  color: var(--tc);
}
.ct-step--done .ct-step-goal {
  color: #d8cbb0;
}

/* Die Stufe, an der gearbeitet wird. */
.ct-step--next {
  border-color: #7a4e20;
}
.ct-step--next .ct-step-num {
  color: #e8c040;
}

/* Full HD / WUXGA — der flachste Viewport: drei Kartenzeilen müssen neben die
   Kopfzeile passen, ohne dass der Text darunter schrumpft. */
@media (max-height: 1100px) {
  .ct-card {
    gap: 7px;
    padding: 10px 12px 11px 15px;
  }
  .ct-icon-box {
    width: 36px;
    height: 36px;
  }
  .ct-name {
    font-size: 15px;
  }
  .ct-stage-num {
    font-size: 21px;
  }
  .ct-swap {
    min-height: 62px;
  }
}

/* 4K und höher: die Karte hat Platz, also darf sie ihn nehmen — sonst wirken
   die Bahnen auf der großen Fläche verloren. */
@media (min-height: 1600px) {
  .ct-card {
    gap: 11px;
    padding: 15px 17px 16px 20px;
  }
  .ct-icon-box {
    width: 50px;
    height: 50px;
  }
  /* Das Glyph wächst mit seiner Box — die Attribute am <svg> gäben sonst
     weiterhin 30px vor und das Icon schwämme in der größeren Fassung. */
  .ct-icon {
    width: 36px;
    height: 36px;
  }
  .ct-name {
    font-size: 18px;
  }
  .ct-blurb,
  .ct-count,
  .ct-count--done {
    font-size: 13px;
  }
  .ct-stage-num {
    font-size: 29px;
  }
  .ct-effect {
    font-size: 14px;
  }
  .ct-swap {
    min-height: 76px;
  }
  .ct-step-goal,
  .ct-step-val {
    font-size: 12px;
  }
  .ct-step-num {
    font-size: 13px;
  }
}
</style>
