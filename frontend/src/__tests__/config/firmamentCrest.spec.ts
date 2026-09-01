import { describe, it, expect } from 'vitest'
import {
  BOTTOM_BAR_SIDE_W,
  FIRMAMENT_CREST_CHIME_ART_PX,
  FIRMAMENT_CREST_ID_GAP,
  FIRMAMENT_CREST_ID_PAD_X,
  FIRMAMENT_CREST_ID_W,
  FIRMAMENT_CREST_PROV_LABEL_MAX_PX,
  FIRMAMENT_CREST_PROV_NAME_PX,
  FIRMAMENT_CREST_PROV_WIDE_MAX_PX,
  FIRMAMENT_CREST_READ_PAD_X,
  FIRMAMENT_CREST_READ_W_CHIMES,
  FIRMAMENT_CREST_READ_W_ELAPSED,
  FIRMAMENT_CREST_READ_W_GALAXIES,
  FIRMAMENT_CREST_READ_W_PROV,
  FIRMAMENT_CREST_READ_W_STARS,
  FIRMAMENT_CREST_VALUE_MIN_PX,
  UNIVERSE_DISC_CREST_PX,
} from '@/config/constants'
import { buildFirmamentChronicle } from '@/utils/ui/firmamentChronicle'
import type { FirmamentNode } from '@/utils/ui/firmamentLayout'
import type { UniverseRunRecord } from '@/types'

/**
 * Das Kopfband des Firmaments — zwei Zusicherungen, und beide sind schon einmal
 * gebrochen gewesen.
 *
 * DIE ERSTE ist die Bilanz: Wappenzone plus vier Ablesungen muessen in das
 * SCHMALSTE Zielband passen. Die Ablesungen sind `flex-shrink: 0`, die
 * Wappenzone gibt nach — laeuft die Reihe trotzdem ueber, schneidet sie still
 * ab, und eine `scrollWidth`-Pruefung findet das nicht. Seit die zwei Wirkungen
 * der Vorsehung als ABLESUNGEN in der Wappenzone stehen, haengt an derselben
 * Bilanz auch, ob die laengste Achsenbeschriftung noch hineinpasst.
 *
 * DIE ZWEITE ist die Chronik selbst: sie ist der ganze Grund, warum das Band
 * umgebaut wurde. Vorher standen dort Lebenszeit-Zaehler, und wer auf Universum
 * II sah, las die Zahlen des ganzen Spielstands — ein Fehler, den man im Bild
 * nicht sieht, weil die Zahlen plausibel aussehen. Hier steht er.
 */

/** `--bp-gap` von `.rp-wrapper`, beide Seiten. */
const MODAL_GAP = 10

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** `--hud-scale` aus `App.vue`. */
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)

/** Das Band ist so breit wie der Reiter — die Leiste liegt UNTER ihm, nicht
 *  daneben. */
const bandWidth = (vw: number, vh: number) =>
  vw - 2 * (BOTTOM_BAR_SIDE_W * hudScale(vw, vh) + MODAL_GAP)

const READS =
  FIRMAMENT_CREST_READ_W_GALAXIES +
  FIRMAMENT_CREST_READ_W_STARS +
  FIRMAMENT_CREST_READ_W_CHIMES +
  FIRMAMENT_CREST_READ_W_ELAPSED

