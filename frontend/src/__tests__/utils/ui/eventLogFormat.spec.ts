import { describe, it, expect } from 'vitest'
import { formatEventClock, formatEventLine, formatEventLines } from '@/utils/ui/eventLogFormat'
import type { GameEvent, GameEventType } from '@/composables/ui/useEventLog'

/**
 * Der Copy-Knopf ist der einzige Weg, eine Sitzung aus dem Spiel heraus
 * auswertbar zu machen. Bricht die Ausrichtung, ist der Text zwar noch da,
 * aber nicht mehr überfliegbar — und genau dafür gibt es ihn.
 */
const at = (h: number, m: number, s: number) => new Date(2026, 0, 5, h, m, s).getTime()

const event = (type: GameEventType, message: string, ts: number): GameEvent => ({
  id: 1,
  message,
  type,
  timestamp: ts,
})

describe('formatEventClock', () => {
  it('füllt Stunden, Minuten und Sekunden auf zwei Stellen', () => {
    expect(formatEventClock(at(9, 4, 2))).toBe('09:04')
    expect(formatEventClock(at(9, 4, 2), true)).toBe('09:04:02')
  })

  it('zeigt ohne Flag keine Sekunden — die Spur hat dafür keine Breite', () => {
    expect(formatEventClock(at(21, 41, 22))).toBe('21:41')
    expect(formatEventClock(at(21, 41, 22), true)).toBe('21:41:22')
  })
})

describe('formatEventLines', () => {
  it('schreibt Zeit, Typ und Nachricht in eine Zeile', () => {
    const line = formatEventLine(event('combat', 'Ashe slays boss (adc).', at(9, 41, 22)))
    expect(line).toMatch(/^\[09:41:22\] \[combat\] +Ashe slays boss \(adc\)\.$/)
  })

  it('rückt die Nachricht bei jedem Typ auf dieselbe Spalte', () => {
    const events = [
      event('void', 'Rift sealed.', at(9, 41, 4)),
      event('chronicle', 'Track II cleared.', at(9, 40, 58)),
      event('top', 'Shield restored.', at(9, 40, 31)),
    ]
    const lines = formatEventLines(events).split('\n')

    const offsets = lines.map((line, i) => line.indexOf(events[i].message))
    expect(offsets).not.toContain(-1)
    expect(new Set(offsets).size).toBe(1)
  })

  it('trennt Zeilen mit Zeilenumbruch und bleibt bei leerer Eingabe leer', () => {
    expect(formatEventLines([])).toBe('')
    const two = formatEventLines([
      event('info', 'One.', at(1, 0, 0)),
      event('info', 'Two.', at(1, 0, 1)),
    ])
    expect(two.split('\n')).toHaveLength(2)
  })
})
