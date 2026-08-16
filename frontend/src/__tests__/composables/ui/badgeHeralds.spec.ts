import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { shouldHeraldBadge, type BadgeHeraldGate } from '@/composables/ui/useBadgeHeralds'
import { useHerald } from '@/composables/ui/useHerald'
import {
  BADGE_HERALD_COOLDOWN_MS,
  HERALD_DISPLAY_MS,
  HERALD_RECEIPT_HOLD_MS,
  HERALD_QUEUE_MAX,
  NOTIFY_BADGE_TITLE,
} from '@/config/constants'

/**
 * Die beiden Regeln hinter dem `ready`-Herold — der kurzen Meldung, mit der sich
 * eine neu aufgetauchte Notify-Marke einmal zu Wort meldet.
 *
 * Beide brechen STILL: eine gelockerte Kante macht aus einem Hinweis eine
 * Bannerflut, und eine ambiente Meldung, die sich nicht zurückhält, redet in
 * jede Zeremonie hinein. Seit die Quittungen ihre eigene Spur haben, könnte sie
 * das sogar, ohne etwas zu verdecken — sie soll es trotzdem nicht: die Regel
 * ist eine über LÄRM, nicht über Platz.
 */

const OPEN: BadgeHeraldGate = {
  armed: true,
  wasOpen: false,
  count: 1,
  nowMs: 1_000_000,
  lastHeraldAtMs: -Infinity,
  tabOpen: false,
  pageVisible: true,
}

describe('shouldHeraldBadge — nur das Auftauchen', () => {
  it('meldet die Kante 0 → 1', () => {
    expect(shouldHeraldBadge(OPEN)).toBe(true)
  })

  it('schweigt bei jedem weiteren Zuwachs (3 → 4)', () => {
    // Der Kern der Regel: `shopReadyTotal` klettert mit jedem Chime-Zufluss.
    expect(shouldHeraldBadge({ ...OPEN, wasOpen: true, count: 4 })).toBe(false)
  })

  it('schweigt, wenn die Marke verschwindet', () => {
    expect(shouldHeraldBadge({ ...OPEN, wasOpen: true, count: 0 })).toBe(false)
    expect(shouldHeraldBadge({ ...OPEN, count: 0 })).toBe(false)
  })

  it('schweigt vor dem Scharfstellen, auch bei einem großen Sprung', () => {
    // Genau der Fall aus loadGame(): fünf Marken springen auf einmal auf.
    expect(shouldHeraldBadge({ ...OPEN, armed: false, count: 5 })).toBe(false)
  })
})

describe('shouldHeraldBadge — Sperrfrist und Sicht', () => {
  it('schweigt innerhalb der Sperrfrist', () => {
    const justBefore = OPEN.nowMs - BADGE_HERALD_COOLDOWN_MS + 1
    expect(shouldHeraldBadge({ ...OPEN, lastHeraldAtMs: justBefore })).toBe(false)
  })

  it('meldet wieder, sobald die Sperrfrist abgelaufen ist', () => {
    const exactly = OPEN.nowMs - BADGE_HERALD_COOLDOWN_MS
    expect(shouldHeraldBadge({ ...OPEN, lastHeraldAtMs: exactly })).toBe(true)
  })

  it('schweigt bei verdeckter Seite', () => {
    expect(shouldHeraldBadge({ ...OPEN, pageVisible: false })).toBe(false)
  })

  it('schweigt, wenn der Tab offen ist, der die Marke ohnehin zeigt', () => {
    expect(shouldHeraldBadge({ ...OPEN, tabOpen: true })).toBe(false)
  })
})

describe('useHerald — ambient weicht aus, Meilensteine nicht', () => {
  const { current, receipts, announce, announceAmbient, reset } = useHerald()

  const milestone = {
    kind: 'warp',
    eyebrow: 'WARP COMPLETE',
    headline: 'G',
    accent: '1, 2, 3',
  } as const
  const ambient = {
    kind: 'ready',
    eyebrow: 'STAR FORGE',
    headline: 'F',
    accent: '4, 5, 6',
  } as const

  beforeEach(() => {
    vi.useFakeTimers()
    reset()
  })

  afterEach(() => {
    reset()
    vi.useRealTimers()
  })

  it('zeigt eine ambiente Meldung, wenn nichts läuft', () => {
    announceAmbient(ambient)
    expect(receipts.value[0]?.kind).toBe('ready')
  })

  it('verwirft die ambiente Meldung, solange ein Meilenstein läuft', () => {
    announce(milestone)
    announceAmbient(ambient)
    // Sie könnte inzwischen NEBEN der Zeremonie stehen, ohne sie zu verdecken —
    // genau das ist der Punkt: sie tut es trotzdem nicht.
    expect(receipts.value).toHaveLength(0)
    // Nicht nur verschoben — nach Ablauf des Meilensteins folgt NICHTS.
    vi.advanceTimersByTime(HERALD_DISPLAY_MS + 1)
    expect(current.value).toBeNull()
    expect(receipts.value).toHaveLength(0)
  })

  it('verdrängt niemals einen wartenden Meilenstein aus vollem Puffer', () => {
    // Puffer randvoll fahren: einer läuft, HERALD_QUEUE_MAX warten. Seit der
    // Trennung der Spuren kann das gar nicht mehr schiefgehen — der Test bleibt
    // als Regression genau dafür stehen.
    for (let i = 0; i < HERALD_QUEUE_MAX + 1; i++) announce(milestone)
    announceAmbient(ambient)
    for (let i = 0; i < HERALD_QUEUE_MAX + 1; i++) {
      expect(current.value?.kind).toBe('warp')
      vi.advanceTimersByTime(HERALD_DISPLAY_MS + 1)
    }
    expect(current.value).toBeNull()
  })

  it('hält die ambiente Meldung so lange wie jede andere Quittung', () => {
    announceAmbient(ambient)
    vi.advanceTimersByTime(HERALD_RECEIPT_HOLD_MS + 1)
    expect(receipts.value).toHaveLength(0)
  })
})

describe('NOTIFY_BADGE_TITLE', () => {
  it('trägt für jede Herold-Quelle eine Überschrift', () => {
    // Die Schlagzeile des Herolds liest genau diese Tabelle — fehlt ein
    // Eintrag, stünde im Banner `undefined`.
    for (const kind of ['shop', 'forge', 'skill', 'planet', 'expedition'] as const) {
      expect(NOTIFY_BADGE_TITLE[kind]).toBeTruthy()
    }
  })
})
