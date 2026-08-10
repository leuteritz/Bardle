<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useUiStore } from '@/stores/core/uiStore'
import { omenRewardLine } from '@/config/progression/omens'
import { splitDuration } from '@/utils/ui/format'
import { OMEN_DEADLINE_WARN_SEC, OMEN_SWIFT_DURATION_MULT } from '@/config/constants'

/**
 * Woran Bard gerade arbeitet — oben links, über der Drifter-Infokarte.
 *
 * Die Karte ist der ganze Grund, warum das Omen-System im Spielbild wohnt und
 * nicht in einem Menü: ein mittelfristiges Ziel lenkt nur, solange es sichtbar
 * ist. Sie steht damit aber auch DAUERND im Bild, anders als die Drifter-Karte
 * daneben, die nach Sekunden wieder geht — deshalb ist sie auf drei Zeilen
 * gedrückt und trägt nur, was die Frage „weiterspielen oder umsteuern"
 * wirklich braucht.
 *
 * Was dafür weichen musste: die ausgeschriebene Zielzeile („Recover 30
 * materials"). Sie sagte dasselbe wie der Zähler darunter („12 / 30
 * materials"), nur länger. Sie steht jetzt im Tooltip der Karte, wo sie beim
 * Nachschlagen zu finden ist, ohne dauerhaft Fläche zu belegen.
 *
 * Die Karte hat KEINEN eigenen Takt: der Store stellt `omenNow` im
 * Sekundentakt, und die Frist ist auf die Sekunde genau schnell genug. Ein
 * zweiter Timer neben dem Spiel-Tick wäre ein zweiter Grund, pro Sekunde zu
 * rendern.
 */
const omenStore = useOmenStore()
const uiStore = useUiStore()
const { activeView } = storeToRefs(omenStore)

/** Unter einem geöffneten Profil-Tab ist nichts davon zu lesen. */
const visible = computed(() => activeView.value !== null && uiStore.bardActiveTab === null)

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

/** Die Aufgabe mit eingesetzter Menge. Nur ab 2K im Aufriss (siehe CSS), auf
 *  Full HD trägt sie der Tooltip. */
const objectiveLine = computed(() => {
  const view = activeView.value
  if (!view) return ''
  return view.objective.replace('{n}', view.target.toLocaleString())
})

/** Die volle Aufgabe samt Lohn — Tooltip der Karte, weil beides im Aufriss
 *  keinen Platz mehr hat. */
const fullTitle = computed(() => {
  const view = activeView.value
  if (!view) return ''
  const objective = view.objective.replace('{n}', view.target.toLocaleString())
  const swift = view.swiftAvailable
    ? ` · ${OMEN_SWIFT_DURATION_MULT}× reward duration if fulfilled within ${deadlineLabel.value}`
    : ' · the swift bonus has lapsed, nothing else is lost'
  return `${view.name} — ${objective}${swift}`
})

// ── Unterkante veröffentlichen ───────────────────────────────────────────────
// Dieselbe Mechanik, mit der die Auto-Pick-Meldung der Drifter-Karte Platz
// macht: wer oben links steht, sagt, wo er aufhört. Ohne das läge die
// Drifter-Karte unter dieser hier, sobald ein Vorzeichen offen ist.
const root = ref<HTMLElement>()
let resizeObserver: ResizeObserver | null = null

function publishBottom() {
  const px = root.value ? root.value.getBoundingClientRect().bottom : 0
  document.documentElement.style.setProperty('--omen-card-bottom', `${px}px`)
}

watch(
  visible,
  async (shown) => {
    await nextTick()
    resizeObserver?.disconnect()
    resizeObserver = null
    if (!shown || !root.value) {
      publishBottom()
      return
    }
    // Die Höhe hängt an Textlängen und Auflösungsstufe — beobachten statt
    // einmalig messen, sonst steht die Nachbarkarte nach einem Resize falsch.
    resizeObserver = new ResizeObserver(publishBottom)
    resizeObserver.observe(root.value)
    publishBottom()
  },
  { immediate: true },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  document.documentElement.style.setProperty('--omen-card-bottom', '0px')
})
</script>

