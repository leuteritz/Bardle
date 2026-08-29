import { defineStore } from 'pinia'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { destinationFor, type ExpeditionDestination } from '@/config/economy/expeditionDestinations'
import { EXPEDITION_CHART_MAX, EXPEDITION_WAYMARK_MAX } from '@/config/constants'
import type { DestinationProgress } from '@/types'
import { gameNow } from '@/utils/game/gameClock'

/**
 * Der Ort und die Person — alles an einer Expedition, das den einzelnen Lauf
 * überdauert.
 *
 * Geschnitten nach LEBENSDAUER, nicht nach Feature: `expeditionStore` besitzt
 * die Mission (Angebote, laufende Züge, Auflösung), dieser Store das Bleibende
 * (Ziele, Kartografie, Wegmarken, Zehrung). Die Abhängigkeit läuft nur in eine
 * Richtung — dieser Store kennt den Missions-Store nicht.
 */
export const useExpeditionChartStore = defineStore('expeditionChart', {
  state: () => ({
    /** Galaxie-NUMMER als Schlüssel, nie `mapSeed` — siehe `_key`. */
    cartography: {} as Record<string, DestinationProgress>,
    /** `${champion}|${galaxy}` → Wegmarken. Stufe 4 liest sie. */
    waymarks: {} as Record<string, number>,
    /** Champion → gameNow()-Zeitpunkt, ab dem er wieder ausgeruht ist. Stufe 4. */
    wearyUntil: {} as Record<string, number>,
    /** Ziele, deren Karte der Spieler schon gesehen hat — für „NEW"-Marken. */
    seenDestinations: [] as number[],
    /** Fokus der Sternenkarte. Reine Oberfläche, nicht im Spielstand. */
    selectedGalaxy: 0,
  }),

  getters: {
    /**
     * Das einzige Tor des Systems: ohne befreite Galaxie gibt es keine Ziele,
     * und ohne Ziele keinen Reiter.
     */
    isUnlocked(): boolean {
      return useGalaxyStore().completedGalaxies.length > 0
    },

    /** Jede befreite Galaxie als Ziel, jüngste zuerst. */
    destinations(): ExpeditionDestination[] {
      return useGalaxyStore()
        .completedGalaxies.map((r) => destinationFor(r))
        .sort((a, b) => b.galaxy - a.galaxy)
    },

    /** Die höchste befreite Galaxie — Bezugspunkt der Ziehungsgewichte. */
    maxFreedGalaxy(): number {
      return useGalaxyStore().completedGalaxies.reduce((max, r) => Math.max(max, r.galaxy), 0)
    },

    progressOf(): (galaxy: number) => DestinationProgress {
      return (galaxy: number) => this.cartography[String(galaxy)] ?? { runs: 0, charted: 0 }
    },

    /** Kartierte Ziele — die Metrik, die der Codex ab Stufe 4 liest. */
    chartedCount(): number {
      return Object.values(this.cartography as Record<string, DestinationProgress>).filter(
        (p) => p.charted > 0,
      ).length
    },

    waymarksOf(): (champion: string, galaxy: number) => number {
      return (champion: string, galaxy: number) => this.waymarks[`${champion}|${galaxy}`] ?? 0
    },

    /** Ein müder Champion darf mit, bringt aber weniger — Stufe 4 liest das. */
    isWeary(): (champion: string) => boolean {
      return (champion: string) => (this.wearyUntil[champion] ?? 0) > gameNow()
    },
  },

  actions: {
    _entry(galaxy: number): DestinationProgress {
      const key = String(galaxy)
      if (!this.cartography[key]) this.cartography[key] = { runs: 0, charted: 0 }
      return this.cartography[key]
    },

    /** Eine zurückgekehrte Mission schreibt ihr Ziel fort. */
    recordRun(galaxy: number, charted: number) {
      const entry = this._entry(galaxy)
      entry.runs += 1
      entry.charted = Math.min(EXPEDITION_CHART_MAX, entry.charted + Math.max(0, charted))
    },

    markSeen(galaxy: number) {
      if (!this.seenDestinations.includes(galaxy)) this.seenDestinations.push(galaxy)
    },

    /**
     * Admin: jedes befreite Ziel kartiert und gesehen. Ohne das steht neben
     * fünfzig befreiten Galaxien fünfzigmal Kartografie 0 und eine „NEW"-Marke.
     *
     * Die Wegmarken bleiben bewusst leer: sie sind ein Paar aus Champion UND
     * Ziel, und 170 × 50 erfundene Schlüssel blähten den Spielstand um
     * Grössenordnungen — `prune()` lässt sie genau deshalb ungedeckelt.
     */
    adminChartAll(): number {
      const freed = useGalaxyStore().completedGalaxies
      for (const record of freed) {
        const entry = this._entry(record.galaxy)
        entry.runs = Math.max(entry.runs, EXPEDITION_CHART_MAX)
        entry.charted = EXPEDITION_CHART_MAX
        this.markSeen(record.galaxy)
      }
      return freed.length
    },

    addWaymark(champion: string, galaxy: number) {
      const key = `${champion}|${galaxy}`
      this.waymarks[key] = Math.min(EXPEDITION_WAYMARK_MAX, (this.waymarks[key] ?? 0) + 1)
    },

    setWeary(champion: string, durationMs: number) {
      if (durationMs <= 0) return
      this.wearyUntil[champion] = gameNow() + durationMs
    },

    /**
     * Schlüssel wegwerfen, die ins Leere zeigen — ein Champion, den es nicht
     * mehr gibt, ein Ziel, das nie befreit wurde, ein Wert auf null.
     *
     * Läuft beim Laden und nach jedem Einsammeln. Das ist der Grund, warum das
     * Produkt Champion × Ziel keinen künstlichen Deckel braucht: es wächst nur
     * um tatsächlich bereiste Paare und schrumpft von selbst wieder.
     */
    prune() {
      const owned = new Set(useBattleStore().ownedChampions)
      const freed = new Set(useGalaxyStore().completedGalaxies.map((r) => r.galaxy))
      const now = gameNow()

      for (const key of Object.keys(this.cartography)) {
        if (!freed.has(Number(key))) delete this.cartography[key]
      }
      for (const key of Object.keys(this.waymarks)) {
        const sep = key.lastIndexOf('|')
        const champion = key.slice(0, sep)
        const galaxy = Number(key.slice(sep + 1))
        if (!owned.has(champion) || !freed.has(galaxy) || this.waymarks[key] <= 0) {
          delete this.waymarks[key]
        }
      }
      for (const name of Object.keys(this.wearyUntil)) {
        if (!owned.has(name) || this.wearyUntil[name] <= now) delete this.wearyUntil[name]
      }
      this.seenDestinations = this.seenDestinations.filter((g) => freed.has(g))
    },
  },
})
