<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import { formatNumber } from '@/config/ui/numberFormat'
import { invalidateHudField } from '@/utils/ui/hudField'
import { useMissionFace } from '@/composables/ui/useMissionFace'
import { missionObjectiveLine } from '@/config/progression/missions'
import type { MissionDef } from '@/types'

/**
 * Woran Bard als Nächstes arbeitet — oben links, über allem anderen.
 *
 * Die Karte ist das einzige DAUERHAFTE Glied der linken Spalte, und daraus
 * folgt ihre Position: sie steht ganz oben und schiebt sich nie. Auto-Pick,
 * Riss, Vorzeichen und Drifter sind flüchtig; hinge die Missionskarte an ihnen,
 * wanderte das eine Element, auf das der Spieler sich verlässt, mehrmals pro
 * Minute auf und ab.
 *
 * Sie hat KEINEN eigenen Takt: der Store rechnet im Sekundentakt aus
 * `gameStore.tick()`, und ein Ziel ohne Frist braucht nichts Feineres. Ein
 * zweiter Timer neben dem Spiel-Tick wäre ein zweiter Grund, pro Sekunde zu
 * rendern.
 */
const uiStore = useUiStore()

/** Gesicht und Abschlussblitz teilt die Karte mit der Wayfinder-Zeile im
 *  Pause-Overlay — beim Blitz steht der Store schon eine Stufe weiter, und
 *  diese Einsicht zweimal zu halten hiesse, zwei Zustandsmaschinen zu pflegen. */
const { face, flashing } = useMissionFace()

function tooltipFor(def: MissionDef, rewardLabel: string): string {
  return `${def.name} — ${missionObjectiveLine(def)}. ${def.blurb} · ${rewardLabel}`
}

/** Unter einem geöffneten Profil-Tab ist nichts davon zu lesen. An `face`, nicht
 *  an `activeView`: sonst verschwände die letzte Stufe, während sie gefeiert wird. */
const visible = computed(() => face.value !== null && uiStore.bardActiveTab === null)

// ── Unterkante veröffentlichen ───────────────────────────────────────────────
// Dieselbe Mechanik wie bei den vier Karten darunter: wer oben links steht,
// sagt, wo er aufhört. `invalidateHudField()` kommt hier zusätzlich dazu — die
// HUD-Kontur klemmt Drifter und Riss-Ränder gegen diese Kante, und ihr
// Zwischenspeicher keyt nur auf Fenstermaß und Header-Bogen. Die Karte wechselt
// ihre Höhe gar nicht mehr; der Beobachter fängt Breite und Ein-/Ausblenden.
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
    resizeObserver = new ResizeObserver(publishBottom)
    resizeObserver.observe(root.value)
    publishBottom()
  },
  { immediate: true },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  const style = document.documentElement.style
  style.setProperty('--wayfinder-bottom', '0px')
  style.setProperty('--wayfinder-right', '0px')
  invalidateHudField()
})
</script>

<template>
  <!-- `after-enter`: die Einblendung skaliert, und ein `transform` weckt keinen
       ResizeObserver — ohne diesen Nachschlag bliebe die zuletzt gemessene,
       noch verkleinerte Unterkante stehen und die Spalte darunter säße zu hoch. -->
  <Transition name="wf" @after-enter="publishBottom">
    <div
      v-if="visible && face"
      ref="root"
      class="wf-root"
      :class="{ 'wf-root--done': flashing }"
      :style="{ '--accent': face.color }"
      :title="tooltipFor(face.def, flashing ? 'Claimed' : face.rewardLabel)"
      role="status"
    >
      <!-- Die Kartenfläche IST der Balken. Der Schlüssel wechselt beim
           Missionswechsel und baut das Element neu, damit die Füllung nicht von
           voll auf leer zurückläuft; beim Abschlussblitz bleibt er stehen und
           sie läuft sichtbar voll. -->
      <span
        :key="face.id"
        class="wf-fill"
        :style="{ transform: `scaleX(${face.ratio})` }"
        aria-hidden="true"
      ></span>

      <span class="wf-name">{{ face.name }}</span>
      <span class="wf-task">{{ face.task }}</span>
      <span class="wf-count">
        {{ formatNumber(face.progress) }}/{{ formatNumber(face.target) }}
      </span>
    </div>
  </Transition>
