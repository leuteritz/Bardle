import { describe, it, expect } from 'vitest'
import {
  durationSegments,
  formatMinuteClock,
  formatPercentValue,
  sunVitalStage,
} from '@/utils/ui/format'
import { HP_HEALTHY_PERCENT, HP_CRIT_PERCENT } from '@/config/constants'

const S = 1000
const M = 60 * S
const H = 60 * M
const D = 24 * H

/**
 * Der `m:ss`-Countdown der Expeditionen. Er stand als lokale Rechnung in vier
 * Komponenten; die Spec hält jetzt die eine Fassung fest — vor allem die
 * `Math.ceil`-Konvention, ohne die eine ablaufende Frist eine Sekunde zu früh
 * auf `0:00` fällt.
 */
describe('formatMinuteClock', () => {
  it('pads the seconds and drops the leading minute zero', () => {
    expect(formatMinuteClock(0)).toBe('0:00')
    expect(formatMinuteClock(7 * S)).toBe('0:07')
    expect(formatMinuteClock(42 * S)).toBe('0:42')
    expect(formatMinuteClock(4 * M + 12 * S)).toBe('4:12')
  })

  it('counts minutes past the hour instead of rolling over', () => {
    expect(formatMinuteClock(M)).toBe('1:00')
    expect(formatMinuteClock(H + 5 * S)).toBe('60:05')
  })

  it('rounds up to the full second, so a running deadline never reads short', () => {
    expect(formatMinuteClock(1)).toBe('0:01')
    expect(formatMinuteClock(1500)).toBe('0:02')
    expect(formatMinuteClock(59_999)).toBe('1:00')
  })

  it('floors at zero instead of showing a negative clock', () => {
    expect(formatMinuteClock(-1)).toBe('0:00')
    expect(formatMinuteClock(-90 * S)).toBe('0:00')
  })
})

describe('durationSegments', () => {
  it('always returns all four units, in order', () => {
    for (const ms of [0, 42 * S, 9 * M, 5 * H, 400 * D]) {
      expect(durationSegments(ms).map((s) => s.unit)).toEqual(['days', 'hrs', 'min', 'sec'])
    }
  })

  it('splits a multi-day duration correctly', () => {
    expect(durationSegments(3 * D + 4 * H + 7 * M + 9 * S)).toEqual([
      { value: '03', unit: 'days', leadingZero: false },
      { value: '04', unit: 'hrs', leadingZero: false },
      { value: '07', unit: 'min', leadingZero: false },
      { value: '09', unit: 'sec', leadingZero: false },
    ])
  })

  it('keeps days and hours visible on a fresh save', () => {
    expect(durationSegments(34 * M + 13 * S)).toEqual([
      { value: '00', unit: 'days', leadingZero: true },
      { value: '00', unit: 'hrs', leadingZero: true },
      { value: '34', unit: 'min', leadingZero: false },
      { value: '13', unit: 'sec', leadingZero: false },
    ])
  })

  it('marks only the leading zeros, never a zero after a real value', () => {
    // 1 day, 0 hours, 0 minutes, 5 seconds — the inner zeros are real values
    expect(durationSegments(1 * D + 5 * S).map((s) => s.leadingZero)).toEqual([
      false,
      false,
      false,
      false,
    ])
    expect(durationSegments(2 * H + 5 * S).map((s) => s.leadingZero)).toEqual([
      true,
      false,
      false,
      false,
    ])
  })

  it('handles zero and negative input without breaking', () => {
    const zero = durationSegments(0)
    expect(zero.map((s) => s.value)).toEqual(['00', '00', '00', '00'])
    expect(zero.every((s) => s.leadingZero)).toBe(true)
    expect(durationSegments(-5000).map((s) => s.value)).toEqual(['00', '00', '00', '00'])
  })

  it('pads every block to two digits so the readout never gains width', () => {
    for (const ms of [0, 42 * S, 9 * M, 5 * H, 1 * D, 9 * D + 9 * H + 9 * M]) {
      for (const seg of durationSegments(ms)) {
        expect(seg.value.length, `"${seg.value}" is not two digits`).toBe(2)
      }
    }
  })

  it('keeps counting past two digits instead of truncating', () => {
    const [days] = durationSegments(365 * D)
    expect(days).toEqual({ value: '365', unit: 'days', leadingZero: false })
  })
})

describe('formatPercentValue', () => {
  it('drops a trailing .0 but keeps a real decimal', () => {
    expect(formatPercentValue(13)).toBe('13')
    expect(formatPercentValue(13.0)).toBe('13')
    expect(formatPercentValue(19.5)).toBe('19.5')
  })

  it('swallows the float noise a rank multiplication leaves behind', () => {
    // 3 × 1.3 und 15 × 1.3 rechnen binär nicht glatt — genau der Fall, für den
    // es diesen Formatierer gibt.
    expect(formatPercentValue(3 * 1.3)).toBe('3.9')
    expect(formatPercentValue(15 * 1.3)).toBe('19.5')
    expect(formatPercentValue(10 * 1.15)).toBe('11.5')
  })

  it('rounds to a single decimal instead of trailing digits', () => {
    expect(formatPercentValue(22 * 1.3)).toBe('28.6')
    expect(formatPercentValue(16 * 1.15)).toBe('18.4')
  })
})

describe('sunVitalStage', () => {
  it('names the three bands', () => {
    expect(sunVitalStage(100)).toBe('green')
    expect(sunVitalStage(70)).toBe('green')
    expect(sunVitalStage(40)).toBe('yellow')
    expect(sunVitalStage(30)).toBe('yellow')
    expect(sunVitalStage(10)).toBe('red')
    expect(sunVitalStage(0)).toBe('red')
  })

  /**
   * Der eigentliche Zweck der Funktion. Die Schwellen wurden vorher an zwei
   * Stellen mit VERSCHIEDENEN Operatoren gelesen — `< 25` im Store gegen
   * `<= 25` im Pause-Overlay. Genau auf dem Punkt pulste die Leiste rot,
   * während die Sonne nicht als „low" galt und die Vignette ausblieb.
   *
   * Beide Kanten gehören deshalb der TIEFEREN Stufe: der Wert selbst ist schon
   * kein „unversehrt" bzw. kein „angeschlagen" mehr.
   */
  it('puts both thresholds themselves into the lower band', () => {
    expect(sunVitalStage(HP_HEALTHY_PERCENT)).toBe('yellow')
    expect(sunVitalStage(HP_HEALTHY_PERCENT + 0.01)).toBe('green')
    expect(sunVitalStage(HP_CRIT_PERCENT)).toBe('red')
    expect(sunVitalStage(HP_CRIT_PERCENT + 0.01)).toBe('yellow')
  })

  it('stays in the outer bands past the ends of the scale', () => {
    expect(sunVitalStage(140)).toBe('green')
    expect(sunVitalStage(-20)).toBe('red')
  })
})
