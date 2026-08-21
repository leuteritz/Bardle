/*
 * Badge Lab — füllt jede Notify-Marke auf eine Wunschzahl und räumt sie wieder ab.
 *
 * Wie `maxEverything.ts` weder Store noch Composable: eine Datei, die fremde
 * Actions in dokumentierter Reihenfolge komponiert und selbst keinen
 * Spielzustand hält. Das Einzige, was hier liegt, ist das Ledger — was ein Seed
 * angefasst hat, damit das Aufräumen es zurückgeben kann.
 *
 * Reihenfolge in `seedAllBadges`, und sie ist der Inhalt:
 *   ① Herold sperren — VOR der ersten Mutation, sonst reisst „Fill All" fünf
 *     0→N-Kanten und stapelt fünf Banner.
 *   ② alles ausser planet. `shop` hebt dabei die Chimes an.
 *   ③ planet ZULETZT — er ist der einzige, dessen Zahl direkt an den Chimes
 *     hängt, und er stockt nur noch auf, was nach ② fehlt. Andersherum hätte
 *     `shop` ihm die Schwelle gleich wieder weggehoben.
 *
 * Ein Seed nimmt NIE etwas weg: reicht der Stand schon, bleibt er stehen und die
 * Notiz sagt, dass die Zahl über n liegen kann.
 *
 * Was hier NICHT steht: das Leeren echter Spielerfortschritte. Jede
 * clear-Richtung nimmt nur zurück, was der Seed selbst gelegt hat.
 */

import {
  ADMIN_MAX_MATERIAL_AMOUNT,
  BADGE_LAB_HERALD_SUPPRESS_MS,
  BADGE_LAB_SEED_CHIMES,
  BADGE_LAB_SEED_MEEPS,
} from '@/config/constants'
import { NOTIFY_BADGE_BY_KIND, SEEDABLE_BADGE_KINDS } from '@/config/ui/notifyBadges'
import { notifyBadgeCounters } from '@/composables/ui/useNotifyBadges'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import {
  planetLevelRequiredPhase,
  planetLevelUpCost,
  usePlanetShopStore,
} from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { MATERIALS } from '@/config/economy/materials'
import { logger } from '@/utils/logger'
import type { BadgeSeedResult, NotifyBadgeKind } from '@/types'

/**
 * Bis wann der `ready`-Herold schweigt. Wanduhr, nicht `gameNow()`: beide Enden
 * entstehen in diesem Modul, und `utils/game/**` fällt nicht unter die
 * `app/game-clock`-Regel.
 */
let suppressUntilMs = 0

interface SeedLedger {
  chimesBefore: number | null
  meepsBefore: number | null
  seededChampions: string[]
}

const ledger: SeedLedger = { chimesBefore: null, meepsBefore: null, seededChampions: [] }

export function suppressBadgeHeralds(ms = BADGE_LAB_HERALD_SUPPRESS_MS): void {
  suppressUntilMs = Date.now() + ms
}

export function badgeHeraldSuppressedUntil(): number {
  return suppressUntilMs
}

function result(kind: NotifyBadgeKind, requested: number, notes: string[] = []): BadgeSeedResult {
  return { kind, requested, achieved: notifyBadgeCounters()[kind](), notes }
}

/** Chimes und Material aufstocken — merkt den alten Stand fürs Aufräumen. */
function fundChimes(): void {
  const gameStore = useGameStore()
  if (ledger.chimesBefore === null) ledger.chimesBefore = gameStore.chimes
  if (gameStore.chimes < BADGE_LAB_SEED_CHIMES) gameStore.chimes = BADGE_LAB_SEED_CHIMES
}

function fundMeeps(): void {
  const gameStore = useGameStore()
  if (ledger.meepsBefore === null) ledger.meepsBefore = gameStore.meeps
  if (gameStore.meeps < BADGE_LAB_SEED_MEEPS) gameStore.meeps = BADGE_LAB_SEED_MEEPS
}

function refundChimes(): void {
  if (ledger.chimesBefore === null) return
  useGameStore().chimes = ledger.chimesBefore
  ledger.chimesBefore = null
}

function refundMeeps(): void {
  if (ledger.meepsBefore === null) return
  useGameStore().meeps = ledger.meepsBefore
  ledger.meepsBefore = null
}

/**
 * Die Chimes-Schwelle, ab der genau n Orbit-Level bezahlbar sind.
 *
 * Jeder Slot trägt sein j-tes Level bei, sobald die Chimes seine j-te
 * Präfixsumme erreichen. Alle Präfixsummen aller sechs Slots sortiert, die n-te
 * genommen — deterministisch in ~6·n Schritten. Eine Binärsuche über das
 * Chime-Budget hätte je Probe die volle Bulk-Schleife gefahren
 * (PLANET_MAX_BULK_LEVELS ist 1000).
 *
 * Nicht immer exakt: haben zwei Slots dieselbe Schwelle, springt der Zähler um
 * zwei. Der Aufrufer meldet die erreichte Zahl, nicht die gewünschte.
 */
function chimesForAffordableLevels(n: number): number | null {
  const planetShopStore = usePlanetShopStore()
  const starPhase = useSolarUpgradeStore().starPhase
  const thresholds: number[] = []
  for (const slot of planetShopStore.slots) {
    if (!slot.purchased || !slot.role) continue
    let running = 0
    let level = slot.level
    for (let step = 0; step < n; step++) {
      if (starPhase < planetLevelRequiredPhase(level + 1)) break
      running += planetLevelUpCost({ baseCost: slot.baseCost, level })
      thresholds.push(running)
      level++
    }
  }
  if (thresholds.length < n) return null
  thresholds.sort((a, b) => a - b)
  return thresholds[n - 1]
}

