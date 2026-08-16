import { computed, type ComputedRef } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSolarUpgradeStore, type SolarBranchId } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useForgeHerald } from '@/composables/ui/useForgeHerald'
import { FORGE_NODES } from '@/config/progression/starForge'
import { MATERIALS } from '@/config/economy/materials'
import type {
  ForgeCostItem,
  ForgeNodeDef,
  ForgeUpgradeBucketId,
  ForgeUpgradeEntry,
  ForgeUpgradeState,
} from '@/types'
import {
  SOLAR_BRANCHES,
  SOLAR_MAX_LEVELS,
  STAR_PHASE_DATA,
  SUN_PHASE_DISPLAY_OFFSET,
  FORGE_LEAF_AMPLIFY_PER_LEVEL,
  FORGE_LEAF_AMPLIFY_PER_LEVEL_PCT,
  FORGE_DESC_VALUE_TOKEN,
  FORGE_DESC_PERCENT_TOKEN,
  FORGE_UPGRADE_CAPPED_REASON,
  FORGE_UPGRADE_TIER_LABELS,
  FORGE_CROWN_STATE_OPEN,
  FORGE_CROWN_STATE_FORGED,
  FORGE_BULK_BUY_CAP,
} from '@/config/constants'

/**
 * Alles Kaufbare im Sternbaum, fertig zum Anzeigen — Wurzeln, Zweige, Blätter
 * in EINER Fassung.
 *
 * Warum das hier steht und nicht in der Komponente: seit die rechte Spalte
 * dieselben Knoten als Liste zeigt, die der Baum als Kreise zeichnet, gibt es
 * zwei Ansichten auf denselben Bestand. Die Ansichtslogik lag vollständig in
 * `ForgeTreePanel.vue` — sie ein zweites Mal zu schreiben hätte Kosten,
 * Sperrgründe und Wirkungstexte an zwei Stellen gelegt, die beim nächsten
 * Balance-Eingriff auseinanderlaufen.
 *
 * Was hier NICHT steht: Geometrie. Winkel, Radien und Icon-Größen sind Layout
 * des Baums und bleiben dort; die Liste kennt sie nicht und braucht sie nicht.
 *
 * Zwei Ringe, zwei Stores: die fünf Kernstrahlen leben im `solarUpgradeStore`
 * (mit der Gleichwuchs-Sperre `maxAllowedLevel`), Zweige und Blätter im
 * `starForgeStore` (mit Phasen- und Elternstufen-Freischaltung). Die Weiche
 * darüber ist der einzige Grund, warum es dieses Modul gibt.
 */

interface RootMeta {
  id: SolarBranchId
  name: string
  icon: string
  color: string
  statLabel: string
}

const ROOTS: RootMeta[] = SOLAR_BRANCHES.map((branch) => ({
  id: branch.id,
  name: branch.name,
  icon: branch.icon,
  color: branch.color,
  statLabel: branch.statLabel,
}))

/**
 * Rückfall für Nachschlagen, das nicht fehlschlagen KANN: Baum und Liste bauen
 * beide aus `SOLAR_BRANCHES` und `FORGE_NODES`, ein unbekanntes Id gibt es
 * nicht. Der Eintrag hält lediglich TypeScript und das Rendern am Leben, statt
 * jede Ablesestelle mit einem `v-if` zu pflastern.
 */
export const FORGE_EMPTY_UPGRADE_ENTRY: ForgeUpgradeEntry = {
  id: '',
  name: '',
  icon: '',
  color: '#7a4e20',
  tier: 'root',
  tierLabel: '',
  level: 0,
  maxLevel: 0,
  state: 'locked',
  goldCost: 0,
  goldOk: false,
  materials: [],
  desc: '',
  nextDesc: '',
  nowText: '',
  nextText: '',
  lockReason: '',
  parentName: '',
  unlockProgress: 0,
  canBuy: false,
}

/**
 * In welchen Abschnitt der Liste ein Eintrag fällt.
 *
 * Steht hier und nicht in `ForgeUpgradesSection.vue`, weil sie die eine Regel
 * ist, an der die neue Gliederung hängt — und damit die Fassung, die beim
 * nächsten Umbau still kippen könnte. Als Funktion neben den Einträgen ist sie
 * prüfbar; im `computed` einer Komponente wäre sie es nicht.
 *
 * Zwei Feinheiten, die sich aus dem Zustand allein NICHT ergeben:
 *   - `ready` hängt an `canBuy`, nicht an `state === 'affordable'`. Der Zustand
 *     kennt nur die Chimes, `canBuy` auch das Materiallager.
 *   - `capped` fällt zu `reach`, nicht zu `next`. Ein gedeckelter Strahl ist
 *     nicht gesperrt — er wartet auf seine vier Geschwister und muss seine
 *     Kosten weiter zeigen.
 */
