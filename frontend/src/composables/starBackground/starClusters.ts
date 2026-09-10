// Sternenhaufen im Hintergrund — was der Spieler im Flug an Struktur trifft.
// Alles polar um den Fluchtpunkt, auf dem Sternfeld-Canvas, in dessen einer
// Schleife. Zeit ist rAF-Delta, der Zufall wird injiziert.
//
// Ein Haufenstern IST ein gewöhnlicher Stern: Tiefenstufe, Größe und Sprite
// kommen aus derselben Rechnung wie beim freien Feld. Nur sein Ort steht fest
// relativ zum Haufen — als Winkelversatz dA und Radiusverhältnis q. Weil die
// Projektion r ~ 1/Z ist, sind beide über den ganzen Anflug KONSTANT: der
// Haufen klappt von selbst auf, und man fliegt hindurch, ohne dass irgendwo
// ein Aufweitungsfaktor stünde.
import {
  CLUSTER_ALPHA_K,
  CLUSTER_EDGE_FADE_NORM,
  CLUSTER_FADE_IN_SEC,
  CLUSTER_FIRST_DELAY_SEC,
  CLUSTER_GAP_SEC,
  CLUSTER_GAP_SPEED_CAP,
  CLUSTER_HALO_MIN_BRIGHT,
  CLUSTER_KIND_WEIGHTS,
  CLUSTER_MAJOR_COOLDOWN_SEC,
  CLUSTER_MAJOR_KINDS,
  CLUSTER_MAX_MAJOR,
  CLUSTER_MAX_MINOR,
  CLUSTER_SEED_NORM,
  CLUSTER_SHAPES,
  CLUSTER_SIZE_K,
  CLUSTER_TWINKLE_RATE,
  CLUSTER_TWINKLE_STAGGER,
  CLUSTER_VOID_CHANCE,
  CLUSTER_VOID_GAP_SEC,
  ENCOUNTER_CENTER_CLEARANCE_FRAC,
  STAR_BG_FOG_TIERS,
  STAR_SPRITE_HALO_SCALE,
  WARP_SPEED_MAX,
} from '@/config/constants'
import { slipPolar } from '@/utils/orbit/flightField'
import { drawDotSprite, drawStarSprite, starFogTier } from './starSprites'
import { pickClusterStarColor } from './starPalette'

export type ClusterKind = keyof typeof CLUSTER_KIND_WEIGHTS

export interface ClusterFrame {
  w: number
  h: number
  cx: number
  cy: number
  maxDist: number
  minEdge: number
  delta: number
  speedMultiplier: number
  slipX: number
  slipY: number
  rollStep: number
}

export interface ClusterMember {
  /** Winkelversatz zum Haufenmittelpunkt (rad) — konstant über den Anflug. */
  dA: number
  /** Radiusverhältnis zum Haufenmittelpunkt — ebenfalls konstant. */
  q: number
  brightness: number
  r: number
  g: number
  b: number
}

export interface Cluster {
  kind: ClusterKind
  major: boolean
  angle: number
  dist: number
  baseSpeed: number
  members: ClusterMember[]
  age: number
  /** Erst weg, wenn auch das innerste Mitglied vorbei ist — sonst ploppt es. */
  retireNorm: number
}

export interface ClusterField {
  list: Cluster[]
  gap: number
  majorCooldown: number
  lastKind: ClusterKind | null
}

const KINDS = Object.keys(CLUSTER_KIND_WEIGHTS) as ClusterKind[]
const MAJOR = new Set<ClusterKind>(CLUSTER_MAJOR_KINDS)
const LAST_TIER = STAR_BG_FOG_TIERS.length - 1

function lerp(lo: number, hi: number, r: number): number {
  return lo + (hi - lo) * r
}

export function createClusterField(firstDelaySec: number): ClusterField {
  return { list: [], gap: firstDelaySec, majorCooldown: 0, lastKind: null }
}

export function firstClusterDelay(rand: () => number): number {
  return lerp(CLUSTER_FIRST_DELAY_SEC[0], CLUSTER_FIRST_DELAY_SEC[1], rand())
}

/** Zweigipflig: ein gleichverteilter Gap erzeugt nie eine gefühlte Leere. */
export function nextClusterGap(rand: () => number): number {
  const span = rand() < CLUSTER_VOID_CHANCE ? CLUSTER_VOID_GAP_SEC : CLUSTER_GAP_SEC
  return lerp(span[0], span[1], rand())
}

