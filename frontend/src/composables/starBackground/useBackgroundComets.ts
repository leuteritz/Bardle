import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useGalaxyStore } from '../../stores/galaxyStore'
import { useUiStore } from '../../stores/uiStore'
import { GALAXY_THEMES } from '../../config/galaxyThemes'
import { useWindowFocus } from '../useWindowFocus'
import {
  COMET_BG_MAX_COUNT,
  COMET_BG_INTERVAL_MIN_SEC,
  COMET_BG_INTERVAL_MAX_SEC,
  COMET_BG_FIRST_DELAY_MIN_SEC,
  COMET_BG_FIRST_DELAY_MAX_SEC,
  COMET_BG_SPEED_MIN,
  COMET_BG_SPEED_MAX,
  COMET_BG_TAIL_MIN,
  COMET_BG_TAIL_MAX,
  COMET_BG_WIDTH_MIN,
  COMET_BG_WIDTH_MAX,
  COMET_BG_PARTIAL_LIFE_MIN_SEC,
  COMET_BG_PARTIAL_LIFE_MAX_SEC,
  COMET_BG_COUNT_WEIGHTS,
  COMET_BG_EVENT_COOLDOWN_BONUS_SEC,
  COMET_BG_STAGGER_MAX_SEC,
  COMET_BG_VARIANT_WEIGHTS,
  COMET_BG_DRIFTER_SPEED_MIN,
  COMET_BG_DRIFTER_SPEED_MAX,
  COMET_BG_DRIFTER_TAIL_MULT,
  COMET_BG_DRIFTER_ALPHA_MULT,
  COMET_BG_FLASH_SPEED_MIN,
  COMET_BG_FLASH_SPEED_MAX,
  COMET_BG_FLASH_TAIL_MULT,
  COMET_BG_FLASH_ALPHA_MULT,
  COMET_BG_ARC_TURN_RATE_MIN,
  COMET_BG_ARC_TURN_RATE_MAX,
  COMET_BG_ARC_LIFE_MARGIN,
  COMET_BG_TWIN_CHANCE,
  COMET_BG_DIAGONAL_CHANCE,
  COMET_BG_ANGLE_JITTER_RAD,
  COMET_BG_FADE_IN_FRAC,
  COMET_BG_FADE_OUT_FRAC,
  COMET_BG_ALPHA,
  COMET_BG_TWIN_OFFSET_MIN,
  COMET_BG_TWIN_OFFSET_MAX,
  COMET_BG_TWIN_SCALE,
  COMET_BG_TINT_WHITE_MIX,
} from '../../config/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Ambient background comet — free cartesian flight across the canvas, unlike
 *  the radial center-outward flow of stars/streaks. */
type BgComet = {
  x: number
  y: number
  vx: number
  vy: number
  len: number
  width: number
  life: number
  maxLife: number
  /** true → partial burn: alpha envelope fades in/out; false → full crossing */
  fades: boolean
  /** Entry delay (s) — staggers multi-comet events; no movement/draw until 0. */
  delay: number
  /** Velocity rotation rate (rad/s) — 0 = straight, ≠0 = curved arc comet. */
  curve: number
  /** Brightness scale: drifters render dimmer, flashes brighter. */
  alphaMult: number
  r: number
  g: number
  b: number
  sparkPhase: number
}

type CometVariant = keyof typeof COMET_BG_VARIANT_WEIGHTS

/** Heading pool (screen space, y grows downward): TL→BR dive, TR→BL, shallow
 *  left→right, steep top→down, right→left, and an ascending BL→TR flight. */
const COMET_HEADING_POOL = [
  Math.PI / 4,
  (Math.PI * 3) / 4,
  0,
  Math.PI / 2,
  Math.PI,
  -Math.PI / 4,
]

function rollCometVariant(): CometVariant {
  let rand = Math.random()
  for (const [variant, weight] of Object.entries(COMET_BG_VARIANT_WEIGHTS)) {
    rand -= weight
    if (rand <= 0) return variant as CometVariant
  }
  return 'crossing'
}

/** Pastel comet tint from the current galaxy's (dark, low-alpha) nebula color:
 *  parse the rgb components and mix them toward white so the comet reads as
 *  white-hot with a subtle per-galaxy mood. */
