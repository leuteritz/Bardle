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
 * ist. Deshalb steht hier alles, was die Entscheidung „weiterspielen oder
 * umsteuern" braucht — Ziel, Stand, Restfrist, Lohn — und sonst nichts.
 *
 * Sie hat KEINEN eigenen Takt: der Store stellt `omenNow` im Sekundentakt, und
 * die Frist ist auf die Sekunde genau schnell genug. Ein zweiter Timer neben dem
 * Spiel-Tick wäre ein zweiter Grund, pro Sekunde zu rendern.
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

/** Zielzeile mit eingesetzter Menge. */
const objectiveLine = computed(() => {
  const view = activeView.value
  if (!view) return ''
  return view.objective.replace('{n}', view.target.toLocaleString())
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
      role="status"
    >
      <div class="ohc-head">
        <Icon icon="game-icons:star-swirl" width="13" height="13" class="ohc-head__icon" />
        <span class="ohc-head__lbl">Omen</span>

        <!-- Die Frist entscheidet nur über den Eilbonus. Ist sie durch, sagt die
             Karte das auch — ein leerer Platz läse sich wie ein Fehler. -->
        <span
          v-if="activeView.swiftAvailable"
          class="ohc-clock"
          :class="{ 'ohc-clock--urgent': urgent }"
          :title="`Fulfil within ${deadlineLabel} for ${OMEN_SWIFT_DURATION_MULT}× reward duration`"
        >
          <Icon icon="game-icons:sundial" width="11" height="11" class="ohc-clock__icon" />
          <span class="ohc-clock__num">{{ deadlineLabel }}</span>
        </span>
        <span v-else class="ohc-lapsed" title="The swift bonus has lapsed — nothing else is lost">
          lapsed
        </span>
      </div>

      <div class="ohc-main">
        <span class="ohc-stage">
          <Icon :icon="activeView.icon" class="ohc-stage__icon" width="26" height="26" />
        </span>

        <span class="ohc-body">
          <span class="ohc-name">{{ activeView.name }}</span>
          <span class="ohc-objective">{{ objectiveLine }}</span>
        </span>
      </div>

      <div class="ohc-count">
        <span class="ohc-count__now">{{ activeView.progress.toLocaleString() }}</span>
        <span class="ohc-count__sep">/</span>
        <span class="ohc-count__goal">{{ activeView.target.toLocaleString() }}</span>
        <span class="ohc-count__unit">{{ activeView.unit }}</span>
      </div>

      <!-- Fortschritt: scaleX am Balken selbst, damit pro Sekunde kein Layout
           anfällt und der Teilbaum der Karte nicht neu bewertet wird. -->
      <span class="ohc-bar">
        <span class="ohc-bar__fill" :style="{ transform: `scaleX(${activeView.ratio})` }"></span>
      </span>

      <span class="ohc-reward">{{ rewardLine }}</span>
    </div>
  </Transition>
</template>

<style scoped>
/* Oben links, auf derselben Ankerlinie wie die Drifter-Infokarte — die weicht
   nach unten aus, sobald diese hier steht (--omen-card-bottom). Die Breite
   folgt derselben Rechnung wie dort, damit die zwei Karten eine Spalte bilden
   und nicht zwei verschieden breite Zettel. */
.ohc-root {
  position: fixed;
  top: calc(var(--autopick-bottom, 0px) + 0.5rem);
  left: 0.75rem;
  z-index: 899;
  width: clamp(232px, calc(var(--header-vp-left, 22vw) - 1.5rem), 460px);
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px 12px 11px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  overflow: hidden;
}

/* ── Kopfzeile ── */
.ohc-head {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ohc-head__icon {
  color: var(--accent);
  flex-shrink: 0;
}

.ohc-head__lbl {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #8a7a52;
}

.ohc-clock {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: #b89b5a;
}

.ohc-clock__icon {
  flex-shrink: 0;
}

.ohc-clock__num {
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
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
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #6a6258;
}

/* ── Hauptzeile ── */
.ohc-main {
  display: flex;
  align-items: center;
  gap: 9px;
}

.ohc-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent) 55%, #14120c);
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--accent) 22%, #14120c),
    #100e08 74%
  );
}

