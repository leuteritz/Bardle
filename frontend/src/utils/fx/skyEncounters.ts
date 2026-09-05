// Himmelsbegegnungen — was am Spieler vorbeizieht, während er fliegt. Alles
// polar um den Fluchtpunkt (Parallaxe gratis, Slip und Roll wie die Sterne),
// alles auf dem Sternfeld-Canvas, jeder Körper EINMAL gerastert. Zeit ist
// rAF-Delta; Lebenszyklus-Zufall kommt injiziert, Painter sind Hash-determiniert.
import {
  ENCOUNTER_ANCHOR_DIST,
  ENCOUNTER_ANCHOR_SPEED,
  ENCOUNTER_BAND_HALF_SPREAD_RAD,
  ENCOUNTER_BAND_SPAWN_DIST,
  ENCOUNTER_BAND_WANDER_RAD,
  ENCOUNTER_BINARY_BRIDGE_ALPHA,
  ENCOUNTER_BINARY_PERIOD_SEC,
  ENCOUNTER_BINARY_RGB_A,
  ENCOUNTER_BINARY_RGB_B,
  ENCOUNTER_BINARY_SEP_MAX,
  ENCOUNTER_BINARY_SEP_MIN,
  ENCOUNTER_BINARY_SPRITE_PX,
  ENCOUNTER_CENTER_CLEARANCE_FRAC,
  ENCOUNTER_DUSTLANE_ALPHA,
  ENCOUNTER_DUSTLANE_GLOW_ALPHA,
  ENCOUNTER_DUSTLANE_GLOW_RGB,
  ENCOUNTER_DUSTLANE_RGB,
  ENCOUNTER_DUSTLANE_RX_FRAC,
  ENCOUNTER_DUSTLANE_RY_FRAC,
  ENCOUNTER_DUSTLANE_STAR_RGB,
  ENCOUNTER_DUSTLANE_STARS,
  ENCOUNTER_EVADE_AT,
  ENCOUNTER_FIRST_DELAY_SEC_MAX,
  ENCOUNTER_FIRST_DELAY_SEC_MIN,
  ENCOUNTER_GAP_SEC_MAX,
  ENCOUNTER_GAP_SEC_MIN,
  ENCOUNTER_GIANT_BANDS_MAX,
  ENCOUNTER_GIANT_BANDS_MIN,
  ENCOUNTER_GIANT_PALETTES,
  ENCOUNTER_GIANT_RING_CHANCE,
  ENCOUNTER_GIANT_R_FRAC,
  ENCOUNTER_GIANT_SPAN_K,
  ENCOUNTER_GIANT_SPRITE_PX,
  ENCOUNTER_KIND_WEIGHTS,
  ENCOUNTER_LIFE_SEC,
  ENCOUNTER_MAJOR_COOLDOWN_SEC,
  ENCOUNTER_MAJOR_KINDS,
  ENCOUNTER_MAX_MAJOR,
  ENCOUNTER_MAX_MINOR,
  ENCOUNTER_NOVA_RGB,
  ENCOUNTER_NOVA_RING_ALPHA,
  ENCOUNTER_NOVA_RISE_FRAC,
  ENCOUNTER_NOVA_SCALE_MAX,
  ENCOUNTER_NOVA_SCALE_MIN,
  ENCOUNTER_NOVA_SPRITE_PX,
  ENCOUNTER_PULSAR_BEAM_ALPHA,
  ENCOUNTER_PULSAR_BEAM_FRAC,
  ENCOUNTER_PULSAR_BEAM_POW,
  ENCOUNTER_PULSAR_RGB,
  ENCOUNTER_PULSAR_SPIN_RAD_S,
  ENCOUNTER_PULSAR_SPRITE_PX,
  ENCOUNTER_ROCKS_MAX,
  ENCOUNTER_ROCK_FADE_IN_SEC,
  ENCOUNTER_ROCK_PALETTE,
  ENCOUNTER_ROCK_SEEDS,
  ENCOUNTER_ROCK_SPAWN_PER_SEC,
  ENCOUNTER_ROCK_SPEED_MULT,
  ENCOUNTER_ROCK_TIERS,
  ENCOUNTER_ROCK_TUMBLE_RAD,
  ENCOUNTER_ROCK_WOBBLE,
  ENCOUNTER_SHARDS_MAX,
  ENCOUNTER_SHARD_ALPHA,
  ENCOUNTER_SHARD_ASPECT,
  ENCOUNTER_SHARD_EVADE_STRENGTH,
  ENCOUNTER_SHARD_HALF_SPREAD_RAD,
  ENCOUNTER_SHARD_PALETTE,
  ENCOUNTER_SHARD_SEEDS,
  ENCOUNTER_SHARD_SPAWN_PER_SEC,
  ENCOUNTER_SHARD_TIERS,
  ENCOUNTER_SHOWER_ALPHA,
  ENCOUNTER_SHOWER_LEN_MAX,
  ENCOUNTER_SHOWER_LEN_MIN,
  ENCOUNTER_SHOWER_LIFE_SEC_MAX,
  ENCOUNTER_SHOWER_LIFE_SEC_MIN,
  ENCOUNTER_SHOWER_SPAWN_PER_SEC_MAX,
  ENCOUNTER_SHOWER_SPAWN_PER_SEC_MIN,
  ENCOUNTER_SHOWER_SPEED_MAX,
  ENCOUNTER_SHOWER_SPEED_MIN,
  ENCOUNTER_SHOWER_STREAKS_MAX,
  ENCOUNTER_SHOWER_WIDTH,
  ENCOUNTER_SPRITE_CACHE_MAX,
  HELM_TRAVEL_GAP_SCALE,
  STAR_BG_BASE_SPEED_MIN,
  STAR_BG_BASE_SPEED_RANGE,
  STAR_SPRITE_SUPERSAMPLE,
  WARP_SPEED_MAX,
} from '@/config/constants'
import {
  bodyFill,
  circle,
  crater,
  createSpriteCache,
  grain,
  haloGlow,
  jitter,
  lumpyPath,
  mix,
  newSpriteCanvas,
  paintTerminator,
  rayGradient,
  rgba,
  spike,
  sway,
  wisp,
  type BodyPalette,
  type Rgb,
} from '@/utils/fx/spaceBody'
import { slipPolar, type PolarItem } from '@/utils/orbit/flightField'

