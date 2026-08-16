import { defineStore } from 'pinia'
import { MATERIALS } from '@/config/economy/materials'
import type { Material, MaterialSinkId, MaterialSourceId } from '@/types'
import { logger } from '@/utils/logger'
import {
  MATERIAL_DROP_BASE_CHANCE,
  MATERIAL_DROP_OVERFLOW_MAX_EXTRA,
  MATERIAL_RATE_BUCKET_COUNT,
  MATERIAL_RATE_BUCKET_MS,
} from '@/config/constants'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { gameNow } from '@/utils/game/gameClock'

/**
 * Zusätzliche Stücke aus einer Drop-Chance ÜBER 100 %.
 *
 * Der Wurf darunter ist `Math.random() > chance` — oberhalb von 1 ist er
 * ausnahmslos falsch, und jeder weitere Punkt Drop-Chance verfiel damit
 * lautlos. Betroffen ist nicht nur der Comet-Miner-Zweig: sieben Quellen
 * multiplizieren sich in diese Zahl (Forge, Meep-Baum, Drifter, Omen, Chronik,
 * Vorsehung, Void), und im Spätspiel steht ihr Produkt regelmässig über 1.
 *
 * Der Überschuss wird stattdessen zu MENGE: der ganzzahlige Teil sind sichere
 * Extrastücke, der Rest ist die Chance auf eines mehr. Ein Beispiel — Chance
 * 2,4 gibt das gefallene Stück plus eines sicher plus 40 % auf ein drittes.
 *
 * **Der Deckel ist Pflicht.** Ohne ihn skaliert die Ausbeute linear mit einem
 * PRODUKT aus sieben Faktoren, und Material ist der Taktgeber der ganzen
 * Forge — die späten Blätter und jedes Relikt hängen daran. Drei Extrastücke
 * sind reichlich und bleiben eine Zahl, die man im Kopf behält.
 *
 * Der Void-Abzug wirkt hier mit und zieht den Überlauf zuerst weg — richtig so:
 * er ist der einzige Faktor, der nach unten zeigt, und soll auch dort greifen,
 * wo der Spieler bereits im Überfluss steht.
 */
