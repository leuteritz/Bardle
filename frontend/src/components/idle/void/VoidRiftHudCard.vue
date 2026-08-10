<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useVoidTideStore } from '@/stores/world/voidTideStore'
import { getVoidRift } from '@/config/world/voidTide'
import type { VoidRiftDef } from '@/types'
import {
  VOID_TIDE_CARD_ICON,
  VOID_TIDE_CARD_RESULT_MS,
  VOID_TIDE_CARD_TICK_MS,
  VOID_RIFT_URGENT_FRAC,
  VOID_RIFT_SEVERITY_COLOR,
  VOID_RIFT_SEVERITY_LABEL,
} from '@/config/constants'

/**
 * Was da aufgerissen ist, was es kostet und wie lange noch — oben links, an
 * der Spitze des Kartenstapels.
 *
 * Sie steht ÜBER Vorzeichen- und Drifter-Karte, und zwar als einzige aus einem
 * inhaltlichen Grund: die beiden anderen melden eine Gelegenheit, diese hier
 * eine Frist. Wer die Ecke überfliegt, muss zuerst das sehen, was ihn etwas
 * kostet.
 *
 * Zwei Fortschritte, weil der Spieler zwei Fragen hat. Der breite Balken ist
 * sein eigener („wie weit habe ich ihn?"), die Uhr im Kopf und die Linie am Fuß
 * gehören dem Riss („wie lange habe ich noch?"). Nur einer von beiden liesse
 * die Frage „schaffe ich das?" unbeantwortet.
 */
type CardState = 'open' | 'sealed' | 'collapsed'

const voidTideStore = useVoidTideStore()
const { active, lastOutcome } = storeToRefs(voidTideStore)

const shownDef = ref<VoidRiftDef | null>(null)
const state = ref<CardState>('open')
const visible = ref(false)
/** Eigene Uhr: der Store tickt im Sekundentakt, der Countdown soll flüssig
 *  laufen und der Balken exakt beim Kollaps ankommen. */
const remainingMs = ref(0)
const lifetimeMs = ref(1)
/** Kopie der Trefferpunkte, im selben feinen Takt — der Store schreibt sie nur
 *  einmal je Sekunde, ein Klick soll aber sofort zu sehen sein. */
const hpRatio = ref(1)

let resultTimer: ReturnType<typeof setTimeout> | null = null
let ticker: ReturnType<typeof setInterval> | null = null

function clearTimers() {
  if (resultTimer) clearTimeout(resultTimer)
  if (ticker) clearInterval(ticker)
  resultTimer = null
  ticker = null
}

const activeRift = computed(() => active.value[0] ?? null)

const severityColor = computed(() =>
  shownDef.value ? (VOID_RIFT_SEVERITY_COLOR[shownDef.value.severity] ?? '#8a6fd0') : '#8a6fd0',
)
const severityLabel = computed(() =>
  shownDef.value ? (VOID_RIFT_SEVERITY_LABEL[shownDef.value.severity] ?? 'VOID RIFT') : 'VOID RIFT',
)

const remainingSeconds = computed(() => Math.max(0, Math.ceil(remainingMs.value / 1000)))

/** Ab drei Vierteln der Frist schlägt die Uhr um — nicht bei einer festen
 *  Sekundenzahl, weil die Fristen je Schwere weit auseinanderliegen. */
const urgent = computed(() => {
  if (state.value !== 'open' || lifetimeMs.value <= 0) return false
  const elapsed = 1 - remainingMs.value / lifetimeMs.value
  return elapsed >= VOID_RIFT_URGENT_FRAC
})

/** Restanteil der Frist — treibt die Fusslinie. */
const timeProgress = computed(() => {
  if (state.value !== 'open' || lifetimeMs.value <= 0) return state.value === 'open' ? 0 : 1
  return Math.min(1, Math.max(0, remainingMs.value / lifetimeMs.value))
})

const headline = computed(() => {
  if (state.value === 'sealed') return 'Rift sealed'
  if (state.value === 'collapsed') return 'Rift collapsed'
  return severityLabel.value
})

/** Wie weit der Riss schon weggedrückt ist — das ist die Zahl, die sagt, ob
 *  sich Weiterklicken lohnt. */
const sealedPct = computed(() => Math.round((1 - hpRatio.value) * 100))