export function seedBadge(kind: NotifyBadgeKind, n: number): BadgeSeedResult {
  suppressBadgeHeralds()
  const notes: string[] = []
  const want = Math.max(0, n)
  /** Was diese Marke überhaupt anzeigen KANN — die ✦-Marke kennt nur 0 oder 1,
   *  und „auf 3 gewünscht, 1 erreicht" wäre dort keine Deckelung, sondern ihr
   *  Normalzustand. */
  let requested = want

  switch (kind) {
    case 'shop': {
      fundChimes()
      // Direkt in den Bestand, wie maxEverything: `addMaterial` würde je Posten
      // Fundstempel und Chronik mitschreiben, die hier nichts zu suchen haben.
      const inventory = useInventoryStore()
      for (const material of MATERIALS) {
        inventory.collectedMaterials[material.id] = ADMIN_MAX_MATERIAL_AMOUNT
      }
      useShopStore().refreshRates()
      const got = useStarForgeStore().adminSetShopFresh(want)
      if (got < want) notes.push(`only ${got} entries are purchasable right now`)
      break
    }
    case 'skill': {
      fundMeeps()
      const got = useMeepTreeStore().adminSetUnseen(want)
      if (got < want) notes.push(`only ${got} nodes are learnable at this point in the tree`)
      break
    }
    case 'planet': {
      const planetShopStore = usePlanetShopStore()
      if (!planetShopStore.slots.some((s) => s.purchased && s.role)) {
        planetShopStore.adminFillRandomRoles()
        notes.push('filled the orbit slots first')
      }
      const threshold = chimesForAffordableLevels(want)
      if (threshold === null) {
        fundChimes()
        notes.push('phase gate caps the ladder — filled to the maximum instead')
        break
      }
      const gameStore = useGameStore()
      if (gameStore.chimes >= threshold) {
        notes.push('the save is already this rich — the count can exceed n')
        break
      }
      if (ledger.chimesBefore === null) ledger.chimesBefore = gameStore.chimes
      gameStore.chimes = threshold
      break
    }
    case 'expedition': {
      useExpeditionStore().adminSeedResolved(want)
      break
    }
    case 'champions': {
      const added = useBattleStore().adminSeedNewChampions(want)
      ledger.seededChampions.push(...added)
      if (added.length < want) notes.push(`only ${added.length} champions left to discover`)
      break
    }
    case 'forge': {
      requested = 1
      const lit = useSolarUpgradeStore().adminSetEvolveReady(true)
      if (!lit) notes.push('the sun is in its final phase — nothing left to evolve')
      break
    }
    case 'chronicle': {
      useAchievementStore().adminSeedUnseen(want)
      break
    }
    case 'level':
      notes.push('not a badge')
      break
  }

  return result(kind, requested, notes)
}

export function clearBadge(kind: NotifyBadgeKind): BadgeSeedResult {
  suppressBadgeHeralds()
  const notes: string[] = []

  switch (kind) {
    case 'shop':
      useStarForgeStore().adminSetShopFresh(0)
      refundChimes()
      break
    case 'skill':
      useMeepTreeStore().adminSetUnseen(0)
      refundMeeps()
      break
    case 'planet':
      refundChimes()
      // Die Marke hängt allein an den Chimes. War der Stand vorher reich genug,
      // bleibt sie stehen — dann ist der Spieler selbst der Grund, nicht der Seed.
      if (notifyBadgeCounters().planet() > 0) notes.push('still lit — the save can afford these')
      break
    case 'expedition':
      useExpeditionStore().adminClearSeeded()
      break
    case 'champions':
      useBattleStore().adminClearSeededNewChampions(ledger.seededChampions)
      ledger.seededChampions = []
      break
    case 'forge':
      useSolarUpgradeStore().adminSetEvolveReady(false)
      notes.push('core rays stay where they are')
      break
    case 'chronicle':
      useAchievementStore().markSeen()
      break
    case 'level':
      break
  }

  return result(kind, 0, notes)
}

export function seedAllBadges(n: number): BadgeSeedResult[] {
  suppressBadgeHeralds()
  // forge vorn, planet hinten — Begründung im Kopf der Datei.
  const pinned: NotifyBadgeKind[] = ['forge', 'shop']
  const order: NotifyBadgeKind[] = [
    ...pinned,
    ...SEEDABLE_BADGE_KINDS.filter((k) => k !== 'planet' && !pinned.includes(k)),
    'planet',
  ]
  const out = order.map((kind) => seedBadge(kind, n))
  logger.info('System', 'Badge Lab filled', {
    n,
    lit: out.filter((r) => r.achieved > 0).length,
  })
  return out
}

export function clearAllBadges(): BadgeSeedResult[] {
  suppressBadgeHeralds()
  return SEEDABLE_BADGE_KINDS.map((kind) => clearBadge(kind))
}

/** Kurzfassung für die Herold-Quittung: was steht, und wo es geklemmt hat. */
export function summarizeSeed(results: BadgeSeedResult[]): string {
  const lit = results.filter((r) => r.achieved > 0).length
  const head = `${lit} of ${results.length} badges lit`
  const short = (r: BadgeSeedResult) => NOTIFY_BADGE_BY_KIND[r.kind].short
  const under = results.filter((r) => r.achieved < r.requested).map(short)
  const over = results.filter((r) => r.achieved > r.requested).map(short)
  const parts = [head]
  if (under.length > 0) parts.push(`capped: ${under.join(', ')}`)
  if (over.length > 0) parts.push(`over: ${over.join(', ')}`)
  return parts.join(' · ')
}
