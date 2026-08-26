<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useVoidStore } from '@/stores/world/voidStore'
import { getVoidRift } from '@/config/world/void'
import type { VoidRiftDef } from '@/types'
import {
  VOID_CARD_ICON,
  VOID_CARD_RESULT_MS,
  VOID_CARD_TICK_MS,
  VOID_URGENT_FRAC,
  VOID_SEVERITY_COLOR,
  VOID_SEVERITY_LABEL,
} from '@/config/constants'
import { gameNow } from '@/utils/game/gameClock'

/**
 * Die Bedrohungslage — oben links, an der Spitze des Kartenstapels.
 *
 * Sie zeigt bewusst NICHT alles, was unterwegs ist, sondern das VORDERSTE: das
 * ist auch das Ziel des Orbit-Beschusses, und es ist die einzige Frage, die
 * gerade zählt („was erreicht die Sonne zuerst?"). Wie viele insgesamt kommen,
 * steht als Zahl daneben — ein Dutzend Zeilen untereinander wäre eine Liste,
 * die niemand liest, während etwas heranrückt.
 *
 * Sie steht über Vorzeichen- und Drifter-Karte, und zwar aus einem inhaltlichen
 * Grund: die beiden melden eine Gelegenheit, diese hier eine Frist.
 */
type CardState = 'inbound' | 'slain' | 'impact'

const voidStore = useVoidStore()
const { active, lastOutcome } = storeToRefs(voidStore)

const shownDef = ref<VoidRiftDef | null>(null)
const state = ref<CardState>('inbound')
const visible = ref(false)
/** Eigene Uhr: der Store tickt im Sekundentakt, der Countdown soll flüssig
 *  laufen und der Balken exakt bei der Ankunft ankommen. */
const progress = ref(0)
const remainingMs = ref(0)
const hpRatio = ref(1)
const swarmCount = ref(0)

let resultTimer: ReturnType<typeof setTimeout> | null = null
let ticker: ReturnType<typeof setInterval> | null = null

function clearTimers() {
  if (resultTimer) clearTimeout(resultTimer)
  if (ticker) clearInterval(ticker)
  resultTimer = null
  ticker = null
}

const severityColor = computed(() =>
  shownDef.value ? (VOID_SEVERITY_COLOR[shownDef.value.severity] ?? '#8a6fd0') : '#8a6fd0',
)
const severityLabel = computed(() =>
  shownDef.value ? (VOID_SEVERITY_LABEL[shownDef.value.severity] ?? 'VOID') : 'VOID',
)

const remainingSeconds = computed(() => Math.max(0, Math.ceil(remainingMs.value / 1000)))

/** Ab drei Vierteln des Weges schlägt die Uhr um — nicht bei einer festen
 *  Sekundenzahl, weil die Reisezeiten je Schwere weit auseinanderliegen. */
const urgent = computed(() => state.value === 'inbound' && progress.value >= VOID_URGENT_FRAC)

const headline = computed(() => {
  if (state.value === 'slain') return 'Void slain'
  if (state.value === 'impact') return 'It reached the sun'
  return severityLabel.value
})

/** Wie weit das Wesen schon heruntergeprügelt ist. */
const slainPct = computed(() => Math.round((1 - hpRatio.value) * 100))

// ── Laufender Stand ─────────────────────────────────────────────────────────

function sample(): void {
  const lead = voidStore.leadMonster
  swarmCount.value = active.value.length
  if (!lead) {
    // Nichts mehr unterwegs und kein Ergebnis, das noch steht: die Karte
    // schliesst. Ohne das lief der Ticker mit den letzten Werten weiter und
    // die Karte blieb auf null Sekunden stehen — etwa wenn das Feld ohne
    // Ausgang geräumt wird (Prestige, Admin).
    clearTimers()
    if (state.value === 'inbound') visible.value = false
    return
  }
  const def = getVoidRift(lead.defId)
  if (!def) return
  shownDef.value = def
  const span = Math.max(1, lead.travelMs)
  const t = Math.min(1, Math.max(0, (gameNow() - lead.spawnedAt) / span))
  progress.value = t
  remainingMs.value = Math.max(0, lead.spawnedAt + span - gameNow())
  hpRatio.value = lead.maxHp > 0 ? lead.currentHp / lead.maxHp : 0
}

watch(
  () => active.value.length,
  (n) => {
    if (n === 0) return
    // Ein Ergebnis darf ausstehen bleiben; die Karte kehrt danach von selbst
    // zur Lage zurück, weil der Ticker weiterläuft.
    if (state.value === 'inbound') {
      clearTimers()
      visible.value = true
      sample()
      ticker = setInterval(sample, VOID_CARD_TICK_MS)
    }
  },
  { immediate: true },
)

watch(
  () => lastOutcome.value.seq,
  (seq) => {
    if (!seq) return
    const def = getVoidRift(lastOutcome.value.defId)
    if (!def) return
    showResult(def, lastOutcome.value.sealed ? 'slain' : 'impact')
  },
)

