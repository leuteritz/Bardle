import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { drawStarSprite, drawDotSprite } from '@/composables/starBackground/starSprites'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  STAR_COUNT,
  STAR_BG_MIN_STARS,
  WARP_SPEED_MAX,
  GALAXY_TRANS_WARP_MS,
  GALAXY_TRANS_DECEL_MS,
  GALAXY_SPAWN_INTERVAL_MIN,
  GALAXY_SPAWN_INTERVAL_MAX,
  GALAXY_MAX_COUNT,
  STAR_BG_BASE_SPEED_MIN,
  STAR_BG_BASE_SPEED_RANGE,
  BACKGROUND_STAR_BLUE_BIAS,
  SOLAR_STAR_SPEED_BONUS,
  COMET_PHASE_DATA,
  COMET_DRIFT_SPEED_MULT,
  COMET_DEBRIS_COUNT,
  COMET_DEBRIS_MIN_R,
  COMET_DEBRIS_MAX_R,
  COMET_DEBRIS_SPEED_MULT,
  FLIGHT_STREAK_COUNT,
  FLIGHT_STREAK_SPEED_MULT,
  FLIGHT_STREAK_LEN_FACTOR,
  FLIGHT_STREAK_ALPHA,
  FLIGHT_BURST_INTERVAL_MIN_SEC,
  FLIGHT_BURST_INTERVAL_MAX_SEC,
  FLIGHT_BURST_STREAK_MIN,
  FLIGHT_BURST_STREAK_MAX,
  FLIGHT_BURST_ALPHA,
  FLIGHT_BURST_SPEED_MULT,
  FLIGHT_BURST_LEN_FACTOR,
  FLIGHT_BURST_WIDTH,
  STAR_PHASE_DATA,
  FOCUS_POLL_INTERVAL_MS,
} from '@/config/constants'
import { useWindowFocus } from '@/composables/system/useWindowFocus'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import {
  EMISSION_MAX_COUNT,
  EMISSION_NEBULA_PALETTES,
  EMISSION_SPAWN_MAX,
  EMISSION_SPAWN_MIN,
  CLUSTER_COUNT,
  DUST_PATCH_COUNT,
  GALAXY_PALETTES_BY_TYPE,
  ION_CLOUD_PALETTES,
  type DustPatch,
  type EmissionPalette,
  type EmissionType,
  type GalaxyItem,
  type NebulaMovingItem,
  type StarCluster,
  type StarItem,
} from '@/composables/starBackground/types'
import {
  NS,
  addStop,
  drawBarredSpiral,
  drawElliptical,
  drawGlobular,
  drawIrregular,
  drawLenticular,
  drawRing,
  drawSpiral,
  drawStarburst,
  pickGalaxyTypeConfig,
  svgEl,
} from '@/composables/starBackground/galaxyRenderers'
import { gameNow } from '@/utils/game/gameClock'

/** FLIGHT_STREAK_ALPHA as a 2-digit hex suffix for 8-digit-hex canvas colors. */
const STREAK_ALPHA_HEX = Math.round(FLIGHT_STREAK_ALPHA * 255)
  .toString(16)
  .padStart(2, '0')
/** Same for FLIGHT_BURST_ALPHA (outer stroke of burst streaks). */
const BURST_ALPHA_HEX = Math.round(FLIGHT_BURST_ALPHA * 255)
  .toString(16)
  .padStart(2, '0')

// ─── Types ────────────────────────────────────────────────────────────────────

type FlightStreak = {
  angle: number
  dist: number
  baseSpeed: number
}

type DebrisRock = {
  angle: number
  dist: number
  baseSpeed: number
  r: number
  spin: number
  spinSpeed: number
  /** Pre-generated per-vertex radius jitter → stable irregular silhouette. */
  verts: number[]
}

// ─── Champion-Rettungs-Rotation ───────────────────────────────────────────────
const RESCUE_ROTATION_DURATION_MS = 2_000
const RESCUE_ROTATION_TOTAL_RAD = Math.PI * 1.5

/** Fortlaufende ID für Galaxie-SVGs — hält die Gradient-/Filter-IDs eindeutig. */
let galaxyIdCounter = 0

// ─── Emission Nebula Draw Functions ──────────────────────────────────────────

function drawEmissionNebula(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  palette: EmissionPalette,
): void {
  const defs = svgEl('defs')
  const outerGrad = svgEl('radialGradient')
  outerGrad.id = `${id}o`
  outerGrad.setAttribute('cx', '50%')
  outerGrad.setAttribute('cy', '50%')
  outerGrad.setAttribute('r', '50%')
  addStop(outerGrad, '0%', palette.glow, 0.25)
  addStop(outerGrad, '50%', palette.outer, 0.12)
  addStop(outerGrad, '100%', palette.outer, 0)
  const midGrad = svgEl('radialGradient')
  midGrad.id = `${id}m`
  midGrad.setAttribute('cx', '48%')
  midGrad.setAttribute('cy', '52%')
  midGrad.setAttribute('r', '50%')
  addStop(midGrad, '0%', palette.mid, 0.55)
  addStop(midGrad, '40%', palette.mid, 0.3)
  addStop(midGrad, '100%', palette.outer, 0)
  const coreGrad = svgEl('radialGradient')
  coreGrad.id = `${id}c`
  coreGrad.setAttribute('cx', '50%')
  coreGrad.setAttribute('cy', '50%')
  coreGrad.setAttribute('r', '50%')
  addStop(coreGrad, '0%', '#ffffff', 0.9)
  addStop(coreGrad, '20%', palette.core, 0.75)
  addStop(coreGrad, '60%', palette.mid, 0.35)
  addStop(coreGrad, '100%', palette.outer, 0)
  const blurFilter = svgEl('filter')
  blurFilter.id = `${id}f`
  blurFilter.setAttribute('x', '-30%')
  blurFilter.setAttribute('y', '-30%')
  blurFilter.setAttribute('width', '160%')
  blurFilter.setAttribute('height', '160%')
  const blur = svgEl('feGaussianBlur')
  blur.setAttribute('stdDeviation', '10')
  blurFilter.appendChild(blur)
  defs.appendChild(outerGrad)
  defs.appendChild(midGrad)
  defs.appendChild(coreGrad)
  defs.appendChild(blurFilter)
  svg.appendChild(defs)
  const tilt = Math.random() * 60 - 30
  const axisY = 0.55 + Math.random() * 0.35
  const outer = svgEl('ellipse')
  outer.setAttribute('cx', String(cx))
  outer.setAttribute('cy', String(cy))
  outer.setAttribute('rx', String(r))
  outer.setAttribute('ry', String(r * axisY))
  outer.setAttribute('fill', `url(#${id}o)`)
  outer.setAttribute('transform', `rotate(${tilt}, ${cx}, ${cy})`)
  svg.appendChild(outer)
  const offX = (Math.random() - 0.5) * r * 0.25
  const offY = (Math.random() - 0.5) * r * 0.25
  const mid = svgEl('ellipse')
  mid.setAttribute('cx', String(cx + offX))
  mid.setAttribute('cy', String(cy + offY))
  mid.setAttribute('rx', String(r * 0.65))
  mid.setAttribute('ry', String(r * 0.65 * (0.6 + Math.random() * 0.3)))
  mid.setAttribute('fill', `url(#${id}m)`)
  mid.setAttribute('filter', `url(#${id}f)`)
  svg.appendChild(mid)
  const core = svgEl('circle')
  core.setAttribute('cx', String(cx))
  core.setAttribute('cy', String(cy))
  core.setAttribute('r', String(r * 0.3))
  core.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(core)
}

