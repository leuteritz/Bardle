<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { toRoman } from '@/utils/ui/format'
import { CHRONICLE_STAGES_PER_TRACK } from '@/config/constants'
import type { ChronicleTrackView } from '@/types'

/**
 * Eine Bahn des Chronicle als Karte: was sie zählt, wie weit sie geschrieben
 * ist und was ihre erreichte Stufe gerade bewirkt.
 *
 * Rein darstellend — Fortschritt, Schwelle und Wirkung kommen fertig aus
 * `achievementStore.trackViews`. Die Karte rechnet nichts nach, damit die Zahl
 * auf dem Balken und die Zahl, die der Bonus wirklich benutzt, nicht
 * auseinanderlaufen können.
 */
const props = defineProps<{ track: ChronicleTrackView }>()

const maxed = computed(() => props.track.stage >= CHRONICLE_STAGES_PER_TRACK)
/** Die Stufenzeichen als Feld, damit das Template nur noch zeichnet. */
const pips = computed(() =>
  Array.from({ length: CHRONICLE_STAGES_PER_TRACK }, (_, i) => i < props.track.stage),
)
/** Wirkung mit eingesetztem Wert; ohne Stufe steht dort, was die erste bringt. */
const effectLine = computed(() => {
  const value = props.track.stage > 0 ? props.track.value : props.track.stages[0].value
  return props.track.effect.replace('{v}', String(value))
})
</script>

<template>
  <article class="ct-card" :class="{ 'ct-card--maxed': maxed, 'ct-card--dormant': track.stage === 0 }" :style="{ '--tc': track.color }">
    <div class="ct-head">
      <span class="ct-icon-box">
        <Icon :icon="track.icon" width="30" height="30" class="ct-icon" />
      </span>
      <span class="ct-titles">
        <span class="ct-name">{{ track.name }}</span>
        <span class="ct-blurb">{{ track.blurb }}</span>
      </span>
      <span class="ct-stage" :title="`Stage ${track.stage} of ${CHRONICLE_STAGES_PER_TRACK}`">
        <template v-if="track.stage > 0">{{ toRoman(track.stage) }}</template>
        <template v-else>—</template>
      </span>
    </div>

    <div class="ct-pips">
      <span v-for="(filled, i) in pips" :key="i" class="ct-pip" :class="{ 'ct-pip--on': filled }" />
    </div>

    <div class="ct-bar-row">
      <div class="ct-bar-track">
        <!-- Der Balken skaliert per transform statt über die Breite: derselbe
             Grund wie überall im Spiel — Breite erzwingt Layout, transform
             bleibt Compositor-Arbeit. -->
        <div class="ct-bar-fill" :style="{ transform: `scaleX(${track.progress})` }" />
      </div>
      <span v-if="maxed" class="ct-bar-label ct-bar-label--done">
        {{ $formatNumber(track.current) }} {{ track.unit }} · complete
      </span>
      <span v-else class="ct-bar-label">
        {{ $formatNumber(track.current) }} / {{ $formatNumber(track.nextThreshold ?? 0) }}
        {{ track.unit }}
      </span>
    </div>

    <p class="ct-effect">
      <span class="ct-effect-arrow">→</span>
      <span class="ct-effect-text">{{ effectLine }}</span>
      <span v-if="track.stage === 0" class="ct-effect-pending">at stage I</span>
    </p>
  </article>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════
   Eine Chronicle-Bahn. Holzrahmen wie jede Karte im Profil, die Bahnfarbe
   liegt als `--tc` am Wurzelelement und färbt Icon, Stufenzeichen, Punkte und
   Balken — eine Variable statt vier gleichlautender Regeln je Bahn.

   Bewusst ohne jede laufende Animation: acht Karten stehen gleichzeitig auf
   dem Schirm, und ein Balken, der sich jede Sekunde bewegt, ist schon
   Bewegung genug.
════════════════════════════════════════════════════════════════════════════ */
.ct-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 14px 13px;
  background: #1a1008;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px #2c1806;
}

/* Ausgereizt: die Bahnfarbe darf den Rahmen übernehmen. Statischer Zustand,
   kein Puls — der Umschlag selbst bekommt keine Transition, weil er einmal im
   Spielleben stattfindet. */
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

/* Das Zahlzeichen trägt die Karte — es ist die Antwort auf „wie weit bin ich". */
.ct-stage {
  flex-shrink: 0;
  min-width: 34px;
  text-align: right;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: var(--tc);
}
.ct-card--dormant .ct-stage {
  color: #6b5a3c;
}

/* ─ Stufenpunkte: fünf Kerben, gefüllt bis zur erreichten ─ */
.ct-pips {
  display: flex;
  gap: 5px;
}

.ct-pip {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #2c1806;
}

.ct-pip--on {
  background: var(--tc);
}

/* ─ Fortschritt zur nächsten Stufe ─ */
.ct-bar-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ct-bar-track {
  position: relative;
  height: 9px;
  overflow: hidden;
  background: #0d0b06;
  border: 1px solid #2c1806;
  border-radius: 3px;
}

.ct-bar-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: var(--tc);
  /* Der Balken wächst weich mit, wenn der Zähler springt (ein Boss, eine
     Expedition). Nur `transform` — das läuft auf dem Compositor. */
  transition: transform 0.25s ease-out;
}

.ct-bar-label {
  font-size: 12px;
  color: var(--rpg-text-muted);
  font-variant-numeric: tabular-nums;
}

.ct-bar-label--done {
  color: var(--tc);
}

/* ─ Wirkung ─ */
.ct-effect {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  padding-top: 1px;
  font-size: 13px;
  line-height: 1.3;
}

.ct-effect-arrow {
  flex-shrink: 0;
  color: #7a4e20;
}

.ct-effect-text {
  color: #e8c040;
}

.ct-card--dormant .ct-effect-text {
  color: #8a7a5a;
}

/* Was die erste Stufe brächte — als Aussicht, nicht als geltender Wert. */
.ct-effect-pending {
  flex-shrink: 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b5a3c;
}

/* Full HD / WUXGA — der flachste Viewport: vier Kartenzeilen müssen neben die
   Kopfzeile passen, ohne dass der Text darunter schrumpft. */
@media (max-height: 1100px) {
  .ct-card {
    gap: 7px;
    padding: 10px 12px 11px;
  }
  .ct-icon-box {
    width: 36px;
    height: 36px;
  }
  .ct-name {
    font-size: 15px;
  }
  .ct-stage {
    font-size: 19px;
  }
}

/* 4K und höher: die Karte hat Platz, also darf sie ihn nehmen — sonst wirken
   die Bahnen auf der großen Fläche verloren. */
@media (min-height: 1600px) {
  .ct-card {
    gap: 11px;
    padding: 15px 17px 16px;
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
  .ct-bar-label {
    font-size: 13px;
  }
  .ct-stage {
    font-size: 26px;
  }
  .ct-effect {
    font-size: 14px;
  }
}
</style>
