import { FORGE_NODES } from '@/config/progression/starForge'
import {
  SOLAR_BRANCHES,
  SOLAR_SIGNATURE_SATURATION_K,
  SOLAR_SIGNATURE_BASE_SATURATION_K,
  SOLAR_SIGNATURE_STAGES,
  SOLAR_SIGNATURE_BASE_STAGES,
  SOLAR_SIGNATURE_BH_JET_GAIN,
  SOLAR_SIGNATURE_BH_RING_GAIN,
  SOLAR_SIGNATURE_BH_HALO_GAIN,
  SOLAR_SIGNATURE_BH_MOTE_GAIN,
  SOLAR_SIGNATURE_BH_INNER_GAIN,
  SOLAR_SIGNATURE_BH_DOPPLER_GAIN,
  FORGE_SPOTLIGHT_MAX_LIMBS,
  type SolarSignatureStage,
  type SolarSignatureBaseStage,
} from '@/config/constants'
import type { ForgeAxisId, SolarSignature, SolarSignatureInput } from '@/types'

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
 * Signatur zu CSS — die eine Stelle, an der aus Zahlen Optik wird.
 *
 * Getrennt von der Rechnung, damit die Zuordnung fuer sich pruefbar bleibt, und
 * getrennt von den Komponenten, damit Plasmascheibe und Schwarzes Loch nicht
 * jede ihre eigene Fassung mitschleppen.
 */

/** Zwischen zwei Stufen liegt kein Uebergang — die Tabelle IST die Aussage. */
function axisStage(sig: SolarSignature, axis: ForgeAxisId): SolarSignatureStage {
  const stages = SOLAR_SIGNATURE_STAGES
  return stages[Math.min(sig.axes[axis].stage, stages.length - 1)] ?? stages[0]
}

function baseStage(sig: SolarSignature): SolarSignatureBaseStage {
  const stages = SOLAR_SIGNATURE_BASE_STAGES
  return stages[Math.min(sig.base.stage, stages.length - 1)] ?? stages[0]
}

/**
 * Die Variablen der Plasmascheibe.
 *
 * `showOrnaments` entscheidet der Aufrufer aus seinem AUTORISIERTEN Durchmesser
 * (nie aus der Bildschirmgroesse): der Shop skaliert seine Buehne per Zoom, und
 * eine Bedingung daran baute die Ebenen bei jedem Zoomschritt ab und wieder auf.
 */
export function plasmaSignatureVars(sig: SolarSignature): Record<string, string> {
  const hp = axisStage(sig, 'maxHp')
  const cpc = axisStage(sig, 'chimesPerClick')
  const cps = axisStage(sig, 'chimesPerSecond')
  const dmg = axisStage(sig, 'dmgPerClick')
  const base = baseStage(sig)

  // Alphas stehen als fertige PROZENT-Strings da, nicht als Bruch: sie landen
  // in `color-mix(... X%, transparent)`, und ein `calc()` im Prozentslot einer
  // Farbfunktion ist die Sorte Ausdruck, die je nach Browser still ausfaellt.
  return {
    '--sig-spark-a': pct(cpc.sparkAlpha),
    '--sig-spark-c': SIGNATURE_AXIS_COLOR.chimesPerClick,
    // Als BRUCH, nicht als Prozent: der Wert landet im Blur-Radius eines
    // `box-shadow`, und dort ist Prozent ungueltig — ein ungueltiger Wert
    // kippt die GANZE Deklaration, also auch die Korona daneben. Die Scheibe
    // rechnet ihn ueber `--disc-d` in Pixel um.
    '--sig-limb-w': `${hp.limbWidth}`,
    '--sig-limb-a': pct(hp.limbAlpha),
    '--sig-limb-c': SIGNATURE_AXIS_COLOR.maxHp,
    '--sig-corona-a': pct(Math.min(1, hp.coronaAlpha + base.coronaLift)),
    '--sig-granule-size': `${cps.granuleSizePct}%`,
    '--sig-granule-a': pct(cps.granuleAlpha),
    '--sig-granule-c': SIGNATURE_AXIS_COLOR.chimesPerSecond,
    '--sig-prom-step': `${360 / Math.max(1, dmg.prominenceArcs)}deg`,
    '--sig-prom-h': pct(dmg.prominenceHeight),
    '--sig-prom-a': pct(dmg.prominenceAlpha),
    '--sig-prom-c': SIGNATURE_AXIS_COLOR.dmgPerClick,
    '--sig-core-lift': pct(base.coreLift),
  }
}

/** Anteil 0..1 als Prozentwert mit zwei Nachkommastellen. */
function pct(v: number): string {
  return `${Math.round(Math.max(0, Math.min(1, v)) * 10000) / 100}%`
}

/**
 * Die Variablen des Schwarzen Lochs.
 *
 * Fuenf Achsen, fuenf Properties, die es ALLE schon hat — der Kollaps bekommt
 * keine einzige neue Ebene. Was hier steht, ist der Faktor auf den Grundwert,
 * nicht der Wert selbst; `BlackHoleDisc` multipliziert ihn in seine Rechnung.
 */
export function blackHoleSignatureVars(sig: SolarSignature): Record<string, string> {
  const a = sig.axes
  const base = baseStage(sig)

  return {
    '--sig-bh-jet': `${1 + a.flightSpeed.t * SOLAR_SIGNATURE_BH_JET_GAIN}`,
    '--sig-bh-ring': `${1 + a.maxHp.t * SOLAR_SIGNATURE_BH_RING_GAIN}`,
    '--sig-bh-halo': `${1 + a.maxHp.t * SOLAR_SIGNATURE_BH_HALO_GAIN}`,
    '--sig-bh-mote': `${1 + a.chimesPerClick.t * SOLAR_SIGNATURE_BH_MOTE_GAIN}`,
    '--sig-bh-inner': `${1 - a.chimesPerSecond.t * SOLAR_SIGNATURE_BH_INNER_GAIN}`,
    '--sig-bh-dop': `${1 + a.dmgPerClick.t * SOLAR_SIGNATURE_BH_DOPPLER_GAIN}`,
    '--sig-core-lift': pct(base.coreLift),
  }
}

/** Zuschlag auf `--line-power` in FlightMotes — der Sonnenwind der Flugachse. */
export function wakeSignatureBonus(sig: SolarSignature): number {
  return axisStage(sig, 'flightSpeed').wakeBonus
}

/** Zuschlag auf die Vergoldung des Kometen. Er traegt sonst nichts: mit 64–104px
 *  liegt er unter der Zierschwelle, und vor der Zuendung gibt es auch nichts zu
 *  zeigen — nur die fuenf Strahlen sind dort ueberhaupt kaufbar. */
export function cometGoldSignatureLift(sig: SolarSignature): number {
  return baseStage(sig).cometGoldLift
}