export type EncounterKind = keyof typeof ENCOUNTER_KIND_WEIGHTS

export interface EncounterFrame {
  w: number
  h: number
  cx: number
  cy: number
  maxDist: number
  minEdge: number
  delta: number
  speedMultiplier: number
  /** Schritt dieses Frames (px am Rand) und Rollschritt (rad). */
  slipX: number
  slipY: number
  rollStep: number
  tint: Rgb
}

interface Anchor extends PolarItem {
  baseSpeed: number
}

interface Part extends PolarItem {
  baseSpeed: number
  variant: number
  tier: number
  spin: number
  spinRate: number
  age: number
}

interface Streak {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  len: number
}

export interface Encounter {
  kind: EncounterKind
  seed: number
  elapsed: number
  life: number
  t: number
  major: boolean
  /** Bandrichtung (rad) — die Seite, auf der das Feld vorbeizieht. */
  side: number
  evadeSent: boolean
  anchor: Anchor
  parts: Part[]
  streaks: Streak[]
  spawnAcc: number
  ringed: boolean
  palette: number
  sep: number
  cachedGradient: CanvasGradient | null
  cachedRx: number
  cachedAlpha: number
}

export interface EncounterField {
  list: Encounter[]
  gap: number
  majorCooldown: number
  lastKind: EncounterKind | null
  evade: { pending: boolean; awayAngle: number; strength: number }
}

const KINDS = Object.keys(ENCOUNTER_KIND_WEIGHTS) as EncounterKind[]
const MAJOR = new Set<EncounterKind>(ENCOUNTER_MAJOR_KINDS)

function lerp(lo: number, hi: number, r: number): number {
  return lo + (hi - lo) * r
}

export function createEncounterField(firstDelaySec: number): EncounterField {
  return {
    list: [],
    gap: firstDelaySec,
    majorCooldown: 0,
    lastKind: null,
    evade: { pending: false, awayAngle: 0, strength: 0 },
  }
}

export function firstEncounterDelay(rand: () => number): number {
  return lerp(ENCOUNTER_FIRST_DELAY_SEC_MIN, ENCOUNTER_FIRST_DELAY_SEC_MAX, rand())
}

/* ── Hüllkurven ─────────────────────────────────────────────────────────────── */

/** Bandfelder: ein Anschwellen, ein Halten, ein Abklingen. */
export function beltEnvelope(t: number): number {
  if (t <= 0 || t >= 1) return 0
  if (t < 0.15) return t / 0.15
  if (t > 0.75) return (1 - t) / 0.25
  return 1
}

/** Einzelkörper: weich rein, weich raus. */
export function passByAlpha(t: number): number {
  if (t <= 0 || t >= 1) return 0
  if (t < 0.12) return t / 0.12
  if (t > 0.8) return (1 - t) / 0.2
  return 1
}

/* ── Wahl und Spawn ─────────────────────────────────────────────────────────── */

export function pickEncounterKind(
  field: EncounterField,
  rand: () => number,
  traveling: boolean,
): EncounterKind | null {
  let majors = 0
  let minors = 0
  for (const e of field.list) {
    if (e.major) majors++
    else minors++
  }
  const majorOk = majors < ENCOUNTER_MAX_MAJOR && field.majorCooldown <= 0
  const minorOk = minors < ENCOUNTER_MAX_MINOR
  const pool: EncounterKind[] = []
  let total = 0
  for (const k of KINDS) {
    if (k === field.lastKind) continue
    if (MAJOR.has(k) ? !majorOk : !minorOk) continue
    pool.push(k)
    total += ENCOUNTER_KIND_WEIGHTS[k] * (traveling && MAJOR.has(k) ? 1.25 : 1)
  }
  if (pool.length === 0) return null
  let r = rand() * total
  for (const k of pool) {
    r -= ENCOUNTER_KIND_WEIGHTS[k] * (traveling && MAJOR.has(k) ? 1.25 : 1)
    if (r <= 0) return k
  }
  return pool[pool.length - 1]
}