<template>
  <Transition name="ohc">
    <div
      v-if="visible && activeView"
      ref="root"
      class="ohc-root"
      :style="{ '--accent': activeView.color }"
      :title="fullTitle"
      role="status"
    >
      <!-- Zeile 1: wer ruft, und wie lange noch. -->
      <div class="ohc-head">
        <Icon :icon="activeView.icon" class="ohc-glyph" width="17" height="17" />
        <span class="ohc-name">{{ activeView.name }}</span>

        <!-- Die Frist entscheidet nur über den Eilbonus. Ist sie durch, sagt die
             Karte das auch — ein leerer Platz läse sich wie ein Fehler. -->
        <span
          v-if="activeView.swiftAvailable"
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

      <!-- Die ausgeschriebene Aufgabe. Auf Full HD ausgeblendet (dort sagt der
           Zähler darunter dasselbe kürzer), ab 2K eingeblendet: die Karte flucht
           mit der Drifter-Karte und ist dort 548 statt 241 px breit — der Raum
           gehört mit Information gefüllt, nicht mit Luft. -->
      <span class="ohc-objective">{{ objectiveLine }}</span>

      <!-- Zeile 2: Stand links, Lohn rechts. -->
      <div class="ohc-row">
        <span class="ohc-count">
          <span class="ohc-count__now">{{ activeView.progress.toLocaleString() }}</span>
          <span class="ohc-count__goal">/{{ activeView.target.toLocaleString() }}</span>
          <span class="ohc-count__unit">{{ activeView.unit }}</span>
        </span>
        <span class="ohc-reward">{{ rewardLine }}</span>
      </div>

      <!-- Fortschritt bündig am Kartenfuß: scaleX am Balken selbst, damit pro
           Sekunde kein Layout anfällt und der Teilbaum nicht neu bewertet wird. -->
      <span class="ohc-bar">
        <span class="ohc-bar__fill" :style="{ transform: `scaleX(${activeView.ratio})` }"></span>
      </span>
    </div>
  </Transition>
</template>

<style scoped>
/* Oben links, auf derselben Ankerlinie wie die Drifter-Infokarte — die weicht
   nach unten aus, sobald diese hier steht (--omen-card-bottom).
   Breite WORTGLEICH zu ihr: die beiden stehen übereinander, und zwei Karten in
   einer Spalte, deren rechte Kanten um 15 px auseinanderliegen, lesen sich als
   Fehler. Kompakt wird diese Karte über die HÖHE (drei Zeilen statt fünf),
   nicht über die Breite. */
.ohc-root {
  position: fixed;
  top: calc(max(var(--autopick-bottom, 0px), var(--void-card-bottom, 0px)) + 0.5rem);
  left: 0.75rem;
  z-index: 899;
  width: clamp(232px, calc(var(--header-vp-left, 22vw) - 1.5rem), 460px);
  display: flex;
  flex-direction: column;
  gap: 5px;
  /* Unten kein Padding: der Balken sitzt bündig auf der Kante. */
  padding: 8px 10px 0;
  background: #16140e;
  border: 2px solid #5c3310;
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

/* ── Zeile 1 ── */
.ohc-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.ohc-glyph {
  color: var(--accent);
  flex-shrink: 0;
}

/* Der Name trägt die Zeile und darf kürzen — die volle Aufgabe steht im
   Tooltip, hier zählt das Wiedererkennen. */
.ohc-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.15;
  color: #f2ead2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ohc-clock {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #b89b5a;
}

/* Letzte halbe Minute: der Eilbonus steht auf der Kippe. Nur Opazität —
   niemals Schatten oder Rahmenfarbe in einer laufenden Animation. */
.ohc-clock--urgent {
  color: #e8c040;
  animation: ohc-urgent 0.9s ease-in-out infinite;
}