function drawIonCloud(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  palette: EmissionPalette,
): void {
  const defs = svgEl('defs')
  const g1 = svgEl('radialGradient')
  g1.id = `${id}a`
  g1.setAttribute('cx', '50%')
  g1.setAttribute('cy', '50%')
  g1.setAttribute('r', '50%')
  addStop(g1, '0%', palette.glow, 0.3)
  addStop(g1, '45%', palette.mid, 0.15)
  addStop(g1, '100%', palette.outer, 0)
  const g2 = svgEl('radialGradient')
  g2.id = `${id}b`
  g2.setAttribute('cx', '38%')
  g2.setAttribute('cy', '60%')
  g2.setAttribute('r', '50%')
  addStop(g2, '0%', palette.core, 0.22)
  addStop(g2, '60%', palette.mid, 0.08)
  addStop(g2, '100%', palette.outer, 0)
  const blurFilter = svgEl('filter')
  blurFilter.id = `${id}f`
  blurFilter.setAttribute('x', '-40%')
  blurFilter.setAttribute('y', '-40%')
  blurFilter.setAttribute('width', '180%')
  blurFilter.setAttribute('height', '180%')
  const blur = svgEl('feGaussianBlur')
  blur.setAttribute('stdDeviation', '18')
  blurFilter.appendChild(blur)
  defs.appendChild(g1)
  defs.appendChild(g2)
  defs.appendChild(blurFilter)
  svg.appendChild(defs)
  const tilt = Math.random() * 180
  const ry = 0.45 + Math.random() * 0.45
  const main = svgEl('ellipse')
  main.setAttribute('cx', String(cx))
  main.setAttribute('cy', String(cy))
  main.setAttribute('rx', String(r))
  main.setAttribute('ry', String(r * ry))
  main.setAttribute('fill', `url(#${id}a)`)
  main.setAttribute('filter', `url(#${id}f)`)
  main.setAttribute('transform', `rotate(${tilt}, ${cx}, ${cy})`)
  svg.appendChild(main)
  const sx = cx + (Math.random() - 0.5) * r * 0.5
  const sy = cy + (Math.random() - 0.5) * r * 0.5
  const secondary = svgEl('ellipse')
  secondary.setAttribute('cx', String(sx))
  secondary.setAttribute('cy', String(sy))
  secondary.setAttribute('rx', String(r * 0.7))
  secondary.setAttribute('ry', String(r * 0.7 * (0.4 + Math.random() * 0.4)))
  secondary.setAttribute('fill', `url(#${id}b)`)
  secondary.setAttribute('filter', `url(#${id}f)`)
  svg.appendChild(secondary)
}

// ─── Composable ───────────────────────────────────────────────────────────────

// Spectral star color palette with weighted random selection.
// Weights: Red 30%, Orange 30%, Yellow 20%, White 12%, Blue-White 8%
const SPECTRAL_STAR_PALETTE: { weight: number; colors: [number, number, number][] }[] = [
  {
    weight: 0.3,
    colors: [
      [255, 96, 48],
      [255, 69, 0],
    ],
  },
  {
    weight: 0.3,
    colors: [
      [255, 179, 71],
      [255, 160, 64],
    ],
  },
  {
    weight: 0.2,
    colors: [
      [255, 244, 163],
      [255, 233, 122],
    ],
  },
  {
    weight: 0.12,
    colors: [
      [245, 245, 255],
      [255, 255, 255],
    ],
  },
  {
    weight: 0.08,
    colors: [
      [176, 200, 255],
      [202, 216, 255],
    ],
  },
]

function pickBackgroundStarColor(): [number, number, number] {
  if (Math.random() < BACKGROUND_STAR_BLUE_BIAS) {
    const blue = SPECTRAL_STAR_PALETTE[SPECTRAL_STAR_PALETTE.length - 1]
    return blue.colors[Math.floor(Math.random() * blue.colors.length)]
  }
  const nonBlue = SPECTRAL_STAR_PALETTE.slice(0, -1)
  const totalWeight = nonBlue.reduce((s, c) => s + c.weight, 0)
  let rand = Math.random() * totalWeight
  for (const cat of nonBlue) {
    rand -= cat.weight
    if (rand <= 0) return cat.colors[Math.floor(Math.random() * cat.colors.length)]
  }
  return nonBlue[nonBlue.length - 1].colors[0]
}

function pickOrbitStarColor(): [number, number, number] {
  const idx = Math.floor(Math.random() * SPECTRAL_STAR_PALETTE.length)
  const cat = SPECTRAL_STAR_PALETTE[idx]
  return cat.colors[Math.floor(Math.random() * cat.colors.length)]
}

