// Der Zustand des Offline-Fensters „The Crossing" — getrennt von der Darstellung,
// weil ihn ZWEI Komponenten lesen: die Ertragszahl im Kopf und die Tore darunter.
// Die Regeln selbst stehen unverändert in utils/game/offlineCrossing.ts.

import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import {
  OFFLINE_CROSSING_GATES,
  OFFLINE_CROSSING_SETTLE_DELAY_MS,
  OFFLINE_CROSSING_STEPS,
  OFFLINE_CROSSING_VOID_DELAY_MS,
} from '@/config/constants'
import {
  CROSSING_MAX_OPEN,
  crossingMultiplier,
  placeVoidGate,
  voidToll,
} from '@/utils/game/offlineCrossing'

export type GateState = 'hidden' | 'chime' | 'void'
export type CrossingOutcome = 'perfect' | 'void'

export function useOfflineCrossing(chimes: MaybeRefOrGetter<number>) {
  const gates = ref<GateState[]>(Array(OFFLINE_CROSSING_GATES).fill('hidden'))
  const revealed = ref<boolean[]>(Array(OFFLINE_CROSSING_GATES).fill(false))
  /** Der gutgeschriebene Schritt hängt an der REIHENFOLGE, nicht an der Position. */
  const gateStep = ref<number[]>(Array(OFFLINE_CROSSING_GATES).fill(0))
  const cursor = ref(0)
  const opened = ref(0)
  const multiplier = ref(1)
  const bankedBefore = ref(1)
  const settled = ref(false)
  const outcome = ref<CrossingOutcome | null>(null)

  /** −1, bis der erste Griff das Void-Tor platziert — der Caretaker's Ward. */
  let voidIndex = -1
  let settleTimer = 0

  const hiddenLeft = computed(() => gates.value.filter((g) => g === 'hidden').length)
  const nextMultiplier = computed(() => crossingMultiplier(opened.value + 1))
  const canOpen = computed(() => !settled.value && opened.value < CROSSING_MAX_OPEN)
  const payout = computed(() => Math.floor(toValue(chimes) * multiplier.value))
  /** Was ohne einen einzigen Griff ausgezahlt würde — die Bezugsgröße im Kopf. */
  const basePayout = computed(() => Math.floor(toValue(chimes)))
  const nextStep = computed(() => OFFLINE_CROSSING_STEPS[opened.value] ?? 0)
  const gainPct = computed(() => Math.round((multiplier.value - 1) * 100))
  /** Der grösstmögliche Ertrag. */
  const maxPayout = computed(() =>
    Math.floor(toValue(chimes) * crossingMultiplier(CROSSING_MAX_OPEN)),
  )
  /**
   * Jeder Betrag, auf dem die Zahl zur Ruhe kommt. Der Kopf reserviert die Breite
   * des BREITESTEN davon — der grösste Wert ist es nicht: „1.48M" steht breiter
   * als das höhere „2.2M".
   */
  const restingPayouts = computed(() => {
    const c = toValue(chimes)
    const stops = [Math.floor(c)]
    for (let n = 0; n <= CROSSING_MAX_OPEN; n++) {
      const m = crossingMultiplier(n)
      stops.push(Math.floor(c * m), Math.floor(c * voidToll(m)))
    }
    return stops
  })

  function finish(kind: CrossingOutcome, delay: number) {
    revealed.value = gates.value.map((g) => g === 'hidden')
    // Rein visueller Nachlauf: der Rückruf fasst nur lokalen Zustand an, nie den
    // Store — deshalb echte Zeit statt gameTimeout().
    settleTimer = window.setTimeout(() => {
      settled.value = true
      outcome.value = kind
    }, delay)
  }

  /** Gibt zurück, ob sich ein Tor geöffnet hat — die Komponente zieht danach den Fokus nach. */
  function openGate(i: number): boolean {
    if (settled.value || gates.value[i] !== 'hidden') return false

    if (voidIndex < 0) voidIndex = placeVoidGate(i, OFFLINE_CROSSING_GATES)

    if (i === voidIndex) {
      gates.value[i] = 'void'
      bankedBefore.value = multiplier.value
      multiplier.value = voidToll(multiplier.value)
      finish('void', OFFLINE_CROSSING_VOID_DELAY_MS)
      return true
    }

    gates.value[i] = 'chime'
    gateStep.value[i] = OFFLINE_CROSSING_STEPS[opened.value]
    opened.value += 1
    multiplier.value = crossingMultiplier(opened.value)

    if (opened.value >= CROSSING_MAX_OPEN) finish('perfect', OFFLINE_CROSSING_SETTLE_DELAY_MS)
    return true
  }

  /** Nächstes verdecktes Tor in Richtung `dir` — reiner Index, kein DOM. */
  function stepCursor(dir: number): number {
    if (settled.value || !hiddenLeft.value) return cursor.value
    let i = cursor.value
    for (let step = 0; step < OFFLINE_CROSSING_GATES; step++) {
      i = (i + dir + OFFLINE_CROSSING_GATES) % OFFLINE_CROSSING_GATES
      if (gates.value[i] === 'hidden') break
    }
    cursor.value = i
    return i
  }

  function pickCursor(i: number) {
    if (!settled.value && gates.value[i] === 'hidden') cursor.value = i
  }

  function stopSettle() {
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = 0
  }

  /** Das Fenster kann mehrfach aufgehen (Admin-Knopf) — dann steht hier ein neuer Lauf. */
  function reset() {
    stopSettle()
    gates.value = Array(OFFLINE_CROSSING_GATES).fill('hidden')
    revealed.value = Array(OFFLINE_CROSSING_GATES).fill(false)
    gateStep.value = Array(OFFLINE_CROSSING_GATES).fill(0)
    cursor.value = 0
    opened.value = 0
    multiplier.value = 1
    bankedBefore.value = 1
    settled.value = false
    outcome.value = null
    voidIndex = -1
  }

  return {
    gates,
    revealed,
    gateStep,
    cursor,
    opened,
    multiplier,
    bankedBefore,
    settled,
    outcome,
    hiddenLeft,
    nextMultiplier,
    canOpen,
    payout,
    basePayout,
    maxPayout,
    restingPayouts,
    nextStep,
    gainPct,
    openGate,
    stepCursor,
    pickCursor,
    reset,
    dispose: stopSettle,
  }
}

export type OfflineCrossingGame = ReturnType<typeof useOfflineCrossing>
