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
  FORGE_ENDLESS_SYMBOL,
  FORGE_GROW_LABEL,
  FORGE_LEVEL_PREFIX,
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
 * Was auf dem Kaufknopf steht.
 *
 * Nur noch das Verb — die Zielstufe („→ Lv 13") stand einmal dahinter und ist
 * gestrichen: die grosse `Lv 12` links in derselben Zeile und der
 * Wirkungssprung daneben sagen sie zweimal. Der volle Satz bleibt im `title`
 * des Knopfes, und zusammengesetzt wird er dort, wo der Name ohnehin steht.
 *
 * Die Funktion bleibt trotzdem, statt die Konstante direkt zu lesen: sie ist
 * die Stelle, an der eine zustandsabhängige Beschriftung wieder einzöge, und
 * ihr Aufrufer soll dafür nicht umgebaut werden müssen.
 */
export function forgeGrowLabel(): string {
  return FORGE_GROW_LABEL
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

/**
 * Was die Fokusleiste über den festgehaltenen Knoten wissen muss — und nicht
 * mehr.
 *
 * Warum nicht schlicht `entryById.value.get(id)`: `useForgeUpgrades()` ist eine
 * FABRIK. Jeder Aufruf baut eigene Computeds über hundertfünfundfünfzig
 * Einträge, jeder davon mit Kostenrechnung, Sperrgrund, Materialliste und
 * Bedingungsliste — und die hängen an den Chimes, ticken also jede Sekunde neu.
 * Vier Instanzen laufen bereits (Baum, Liste, Griffleiste, Sammelkauf); eine
 * fünfte für EINEN Namen und EINE Stufe wäre der teuerste Weg zur billigsten
 * Auskunft.
 *
 * Stattdessen zwei Nachschläge in O(1) — `getForgeNode` ist eine Map, die fünf
 * Kernstrahlen sind eine Liste der Länge fünf. Dieselbe Weiche wie zwischen
 * `rootEntry` und `nodeEntry` weiter unten, nur ohne alles, was Geld kostet.
 *
 * `null` bei unbekannter Id: der Fokus kann auf einem Knoten stehen, den es
 * nicht gibt, wenn ein Katalog-Eintrag zwischen zwei Ständen umbenannt wurde.
 * Die Leiste zeigt dann ihren Leer-Zustand statt einer leeren Zeile.
 */
export interface ForgeFocusMeta {
  id: string
  name: string
  icon: string
  color: string
  tierLabel: string
  level: number
  maxLevel: number
}

export function forgeFocusMeta(id: string | null): ForgeFocusMeta | null {
  if (id === null) return null

  const def = getForgeNode(id)
  if (def) {
    const forgeStore = useStarForgeStore()
    return {
      id,
      name: def.name,
      icon: def.icon,
      color: def.color,
      tierLabel: FORGE_UPGRADE_TIER_LABELS[def.tier],
      level: forgeStore.nodeLevel(id),
      maxLevel: forgeStore.nodeMaxLevel(id),
    }
  }

  const root = SOLAR_BRANCHES.find((branch) => branch.id === id)
  if (!root) return null
  const solarStore = useSolarUpgradeStore()
  return {
    id,
    name: root.name,
    icon: root.icon,
    color: root.color,
    tierLabel: FORGE_UPGRADE_TIER_LABELS.root,
    level: solarStore.branchLevel(root.id),
    maxLevel: SOLAR_MAX_LEVELS,
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
  /** Wie viele Einträge je EINE Stufe bekämen. */
  count: number
  /** Was das zusammen an Chimes kostet. */
  chimeCost: number
}

export function useForgeUpgrades(): {
  upgradeEntries: ComputedRef<ForgeUpgradeEntry[]>
  entryById: ComputedRef<Map<string, ForgeUpgradeEntry>>
  bestBuyId: ComputedRef<string | null>
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
    const entry = entryById.value.get(id)
    if (!entry) return false

    /* Gekauft heißt gesehen — VOR dem Kauf quittiert, weil `acknowledgeShopEntry`
       nur greift, solange der Eintrag noch als kaufbar gilt. Für Zeile und Baum
       erledigt das der Hover ohnehin; hier hängt es an `buyAllReady()` aus der
       Kopfleiste, bei dem der Zeiger nichts berührt. */
    forgeStore.acknowledgeShopEntry(id)

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
   * Alles gerade Kaufbare, günstigster zuerst — die Rangfolge des Sammelkaufs
   * UND seiner Vorschau.
   *
   * Günstigster zuerst, aus zwei Gründen: derselbe Vorrat deckt so die meisten
   * Stufen, und es ist dieselbe Rangfolge, nach der die BEST-BUY-Marke im Baum
   * zeigt.
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
   * Was der Sammelkauf ausrichten würde — gerechnet, nicht gekauft.
   *
   * Dasselbe Muster wie `affordableLevels()`: lokale Kopien von Vorrat und
   * Lager, ein Durchlauf, kein Zugriff auf einen Store-Setter.
   *
   * Warum die Zahl stimmt: `canBuy` deckt Sperre, Deckel und Gleichwuchs bereits
   * ab, und ein Kauf kann keinen anderen Eintrag SPERREN — nur unbezahlbar
   * machen. Die einzige Grösse, die sich während des Laufs ändert, sind Chimes
   * und Materialien, und genau die führt die Schleife mit.
   *
   * Übersprungen wird, nicht abgebrochen (`continue`, kein `break`) — dieselbe
   * Entscheidung wie in `buyAllReady()`: ein teurer Knoten in der Mitte der
   * Reihe darf die billigen dahinter nicht mitnehmen.
   */
  const buyAllPlan = computed<ForgeBuyAllPlan>(() => {
    let chimes = gameStore.chimes
    const stock: Record<string, number> = { ...inventoryStore.collectedMaterials }
    let count = 0
    let chimeCost = 0

    for (const entry of readyQueue()) {
      if (chimes < entry.goldCost) continue
      if (entry.materials.some((mat) => (stock[mat.id] ?? 0) < mat.need)) continue

      chimes -= entry.goldCost
      chimeCost += entry.goldCost
      for (const mat of entry.materials) stock[mat.id] = (stock[mat.id] ?? 0) - mat.need
      count++
    }

    return { count, chimeCost }
  })

  /**
   * Je eine Stufe von allem, was Chimes UND Lager gerade decken — der Knopf am
   * Kopf der Forge-Spalte.
   *
   * Die Reihenfolge steht als Id-Liste fest, bevor der erste Kauf läuft —
   * `upgradeEntries` ist ein computed und sortierte sich sonst mitten in der
   * Schleife um.
   */
  function buyAllReady(): number {
    const queue = readyQueue().map((entry) => entry.id)

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
    freshIds,
    buyUpgrade,
    affordableLevels,
    buyMany,
    buyAllReady,
    buyAllPlan,
  }
}