function anchorFor(kind: EncounterKind, frame: EncounterFrame, rand: () => number): Anchor {
  const range =
    kind in ENCOUNTER_ANCHOR_DIST
      ? ENCOUNTER_ANCHOR_DIST[kind as keyof typeof ENCOUNTER_ANCHOR_DIST]
      : ([0.3, 0.5] as const)
  const speed =
    kind in ENCOUNTER_ANCHOR_SPEED
      ? ENCOUNTER_ANCHOR_SPEED[kind as keyof typeof ENCOUNTER_ANCHOR_SPEED]
      : 0.4
  const clearance = ENCOUNTER_CENTER_CLEARANCE_FRAC * frame.minEdge
  return {
    angle: rand() * Math.PI * 2,
    dist: Math.max(clearance, frame.maxDist * lerp(range[0], range[1], rand())),
    baseSpeed: speed,
  }
}

export function spawnEncounter(
  field: EncounterField,
  kind: EncounterKind,
  seed: number,
  frame: EncounterFrame,
  rand: () => number,
): Encounter {
  const [lo, hi] = ENCOUNTER_LIFE_SEC[kind]
  const major = MAJOR.has(kind)
  const enc: Encounter = {
    kind,
    seed,
    elapsed: 0,
    life: lerp(lo, hi, rand()),
    t: 0,
    major,
    side: rand() * Math.PI * 2,
    evadeSent: false,
    anchor: anchorFor(kind, frame, rand),
    parts: [],
    streaks: [],
    spawnAcc: 0,
    ringed: rand() < ENCOUNTER_GIANT_RING_CHANCE,
    palette: Math.floor(rand() * ENCOUNTER_GIANT_PALETTES.length),
    sep: lerp(ENCOUNTER_BINARY_SEP_MIN, ENCOUNTER_BINARY_SEP_MAX, rand()),
    cachedGradient: null,
    cachedRx: -1,
    cachedAlpha: -1,
  }
  field.list.push(enc)
  field.lastKind = kind
  if (major) field.majorCooldown = ENCOUNTER_MAJOR_COOLDOWN_SEC
  return enc
}

/* ── Bewegung ───────────────────────────────────────────────────────────────── */

function advancePolar(item: PolarItem & { baseSpeed: number }, frame: EncounterFrame, mult: number): number {
  const norm = item.dist / frame.maxDist
  const wgt = norm * norm
  item.dist += item.baseSpeed * wgt * WARP_SPEED_MAX * frame.speedMultiplier * mult * frame.delta
  if (frame.rollStep !== 0 || frame.slipX !== 0 || frame.slipY !== 0) {
    item.angle += frame.rollStep
    slipPolar(item, frame.slipX * wgt, frame.slipY * wgt, Math.cos(item.angle), Math.sin(item.angle))
  }
  return norm
}

function bandCenter(enc: Encounter): number {
  return enc.side + sway(enc.seed, 3) * ENCOUNTER_BAND_WANDER_RAD * (enc.t - 0.5) * 2
}

/** Spawnwinkel eines Bandteils — innerhalb der Streuung um die Bandmitte. */
export function bandSpawnAngle(enc: Encounter, rand: () => number): number {
  const spread = enc.kind === 'shards' ? ENCOUNTER_SHARD_HALF_SPREAD_RAD : ENCOUNTER_BAND_HALF_SPREAD_RAD
  return bandCenter(enc) + (rand() * 2 - 1) * spread
}

function stepBand(enc: Encounter, field: EncounterField, frame: EncounterFrame, rand: () => number): void {
  const shards = enc.kind === 'shards'
  const max = shards ? ENCOUNTER_SHARDS_MAX : ENCOUNTER_ROCKS_MAX
  const rate = shards ? ENCOUNTER_SHARD_SPAWN_PER_SEC : ENCOUNTER_ROCK_SPAWN_PER_SEC
  const seeds = shards ? ENCOUNTER_SHARD_SEEDS : ENCOUNTER_ROCK_SEEDS
  const tiers = shards ? ENCOUNTER_SHARD_TIERS.length : ENCOUNTER_ROCK_TIERS.length
  if (enc.t < 1) enc.spawnAcc += rate * beltEnvelope(enc.t) * frame.delta
  while (enc.spawnAcc >= 1 && enc.parts.length < max) {
    enc.spawnAcc -= 1
    enc.parts.push({
      angle: bandSpawnAngle(enc, rand),
      dist: frame.maxDist * lerp(ENCOUNTER_BAND_SPAWN_DIST[0], ENCOUNTER_BAND_SPAWN_DIST[1], rand()),
      baseSpeed: STAR_BG_BASE_SPEED_MIN + rand() * STAR_BG_BASE_SPEED_RANGE,
      variant: Math.floor(rand() * seeds),
      tier: Math.floor(rand() * tiers),
      spin: rand() * Math.PI * 2,
      spinRate: (rand() * 2 - 1) * ENCOUNTER_ROCK_TUMBLE_RAD,
      age: 0,
    })
  }
  if (enc.spawnAcc > 1) enc.spawnAcc = 1
  for (let i = enc.parts.length - 1; i >= 0; i--) {
    const p = enc.parts[i]
    advancePolar(p, frame, ENCOUNTER_ROCK_SPEED_MULT)
    p.spin += p.spinRate * frame.delta
    p.age += frame.delta
    if (p.dist > frame.maxDist) enc.parts.splice(i, 1)
  }
  if (!enc.evadeSent && enc.t >= ENCOUNTER_EVADE_AT) {
    enc.evadeSent = true
    field.evade.pending = true
    field.evade.awayAngle = bandCenter(enc)
    field.evade.strength = shards ? ENCOUNTER_SHARD_EVADE_STRENGTH : 1
  }
}

