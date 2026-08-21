import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useGameStore } from '@/stores/core/gameStore'
import { FORGE_NODES } from '@/config/progression/starForge'
import { SOLAR_SIGNATURE_AXIS_BY_NODE } from '@/utils/game/solarSignature'
import { STAR_PHASE_FINAL_INDEX } from '@/config/constants'

/**
 * Die Signatur im Store — und der Blitz, der an ihr haengt.
 *
 * Zwei Eigenschaften stehen hier, die man beim Lesen des Stores nicht sieht.
 * Erstens: die Pulsfelder duerfen NICHT im Spielstand landen; taeten sie es,
 * blitzte die Sonne beim Laden einen Kauf nach, den es gerade nicht gab —
 * dieselbe Falle, die `supernovaTrigger` schon einmal aus dem Save gehalten
 * hat. Zweitens: die AchsFARBE eines Stapelkaufs. Trifft er mehrere Achsen,
 * ist „die des letzten Knotens" eine Auskunft, die niemand so gemeint hat.
 */

function nodeOnAxis(axis: string): string {
  const node = FORGE_NODES.find((n) => SOLAR_SIGNATURE_AXIS_BY_NODE.get(n.id) === axis)
  if (!node) throw new Error(`kein Knoten auf Achse ${axis}`)
  return node.id
}

describe('solarSignature — Getter', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('ist im frischen Spielstand ueberall null', () => {
    const sig = useSolarUpgradeStore().solarSignature
    expect(sig.axes.maxHp.levels).toBe(0)
    expect(sig.base.levels).toBe(0)
  })

  it('nimmt die eigenen Kernstrahlen auf', () => {
    const solar = useSolarUpgradeStore()
    solar.dmgPerClickLevel = 4
    expect(solar.solarSignature.axes.dmgPerClick.levels).toBe(4)
  })

  it('nimmt die Knoten aus JEDEM Beutel des Forge-Stores auf', () => {
    const solar = useSolarUpgradeStore()
    const forge = useStarForgeStore()
    const id = nodeOnAxis('chimesPerClick')
    const axis = SOLAR_SIGNATURE_AXIS_BY_NODE.get(id)!

    const before = solar.solarSignature.axes[axis].levels
    forge.branchLevels[id] = 2
    forge.glimmerLevels[nodeOnAxis('chimesPerClick')] = 0
    expect(solar.solarSignature.axes[axis].levels).toBeGreaterThan(before)
  })

  it('zaehlt Relikte und Konstellationen achslos in die Grundsignatur', () => {
    const solar = useSolarUpgradeStore()
    const forge = useStarForgeStore()
    forge.relicLevels['echoOfTheVoid'] = 3
    forge.forgedConstellations.push('irgendeine')

    expect(solar.solarSignature.base.levels).toBe(4)
    for (const axis of ['flightSpeed', 'maxHp', 'chimesPerClick', 'chimesPerSecond', 'dmgPerClick'] as const) {
      expect(solar.solarSignature.axes[axis].levels).toBe(0)
    }
  })

  it('zaehlt die Aufbrueche mit — die Forge ueberlebt das Prestige, also auch sie', () => {
    const solar = useSolarUpgradeStore()
    useGameStore().totalPrestiges = 5
    expect(solar.solarSignature.base.levels).toBe(5)
  })
})

describe('signaturePulse', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('steht anfangs still — beim Laden blitzt nichts', () => {
    expect(useSolarUpgradeStore().signaturePulseSeq).toBe(0)
  })

  it('zaehlt hoch und merkt sich die Achse', () => {
    const solar = useSolarUpgradeStore()
    solar.markSignaturePulse('maxHp')
    expect(solar.signaturePulseSeq).toBe(1)
    expect(solar.signaturePulseAxis).toBe('maxHp')
  })

  it('behaelt die Achse, solange derselbe Ast gekauft wird', () => {
    const solar = useSolarUpgradeStore()
    solar.markSignaturePulse('flightSpeed')
    solar.markSignaturePulse('flightSpeed')
    solar.markSignaturePulse('flightSpeed')
    expect(solar.signaturePulseSeq).toBe(3)
    expect(solar.signaturePulseAxis).toBe('flightSpeed')
  })

  it('faellt auf GEMISCHT, sobald ein Stapel zwei Achsen trifft', () => {
    const solar = useSolarUpgradeStore()
    solar.markSignaturePulse('flightSpeed')
    solar.markSignaturePulse('dmgPerClick')
    expect(solar.signaturePulseAxis).toBeNull()
  })

  it('faengt nach dem Abholen wieder mit einer einzelnen Achse an', () => {
    const solar = useSolarUpgradeStore()
    solar.markSignaturePulse('flightSpeed')
    solar.ackSignaturePulse()
    solar.markSignaturePulse('dmgPerClick')
    expect(solar.signaturePulseAxis).toBe('dmgPerClick')
  })

  it('faellt bei einem achslosen Kauf auf die Phasenfarbe zurueck', () => {
    const solar = useSolarUpgradeStore()
    solar.markSignaturePulse(null)
    expect(solar.signaturePulseAxis).toBeNull()
  })
})

describe('Persistenz', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('haelt die Pulsfelder aus dem Spielstand', async () => {
    // Der Save zaehlt die Solarfelder EINZELN auf. Diese Spec bindet, dass
    // niemand die Pulsfelder aus Versehen mit aufnimmt: ein geladener Blitz
    // waere ein Kauf, den es nicht gab.
    const src = await import('fs').then((fs) =>
      fs.readFileSync('src/composables/system/usePersistence.ts', 'utf-8'),
    )
    const solarBlock = src.slice(src.indexOf('solar: {'), src.indexOf('starForge: {'))
    expect(solarBlock).not.toContain('signaturePulseSeq')
    expect(solarBlock).not.toContain('signaturePulseAxis')
    expect(solarBlock).not.toContain('signaturePulseSeenSeq')
    // Gegenprobe: der Block ist wirklich der gemeinte.
    expect(solarBlock).toContain('starPhase')
  })
})

describe('isCollapsedStar', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('ist im Kometenzustand falsch, auch bei hoher Phase', () => {
    const solar = useSolarUpgradeStore()
    solar.isCometState = true
    solar.starPhase = STAR_PHASE_FINAL_INDEX
    expect(solar.isCollapsedStar).toBe(false)
  })

  it('ist genau in der Endphase wahr', () => {
    const solar = useSolarUpgradeStore()
    solar.isCometState = false
    solar.starPhase = STAR_PHASE_FINAL_INDEX - 1
    expect(solar.isCollapsedStar).toBe(false)
    solar.starPhase = STAR_PHASE_FINAL_INDEX
    expect(solar.isCollapsedStar).toBe(true)
  })
})
