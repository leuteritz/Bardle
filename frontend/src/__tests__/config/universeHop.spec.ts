import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  HYPERSPACE_ARRIVAL_HERALD_DELAY_MS,
  UNIVERSE_HOP_EMERGE_MS,
  UNIVERSE_HOP_HUD_IN_DELAY_MS,
  UNIVERSE_HOP_HUD_IN_MS,
  UNIVERSE_HOP_HUD_STAGGER_MS,
  UNIVERSE_HOP_PASSAGE_MS,
  UNIVERSE_HOP_TUNNEL_LEG_MS,
  UNIVERSE_HOP_TUNNEL_TRAIL_FADE,
  UNIVERSE_HOP_EXIT_R0_FRAC,
  UNIVERSE_HOP_EXIT_R1_FRAC,
  UNIVERSE_HOP_EXIT_REVEAL_END,
  UNIVERSE_HOP_EXIT_REVEAL_T,
  UNIVERSE_HOP_GROUP_LEAD_FRAC,
  UNIVERSE_HOP_TRAVEL_LEAD,
  UNIVERSE_HOP_EXIT_STRAIGHTEN,
  UNIVERSE_HOP_FOCUS_FRAC_MAX,
  UNIVERSE_HOP_FOCUS_FRAC_MIN,
  UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MAX,
  UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MIN,
  UNIVERSE_HOP_TUNNEL_R_MAX_K,
  UNIVERSE_HOP_TUNNEL_R_MIN_FRAC,
  UNIVERSE_HOP_WALL_ALPHA_FAR,
  UNIVERSE_HOP_WALL_ALPHA_NEAR,
  UNIVERSE_HOP_WASH_MS,
  UNIVERSE_HOP_WASH_PEAK,
  UNIVERSE_HOP_DEPART_MS,
  UNIVERSE_HOP_GATE_LIFT_MS,
  UNIVERSE_HOP_SPEED_PEAK,
  WARP_SPEED_PEAK,
  WARP_SURGE_PEAK,
  WARP_TRAIL_FADE,
} from '@/config/constants'
import { UNIVERSE_HOP_COMMIT_AT_MS, UNIVERSE_HOP_TOTAL_MS } from '@/utils/orbit/universeHop'

/**
 * Der Universumssprung — „Through the Gate".
 *
 * Er faehrt auf dem Sternfeld-Canvas; was hier im DOM animiert, laeuft am
 * Compositor, sonst stuende es im Reset-Frame still. Eine Uhr: die Schleife.
 */
const FILES = {
  veil: 'components/idle/prestige/UniverseHopVeil.vue',
  portal: 'components/bardProfil/universe/UniversePortal.vue',
  app: 'App.vue',
  game: 'stores/core/gameStore.ts',
  machine: 'utils/orbit/universeHop.ts',
}

function src(rel: string): string {
  return readFileSync(resolve(__dirname, '../..', rel), 'utf8')
}