/** Summe der Archetyp-Maxima — der Wächter des Punkt-Haushalts. */
export function clusterPointBudget(): number {
  let major = 0
  let minor = 0
  for (const k of KINDS) {
    const max = CLUSTER_SHAPES[k].count[1]
    if (MAJOR.has(k)) major = Math.max(major, max)
    else minor = Math.max(minor, max)
  }
  return CLUSTER_MAX_MAJOR * major + CLUSTER_MAX_MINOR * minor
}

export function pickClusterKind(field: ClusterField, rand: () => number): ClusterKind | null {
  let majors = 0
  let minors = 0
  for (const c of field.list) {
    if (c.major) majors++
    else minors++
  }
  const majorOk = majors < CLUSTER_MAX_MAJOR && field.majorCooldown <= 0
  const minorOk = minors < CLUSTER_MAX_MINOR
  const pool: ClusterKind[] = []
  let total = 0
  for (const k of KINDS) {
    if (k === field.lastKind) continue
    if (MAJOR.has(k) ? !majorOk : !minorOk) continue
    pool.push(k)
    total += CLUSTER_KIND_WEIGHTS[k]
  }
  if (pool.length === 0) return null
  let r = rand() * total
  for (const k of pool) {
    r -= CLUSTER_KIND_WEIGHTS[k]
    if (r <= 0) return k
  }
  return pool[pool.length - 1]
}

/**
 * Baut die Mitglieder. Alle kommen aus EINEM Zufallsstrom — ein Seed je
 * Mitglied kollabiert im LCG und legte alle Punkte fast übereinander.
 */
export function buildMembers(kind: ClusterKind, rand: () => number): ClusterMember[] {
  const shape = CLUSTER_SHAPES[kind]
  const count = Math.round(lerp(shape.count[0], shape.count[1], rand()))
  const tilt = rand() * Math.PI
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)
  const members: ClusterMember[] = []
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const rr = Math.pow(rand(), shape.core)
    const u = Math.cos(a) * rr
    const v = Math.sin(a) * rr
    const [r, g, b] = pickClusterStarColor(kind, rand)
    members.push({
      q: 1 + (u * cos - v * sin) * shape.spanQ,
      dA: (u * sin + v * cos) * shape.spanA,
      brightness: shape.bright[0] + rand() * shape.bright[1],
      r,
      g,
      b,
    })
  }
  return members
}

function retireNormOf(members: readonly ClusterMember[]): number {
  let qMin = 1
  for (const m of members) if (m.q < qMin) qMin = m.q
  return 1 / Math.max(0.05, qMin)
}

export function spawnCluster(
  field: ClusterField,
  kind: ClusterKind,
  frame: ClusterFrame,
  rand: () => number,
  normRange: readonly [number, number] = CLUSTER_SHAPES[kind].spawn,
): Cluster {
  const shape = CLUSTER_SHAPES[kind]
  const members = buildMembers(kind, rand)
  const clearance = ENCOUNTER_CENTER_CLEARANCE_FRAC * frame.minEdge
  const cluster: Cluster = {
    kind,
    major: MAJOR.has(kind),
    angle: rand() * Math.PI * 2,
    dist: Math.max(clearance, frame.maxDist * lerp(normRange[0], normRange[1], rand())),
    baseSpeed: lerp(shape.speed[0], shape.speed[1], rand()),
    members,
    age: 0,
    retireNorm: retireNormOf(members),
  }
  field.list.push(cluster)
  field.lastKind = kind
  if (cluster.major) field.majorCooldown = CLUSTER_MAJOR_COOLDOWN_SEC
  return cluster
}

/** Fester Bestand für die frozen-Instanz (Shop): keine Regie, kein Gap. */
export function seedStaticClusters(
  field: ClusterField,
  count: number,
  frame: ClusterFrame,
  rand: () => number,
): void {
  const kinds: ClusterKind[] = ['knot', 'pair', 'dense']
  const gap = field.gap
  for (let i = 0; i < count; i++) {
    const c = spawnCluster(field, kinds[i % kinds.length], frame, rand, CLUSTER_SEED_NORM)
    c.age = CLUSTER_FADE_IN_SEC
  }
  field.gap = gap
  field.majorCooldown = 0
}

