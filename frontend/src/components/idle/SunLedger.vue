<script setup lang="ts">
/**
 * Die Bilanz der laufenden Pause, seitlich an der Sonnenscheibe: rechts, was die
 * Sonne an HP verloren hat, links, was sie zurückgewonnen hat.
 *
 * Warum das hier steht: Void-Einschläge und Boss-Enrage laufen während der Pause
 * WEITER — die Sonne nimmt Schaden, während der Spieler wegsieht. Sichtbar war
 * davon bisher nur, dass die Vitalitätsleiste stiller schrumpfte. Der Ledger
 * macht aus dem Zustand ein Ereignis: die Summe steht dauerhaft, jeder einzelne
 * Treffer steigt als eigene Zahl auf.
 *
 * Es steht NUR die Zahl. Keine Beschriftung, kein Motiv, keine Trennlinie, kein
 * Rahmen, keine Akzentlinie — neben einer Scheibe, die selbst kein Chrome trägt,
 * las sich jedes davon als Kasten ohne Rahmen statt als Ablesewert. Die
 * Bedeutung tragen Farbe und Vorzeichen: grün mit `+` links, rot mit `−` rechts.
 * Der Wortlaut steckt im `aria-label` der Zahl.
 *
 * Und sie steht erst, wenn wirklich etwas passiert ist. Ein dauerhaftes „−0"
 * wäre eine Anzeige ohne Aussage; so ist jede Zahl an der Scheibe ein Ereignis,
 * und eine frische Pause bleibt dort so ruhig wie vor diesem Feature. Dass die
 * Zahl vorher fehlt, verschiebt nichts: die Randspalten der Heldenzeile sind
 * `minmax(0, 1fr)` und damit inhaltsunabhängig breit, ihre Höhe ist der
 * Scheibendurchmesser.
 *
 * Die Zahl klebt an der Innenkante und wächst nach AUSSEN — zur Scheibe hin
 * darf sie nie wandern, dort steht der Blickfang des Panels.
 *
 * Alles, was sich bewegt, bewegt sich als `transform`/`opacity`:
 *  • die Treffer steigen per Keyframe auf (Name in der Klasse, nie aus JS —
 *    Vue hängt scoped Keyframes einen Scope-Suffix an);
 *  • der Schein der Summe ist STATISCH, was atmet ist eine zweite, farblose
 *    Lage derselben Ziffern — dasselbe Muster wie beim Pause-Timer.
 */
import { computed } from 'vue'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import { DAMAGE_FLOAT_DURATION_MS, PAUSE_LEDGER_POP_OFFSETS } from '@/config/constants'

const props = defineProps<{
  /** `damage` steht rechts der Scheibe, `regen` links — Farbe, Vorzeichen und
   *  Leserichtung hängen daran. */
  tone: 'damage' | 'regen'
  /** Summe der laufenden Pause (bereits ganzzahlig, ≥ 0). */
  total: number
  /**
   * Einzelne Treffer, die gerade aufsteigen. Nur der Schadens-Ledger führt sie:
   * die Regeneration fällt jede Sekunde in kleinen Beträgen an und wäre als
   * Pop-Feuerwerk unlesbar — sie ist ein Fluss, kein Ereignis.
   */
  pops?: { id: number; value: number }[]
}>()

const isDamage = computed(() => props.tone === 'damage')
const sign = computed(() => (isDamage.value ? '−' : '+'))
const label = computed(() => (isDamage.value ? 'Damage taken' : 'HP restored'))
/**
 * Erst wenn wirklich etwas angekommen ist. Die Schwelle liegt bewusst am
 * GERUNDETEN Wert: die Regeneration fällt in Bruchteilen an, und ein „+0" wäre
 * eine Anzeige ohne Aussage. Bei unversehrter Sonne bleibt die Seite ganz leer —
 * `playerStore.regenTick()` schreibt dann nichts in seinen Zähler.
 */
