import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/*
 * Der Vertrag der HUD-Kartensprache: es gibt EINE Gestalt für die sechs Karten
 * der Spalte oben links, und sie steht als `.hc-*` in `rpg-theme.css`.
 *
 * Warum das eine Spec braucht: das Flächenrezept stand sechsmal wörtlich im
 * scoped CSS, und vier Stellen waren schon auseinandergelaufen — zwei
 * Außenschatten (`6px 18px/.8` gegen `8px 24px/.85`), drei Polsterungen, vier
 * Abstände und `transition: top` bei zwei von sechs. Keine davon war falsch;
 * sie sind nur nebeneinander entstanden, weil nichts sie zusammenhielt.
 *
 * Dazu die zweite Duplikation: jede Karte rechnete ihr `top` aus einer
 * `max()`-Kette über die Unterkanten ALLER Vorgänger und wiederholte sie im
 * 2400er Media-Block. Ihre Kürzung ist zweimal als Bug aufgeschlagen.
 *
 * Was diese Spec NICHT kann: eine frei benannte neue Karte fällt durch alle
 * Muster. Sie ist ein Netz gegen das Auseinanderlaufen, kein Beweis.
 */

const SRC = resolve(process.cwd(), 'src')
const THEME = 'assets/rpg-theme.css'

/** Die sechs Karten plus die gefaltete Zeile — sie alle tragen `.hc`. */
const CARD_FILES = [
  'components/idle/mission/WayfinderHudCard.vue',
  'components/idle/landfall/LandfallHudCard.vue',
  'components/idle/drifter/DrifterInfoCard.vue',
  'components/idle/void/VoidRiftHudCard.vue',
  'components/idle/omen/OmenHudCard.vue',
  'components/augment/AugmentAutoPickToast.vue',
  'components/idle/hud/HudCardFoldedRow.vue',
]

/** Der Container. Ihm allein gehören Lage, Breite und Ebene. */
const COLUMN_FILE = 'components/idle/hud/HudCardColumn.vue'

function load(rel: string) {
  return { file: rel, source: readFileSync(join(SRC, rel), 'utf8') }
}

const cards = CARD_FILES.map(load)
const column = load(COLUMN_FILE)
const theme = readFileSync(join(SRC, THEME), 'utf8')

