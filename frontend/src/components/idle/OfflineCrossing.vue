<script setup lang="ts">
import { CROSSING_MAX_OPEN, crossingMultiplier } from '@/utils/game/offlineCrossing'
import type { OfflineCrossingGame } from '@/composables/ui/useOfflineCrossing'
import { formatNumber } from '@/config/ui/numberFormat'
import { computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{ game: OfflineCrossingGame }>()
const emit = defineEmits<{ claim: [] }>()

const g = props.game

const gateEls: (HTMLButtonElement | null)[] = []
let claimEl: HTMLButtonElement | null = null

function setGateEl(el: unknown, i: number) {
  gateEls[i] = (el as HTMLButtonElement | null) ?? null
}

function setClaimEl(el: unknown) {
  claimEl = (el as HTMLButtonElement | null) ?? null
}

/** Die Leiter als Bild: der Stand plus je eine Sprosse pro Tor. */
const ladder = computed(() =>
  Array.from({ length: CROSSING_MAX_OPEN + 1 }, (_, n) => crossingMultiplier(n)),
)

function mult(m: number): string {
  return '×' + m.toFixed(2)
}

const claimLabel = computed(() => {
  if (g.settled.value) return 'Claim ' + mult(g.multiplier.value)
  if (g.opened.value) return 'Bank ' + mult(g.multiplier.value)
  return 'Claim ' + mult(1)
})

const openHint = computed(() => {
  const goal = '→ ' + mult(g.nextMultiplier.value)
  return goal + (g.opened.value ? ' · risks half the bonus' : ' · always safe')
})

/* ── Spielzüge ────────────────────────────────────────────────────────── */
function open(i: number) {
  if (!g.openGate(i)) return
  if (!g.canOpen.value) return
  // Der eben geklickte Knopf wird erst im nächsten Tick `disabled`, ein Fokus
  // davor springt zurück.
  const next = g.stepCursor(1)
  nextTick(() => gateEls[next]?.focus())
}

function claim() {
  emit('claim')
}

/* ── Tastatur ─────────────────────────────────────────────────────────── */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    gateEls[g.stepCursor(e.key === 'ArrowRight' ? 1 : -1)]?.focus()
  } else if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
    e.preventDefault()
    claim()
  }
}

function gateLabel(i: number): string {
  const state = g.gates.value[i]
  if (state === 'chime') return 'Gate ' + (i + 1) + ': a chime gate, ' + mult(g.multiplier.value) + ' banked'
  if (state === 'void') return 'Gate ' + (i + 1) + ': the Void gate'
  if (g.revealed.value[i]) return 'Gate ' + (i + 1) + ': never opened'
  return 'Open gate ' + (i + 1) + ' — ' + mult(g.nextMultiplier.value) + ' if it leads on'
}

