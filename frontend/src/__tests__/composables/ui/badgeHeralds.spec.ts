import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { shouldHeraldBadge, type BadgeHeraldGate } from '@/composables/ui/useBadgeHeralds'
import { useHerald } from '@/composables/ui/useHerald'
import {
  BADGE_HERALD_COOLDOWN_MS,
  HERALD_DISPLAY_MS,
  HERALD_AMBIENT_DISPLAY_MS,
  HERALD_QUEUE_MAX,
  NOTIFY_BADGE_TITLE,
} from '@/config/constants'

/**
 * Die beiden Regeln hinter dem `ready`-Herold — der kurzen Meldung, mit der sich
 * eine neu aufgetauchte Notify-Marke einmal zu Wort meldet.
 *
 * Beide brechen STILL: eine gelockerte Kante macht aus einem Hinweis eine
 * Bannerflut, und eine ambiente Meldung, die sich anstellt statt auszuweichen,
 * schiebt bei vollem Puffer ein WARP COMPLETE aus der Warteschlange. Beides
 * sieht man im Code nicht und im Spiel erst, wenn es zu spät ist.
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
  const { current, announce, announceAmbient, reset } = useHerald()

  const milestone = { kind: 'warp', eyebrow: 'WARP COMPLETE', headline: 'G', accent: '1, 2, 3' } as const
  const ambient = { kind: 'ready', eyebrow: 'STAR FORGE', headline: 'F', accent: '4, 5, 6' } as const

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
    expect(current.value?.kind).toBe('ready')
  })

  it('verwirft die ambiente Meldung, solange ein Meilenstein läuft', () => {
    announce(milestone)
    announceAmbient(ambient)
    expect(current.value?.kind).toBe('warp')
    // Nicht nur verschoben — nach Ablauf des Meilensteins folgt NICHTS.
    vi.advanceTimersByTime(HERALD_DISPLAY_MS + 1)
    expect(current.value).toBeNull()
  })

  it('verdrängt niemals einen wartenden Meilenstein aus vollem Puffer', () => {
    // Puffer randvoll fahren: einer läuft, HERALD_QUEUE_MAX warten.
    for (let i = 0; i < HERALD_QUEUE_MAX + 1; i++) announce(milestone)
    announceAmbient(ambient)
    for (let i = 0; i < HERALD_QUEUE_MAX + 1; i++) {
      expect(current.value?.kind).toBe('warp')
      vi.advanceTimersByTime(HERALD_DISPLAY_MS + 1)
    }
    expect(current.value).toBeNull()
  })

  it('hält die ambiente Meldung kürzer als einen Meilenstein', () => {
    announceAmbient({ ...ambient, holdMs: HERALD_AMBIENT_DISPLAY_MS })
    vi.advanceTimersByTime(HERALD_AMBIENT_DISPLAY_MS + 1)
    expect(current.value).toBeNull()
    // Gegenprobe: der Meilenstein steht zu diesem Zeitpunkt noch.
    announce(milestone)
    vi.advanceTimersByTime(HERALD_AMBIENT_DISPLAY_MS + 1)
    expect(current.value?.kind).toBe('warp')
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
