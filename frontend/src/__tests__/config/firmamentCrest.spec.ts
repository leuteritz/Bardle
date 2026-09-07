import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  BOTTOM_BAR_SIDE_W,
  FIRMAMENT_CREST_BAND_BORDER_B,
  FIRMAMENT_CREST_BAND_H,
  FIRMAMENT_CREST_CELL_RULE,
  FIRMAMENT_CREST_CHIME_ART_PX,
  FIRMAMENT_CREST_EM,
  FIRMAMENT_CREST_ID_GAP,
  FIRMAMENT_CREST_ID_PAD_X,
  FIRMAMENT_CREST_KICKER_ID_CQW,
  FIRMAMENT_CREST_KICKER_ID_MAX_PX,
  FIRMAMENT_CREST_KICKER_ID_MIN_PX,
  FIRMAMENT_CREST_LABEL_CQW,
  FIRMAMENT_CREST_LABEL_EM,
  FIRMAMENT_CREST_LABEL_MAX_PX,
  FIRMAMENT_CREST_LABEL_MIN_PX,
  FIRMAMENT_CREST_LANDFALLS_GATE_W,
  FIRMAMENT_CREST_LINE_BOX,
  FIRMAMENT_CREST_PROV_NAME_PX,
  FIRMAMENT_CREST_READ_GAP_PX,
  FIRMAMENT_CREST_READ_PAD_X,
  FIRMAMENT_CREST_VALUE_CQW,
  FIRMAMENT_CREST_VALUE_MAX_PX,
  FIRMAMENT_CREST_VALUE_MIN_PX,
  UNIVERSE_DISC_CREST_PX,
} from '@/config/constants'
import { formatNumber } from '@/config/ui/numberFormat'
import { buildFirmamentChronicle } from '@/utils/ui/firmamentChronicle'
import type { FirmamentNode } from '@/utils/ui/firmamentLayout'
import type { UniverseRunRecord } from '@/types'

/**
 * Das Kopfband des Firmaments — zwei Zusicherungen, und beide sind schon einmal
 * gebrochen gewesen.
 *
 * DIE ERSTE ist die Bilanz: die Identitaetszone plus JEDE Ablesung muss in das
 * SCHMALSTE Zielband passen. Die Zellen schrumpfen nicht mehr (`flex: 1 0 auto`)
 * — passt die Reihe nicht, laeuft sie an die Bandkante, und eine
 * `scrollWidth`-Pruefung findet das nicht.
 *
 * Zwei Fassungen sind an genau dieser Bilanz gestorben. Die Chimes-Ablesung
 * stand auf 200 px, gerechnet gegen `5.74B / 51.2M` UND gegen einen clamp-Deckel
 * von 34, waehrend der Code auf 38 lief — `285.31B / 51.3B` schob sich in die
 * Nachbarzelle und ueber die rechte Bandkante. Und die Wappenzone stapelte die
 * Vorsehung UNTER die Kennzeile: bei 2560 summierte der Stapel auf 117 px in
 * einer 109-px-Box, und `you are here` verschwand unter `+145%`.
 *
 * Gerechnet wird deshalb gegen GEMESSENE Breiten (`FIRMAMENT_CREST_EM`,
 * `FIRMAMENT_CREST_LABEL_EM`, im Browser aufgenommen), nie gegen einen
 * Beispielwert und nie gegen eine geschaetzte Glyphenbreite: `+250 %` misst
 * 0,64 em je Zeichen, `999.99No` aber 0,57.
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

/** Die fuenf Zielbaender, aus `docs/hud-and-layout.md`. */
const SCREENS: readonly (readonly [number, number])[] = [
  [1536, 864],
  [1920, 1080],
  [1920, 1200],
  [2560, 1440],
  [3840, 2160],
]

/** Die drei Schriftskalen des Bandes, gerechnet wie ihre `clamp()` im CSS —
 *  gegen die BANDbreite, nicht gegen den Viewport. */
