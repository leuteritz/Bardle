import { computed, type ComputedRef } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSolarUpgradeStore, type SolarBranchId } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useForgeHerald } from '@/composables/ui/useForgeHerald'
import { FORGE_NODES, forgeNodeName, getForgeNode } from '@/config/progression/starForge'
import { forgeCostItems } from '@/utils/game/forgeCost'
import type {
  ForgeCostItem,
  ForgeLockKind,
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
  FORGE_CROWN_LOCK_REASON,
  FORGE_BULK_BUY_CAP,
  FORGE_BUY_ALL_NODE_CAP,
  FORGE_BUY_ALL_MAX_PASSES,
  FORGE_ENDLESS_SYMBOL,
  FORGE_LEVEL_PREFIX,
  FORGE_ROW_PRICE_FIT_STEPS,
  FORGE_ROW_PRICE_FIT_FALLBACK,
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
  lockKind: '',
  lockPhase: -1,
  parentName: '',
  reqs: [],
  unlockProgress: 0,
  canBuy: false,
}

/**
 * In welchen Abschnitt der Liste ein Eintrag fällt.
 *
 * Gegliedert wird nach dem, was der Spieler mit einem Eintrag ANFANGEN kann —
 * nicht nach Ring. Vorher folgte die Liste dem BAUM: wer im Spätspiel etwas
 * kaufen wollte, kam an vier Überschriften und dutzenden „✦ MAX"-Zeilen vorbei,
 * und ausgerechnet die Astral Boughs — der einzige Ring, der nie fertig wird —
 * standen als vierte Gruppe ganz unten. Jetzt steht Kaufbares oben, gleich aus
 * welchem Ring; der Ring bleibt als Chip an der Zeile und als Filter darüber.
 *
 * Steht hier und nicht in `ForgeUpgradesSection.vue`, weil sie die eine Regel
 * ist, an der die Gliederung hängt — und damit die Fassung, die beim nächsten
 * Umbau still kippen könnte. Als Funktion neben den Einträgen ist sie prüfbar;
 * im `computed` einer Komponente wäre sie es nicht.
 *
 * Was sie NICHT entscheidet: dass `next` beim Anzeigen noch einmal zerfällt,
 * je Sperrgrund einer. Das ist reine Darstellung und hängt am `lockKind` des
 * Eintrags; der Topf bleibt einer.
 *
 * Zwei Feinheiten, die sich aus dem Zustand allein NICHT ergeben:
 *   - `ready` hängt an `canBuy`, nicht an `state === 'affordable'`. Die beiden
 *     sagen seit der Korrektur in `rootEntry()` dasselbe — und genau deshalb
 *     bleibt es bei `canBuy`: es ist das Feld, das die Frage BEANTWORTET,
 *     während `affordable` nur eine Stufe auf der Zustandsleiter ist. Wer die
 *     Leiter das nächste Mal umbaut, soll dabei nicht versehentlich die
 *     Kaufbarkeit mit umbauen. `__tests__/composables/ui/forgeUpgrades.spec.ts`
 *     hält die Gleichheit fest, damit sie nicht wieder still auseinanderläuft.
 *   - `capped` fällt zu `reach`, nicht zu `next`. Ein gedeckelter Strahl ist
 *     nicht gesperrt — er wartet auf seine vier Geschwister und muss seine
 *     Kosten weiter zeigen.
 */
export function forgeUpgradeBucket(entry: ForgeUpgradeEntry): ForgeUpgradeBucketId {
  if (entry.state === 'maxed') return 'grown'
  if (entry.state === 'locked') return 'next'
  return entry.canBuy ? 'ready' : 'reach'
}

