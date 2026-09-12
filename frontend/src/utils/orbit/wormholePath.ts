// Die Bahn des Wormholes und die Kamera darauf — rein, kein DOM, kein Store.
//
// Einheit ist der Röhrenradius (R = 1). Die Bahn besteht aus Geraden und
// Viertelkreisen um die eigene Hoch- (Yaw) oder Querachse (Pitch); der Frame
// dreht mit der Ecke — Paralleltransport, nichts verdrillt. Die Kamera fährt
// AUF der Bahn hinter dem Spieler und zielt auf einen Punkt kurz VOR sich
// (LOOK_AT < CAM_BACK): der Spieler lehnt sich so zur Kurveninnenseite. Je
// Frame werden Scheiben, Rippen und Ausgang in den Kameraraum gedreht; die
// Perspektive (÷ z) macht der Painter.
import {
  UNIVERSE_HOP_CAM_BACK,
  UNIVERSE_HOP_CAM_LOOK_AT,
  UNIVERSE_HOP_TUNNEL_BANK_GAIN,
  UNIVERSE_HOP_TUNNEL_BANK_MAX_RAD,
  UNIVERSE_HOP_TUNNEL_ENTRY_LEG,
  UNIVERSE_HOP_TUNNEL_EXIT_LEG,
  UNIVERSE_HOP_TUNNEL_LEG_MAX,
  UNIVERSE_HOP_TUNNEL_LEG_MIN,
  UNIVERSE_HOP_TUNNEL_NEAR,
  UNIVERSE_HOP_TUNNEL_RIB_SPACING,
  UNIVERSE_HOP_TUNNEL_SIGHT,
  UNIVERSE_HOP_TUNNEL_SLICES,
  UNIVERSE_HOP_TUNNEL_TURN_RADIUS,
  UNIVERSE_HOP_TUNNEL_TURNS_MAX,
  UNIVERSE_HOP_TUNNEL_TURNS_MIN,
  UNIVERSE_HOP_WALL_ALPHA_FAR,
  UNIVERSE_HOP_WALL_ALPHA_NEAR,
  UNIVERSE_HOP_WALL_FOG_END,
  UNIVERSE_HOP_WALL_FOG_FROM,
} from '@/config/constants'

/** Ort und Dreibein (forward, up, right) auf der Bahn. */
export interface PathFrame {
  px: number
  py: number
  pz: number
  fx: number
  fy: number
  fz: number
  ux: number
  uy: number
  uz: number
  rx: number
  ry: number
  rz: number
}

export interface WormholeSegment extends PathFrame {
  s0: number
  len: number
  /** ±1: Viertelkreis um `up` (rechts/links); 0 = keine Yaw-Ecke. */
  yaw: number
  /** ±1: Viertelkreis um `right` (hoch/runter); 0 = keine Pitch-Ecke. */
  pitch: number
}

export interface WormholePath {
  segs: WormholeSegment[]
  length: number
  turns: number
  /** Bogenlänge, an der die letzte Ecke beginnt und endet — dahinter liegt die Gerade zum Ausgang. */
  lastArcStart: number
  lastArcEnd: number
  arcLen: number
}

/** Was der Painter je Frame liest — alles im Kameraraum, Einheit R. */
export interface WormholeView {
  n: number
  cx: Float64Array
  cy: Float64Array
  cz: Float64Array
  tx: Float64Array
  ty: Float64Array
  tz: Float64Array
  rx: Float64Array
  ry: Float64Array
  rz: Float64Array
  ux: Float64Array
  uy: Float64Array
  uz: Float64Array
  /** Deckkraft der Wand je Scheibe; 0 = Scheibe hinter der Kamera oder jenseits des Ausgangs. */
  fog: Float64Array
  ribN: number
  ribX: Float64Array
  ribY: Float64Array
  ribZ: Float64Array
  ribTx: Float64Array
  ribTy: Float64Array
  ribTz: Float64Array
  ex: number
  ey: number
  ez: number
  etx: number
  ety: number
  etz: number
  /** 0 … 1: der Ausgang kommt hinter der letzten Ecke in Sicht. */
  exitVis: number
  bank: number
  /** Spieler im Bild, in Einheiten der Brennweite (x/z, −y/z). */
  playerX: number
  playerY: number
}

