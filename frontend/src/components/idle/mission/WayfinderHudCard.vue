<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useMissionStore } from '@/stores/progression/missionStore'
import { useUiStore } from '@/stores/core/uiStore'
import { formatNumber } from '@/config/ui/numberFormat'
import { invalidateHudField } from '@/utils/ui/hudField'
import { missionObjectiveLine, MISSION_COUNT } from '@/config/progression/missions'

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
 *
 * Der erfüllte Zustand wartet auf einen KLICK statt sich selbst einzulösen —
 * das ist der Belohnungsmoment, und er zieht den Blick zurück ins Spielbild.
 */
const missionStore = useMissionStore()
const uiStore = useUiStore()
const { activeView, upcomingViews } = storeToRefs(missionStore)

/** Unter einem geöffneten Profil-Tab ist nichts davon zu lesen. */
const visible = computed(() => activeView.value !== null && uiStore.bardActiveTab === null)

/** Die Aufgabe mit eingesetzter Menge. Nur ab 2K im Aufriss (siehe CSS), auf
 *  Full HD sagt der Zähler darunter dasselbe kürzer. */
const objectiveLine = computed(() =>
  activeView.value ? missionObjectiveLine(activeView.value) : '',
)

/** Die volle Aufgabe samt Stimmungszeile und Lohn — Tooltip der Karte. */
const fullTitle = computed(() => {
  const view = activeView.value
  if (!view) return ''
  const tail = view.claimReady ? 'Click to claim' : view.rewardLabel
  return `${view.name} — ${objectiveLine.value}. ${view.blurb} · ${tail}`
})

function claim() {
  missionStore.claim()
}

// ── Unterkante veröffentlichen ───────────────────────────────────────────────
// Dieselbe Mechanik wie bei den vier Karten darunter: wer oben links steht,
// sagt, wo er aufhört. `invalidateHudField()` kommt hier zusätzlich dazu — die
// HUD-Kontur klemmt Drifter und Riss-Ränder gegen diese Kante, und ihr
// Zwischenspeicher keyt nur auf Fenstermaß und Header-Bogen. Die Karte wechselt
// ihre Höhe allein beim Missionswechsel, das ist keine Frame-Kosten-Frage.
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
  <Transition name="wf">
    <div
      v-if="visible && activeView"
      ref="root"
      class="wf-root"
      :class="{ 'wf-root--ready': activeView.claimReady }"
      :style="{ '--accent': activeView.color }"
      role="status"
    >
      <!-- Kopf: welches System spricht, in welchem Kapitel, an welcher Stufe. -->
      <div class="wf-head">
        <span class="wf-head__label">Wayfinder</span>
        <span class="wf-head__chapter">{{ activeView.chapterName }}</span>
        <span class="wf-head__count">{{ activeView.ordinal }}/{{ MISSION_COUNT }}</span>
      </div>

      <!-- Die aktive Mission. Als Schaltfläche, weil sie im erfüllten Zustand
           eine ist — und nicht erst dann zu einer wird: ein Element, das seine
           Rolle wechselt, ist für Tastatur und Screenreader zwei Elemente. -->
      <button
        type="button"
        class="wf-main"
        :disabled="!activeView.claimReady"
        :title="fullTitle"
        @click="claim"
      >
        <span class="wf-stage">
          <Icon :icon="activeView.icon" class="wf-glyph" width="24" height="24" />
        </span>

        <span class="wf-body">
          <span class="wf-name">{{ activeView.name }}</span>
          <span class="wf-objective">{{ objectiveLine }}</span>
          <span class="wf-count">
            <span class="wf-count__now">{{ formatNumber(activeView.progress) }}</span>
            <span class="wf-count__goal">/{{ formatNumber(activeView.target) }}</span>
            <span class="wf-count__unit">{{ activeView.unit }}</span>
          </span>
        </span>

        <span v-if="activeView.claimReady" class="wf-ready">
          <span class="wf-ready__glow" aria-hidden="true"></span>
          <span class="wf-ready__text">Claim</span>
        </span>
        <span v-else class="wf-reward">{{ activeView.rewardLabel }}</span>
      </button>

      <!-- Was danach kommt. Zwei Zeilen — die Vorschau beantwortet „wohin führt
           das", nicht „was kann ich alles". -->
      <div v-if="upcomingViews.length" class="wf-next">
        <span v-for="next in upcomingViews" :key="next.id" class="wf-next__row">
          <Icon :icon="next.icon" class="wf-next__glyph" width="13" height="13" />
          <span class="wf-next__name">{{ next.name }}</span>
          <span class="wf-next__count">
            {{ formatNumber(next.progress) }}/{{ formatNumber(next.target) }} {{ next.unit }}
          </span>
        </span>
      </div>

      <!-- Fortschritt bündig am Kartenfuß: scaleX am Balken selbst, damit pro
           Sekunde kein Layout anfällt. -->
      <span class="wf-bar">
        <span class="wf-bar__fill" :style="{ transform: `scaleX(${activeView.ratio})` }"></span>
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
  gap: 6px;
  /* Unten kein Padding: der Balken sitzt bündig auf der Kante. */
  padding: 7px 10px 0;
  background: #16140e;
  border: 2px solid #5c3310;
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

