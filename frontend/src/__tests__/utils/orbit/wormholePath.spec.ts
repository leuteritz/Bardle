import { describe, expect, it } from 'vitest'
import {
  UNIVERSE_HOP_CAM_BACK,
  UNIVERSE_HOP_CAM_LOOK_AT,
  UNIVERSE_HOP_TUNNEL_BANK_MAX_RAD,
  UNIVERSE_HOP_TUNNEL_ENTRY_LEG,
  UNIVERSE_HOP_TUNNEL_EXIT_LEG,
  UNIVERSE_HOP_TUNNEL_LEG_MAX,
  UNIVERSE_HOP_TUNNEL_LEG_MIN,
  UNIVERSE_HOP_TUNNEL_NEAR,
  UNIVERSE_HOP_TUNNEL_SIGHT,
  UNIVERSE_HOP_TUNNEL_SLICES,
  UNIVERSE_HOP_TUNNEL_TURNS_MAX,
  UNIVERSE_HOP_TUNNEL_TURNS_MIN,
  UNIVERSE_HOP_WALL_ALPHA_FAR,
  UNIVERSE_HOP_WALL_ALPHA_NEAR,
  UNIVERSE_HOP_WALL_FOG_END,
} from '@/config/constants'
import {
  buildWormholePath,
  createPathFrame,
  createWormholeView,
  projectWormholeView,
  rollWormholeTurns,
  samplePath,
  sliceDepthAt,
  wallFogAt,
  WORMHOLE_ARC_LEN,
  type PathFrame,
} from '@/utils/orbit/wormholePath'

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function f(fr: PathFrame): [number, number, number] {
  return [fr.fx, fr.fy, fr.fz]
}
function u(fr: PathFrame): [number, number, number] {
  return [fr.ux, fr.uy, fr.uz]
}
function r(fr: PathFrame): [number, number, number] {
  return [fr.rx, fr.ry, fr.rz]
}