export const WORMHOLE_ARC_LEN = (UNIVERSE_HOP_TUNNEL_TURN_RADIUS * Math.PI) / 2
export const WORMHOLE_RIB_MAX = Math.ceil(UNIVERSE_HOP_TUNNEL_SIGHT / UNIVERSE_HOP_TUNNEL_RIB_SPACING) + 2
const Z_EPS = 1e-9

export function createPathFrame(): PathFrame {
  return { px: 0, py: 0, pz: 0, fx: 0, fy: 0, fz: 1, ux: 0, uy: 1, uz: 0, rx: 1, ry: 0, rz: 0 }
}

function copyFrame(from: PathFrame, to: PathFrame): void {
  to.px = from.px
  to.py = from.py
  to.pz = from.pz
  to.fx = from.fx
  to.fy = from.fy
  to.fz = from.fz
  to.ux = from.ux
  to.uy = from.uy
  to.uz = from.uz
  to.rx = from.rx
  to.ry = from.ry
  to.rz = from.rz
}

function pushLine(segs: WormholeSegment[], frame: PathFrame, s0: number, len: number): void {
  segs.push({ ...frame, s0, len, yaw: 0, pitch: 0 })
}

function pushArc(
  segs: WormholeSegment[],
  frame: PathFrame,
  s0: number,
  yaw: number,
  pitch: number,
): void {
  segs.push({ ...frame, s0, len: WORMHOLE_ARC_LEN, yaw, pitch })
}

/** Frame auf einem Segment bei lokaler Bogenlänge d (Geraden auch < 0: der Einstieg hinter dem Start). */
function sampleSegment(seg: WormholeSegment, d: number, out: PathFrame): void {
  if (seg.yaw === 0 && seg.pitch === 0) {
    copyFrame(seg, out)
    out.px = seg.px + seg.fx * d
    out.py = seg.py + seg.fy * d
    out.pz = seg.pz + seg.fz * d
    return
  }
  const R = UNIVERSE_HOP_TUNNEL_TURN_RADIUS
  const th = d / R
  const c = Math.cos(th)
  const s = Math.sin(th)
  const sign = seg.yaw !== 0 ? seg.yaw : seg.pitch
  // b = die Achse, in die sich die Tangente dreht (right bei Yaw, up bei Pitch).
  const bx = seg.yaw !== 0 ? seg.rx : seg.ux
  const by = seg.yaw !== 0 ? seg.ry : seg.uy
  const bz = seg.yaw !== 0 ? seg.rz : seg.uz
  const dx = sign * bx
  const dy = sign * by
  const dz = sign * bz
  out.px = seg.px + R * (seg.fx * s + dx * (1 - c))
  out.py = seg.py + R * (seg.fy * s + dy * (1 - c))
  out.pz = seg.pz + R * (seg.fz * s + dz * (1 - c))
  out.fx = seg.fx * c + dx * s
  out.fy = seg.fy * c + dy * s
  out.fz = seg.fz * c + dz * s
  const nbx = bx * c - sign * seg.fx * s
  const nby = by * c - sign * seg.fy * s
  const nbz = bz * c - sign * seg.fz * s
  if (seg.yaw !== 0) {
    out.rx = nbx
    out.ry = nby
    out.rz = nbz
    out.ux = seg.ux
    out.uy = seg.uy
    out.uz = seg.uz
  } else {
    out.ux = nbx
    out.uy = nby
    out.uz = nbz
    out.rx = seg.rx
    out.ry = seg.ry
    out.rz = seg.rz
  }
}