/** Bildschirmposition des Radianten. */
export function radiantStreakStart(enc: Encounter, frame: EncounterFrame): { x: number; y: number } {
  return {
    x: frame.cx + Math.cos(enc.anchor.angle) * enc.anchor.dist,
    y: frame.cy + Math.sin(enc.anchor.angle) * enc.anchor.dist,
  }
}

function stepShower(enc: Encounter, frame: EncounterFrame, rand: () => number): void {
  advancePolar(enc.anchor, frame, 1)
  const rate = lerp(ENCOUNTER_SHOWER_SPAWN_PER_SEC_MIN, ENCOUNTER_SHOWER_SPAWN_PER_SEC_MAX, jitter(enc.seed, 5))
  if (enc.t < 1) enc.spawnAcc += rate * beltEnvelope(enc.t) * frame.delta
  const origin = radiantStreakStart(enc, frame)
  while (enc.spawnAcc >= 1 && enc.streaks.length < ENCOUNTER_SHOWER_STREAKS_MAX) {
    enc.spawnAcc -= 1
    // in alle Richtungen — so sieht ein Radiant aus
    const a = rand() * Math.PI * 2
    const v = lerp(ENCOUNTER_SHOWER_SPEED_MIN, ENCOUNTER_SHOWER_SPEED_MAX, rand())
    enc.streaks.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      age: 0,
      life: lerp(ENCOUNTER_SHOWER_LIFE_SEC_MIN, ENCOUNTER_SHOWER_LIFE_SEC_MAX, rand()),
      len: lerp(ENCOUNTER_SHOWER_LEN_MIN, ENCOUNTER_SHOWER_LEN_MAX, rand()),
    })
  }
  if (enc.spawnAcc > 1) enc.spawnAcc = 1
  for (let i = enc.streaks.length - 1; i >= 0; i--) {
    const s = enc.streaks[i]
    s.age += frame.delta
    s.x += s.vx * frame.delta
    s.y += s.vy * frame.delta
    if (s.age >= s.life) enc.streaks.splice(i, 1)
  }
}

export function stepEncounters(
  field: EncounterField,
  frame: EncounterFrame,
  rand: () => number,
  traveling: boolean,
): void {
  const delta = frame.delta
  if (field.majorCooldown > 0) field.majorCooldown = Math.max(0, field.majorCooldown - delta)
  field.gap -= delta * (traveling ? 1 / HELM_TRAVEL_GAP_SCALE : 1)
  if (field.gap <= 0) {
    const kind = pickEncounterKind(field, rand, traveling)
    if (kind) spawnEncounter(field, kind, Math.floor(rand() * 1e6), frame, rand)
    field.gap = kind ? lerp(ENCOUNTER_GAP_SEC_MIN, ENCOUNTER_GAP_SEC_MAX, rand()) : 5
  }
  for (let i = field.list.length - 1; i >= 0; i--) {
    const enc = field.list[i]
    enc.elapsed += delta
    enc.t = Math.min(1, enc.elapsed / enc.life)
    let done = false
    switch (enc.kind) {
      case 'asteroids':
      case 'shards':
        stepBand(enc, field, frame, rand)
        done = enc.t >= 1 && enc.parts.length === 0
        break
      case 'shower':
        stepShower(enc, frame, rand)
        done = enc.t >= 1 && enc.streaks.length === 0
        break
      default:
        advancePolar(enc.anchor, frame, 1)
        done = enc.t >= 1 || enc.anchor.dist > frame.maxDist
    }
    if (done) field.list.splice(i, 1)
  }
}

export function rescaleEncounters(field: EncounterField, k: number): void {
  for (const enc of field.list) {
    enc.anchor.dist *= k
    for (const p of enc.parts) p.dist *= k
    enc.cachedGradient = null
  }
}

export function clearEncounters(field: EncounterField): void {
  field.list.length = 0
  field.evade.pending = false
}

/* ── Painter ────────────────────────────────────────────────────────────────── */

export interface GiantPalette {
  hi: string
  mid: string
  low: string
  band: string
  ring: string
}

export function paintRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  pal: BodyPalette,
  detail: 0 | 1 | 2,
): void {
  lumpyPath(ctx, x, y, r, seed, ENCOUNTER_ROCK_WOBBLE)
  ctx.fillStyle = bodyFill(ctx, x, y, r, pal.hi, pal.mid, pal.low)
  ctx.fill()
  grain(ctx, x, y, r, 0.35)
  const n = 1 + detail
  for (let i = 0; i < n; i++) {
    const cx = x + sway(seed, 20 + i) * r * 0.5
    const cy = y + sway(seed, 40 + i) * r * 0.5
    crater(ctx, cx, cy, r * (0.12 + jitter(seed, 60 + i) * 0.14), pal.edge)
  }
}

