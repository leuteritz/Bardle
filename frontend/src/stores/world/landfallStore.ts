import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useNebulaTrigger } from '@/composables/orbit/useNebulaTrigger'
import { getLandfall } from '@/config/world/landfalls'
import { getLandfallBoon } from '@/config/world/landfallBoons'
import { cairnOffer } from '@/utils/game/landfalls'
import { useVoidStore } from '@/stores/world/voidStore'
import {
  LANDFALL_REEF_CPS_FLOOR_CLICKS,
  LANDFALL_CAIRN_BOON_MULT,
  LANDFALL_RUPTURE_BURST_DEF,
} from '@/config/constants'
import type { ActiveLandfall, LandfallBoonAxis, LandfallBoonId, LandfallDef } from '@/types'

/**
 * Zahlt dieser Ort auch, wenn die Geste ausblieb?
 *
 * Das Riff und das Gloaming ja — durch einen ORT fliegt man, ob man will oder
 * nicht. Alles mit einem Ziel (Ossuar, Konvoi) nein: ein Sarkophag, den niemand
 * geöffnet hat, gibt nichts her. Genau darin dürfen sich die Orte unterscheiden,
 * sonst wäre die Geste Zierrat.
 */
function zahltOhneGeste(def: LandfallDef): boolean {
  return def.gesture === 'gradient' || def.gesture === 'none'
}

/**
 * Was ein Landfall TUT.
 *
 * Der Schnitt zum `galaxyStore` läuft nach BEDEUTUNG, nicht nach Zustand: dort
 * wohnt, WANN und WO ein Ort auftaucht (die Reiseetappe, seine Lage, die
 * Chronik `landfallResults`, die archiviert wird) — hier, WAS beim Auflösen
 * passiert.
 *
 * Der Grund ist keine Zeilenzählerei: `galaxyStore` ist Galaxie-Fortschritt und
 * hat mit Material, Void-Wesen und Segen nichts zu tun. Mit sechs Ortstypen
 * bekäme er sonst vier Wirtschafts-Stores als Importe dazu.
 *
 * KEIN Tick und KEINE Uhr — dasselbe wie beim `providenceStore`. Fällig wird ein
 * Ort im Etappen-Tick des `galaxyStore`; dieser Store wird nur gerufen.
 */
