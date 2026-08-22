<script setup lang="ts">
import {
  OFFLINE_CROSSING_GATES,
  OFFLINE_CROSSING_STEPS,
  OFFLINE_CROSSING_SETTLE_DELAY_MS,
  OFFLINE_CROSSING_VOID_DELAY_MS,
} from '@/config/constants'
import {
  CROSSING_MAX_OPEN,
  crossingMultiplier,
  voidToll,
  placeVoidGate,
} from '@/utils/game/offlineCrossing'
import { formatNumber } from '@/config/ui/numberFormat'
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ chimes: number }>()
const emit = defineEmits<{ claim: [multiplier: number] }>()

type GateState = 'hidden' | 'chime' | 'void'
type Outcome = 'perfect' | 'void'

const gates = ref<GateState[]>(Array(OFFLINE_CROSSING_GATES).fill('hidden'))
const revealed = ref<boolean[]>(Array(OFFLINE_CROSSING_GATES).fill(false))
/** Der gutgeschriebene Schritt hängt an der REIHENFOLGE, nicht an der Position. */
const gateStep = ref<number[]>(Array(OFFLINE_CROSSING_GATES).fill(0))
const cursor = ref(0)
const opened = ref(0)
const multiplier = ref(1)
const bankedBefore = ref(1)
const settled = ref(false)
const outcome = ref<Outcome | null>(null)

/** −1, bis der erste Griff das Void-Tor platziert — der Caretaker's Ward. */
let voidIndex = -1
let settleTimer = 0

const gateEls: (HTMLButtonElement | null)[] = []
const claimEl = ref<HTMLButtonElement | null>(null)

function setGateEl(el: unknown, i: number) {
  gateEls[i] = (el as HTMLButtonElement | null) ?? null
}

const hiddenLeft = computed(() => gates.value.filter((g) => g === 'hidden').length)
const nextMultiplier = computed(() => crossingMultiplier(opened.value + 1))
const canOpen = computed(() => !settled.value && opened.value < CROSSING_MAX_OPEN)

const payout = computed(() => Math.floor(props.chimes * multiplier.value))
const nextStep = computed(() => OFFLINE_CROSSING_STEPS[opened.value] ?? 0)

function mult(m: number): string {
  return `×${m.toFixed(2)}`
}

const claimLabel = computed(() => {
  if (settled.value) return `Claim ${mult(multiplier.value)}`
  if (opened.value) return `Bank ${mult(multiplier.value)}`
  return `Claim ${formatNumber(props.chimes)}`
})

/* ── Spielzüge ────────────────────────────────────────────────────────── */
function openGate(i: number) {
  if (settled.value || gates.value[i] !== 'hidden') return

  if (voidIndex < 0) voidIndex = placeVoidGate(i, OFFLINE_CROSSING_GATES)

  if (i === voidIndex) {
    gates.value[i] = 'void'
    bankedBefore.value = multiplier.value
    multiplier.value = voidToll(multiplier.value)
    finish('void', OFFLINE_CROSSING_VOID_DELAY_MS)
    return
  }

  gates.value[i] = 'chime'
  gateStep.value[i] = OFFLINE_CROSSING_STEPS[opened.value]
  opened.value += 1
  multiplier.value = crossingMultiplier(opened.value)

  if (opened.value >= CROSSING_MAX_OPEN) {
    finish('perfect', OFFLINE_CROSSING_SETTLE_DELAY_MS)
    return
  }
  moveCursor(1, true)
}

function finish(kind: Outcome, delay: number) {
  revealed.value = gates.value.map((g) => g === 'hidden')
  // Rein visueller Nachlauf: der Rückruf fasst nur lokalen Zustand an, nie den
  // Store — deshalb echte Zeit statt gameTimeout().
  settleTimer = window.setTimeout(() => {
    settled.value = true
    outcome.value = kind
    nextTick(() => claimEl.value?.focus())
  }, delay)
}

function claim() {
  if (settleTimer) clearTimeout(settleTimer)
  emit('claim', multiplier.value)
}