.ohc-stage__icon {
  color: var(--accent);
}

.ohc-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  line-height: 1.15;
}

.ohc-name {
  font-size: 14px;
  font-weight: 800;
  color: #f2ead2;
}

/* Die Aufgabe ist der Grund für die Karte — sie darf umbrechen, aber nie
   abgeschnitten werden. */
.ohc-objective {
  font-size: 11px;
  color: #b89b5a;
}

/* ── Zählzeile ── */
.ohc-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.ohc-count__now {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  color: var(--accent);
}

.ohc-count__sep,
.ohc-count__goal {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: #8a7a52;
}

.ohc-count__unit {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #6a6258;
}

/* ── Balken ── */
.ohc-bar {
  display: block;
  height: 5px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.ohc-bar__fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--accent);
  transition: transform 0.4s ease-out;
}

/* ── Lohnzeile ── */
.ohc-reward {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.9px;
  color: #7a9a6a;
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
  transform: translateX(-14px) scale(0.94);
}
.ohc-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.97);
}

/* ── Auflösungsstufen ──────────────────────────────────────────────────────
   Auf 2K/4K wächst die Karte mit, sonst ist sie im Verhältnis zum Orbit ein
   Zettel. Die Breite regelt bereits die clamp() oben. */
@media (min-width: 2400px) {
  .ohc-root {
    /* left/width mit der Drifter-Karte gleichziehen — die beiden bilden eine
       Spalte und dürfen auf keiner Stufe um ein paar Pixel versetzt stehen. */
    top: calc(var(--autopick-bottom, 0px) + 0.7rem);
    left: 1rem;
    width: clamp(232px, calc(var(--header-vp-left, 22vw) - 2rem), 580px);
    gap: 9px;
    padding: 11px 15px 13px;
  }
  .ohc-head__lbl {
    font-size: 12px;
  }
  .ohc-clock__num {
    font-size: 15px;
  }
  .ohc-stage {
    width: 48px;
    height: 48px;
  }
  /* Das Attribut am <Icon> setzt nur die Ausgangsgröße — die Stufe muss das
     SVG per CSS mitziehen, sonst schwimmt ein 26px-Glyph in einer 48px-Bühne. */
  .ohc-stage__icon {
    width: 32px;
    height: 32px;
  }
  .ohc-name {
    font-size: 17px;
  }
  .ohc-objective {
    font-size: 13px;
  }
  .ohc-count__now {
    font-size: 24px;
  }
  .ohc-count__sep,
  .ohc-count__goal {
    font-size: 15px;
  }
  .ohc-count__unit,
  .ohc-reward,
  .ohc-lapsed {
    font-size: 12px;
  }
  .ohc-bar {
    height: 6px;
  }
}

@media (min-width: 3400px) {
  .ohc-root {
    width: clamp(232px, calc(var(--header-vp-left, 22vw) - 2rem), 700px);
    gap: 11px;
    padding: 14px 18px 16px;
  }
  .ohc-head__lbl {
    font-size: 14px;
  }
  .ohc-clock__num {
    font-size: 18px;
  }
  .ohc-stage {
    width: 58px;
    height: 58px;
  }
  .ohc-stage__icon {
    width: 40px;
    height: 40px;
  }
  .ohc-name {
    font-size: 21px;
  }
  .ohc-objective {
    font-size: 16px;
  }
  .ohc-count__now {
    font-size: 30px;
  }
  .ohc-count__sep,
  .ohc-count__goal {
    font-size: 18px;
  }
  .ohc-count__unit,
  .ohc-reward,
  .ohc-lapsed {
    font-size: 14px;
  }
  .ohc-bar {
    height: 8px;
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