@keyframes ohc-urgent {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.ohc-lapsed {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 800;
  line-height: 1;
  color: #5a5248;
}

.ohc-drop {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
  color: #6a6258;
  background: transparent;
  border: 1px solid #3e2a14;
  border-radius: 3px;
  cursor: pointer;
  transition: color 0.14s ease-out;
}

.ohc-drop:hover {
  color: #cc6050;
}

/* Erst ab 2K sichtbar — siehe Template. */
.ohc-objective {
  display: none;
  font-size: 12px;
  line-height: 1.25;
  color: #b89b5a;
}

/* ── Zeile 2 ── */
.ohc-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

/* Kein gap: „2/4" ist EINE Zahl mit Nenner und darf nicht auseinanderklaffen.
   Die Einheit setzt sich per margin selbst ab. */
.ohc-count {
  display: flex;
  align-items: baseline;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* Die eine große Zahl der Karte — sie beantwortet „wie weit bin ich". */
.ohc-count__now {
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  color: var(--accent);
}

.ohc-count__goal {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #8a7a52;
}

.ohc-count__unit {
  margin-left: 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.9px;
  text-transform: uppercase;
  color: #6a6258;
}

/* Rechtsbündig und kürzbar: der Lohn ist die zweitwichtigste Zahl, aber er
   darf die Zählung links nie aus der Zeile drücken. */
.ohc-reward {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #7a9a6a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Balken ── */
.ohc-bar {
  display: block;
  height: 3px;
  margin: 0 -10px;
  background: rgba(255, 255, 255, 0.07);
}

.ohc-bar__fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--accent);
  transition: transform 0.4s ease-out;
}

/* ── Ein-/Ausblenden ── */
.ohc-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.ohc-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}
.ohc-enter-from {
  opacity: 0;
  transform: translateX(-12px) scale(0.95);
}
.ohc-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.97);
}

/* ── Auflösungsstufen ──────────────────────────────────────────────────────
   Bewusst zurückhaltend: die Karte soll auf 2K/4K lesbar bleiben, aber nicht
   proportional mitwachsen — sie steht dauerhaft im Bild. */
@media (min-width: 2400px) {
  .ohc-root {
    top: calc(var(--autopick-bottom, 0px) + 0.7rem);
    left: 1rem;
    width: clamp(232px, calc(var(--header-vp-left, 22vw) - 2rem), 580px);
    gap: 6px;
    padding: 10px 12px 0;
  }
  .ohc-name {
    font-size: 15px;
  }
  .ohc-objective {
    display: block;
  }
  .ohc-clock,
  .ohc-lapsed {
    font-size: 13px;
  }
  .ohc-count__now {
    font-size: 19px;
  }
  .ohc-count__goal {
    font-size: 13px;
  }
  .ohc-count__unit {
    font-size: 10.5px;
  }
  .ohc-reward {
    font-size: 11px;
  }
  .ohc-drop {
    width: 18px;
    height: 18px;
    font-size: 12px;
  }
  .ohc-bar {
    height: 4px;
    margin: 0 -12px;
  }
}

@media (min-width: 3400px) {
  .ohc-root {
    width: clamp(232px, calc(var(--header-vp-left, 22vw) - 2rem), 700px);
    gap: 8px;
    padding: 13px 15px 0;
  }
  .ohc-name {
    font-size: 19px;
  }
  .ohc-objective {
    font-size: 15px;
  }
  .ohc-clock,
  .ohc-lapsed {
    font-size: 16px;
  }
  .ohc-count__now {
    font-size: 24px;
  }
  .ohc-count__goal {
    font-size: 16px;
  }
  .ohc-count__unit {
    font-size: 13px;
  }
  .ohc-reward {
    font-size: 14px;
  }
  .ohc-drop {
    width: 23px;
    height: 23px;
    font-size: 15px;
  }
  .ohc-bar {
    height: 5px;
    margin: 0 -15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ohc-clock--urgent {
    animation: none;
  }
  .ohc-bar__fill {
    transition: none;
  }
}
</style>
