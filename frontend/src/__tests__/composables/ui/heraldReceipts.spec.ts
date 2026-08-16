import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useHerald } from '@/composables/ui/useHerald'
import {
  HERALD_DISPLAY_MS,
  HERALD_RECEIPT_HOLD_MS,
  HERALD_RECEIPT_MERGE_WINDOW_MS,
  HERALD_RECEIPT_STACK_MAX,
  HERALD_RECEIPT_KINDS,
} from '@/config/constants'
import type { HeraldReceiptKind } from '@/types'

/**
 * Die Quittungsspur des Herolds — die Nebenspur, in der alles landet, was der
 * Spieler ausgelöst hat.
 *
 * Ihr Kern ist die VERDICHTUNG, und die bricht still: ohne sie sieht der Spieler
 * von zwölf Ergebnissen eines „Buy Max" nur das letzte, mit einer zu gierigen
 * verrechnet sich ein Planet mit einem anderen und trägt dessen Bild. Beides
 * sieht man im Code nicht.
 *
 * Alles hier ist reine Logik im Composable, kein DOM.
 */

const receipt = (headline: string, extra: Record<string, unknown> = {}) =>
  ({ kind: 'purchase' as const, headline, ...extra }) as Parameters<
    ReturnType<typeof useHerald>['announceReceipt']
  >[0]

describe('useHerald — Quittungen verdichten sich', () => {
  const { receipts, announceReceipt, reset } = useHerald()

  beforeEach(() => {
    vi.useFakeTimers()
    reset()
  })

  afterEach(() => {
    reset()
    vi.useRealTimers()
  })

  it('fasst Gleichartiges zu EINER Karte mit Zähler zusammen', () => {
    announceReceipt(receipt('Solar Sails'))
    announceReceipt(receipt('Quickening'))
    expect(receipts.value).toHaveLength(1)
    expect(receipts.value[0]?.count).toBe(2)
    // Der jüngste Wortlaut gewinnt — die Karte spricht von dem, was gerade
    // geschehen ist, nicht von dem, was als erstes geschah.
    expect(receipts.value[0]?.headline).toBe('Quickening')
  })

  it('hält einen Klick-Sturm bei EINER Karte', () => {
    // Zehn Käufe in Folge, wie beim schnellen Durchklicken einer Stufe.
    for (let i = 0; i < 10; i++) announceReceipt(receipt(`Node ${i}`))
    expect(receipts.value).toHaveLength(1)
    expect(receipts.value[0]?.headline).toBe('Node 9')
    expect(receipts.value[0]?.count).toBe(10)
  })

  it('lässt verschiedene Schlüssel nebeneinander stehen', () => {
    // Genau der Fall zweier Planeten: gleiche Art, verschiedene Subjekte.
    announceReceipt(receipt('Harvester', { mergeKey: 'levelup/planet/a' }))
    announceReceipt(receipt('Resonator', { mergeKey: 'levelup/planet/b' }))
    expect(receipts.value).toHaveLength(2)
    expect(receipts.value.map((r) => r.count)).toEqual([1, 1])
  })

  it('zählt nicht mit, wo `countable: false` steht', () => {
    // Ein Umschalter: dreimal geklickt heißt nicht „drei Ergebnisse".
    for (let i = 0; i < 3; i++) announceReceipt(receipt('On', { countable: false }))
    expect(receipts.value).toHaveLength(1)
    expect(receipts.value[0]?.count).toBe(1)
  })
})

describe('useHerald — das Zahlenfeld summiert', () => {
  const { receipts, announceReceipt, reset } = useHerald()

  beforeEach(() => {
    vi.useFakeTimers()
    reset()
  })

  afterEach(() => {
    reset()
    vi.useRealTimers()
  })

  it('addiert bei gleicher Einheit', () => {
    announceReceipt(receipt('A', { delta: { value: -100, unit: 'chimes' } }))
    announceReceipt(receipt('B', { delta: { value: -250, unit: 'chimes' } }))
    expect(receipts.value[0]?.delta).toMatchObject({ value: -350, unit: 'chimes' })
  })

  it('nimmt bei anderer Einheit die neue — den Rest erzählt der Zähler', () => {
    announceReceipt(receipt('A', { delta: { value: -100, unit: 'chimes' } }))
    announceReceipt(receipt('B', { delta: { value: 3, unit: 'levels' } }))
    expect(receipts.value[0]?.delta).toMatchObject({ value: 3, unit: 'levels' })
  })

  it('lässt die laufende Summe stehen, wenn die neue Meldung keine Zahl trägt', () => {
    announceReceipt(receipt('A', { delta: { value: -100, unit: 'chimes' } }))
    announceReceipt(receipt('B'))
    expect(receipts.value[0]?.delta).toMatchObject({ value: -100 })
  })

  it('ersetzt statt zu addieren, wenn `sum: false` steht', () => {
    announceReceipt(receipt('A', { delta: { value: 4, unit: 'levels', sum: false } }))
    announceReceipt(receipt('B', { delta: { value: 7, unit: 'levels', sum: false } }))
    expect(receipts.value[0]?.delta).toMatchObject({ value: 7 })
  })
})

