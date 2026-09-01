import { describe, it, expect } from 'vitest'
import { buildArrivalHerald } from '@/utils/ui/arrivalHerald'
import { universes, getUniverse } from '@/config/progression/universes'
import { PROVIDENCE_AXES, PROVIDENCE_DOMAIN_LABELS } from '@/config/progression/providences'
import { HERALD_DISPLAY_MS } from '@/config/constants'
import { universeLabel } from '@/utils/ui/format'
import type { RolledProvidence } from '@/types'

/**
 * Die Ankunfts-Zeremonie.
 *
 * Sie steht am Ende des Hyperspace und beantwortet die zwei Fragen, die ein
 * Aufbruch offen lässt: wo man ist und worunter man spielt. Was hier gebunden
 * wird, sind die Stellen, an denen sie STILL danebengehen kann — im Bild sieht
 * eine falsche Farbe oder ein falscher Pfeil vollkommen plausibel aus.
 */

/** Eine Vorsehung bauen, ohne zu würfeln: der Test soll die Achsen prüfen, die
 *  er meint, nicht die, die der Zufall ihm gibt. */
function rolled(buffKey: string, debuffKey: string, buffMult: number, debuffMult: number) {
  const axis = PROVIDENCE_AXES.find((a) => a.key === buffKey)
  return {
    name: 'Test Providence',
    icon: axis?.icon ?? 'game-icons:sparkles',
    domain: axis?.domain ?? 'economy',
    buffKey,
    debuffKey,
    effects: { [buffKey]: buffMult, [debuffKey]: debuffMult },
  } as unknown as RolledProvidence
}

describe('buildArrivalHerald', () => {
  it('trägt den Farbton des Universums als "r, g, b", nicht als Hex', () => {
    // Ein Hexwert in `--ac` bricht JEDES rgba() im Banner — Schein, Haarlinien,
    // Kopfzeile, Medaillon. Im Code sieht `accent: universe.tint` dabei völlig
    // richtig aus, und im Bild ist die Karte einfach farblos.
    for (const u of universes) {
      const payload = buildArrivalHerald(u.id, null)
      expect(payload.accent, `Universe ${u.id}`).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/)
      expect(payload.accent, `Universe ${u.id}`).not.toContain('#')
    }
  })

  it('nennt das Universum in der EINEN Schreibweise', () => {
    const payload = buildArrivalHerald(8, null)
    expect(payload.headline).toBe(universeLabel(8))
    expect(payload.headline).toBe('Universe VIII')
  })

  it('steht auch ohne Vorsehung', () => {
    // Erster Lauf und Altstand: `providenceStore.active` ist null. Die Karte
    // muss dann kleiner sein, nicht kaputt.
    const payload = buildArrivalHerald(1, null)
    expect(payload.subline).toBeUndefined()
    expect(payload.readouts).toEqual([])
    expect(payload.headline).toBe(universeLabel(1))
    expect(payload.universe).toBe(1)
  })

  it('nennt Vorsehung und Domäne in der Nebenzeile', () => {
    const p = rolled('cpsMultiplier', 'buildingCostMultiplier', 2.4, 1.35)
    const payload = buildArrivalHerald(3, p)
    expect(payload.subline).toBe(`Test Providence · ${PROVIDENCE_DOMAIN_LABELS.economy}`)
  })

  it('liefert Buff zuerst, Debuff danach', () => {
    const p = rolled('cpsMultiplier', 'buildingCostMultiplier', 2.4, 1.35)
    const lines = buildArrivalHerald(3, p).readouts ?? []
    expect(lines).toHaveLength(2)
    expect(lines[0]?.label).toBe('Chimes/sec')
    expect(lines[1]?.label).toBe('Building cost')
  })

  it('nimmt die Richtung aus dem ROLL, nicht aus dem Vorzeichen', () => {
    // Der eigentliche Fallstrick: `Building cost` hat higherIsBetter: false.
    // Als BUFF senkt sie die Kosten und trägt deshalb ein MINUS — sie muss
    // trotzdem grün und mit ▲ stehen. Wer die Richtung am Vorzeichen abliest,
    // dreht hier beide Zeilen um, und die Karte behauptet das Gegenteil.
    const p = rolled('buildingCostMultiplier', 'cpsMultiplier', 0.7, 0.6)
    const lines = buildArrivalHerald(5, p).readouts ?? []

    expect(lines[0]?.label).toBe('Building cost')
    expect(lines[0]?.value.startsWith('−')).toBe(true)
    expect(lines[0]?.positive).toBe(true)

    expect(lines[1]?.label).toBe('Chimes/sec')
    expect(lines[1]?.positive).toBe(false)
  })

  it('steht lange genug für vier Ablesungen', () => {
    // Die Standardstandzeit trägt eine Zeile. Hier stehen Nummer, Vorsehung
    // samt Domäne und zwei Werte mit Beschriftung.
    const p = rolled('cpsMultiplier', 'buildingCostMultiplier', 2.4, 1.35)
    const payload = buildArrivalHerald(2, p)
    expect(payload.holdMs).toBeDefined()
    expect(payload.holdMs!).toBeGreaterThan(HERALD_DISPLAY_MS)
  })

  it('reicht die Nummer für die Scheibe durch', () => {
    // Ohne sie fällt das Banner auf sein Iconify-Medaillon zurück — und das
    // wäre nicht falsch, nur stumm.
    for (const u of universes) {
      expect(buildArrivalHerald(u.id, null).universe).toBe(u.id)
      expect(getUniverse(u.id)).toBeDefined()
    }
  })

  it('bricht nicht an einer unbekannten Universumsnummer', () => {
    // Kann nur ein Datenfehler sein — aber ein leeres `--ac` nähme die ganze
    // Karte mit, statt nur den Farbton.
    const payload = buildArrivalHerald(999, null)
    expect(payload.accent).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/)
  })
})