// ── Zustandswechsel ─────────────────────────────────────────────────────────

watch(
  activeRift,
  (rift) => {
    if (!rift) return
    const def = getVoidRift(rift.defId)
    if (!def) return
    clearTimers()
    shownDef.value = def
    state.value = 'open'
    visible.value = true
    lifetimeMs.value = Math.max(1, rift.collapseAt - rift.openedAt)
    remainingMs.value = Math.max(0, rift.collapseAt - Date.now())
    hpRatio.value = rift.maxHp > 0 ? rift.currentHp / rift.maxHp : 0
    ticker = setInterval(() => {
      const live = activeRift.value
      if (!live) return
      // Die Frist wird bei einer Stase mitgeschoben — deshalb hier jedes Mal
      // neu aus dem Riss lesen statt einen einmal gemerkten Endzeitpunkt zu
      // halten, sonst liefe die Karte während der Stase gegen null.
      lifetimeMs.value = Math.max(1, live.collapseAt - live.openedAt)
      remainingMs.value = Math.max(0, live.collapseAt - Date.now())
      hpRatio.value = live.maxHp > 0 ? live.currentHp / live.maxHp : 0
    }, VOID_TIDE_CARD_TICK_MS)
  },
  { immediate: true },
)

watch(
  () => lastOutcome.value.seq,
  (seq) => {
    if (!seq) return
    const def = getVoidRift(lastOutcome.value.defId)
    if (!def) return
    showResult(def, lastOutcome.value.sealed ? 'sealed' : 'collapsed')
  },
)

function showResult(def: VoidRiftDef, next: CardState) {
  clearTimers()
  shownDef.value = def
  state.value = next
  visible.value = true
  remainingMs.value = 0
  hpRatio.value = next === 'sealed' ? 0 : 1
  resultTimer = setTimeout(() => {
    visible.value = false
    resultTimer = null
  }, VOID_TIDE_CARD_RESULT_MS)
}

// ── Unterkante veröffentlichen ──────────────────────────────────────────────
// Dieselbe Mechanik wie bei Auto-Pick- und Vorzeichen-Karte: wer oben links
// steht, sagt, wo er aufhört. Diese hier steht an der SPITZE des Stapels, also
// weichen die beiden anderen ihr aus und nicht umgekehrt.
const root = ref<HTMLElement>()
let resizeObserver: ResizeObserver | null = null

function publishBottom() {
  const px = root.value ? root.value.getBoundingClientRect().bottom : 0
  document.documentElement.style.setProperty('--void-card-bottom', `${px}px`)
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
  clearTimers()
  resizeObserver?.disconnect()
  document.documentElement.style.setProperty('--void-card-bottom', '0px')
})
</script>

<template>
  <Transition name="vhc">
    <div
      v-if="visible && shownDef"
      ref="root"
      class="vhc-root"
      :class="`vhc-root--${state}`"
      :style="{ '--accent': shownDef.color, '--severity': severityColor }"
      role="status"
    >
      <div class="vhc-head">
        <Icon :icon="VOID_TIDE_CARD_ICON" width="13" height="13" class="vhc-head__icon" />
        <span class="vhc-head__lbl">{{ headline }}</span>

        <span
          v-if="state === 'open'"
          class="vhc-clock"
          :class="{ 'vhc-clock--urgent': urgent }"
          :title="`${remainingSeconds}s until it collapses`"
        >
          <span class="vhc-clock__num">{{ remainingSeconds }}</span>
          <span class="vhc-clock__unit">s</span>
        </span>
        <span v-else class="vhc-mark" :class="`vhc-mark--${state}`">
          {{ state === 'sealed' ? '✓' : '✕' }}
        </span>
      </div>

      <div class="vhc-main">
        <span class="vhc-stage">
          <Icon :icon="shownDef.icon" class="vhc-stage__icon" width="30" height="30" />
        </span>

        <span class="vhc-body">
          <span class="vhc-name">{{ shownDef.name }}</span>
          <!-- Was es kostet, ist der Grund für die Karte — darf umbrechen,
               niemals abgeschnitten werden. -->
          <span class="vhc-effect">
            {{ state === 'sealed' ? shownDef.boonLine : shownDef.drainLine }}
          </span>
        </span>
      </div>

      <!-- Der eigene Fortschritt. scaleX am Balken selbst, damit pro Takt kein
           Layout anfällt und der Teilbaum nicht neu bewertet wird. -->
      <div v-if="state === 'open'" class="vhc-seal">
        <span class="vhc-seal__lbl">Sealed</span>
        <span class="vhc-seal__pct">{{ sealedPct }}%</span>
        <span class="vhc-seal__track">
          <span class="vhc-seal__fill" :style="{ transform: `scaleX(${1 - hpRatio})` }"></span>
        </span>
      </div>

      <!-- Die Frist des Risses, bündig am Kartenfuss. -->
      <span class="vhc-bar">
        <span class="vhc-bar__fill" :style="{ transform: `scaleX(${timeProgress})` }"></span>
      </span>
    </div>
  </Transition>
