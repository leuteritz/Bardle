import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  SIGIL_ALLY_HOVER_DIM_OPACITY,
  STAR_FIGHT_CAM_EASE_OUT,
  TEAM_ROLE_RAIL_SLIDE_MS,
  TEAM_SIGIL_CAM_NET_MUL,
  TEAM_SIGIL_EASE_TRAVEL,
  TEAM_SIGIL_FLIGHT_DIM_OPACITY,
  TEAM_SIGIL_OPEN_MS,
  TEAM_SIGIL_PANEL_REVEAL_MS,
  TEAM_SIGIL_PANEL_REVEAL_STEP_MS,
  TEAM_SIGIL_PANEL_STAGE_HEAD,
  TEAM_SIGIL_PANEL_STAGE_WORKSPACE,
  TEAM_SIGIL_RIDE_MS,
  TEAM_SIGIL_TRAVEL_MS,
} from '@/config/constants'

/*
 * Der Übergang Board ⇄ Detailseite ist EINE Bewegung mit EINER Uhr, und die
 * Kamera fährt zuerst. Vorher waren es vier Uhren: Kamera 450, Schiene 280,
 * Rail-Inhalt 300/120, Schleier 320 — vier Kurven mit vier Enden, jede an ihrer
 * eigenen Stelle hartkodiert.
 *
 * Diese Spec hält die Beziehungen, nicht die Beträge: wer eine Dauer ändert, darf
 * das tun, aber nicht so, dass das Aufdecken der Seite aus der Fahrt herausfällt
 * oder die Schiene neben der Bühne läuft.
 */

const SRC = resolve(process.cwd(), 'src')
const BOARD = readFileSync(
  join(SRC, 'components/bardProfil/team/sigil/SigilBoardComponent.vue'),
  'utf8',
)
const CAMERA = readFileSync(join(SRC, 'composables/ui/useSigilCamera.ts'), 'utf8')
const TAB = readFileSync(join(SRC, 'components/bardProfil/team/TeamTabComponent.vue'), 'utf8')
const LOADER = readFileSync(join(SRC, 'components/bardProfil/team/TeamTabLoader.vue'), 'utf8')