watch(
  () => g.settled.value,
  (done) => {
    if (done) nextTick(() => claimEl?.focus())
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  gateEls[0]?.focus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="crossing">
    <svg class="oc-defs" aria-hidden="true">
      <defs>
        <radialGradient id="oc-chime" cx="50%" cy="62%" r="58%">
          <stop offset="0%" stop-color="#6a4a10" />
          <stop offset="100%" stop-color="#150e04" />
        </radialGradient>
        <radialGradient id="oc-void" cx="50%" cy="62%" r="58%">
          <stop offset="0%" stop-color="#4a2a66" />
          <stop offset="100%" stop-color="#0d0a16" />
        </radialGradient>
      </defs>
    </svg>

    <div class="cross">
      <div class="cross-title">The Crossing</div>

      <!-- Die Leiter: wo der Lauf steht und was das nächste Tor trägt. -->
      <div
        class="ladder"
        :class="{ 'ladder--tolled': g.outcome.value === 'void' }"
        role="group"
        aria-label="Multiplier ladder"
      >
        <div
          v-for="(m, n) in ladder"
          :key="n"
          class="rung"
          :class="{
            'rung--done': n <= g.opened.value,
            'rung--next': !g.settled.value && n === g.opened.value + 1,
          }"
        >
          <span class="rung-dot" aria-hidden="true" />
          <span class="rung-v">{{ mult(m) }}</span>
        </div>
      </div>

      <div class="gates" role="group" aria-label="The five gates">
        <button
          v-for="(state, i) in g.gates.value"
          :key="i"
          :ref="(el) => setGateEl(el, i)"
          type="button"
          class="gate"
          :class="{
            'gate--focus': !g.settled.value && state === 'hidden' && i === g.cursor.value,
            'gate--chime': state === 'chime',
            'gate--void': state === 'void',
            'gate--spent': g.revealed.value[i],
          }"
          :disabled="g.settled.value || state !== 'hidden'"
          :aria-label="gateLabel(i)"
          @click="open(i)"
          @mouseenter="g.pickCursor(i)"
        >
          <span class="gate-art">
            <span v-if="state === 'chime'" class="gate-glow" aria-hidden="true" />
            <svg viewBox="0 0 72 96" aria-hidden="true">
              <path class="arch" d="M6 92 V40 A30 30 0 0 1 66 40 V92 Z" />

              <template v-if="state === 'chime'">
                <path d="M16 92 V43 A20 20 0 0 1 56 43 V92 Z" fill="url(#oc-chime)" />
                <path
                  class="spark"
                  d="M36 42 L40.5 53.5 L52 58 L40.5 62.5 L36 74 L31.5 62.5 L20 58 L31.5 53.5 Z"
                />
              </template>

              <template v-else-if="state === 'void'">
                <path d="M16 92 V43 A20 20 0 0 1 56 43 V92 Z" fill="url(#oc-void)" />
                <path class="rift" d="M40 40 L30 58 L40 62 L28 82" />
              </template>

              <template v-else>
                <path class="hollow" d="M16 92 V43 A20 20 0 0 1 56 43 V92 Z" />
                <g class="veil">
                  <path d="M20 56 H52" />
                  <path d="M18 66 H54" />
                  <path d="M18 76 H54" />
                  <path d="M20 86 H52" />
                </g>
                <circle class="keystone" cx="36" cy="46" r="3.5" />
              </template>

              <rect class="sill" x="2" y="90" width="68" height="4" rx="1" />
            </svg>
          </span>

          <span class="gate-cap">
            <template v-if="state === 'chime'">+{{ g.gateStep.value[i] }}</template>
            <template v-else-if="state === 'void'">Toll</template>
            <template v-else-if="!g.settled.value && i === g.cursor.value">Open</template>
            <template v-else>&middot;&middot;&middot;</template>
          </span>
        </button>
      </div>

      <p v-if="!g.settled.value" class="risk" :class="{ 'risk--live': g.opened.value > 0 }">
        <svg width="13" height="13" viewBox="0 0 24 24" class="risk-icon" aria-hidden="true">
          <path d="M12 2 3 5.5v6.9c0 5.6 3.8 9.2 9 9.6 5.2-.4 9-4 9-9.6V5.5L12 2Z" />
        </svg>
        <template v-if="g.opened.value">
          <b>1 in {{ g.hiddenLeft.value }}</b> gates holds the Void &middot; it takes half the bonus
        </template>
        <template v-else>No risk yet &middot; the first gate you open is always safe</template>
      </p>

      <template v-else>
        <p
          class="verdict"
          :class="g.outcome.value === 'perfect' ? 'verdict--good' : 'verdict--void'"
          role="status"
        >
          {{ g.outcome.value === 'perfect' ? 'Perfect crossing' : 'The Void took its toll' }}
        </p>

        <div v-if="g.outcome.value === 'perfect'" class="ledger">
          <div class="cell">
            <span class="cell-k">Banked</span>
            <span class="cell-v cell-v--gold">{{ mult(g.multiplier.value) }}</span>
          </div>
          <div class="cell">
            <span class="cell-k">Gates passed</span>
            <span class="cell-v cell-v--gold">
              {{ CROSSING_MAX_OPEN }} of {{ CROSSING_MAX_OPEN }}
            </span>
          </div>
          <div class="cell">
            <span class="cell-k">Void</span>
            <span class="cell-v cell-v--dim">Untouched</span>
          </div>
        </div>

        <div v-else class="ledger">
          <div class="cell">
            <span class="cell-k">Was banked</span>
            <span class="cell-v cell-v--dim">{{ mult(g.bankedBefore.value) }}</span>
          </div>
          <div class="cell">
            <span class="cell-k">Toll</span>
            <span class="cell-v cell-v--void">&minus; half</span>
          </div>
          <div class="cell">
            <span class="cell-k">Kept</span>
            <span class="cell-v cell-v--gold">{{ mult(g.multiplier.value) }}</span>
          </div>
        </div>
      </template>
    </div>

    <div class="foot">
      <button
        :ref="setClaimEl"
        type="button"
        class="btn"
        :class="g.opened.value || g.settled.value ? 'btn--claim' : 'btn--quiet'"
        @click="claim"
      >
        <span class="btn-t">{{ claimLabel }}</span>
        <span class="btn-s">{{ formatNumber(g.payout.value) }} chimes</span>
      </button>

      <button
        v-if="g.canOpen.value"
        type="button"
        class="btn btn--open"
        @click="open(g.cursor.value)"
      >
        <span class="btn-t">Open a gate</span>
        <span class="btn-s">{{ openHint }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Kein `display: contents` — die Wurzel trägt die Transition des Wirts, und ein
   Element ohne Box nimmt weder opacity noch transform an. */
.crossing {
  display: flex;
  flex-direction: column;
}

.oc-defs {
  position: absolute;
  width: 0;
  height: 0;
}

.cross {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 28px 18px;
  background: #1a1008;
}

.cross-title {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.82rem;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #e8c040;
}

.cross-title::before,
.cross-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #5c3310, transparent);
}