/* ── Tastatur ─────────────────────────────────────────────────────────── */
/** `deferred`, wenn gerade ein Tor geöffnet wurde: der eben geklickte Knopf wird
 *  erst im nächsten Tick `disabled`, und ein Fokus davor springt zurück. */
function moveCursor(dir: number, deferred = false) {
  if (settled.value || !hiddenLeft.value) return
  let i = cursor.value
  for (let step = 0; step < OFFLINE_CROSSING_GATES; step++) {
    i = (i + dir + OFFLINE_CROSSING_GATES) % OFFLINE_CROSSING_GATES
    if (gates.value[i] === 'hidden') break
  }
  cursor.value = i
  if (deferred) nextTick(() => gateEls[i]?.focus())
  else gateEls[i]?.focus()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    moveCursor(1)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    moveCursor(-1)
  } else if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
    e.preventDefault()
    claim()
  }
}

function onHover(i: number) {
  if (!settled.value && gates.value[i] === 'hidden') cursor.value = i
}

function gateLabel(i: number): string {
  const g = gates.value[i]
  if (g === 'chime') return `Gate ${i + 1}: a chime gate, ${mult(multiplier.value)} banked`
  if (g === 'void') return `Gate ${i + 1}: the Void gate`
  if (revealed.value[i]) return `Gate ${i + 1}: never opened`
  return `Open gate ${i + 1} — ${mult(nextMultiplier.value)} if it leads on`
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  gateEls[0]?.focus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (settleTimer) clearTimeout(settleTimer)
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

      <template v-if="!settled">
        <p class="cross-hint">Four gates lead on. One holds the <b>Void</b>.</p>
        <p class="ward">
          <svg width="12" height="12" viewBox="0 0 24 24" class="ward-icon">
            <path d="M12 2 3 5.5v6.9c0 5.6 3.8 9.2 9 9.6 5.2-.4 9-4 9-9.6V5.5L12 2Z" />
          </svg>
          The first gate you open is always safe
        </p>
      </template>
      <p
        v-else
        class="verdict"
        :class="outcome === 'perfect' ? 'verdict--good' : 'verdict--void'"
        role="status"
      >
        {{ outcome === 'perfect' ? 'Perfect crossing' : 'The Void took its toll' }}
      </p>

      <div class="gates" role="group" aria-label="The five gates">
        <button
          v-for="(g, i) in gates"
          :key="i"
          :ref="(el) => setGateEl(el, i)"
          type="button"
          class="gate"
          :class="{
            'gate--focus': !settled && g === 'hidden' && i === cursor,
            'gate--chime': g === 'chime',
            'gate--void': g === 'void',
            'gate--spent': revealed[i],
          }"
          :disabled="settled || g !== 'hidden'"
          :aria-label="gateLabel(i)"
          @click="openGate(i)"
          @mouseenter="onHover(i)"
        >
          <span class="gate-art">
            <span v-if="g === 'chime'" class="gate-glow" aria-hidden="true" />
            <svg width="72" height="96" viewBox="0 0 72 96" aria-hidden="true">
              <path class="arch" d="M6 92 V40 A30 30 0 0 1 66 40 V92 Z" />

              <template v-if="g === 'chime'">
                <path d="M16 92 V43 A20 20 0 0 1 56 43 V92 Z" fill="url(#oc-chime)" />
                <path
                  class="spark"
                  d="M36 42 L40.5 53.5 L52 58 L40.5 62.5 L36 74 L31.5 62.5 L20 58 L31.5 53.5 Z"
                />
              </template>

              <template v-else-if="g === 'void'">
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
            <template v-if="g === 'chime'">+{{ gateStep[i] }}</template>
            <template v-else-if="g === 'void'">Toll</template>
            <template v-else-if="!settled && i === cursor">Open</template>
            <template v-else>&middot;&middot;&middot;</template>
          </span>
        </button>
      </div>

      <div v-if="!settled" class="ledger">
        <div class="cell">
          <span class="cell-k">Banked</span>
          <span class="cell-v" :class="opened ? 'cell-v--gold' : 'cell-v--dim'">
            {{ mult(multiplier) }}
          </span>
        </div>
        <div class="cell">
          <span class="cell-k">{{ opened ? 'Next gate' : 'First gate' }}</span>
          <span class="cell-v cell-v--gold">{{ mult(nextMultiplier) }}</span>
        </div>
        <div class="cell">
          <span class="cell-k">Risk</span>
          <span class="cell-v" :class="opened ? 'cell-v--void' : 'cell-v--dim'">
            {{ opened ? `1 in ${hiddenLeft}` : 'None' }}
          </span>
        </div>
      </div>

      <div v-else-if="outcome === 'perfect'" class="ledger">
        <div class="cell">
          <span class="cell-k">Banked</span>
          <span class="cell-v cell-v--gold">{{ mult(multiplier) }}</span>
        </div>
        <div class="cell">
          <span class="cell-k">Gates passed</span>
          <span class="cell-v cell-v--gold">{{ CROSSING_MAX_OPEN }} of {{ CROSSING_MAX_OPEN }}</span>
        </div>
        <div class="cell">
          <span class="cell-k">Void</span>
          <span class="cell-v cell-v--dim">Untouched</span>
        </div>
      </div>

      <div v-else class="ledger">
        <div class="cell">
          <span class="cell-k">Was banked</span>
          <span class="cell-v cell-v--dim">{{ mult(bankedBefore) }}</span>
        </div>
        <div class="cell">
          <span class="cell-k">Toll</span>
          <span class="cell-v cell-v--void">&minus; half</span>
        </div>
        <div class="cell">
          <span class="cell-k">Kept</span>
          <span class="cell-v cell-v--gold">{{ mult(multiplier) }}</span>
        </div>
      </div>
    </div>

    <div class="foot">
      <button
        ref="claimEl"
        type="button"
        class="btn"
        :class="opened || settled ? 'btn--claim' : 'btn--quiet'"
        @click="claim"
      >
        <span class="btn-t">{{ claimLabel }}</span>
        <span class="btn-s">
          {{ opened || settled ? `${formatNumber(payout)} chimes` : 'skip the crossing' }}
        </span>
      </button>

      <button v-if="canOpen" type="button" class="btn btn--open" @click="openGate(cursor)">
        <span class="btn-t">Open a gate</span>
        <span class="btn-s">
          {{ opened ? 'lose half the bonus if Void' : `always safe · +${nextStep}` }}
        </span>
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
  gap: 12px;
  padding: 20px 24px 16px;
  background: #1a1008;
}