describe('Firmament-Kopfband — das Breitenbudget', () => {
  it('traegt Wappen und alle vier Ablesungen im schmalsten Zielband', () => {
    // Der schmalste Fall ist NICHT Full HD im Vollbild, sondern Full HD @125 %:
    // der Browser meldet dort 1536 CSS-px. Eine Breitenpruefung an der
    // Aufloesungstabelle statt an den CSS-Pixeln geht daran vorbei.
    for (const [vw, vh] of [
      [1536, 864],
      [1920, 1080],
      [1920, 1200],
      [2560, 1440],
      [3840, 2160],
    ]) {
      expect(FIRMAMENT_CREST_ID_W + READS, `${vw}x${vh}`).toBeLessThanOrEqual(bandWidth(vw, vh))
    }
  })

  it('gibt der Chimes-Ablesung die groesste Breite', () => {
    // Sie ist die einzige, die ZWEI Zahlen traegt (`5.74B / 51.2M`) — jede
    // andere kaeme mit weniger aus, und wer sie angleicht, laesst genau diese
    // umbrechen.
    for (const w of [
      FIRMAMENT_CREST_READ_W_GALAXIES,
      FIRMAMENT_CREST_READ_W_STARS,
      FIRMAMENT_CREST_READ_W_ELAPSED,
    ]) {
      expect(FIRMAMENT_CREST_READ_W_CHIMES).toBeGreaterThan(w)
    }
  })

  it('traegt in der Wappenzone Scheibe UND beide Vorsehungs-Ablesungen', () => {
    // Das ist die Herleitung der 390: Polsterung, Scheibe, Luecke und die zwei
    // Ablesungen. Sie stehen in der Zone, die NACHGIBT — laeuft die Rechnung
    // ueber, schneidet die Reihe still ab, statt zu rollen.
    expect(FIRMAMENT_CREST_ID_W).toBeGreaterThanOrEqual(
      2 * FIRMAMENT_CREST_ID_PAD_X +
        UNIVERSE_DISC_CREST_PX +
        FIRMAMENT_CREST_ID_GAP +
        2 * FIRMAMENT_CREST_READ_W_PROV,
    )
  })

  it('laesst die laengste Achsenbeschriftung in ihre Ablesung passen', () => {
    // `.fm-crest-k` ist `nowrap` OHNE Ellipse: zu lang heisst still
    // abgeschnitten, und eine `scrollWidth`-Pruefung findet das nicht. Die Zahl
    // ist im Browser gemessen („Expedition rewards", 10,5 px versal, 0,1 em
    // Sperrung).
    expect(FIRMAMENT_CREST_PROV_LABEL_MAX_PX + 2 * FIRMAMENT_CREST_READ_PAD_X).toBeLessThanOrEqual(
      FIRMAMENT_CREST_READ_W_PROV,
    )
  })

  it('laesst den laengsten Vorsehungsnamen in die EINE breite Ablesung passen', () => {
    // Ohne Achsen (vergangene Bahn, oder nie geprestiged) steht dort ein Name
    // statt zweier Zahlen, ueber die Breite der beiden.
    expect(FIRMAMENT_CREST_PROV_WIDE_MAX_PX + 2 * FIRMAMENT_CREST_READ_PAD_X).toBeLessThanOrEqual(
      2 * FIRMAMENT_CREST_READ_W_PROV,
    )
    // Und er laeuft NICHT auf der Skala der Zahlen: dort waere er breiter als
    // seine Ablesung.
    expect(FIRMAMENT_CREST_PROV_NAME_PX).toBeLessThan(FIRMAMENT_CREST_VALUE_MIN_PX)
  })

  it('laesst das Chime-Artwork die Ablesung nicht hoeher machen', () => {
    // Ueber dem Schriftboden bestimmt das BILD die Zeilenhoehe, und eine
    // Bilanz, die nur Schriftgroessen kennt, geht dann still daneben —
    // dieselbe Wand wie `VOYAGE_MAP_STATS_ART_MAX` im Voyages-Datenband.
    expect(FIRMAMENT_CREST_CHIME_ART_PX).toBeLessThanOrEqual(FIRMAMENT_CREST_VALUE_MIN_PX)
  })
})

// ── Die Chronik ─────────────────────────────────────────────────────────────

function node(
  state: FirmamentNode['state'],
  rescued: number,
  lost: number,
  galaxy = 1,
): FirmamentNode {
  return {
    galaxy,
    state,
    nx: 0,
    ny: 0,
    angle: 0,
    radius: 0,
    stars: rescued + lost,
    rescued,
    lost,
    landfalls: 0,
    themeIndex: 0,
    bodyR: 1,
    record: null,
  }
}

function run(universe: number, chimes: number, durationSeconds: number, at = 1): UniverseRunRecord {
  return {
    universe,
    durationSeconds,
    starsRescued: 0,
    galaxiesFreed: 0,
    chimes,
    completedAt: at,
  }
}

const BASE = {
  runs: [] as UniverseRunRecord[],
  universe: 2,
  currentUniverse: 2,
  liveChimes: 0,
  liveGoal: 100,
  liveSeconds: 0,
  chimesPerSecond: 0,
}

