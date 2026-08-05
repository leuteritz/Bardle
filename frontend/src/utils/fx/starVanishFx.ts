/**
 * Abgangs-Effekte für Sterne im Idle-Orbit — zwei klar unterscheidbare Fälle:
 *
 * • `rescued` — alle Planeten wurden im Zeitlimit befreit. Der Stern implodiert
 *   zu einem Blitz, zwei Schockringe laufen aus, und sein Licht zieht als
 *   Funkenschweif in die eigene Sonne, die kurz aufglüht.
 * • `expired` — die Zeit ist abgelaufen (oder ein Boss ist gescheitert). Der
 *   Stern lädt kurz zitternd auf, ein Ring kollabiert nach innen, dann reisst
 *   er als kalter Streifen mit Nachzieher-Schweif aus der Bahn und verlässt das
 *   Bild. Zurück bleibt kurz treibender Staub.
 *
 * Performance: EIN einziges Canvas für alle Effekte, additiv gezeichnet. Pro
 * Partikel genau ein `drawImage` eines pro Farbe gecachten Glow-Sprites — keine
 * Gradients, keine Filter, kein DOM pro Effekt. Der RAF-Loop startet beim ersten
 * Effekt und stoppt (samt `display:none` fürs Canvas), sobald der letzte
 * ausgelaufen ist. Bei vielen gleichzeitigen Abgängen sinkt die Partikeldichte
 * automatisch (LOD), sodass auch 30 Sterne auf einmal im Frame-Budget bleiben.
 */
import {
  STAR_FX_Z_INDEX,
  STAR_FX_DPR_MAX,
  STAR_FX_LOD_THRESHOLD,
  STAR_FX_LOD_MIN_DENSITY,
  STAR_FX_MAX_CONCURRENT,
  STAR_FX_SPRITE_SIZE,
  STAR_FX_SPRITE_CACHE_MAX,
  STAR_FX_MIN_SIZE,
  STAR_FX_BLOOM_SCALE,
  STAR_FX_BLOOM_ALPHA,
  STAR_FX_RING_WIDTH_FRACTION,
  STAR_FX_REDUCED_MOTION_MS,
  STAR_RESCUE_FX_DURATION_MS,
  STAR_RESCUE_FX_FLASH_FRACTION,
  STAR_RESCUE_FX_IMPLODE_SCALE,
  STAR_RESCUE_FX_FLASH_SCALE,
  STAR_RESCUE_FX_RING_COUNT,
  STAR_RESCUE_FX_RING_STAGGER,
  STAR_RESCUE_FX_RING_LIFE,
  STAR_RESCUE_FX_RING_MAX_SCALE,
  STAR_RESCUE_FX_MOTE_COUNT,
  STAR_RESCUE_FX_MOTE_DELAY_MS,
  STAR_RESCUE_FX_MOTE_STAGGER_MS,
  STAR_RESCUE_FX_MOTE_TRAVEL_MS,
  STAR_RESCUE_FX_MOTE_SWING,
  STAR_RESCUE_FX_MOTE_BLOOM,
  STAR_RESCUE_FX_MOTE_EASE,
  STAR_RESCUE_FX_MOTE_STRETCH,
  STAR_RESCUE_FX_MOTE_SIZE,
  STAR_RESCUE_FX_SUN_GLOW_SCALE,
  STAR_RESCUE_FX_WARM_TINT,
  STAR_RESCUE_FX_WARM_MIX,
  STAR_EXPIRE_FX_DURATION_MS,
  STAR_EXPIRE_FX_CHARGE_MS,
  STAR_EXPIRE_FX_SHIVER_PX,
  STAR_EXPIRE_FX_LAUNCH_EASE,
  STAR_EXPIRE_FX_TRAVEL_FACTOR,
  STAR_EXPIRE_FX_STRETCH_MAX,
  STAR_EXPIRE_FX_GHOST_COUNT,
  STAR_EXPIRE_FX_GHOST_SPACING,
  STAR_EXPIRE_FX_TANGENT_MIX,
  STAR_EXPIRE_FX_DUST_COUNT,
  STAR_EXPIRE_FX_DUST_SPEED,
  STAR_EXPIRE_FX_DUST_LIFE,
  STAR_EXPIRE_FX_COOL_TINT,
  STAR_EXPIRE_FX_COOL_MIX,
} from '../config/constants'

