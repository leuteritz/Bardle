/**
 * Die Zerlegung der CpS-Multiplikatorkette in ein Band aus Segmenten — die
 * Rechnung hinter dem Sockel des Shop-Tabs (`ForgeYieldPlinth`).
 *
 * Steht als REINE Funktion hier und nicht in der Komponente, damit die
 * Randfälle prüfbar sind: „alles neutral", „nur Abzüge" und „der Abzug
 * übersteigt den Gewinn" sind genau die Zustände, die man im Bild nur schwer
 * herstellt und in denen sich eine Division durch null versteckt.
 *
 * ── Warum die Anteile LOGARITHMISCH sind ────────────────────────────────────
 * Die Kette ist ein PRODUKT. Ein Produkt zerfällt nur über den Logarithmus in
 * additive Anteile:
 *
 *     ln(gesamt) = Σ ln(faktor)   →   Anteil = ln(faktor) / Σ ln(faktor)
 *
 * Ein ×2 bekommt damit genau so viel Band wie zwei ×1,41 zusammen. Linear
 * gerechnet (`faktor / Σ faktor`) bekäme ein ×1,05 neben einem ×80 immer noch
 * sichtbare Breite — das wäre schlicht falsch.
 *
 * ── Wie ein ABZUG gelesen wird ──────────────────────────────────────────────
 * Faktoren unter 1 tragen nichts bei, sie nehmen weg. Sie stehen deshalb am
 * ENDE der Reihe, und die farbige Zone davor ist exakt das, was ankommt: mit
 * `L = Σ −ln(abzug)` ist die gefüllte Länge `Σw − L = ln(netto)`. Man liest die
 * Reihe also als „so viel wächst, so viel frisst die Leere".
 *
 * Die Einordnung hängt am WERT, nicht am System: eine Providence würfelt „ein
 * Buff und ein Debuff aus derselben Domäne", `universe` kann also ebenso gut
 * abziehen wie die Leere.
 */
import type { CpsFactor } from '@/types'
import {
  FORGE_YIELD_SOURCES,
  FORGE_YIELD_MIN_SEGMENT_PCT,
  type ForgeYieldSourceDef,
} from '@/config/constants'

export interface YieldBandSegment {
  id: string
  label: string
  title: string
  color: string
  /** Breite in Prozent der Bandbreite. Alle Segmente zusammen ergeben 100. */
  pct: number
  /** Zieht dieser Eintrag ab, statt beizutragen? */
  drains: boolean
  /** Was im Kärtchen steht — `×1.42` bzw. `−12 %`. */
  detail: string
}

interface Weighted {
  def: ForgeYieldSourceDef
  weight: number
  factor: number
}

/** `×1.42` — zwei Nachkommastellen, solange sie etwas sagen. */
function gainText(factor: number): string {
  return `×${factor < 10 ? factor.toFixed(2) : factor.toFixed(1)}`
}

/**
 * Am Abzug steht, was er WEGNIMMT. `×0.88` zwänge den Spieler, den Verlust
 * selbst auszurechnen — und zwar an der einen Stelle, an der er es eilig hat.
 */
function drainText(factor: number): string {
  return `−${Math.round((1 - factor) * 100)} %`
}

/**
 * Hebt jedes zu schmale Segment auf die Mindestbreite; die übrigen geben
 * anteilig ab, damit die Summe 100 bleibt. Ein Segment darunter wäre ein Strich
 * von unter einem Pixel: unsichtbar, aber mit Kärtchen — man kann ihn nicht
 * treffen und weiß nicht, dass er da ist.
 */