/* ── Kopfzeile ── */
.wf-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1;
}

.wf-head__label {
  flex-shrink: 0;
  color: var(--accent);
}

.wf-head__chapter {
  flex: 1;
  min-width: 0;
  color: #6a6258;
  letter-spacing: 0.1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wf-head__count {
  flex-shrink: 0;
  color: #8a7a52;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
}

/* ── Die aktive Mission ── */
.wf-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
  padding: 0;
  text-align: left;
  background: transparent;
  border: none;
  cursor: default;
}

.wf-root--ready .wf-main:not(:disabled) {
  cursor: pointer;
}

.wf-stage {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: #100e08;
  border: 1px solid #3a2c14;
  border-radius: 4px;
}

.wf-glyph {
  color: var(--accent);
}

.wf-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.wf-name {
  font-size: 13.5px;
  font-weight: 800;
  line-height: 1.15;
  color: #f2ead2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Erst ab 2K sichtbar — auf Full HD sagt der Zähler darunter dasselbe kürzer. */
.wf-objective {
  display: none;
  font-size: 12px;
  line-height: 1.25;
  color: #b89b5a;
}

/* Kein gap: „7/10" ist EINE Zahl mit Nenner. Die Einheit setzt sich per margin
   selbst ab. */
.wf-count {
  display: flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
}

.wf-count__now {
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  color: var(--accent);
}

.wf-count__goal {
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
  color: #8a7a52;
}

.wf-count__unit {
  margin-left: 5px;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.9px;
  text-transform: uppercase;
  color: #6a6258;
}

/* Rechtsbündig und kürzbar: der Lohn ist die zweitwichtigste Angabe, darf die
   Zählung links aber nie aus der Zeile drücken. */
.wf-reward {
  flex-shrink: 1;
  min-width: 0;
  align-self: flex-end;
  padding-bottom: 1px;
  text-align: right;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.2;
  color: #7a9a6a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Erfüllt, wartet auf den Klick ── */
.wf-ready {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
}

/* Das Atmen läuft über eine EIGENE Ebene mit statischem Schein; animiert wird
   nur deren Opazität. Ein Schatten oder eine Rahmenfarbe in der Animation
   rasterte pro Frame die ganze Box neu. */
.wf-ready__glow {
  position: absolute;
  inset: -1px;
  border-radius: 4px;
  background: rgba(122, 208, 190, 0.55);
  animation: wf-breathe 1.2s ease-in-out infinite;
  pointer-events: none;
}

.wf-ready__text {
  position: relative;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0e1a08;
}

@keyframes wf-breathe {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

/* ── Vorschau ── */
.wf-next {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 5px;
  border-top: 1px solid #2a2318;
}

.wf-next__row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 10px;
  line-height: 1.3;
  color: #6a6258;
}

.wf-next__glyph {
  flex-shrink: 0;
  color: #4e4638;
}

.wf-next__name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wf-next__count {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: #5a5248;
}

/* ── Balken ── */
.wf-bar {
  display: block;
  height: 3px;
  margin: 0 -10px;
  background: rgba(255, 255, 255, 0.07);
}

.wf-bar__fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--accent);
  transition: transform 0.4s ease-out;
}

.wf-root--ready .wf-bar__fill {
  background: #6ec040;
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
    gap: 8px;
    padding: 9px 12px 0;
  }
  .wf-head {
    font-size: 11px;
  }
  .wf-stage {
    width: 46px;
    height: 46px;
  }
  .wf-name {
    font-size: 16px;
  }
  .wf-objective {
    display: block;
  }
  .wf-count__now {
    font-size: 18px;
  }
  .wf-count__goal {
    font-size: 12.5px;
  }
  .wf-count__unit {
    font-size: 10px;
  }
  .wf-reward {
    font-size: 10.5px;
  }
  .wf-ready__text {
    font-size: 12px;
  }
  .wf-next__row {
    font-size: 12px;
  }
  .wf-bar {
    height: 4px;
    margin: 0 -12px;
  }
}

@media (min-width: 3400px) {
  .wf-root {
    width: clamp(232px, calc(var(--header-vp-left, 22vw) - 2rem), 700px);
    gap: 10px;
    padding: 12px 15px 0;
  }
  .wf-head {
    font-size: 14px;
  }
  .wf-stage {
    width: 58px;
    height: 58px;
  }
  .wf-name {
    font-size: 20px;
  }
  .wf-objective {
    font-size: 15px;
  }
  .wf-count__now {
    font-size: 23px;
  }
  .wf-count__goal {
    font-size: 16px;
  }
  .wf-count__unit {
    font-size: 12.5px;
  }
  .wf-reward {
    font-size: 13px;
  }
  .wf-ready__text {
    font-size: 15px;
  }
  .wf-next__row {
    font-size: 15px;
  }
  .wf-bar {
    height: 5px;
    margin: 0 -15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wf-ready__glow {
    animation: none;
    opacity: 0.5;
  }
  .wf-bar__fill {
    transition: none;
  }
}
</style>
