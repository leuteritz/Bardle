import { FORGE_NODES } from '@/config/progression/starForge'
import {
  SOLAR_BRANCHES,
  SOLAR_SIGNATURE_SATURATION_K,
  SOLAR_SIGNATURE_BASE_SATURATION_K,
  SOLAR_SIGNATURE_STAGES,
  SOLAR_SIGNATURE_BASE_STAGES,
  FORGE_SPOTLIGHT_MAX_LIMBS,
  type SolarSignatureStage,
  type SolarSignatureBaseStage,
} from '@/config/constants'
import type { ForgeAxisId, SolarSignature, SolarSignatureInput, SolarSignatureStages } from '@/types'

/**
 * Was der Waechter in seine Sonne gesteckt hat, als Zahl je Achse.
 *
 * Hier steht keine Optik und kein Store — nur die Rechnung, damit sie sich mit
 * nackten Objekten pruefen laesst (Muster: `maxEverything.ts`, `badgeSeed.ts`).
 * Die Zuordnung Optik <- Zahl steht in `config/constants/sun.ts`.
 */

const AXIS_IDS = SOLAR_BRANCHES.map((ray) => ray.id) as readonly ForgeAxisId[]
const AXIS_SET: ReadonlySet<string> = new Set(AXIS_IDS)

/** Die Akzentfarbe je Achse — aus `SOLAR_BRANCHES`, nicht daneben geschrieben.
 *  Sie setzt nur Akzente: die Leitfarbe bleibt die der Phase. */
export const SIGNATURE_AXIS_COLOR = Object.fromEntries(
  SOLAR_BRANCHES.map((ray) => [ray.id, ray.color]),
) as Record<ForgeAxisId, string>

/**
 * Knoten -> Kernstrahl, EINMAL beim Modulladen ueber die `parentId`-Kette.
 *
 * Ein Knoten NENNT seine Achse nicht (`types/forge.ts`) — ein Feld daneben
 * waere eine zweite Wahrheit, die beim ersten Umhaengen still falsch wird.
 * Die Kette ist hoechstens vier Schritte lang; aufgeloest wird sie trotzdem
 * nur hier, weil die Signatur sonst bei jedem Kauf 150-mal klettern muesste.
 */
function buildAxisMap(): ReadonlyMap<string, ForgeAxisId> {
  const parentOf = new Map(FORGE_NODES.map((n) => [n.id, n.parentId]))
  const axisOf = new Map<string, ForgeAxisId>()

  for (const node of FORGE_NODES) {
    const chain: string[] = []
    let cursor: string | undefined = node.id

    while (cursor && !AXIS_SET.has(cursor)) {
      const known = axisOf.get(cursor)
      if (known) {
        for (const id of chain) axisOf.set(id, known)
        chain.length = 0
        break
      }
      chain.push(cursor)
      cursor = parentOf.get(cursor)
    }

    if (cursor && AXIS_SET.has(cursor)) {
      const axis = cursor as ForgeAxisId
      axisOf.set(node.id, axis)
      for (const id of chain) axisOf.set(id, axis)
    }
  }

  return axisOf
}

export const SOLAR_SIGNATURE_AXIS_BY_NODE = buildAxisMap()

/** Der Kernstrahl, an dem ein Knoten haengt — `undefined` fuer alles andere. */
export function forgeNodeAxis(nodeId: string): ForgeAxisId | undefined {
  if (AXIS_SET.has(nodeId)) return nodeId as ForgeAxisId
  return SOLAR_SIGNATURE_AXIS_BY_NODE.get(nodeId)
}

/**
 * Der WEG eines Knotens nach innen: er selbst, sein Elternteil, … bis zum
 * Kernstrahl. Also genau das, was man kaufen muss, um ihn zu bekommen.
 *
 * `buildAxisMap()` klettert dieselbe Kette und wirft die Zwischenknoten weg —
 * es braucht nur die Achse. Hier ist die Kette selbst die Antwort: der Baum
 * zeichnet daraus den Kaufweg zu einem verfolgten Ziel.
 *
 * Eine Id ohne `parentId` — eine Konstellation, ein Relikt — liefert eine LEERE
 * Liste. Sie hängt an `requires`, nicht am Baum, und hat deshalb keinen Weg
 * nach innen; ihr Weg sind die Wege ihrer Tore.
 *
 * Der Deckel ist derselbe wie beim Scheinwerfer: die Kette ist im Katalog
 * höchstens sieben Glieder lang (Strahl → Zweig → Blatt → Wacht → Bündnis →
 * Krone/Ast), und ein Zyklus im Katalog darf hier nicht zur Endlosschleife
 * werden.
 */
export function forgeNodePath(nodeId: string): string[] {
  if (AXIS_SET.has(nodeId)) return [nodeId]
  const parentOf = new Map(FORGE_NODES.map((n) => [n.id, n.parentId]))
  if (!parentOf.has(nodeId)) return []

  const out: string[] = []
  const seen = new Set<string>()
  let cursor: string | undefined = nodeId
  while (cursor && out.length < FORGE_SPOTLIGHT_MAX_LIMBS && !seen.has(cursor)) {
    seen.add(cursor)
    out.push(cursor)
    if (AXIS_SET.has(cursor)) break
    cursor = parentOf.get(cursor)
  }
  return out
}