export type StarVanishKind = 'rescued' | 'expired'

export interface StarVanishOptions {
  /** Bildschirmposition des Sternzentrums beim Abgang. */
  x: number
  y: number
  /** Durchmesser des Sterns in px — skaliert den gesamten Effekt. */
  size: number
  starColor: [number, number, number]
  /** Ausbruchsrichtung (Einheitsvektor) — nur für `expired` relevant. */
  dirX?: number
  dirY?: number
}

interface Mote {
  /** Startpunkt, relativ zum Sternzentrum. */
  ox: number
  oy: number
  /** Bézier-Kontrollpunkt, relativ zum Sternzentrum. */
  kx: number
  ky: number
  delayMs: number
  scale: number
}

interface Dust {
  vx: number
  vy: number
  scale: number
  lifeFrac: number
}

interface Effect {
  kind: StarVanishKind
  x: number
  y: number
  size: number
  sprite: HTMLCanvasElement
  ringColor: string
  start: number
  duration: number
  /** Ausbruchsrichtung (`expired`). */
  dirX: number
  dirY: number
  travel: number
  /** Zielpunkt des Funkenschweifs (`rescued`) — Sonnenmittelpunkt. */
  sunX: number
  sunY: number
  motes: Mote[]
  dust: Dust[]
  reduced: boolean
}