/* ── Leiter ───────────────────────────────────────────── */
.ladder {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: start;
}

.rung {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

/* Der Verbinder liegt auf Höhe der Punkte und endet am nächsten Nachbarn. */
.rung::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 4px;
  width: 100%;
  height: 2px;
  background: #2e1c0a;
}

.rung:last-child::after {
  display: none;
}

.rung--done::after {
  background: #7a4e20;
}

.rung-dot {
  position: relative;
  z-index: 1;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #14100a;
  border: 2px solid #3e200a;
}

.rung--done .rung-dot {
  background: #e8c040;
  border-color: #e8c040;
}

.rung--next .rung-dot {
  border-color: #e8c040;
  background: #1d1608;
}

.rung-v {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: rgba(200, 185, 140, 0.26);
}

.rung--done .rung-v {
  color: #e8c040;
}

.rung--next .rung-v {
  color: rgba(232, 192, 64, 0.66);
}

.ladder--tolled .rung--done::after {
  background: rgba(138, 111, 208, 0.5);
}

.ladder--tolled .rung--done .rung-dot {
  background: #8a6fd0;
  border-color: #8a6fd0;
}

.ladder--tolled .rung--done .rung-v {
  color: #8a6fd0;
}

/* ── Tore ─────────────────────────────────────────────── */
.gates {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.gate {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 11px 0 9px;
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 4px;
  cursor: pointer;
  outline: none;
  transition:
    transform 0.14s ease,
    border-color 0.14s ease,
    box-shadow 0.14s ease;
}

.gate:disabled {
  cursor: default;
}

.gate--focus,
.gate:focus-visible {
  border-color: #e8c040;
  background: #1d1608;
  box-shadow: 0 0 0 2px rgba(232, 192, 64, 0.18);
  transform: translateY(-3px);
}

.gate--chime {
  border-color: rgba(232, 192, 64, 0.55);
  background: #1c1508;
}

.gate--void {
  border-color: rgba(138, 111, 208, 0.6);
  background: #14101f;
}

.gate--spent {
  opacity: 0.34;
}

.gate-art {
  position: relative;
  display: block;
  line-height: 0;
}

/* Gemessen wird der Modalrahmen (container-type im Wirt), nicht der Viewport. */
.gate-art svg {
  display: block;
  width: clamp(56px, 9.5cqw, 84px);
  height: auto;
}

/* Eigene Ebene mit statischem Schein — animiert wird nur ihre Deckkraft. */
.gate-glow {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  border-radius: 50%;
  background: #e8c040;
  box-shadow: 0 0 22px 10px rgba(232, 192, 64, 0.55);
  opacity: 0.24;
  pointer-events: none;
  animation: gate-breathe 2.6s ease-in-out infinite alternate;
}

@keyframes gate-breathe {
  from {
    opacity: 0.12;
  }
  to {
    opacity: 0.3;
  }
}

.arch {
  fill: #100c06;
  stroke: #5c3310;
  stroke-width: 2;
}

.gate--focus .arch,
.gate:focus-visible .arch {
  fill: #1a1206;
  stroke: #e8c040;
}

.gate--chime .arch {
  fill: #221806;
  stroke: #e8c040;
}

.gate--void .arch {
  fill: #191128;
  stroke: #8a6fd0;
}

.hollow {
  fill: #0b0904;
}

.veil {
  fill: none;
  stroke: rgba(92, 51, 16, 0.9);
  stroke-width: 2;
  stroke-linecap: round;
}

.gate--focus .veil,
.gate:focus-visible .veil {
  stroke: rgba(232, 192, 64, 0.5);
}

.keystone {
  fill: rgba(200, 144, 64, 0.4);
}

.gate--focus .keystone,
.gate:focus-visible .keystone {
  fill: #e8c040;
}

.spark {
  fill: #e8c040;
}

.rift {
  fill: none;
  stroke: #e0409f;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sill {
  fill: #5c3310;
}

.gate--void .sill {
  fill: #8a6fd0;
  opacity: 0.55;
}

.gate-cap {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 185, 140, 0.22);
}

