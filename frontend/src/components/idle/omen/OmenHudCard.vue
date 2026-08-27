<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useOmenStore } from '@/stores/progression/omenStore'
import { omenRewardLine } from '@/config/progression/omens'
import { splitDuration } from '@/utils/ui/format'
import { OMEN_DEADLINE_WARN_SEC, OMEN_SWIFT_DURATION_MULT } from '@/config/constants'

/**
 * Woran Bard gerade arbeitet — als Fokus der Kartenspalte.
 *
 * Die Karte ist der ganze Grund, warum das Omen-System im Spielbild wohnt und
 * nicht in einem Menü: ein mittelfristiges Ziel lenkt nur, solange es sichtbar
 * ist. Sie steht aber auch am längsten von allen — bis das Vorzeichen erfüllt
 * oder aufgegeben ist —, und deshalb ist sie im Rang der Spalte weit unten:
 * alles Flüchtige bekommt den Aufriss vor ihr, sie steht dann als Zeile.
 *
 * Weil sie aufgerissen nur noch steht, wenn nichts Dringlicheres da ist, trägt
 * sie ihre AUSGESCHRIEBENE Zielzeile wieder. Sie stand vorher unter 2400 px auf
 * `display: none`, weil fünf Karten gleichzeitig um dieselbe Ecke rangen.
 *
 * Die Karte hat KEINEN eigenen Takt: der Store stellt `omenNow` im
 * Sekundentakt, und die Frist ist auf die Sekunde genau schnell genug.
 */
const omenStore = useOmenStore()
const { activeView } = storeToRefs(omenStore)

/** Restfrist als m:ss. Zerlegt wird mit dem geteilten Helfer, formatiert
 *  eigen — `formatClock` führt eine Stundenspalte, die hier immer 00 wäre. */
const deadlineLabel = computed(() => {
  const view = activeView.value
  if (!view) return ''
  const { minutes, seconds } = splitDuration(view.secondsLeft)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

const urgent = computed(
  () =>
    activeView.value !== null &&
    activeView.value.swiftAvailable &&
    activeView.value.secondsLeft <= OMEN_DEADLINE_WARN_SEC,
)

/** Der Lohn in einer Zeile — dieselbe Fassung, die die Wahlkarte zeigt. */
const rewardLine = computed(() => (activeView.value ? omenRewardLine(activeView.value) : ''))

/** Die Aufgabe mit eingesetzter Menge. */
const objectiveLine = computed(() => {
  const view = activeView.value
  if (!view) return ''
  return view.objective.replace('{n}', view.target.toLocaleString())
})

const fullTitle = computed(() => {
  const view = activeView.value
  if (!view) return ''
  const swift = view.swiftAvailable
    ? ` · ${OMEN_SWIFT_DURATION_MULT}× reward duration if fulfilled within ${deadlineLabel.value}`
    : ' · the swift bonus has lapsed, nothing else is lost'
  return `${view.name} — ${objectiveLine.value}${swift}`
})
</script>

<template>
  <div class="hc ohc" :style="{ '--hc-color': activeView?.color }" :title="fullTitle" role="status">
    <div class="hc-head">
      <Icon
        v-if="activeView"
        :icon="activeView.icon"
        class="hc-glyph"
        width="1.3em"
        height="1.3em"
      />
      <span class="hc-title">{{ activeView?.name }}</span>

      <!-- Die Frist entscheidet nur über den Eilbonus. Ist sie durch, sagt die
           Karte das auch — ein leerer Platz läse sich wie ein Fehler. -->
      <span
        v-if="activeView?.swiftAvailable"
        class="ohc-clock"
        :class="{ 'ohc-clock--urgent': urgent }"
      >
        {{ deadlineLabel }}
      </span>
      <span v-else class="ohc-lapsed">—</span>

      <!-- Aufgeben. Ohne diesen Knopf sperrt ein Vorzeichen, dessen Ziel man
           gerade nicht verfolgt, das ganze System: solange eines läuft, wird
           kein neues angeboten. Dezent, aber dauerhaft sichtbar — ein nur bei
           Hover erscheinender Ausweg ist keiner. -->
      <button
        type="button"
        class="ohc-drop"
        title="Abandon this omen — a new trio is offered shortly"
        @click="omenStore.abandon()"
      >
        ✕
      </button>
    </div>

    <span class="ohc-objective">{{ objectiveLine }}</span>

    <div class="hc-read">
      <span class="hc-read__val">{{ activeView?.progress.toLocaleString() }}</span>
      <span class="hc-read__goal">/{{ activeView?.target.toLocaleString() }}</span>
      <span class="hc-read__unit">{{ activeView?.unit }}</span>
      <span class="hc-read__side">{{ rewardLine }}</span>
    </div>

    <span class="hc-bar">
      <span
        class="hc-bar__fill"
        :style="{ transform: `scaleX(${activeView?.ratio ?? 0})` }"
      ></span>
    </span>
  </div>
</template>

<style scoped>
/* Fläche, Rahmen, Skala und alle Bausteine kommen aus `.hc-*` (rpg-theme.css).
   Hier steht nur, was allein diese Karte hat: die Frist und der Ausweg. */
.ohc-clock {
  flex-shrink: 0;
  font-size: 0.88em;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #b89b5a;
  font-variant-numeric: tabular-nums;
}

/* Nur Deckkraft — ein Puls auf `color` oder `filter` rasterte die Box jede
   Sekunde neu, während darunter der Orbit läuft. */
.ohc-clock--urgent {
  color: var(--rpg-gold);
  animation: ohc-urgent 0.9s ease-in-out infinite;
}

@keyframes ohc-urgent {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.ohc-lapsed {
  flex-shrink: 0;
  font-size: 0.88em;
  font-weight: 800;
  color: #5a5248;
}

.ohc-drop {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.2em;
  height: 1.2em;
  padding: 0;
  border: 1px solid #3e2a14;
  border-radius: 3px;
  background: none;
  color: #6a6258;
  font-size: 0.86em;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.ohc-drop:hover {
  color: #cc6050;
  border-color: #cc6050;
}

/* Die ausgeschriebene Aufgabe. Sie steht wieder da, weil die Karte aufgerissen
   nur noch erscheint, wenn nichts Dringlicheres in der Spalte steht. */
.ohc-objective {
  font-size: 0.92em;
  font-weight: 700;
  line-height: 1.3;
  color: #b89b5a;
  overflow-wrap: anywhere;
}

@media (prefers-reduced-motion: reduce) {
  .ohc-clock--urgent {
    animation: none;
  }
}
</style>