const isVisible = computed(() => props.total > 0)
// formatNumberCompact statt formatNumber: die Spalte ist ~210 px breit, und
// formatNumber liefert im Extremfall "999.99K" — sieben Zeichen plus Vorzeichen.
const valueText = computed(() => `${sign.value}${formatNumberCompact(props.total)}`)

/**
 * Drift des aufsteigenden Treffers — immer nach AUSSEN, also vom Ledger weg in
 * den freien Panelrand: rechts der Scheibe nach rechts, links davon nach links.
 * Nach Index gegriffen statt gewürfelt: dieselbe Zahl darf beim Neurendern
 * nicht springen.
 */
function popOffset(index: number): string {
  const px = PAUSE_LEDGER_POP_OFFSETS[index % PAUSE_LEDGER_POP_OFFSETS.length]
  return `${isDamage.value ? px : -px}px`
}
</script>

<template>
  <div
    class="ledger"
    :class="`ledger--${tone}`"
    :style="{ '--pop-ms': `${DAMAGE_FLOAT_DURATION_MS}ms` }"
  >
    <!-- Der Auftritt gehört der Zahl, nicht dem Container: solange nichts
         angekommen ist, steht hier auch für Screenreader nichts. Eingeblendet
         wird über `opacity` und `scale` — beides Compositor-Arbeit. -->
    <Transition name="ledger-in">
      <span v-if="isVisible" class="ledger__value" role="img" :aria-label="`${label}: ${total}`">
        <!-- Farbloser Zwilling hinter den Ziffern: `text-shadow` zeichnet auch bei
             transparenter Schrift, übrig bleibt reiner Schein. Er liegt exakt auf
             der Zahl und blendet im Takt auf — animiert wird nur `opacity`. Der
             Takt auf der Zahl selbst rasterte sonst in jedem Frame neu. -->
        <span class="ledger__glow" aria-hidden="true">{{ valueText }}</span>
        {{ valueText }}
      </span>
    </Transition>

    <!-- Aufsteigende Treffer. Eigene Ebene über allem, ohne Einfluss auf die
         Zeilenhöhe: die Höhe dieser Spalte ist an die Sonnenscheibe geklemmt,
         und ein Zuwachs dort zöge den Fit-Scale des ganzen Overlays mit. -->
    <span v-if="pops && pops.length > 0" class="ledger__pops" aria-hidden="true">
      <span
        v-for="(p, i) in pops"
        :key="p.id"
        class="ledger__pop"
        :style="{ '--dx': popOffset(i) }"
        >{{ sign }}{{ formatNumberCompact(p.value) }}</span
      >
    </span>
  </div>
</template>

<style scoped>
.ledger {
  position: relative;
  display: flex;
  flex-direction: column;
  /* Die Spalte ist so hoch wie ihr Inhalt und wird von der Heldenzeile mittig
     gestellt — sie darf die Zeile nie höher machen als die Scheibe. Steht keine
     Zahl darin, ist sie leer und beansprucht nichts. */
  max-height: 100%;
}

/* Der Schaden steht rechts der Scheibe, die Zahl an dessen Innenkante — von
   dort wächst sie nach außen. Die Regeneration spiegelt das. `transform-origin`
   folgt derselben Kante, damit die Zahl beim Auftritt aus ihr aufgeht statt von
   der Scheibe weg zu rutschen. */
.ledger--damage {
  align-items: flex-start;
  text-align: left;
  --ledger-hi: #ff7a6a;
  --ledger-origin: left center;
}

.ledger--regen {
  align-items: flex-end;
  text-align: right;
  --ledger-hi: #74d448;
  --ledger-origin: right center;
}

/* ── Auftritt ──
   Nur beim ERSCHEINEN, und höchstens einmal je Pause. Kein Leave-Zustand: die
   Zahl verschwindet während einer Pause nie, und beim Fortsetzen geht das ganze
   Overlay. */