.gate--focus .gate-cap,
.gate:focus-visible .gate-cap,
.gate--chime .gate-cap {
  color: #e8c040;
}

.gate--void .gate-cap {
  color: #e0409f;
}

/* ── Risikozeile ──────────────────────────────────────── */
.risk {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 22px;
  font-size: 0.78rem;
  color: rgba(200, 185, 140, 0.44);
}

.risk b {
  font-weight: 400;
  color: rgba(200, 185, 140, 0.72);
}

.risk--live {
  color: rgba(138, 111, 208, 0.72);
}

.risk--live b {
  color: #8a6fd0;
}

/* Gefüllt, nicht konturiert: eine 1,8px-Linie zerfällt bei 13px zu Grau. */
.risk-icon {
  flex-shrink: 0;
  fill: rgba(200, 185, 140, 0.42);
}

.risk--live .risk-icon {
  fill: rgba(138, 111, 208, 0.6);
}

/* ── Verdict ──────────────────────────────────────────── */
.verdict {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 11px 14px;
  border-radius: 4px;
  font-size: 0.86rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.verdict--good {
  background: rgba(82, 184, 48, 0.1);
  border: 1px solid rgba(110, 192, 64, 0.34);
  color: #6ec040;
}

.verdict--void {
  background: rgba(138, 111, 208, 0.1);
  border: 1px solid rgba(138, 111, 208, 0.38);
  color: #8a6fd0;
}

/* ── Ledger ───────────────────────────────────────────── */
.ledger {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  overflow: clip;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-right: 1px solid #3e200a;
}

.cell:last-child {
  border-right: none;
}

.cell-k {
  font-size: 0.64rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 185, 140, 0.38);
}

.cell-v {
  font-size: 1.1rem;
  line-height: 1;
  color: #c8b98c;
}

.cell-v--gold {
  color: #e8c040;
}

.cell-v--void {
  color: #8a6fd0;
}

.cell-v--dim {
  font-size: 1rem;
  color: rgba(200, 185, 140, 0.5);
}

/* ── Fußleiste ────────────────────────────────────────── */
.foot {
  display: flex;
  gap: 14px;
  padding: 16px 28px 20px;
  border-top: 1px solid #3e200a;
}

.btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition:
    filter 0.15s ease,
    transform 0.1s ease;
}

.btn:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.btn:active {
  filter: brightness(0.9);
  transform: translateY(0);
}

.btn-t {
  font-size: 1.05rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.btn-s {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
}

.btn--claim {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}

.btn--claim .btn-s {
  color: rgba(255, 255, 255, 0.75);
}

.btn--open {
  background: linear-gradient(to bottom, #23180a, #170f06);
  border: 1px solid #7a4e20;
  color: #e8c040;
}

.btn--open .btn-s {
  color: rgba(200, 144, 64, 0.7);
}

.btn--quiet {
  background: #16130d;
  border: 1px solid #3e200a;
  color: rgba(200, 185, 140, 0.6);
}

.btn--quiet .btn-s {
  color: rgba(200, 185, 140, 0.32);
}

/* ── Flacher Viewport ─────────────────────────────────── */
@media (max-height: 900px) {
  .cross {
    gap: 11px;
    padding: 15px 28px 14px;
  }

  .gate-art svg {
    width: clamp(48px, 8cqw, 70px);
  }

  .foot {
    padding: 13px 28px 15px;
  }
}

/* ── Reduced motion ───────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .gate,
  .btn {
    transition: none;
  }
  .gate--focus,
  .gate:focus-visible,
  .btn:hover,
  .btn:active {
    transform: none;
  }
  .gate-glow {
    animation: none;
    opacity: 0.22;
  }
}
</style>
