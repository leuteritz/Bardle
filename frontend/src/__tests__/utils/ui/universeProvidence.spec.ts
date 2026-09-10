import { describe, it, expect } from 'vitest'
import { universeProvidenceReading } from '@/utils/ui/universeProvidence'
import {
  PROVIDENCE_AXES,
  rollProvidence,
  rollProvidenceNamed,
} from '@/config/progression/providences'
import type { RolledProvidence } from '@/types'

/* Die Vorsehungs-Stelle des Kopfbands: zwei schmale Ablesungen oder EINE breite.
   Der Reiter hat keine Mount-Tests — gebunden wird deshalb die reine Funktion,
   die das entscheidet. */
describe('universeProvidenceReading', () => {
  it('traegt den archivierten Wurf einer VERGANGENEN Bahn als zwei Ablesungen', () => {
    // Das ist der ganze Zweck des Feldes: vorher stand hier ein Name, weil ein
    // Archiveintrag nur ihn trug und jede Zahl erfunden gewesen waere.
    const roll = rollProvidenceNamed('Keen Escort')
    expect(roll).not.toBeNull()

    const read = universeProvidenceReading({ roll, name: roll!.name, isHere: false })
    expect(read.fallback).toBeNull()
    expect(read.lines).toHaveLength(2)
    expect(read.lines[0].positive).toBe(true)
    expect(read.lines[1].positive).toBe(false)
    // Die Richtung kommt aus dem ROLL, nie aus dem Vorzeichen.
    expect(read.lines.map((l) => l.label)).not.toContain(undefined)
  })

  it('faellt auf die BREITE Ablesung zurueck, wenn nur der Name da ist', () => {
    const read = universeProvidenceReading({ roll: null, name: 'Keen Escort', isHere: false })
    expect(read.lines).toEqual([])
    expect(read.fallback).toEqual({ value: 'Keen Escort', key: 'Combat providence' })
  })

  it('nennt die Domaene nur, wenn der Katalog den Namen kennt', () => {
    const read = universeProvidenceReading({ roll: null, name: 'Nowhere Name', isHere: false })
    expect(read.fallback).toEqual({ value: 'Nowhere Name', key: 'Providence' })
  })

  it('trennt „nie gezogen" von „nicht ueberliefert"', () => {
    // Zwei verschiedene Aussagen. Eine gerechnete Null waere eine Luege, und ein
    // gemeinsamer Text loeschte den Unterschied.
    expect(universeProvidenceReading({ roll: null, name: null, isHere: true }).fallback).toEqual({
      value: '—',
      key: 'No providence drawn',
    })
    expect(universeProvidenceReading({ roll: null, name: null, isHere: false }).fallback).toEqual({
      value: '—',
      key: 'No providence recorded',
    })
  })

  it('zeigt ENTWEDER zwei Zellen ODER die breite, nie eineinhalb', () => {
    // Eine entfernte Achse laesst `providenceEffectLines` eine Zeile aus. Die
    // Reihe risse dann mitten entzwei: eine schmale Zelle neben einer Luecke.
    const halb = {
      name: 'Half Roll',
      icon: 'game-icons:crossed-swords',
      domain: 'combat',
      buffKey: 'combatDpsMult',
      debuffKey: 'axisThatIsGone',
      effects: { combatDpsMult: 1.8 },
    } as unknown as RolledProvidence

    const read = universeProvidenceReading({ roll: halb, name: 'Half Roll', isHere: false })
    expect(read.lines).toEqual([])
    expect(read.fallback?.value).toBe('Half Roll')
  })

  it('bleibt auf der LAUFENDEN Bahn beim Wurf des Stores', () => {
    const read = universeProvidenceReading({
      roll: rollProvidence('combat'),
      name: 'egal',
      isHere: true,
    })
    expect(read.lines).toHaveLength(2)
  })
})

/* `providenceAxisByName` faende sonst die falsche Achse — und mit ihr die
   falsche Domaene und den falschen Wurf im Nachtrag. */
describe('der Namensvorrat der Achsen', () => {
  it('vergibt jeden Namen genau einmal', () => {
    const all = PROVIDENCE_AXES.flatMap((a) => a.names)
    expect(new Set(all).size).toBe(all.length)
  })

  it('gibt jeder Achse ueberhaupt Namen', () => {
    for (const axis of PROVIDENCE_AXES) expect(axis.names.length).toBeGreaterThan(0)
  })
})

describe('rollProvidenceNamed', () => {
  it('trifft die Achse, an der der Name haengt', () => {
    for (const axis of PROVIDENCE_AXES) {
      for (const name of axis.names) {
        const roll = rollProvidenceNamed(name)
        expect(roll?.buffKey, name).toBe(axis.key)
        expect(roll?.name, name).toBe(name)
        expect(roll?.debuffKey, name).not.toBe(axis.key)
      }
    }
  })

  it('gibt null statt eines erfundenen Wurfs, wenn der Name fremd ist', () => {
    expect(rollProvidenceNamed('Nowhere Name')).toBeNull()
  })

  it('haengt vollstaendig am uebergebenen Strom', () => {
    // Der Nachtrag braucht Wiederholbarkeit: derselbe Seed, dieselbe Vorsehung.
    const stream = () => {
      let i = 0
      const seq = [0.11, 0.37, 0.62, 0.85, 0.04, 0.91]
      return () => seq[i++ % seq.length]
    }
    expect(rollProvidenceNamed('Keen Escort', stream())).toEqual(
      rollProvidenceNamed('Keen Escort', stream()),
    )
  })
})