export function forgeUpgradeBucket(entry: ForgeUpgradeEntry): ForgeUpgradeBucketId {
  if (entry.state === 'maxed') return 'grown'
  if (entry.state === 'locked') return 'next'
  return entry.canBuy ? 'ready' : 'reach'
}

/** Ganze Zahlen bleiben ganz, gebrochene bekommen eine Nachkommastelle. */
function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function materialImage(matId: string): string | undefined {
  return MATERIALS.find((mat) => mat.id === matId)?.image
}

function materialName(matId: string): string {
  return MATERIALS.find((mat) => mat.id === matId)?.name ?? matId
}

/** Trägt die Beschreibung ihren Wert als Prozentzahl? Steht im Text, nicht im Feld. */
function isPercentDesc(def: ForgeNodeDef): boolean {
  return def.desc.includes(FORGE_DESC_PERCENT_TOKEN)
}

function valueText(def: ForgeNodeDef, value: number): string {
  const body = trimNumber(value)
  return isPercentDesc(def) ? `+${body}%` : `+${body}`
}

export function useForgeUpgrades(): {
  upgradeEntries: ComputedRef<ForgeUpgradeEntry[]>
  entryById: ComputedRef<Map<string, ForgeUpgradeEntry>>
  bestBuyId: ComputedRef<string | null>
  buyUpgrade: (id: string, opts?: { silent?: boolean }) => boolean
  affordableLevels: (id: string) => number
  buyMany: (id: string, count: number) => number
  buyAllReady: () => number
} {
  const gameStore = useGameStore()
  const inventoryStore = useInventoryStore()
  const solarStore = useSolarUpgradeStore()
  const forgeStore = useStarForgeStore()
  const { heraldUpgrade, heraldUpgradeBulk, heraldBuyAll } = useForgeHerald()

  function costItems(cost: Record<string, number>): ForgeCostItem[] {
    return Object.entries(cost).map(([matId, need]) => {
      const have = inventoryStore.collectedMaterials[matId] ?? 0
      return {
        id: matId,
        name: materialName(matId),
        image: materialImage(matId),
        need,
        have,
        ok: have >= need,
      }
    })
  }

  function nodeName(id: string): string {
    return (
      ROOTS.find((root) => root.id === id)?.name ??
      FORGE_NODES.find((node) => node.id === id)?.name ??
      ''
    )
  }

  /** Die fünf Kernstrahlen. Sie kennen keine Sperre durch einen Elternknoten —
   *  dafür die Gleichwuchs-Regel über `maxAllowedLevel`. Material verlangen sie
   *  erst ab `SOLAR_MATERIAL_FROM_LEVEL`; darunter gibt `rayMaterialCost` eine
   *  leere Rezeptur zurück und die Kostenzeile zeigt nur den Chime-Preis. */
  function rootEntry(root: RootMeta): ForgeUpgradeEntry {
    const level = solarStore.branchLevel(root.id)
    const goldCost = solarStore.branchCost(root.id)
    const goldOk = gameStore.chimes >= goldCost
    const maxed = level >= SOLAR_MAX_LEVELS
    const capped = !maxed && level >= solarStore.maxAllowedLevel

    let state: ForgeUpgradeState
    if (maxed) state = 'maxed'
    else if (capped) state = 'capped'
    else if (goldOk) state = 'affordable'
    else if (level > 0) state = 'partial'
    else state = 'empty'

    const nowText = solarStore.statDisplay(root.id, level)
    const nextText = solarStore.statDisplay(root.id, level + 1)

    return {
      id: root.id,
      name: root.name,
      icon: root.icon,
      color: root.color,
      tier: 'root',
      tierLabel: FORGE_UPGRADE_TIER_LABELS.root,
      level,
      maxLevel: SOLAR_MAX_LEVELS,
      state,
      goldCost,
      goldOk,
      materials: costItems(forgeStore.rayMaterialCost(root.id)),
      desc: `${root.statLabel}: ${nowText}`,
      nextDesc: `${root.statLabel}: ${nextText}`,
      nowText,
      nextText,
      lockReason: capped ? FORGE_UPGRADE_CAPPED_REASON : '',
      parentName: '',
      unlockProgress: 1,
      canBuy: solarStore.canAfford(root.id),
    }
  }

  /** Warum ein Knoten zu ist — Phase zuerst, dann die Elternstufe. */
  function lockedFor(def: ForgeNodeDef): { reason: string; progress: number } {
    if (solarStore.starPhase < def.phase) {
      const phaseName =
        STAR_PHASE_DATA[def.phase]?.name ?? `Phase ${def.phase + SUN_PHASE_DISPLAY_OFFSET}`
      return { reason: `Unlocks at ${phaseName}`, progress: 0 }
    }
    // Welche Elternstufe welcher Ring verlangt, weiss der Store — hier stünde
    // sonst eine zweite Fassung derselben Weiche.
    const required = forgeStore.nodeParentRequirement(def)
    const have = forgeStore.nodeParentLevel(def)
    return {
      reason: `Requires ${nodeName(def.parentId)} Lv ${required}`,
      progress: Math.min(1, have / required),
    }
  }

  function nodeEntry(def: ForgeNodeDef): ForgeUpgradeEntry {
    const level = forgeStore.nodeLevel(def.id)
    const maxLevel = forgeStore.nodeMaxLevel(def.id)
    const unlocked = forgeStore.nodeUnlocked(def.id)
    const goldCost = forgeStore.nodeGoldCost(def.id)
    const goldOk = gameStore.chimes >= goldCost
    const materials = costItems(forgeStore.nodeMaterialCost(def.id))

    let state: ForgeUpgradeState
    if (!unlocked) state = 'locked'
    else if (level >= maxLevel) state = 'maxed'
    else if (forgeStore.canAffordNode(def.id)) state = 'affordable'
    else if (level > 0) state = 'partial'
    else state = 'empty'

    const lock = unlocked ? { reason: '', progress: 1 } : lockedFor(def)

    // Blätter verstärken ihren Zweig um einen festen Anteil je Stufe; Zweige
    // tragen ihren eigenen Wert und den Verstärker des Blattes darüber schon in
    // `branchEffect`. Die nächste Stufe eines Zweigs rechnet mit demselben
    // Verstärker weiter — sonst zeigte die Vorschau einen Sprung, den der Kauf
    // gar nicht auslöst.
    let desc: string
    let nextDesc: string
    let nowText: string
    let nextText: string

    if (def.tier === 'leaf') {
      const nowPct = level * FORGE_LEAF_AMPLIFY_PER_LEVEL_PCT
      const nextPct = (level + 1) * FORGE_LEAF_AMPLIFY_PER_LEVEL_PCT
      const parent = nodeName(def.parentId) || 'its branch'
      desc = def.desc.replace('{p}', parent).replace(FORGE_DESC_VALUE_TOKEN, String(nowPct))
      nextDesc = def.desc.replace('{p}', parent).replace(FORGE_DESC_VALUE_TOKEN, String(nextPct))
      nowText = `+${nowPct}%`
      nextText = `+${nextPct}%`
    } else if (def.tier === 'crown') {
      // Eine Krone hat KEINEN Wert je Stufe — sie verschiebt eine Regel, und
      // ihr `desc` sagt die im Klartext, ohne `{v}`. Ein Zahlenpaar „jetzt →
      // danach" wäre hier bestenfalls „0 → 0"; was die Zeile stattdessen zeigt,
      // ist der Zustand: noch zu haben oder geschmiedet.
      desc = def.desc
      nextDesc = def.desc
      nowText = level > 0 ? FORGE_CROWN_STATE_FORGED : FORGE_CROWN_STATE_OPEN
      nextText = FORGE_CROWN_STATE_FORGED
    } else if (def.tier === 'bough') {
      // Kein Blatt-Verstärker: ein Bough trägt schlicht Stufe × Wert je Stufe.
      // Genau diese Additivität hält den endlosen Ring sicher — die Vorschau
      // muss sie deshalb auch zeigen und darf nicht durch `branchEffect`.
      const now = forgeStore.boughEffect(def.id)
      const next = (level + 1) * def.effectPerLevel
      desc = def.desc.replace(FORGE_DESC_VALUE_TOKEN, trimNumber(now))
      nextDesc = def.desc.replace(FORGE_DESC_VALUE_TOKEN, trimNumber(next))
      nowText = valueText(def, now)
      nextText = valueText(def, next)
    } else {
      const leafDef = forgeStore.leafOfBranch(def.id)
      const leafLevel = leafDef ? forgeStore.nodeLevel(leafDef.id) : 0
      const amp = 1 + leafLevel * FORGE_LEAF_AMPLIFY_PER_LEVEL
      const now = forgeStore.branchEffect(def.id)
      const next = (level + 1) * def.effectPerLevel * amp
      desc = def.desc.replace(FORGE_DESC_VALUE_TOKEN, trimNumber(now))
      nextDesc = def.desc.replace(FORGE_DESC_VALUE_TOKEN, trimNumber(next))
      nowText = valueText(def, now)
      nextText = valueText(def, next)
    }

    return {
      id: def.id,
      name: def.name,
      icon: def.icon,
      color: def.color,
      tier: def.tier,
      tierLabel: FORGE_UPGRADE_TIER_LABELS[def.tier],
      level,
      maxLevel,
      state,
      goldCost,
      goldOk,
      materials,
      desc,
      nextDesc,
      nowText,
      nextText,
      lockReason: lock.reason,
      parentName: nodeName(def.parentId),
      unlockProgress: lock.progress,
      canBuy: forgeStore.canAffordNode(def.id),
    }
  }

  const upgradeEntries = computed<ForgeUpgradeEntry[]>(() => [
    ...ROOTS.map(rootEntry),
    ...FORGE_NODES.map(nodeEntry),
  ])

  const entryById = computed(() => new Map(upgradeEntries.value.map((entry) => [entry.id, entry])))

  /**
   * Der günstigste Eintrag, den Chimes UND Lager gerade decken — die Marke im
   * Baum und die Vorgabe des Detailkopfs.
   *
   * „Günstigster" und nicht „stärkster", und das ist keine Bequemlichkeit: die
   * Wirkungen des Baums stehen in Prozent, HP, Sekunden und Chimes nebeneinander.
   * Es gibt keine Einheit, in der `+6% Expeditionsertrag` und `+90 max HP`
   * vergleichbar wären. Der Preis ist die einzige Zahl, die alle Knoten teilen.
   */
  const bestBuyId = computed<string | null>(() => {
    let best: ForgeUpgradeEntry | null = null
    for (const entry of upgradeEntries.value) {
      if (!entry.canBuy) continue
      if (best === null || entry.goldCost < best.goldCost) best = entry
    }
    return best?.id ?? null
  })

  /**
   * Kauft eine Stufe und meldet, ob es geklappt hat. Die Rückmeldung im Bild —
   * Sonnenblitz im Baum, Kartenblitz in der Liste — bleibt beim Aufrufer; nur
   * der Wortlaut der Meldung steht hier, damit beide Wege gleich sprechen.
   *
   * `silent` gibt es für die Stapelkäufe: acht Stufen am Stück wären acht
   * Banner hintereinander. Unterdrückt wird ausschliesslich die Quittung — der
   * Kaufweg bleibt derselbe, damit kein Gate umgangen werden kann.
   *
   * Der Eintrag wird für die Quittung NACH dem Kauf neu gelesen: `entry` oben ist
   * der Stand von vorher, sein `desc` nennt noch die alte Wirkung.
   */
  function buyUpgrade(id: string, opts: { silent?: boolean } = {}): boolean {
    const entry = entryById.value.get(id)
    if (!entry) return false

    if (entry.tier === 'root') {
      const branchId = id as SolarBranchId
      const before = solarStore.branchLevel(branchId)
      solarStore.buyBranch(branchId)
      if (solarStore.branchLevel(branchId) === before) return false
      if (!opts.silent) announceBought(id, solarStore.branchLevel(branchId))
      return true
    }

    if (!forgeStore.buyNode(id)) return false
    if (!opts.silent) announceBought(id, forgeStore.nodeLevel(id))
    return true
  }

  /** Die Quittung zu einem eben gekauften Eintrag — mit dem FRISCHEN Stand. */
  function announceBought(id: string, level: number): void {
    const after = entryById.value.get(id)
    if (after) heraldUpgrade(after, level)
  }

  /** Die erreichte Stufe eines Eintrags — Strahlen und Baumknoten liegen in
   *  verschiedenen Stores, sonst stünde die Weiche viermal da. */
  function currentLevel(entry: ForgeUpgradeEntry): number {
    return entry.tier === 'root'
      ? solarStore.branchLevel(entry.id as SolarBranchId)
      : forgeStore.nodeLevel(entry.id)
  }

  /**
   * Wie viele Stufen dieses Knotens Vorrat UND Lager gerade zusammen hergeben —
   * OHNE etwas zu kaufen. Das ist die Zahl auf „Buy ×8" und in der Zeile
   * daneben.
   *
   * Gerechnet wird über die `…At`-Getter der Stores, nicht über eine zweite
   * Fassung der Kostenkurve: Chime-Preis, Materialmenge, Chronicle-Rabatt und
   * Vorsehung liegen dort und dürfen hier nicht ein zweites Mal auftauchen.
   *
   * Drei Obergrenzen, jede aus einem anderen Grund:
   *   • der Ring selbst (`maxLevel`)
   *   • bei einem Kernstrahl zusätzlich `maxAllowedLevel`, die Gleichwuchs-
   *     Sperre. Die kann durch den Kauf STEIGEN (wenn der Strahl der bislang
   *     niedrigste war), nie fallen — die Vorschau bleibt damit im sicheren
   *     Sinn ungenau: sie verspricht höchstens zu wenig, nie zu viel.
   *   • `FORGE_BULK_BUY_CAP`, weil ein Bough gar keine Obergrenze hat und die
   *     Schleife sonst nicht endete.
   */
  function affordableLevels(id: string): number {
    const entry = entryById.value.get(id)
    if (!entry || !entry.canBuy) return 0

    const isRoot = entry.tier === 'root'
    const level = currentLevel(entry)
    const ringCeiling = isRoot
      ? Math.min(SOLAR_MAX_LEVELS, solarStore.maxAllowedLevel)
      : Number.isFinite(entry.maxLevel)
        ? entry.maxLevel
        : Infinity
    const ceiling = Math.min(ringCeiling, level + FORGE_BULK_BUY_CAP)

    let chimes = gameStore.chimes
    const stock: Record<string, number> = { ...inventoryStore.collectedMaterials }
    let count = 0

    for (let step = level; step < ceiling; step++) {
      const gold = isRoot
        ? solarStore.levelCost(id as SolarBranchId, step)
        : forgeStore.nodeGoldCostAt(id, step)
      if (chimes < gold) break

      const mats = isRoot
        ? forgeStore.rayMaterialCostAt(id as SolarBranchId, step + 1)
        : forgeStore.nodeMaterialCostAt(id, step + 1)
      const entries = Object.entries(mats)
      if (entries.some(([matId, need]) => (stock[matId] ?? 0) < need)) break

      chimes -= gold
      for (const [matId, need] of entries) stock[matId] = (stock[matId] ?? 0) - need
      count++
    }

    return count
  }

  /**
   * Mehrere Stufen desselben Knotens am Stück. Gerechnet wird dabei NICHT —
   * jede einzelne Stufe läuft durch `buyUpgrade` und damit durch die Prüfung des
   * Stores; die Schleife bricht beim ersten Nein ab. Eine Meldung am Ende.
   */
  function buyMany(id: string, count: number): number {
    const entry = entryById.value.get(id)
    if (!entry || count <= 0) return 0

    const before = currentLevel(entry)
    let bought = 0
    while (bought < count && buyUpgrade(id, { silent: true })) bought++
    if (bought > 0) {
      // Frisch gelesen, damit die Quittung die neue Wirkung nennt.
      const after = entryById.value.get(id) ?? entry
      heraldUpgradeBulk(after, before, currentLevel(after))
    }
    return bought
  }

  /**
   * Je eine Stufe von allem, was Chimes UND Lager gerade decken — der Knopf in
   * der Kopfleiste.
   *
   * Günstigster zuerst, aus zwei Gründen: derselbe Vorrat deckt so die meisten
   * Stufen, und es ist dieselbe Rangfolge, nach der die BEST-BUY-Marke im Baum
   * zeigt. Die Reihenfolge steht als Id-Liste fest, bevor der erste Kauf läuft —
   * `upgradeEntries` ist ein computed und sortierte sich sonst mitten in der
   * Schleife um.
   */
  function buyAllReady(): number {
    const queue = upgradeEntries.value
      .filter((entry) => entry.canBuy)
      .sort((a, b) => a.goldCost - b.goldCost)
      .map((entry) => entry.id)

    let bought = 0
    // Die Namen fallen hier ohnehin an — die Quittung zählt sie auf, statt nur
    // eine Zahl zu nennen. Reihenfolge ist die Kaufreihenfolge, günstigster zuerst.
    const grown: string[] = []
    for (const id of queue) {
      // Der vorige Kauf hat Chimes und Lager gesenkt — was eben noch ging, geht
      // jetzt vielleicht nicht mehr.
      const entry = entryById.value.get(id)
      if (!entry?.canBuy) continue
      if (buyUpgrade(id, { silent: true })) {
        bought++
        grown.push(entry.name)
      }
    }

    if (bought > 0) heraldBuyAll(bought, grown)
    return bought
  }

  return {
    upgradeEntries,
    entryById,
    bestBuyId,
    buyUpgrade,
    affordableLevels,
    buyMany,
    buyAllReady,
  }
}