export function paintShard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  pal: BodyPalette,
): void {
  const n = 5
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 + sway(seed, 80 + (i % n)) * 0.2
    const k = 1 + sway(seed, 90 + (i % n)) * 0.25
    const px = x + Math.cos(a) * r * ENCOUNTER_SHARD_ASPECT * k
    const py = y + Math.sin(a) * r * k
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = bodyFill(ctx, x, y, r * ENCOUNTER_SHARD_ASPECT, pal.hi, pal.mid, pal.low)
  ctx.fill()
  grain(ctx, x, y, r * ENCOUNTER_SHARD_ASPECT, 0.15)
  spike(ctx, x - r * ENCOUNTER_SHARD_ASPECT * 0.6, y, 0, 0, r * ENCOUNTER_SHARD_ASPECT * 1.2, r * 0.15)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fill()
}

function ringStrokes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  pal: GiantPalette,
  lowerHalf: boolean,
): void {
  const n = 3 + Math.floor(jitter(seed, 7) * 3)
  ctx.save()
  ctx.beginPath()
  const clipTop = lowerHalf ? y : y - r * 3
  ctx.rect(x - r * 3, clipTop, r * 6, r * 3)
  ctx.clip()
  ctx.strokeStyle = pal.ring
  for (let i = 0; i < n; i++) {
    const rx = r * (1.45 + i * 0.16 + jitter(seed, 100 + i) * 0.08)
    const ry = rx * (0.22 + jitter(seed, 8) * 0.1)
    ctx.globalAlpha = 0.28 + jitter(seed, 120 + i) * 0.3
    ctx.lineWidth = r * (0.03 + jitter(seed, 140 + i) * 0.05)
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

export function paintGiant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  pal: GiantPalette,
  ringed: boolean,
): void {
  if (ringed) ringStrokes(ctx, x, y, r, seed, pal, false)
  circle(ctx, x, y, r)
  ctx.fillStyle = bodyFill(ctx, x, y, r, pal.hi, pal.mid, pal.low)
  ctx.fill()
  ctx.save()
  circle(ctx, x, y, r)
  ctx.clip()
  const bands = ENCOUNTER_GIANT_BANDS_MIN + Math.floor(jitter(seed, 1) * (ENCOUNTER_GIANT_BANDS_MAX - ENCOUNTER_GIANT_BANDS_MIN + 1))
  const step = (r * 2) / bands
  ctx.strokeStyle = pal.band
  for (let i = 0; i < bands; i++) {
    const yy = y - r + (i + 0.5) * step
    const amp = r * 0.04 * (0.5 + jitter(seed, 200 + i))
    ctx.globalAlpha = 0.22 + jitter(seed, 220 + i) * 0.22
    ctx.lineWidth = step * (0.3 + jitter(seed, 240 + i) * 0.35)
    ctx.beginPath()
    ctx.moveTo(x - r * 1.1, yy)
    ctx.bezierCurveTo(x - r * 0.4, yy - amp, x + r * 0.4, yy + amp, x + r * 1.1, yy)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.ellipse(x + sway(seed, 9) * r * 0.5, y + sway(seed, 10) * r * 0.3, r * 0.18, r * 0.1, 0, 0, Math.PI * 2)
  ctx.fillStyle = pal.hi
  ctx.fill()
  ctx.restore()
  ctx.globalAlpha = 1
  grain(ctx, x, y, r, 0.18)
  if (ringed) ringStrokes(ctx, x, y, r, seed, pal, true)
}

export function paintPulsarCore(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: Rgb): void {
  haloGlow(ctx, x, y, r * 0.5, rgb, 2, 0.6)
  for (let i = 0; i < 4; i++) {
    spike(ctx, x, y, (i * Math.PI) / 2 + Math.PI / 4, r * 0.2, r, r * 0.06)
    ctx.fillStyle = rgba(rgb, 0.5)
    ctx.fill()
  }
  circle(ctx, x, y, r * 0.35)
  ctx.fillStyle = rgba(mix(rgb, 255, 0.7), 1)
  ctx.fill()
}

export function paintNovaFlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  rgb: Rgb,
): void {
  haloGlow(ctx, x, y, r * 0.4, rgb, 2.4, 0.9)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + sway(seed, 300 + i) * 0.5
    wisp(ctx, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.35, seed + i, rgb, 0.25)
  }
  circle(ctx, x, y, r * 0.12)
  ctx.fillStyle = rgba(mix(rgb, 255, 0.85), 1)
  ctx.fill()
}

export function paintBinaryStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: Rgb): void {
  haloGlow(ctx, x, y, r * 0.4, rgb, 2.2, 0.8)
  circle(ctx, x, y, r * 0.2)
  ctx.fillStyle = rgba(mix(rgb, 255, 0.75), 1)
  ctx.fill()
}

export function paintEmberDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: Rgb): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(rgb, 1))
  g.addColorStop(0.4, rgba(rgb, 0.6))
  g.addColorStop(1, rgba(rgb, 0))
  circle(ctx, x, y, r)
  ctx.fillStyle = g
  ctx.fill()
}

/* ── Sprites ────────────────────────────────────────────────────────────────── */

export type EncounterSpriteKind = 'rock' | 'shard' | 'giant' | 'pulsar' | 'nova' | 'binary' | 'ember'

