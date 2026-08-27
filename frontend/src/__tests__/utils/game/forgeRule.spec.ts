import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { forgeRuleKind, forgeRuleLabel } from '@/utils/game/forgeRule'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import {
  FORGE_NODES,
  FORGE_CROWNS,
  FORGE_CONSTELLATIONS,
  FORGE_CONFLUENCES,
} from '@/config/progression/starForge'
import {
  FORGE_NODE_DIAMETER,
  FORGE_SEAL_INSET_PX,
  FORGE_SEAL_BORDER_PX,
  FORGE_SEAL_ICON_SIZE,
  FORGE_SEAL_POINTS,
  FORGE_RULE_LABEL_GESTURE,
  FORGE_RULE_LABEL_RULE,
  FORGE_MASS_SEND_NODE,
  FORGE_DESC_VALUE_TOKEN,
} from '@/config/constants'

/**
 * Das SIEGEL — wer es trägt und ob es passt.
 *
 * Zwei getrennte Fragen, und beide sind still zu brechen. Die erste ist der
 * BESTAND: `forgeRuleKind()` liest die Kronen aus ihrem Rang und die Fusionen
 * aus einem Feld, das jemand vergessen kann. Die zweite ist die GEOMETRIE: das
 * Sechseck liegt innerhalb des Kreises und würde bei zu grossem Glyph durch das
 * Motiv laufen — beim Entwurf um 2,4 px, und im Bild hätte das niemand als
 * Fehler gelesen, sondern als Absicht.
 */

/**
 * Der halbe Durchmesser des grössten Kreises, den das Sechseck noch umschliesst.
 *
 * Der RAND geht mit ab, und genau daran ist die erste Fassung gescheitert:
 * `inset` an einer absolut liegenden Ebene misst von der PADDING-Box, also
 * innerhalb des Rahmens. Gerechnet wurde gegen die Kante, gemessen hat der
 * Browser 44 px statt der erwarteten 50 — und das Sechseck lief um 0,75 px
 * durch das Motiv. Diese Spec stand da und war grün.
 */
function sealInradius(diameter: number, border: number, inset: number): number {
  return ((diameter - 2 * border - 2 * inset) / 2) * Math.cos(Math.PI / 6)
}

/** Die weiteste Stelle einer quadratischen Glyph-Box — ihre halbe Diagonale. */
function glyphHalfDiagonal(size: number): number {
  return (size * Math.SQRT2) / 2
}

describe('forgeRuleKind — wer eine Regel kauft', () => {
  it('nennt jede Krone, und nur über ihren Rang', () => {
    for (const crown of FORGE_CROWNS) {
      expect(forgeRuleKind(crown.id), crown.id).toBe('rule')
    }
    expect(FORGE_CROWNS.length).toBeGreaterThan(0)
  })

  it('nennt keinen Knoten ausserhalb des Kronenrings', () => {
    const named = FORGE_NODES.filter((def) => forgeRuleKind(def.id) !== null)
    expect(named.map((d) => d.tier)).toEqual(named.map(() => 'crown'))
  })

  it('lässt die Confluences aus — ihre Wirkung IST eine Prozentzahl', () => {
    for (const node of FORGE_CONFLUENCES) {
      expect(forgeRuleKind(node.id), node.id).toBeNull()
    }
  })

  it('nennt genau die Fusionen mit gesetztem Feld', () => {
    const flagged = FORGE_CONSTELLATIONS.filter((def) => def.rule !== undefined)
    const named = FORGE_CONSTELLATIONS.filter((def) => forgeRuleKind(def.id) !== null)
    expect(named.map((d) => d.id)).toEqual(flagged.map((d) => d.id))
    expect(flagged.length).toBeGreaterThan(0)
  })

  it('führt die eine BEDIENUNG als solche', () => {
    expect(forgeRuleKind(FORGE_MASS_SEND_NODE)).toBe('gesture')
    const gestures = FORGE_CONSTELLATIONS.filter((d) => forgeRuleKind(d.id) === 'gesture')
    expect(gestures.map((d) => d.id)).toEqual([FORGE_MASS_SEND_NODE])
  })

  it('kennt keine erfundene Id', () => {
    expect(forgeRuleKind('nichtVorhanden')).toBeNull()
    expect(forgeRuleKind('')).toBeNull()
  })
})

