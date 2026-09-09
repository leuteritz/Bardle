import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { planetStatRows } from '@/utils/orbit/planetStatus'
import type { PlanetSlot } from '@/stores/world/planetShopStore'
import {
  JUNGLE_BUFF_DEFS,
  PLANET_MILESTONE_INTERVAL,
  PLANET_SLOT_CONFIG,
} from '@/config/constants'

/*
 * Die zwei Instrumentenspalten neben der Sonne im Planets-Reiter.
 *
 * Sie binden zwei Dinge, die still brechen: die Aufteilung der sechs Kennwerte
 * auf die beiden Flanken (ein `slice(0, 3)` im Template hätte beim nächsten
 * Umsortieren eine Spalte mit vier Zeilen ergeben) und die Schwelle, unter der
 * beide Spalten in eine Reihe zurückfallen — sie steht zwangsläufig zweimal, in
 * der Präambel einer Container-Query, und die kennt keine Variable.
 */

const SRC = resolve(process.cwd(), 'src')
const PANEL = 'components/bardProfil/planets/PlanetStagePanel.vue'
const DECK = 'components/bardProfil/planets/PlanetStatDeck.vue'

function slot(level: number): PlanetSlot {
  return {
    ...PLANET_SLOT_CONFIG[0],
    purchased: true,
    role: 'harvest_node',
    level,
    orbitRadiusX: 180,
    orbitRadiusY: 50,
    tiltDeg: 18,
    currentHp: 100,
    maxHp: 100,
    healingUntilMs: 0,
    downUntilMs: 0,
    jungleBuff: null,
  } as unknown as PlanetSlot
}

function rows(level: number, previewLevel = level) {
  return planetStatRows({
    slot: slot(level),
    orbitIndex: 0,
    previewLevel,
    role: 'harvest_node',
  })
}

describe('planetStatRows — sechs Kennwerte, zwei Flanken', () => {
  it('teilt drei und drei, in fester Reihenfolge', () => {
    const r = rows(12)
    expect(r.filter((x) => x.flank === 'left').map((x) => x.key)).toEqual([
      'power',
      'next-bonus',
      'buff',
    ])
    expect(r.filter((x) => x.flank === 'right').map((x) => x.key)).toEqual([
      'lap-time',
      'uptime',
      'distance',
    ])
  })

  it('nennt die Zeit hinter der Sonne nicht zweimal', () => {
    // `Eclipse 6,1 s` war `Uptime 79 %` andersherum — eine Kachel für zwei
    // Ablesungen desselben Bogens.
    const r = rows(12)
    expect(r.map((x) => x.key)).not.toContain('eclipse')
    const uptime = r.find((x) => x.key === 'uptime')!
    expect(Number(uptime.value)).toBeGreaterThan(0)
    expect(Number(uptime.value)).toBeLessThan(100)
  })

  it('gibt jeder Kachel einen Satz und keine der drei alten Rätsel-Beschriftungen', () => {
    for (const row of rows(7)) {
      expect(row.tip.length).toBeGreaterThan(20)
      expect(row.label).not.toMatch(/Resonance|Milestone|In Reach|Eclipse|Period|Radius/)
    }
  })

  it('liest den Buff aus der Rollen-Tabelle statt ihn zu erfinden', () => {
    const buff = rows(12).find((x) => x.key === 'buff')!
    expect(buff.value).toBe(`×${JUNGLE_BUFF_DEFS.harvest_node.multiplier.toFixed(1)}`)
    expect(buff.tip).toContain(JUNGLE_BUFF_DEFS.harvest_node.name)
    // Level-stabil: beim Hover über Level-Up bleibt er stehen.
    expect(rows(12, 30).find((x) => x.key === 'buff')!.preview).toBeUndefined()
  })

  it('zeigt eine Vorschau nur dort, wo das Attunement den Wert bewegt', () => {
    const moving = rows(12, 24).filter((x) => x.preview !== undefined).map((x) => x.key)
    expect(moving).toContain('power')
    expect(moving).toContain('next-bonus')
    expect(moving).not.toContain('uptime')
    expect(moving).not.toContain('distance')
    // Ohne Zugewinn keine Vorschau — sonst flackerte jede Kachel grundlos.
    expect(rows(12).every((x) => x.preview === undefined)).toBe(true)
  })

  it('zählt Next Bonus auf das nächste Vielfache herunter und füllt seine Leiste', () => {
    const at = (level: number) => rows(level).find((x) => x.key === 'next-bonus')!
    expect(at(PLANET_MILESTONE_INTERVAL - 1).value).toBe('1')
    expect(at(PLANET_MILESTONE_INTERVAL).value).toBe(String(PLANET_MILESTONE_INTERVAL))
    expect(at(PLANET_MILESTONE_INTERVAL).bar).toBe(0)
    expect(at(PLANET_MILESTONE_INTERVAL - 1).bar).toBeCloseTo(
      (PLANET_MILESTONE_INTERVAL - 1) / PLANET_MILESTONE_INTERVAL,
      9,
    )
  })
})

describe('Die Rückfall-Schwelle steht in beiden Dateien gleich', () => {
  const threshold = (rel: string) => {
    const m = readFileSync(join(SRC, rel), 'utf8').match(
      /@container ps-orrery \(max-width: (\d+)px\)/,
    )
    expect(m, `keine ps-orrery-Query in ${rel}`).not.toBeNull()
    return Number(m![1])
  }

  it('Bühne und Spalte wechseln am selben Punkt', () => {
    expect(threshold(PANEL)).toBe(threshold(DECK))
  })

  it('die Spalten hängen an der Bühnenbreite, nicht am Viewport', () => {
    const panel = readFileSync(join(SRC, PANEL), 'utf8')
    expect(panel).toContain('container-name: ps-orrery')
    expect(panel).toContain('container-type: inline-size')
  })
})