/** Ecken: 0 rechts, 1 links, 2 hoch, 3 runter — nie zweimal dieselbe, je Sprung mindestens eine Yaw UND eine Pitch. */
export function rollWormholeTurns(rand: () => number): number[] {
  const n =
    UNIVERSE_HOP_TUNNEL_TURNS_MIN +
    Math.floor(rand() * (UNIVERSE_HOP_TUNNEL_TURNS_MAX - UNIVERSE_HOP_TUNNEL_TURNS_MIN + 1))
  const dirs: number[] = []
  let prev = -1
  for (let i = 0; i < n; i++) {
    let d = Math.floor(rand() * 3)
    if (prev >= 0 && d >= prev) d++
    dirs.push(d)
    prev = d
  }
  const yaws = dirs.filter((d) => d < 2).length
  if (yaws === 0) dirs[n - 1] = rand() < 0.5 ? 0 : 1
  else if (yaws === n) dirs[n - 1] = rand() < 0.5 ? 2 : 3
  return dirs
}

export function buildWormholePath(rand: () => number): WormholePath {
  const dirs = rollWormholeTurns(rand)
  const segs: WormholeSegment[] = []
  const frame = createPathFrame()
  const next = createPathFrame()
  let s = 0
  pushLine(segs, frame, s, UNIVERSE_HOP_TUNNEL_ENTRY_LEG)
  s += UNIVERSE_HOP_TUNNEL_ENTRY_LEG
  frame.pz += UNIVERSE_HOP_TUNNEL_ENTRY_LEG
  let lastArcStart = 0
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i]!
    const yaw = d === 0 ? 1 : d === 1 ? -1 : 0
    const pitch = d === 2 ? 1 : d === 3 ? -1 : 0
    lastArcStart = s
    pushArc(segs, frame, s, yaw, pitch)
    sampleSegment(segs[segs.length - 1]!, WORMHOLE_ARC_LEN, next)
    copyFrame(next, frame)
    s += WORMHOLE_ARC_LEN
    const leg =
      i === dirs.length - 1
        ? UNIVERSE_HOP_TUNNEL_EXIT_LEG
        : UNIVERSE_HOP_TUNNEL_LEG_MIN +
          rand() * (UNIVERSE_HOP_TUNNEL_LEG_MAX - UNIVERSE_HOP_TUNNEL_LEG_MIN)
    pushLine(segs, frame, s, leg)
    frame.px += frame.fx * leg
    frame.py += frame.fy * leg
    frame.pz += frame.fz * leg
    s += leg
  }
  return {
    segs,
    length: s,
    turns: dirs.length,
    lastArcStart,
    lastArcEnd: lastArcStart + WORMHOLE_ARC_LEN,
    arcLen: WORMHOLE_ARC_LEN,
  }
}

/** Frame bei Bogenlänge s; über das Ende hinaus geklemmt, vor dem Start verlängert die erste Gerade. */
export function samplePath(path: WormholePath, s: number, out: PathFrame): void {
  const sc = s > path.length ? path.length : s
  let seg = path.segs[0]!
  for (let i = 1; i < path.segs.length; i++) {
    const c = path.segs[i]!
    if (sc >= c.s0) seg = c
    else break
  }
  sampleSegment(seg, sc - seg.s0, out)
}

export function createWormholeView(): WormholeView {
  const n = UNIVERSE_HOP_TUNNEL_SLICES
  const m = WORMHOLE_RIB_MAX
  return {
    n,
    cx: new Float64Array(n),
    cy: new Float64Array(n),
    cz: new Float64Array(n),
    tx: new Float64Array(n),
    ty: new Float64Array(n),
    tz: new Float64Array(n),
    rx: new Float64Array(n),
    ry: new Float64Array(n),
    rz: new Float64Array(n),
    ux: new Float64Array(n),
    uy: new Float64Array(n),
    uz: new Float64Array(n),
    fog: new Float64Array(n),
    ribN: 0,
    ribX: new Float64Array(m),
    ribY: new Float64Array(m),
    ribZ: new Float64Array(m),
    ribTx: new Float64Array(m),
    ribTy: new Float64Array(m),
    ribTz: new Float64Array(m),
    ex: 0,
    ey: 0,
    ez: 0,
    etx: 0,
    ety: 0,
    etz: 0,
    exitVis: 0,
    bank: 0,
    playerX: 0,
    playerY: 0,
  }
}

/** Tiefe der Scheibe k vor der Kamera: exponentiell von NEAR bis SIGHT — dicht nah, dünn fern. */
export function sliceDepthAt(v: number): number {
  const ratio = UNIVERSE_HOP_TUNNEL_SIGHT / UNIVERSE_HOP_TUNNEL_NEAR
  return UNIVERSE_HOP_TUNNEL_NEAR * Math.pow(ratio, v)
}

