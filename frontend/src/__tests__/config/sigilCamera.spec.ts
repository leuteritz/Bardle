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
  SIGIL_DETAILS_LOADER_MIN_MS,
  TEAM_SIGIL_RIDE_MS,
  TEAM_SIGIL_TRAVEL_MS,
} from '@/config/constants'

/*
 * Der Übergang Board ⇄ Detailseite ist EINE Bewegung mit EINER Uhr: die Kamera
 * fährt auf den Rollencluster, und die Schiene bringt zeitgleich das Skelett der
 * Seite mit. Die echte Seite entsteht dahinter und wird aufgedeckt, wenn die
 * Kamera steht.
 *
 * Vorher waren es vier Uhren — Kamera 450, Schiene 280, Rail-Inhalt 300/120,
 * Schleier 320 —, jede an ihrer eigenen Stelle hartkodiert.
 *
 * Diese Spec hält die Beziehungen, nicht die Beträge.
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

describe('Sigil-Kamera — eine Uhr', () => {
  it('Schiene und Ausfahr-Takt sind dieselbe Bewegung', () => {
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

describe('Sigil-Kamera — Fahrt und Skelett laufen zusammen', () => {
  const cam = code(CAMERA)
  const tab = code(TAB)

  it('das Öffnen ist EIN Takt: Kamera und Schiene starten gemeinsam', () => {
    // Das Skelett vertritt die Seite von Anfang an — es gibt nichts, was danach
    // noch hereinfahren müsste.
    const aim = cam.slice(cam.indexOf("phase.value = 'aim'"), cam.indexOf('if (next === null)'))
    expect(aim).toContain('cameraRole.value = next')
    expect(aim).toContain('role.value = next')
    expect(cam).not.toContain("'open'")
  })

  it('jedes Öffnen zieht das Skelett der Schiene auf', () => {
    expect(tab).toMatch(/selectedRole\.value === null && !detailsPending\.value/)
    expect(tab).toMatch(/startDetailsLoad\('rail'\)/)
  })

  it('der Schienen-Schleier unterdrückt die Fahrt NICHT', () => {
    // Er deckt nur die Seite — daneben fährt die Kamera sichtbar.
    expect(tab).toMatch(/covered:[\s\S]{0,140}veilScope\.value !== 'rail'/)
  })

  it('der Schleier steht mindestens so lange wie die Fahrt', () => {
    // Er wird NICHT an transitionend gebunden: die Fahrt laeuft im Kompositor
    // und ist nach TRAVEL_MS sichtbar zu Ende, ihr Ereignis kommt bei
    // blockiertem Hauptthread aber erst danach.
    expect(SIGIL_DETAILS_LOADER_MIN_MS).toBeGreaterThanOrEqual(TEAM_SIGIL_TRAVEL_MS)
  })

  it('der Schleier deckt auf, was er deckt: die fertige Seite', () => {
    expect(tab).toContain('watch([boardBuilt, detailsPending, panelBuilt, panelHeld]')
    expect(tab).toContain('if (held && !ready) return')
  })

  it('die echte Seite entsteht HINTER dem Skelett und erst nach der Fahrt', () => {
    expect(tab).toContain('panelHeld && panelReady && panelArmed')
    expect(tab).toContain("if (phase === 'idle') panelArmed.value = true")
  })

  it('das Schliessen spiegelt: erst die Seite, dann die Kamera', () => {
    const leave = cam.slice(cam.indexOf("phase.value = 'leave'"))
    expect(leave).toContain('role.value = null')
    const home = cam.slice(cam.indexOf("case 'leave':"), cam.indexOf('default:'))
    expect(home).toContain("phase.value = 'home'")
    expect(home).toContain('cameraRole.value = null')
  })

  it('nur Takte, in denen die Bühne fährt, warten auf transitionend', () => {
    // `leave` lässt den Transform unangetastet — dort käme nie eines.
    expect(cam).toMatch(/STAGE_DRIVEN[\s\S]*?'aim'[\s\S]*?'travel'[\s\S]*?'home'/)
    expect(cam).toContain('if (!STAGE_DRIVEN.has(phase.value)) return')
  })

  it('das Board rechnet mit der KAMERA, damit sie nur einmal fährt', () => {
    expect(tab).toMatch(/boardFolded[\s\S]{0,200}cameraRole\.value === null/)
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
