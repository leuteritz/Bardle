import { describe, expect, it } from 'vitest'
import { visibleUniverseRailRows, type UniverseRailRow } from '@/utils/ui/universeRail'

function row(id: number, changes: Partial<UniverseRailRow> = {}): UniverseRailRow {
  return {
    id,
    roman: 'I',
    tint: '#e8c040',
    walked: false,
    current: false,
    picked: false,
    pickable: false,
    discState: 'unlit',
    state: 'not yet walked',
    galaxies: 0,
    rescued: 0,
    lost: 0,
    elapsed: '—',
    progress: 0,
    note: 'not yet walked',
    ...changes,
  }
}

describe('visibleUniverseRailRows', () => {
  it('keeps the active and populated universes only', () => {
    const visible = visibleUniverseRailRows([
      row(1, { pickable: true, galaxies: 2, walked: true }),
      row(2, { current: true, pickable: true, walked: true }),
      row(3, { walked: true, state: 'walked · nothing freed' }),
      row(4),
    ])

    expect(visible.map((entry) => entry.id)).toEqual([2, 1])
  })
})
