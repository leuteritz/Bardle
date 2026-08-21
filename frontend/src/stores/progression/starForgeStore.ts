import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
// Gegenseitig: `voidStore` liest `voidTollRelief` von hier. Beide Richtungen
// laufen ausschliesslich über lazy `useXStore()`-Aufrufe INNERHALB von Gettern
// und Actions — auf Modulebene berühren sich die beiden nicht. Dasselbe Muster
// trägt bereits `voidStore ↔ inventoryStore`.
import { useVoidStore } from '@/stores/world/voidStore'
import { forgeNodeAxis } from '@/utils/game/solarSignature'
import type {
  ForgeActiveBuff,
  ForgeBargainDef,
  ForgeBuffId,
  ForgeNodeDef,
  ForgeOfferReq,
  ForgeSectionId,
} from '@/types'
import {
  FORGE_NODES,
  FORGE_LEAVES,
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  FORGE_BARGAINS,
  getForgeNode,
  forgeNodeName,
  getForgeRelic,
  getForgeConstellation,
  getForgeBargain,
} from '@/config/progression/starForge'
import {
  FORGE_GLIMMER_MAX_LEVEL,
  FORGE_GLIMMER_PARENT_MIN_LEVEL,
  FORGE_TIER_BASE_MAX_LEVEL,
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_BRANCH_PARENT_MIN_LEVEL,
  FORGE_LEAF_MAX_LEVEL,
  FORGE_LEAF_PARENT_MIN_LEVEL,
  FORGE_WARD_MAX_LEVEL,
  FORGE_WARD_PARENT_MIN_LEVEL,
  FORGE_PACT_MAX_LEVEL,
  FORGE_PACT_PARENT_MIN_LEVEL,
  FORGE_BOUGH_PARENT_MIN_LEVEL,
  ADMIN_MAX_BOUGH_LEVEL,
  FORGE_LEAF_AMPLIFY_PER_LEVEL,
  FORGE_BARGAIN_RESTOCK_MS,
  FORGE_BARGAIN_EMPTY_ICON,
  FORGE_BARGAIN_REROLL_MATERIAL,
  FORGE_BARGAIN_REROLL_COST,
  FORGE_MIN_DAMAGE_TAKEN_MULT,
  FORGE_MIN_DWELL_MULT,
  FORGE_MIN_EXPEDITION_MULT,
  FORGE_MAX_DOUBLE_CLICK_CHANCE,
  FORGE_CONSTELLATION_BULWARK_DAMAGE_MULT,
  FORGE_CONSTELLATION_STELLAR_WIND_CPS_MULT,
  FORGE_CONSTELLATION_GOLDEN_TEMPEST_CPC_MULT,
  FORGE_OVERFLOW_EXPEDITION_REWARD_RATE,
  FORGE_OVERFLOW_STAR_LIFETIME_RATE,
  FORGE_OVERFLOW_HP_REGEN_PER_PCT,
  FORGE_LEDGER_CLICK_DROP_CHANCE,
  FORGE_VOID_RELIEF_CAP,
  FORGE_MEEP_COST_FLOOR,
  FORGE_RELIC_OFFLINE_HOURS,
  FORGE_COMPACT_OFFLINE_HOURS,
  FORGE_BARGAIN_KINDS_PAYING_MATERIALS,
  FORGE_CROWN_MAX_LEVEL,
  FORGE_CROWN_PARENT_MIN_LEVEL,
  FORGE_CROWN_UNLOCK_PRESTIGES,
  FORGE_CROWN_VOID_RELIEF,
  FORGE_CROWN_VOID_SLAY_REWARD_MULT,
  FORGE_CROWN_BOSS_FLIP_HP_FRACTION,
  FORGE_CROWN_OVERFLOW_FRACTION_PER_SEC,
  FORGE_CROWN_OVERFLOW_MIN_CHIMES,
  FORGE_CROWN_OVERFLOW_MAX_PER_SEC,
  FORGE_CROWN_RECLAIMED_PRICE_MULT,
  FORGE_CROWN_OFFLINE_HARVEST_HOURS,
  FORGE_CROWN_OFFLINE_DRIFTER_COUNT,
  FORGE_CROWN_STACKED_RIFT_TOLL_SHARE,
  FORGE_CROWN_OMEN_HP_FLOOR_FRACTION,
  FORGE_TWINNED_SKY_EXTRA_DRIFTERS,
  FORGE_MIN_BARD_COOLDOWN_MULT,
  FORGE_MIN_BUILDING_COST_MULT,
  FORGE_MIN_ITEM_COST_MULT,
  FORGE_MIN_CHAMPION_LEVEL_COST_MULT,
  FORGE_MAX_VOID_SPAWN_INTERVAL_MULT,
  FORGE_MAX_VOID_TRAVEL_MULT,
  FORGE_MIN_VOID_MEEP_LOSS_MULT,
  FORGE_MIN_VOID_AFTERMATH_MULT,
  FORGE_MIN_DRIFTER_INTERVAL_MULT,
  FORGE_MIN_OMEN_INTERVAL_MULT,
  FORGE_MIN_OMEN_TARGET_MULT,
  FORGE_MIN_RESOURCE_STAR_INTERVAL_MULT,
  FORGE_MIN_HARVEST_INTERVAL_MULT,
  FORGE_MIN_CHAMPION_TRAVEL_MULT,
  FORGE_MIN_BOSS_HP_MULT,
  FORGE_MIN_EXPEDITION_SPAWN_MULT,
  FORGE_MIN_BARGAIN_PRICE_MULT,
  FORGE_MIN_BARGAIN_RESTOCK_MULT,
  FORGE_MIN_LP_LOSS_MULT,
  FORGE_MIN_BUILDING_MILESTONE_INTERVAL,
  FORGE_MAX_AUGMENT_LUCK_MULT,
  BUILDING_MILESTONE_INTERVAL,
  SOLAR_BRANCHES,
  SOLAR_MATERIAL_FROM_LEVEL,
} from '@/config/constants'
import { pickPooledIcon } from '@/config/ui/iconPools'
import type { SolarBranchId } from '@/stores/progression/solarUpgradeStore'
import { gameNow } from '@/utils/game/gameClock'

/**
 * Eine Materialposition nach dem Sunsmith-Rabatt (Chronicle). Abgerundet wird
 * nicht: eine Position, die auf 0 fällt, wäre gratis — `hasMaterials` gibt für
 * eine Null jedes Mal wahr, egal wie leer das Lager ist.
 */
function forgeMaterialQty(raw: number, discountMult: number): number {
  return Math.max(1, Math.round(raw * discountMult))
}

/** Caps so stacked effects can never break the game loop. */
const MIN_DAMAGE_TAKEN_MULT = FORGE_MIN_DAMAGE_TAKEN_MULT
const MIN_DWELL_MULT = FORGE_MIN_DWELL_MULT
const MIN_EXPEDITION_MULT = FORGE_MIN_EXPEDITION_MULT
const MAX_DOUBLE_CLICK_CHANCE = FORGE_MAX_DOUBLE_CLICK_CHANCE

/**
 * Höchststufe je gedeckeltem Ring. Steht als Tabelle und nicht als
 * `if`-Leiter in `nodeMaxLevel`: die vier Zahlen gehören zusammen, weil sie
 * gemeinsam die Bedingung erfüllen, dass jeder Ring seinen Deckel exakt in der
 * Endphase erreicht (`FORGE_TIER_BASE_MAX_LEVEL` + 5 − `phase`).
 *
 * `bough` und `crown` fehlen absichtlich — der eine hat keinen Deckel, der
 * andere genau eine Stufe; beide werden in `nodeMaxLevel` vorher beantwortet.
 */
/**
 * Welcher Glimmer auf welchen Knoten zahlt — Zielknoten-Id auf die Glimmers,
 * die ihn heben.
 *
 * Gerechnet EINMAL beim Laden des Moduls. `glimmerBoost` liegt im heissen Pfad
 * von `recalcRates()`, und ein `FORGE_NODES.filter(...)` je Aufruf hiesse
 * fünfzehnhundert Durchläufe pro Ratenberechnung.
 */
const GLIMMERS_BY_TARGET = new Map<string, ForgeNodeDef[]>()
for (const def of FORGE_NODES) {
  if (def.tier !== 'glimmer' || !def.boosts) continue
  const list = GLIMMERS_BY_TARGET.get(def.boosts)
  if (list) list.push(def)
  else GLIMMERS_BY_TARGET.set(def.boosts, [def])
}

const TIER_MAX_LEVEL_CAP: Partial<Record<ForgeNodeDef['tier'], number>> = {
  branch: FORGE_BRANCH_MAX_LEVEL_CAP,
  leaf: FORGE_LEAF_MAX_LEVEL,
  ward: FORGE_WARD_MAX_LEVEL,
  pact: FORGE_PACT_MAX_LEVEL,
}

/**
 * Elternstufe, die ein Ring von dem Ring direkt innen verlangt. Dieselbe Form
 * wie die Deckel-Tabelle darüber und aus demselben Grund: die Zahlen hängen
 * aneinander. Der Elternring steht in der Phase, in der ein Ring aufgeht, auf
 * genau `FORGE_TIER_BASE_MAX_LEVEL + 1` = 2 — eine höhere Hürde verschöbe die
 * Freischaltung still um eine ganze Sonnenphase.
 */
const TIER_PARENT_MIN_LEVEL: Record<ForgeNodeDef['tier'], number> = {
  branch: FORGE_BRANCH_PARENT_MIN_LEVEL,
  leaf: FORGE_LEAF_PARENT_MIN_LEVEL,
  ward: FORGE_WARD_PARENT_MIN_LEVEL,
  pact: FORGE_PACT_PARENT_MIN_LEVEL,
  crown: FORGE_CROWN_PARENT_MIN_LEVEL,
  bough: FORGE_BOUGH_PARENT_MIN_LEVEL,
  /*
   * Ein Glimmer verlangt von seinem Anker die ERSTE Stufe und keine zweite.
   *
   * Er ist ein Weg, kein Ziel: wer den grossen Knoten daneben angefangen hat,
   * soll den kleinen sofort mitnehmen koennen. Eine Zwei machte aus jedem Weg
   * ein eigenes Vorhaben, und das Netz waere wieder eine Kette von Toren.
   */
  glimmer: FORGE_GLIMMER_PARENT_MIN_LEVEL,
}