describe('HUD-Kartensprache: die Gestalt steht an EINER Stelle', () => {
  it('die Sprache definiert Fläche, Rand, Schatten und Skala', () => {
    for (const token of [
      '--hc-surface:',
      '--hc-border:',
      '--hc-inner:',
      '--hc-shadow:',
      '--hc-text:',
      '--hc-dim:',
      '--hc-mute:',
      '--hc-u-base:',
      '--hc-u:',
    ]) {
      expect(theme, `${token} fehlt in ${THEME}`).toContain(token)
    }
  })

  it('die Bausteine stehen alle in der Sprache', () => {
    for (const cls of [
      '.hc {',
      '.hc.hc--folded {',
      '.hc.hc--anchored {',
      '.hc-head {',
      '.hc-glyph {',
      '.hc-label {',
      '.hc-title {',
      '.hc-clock {',
      '.hc-mark {',
      '.hc-stage {',
      '.hc-body {',
      '.hc-name {',
      '.hc-effect {',
      '.hc-read {',
      '.hc-gauge {',
      '.hc-bar {',
      '.hc-fill {',
      '.hc-offers {',
      '.hc-fold-name {',
      '.hc-line {',
    ]) {
      expect(theme, `${cls} fehlt in ${THEME}`).toContain(cls)
    }
  })

  it('keine Karte malt ihre Fläche, ihren Rahmen oder ihren Schatten selbst', () => {
    /* Die Signatur des Rezepts, das sechsmal dastand. Getroffen wird die
       Kombination aus Kopfflaeche, 2-px-Holzrahmen und dem Innenschatten — im
       Inneren eines Panels wäre eine 1-px-Kante völlig in Ordnung. */
    const OWN_SURFACE =
      /background:\s*var\(--rpg-bg-header\)|border:\s*2px solid var\(--rpg-wood\)|inset 0 0 0 1px var\(--rpg-wood-inner\)|box-shadow:[^;]*0 [68]px (?:18|24)px rgba\(0, 0, 0, 0\.8/
    const offenders: string[] = []
    for (const { file, source } of cards) {
      const m = source.match(OWN_SURFACE)
      if (m) offenders.push(`${file}: "${m[0]}" — gehört in ${THEME} als .hc`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('keine Karte bestimmt ihre eigene Lage, Breite oder Ebene — das tut der Container', () => {
    const OWN_PLACEMENT = /position:\s*fixed|var\(--hud-col-w\)|var\(--hud-col-edge\)|z-index:/
    const offenders: string[] = []
    for (const { file, source } of cards) {
      const m = source.match(OWN_PLACEMENT)
      if (m) offenders.push(`${file}: "${m[0]}" — gehört in ${COLUMN_FILE}`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('die max()-Stapelkette ist weg — und zwar aus dem GANZEN Repo', () => {
    /* Sie stand sechsmal plus fünfmal in Media-Queries und ist zweimal als Bug
       aufgeschlagen: eine gekürzte Kette rutscht unter eine sichtbare Karte,
       sobald das dazwischenliegende Glied fehlt. Die Stapelung macht jetzt Flex.
       Nur `--wayfinder-bottom` bleibt, weil die HUD-Kontur daran klemmt. */
    const DEAD = ['--autopick-bottom', '--void-card-bottom', '--omen-card-bottom', '--landfall-card-bottom']
    const offenders: string[] = []
    for (const { file, source } of [...cards, column]) {
      for (const name of DEAD) {
        if (source.includes(name)) offenders.push(`${file}: ${name} lebt noch`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('keine Karte animiert mehr ihre eigene Lage', () => {
    /* Vorher hatten zwei von sechs eine `transition: top`, die anderen vier
       sprangen. Das Nachrücken macht jetzt der FLIP der TransitionGroup. */
    const offenders = cards
      .filter(({ source }) => /transition:\s*top\b/.test(source))
      .map(({ file }) => `${file}: transition auf top — das macht .hc-move`)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('keine Karte setzt eine eigene Schriftskala — es gibt --hc-u', () => {
    const offenders = cards
      .filter(({ source }) => /font-size:\s*clamp\(/.test(source))
      .map(({ file }) => `${file}: eigene clamp()-Skala statt var(--hc-u)`)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('jede Karte trägt die Basisklasse', () => {
    const offenders = cards
      .filter(({ source }) => !/class="hc\b/.test(source))
      .map(({ file }) => `${file}: die Wurzel trägt kein class="hc …"`)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('nur der Wayfinder speist die HUD-Kontur', () => {
    /* Die vier flüchtigen Karten aufzunehmen hiesse, das freie Feld im
       Sekundentakt zu verschieben: ein Drifter, der seine Bahn geplant hat,
       müsste sie mitten im Flug aufgeben, weil ein Vorzeichen erschienen ist. */
    const feeding = cards.filter(({ source }) => source.includes('--wayfinder-bottom'))
    expect(feeding.map((f) => f.file)).toEqual(['components/idle/mission/WayfinderHudCard.vue'])
    expect(feeding[0].source).toContain('invalidateHudField')
  })

  it('der Wayfinder hängt nicht an den Dichtestufen', () => {
    /* Er ist das einzige Element der Spalte in der HUD-Kontur. Wüchse er mit,
       sobald eine zweite Karte auftaucht, verschöbe sich das freie Feld jedes
       Mal — genau das, wogegen „HUD-Freiraum" geschrieben ist. */
    const wf = cards.find((c) => c.file.includes('WayfinderHudCard'))!
    expect(wf.source).toContain('hc--anchored')
  })

  it('der Container bestimmt Lage und Breite — genau einmal', () => {
    expect(column.source).toContain('position: fixed')
    expect(column.source).toContain('var(--hud-col-w)')
    expect(column.source).toContain('var(--hud-col-edge)')
    // Und er lässt seine Lücken durch, sonst fingen sie Klicks der Bühne ab.
    expect(column.source).toContain('pointer-events: none')
  })

  it('die Radien bleiben in der 4–5px-Grenze, auch auf 4K', () => {
    /* `em` würde den Radius mit der Auflösung wachsen lassen und die Regel aus
       CLAUDE.md reissen — Rahmenstärken und Radien sind Designkonstanten. */
    const lang = theme.slice(theme.indexOf('/* ── HUD-Kartensprache'))
    expect(lang.length).toBeGreaterThan(500)
    const radii = [...lang.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim())
    expect(radii.length).toBeGreaterThan(0)
    for (const r of radii) {
      expect(r, `border-radius "${r}" skaliert mit der Schrift`).not.toMatch(/\d(em|rem)/)
      for (const px of r.match(/(\d+)px/g) ?? []) {
        expect(Number.parseInt(px, 10), `border-radius "${r}" reisst die 4–5-px-Grenze`).toBeLessThanOrEqual(5)
      }
    }
  })

  it('die Bewegung der Spalte kennt nur transform und opacity', () => {
    /* Performance-Regel 2: kein `filter`, kein `box-shadow`, keine
       `border-color` in einer laufenden Animation. */
    const lang = theme.slice(theme.indexOf('/* ── Bewegung ─'))
    const props = [...lang.matchAll(/transition:\s*([^;]+);/g)].map((m) => m[1])
    for (const p of props) {
      expect(p, `Bewegung animiert "${p}"`).not.toMatch(
        /filter|box-shadow|border-color|width|height|\btop\b|\bleft\b/,
      )
    }
  })
})
