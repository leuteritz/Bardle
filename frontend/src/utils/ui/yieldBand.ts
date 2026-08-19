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
  FORGE_YIELD_UNUSED_WIDTH_PCT,
  FORGE_YIELD_RING_CIRCUMFERENCE,
  FORGE_YIELD_RING_GAP,
  FORGE_YIELD_RING_MIN_ARC,
  type ForgeYieldSourceDef,
} from '@/config/constants'

export interface YieldBandSegment {
  id: string
  label: string
  title: string
  color: string
  /** Breite in Prozent der Bandbreite. Alle Segmente zusammen ergeben 100. */
  pct: number
  /**
   * Der ANFANG des Segments in Prozent der Bandbreite — die kumulierte Breite
   * aller Vorgänger. Aus ihm setzt `yieldRingArcs()` den Bogen an seine Stelle
   * im Ring.
   *
   * Steht hier und nicht in der Komponente: es ist dieselbe Darstellungsrechnung
   * wie `pct`, und sie erst nach dem Anheben der schmalen Segmente zu bilden ist
   * der einzige Weg, auf dem sie zu den TATSÄCHLICHEN Breiten passt.
   */
  start: number
  /** Zieht dieser Eintrag ab, statt beizutragen? */
  drains: boolean
  /** Die kurze Form IM Balken — `2.8×`. Muss in ein schmales Segment passen. */
  value: string
  /** Die lange Form im Kärtchen — `×1.42` bzw. `−12 %`. */
  detail: string
  /** Wo man dieses System größer macht. Ein Satz, aus der Herkunftstabelle. */
  hint: string
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
 * Die kurze Form für den Balken selbst: `2.8×`, nachgestellt wie in einer
 * Rechnung. Sie steht auf engem Raum und gibt deshalb eine Stelle her, wo die
 * lange Form im Kärtchen zwei zeigt.
 *
 * Ein Abzug trägt hier seinen VERLUST (`−12 %`) und nicht seinen Faktor — im
 * Balken nebeneinander gelesen ergäbe `0.88×` sonst den Eindruck, auch dieses
 * Segment trüge etwas bei.
 */
function barText(factor: number, drains: boolean): string {
  if (drains) return drainText(factor)
  return `${factor < 10 ? factor.toFixed(1) : Math.round(factor)}×`
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
      start: 0,
      drains: false,
      value: barText(g.factor, false),
      detail: gainText(g.factor),
      hint: g.def.hint,
    })),
    ...drains.map((d) => ({
      id: d.def.id,
      label: d.def.label,
      title: d.def.title,
      color: d.def.color,
      pct: drainWeight === 0 ? 0 : (d.weight / drainWeight) * drainShare * 100,
      start: 0,
      drains: true,
      value: barText(d.factor, true),
      detail: drainText(d.factor),
      hint: d.def.hint,
    })),
  ]

  // Ein Beitrag, den der Abzug vollstaendig aufgezehrt hat, bekommt hier eine
  // Breite von exakt null. Er ist dann KEIN zu schmales Segment, sondern gar
  // keines mehr — ohne diesen Filter hoebe ihn die Mindestbreite unten wieder
  // ins Bild und naehme dem Verlust einen Teil seiner Laenge, obwohl der gerade
  // alles frisst.
  return withStarts(liftThinSegments(raw.filter((s) => s.pct > 0)))
}

/**
 * Setzt jedem Segment seinen Anfang — die kumulierte Breite der Vorgänger.
 *
 * Läuft ZULETZT, nach dem Anheben der schmalen Segmente. Vorher gebildet zeigte
 * der Anfang auf die rechnerische Breite statt auf die tatsächlich gezeichnete,
 * und jeder Bogen hinter einem angehobenen Segment säße daneben.
 */
function withStarts(segments: YieldBandSegment[]): YieldBandSegment[] {
  let run = 0
  return segments.map((s) => {
    const start = run
    run += s.pct
    return { ...s, start }
  })
}

/** Ein Bogen des Ertrags-Rings — fertig für ein `<circle>`, ohne Nachrechnen. */
export interface YieldRingArc {
  id: string
  color: string
  /** `stroke-dasharray`: sichtbare Bogenlänge, dann der ganze Rest. */
  dash: string
  /** `stroke-dashoffset` — negativ, weil der Bogen nach VORNE geschoben wird. */
  offset: number
  drains: boolean
}