/** Deckkraft der Wand je Tiefe v (0 nah … 1 fern): nah matt, fern hell, ganz fern Nebel. */
export function wallFogAt(v: number): number {
  const base = UNIVERSE_HOP_WALL_ALPHA_NEAR + (UNIVERSE_HOP_WALL_ALPHA_FAR - UNIVERSE_HOP_WALL_ALPHA_NEAR) * v
  if (v <= UNIVERSE_HOP_WALL_FOG_FROM) return base
  const k = (v - UNIVERSE_HOP_WALL_FOG_FROM) / (1 - UNIVERSE_HOP_WALL_FOG_FROM)
  return base * (1 - (1 - UNIVERSE_HOP_WALL_FOG_END) * k)
}

function smoothstep(v: number): number {
  const t = v < 0 ? 0 : v > 1 ? 1 : v
  return t * t * (3 - 2 * t)
}

// Scratch je Frame — nichts alloziert in der Schleife.
const cam = createPathFrame()
const aim = createPathFrame()
const probe = createPathFrame()
const basis = { rx: 0, ry: 0, rz: 0, ux: 0, uy: 0, uz: 0, fx: 0, fy: 0, fz: 0 }

/**
 * Kamera bei sPlayer − CAM_BACK auf der Bahn, Blick auf sCam + LOOK_AT, Roll (Bank) aus dem
 * Kurs des Spielers gegen die Kamera-Querachse. Schreibt Scheiben, Rippen, Ausgang und den
 * Spieler in den Kameraraum. Reine Funktion der Bahn und von sPlayer — kein Zustand.
 */
