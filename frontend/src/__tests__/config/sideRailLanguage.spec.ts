import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/*
 * Der Vertrag der Seitenleisten-Sprache: es gibt EINE Gestalt für die rechten
 * Detailleisten der vier Reiter, und sie steht als `.sr-*` in `rpg-theme.css`.
 *
 * Warum das eine Spec braucht: der Vorsatz stand seit jeher im Code — der
 * Kopfkommentar von `StarForgePanel.vue` sagte „a sidebar in this game reads as
 * one kind of place, not one per tab", und `UniverseRail.vue` wiederholte ihn
 * auf Deutsch. Eingelöst war er per Copy-Paste, und genau das ist auseinander-
 * gelaufen:
 *
 *   - VIER Griffe mit 705 Zeilen für dieselbe Gestalt. `PlanetRailHandle` war
 *     eine Zeichen-für-Zeichen-Kopie von `UniverseRailHandle` mit umbenanntem
 *     Klassenpräfix.
 *   - Rollkasten-Polsterung `10/18` gegen `clamp(8px,1vh,14px)` gegen `10/7`
 *     gegen `8/7`, Abstände 13 / clamp / 5 / 5.
 *   - Scrollbars 4 px gegen 6 px.
 *   - `.egr:hover` (0,2,0) schlug `.egr--on` (0,1,0): die GEWÄHLTE Galaxie
 *     verlor ihre Akzentkante, sobald der Zeiger daraufstand. `UniverseRail`
 *     hatte denselben Fehler mit `:not(.is-picked)` behoben und den Grund
 *     auskommentiert — Voyages war nie nachgezogen.
 *   - `--bp-radius` in `PlanetRailSlot.vue` war NIRGENDS definiert; die Kachel
 *     fiel still auf Radius 0 zurück.
 *
 * Keiner dieser Unterschiede war falsch entschieden. Sie sind nebeneinander
 * entstanden, weil nichts sie zusammenhielt.
 *
 * Was diese Spec NICHT kann: eine frei benannte fünfte Leiste fällt durch alle
 * Muster. Sie ist ein Netz gegen das Auseinanderlaufen, kein Beweis.
 */

const SRC = resolve(process.cwd(), 'src')
const THEME = 'assets/rpg-theme.css'

/** Die Leisten und ihre Zeilen. Wer eine fünfte baut, trägt sie hier ein — und
 *  merkt dabei, dass es die Sprache schon gibt. */
const RAIL_FILES = [
  'components/bardProfil/skillTree/StarForgePanel.vue',
  'components/bardProfil/universe/UniverseRail.vue',
  'components/bardProfil/expedition/ExpeditionGalaxyRail.vue',
  'components/bardProfil/expedition/ExpeditionGalaxyRow.vue',
  'components/bardProfil/expedition/ExpeditionLiveRow.vue',
]

/**
 * Teilnehmer an den FARBEN, nicht an der Struktur.
 *
 * Die Planets-Kachel ist ein Grid mit `container-type: size`, sechs Zuständen,
 * einem Karett und einer Akzentkante RECHTS statt links — sie ist keine
 * Listenzeile und trägt `.sr-row` deshalb nicht. Sie skaliert gegen `cqmin`,
 * also gegen ihre eigene Kachelgröße, und braucht dafür ihre `clamp()`-Ketten.
 *
 * Was sie teilt, ist der Farbvorrat: Fläche, Rahmen und Radius kommen aus der
 * Sprache. Genau dafür steht sie hier und nicht in `RAIL_FILES`.
 */
const TINT_FILES = [
  'components/bardProfil/planets/PlanetRailSlot.vue',
  'components/bardProfil/team/TeamSidePanelShell.vue',
  'components/bardProfil/team/SigilDetailsPanel.vue',
]

/** Der EINE Griff. Ihm allein gehört die Gestalt der Kante. */
const HANDLE_FILE = 'components/ui/SideRailHandle.vue'

/** Die vier Reiter. Ihnen allein gehören Lage, Breite, Zone und Fahrt. */
const TAB_FILES = [
  'components/bardProfil/skillTree/SkillTreeComponent.vue',
  'components/bardProfil/expedition/ExpeditionTabComponent.vue',
  'components/bardProfil/universe/UniverseTabComponent.vue',
  'components/bardProfil/planets/PlanetSelectTabComponent.vue',
]

function load(rel: string) {
  return { file: rel, source: readFileSync(join(SRC, rel), 'utf8') }
}

const rails = RAIL_FILES.map(load)
const tinted = TINT_FILES.map(load)