const valueAt = (band: number) =>
  clamp(
    FIRMAMENT_CREST_VALUE_MIN_PX,
    (FIRMAMENT_CREST_VALUE_CQW * band) / 100,
    FIRMAMENT_CREST_VALUE_MAX_PX,
  )
const labelAt = (band: number) =>
  clamp(
    FIRMAMENT_CREST_LABEL_MIN_PX,
    (FIRMAMENT_CREST_LABEL_CQW * band) / 100,
    FIRMAMENT_CREST_LABEL_MAX_PX,
  )
const kickerAt = (band: number) =>
  clamp(
    FIRMAMENT_CREST_KICKER_ID_MIN_PX,
    (FIRMAMENT_CREST_KICKER_ID_CQW * band) / 100,
    FIRMAMENT_CREST_KICKER_ID_MAX_PX,
  )

/** Aussenmass EINER Ablesung: der breitere ihrer beiden Zeilen, dazu die
 *  Polsterung beidseitig und die Haarlinie, die sie von der linken Nachbarin
 *  scheidet. */
const cell = (valueW: number, labelW: number) =>
  Math.max(valueW, labelW) + 2 * FIRMAMENT_CREST_READ_PAD_X + FIRMAMENT_CREST_CELL_RULE

/** Was die Reihe auf einem Band dieser Breite WIRKLICH belegt. `prov` waehlt
 *  zwischen den zwei Achsen-Ablesungen der laufenden Bahn und der EINEN breiten
 *  mit dem Vorsehungsnamen — der teurere Fall ist nicht immer derselbe. */
const rowWidth = (band: number, opts: { prov: 'axes' | 'name' }) => {
  const v = valueAt(band)
  const k = labelAt(band)
  const g = kickerAt(band)
  const em = FIRMAMENT_CREST_EM
  const lbl = FIRMAMENT_CREST_LABEL_EM

  const id =
    2 * FIRMAMENT_CREST_ID_PAD_X +
    UNIVERSE_DISC_CREST_PX +
    FIRMAMENT_CREST_ID_GAP +
    Math.max(em.kicker * g, lbl.state * k) +
    FIRMAMENT_CREST_CELL_RULE

  const prov =
    opts.prov === 'axes'
      ? 2 * cell(em.prov * v, lbl.prov * k)
      : cell(em.provName * FIRMAMENT_CREST_PROV_NAME_PX, lbl.provWide * k)

  const chimes = cell(
    FIRMAMENT_CREST_CHIME_ART_PX + FIRMAMENT_CREST_READ_GAP_PX + em.chimes * v,
    lbl.chimes * k,
  )

  const landfalls =
    band >= FIRMAMENT_CREST_LANDFALLS_GATE_W ? cell(em.count * v, lbl.landfalls * k) : 0

  return (
    id +
    prov +
    cell(em.count * v, lbl.galaxies * k) +
    cell(em.stars * v, lbl.stars * k) +
    landfalls +
    chimes +
    cell(em.elapsed * v, lbl.elapsed * k)
  )
}