describe('useHerald — Standzeit und Verdichtungsfenster', () => {
  const { receipts, announceReceipt, reset } = useHerald()

  beforeEach(() => {
    vi.useFakeTimers()
    reset()
  })

  afterEach(() => {
    reset()
    vi.useRealTimers()
  })

  it('beginnt die Standzeit bei jeder Verdichtung von vorn', () => {
    announceReceipt(receipt('A'))
    vi.advanceTimersByTime(HERALD_RECEIPT_HOLD_MS - 1)
    announceReceipt(receipt('B'))
    vi.advanceTimersByTime(HERALD_RECEIPT_HOLD_MS - 1)
    // Ohne den Reset wäre die Karte hier längst weg.
    expect(receipts.value).toHaveLength(1)
    vi.advanceTimersByTime(2)
    expect(receipts.value).toHaveLength(0)
  })

  it('übergibt nach dem Verdichtungsfenster an eine frische Karte', () => {
    // Die Karte wird durchgehend gefüttert und stünde ohne diesen Deckel
    // unbegrenzt lange, während der Zähler ins Absurde klettert.
    announceReceipt(receipt('A'))
    let elapsed = 0
    while (elapsed < HERALD_RECEIPT_MERGE_WINDOW_MS) {
      vi.advanceTimersByTime(1_000)
      elapsed += 1_000
      announceReceipt(receipt('A'))
    }
    expect(receipts.value).toHaveLength(2)
    expect(receipts.value.at(-1)?.count).toBe(1)
  })

  it('deckelt den Stapel und räumt den Timer der verdrängten Karte mit', () => {
    for (let i = 0; i <= HERALD_RECEIPT_STACK_MAX; i++) {
      announceReceipt(receipt(`K${i}`, { mergeKey: `k${i}` }))
    }
    expect(receipts.value).toHaveLength(HERALD_RECEIPT_STACK_MAX)
    // Die älteste ist raus — und ihr Timer darf nicht später eine fremde Karte
    // abräumen.
    expect(receipts.value.map((r) => r.headline)).not.toContain('K0')
    reset()
    vi.advanceTimersByTime(HERALD_RECEIPT_HOLD_MS * 2)
    expect(receipts.value).toHaveLength(0)
  })
})

describe('useHerald — die beiden Spuren fassen einander nicht an', () => {
  const { current, receipts, announce, announceReceipt, reset } = useHerald()

  const milestone = {
    kind: 'warp',
    eyebrow: 'WARP COMPLETE',
    headline: 'G',
    accent: '1, 2, 3',
  } as const

  beforeEach(() => {
    vi.useFakeTimers()
    reset()
  })

  afterEach(() => {
    reset()
    vi.useRealTimers()
  })

  it('zeigt Quittung und Zeremonie GLEICHZEITIG', () => {
    // Das ist die Verhaltensänderung gegenüber der alten Quittung: sie stellte
    // sich hinter die Zeremonie und sprach erst, wenn diese fertig war. Jetzt
    // haben beide ihre eigene Zeile und stehen nebeneinander.
    announce(milestone)
    announceReceipt(receipt('Solar Sails'))
    expect(current.value?.kind).toBe('warp')
    expect(receipts.value).toHaveLength(1)
  })

  it('lässt die Warteschlange der Zeremonien unberührt', () => {
    announce(milestone)
    announce(milestone)
    announceReceipt(receipt('Solar Sails'))
    // Beide Meilensteine laufen unverändert durch — keiner wurde übersprungen.
    expect(current.value?.kind).toBe('warp')
    vi.advanceTimersByTime(HERALD_DISPLAY_MS + 1)
    expect(current.value?.kind).toBe('warp')
    vi.advanceTimersByTime(HERALD_DISPLAY_MS + 1)
    expect(current.value).toBeNull()
  })

  it('räumt bei `reset()` beide Spuren', () => {
    announce(milestone)
    announceReceipt(receipt('Solar Sails'))
    reset()
    expect(current.value).toBeNull()
    expect(receipts.value).toHaveLength(0)
  })
})

describe('HERALD_RECEIPT_KINDS', () => {
  it('trägt für jede Art Kopfzeile, Sigil und Akzent', () => {
    // Ein fehlender Eintrag zeigt sich erst auf der Karte: leere Kopfzeile,
    // leere Fläche statt Glyph, `rgb()` ohne Werte.
    for (const [kind, def] of Object.entries(HERALD_RECEIPT_KINDS)) {
      expect(def.label, kind).toBeTruthy()
      expect(def.icon, kind).toMatch(/^game-icons:/)
      // "r, g, b" — die Karte setzt den Wert direkt in rgb()/rgba().
      expect(def.accent, kind).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/)
    }
  })

  it('kennt jede Art, die eine Quittung tragen kann', () => {
    const kinds: HeraldReceiptKind[] = [
      'levelup',
      'recruit',
      'assign',
      'purchase',
      'unlock',
      'equip',
      'perk',
      'forge',
      'expedition',
      'event',
      'warning',
      'info',
      'forged',
      'ready',
    ]
    for (const kind of kinds) expect(HERALD_RECEIPT_KINDS[kind]).toBeDefined()
  })
})