</template>

<style scoped>
/* An der Spitze des Stapels oben links — nur die Auto-Pick-Meldung steht noch
   darüber. Breite WORTGLEICH zu Vorzeichen- und Drifter-Karte: die drei stehen
   in einer Spalte, und rechte Kanten, die um ein paar Pixel auseinanderliegen,
   lesen sich als Fehler. */
.vhc-root {
  position: fixed;
  top: calc(var(--autopick-bottom, 0px) + 0.5rem);
  left: 0.75rem;
  z-index: 899;
  width: clamp(232px, calc(var(--header-vp-left, 22vw) - 1.5rem), 460px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-left: 3px solid var(--severity);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  overflow: hidden;
  transition: top 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.vhc-root--sealed {
  border-left-color: #52b830;
}
.vhc-root--collapsed {
  border-left-color: #cc6050;
}

/* ── Kopfzeile ── */
.vhc-head {
  display: flex;
  align-items: center;
  gap: 5px;
}

.vhc-head__icon {
  flex-shrink: 0;
  color: var(--severity);
}

.vhc-head__lbl {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--severity);
}

.vhc-clock {
  margin-left: auto;
  display: flex;
  align-items: baseline;
  gap: 1px;
  padding: 2px 9px 3px;
  color: #b8a878;
  background: #100e08;
  border: 1px solid #3a2c14;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
  /* Einmaliger Umschlag, kein Dauerläufer — Farbe und Rahmen dürfen hier eine
     Transition tragen, weil sie genau einmal wechseln. */
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease;
}

.vhc-clock--urgent {
  color: #ff9a86;
  background: #2a0f0c;
  border-color: #7a2e22;
}

.vhc-clock__num {
  font-size: 19px;
  font-weight: 900;
  line-height: 1;
}

.vhc-clock__unit {
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  opacity: 0.7;
}

.vhc-mark {
  margin-left: auto;
  font-size: 17px;
  font-weight: 900;
  line-height: 1;
}
.vhc-mark--sealed {
  color: #52b830;
}
.vhc-mark--collapsed {
  color: #cc6050;
}

/* ── Hauptteil ── */
.vhc-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.vhc-stage {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: #100e08;
  border: 1px solid #3a2c14;
  border-radius: 4px;
}

.vhc-stage__icon {
  color: var(--accent);
}

.vhc-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.vhc-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.15;
  color: #e8dcc0;
}

.vhc-effect {
  font-size: 11.5px;
  line-height: 1.3;
  color: #b8a878;
}

/* ── Eigener Fortschritt ── */
.vhc-seal {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    'lbl pct'
    'track track';
  align-items: center;
  gap: 3px 6px;
}

.vhc-seal__lbl {
  grid-area: lbl;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a52;
}

.vhc-seal__pct {
  grid-area: pct;
  justify-self: end;
  font-size: 12px;
  font-weight: 800;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.vhc-seal__track {
  grid-area: track;
  position: relative;
  height: 5px;
  background: #100e08;
  border: 1px solid #3a2c14;
  border-radius: 4px;
  overflow: hidden;
}

.vhc-seal__fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
}

/* ── Frist ── */
.vhc-bar {
  position: relative;
  display: block;
  height: 3px;
  margin: 0 -12px -12px;
  background: #100e08;
  overflow: hidden;
}

.vhc-bar__fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: var(--severity);
}

/* ── Auftritt ── */
.vhc-enter-active,
.vhc-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.vhc-enter-from,
.vhc-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