/**
 * Darf der Zeiger auf diesem Eintrag die ANSICHT bewegen?
 *
 * Baum und Liste holen sich seit dem Hover-Ausbau gegenseitig ins Bild: wer
 * links auf einen Knoten zeigt, rollt rechts dessen Zeile heran, und wer rechts
 * auf einer Zeile steht, schwenkt links die Bühne zum Knoten. Für GESPERRTES
 * gilt das nicht — und der Grund ist nicht Sparsamkeit, sondern Bedeutung: an
 * einem Knoten, den man nicht kaufen kann, ist nichts zu erledigen. Eine
 * Bühne, die beim Überstreichen der Sperrliste durch den halben Baum fährt,
 * zeigt viel und meint nichts.
 *
 * Was sie ausdrücklich NICHT entscheidet: ob der Knoten LEUCHTET. Hervorhebung,
 * Abdunkeln der anderen, Bedingungskranz und Bedingungslinien bleiben für
 * Gesperrtes vollständig erhalten — sie beantworten „was fehlt hier", und das
 * ist bei einer Sperre die interessanteste Frage überhaupt. Deshalb steht der
 * Filter in den beiden Wächtern und nicht an `setListHover`/`setTreeHover`.
 *
 * Alles andere darf fahren, auch `maxed` und `capped`: ausgewachsen ist nicht
 * gesperrt, und wer eine MAX-Zeile sucht, will den Knoten genauso sehen.
 *
 * Steht hier neben `forgeUpgradeBucket` und nicht zweimal als
 * `state !== 'locked'` in zwei Komponenten. Die Regel gilt in BEIDE Richtungen,
 * und zwei Kopien beantworten den nächsten Zustand verschieden.
 */
export function forgeUpgradeMayTravel(entry: ForgeUpgradeEntry | undefined): boolean {
  return entry !== undefined && entry.state !== 'locked'
}

/**
 * Welche Schriftstufe der Preis auf dem Kaufknopf bekommt.
 *
 * Auf dem Knopf steht seit dem Umbau NUR noch der Preis — kein Verb mehr, das
 * ihm die halbe Fläche nahm. Damit ist er die grösste Zahl der Kauffläche, und
 * genau deshalb braucht er eine Bremse: die Fläche ist fest breit (die Kanten
 * sollen über die ganze Liste fluchten), die Zahl aber wächst von „948" auf
 * „123.45Qa". Ohne Stufung schnitte die lange Zahl ab, und ein halber Preis ist
 * keiner.
 *
 * Hier und nicht in der Komponente, aus demselben Grund wie `forgeLevelParts`
 * darunter: die Schwelle ist Inhalt, nicht Layout, und sie steht als Tabelle in
 * den Konstanten (`FORGE_ROW_PRICE_FIT_STEPS`). Die Funktion ist die eine
 * Stelle, die sie liest.
 *
 * Sie bekommt die LÄNGE und nicht die Zahl: der Aufrufer hat den formatierten
 * Text ohnehin schon, und ein zweites `formatNumber` je Zeile wäre dieselbe
 * Arbeit ein zweites Mal.
 */
export function forgeRowPriceFit(len: number): string {
  for (const step of FORGE_ROW_PRICE_FIT_STEPS) {
    if (len <= step.maxChars) return step.cls
  }
  return FORGE_ROW_PRICE_FIT_FALLBACK
}

/**
 * Die erreichte Stufe, zerlegt in die GROSSE Zahl und ihre Obergrenze.
 *
 * Sie ist seit dem Zeilen-Umbau die dominante Angabe eines Eintrags und steht
 * an zwei Stellen gleichzeitig: in der Upgrade-Zeile und als Chip in der
 * Archivzeile darunter. Zwei Fassungen derselben Zahl liefen genau dort
 * auseinander, wo sie in einer Liste untereinander zu sehen sind.
 *
 * Zerlegt und nicht als fertiger Satz, weil die Teile verschieden GROSS
 * gesetzt werden: die Stufe trägt die Zeile, ihre Obergrenze ist nur der
 * Rahmen dafür.
 *
 * Ein Astral Bough hat keine Höchststufe — `Lv 25 / Infinity` wäre der rohe
 * JavaScript-Wert, deshalb `FORGE_ENDLESS_SYMBOL`.
 */