function cometTintForGalaxy(themeIndex: number): { r: number; g: number; b: number } {
  const theme = GALAXY_THEMES[themeIndex % GALAXY_THEMES.length]
  const m = theme.nebulaColors[0].match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  const mix = (v: number) => Math.round(v + (255 - v) * COMET_BG_TINT_WHITE_MIX)
  if (!m) return { r: 230, g: 235, b: 255 }
  return { r: mix(Number(m[1])), g: mix(Number(m[2])), b: mix(Number(m[3])) }
}

// ─── Composable ───────────────────────────────────────────────────────────────

/**
 * Self-contained ambient background-comet system on its own overlay canvas.
 * Shared verbatim between the idle-orbit backdrop (StarBackgroundComponent) and
 * the flat cosmic backdrop (CosmicStageBackground) so the mechanic stays in one
 * place. Comet spawn/update/draw behavior is identical to the original inline
 * implementation in useStarBackground.
 *
 * @param options.pauseOnBardTab — freeze the loop while a bard tab is open
 *   (idle-orbit backdrop sits behind those tabs; the cosmic backdrop lives
 *   *inside* them and must keep running, so it leaves this false).
 */
export function useBackgroundComets(options: { pauseOnBardTab?: boolean } = {}) {
  const pauseOnBardTab = options.pauseOnBardTab ?? false

  const cometCanvas = ref<HTMLCanvasElement>()
  const prefersReducedMotion = ref(false)

  const gameStore = useGameStore()
  const galaxyStore = useGalaxyStore()
  const uiStore = useUiStore()

  /** Rare ambient comets crossing the canvas; spawned in-loop (auto-pauses with
   *  the RAF loop), finite — spliced when done, no timers, no extra cleanup. */
  const bgComets: BgComet[] = []
  let cometCooldown =
    COMET_BG_FIRST_DELAY_MIN_SEC +
    Math.random() * (COMET_BG_FIRST_DELAY_MAX_SEC - COMET_BG_FIRST_DELAY_MIN_SEC)

  let animFrame = 0
  let lastTimestamp = 0
  let isWindowFocused = true
  let removeFocusListener: (() => void) | null = null
  let resizeObserver: ResizeObserver | null = null

  const checkReducedMotion = () => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }

  function resizeCanvas(): void {
    const c = cometCanvas.value
    if (!c) return
    c.width = c.clientWidth || c.parentElement?.clientWidth || window.innerWidth
    c.height = c.clientHeight || c.parentElement?.clientHeight || window.innerHeight
  }

  /** Spawn one ambient comet with the given heading, entry delay and a rolled
   *  behavior variant: full crossing, partial burn (ignites/burns out
   *  on-screen), slow drifter, fast flash, or curved arc. Crossings in
   *  single-comet events may bring a twin companion. */
  function spawnOneComet(
    w: number,
    h: number,
    heading: number,
    delay: number,
    allowTwin: boolean,
  ): void {
    if (bgComets.length >= COMET_BG_MAX_COUNT) return
    const tint = cometTintForGalaxy(galaxyStore.currentThemeIndex)
    const variant = rollCometVariant()

    let speed = COMET_BG_SPEED_MIN + Math.random() * (COMET_BG_SPEED_MAX - COMET_BG_SPEED_MIN)
    let len = COMET_BG_TAIL_MIN + Math.random() * (COMET_BG_TAIL_MAX - COMET_BG_TAIL_MIN)
    const width = COMET_BG_WIDTH_MIN + Math.random() * (COMET_BG_WIDTH_MAX - COMET_BG_WIDTH_MIN)
    let alphaMult = 1
    let curve = 0
    if (variant === 'drifter') {
      speed =
        COMET_BG_DRIFTER_SPEED_MIN +
        Math.random() * (COMET_BG_DRIFTER_SPEED_MAX - COMET_BG_DRIFTER_SPEED_MIN)
      len *= COMET_BG_DRIFTER_TAIL_MULT
      alphaMult = COMET_BG_DRIFTER_ALPHA_MULT
    } else if (variant === 'flash') {
      speed =
        COMET_BG_FLASH_SPEED_MIN +
        Math.random() * (COMET_BG_FLASH_SPEED_MAX - COMET_BG_FLASH_SPEED_MIN)
      len *= COMET_BG_FLASH_TAIL_MULT
      alphaMult = COMET_BG_FLASH_ALPHA_MULT
    } else if (variant === 'arc') {
      curve =
        (COMET_BG_ARC_TURN_RATE_MIN +
          Math.random() * (COMET_BG_ARC_TURN_RATE_MAX - COMET_BG_ARC_TURN_RATE_MIN)) *
        (Math.random() < 0.5 ? 1 : -1)
    }

    const ux = Math.cos(heading)
    const uy = Math.sin(heading)

    if (variant === 'partial') {
      // Partial burn: ignites at a visible point, fades out before any edge.
      const maxLife =
        COMET_BG_PARTIAL_LIFE_MIN_SEC +
        Math.random() * (COMET_BG_PARTIAL_LIFE_MAX_SEC - COMET_BG_PARTIAL_LIFE_MIN_SEC)
      bgComets.push({
        x: w * (0.1 + Math.random() * 0.6),
        y: h * (0.05 + Math.random() * 0.6),
        vx: ux * speed,
        vy: uy * speed,
        len,
        width,
        life: 0,
        maxLife,
        fades: true,
        delay,
        curve: 0,
        alphaMult: 1,
        r: tint.r,
        g: tint.g,
        b: tint.b,
        sparkPhase: Math.random() * Math.PI * 2,
      })
      return
    }

    // Crossing geometry (also drifter/flash/arc): aim through a random interior
    // target and back the head up along the flight path until just past the
    // entry edge, so the comet appears almost immediately, crosses the target
    // and exits another edge.
    const diag = Math.hypot(w, h)
    const targetX = w * (0.25 + Math.random() * 0.5)
    const targetY = h * (0.25 + Math.random() * 0.5)
    // Distance (backwards from the target) to the edge the comet enters from.
    const backX = ux > 0 ? targetX / ux : ux < 0 ? (targetX - w) / ux : Infinity
    const backY = uy > 0 ? targetY / uy : uy < 0 ? (targetY - h) / uy : Infinity
    const backup = Math.min(backX, backY) + len + 60
    let maxLife = (backup + diag + len + 100) / speed
    // A curved path is longer than the straight-line estimate.
    if (variant === 'arc') maxLife *= COMET_BG_ARC_LIFE_MARGIN
    const head: BgComet = {
      x: targetX - ux * backup,
      y: targetY - uy * backup,
      vx: ux * speed,
      vy: uy * speed,
      len,
      width,
      life: 0,
      maxLife,
      fades: false,
      delay,
      curve,
      alphaMult,
      r: tint.r,
      g: tint.g,
      b: tint.b,
      sparkPhase: Math.random() * Math.PI * 2,
    }
    bgComets.push(head)
    if (
      allowTwin &&
      variant === 'crossing' &&
      Math.random() < COMET_BG_TWIN_CHANCE &&
      bgComets.length < COMET_BG_MAX_COUNT
    ) {
      // Twin pair: a smaller companion offset perpendicular to the flight path.
      const off =
        COMET_BG_TWIN_OFFSET_MIN +
        Math.random() * (COMET_BG_TWIN_OFFSET_MAX - COMET_BG_TWIN_OFFSET_MIN)
      const side = Math.random() < 0.5 ? 1 : -1
      const twinSpeed = speed * (0.9 + Math.random() * 0.2)
      bgComets.push({
        ...head,
        x: head.x - uy * off * side,
        y: head.y + ux * off * side,
        vx: ux * twinSpeed,
        vy: uy * twinSpeed,
        // Slower companion needs proportionally more time to finish the crossing
        maxLife: head.maxLife * (speed / twinSpeed),
        len: len * COMET_BG_TWIN_SCALE,
        width: Math.max(1, width * COMET_BG_TWIN_SCALE),
        sparkPhase: Math.random() * Math.PI * 2,
      })
    }
  }

  /** Sky event: rolls how many comets appear (mostly 1, rarely up to 5), each
   *  fully independent — own heading, behavior variant and a staggered entry
   *  delay so multi-events read as "the sky comes alive", not a volley.
   *  Returns the rolled count for the cooldown size penalty. */
  function spawnCometEvent(w: number, h: number): number {
    let rand = Math.random()
    let count = 1
    for (let i = 0; i < COMET_BG_COUNT_WEIGHTS.length; i++) {
      rand -= COMET_BG_COUNT_WEIGHTS[i]
      if (rand <= 0) {
        count = i + 1
        break
      }
    }
    count = Math.min(count, COMET_BG_MAX_COUNT - bgComets.length)
    for (let i = 0; i < count; i++) {
      // Single comets keep the signature TL→BR bias; comets in multi-events
      // scatter uniformly across the full heading pool.
      let heading: number
      if (count === 1 && Math.random() < COMET_BG_DIAGONAL_CHANCE) {
        heading = COMET_HEADING_POOL[0]
      } else {
        heading = COMET_HEADING_POOL[Math.floor(Math.random() * COMET_HEADING_POOL.length)]
      }
      heading += (Math.random() * 2 - 1) * COMET_BG_ANGLE_JITTER_RAD
      const delay = i === 0 ? 0 : Math.random() * COMET_BG_STAGGER_MAX_SEC
      spawnOneComet(w, h, heading, delay, count === 1)
    }
    return count
  }

  function animate(timestamp: number): void {
    const c = cometCanvas.value
    const ctx = c?.getContext('2d')
    if (!c || !ctx) {
      animFrame = 0
      return
    }
    // No focus, tab hidden or (optionally) a bard modal open → stop the loop
    // and do NOT request the next frame (restart via focus/visibility handlers).
    if (!isWindowFocused || document.hidden || (pauseOnBardTab && uiStore.bardActiveTab !== null)) {
      animFrame = 0
      return
    }

    if (lastTimestamp === 0) lastTimestamp = timestamp
    const rawDelta = (timestamp - lastTimestamp) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTimestamp = timestamp

    const w = c.width
    const h = c.height
    ctx.clearRect(0, 0, w, h)

    const hyperActive = gameStore.isHyperspaceActive
    const transitioning = galaxyStore.isGalaxyTransitioning || galaxyStore.pendingTransition

    // ── Background comets — rare diagonal flybys across the whole canvas.
    // In-loop spawn (delta accumulator) → pauses with the RAF loop for free;
    // finite array, spliced when done, no timers.
    cometCooldown -= delta
    if (cometCooldown <= 0 && !transitioning && !hyperActive && bgComets.length < COMET_BG_MAX_COUNT) {
      const eventSize = spawnCometEvent(w, h)
      // Bigger events pay a cooldown penalty — average comet rate stays flat.
      cometCooldown =
        COMET_BG_INTERVAL_MIN_SEC +
        Math.random() * (COMET_BG_INTERVAL_MAX_SEC - COMET_BG_INTERVAL_MIN_SEC) +
        (eventSize - 1) * COMET_BG_EVENT_COOLDOWN_BONUS_SEC
    }
    for (let i = bgComets.length - 1; i >= 0; i--) {
      const c2 = bgComets[i]
      // Staggered entry: hold the comet fully inactive until its delay is up.
      if (c2.delay > 0) {
        c2.delay -= delta
        continue
      }
      c2.life += delta
      // Arc comets: rotate the velocity a little each frame → curved path.
      if (c2.curve !== 0) {
        const rot = c2.curve * delta
        const cosR = Math.cos(rot)
        const sinR = Math.sin(rot)
        const nvx = c2.vx * cosR - c2.vy * sinR
        c2.vy = c2.vx * sinR + c2.vy * cosR
        c2.vx = nvx
      }
      c2.x += c2.vx * delta
      c2.y += c2.vy * delta
      if (c2.life > c2.maxLife) {
        bgComets.splice(i, 1)
        continue
      }
      // Partial burns fade in/out; crossings fly at full strength and simply
      // enter/leave via the screen edges.
      let env = 1
      if (c2.fades) {
        const p = c2.life / c2.maxLife
        if (p < COMET_BG_FADE_IN_FRAC) env = p / COMET_BG_FADE_IN_FRAC
        else if (p > 1 - COMET_BG_FADE_OUT_FRAC) env = (1 - p) / COMET_BG_FADE_OUT_FRAC
      } else {
        // Safety fade in the last 0.3s: a crossing that hasn't left the screen
        // yet (e.g. a strongly curved arc) dissolves instead of popping out.
        env = Math.min(1, (c2.maxLife - c2.life) / 0.3)
      }
      if (env < 0.03) continue
      const cSpeed = Math.hypot(c2.vx, c2.vy)
      const cux = c2.vx / cSpeed
      const cuy = c2.vy / cSpeed
      const tailX = c2.x - cux * c2.len
      const tailY = c2.y - cuy * c2.len
      // Skip drawing while a crossing is still on its off-screen approach.
      const margin = 40
      if (
        (c2.x < -margin && tailX < -margin) ||
        (c2.x > w + margin && tailX > w + margin) ||
        (c2.y < -margin && tailY < -margin) ||
        (c2.y > h + margin && tailY > h + margin)
      ) {
        continue
      }
      const flicker = 1 + 0.25 * Math.sin(c2.sparkPhase + c2.life * 18)
      ctx.save()
      ctx.globalAlpha = env
      ctx.lineCap = 'round'
      // Outer tinted tail — alphaMult dims drifters / brightens flashes
      const tailAlpha = Math.min(1, COMET_BG_ALPHA * c2.alphaMult)
      const grad = ctx.createLinearGradient(tailX, tailY, c2.x, c2.y)
      grad.addColorStop(0, `rgba(${c2.r},${c2.g},${c2.b},0)`)
      grad.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b},${tailAlpha})`)
      ctx.beginPath()
      ctx.moveTo(tailX, tailY)
      ctx.lineTo(c2.x, c2.y)
      ctx.strokeStyle = grad
      ctx.lineWidth = c2.width
      ctx.stroke()
      // Hot white inner tail (shorter, thinner) — bright without shadowBlur
      ctx.beginPath()
      ctx.moveTo(c2.x - cux * c2.len * 0.55, c2.y - cuy * c2.len * 0.55)
      ctx.lineTo(c2.x, c2.y)
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, 0.5 * c2.alphaMult).toFixed(3)})`
      ctx.lineWidth = c2.width * 0.45
      ctx.stroke()
      // Head: tinted halo + white-hot core, subtly flickering
      ctx.beginPath()
      ctx.arc(c2.x, c2.y, c2.width * 2.2 * flicker, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${c2.r},${c2.g},${c2.b},${Math.min(1, 0.25 * c2.alphaMult).toFixed(3)})`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(c2.x, c2.y, c2.width * 0.9 * flicker, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, 0.9 * c2.alphaMult).toFixed(3)})`
      ctx.fill()
      ctx.restore()
    }

    animFrame = requestAnimationFrame(animate)
  }

  function startLoop(): void {
    if (animFrame) return
    lastTimestamp = 0
    animFrame = requestAnimationFrame(animate)
  }

  function stopLoop(): void {
    if (animFrame) cancelAnimationFrame(animFrame)
    animFrame = 0
  }

  function onWindowFocus(): void {
    isWindowFocused = true
    if (!prefersReducedMotion.value) {
      resizeCanvas()
      startLoop()
    }
  }

  function onWindowBlur(): void {
    isWindowFocused = false
    stopLoop()
  }

  function handleVisibilityChange(): void {
    if (document.hidden) {
      stopLoop()
    } else {
      // Re-query focus directly instead of trusting the cached flag — on tab
      // return the focus event can arrive after visibilitychange (or not fire).
      isWindowFocused = document.hasFocus()
      // Backing store may have been dropped after a long background stay → hard
      // re-allocate (the loop repaints the fresh buffer next frame).
      resizeCanvas()
      if (!prefersReducedMotion.value && isWindowFocused) startLoop()
    }
  }

  onMounted(async () => {
    checkReducedMotion()
    if (!prefersReducedMotion.value) {
      await nextTick()
      isWindowFocused = document.hasFocus()

      const { onFocusChange } = useWindowFocus()
      removeFocusListener = onFocusChange((focused) => {
        if (focused) onWindowFocus()
        else onWindowBlur()
      })

      resizeCanvas()
      resizeObserver = new ResizeObserver(() => resizeCanvas())
      if (cometCanvas.value) resizeObserver.observe(cometCanvas.value)
      window.addEventListener('resize', resizeCanvas)

      if (isWindowFocused) startLoop()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    stopLoop()
    removeFocusListener?.()
    resizeObserver?.disconnect()
    resizeObserver = null
    window.removeEventListener('resize', resizeCanvas)
    bgComets.length = 0
  })

  return { cometCanvas, prefersReducedMotion }
}