const cache = createSpriteCache(ENCOUNTER_SPRITE_CACHE_MAX)

export function encounterSpriteKey(kind: EncounterSpriteKind, variant: number, tier: number, extra = 0): string {
  return `${kind}:${variant}:${tier}:${extra}`
}

function spriteSpan(kind: EncounterSpriteKind, tier: number): number {
  switch (kind) {
    case 'rock':
      return ENCOUNTER_ROCK_TIERS[tier]
    case 'shard':
      return ENCOUNTER_SHARD_TIERS[tier]
    case 'giant':
      return ENCOUNTER_GIANT_SPRITE_PX
    case 'pulsar':
      return ENCOUNTER_PULSAR_SPRITE_PX
    case 'nova':
      return ENCOUNTER_NOVA_SPRITE_PX
    case 'binary':
      return ENCOUNTER_BINARY_SPRITE_PX
    case 'ember':
      return 16
  }
}

/** Supersampled wie die Sternsprites — das Sternfeld-Canvas ist nicht DPR-skaliert. */
export function encounterSprite(
  kind: EncounterSpriteKind,
  variant: number,
  tier: number,
  extra = 0,
): HTMLCanvasElement | null {
  const key = encounterSpriteKey(kind, variant, tier, extra)
  const hit = cache.get(key)
  if (hit) return hit
  const span = spriteSpan(kind, tier)
  const made = newSpriteCanvas(span, STAR_SPRITE_SUPERSAMPLE)
  if (!made) return null
  const { cv, ctx } = made
  const c = span / 2
  switch (kind) {
    case 'rock':
      paintRock(ctx, c, c, span * 0.4, variant, ENCOUNTER_ROCK_PALETTE, Math.min(2, tier) as 0 | 1 | 2)
      paintTerminator(ctx, span, span * 0.44)
      break
    case 'shard':
      paintShard(ctx, c, c, span * 0.18, variant, ENCOUNTER_SHARD_PALETTE)
      paintTerminator(ctx, span, span * 0.46)
      break
    case 'giant': {
      const r = span / (2 * ENCOUNTER_GIANT_SPAN_K)
      paintGiant(ctx, c, c, r, variant, ENCOUNTER_GIANT_PALETTES[extra % ENCOUNTER_GIANT_PALETTES.length], tier === 1)
      paintTerminator(ctx, span, span * 0.5)
      break
    }
    case 'pulsar':
      paintPulsarCore(ctx, c, c, span * 0.45, ENCOUNTER_PULSAR_RGB)
      break
    case 'nova':
      paintNovaFlash(ctx, c, c, span * 0.4, variant, ENCOUNTER_NOVA_RGB)
      break
    case 'binary':
      paintBinaryStar(ctx, c, c, span * 0.42, variant === 0 ? ENCOUNTER_BINARY_RGB_A : ENCOUNTER_BINARY_RGB_B)
      break
    case 'ember':
      paintEmberDot(ctx, c, c, span * 0.45, ENCOUNTER_DUSTLANE_STAR_RGB)
      break
  }
  cache.set(key, cv)
  return cv
}

export function clearEncounterSpriteCache(): void {
  cache.clear()
}

/* ── Zeichnen ───────────────────────────────────────────────────────────────── */

function drawRotated(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  angle: number,
): void {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  ctx.setTransform(c, s, -s, c, x, y)
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size)
}