export const useStarForgeStore = defineStore('starForge', {
  state: () => ({
    /** Ring-2 node levels, keyed by ForgeNodeDef id. */
    branchLevels: {} as Record<string, number>,
    /** Ring-3 node levels, keyed by ForgeNodeDef id. */
    leafLevels: {} as Record<string, number>,
    /** Ring-4 node levels, keyed by ForgeNodeDef id. */
    wardLevels: {} as Record<string, number>,
    /** Ring-5 node levels, keyed by ForgeNodeDef id. */
    pactLevels: {} as Record<string, number>,
    /**
     * Ring-7 node levels, keyed by ForgeNodeDef id. Eigener Beutel und nicht
     * mit den Zweigen zusammengelegt: `achievementStore` summiert für die
     * Codex-Bahn „Sunsmith" nur die GEDECKELTEN Ringe plus Relikte.
     * Eine Zahl OHNE Obergrenze in dieser Summe machte jede Bahn-Schwelle
     * trivial — und der Sunsmith-Rabatt senkt seinerseits die Materialkosten
     * des Baums, wäre also ein geschlossener Kreis.
     */
    boughLevels: {} as Record<string, number>,
    /**
     * Ring-6 node levels, keyed by ForgeNodeDef id — Werte sind 0 oder 1.
     *
     * Eine MAP und keine Liste geschmiedeter IDs, obwohl die Kronen wie
     * Konstellationen einmalig sind: `nodeLevel`, `nodeUnlocked`, `buyNode` und
     * das Zeichnen des Baums arbeiten allesamt auf Stufen. Als Liste bräuchte
     * jeder dieser vier Wege einen Sonderfall, und der Ring wäre im Baum ein
     * Fremdkörper statt einer seiner Kreise.
     *
     * Wie `boughLevels` ein eigener Beutel: die Sunsmith-Summe zählt Stufen, die
     * man SCHMIEDET, und ein Ring mit fünf Einsen darin verschöbe ihre Schwellen
     * um einen Betrag, der mit Schmieden nichts zu tun hat.
     */
    crownLevels: {} as Record<string, number>,
    /**
     * Die Stufen der sechzig GLIMMERS - der kleinen Knoten, die das Netz
     * zwischen den grossen tragen.
     *
     * Eigener Beutel, und zwar zwingend. `achievementStore.metricValue`
     * summiert fuer die Codex-Bahn "Sunsmith" die Beutel `branchLevels`,
     * `leafLevels`, `wardLevels`, `pactLevels` und `relicLevels`. Sechzig
     * zusaetzliche Knoten in dieser Summe machten jede Schwelle der Bahn
     * trivial - und ihr Lohn ist `forgeMaterialCostMult`, also billigere
     * Baumknoten: ein geschlossener Kreis, denselben, den `boughLevels` und
     * `crownLevels` schon aus dem gleichen Grund meiden.
     */
    glimmerLevels: {} as Record<string, number>,
    /** Relic levels, keyed by ForgeRelicDef id (0/absent = not forged). */
    relicLevels: {} as Record<string, number>,
    forgedConstellations: [] as string[],
    /**
     * Eintrags-IDs, die der Spieler angesehen hat, WÄHREND sie kaufbar waren —
     * Strahlen, Baumknoten, Relikte, Konstellationen und das laufende Angebot in
     * EINER Liste. Sie tragen damit keinen „neu"-Rahmen mehr, bis sie den
     * kaufbaren Zustand einmal verlassen haben.
     *
     * Eine FLACHE Liste und kein Beutel je Abteilung: die IDs sind über alle
     * vier Kataloge hinweg eindeutig (`shopIdsAreUnique` in der Spec bindet
     * das), und `migratedIds()` beim Laden braucht genau eine Liste.
     *
     * Wortgleiches Gegenstück zu `meepTreeStore.acknowledged`.
     */
    acknowledgedShop: [] as string[],
    /** Cosmic Bargain — current deal, restock timestamp, bought-this-cycle flag. */
    bargainDealId: '' as string,
    bargainRestockAt: 0 as number,
    bargainPurchased: false as boolean,
    /** Liegt das laufende Angebot als ZWEITE Chance aus (Reclaimed Bargain)?
     *  Steht im Spielstand, weil `bargainDealId` und `bargainRestockAt` es auch
     *  tun — ohne das käme ein halbierter Preis nach dem Neuladen zum vollen
     *  zurück, mitten im laufenden Fenster. */
    bargainReclaimed: false as boolean,
    activeBuffs: [] as ForgeActiveBuff[],
    /** Reactive clock — advanced by gameStore.tick() once per second. */
    forgeNow: gameNow() as number,
  }),

  getters: {
    // ── Tree nodes ────────────────────────────────────────────────────────────
    nodeLevel(state): (id: string) => number {
      return (id) =>
        state.branchLevels[id] ??
        state.leafLevels[id] ??
        state.wardLevels[id] ??
        state.pactLevels[id] ??
        state.boughLevels[id] ??
        state.crownLevels[id] ??
        state.glimmerLevels[id] ??
        0
    },

    nodeMaxLevel(): (id: string) => number {
      return (id) => {
        const def = getForgeNode(id)
        if (!def) return 0
        // Ring 7 kennt keine Obergrenze — `level >= maxLevel` ist damit für ihn
        // dauerhaft falsch, er wird also nie `maxed`. Wer die Zahl ANZEIGT oder
        // über sie iteriert, muss sie mit `Number.isFinite` abfangen.
        if (def.tier === 'bough') return Infinity
        // Ring 6 ist die Gegenfigur dazu: genau eine Stufe, dafür eine Regel.
        if (def.tier === 'crown') return FORGE_CROWN_MAX_LEVEL
        // Ein Glimmer steht NEBEN der Leiter, nicht auf ihr: seine Höchststufe
        // ist fest und wächst nicht mit der Sonne. Die Staffelung „+1 je Phase"
        // ist die Zusage der grossen Knoten; ein Weg soll sofort begehbar sein.
        if (def.tier === 'glimmer') return FORGE_GLIMMER_MAX_LEVEL
        // Alle gedeckelten Ringe folgen DERSELBEN Regel: eine Stufe bei der
        // Freischaltung, +1 je Sonnenphase darüber, gedeckelt je Ring. Die vier
        // Deckel sind so gewählt, dass jeder Ring den seinen GENAU in der
        // Endphase erreicht (Tabelle an `FORGE_TIER_BASE_MAX_LEVEL`).
        //
        // Der Bezug ist `def.phase` und NICHT die globale Freischaltkonstante:
        // ein Knoten, der ausnahmsweise später aufginge, stünde sonst am Tag
        // seiner Freischaltung schon auf halber Höhe.
        const cap = TIER_MAX_LEVEL_CAP[def.tier] ?? FORGE_BRANCH_MAX_LEVEL_CAP
        const phase = useSolarUpgradeStore().starPhase
        const extra = Math.max(0, phase - def.phase)
        return Math.min(cap, FORGE_TIER_BASE_MAX_LEVEL + extra)
      }
    },

    /** Parent level of a node — solar root level for branches, node level otherwise. */
    nodeParentLevel(): (def: ForgeNodeDef) => number {
      return (def) => {
        if (def.tier === 'branch') {
          return useSolarUpgradeStore().branchLevel(def.parentId as SolarBranchId)
        }
        return this.nodeLevel(def.parentId)
      }
    },

    /** Elternstufe, die ein Knoten seines Rings verlangt, bevor er aufgeht. */
    nodeParentRequirement(): (def: ForgeNodeDef) => number {
      return (def) => TIER_PARENT_MIN_LEVEL[def.tier]
    },

    /**
     * Die Stufe eines beliebigen Vorgängers — Ring 1 oder Ring 2–7.
     *
     * `requires` darf auf einen Solar Ray zeigen, `nodeLevel` kennt aber nur die
     * sechs Forge-Beutel. Die Weiche steht hier und nicht bei jedem Aufrufer.
     */
    anyNodeLevel(): (id: string) => number {
      return (id) => {
        if (getForgeNode(id)) return this.nodeLevel(id)
        const solar = useSolarUpgradeStore()
        return SOLAR_BRANCHES.some((ray) => ray.id === id)
          ? solar.branchLevel(id as SolarBranchId)
          : 0
      }
    },

    /**
     * ALLE Vorgänger eines Knotens mit Fortschritt — der Elternteil zuerst, dann
     * seine `requires`.
     *
     * **Die eine Quelle für „was fehlt noch".** Stünde die Elternprüfung an
     * einer und die Zusatzprüfung an einer anderen Stelle, könnten Sperre und
     * Sperrgrund auseinanderlaufen — genau der Fehler, den der Kronen-Ring
     * schon einmal hatte, als er in diesem Fall die längst erfüllte Elternstufe
     * nannte (`FORGE_CROWN_LOCK_REASON`).
     *
     * Der Typ ist derselbe wie bei den Konstellationen: „Moon Orbit 2/3" ist
     * dieselbe Auskunft, egal woran sie hängt, und `ForgeVaultSection` zeigt sie
     * längst so.
     *
     * **Nicht im heissen Pfad benutzen** — dafür steht `nodeRequirementsMet`
     * daneben, siehe dort.
     */
    nodeRequirements(): (def: ForgeNodeDef) => ForgeOfferReq[] {
      return (def) => {
        const out: ForgeOfferReq[] = []
        const push = (id: string, need: number, have: number): void => {
          out.push({
            id,
            name: forgeNodeName(id),
            have,
            need,
            met: have >= need,
            progress: need <= 0 ? 1 : Math.min(1, have / need),
          })
        }
        push(def.parentId, this.nodeParentRequirement(def), this.nodeParentLevel(def))
        for (const req of def.requires ?? []) {
          push(req.id, req.level, this.anyNodeLevel(req.id))
        }
        return out
      }
    },

    /**
     * Dasselbe als blosses Ja/Nein — OHNE eine einzige Objekt-Allokation.
     *
     * `shopReadyIds` prüft `canAffordNode` für JEDEN Knoten bei jeder
     * Chime-Änderung, ab Programmstart und unabhängig vom geöffneten Tab (die
     * Herleitung steht dort). Achtzig Listen mit je zwei bis drei frisch
     * gebauten Objekten je Sekunde wären genau die Art Müll, gegen die die
     * Lookup-Map in `starForge.ts` überhaupt erst angelegt wurde.
     */
    nodeRequirementsMet(): (def: ForgeNodeDef) => boolean {
      return (def) => {
        if (this.nodeParentLevel(def) < this.nodeParentRequirement(def)) return false
        for (const req of def.requires ?? []) {
          if (this.anyNodeLevel(req.id) < req.level) return false
        }
        return true
      }
    },

    /**
     * Hat der Spieler die Schwelle erreicht, ab der Ring 6 überhaupt existiert?
     *
     * Eigener Getter statt einer Zeile in `nodeUnlocked`, weil der Baum ihn
     * auch für das RING-LABEL braucht: „Astral Crowns" steht dort grau, solange
     * dies falsch ist, und ohne den Getter läse die Komponente den
     * Prestige-Zähler ein zweites Mal.
     */
    crownsUnlocked(): boolean {
      return useGameStore().totalPrestiges >= FORGE_CROWN_UNLOCK_PRESTIGES
    },

    nodeUnlocked(): (id: string) => boolean {
      return (id) => {
        const def = getForgeNode(id)
        if (!def) return false
        if (useSolarUpgradeStore().starPhase < def.phase) return false
        // Das ZWEITE Tor von Ring 6. Es steht NEBEN dem Phasen-Gate und nicht
        // statt seiner: die Phase gibt dem Ring seine Sprosse auf der Leiter,
        // der Aufbruch macht ihn zur Belohnung dafür, ein Universum
        // zurückgelassen zu haben.
        if (def.tier === 'crown' && !this.crownsUnlocked) return false
        return this.nodeRequirementsMet(def)
      }
    },

    /** Ist diese Krone geschmiedet? Dasselbe Muster wie `constellationForged`. */
    crownForged(state): (id: string) => boolean {
      return (id) => (state.crownLevels[id] ?? 0) > 0
    },

    /**
     * Chime-Preis der Stufe, die AUF `atLevel` folgt — die Kurve für eine
     * beliebige, auch noch nicht erreichte Stufe.
     *
     * Der zweite Einstieg existiert für den Stapelkauf: „Buy ×8" muss VOR dem
     * Klick wissen, was acht Stufen zusammen kosten, und die Kurve darf dafür
     * kein zweites Mal ausgeschrieben werden (dieselbe Fehlerklasse wie eine
     * zweite Fassung von `chimeThresholdForLevel`). Muster ist
     * `solarUpgradeStore.branchCostAt`.
     */
    nodeGoldCostAt(): (id: string, atLevel: number) => number {
      return (id, atLevel) => {
        const def = getForgeNode(id)
        if (!def) return Infinity
        return Math.ceil(def.baseCost * Math.pow(def.costMultiplier, atLevel))
      }
    },

    nodeGoldCost(): (id: string) => number {
      return (id) => this.nodeGoldCostAt(id, this.nodeLevel(id))
    },

    /**
     * Materialrezeptur für eine bestimmte Stufe — Grundmenge × Stufe.
     *
     * Chronicle-Rabatt und Vorsehung (Emberthrift / Cinder Hoard) greifen an
     * derselben Zahl an — der eine dauerhaft verdient, die andere für diesen
     * Durchlauf gewählt. Beide bleiben HIER und nicht beim Aufrufer, sonst
     * zahlte der Stapelkauf einen anderen Preis als der Einzelkauf.
     */
    nodeMaterialCostAt(): (id: string, forLevel: number) => Record<string, number> {
      return (id, forLevel) => {
        const def = getForgeNode(id)
        if (!def) return {}
        const discount =
          useAchievementStore().forgeMaterialCostMult * useProvidenceStore().forgeMaterialCostMult
        const scaled: Record<string, number> = {}
        for (const [matId, qty] of Object.entries(def.materialCost)) {
          scaled[matId] = forgeMaterialQty(qty * forLevel, discount)
        }
        return scaled
      }
    },

    /** Material cost for the NEXT level — base quantities × next level. */
    nodeMaterialCost(): (id: string) => Record<string, number> {
      return (id) => this.nodeMaterialCostAt(id, this.nodeLevel(id) + 1)
    },

    /**
     * Materialrezeptur eines Kernstrahls für eine bestimmte Stufe — leer,
     * solange die Stufe unter `SOLAR_MATERIAL_FROM_LEVEL` liegt.
     *
     * Warum das hier steht und nicht im `solarUpgradeStore`, dem die Strahlen
     * gehören: Rabatt (Chronicle/Providence) und Rundung liegen bereits in
     * diesem Modul, und eine zweite Fassung davon liefe beim nächsten
     * Balance-Eingriff von der ersten weg. Der Strahl ist ohnehin die Wurzel
     * desselben Baums.
     */
    rayMaterialCostAt(): (id: SolarBranchId, forLevel: number) => Record<string, number> {
      return (id, forLevel) => {
        const def = SOLAR_BRANCHES.find((branch) => branch.id === id)
        if (!def) return {}
        if (forLevel < SOLAR_MATERIAL_FROM_LEVEL) return {}
        const step = forLevel - SOLAR_MATERIAL_FROM_LEVEL + 1
        const discount =
          useAchievementStore().forgeMaterialCostMult * useProvidenceStore().forgeMaterialCostMult
        return { [def.material]: forgeMaterialQty(def.materialQty * step, discount) }
      }
    },

    /** Materialkosten der NÄCHSTEN Stufe eines Kernstrahls. */
    rayMaterialCost(): (id: SolarBranchId) => Record<string, number> {
      return (id) => this.rayMaterialCostAt(id, useSolarUpgradeStore().branchLevel(id) + 1)
    },

    canAffordNode(): (id: string) => boolean {
      return (id) => {
        if (!this.nodeUnlocked(id)) return false
        if (this.nodeLevel(id) >= this.nodeMaxLevel(id)) return false
        if (useGameStore().chimes < this.nodeGoldCost(id)) return false
        return useInventoryStore().hasMaterials(this.nodeMaterialCost(id))
      }
    },

    /** Leaf attached to a branch (uniform amplify mechanic). */
    leafOfBranch(): (branchId: string) => ForgeNodeDef | undefined {
      return (branchId) => FORGE_LEAVES.find((l) => l.parentId === branchId)
    },

    /**
     * Was die GLIMMERS zu einem Knoten beitragen — Summe über alle, die per
     * `boosts` auf ihn zeigen, je Stufe.
     *
     * Das ist die EINE Stelle, an der die sechzig kleinen Knoten in die
     * Wirkungsrechnung eintreten. Die drei Effekt-Getter darunter addieren sie,
     * und die rund dreissig Getter, die auf DIESEN dreien aufsitzen, merken
     * davon nichts — kein Glimmer braucht eine eigene Verdrahtung, kein
     * bestehender Getter eine Änderung.
     *
     * Der Beitrag steht in derselben Einheit wie das Ziel: `effectPerLevel`
     * eines Glimmers sind Prozentpunkte, wenn das Ziel in Prozentpunkten
     * rechnet, und HP, wenn es HP zählt. Eine Umrechnung gibt es nicht, weil es
     * keine zweite Einheit gibt.
     *
     * Gerechnet über eine Tabelle, die EINMAL beim Modulstart entsteht — der
     * Katalog ist statisch, und dieser Getter liegt im heissen Pfad jeder
     * Ratenberechnung.
     */
    glimmerBoost(state): (nodeId: string) => number {
      return (nodeId) => {
        const feeders = GLIMMERS_BY_TARGET.get(nodeId)
        if (!feeders) return 0
        let sum = 0
        for (const def of feeders) {
          sum += (state.glimmerLevels[def.id] ?? 0) * def.effectPerLevel
        }
        return sum
      }
    },

    /** Branch effect value incl. its leaf amplifier: level × perLevel × (1 + leaf × 25%). */
    branchEffect(state): (branchId: string) => number {
      return (branchId) => {
        const def = getForgeNode(branchId)
        if (!def || def.tier !== 'branch') return 0
        const level = state.branchLevels[branchId] ?? 0
        if (level === 0) return 0
        const leafDef = this.leafOfBranch(branchId)
        const leafLevel = leafDef ? (state.leafLevels[leafDef.id] ?? 0) : 0
        const amp = 1 + leafLevel * FORGE_LEAF_AMPLIFY_PER_LEVEL
        // Der Glimmer-Beitrag steht NEBEN dem Verstärker, nicht darin: das
        // Blatt verstärkt seinen Zweig, nicht die Wege ringsum. Multiplizierte
        // es beides, hinge der Deckel `FORGE_GLIMMER_AXIS_SHARE` an einer Zahl,
        // die selbst mit dem Blatt wächst.
        return level * def.effectPerLevel * amp + this.glimmerBoost(branchId)
      }
    },

    /**
     * Wirkung eines Boughs: schlicht Stufe × Wert je Stufe.
     *
     * **Ohne Blatt-Verstärker, und das ist der Kern der Sache.** Liefe ein
     * Bough durch `branchEffect`, multiplizierte ein Blatt auf Stufe 4 einen
     * UNBEGRENZTEN Term mit 2 — aus „additiv je Stufe" würde ein Faktor, und
     * die Rechnung, die den endlosen Ring sicher macht, wäre hinfällig.
     * `branchEffect` weist Boughs bereits über `def.tier !== 'branch'` ab;
     * dieser Getter ist die andere Hälfte derselben Trennung.
     */
    boughEffect(state): (boughId: string) => number {
      return (boughId) => {
        const def = getForgeNode(boughId)
        if (!def || def.tier !== 'bough') return 0
        return (state.boughLevels[boughId] ?? 0) * def.effectPerLevel + this.glimmerBoost(boughId)
      }
    },

    /**
     * Wirkung eines Wards oder Covenants: Stufe × Wert je Stufe.
     *
     * EIN Getter für beide Ringe, obwohl sie zwei Beutel haben — die Rechnung
     * ist dieselbe, und der Beutel steht bereits in `nodeLevel`. Auch hier
     * KEIN Blatt-Verstärker: er gehört zum Paar Zweig/Blatt und zu keinem
     * anderen. Die dreissig Getter unten lesen ausnahmslos hierüber, damit die
     * Wirkung eines Knotens an genau einer Stelle entsteht.
     */
    ringEffect(): (nodeId: string) => number {
      return (nodeId) => {
        const def = getForgeNode(nodeId)
        if (!def || (def.tier !== 'ward' && def.tier !== 'pact')) return 0
        return this.nodeLevel(nodeId) * def.effectPerLevel + this.glimmerBoost(nodeId)
      }
    },

    // ── Relics & constellations ───────────────────────────────────────────────
    relicLevel(state): (id: string) => number {
      return (id) => state.relicLevels[id] ?? 0
    },

    relicEffect(): (id: string) => number {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return 0
        return this.relicLevel(id) * def.effectPerLevel
      }
    },

    relicGoldCost(): (id: string) => number {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return Infinity
        return Math.ceil(def.goldCost * Math.pow(def.goldMultiplier, this.relicLevel(id)))
      }
    },

    relicMaterialCost(): (id: string) => Record<string, number> {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return {}
        const nextLevel = this.relicLevel(id) + 1
        // Chronicle-Rabatt und Vorsehung (Emberthrift / Cinder Hoard) greifen an
        // derselben Zahl an — der eine dauerhaft verdient, die andere für diesen
        // Durchlauf gewählt.
        const discount =
          useAchievementStore().forgeMaterialCostMult * useProvidenceStore().forgeMaterialCostMult
        const scaled: Record<string, number> = {}
        for (const [matId, qty] of Object.entries(def.materialCost)) {
          scaled[matId] = forgeMaterialQty(qty * nextLevel, discount)
        }
        return scaled
      }
    },

    /**
     * Stehen ALLE Vorgaenger eines Relikts hoch genug? — unabhaengig vom Preis,
     * damit die Anzeige die Sperre erklaeren kann.
     *
     * `anyNodeLevel` statt `nodeLevel`: seit der Vault dieselbe `requires`-Liste
     * fuehrt wie der Baum, darf ein Eintrag auch einen Strahl (Ring 1) nennen.
     * Eine zweite Weiche dafuer gaebe es sonst hier UND bei den Knoten.
     */
    relicRequirementMet(): (id: string) => boolean {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return false
        for (const req of def.requires) {
          if (this.anyNodeLevel(req.id) < req.level) return false
        }
        return true
      }
    },

    canForgeRelic(): (id: string) => boolean {
      return (id) => {
        const def = getForgeRelic(id)
        if (!def) return false
        if (this.relicLevel(id) >= def.maxLevel) return false
        if (!this.relicRequirementMet(id)) return false
        if (useGameStore().chimes < this.relicGoldCost(id)) return false
        return useInventoryStore().hasMaterials(this.relicMaterialCost(id))
      }
    },

    constellationForged(state): (id: string) => boolean {
      return (id) => state.forgedConstellations.includes(id)
    },

    /**
     * Dieselbe Pruefung wie beim Relikt — und das ist der Punkt.
     *
     * Vorher las sie genau ZWEI feste Felder gegen EINE globale Konstante; eine
     * Konstellation aus drei Knoten war damit nicht schreibbar. Jetzt zaehlt
     * die Liste, und die Stufe steht am Eintrag statt in einer Konstante, die
     * fuer alle zehn dieselbe war.
     */
    constellationRequirementMet(): (id: string) => boolean {
      return (id) => {
        const def = getForgeConstellation(id)
        if (!def) return false
        for (const req of def.requires) {
          if (this.anyNodeLevel(req.id) < req.level) return false
        }
        return true
      }
    },

    canForgeConstellation(): (id: string) => boolean {
      return (id) => {
        const def = getForgeConstellation(id)
        if (!def) return false
        if (this.constellationForged(id)) return false
        if (!this.constellationRequirementMet(id)) return false
        if (useGameStore().chimes < def.goldCost) return false
        return useInventoryStore().hasMaterials(def.materialCost)
      }
    },

    // ── Cosmic Bargain ────────────────────────────────────────────────────────
    activeDeal(state): ForgeBargainDef | null {
      return getForgeBargain(state.bargainDealId) ?? null
    },

    /**
     * Das Zeichen des ausliegenden Handels. Gezogen aus der Motivfamilie des
     * Angebots, geseedet mit dem Restock-Zeitpunkt: derselbe Handel sieht beim
     * nächsten Mal anders aus, bleibt aber über Re-Renders und Reloads gleich,
     * weil `bargainRestockAt` im Spielstand steht.
     */
    activeDealIcon(state): string {
      const def = getForgeBargain(state.bargainDealId)
      if (!def) return FORGE_BARGAIN_EMPTY_ICON
      return pickPooledIcon(def.iconPool, `${def.id}#${state.bargainRestockAt}`)
    },

    /** Der Rabatt des Handels UND der des Baums (Haggler's Pact) — beide auf
     *  demselben Grundpreis, und beide hier, damit Anzeige und Abbuchung nie
     *  auseinanderlaufen können.
     *
     *  Der Nachlass des zurückgekommenen Angebots (Reclaimed Bargain) gilt nur
     *  für das Angebot, das WIRKLICH ausliegt: `bargainReclaimed` ist ein
     *  Zustand des Handels, keine Eigenschaft seiner Definition. */
    bargainPrice(state): (def: ForgeBargainDef) => number {
      return (def) => {
        const reclaimed =
          state.bargainReclaimed && def.id === state.bargainDealId
            ? this.reclaimedBargainPriceMult
            : 1
        return Math.round(def.basePrice * (1 - def.discountPct) * this.bargainPriceMult * reclaimed)
      }
    },

    bargainRestockRemainingMs(state): number {
      return Math.max(0, state.bargainRestockAt - state.forgeNow)
    },

    canBuyBargain(): boolean {
      const def = this.activeDeal
      if (!def || this.bargainPurchased) return false
      if (useGameStore().chimes < this.bargainPrice(def)) return false
      // Eine Maut auf eine Passage, die offen steht, ist bezahltes Nichts —
      // und der Handel ist teuer. Er wird deshalb gar nicht erst kaufbar,
      // solange kein Wesen im Feld ist und kein Nachbeben nachzieht.
      if (def.kind === 'voidPurge' && !useVoidStore().hasVoidPresence) return false
      if (FORGE_BARGAIN_KINDS_PAYING_MATERIALS.includes(def.kind) && def.materials) {
        return useInventoryStore().hasMaterials(def.materials)
      }
      return true
    },

    canRerollBargain(): boolean {
      const inventory = useInventoryStore()
      return (
        (inventory.collectedMaterials[FORGE_BARGAIN_REROLL_MATERIAL] ?? 0) >=
        FORGE_BARGAIN_REROLL_COST
      )
    },

    buffActive(state): (buffId: ForgeBuffId) => boolean {
      return (buffId) =>
        state.activeBuffs.some((b) => b.id === buffId && b.expiresAt > state.forgeNow)
    },

    /**
     * Was der Shop JETZT hergibt, je Abteilung — die Grundlage von allem
     * darunter: `shopFreshBySection` siebt daraus das Ungesehene, und
     * `acknowledgeShopEntry` wie `syncShopAcknowledged` prüfen gegen genau diese
     * Listen, ob eine Quittung überhaupt gilt.
     *
     * Die Abzeichen lesen sie NICHT mehr direkt — sie hängen an den
     * `shopFresh*`-Gettern; die Begründung dafür steht dort.
     *
     * **Warum ein Store-Getter und keine drei lokalen `computed`.** Ein
     * argumentloser Pinia-Getter ist intern EIN `computed` am Store — eine
     * Instanz, geteilt von allen Lesern, die genau einmal je Änderung rechnet.
     * Drei lokale `computed` wären drei unabhängige Effects und liefen alle drei
     * bei jeder Chime-Änderung. Eine Runde sind 59 Prüfungen (5 Strahlen, 40
     * Knoten, 6 Relikte, 7 Konstellationen, 1 Handel), jede mit mehreren
     * Katalog-Zugriffen.
     *
     * **Warum die Kernstrahlen mit im Topf sind**, obwohl sie dem
     * `solarUpgradeStore` gehören: derselbe Grund wie bei `rayMaterialCostAt` —
     * der Strahl ist die Wurzel desselben Baums, und der Spieler liest
     * „Upgrades" als EINE Abteilung.
     *
     * **Warum die Stores direkt gefragt werden und nicht `useForgeUpgrades()`:**
     * das Ansichtsmodell baut alle Einträge samt Materiallisten neu auf. Der
     * Shop-Tab bleibt nach dem ersten Öffnen per `v-show` gemountet und die
     * Ecktaste steht ab Programmstart — über das Ansichtsmodell liefe der volle
     * Aufbau damit jede Sekunde mit. Hier bleiben es Getter-Aufrufe.
     */
    shopReadyIds(): Record<ForgeSectionId, string[]> {
      const solar = useSolarUpgradeStore()
      return {
        upgrades: [
          ...SOLAR_BRANCHES.filter((branch) => solar.canAfford(branch.id)).map(
            (branch) => branch.id as string,
          ),
          ...FORGE_NODES.filter((node) => this.canAffordNode(node.id)).map((node) => node.id),
        ],
        relics: FORGE_RELICS.filter((relic) => this.canForgeRelic(relic.id)).map(
          (relic) => relic.id,
        ),
        constellations: FORGE_CONSTELLATIONS.filter((con) =>
          this.canForgeConstellation(con.id),
        ).map((con) => con.id),
        // Das Angebot wechselt; seine ID ist die des GERADE ausliegenden Handels,
        // damit ein neuer Bestand wieder als neu gilt statt die Quittung des
        // vorigen zu erben.
        bargain: this.canBuyBargain ? [this.bargainDealId] : [],
      }
    },

    /**
     * Dieselben vier Zahlen wie bisher — jetzt als Längen der Listen darüber.
     *
     * Der Umweg kostet nichts: `shopReadyIds` ist EIN Pinia-Getter und damit ein
     * `computed`, das je Änderung genau einmal läuft. Zwei getrennte
     * Traversierungen (einmal zählen, einmal sammeln) wären dagegen zwei.
     */
    shopReadyCounts(): Record<ForgeSectionId, number> {
      const ids = this.shopReadyIds
      return {
        upgrades: ids.upgrades.length,
        relics: ids.relics.length,
        constellations: ids.constellations.length,
        bargain: ids.bargain.length,
      }
    },

    /**
     * Die Summe als EIGENER Getter, nicht als fünftes Feld im Objekt darüber.
     *
     * `shopReadyCounts` gibt jedes Mal ein NEUES Objekt zurück — wer es liest,
     * rendert bei jeder Chime-Änderung neu, auch wenn die vier Zahlen gleich
     * blieben. Ein Getter auf einer ZAHL stößt seine Abhängigen dagegen nur an,
     * wenn sich der Wert wirklich ändert.
     *
     * Sein einziger Leser ist die Fußzeile des Shop-Tooltips („N affordable in
     * total") — die Abzeichen selbst hängen seit der Umstellung an
     * `shopFreshTotal`. Er bleibt, weil er genau die Frage beantwortet, die die
     * Umstellung sonst offenließe: „warum steht da 3, wo ich doch reich bin?".
     */
    shopReadyTotal(): number {
      const counts = this.shopReadyCounts
      return counts.upgrades + counts.relics + counts.constellations + counts.bargain
    },

    // ── Was NEU ist: kaufbar und noch nicht angesehen ─────────────────────────
    /**
     * Dieselben vier Abteilungen, aber nur mit dem, was der Spieler noch nicht
     * gesehen hat — die EINE Quelle für den azurnen „NEW"-Rahmen UND für jede
     * Notify-Marke der Star Forge.
     *
     * **Warum die Marke „ungesehen" zählt und nicht „kaufbar".** Kaufbar ist ab
     * dem mittleren Spiel praktisch dauernd etwas — die fünf Kernstrahlen allein
     * halten `shopReadyTotal` für immer über null. Eine Marke, die nie ausgeht,
     * meldet nichts mehr; sie ist dann Teil des Hintergrunds. Schlimmer: sowohl
     * das Aufblitzen (`useBadgeFlare`) als auch der `ready`-Herold sind auf die
     * Kante 0 → N gebaut, die damit nach dem frühen Spiel nie wieder eintritt —
     * beide feuerten faktisch einmal pro Spielstand.
     *
     * An „ungesehen" gehängt fällt die Zahl auf null, sobald der Spieler
     * durchgesehen hat, und die Kante steht für das nächste Mal wieder bereit.
     * Es ist zugleich die Bedeutung, die der Meep-Baum längst trägt
     * (`meepTreeStore.unseenBuyableCount`).
     *
     * Je Abteilung und nicht flach, damit Schienen-Marken, Ecktaste, Tooltip und
     * Rahmen alle aus DIESEM einen `computed` lesen statt aus vieren.
     */
    shopFreshBySection(): Record<ForgeSectionId, string[]> {
      const ids = this.shopReadyIds
      const acknowledged = new Set(this.acknowledgedShop)
      const unseen = (list: string[]) => list.filter((id) => !acknowledged.has(id))
      return {
        upgrades: unseen(ids.upgrades),
        relics: unseen(ids.relics),
        constellations: unseen(ids.constellations),
        bargain: unseen(ids.bargain),
      }
    },

    /** Flach, fürs Nachschlagen an Zeile, Karte und Baumknoten. */
    shopFreshIds(): string[] {
      const fresh = this.shopFreshBySection
      return [...fresh.upgrades, ...fresh.relics, ...fresh.constellations, ...fresh.bargain]
    },

    /** Die vier Zahlen der Schienen-Marken und der Tooltip-Zeilen. */
    shopFreshCounts(): Record<ForgeSectionId, number> {
      const fresh = this.shopFreshBySection
      return {
        upgrades: fresh.upgrades.length,
        relics: fresh.relics.length,
        constellations: fresh.constellations.length,
        bargain: fresh.bargain.length,
      }
    },

    /**
     * Die eine Zahl an der Shop-Ecktaste und am Profil-Reiter.
     *
     * Eigener Getter auf einer ZAHL, aus demselben Grund wie `shopReadyTotal`:
     * ein Objekt-Getter stieße seine Leser bei jedem Chime-Tick an, auch wenn
     * die Zahlen gleich blieben.
     */
    shopFreshTotal(): number {
      const counts = this.shopFreshCounts
      return counts.upgrades + counts.relics + counts.constellations + counts.bargain
    },

    // ── Der Überlauf: was eine Kappe schluckt ─────────────────────────────────
    /**
     * Drei Getter, die messen, was die harten Kappen abschneiden — in
     * Prozentpunkten derselben Achse. Sie stehen NEBEN den Kappen-Gettern und
     * nicht in ihnen: so ändert keine vorhandene Rechnung ihr Verhalten.
     *
     * Wohin der Überlauf jeweils fließt und warum die Umrechnungssätze nicht
     * 1:1 sind, steht samt Messwerten an `FORGE_OVERFLOW_*` in
     * `constants/forge.ts`. Der vierte Überlauf — die gesättigte Drop-Chance —
     * liegt nicht hier, sondern in `inventoryStore.tryDropMaterial`: dort ist
     * die Sättigung, nicht am Zweig (der Forge-Faktor allein erreicht sie nie).
     */
    /** Prozentpunkte des Expeditionstempos, die `MIN_EXPEDITION_MULT` schluckt. */
    expeditionSpeedOverflowPct(): number {
      const raw = this.branchEffect('solarSails') + this.relicEffect('stellarCompass')
      return Math.max(0, raw - (1 - MIN_EXPEDITION_MULT) * 100)
    },

    /** Prozentpunkte der Verweildauer-Kürzung, die `MIN_DWELL_MULT` schluckt. */
    dwellOverflowPct(): number {
      return Math.max(0, this.branchEffect('quickening') - (1 - MIN_DWELL_MULT) * 100)
    },

    /** Prozentpunkte der Schadensminderung, die `MIN_DAMAGE_TAKEN_MULT` schluckt. */
    damageTakenOverflowPct(): number {
      return Math.max(0, this.branchEffect('aegis') - (1 - MIN_DAMAGE_TAKEN_MULT) * 100)
    },

    // ── Effect getters (one per integration point) ────────────────────────────
    /** Multiplier on expedition durations (< 1 = faster). */
    expeditionSpeedMult(): number {
      return Math.max(
        MIN_EXPEDITION_MULT,
        1 - (this.branchEffect('solarSails') + this.relicEffect('stellarCompass')) / 100,
      )
    },

    /** Multiplier on offline earnings. */
    offlineEarningsMult(): number {
      const eternal = this.constellationForged('eternalOrbit') ? 15 : 0
      return (
        1 +
        (this.branchEffect('moonOrbit') +
          this.relicEffect('echoOfTheVoid') +
          this.boughEffect('sleeplessOrbit') +
          eternal) /
          100
      )
    },

    /**
     * Multiplier on expedition REWARDS (Wayfinder's Cache + Wayfarer's Hoard).
     * Nicht zu verwechseln mit `expeditionSpeedMult`, der die DAUER kürzt und
     * bei `FORGE_MIN_EXPEDITION_MULT` gegen einen Boden läuft — genau deshalb
     * trägt der endlose Ring die Beute und nicht das Tempo.
     */
    expeditionRewardMult(): number {
      return (
        1 +
        (this.branchEffect('wayfindersCache') +
          this.boughEffect('wayfarersHoard') +
          // Was `MIN_EXPEDITION_MULT` am Tempo abschneidet, kommt hier als
          // Beute wieder heraus — bei Vollausbau die grösste der vier
          // Überlaufmengen (37 Punkte).
          this.expeditionSpeedOverflowPct * FORGE_OVERFLOW_EXPEDITION_REWARD_RATE) /
          100
      )
    },

    /** Multiplier on champion experience gains (Eternal Host). */
    championXpMult(): number {
      return 1 + (this.boughEffect('eternalHost') + this.relicEffect('heraldsTrophy')) / 100
    },

    /**
     * Multiplier on how long a resource star stays in the sky (Warden's Vigil +
     * Kindled Vigil). Der ehrliche Material-Weg: `materialDropMult` sättigt,
     * weil `tryDropMaterial` gegen `Math.random()` prüft und eine Chance über 1
     * nichts mehr hinzufügt — mehr ZEIT am Stern sättigt nicht.
     */
    starLifetimeMult(): number {
      return (
        1 +
        (this.branchEffect('wardensVigil') +
          this.boughEffect('kindledVigil') +
          // Quickening-Überlauf: die Sonne kann nicht schneller reifen, also
          // stehen ihre Sterne länger. Dieselbe Grösse (Zeit in Prozent),
          // deshalb 1:1.
          this.dwellOverflowPct * FORGE_OVERFLOW_STAR_LIFETIME_RATE) /
          100
      )
    },

    /** Flat max-HP granted by the Adamant Core bough, in total. */
    boughMaxHpBonus(): number {
      return this.boughEffect('adamantCore')
    },

    /** Extra hours added to the offline-progress cap (Echo of the Void +
     *  Starfarer's Compact). Beide verschieben dieselbe GRENZE und addieren
     *  sich deshalb, statt sich zu überschreiben. */
    offlineMaxHoursBonus(): number {
      return (
        (this.relicLevel('echoOfTheVoid') > 0 ? FORGE_RELIC_OFFLINE_HOURS : 0) +
        (this.constellationForged('starfarersCompact') ? FORGE_COMPACT_OFFLINE_HOURS : 0) +
        // Pact of the Long Vigil zahlt auf DIESELBE Grenze und wird deshalb hier
        // addiert statt beim Aufrufer: `usePersistence` liest genau einen
        // Forge-Wert, und die Statistik-Zeile daneben ebenso.
        this.pactOfflineHoursBonus
      )
    },

    /**
     * Wie stark der Void-Zoll gemildert wird, 0..1 — 1 hiesse „er greift gar
     * nicht mehr".
     *
     * Das erste Kaufangebot im ganzen Spiel, das GEGEN den Void zeigt. Der Riss
     * war bis hierhin die einzige Kraft, gegen die man nichts tun konnte ausser
     * ihn zu schliessen und zu warten — und die Bandzeile `void` blieb damit
     * eine Zeile, auf die der Spieler keinen Zugriff hatte.
     *
     * Gedeckelt bei `FORGE_VOID_RELIEF_CAP`: der Void ist das einzige System,
     * das gegen den Spieler drängt (CLAUDE.md), und ein Zoll, den man
     * vollständig abkaufen kann, ist keiner mehr. Was bleibt, ist ein spürbarer
     * Rest — die Milderung verschiebt die Dringlichkeit, sie hebt sie nicht auf.
     */
    voidTollRelief(): number {
      // Siegel und Krone MULTIPLIZIEREN sich auf dem verbleibenden Rest, statt
      // sich zu addieren: 60 % plus 50 % wären 110 % und hätten den Void
      // abgeschafft. So schieben beide gemeinsam an denselben Boden, und die
      // Krone ist auch neben einem vollen Siegel noch etwas wert.
      const seal = this.relicEffect('riftwardensSeal') / 100
      const crown = this.crownForged('tidelessWatch') ? FORGE_CROWN_VOID_RELIEF : 0
      const combined = 1 - (1 - seal) * (1 - crown)
      return Math.min(FORGE_VOID_RELIEF_CAP, combined)
    },

    // ── Ring 5: je ein Getter pro Krone ───────────────────────────────────────
    /**
     * Wanderer's Gate — öffnet eine zurückkehrende Expedition sofort die
     * nächste Passage, statt auf `EXPEDITION_SPAWN_INTERVAL_MS` zu warten?
     */
    expeditionInstantRespawn(): boolean {
      return this.crownForged('wanderersGate')
    },

    /**
     * Tideless Watch, zweite Hälfte — Faktor auf die Chime-Ausschüttung eines
     * erlegten Void-Wesens.
     *
     * Die „Rückzahlung" hängt am BOON und nicht an einer nachgerechneten
     * Drossel-Bilanz: die müsste Rampe, Milderung und alle gleichzeitig
     * stehenden Wesen auseinanderhalten und wäre eine Zahl, die der Spieler
     * nicht nachprüfen kann. Ein verdoppelter Lohn sagt dasselbe und ist im
     * Moment des Abschusses ablesbar.
     */
    voidSlayRewardMult(): number {
      // Die Krone verdoppelt, der Bough dahinter multipliziert weiter — er
      // steht als eigener Faktor und nicht in der Klammer, weil er ohne die
      // Krone gar nicht kaufbar ist und ohne sie folglich auch nichts tut.
      const crown = this.crownForged('tidelessWatch') ? FORGE_CROWN_VOID_SLAY_REWARD_MULT : 1
      return crown * (1 + this.boughEffect('darkTithe') / 100)
    },

    /**
     * Warden's Reprieve — kehrt eine gefallene Sonne einmal je Sonnenphase
     * zurück? Der Getter sagt nur, ob die Krone steht; ob der Aufschub in
     * DIESER Phase schon verbraucht ist, weiss `playerStore`.
     */
    sunReprieveOwned(): boolean {
      return this.crownForged('wardensReprieve')
    },

    /**
     * Sunderer's Mark — unterhalb welchen HP-Anteils der Boss-Zoll kippt.
     * `0` heisst „die Krone steht nicht", der Zoll bleibt also ein Zoll.
     */
    bossTollFlipsBelowPct(): number {
      return this.crownForged('sunderersMark') ? FORGE_CROWN_BOSS_FLIP_HP_FRACTION : 0
    },

    /**
     * Midas Overflow — wie viel Stardust der Chime-Berg in dieser Sekunde
     * abwirft.
     *
     * Gerundet und gedeckelt HIER und nicht beim Verbraucher: die Zahl ist eine
     * Wirkung des Baums, und der Tick soll sie buchen, nicht ausrechnen. Unter
     * `FORGE_CROWN_OVERFLOW_MIN_CHIMES` liefert er 0 — dort sind Chimes noch
     * die knappe Grösse, und ein Abfluss nähme dem Baum sein Wachstum.
     */
    chimeOverflowPerSec(): number {
      if (!this.crownForged('midasOverflow')) return 0
      const chimes = useGameStore().chimes
      if (chimes < FORGE_CROWN_OVERFLOW_MIN_CHIMES) return 0
      const raw = chimes * FORGE_CROWN_OVERFLOW_FRACTION_PER_SEC
      return Math.min(FORGE_CROWN_OVERFLOW_MAX_PER_SEC, Math.floor(raw))
    },

    /* ══ Die fünf ZUSAMMENLAUF-Kronen ═══════════════════════════════════════
     * Dasselbe Muster wie die fünf darüber: der Getter sagt, ob die Regel gilt,
     * die Zahl dahinter steht als Konstante, und genau EIN fremder Store liest
     * ihn. Keiner von ihnen hebt `otherDps` (das kürzt sich gegen die Boss-HP
     * weg) und keiner multipliziert die CpS, mit der er bezahlt wird — die
     * Prüfung dazu steht in `docs/balance.md`.
     */
    /**
     * Pilgrim's Accord — behält eine GESCHEITERTE Expedition ihre Materialien?
     *
     * Der Fehlschlag bleibt einer: Zeit und Chime-Lohn sind weiterhin weg. Nur
     * die Rezeptur kommt zurück, und damit ist die Achse an die Expeditionstakt
     * gebunden statt an eine Wahrscheinlichkeit — sie kann nicht davonlaufen.
     */
    failedExpeditionKeepsMaterials(): boolean {
      return this.crownForged('pilgrimsAccord')
    },

    /**
     * Stillpoint — hält ein Ressourcenstern seine Despawn-Frist an, solange auf
     * ihm gekämpft wird?
     *
     * Nur die EIGENE Frist des Sterns. Die Enrage-Uhr der Bosse darauf läuft
     * weiter: der Stern wartet, der Boss nicht.
     */
    resourceStarHoldsInFight(): boolean {
      return this.crownForged('stillpoint')
    },

    /**
     * Reclaimed Bargain — zu welchem Preisanteil ein VERFALLENES Angebot ein
     * zweites Mal ausliegt. `1` heisst „zum vollen Preis", also wie bisher.
     */
    reclaimedBargainPriceMult(): number {
      return this.crownForged('reclaimedBargain') ? FORGE_CROWN_RECLAIMED_PRICE_MULT : 1
    },

    /**
     * Tireless Quarry — wie viele Stunden die Harvester nach dem Schliessen des
     * Tabs weiterarbeiten.
     *
     * Ein FENSTER und keine Rate: wer drei Tage fortbleibt, bekommt dieselbe
     * Stunde wie jemand, der zwei bekommt. Eine Rate wäre hier die geschlossene
     * Rückkopplung, ein Fenster ist es nicht.
     */
    offlineHarvestHours(): number {
      return this.crownForged('tirelessQuarry') ? FORGE_CROWN_OFFLINE_HARVEST_HOURS : 0
    },

    /**
     * Steadfast Tribute — zahlt auch eine NIEDERLAGE ihren Honor-Tribut ganz?
     *
     * Der Abschlag (`HONOR_LOSS_TRIBUTE_MULT`) entfällt, sonst ändert sich
     * nichts: der LP-Verlust bleibt, und ein verlorenes Match bleibt ein
     * verlorenes.
     */
    lossTributeFull(): boolean {
      return this.crownForged('steadfastTribute')
    },

    /* ══ Die fünf DREIFACH-Kronen ═══════════════════════════════════
     * Dritte Fassung des Zusammenlaufs, gleiches Muster: der Getter sagt, ob die
     * Regel gilt, die Zahl steht als Konstante, genau EIN fremder Store liest
     * ihn.
     */
    /**
     * Homeward Sky — wartet ein Drifter, der während der Abwesenheit
     * hinübergezogen ist?
     *
     * Die Zahl ist eine ANZAHL und keine Rate: einer, egal wie lange jemand
     * fortbleibt. Dasselbe Muster wie `offlineHarvestHours` — ein Fenster kann
     * nicht davonlaufen, eine Rate schon.
     */
    offlineDrifterCount(): number {
      return this.crownForged('homewardSky') ? FORGE_CROWN_OFFLINE_DRIFTER_COUNT : 0
    },

    /**
     * Sealed Threshold — welchen Anteil seines Zolls ein Riss noch nimmt, der
     * einschlägt, während die Nachwirkung eines anderen läuft. `1` heisst
     * „den vollen“, also wie bisher.
     *
     * Es geht NICHT gegen den einzelnen Riss, sondern gegen Risse, die sich
     * STAPELN — die einzige Lage, in der der Void den Spieler wirklich abräumt.
     */
    stackedRiftTollShare(): number {
      return this.crownForged('sealedThreshold') ? FORGE_CROWN_STACKED_RIFT_TOLL_SHARE : 1
    },

    /**
     * Sanctum Veil — hält eine laufende Bard-Fähigkeit den Void davon ab, einen
     * Riss aufzureissen?
     *
     * Ein FENSTER und kein Dauerzustand: die Abklingzeiten laufen gegen
     * `FORGE_MIN_BARD_COOLDOWN_MULT`, es gibt also keinen Ausbau, der den Void
     * dauerhaft stillstellt. Der fällige Spawn wird nicht verschluckt, sondern
     * auf den Wiederholungstakt gestellt.
     */
    riftsHeldWhileAbilityRuns(): boolean {
      return this.crownForged('sanctumVeil')
    },

    /**
     * Unfailing Sign — unter welchen Anteil ihrer Höchst-HP die Sonne nicht
     * fallen kann, solange ein Vorzeichen-Lohn läuft. `0` heisst „kein Boden“.
     */
    omenHpFloorFraction(): number {
      return this.crownForged('unfailingSign') ? FORGE_CROWN_OMEN_HP_FLOOR_FRACTION : 0
    },

    /**
     * Remembered Wound — steht ein entkommener Planeten-Boss verwundet wieder
     * auf?
     *
     * Die Wunde verschiebt nur den STARTWERT. `maxHP` bleibt, wie die Formel sie
     * rechnet — dieselbe Trennung wie bei `hollowCore`.
     */
    bossKeepsWounds(): boolean {
      return this.crownForged('rememberedWound')
    },

    /* ══ Die fünf Boughs MIT TOR ════════════════════════════════════
     * Jeder setzt die Regel seiner Krone ins Endlose fort. Additiv je Stufe,
     * ohne Deckel — und ausschliesslich auf Achsen, die eine AUSZAHLUNG oder
     * eine MENGE skalieren. Ein Wahrscheinlichkeitswurf hat hier nichts zu
     * suchen: er sättigt still, sobald er 1 erreicht.
     */
    /** Faktor auf die Länge eines Cosmic-Bargain-Buffs (Brimming Cart). */
    bargainBuffDurationMult(): number {
      return 1 + this.boughEffect('brimmingCart') / 100
    },

    /**
     * Faktor auf die MENGE, die ein Harvester je Takt einbringt (World's Bounty).
     *
     * Die Menge und nicht der Takt: der Takt läuft gegen
     * `FORGE_MIN_HARVEST_INTERVAL_MULT` und wäre ab dessen Boden ein bezahltes
     * Nichts. Gebucht wird wie bei der Boss-Beute — ganze Einheiten plus den
     * Nachkommateil als Chance, damit über 1 hinaus nichts verfällt.
     */
    harvestYieldMult(): number {
      return 1 + this.boughEffect('worldsBounty') / 100
    },

    /** Faktor auf den Chime-Lohn eines eingesammelten Drifters (Drifter's Due). */
    drifterRewardMult(): number {
      return 1 + this.boughEffect('driftersDue') / 100
    },

    /* ══ Die drei DREIFACH-Konstellationen ════════════════════════════
     * Einmalkaeufe ohne Stufe, deshalb je ein Ja/Nein und keine Zahl —
     * dieselbe Form wie bei den Kronen und aus demselben Grund: eine Regel, die
     * man ein zweites Mal kaufen kann, ist keine Regel mehr.
     */
    /** The Waiting Road — wartet ein Expeditions-Angebot, statt zu verfallen? */
    expeditionOffersWait(): boolean {
      return this.constellationForged('waitingRoad')
    },

    /** The Standing Vein — ernten die Harvester eines gefallenen Planeten weiter? */
    harvestersSurviveDowntime(): boolean {
      return this.constellationForged('standingVein')
    },

    /** Twinned Sky — wie viele Drifter zusätzlich am Himmel stehen dürfen. */
    extraDrifterSlots(): number {
      return this.constellationForged('twinnedSky') ? FORGE_TWINNED_SKY_EXTRA_DRIFTERS : 0
    },

    /** Multiplier on how long a collected drifter boon runs (Pilgrim's Reliquary). */
    boonDurationMult(): number {
      return 1 + this.relicEffect('pilgrimsReliquary') / 100
    },

    /**
     * Faktor auf die Chime-ANFORDERUNG je anstehendem Meep (Meep Shrine) —
     * kleiner als 1 heisst „günstiger".
     *
     * Er greift an der Anforderung und nicht an der Ausbeute, weil die als
     * WURZEL darauf steht (`gameStore.exactPendingMeeps`): ein Faktor auf die
     * Ernte selbst hätte die Kurve verlassen, dieser bleibt darin. Ein
     * Relikt-Level kann nur steigen, der Faktor also nur fallen — die
     * Monotonie, für die `gameStore.runMeepCostFloor` existiert, bleibt heil.
     */
    meepCostMult(): number {
      return Math.max(FORGE_MEEP_COST_FLOOR, 1 - this.relicEffect('meepShrine') / 100)
    },

    /** Chance (0–1), dass ein verdoppelter Klick Material lockert (Caretaker's Ledger). */
    clickMaterialChance(): number {
      return this.constellationForged('caretakersLedger') ? FORGE_LEDGER_CLICK_DROP_CHANCE : 0
    },

    /** Lässt ein zerstörtes Void-Wesen einen Splitter fallen (Voidbound Pact)? */
    voidKillDropsShard(): boolean {
      return this.constellationForged('voidboundPact')
    },

    /** HP restored to the sun per second. */
    hpRegenPerSec(): number {
      const regen = this.branchEffect('regeneration')
      const doubled = this.constellationForged('eternalOrbit') ? regen * 2 : regen
      // Aegis-Überlauf: was die Schadenskappe abschneidet, kommt als
      // Regeneration wieder. Steht AUSSERHALB der Verdopplung — Eternal Orbit
      // ist ein Bonus auf den Regenerations-Zweig, nicht auf fremde Achsen.
      return doubled + this.damageTakenOverflowPct * FORGE_OVERFLOW_HP_REGEN_PER_PCT
    },

    /** Multiplier on incoming damage (< 1 = less damage). */
    damageTakenMult(): number {
      const bulwark = this.constellationForged('bulwarkPact')
        ? FORGE_CONSTELLATION_BULWARK_DAMAGE_MULT
        : 1
      return Math.max(MIN_DAMAGE_TAKEN_MULT, (1 - this.branchEffect('aegis') / 100) * bulwark)
    },

    /** Chance (0–1) that a click counts twice. */
    doubleClickChance(): number {
      return Math.min(MAX_DOUBLE_CLICK_CHANCE, this.branchEffect('goldenEcho') / 100)
    },

    /**
     * Chance (0–1), dass ein Klick DREIFACH zählt — der Golden-Echo-Überlauf.
     *
     * Als einziger der vier Überläufe braucht er keinen Umrechnungssatz: er
     * misst dieselbe Grösse wie seine Quelle (Klickchance) und ist schlicht
     * deren nächste Stufe. Bei Vollausbau sind das 16 Punkte über der Kappe,
     * also 16 % Dreifachklick — ein Erwartungswert-Zuwachs von 16 % auf den
     * Klickwert, gegen die 80 %, die der gekappte Doppelklick schon trägt.
     *
     * Der Verbraucher (`gameStore.addChime`) legt die beiden Bereiche NEBEN-
     * einander auf EINEN Wurf, statt zweimal zu würfeln — sonst könnte ein
     * Klick beides sein und der Wert wäre sechsfach. Die Trefferchance
     * insgesamt ist damit wieder der volle Rohwert des Zweiges: es geht nichts
     * mehr verloren, und die Kappe begrenzt nur noch, wie viel davon bloss
     * doppelt zählt.
     */
    tripleClickChance(): number {
      return Math.max(0, this.branchEffect('goldenEcho') / 100 - MAX_DOUBLE_CLICK_CHANCE)
    },

    /** Fraction of CpS added to every click (Resonance + Midas Bell + Deep Resonance). */
    cpcFromCpsPct(): number {
      return (
        (this.branchEffect('resonance') +
          this.relicEffect('midasBell') +
          this.boughEffect('deepResonance')) /
        100
      )
    },

    /** Multiplier on the material drop chance (Comet Miner + Phase Lantern buff). */
    materialDropMult(): number {
      const lantern = this.buffActive('dropX2') ? 2 : 1
      return (1 + this.branchEffect('cometMiner') / 100) * lantern
    },

    /** Extra materials per successful drop (Prospector's Charm). */
    extraDropCount(): number {
      return this.constellationForged('prospectorsCharm') ? 1 : 0
    },

    /** Multiplier on star-phase dwell times (< 1 = faster phases). */
    dwellMult(): number {
      return Math.max(MIN_DWELL_MULT, 1 - this.branchEffect('quickening') / 100)
    },

    /** Multiplier on orbiting champion DPS (Warcry + Host of Champions + Hunter's Vigil). */
    championDpsMult(): number {
      const vigil = this.constellationForged('huntersVigil') ? 10 : 0
      return 1 + (this.branchEffect('warcry') + this.relicEffect('hostOfChampions') + vigil) / 100
    },

    /** Multiplier on damage dealt to bosses (Shatter + Ember Crown + Undying Wrath). */
    bossDamageMult(): number {
      return (
        1 +
        (this.branchEffect('shatter') +
          this.relicEffect('emberCrown') +
          this.boughEffect('undyingWrath')) /
          100
      )
    },

    /** Fraction of click damage splashed to all enemies
     *  (Shattering Nova + Sundering Wake + Rending Arc). */
    clickSplashPct(): number {
      const nova = this.constellationForged('shatteringNova') ? 10 : 0
      return (nova + this.branchEffect('sunderingWake') + this.boughEffect('rendingArc')) / 100
    },

    /**
     * Multiplier on total CpS (Stellar Wind + Tempo Surge buff + Tidal Drift +
     * Endless Tide).
     *
     * Der Baum-Term steht als EIGENER Faktor neben den beiden anderen und
     * nicht in einer ihrer Klammern: sonst multiplizierte der Stellar-Wind-
     * Faktor eine unbegrenzt wachsende Zahl mit, und aus dem additiven Bough
     * würde ein multiplikativer.
     */
    cpsMult(): number {
      const stellar = this.constellationForged('stellarWind')
        ? FORGE_CONSTELLATION_STELLAR_WIND_CPS_MULT
        : 1
      const buff = this.buffActive('cpsX2') ? 2 : 1
      const tree = 1 + (this.branchEffect('tidalDrift') + this.boughEffect('endlessTide')) / 100
      return stellar * buff * tree
    },

    /** Multiplier on total CpC (Golden Tempest + Midas Hour buff + Gilded
     *  Harvest + Gilded Cascade) — derselbe Aufbau wie `cpsMult`. */
    cpcMult(): number {
      const tempest = this.constellationForged('goldenTempest')
        ? FORGE_CONSTELLATION_GOLDEN_TEMPEST_CPC_MULT
        : 1
      const tree =
        1 + (this.branchEffect('gildedHarvest') + this.boughEffect('gildedCascade')) / 100
      return tempest * (this.buffActive('cpcX2') ? 2 : 1) * tree
    },

    /* ══ Ring 4 & 5 — die Getter, die aus dem Baum HERAUSGREIFEN ══════════════
     *
     * Dreissig Getter, je einer für eine Einbaustelle in einem fremden Store.
     * Sie folgen alle demselben Bauplan wie die Getter darüber: die Wirkung
     * kommt aus `ringEffect(id)`, Kappe und Boden stehen HIER und nicht beim
     * Aufrufer, und keiner von ihnen berührt CpS oder CpC.
     *
     * **Dass keiner davon die Chime-Rate multipliziert, ist Absicht.** Die drei
     * inneren Ringe tragen die Wirtschaft bereits vierfach; ein weiterer Faktor
     * dort wäre kein neuer Inhalt, sondern eine grössere Zahl. Nebenbei bleibt
     * damit `shopStore.cpsFactorBreakdown` unangetastet — und ebenso die
     * Boss-HP-Formel, denn kein Knoten hier hebt `otherDps`.
     */

    // ── flightSpeed-Achse ────────────────────────────────────────────────────
    /** Prozentpunkte, die auf die Erfolgschance einer Expedition addiert werden
     *  (Pathfinder's Oath). Die Summe deckelt `EXPEDITION_SUCCESS_CHANCE_MAX`
     *  bereits beim Aufrufer — hier steht deshalb kein zweiter Deckel. */
    expeditionSuccessBonusPct(): number {
      return this.ringEffect('pathfindersOath')
    },

    /**
     * Faktor auf das GEWICHT der Augmente oberhalb von `common`
     * (Dreamer's Draw). 1 heisst „unverändert gewürfelt".
     */
    augmentLuckMult(): number {
      return Math.min(FORGE_MAX_AUGMENT_LUCK_MULT, 1 + this.ringEffect('dreamersDraw') / 100)
    },

    /** Faktor auf den Abstand zweier Drifter (< 1 = häufiger). */
    drifterIntervalMult(): number {
      return Math.max(FORGE_MIN_DRIFTER_INTERVAL_MULT, 1 - this.ringEffect('wanderersBeacon') / 100)
    },

    /** Faktor auf den Abstand zweier Expeditions-Angebote (< 1 = schneller). */
    expeditionSpawnMult(): number {
      return Math.max(
        FORGE_MIN_EXPEDITION_SPAWN_MULT,
        1 - this.ringEffect('cartographersPact') / 100,
      )
    },

    /** Zusätzliche Stunden am Offline-Fenster (Pact of the Long Vigil). Additiv
     *  und ohne Deckel — dieselbe Grösse wie `offlineMaxHoursBonus`, nur aus dem
     *  Baum statt aus Relikt und Konstellation. */
    pactOfflineHoursBonus(): number {
      return this.ringEffect('longVigilPact')
    },

    /** Faktor auf die Reisedauer eines Champions (< 1 = kürzer). Greift NACH
     *  `CHAMPION_TRAVEL_MAX_MS` — der Deckel bleibt der Deckel. */
    championTravelMult(): number {
      return Math.max(FORGE_MIN_CHAMPION_TRAVEL_MULT, 1 - this.ringEffect('starroadPact') / 100)
    },

    // ── maxHp-Achse ──────────────────────────────────────────────────────────
    /** Faktor auf die Anflugdauer eines Void-Wesens (> 1 = langsamer). */
    voidTravelMult(): number {
      return Math.min(FORGE_MAX_VOID_TRAVEL_MULT, 1 + this.ringEffect('gravityWell') / 100)
    },

    /** Faktor auf den Abstand zweier Ressourcensterne (< 1 = häufiger). */
    resourceStarIntervalMult(): number {
      return Math.max(
        FORGE_MIN_RESOURCE_STAR_INTERVAL_MULT,
        1 - this.ringEffect('starwardensLantern') / 100,
      )
    },

    /** Faktor auf den Spawnabstand des Void (> 1 = seltener). */
    voidSpawnIntervalMult(): number {
      return Math.min(FORGE_MAX_VOID_SPAWN_INTERVAL_MULT, 1 + this.ringEffect('riftAnchor') / 100)
    },

    /** Faktor auf den Meep-Verlust eines Einschlags (< 1 = weniger). */
    voidMeepLossMult(): number {
      return Math.max(FORGE_MIN_VOID_MEEP_LOSS_MULT, 1 - this.ringEffect('hollowPact') / 100)
    },

    /**
     * Wie viele Planeten ein Ressourcenstern ZUSÄTZLICH trägt (Warden's Pact).
     *
     * Eine ganze Zahl, kein Faktor: `_buildResourcePlanetSlots` verteilt die
     * Planeten gleichmässig über den Orbit (`(i / count) · 2π`), eine
     * Bruchzahl gäbe es dort nicht. Und es ist der zweite ehrliche Material-Weg
     * neben `starLifetimeMult`: mehr ZIELE je Vorbeiflug sättigen so wenig wie
     * mehr Zeit, während eine höhere Fallchance es täte (docs/balance.md).
     */
    resourceStarPlanetBonus(): number {
      return Math.round(this.ringEffect('wardensPact'))
    },

    /** Faktor auf die Laufzeit einer Void-Nachwirkung (< 1 = kürzer). */
    voidAftermathMult(): number {
      return Math.max(FORGE_MIN_VOID_AFTERMATH_MULT, 1 - this.ringEffect('unbrokenPact') / 100)
    },

    // ── chimesPerClick-Achse ─────────────────────────────────────────────────
    /** Faktor auf den Preis eines Items im Laden (< 1 = billiger). */
    itemCostMult(): number {
      return Math.max(FORGE_MIN_ITEM_COST_MULT, 1 - this.ringEffect('merchantsFavor') / 100)
    },

    /** Faktor auf die Chime-Kosten eines Champion-Levels (< 1 = billiger). */
    championLevelCostMult(): number {
      return Math.max(
        FORGE_MIN_CHAMPION_LEVEL_COST_MULT,
        1 - this.ringEffect('almsOfTheKeeper') / 100,
      )
    },

    /** Faktor auf die Abklingzeit einer Bard-Fähigkeit (< 1 = kürzer). */
    bardCooldownMult(): number {
      return Math.max(FORGE_MIN_BARD_COOLDOWN_MULT, 1 - this.ringEffect('chimeConduit') / 100)
    },

    /** Faktor auf den Preis des Cosmic Bargain (< 1 = billiger). */
    bargainPriceMult(): number {
      return Math.max(FORGE_MIN_BARGAIN_PRICE_MULT, 1 - this.ringEffect('hagglersPact') / 100)
    },

    /** Faktor auf den Restock-Abstand des Cosmic Bargain (< 1 = schneller). */
    bargainRestockMult(): number {
      return Math.max(FORGE_MIN_BARGAIN_RESTOCK_MULT, 1 - this.ringEffect('merchantsPact') / 100)
    },

    /**
     * Faktor auf die WIRKUNG einer Bard-Fähigkeit (Resonant Pact).
     *
     * Greift ausschliesslich am multiplikativen Weg (`powerMultOf`) an, nie an
     * einer Fensterlänge: hinge ein Buff-FENSTER hier, verlängerte Klicken das
     * Fenster, in dem Klicken zählt — derselbe geschlossene Kreis wie beim
     * Overclock-Stapel (docs/balance.md).
     */
    bardPowerMult(): number {
      return 1 + (this.ringEffect('resonantPact') + this.relicEffect('skyboundAltar')) / 100
    },

    // ── chimesPerSecond-Achse ────────────────────────────────────────────────
    /** Faktor auf den Erntetakt der Planeten-Harvester (< 1 = schneller). */
    harvestIntervalMult(): number {
      return Math.max(
        FORGE_MIN_HARVEST_INTERVAL_MULT,
        1 - this.ringEffect('quarrymastersEye') / 100,
      )
    },

    /** Faktor auf den Preis einer Gebäudestufe (< 1 = billiger). */
    buildingCostMult(): number {
      return Math.max(FORGE_MIN_BUILDING_COST_MULT, 1 - this.ringEffect('kilnSubsidy') / 100)
    },

    /** Faktor auf den Abstand zweier Vorzeichen-Angebote (< 1 = häufiger). */
    omenIntervalMult(): number {
      return Math.max(FORGE_MIN_OMEN_INTERVAL_MULT, 1 - this.ringEffect('omenReader') / 100)
    },

    /** Faktor auf die Materialbeute eines Planeten-Bosses. */
    bossMaterialMult(): number {
      return 1 + (this.ringEffect('prospectorsPact') + this.boughEffect('rivenLode')) / 100
    },

    /**
     * Abstand zweier Gebäude-Meilensteine in Stufen (Founder's Pact).
     *
     * Gibt die ZAHL zurück und nicht einen Faktor: `buildingMilestoneMultiplier`
     * teilt die Stufe durch dieses Intervall, und ein gebrochenes Intervall
     * verschöbe die Schwellen um Bruchteile einer Stufe.
     */
    buildingMilestoneInterval(): number {
      return Math.max(
        FORGE_MIN_BUILDING_MILESTONE_INTERVAL,
        BUILDING_MILESTONE_INTERVAL - Math.round(this.ringEffect('foundersPact')),
      )
    },

    /** Faktor auf die Zielgrösse eines Vorzeichens (< 1 = leichter). */
    omenTargetMult(): number {
      return Math.max(FORGE_MIN_OMEN_TARGET_MULT, 1 - this.ringEffect('augursPact') / 100)
    },

    // ── dmgPerClick-Achse ────────────────────────────────────────────────────
    /** Faktor auf den LP-Gewinn eines Sieges. */
    lpGainMult(): number {
      return 1 + this.ringEffect('heraldsFavor') / 100
    },

    /** Faktor auf die maximale HP eines Planeten-Bosses beim Erscheinen. */
    bossHpMult(): number {
      return Math.max(FORGE_MIN_BOSS_HP_MULT, 1 - this.ringEffect('hollowCore') / 100)
    },

    /** Faktor auf die Chime-Beute eines Planeten-Bosses. */
    bossRewardMult(): number {
      return 1 + (this.ringEffect('siegeReckoning') + this.relicEffect('chaliceOfTheFallen')) / 100
    },

    /** Faktor auf die Frist bis zum Enrage eines Bosses (> 1 = mehr Zeit). */
    bossEnrageMult(): number {
      return 1 + this.ringEffect('patientPact') / 100
    },

    /** Faktor auf den LP-Verlust einer Niederlage (< 1 = weniger). */
    lpLossMult(): number {
      return Math.max(FORGE_MIN_LP_LOSS_MULT, 1 - this.ringEffect('arbitersPact') / 100)
    },

    /** Faktor auf den Honor-Tribut nach einem Kampf. */
    honorTributeMult(): number {
      return 1 + this.ringEffect('honoredPact') / 100
    },
  },

  actions: {
    /** Advance the reactive clock, expire buffs, restock the bargain.
     *  Called by gameStore.tick() once per second. */
    tick(): void {
      this.forgeNow = gameNow()
      const hadBuffs = this.activeBuffs.length > 0
      this.activeBuffs = this.activeBuffs.filter((b) => b.expiresAt > this.forgeNow)
      if (hadBuffs && this.activeBuffs.length === 0) this.recalcRates()
      // Restock also when a persisted deal id no longer exists in the pool —
      // otherwise the shop would show no deal until the next restock window.
      if (!this.activeDeal || this.forgeNow >= this.bargainRestockAt) {
        this.restockBargain()
      }
    },

    restockBargain(): void {
      /* Reclaimed Bargain (Star-Forge-Krone): ein Angebot, das der Spieler
         VERFALLEN liess, liegt noch einmal aus — zum halben Preis.
         `bargainReclaimed` sorgt dafür, dass es bei EINEM zweiten Mal bleibt;
         danach rotiert der Handel wie immer. Ein gekauftes Angebot kommt nicht
         zurück, sonst wäre die Krone ein Dauerrabatt statt einer zweiten
         Chance. */
      const missed = this.bargainDealId !== '' && !this.bargainPurchased && !this.bargainReclaimed
      if (missed && this.reclaimedBargainPriceMult < 1) {
        this.bargainReclaimed = true
        this.bargainRestockAt = gameNow() + FORGE_BARGAIN_RESTOCK_MS * this.bargainRestockMult
        return
      }
      this.bargainReclaimed = false
      const pool = FORGE_BARGAINS.filter((b) => b.id !== this.bargainDealId)
      const pick = pool[Math.floor(Math.random() * pool.length)] ?? FORGE_BARGAINS[0]
      this.bargainDealId = pick.id
      this.bargainPurchased = false
      // Der Merchant's Pact verkürzt das Fenster. Er greift beim SETZEN und
      // nicht beim Ablesen: `bargainRestockAt` steht im Spielstand, und ein
      // Faktor auf einem gespeicherten Zeitpunkt zöge einen laufenden Handel
      // rückwirkend zusammen, sobald der Knoten gekauft wird.
      this.bargainRestockAt = gameNow() + FORGE_BARGAIN_RESTOCK_MS * this.bargainRestockMult
    },

    // ── Der „NEW"-Rahmen: was der Spieler schon gesehen hat ───────────────────
    /**
     * Angesehen → der azurne Rahmen ist erledigt.
     *
     * Die Prüfung auf „steht gerade in `shopReadyIds`" ist der Kern und keine
     * Vorsichtsmaßnahme: quittierte man eine ID, die gar nicht kaufbar ist,
     * läge sie beim Erschwinglichwerden schon als gesehen vor und der Rahmen
     * erschiene nie. Genau diese Reihenfolge trägt `acknowledgeNode` im
     * Meep-Baum.
     */
    acknowledgeShopEntry(id: string): void {
      if (!id) return
      if (this.acknowledgedShop.includes(id)) return
      const ids = this.shopReadyIds
      const ready =
        ids.upgrades.includes(id) ||
        ids.relics.includes(id) ||
        ids.constellations.includes(id) ||
        ids.bargain.includes(id)
      if (!ready) return
      this.acknowledgedShop.push(id)
    },

    /**
     * Quittungen für nicht mehr Kaufbares verwerfen, damit derselbe Eintrag
     * beim nächsten Mal wieder als neu gilt. Aus `gameStore.tick()`.
     *
     * Kostet nichts Zusätzliches: `shopReadyIds` ist derselbe gecachte Getter,
     * den die Abzeichen ohnehin jede Sekunde lesen.
     */
    syncShopAcknowledged(): void {
      if (this.acknowledgedShop.length === 0) return
      const ids = this.shopReadyIds
      const ready = new Set([...ids.upgrades, ...ids.relics, ...ids.constellations, ...ids.bargain])
      const next = this.acknowledgedShop.filter((id) => ready.has(id))
      if (next.length !== this.acknowledgedShop.length) this.acknowledgedShop = next
    },

    /**
     * Badge Lab: genau n Einträge unquittiert lassen.
     *
     * Direkte Zuweisung statt n Aufrufe von `acknowledgeShopEntry` — die prüft
     * jede ID einzeln gegen `shopReadyIds` und käme auf dasselbe Ergebnis zu
     * n-fachem Preis. Was hier geschrieben wird, IST ready, `syncShopAcknowledged()`
     * im Tick lässt es also stehen.
     */
    adminSetShopFresh(n: number): number {
      const ids = this.shopReadyIds
      const ready = [...ids.upgrades, ...ids.relics, ...ids.constellations, ...ids.bargain]
      this.acknowledgedShop = ready.slice(Math.max(0, n))
      return Math.min(Math.max(0, n), ready.length)
    },

    buyNode(id: string): boolean {
      if (!this.canAffordNode(id)) return false
      const def = getForgeNode(id)
      if (!def) return false
      const gameStore = useGameStore()
      const inventory = useInventoryStore()
      const materials = this.nodeMaterialCost(id)
      if (!inventory.removeMaterials(materials, 'forge')) return false
      gameStore.chimes -= this.nodeGoldCost(id)
      if (def.tier === 'branch') {
        this.branchLevels[id] = (this.branchLevels[id] ?? 0) + 1
      } else if (def.tier === 'leaf') {
        this.leafLevels[id] = (this.leafLevels[id] ?? 0) + 1
      } else if (def.tier === 'ward') {
        this.wardLevels[id] = (this.wardLevels[id] ?? 0) + 1
      } else if (def.tier === 'pact') {
        this.pactLevels[id] = (this.pactLevels[id] ?? 0) + 1
      } else if (def.tier === 'crown') {
        this.crownLevels[id] = 1
      } else if (def.tier === 'glimmer') {
        this.glimmerLevels[id] = (this.glimmerLevels[id] ?? 0) + 1
      } else {
        this.boughLevels[id] = (this.boughLevels[id] ?? 0) + 1
        // Max HP ist ein State-Feld und kein Faktor — es wird beim Kauf
        // gebucht, dasselbe Muster wie `forgeRelic('heartOfTheStar')`. Sicher
        // ist das, weil der Prestige den Sternbaum NICHT zurücksetzt (siehe
        // gameStore, „Der Meep-Baum bleibt STEHEN") und `playerStore.maxHP`
        // im Spielstand liegt; die Buchung kann also nicht auseinanderlaufen.
        if (id === 'adamantCore') usePlayerStore().maxHP += def.effectPerLevel
      }
      this.recalcRates()
      useSolarUpgradeStore().markSignaturePulse(forgeNodeAxis(id) ?? null)
      return true
    },

    forgeRelic(id: string): boolean {
      if (!this.canForgeRelic(id)) return false
      const def = getForgeRelic(id)
      if (!def) return false
      const gameStore = useGameStore()
      const inventory = useInventoryStore()
      if (!inventory.removeMaterials(this.relicMaterialCost(id), 'relic')) return false
      gameStore.chimes -= this.relicGoldCost(id)
      this.relicLevels[id] = this.relicLevel(id) + 1
      if (id === 'heartOfTheStar') {
        usePlayerStore().maxHP += def.effectPerLevel
      }
      this.recalcRates()
      // Achslos: ein Relikt nennt keinen `parentId`, sondern `requires` — es
      // einer Achse zuzuschlagen wäre geraten. Es speist die Grundsignatur.
      useSolarUpgradeStore().markSignaturePulse(null)
      return true
    },

    forgeConstellation(id: string): boolean {
      if (!this.canForgeConstellation(id)) return false
      const def = getForgeConstellation(id)
      if (!def) return false
      const gameStore = useGameStore()
      const inventory = useInventoryStore()
      if (!inventory.removeMaterials(def.materialCost, 'constellation')) return false
      gameStore.chimes -= def.goldCost
      this.forgedConstellations.push(id)
      this.recalcRates()
      useSolarUpgradeStore().markSignaturePulse(null)
      return true
    },

    buyBargain(): boolean {
      if (!this.canBuyBargain) return false
      const def = this.activeDeal
      if (!def) return false
      const gameStore = useGameStore()
      const inventory = useInventoryStore()
      const price = this.bargainPrice(def)
      if (
        FORGE_BARGAIN_KINDS_PAYING_MATERIALS.includes(def.kind) &&
        def.materials &&
        !inventory.removeMaterials(def.materials, 'bargain')
      ) {
        return false
      }
      gameStore.chimes -= price

      switch (def.kind) {
        case 'buff':
          if (def.buffId && def.durationMs) {
            // Brimming Cart (Bough) streckt die Laufzeit. ERNEUERN statt
            // stapeln — dieselbe Regel wie beim Overclock-Stapel: der Filter
            // darueber wirft den laufenden Buff weg, bevor der neue kommt.
            const durationMs = def.durationMs * this.bargainBuffDurationMult
            this.activeBuffs = this.activeBuffs.filter((b) => b.id !== def.buffId)
            this.activeBuffs.push({ id: def.buffId, expiresAt: gameNow() + durationMs })
          }
          break
        case 'materials': {
          const bundle: Record<string, number> = def.materials ?? {}
          for (const [matId, qty] of Object.entries(bundle)) {
            inventory.addMaterial(matId, 'bargain', qty)
          }
          break
        }
        case 'gold':
          gameStore.chimes += def.goldReward ?? 0
          break
        case 'dwellSkip': {
          const solar = useSolarUpgradeStore()
          const remaining = solar.phaseDwellRemainingMs
          solar.skipDwell(Math.floor(remaining * (def.dwellSkipPct ?? 0)))
          solar.tickDwell()
          break
        }
        case 'heal': {
          const player = usePlayerStore()
          player.currentHP = player.maxHP
          break
        }
        case 'voidPurge': {
          // `clearAll()` und nicht ein Wesen nach dem anderen: die Maut kauft
          // die PASSAGE, nicht einzelne Kreaturen — und derselbe Aufruf räumt
          // die Nachbeben mit, die den Zoll sonst noch Sekunden lang weiter
          // eintrieben. Die Raten hängen daran, `recalcRates()` unten fasst es.
          useVoidStore().clearAll()
          break
        }
        case 'meeps':
          // Der Karawanen-Lohn geht über `grantMeeps` und damit denselben Weg
          // wie der Drifter „Lost Meep": als FUND, der die Wartezeit umgeht.
          // Direkt auf `meeps` gebucht fehlte er in `totalMeepsEarned` und
          // damit in jeder Statistik und jeder Codex-Bahn, die ihn zählt.
          gameStore.grantMeeps(def.meepReward ?? 0)
          break
      }

      this.bargainPurchased = true
      this.recalcRates()
      return true
    },

    rerollBargain(): boolean {
      if (!this.canRerollBargain) return false
      const inventory = useInventoryStore()
      if (
        !inventory.removeMaterials(
          { [FORGE_BARGAIN_REROLL_MATERIAL]: FORGE_BARGAIN_REROLL_COST },
          'bargain',
        )
      ) {
        return false
      }
      this.restockBargain()
      return true
    },

    /**
     * TEMP (admin/testing): kauft in einem Zug alles, was der Shop gerade
     * hergibt — Kernstrahlen, Zweige, Blätter, Boughs, Relikte, Konstellationen
     * — ohne Chimes und ohne Material.
     *
     * Die PHASEN-Gates bleiben stehen: was die Sonne noch nicht freigeschaltet
     * hat, bleibt zu, und jeder Knoten landet auf der Obergrenze, die für die
     * LAUFENDE Phase gilt (`nodeMaxLevel`). Sonst stünden im Baum Stufen, die
     * es im Spiel gar nicht gibt, und die Testlage wäre keine.
     *
     * Reihenfolge ist Absicht — und seit die Ringe eine Leiter bilden, ist sie
     * es doppelt: jeder Ring schaltet den nächsten frei, und `FORGE_NODES` steht
     * bereits in dieser Reihenfolge (Branches → Leaves → Wards → Covenants →
     * Crowns → Boughs). Ein Lauf in anderer Ordnung liesse die äusseren Ringe
     * stehen, weil ihre Elternstufe noch nicht gebucht wäre. Erst gewachsene
     * Zweige erfüllen danach die Relikt- und Konstellations-Bedingungen.
     *
     * Remove together with the "DEV · Max Forge" button in ShopComponent.vue.
     */
    adminMaxAll(): void {
      const solar = useSolarUpgradeStore()
      solar.adminMaxBranches()

      const player = usePlayerStore()

      for (const def of FORGE_NODES) {
        if (solar.starPhase < def.phase) continue
        if (def.tier === 'branch') {
          this.branchLevels[def.id] = this.nodeMaxLevel(def.id)
        } else if (def.tier === 'leaf') {
          this.leafLevels[def.id] = this.nodeMaxLevel(def.id)
        } else if (def.tier === 'ward') {
          this.wardLevels[def.id] = this.nodeMaxLevel(def.id)
        } else if (def.tier === 'pact') {
          this.pactLevels[def.id] = this.nodeMaxLevel(def.id)
        } else if (def.tier === 'crown') {
          // Das PRESTIGE-Gate bleibt stehen, genau wie das Phasen-Gate darüber:
          // ohne einen Aufbruch im Rücken gibt es Ring 6 im Spiel nicht, und
          // ein Admin-Knopf, der ihn trotzdem setzt, prüfte einen Zustand, den
          // kein Spieler je erreicht.
          if (this.crownsUnlocked) this.crownLevels[def.id] = FORGE_CROWN_MAX_LEVEL
        } else if (def.tier === 'glimmer') {
          this.glimmerLevels[def.id] = FORGE_GLIMMER_MAX_LEVEL
        } else {
          // `nodeMaxLevel` gibt für einen Bough `Infinity` — eine gewählte
          // Testhöhe muss her, sonst stünde im Baum eine Stufe, die es im Spiel
          // nicht gibt (und ein `for`-Lauf bis dorthin endete nie).
          const before = this.boughLevels[def.id] ?? 0
          if (ADMIN_MAX_BOUGH_LEVEL <= before) continue
          this.boughLevels[def.id] = ADMIN_MAX_BOUGH_LEVEL
          if (def.id === 'adamantCore') {
            player.maxHP += (ADMIN_MAX_BOUGH_LEVEL - before) * def.effectPerLevel
          }
        }
      }

      for (const def of FORGE_RELICS) {
        if (!this.relicRequirementMet(def.id)) continue
        const steps = def.maxLevel - this.relicLevel(def.id)
        if (steps <= 0) continue
        this.relicLevels[def.id] = def.maxLevel
        // Heart of the Star hebt beim Schmieden die Max-HP — sonst fehlte der
        // Zuwachs, den `forgeRelic` sonst pro Stufe bucht.
        if (def.id === 'heartOfTheStar') player.maxHP += steps * def.effectPerLevel
      }

      for (const def of FORGE_CONSTELLATIONS) {
        if (this.constellationForged(def.id)) continue
        if (!this.constellationRequirementMet(def.id)) continue
        this.forgedConstellations.push(def.id)
      }

      this.recalcRates()
    },

    /** Push forge multipliers into the cached CpS/CpC values. */
    recalcRates(): void {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()
    },
  },
})

/** Ids used by UI iteration — re-exported so components import from one place. */
export { FORGE_NODES, FORGE_RELICS, FORGE_CONSTELLATIONS }