export function stepClusters(
  field: ClusterField,
  frame: ClusterFrame,
  rand: () => number,
  spawnEnabled: boolean,
): void {
  const delta = frame.delta
  // Gap und Cooldown sind beide ABSTANDS-Regeln und zählen deshalb Strecke,
  // nicht Zeit: im Kometenzustand erreicht der Faktor ~8,9, und in Sekunden
  // gezählt leerte sich der Himmel genau dann, wenn man am schnellsten fliegt.
  const step = delta * Math.min(frame.speedMultiplier, CLUSTER_GAP_SPEED_CAP)
  if (field.majorCooldown > 0) field.majorCooldown = Math.max(0, field.majorCooldown - step)
  if (spawnEnabled) {
    field.gap -= step
    if (field.gap <= 0) {
      const kind = pickClusterKind(field, rand)
      if (kind) spawnCluster(field, kind, frame, rand)
      field.gap = kind ? nextClusterGap(rand) : 5
    }
  }
  const slipOn = frame.slipX !== 0 || frame.slipY !== 0 || frame.rollStep !== 0
  for (let i = field.list.length - 1; i >= 0; i--) {
    const c = field.list[i]
    c.age += delta
    const norm = c.dist / frame.maxDist
    c.dist += c.baseSpeed * norm * norm * WARP_SPEED_MAX * frame.speedMultiplier * delta
    if (slipOn) {
      c.angle += frame.rollStep
      const wgt = norm * norm
      slipPolar(c, frame.slipX * wgt, frame.slipY * wgt, Math.cos(c.angle), Math.sin(c.angle))
    }
    if (c.dist > frame.maxDist * c.retireNorm) field.list.splice(i, 1)
  }
}

/** Kameraschwenk nach der Rollenwahl — die Haufen drehen mit dem Feld. */
export function rotateClusters(field: ClusterField, angularDelta: number): void {
  for (const c of field.list) c.angle += angularDelta
}

/** Resize: die Mitglieder halten Verhältnisse, nur der Mittelpunkt wandert. */
export function rescaleClusters(field: ClusterField, k: number): void {
  for (const c of field.list) c.dist *= k
}

export function clearClusters(field: ClusterField): void {
  field.list.length = 0
  field.majorCooldown = 0
  field.lastKind = null
}

export function drawClusters(
  ctx: CanvasRenderingContext2D,
  field: ClusterField,
  frame: ClusterFrame,
  ambientGain: number,
): number {
  if (ambientGain <= 0) return 0
  const { cx, cy, maxDist, w, h } = frame
  let blits = 0
  for (const c of field.list) {
    const cNorm = c.dist / maxDist
    const fade = Math.min(1, c.age / CLUSTER_FADE_IN_SEC) * ambientGain * CLUSTER_ALPHA_K
    if (fade < 0.02) continue
    const phase = c.age * CLUSTER_TWINKLE_RATE
    for (let i = 0; i < c.members.length; i++) {
      const m = c.members[i]
      const mNorm = cNorm * m.q
      if (mNorm <= 0 || mNorm > 1) continue
      const ang = c.angle + m.dA
      const d = mNorm * maxDist
      const x = cx + Math.cos(ang) * d
      const y = cy + Math.sin(ang) * d
      const tier = starFogTier(mNorm)
      const fog = STAR_BG_FOG_TIERS[tier]
      const size = (0.8 + mNorm * mNorm * 5.0) * fog.size * CLUSTER_SIZE_K
      const pad = size * STAR_SPRITE_HALO_SCALE
      if (x < -pad || x > w + pad || y < -pad || y > h + pad) continue
      const edge =
        mNorm > CLUSTER_EDGE_FADE_NORM
          ? 1 - (mNorm - CLUSTER_EDGE_FADE_NORM) / (1 - CLUSTER_EDGE_FADE_NORM)
          : 1
      const twinkle = 0.75 + 0.25 * Math.sin(phase + i * CLUSTER_TWINKLE_STAGGER)
      const alpha = fade * edge * fog.alpha * m.brightness * twinkle
      if (alpha < 0.02) continue
      if (m.brightness > CLUSTER_HALO_MIN_BRIGHT && tier === LAST_TIER) {
        drawStarSprite(ctx, m.r, m.g, m.b, x, y, size, alpha, tier)
      } else {
        drawDotSprite(ctx, m.r, m.g, m.b, x, y, size, alpha)
      }
      blits++
    }
  }
  ctx.globalAlpha = 1
  return blits
}
