import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  SIGIL_ALLY_HOVER_DIM_OPACITY,
  STAR_FIGHT_CAM_EASE_IN,
  STAR_FIGHT_CAM_EASE_OUT,
  TEAM_ROLE_RAIL_SLIDE_MS,
  TEAM_SIGIL_CAM_NET_MUL,
  TEAM_SIGIL_EASE_OPEN,
  TEAM_SIGIL_EASE_TRAVEL,
  TEAM_SIGIL_FLIGHT_DIM_OPACITY,
  TEAM_SIGIL_OPEN_MS,
  TEAM_SIGIL_PANEL_REVEAL_MS,
  TEAM_SIGIL_PANEL_REVEAL_STEP_MS,
  TEAM_SIGIL_PANEL_STAGE_HEAD,
  TEAM_SIGIL_PANEL_STAGE_WORKSPACE,
  TEAM_SIGIL_TRAVEL_MS,
} from '@/config/constants'

/*
 * Der Übergang Board ⇄ Detailseite ist EINE Bewegung mit EINER Uhr. Vorher
 * waren es vier: Kamera 450, Schiene 280, Rail-Inhalt 300/120, Schleier 320 —
 * vier Kurven mit vier Enden, jede an ihrer eigenen Stelle hartkodiert.
 *
 * Diese Spec hält die Beziehungen, nicht die Beträge: wer eine Dauer ändert,
 * darf das tun, aber nicht so, dass das Aufdecken der Seite aus der Fahrt
 * herausfällt oder die Schiene neben der Bühne läuft.
 */

const SRC = resolve(process.cwd(), 'src')
const BOARD = readFileSync(join(SRC, 'components/bardProfil/team/sigil/SigilBoardComponent.vue'), 'utf8')

/** Kommentare raus — sonst schlägt jede Regex auf der Begründung an. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('Sigil-Kamera — zwei Takte, eine Uhr', () => {
  it('Schiene und erster Takt sind dieselbe Bewegung', () => {
    expect(TEAM_ROLE_RAIL_SLIDE_MS).toBe(TEAM_SIGIL_OPEN_MS)
  })

  it('das Netz sitzt hinter der Fahrt, nicht auf ihr', () => {
    // Genau auf der Dauer liefe es mit `transitionend` um die Wette.
    expect(TEAM_SIGIL_CAM_NET_MUL).toBeGreaterThan(1)
  })

  it('die Kurven sind die Kamerakurven des Projekts', () => {
    expect(TEAM_SIGIL_EASE_OPEN).toBe(STAR_FIGHT_CAM_EASE_IN)
    expect(TEAM_SIGIL_EASE_TRAVEL).toBe(STAR_FIGHT_CAM_EASE_OUT)
  })

  it('das Board dimmt mit dem Vokabular, das es schon hat', () => {
    expect(TEAM_SIGIL_FLIGHT_DIM_OPACITY).toBe(SIGIL_ALLY_HOVER_DIM_OPACITY)
  })
})

describe('Sigil-Kamera — das Aufdecken liegt IN der Fahrt', () => {
  const ride = TEAM_SIGIL_OPEN_MS + TEAM_SIGIL_TRAVEL_MS
  /** Drei Schritte: Sitzreihe, linke Spalte, rechte Spalte. */
  const lastReveal = 2 * TEAM_SIGIL_PANEL_REVEAL_STEP_MS + TEAM_SIGIL_PANEL_REVEAL_MS

  it('die letzte Zone ist fertig, bevor die Kamera steht', () => {
    expect(lastReveal).toBeLessThanOrEqual(ride)
  })

  it('das Aufdecken reicht bis in den zweiten Takt', () => {
    // Endete es schon im ersten, sähe der Spieler eine fertige Seite neben
    // einer noch fahrenden Kamera — zwei Bewegungen statt einer.
    expect(lastReveal).toBeGreaterThan(TEAM_SIGIL_OPEN_MS)
  })

  it('zwei Aufbaustufen, lückenlos — die dritte verschöbe die Spalte', () => {
    expect(TEAM_SIGIL_PANEL_STAGE_HEAD).toBe(0)
    expect(TEAM_SIGIL_PANEL_STAGE_WORKSPACE).toBe(TEAM_SIGIL_PANEL_STAGE_HEAD + 1)
  })
})

describe('Sigil-Kamera — die Bühne gehört den Phasenklassen', () => {
  const board = code(BOARD)

  it('keine Dauer steht hartkodiert an der Bühne', () => {
    // `transition: transform 0.45s …` stand hier neben einer Konstante, die
    // niemand importierte.
    const base = board.match(/^.sigil-stage {([^}]*)}/m)
    expect(base, 'die Grundregel der Bühne fehlt').not.toBeNull()
    expect(base![1]).toMatch(/transition:\s*transform v-bind\(/)
    expect(board).not.toMatch(/TEAM_SIGIL_CAMERA_MS/)
  })

  it('der erste Takt hat seine eigene Kurve', () => {
    expect(board).toContain('.sigil-board--open .sigil-stage')
  })

  it('die Hand steht NACH den Phasen — gleiche Spezifität, Reihenfolge zählt', () => {
    const drag = board.indexOf('.sigil-board--dragging .sigil-stage')
    const open = board.indexOf('.sigil-board--open .sigil-stage')
    expect(drag).toBeGreaterThan(-1)
    expect(open).toBeGreaterThan(-1)
    expect(drag).toBeGreaterThan(open)
  })

  it('kein will-change auf der fahrenden Bühne', () => {
    // Es macht sie zum Containing Block für die Hover-Karten und rastert sie
    // dauerhaft — die Bühne steht die meiste Zeit still.
    expect(board).not.toMatch(/will-change/)
  })

  it('die Transform-Liste behält ihre Länge', () => {
    // Wechselt sie zwischen drei und vier Funktionen, fällt Chrome auf
    // Matrix-Interpolation zurück und die Fahrt nimmt einen anderen Weg.
    const translates = board.match(/translate\(\$\{[^}]*\}px, \$\{[^}]*\}px\)/g) ?? []
    expect(translates.length).toBe(2)
  })
})