/** Ohne Kommentare — die nennen die verbotenen Woerter, um sie zu begruenden. */
function code(rel: string): string {
  return src(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('Universumssprung — die Zeremonie', () => {
  it('legt Wash, HUD-Rueckkehr und Herold in ihre Phasen', () => {
    // Der Wash liegt ganz im Durchflug (Peak am Ausgang), die Schweife im Tunnel sind länger als im Warp.
    expect(UNIVERSE_HOP_WASH_MS * UNIVERSE_HOP_WASH_PEAK).toBeLessThan(UNIVERSE_HOP_PASSAGE_MS)
    expect(UNIVERSE_HOP_TUNNEL_TRAIL_FADE).toBeLessThan(WARP_TRAIL_FADE)
    // Überlicht schlägt den Warp; die Beschleunigung überdauert das Heben — sie ist SICHTBAR.
    // Gemessen gegen die SPITZE des Warps, nicht gegen sein Anlaufziel: seit dem
    // Crescendo steigt er im Reiseflug weiter, und der Sprung durch ein ganzes
    // Universum muss der schnellste Flug des Spiels bleiben.
    expect(UNIVERSE_HOP_SPEED_PEAK).toBeGreaterThan(WARP_SPEED_PEAK)
    expect(UNIVERSE_HOP_SPEED_PEAK).toBeGreaterThan(WARP_SURGE_PEAK)
    expect(UNIVERSE_HOP_DEPART_MS).toBeGreaterThan(UNIVERSE_HOP_GATE_LIFT_MS)
    expect(UNIVERSE_HOP_WASH_PEAK).toBeGreaterThan(0)
    expect(UNIVERSE_HOP_WASH_PEAK).toBeLessThan(1)
    expect(UNIVERSE_HOP_HUD_IN_DELAY_MS).toBeLessThan(UNIVERSE_HOP_EMERGE_MS)
    // Der Herold landet im Ausrollen: nach der HUD-Rueckkehr samt Staffelung,
    // vor dem Stillstand.
    const heraldAt = UNIVERSE_HOP_COMMIT_AT_MS + HYPERSPACE_ARRIVAL_HERALD_DELAY_MS
    const emergeStart = UNIVERSE_HOP_TOTAL_MS - UNIVERSE_HOP_EMERGE_MS
    const hudSettled =
      emergeStart +
      UNIVERSE_HOP_HUD_IN_DELAY_MS +
      UNIVERSE_HOP_HUD_IN_MS +
      6 * UNIVERSE_HOP_HUD_STAGGER_MS
    expect(heraldAt).toBeGreaterThan(hudSettled)
    expect(heraldAt).toBeLessThan(UNIVERSE_HOP_TOTAL_MS)
  })

  it('gibt der Wormhole-Reise mindestens zwei Kurven und ein wachsendes Ausgangslicht', () => {
    expect(UNIVERSE_HOP_TUNNEL_LEG_MS * 2).toBeLessThanOrEqual(UNIVERSE_HOP_PASSAGE_MS)
    expect(UNIVERSE_HOP_EXIT_R0_FRAC).toBeLessThan(UNIVERSE_HOP_EXIT_R1_FRAC)
    // Das Ausgangslicht bleibt am Fokus im Bild: Fokusband plus Radius unter der halben kurzen Kante … am Ende darf es überstrahlen.
    expect(UNIVERSE_HOP_FOCUS_FRAC_MAX + UNIVERSE_HOP_EXIT_R0_FRAC).toBeLessThanOrEqual(0.5)
    // Die Tunnel-Kurven sind HÄRTER als der Anflug: der Ausgang darf hinter die Kurve; die
    // Gruppe reitet auf dem Anker, nicht am Ausgang.
    expect(UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MIN).toBeGreaterThanOrEqual(UNIVERSE_HOP_FOCUS_FRAC_MIN)
    expect(UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MAX).toBeGreaterThan(UNIVERSE_HOP_FOCUS_FRAC_MAX)
    // Der Ausgang bleibt klein — kleiner als der Boden des Wegpunkt-Radius.
    expect(UNIVERSE_HOP_EXIT_R0_FRAC).toBeLessThan(UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MIN)
    // Das Ende zeigt sich erst am Ende, und die Kamera folgt dem Spieler (kein Versatz auf die Achse).
    expect(UNIVERSE_HOP_EXIT_REVEAL_T).toBeGreaterThan(0.5)
    expect(UNIVERSE_HOP_EXIT_REVEAL_END).toBeGreaterThan(UNIVERSE_HOP_EXIT_REVEAL_T)
    expect(UNIVERSE_HOP_EXIT_REVEAL_END).toBeLessThan(1)
    expect(UNIVERSE_HOP_GROUP_LEAD_FRAC).toBeLessThan(0.1)
    // Der Fokus ist nur ein Anteil des Kurvenpunkts (Kamera hinter dem Spieler), das Ende steht am Reveal vor ihm.
    expect(UNIVERSE_HOP_TRAVEL_LEAD).toBeLessThan(0.3)
    expect(UNIVERSE_HOP_EXIT_STRAIGHTEN).toBeGreaterThan(0.5)
    expect(UNIVERSE_HOP_EXIT_STRAIGHTEN).toBeLessThan(1)
    // Ein Schlauch, kein Trichter: die nahe Wand steht im Bild, die Ferne läuft auf einen Punkt zu.
    expect(UNIVERSE_HOP_TUNNEL_R_MAX_K).toBeLessThan(1)
    expect(UNIVERSE_HOP_TUNNEL_R_MIN_FRAC).toBeLessThanOrEqual(0.1)
    expect(UNIVERSE_HOP_EXIT_R1_FRAC).toBeLessThan(UNIVERSE_HOP_TUNNEL_R_MAX_K)
    // Die Wand ist ein Trichter: fern hell, nah dunkel — und nie ganz weg.
    expect(UNIVERSE_HOP_WALL_ALPHA_FAR).toBeGreaterThan(UNIVERSE_HOP_WALL_ALPHA_NEAR)
    expect(UNIVERSE_HOP_WALL_ALPHA_NEAR).toBeGreaterThan(0)
  })

  it.each([FILES.veil, FILES.portal])('bewegt in %s nur transform und opacity', (rel) => {
    const text = src(rel)
    const frames = [...text.matchAll(/@keyframes[^{]+\{([\s\S]*?)\n\}/g)]
    expect(frames.length).toBeGreaterThan(0)
    for (const body of frames) {
      const props = [...body[1].matchAll(/^\s{4}([a-z-]+):/gm)].map((m) => m[1])
      expect(props.length).toBeGreaterThan(0)
      for (const p of props) expect(['transform', 'opacity'], `${p} im Keyframe`).toContain(p)
    }
    expect(code(rel).includes('will-change')).toBe(false)
  })

  it('taktet den Schleier mit der Wanduhr, schaltet am animationend und wartet Frames', () => {
    const text = code(FILES.veil)
    expect(text.includes('gameTimeout')).toBe(false)
    expect(text.includes('gameNow')).toBe(false)
    expect(text.includes('@animationend')).toBe(true)
    expect(text.includes('requestAnimationFrame')).toBe(true)
    expect(text.includes('VOYAGE_LOADER_SETTLE_FRAMES')).toBe(true)
    // Das Netz: kommt die Schleife nie an, beendet der Store trotzdem.
    expect(text.includes('finishUniverseHop')).toBe(true)
    expect(text).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('haelt den Store frei von Uhren — die Flanken der Maschine schalten ihn', () => {
    const game = code(FILES.game)
    expect(game.includes('HYPERSPACE_ANIM_')).toBe(false)
    expect(game).toMatch(/travelToUniverse\([\s\S]*?\n {4}\},/)
    const travel = game.slice(
      game.indexOf('travelToUniverse('),
      game.indexOf('commitUniverseHop()'),
    )
    expect(travel.includes('gameTimeout')).toBe(false)
    expect(travel.includes('setTimeout')).toBe(false)
    const machine = code(FILES.machine)
    expect(machine.includes('Date.now')).toBe(false)
    expect(machine.includes('useGameStore')).toBe(false)
  })

  it('nimmt den Schleier von der Pausenregel aus und laesst das alte Overlay nicht zurueck', () => {
    const app = src(FILES.app)
    expect(app.includes('.uhop *')).toBe(true)
    expect(app.includes('hyperspace-overlay')).toBe(false)
    expect(app.includes('HyperspaceOverlay')).toBe(false)
  })

  it('faehrt das HUD nur ueber opacity und translate', () => {
    const app = src(FILES.app)
    const rules = [...app.matchAll(/html\.uhop-hud-(?:out|in)[^{]*\{([\s\S]*?)\n\}/g)]
    expect(rules.length).toBeGreaterThan(2)
    for (const body of rules) {
      const props = [...body[1].matchAll(/^\s{2}([a-z-]+):/gm)].map((m) => m[1])
      for (const p of props) {
        expect(['opacity', 'translate', 'transition', 'pointer-events', '--uhop-d'], p).toContain(p)
      }
    }
  })
})