function liftThinSegments(raw: YieldBandSegment[]): YieldBandSegment[] {
  const thin = raw.filter((s) => s.pct < FORGE_YIELD_MIN_SEGMENT_PCT)
  // Sind alle zu schmal, gibt es niemanden, der abgeben könnte — dann teilen
  // sie sich das Band zu gleichen Teilen.
  if (thin.length === raw.length) {
    return raw.map((s) => ({ ...s, pct: 100 / raw.length }))
  }
  if (thin.length === 0) return raw

  const lifted = thin.length * FORGE_YIELD_MIN_SEGMENT_PCT
  const restPct = raw.reduce(
    (sum, s) => (s.pct < FORGE_YIELD_MIN_SEGMENT_PCT ? sum : sum + s.pct),
    0,
  )
  const shrink = restPct === 0 ? 0 : (100 - lifted) / restPct

  return raw.map((s) =>
    s.pct < FORGE_YIELD_MIN_SEGMENT_PCT
      ? { ...s, pct: FORGE_YIELD_MIN_SEGMENT_PCT }
      : { ...s, pct: s.pct * shrink },
  )
}

/**
 * Aus den rohen Faktoren des Stores wird das fertige Band.
 *
 * Beiträge behalten die Reihenfolge von `FORGE_YIELD_SOURCES`, Abzüge wandern
 * ans Ende. Ein leeres Ergebnis heißt „nichts wirkt" — der Sockel zeigt dann
 * seinen Leerzustand, nicht ein Band aus nichts.
 */
export function yieldBandSegments(factors: readonly CpsFactor[]): YieldBandSegment[] {
  const byId = new Map(factors.map((entry) => [entry.id, entry.factor]))

  const gains: Weighted[] = []
  const drains: Weighted[] = []

  for (const def of FORGE_YIELD_SOURCES) {
    const factor = byId.get(def.id) ?? 1
    // Neutral bleibt ungezeigt — das Band listet nur, was wirkt. Nicht-endliche
    // und nicht-positive Werte fielen als NaN-Breite durch und rissen die ganze
    // Reihe mit; ein `ln(0)` ist −∞.
    if (!Number.isFinite(factor) || factor <= 0 || factor === 1) continue
    const weight = Math.log(factor)
    ;(weight > 0 ? gains : drains).push({ def, weight: Math.abs(weight), factor })
  }

  const gainWeight = gains.reduce((sum, g) => sum + g.weight, 0)
  const drainWeight = drains.reduce((sum, d) => sum + d.weight, 0)
  if (gainWeight + drainWeight === 0) return []

  // Die Bandbreite steht für die volle positive Kraft `Σw`; der Abzug nimmt
  // sich `L` davon. Zwei Kappungen, beide nötig: mehr als alles kann kein
  // Abzug nehmen (sonst liefe sein Anteil über 100 % und die Beiträge bekämen
  // negative Breiten), und ohne jeden Beitrag gibt es nichts zu teilen — dann
  // ist das Band ganz Verlust statt einer Division durch null.
  const cappedDrain = Math.min(drainWeight, gainWeight)
  const drainShare = gainWeight === 0 ? 1 : cappedDrain / gainWeight
  const gainShare = 1 - drainShare

  const raw: YieldBandSegment[] = [
    ...gains.map((g) => ({
      id: g.def.id,
      label: g.def.label,
      title: g.def.title,
      color: g.def.color,
      pct: gainWeight === 0 ? 0 : (g.weight / gainWeight) * gainShare * 100,
      drains: false,
      detail: gainText(g.factor),
    })),
    ...drains.map((d) => ({
      id: d.def.id,
      label: d.def.label,
      title: d.def.title,
      color: d.def.color,
      pct: drainWeight === 0 ? 0 : (d.weight / drainWeight) * drainShare * 100,
      drains: true,
      detail: drainText(d.factor),
    })),
  ]

  // Ein Beitrag, den der Abzug vollstaendig aufgezehrt hat, bekommt hier eine
  // Breite von exakt null. Er ist dann KEIN zu schmales Segment, sondern gar
  // keines mehr — ohne diesen Filter hoebe ihn die Mindestbreite unten wieder
  // ins Bild und naehme dem Verlust einen Teil seiner Laenge, obwohl der gerade
  // alles frisst.
  return liftThinSegments(raw.filter((s) => s.pct > 0))
}