.ledger-in-enter-active {
  transition:
    opacity 260ms ease-out,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ledger-in-enter-from {
  opacity: 0;
  transform: scale(0.72);
}

@media (prefers-reduced-motion: reduce) {
  .ledger-in-enter-active {
    transition: opacity 160ms ease-out;
  }
  .ledger-in-enter-from {
    transform: none;
  }
}

/* ── Die Summe ── */
/* Die Größe hängt an der SCHEIBE, nicht am Viewport (`--sun-d` kommt aus der
   Heldenzeile): die Spalte darf nie höher werden als die Scheibe neben ihr,
   sonst überliefe sie das Phasen-Label darunter. Mit `vw` allein wäre das nicht
   zu halten — Panelgröße und Viewport laufen wegen des Fit-Scales gerade nicht
   parallel. Der Faktor liegt bei 0,26 statt 0,4: die Meta-Säulen der
   Standtafel verengen die Randspalten auf ~210 px, und die Bilanz der Pause
   darf nicht größer dastehen als die Werte, die sie begleitet. */
.ledger__value {
  position: relative;
  display: inline-block;
  transform-origin: var(--ledger-origin);
  font-size: clamp(1.6rem, calc(var(--sun-d, 180px) * 0.26), 3rem);
  font-weight: 800;
  line-height: 1.05;
  white-space: nowrap;
  color: var(--ledger-hi);
  font-variant-numeric: tabular-nums;
  /* Grundschein statisch. Was atmet, ist die Ebene darunter. */
  text-shadow:
    0 0 20px color-mix(in srgb, var(--ledger-hi) 40%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.85);
}

.ledger__glow {
  position: absolute;
  inset: 0;
  color: transparent;
  text-shadow: 0 0 30px var(--ledger-hi);
  opacity: 0;
  pointer-events: none;
  animation: ledger-breathe 5s ease-in-out infinite;
}

@keyframes ledger-breathe {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.85;
  }
}

/* Im Ruhezustand atmet nichts — der Ledger ist dann nur noch eine Beschriftung. */
.ledger--idle .ledger__glow {
  animation: none;
}

/* ── Aufsteigende Treffer ── */
.ledger__pops {
  position: absolute;
  /* An derselben Innenkante wie die Summe: die Treffer steigen dort auf, wo die
     Zahl steht, und laufen nicht quer über die Scheibe. */
  left: 0;
  top: 55%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.ledger--regen .ledger__pops {
  left: auto;
  right: 0;
}

.ledger__pop {
  position: absolute;
  bottom: 0;
  left: 0;
  font-size: clamp(1.15rem, 1.7vw, 1.6rem);
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  color: var(--ledger-hi);
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 12px color-mix(in srgb, var(--ledger-hi) 60%, transparent),
    0 1px 4px rgba(0, 0, 0, 0.95);
  /* Name in der Klasse, Dauer als Variable — aus JS wird hier nichts gesetzt. */
  animation-name: ledger-pop-up;
  animation-duration: var(--pop-ms);
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: forwards;
}

.ledger--regen .ledger__pop {
  left: auto;
  right: 0;
}

/* Der Treffer schlägt an der Zahl auf und driftet dann nach außen weg — die
   Zwischenschritte interpolieren `--dx` von 0 aus, daraus wird eine Diagonale
   in den freien Panelrand statt einer Senkrechten quer über die Beschriftung. */
@keyframes ledger-pop-up {
  0% {
    opacity: 0;
    transform: translate(0, 16px) scale(0.65);
  }
  16% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.2), 0) scale(1.12);
  }
  30% {
    transform: translate(calc(var(--dx) * 0.35), -12px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), -74px) scale(0.92);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ledger__glow,
  .ledger__pop {
    animation: none;
  }
  /* Ohne Animation trüge `forwards` sonst nichts — der Treffer bliebe unsichtbar. */
  .ledger__pop {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.5), -26px);
  }
}
</style>