</template>

<style scoped>
/* Ganz oben links, auf derselben Ankerlinie und in derselben Breite wie die
   vier Karten, die sich darunter einreihen — zwei Karten in einer Spalte, deren
   rechte Kanten auseinanderliegen, lesen sich als Fehler. */
.wf-root {
  position: fixed;
  top: 0.5rem;
  left: 0.75rem;
  z-index: 899;
  width: clamp(232px, calc(var(--header-vp-left, 22vw) - 1.5rem), 460px);
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

/* Der Fortschritt IST die Fläche: eigene Ebene, damit nur ihr `transform`
   animiert wird und der Text darüber unberührt bleibt. */
.wf-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: var(--accent);
  opacity: 0.22;
  transition: transform 0.4s ease-out;
  pointer-events: none;
}

/* Über der Füllung — `position` allein reicht, keine eigene Ebene nötig. */
.wf-name,
.wf-task,
.wf-count {
  position: relative;
  min-width: 0;
  overflow: hidden;
}

/* ZWEI Zeilen, und die Höhe steht fest: auf Full HD bleiben der Karte nur 208 px
   Innenbreite (der Header beginnt bei 265), und gemessen kürzten dort 21 der 41
   Namen einzeilig. Die feste Höhe ist Pflicht — wechselte sie mit der Namens-
   länge, wanderte bei jedem Missionswechsel die halbe linke Spalte mit. */
.wf-name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  height: 2.24em;
  font-size: clamp(20px, 1.26vw, 24px);
  font-weight: 800;
  line-height: 1.12;
  color: #f2ead2;
}

/* Die Anweisung — was der Spieler tun soll. Zwei Zeilen fest wie der Name
   darüber, aus demselben Grund. */
.wf-task {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  height: 2.6em;
  font-size: 13px;
  line-height: 1.3;
  color: #9a9184;
}

.wf-count {
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: #b89b5a;
  font-variant-numeric: tabular-nums;
}

/* Abschlussblitz — EIN Umschlag, keine laufende Animation. Kürzer als die
   geerbten 400 ms, sonst ist die halbe Standzeit mit Volllaufen verbraucht. */
.wf-root--done .wf-fill {
  background: #6ec040;
  opacity: 0.38;
  transition-duration: 0.25s;
}

/* ── Ein-/Ausblenden ── */
.wf-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.wf-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}
.wf-enter-from {
  opacity: 0;
  transform: translateX(-12px) scale(0.95);
}
.wf-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.97);
}

/* ── Auflösungsstufen ──────────────────────────────────────────────────────
   Zurückhaltend wie die Nachbarkarten: lesbar auf 2K/4K, aber nicht
   proportional mitwachsend — die Karte steht dauerhaft im Bild. */
@media (min-width: 2400px) {
  .wf-root {
    top: 0.7rem;
    left: 1rem;
    width: clamp(232px, calc(var(--header-vp-left, 22vw) - 2rem), 580px);
    gap: 4px;
    padding: 14px 17px;
  }
  /* Ab hier trägt die Karte 509 px innen — gemessen passt dort jeder der 41
     Namen und jede Anweisung einzeilig, die zweite Zeile wäre nur Leerraum. */
  .wf-name {
    -webkit-line-clamp: 1;
    height: 1.12em;
    font-size: clamp(26px, 1.5vw, 36px);
  }
  .wf-task {
    -webkit-line-clamp: 1;
    height: 1.3em;
    font-size: 17px;
  }
  .wf-count {
    font-size: 18px;
  }
}

@media (min-width: 3400px) {
  .wf-root {
    width: clamp(232px, calc(var(--header-vp-left, 22vw) - 2rem), 700px);
    gap: 5px;
    padding: 17px 20px;
  }
  .wf-name {
    font-size: clamp(32px, 1.3vw, 46px);
  }
  .wf-task {
    font-size: 21px;
  }
  .wf-count {
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wf-fill {
    transition: none;
  }
}
</style>