export function projectWormholeView(path: WormholePath, sPlayer: number, view: WormholeView): void {
  const sCam = sPlayer - UNIVERSE_HOP_CAM_BACK
  samplePath(path, sCam, cam)
  samplePath(path, sCam + UNIVERSE_HOP_CAM_LOOK_AT, aim)
  let fx = aim.px - cam.px
  let fy = aim.py - cam.py
  let fz = aim.pz - cam.pz
  const fl = Math.hypot(fx, fy, fz) || 1
  fx /= fl
  fy /= fl
  fz /= fl
  // up: das Bahn-up der Kamera, orthogonal zum Blick.
  const du = cam.ux * fx + cam.uy * fy + cam.uz * fz
  let ux = cam.ux - fx * du
  let uy = cam.uy - fy * du
  let uz = cam.uz - fz * du
  const ul = Math.hypot(ux, uy, uz) || 1
  ux /= ul
  uy /= ul
  uz /= ul
  // right = up × forward (Rechtssystem wie das Bahn-Dreibein).
  let rx = uy * fz - uz * fy
  let ry = uz * fx - ux * fz
  let rz = ux * fy - uy * fx
  // Bank: wie stark der Spieler gerade quer zur Kamera fährt — nur Yaw-Ecken kippen.
  samplePath(path, sPlayer, probe)
  const lateral = probe.fx * rx + probe.fy * ry + probe.fz * rz
  const lean = Math.max(-1, Math.min(1, lateral * UNIVERSE_HOP_TUNNEL_BANK_GAIN))
  const bank = lean * UNIVERSE_HOP_TUNNEL_BANK_MAX_RAD
  const cb = Math.cos(bank)
  const sb = Math.sin(bank)
  const bux = ux * cb + rx * sb
  const buy = uy * cb + ry * sb
  const buz = uz * cb + rz * sb
  rx = rx * cb - ux * sb
  ry = ry * cb - uy * sb
  rz = rz * cb - uz * sb
  ux = bux
  uy = buy
  uz = buz
  basis.rx = rx
  basis.ry = ry
  basis.rz = rz
  basis.ux = ux
  basis.uy = uy
  basis.uz = uz
  basis.fx = fx
  basis.fy = fy
  basis.fz = fz
  view.bank = bank
  // Der Spieler im Bild.
  const px = probe.px - cam.px
  const py = probe.py - cam.py
  const pz = probe.pz - cam.pz
  const pzc = px * fx + py * fy + pz * fz
  view.playerX = pzc > Z_EPS ? (px * rx + py * ry + pz * rz) / pzc : 0
  view.playerY = pzc > Z_EPS ? -(px * ux + py * uy + pz * uz) / pzc : 0
  // Scheiben.
  const n = view.n
  const last = n - 1
  for (let k = 0; k < n; k++) {
    const v = k / last
    const s = sCam + sliceDepthAt(v)
    if (s > path.length) {
      view.fog[k] = 0
      view.cz[k] = -1
      continue
    }
    samplePath(path, s, probe)
    toCam(probe, view, k)
    view.fog[k] = wallFogAt(v)
  }
  // Rippen: weltfest alle RIB_SPACING — sie rauschen auf die Kamera zu.
  let rib = 0
  const first = Math.ceil((sCam + UNIVERSE_HOP_TUNNEL_NEAR) / UNIVERSE_HOP_TUNNEL_RIB_SPACING)
  const far = sCam + UNIVERSE_HOP_TUNNEL_SIGHT
  for (let i = first; rib < WORMHOLE_RIB_MAX; i++) {
    const s = i * UNIVERSE_HOP_TUNNEL_RIB_SPACING
    if (s > far || s > path.length) break
    samplePath(path, s, probe)
    const dx = probe.px - cam.px
    const dy = probe.py - cam.py
    const dz = probe.pz - cam.pz
    view.ribX[rib] = dx * rx + dy * ry + dz * rz
    view.ribY[rib] = dx * ux + dy * uy + dz * uz
    view.ribZ[rib] = dx * fx + dy * fy + dz * fz
    view.ribTx[rib] = probe.fx * rx + probe.fy * ry + probe.fz * rz
    view.ribTy[rib] = probe.fx * ux + probe.fy * uy + probe.fz * uz
    view.ribTz[rib] = probe.fx * fx + probe.fy * fy + probe.fz * fz
    rib++
  }
  view.ribN = rib
  // Der Ausgang: das Ende der Bahn, sichtbar erst hinter der letzten Ecke.
  samplePath(path, path.length, probe)
  const dx = probe.px - cam.px
  const dy = probe.py - cam.py
  const dz = probe.pz - cam.pz
  view.ex = dx * rx + dy * ry + dz * rz
  view.ey = dx * ux + dy * uy + dz * uz
  view.ez = dx * fx + dy * fy + dz * fz
  view.etx = probe.fx * rx + probe.fy * ry + probe.fz * rz
  view.ety = probe.fx * ux + probe.fy * uy + probe.fz * uz
  view.etz = probe.fx * fx + probe.fy * fy + probe.fz * fz
  view.exitVis = smoothstep((sCam - path.lastArcStart) / path.arcLen)
}

function toCam(p: PathFrame, view: WormholeView, k: number): void {
  const b = basis
  const dx = p.px - cam.px
  const dy = p.py - cam.py
  const dz = p.pz - cam.pz
  view.cx[k] = dx * b.rx + dy * b.ry + dz * b.rz
  view.cy[k] = dx * b.ux + dy * b.uy + dz * b.uz
  view.cz[k] = dx * b.fx + dy * b.fy + dz * b.fz
  view.tx[k] = p.fx * b.rx + p.fy * b.ry + p.fz * b.rz
  view.ty[k] = p.fx * b.ux + p.fy * b.uy + p.fz * b.uz
  view.tz[k] = p.fx * b.fx + p.fy * b.fy + p.fz * b.fz
  view.rx[k] = p.rx * b.rx + p.ry * b.ry + p.rz * b.rz
  view.ry[k] = p.rx * b.ux + p.ry * b.uy + p.rz * b.uz
  view.rz[k] = p.rx * b.fx + p.ry * b.fy + p.rz * b.fz
  view.ux[k] = p.ux * b.rx + p.uy * b.ry + p.uz * b.rz
  view.uy[k] = p.ux * b.ux + p.uy * b.uy + p.uz * b.uz
  view.uz[k] = p.ux * b.fx + p.uy * b.fy + p.uz * b.fz
}