describe('Firmament-Kopfband — die Chronik der gezeigten Bahn', () => {
  it('zaehlt die laufende Galaxie bei den STERNEN, aber nicht bei den GALAXIEN', () => {
    // Ihre Sterne SIND gerettet oder verloren; sie selbst ist es nicht, und der
    // Knoten sagt das auch (`state: 'current'`).
    const c = buildFirmamentChronicle({
      ...BASE,
      nodes: [node('freed', 3, 1, 1), node('current', 2, 1, 2)],
    })
    expect(c.galaxies).toBe(1)
    expect(c.rescued).toBe(5)
    expect(c.lost).toBe(2)
  })

  it('laesst unbeleuchtete Plaetze ganz aus', () => {
    // Sie sind Vorausschau, kein Bestand — mitgezaehlt behauptete die Bahn
    // Galaxien, die es nicht gibt.
    const c = buildFirmamentChronicle({
      ...BASE,
      nodes: [node('freed', 3, 0, 1), node('unlit', 0, 0, 2), node('unlit', 0, 0, 3)],
    })
    expect(c.galaxies).toBe(1)
    expect(c.rescued).toBe(3)
  })

  it('summiert Chimes und Zeit ueber ALLE Besuche eines Universums', () => {
    // Die Galaxien umspannen ohnehin alle Besuche — `completedGalaxies` traegt
    // nur das Universum, nicht den Besuch. Nur den letzten Lauf zu nehmen gaebe
    // eine Bahn, deren Zahlen verschiedene Zeitraeume meinen.
    const c = buildFirmamentChronicle({
      ...BASE,
      nodes: [node('freed', 4, 0, 1)],
      runs: [run(2, 100, 60, 1), run(3, 999, 999, 2), run(2, 400, 240, 3)],
      currentUniverse: 3,
    })
    expect(c.visits).toBe(2)
    expect(c.chimes).toBe(500)
    expect(c.seconds).toBe(300)
  })

  it('legt den laufenden Durchgang auf die vergangenen Besuche derselben Bahn', () => {
    const c = buildFirmamentChronicle({
      ...BASE,
      nodes: [node('current', 1, 0, 1)],
      runs: [run(2, 100, 60)],
      liveChimes: 25,
      liveSeconds: 30,
    })
    expect(c.visits).toBe(2)
    expect(c.chimes).toBe(125)
    expect(c.seconds).toBe(90)
  })

  it('meldet eine Bahn ohne Lauf im Archiv als UNBEKANNT, nicht als null', () => {
    // `UNIVERSE_RUN_HISTORY_LIMIT` schiebt alte Laeufe hinaus. Dort ist die
    // Auskunft verloren, nicht null — eine gerechnete 0 waere eine Luege, und
    // das Band schreibt darum „—" mit der Beschriftung „Unrecorded".
    const c = buildFirmamentChronicle({
      ...BASE,
      nodes: [node('freed', 5, 2, 1)],
      universe: 7,
      currentUniverse: 2,
    })
    expect(c.chimes).toBeNull()
    expect(c.seconds).toBeNull()
    // Galaxien und Sterne bleiben ECHT: das Galaxienarchiv wird nie beschnitten.
    expect(c.galaxies).toBe(1)
    expect(c.rescued).toBe(5)
    expect(c.lost).toBe(2)
  })

  it('gibt den Aufbruch NUR auf der laufenden Bahn', () => {
    // Eine vergangene ist aufgebrochen: ihr Fortschritt ist kein Fortschritt
    // mehr, sondern ein Ergebnis. Sonst fuellte die Unterkante einer fremden
    // Bahn mit dem Stand des eigenen Laufs.
    const here = buildFirmamentChronicle({
      ...BASE,
      nodes: [],
      liveChimes: 25,
      liveGoal: 100,
      chimesPerSecond: 5,
    })
    expect(here.departure).toEqual({ raised: 25, goal: 100, percent: 25, etaSeconds: 15 })

    const past = buildFirmamentChronicle({ ...BASE, nodes: [], universe: 1, currentUniverse: 2 })
    expect(past.departure).toBeNull()
  })

  it('klemmt den Fuellstand und nennt den offenen Aufbruch mit null Sekunden', () => {
    // Ueber dem Ziel laeuft die Unterkante sonst aus dem Band; und „ready" ist
    // eine ANDERE Aussage als „keine Produktion" — die erste ist 0, die zweite
    // null.
    const ready = buildFirmamentChronicle({
      ...BASE,
      nodes: [],
      liveChimes: 250,
      liveGoal: 100,
      chimesPerSecond: 5,
    })
    expect(ready.departure?.percent).toBe(100)
    expect(ready.departure?.etaSeconds).toBe(0)

    const stalled = buildFirmamentChronicle({
      ...BASE,
      nodes: [],
      liveChimes: 25,
      liveGoal: 100,
      chimesPerSecond: 0,
    })
    expect(stalled.departure?.etaSeconds).toBeNull()
  })
})