export function forgeLevelParts(level: number, maxLevel: number): { big: string; max: string } {
  return {
    big: `${FORGE_LEVEL_PREFIX}${level}`,
    max: `/ ${Number.isFinite(maxLevel) ? maxLevel : FORGE_ENDLESS_SYMBOL}`,
  }
}

/** Ganze Zahlen bleiben ganz, gebrochene bekommen eine Nachkommastelle. */
function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** Trägt die Beschreibung ihren Wert als Prozentzahl? Steht im Text, nicht im Feld. */
function isPercentDesc(def: ForgeNodeDef): boolean {
  return def.desc.includes(FORGE_DESC_PERCENT_TOKEN)
}

function valueText(def: ForgeNodeDef, value: number): string {
  const body = trimNumber(value)
  return isPercentDesc(def) ? `+${body}%` : `+${body}`
}

/**
 * Was ein Klick auf den Sammelkauf ausrichten WÜRDE — ohne ihn auszuführen.
 *
 * Die Leiste am Kopf der Forge-Spalte zeigt beides an, bevor der Spieler klickt:
 * ein blosses „Buy all" liess ihn den Preis der Sammelaktion erst am Chime-Stand
 * danach ablesen.
 */
export interface ForgeBuyAllPlan {
  /**
   * Wie viele STUFEN insgesamt gekauft würden — nicht, wie viele Einträge davon
   * berührt sind. Ein Knoten kann ein Dutzend davon auf sich vereinen, seit der
   * Sammelkauf je Eintrag alles nimmt, was Vorrat und Lager decken.
   */
  count: number
  /** Was das zusammen an Chimes kostet. */
  chimeCost: number
}

/** Was der Sammelkauf an EINEM Eintrag vorhat. */
interface ForgeBuyAllStep {
  id: string
  /** Für die Quittung — der Name liegt beim Planen ohnehin vor. */
  name: string
  levels: number
}

/**
 * Vorrat und Lager, wie eine Kaufsimulation sie mitführt.
 *
 * Beide Felder werden IN-PLACE gesenkt; die Kopie macht der Aufrufer
 * (`freshBudget()`). Genau das ist der Zweck: mehrere Einträge nacheinander
 * greifen auf denselben Beutel zu, und der zweite muss sehen, was der erste
 * schon ausgegeben hat.
 */
interface ForgeBudget {
  chimes: number
  stock: Record<string, number>
}