function showResult(def: VoidRiftDef, next: CardState) {
  clearTimers()
  shownDef.value = def
  state.value = next
  visible.value = true
  hpRatio.value = next === 'slain' ? 0 : 1
  resultTimer = setTimeout(() => {
    resultTimer = null
    // Zurück zur Lage, wenn noch etwas unterwegs ist — sonst ausblenden.
    if (active.value.length > 0) {
      state.value = 'inbound'
      sample()
      ticker = setInterval(sample, VOID_CARD_TICK_MS)
    } else {
      visible.value = false
      state.value = 'inbound'
    }
  }, VOID_CARD_RESULT_MS)
}

// ── Unterkante veröffentlichen ──────────────────────────────────────────────
// Dieselbe Mechanik wie bei Auto-Pick- und Vorzeichen-Karte: wer oben links
// steht, sagt, wo er aufhört. Diese hier steht an der SPITZE des Stapels, also
// weichen die anderen ihr aus und nicht umgekehrt.
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
        <Icon :icon="VOID_CARD_ICON" width="13" height="13" class="vhc-head__icon" />
        <span class="vhc-head__lbl">{{ headline }}</span>

        <!-- Wie viele insgesamt unterwegs sind. Steht auch im Ergebniszustand,
             denn genau dann will man wissen, was noch kommt. -->
        <span v-if="swarmCount > 1" class="vhc-swarm" :title="`${swarmCount} inbound`">
          ×{{ swarmCount }}
        </span>

        <span
          v-if="state === 'inbound'"
          class="vhc-clock"
          :class="{ 'vhc-clock--urgent': urgent }"
          :title="`${remainingSeconds}s until it reaches the sun`"
        >
          <span class="vhc-clock__num">{{ remainingSeconds }}</span>
          <span class="vhc-clock__unit">s</span>
        </span>
        <span v-else class="vhc-mark" :class="`vhc-mark--${state}`">
          {{ state === 'slain' ? '✓' : '✕' }}
        </span>
      </div>

      <div class="vhc-main">
        <span class="vhc-stage">
          <Icon :icon="shownDef.icon" class="vhc-stage__icon" width="30" height="30" />
        </span>

        <span class="vhc-body">
          <span class="vhc-name">{{ shownDef.name }}</span>
          <span class="vhc-effect">
            {{ state === 'slain' ? shownDef.boonLine : shownDef.drainLine }}
          </span>
        </span>
      </div>

      <!-- Der eigene Fortschritt am Wesen. -->
      <div v-if="state === 'inbound'" class="vhc-seal">
        <span class="vhc-seal__lbl">Worn down</span>
        <span class="vhc-seal__pct">{{ slainPct }}%</span>
        <span class="vhc-seal__track">
          <span class="vhc-seal__fill" :style="{ transform: `scaleX(${1 - hpRatio})` }"></span>
        </span>
      </div>

      <!-- Sein Weg zur Sonne, bündig am Kartenfuss. Er FÜLLT sich, während die
           anderen Karten des Stapels leerlaufen — hier wächst eine Gefahr,
           statt dass eine Gelegenheit vergeht. -->
      <span class="vhc-bar">
        <span class="vhc-bar__fill" :style="{ transform: `scaleX(${progress})` }"></span>
      </span>
    </div>
  </Transition>
</template>

<style scoped>
/* `max()` über ALLE Vorgänger, nicht nur den direkten: jede Karte der Spalte
   veröffentlicht `0px`, solange sie unsichtbar ist — eine Kette, die nur das
   nächsthöhere Glied liest, rutscht deshalb unter eine sichtbare Karte, sobald
   das dazwischenliegende Glied fehlt. */
.vhc-root {
  position: fixed;
  top: calc(max(var(--wayfinder-bottom, 0px), var(--autopick-bottom, 0px)) + 0.5rem);
  left: var(--hud-col-edge);
  z-index: 899;
  width: var(--hud-col-w);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
  background: var(--rpg-bg-header);
  border: 2px solid var(--rpg-wood);
  border-left: 3px solid var(--severity);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px var(--rpg-wood-inner),
    0 8px 24px rgba(0, 0, 0, 0.85);
  overflow: hidden;
  transition: top 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.vhc-root--slain {
  border-left-color: #52b830;
}
.vhc-root--impact {
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

.vhc-swarm {
  margin-left: auto;
  padding: 1px 6px 2px;
  font-size: 11px;
  font-weight: 800;
  color: #e8dcc0;
  background: #2a1030;
  border: 1px solid var(--severity);
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}

/* Steht ein Schwarm-Chip daneben, rückt die Uhr nicht mehr selbst nach rechts. */
.vhc-swarm + .vhc-clock,
.vhc-swarm + .vhc-mark {
  margin-left: 6px;
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
.vhc-mark--slain {
  color: #52b830;
}
.vhc-mark--impact {
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

/* ── Weg zur Sonne ── */
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

/* ── Auflösungsstufen ──────────────────────────────────────────────────────
   Nur der Anker, keine Schriftgrade. Breite und Rand liegen seit dem Umbau in
   `--hud-col-w` / `--hud-col-edge` — vorher stand diese Karte als einzige der
   Spalte ohne Media-Query da und blieb ab 2400 px hundert Pixel hinter den
   rechten Kanten der vier Nachbarn zurück. */
@media (min-width: 2400px) {
  .vhc-root {
    top: calc(max(var(--wayfinder-bottom, 0px), var(--autopick-bottom, 0px)) + 0.7rem);
  }
}

</style>