/** CSS- und JS-Kommentare raus, sonst schlägt jede Regex auf der Begründung an,
 *  die erklärt, warum genau das hier NICHT steht. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}
const handle = load(HANDLE_FILE)
const tabs = TAB_FILES.map(load)
const theme = readFileSync(join(SRC, THEME), 'utf8')

/** Der Sektionskommentar ist der Anker — wie bei `hudCardLanguage.spec.ts`. */
const LANG = theme.slice(theme.indexOf('/* ── Seitenleisten-Sprache (.sr-*) ──────────────────────────────────'))

describe('Seitenleisten-Sprache: die Gestalt steht an EINER Stelle', () => {
  it('das Netz ist nicht leer', () => {
    // Ohne das sähe eine kaputte Dateiliste grün aus.
    expect(rails.length).toBeGreaterThanOrEqual(5)
    expect(tinted.length).toBeGreaterThanOrEqual(3)
    for (const { source } of [...rails, ...tinted, handle, ...tabs]) {
      expect(source.length).toBeGreaterThan(200)
    }
  })

  it('die Sprache definiert Fläche, Rand, Zeile und Skala', () => {
    for (const token of [
      '--sr-surface:',
      '--sr-seam:',
      '--sr-handle-bg:',
      '--sr-handle-hover:',
      '--sr-row-bg:',
      '--sr-row-border:',
      '--sr-row-hover-border:',
      '--sr-text:',
      '--sr-text-hi:',
      '--sr-note:',
      '--sr-dim:',
      '--sr-accent:',
      '--sr-accent-hi:',
      '--sr-u-base:',
      '--sr-u:',
      '--sr-handle-u:',
    ]) {
      expect(theme, `${token} fehlt in ${THEME}`).toContain(token)
    }
  })

  it('die Sprache bringt alle Bausteine mit', () => {
    for (const block of [
      '.sr {',
      '.sr--compact {',
      '.sr-scroll {',
      '.sr-row {',
      '.sr-row::before {',
      '.sr-row.is-picked {',
      '.sr-row.is-inert {',
      '.sr-row-body {',
      '.sr-row-name {',
      '.sr-row-note {',
      '.sr-handle {',
      '.sr-handle::after {',
      '.sr-handle-stack {',
      '.sr-handle-word {',
      '.sr-handle-signals {',
      '.sr-handle-count {',
      '.sr-handle-dot {',
    ]) {
      expect(LANG, `${block} fehlt im .sr-*-Abschnitt`).toContain(block)
    }
  })

  it('keine Leiste malt sich ihre Fläche, ihren Rahmen oder ihre Zeile selbst', () => {
    // Die SIGNATUR des Rezepts, nicht jede Kante: Panelgrund, Naht, Zeilenfläche
    // und Zeilenrahmen. Wer eines davon scoped schreibt, hat eine zweite Quelle.
    const OWN_FRAME =
      /background:\s*#111008\b|border-left:\s*2px solid #5c3310\b|background:\s*#1c1c18\b|border:\s*1px solid #32210c\b/i
    const offenders: string[] = []
    for (const { file, source } of rails) {
      const m = code(source).match(OWN_FRAME)
      if (m) offenders.push(`${file}: "${m[0]}" — gehört in ${THEME} als --sr-*`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('es gibt genau EINEN Griff', () => {
    // Das gekippte Wort und seine Schriftskala sind die Signatur des Griffs —
    // wer eines von beidem im Reiter schreibt, hat einen zweiten gebaut.
    const OWN_HANDLE = /writing-mode:\s*vertical-rl|--sr-handle-u\s*:/
    const offenders: string[] = []
    for (const { file, source } of [...rails, ...tabs]) {
      const m = code(source).match(OWN_HANDLE)
      if (m) offenders.push(`${file}: "${m[0]}" — der Griff ist ${HANDLE_FILE}`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('der Griff kennt keine Reiterkonstante', () => {
    // Gemeinsame Gestalt ja, gemeinsame ZAHLEN nein: das eine Wort hat acht
    // Zeichen, das andere zwölf. Jede Zahl kommt als Prop aus dem Reiter.
    expect(handle.source).not.toMatch(/from '@\/config\/constants/)
  })

  it('keine Leiste bringt eine eigene Schriftskala mit', () => {
    // Es gibt EINE `--sr-u` für die Leiste und EINE `--sr-handle-u` für den
    // Griff — die eine misst an der Breite, die andere an der Höhe der Kante.
    // Eine dritte clamp()-Kette daneben ist der Anfang des Auseinanderlaufens.
    const offenders: string[] = []
    for (const { file, source } of [...rails, handle]) {
      if (/font-size:\s*clamp\(/.test(code(source)))
        offenders.push(`${file}: eigene font-size: clamp()`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('keine Leiste malt ihre eigene Scrollbar', () => {
    // `.sr-scroll` bringt sie mit — vier scoped Fassungen waren es vorher,
    // zwei davon mit abweichender Breite.
    const offenders: string[] = []
    for (const { file, source } of rails) {
      if (/::-webkit-scrollbar/.test(code(source))) offenders.push(`${file}: eigene Scrollbar`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('kein Hover färbt die Kante einer gewählten Zeile um', () => {
    // Der Fehler, an dem `.egr--on` gestorben ist: `:hover` hebt die
    // Spezifität, und `.is-picked` danach zu schreiben genügt NICHT.
    const rule = /\.[\w-]+:hover\s*\{[^}]*border-color/g
    const offenders: string[] = []
    for (const { file, source } of rails) {
      for (const m of code(source).match(rule) ?? []) {
        if (!m.includes(':not(')) offenders.push(`${file}: "${m.split('{')[0].trim()}" ohne :not()`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('keine Leiste bekommt ein Kopfband zurück', () => {
    // Zweimal gebaut, zweimal gefallen: es zeigte dasselbe Wort, das senkrecht
    // auf dem Griff steht, ein zweites Mal — für 37,5 bzw. 38 px Höhe.
    const offenders: string[] = []
    for (const { file, source } of rails) {
      if (/border-bottom:\s*3px solid #5c3310/.test(code(source))) {
        offenders.push(`${file}: Kopfband-Streifen — das Wort steht auf dem Griff`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('der Slide wird kein Containing Block für die Hover-Karten', () => {
    // Beides macht das fahrende Element zum Containing Block für
    // `position: fixed` — die Karten teleportieren nach <body> und lägen versetzt.
    const offenders: string[] = []
    for (const { file, source } of tabs) {
      const slide = code(source.slice(source.indexOf('<style')))
      if (/will-change/.test(slide)) offenders.push(`${file}: will-change am Slide`)
      if (/transform:\s*translateX\(0\)/.test(slide)) offenders.push(`${file}: translateX(0)`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('jede Zone klemmt mit clip, nicht mit hidden', () => {
    // `hidden` macht die Zone zum Scrollport: der Skill Tree rutschte damit
    // 448 px seitwärts, sobald etwas darin den Fokus bekam.
    for (const { file, source } of tabs) {
      expect(source, `${file} braucht overflow: clip`).toMatch(/overflow:\s*clip/)
    }
  })

  it('`inert` zieht VERZÖGERT nach, und zwar an EINER Stelle', () => {
    // Synchron gesetzt liegt seine Arbeit im ersten Frame der Fahrt — gemessen
    // 39 gegen 25 ms längster Einzelframe.
    const rail = readFileSync(join(SRC, 'composables/ui/useSideRail.ts'), 'utf8')
    expect(rail).toMatch(/setTimeout/)
    const offenders: string[] = []
    for (const { file, source } of tabs) {
      if (/inertTimer/.test(source)) offenders.push(`${file}: eigener inert-Timer`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('die Farb-Teilnehmer nehmen den Vorrat aus der Sprache', () => {
    // Sie tragen `.sr-row` nicht, aber ihre Flächen sollen nicht als Literal
    // danebenstehen — `PlanetRailSlot` malte hier einen Verlauf, der die
    // Item-Zeilenfarbe nachahmte, und sein eigener Kommentar wünschte sich
    // „keine zweite Farbe, die man synchron halten muss".
    const offenders: string[] = []
    for (const { file, source } of tinted) {
      const body = code(source)
      if (/background:\s*#1c1c18\b/.test(body)) offenders.push(`${file}: rohe Zeilenfläche`)
      if (/border-left:\s*2px solid #5c3310\b/.test(body)) offenders.push(`${file}: rohe Naht`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('die Radien bleiben in festen px und unter der 5-px-Grenze', () => {
    // In `em` risse ein mitwachsender Radius auf 4K genau diese Grenze.
    for (const m of LANG.matchAll(/border-radius:\s*([^;]+);/g)) {
      const value = m[1]
      expect(value, `Radius in em/rem: "${value}"`).not.toMatch(/\d(em|rem)/)
      for (const px of value.matchAll(/([\d.]+)px/g)) {
        expect(Number(px[1]), `Radius ${px[1]}px > 5`).toBeLessThanOrEqual(5)
      }
    }
  })

  it('Bewegung kennt nur billige Eigenschaften', () => {
    for (const m of LANG.matchAll(/transition:\s*([^;]+);/g)) {
      expect(m[1], `Bewegung animiert "${m[1]}"`).not.toMatch(
        /filter|box-shadow|border-color|width|height|\btop\b|\bleft\b/,
      )
    }
  })
})