/** Kommentare raus — sonst schlägt jede Regex auf der Begründung an. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('Sigil-Kamera — zwei Takte, eine Uhr', () => {
  it('Schiene und zweiter Takt sind dieselbe Bewegung', () => {
    expect(TEAM_ROLE_RAIL_SLIDE_MS).toBe(TEAM_SIGIL_OPEN_MS)
  })

  it('die Fahrt ist in beide Richtungen gleich lang', () => {
    expect(TEAM_SIGIL_RIDE_MS).toBe(TEAM_SIGIL_OPEN_MS + TEAM_SIGIL_TRAVEL_MS)
  })

  it('das Netz sitzt hinter der Fahrt, nicht auf ihr', () => {
    // Genau auf der Dauer liefe es mit `transitionend` um die Wette.
    expect(TEAM_SIGIL_CAM_NET_MUL).toBeGreaterThan(1)
  })

  it('die Kurve ist die Ankunftskurve des Projekts', () => {
    expect(TEAM_SIGIL_EASE_TRAVEL).toBe(STAR_FIGHT_CAM_EASE_OUT)
  })

  it('das Board dimmt mit dem Vokabular, das es schon hat', () => {
    expect(TEAM_SIGIL_FLIGHT_DIM_OPACITY).toBe(SIGIL_ALLY_HOVER_DIM_OPACITY)
  })
})

describe('Sigil-Kamera — erst die Kamera, dann die Seite', () => {
  const cam = code(CAMERA)

  it('der erste Takt bewegt NUR die Kamera', () => {
    // `role` treibt die Schiene. Stünde es hier, führe sie im selben Takt mit.
    const aim = cam.slice(cam.indexOf("phase.value = 'aim'"), cam.indexOf("if (next === null)"))
    expect(aim).toContain('cameraRole.value = next')
    expect(aim).not.toContain('role.value = next')
  })

  it('der zweite Takt bringt die Seite, ohne die Kamera zu bewegen', () => {
    const open = cam.slice(cam.indexOf("case 'aim':"), cam.indexOf("case 'leave':"))
    expect(open).toContain("phase.value = 'open'")
    expect(open).toContain('role.value = cameraRole.value')
    expect(open).not.toMatch(/cameraRole\.value = (?!cameraRole)/)
  })

  it('das Schliessen spiegelt: erst die Seite, dann die Kamera', () => {
    const leave = cam.slice(cam.indexOf("phase.value = 'leave'"))
    expect(leave).toContain('role.value = null')
    const home = cam.slice(cam.indexOf("case 'leave':"), cam.indexOf('default:'))
    expect(home).toContain("phase.value = 'home'")
    expect(home).toContain('cameraRole.value = null')
  })

  it('nur Takte, in denen die Bühne fährt, warten auf transitionend', () => {
    // `open` und `leave` lassen den Transform unangetastet — dort käme nie eines.
    expect(cam).toMatch(/STAGE_DRIVEN[\s\S]*?'aim'[\s\S]*?'travel'[\s\S]*?'home'/)
    expect(cam).toContain('if (!STAGE_DRIVEN.has(phase.value)) return')
  })

  it('das Board rechnet mit der KAMERA, damit sie nur einmal fährt', () => {
    expect(code(TAB)).toMatch(/boardFolded[\s\S]{0,200}cameraRole\.value === null/)
  })
})

describe('Sigil-Kamera — das Aufdecken liegt IN der Fahrt', () => {
  /** Drei Schritte: Sitzreihe, linke Spalte, rechte Spalte. */
  const lastReveal = 2 * TEAM_SIGIL_PANEL_REVEAL_STEP_MS + TEAM_SIGIL_PANEL_REVEAL_MS

  it('die letzte Zone ist fertig, bevor die Fahrt abgelaufen ist', () => {
    expect(lastReveal).toBeLessThanOrEqual(TEAM_SIGIL_RIDE_MS)
  })

  it('das Aufdecken ist nicht vorbei, bevor die Schiene steht', () => {
    expect(lastReveal).toBeGreaterThanOrEqual(TEAM_SIGIL_OPEN_MS)
  })

  it('zwei Aufbaustufen, lückenlos — die dritte verschöbe die Spalte', () => {
    expect(TEAM_SIGIL_PANEL_STAGE_HEAD).toBe(0)
    expect(TEAM_SIGIL_PANEL_STAGE_WORKSPACE).toBe(TEAM_SIGIL_PANEL_STAGE_HEAD + 1)
  })
})

describe('Sigil-Kamera — die Bühne trägt EINE Fahrt', () => {
  const board = code(BOARD)

  it('keine Dauer steht hartkodiert an der Bühne', () => {
    const base = board.match(/^\.sigil-stage \{([^}]*)\}/m)
    expect(base, 'die Grundregel der Bühne fehlt').not.toBeNull()
    expect(base![1]).toMatch(/transition:\s*transform v-bind\(/)
    expect(board).not.toMatch(/TEAM_SIGIL_CAMERA_MS/)
  })

  it('keine Phasenklasse setzt eine zweite Fahrt daneben', () => {
    expect(board).not.toMatch(/\.sigil-board--\w+ \.sigil-stage \{\s*transition: transform/)
  })

  it('die Hand schlägt die Fahrt — gleiche Spezifität, Reihenfolge zählt', () => {
    const drag = board.indexOf('.sigil-board--dragging .sigil-stage')
    const base = board.indexOf('.sigil-stage {')
    expect(drag).toBeGreaterThan(-1)
    expect(drag).toBeGreaterThan(base)
  })

  it('kein will-change auf der fahrenden Bühne', () => {
    expect(board).not.toMatch(/will-change/)
  })

  it('die Transform-Liste behält ihre Länge', () => {
    // Wechselt sie zwischen drei und vier Funktionen, fällt Chrome auf
    // Matrix-Interpolation zurück und die Fahrt nimmt einen anderen Weg.
    const translates = board.match(/translate\(\$\{[^}]*\}px, \$\{[^}]*\}px\)/g) ?? []
    expect(translates.length).toBe(2)
  })
})

describe('Team-Tab — die Rollenzeile ist entfernt, nicht versteckt', () => {
  it('weder Seite noch Ladeschleier tragen sie noch', () => {
    for (const [name, source] of [
      ['TeamTabComponent', TAB],
      ['TeamTabLoader', LOADER],
    ] as const) {
      expect(source, name).not.toMatch(/team-role-nav|ttl-role-nav/)
      expect(source, name).not.toMatch(/TEAM_ROLE_RAIL_NAV_HEIGHT/)
    }
  })
})