const TAU = Math.PI * 2

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const effects: Effect[] = []
const spriteCache = new Map<string, HTMLCanvasElement>()

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let dpr = 1

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function smoothstep(edge0: number, edge1: number, v: number): number {
  const t = clamp01((v - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Weiches Glühen als Sprite — Kern weiss, Rand in Sternfarbe, aussen
 * transparent. Wird additiv geblittet; ein Sprite pro Farbe reicht für alle
 * Partikel, Kerne und Schweife.
 */
function getGlowSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const key = `${r}|${g}|${b}`
  const cached = spriteCache.get(key)
  if (cached) return cached

  const s = STAR_FX_SPRITE_SIZE
  const cv = document.createElement('canvas')
  cv.width = s
  cv.height = s
  const c = cv.getContext('2d')!
  const half = s / 2
  const grad = c.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(
    0.18,
    `rgba(${Math.min(255, r + 90)},${Math.min(255, g + 90)},${Math.min(255, b + 90)},0.95)`,
  )
  grad.addColorStop(0.45, `rgba(${r},${g},${b},0.45)`)
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grad
  c.fillRect(0, 0, s, s)

  if (spriteCache.size >= STAR_FX_SPRITE_CACHE_MAX) spriteCache.clear()
  spriteCache.set(key, cv)
  return cv
}

/** Achsenparalleler Blit — der billige Normalfall (Kerne, Staub, Ringglühen). */
function blit(
  c: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  alpha: number,
) {
  if (alpha <= 0.004 || size <= 0.5) return
  c.globalAlpha = alpha > 1 ? 1 : alpha
  const half = size / 2
  c.drawImage(sprite, x - half, y - half, size, size)
}

/** Kern plus weicher Bloom darüber — lässt den Effekt auch klein leuchten. */
function blitCore(
  c: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  alpha: number,
) {
  blit(c, sprite, x, y, size * STAR_FX_BLOOM_SCALE, alpha * STAR_FX_BLOOM_ALPHA)
  blit(c, sprite, x, y, size, alpha)
}

/** Gedrehter, in Flugrichtung gestreckter Blit — Funken und Warp-Streifen. */
function blitStreak(
  c: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  len: number,
  thickness: number,
  angle: number,
  alpha: number,
) {
  if (alpha <= 0.004 || len <= 0.5) return
  c.globalAlpha = alpha > 1 ? 1 : alpha
  c.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr)
  c.rotate(angle)
  c.drawImage(sprite, -len / 2, -thickness / 2, len, thickness)
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (ctx && canvas) return ctx
  canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: ${STAR_FX_Z_INDEX};
  `
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  return ctx
}

function syncCanvasSize(c: CanvasRenderingContext2D) {
  const w = window.innerWidth
  const h = window.innerHeight
  const nextDpr = Math.min(window.devicePixelRatio || 1, STAR_FX_DPR_MAX)
  if (canvas!.width === Math.round(w * nextDpr) && canvas!.height === Math.round(h * nextDpr))
    return
  dpr = nextDpr
  canvas!.width = Math.round(w * dpr)
  canvas!.height = Math.round(h * dpr)
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
}

/** Partikeldichte sinkt, sobald viele Sterne gleichzeitig abgehen. */
function currentDensity(): number {
  const active = effects.length
  if (active < STAR_FX_LOD_THRESHOLD) return 1
  return Math.max(STAR_FX_LOD_MIN_DENSITY, STAR_FX_LOD_THRESHOLD / active)
}

function buildMotes(x: number, y: number, size: number, sunX: number, sunY: number, count: number) {
  const motes: Mote[] = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + Math.random() * 0.5
    const r0 = size * (0.22 + Math.random() * 0.34)
    const ox = Math.cos(a) * r0
    const oy = Math.sin(a) * r0

    const dx = sunX - (x + ox)
    const dy = sunY - (y + oy)
    const dist = Math.hypot(dx, dy) || 1
    // Kontrollpunkt: Mitte der Strecke, nach aussen ausgebeult und seitlich
    // versetzt — daraus wird der schwungvolle Bogen in die Sonne.
    const bloom = STAR_RESCUE_FX_MOTE_BLOOM * (0.6 + Math.random() * 0.6)
    const swing = (Math.random() * 2 - 1) * STAR_RESCUE_FX_MOTE_SWING
    motes.push({
      ox,
      oy,
      kx: ox + dx * 0.5 - (dx / dist) * dist * bloom - (dy / dist) * dist * swing,
      ky: oy + dy * 0.5 - (dy / dist) * dist * bloom + (dx / dist) * dist * swing,
      delayMs: STAR_RESCUE_FX_MOTE_DELAY_MS + Math.random() * STAR_RESCUE_FX_MOTE_STAGGER_MS,
      scale: 0.75 + Math.random() * 0.6,
    })
  }
  return motes
}

function buildDust(count: number) {
  const dust: Dust[] = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + Math.random() * 0.6
    const speed = STAR_EXPIRE_FX_DUST_SPEED * (0.45 + Math.random() * 0.9)
    dust.push({
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      scale: 0.5 + Math.random() * 0.7,
      lifeFrac: STAR_EXPIRE_FX_DUST_LIFE * (0.6 + Math.random() * 0.5),
    })
  }
  return dust
}

function mixToward(c: number, target: number, amount: number): number {
  return Math.round(c + (target - c) * amount)
}

/**
 * Startet den Abgangs-Effekt eines Sterns. Der Aufrufer entscheidet über `kind`,
 * ob der Stern gerettet wurde oder aus der Bahn ausbricht.
 */
export function playStarVanishFx(kind: StarVanishKind, opts: StarVanishOptions) {
  const c = ensureCanvas()
  if (!c) return

  // Ältesten Effekt verdrängen, statt unbegrenzt zu wachsen.
  if (effects.length >= STAR_FX_MAX_CONCURRENT) effects.shift()

  // Die Sternfarbe bleibt erkennbar, kippt aber deutlich ins Warme (Rettung)
  // bzw. ins Kalte (Ausbruch) — so ist schon an der Farbe ablesbar, welcher
  // der beiden Fälle gerade läuft.
  const [sr, sg, sb] = opts.starColor
  const tint = kind === 'expired' ? STAR_EXPIRE_FX_COOL_TINT : STAR_RESCUE_FX_WARM_TINT
  const mix = kind === 'expired' ? STAR_EXPIRE_FX_COOL_MIX : STAR_RESCUE_FX_WARM_MIX
  const r = mixToward(sr, tint[0], mix)
  const g = mixToward(sg, tint[1], mix)
  const b = mixToward(sb, tint[2], mix)

  const density = currentDensity()
  const sunX = window.innerWidth / 2
  const sunY = window.innerHeight / 2
  // Bei kleiner Sonne ist die Sternkugel nur ~25 px gross — der Abgang bekommt
  // deshalb eine Mindestgrösse, sonst ist nicht erkennbar, was passiert ist.
  const size = Math.max(opts.size, STAR_FX_MIN_SIZE)

  // Ausbruchsrichtung: der Stern behält seine Bahnrichtung und kippt nach
  // aussen weg. Beigemischt wird deshalb NUR der zur Tangente senkrechte Anteil
  // der Aussenrichtung — die volle Aussenrichtung könnte der Tangente
  // entgegenlaufen und die beiden würden sich zu einem Flug nach INNEN
  // aufheben (auf der sonnennahen Bahnhälfte zeigen sie fast gegeneinander).
  let dirX = opts.dirX ?? 0
  let dirY = opts.dirY ?? 0
  const outLen = Math.hypot(opts.x - sunX, opts.y - sunY) || 1
  const outX = (opts.x - sunX) / outLen
  const outY = (opts.y - sunY) / outLen
  const tanLen = Math.hypot(dirX, dirY)
  if (tanLen > 0.001) {
    const tx = dirX / tanLen
    const ty = dirY / tanLen
    const dot = outX * tx + outY * ty
    let px = outX - tx * dot
    let py = outY - ty * dot
    const pLen = Math.hypot(px, py)
    if (pLen > 0.001) {
      px /= pLen
      py /= pLen
    } else {
      // Tangente zeigt exakt nach aussen — dann genügt sie allein.
      px = tx
      py = ty
    }
    dirX = tx * STAR_EXPIRE_FX_TANGENT_MIX + px * (1 - STAR_EXPIRE_FX_TANGENT_MIX)
    dirY = ty * STAR_EXPIRE_FX_TANGENT_MIX + py * (1 - STAR_EXPIRE_FX_TANGENT_MIX)
  } else {
    dirX = outX
    dirY = outY
  }
  const dirLen = Math.hypot(dirX, dirY) || 1

  effects.push({
    kind,
    x: opts.x,
    y: opts.y,
    size,
    sprite: getGlowSprite(r, g, b),
    ringColor:
      kind === 'rescued'
        ? `rgba(255,236,190,`
        : `rgba(${STAR_EXPIRE_FX_COOL_TINT[0]},${STAR_EXPIRE_FX_COOL_TINT[1]},${STAR_EXPIRE_FX_COOL_TINT[2]},`,
    start: performance.now(),
    duration: prefersReducedMotion
      ? STAR_FX_REDUCED_MOTION_MS
      : kind === 'rescued'
        ? STAR_RESCUE_FX_DURATION_MS
        : STAR_EXPIRE_FX_DURATION_MS,
    dirX: dirX / dirLen,
    dirY: dirY / dirLen,
    travel: Math.hypot(window.innerWidth, window.innerHeight) * STAR_EXPIRE_FX_TRAVEL_FACTOR,
    sunX,
    sunY,
    motes:
      prefersReducedMotion || kind !== 'rescued'
        ? []
        : buildMotes(
            opts.x,
            opts.y,
            size,
            sunX,
            sunY,
            Math.max(4, Math.round(STAR_RESCUE_FX_MOTE_COUNT * density)),
          ),
    dust:
      prefersReducedMotion || kind !== 'expired'
        ? []
        : buildDust(Math.max(3, Math.round(STAR_EXPIRE_FX_DUST_COUNT * density))),
    reduced: prefersReducedMotion,
  })

  if (canvas!.style.display === 'none') canvas!.style.display = ''
  if (!rafId) {
    rafId = requestAnimationFrame(frame)
  }
}

/** Kurzer Ausblendpuls statt Bewegung — `prefers-reduced-motion`. */
function drawReduced(c: CanvasRenderingContext2D, fx: Effect, t: number) {
  blit(c, fx.sprite, fx.x, fx.y, fx.size * (1 + t * 0.5), (1 - t) * 0.9)
}

function drawRescued(c: CanvasRenderingContext2D, fx: Effect, t: number, elapsed: number) {
  // ① Implosion → Blitz
  if (t < STAR_RESCUE_FX_FLASH_FRACTION) {
    const p = t / STAR_RESCUE_FX_FLASH_FRACTION
    const scale =
      p < 0.35
        ? 1 + (STAR_RESCUE_FX_IMPLODE_SCALE - 1) * smoothstep(0, 1, p / 0.35)
        : STAR_RESCUE_FX_IMPLODE_SCALE +
          (STAR_RESCUE_FX_FLASH_SCALE - STAR_RESCUE_FX_IMPLODE_SCALE) *
            smoothstep(0, 1, (p - 0.35) / 0.65)
    const alpha = p < 0.35 ? 1 : Math.pow(1 - (p - 0.35) / 0.65, 1.5)
    blitCore(c, fx.sprite, fx.x, fx.y, fx.size * scale, alpha)
  }

  // ② Schockringe
  for (let i = 0; i < STAR_RESCUE_FX_RING_COUNT; i++) {
    const rt = (t - i * STAR_RESCUE_FX_RING_STAGGER) / STAR_RESCUE_FX_RING_LIFE
    if (rt <= 0 || rt >= 1) continue
    const eased = 1 - Math.pow(1 - rt, 3)
    const radius = fx.size * (0.5 + STAR_RESCUE_FX_RING_MAX_SCALE * 0.5 * eased)
    const alpha = Math.pow(1 - rt, 1.8) * 0.85
    c.globalAlpha = 1
    c.strokeStyle = `${fx.ringColor}${alpha.toFixed(3)})`
    c.lineWidth = Math.max(1, fx.size * STAR_FX_RING_WIDTH_FRACTION * (1 - rt * 0.7))
    c.beginPath()
    c.arc(fx.x, fx.y, radius, 0, TAU)
    c.stroke()
  }

  // ③ Funkenschweif in die Sonne
  const p0x = fx.x
  const p0y = fx.y
  for (const m of fx.motes) {
    const mt = clamp01((elapsed - m.delayMs) / STAR_RESCUE_FX_MOTE_TRAVEL_MS)
    if (mt <= 0 || mt >= 1) continue
    const e = Math.pow(mt, STAR_RESCUE_FX_MOTE_EASE)
    const u = 1 - e
    const sx = p0x + m.ox
    const sy = p0y + m.oy
    const kx = p0x + m.kx
    const ky = p0y + m.ky
    const px = u * u * sx + 2 * u * e * kx + e * e * fx.sunX
    const py = u * u * sy + 2 * u * e * ky + e * e * fx.sunY
    const vx = 2 * u * (kx - sx) + 2 * e * (fx.sunX - kx)
    const vy = 2 * u * (ky - sy) + 2 * e * (fx.sunY - ky)
    const base = fx.size * STAR_RESCUE_FX_MOTE_SIZE * m.scale
    const stretch = 1 + STAR_RESCUE_FX_MOTE_STRETCH * e
    const alpha = Math.min(1, mt * 6) * (1 - smoothstep(0.78, 1, mt))
    const dir = Math.atan2(vy, vx)
    blitStreak(
      c,
      fx.sprite,
      px,
      py,
      base * stretch * STAR_FX_BLOOM_SCALE,
      base * STAR_FX_BLOOM_SCALE,
      dir,
      alpha * STAR_FX_BLOOM_ALPHA,
    )
    blitStreak(c, fx.sprite, px, py, base * stretch, base, dir, alpha)
  }

  // ④ Die Sonne nimmt das Licht auf
  if (t > 0.45) {
    const glow = Math.sin(clamp01((t - 0.45) / 0.55) * Math.PI)
    blit(c, fx.sprite, fx.sunX, fx.sunY, fx.size * STAR_RESCUE_FX_SUN_GLOW_SCALE, glow * 0.45)
  }
}

function drawExpired(c: CanvasRenderingContext2D, fx: Effect, t: number, elapsed: number) {
  const angle = Math.atan2(fx.dirY, fx.dirX)

  // ① Aufladen: der Stern zittert, ein Ring kollabiert nach innen
  if (elapsed < STAR_EXPIRE_FX_CHARGE_MS) {
    const p = elapsed / STAR_EXPIRE_FX_CHARGE_MS
    const shiver = Math.sin(elapsed * 0.09) * STAR_EXPIRE_FX_SHIVER_PX * p
    blitCore(c, fx.sprite, fx.x + shiver, fx.y - shiver, fx.size * (1 - 0.22 * p), 1)
    const radius = fx.size * (0.5 + 2.6 * (1 - p))
    c.globalAlpha = 1
    c.strokeStyle = `${fx.ringColor}${(p * 0.8).toFixed(3)})`
    c.lineWidth = Math.max(1, fx.size * STAR_FX_RING_WIDTH_FRACTION * p)
    c.beginPath()
    c.arc(fx.x, fx.y, radius, 0, TAU)
    c.stroke()
    return
  }

  // ② Ausbruch: Kern plus Nachzieher werden zum beschleunigenden Streifen
  const p = clamp01((elapsed - STAR_EXPIRE_FX_CHARGE_MS) / (fx.duration - STAR_EXPIRE_FX_CHARGE_MS))
  for (let gi = 0; gi < STAR_EXPIRE_FX_GHOST_COUNT; gi++) {
    const pg = p - gi * STAR_EXPIRE_FX_GHOST_SPACING
    if (pg <= 0) continue
    const e = Math.pow(pg, STAR_EXPIRE_FX_LAUNCH_EASE)
    const px = fx.x + fx.dirX * fx.travel * e
    const py = fx.y + fx.dirY * fx.travel * e
    const stretch = 1 + STAR_EXPIRE_FX_STRETCH_MAX * e
    const thickness = fx.size * (1 - 0.55 * e)
    const alpha =
      (gi === 0 ? 1 : 0.5 * (1 - gi / STAR_EXPIRE_FX_GHOST_COUNT)) * Math.pow(1 - p, 1.4)
    // Der Kopf des Streifens bekommt denselben weichen Bloom wie ein Kern.
    if (gi === 0) {
      blitStreak(
        c,
        fx.sprite,
        px,
        py,
        fx.size * stretch * STAR_FX_BLOOM_SCALE,
        thickness * STAR_FX_BLOOM_SCALE,
        angle,
        alpha * STAR_FX_BLOOM_ALPHA,
      )
    }
    blitStreak(c, fx.sprite, px, py, fx.size * stretch, thickness, angle, alpha)
  }

  // ③ Zurückbleibender Staub
  for (const d of fx.dust) {
    const dt = clamp01((elapsed - STAR_EXPIRE_FX_CHARGE_MS) / (d.lifeFrac * fx.duration))
    if (dt >= 1) continue
    const seconds = (elapsed - STAR_EXPIRE_FX_CHARGE_MS) / 1000
    const decel = 1 - dt * 0.4
    blit(
      c,
      fx.sprite,
      fx.x + d.vx * seconds * decel,
      fx.y + d.vy * seconds * decel,
      fx.size * 0.2 * d.scale * (1 + dt * 0.8),
      Math.pow(1 - dt, 1.6) * 0.75,
    )
  }
}

function frame(now: number) {
  rafId = 0
  const c = ctx
  if (!c || !canvas) return

  syncCanvasSize(c)
  c.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
  c.globalCompositeOperation = 'lighter'

  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i]
    const elapsed = now - fx.start
    const t = elapsed / fx.duration
    if (t >= 1) {
      effects.splice(i, 1)
      continue
    }
    if (t < 0) continue
    if (fx.reduced) drawReduced(c, fx, t)
    else if (fx.kind === 'rescued') drawRescued(c, fx, t, elapsed)
    else drawExpired(c, fx, t, elapsed)
  }

  c.globalAlpha = 1
  c.globalCompositeOperation = 'source-over'

  if (effects.length > 0) {
    rafId = requestAnimationFrame(frame)
  } else {
    // Leeres Canvas komplett ausblenden → der Compositor überspringt es.
    c.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    canvas.style.display = 'none'
  }
}

/** Alle laufenden Effekte sofort verwerfen (Reset, Prestige, Universe-Wechsel). */
export function clearStarVanishFx() {
  effects.length = 0
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    canvas.style.display = 'none'
  }
}