function overflowExtra(dropChance: number): number {
  const overflow = Math.max(0, dropChance - 1)
  const guaranteed = Math.floor(overflow)
  const fractional = Math.random() < overflow - guaranteed ? 1 : 0
  return Math.min(MATERIAL_DROP_OVERFLOW_MAX_EXTRA, guaranteed + fractional)
}

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    collectedMaterials: {} as Record<string, number>,
    /** Lifetime counters for the Bard Stats catalog — unaffected by spending. */
    totalMaterialsCollected: 0,
    totalMaterialsSpent: 0,

    /* ── Per-material ledger (header tooltip) ────────────────────────────────
       `collectedMaterials` only ever shows the current pile. Everything the
       tooltip claims about a material's HISTORY lives here, because a stock of
       0 says nothing about whether the player never found one or burned four
       thousand. All of it is persisted except the rate window below. */

    /** Units ever picked up, per material — never decreases. */
    lifetimeCollected: {} as Record<string, number>,
    /** Units ever spent, per material. */
    lifetimeSpent: {} as Record<string, number>,
    /** Highest pile ever held, per material. */
    peakStock: {} as Record<string, number>,
    /** Timestamp of the first unit ever found, per material. */
    firstFoundAt: {} as Record<string, number>,
    /** Timestamp of the most recent unit found, per material. */
    lastFoundAt: {} as Record<string, number>,
    /** Longest gap between two finds, per material — the "dry spell" stat. */
    longestDroughtMs: {} as Record<string, number>,
    /** materialId → sourceId → units gained from that source. */
    sourceTally: {} as Record<string, Record<string, number>>,
    /** materialId → sinkId → units spent on that sink. */
    sinkTally: {} as Record<string, Record<string, number>>,

    /* ── Rolling intake window — session only, never saved ───────────────────
       One bucket per minute, oldest first, newest last. Buckets advance from
       `gameStore.tick()` rather than lazily on read, so the getters stay pure
       and every consumer sees the same window in the same frame. */

    /** materialId → MATERIAL_RATE_BUCKET_COUNT minute buckets. */
    rateBuckets: {} as Record<string, number[]>,
    /** Minute index (gameNow() / bucket size) the last bucket represents. */
    rateEpochMinute: Math.floor(gameNow() / MATERIAL_RATE_BUCKET_MS),
    /** When measuring started — the per-hour figure divides by this, capped
        to the window, so a two-minute-old session is not extrapolated wildly. */
    rateStartedAt: gameNow(),
  }),

  getters: {
    /** Milliseconds of intake actually measured, capped to the window length. */
    rateWindowMs(): number {
      const windowMs = MATERIAL_RATE_BUCKET_COUNT * MATERIAL_RATE_BUCKET_MS
      return Math.min(gameNow() - this.rateStartedAt, windowMs)
    },
  },

  actions: {
    addMaterial(materialId: string, source: MaterialSourceId = 'drop', qty = 1): void {
      if (qty <= 0) return
      const now = gameNow()

      this.collectedMaterials[materialId] = (this.collectedMaterials[materialId] ?? 0) + qty
      this.totalMaterialsCollected += qty
      this.lifetimeCollected[materialId] = (this.lifetimeCollected[materialId] ?? 0) + qty

      const stock = this.collectedMaterials[materialId]
      if (stock > (this.peakStock[materialId] ?? 0)) this.peakStock[materialId] = stock

      if (!this.firstFoundAt[materialId]) this.firstFoundAt[materialId] = now
      const previous = this.lastFoundAt[materialId]
      if (previous) {
        const gap = now - previous
        if (gap > (this.longestDroughtMs[materialId] ?? 0)) {
          this.longestDroughtMs[materialId] = gap
        }
      }
      this.lastFoundAt[materialId] = now

      const tally = (this.sourceTally[materialId] ??= {})
      tally[source] = (tally[source] ?? 0) + qty

      this.advanceRateWindow(now)
      const buckets = (this.rateBuckets[materialId] ??= new Array(MATERIAL_RATE_BUCKET_COUNT).fill(
        0,
      ))
      buckets[buckets.length - 1] += qty

      logger.debug('Inventory', `+${qty} ${materialId}`, {
        total: stock,
        source,
      })
    },

    /**
     * Slides the minute buckets forward to `now`. Idempotent within a minute,
     * so calling it from the game tick AND from `addMaterial` is free.
     */
    advanceRateWindow(now = gameNow()): void {
      const minute = Math.floor(now / MATERIAL_RATE_BUCKET_MS)
      const steps = minute - this.rateEpochMinute
      if (steps <= 0) return
      this.rateEpochMinute = minute

      for (const buckets of Object.values(this.rateBuckets) as number[][]) {
        if (steps >= MATERIAL_RATE_BUCKET_COUNT) {
          buckets.fill(0)
          continue
        }
        buckets.splice(0, steps)
        for (let i = 0; i < steps; i++) buckets.push(0)
      }
    },

    /** Drops the measured window — used after loading a save, where an offline
        gap would otherwise read as an hour of zero intake. */
    resetRateWindow(): void {
      this.rateBuckets = {}
      this.rateEpochMinute = Math.floor(gameNow() / MATERIAL_RATE_BUCKET_MS)
      this.rateStartedAt = gameNow()
    },

    tryDropSpecificMaterial(
      materialId: string,
      dropChance: number,
      source: MaterialSourceId = 'drop',
    ): boolean {
      if (Math.random() > dropChance) return false
      this.addMaterial(materialId, source)
      return true
    },

    hasMaterials(costs: Record<string, number>): boolean {
      return Object.entries(costs).every(
        ([matId, qty]) => (this.collectedMaterials[matId] ?? 0) >= qty,
      )
    },

    removeMaterials(costs: Record<string, number>, sink: MaterialSinkId = 'other'): boolean {
      if (!this.hasMaterials(costs)) return false
      for (const [matId, qty] of Object.entries(costs)) {
        this.collectedMaterials[matId] -= qty
        this.totalMaterialsSpent += qty
        this.lifetimeSpent[matId] = (this.lifetimeSpent[matId] ?? 0) + qty
        const tally = (this.sinkTally[matId] ??= {})
        tally[sink] = (tally[sink] ?? 0) + qty
      }
      logger.info('Inventory', 'Materials spent', { costs, sink })
      return true
    },

    tryDropMaterial(
      baseDropChance = MATERIAL_DROP_BASE_CHANCE,
      source: MaterialSourceId = 'drop',
    ): Material | null {
      // Comet Miner (Star Forge): boosts the drop chance
      const forge = useStarForgeStore()
      const treeDropMult = useMeepTreeStore().fx.materialDropMult
      // Salvage Probe (drifter): timed boost on top of the permanent ones
      const drifterDropMult = useDrifterStore().materialDropMult
      // Fulfilled omen: timed as well, earned in another system
      const omenDropMult = useOmenStore().materialDropMult
      // Starwright (chronicle): earned by stars pulled back out of the dark
      const chronicleDropMult = useAchievementStore().materialDropMult
      // Providence: chosen at prestige, holds for the whole universe run
      const providenceDropMult = useProvidenceStore().materialDropMult
      // Starving Maw (void tide): zieht nach unten, solange der Riss steht
      const voidDropMult = useVoidStore().materialDropMult
      const dropChance =
        baseDropChance *
        forge.materialDropMult *
        treeDropMult *
        drifterDropMult *
        omenDropMult *
        chronicleDropMult *
        providenceDropMult *
        voidDropMult
      if (Math.random() > dropChance) return null

      const total = MATERIALS.reduce((sum, m) => sum + m.dropChance, 0)
      let roll = Math.random() * total
      let dropped: Material | null = null
      for (const material of MATERIALS) {
        roll -= material.dropChance
        if (roll <= 0) {
          dropped = material
          break
        }
      }
      // Fallback: last material
      if (!dropped) dropped = MATERIALS[MATERIALS.length - 1]
      // Prospector's Charm (Star Forge): every drop grants extra materials
      this.addMaterial(dropped.id, source, 1 + forge.extraDropCount + overflowExtra(dropChance))
      return dropped
    },
  },
})