/*
 * DER DRIFT-WÄCHTER.
 *
 * Ein Kauf, der eine Zahl hebt, trägt `{v}` in seinem `desc` — dort wird der
 * Wert eingesetzt. Ein Kauf, der eine Regel verschiebt, hat keinen Wert und
 * deshalb keinen Platzhalter. Die beiden Mengen MÜSSEN sich decken.
 *
 * Er fängt beide Richtungen: die achte Regel-Fusion, deren Feld jemand vergisst
 * (dann steht ein Satz ohne `{v}` ohne Siegel da), und den Satz, der beim
 * Umschreiben seine Zahl verloren hat.
 */
describe('forgeRuleKind — Bestand gegen Beschreibung', () => {
  it('deckt sich bei den Baumknoten mit „desc ohne Platzhalter"', () => {
    for (const def of FORGE_NODES) {
      const hasValue = def.desc.includes(FORGE_DESC_VALUE_TOKEN)
      expect(forgeRuleKind(def.id) !== null, `${def.id}: ${def.desc}`).toBe(!hasValue)
    }
  })

  /*
   * Bei den Fusionen geht das NICHT über den Text, und der erste Versuch ist
   * genau daran gescheitert.
   *
   * Eine Fusion hat keine Stufe; ihre Zahl steht fest im Satz statt als
   * Platzhalter. Ein Muster darüber entscheidet deshalb nichts: „Clicks splash
   * 10% of their damage" trägt ein Prozentzeichen und ist trotzdem eine neue
   * Mechanik (Splash gibt es sonst nirgends), „+1 extra material" trägt keines
   * und ist trotzdem nur ein Betrag.
   *
   * Was die beiden trennt, ist eine Frage, die kein Muster stellen kann:
   * **kommt durch den Kauf etwas ins Spiel, das es vorher gar nicht gab?**
   * Splash-Schaden, ein Shard aus einem Void-Kill, Material aus einem Klick,
   * ein Angebot ohne Verfall, ein Harvester im Downtime, ein zweiter Drifter,
   * die Send-All-Kachel — sieben Mal ja. Ein grösserer Offline-Deckel und ein
   * zusätzliches Material je Drop heben, was es längst gibt.
   *
   * Die Liste steht deshalb AUSGESCHRIEBEN hier. Sie ist kein Drift-Wächter
   * mehr, sondern eine Sperre: wer eine achte Regel-Fusion einträgt, bricht
   * diesen Test und muss die Frage beantworten, statt sie zu übergehen.
   */
  it('führt bei den Fusionen genau die sieben, die etwas Neues eintragen', () => {
    const expected = [
      'shatteringNova',
      'voidboundPact',
      'caretakersLedger',
      'waitingRoad',
      'standingVein',
      'twinnedSky',
      'risingArmada',
    ]
    const named = FORGE_CONSTELLATIONS.filter((d) => forgeRuleKind(d.id) !== null).map((d) => d.id)
    expect([...named].sort()).toEqual([...expected].sort())
  })
})

describe('forgeRuleKind — jede Regel hat einen Leser', () => {
  it('beantwortet für jede genannte Id, ob sie geschmiedet ist', () => {
    setActivePinia(createPinia())
    const forge = useStarForgeStore()
    for (const def of FORGE_CROWNS) {
      expect(forge.crownForged(def.id), def.id).toBe(false)
      forge.crownLevels[def.id] = 1
      expect(forge.crownForged(def.id), def.id).toBe(true)
    }
    for (const def of FORGE_CONSTELLATIONS.filter((d) => forgeRuleKind(d.id) !== null)) {
      expect(forge.constellationForged(def.id), def.id).toBe(false)
      forge.forgedConstellations.push(def.id)
      expect(forge.constellationForged(def.id), def.id).toBe(true)
    }
  })
})

describe('forgeRuleLabel', () => {
  it('trennt Bedienung von Regel und schweigt sonst', () => {
    expect(forgeRuleLabel(FORGE_MASS_SEND_NODE)).toBe(FORGE_RULE_LABEL_GESTURE)
    expect(forgeRuleLabel(FORGE_CROWNS[0].id)).toBe(FORGE_RULE_LABEL_RULE)
    expect(forgeRuleLabel('nichtVorhanden')).toBe('')
  })

  it('gibt jedem genannten Eintrag ein Wort', () => {
    const ids = [...FORGE_NODES, ...FORGE_CONSTELLATIONS]
      .filter((def) => forgeRuleKind(def.id) !== null)
      .map((def) => def.id)
    for (const id of ids) expect(forgeRuleLabel(id), id).not.toBe('')
  })
})