describe('Firmament-Kopfband — das Breitenbudget', () => {
  it('traegt die Identitaet und JEDE Ablesung in jedem Zielband', () => {
    // Die Zellen schrumpfen nicht (`flex: 1 0 auto`). Passt die Summe nicht,
    // laeuft die Reihe an die Bandkante — genau das tat die alte Fassung mit
    // `285.31B / 51.3B` in einer 200-px-Zelle.
    for (const [vw, vh] of SCREENS) {
      const band = bandWidth(vw, vh)
      for (const prov of ['axes', 'name'] as const) {
        expect(rowWidth(band, { prov }), `${vw}x${vh} · ${prov}`).toBeLessThanOrEqual(band)
      }
    }
  })

  it('traegt die Landfalls-Ablesung genau ab ihrer Schwelle', () => {
    // Sie ist die siebte, und das schmalste Zielband (988) hat ihre 69 px nicht.
    // Die Schwelle muss auf sich selbst passen — sonst waere sie zu frueh.
    const gate = FIRMAMENT_CREST_LANDFALLS_GATE_W
    expect(rowWidth(gate, { prov: 'axes' })).toBeLessThanOrEqual(gate)
    // Und sie muss unter dem Full-HD-Band liegen, sonst faellt die Ablesung auf
    // der Aufloesung weg, fuer die sie gedacht ist.
    expect(gate).toBeLessThanOrEqual(bandWidth(1920, 1080))
    // Unterhalb traegt das schmalste Zielband die uebrigen sechs — mit Reserve.
    expect(rowWidth(bandWidth(1536, 864), { prov: 'axes' })).toBeLessThan(bandWidth(1536, 864))
  })

  it('rechnet die Chimes-Ablesung gegen den MAXIMALFALL von formatNumber', () => {
    // Die alten 200 px standen gegen `5.74B / 51.2M`. Gebunden ist jetzt, was
    // die Funktion hoechstens liefert: acht Zeichen — `999.99No` unter 1e33,
    // darueber `toExponential(2)` („1.23e+45"), ebenfalls acht.
    for (const n of [285.31e9, 5.74e9, 1e21, 999.994e30, 1e33, 9.9e40]) {
      expect(formatNumber(n).length, formatNumber(n)).toBeLessThanOrEqual(8)
    }
    // Und die gemessene Breite gehoert zu genau dieser Zeile, Ziel eingerechnet.
    const v = FIRMAMENT_CREST_VALUE_MAX_PX
    expect(FIRMAMENT_CREST_EM.chimes * v).toBeGreaterThan(FIRMAMENT_CREST_EM.stars * v)
    expect(FIRMAMENT_CREST_EM.chimes * v).toBeGreaterThan(FIRMAMENT_CREST_EM.elapsed * v)
  })

  it('haelt Zahl, Luecke und Beschriftung samt Scheibe unter der Bandhoehe', () => {
    // Die Hoehenbilanz fehlte, und daran starb die alte Wappenzone: Kennzeile
    // UEBER Vorsehung ergab bei 2560 einen 117-px-Stapel in einer 109-px-Box.
    const inner = FIRMAMENT_CREST_BAND_H - FIRMAMENT_CREST_BAND_BORDER_B
    const stack = (value: number) =>
      value + FIRMAMENT_CREST_READ_GAP_PX + FIRMAMENT_CREST_LABEL_MAX_PX * FIRMAMENT_CREST_LINE_BOX
    expect(stack(FIRMAMENT_CREST_VALUE_MAX_PX)).toBeLessThanOrEqual(inner)
    expect(stack(FIRMAMENT_CREST_KICKER_ID_MAX_PX)).toBeLessThanOrEqual(inner)
    expect(UNIVERSE_DISC_CREST_PX).toBeLessThanOrEqual(inner)
    // Die Scheibe bleibt das hoechste Element — sonst triebe der Text die
    // Bandhoehe, und die haengt an der Voyages-Kopfleiste.
    expect(stack(FIRMAMENT_CREST_VALUE_MAX_PX)).toBeLessThan(UNIVERSE_DISC_CREST_PX)
  })

  it('trifft mit der cqw-Skala Boden UND Deckel im Zielband', () => {
    // Auf dem schmalsten Band muss die Zahl auf ihrem Boden stehen — dort ist
    // die Bilanz eng. Spaetestens auf 2K steht sie an ihrem Deckel, sonst
    // wuechse sie auf 4K weiter, wo niemand mehr nachgerechnet hat.
    expect(valueAt(bandWidth(1536, 864))).toBe(FIRMAMENT_CREST_VALUE_MIN_PX)
    expect(valueAt(bandWidth(2560, 1440))).toBe(FIRMAMENT_CREST_VALUE_MAX_PX)
    expect(labelAt(bandWidth(2560, 1440))).toBe(FIRMAMENT_CREST_LABEL_MAX_PX)
    // Die Kennzeile steigt flacher: sie erreicht ihren Deckel erst auf 4K.
    // Sie ist der laengste Text des Bandes und wuerde frueher die Zellen fressen.
    expect(kickerAt(bandWidth(2560, 1440))).toBeGreaterThan(FIRMAMENT_CREST_KICKER_ID_MIN_PX)
    expect(kickerAt(bandWidth(2560, 1440))).toBeLessThan(FIRMAMENT_CREST_KICKER_ID_MAX_PX)
    expect(kickerAt(bandWidth(3840, 2160))).toBe(FIRMAMENT_CREST_KICKER_ID_MAX_PX)
    // Und auf Full HD steht die Zahl UEBER dem alten festen Boden von 26.
    expect(valueAt(bandWidth(1920, 1080))).toBeGreaterThan(26)
  })

  it('laesst das Chime-Artwork die Ablesung nicht hoeher machen', () => {
    // Ueber dem Schriftboden bestimmte das BILD die Zeilenhoehe, und eine
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

describe('Firmament-Kopfband — jede Ablesung steht auf ihrer TINTE', () => {
  // Die Tinte selbst laesst sich hier nicht messen: jsdom hat weder Canvas noch
  // Layout, und `textInkOffset.ts` gibt dort in beiden Messfunktionen 0 zurueck.
  // Gebunden wird deshalb die QUELLE — eine siebte Ablesung, die `v-ink-center.y`
  // vergisst, stuende 1 bis 2 px neben den anderen, und im Bild faellt das erst
  // im Nebeneinander auf.
  const SFC = readFileSync(
    resolve(process.cwd(), 'src/components/bardProfil/firmament/FirmamentCrestBand.vue'),
    'utf8',
  )

  it('haengt v-ink-center.y an jede Zahl und jede Beschriftung', () => {
    // Jedes Vorkommen der beiden Klassen — ausser der Flex-Zeile mit dem
    // Chime-Artwork, wo die Direktive den inneren Textspan traegt: an der Zeile
    // verschoebe sie das BILD mit.
    // `(?=["\s]|--)` haelt `fm-crest-kicker` heraus — es faengt mit derselben
    // Zeichenfolge an wie die Beschriftung.
    for (const m of SFC.matchAll(/<span([^>]*?)class="fm-crest-[vk](?=["\s]|--)[^"]*"/g)) {
      const tag = m[0]
      if (tag.includes('fm-crest-v--art')) continue
      expect(m[1], tag).toContain('v-ink-center.y')
    }
  })

  it('haengt sie bei der Chimes-Ablesung an den inneren Textspan', () => {
    // `.fm-crest-v--art` ist eine Flex-Zeile aus Bild und Zahl. An der Zeile
    // verschoebe die Direktive das Chime-Artwork mit; sie gehoert an die Zahl,
    // und danach sitzen Bild und Zahl auf derselben optischen Mitte.
    const art = SFC.slice(SFC.indexOf('fm-crest-v--art'))
    expect(art.slice(0, art.indexOf('</span'))).toContain('v-ink-center.y')
  })

  it('misst am BAND, nicht am Viewport', () => {
    // `--hud-scale` entkoppelt Viewport und Bandbreite: bei 1536 CSS-px misst
    // das Band 988, bei 1920 aber 1240. Eine `vw`-Skala rechnet an dem Sprung
    // vorbei — sie gab dort 29,2 gegen 36,5 px.
    const style = SFC.slice(SFC.indexOf('<style'))
    expect(style).toContain('container-type: inline-size')
    expect(style).not.toMatch(/[\d.]vw/)
    // Und `.fm-crest` selbst darf kein `cqw` tragen: das loeste gegen den
    // naechsten Vorfahren auf, nicht gegen das Band.
    const own = /\.fm-crest \{([\s\S]*?)\n\}/.exec(style)
    expect(own?.[1]).not.toContain('cqw')
  })

  it('bindet die Landfalls-Schwelle an ihre Konstante', () => {
    // `v-bind` greift in einer `@container`-Praeambel NICHT — die Abfrage
    // matchte still nie. Die Schwelle steht deshalb als Literal, und genau
    // deshalb muss sie hier gebunden sein.
    const style = SFC.slice(SFC.indexOf('<style'))
    expect(style).toContain(`@container (min-width: ${FIRMAMENT_CREST_LANDFALLS_GATE_W}px)`)
  })

  it('holt jedes Mass des BUDGETS aus den Konstanten', () => {
    // Eine Zahl im scoped CSS driftet unbemerkt: die Specs lesen Konstanten,
    // kein DOM. Geprueft sind die Masse, die in der Bilanz stehen — nicht die
    // Roemerzahl-Marke auf der Scheibe, die keine Zeile des Bandes belegt.
    const style = SFC.slice(SFC.indexOf('<style'))
    const budget: readonly (readonly [string, readonly string[]])[] = [
      ['.fm-crest', ['height:']],
      ['.fm-crest-id', ['gap:', 'padding:']],
      ['.fm-crest-kicker', ['gap:']],
      ['.fm-crest-read', ['gap:', 'padding:']],
      ['.fm-crest-v', ['font-size:']],
      ['.fm-crest-v--id', ['font-size:']],
      ['.fm-crest-v--name', ['font-size:']],
      ['.fm-crest-k', ['font-size:']],
      ['.fm-crest-chime', ['width:', 'height:']],
    ]
    for (const [sel, props] of budget) {
      const start = style.indexOf(sel + ' {')
      expect(start, sel).toBeGreaterThanOrEqual(0)
      const body = style.slice(start, style.indexOf('}', start))
      for (const p of props) {
        const at = body.indexOf(p)
        expect(at, sel + ' ' + p).toBeGreaterThanOrEqual(0)
        expect(body.slice(at, body.indexOf(';', at)), sel + ' ' + p).toContain('v-bind')
      }
    }
  })

  it('laesst keine Zelle schrumpfen', () => {
    // Eine Zelle, die schrumpfen darf, schneidet irgendwann ab — und
    // `.fm-crest-k` ist `nowrap` OHNE Ellipse.
    const style = SFC.slice(SFC.indexOf('<style'))
    const read = /\.fm-crest-read \{([\s\S]*?)\n\}/.exec(style)
    expect(read?.[1]).toContain('flex: 1 0 auto')
    const id = /\.fm-crest-id \{([\s\S]*?)\n\}/.exec(style)
    expect(id?.[1]).toContain('flex: 0 0 auto')
  })

  it('laesst die Kennzeile bewusst aus', () => {
    // Der TRAEGER umschliesst zwei Schriftgrade; die Direktive misst mit der
    // Schrift des Elements und laege dort daneben. Seine beiden Spans tragen sie
    // seit dem Umbau sehr wohl — jeder von ihnen ist einschriftig.
    const kicker = SFC.match(/<span[^>]*class="fm-crest-kicker"/)
    expect(kicker?.[0]).not.toContain('v-ink-center')
  })
})

describe('Firmament-Kopfband — die Chronik der gezeigten Bahn', () => {
  it('summiert die Landfalls der Bahn und ueberspringt die unbetretene Galaxie', () => {
    // Dieselbe Zahl, die die Karte als Rauten an ihre Knoten zeichnet — und
    // wie Galaxien und Sterne eine Zahl DIESER Bahn, keine des Spielstands.
    const nodes = [
      { ...node('freed', 3, 0), landfalls: 4 },
      { ...node('current', 1, 1), landfalls: 2 },
      { ...node('unlit', 0, 0), landfalls: 9 },
    ]
    expect(buildFirmamentChronicle({ ...BASE, nodes }).landfalls).toBe(6)
  })

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