.cross-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.8rem;
  letter-spacing: 0.24em;
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

.cross-hint {
  margin: 0;
  text-align: center;
  font-size: 0.82rem;
  color: rgba(200, 185, 140, 0.7);
}

.cross-hint b {
  color: #8a6fd0;
  font-weight: 400;
}

.ward {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.7rem;
  color: rgba(200, 185, 140, 0.4);
}

/* Gefüllt, nicht konturiert: eine 1,8px-Linie zerfällt bei 12px zu Grau. */
.ward-icon {
  flex-shrink: 0;
  fill: rgba(200, 185, 140, 0.42);
}

/* ── Verdict ──────────────────────────────────────────── */
.verdict {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
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

/* ── Tore ─────────────────────────────────────────────── */
.gates {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.gate {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0 7px;
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
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
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
  gap: 3px;
  padding: 9px 4px;
  border-right: 1px solid #3e200a;
}

.cell:last-child {
  border-right: none;
}

.cell-k {
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 185, 140, 0.38);
}

.cell-v {
  font-size: 1.05rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #c8b98c;
}

.cell-v--gold {
  color: #e8c040;
}

.cell-v--void {
  color: #8a6fd0;
}

.cell-v--dim {
  font-size: 0.95rem;
  color: rgba(200, 185, 140, 0.5);
}

/* ── Fußleiste ────────────────────────────────────────── */
.foot {
  display: flex;
  gap: 12px;
  padding: 16px 24px 20px;
  border-top: 1px solid #3e200a;
}

.btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 12px 8px;
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
  font-size: 1rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.btn-s {
  font-size: 0.7rem;
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