/*
 * DIE GEOMETRIE — die Zahl, die beim Entwurf beinahe schiefgegangen wäre.
 *
 * Das Siegel ist ein Sechseck INNERHALB des Kreises. Seine engste Stelle ist
 * der Inkreis, die weiteste Stelle des Motivs darunter ist die Halbdiagonale
 * seiner Box. Mit den bisherigen 34 px eines Kronen-Glyphs lag der Inkreis um
 * 2,4 px darunter — die Kante wäre durch das Motiv gelaufen.
 *
 * Der zweite Anlauf ging ebenfalls schief, und zwar leiser: die Ungleichung
 * stimmte, aber sie rechnete gegen die Kante statt gegen die Padding-Box. Erst
 * die Messung im Browser (44 px statt 50) hat es aufgedeckt. Deshalb steht der
 * Rand jetzt als Konstante daneben — eine Zahl, die eine Spec braucht, darf
 * nicht allein im CSS stehen.
 */
describe('Siegel-Geometrie', () => {
  it('läuft am Kronen-Knoten nicht durch das Motiv', () => {
    // Der ENGERE der beiden Fälle: der Kronenrand ist der dickste im Netz und
    // nimmt der Ebene am meisten weg. Gemessen bleiben 0,99 px Luft.
    const inr = sealInradius(FORGE_NODE_DIAMETER.crown, FORGE_SEAL_BORDER_PX, FORGE_SEAL_INSET_PX)
    expect(inr).toBeGreaterThan(glyphHalfDiagonal(FORGE_SEAL_ICON_SIZE))
  })

  it('läuft am Fusions-Körper nicht durch das Motiv', () => {
    // Derselbe Durchmesser, nur ein dünnerer Ring — also der weitere Fall.
    // Er wird trotzdem gerechnet: sonst fiele eine spätere Verdickung des
    // Fusions-Rings keinem auf.
    const inr = sealInradius(FORGE_NODE_DIAMETER.crown, 2, FORGE_SEAL_INSET_PX)
    expect(inr).toBeGreaterThan(glyphHalfDiagonal(FORGE_SEAL_ICON_SIZE))
  })

  it('bleibt innerhalb des Kreises — es nimmt keine Luft', () => {
    // Der Bedingungskranz sitzt AUF dem Rand und die drei Eckmarken knapp
    // ausserhalb; ein Siegel, das hinausragte, träfe beide. Und `FORGE_MIN_AIR_PX`
    // misst gegen `FORGE_NODE_DIAMETER` und wüsste von einer Zierebene nichts.
    expect(FORGE_SEAL_INSET_PX).toBeGreaterThan(0)
    expect(FORGE_SEAL_BORDER_PX).toBeGreaterThan(0)
  })

  it('ist ein flat-top-Sechseck im viewBox-Raum 0…100', () => {
    const pts = FORGE_SEAL_POINTS.split(' ').map((p) => p.split(',').map(Number))
    expect(pts).toHaveLength(6)
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(100)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(100)
    }
    // FLACH oben und unten: je zwei Punkte teilen sich die oberste und die
    // unterste Kante. Eine Spitze dort zeigte in den Bedingungskranz und in den
    // Stufen-Chip hinein.
    const ys = pts.map(([, y]) => y)
    const top = Math.min(...ys)
    const bottom = Math.max(...ys)
    expect(ys.filter((y) => y === top)).toHaveLength(2)
    expect(ys.filter((y) => y === bottom)).toHaveLength(2)
    // Und die Spitzen liegen links und rechts, auf halber Höhe.
    const xs = pts.map(([x]) => x)
    expect(Math.min(...xs)).toBe(0)
    expect(Math.max(...xs)).toBe(100)
  })

  it('lässt das Glyph kleiner ausfallen als ohne Siegel', () => {
    // Sonst wäre die Konstante gegenstandslos und jemand hätte sie im nächsten
    // Zug auf den alten Wert zurückgesetzt.
    expect(FORGE_SEAL_ICON_SIZE).toBeLessThan(FORGE_NODE_DIAMETER.crown / 2)
  })
})