export const useLandfallStore = defineStore('landfall', {
  state: () => ({
    /**
     * Der Segen des zuletzt genommenen Cairn — oder `null`.
     *
     * Eine DRITTE Reichweite: nicht befristet wie ein Drifter-Buff (kein
     * `expiresAt`, kein Tick) und nicht laufweit wie eine Vorsehung, sondern
     * galaxieweit. Abgeräumt wird er im Warp, nicht von einer Uhr — deshalb hat
     * dieser Store keinen `tick()`, genau wie der `providenceStore`.
     */
    boon: null as LandfallBoonId | null,
    /** Zu welcher Galaxie er gehört. Beim Laden wird DAGEGEN geprüft, weil es
     *  keine Frist gibt, gegen die man prüfen könnte. */
    boonGalaxy: 0,
  }),

  getters: {
    /* ── Effekt-Getter (je einer pro Einbaustelle) ──────────────────────────
       Dasselbe Muster wie bei Drifter, Omen und Void. Vier statt fünf: die
       Material-Achse fehlt, weil sie sättigt. */

    boonAxis(state): LandfallBoonAxis | null {
      return state.boon ? (getLandfallBoon(state.boon)?.axis ?? null) : null
    },

    cpsMult(): number {
      return this.boonAxis === 'cpsMult' ? LANDFALL_CAIRN_BOON_MULT : 1
    },
    cpcMult(): number {
      return this.boonAxis === 'cpcMult' ? LANDFALL_CAIRN_BOON_MULT : 1
    },
    combatDpsMult(): number {
      return this.boonAxis === 'combatDpsMult' ? LANDFALL_CAIRN_BOON_MULT : 1
    },
    xpMult(): number {
      return this.boonAxis === 'xpMult' ? LANDFALL_CAIRN_BOON_MULT : 1
    },
  },

  actions: {
    /**
     * Was der Ort einbrächte, würde er JETZT aufgelöst — in Chimes.
     *
     * Der Sockel fällt auch dem zu, der nicht hinsieht; das ist der Unterschied
     * zum Drifter, der ungeklickt verfällt. Ein Ort ist ein ORT: man fliegt
     * hindurch, ob man will oder nicht.
     *
     * Der Boden liegt an der SEKUNDE, nicht an der Summe. Läge er auf der
     * Auszahlung (so macht es der Drifter mit `max(fromCps, cpc × MIN_CLICKS)`),
     * verschwänden früh alle Griffe darunter — man klickte acht Mal und sähe
     * dieselbe Zahl.
     */
    previewYield(active: ActiveLandfall | null): number {
      if (!active) return 0
      const def = getLandfall(active.kind)
      if (!def) return 0
      const gameStore = useGameStore()
      const jeSekunde = Math.max(
        gameStore.chimesPerSecond,
        gameStore.chimesPerClick * LANDFALL_REEF_CPS_FLOOR_CLICKS,
      )
      // Wo es ein Ziel gibt, zeigt die Karte das VERSPRECHEN, nicht den Bestand
      // — sonst stünde am Ossuar bis zum Griff eine 0, und niemand wüsste,
      // wofür der Griff gut wäre. Wo es keins gibt, zeigt sie den Bestand.
      const griffe = zahltOhneGeste(def) ? active.taps : (def.tapCap ?? 0)
      const sekunden = (def.baseSeconds ?? 0) + griffe * (def.tapSeconds ?? 0)
      return jeSekunde * sekunden
    },

    /**
     * Zahlt aus, was der Ort verdient hat. Gerufen VOR dem Schliessen, weil der
     * Ertrag am offenen Ort hängt.
     *
     * `cleared` kommt aus `landfallCleared()` und bedeutet je Geste etwas
     * anderes — hier zählt nur noch, ob gezahlt wird.
     */
    payout(active: ActiveLandfall, cleared: boolean): void {
      const def = getLandfall(active.kind)
      if (!def) return
      if (!cleared && !zahltOhneGeste(def)) return

      const gewinn = this.previewYield(active)
      if (gewinn > 0) {
        const gameStore = useGameStore()
        gameStore.chimes += gewinn
        gameStore.chimesForNextUniverse += gewinn
        gameStore.totalChimesEarned += gewinn
        gameStore.chimesEarnedForLevel += gewinn
        gameStore.calculateLevel()
      }

      // Material über denselben Wurf wie überall — `materialDropMult` sättigt
      // (der Wurf vergleicht gegen `Math.random()`), also ist die ZAHL der Würfe
      // der ehrliche Hebel, nicht die Chance.
      if (def.materials) {
        const inventory = useInventoryStore()
        for (let i = 0; i < def.materials; i++) inventory.tryDropMaterial(1, 'landfall')
      }
    },

    /**
     * Was ein versäumter Ort KOSTET. Heute nur die Rupture.
     *
     * Sie lässt Wesen des `voidStore` los, keine eigenen: kein neuer Gegnertyp,
     * kein eigener Schaden, keine zweite Ablaufuhr. `spawnMonster()` ist bereits
     * ein bedingungsloses Primitiv — es prüft nur `VOID_MAX_CONCURRENT` und
     * deckelt den Ausbruch damit von selbst.
     *
     * Ausdrücklich `lesser`: ohne ID zöge `spawnMonster()` `SEVERITIES[0]`, und
     * die Liste ist ABSTEIGEND sortiert — das wäre abyssal.
     *
     * Der Level-Riegel steht HIER und nicht bei der Ziehung. Der Kind-Wurf darf
     * nicht am Bard-Level hängen: `landfallsOfRun` wird für jede archivierte
     * Galaxie nachgespielt, und ein Prestige setzt das Level auf 1 zurück — die
     * Chronik würde sich nach jedem Aufbruch umetikettieren.
     */
    toll(active: ActiveLandfall, cleared: boolean): void {
      if (cleared) return
      const def = getLandfall(active.kind)
      if (!def?.burst) return
      const voidStore = useVoidStore()
      if (!voidStore.isUnlocked) return
      for (let i = 0; i < def.burst; i++) voidStore.spawnMonster(LANDFALL_RUPTURE_BURST_DEF)
    },

    /** Die drei Angebote dieses Cairn. Abgeleitet, nie gespeichert. */
    offerFor(active: ActiveLandfall | null): LandfallBoonId[] {
      if (!active || getLandfall(active.kind)?.gesture !== 'choice') return []
      return cairnOffer(useGalaxyStore().mapSeed, active.leg)
    },

    /**
     * Der Spieler nimmt einen Segen. Er ersetzt den vorigen — ERNEUERN statt
     * stapeln, dasselbe Muster wie `bardAbilityStore._applyBuff` und
     * `onLevelUp()` beim Overclock. Ein Stapel aus acht Cairns je Galaxie wäre
     * genau die geschlossene Rückkopplung, gegen die `AUGMENT_ACTIVE_CAP` steht.
     */
    takeBoon(id: LandfallBoonId): boolean {
      const active = useGalaxyStore().activeLandfall
      if (!active || active.choice != null) return false
      if (!this.offerFor(active).includes(id)) return false
      active.choice = id
      this.boon = id
      this.boonGalaxy = useGalaxyStore().currentGalaxy
      // CpS und CpC liegen gecacht auf `gameStore` — ohne Refresh bliebe der
      // alte Wert stehen, bis irgendetwas anderes ihn anfasst.
      useShopStore().refreshRates()
      // Ein Stein, an dem die Wahl getroffen ist, hat nichts mehr zu bieten.
      useGalaxyStore().resolveLandfall(true)
      return true
    },

    /** Der Warp räumt ihn ab — er galt für DIESE Galaxie. */
    clearAll(): void {
      if (this.boon === null) return
      this.boon = null
      this.boonGalaxy = 0
      useShopStore().refreshRates()
    },

    /**
     * Der Ort geht auf. Für alles, was BEIM ANKOMMEN passiert statt beim
     * Abrechnen — heute nur der Nebeldurchflug.
     *
     * Er hängt am Öffnen und nicht am Auflösen, weil er 9 bis 15 Sekunden läuft
     * und das Fenster nur 8 bis 30 misst: am Ende gezündet liefe er in die
     * Ankunft am Stern hinein.
     */
    onOpen(active: ActiveLandfall): void {
      const def = getLandfall(active.kind)
      if (def?.id !== 'the_gloaming') return
      // Modul-Singleton, kein Store — und genau für diesen Zweck gebaut; bis
      // jetzt rief ihn nur das Admin-Panel.
      useNebulaTrigger().triggerNow()
    },
  },
})