export function useStarBackground(options: { frozen?: boolean } = {}) {
  // frozen = statisches Sternenfeld (Shop): kein Heranfliegen, keine Galaxien/Nebel-Spawns,
  // keine Galaxy-/Warp-Mutationen — nur In-Place-Twinkle.
  const isFrozen = options.frozen ?? false

  const starsContainer = ref<HTMLElement>()
  const starCanvas = ref<HTMLCanvasElement>()
  const prefersReducedMotion = ref(false)
  const stars: StarItem[] = []
  const galaxies: GalaxyItem[] = []
  const emissionNebulas: NebulaMovingItem[] = []
  const dustPatches: DustPatch[] = []
  const starClusters: StarCluster[] = []
  const cometDebris: DebrisRock[] = []
  const flightStreaks: FlightStreak[] = []
  /** Finite gusts of bright speed lines; refilled when burstCooldown expires. */
  const burstStreaks: FlightStreak[] = []
  let burstCooldown =
    FLIGHT_BURST_INTERVAL_MIN_SEC +
    Math.random() * (FLIGHT_BURST_INTERVAL_MAX_SEC - FLIGHT_BURST_INTERVAL_MIN_SEC)
  const galaxyPool: Array<{ el: SVGSVGElement; active: boolean }> = []
  const nebulaPool: Array<{ el: SVGSVGElement; active: boolean }> = []
  let nextStarId = 1
  let animFrame = 0

  // Container-Maße und 2D-Context gecacht: animateStars() las beides jeden Frame
  // frisch (`clientWidth`/`clientHeight` = erzwungenes Layout, `getContext()` =
  // unnötiger Lookup). Der Cache wird von resizeCanvas() und dem Resize-Handler
  // gepflegt — den einzigen Stellen, an denen sich die Maße ändern können.
  let cachedW = 0
  let cachedH = 0
  let cachedCtx: CanvasRenderingContext2D | null = null

  /** Maße + Context neu vom DOM lesen. Nur bei Resize/Canvas-Neuaufbau nötig. */
  function refreshCanvasCache(): void {
    cachedW = starsContainer.value?.clientWidth || window.innerWidth
    cachedH = starsContainer.value?.clientHeight || window.innerHeight
    cachedCtx = starCanvas.value?.getContext('2d') ?? null
  }

  // Tauscht eine Consumer-Komponente ihr <canvas> aus (v-if), zeigt der gecachte
  // Context auf ein abgehängtes Element → Handle neu holen.
  watch([starCanvas, starsContainer], () => refreshCanvasCache())

  // ── Fokus-Zustand ──────────────────────────────────────────────────────────
  // true  → Fenster hat OS-Fokus → Canvas-Loop läuft
  // false → kein Fokus (anderes Fenster aktiv, z.B. YouTube) → Loop gestoppt
  let isWindowFocused = true
  let removeFocusListener: (() => void) | null = null

  // Polling-Fallback: document.hasFocus() alle 500ms prüfen
  // Sichert den Fall dass blur/focus Events nicht zuverlässig feuern (z.B. Chrome Multi-Monitor)
  let focusPollingInterval: ReturnType<typeof setInterval> | null = null

  let lastTimestamp = 0
  let hyperspaceElapsed = 0
  let wasHyperspaceActive = false

  let galaxyTransPhase: 'idle' | 'warp' | 'decel' = 'idle'
  let galaxyTransElapsed = 0
  let wasPendingTransition = false
  let galaxyTransDir = 0

  let resizeTimeout: ReturnType<typeof setTimeout> | null = null
  let containerObserver: ResizeObserver | null = null
  let galaxySpawnTimeout: ReturnType<typeof setTimeout> | null = null
  let emissionSpawnTimeout: ReturnType<typeof setTimeout> | null = null
  const timeouts: ReturnType<typeof setTimeout>[] = []

  const checkReducedMotion = () => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }

  function resizeCanvas(): void {
    if (!starCanvas.value || !starsContainer.value) return
    starCanvas.value.width = starsContainer.value.clientWidth || window.innerWidth
    starCanvas.value.height = starsContainer.value.clientHeight || window.innerHeight
    // Neuer Backing-Store → alter Context-Handle ist wertlos, Maße neu einlesen
    refreshCanvasCache()
  }

  // ── Context-Loss-Heilung ───────────────────────────────────────────────────
  // Chrome darf den Backing-Store eines 2D-Canvas verwerfen, wenn der Tab
  // lange im Hintergrund war (GPU-Speicherdruck). Danach werden alle
  // Zeichenbefehle stillschweigend verworfen — die Loop läuft, aber der
  // Canvas bleibt bis zum Reload leer. Das Neusetzen von width/height
  // erzwingt einen frischen Backing-Store; die Loop übermalt ihn im
  // nächsten Frame ohnehin komplett.
  function resetCanvasIfContextLost(): void {
    const ctx = starCanvas.value?.getContext('2d') as
      | (CanvasRenderingContext2D & { isContextLost?: () => boolean })
      | null
      | undefined
    if (ctx?.isContextLost?.()) resizeCanvas()
  }

  function handleContextRestored(): void {
    // Nach Browser-seitiger Wiederherstellung ist der Buffer leer und der
    // Context-Zustand zurückgesetzt — Dimensionen neu setzen räumt beides auf.
    resizeCanvas()
  }

  // Per-area density: scale element counts by container area vs. the viewport, so a contained
  // instance (Shop) renders at the same star density as the full-screen one (Planet) — capped at 1.
  function densityScale(): number {
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    const ref = window.innerWidth * window.innerHeight
    return ref > 0 ? Math.min(1, (w * h) / ref) : 1
  }

  // ── Canvas ein-/ausblenden ─────────────────────────────────────────────────
  function hideCanvas(): void {
    if (starCanvas.value) starCanvas.value.style.opacity = '0'
  }

  function showCanvas(): void {
    if (starCanvas.value) starCanvas.value.style.opacity = '1'
  }

  // ── Loop starten / stoppen ─────────────────────────────────────────────────
  function startLoop(): void {
    // showCanvas VOR dem Guard: falls der Canvas durch eine verpasste
    // Event-Reihenfolge versteckt blieb, macht jeder Start-Versuch ihn wieder
    // sichtbar — auch wenn die Loop bereits läuft.
    showCanvas()
    if (animFrame) return // läuft bereits
    lastTimestamp = 0
    animFrame = requestAnimationFrame(animateStars)
  }

  function stopLoop(): void {
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = 0
    }
    hideCanvas()
  }

  // ── Fokus-Handler ──────────────────────────────────────────────────────────
  // Kein Fokus = Canvas-Loop komplett stoppen → 0 GPU-Last für andere Fenster
  function onWindowBlur(): void {
    if (!isWindowFocused) return
    isWindowFocused = false
    stopLoop()
    if (galaxySpawnTimeout) {
      clearTimeout(galaxySpawnTimeout)
      galaxySpawnTimeout = null
    }
    if (emissionSpawnTimeout) {
      clearTimeout(emissionSpawnTimeout)
      emissionSpawnTimeout = null
    }
  }

  function onWindowFocus(): void {
    if (isWindowFocused) return
    isWindowFocused = true
    if (!prefersReducedMotion.value && stars.length > 0) {
      startLoop()
      scheduleNextGalaxy()
      scheduleNextEmission()
    }
  }

  // ── Modal-Pause ────────────────────────────────────────────────────────────
  // Solange ein Bard-Tab oder das Star-Fight-Modal offen ist, liegt der Canvas
  // unter einem nahezu deckenden Backdrop und ist praktisch unsichtbar → rAF-
  // Loop komplett stoppen, beim Schließen fortsetzen. Geteiltes Signal mit dem
  // restlichen Idle-Layer (Orbits, Champions, Planeten).
  const { isIdleRenderingPaused: idleHidden } = useRenderingPaused()
  watch(
    () => idleHidden.value,
    (modalOpen) => {
      if (modalOpen) {
        stopLoop()
      } else if (isWindowFocused && !prefersReducedMotion.value && stars.length > 0) {
        startLoop()
        scheduleNextGalaxy()
        scheduleNextEmission()
      }
    },
  )

  // ── Polling-Fallback für Multi-Monitor (Chrome blur-Event-Problem) ─────────
  // document.hasFocus() ist zuverlässiger als blur/focus Events auf Multi-Monitor-Setups
  function startFocusPolling(): void {
    focusPollingInterval = setInterval(() => {
      const hasFocus = document.hasFocus()
      if (hasFocus) resetCanvasIfContextLost()
      if (!hasFocus && isWindowFocused) {
        onWindowBlur()
      } else if (hasFocus && !isWindowFocused) {
        onWindowFocus()
      } else if (
        // Watchdog: Loop sollte laufen, ist aber tot (z.B. verpasste
        // Event-Reihenfolge bei Tab-/Monitor-Wechsel) → neu starten, damit
        // der Hintergrund nie dauerhaft schwarz bleibt.
        hasFocus &&
        isWindowFocused &&
        animFrame === 0 &&
        !document.hidden &&
        !idleHidden.value &&
        !prefersReducedMotion.value &&
        stars.length > 0
      ) {
        startLoop()
        scheduleNextGalaxy()
        scheduleNextEmission()
      }
    }, FOCUS_POLL_INTERVAL_MS)
  }

  function stopFocusPolling(): void {
    if (focusPollingInterval) {
      clearInterval(focusPollingInterval)
      focusPollingInterval = null
    }
  }

  // ── Object Pools ──────────────────────────────────────────────────────────
  function initGalaxyPool(): void {
    if (!starsContainer.value) return
    for (const slot of galaxyPool) {
      if (starsContainer.value.contains(slot.el)) starsContainer.value.removeChild(slot.el)
    }
    galaxyPool.length = 0
    for (let i = 0; i < GALAXY_MAX_COUNT + 1; i++) {
      const el = document.createElementNS(NS, 'svg') as SVGSVGElement
      el.classList.add('galaxy')
      el.style.visibility = 'hidden'
      el.style.willChange = 'transform, opacity'
      starsContainer.value.appendChild(el)
      galaxyPool.push({ el, active: false })
    }
  }

  function initNebulaPool(): void {
    if (!starsContainer.value) return
    for (const slot of nebulaPool) {
      if (starsContainer.value.contains(slot.el)) starsContainer.value.removeChild(slot.el)
    }
    nebulaPool.length = 0
    for (let i = 0; i < EMISSION_MAX_COUNT + 1; i++) {
      const el = document.createElementNS(NS, 'svg') as SVGSVGElement
      el.style.visibility = 'hidden'
      el.style.willChange = 'transform, opacity'
      starsContainer.value.appendChild(el)
      nebulaPool.push({ el, active: false })
    }
  }

  // ── Galaxy-Spawn ──────────────────────────────────────────────────────────
  function spawnGalaxy(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    if (galaxies.length >= GALAXY_MAX_COUNT) return

    const slot = galaxyPool.find((s) => !s.active)
    if (!slot) return

    const config = pickGalaxyTypeConfig()
    const paletteList = GALAXY_PALETTES_BY_TYPE[config.type]
    const palette = paletteList[Math.floor(Math.random() * paletteList.length)]
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin)
    const w = starsContainer.value.clientWidth || window.innerWidth
    const h = starsContainer.value.clientHeight || window.innerHeight
    const mx = w * 0.1,
      my = h * 0.1
    const cx2 = mx + Math.random() * (w - 2 * mx)
    const cy2 = my + Math.random() * (h - 2 * my)
    const x = cx2 - size / 2
    const y = cy2 - size / 2
    const lifetime = 10_000 + Math.random() * 6_000
    const maxScale = 0.75 + Math.random() * 0.6
    const rotDir = Math.random() > 0.5 ? 1 : -1
    const rotDeg = config.rotRange[0] + Math.random() * (config.rotRange[1] - config.rotRange[0])
    const rot = rotDir * rotDeg

    const svg = slot.el
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.className.baseVal = 'galaxy'
    svg.style.opacity = '0'

    const cx = size / 2
    const cy = size / 2
    const r = size / 2
    const id = `g${++galaxyIdCounter}`

    switch (config.type) {
      case 'spiral':
        drawSpiral(svg, id, cx, cy, r, size, palette)
        break
      case 'barred-spiral':
        drawBarredSpiral(svg, id, cx, cy, r, size, palette)
        break
      case 'elliptical':
        drawElliptical(svg, id, cx, cy, r, size, palette)
        break
      case 'globular':
        drawGlobular(svg, id, cx, cy, r, size, palette)
        break
      case 'irregular':
        drawIrregular(svg, id, cx, cy, r, size, palette)
        break
      case 'ring':
        drawRing(svg, id, cx, cy, r, size, palette)
        break
      case 'lenticular':
        drawLenticular(svg, id, cx, cy, r, size, palette)
        break
      case 'starburst':
        drawStarburst(svg, id, cx, cy, r, size, palette)
        break
    }

    const initTransform = `translate(${x}px,${y}px) scale(0.05) rotate(${rot}deg)`
    svg.style.transform = initTransform
    svg.style.visibility = 'visible'
    slot.active = true
    galaxies.push({
      el: svg,
      x,
      y,
      scale: 0.05,
      maxScale,
      lifetime,
      elapsed: 0,
      rot,
      _lastOpacity: '0',
      _lastTransform: initTransform,
    })
  }

  function scheduleNextGalaxy(): void {
    if (isFrozen) return
    // Bestehenden Timer ersetzen — mehrere Restart-Pfade (Fokus, Modal,
    // Watchdog) dürfen keine parallelen Spawn-Ketten aufbauen.
    if (galaxySpawnTimeout) clearTimeout(galaxySpawnTimeout)
    const delay =
      GALAXY_SPAWN_INTERVAL_MIN +
      Math.random() * (GALAXY_SPAWN_INTERVAL_MAX - GALAXY_SPAWN_INTERVAL_MIN)
    galaxySpawnTimeout = setTimeout(() => {
      spawnGalaxy()
      scheduleNextGalaxy()
    }, delay)
  }

  function spawnEmissionNebula(randomDist = false): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    if (emissionNebulas.length >= EMISSION_MAX_COUNT) return

    const slot = nebulaPool.find((s) => !s.active)
    if (!slot) return

    const type: EmissionType = Math.random() < 0.55 ? 'emission-nebula' : 'ion-cloud'
    const palettes = type === 'emission-nebula' ? EMISSION_NEBULA_PALETTES : ION_CLOUD_PALETTES
    const palette = palettes[Math.floor(Math.random() * palettes.length)]
    const sizeMin = type === 'emission-nebula' ? 220 : 320
    const sizeMax = type === 'emission-nebula' ? 420 : 620
    const size = sizeMin + Math.random() * (sizeMax - sizeMin)
    const w = starsContainer.value.clientWidth || window.innerWidth
    const h = starsContainer.value.clientHeight || window.innerHeight
    const maxDist = Math.hypot(w / 2, h / 2) + 20
    const angle = Math.random() * Math.PI * 2
    const dist = randomDist
      ? maxDist * (0.08 + Math.random() * 0.75)
      : maxDist * (0.02 + Math.random() * 0.06)
    const baseSpeed = 0.44 + Math.random() * 0.32
    const maxScale = 1.4 + Math.random() * 1.2

    const svg = slot.el
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.className.baseVal = type
    svg.style.opacity = '0'

    const id = `e${++galaxyIdCounter}`
    const half = size / 2
    if (type === 'emission-nebula') drawEmissionNebula(svg, id, half, half, half, palette)
    else drawIonCloud(svg, id, half, half, half, palette)

    const initTransform = `translate(0px,0px) scale(0.02) translate(${-half}px,${-half}px)`
    svg.style.transform = initTransform
    svg.style.visibility = 'visible'
    slot.active = true
    emissionNebulas.push({
      el: svg,
      angle,
      dist,
      baseSpeed,
      scale: 0.02,
      maxScale,
      size,
      _lastOpacity: '0',
      _lastTransform: initTransform,
    })
  }

  function scheduleNextEmission(): void {
    if (isFrozen) return
    if (emissionSpawnTimeout) clearTimeout(emissionSpawnTimeout)
    const delay = EMISSION_SPAWN_MIN + Math.random() * (EMISSION_SPAWN_MAX - EMISSION_SPAWN_MIN)
    emissionSpawnTimeout = setTimeout(() => {
      spawnEmissionNebula()
      scheduleNextEmission()
    }, delay)
  }

  function initDust(): void {
    dustPatches.length = 0
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    const maxDist = Math.hypot(w / 2, h / 2) + 20
    const dustConfigs: [number, number, number, number][] = [
      [10, 8, 5, 0.22],
      [5, 5, 12, 0.18],
      [12, 5, 3, 0.2],
      [8, 4, 8, 0.16],
      [6, 7, 4, 0.19],
      [9, 6, 6, 0.21],
      [4, 6, 10, 0.17],
    ]
    const dustCount = Math.max(1, Math.round(DUST_PATCH_COUNT * densityScale()))
    for (let i = 0; i < dustCount; i++) {
      const [r, g, b, opacity] = dustConfigs[i]
      dustPatches.push({
        angle: Math.random() * Math.PI * 2,
        dist: maxDist * (0.1 + Math.random() * 0.8),
        baseSpeed: 0.2 + Math.random() * 0.16,
        rx: 180 + Math.random() * 200,
        ry: 100 + Math.random() * 150,
        rotation: Math.random() * Math.PI,
        opacity: opacity * (0.8 + Math.random() * 0.4),
        r,
        g,
        b,
        cachedGradient: null,
        _cachedRx: -1,
        _cachedOpacity: -1,
      })
    }
  }

  function initClusters(): void {
    starClusters.length = 0
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    const maxDist = Math.hypot(w / 2, h / 2) + 20
    const clusterCount = Math.max(1, Math.round(CLUSTER_COUNT * densityScale()))
    for (let i = 0; i < clusterCount; i++) {
      const count = 15 + Math.floor(Math.random() * 12)
      const radius = 18 + Math.random() * 32
      const clusterStars = []
      for (let j = 0; j < count; j++) {
        const a = Math.random() * Math.PI * 2
        const d = Math.random() * radius
        const [r, g, b] = pickOrbitStarColor()
        clusterStars.push({
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          r,
          g,
          b,
          brightness: 0.4 + Math.random() * 0.6,
        })
      }
      starClusters.push({
        angle: Math.random() * Math.PI * 2,
        dist: maxDist * (0.08 + Math.random() * 0.8),
        baseSpeed: 0.56 + Math.random() * 0.36,
        stars: clusterStars,
        twinklePhase: Math.random() * Math.PI * 2,
      })
    }
  }

  function spawnStar(randomDist = false): StarItem {
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    const cx = w / 2,
      cy = h / 2
    const maxDist = Math.hypot(cx, cy) + 20
    const angle = Math.random() * Math.PI * 2
    const minDist = maxDist * 0.1
    const dist = randomDist ? minDist + Math.random() * (maxDist * 0.85) : minDist
    const baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
    const [r, g, b] = pickBackgroundStarColor()
    const item: StarItem = {
      id: nextStarId++,
      angle,
      dist,
      baseSpeed,
      r,
      g,
      b,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
    }
    stars.push(item)
    return item
  }

  // ── Haupt-Animationsschleife ───────────────────────────────────────────────
  function animateStars(timestamp: number): void {
    // Kein Fokus, Tab versteckt oder ein deckendes Overlay offen (Bard-Tab /
    // Star-Fight-Modal) → sofort abbrechen, nächsten Frame NICHT anfordern
    // (Restart via watch/onWindowFocus)
    if (!isWindowFocused || document.hidden || idleHidden.value) {
      animFrame = 0
      return
    }

    if (lastTimestamp === 0) lastTimestamp = timestamp
    const rawDelta = (timestamp - lastTimestamp) / 1000
    let delta = Math.min(rawDelta, 0.1)
    lastTimestamp = timestamp

    // Frozen (Shop): kein Heranfliegen, keine Galaxy-/Warp-/Rescue-Mutationen.
    let hyperActive = false
    let speedMultiplier = 0
    if (!isFrozen) {
      const gameStore = useGameStore()
      hyperActive = gameStore.isHyperspaceActive
      if (hyperActive && !wasHyperspaceActive) hyperspaceElapsed = 0
      wasHyperspaceActive = hyperActive
      if (hyperActive) hyperspaceElapsed += delta

      const galaxyStore = useGalaxyStore()

      // ── Champion-Rettungs-Kameraschwenk (runs even while background is paused) ──
      if (galaxyStore.isRescueRotating) {
        if (prefersReducedMotion.value) {
          galaxyStore.endRescueRotation()
        } else {
          const elapsed = gameNow() - galaxyStore.rescueRotationStartTime
          const t = Math.min(elapsed / RESCUE_ROTATION_DURATION_MS, 1)
          // sin-Kurve: langsam starten, in der Mitte peak, wieder langsam enden
          const angularDelta =
            (RESCUE_ROTATION_TOTAL_RAD / RESCUE_ROTATION_DURATION_MS) *
            (delta * 1000) *
            Math.sin(t * Math.PI)
          const dir = galaxyStore.rescueRotationDirection
          for (const star of stars) star.angle += angularDelta * dir
          for (const d of dustPatches) d.angle += angularDelta * dir
          for (const c of starClusters) c.angle += angularDelta * dir
          if (t >= 1) galaxyStore.endRescueRotation()
        }
      }

      if (galaxyStore.starsBackgroundPaused) {
        // Kein Early-Return: der Frame wird statisch (delta = 0, speedMultiplier
        // bleibt 0) weitergezeichnet. Beim Tab-Rückwechsel alloziert
        // handleVisibilityChange() den Canvas-Backing-Store via resizeCanvas()
        // neu (leert ihn dabei) — ohne Neuzeichnen blieben sonst alle Sterne
        // unsichtbar, bis die Pause endet (Champion-Stern besiegt).
        delta = 0
      } else {
        const pendingTrans = galaxyStore.pendingTransition

        // Skip transitions already driven elsewhere: requestTransition() runs the
        // warp on wall-clock timers while the Bard profile is open (this loop is
        // paused there) — starting it again here would advance two galaxies.
        if (pendingTrans && !wasPendingTransition && !galaxyStore.isGalaxyTransitioning) {
          if (prefersReducedMotion.value) {
            galaxyStore.commitAdvance()
          } else {
            galaxyTransPhase = 'warp'
            galaxyTransElapsed = 0
            galaxyTransDir = Math.random() * Math.PI * 2
            galaxyStore.setGalaxyTransitioning(true)
          }
        }
        wasPendingTransition = pendingTrans

        if (galaxyTransPhase !== 'idle') {
          galaxyTransElapsed += delta * 1000
          if (galaxyTransPhase === 'warp') {
            if (galaxyTransElapsed >= GALAXY_TRANS_WARP_MS) {
              galaxyStore.commitAdvance()
              galaxyTransPhase = 'decel'
              galaxyTransElapsed -= GALAXY_TRANS_WARP_MS
            }
          } else if (galaxyTransPhase === 'decel') {
            if (galaxyTransElapsed >= GALAXY_TRANS_DECEL_MS) {
              galaxyTransPhase = 'idle'
              galaxyTransElapsed = 0
              galaxyStore.setGalaxyTransitioning(false)
            }
          }
        }

        if (galaxyStore.isRescueRotating) {
          speedMultiplier = 0
        } else if (galaxyTransPhase === 'warp') {
          const t = Math.min(galaxyTransElapsed / GALAXY_TRANS_WARP_MS, 1)
          speedMultiplier = 1 + 44 * (t * t * t)
        } else if (galaxyTransPhase === 'decel') {
          const t = Math.min(galaxyTransElapsed / GALAXY_TRANS_DECEL_MS, 1)
          speedMultiplier = 1 + 44 * Math.pow(1 - t, 3.5)
        } else {
          const solar = useSolarUpgradeStore()
          const flightBonus = 1 + solar.flightSpeedLevel * SOLAR_STAR_SPEED_BONUS
          // Comet origin state: stars drift noticeably faster — the comet races
          // through space (streak trails stay off, they need hyperActive/warp).
          const cometBoost = solar.isCometState ? COMET_DRIFT_SPEED_MULT : 1
          speedMultiplier = hyperActive
            ? 1 + Math.min(hyperspaceElapsed / 2, 1) * 19
            : flightBonus * cometBoost
        }
      }
    }

    // Aus dem Cache statt aus dem DOM: clientWidth/clientHeight erzwangen hier
    // jeden Frame ein Layout, getContext() einen Lookup. Gepflegt wird der Cache
    // von resizeCanvas() (Resize, Sichtbarkeitswechsel, Context-Verlust).
    if (cachedCtx === null || cachedW === 0) refreshCanvasCache()
    const w = cachedW
    const h = cachedH
    const ctx = cachedCtx

    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    const cx = w / 2,
      cy = h / 2
    const maxDist = Math.hypot(cx, cy) + 20

    // ── Kosmischer Staub ────────────────────────────────────────────────────
    if (ctx) {
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      for (const d of dustPatches) {
        const dNorm = d.dist / maxDist
        const dSpeed = d.baseSpeed * dNorm * dNorm * WARP_SPEED_MAX * speedMultiplier
        if (galaxyTransPhase === 'warp') {
          const sx = cx + Math.cos(d.angle) * d.dist
          const sy = cy + Math.sin(d.angle) * d.dist
          const nx = sx + Math.cos(galaxyTransDir) * dSpeed * delta
          const ny = sy + Math.sin(galaxyTransDir) * dSpeed * delta
          d.dist = Math.hypot(nx - cx, ny - cy)
          d.angle = Math.atan2(ny - cy, nx - cx)
        } else {
          d.dist += dSpeed * delta
        }
        if (d.dist > maxDist) {
          d.angle = Math.random() * Math.PI * 2
          d.dist = maxDist * (0.02 + Math.random() * 0.06)
          d.baseSpeed = 0.1 + Math.random() * 0.08
        }
        const px = cx + Math.cos(d.angle) * d.dist
        const py = cy + Math.sin(d.angle) * d.dist
        const dScale = 0.3 + dNorm * 1.4
        const rx = d.rx * dScale
        const ry = d.ry * dScale
        const fadeEdge = dNorm > 0.85 ? 1 - (dNorm - 0.85) / 0.15 : 1
        const finalOpacity = d.opacity * Math.min(1, dNorm * 2.5) * fadeEdge
        if (
          !d.cachedGradient ||
          Math.abs(rx - d._cachedRx) > 1 ||
          Math.abs(finalOpacity - d._cachedOpacity) > 0.008
        ) {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
          grad.addColorStop(0, `rgba(${d.r},${d.g},${d.b},${finalOpacity.toFixed(3)})`)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          d.cachedGradient = grad
          d._cachedRx = rx
          d._cachedOpacity = finalOpacity
        }
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(d.rotation)
        ctx.scale(1, ry / rx)
        ctx.beginPath()
        ctx.arc(0, 0, rx, 0, Math.PI * 2)
        ctx.fillStyle = d.cachedGradient
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()
    }

    // ── Sternenhaufen ──────────────────────────────────────────────────────
    if (ctx) {
      for (const cluster of starClusters) {
        const cNorm = cluster.dist / maxDist
        const cSpeed = cluster.baseSpeed * cNorm * cNorm * WARP_SPEED_MAX * speedMultiplier
        if (galaxyTransPhase === 'warp') {
          const sx = cx + Math.cos(cluster.angle) * cluster.dist
          const sy = cy + Math.sin(cluster.angle) * cluster.dist
          const nx = sx + Math.cos(galaxyTransDir) * cSpeed * delta
          const ny = sy + Math.sin(galaxyTransDir) * cSpeed * delta
          cluster.dist = Math.hypot(nx - cx, ny - cy)
          cluster.angle = Math.atan2(ny - cy, nx - cx)
        } else {
          cluster.dist += cSpeed * delta
        }
        if (cluster.dist > maxDist) {
          cluster.angle = Math.random() * Math.PI * 2
          cluster.dist = maxDist * (0.02 + Math.random() * 0.06)
          cluster.baseSpeed = 0.56 + Math.random() * 0.32
        }
        const pcx = cx + Math.cos(cluster.angle) * cluster.dist
        const pcy = cy + Math.sin(cluster.angle) * cluster.dist
        cluster.twinklePhase += 0.5 * delta
        const distAlpha = Math.min(1, cNorm * 3)
        const fadeEdge = cNorm > 0.85 ? 1 - (cNorm - 0.85) / 0.15 : 1
        const baseAlpha = distAlpha * fadeEdge * (0.3 + 0.1 * Math.sin(cluster.twinklePhase))
        const spreadScale = 0.25 + cNorm * 1.6
        for (const s of cluster.stars) {
          const a = baseAlpha * s.brightness
          if (a < 0.02) continue
          const dotSize = s.brightness * spreadScale * 1.2
          drawDotSprite(
            ctx,
            s.r,
            s.g,
            s.b,
            pcx + s.dx * spreadScale,
            pcy + s.dy * spreadScale,
            dotSize,
            a,
          )
        }
        ctx.globalAlpha = 1
      }
    }

    // ── Sterne ─────────────────────────────────────────────────────────────
    for (const star of stars) {
      const norm = star.dist / maxDist
      let speed: number
      if (galaxyTransPhase === 'warp') {
        speed = star.baseSpeed * WARP_SPEED_MAX * speedMultiplier
        const sx = cx + Math.cos(star.angle) * star.dist
        const sy = cy + Math.sin(star.angle) * star.dist
        const nx = sx + Math.cos(galaxyTransDir) * speed * delta
        const ny = sy + Math.sin(galaxyTransDir) * speed * delta
        star.dist = Math.hypot(nx - cx, ny - cy)
        star.angle = Math.atan2(ny - cy, nx - cx)
      } else {
        speed = star.baseSpeed * norm * norm * WARP_SPEED_MAX * speedMultiplier
        star.dist += speed * delta
      }
      if (star.dist > maxDist) {
        if (galaxyTransPhase === 'warp') {
          star.angle = galaxyTransDir + Math.PI / 2 + Math.random() * Math.PI
          star.dist = maxDist * (0.05 + Math.random() * 0.88)
          star.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
        } else if (galaxyTransPhase === 'decel') {
          star.angle = Math.random() * Math.PI * 2
          star.dist = maxDist * (0.25 + Math.random() * 0.65)
          star.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
        } else {
          star.angle = Math.random() * Math.PI * 2
          star.dist = hyperActive
            ? maxDist * (0.02 + Math.random() * 0.08)
            : maxDist * (0.1 + Math.random() * 0.35)
          star.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
        }
      }
      const x = cx + Math.cos(star.angle) * star.dist
      const y = cy + Math.sin(star.angle) * star.dist
      const distAlpha = Math.min(1, norm * 4)
      star.twinklePhase += star.twinkleSpeed * delta
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase)
      const fadeEdge = norm > 0.88 ? 1 - (norm - 0.88) / 0.12 : 1
      let alpha: number
      if (hyperActive) alpha = Math.min(1, distAlpha * 1.5)
      else if (galaxyTransPhase === 'decel') alpha = Math.min(1, distAlpha * 1.8) * fadeEdge
      else alpha = distAlpha * (0.5 + 0.5 * twinkle) * fadeEdge
      if (ctx) {
        const isStreaking =
          (hyperActive || galaxyTransPhase === 'warp' || galaxyTransPhase === 'decel') &&
          speedMultiplier > 1.5
        const trailAngle = galaxyTransPhase === 'warp' ? galaxyTransDir : star.angle
        if (isStreaking) {
          const trailLength = speed * delta * 2.2
          ctx.beginPath()
          ctx.moveTo(x - Math.cos(trailAngle) * trailLength, y - Math.sin(trailAngle) * trailLength)
          ctx.lineTo(x, y)
          ctx.strokeStyle = `rgba(${star.r},${star.g},${star.b},${alpha})`
          ctx.lineWidth = 0.8 + speedMultiplier * 0.12
          ctx.lineCap = 'round'
          ctx.stroke()
        } else {
          // Ein drawImage statt Kern- + Halo-Fill. Das sparte pro Frame 800
          // Canvas-Pfade und 800 `rgba(…)`-Strings (siehe starSprites.ts).
          const starSize = 0.8 + norm * norm * 5.0
          drawStarSprite(ctx, star.r, star.g, star.b, x, y, starSize, alpha)
        }
      }
    }
    if (ctx) ctx.globalAlpha = 1

    // ── Flight streaks — the player flies INTO the screen in every phase;
    // shed material streams back past the viewer as radial phase-tinted
    // lines riding the same center-outward flow as the stars.
    if (ctx && !isFrozen && speedMultiplier > 0) {
      const solarForStreaks = useSolarUpgradeStore()
      const streakColor = solarForStreaks.isCometState
        ? COMET_PHASE_DATA.accent
        : STAR_PHASE_DATA[solarForStreaks.starPhase].phaseGlow
      while (flightStreaks.length < FLIGHT_STREAK_COUNT) {
        flightStreaks.push({
          angle: Math.random() * Math.PI * 2,
          dist: maxDist * (0.05 + Math.random() * 0.3),
          baseSpeed: STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE,
        })
      }
      for (const s of flightStreaks) {
        const sNorm = s.dist / maxDist
        const sSpeed =
          s.baseSpeed * sNorm * sNorm * WARP_SPEED_MAX * speedMultiplier * FLIGHT_STREAK_SPEED_MULT
        s.dist += sSpeed * delta
        if (s.dist > maxDist) {
          s.angle = Math.random() * Math.PI * 2
          s.dist = maxDist * (0.05 + Math.random() * 0.1)
          s.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
        }
        const len = Math.max(6, sSpeed * delta * FLIGHT_STREAK_LEN_FACTOR)
        const hx = cx + Math.cos(s.angle) * s.dist
        const hy = cy + Math.sin(s.angle) * s.dist
        const tx = hx - Math.cos(s.angle) * len
        const ty = hy - Math.sin(s.angle) * len
        // fade in with distance like the stars: invisible at center, present
        // at the edges where it rushes past the camera
        const alpha = Math.min(1, sNorm * 3)
        if (alpha < 0.05) continue
        const grad = ctx.createLinearGradient(tx, ty, hx, hy)
        grad.addColorStop(0, `${streakColor}00`)
        grad.addColorStop(1, `${streakColor}${STREAK_ALPHA_HEX}`)
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(hx, hy)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1 + sNorm * 1.2
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.restore()
      }

      // Streak bursts: a calm→gust→calm rhythm — every few seconds a handful
      // of bright, long lines rushes past. Skipped during warp/hyperspace,
      // where the stars themselves already streak.
      burstCooldown -= delta
      if (burstCooldown <= 0 && galaxyTransPhase === 'idle' && !hyperActive) {
        const count =
          FLIGHT_BURST_STREAK_MIN +
          Math.floor(Math.random() * (FLIGHT_BURST_STREAK_MAX - FLIGHT_BURST_STREAK_MIN + 1))
        for (let i = 0; i < count; i++) {
          burstStreaks.push({
            angle: Math.random() * Math.PI * 2,
            dist: maxDist * (0.1 + Math.random() * 0.2),
            baseSpeed:
              STAR_BG_BASE_SPEED_MIN + STAR_BG_BASE_SPEED_RANGE * (0.7 + Math.random() * 0.3),
          })
        }
        burstCooldown =
          FLIGHT_BURST_INTERVAL_MIN_SEC +
          Math.random() * (FLIGHT_BURST_INTERVAL_MAX_SEC - FLIGHT_BURST_INTERVAL_MIN_SEC)
      }
      for (let i = burstStreaks.length - 1; i >= 0; i--) {
        const s = burstStreaks[i]
        const sNorm = s.dist / maxDist
        const sSpeed =
          s.baseSpeed * sNorm * sNorm * WARP_SPEED_MAX * speedMultiplier * FLIGHT_BURST_SPEED_MULT
        s.dist += sSpeed * delta
        if (s.dist > maxDist) {
          // gusts are finite — the streak leaves the screen and is gone
          burstStreaks.splice(i, 1)
          continue
        }
        const len = Math.max(10, sSpeed * delta * FLIGHT_BURST_LEN_FACTOR)
        const hx = cx + Math.cos(s.angle) * s.dist
        const hy = cy + Math.sin(s.angle) * s.dist
        const tx = hx - Math.cos(s.angle) * len
        const ty = hy - Math.sin(s.angle) * len
        const alpha = Math.min(1, sNorm * 3)
        if (alpha < 0.05) continue
        const grad = ctx.createLinearGradient(tx, ty, hx, hy)
        grad.addColorStop(0, `${streakColor}00`)
        grad.addColorStop(1, `${streakColor}${BURST_ALPHA_HEX}`)
        ctx.save()
        ctx.globalAlpha = alpha
        const outerWidth = FLIGHT_BURST_WIDTH * (0.6 + sNorm)
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(hx, hy)
        ctx.strokeStyle = grad
        ctx.lineWidth = outerWidth
        ctx.lineCap = 'round'
        ctx.stroke()
        // hot white core — reads as bright without expensive shadowBlur
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(hx, hy)
        ctx.strokeStyle = `rgba(255,255,255,${(FLIGHT_BURST_ALPHA * 0.5).toFixed(3)})`
        ctx.lineWidth = outerWidth * 0.35
        ctx.stroke()
        ctx.restore()
      }
    }

    // ── Comet debris — rocks streaming past while in comet origin state ────
    if (ctx && !isFrozen) {
      const isComet = useSolarUpgradeStore().isCometState
      if (!isComet && cometDebris.length > 0) cometDebris.length = 0
      if (isComet) {
        while (cometDebris.length < COMET_DEBRIS_COUNT) {
          cometDebris.push({
            angle: Math.random() * Math.PI * 2,
            dist: maxDist * (0.05 + Math.random() * 0.1),
            baseSpeed: STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE,
            r: COMET_DEBRIS_MIN_R + Math.random() * (COMET_DEBRIS_MAX_R - COMET_DEBRIS_MIN_R),
            spin: Math.random() * Math.PI * 2,
            spinSpeed: (Math.random() - 0.5) * 2,
            verts: Array.from({ length: 7 }, () => 0.7 + Math.random() * 0.6),
          })
        }
        for (const d of cometDebris) {
          const dNorm = d.dist / maxDist
          d.dist +=
            d.baseSpeed *
            dNorm *
            dNorm *
            WARP_SPEED_MAX *
            speedMultiplier *
            COMET_DEBRIS_SPEED_MULT *
            delta
          d.spin += d.spinSpeed * delta
          if (d.dist > maxDist) {
            d.angle = Math.random() * Math.PI * 2
            d.dist = maxDist * (0.05 + Math.random() * 0.08)
            d.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
            d.r = COMET_DEBRIS_MIN_R + Math.random() * (COMET_DEBRIS_MAX_R - COMET_DEBRIS_MIN_R)
            d.verts = Array.from({ length: 7 }, () => 0.7 + Math.random() * 0.6)
          }
          const px = cx + Math.cos(d.angle) * d.dist
          const py = cy + Math.sin(d.angle) * d.dist
          const scale = 0.3 + dNorm * 1.2
          const alpha = Math.min(1, dNorm * 3)
          if (alpha < 0.03) continue
          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(d.spin)
          ctx.globalAlpha = alpha
          ctx.beginPath()
          for (let v = 0; v < d.verts.length; v++) {
            const a = (v / d.verts.length) * Math.PI * 2
            const rr = d.r * scale * d.verts[v]
            if (v === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
            else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
          }
          ctx.closePath()
          ctx.fillStyle = COMET_PHASE_DATA.mid
          ctx.fill()
          ctx.beginPath()
          ctx.arc(d.r * scale * 0.25, -d.r * scale * 0.15, d.r * scale * 0.28, 0, Math.PI * 2)
          ctx.fillStyle = COMET_PHASE_DATA.crater
          ctx.fill()
          ctx.restore()
        }
        ctx.globalAlpha = 1
      }
    }

    // ── Galaxy-SVG-Animation ───────────────────────────────────────────────
    for (let i = galaxies.length - 1; i >= 0; i--) {
      const g = galaxies[i]
      g.elapsed += delta * 1000
      const p = Math.min(g.elapsed / g.lifetime, 1)
      g.scale = 0.05 + (g.maxScale - 0.05) * (p * p)
      let opacity: number
      if (p < 0.15) opacity = p / 0.15
      else if (p < 0.75) opacity = 1
      else opacity = 1 - (p - 0.75) / 0.25
      if (hyperActive || galaxyTransPhase === 'warp') {
        const fadeTime = hyperActive ? hyperspaceElapsed : galaxyTransElapsed / 1000
        opacity *= Math.max(0, 1 - fadeTime * 3)
      }
      const gOpStr = opacity.toFixed(2)
      if (g._lastOpacity !== gOpStr) {
        g.el.style.opacity = gOpStr
        g._lastOpacity = gOpStr
      }
      const gTrStr = `translate(${g.x}px,${g.y}px) scale(${g.scale.toFixed(3)}) rotate(${g.rot}deg)`
      if (g._lastTransform !== gTrStr) {
        g.el.style.transform = gTrStr
        g._lastTransform = gTrStr
      }
      if (p >= 1) {
        g.el.style.visibility = 'hidden'
        const poolSlot = galaxyPool.find((s) => s.el === g.el)
        if (poolSlot) poolSlot.active = false
        galaxies.splice(i, 1)
      }
    }

    // ── Emission Nebula / Ion Cloud ────────────────────────────────────────
    for (let i = emissionNebulas.length - 1; i >= 0; i--) {
      const n = emissionNebulas[i]
      const nNorm = n.dist / maxDist
      const nSpeed = n.baseSpeed * nNorm * nNorm * WARP_SPEED_MAX * speedMultiplier
      if (galaxyTransPhase === 'warp') {
        const sx = cx + Math.cos(n.angle) * n.dist
        const sy = cy + Math.sin(n.angle) * n.dist
        const nx2 = sx + Math.cos(galaxyTransDir) * nSpeed * delta
        const ny2 = sy + Math.sin(galaxyTransDir) * nSpeed * delta
        n.dist = Math.hypot(nx2 - cx, ny2 - cy)
        n.angle = Math.atan2(ny2 - cy, nx2 - cx)
      } else {
        n.dist += nSpeed * delta
      }
      n.scale = 0.02 + (n.maxScale - 0.02) * nNorm
      const wx = cx + Math.cos(n.angle) * n.dist
      const wy = cy + Math.sin(n.angle) * n.dist
      const hw = n.size / 2
      const distAlpha = Math.min(1, nNorm * 3)
      const fadeEdge = nNorm > 0.85 ? 1 - (nNorm - 0.85) / 0.15 : 1
      let opacity = distAlpha * fadeEdge * 0.65
      if (hyperActive || galaxyTransPhase === 'warp') {
        const fadeTime = hyperActive ? hyperspaceElapsed : galaxyTransElapsed / 1000
        opacity *= Math.max(0, 1 - fadeTime * 2)
      }
      const nOpStr = opacity.toFixed(3)
      if (n._lastOpacity !== nOpStr) {
        n.el.style.opacity = nOpStr
        n._lastOpacity = nOpStr
      }
      const nTrStr = `translate(${wx.toFixed(1)}px,${wy.toFixed(1)}px) scale(${n.scale.toFixed(3)}) translate(${-hw}px,${-hw}px)`
      if (n._lastTransform !== nTrStr) {
        n.el.style.transform = nTrStr
        n._lastTransform = nTrStr
      }
      if (n.dist > maxDist) {
        n.el.style.visibility = 'hidden'
        const poolSlot = nebulaPool.find((s) => s.el === n.el)
        if (poolSlot) poolSlot.active = false
        emissionNebulas.splice(i, 1)
        if (!prefersReducedMotion.value)
          setTimeout(() => spawnEmissionNebula(), 200 + Math.random() * 1500)
      }
    }

    // Nächsten Frame anfordern
    animFrame = requestAnimationFrame(animateStars)
  }

  // ── Resize, Stars, Cleanup ────────────────────────────────────────────────
  function handleResize(): void {
    if (resizeTimeout) clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const oldW = starCanvas.value?.width || window.innerWidth
      const oldH = starCanvas.value?.height || window.innerHeight
      const oldMaxDist = Math.hypot(oldW / 2, oldH / 2) + 20
      resizeCanvas()
      if (!starsContainer.value || stars.length === 0) return
      const w = starsContainer.value.clientWidth || window.innerWidth
      const h = starsContainer.value.clientHeight || window.innerHeight
      const newMaxDist = Math.hypot(w / 2, h / 2) + 20
      const scale = newMaxDist / oldMaxDist
      for (const star of stars) star.dist = star.dist * scale
      for (const d of dustPatches) {
        d.cachedGradient = null
        d._cachedRx = -1
        d._cachedOpacity = -1
      }
    }, 150)
  }

  function createStars(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    stars.length = 0
    resizeCanvas()
    initDust()
    initClusters()
    initGalaxyPool()
    initNebulaPool()
    if (!isFrozen) {
      for (let i = 0; i < EMISSION_MAX_COUNT; i++) spawnEmissionNebula(true)
    }
    const starCount = Math.max(STAR_BG_MIN_STARS, Math.round(STAR_COUNT * densityScale()))
    for (let i = 0; i < starCount; i++) spawnStar(true)
    lastTimestamp = 0
    if (isWindowFocused) startLoop()
  }

  function handleVisibilityChange(): void {
    if (document.hidden) {
      stopLoop()
      if (galaxySpawnTimeout) {
        clearTimeout(galaxySpawnTimeout)
        galaxySpawnTimeout = null
      }
      if (emissionSpawnTimeout) {
        clearTimeout(emissionSpawnTimeout)
        emissionSpawnTimeout = null
      }
    } else {
      // Fokus-Zustand direkt neu abfragen statt dem gecachten Flag zu trauen —
      // beim Tab-Rückwechsel kann das focus-Event nach visibilitychange kommen
      // (oder ganz ausbleiben), dann wäre isWindowFocused hier noch veraltet.
      isWindowFocused = document.hasFocus()
      // Nach langem Hintergrund-Aufenthalt kann der Canvas-Backing-Store vom
      // Browser verworfen worden sein → hart neu allozieren (Loop übermalt
      // den frischen Buffer im nächsten Frame vollständig).
      resizeCanvas()
      if (!prefersReducedMotion.value && stars.length > 0 && isWindowFocused) {
        startLoop()
        scheduleNextGalaxy()
        scheduleNextEmission()
      }
    }
  }

  function cleanup(): void {
    stopLoop()
    stopFocusPolling()
    if (galaxySpawnTimeout) {
      clearTimeout(galaxySpawnTimeout)
      galaxySpawnTimeout = null
    }
    if (emissionSpawnTimeout) {
      clearTimeout(emissionSpawnTimeout)
      emissionSpawnTimeout = null
    }
    timeouts.forEach((id) => clearTimeout(id))
    timeouts.length = 0
    stars.length = 0
    if (starsContainer.value) {
      for (const slot of galaxyPool) {
        if (starsContainer.value.contains(slot.el)) starsContainer.value.removeChild(slot.el)
      }
      for (const slot of nebulaPool) {
        if (starsContainer.value.contains(slot.el)) starsContainer.value.removeChild(slot.el)
      }
    }
    galaxyPool.length = 0
    nebulaPool.length = 0
    galaxies.length = 0
    emissionNebulas.length = 0
    dustPatches.length = 0
    starClusters.length = 0
    window.removeEventListener('resize', handleResize)
    containerObserver?.disconnect()
    containerObserver = null
    starCanvas.value?.removeEventListener('contextrestored', handleContextRestored)
    removeFocusListener?.()
    if (resizeTimeout) clearTimeout(resizeTimeout)
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

      // Polling-Fallback: zuverlässige Fokus-Erkennung für Chrome Multi-Monitor
      startFocusPolling()

      setTimeout(createStars, 100)
      starCanvas.value?.addEventListener('contextrestored', handleContextRestored)
      window.addEventListener('resize', handleResize)
      // Container-Maße liegen jetzt im Cache statt pro Frame aus dem DOM zu
      // kommen. Das window-Resize-Event deckt nur den Vollbild-Fall ab — eine
      // eingebettete Instanz (Shop) kann sich auch ohne Fenster-Resize ändern,
      // deshalb zusätzlich der Observer auf dem Container selbst.
      if (starsContainer.value) {
        containerObserver = new ResizeObserver(() => handleResize())
        containerObserver.observe(starsContainer.value)
      }
      scheduleNextGalaxy()
      scheduleNextEmission()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    cleanup()
  })

  return { starsContainer, starCanvas, prefersReducedMotion }
}