/**
 * Das Band als RING — dieselben Anteile, nur auf einen Umfang gelegt.
 *
 * Steht hier und nicht in der Komponente, aus demselben Grund wie der Rest der
 * Datei: die Randfälle („ein einziges Segment", „elf Segmente, deren Lücken
 * zusammen mehr fressen als der Umfang hergibt") sind im Bild kaum herstellbar
 * und in einer reinen Funktion in drei Zeilen geprüft.
 *
 * ── Warum die Lücken vom Umfang ABGEZOGEN werden ────────────────────────────
 * Zwischen zwei Bögen liegt eine Lücke, sonst verschmelzen zwei benachbarte
 * Farben zu einer Fläche. Zöge man sie erst am Ende ab, liefe der letzte Bogen
 * über den Anfang des ersten. Deshalb wird der Platz für ALLE Lücken vorweg
 * einbehalten (`usable`) und die Anteile teilen sich nur den Rest — dasselbe
 * Muster wie `SigilPowerCore.vue`.
 *
 * ── Warum der Ring nicht ganz gefüllt wird ──────────────────────────────────
 * Der Geister-Bogen für die ungenutzten Herkünfte nimmt seinen festen Anteil
 * (`FORGE_YIELD_UNUSED_WIDTH_PCT`), und die Segmente werden auf den Rest
 * gestaucht. Er ist bewusst KEIN Teil der 100-%-Rechnung: im frischen
 * Spielstand sind acht von acht erworbenen Herkünften neutral, anteilig
 * gezeichnet wäre „ungenutzt" der größte Bogen im Ring.
 */
export function yieldRingArcs(
  segments: readonly YieldBandSegment[],
  unusedCount: number,
): YieldRingArc[] {
  if (segments.length === 0) return []

  const hasGhost = unusedCount > 0
  // Eine Lücke je Bogen — die letzte schliesst den Kreis zurück auf den ersten,
  // damit ein einzelnes Segment als Bogen und nicht als voller Ring liest.
  const gapCount = segments.length + (hasGhost ? 1 : 0)
  const usable = Math.max(FORGE_YIELD_RING_CIRCUMFERENCE - gapCount * FORGE_YIELD_RING_GAP, 0)
  const scale = hasGhost ? (100 - FORGE_YIELD_UNUSED_WIDTH_PCT) / 100 : 1

  return segments.map((s, index) => ({
    id: s.id,
    color: s.color,
    dash: `${Math.max((s.pct / 100) * scale * usable, FORGE_YIELD_RING_MIN_ARC).toFixed(2)} ${FORGE_YIELD_RING_CIRCUMFERENCE.toFixed(2)}`,
    offset: -((s.start / 100) * scale * usable + index * FORGE_YIELD_RING_GAP),
    drains: s.drains,
  }))
}

/**
 * Die Herkünfte, bei denen der Spieler noch etwas HOLEN kann — erworbene
 * Systeme, die bei ihm auf Faktor 1 stehen.
 *
 * Sie sind der Grund, warum das Band mehr ist als eine Anzeige: „Meeps, Codex,
 * Items und Traits tragen bei dir nichts bei" ist die Auskunft, auf die man
 * handeln kann. Im Band stehen sie deshalb als gedämpfte Zone am Ende.
 *
 * ── Warum die NATUR mitzählt und nicht nur der Wert ──────────────────────────
 * Bis hierher stand allein `factor === 1` in der Bedingung, und damit log die
 * Zone. Im Endzustand (Admin → Max Everything) zeigte sie „3 unused", obwohl
 * nichts mehr zu holen war:
 *
 *   • `boons` ist `transient` — ein Faktor von 1 heißt „gerade läuft kein
 *     Drifter, kein Omen, kein Zeit-Augment". Ein Zeitpunkt, kein Versäumnis.
 *   • `void` und `bosses` sind `toll` — sie ZIEHEN AB. Neutral heißt dort: du
 *     zahlst gerade nichts. Als „ungenutzt" gelistet forderte der Sockel den
 *     Spieler auf, sich eine Strafe zu besorgen.
 *
 * Nur `earned` kann fehlen. Die Trennung steht an `ForgeYieldNature`.
 *
 * Bewusst KEIN Segment und damit kein Teil der 100-%-Rechnung: im frischen
 * Spielstand sind acht von acht erworbenen Herkünften neutral, anteilig
 * gezeichnet wäre das Ungenutzte das größte Element des Bandes. Es hängt
 * stattdessen mit fester Breite rechts daneben.
 */
export function unusedYieldSources(factors: readonly CpsFactor[]): ForgeYieldSourceDef[] {
  const byId = new Map(factors.map((entry) => [entry.id, entry.factor]))
  return FORGE_YIELD_SOURCES.filter((def) => {
    if (def.nature !== 'earned') return false
    const factor = byId.get(def.id) ?? 1
    // Ein kaputter Wert zaehlt als ungenutzt: das Band zeigt ihn ohnehin nicht,
    // und stillschweigend verschwinden soll er nicht.
    return !Number.isFinite(factor) || factor <= 0 || factor === 1
  })
}