describe('wormholePath — die Bahn', () => {
  it('würfelt 3 … 4 Ecken, nie zweimal dieselbe, je Sprung mindestens eine Yaw und eine Pitch', () => {
    const counts = new Set<number>()
    for (let i = 0; i < 300; i++) {
      const dirs = rollWormholeTurns(seeded(Math.imul(i + 1, 2654435761) >>> 0))
      counts.add(dirs.length)
      expect(dirs.length).toBeGreaterThanOrEqual(UNIVERSE_HOP_TUNNEL_TURNS_MIN)
      expect(dirs.length).toBeLessThanOrEqual(UNIVERSE_HOP_TUNNEL_TURNS_MAX)
      for (let k = 1; k < dirs.length; k++) expect(dirs[k]).not.toBe(dirs[k - 1])
      expect(dirs.some((d) => d < 2)).toBe(true)
      expect(dirs.some((d) => d >= 2)).toBe(true)
    }
    expect(counts).toEqual(new Set([UNIVERSE_HOP_TUNNEL_TURNS_MIN, UNIVERSE_HOP_TUNNEL_TURNS_MAX]))
  })

  it('setzt Geraden und Viertelkreise lückenlos aneinander; die letzte Gerade ist die längste', () => {
    for (let i = 0; i < 40; i++) {
      const path = buildWormholePath(seeded(i + 7))
      expect(path.segs[0]!.len).toBe(UNIVERSE_HOP_TUNNEL_ENTRY_LEG)
      let s = 0
      for (const seg of path.segs) {
        expect(seg.s0).toBeCloseTo(s, 9)
        if (seg.yaw !== 0 || seg.pitch !== 0) expect(seg.len).toBeCloseTo(WORMHOLE_ARC_LEN, 9)
        s += seg.len
      }
      expect(path.length).toBeCloseTo(s, 9)
      const lastSeg = path.segs[path.segs.length - 1]!
      expect(lastSeg.yaw).toBe(0)
      expect(lastSeg.pitch).toBe(0)
      expect(lastSeg.len).toBe(UNIVERSE_HOP_TUNNEL_EXIT_LEG)
      expect(path.lastArcEnd).toBeCloseTo(lastSeg.s0, 9)
      const legs = path.segs.filter((g) => g.yaw === 0 && g.pitch === 0).slice(1, -1)
      for (const leg of legs) {
        expect(leg.len).toBeGreaterThanOrEqual(UNIVERSE_HOP_TUNNEL_LEG_MIN)
        expect(leg.len).toBeLessThanOrEqual(UNIVERSE_HOP_TUNNEL_LEG_MAX)
      }
      expect(UNIVERSE_HOP_TUNNEL_EXIT_LEG).toBeGreaterThan(UNIVERSE_HOP_TUNNEL_LEG_MAX)
    }
  })

  it('hält das Dreibein orthonormal und stetig über die ganze Bahn; jede Ecke dreht genau 90°', () => {
    const path = buildWormholePath(seeded(11))
    const a = createPathFrame()
    const b = createPathFrame()
    const step = 0.05
    for (let s = -UNIVERSE_HOP_CAM_BACK; s + step <= path.length; s += step) {
      samplePath(path, s, a)
      samplePath(path, s + step, b)
      expect(Math.hypot(...f(a))).toBeCloseTo(1, 9)
      expect(Math.hypot(...u(a))).toBeCloseTo(1, 9)
      expect(Math.hypot(...r(a))).toBeCloseTo(1, 9)
      expect(dot(f(a), u(a))).toBeCloseTo(0, 9)
      expect(dot(f(a), r(a))).toBeCloseTo(0, 9)
      expect(dot(u(a), r(a))).toBeCloseTo(0, 9)
      // Bogenlänge stimmt: der Schritt auf der Bahn ist der Schritt im Raum (Kreis: Sehne ≤ Bogen).
      const d = Math.hypot(b.px - a.px, b.py - a.py, b.pz - a.pz)
      expect(d).toBeLessThanOrEqual(step + 1e-9)
      expect(d).toBeGreaterThan(step * 0.99)
      expect(dot(f(a), f(b))).toBeGreaterThan(0.999)
    }
    for (const seg of path.segs) {
      if (seg.yaw === 0 && seg.pitch === 0) continue
      samplePath(path, seg.s0, a)
      samplePath(path, seg.s0 + seg.len, b)
      expect(dot(f(a), f(b))).toBeCloseTo(0, 9)
      // Yaw dreht um up (up bleibt), Pitch um right (right bleibt).
      if (seg.yaw !== 0) expect(dot(u(a), u(b))).toBeCloseTo(1, 9)
      else expect(dot(r(a), r(b))).toBeCloseTo(1, 9)
    }
  })

  it('staffelt die Scheiben exponentiell von NEAR bis SIGHT und nebelt die Ferne ein', () => {
    expect(sliceDepthAt(0)).toBeCloseTo(UNIVERSE_HOP_TUNNEL_NEAR, 9)
    expect(sliceDepthAt(1)).toBeCloseTo(UNIVERSE_HOP_TUNNEL_SIGHT, 9)
    expect(sliceDepthAt(0.5)).toBeLessThan(
      (UNIVERSE_HOP_TUNNEL_NEAR + UNIVERSE_HOP_TUNNEL_SIGHT) / 2,
    )
    expect(wallFogAt(0)).toBeCloseTo(UNIVERSE_HOP_WALL_ALPHA_NEAR, 9)
    expect(wallFogAt(1)).toBeCloseTo(UNIVERSE_HOP_WALL_ALPHA_FAR * UNIVERSE_HOP_WALL_FOG_END, 9)
    expect(wallFogAt(0.5)).toBeGreaterThan(wallFogAt(0))
    expect(wallFogAt(0.5)).toBeGreaterThan(wallFogAt(1))
  })
})