export function useForgeUpgrades(): {
  upgradeEntries: ComputedRef<ForgeUpgradeEntry[]>
  entryById: ComputedRef<Map<string, ForgeUpgradeEntry>>
  freshIds: ComputedRef<Set<string>>
  buyUpgrade: (id: string, opts?: { silent?: boolean }) => boolean
  affordableLevels: (id: string) => number
  buyMany: (id: string, count: number) => number
  buyAllReady: () => number
  buyAllPlan: ComputedRef<ForgeBuyAllPlan>
} {
  const gameStore = useGameStore()
  const inventoryStore = useInventoryStore()
  const solarStore = useSolarUpgradeStore()
  const forgeStore = useStarForgeStore()
  const { heraldUpgrade, heraldUpgradeBulk, heraldBuyAll } = useForgeHerald()

  function costItems(cost: Record<string, number>): ForgeCostItem[] {
    return forgeCostItems(cost, inventoryStore.collectedMaterials)
  }

  /* Der Namensauflöser liegt im Katalog (`forgeNodeName`) und nicht mehr hier:
     seit `requires` existiert, braucht ihn auch der Store für seine
     Bedingungsliste, und zwei Fassungen liefen beim nächsten Ring auseinander. */

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
    /* Hier stand `goldOk`, und das war eine stille Abweichung: ein Kernstrahl
       galt als `affordable`, sobald die CHIMES reichten — auch wenn das
       Materiallager leer war. Die Liste las daneben `canBuy` und sagte korrekt
       „reicht nicht", der Baum leuchtete. Seit der Baum die Kaufbarkeit
       HERVORHEBT, ist aus der Abweichung ein sichtbarer Fehler geworden.
       `goldOk` bleibt als Feld — die Kostenzeile färbt damit den Chime-Preis
       getrennt vom Materialband. */
    const buyable = solarStore.canAfford(root.id)

    let state: ForgeUpgradeState
    if (maxed) state = 'maxed'
    else if (capped) state = 'capped'
    else if (buyable) state = 'affordable'
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
      // Ein Kernstrahl kennt weder Phasen- noch Elternsperre — seine einzige
      // Bremse ist der Gleichwuchs-Deckel, und der ist `capped`, nicht `locked`.
      lockKind: '',
      lockPhase: -1,
      parentName: '',
      // Und er hat auch keinen Vorgänger: der Wurzelring IST der Anfang.
      reqs: [],
      unlockProgress: 1,
      canBuy: buyable,
    }
  }

  /**
   * Warum ein Knoten zu ist — Phase zuerst, dann die Elternstufe.
   *
   * Neben dem Satz fällt hier die ART an, und zwar als Wert: die Liste
   * gruppiert danach (je Sperrgrund ein eigener Trenner), und sie darf dafür
   * nicht den fertigen Satz beschnüffeln müssen. `phase` ist der INDEX in
   * `STAR_PHASE_DATA`, nicht die angezeigte Nummer.
   */
  function lockedFor(def: ForgeNodeDef): {
    reason: string
    progress: number
    kind: ForgeLockKind
    phase: number
  } {
    if (solarStore.starPhase < def.phase) {
      const phaseName =
        STAR_PHASE_DATA[def.phase]?.name ?? `Phase ${def.phase + SUN_PHASE_DISPLAY_OFFSET}`
      return { reason: `Unlocks at ${phaseName}`, progress: 0, kind: 'phase', phase: def.phase }
    }
    // Das zweite Tor des Kronen-Rings. Es steht VOR der Elternprüfung, weil es
    // die Bedingung ist, die dann noch offen steht: die Phase ist erreicht, der
    // Elternknoten meist auch, und ohne diesen Zweig nennte die Karte eine
    // Hürde, die längst genommen ist.
    if (def.tier === 'crown' && !forgeStore.crownsUnlocked) {
      // `'prestige'` und nicht `'parent'`: die Vorgaengerliste eines
      // Kronen-Knotens ist an dieser Stelle oft VOLLSTAENDIG erfuellt, und die
      // Weiche „ab zwei Bedingungen zeigt die Liste statt des Satzes“ griff
      // trotzdem. Der Spieler sah lauter Haekchen und erfuhr nie, dass ihm ein
      // Universum fehlt — der Sperrsatz daneben wurde NIE gezeigt.
      return { reason: FORGE_CROWN_LOCK_REASON, progress: 0, kind: 'prestige', phase: -1 }
    }
    // WELCHE Vorgänger ein Knoten verlangt, weiss der Store — hier stünde sonst
    // eine zweite Fassung derselben Weiche. Genannt wird die ERSTE offene
    // Bedingung: der Satz hat Platz für genau eine, und die Liste rechts
    // sortiert danach, was als nächstes zu tun ist. Die vollständige Aufzählung
    // trägt `entry.reqs`, sobald es mehr als eine gibt.
    const reqs = forgeStore.nodeRequirements(def)
    const open = reqs.find((req) => !req.met) ?? reqs[0]
    // Der MITTELWERT der Einzelfortschritte, nicht der Anteil der erfüllten:
    // bei genau einer Bedingung ist das exakt die alte Rechnung („Stufe 1 von
    // 2" → halber Balken), bei mehreren wächst er weiter stetig. Eine Quote
    // erfüllt/gesamt spränge dagegen in Stufen und stünde bei einem Knoten mit
    // einer einzigen Bedingung immer auf 0 oder 1.
    const progress = reqs.reduce((sum, req) => sum + req.progress, 0) / (reqs.length || 1)
    return {
      reason: open ? `Requires ${open.name} Lv ${open.need}` : '',
      progress: reqs.length === 0 ? 1 : progress,
      kind: 'parent',
      phase: -1,
    }
  }

  function nodeEntry(def: ForgeNodeDef): ForgeUpgradeEntry {
    const level = forgeStore.nodeLevel(def.id)
    const maxLevel = forgeStore.nodeMaxLevel(def.id)
    const unlocked = forgeStore.nodeUnlocked(def.id)
    const goldCost = forgeStore.nodeGoldCost(def.id)
    const goldOk = gameStore.chimes >= goldCost
    const materials = costItems(forgeStore.nodeMaterialCost(def.id))
    /* Einmal gelesen, zweimal gebraucht — hier und unten am Feld. `canAffordNode`
       geht durch das ganze Materiallager; bei hundertfünfzig Knoten mal vier
       Instanzen dieses Composables lief dieselbe Prüfung sekündlich doppelt. */
    const buyable = forgeStore.canAffordNode(def.id)

    let state: ForgeUpgradeState
    if (!unlocked) state = 'locked'
    else if (level >= maxLevel) state = 'maxed'
    else if (buyable) state = 'affordable'
    else if (level > 0) state = 'partial'
    else state = 'empty'

    const lock = unlocked
      ? { reason: '', progress: 1, kind: '' as ForgeLockKind, phase: -1 }
      : lockedFor(def)

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
      const parent = forgeNodeName(def.parentId) || 'its branch'
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
    } else if (
      def.tier === 'bough' ||
      def.tier === 'ward' ||
      def.tier === 'pact' ||
      def.tier === 'glimmer'
    ) {
      // Vier Ränge ohne Blatt-Verstärker: sie tragen schlicht Stufe × Wert je
      // Stufe. Beim Bough hält genau diese Additivität den endlosen Ring sicher,
      // bei Wacht und Bündnis gibt es kein Blatt, das sie verstärken könnte, und
      // ein Glimmer ist selbst der Verstärker eines anderen Knotens — die
      // Vorschau darf in keinem der vier Fälle durch `branchEffect`.
      const now = level * def.effectPerLevel
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
      lockKind: lock.kind,
      lockPhase: lock.phase,
      parentName: forgeNodeName(def.parentId),
      reqs: forgeStore.nodeRequirements(def),
      unlockProgress: lock.progress,
      canBuy: buyable,
    }
  }

  const upgradeEntries = computed<ForgeUpgradeEntry[]>(() => [
    ...ROOTS.map(rootEntry),
    ...FORGE_NODES.map(nodeEntry),
  ])

  const entryById = computed(() => new Map(upgradeEntries.value.map((entry) => [entry.id, entry])))

  /**
   * Was seit dem letzten Blick des Spielers dazugekommen ist — als Menge, damit
   * Baum und Liste dieselbe Antwort geben und keine von beiden über eine Liste
   * mit bis zu fünfzig Einträgen sucht.
   *
   * Die Wahrheit dahinter liegt im Store (`shopFreshIds`), weil sie den Reload
   * überleben muss; hier steht nur die Umformung fürs Nachschlagen.
   */
  const freshIds = computed(() => new Set(forgeStore.shopFreshIds))

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
    /* Zwei Nachschläge in O(1) statt `entryById.value.get(id)`, und das ist keine
       Kosmetik: `entryById` hängt an `upgradeEntries`, und das rechnet nach JEDEM
       Kauf alle hundertfünfundfünfzig Einträge samt Kosten, Material- und
       Bedingungslisten neu. Beim Sammelkauf über mehrere hundert Stufen lag genau
       hier die Arbeit — der Kaufweg selbst braucht nur die Weiche „Kernstrahl
       oder Baumknoten", und die steht im Katalog. Dieselbe Weiche wie in
       `forgeFocusMeta()`. */
    const def = getForgeNode(id)
    const root = def ? undefined : ROOTS.find((meta) => meta.id === id)
    if (!def && !root) return false

    /* Gekauft heißt gesehen — VOR dem Kauf quittiert, weil `acknowledgeShopEntry`
       nur greift, solange der Eintrag noch als kaufbar gilt. Für Zeile und Baum
       erledigt das der Hover ohnehin; hier hängt es an `buyAllReady()` aus der
       Kopfleiste, bei dem der Zeiger nichts berührt. */
    forgeStore.acknowledgeShopEntry(id)

    if (root) {
      const branchId = root.id
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

  /** Ein frischer Beutel: der ECHTE Stand, als Kopie zum Verrechnen. */
  function freshBudget(): ForgeBudget {
    return { chimes: gameStore.chimes, stock: { ...inventoryStore.collectedMaterials } }
  }

  /**
   * Wie viele Stufen eines Eintrags ein MITGEFÜHRTER Beutel trägt — und was er
   * dabei verbraucht. Gekauft wird nichts; gesenkt wird nur `budget`.
   *
   * Der mitgeführte Beutel ist der ganze Grund, aus dem die Schleife hier steht
   * und nicht in ihren beiden Aufrufern: „Buy ×8" rechnet mit dem vollen Vorrat
   * für EINEN Knoten, der Sammelkauf reicht denselben Beutel durch die ganze
   * Reihe. Zwei Fassungen derselben Kostenschleife liefen beim nächsten
   * Balance-Eingriff auseinander — und eine davon ist eine VORSCHAU, die dann
   * still falsch wäre statt sichtbar kaputt.
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
   *   • `cap`, weil ein Bough gar keine Obergrenze hat und die Schleife sonst
   *     nicht endete. Der Zeilenknopf reicht `FORGE_BULK_BUY_CAP` (Deckel im
   *     Spielsinn), der Sammelkauf `FORGE_BUY_ALL_NODE_CAP` (blosser
   *     Schleifen-Boden).
   */
  function takeLevels(
    entry: ForgeUpgradeEntry,
    budget: ForgeBudget,
    cap: number,
  ): { levels: number; chimeCost: number } {
    if (!entry.canBuy) return { levels: 0, chimeCost: 0 }

    const isRoot = entry.tier === 'root'
    const level = currentLevel(entry)
    const ringCeiling = isRoot
      ? Math.min(SOLAR_MAX_LEVELS, solarStore.maxAllowedLevel)
      : Number.isFinite(entry.maxLevel)
        ? entry.maxLevel
        : Infinity
    const ceiling = Math.min(ringCeiling, level + cap)

    let levels = 0
    let chimeCost = 0

    for (let step = level; step < ceiling; step++) {
      const gold = isRoot
        ? solarStore.levelCost(entry.id as SolarBranchId, step)
        : forgeStore.nodeGoldCostAt(entry.id, step)
      if (budget.chimes < gold) break

      const mats = isRoot
        ? forgeStore.rayMaterialCostAt(entry.id as SolarBranchId, step + 1)
        : forgeStore.nodeMaterialCostAt(entry.id, step + 1)
      const entries = Object.entries(mats)
      if (entries.some(([matId, need]) => (budget.stock[matId] ?? 0) < need)) break

      budget.chimes -= gold
      chimeCost += gold
      for (const [matId, need] of entries) budget.stock[matId] = (budget.stock[matId] ?? 0) - need
      levels++
    }

    return { levels, chimeCost }
  }

  /**
   * Wie viele Stufen dieses Knotens Vorrat UND Lager gerade zusammen hergeben —
   * OHNE etwas zu kaufen. Das ist die Zahl auf „Buy ×8" und in der Zeile
   * daneben.
   *
   * Der Deckel bleibt `FORGE_BULK_BUY_CAP`: der Zeilenknopf ist die FEINE
   * Dosierung an einem einzelnen Knoten, der Sammelkauf die grobe über alle.
   */
  function affordableLevels(id: string): number {
    const entry = entryById.value.get(id)
    if (!entry) return 0
    return takeLevels(entry, freshBudget(), FORGE_BULK_BUY_CAP).levels
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
   * Alles gerade Kaufbare, günstigster zuerst — die Rangfolge des Sammelkaufs
   * UND seiner Vorschau.
   *
   * Günstigster zuerst, und nicht stärkster zuerst: derselbe Vorrat deckt so die
   * meisten Stufen. Nach Wirkung liesse sich ohnehin nicht ordnen — die stehen
   * in Prozent, HP, Sekunden und Chimes nebeneinander, der Preis ist die einzige
   * Zahl, die alle Knoten teilen.
   *
   * EINE Funktion für beide Aufrufer, und das ist kein Aufräumen: `buyAllPlan`
   * sagt dem Spieler voraus, was `buyAllReady()` tun wird. Zwei Fassungen
   * derselben Rangfolge liefen beim nächsten Eingriff auseinander, und die
   * Vorschau wäre dann still falsch statt sichtbar kaputt.
   *
   * `.filter()` gibt eine neue Liste zurück — das `.sort()` darauf rührt
   * `upgradeEntries` nicht an.
   */
  function readyQueue(): ForgeUpgradeEntry[] {
    return upgradeEntries.value
      .filter((entry) => entry.canBuy)
      .sort((a, b) => a.goldCost - b.goldCost)
  }

  /**
   * EIN Durchlauf des Sammelkaufs, gerechnet statt gekauft — je Eintrag alles,
   * was der mitgeführte Beutel noch trägt.
   *
   * Dasselbe Muster wie `affordableLevels()`, nur mit EINEM Beutel für die ganze
   * Reihe: kein Zugriff auf einen Store-Setter, nichts wird verändert ausser den
   * lokalen Kopien.
   *
   * Warum die Zahl trägt: `canBuy` deckt Sperre, Deckel und Gleichwuchs bereits
   * ab, und ein Kauf kann keinen anderen Eintrag SPERREN — nur unbezahlbar
   * machen. Die einzige Grösse, die sich während des Laufs ändert, sind Chimes
   * und Materialien, und genau die führt der Beutel mit.
   *
   * Übersprungen wird, nicht abgebrochen (`continue`, kein `break`): ein teurer
   * Knoten in der Mitte der Reihe darf die billigen dahinter nicht mitnehmen.
   *
   * Was der Durchlauf NICHT sehen kann, sind Knoten, die ein Kauf erst
   * FREISCHALTET — die stehen noch gar nicht in `readyQueue()`. Deshalb ist der
   * Plan die Zahl EINES Durchlaufs, und `buyAllReady()` wiederholt ihn.
   */
  function planBuyAll(): ForgeBuyAllPlan & { steps: ForgeBuyAllStep[] } {
    const budget = freshBudget()
    const steps: ForgeBuyAllStep[] = []
    let count = 0
    let chimeCost = 0

    for (const entry of readyQueue()) {
      const took = takeLevels(entry, budget, FORGE_BUY_ALL_NODE_CAP)
      if (took.levels === 0) continue

      steps.push({ id: entry.id, name: entry.name, levels: took.levels })
      count += took.levels
      chimeCost += took.chimeCost
    }

    return { count, chimeCost, steps }
  }

  /**
   * Was auf dem Knopf steht, bevor geklickt wird — Stufenzahl und Chime-Preis.
   *
   * Es ist der ERSTE Durchlauf und damit eine UNTERGRENZE, keine Punktlandung
   * mehr: schaltet ein Kauf einen weiteren Knoten frei, nimmt `buyAllReady()`
   * den in einem zweiten Durchlauf mit, und es werden mehr Stufen als
   * angekündigt. Die Richtung ist Absicht und dieselbe wie bei
   * `affordableLevels()` — die Vorschau verspricht höchstens zu wenig, nie zu
   * viel. Was WIRKLICH gewachsen ist, nennt danach die Quittung.
   *
   * Die Äquivalenz „Leiste da ⟺ irgendetwas kaufbar" bleibt davon unberührt:
   * der günstigste kaufbare Eintrag steht vorn und trägt per Definition
   * mindestens eine Stufe (`forgeUpgrades.spec.ts`).
   */
  const buyAllPlan = computed<ForgeBuyAllPlan>(() => {
    const { count, chimeCost } = planBuyAll()
    return { count, chimeCost }
  })

  /**
   * ALLES, was Chimes und Lager decken — der Knopf am Kopf der Forge-Spalte.
   *
   * Er nahm bis zum Umbau je EINE Stufe pro Eintrag. Wer einen dicken Vorrat
   * hatte, drückte danach denselben Knopf wieder: dieselben Knoten waren sofort
   * erneut bezahlbar, die Leiste blieb stehen. Ein Sammelkauf, den man mehrfach
   * auslösen muss, sammelt nichts — er verteilt nur Klicks.
   *
   * Zwei Schleifen, und beide sind nötig:
   *   • Je Eintrag so viele STUFEN, wie der Beutel trägt (`planBuyAll`).
   *   • Der ganze Durchlauf so oft, wie er noch etwas holt. Ein Kauf kann einen
   *     Knoten FREISCHALTEN (Elternstufen-Bedingung), und der stand beim Planen
   *     noch nicht in der Reihe. Ohne den zweiten Durchlauf käme die Leiste
   *     unmittelbar nach dem Klick zurück.
   *
   * Gerechnet und gekauft sind getrennt: der Plan sagt nur, WIE VIELE Stufen wo
   * versucht werden — jede einzelne läuft danach durch `buyUpgrade` und damit
   * durch die Prüfung des Stores. Kein Gate wird umgangen, das Konto kann nicht
   * ins Minus laufen, und ein Plan, der sich verrechnet hätte, kauft schlicht
   * weniger.
   *
   * `entryById` wird hier bewusst NICHT gelesen: das Computed rechnet nach jedem
   * Kauf alle Einträge neu, und über mehrere hundert Stufen wäre das die
   * teuerste Zeile des Klicks. Der Name für die Quittung fällt beim Planen
   * ohnehin an und liegt im `step`.
   */
  function buyAllReady(): number {
    let bought = 0
    /* Die Namen für die Quittung, in Kaufreihenfolge — günstigster zuerst und
       jeder nur EINMAL: vierzig Stufen desselben Knotens dürfen die einzeilige
       Zeile unter dem Banner nicht allein füllen. */
    const grown: string[] = []
    const seen = new Set<string>()

    for (let pass = 0; pass < FORGE_BUY_ALL_MAX_PASSES; pass++) {
      const plan = planBuyAll()
      if (plan.count === 0) break

      let inPass = 0
      for (const step of plan.steps) {
        let levels = 0
        while (levels < step.levels && buyUpgrade(step.id, { silent: true })) levels++
        if (levels === 0) continue

        inPass += levels
        if (!seen.has(step.name)) {
          seen.add(step.name)
          grown.push(step.name)
        }
      }

      // Nichts geholt heisst: der nächste Durchlauf holte auch nichts.
      if (inPass === 0) break
      bought += inPass
    }

    if (bought > 0) heraldBuyAll(bought, grown)
    return bought
  }

  return {
    upgradeEntries,
    entryById,
    freshIds,
    buyUpgrade,
    affordableLevels,
    buyMany,
    buyAllReady,
    buyAllPlan,
  }
}