/**
 * Saettigung statt Summe. Ring 7 kennt keine Obergrenze; ohne diese Kurve
 * stuende die Sonne nach ein paar hundert Bough-Stufen auf einem Wert, den
 * keine Tabelle mehr einholt.
 */
function saturate(levels: number, k: number): number {
  if (levels <= 0) return 0
  return 1 - Math.exp(-levels / k)
}

/** Die hoechste Stufe, deren Schwelle erreicht ist. */
function stageIndexFor(levels: number, thresholds: readonly { minLevels: number }[]): number {
  let index = 0
  for (let i = 0; i < thresholds.length; i++) {
    if (levels >= thresholds[i].minLevels) index = i
    else break
  }
  return index
}

function emptyAxes(): Record<ForgeAxisId, { levels: number; t: number; stage: number }> {
  const out = {} as Record<ForgeAxisId, { levels: number; t: number; stage: number }>
  for (const axis of AXIS_IDS) out[axis] = { levels: 0, t: 0, stage: 0 }
  return out
}

/**
 * Die Signatur aus rohen Stufen.
 *
 * Achsweise zaehlen die fuenf Strahlen und alle Baumknoten. Relikte,
 * Konstellationen und Aufbrueche zaehlen ACHSLOS: ein Relikt nennt keinen
 * `parentId`, sondern `requires` — es einer Achse zuzuschlagen waere geraten,
 * nicht abgeleitet. Cosmic Bargains bleiben ganz draussen; sie laufen ab.
 */
export function solarSignatureFrom(input: SolarSignatureInput): SolarSignature {
  const axes = emptyAxes()

  for (const axis of AXIS_IDS) {
    axes[axis].levels += Math.max(0, input.rayLevels[axis] ?? 0)
  }

  for (const bag of input.nodeLevelBags) {
    for (const id in bag) {
      const levels = bag[id]
      if (!levels || levels <= 0) continue
      const axis = forgeNodeAxis(id)
      if (axis) axes[axis].levels += levels
    }
  }

  for (const axis of AXIS_IDS) {
    const entry = axes[axis]
    entry.t = saturate(entry.levels, SOLAR_SIGNATURE_SATURATION_K)
    entry.stage = stageIndexFor(entry.levels, SOLAR_SIGNATURE_STAGES)
  }

  const baseLevels =
    Math.max(0, input.relicLevels) +
    Math.max(0, input.constellationCount) +
    Math.max(0, input.totalPrestiges)

  return {
    axes,
    base: {
      levels: baseLevels,
      t: saturate(baseLevels, SOLAR_SIGNATURE_BASE_SATURATION_K),
      stage: stageIndexFor(baseLevels, SOLAR_SIGNATURE_BASE_STAGES),
    },
  }
}

/** Eine Signatur, in der nichts steht — fuer Tests und den ersten Frame. */
export function emptySolarSignature(): SolarSignature {
  return { axes: emptyAxes(), base: { levels: 0, t: 0, stage: 0 } }
}

/**
 * Die Signatur als Stufenindizes je Motiv — das ist, was in den Sprite-Schluessel
 * des Spielerkoerpers geht. Farbe und Masse liest der Painter dann direkt aus
 * `SOLAR_SIGNATURE_STAGES[index]`; `corona` ist `limb`, beide haengen an maxHp.
 */
export function solarSignatureStages(sig: SolarSignature): SolarSignatureStages {
  const top = SOLAR_SIGNATURE_STAGES.length - 1
  const cap = (v: number) => Math.max(0, Math.min(top, v))
  const limb = cap(sig.axes.maxHp.stage)
  return {
    spark: cap(sig.axes.chimesPerClick.stage),
    limb,
    corona: limb,
    granule: cap(sig.axes.chimesPerSecond.stage),
    prom: cap(sig.axes.dmgPerClick.stage),
    wake: cap(sig.axes.flightSpeed.stage),
    base: Math.max(0, Math.min(SOLAR_SIGNATURE_BASE_STAGES.length - 1, sig.base.stage)),
  }
}

/** Sechs Ziffern — `corona` fehlt, sie ist `limb`. */
export function sunSignatureKey(s: SolarSignatureStages): string {
  return `${s.spark}${s.limb}${s.granule}${s.prom}${s.wake}${s.base}`
}

/** Zwischen zwei Stufen liegt kein Uebergang — die Tabelle IST die Aussage. */
function axisStage(sig: SolarSignature, axis: ForgeAxisId): SolarSignatureStage {
  const stages = SOLAR_SIGNATURE_STAGES
  return stages[Math.min(sig.axes[axis].stage, stages.length - 1)] ?? stages[0]
}

function baseStage(sig: SolarSignature): SolarSignatureBaseStage {
  const stages = SOLAR_SIGNATURE_BASE_STAGES
  return stages[Math.min(sig.base.stage, stages.length - 1)] ?? stages[0]
}

/** Zuschlag auf die Wake-Dichte — der Sonnenwind der Flugachse. */
export function wakeSignatureBonus(sig: SolarSignature): number {
  return axisStage(sig, 'flightSpeed').wakeBonus
}

/** Zuschlag auf die Vergoldung des Kometen. Er traegt sonst nichts: mit 64–104px
 *  liegt er unter der Zierschwelle, und vor der Zuendung gibt es auch nichts zu
 *  zeigen — nur die fuenf Strahlen sind dort ueberhaupt kaufbar. */
export function cometGoldSignatureLift(sig: SolarSignature): number {
  return baseStage(sig).cometGoldLift
}
