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
  UNIVERSE_HOP_TUNNEL_TRAIL_FADE,
  UNIVERSE_HOP_WASH_MS,
  UNIVERSE_HOP_WASH_PEAK,
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
  portal: 'components/bardProfil/firmament/FirmamentPortal.vue',
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
    expect(UNIVERSE_HOP_WASH_PEAK).toBeGreaterThan(0)
    expect(UNIVERSE_HOP_WASH_PEAK).toBeLessThan(1)
    expect(UNIVERSE_HOP_HUD_IN_DELAY_MS).toBeLessThan(UNIVERSE_HOP_EMERGE_MS)
    // Der Herold landet im Ausrollen: nach der HUD-Rueckkehr samt Staffelung,
    // vor dem Stillstand.
    const heraldAt = UNIVERSE_HOP_COMMIT_AT_MS + HYPERSPACE_ARRIVAL_HERALD_DELAY_MS
    const emergeStart = UNIVERSE_HOP_TOTAL_MS - UNIVERSE_HOP_EMERGE_MS
    const hudSettled =
      emergeStart + UNIVERSE_HOP_HUD_IN_DELAY_MS + UNIVERSE_HOP_HUD_IN_MS + 6 * UNIVERSE_HOP_HUD_STAGGER_MS
    expect(heraldAt).toBeGreaterThan(hudSettled)
    expect(heraldAt).toBeLessThan(UNIVERSE_HOP_TOTAL_MS)
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
    const travel = game.slice(game.indexOf('travelToUniverse('), game.indexOf('commitUniverseHop()'))
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