describe('wormholePath — die Verfolgerkamera', () => {
  it('hält den Spieler nahe der Mitte — in Yaw-Ecken lehnt er sich zur Innenseite, nie nach aussen', () => {
    expect(UNIVERSE_HOP_CAM_LOOK_AT).toBeLessThan(UNIVERSE_HOP_CAM_BACK)
    for (let i = 0; i < 12; i++) {
      const path = buildWormholePath(seeded(i * 13 + 5))
      const view = createWormholeView()
      let maxOff = 0
      let lastX = 0
      let lastY = 0
      for (let s = 0; s <= path.length; s += 0.05) {
        projectWormholeView(path, s, view)
        maxOff = Math.max(maxOff, Math.abs(view.playerX), Math.abs(view.playerY))
        if (s > 0) {
          expect(Math.abs(view.playerX - lastX)).toBeLessThan(0.02)
          expect(Math.abs(view.playerY - lastY)).toBeLessThan(0.02)
        }
        lastX = view.playerX
        lastY = view.playerY
        // Innenseite: in einer Rechtsecke (yaw +1) steht der Spieler rechts (x > 0), links bei −1;
        // hoch (pitch +1) oben (y < 0 im Bild).
        const seg = path.segs.find((g) => s >= g.s0 && s < g.s0 + g.len)
        if (seg && s > seg.s0 + UNIVERSE_HOP_CAM_BACK && s < seg.s0 + seg.len - 0.5) {
          if (seg.yaw !== 0) expect(Math.sign(view.playerX)).toBe(seg.yaw)
          if (seg.pitch !== 0) expect(Math.sign(view.playerY)).toBe(-seg.pitch)
        }
      }
      // Höchstens ~10 % der Brennweite — die Sonne bleibt in der Mitte.
      expect(maxOff).toBeGreaterThan(0.02)
      expect(maxOff).toBeLessThan(0.1)
    }
  })

  it('zeigt den Ausgang erst hinter der letzten Ecke, am Ende geradeaus', () => {
    for (let i = 0; i < 12; i++) {
      const path = buildWormholePath(seeded(i * 31 + 3))
      const view = createWormholeView()
      let last = 0
      for (let s = 0; s <= path.length; s += 0.05) {
        projectWormholeView(path, s, view)
        const sCam = s - UNIVERSE_HOP_CAM_BACK
        if (sCam <= path.lastArcStart) expect(view.exitVis).toBe(0)
        if (sCam >= path.lastArcEnd) expect(view.exitVis).toBe(1)
        expect(view.exitVis).toBeGreaterThanOrEqual(last)
        last = view.exitVis
      }
      // Am Ende liegt der Ausgang vor der Kamera, in der Mitte, und schaut sie an.
      projectWormholeView(path, path.length, view)
      expect(view.ez).toBeCloseTo(UNIVERSE_HOP_CAM_BACK, 6)
      expect(Math.abs(view.ex / view.ez)).toBeLessThan(0.05)
      expect(Math.abs(view.ey / view.ez)).toBeLessThan(0.05)
      expect(view.etz).toBeGreaterThan(0.99)
      // Vor der ersten Ecke liegt der Ausgang NICHT geradeaus.
      projectWormholeView(path, 0, view)
      expect(Math.abs(view.ex) + Math.abs(view.ey)).toBeGreaterThan(1)
    }
  })

  it('kippt nur in Yaw-Ecken, gedeckelt, und steht auf der Geraden wieder gerade', () => {
    let anyBank = 0
    for (let i = 0; i < 12; i++) {
      const path = buildWormholePath(seeded(i * 17 + 1))
      const view = createWormholeView()
      for (let s = 0; s <= path.length; s += 0.05) {
        projectWormholeView(path, s, view)
        expect(Math.abs(view.bank)).toBeLessThanOrEqual(UNIVERSE_HOP_TUNNEL_BANK_MAX_RAD + 1e-9)
        anyBank = Math.max(anyBank, Math.abs(view.bank))
        const seg = path.segs.find((g) => s >= g.s0 && s < g.s0 + g.len)
        if (seg && seg.pitch !== 0 && s > seg.s0 + UNIVERSE_HOP_CAM_BACK && s < seg.s0 + seg.len)
          expect(Math.abs(view.bank)).toBeLessThan(1e-9)
      }
      expect(Math.abs(view.bank)).toBeLessThan(1e-9)
    }
    expect(anyBank).toBeGreaterThan(UNIVERSE_HOP_TUNNEL_BANK_MAX_RAD * 0.5)
  })

  it('legt die Scheiben vor die Kamera, auf der Geraden zentriert und mit der Tiefe kleiner', () => {
    const path = buildWormholePath(seeded(2))
    const view = createWormholeView()
    projectWormholeView(path, UNIVERSE_HOP_CAM_BACK, view)
    expect(view.n).toBe(UNIVERSE_HOP_TUNNEL_SLICES)
    // Die Tiefe wächst — hinter einer 90°-Ecke steht sie (die Bahn läuft quer), fällt aber nie.
    for (let k = 0; k < view.n; k++) {
      expect(view.cz[k]).toBeGreaterThan(0)
      if (k > 0) expect(view.cz[k]).toBeGreaterThanOrEqual(view.cz[k - 1]! - 1e-9)
      if (k > 0 && view.cz[k]! < UNIVERSE_HOP_TUNNEL_ENTRY_LEG)
        expect(view.cz[k]).toBeGreaterThan(view.cz[k - 1]!)
    }
    // Die nahen Scheiben liegen noch auf der Einstiegsgeraden: mittig, Tangente = Blick.
    expect(Math.abs(view.cx[0]!)).toBeLessThan(0.05)
    expect(Math.abs(view.cy[0]!)).toBeLessThan(0.05)
    expect(view.tz[0]).toBeGreaterThan(0.99)
    // Jenseits des Ausgangs keine Scheibe.
    projectWormholeView(path, path.length, view)
    expect(view.fog[view.n - 1]).toBe(0)
    expect(view.ribN).toBeGreaterThan(0)
  })
})