function drawBand(ctx: CanvasRenderingContext2D, enc: Encounter, frame: EncounterFrame): void {
  const shards = enc.kind === 'shards'
  const tiers = shards ? ENCOUNTER_SHARD_TIERS : ENCOUNTER_ROCK_TIERS
  const scale = frame.minEdge / 1000
  if (shards) ctx.globalCompositeOperation = 'lighter'
  for (const p of enc.parts) {
    const norm = p.dist / frame.maxDist
    const alpha =
      Math.min(1, norm * 3, p.age / ENCOUNTER_ROCK_FADE_IN_SEC) * (shards ? ENCOUNTER_SHARD_ALPHA : 1)
    if (alpha < 0.03) continue
    const sprite = encounterSprite(shards ? 'shard' : 'rock', p.variant, p.tier)
    if (!sprite) continue
    const x = frame.cx + Math.cos(p.angle) * p.dist
    const y = frame.cy + Math.sin(p.angle) * p.dist
    const size = tiers[p.tier] * (0.2 + norm * norm * 1.1) * (0.7 + scale * 0.3)
    ctx.globalAlpha = alpha
    // Lichtseite zum Fokus: der Terminator leuchtet von −x, also um den Polarwinkel drehen.
    drawRotated(ctx, sprite, x, y, size, p.angle + p.spin)
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
}

function drawGiant(ctx: CanvasRenderingContext2D, enc: Encounter, frame: EncounterFrame): void {
  const sprite = encounterSprite('giant', enc.seed, enc.ringed ? 1 : 0, enc.palette)
  if (!sprite) return
  const norm = enc.anchor.dist / frame.maxDist
  const alpha = passByAlpha(enc.t) * Math.min(1, norm * 3)
  if (alpha < 0.02) return
  const r = ENCOUNTER_GIANT_R_FRAC * frame.minEdge * (0.25 + norm * 1.1)
  const x = frame.cx + Math.cos(enc.anchor.angle) * enc.anchor.dist
  const y = frame.cy + Math.sin(enc.anchor.angle) * enc.anchor.dist
  ctx.globalAlpha = alpha
  drawRotated(ctx, sprite, x, y, r * 2 * ENCOUNTER_GIANT_SPAN_K, enc.anchor.angle + sway(enc.seed, 11) * 0.4)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

function drawShower(ctx: CanvasRenderingContext2D, enc: Encounter, frame: EncounterFrame): void {
  if (enc.streaks.length === 0) return
  const tint = mix(frame.tint, 255, 0.5)
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineWidth = ENCOUNTER_SHOWER_WIDTH
  ctx.lineCap = 'round'
  for (const s of enc.streaks) {
    const p = s.age / s.life
    const env = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8
    const alpha = env * ENCOUNTER_SHOWER_ALPHA
    if (alpha < 0.02) continue
    const v = Math.hypot(s.vx, s.vy)
    const travelled = v * s.age
    const len = Math.min(s.len, travelled)
    if (len < 1) continue
    const tx = s.x - (s.vx / v) * len
    const ty = s.y - (s.vy / v) * len
    const g = ctx.createLinearGradient(tx, ty, s.x, s.y)
    g.addColorStop(0, rgba(tint, 0))
    g.addColorStop(1, rgba(tint, alpha))
    ctx.strokeStyle = g
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(s.x, s.y)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}

function drawPulsar(ctx: CanvasRenderingContext2D, enc: Encounter, frame: EncounterFrame): void {
  const sprite = encounterSprite('pulsar', 0, 0)
  if (!sprite) return
  const norm = enc.anchor.dist / frame.maxDist
  const alpha = passByAlpha(enc.t) * Math.min(1, norm * 3)
  if (alpha < 0.02) return
  const x = frame.cx + Math.cos(enc.anchor.angle) * enc.anchor.dist
  const y = frame.cy + Math.sin(enc.anchor.angle) * enc.anchor.dist
  const size = ENCOUNTER_PULSAR_SPRITE_PX * (0.35 + norm * 0.9)
  ctx.globalCompositeOperation = 'lighter'
  const phase = enc.elapsed * ENCOUNTER_PULSAR_SPIN_RAD_S
  const beam = Math.pow(Math.abs(Math.cos(phase)), ENCOUNTER_PULSAR_BEAM_POW) * ENCOUNTER_PULSAR_BEAM_ALPHA
  if (beam > 0.01) {
    const len = ENCOUNTER_PULSAR_BEAM_FRAC * frame.minEdge * (0.4 + norm * 0.8)
    const dir = enc.anchor.angle + sway(enc.seed, 13) * 1.2 + phase * 0.15
    ctx.globalAlpha = alpha * beam
    ctx.fillStyle = rayGradient(ctx, x, y, len, ENCOUNTER_PULSAR_RGB, 0.05, 1, 0.9)
    for (let k = 0; k < 2; k++) {
      spike(ctx, x, y, dir + k * Math.PI, size * 0.15, len, size * 0.12)
      ctx.fill()
    }
  }
  ctx.globalAlpha = alpha
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
  ctx.globalCompositeOperation = 'source-over'
}

function drawNova(ctx: CanvasRenderingContext2D, enc: Encounter, frame: EncounterFrame): void {
  const sprite = encounterSprite('nova', enc.seed, 0)
  if (!sprite) return
  const t = enc.t
  const alpha = t < ENCOUNTER_NOVA_RISE_FRAC ? t / ENCOUNTER_NOVA_RISE_FRAC : Math.pow(1 - (t - ENCOUNTER_NOVA_RISE_FRAC) / (1 - ENCOUNTER_NOVA_RISE_FRAC), 1.5)
  if (alpha < 0.02) return
  const norm = enc.anchor.dist / frame.maxDist
  const x = frame.cx + Math.cos(enc.anchor.angle) * enc.anchor.dist
  const y = frame.cy + Math.sin(enc.anchor.angle) * enc.anchor.dist
  const s = lerp(ENCOUNTER_NOVA_SCALE_MIN, ENCOUNTER_NOVA_SCALE_MAX, t)
  const size = ENCOUNTER_NOVA_SPRITE_PX * s * (0.35 + norm * 0.8)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
  ctx.globalAlpha = alpha * ENCOUNTER_NOVA_RING_ALPHA * (1 - t)
  ctx.strokeStyle = rgba(ENCOUNTER_NOVA_RGB, 1)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, size * 0.5 * (0.3 + t), 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'
}

function drawDustlane(ctx: CanvasRenderingContext2D, enc: Encounter, frame: EncounterFrame): void {
  const norm = enc.anchor.dist / frame.maxDist
  const fadeEdge = norm > 0.85 ? 1 - (norm - 0.85) / 0.15 : 1
  const alpha = ENCOUNTER_DUSTLANE_ALPHA * passByAlpha(enc.t) * Math.min(1, norm * 2.5) * fadeEdge
  if (alpha < 0.01) return
  const x = frame.cx + Math.cos(enc.anchor.angle) * enc.anchor.dist
  const y = frame.cy + Math.sin(enc.anchor.angle) * enc.anchor.dist
  const depth = 0.3 + norm * 1.4
  const rx = ENCOUNTER_DUSTLANE_RX_FRAC * frame.minEdge * depth
  const ry = ENCOUNTER_DUSTLANE_RY_FRAC * frame.minEdge * depth
  const rot = enc.anchor.angle + Math.PI / 2 + sway(enc.seed, 17) * 0.5
  if (!enc.cachedGradient || Math.abs(rx - enc.cachedRx) > 1 || Math.abs(alpha - enc.cachedAlpha) > 0.008) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, rgba(ENCOUNTER_DUSTLANE_RGB, alpha))
    g.addColorStop(0.55, rgba(ENCOUNTER_DUSTLANE_RGB, alpha * 0.75))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    enc.cachedGradient = g
    enc.cachedRx = rx
    enc.cachedAlpha = alpha
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(1, ry / rx)
  const glow = ctx.createRadialGradient(0, 0, rx * 0.4, 0, 0, rx * 1.3)
  glow.addColorStop(0, rgba(ENCOUNTER_DUSTLANE_GLOW_RGB, ENCOUNTER_DUSTLANE_GLOW_ALPHA * alpha))
  glow.addColorStop(1, rgba(ENCOUNTER_DUSTLANE_GLOW_RGB, 0))
  ctx.globalCompositeOperation = 'lighter'
  ctx.beginPath()
  ctx.ellipse(0, 0, rx * 1.3, rx * 2.4, 0, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.beginPath()
  ctx.arc(0, 0, rx, 0, Math.PI * 2)
  ctx.fillStyle = enc.cachedGradient
  ctx.fill()
  ctx.fillStyle = rgba(ENCOUNTER_DUSTLANE_RGB, alpha * 0.6)
  for (let i = 0; i < 2; i++) {
    lumpyPath(ctx, sway(enc.seed, 30 + i) * rx * 0.5, 0, rx * 0.22, enc.seed + i, 0.3, 12)
    ctx.fill()
  }
  ctx.restore()
  const ember = encounterSprite('ember', 0, 0)
  if (ember) {
    ctx.globalAlpha = Math.min(1, alpha * 2.2)
    for (let i = 0; i < ENCOUNTER_DUSTLANE_STARS; i++) {
      const u = sway(enc.seed, 50 + i) * rx * 0.8
      const v = sway(enc.seed, 70 + i) * ry * 0.6
      const sx = x + Math.cos(rot) * u - Math.sin(rot) * v
      const sy = y + Math.sin(rot) * u + Math.cos(rot) * v
      const d = 2 + jitter(enc.seed, 90 + i) * 2.5 * depth
      ctx.drawImage(ember, sx - d, sy - d, d * 2, d * 2)
    }
  }
}

function drawBinary(ctx: CanvasRenderingContext2D, enc: Encounter, frame: EncounterFrame): void {
  const a = encounterSprite('binary', 0, 0)
  const b = encounterSprite('binary', 1, 0)
  if (!a || !b) return
  const norm = enc.anchor.dist / frame.maxDist
  const alpha = passByAlpha(enc.t) * Math.min(1, norm * 3)
  if (alpha < 0.02) return
  const x = frame.cx + Math.cos(enc.anchor.angle) * enc.anchor.dist
  const y = frame.cy + Math.sin(enc.anchor.angle) * enc.anchor.dist
  const depth = 0.35 + norm * 0.9
  const phase = (enc.elapsed / ENCOUNTER_BINARY_PERIOD_SEC) * Math.PI * 2
  const sep = enc.sep * depth
  const ox = Math.cos(phase) * sep
  const oy = Math.sin(phase) * sep * 0.4
  const size = ENCOUNTER_BINARY_SPRITE_PX * depth
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha * ENCOUNTER_BINARY_BRIDGE_ALPHA
  const g = ctx.createLinearGradient(x - ox, y - oy, x + ox, y + oy)
  g.addColorStop(0, rgba(ENCOUNTER_BINARY_RGB_A, 1))
  g.addColorStop(1, rgba(ENCOUNTER_BINARY_RGB_B, 1))
  ctx.strokeStyle = g
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x - ox, y - oy)
  ctx.lineTo(x + ox, y + oy)
  ctx.stroke()
  ctx.globalAlpha = alpha
  ctx.drawImage(a, x - ox - size / 2, y - oy - size / 2, size, size)
  ctx.drawImage(b, x + ox - size * 0.4, y + oy - size * 0.4, size * 0.8, size * 0.8)
  ctx.globalCompositeOperation = 'source-over'
}

export function drawEncounters(ctx: CanvasRenderingContext2D, field: EncounterField, frame: EncounterFrame): void {
  if (field.list.length === 0) return
  for (const enc of field.list) {
    switch (enc.kind) {
      case 'dustlane':
        drawDustlane(ctx, enc, frame)
        break
      case 'giant':
        drawGiant(ctx, enc, frame)
        break
      case 'asteroids':
      case 'shards':
        drawBand(ctx, enc, frame)
        break
      case 'binary':
        drawBinary(ctx, enc, frame)
        break
      case 'pulsar':
        drawPulsar(ctx, enc, frame)
        break
      case 'nova':
        drawNova(ctx, enc, frame)
        break
      case 'shower':
        drawShower(ctx, enc, frame)
        break
    }
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}
