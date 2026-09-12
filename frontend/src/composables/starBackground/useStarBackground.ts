import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  drawStarSprite,
  drawBloomSprite,
  drawStreakSprite,
  starFogTier,
  warpDopplerTier,
  WARP_DOPPLER_OWN,
} from '@/composables/starBackground/starSprites'
import {
  clearClusters,
  createClusterField,
  drawClusters,
  firstClusterDelay,
  rescaleClusters,
  rotateClusters,
  seedStaticClusters,
  spawnCluster,
  stepClusters,
  type ClusterField,
  type ClusterKind,
} from '@/composables/starBackground/starClusters'
import { pickFieldStarColor } from '@/composables/starBackground/starPalette'
import {
  createGalaxyWarp,
  additiveDrawAlpha,
  persistentDrawAlpha,
  resetGalaxyWarp,
  startGalaxyWarp,
  stepGalaxyWarp,
  type WarpFlightOut,
  easeOutCubic,
} from '@/utils/orbit/galaxyWarp'
import {
  createUniverseHop,
  resetUniverseHop,
  startUniverseHop,
  stepUniverseHop,
} from '@/utils/orbit/universeHop'
import { buildPortalSprite, portalSpriteSpan } from '@/utils/fx/portalSprite'
import { GALAXY_WHITE } from '@/utils/fx/universeDisc'
import { hexToRgbTriple } from '@/utils/ui/format'
import {
  bakeWormholeWall,
  createWormholeTunnel,
  drawWormholeBody,
  drawWormholeTunnel,
  type WormholeFrame,
  type WormholeTunnel,
} from '@/utils/fx/wormholeTunnel'
import { useGameStore } from '@/stores/core/gameStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  STAR_COUNT,
  STAR_BG_MIN_STARS,
  UNIVERSE_MAP_PORTAL_PHOTON_R,
  UNIVERSE_MAP_PORTAL_RY,
  UNIVERSE_HOP_PORTAL_SPRITE_PX,
  UNIVERSE_HOP_STAR_SURGE_COUNT,
  UNIVERSE_HOP_STAR_SURGE_SPEED_MULT,
  WARP_BOW_WAVE_ALPHA,
  WARP_BOW_WAVE_REACH_K,
  WARP_BOW_WAVE_W_FRAC,
  WARP_LAUNCH_RING_ALPHA,
  WARP_LAUNCH_RING_COUNT,
  WARP_LAUNCH_RING_R0_FRAC,
  WARP_LAUNCH_RING_R1_FRAC,
  WARP_LAUNCH_RING_STAGGER,
  WARP_LAUNCH_RING_W_FRAC,
  WARP_LAUNCH_RING_WHITE_LIFT,
  WARP_STAR_ALPHA_GAIN,
  WARP_STAR_SURGE_COUNT,
  WARP_STAR_SURGE_SPEED_MULT,
  WARP_SURGE_RESPAWN_FRAC,
  UNIVERSE_HOP_RIPPLE_COUNT,
  UNIVERSE_HOP_RIPPLE_GROWTH,
  UNIVERSE_HOP_RIPPLE_POW,
  UNIVERSE_HOP_RIPPLE_ALPHA,
  UNIVERSE_HOP_RIPPLE_W_FRAC,
  UNIVERSE_HOP_LENS_K,
  UNIVERSE_HOP_LENS_REACH,
  UNIVERSE_HOP_LENS_MAX_FRAC,
  UNIVERSE_HOP_LENS_FADE_FROM_FRAC,
  UNIVERSE_HOP_LENS_FADE_TO_FRAC,
  UNIVERSE_HOP_RIM_ARC_RAD,
  UNIVERSE_HOP_RIM_ARC_ALPHA,
  UNIVERSE_HOP_SWIRL_FADE_FROM_FRAC,
  UNIVERSE_HOP_SWIRL_FADE_TO_FRAC,
  UNIVERSE_HOP_THROAT_ALPHA_CORE,
  UNIVERSE_HOP_THROAT_ALPHA_MID,
  UNIVERSE_HOP_THROAT_MID_STOP,
  UNIVERSE_HOP_ARRIVAL_GALAXIES,
  WARP_SPEED_MAX,
  WARP_STREAK_WIDTH_BASE,
  WARP_STREAK_WIDTH_PER_SPEED,
  WARP_STREAK_WIDTH_SPEED_CAP,
  WARP_HEADLIGHT_ALPHA,
  WARP_HEADLIGHT_RADIUS_FRAC,
  GALAXY_SPAWN_INTERVAL_MIN,
  GALAXY_SPAWN_INTERVAL_MAX,
  GALAXY_MAX_COUNT,
  STAR_BG_BASE_SPEED_MIN,
  STAR_BG_BASE_SPEED_RANGE,
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
  FLIGHT_STREAK_BANDS,
  FLIGHT_EXPOSURE_SEC,
  FLIGHT_DRIFT_AMPLITUDE,
  FLIGHT_DRIFT_PERIOD_X_SEC,
  FLIGHT_DRIFT_PERIOD_Y_SEC,
  FLIGHT_DRIFT_EASE_SEC,
  WARP_STREAK_LEN_FACTOR,
  PROCESSION_TRAIL_ALPHA,
  PROCESSION_TRAIL_WIDTH_K,
  PROCESSION_SUN_TRAIL_ALPHA,
  PROCESSION_SUN_TRAIL_LEN_K,
  WARP_TINT_ALPHA,
  WARP_TINT_RADIUS_K,
  WARP_STREAK_LEN_MAX_FRAC,
  WARP_HEADLIGHT_TINT_CORE,
  WARP_HEADLIGHT_TINT_MID,
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
  EMISSION_MAX_COUNT,
  EMISSION_SPAWN_MAX,
  EMISSION_SPAWN_MIN,
  CLUSTER_FROZEN_SEED_COUNT,
  DUST_PATCH_COUNT,
  RESCUE_ROTATION_DURATION_MS,
  RESCUE_ROTATION_TOTAL_RAD,
  HELM_SLIP_EPS_PX_S,
  HELM_RESPAWN_BIAS,
  HELM_GALAXY_DEPTH,
  STAR_BG_FOG_TIERS,
  STAR_BG_BLOOM_SHARE,
  STAR_BG_BLOOM_MIN_NORM,
  STAR_BG_BLOOM_SCALE,
  STAR_BG_BLOOM_ALPHA,
} from '@/config/constants'
import { useWindowFocus } from '@/composables/system/useWindowFocus'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import {
  EMISSION_NEBULA_PALETTES,
  GALAXY_PALETTES_BY_TYPE,
  ION_CLOUD_PALETTES,
  type DustPatch,
  type EmissionPalette,
  type EmissionType,
  type GalaxyItem,
  type GalaxyPalette,
  type GalaxyType,
  type NebulaMovingItem,
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
import {
  createHelmState,
  stepHelm,
  type HelmInputs,
  type HelmOutput,
} from '@/utils/orbit/flightHelm'
import {
  flightLive,
  joltOut,
  kickFlightJolt,
  resetFlightJolt,
  resetFlightLive,
  setFlightCourse,
  stepFlightJolt,
  writeFlightFollowers,
} from '@/utils/orbit/flightLive'
import { rotateAbout, slipPolar, trailAngle, upstreamAngle } from '@/utils/orbit/flightField'
import { mixGlow, themeGlowRgb } from '@/utils/fx/galaxyTint'
import {
  processionLive,
  processionTrailAngle,
  processionTrailLength,
  resetProcessionLive,
} from '@/utils/orbit/flightProcession'
import {
  clearEncounters,
  createEncounterField,
  drawEncounters,
  firstEncounterDelay,
  rescaleEncounters,
  spawnEncounter,
  stepEncounters,
  type EncounterFrame,
  type EncounterKind,
} from '@/utils/fx/skyEncounters'
import { registerSkyDebug } from '@/utils/orbit/flightLive'
import { requestEvade } from '@/utils/orbit/flightHelm'
import { cometTintForGalaxy } from '@/composables/starBackground/useBackgroundComets'

const alphaHex = (a: number) =>
  Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')
/** Je Tiefenband ein 2-stelliges Hex-Suffix für 8-stellige Canvas-Farben. */
const BAND_ALPHA_HEX = FLIGHT_STREAK_BANDS.map((b) => alphaHex(b.alpha))
/** Same for FLIGHT_BURST_ALPHA (outer stroke of burst streaks). */
const BURST_ALPHA_HEX = alphaHex(FLIGHT_BURST_ALPHA)

// ─── Types ────────────────────────────────────────────────────────────────────

type FlightStreak = {
  angle: number
  dist: number
  baseSpeed: number
  /** Tiefenband (Index in FLIGHT_STREAK_BANDS). */
  band: number
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
  const clusters: ClusterField = createClusterField(firstClusterDelay(Math.random))
  const cometDebris: DebrisRock[] = []
  const flightStreaks: FlightStreak[] = []
  /** Finite gusts of bright speed lines; refilled when burstCooldown expires. */
  const burstStreaks: FlightStreak[] = []
  /** Wandernder Fluchtpunkt — Phase in Sekunden, Gewicht 0..1 (weich ein/aus). */
  let driftPhase = 0
  let driftGain = 0
  const helm = createHelmState()
  const helmInputs: HelmInputs = {
    dt: 0,
    active: false,
    traveling: false,
    minEdge: 0,
    baseFocusX: 0,
    baseFocusY: 0,
    rand: Math.random,
    jolt: joltOut(),
  }
  const rotOut = { x: 0, y: 0 }
  const sky = createEncounterField(firstEncounterDelay(Math.random))
  const encounterFrame: EncounterFrame = {
    w: 0,
    h: 0,
    cx: 0,
    cy: 0,
    maxDist: 0,
    minEdge: 0,
    delta: 0,
    speedMultiplier: 0,
    slipX: 0,
    slipY: 0,
    rollStep: 0,
    tint: [230, 235, 255],
  }
  let tintKey = ''
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

  // Der Galaxien-Warp: Phasen, Kurs und Kurven leben in der reinen Maschine
  // (utils/orbit/galaxyWarp.ts); die Schleife liest je Frame nur `warp.out`.
  const warp = createGalaxyWarp()
  let wasPendingTransition = false
  // Der Universumssprung: dieselbe Bauart, dieselbe Schleife, nie zugleich.
  // Die drei Portal-Sprites werden unter dem deckenden Schleier gebacken.
  const hop = createUniverseHop()
  let wasHopFlight = false
  let hopMaw: HTMLCanvasElement | null = null
  let hopSwirl: HTMLCanvasElement | null = null
  let hopHalo: HTMLCanvasElement | null = null
  let hopTint = ''
  /** Kehlenlicht: EIN Verlauf im Einheitsradius, je Frame nur skaliert. */
  let hopThroat: CanvasGradient | null = null
  /** Die Wormhole-Röhre der Passage: Stränge und Palette je Sprung gewürfelt. */
  let hopTunnel: WormholeTunnel | null = null
  const hopFrame: WormholeFrame = {
    w: 0,
    h: 0,
    focal: 0,
    view: hop.view,
    tunnelSec: 0,
    twist: 0,
    trailFade: 1,
    tubeAlpha: 0,
    exitLight: 0,
    peek: null,
    peekPx: UNIVERSE_HOP_PORTAL_SPRITE_PX,
    peekSpan: portalSpriteSpan('maw', UNIVERSE_HOP_PORTAL_SPRITE_PX),
  }
  /** Versatz der Gruppe im Wormhole, je Frame der Spieler im Bild der Verfolgerkamera. */
  const leadShift = { x: 0, y: 0 }
  /** Ton der Aufbruch-Ringe — einmal je Reise, kein String je Frame. */
  let warpLaunchStyle = 'rgb(255, 255, 255)'
  /** Aufhellung um den Fluchtpunkt: EIN Verlauf bei (0,0), neu nur bei anderem Radius. */
  let headlightRadius = 0
  /** Signale an die Komponente: Nebel aus, Vignette an, Blitz (Zähler + Akzentfarbe). */
  const warpNebulaHidden = ref(false)
  const warpVignetteOn = ref(false)
  const warpFlashKey = ref(0)
  /**
   * Der Scheinwerfer am Fluchtpunkt in der Farbe einer Welt. Der Kern bleibt
   * fast weiss — er TRÄGT die Weltfarbe, ersetzt sie nicht; ein gesättigter
   * Kern wäre eine farbige Taschenlampe statt einer Tunnelmündung.
   */
  function buildHeadlight(
    c: CanvasRenderingContext2D,
    radius: number,
    rgb: readonly [number, number, number],
  ): CanvasGradient {
    const toward = (v: number, k: number) => Math.round(v + (255 - v) * k)
    const core = rgb.map((v) => toward(v, WARP_HEADLIGHT_TINT_CORE))
    const mid = rgb.map((v) => toward(v, WARP_HEADLIGHT_TINT_MID))
    const g = c.createRadialGradient(0, 0, 0, 0, 0, radius)
    g.addColorStop(0, `rgba(${core[0]},${core[1]},${core[2]},1)`)
    g.addColorStop(0.4, `rgba(${mid[0]},${mid[1]},${mid[2]},0.35)`)
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`)
    return g
  }

  const warpAccent = ref('')
  /**
   * Die Farbwelt, aus der und in die geflogen wird — beim Aufbruch festgehalten.
   * Der Tunnel trägt IMMER den Ton der Welt, in der er gerade fliegt, und wandert
   * über die zweite Flughälfte hinüber.
   */
  let warpGlowFrom: [number, number, number] = [180, 200, 255]
  let warpGlowTo: [number, number, number] = [180, 200, 255]
  /** Gerasterte Stufe der Überblendung — sie treibt den Gradient-Cache und die CSS-Ebenen. */
  /** Zählt je Aufbruch hoch — er stempelt die beiden gebackenen Headlight-Verläufe. */
  let warpGlowKey = 0
  let headlightKey = -1
  /** Der Farbschleier des Tunnels — neu gebaut, wenn Ton oder Reichweite wechseln. */
  let tunnelTint: CanvasGradient | null = null
  let tunnelTintKey = ''
  let headlightFrom: CanvasGradient | null = null
  let headlightTo: CanvasGradient | null = null

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
    if (!isFrozen) resetFlightJolt()
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
    for (let i = 0; i < GALAXY_MAX_COUNT; i++) {
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
  /** Baut das SVG-Motiv in einen Pool-Slot: Größe, Klasse, Zeichnung — ohne Platzierung. */
  function buildGalaxySvg(
    svg: SVGSVGElement,
    type: GalaxyType,
    palette: GalaxyPalette,
    size: number,
  ): void {
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

    switch (type) {
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
  }

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
    buildGalaxySvg(svg, config.type, palette, size)

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

  /**
   * Die Sprites bleiben im LRU des Painters — ein zweiter Sprung trifft den Cache. */
  function releaseHopSprites(): void {
    dropSurgeStars()
    hopMaw = null
    hopSwirl = null
    hopHalo = null
    hopThroat = null
    hopTunnel = null
  }

  /** Bei der Ankunft: alles, was den Flug ausgeblendet überlebt hat, räumen.
   * Sonst spränge eine halb abgelaufene Galaxie der ALTEN Welt mit voller
   * Deckkraft zurück ins Bild, sobald der Warp-Fade wegfällt.
   */
  function retireSkyDecor(): void {
    for (const g of galaxies) {
      g.el.style.visibility = 'hidden'
      const poolSlot = galaxyPool.find((s) => s.el === g.el)
      if (poolSlot) poolSlot.active = false
    }
    galaxies.length = 0
    for (const n of emissionNebulas) {
      n.el.style.visibility = 'hidden'
      const poolSlot = nebulaPool.find((s) => s.el === n.el)
      if (poolSlot) poolSlot.active = false
    }
    emissionNebulas.length = 0
    clearClusters(clusters)
    clusters.gap = firstClusterDelay(Math.random)
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

  /**
   * Nur die frozen-Instanz (Shop) bekommt einen festen Bestand: dort bleibt
   * `speedMultiplier` null, ein episodischer Haufen wanderte nie und stünde
   * für immer. Die Vollbild-Instanz lässt die Regie spawnen.
   */
  function initClusters(): void {
    clearClusters(clusters)
    if (!isFrozen) {
      clusters.gap = firstClusterDelay(Math.random)
      return
    }
    fillSkyFrame()
    seedStaticClusters(
      clusters,
      Math.max(1, Math.round(CLUSTER_FROZEN_SEED_COUNT * densityScale())),
      encounterFrame,
      Math.random,
    )
  }

  /** Maße für die Aussaat, bevor die Schleife das erste Mal gelaufen ist. */
  function fillSkyFrame(): void {
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    encounterFrame.w = w
    encounterFrame.h = h
    encounterFrame.cx = w / 2
    encounterFrame.cy = h / 2
    encounterFrame.maxDist = Math.hypot(w / 2, h / 2) + 20
    encounterFrame.minEdge = Math.min(w, h)
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
    const [r, g, b] = pickFieldStarColor()
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
      bloom: Math.random() < STAR_BG_BLOOM_SHARE,
      surge: false,
    }
    stars.push(item)
    return item
  }

  /** Der Sternen-Schub eines Flugs: nahe, schnelle Zusatzsterne in derselben Liste, derselben Schleife. */
  function spawnSurgeStars(count: number, speedMult: number): void {
    const n = Math.round(count * densityScale())
    for (let i = 0; i < n; i++) {
      const s = spawnStar(true)
      s.surge = true
      s.baseSpeed *= speedMult
    }
  }

  function dropSurgeStars(): void {
    let keep = 0
    for (let i = 0; i < stars.length; i++) if (!stars[i].surge) stars[keep++] = stars[i]
    stars.length = keep
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
    // Der Treffer-Ruck läuft auch im Stillstand — mit dem Delta VOR dem Nullen.
    const joltDelta = delta
    lastTimestamp = timestamp

    // Frozen (Shop): kein Heranfliegen, keine Galaxy-/Warp-/Rescue-Mutationen.
    let speedMultiplier = 0
    let rescueRotating = false
    let backgroundPaused = false
    let traveling = false
    if (!isFrozen) {
      const gameStore = useGameStore()
      const uiStore = useUiStore()
      const galaxyStore = useGalaxyStore()

      // ── Universumssprung ────────────────────────────────────────────────
      // Steigende Flanke: die Gate-Phase läuft noch im Profil (Schleife steht),
      // erst `flight` startet die Maschine. Der Waisen-Guard fängt den Fall,
      // dass das Netz des Schleiers den Store schon beendet hat, während diese
      // Schleife stand (Fenster ohne Fokus).
      const hopReq = uiStore.universeHop
      const hopFlight = hopReq !== null && hopReq.phase !== 'gate'
      if (hopFlight && !wasHopFlight && hop.phase === 'idle' && warp.phase === 'idle') {
        startUniverseHop(hop, Math.random)
        spawnSurgeStars(UNIVERSE_HOP_STAR_SURGE_COUNT, UNIVERSE_HOP_STAR_SURGE_SPEED_MULT)
        hopTint = hopReq!.accent
        const seed = gameStore.currentUniverse
        const px = UNIVERSE_HOP_PORTAL_SPRITE_PX
        hopMaw = buildPortalSprite('maw', seed, hopTint, hopReq!.target, px, 1)
        hopSwirl = buildPortalSprite('swirl', seed, hopTint, hopReq!.target, px, 1)
        hopHalo = buildPortalSprite('halo', seed, hopTint, hopReq!.target, px, 1)
        hopTunnel = createWormholeTunnel(hopTint, Math.random)
        bakeWormholeWall(hopTunnel, Math.random)
        clearEncounters(sky)
        warpNebulaHidden.value = true
        warpVignetteOn.value = true
      }
      wasHopFlight = hopFlight
      if (hop.phase !== 'idle' && hopReq === null) {
        resetUniverseHop(hop)
        releaseHopSprites()
        retireSkyDecor()
        warpNebulaHidden.value = false
        warpVignetteOn.value = false
      }

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
          rotateClusters(clusters, angularDelta * dir)
          if (t >= 1) galaxyStore.endRescueRotation()
        }
      }

      rescueRotating = galaxyStore.isRescueRotating
      backgroundPaused = galaxyStore.starsBackgroundPaused
      traveling = galaxyStore.championTravelState === 'traveling'
      // ── Galaxien-Warp ──────────────────────────────────────────────────────
      // Tickt VOR der Hintergrund-Pause: kein Pausengrund darf den Flug
      // einfrieren. (Der Store hält die Rollenwahl bis zur Ankunft zurück —
      // früher öffnete sie beim Galaxiewechsel, setzte den Hintergrund still
      // und mit ihm diese Maschine: das Ausrollen stand hinter dem Modal.)
      //
      // Skip transitions already driven elsewhere: requestTransition() runs the
      // warp on wall-clock timers under reduced motion (this loop never starts
      // there) — starting it again here would advance two galaxies.
      const pendingTrans = galaxyStore.pendingTransition
      if (pendingTrans && !wasPendingTransition && warp.phase === 'idle') {
        if (prefersReducedMotion.value) {
          galaxyStore.commitAdvance()
        } else {
          startGalaxyWarp(warp, Math.random)
          const warpUniverse = gameStore.currentUniverse
          warpGlowFrom = themeGlowRgb(galaxyStore.currentThemeIndex, warpUniverse)
          warpGlowTo = themeGlowRgb(
            galaxyStore.pendingThemeIndex ?? galaxyStore.currentThemeIndex,
            warpUniverse,
          )
          warpGlowKey++
          warpLaunchStyle = `rgb(${warpGlowFrom
            .map((v) => Math.round(v + (255 - v) * WARP_LAUNCH_RING_WHITE_LIFT))
            .join(', ')})`
          clearEncounters(sky)
          warpNebulaHidden.value = true
          warpVignetteOn.value = true
        }
      }
      wasPendingTransition = pendingTrans

      if (warp.phase !== 'idle') {
        if (cachedCtx === null || cachedW === 0) refreshCanvasCache()
        stepGalaxyWarp(warp, delta * 1000, Math.min(cachedW, cachedH))
        const wo = warp.out
        if (wo.launched) {
          // Der Schlag nach dem Atemzug: Rückstoss gegen den Kurs, Blitz im Ton
          // der alten Welt (derselbe Baustein wie am Schnitt), Schub-Sterne.
          kickFlightJolt('launch', warp.waypoints[0].az)
          spawnSurgeStars(WARP_STAR_SURGE_COUNT, WARP_STAR_SURGE_SPEED_MULT)
          warpAccent.value = warpLaunchStyle
          warpFlashKey.value++
        }
        if (wo.commit) {
          galaxyStore.commitAdvance()
          // Der Blitz war einmal ein VORHANG: eine Fläche im dunklen Akzent, die
          // den harten Schnitt des Hintergrund-Gradienten zudeckte. Diesen Schnitt
          // gibt es nicht mehr — die Farbe ist über den halben Flug hierher
          // gewandert. Geblieben ist der Moment selbst, und der gehört hell: ein
          // kurzer Durchbruch im Leuchtton der neuen Welt. Ein Abdunkeln würde
          // jetzt genau das zudecken, worauf alles zugelaufen ist.
          const [fr, fg, fb] = themeGlowRgb(
            galaxyStore.currentThemeIndex,
            gameStore.currentUniverse,
          )
          warpAccent.value = `rgb(${fr}, ${fg}, ${fb})`
          warpFlashKey.value++
          warpNebulaHidden.value = false
          warpVignetteOn.value = false
        }
        if (wo.done) {
          retireSkyDecor()
          dropSurgeStars()
          galaxyStore.setGalaxyTransitioning(false)
        }
        backgroundPaused = false
      }

      if (hop.phase !== 'idle') {
        if (cachedCtx === null || cachedW === 0) refreshCanvasCache()
        const ho = hop.out
        const far = Math.hypot(cachedW / 2, cachedH / 2) + Math.hypot(ho.focusX, ho.focusY)
        stepUniverseHop(hop, delta * 1000, Math.min(cachedW, cachedH), far)
        if (ho.wash) {
          uiStore.setUniverseHopPhase('threshold')
          warpVignetteOn.value = false
        }
        // Der einzige Ruck sitzt am Tunnelausgang, über den Flug-Helm; ein Ruck
        // beim Aufbruch schwang noch, als der Schleier hob — ein Kamerasprung.
        const hopFrom = Math.atan2(ho.focusY, ho.focusX)
        if (ho.commit) {
          // Der Reset läuft unter dem Peak des Wash. Die alte Welt geht HIER
          // (nicht auf done — das löschte den Schub gleich wieder), die neue
          // steht sofort da: Nebel zurück, drei Galaxien und ein Emissionsnebel.
          gameStore.commitUniverseHop()
          kickFlightJolt('hop', hopFrom)
          retireSkyDecor()
          for (let i = 0; i < UNIVERSE_HOP_ARRIVAL_GALAXIES; i++) spawnGalaxy()
          spawnEmissionNebula(true)
          warpNebulaHidden.value = false
        }
        if (ho.hudIn) uiStore.setUniverseHopPhase('arrive')
        if (ho.done) {
          releaseHopSprites()
          gameStore.finishUniverseHop()
        }
        backgroundPaused = false
      }

      if (backgroundPaused) {
        // Kein Early-Return: der Frame wird statisch (delta = 0, speedMultiplier
        // bleibt 0) weitergezeichnet. Beim Tab-Rückwechsel alloziert
        // handleVisibilityChange() den Canvas-Backing-Store via resizeCanvas()
        // neu (leert ihn dabei) — ohne Neuzeichnen blieben sonst alle Sterne
        // unsichtbar, bis die Pause endet (Champion-Stern besiegt).
        delta = 0
      } else {
        if (galaxyStore.isRescueRotating) {
          speedMultiplier = 0
        } else if (warp.phase !== 'idle') {
          speedMultiplier = warp.out.speed
        } else if (hop.phase !== 'idle') {
          speedMultiplier = hop.out.speed
        } else {
          const solar = useSolarUpgradeStore()
          const flightBonus = 1 + solar.flightSpeedLevel * SOLAR_STAR_SPEED_BONUS
          // Comet origin state: stars drift noticeably faster — the comet races
          // through space (streak trails stay off, they need a flight machine).
          const cometBoost = solar.isCometState ? COMET_DRIFT_SPEED_MULT : 1
          speedMultiplier = flightBonus * cometBoost
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

    // Beide Flugmaschinen liefern dieselbe Form; nie laufen zwei zugleich.
    const wo: WarpFlightOut = hop.phase !== 'idle' ? hop.out : warp.out
    const warpActive = warp.phase !== 'idle' || hop.phase !== 'idle'
    const rollingOut = warp.phase === 'decel' || hop.phase === 'emerge'
    const warpFlight = warpActive && !rollingOut

    if (ctx) {
      if (warpActive && wo.trailFade < 0.999) {
        // Persistenz-Blur: das Vorbild wird nur zum Teil gelöscht, die Striche
        // ziehen eine Spur. `destination-out` hält den Canvas transparent — die
        // CSS-Nebel darunter bleiben unberührt. Alpha und Composite werden
        // explizit gesetzt, weil die Sprite-Zeichner globalAlpha stehen lassen.
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = `rgba(0,0,0,${wo.trailFade.toFixed(3)})`
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        ctx.globalCompositeOperation = 'source-over'
      } else {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      }
    }

    // Der Fluchtpunkt wandert leicht um die Bildmitte; die Sonne bleibt dort
    // stehen — die Kamera hängt am Spieler, nur sein Kurs schiebt den Fokus.
    // Bei Warp, Hyperspace, Schwenk und Reduced-Motion fährt er weich auf 0.
    const driftOn = !isFrozen && !warpActive && speedMultiplier > 0 && !prefersReducedMotion.value
    const driftStep = delta / FLIGHT_DRIFT_EASE_SEC
    driftGain = Math.max(0, Math.min(1, driftGain + (driftOn ? driftStep : -driftStep)))
    driftPhase += delta
    const driftAmp = FLIGHT_DRIFT_AMPLITUDE * Math.min(w, h) * driftGain
    const baseFx = Math.sin((driftPhase * Math.PI * 2) / FLIGHT_DRIFT_PERIOD_X_SEC) * driftAmp
    const baseFy = Math.sin((driftPhase * Math.PI * 2) / FLIGHT_DRIFT_PERIOD_Y_SEC + 1.7) * driftAmp

    // Der Helm legt Kurs, Schräglage und Ausweichen auf das Wobbeln; nur die
    // Vollbild-Instanz hat einen und schreibt den Schweif.
    let helmOut: HelmOutput | null = null
    if (!isFrozen) {
      helmInputs.dt = delta
      helmInputs.active = driftOn && !rescueRotating && !backgroundPaused
      helmInputs.traveling = traveling
      helmInputs.minEdge = Math.min(w, h)
      helmInputs.baseFocusX = baseFx
      helmInputs.baseFocusY = baseFy
      stepFlightJolt(joltDelta)
      helmOut = stepHelm(helm, helmInputs)
      speedMultiplier *= helmOut.throttle
      flightLive.focusX = helmOut.focusX
      flightLive.focusY = helmOut.focusY
      flightLive.slipX = helmOut.slipX
      flightLive.slipY = helmOut.slipY
      flightLive.roll = helmOut.roll
      flightLive.bank = helmOut.bank
      flightLive.mode = helmOut.mode
    }
    // Im Warp kommt der Kurs dazu: der Fluchtpunkt steht am Kursziel, die
    // Sterne fließen von dort weg — das ist der Tunnel.
    const cx = w / 2 + (helmOut ? helmOut.focusX : baseFx) + wo.focusX
    const cy = h / 2 + (helmOut ? helmOut.focusY : baseFy) + wo.focusY
    // Der Schweif liest DIESEN Fluchtpunkt, nicht den Helm allein — sonst
    // stünde er im Warp still, der ohne Helm fährt. Erst der Kurs, dann die
    // Follower: umgekehrt trügen sie den Stand des Vorframes.
    // Die Lehne: im Wormhole steht die Sonne dort, wo die Verfolgerkamera den
    // Spieler sieht; im Warp lehnt sie sich in die Kurve zum Fluchtpunkt.
    leadShift.x = wo.playerX * wo.groupLead
    leadShift.y = wo.playerY * wo.groupLead
    if (!isFrozen) {
      setFlightCourse(cx - w / 2, cy - h / 2, Math.min(w, h), delta)
      flightLive.shiftX = leadShift.x
      flightLive.shiftY = leadShift.y
      flightLive.bodyRoll = wo.bodyRoll
      writeFlightFollowers()
    }
    // Die Prozession liest denselben Fluchtpunkt, den auch der Tunnel zeichnet:
    // `wo.focusX` allein wäre nur der Kursanteil ohne Helm und Drift, und der
    // Zug stünde neben den Strichen. Nur die Vollbild-Instanz schreibt — eine
    // eingebettete (Shop) überschriebe sonst dasselbe globale Objekt.
    if (!isFrozen) {
      processionLive.t = wo.procession
      // Nur das Wormhole gruppiert um den Spieler (der Ausgang liegt hinter der
      // Ecke); der Warp gruppiert um den Fluchtpunkt, die Sonne lehnt allein.
      const groupAroundPlayer = hop.phase !== 'idle' && wo.groupLead > 0
      processionLive.focusX = groupAroundPlayer ? w / 2 + leadShift.x : cx
      processionLive.focusY = groupAroundPlayer ? h / 2 + leadShift.y : cy
      processionLive.shiftX = leadShift.x
      processionLive.shiftY = leadShift.y
      processionLive.minEdge = Math.min(w, h)
      processionLive.sec += delta
      processionLive.active = warpActive
    }

    const maxDist = Math.hypot(w / 2, h / 2) + 20 + Math.hypot(cx - w / 2, cy - h / 2)
    // Slip in px/s (Gewicht 1 am Rand) und als Schritt dieses Frames; Roll als Schritt.
    const helmSlipOn =
      helmOut !== null &&
      !warpActive &&
      (Math.hypot(helmOut.slipX, helmOut.slipY) >= HELM_SLIP_EPS_PX_S || helmOut.rollRate !== 0)
    // Im Warp fliegen die Sterne die Kurve mit: der Slip der Maschine ist ein
    // ANTEIL der Strömung und wird hier auf dieselbe Skala wie die Radialformel
    // (norm² · WARP_SPEED_MAX · speedMultiplier) gebracht.
    const warpSlipOn = warpActive && (wo.slipX !== 0 || wo.slipY !== 0)
    const slipOn = helmSlipOn || warpSlipOn
    const warpSlipK = warpSlipOn ? WARP_SPEED_MAX * speedMultiplier : 0
    const slipVx = (helmSlipOn ? helmOut!.slipX : 0) + wo.slipX * warpSlipK
    const slipVy = (helmSlipOn ? helmOut!.slipY : 0) + wo.slipY * warpSlipK
    const slipX = slipVx * delta
    const slipY = slipVy * delta
    // Im Flug rollt das Feld um den Fluchtpunkt — zusätzlich zum Helm.
    const rollStep = (helmSlipOn ? helmOut!.rollRate * delta : 0) + wo.roll * delta
    encounterFrame.w = w
    encounterFrame.h = h
    encounterFrame.cx = cx
    encounterFrame.cy = cy
    encounterFrame.maxDist = maxDist
    encounterFrame.minEdge = Math.min(w, h)
    encounterFrame.delta = delta
    encounterFrame.speedMultiplier = speedMultiplier
    encounterFrame.slipX = slipX
    encounterFrame.slipY = slipY
    encounterFrame.rollStep = rollStep
    const respawnAngle = (): number =>
      slipOn && Math.random() < HELM_RESPAWN_BIAS
        ? upstreamAngle(slipVx, slipVy, Math.random)
        : Math.random() * Math.PI * 2

    // ── Das Tor — der Universumssprung ──────────────────────────────────────
    // Direkt nach dem Löschen und vor allem anderen: das Tor ist FERN, die
    // nahen Striche laufen darüber. Schlund, Halo und Wirbel sind gebackene
    // Sprites (skaliert, frontal entzerrt), Ring und Schwellensaum EIN
    // Vektorkreis je — ein skaliertes Rim-Sprite trüge gebackenen shadowBlur,
    // bei 5× ein Schmierfleck. Über der teilgelöschten Spur hinterlässt der
    // Ring Geisterringe nach innen: ein Tunnel aus Ringen, gewollt.
    // In der Passage liegt darunter der dunkle Körper der Wormhole-Röhre.
    const hopInTunnel = ctx !== null && hop.out.tunnelT > 0 && hopTunnel !== null
    if (hopInTunnel) {
      const ho = hop.out
      hopFrame.w = w
      hopFrame.h = h
      hopFrame.focal = ho.focal
      hopFrame.tunnelSec = ho.tunnelSec
      hopFrame.twist = ho.twist
      hopFrame.trailFade = ho.trailFade
      hopFrame.tubeAlpha = ho.exitAlpha
      hopFrame.exitLight = ho.exitLight
      hopFrame.peek = hopMaw
      drawWormholeBody(ctx!, hopTunnel!, hopFrame)
    }
    if (ctx && hop.out.portalR > 0 && hopMaw && hopSwirl && hopHalo) {
      const ho = hop.out
      const R = ho.portalR
      const px = UNIVERSE_HOP_PORTAL_SPRITE_PX
      const s = (R * 2) / px
      const ry = 1 / UNIVERSE_MAP_PORTAL_RY
      if (!hopThroat) {
        const rgb = hexToRgbTriple(hopTint)
        hopThroat = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        hopThroat.addColorStop(0, `rgba(${rgb},${UNIVERSE_HOP_THROAT_ALPHA_CORE})`)
        hopThroat.addColorStop(
          UNIVERSE_HOP_THROAT_MID_STOP,
          `rgba(${rgb},${UNIVERSE_HOP_THROAT_ALPHA_MID})`,
        )
        hopThroat.addColorStop(1, `rgba(${rgb},0)`)
      }
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(R, R * ry)
      ctx.globalAlpha = persistentDrawAlpha(ho.mawAlpha, ho.trailFade)
      ctx.fillStyle = hopThroat
      ctx.fillRect(-1, -1, 2, 2)
      ctx.restore()
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(s, s * ry)
      if (ho.fieldAlpha > 0) {
        const mawSpan = portalSpriteSpan('maw', px)
        ctx.globalAlpha = persistentDrawAlpha(ho.fieldAlpha, ho.trailFade)
        ctx.drawImage(hopMaw, -mawSpan / 2, -mawSpan / 2, mawSpan, mawSpan)
      }
      if (ho.portalAlpha > 0) {
        const haloSpan = portalSpriteSpan('halo', px)
        ctx.globalAlpha = persistentDrawAlpha(0.8 * ho.portalAlpha, ho.trailFade)
        ctx.drawImage(hopHalo, -haloSpan / 2, -haloSpan / 2, haloSpan, haloSpan)
      }
      // Die Arme: der Wirbel im Anflug — in der Passage ist die Röhre die Wand.
      const swirlFade = Math.max(
        0,
        Math.min(
          1,
          (UNIVERSE_HOP_SWIRL_FADE_TO_FRAC * Math.min(w, h) - R) /
            ((UNIVERSE_HOP_SWIRL_FADE_TO_FRAC - UNIVERSE_HOP_SWIRL_FADE_FROM_FRAC) *
              Math.min(w, h)),
        ),
      )
      if (ho.portalAlpha > 0 && swirlFade > 0) {
        ctx.rotate(ho.portalSpin)
        const swirlSpan = portalSpriteSpan('swirl', px)
        ctx.globalAlpha = persistentDrawAlpha(ho.portalAlpha * swirlFade, ho.trailFade)
        ctx.drawImage(hopSwirl, -swirlSpan / 2, -swirlSpan / 2, swirlSpan, swirlSpan)
      }
      ctx.restore()
      if (ho.portalAlpha > 0) {
        ctx.globalAlpha = ho.portalAlpha
        ctx.strokeStyle = hopTint
        ctx.lineWidth = Math.max(1.5, R * 0.05)
        ctx.beginPath()
        ctx.arc(cx, cy, R, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = ho.portalAlpha * 0.5
        ctx.lineWidth = Math.max(0.8, R * 0.012)
        ctx.beginPath()
        ctx.arc(cx, cy, R * UNIVERSE_MAP_PORTAL_PHOTON_R, 0, Math.PI * 2)
        ctx.stroke()
        // Zwei Lichtbögen laufen auf dem Ring — zwei, sonst ist es eine Zeigernadel.
        // Weiss und schmaler als die Ringlinie, sonst gehen sie in ihr unter.
        ctx.lineCap = 'round'
        ctx.strokeStyle = GALAXY_WHITE
        ctx.lineWidth = Math.max(1.5, R * 0.03)
        ctx.globalAlpha = ho.portalAlpha * UNIVERSE_HOP_RIM_ARC_ALPHA
        ctx.beginPath()
        ctx.arc(cx, cy, R, ho.rimArc, ho.rimArc + UNIVERSE_HOP_RIM_ARC_RAD)
        ctx.stroke()
        ctx.globalAlpha = ho.portalAlpha * UNIVERSE_HOP_RIM_ARC_ALPHA * 0.5
        ctx.beginPath()
        ctx.arc(
          cx,
          cy,
          R,
          ho.rimArc + Math.PI,
          ho.rimArc + Math.PI + UNIVERSE_HOP_RIM_ARC_RAD * 0.6,
        )
        ctx.stroke()
        ctx.lineCap = 'butt'
      }
      // Sogwellen: Ringe lösen sich vom Tor und rauschen auf die Kamera zu.
      if (ho.ripplePhase > 0 && ho.portalAlpha > 0) {
        ctx.strokeStyle = hopTint
        for (let k = 0; k < UNIVERSE_HOP_RIPPLE_COUNT; k++) {
          const u = (ho.ripplePhase + k / UNIVERSE_HOP_RIPPLE_COUNT) % 1
          const r = R * (1 + UNIVERSE_HOP_RIPPLE_GROWTH * Math.pow(u, UNIVERSE_HOP_RIPPLE_POW))
          ctx.globalAlpha = persistentDrawAlpha(
            UNIVERSE_HOP_RIPPLE_ALPHA * (1 - u) * ho.portalAlpha,
            ho.trailFade,
          )
          ctx.lineWidth = Math.max(1, r * UNIVERSE_HOP_RIPPLE_W_FRAC)
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }

    // ── Die Wormhole-Röhre — der Durchflug ─────────────────────────────────
    // Wand, Stränge, Rippen und Ausgang aus der Sicht der Verfolgerkamera auf
    // der 3D-Bahn (utils/orbit/wormholePath.ts, gemalt von utils/fx/wormholeTunnel.ts).
    if (hopInTunnel) drawWormholeTunnel(ctx!, hopTunnel!, hopFrame)

    // ── Kosmischer Staub ────────────────────────────────────────────────────
    // Im Flug ausgesetzt (bei Warp-Tempo wäre er ohnehin nur Schmier), beim Ausrollen
    // über globalAlpha zurückgeblendet — nicht über d.opacity, das würde den
    // Verlaufs-Cache jeden Frame verwerfen.
    if (ctx && wo.ambientGain > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = wo.ambientGain
      for (const d of dustPatches) {
        const dNorm = d.dist / maxDist
        const dSpeed = d.baseSpeed * dNorm * dNorm * WARP_SPEED_MAX * speedMultiplier
        d.dist += dSpeed * delta
        if (slipOn) {
          d.angle += rollStep
          const wgt = dNorm * dNorm
          slipPolar(d, slipX * wgt, slipY * wgt, Math.cos(d.angle), Math.sin(d.angle))
        }
        if (d.dist > maxDist) {
          d.angle = respawnAngle()
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
    // Vor dem freien Feld: die Haufen liegen darunter. Im Tunnel spawnt nichts
    // nach (kein Pop-in), Bestehendes blendet über ambientGain aus.
    if (!isFrozen) stepClusters(clusters, encounterFrame, Math.random, !warpActive)
    if (ctx) drawClusters(ctx, clusters, encounterFrame, wo.ambientGain)

    // ── Sterne ─────────────────────────────────────────────────────────────
    // Auch der Warp ist radial: die Sterne fließen vom (versetzten) Fluchtpunkt
    // weg, mit norm² Tiefe — nah am Fokus kriechen sie, am Rand rasen sie.
    // Früher schob der Warp alle als flache Ebene quer über den Schirm; das las
    // sich als gescrolltes Wallpaper, nicht als Flug.
    const streaking = warpActive && wo.streakGain > 0 && speedMultiplier > 1.5
    const streakWidth =
      WARP_STREAK_WIDTH_BASE +
      Math.min(speedMultiplier, WARP_STREAK_WIDTH_SPEED_CAP) * WARP_STREAK_WIDTH_PER_SPEED
    const streakLenGain = warpActive ? wo.streakGain : 1
    const headlightBoost = 0.6 * wo.headlight
    /** 0 … 1: wie weit der Tunnel schon zugezogen ist (Spawn-Nähe zum Fokus). */
    const tunnel = Math.max(0, Math.min(1, (speedMultiplier - 2) / 18))
    /** Steht die Drehung eines Streak-Sprites noch auf dem Context? */
    let streakTransformDirty = false
    // Die Linse des Tors: der Fokus IST das Tor, `dist` also der Abstand zum Ring.
    // Innen sieht man nur HINDURCH, im Band davor biegen die Sterne nach aussen;
    // blendet aus, sobald der Ring die Bühne füllt.
    const lensR = hop.out.portalR
    const lensMin = Math.min(w, h)
    const lensGain =
      lensR > 0 && hop.out.portalAlpha > 0
        ? hop.out.portalAlpha *
          Math.max(
            0,
            Math.min(
              1,
              (UNIVERSE_HOP_LENS_FADE_TO_FRAC * lensMin - lensR) /
                ((UNIVERSE_HOP_LENS_FADE_TO_FRAC - UNIVERSE_HOP_LENS_FADE_FROM_FRAC) * lensMin),
            ),
          )
        : 0
    const lensInner = lensR * UNIVERSE_MAP_PORTAL_PHOTON_R
    const lensReach = lensR * UNIVERSE_HOP_LENS_REACH
    const lensCap = lensR * UNIVERSE_HOP_LENS_MAX_FRAC
    const lensK = lensR * lensR * UNIVERSE_HOP_LENS_K
    const surgeGain = wo.starSurge
    for (const star of stars) {
      const norm = star.dist / maxDist
      const speed = star.baseSpeed * norm * norm * WARP_SPEED_MAX * speedMultiplier
      star.dist += speed * delta
      if (rollStep !== 0) star.angle += rollStep
      if (slipOn) {
        const wgt = norm * norm
        slipPolar(star, slipX * wgt, slipY * wgt, Math.cos(star.angle), Math.sin(star.angle))
      }
      if (star.dist > maxDist || star.dist < 0) {
        star.angle = respawnAngle()
        // Im Flug rückt der Nachschub mit dem Tempo an den Fluchtpunkt (der
        // Tunnel); beim Ausrollen rundum verteilt, sonst wie gehabt. Nicht
        // schlagartig: mit 2× am Rand geboren und bei Warp-Tempo dicht am Fokus —
        // sonst stand der Schirm beim Losfliegen für eine Sekunde leer.
        // Schub-Sterne kommen im MITTELRING: sie tragen den Rand, den die
        // norm²-Perspektive sonst leert. Im Atemzug (Tempo < 0) kehrt ein Stern,
        // der den Fokus erreicht, am Rand zurück.
        if (star.dist < 0) star.dist = maxDist * (0.6 + Math.random() * 0.35)
        else if (warpFlight && star.surge)
          star.dist =
            maxDist *
            (WARP_SURGE_RESPAWN_FRAC[0] +
              Math.random() * (WARP_SURGE_RESPAWN_FRAC[1] - WARP_SURGE_RESPAWN_FRAC[0]))
        else if (warpFlight)
          star.dist = maxDist * (0.1 - 0.08 * tunnel + Math.random() * (0.35 - 0.27 * tunnel))
        else if (rollingOut) star.dist = maxDist * (0.25 + Math.random() * 0.65)
        else star.dist = maxDist * (0.1 + Math.random() * 0.35)
        star.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
        // Diesen Frame nicht zeichnen: `speed` und `norm` stammen noch vom
        // Rand — der Strich eines eben geborenen Sterns zog sonst mit der
        // alten Randlänge quer durch den Fluchtpunkt.
        continue
      }
      let drawDist = star.dist
      let lensHide = 0
      if (lensGain > 0 && star.dist < lensReach) {
        if (star.dist < lensInner) lensHide = lensGain
        else drawDist += Math.min(lensCap, lensK / star.dist) * lensGain
      }
      const x = cx + Math.cos(star.angle) * drawDist
      const y = cy + Math.sin(star.angle) * drawDist
      const distAlpha = Math.min(1, norm * 4)
      star.twinklePhase += star.twinkleSpeed * delta
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase)
      const fadeEdge = norm > 0.88 ? 1 - (norm - 0.88) / 0.12 : 1
      let alpha: number
      if (warpFlight) alpha = Math.min(1, distAlpha * WARP_STAR_ALPHA_GAIN) * wo.starGain
      else if (rollingOut) alpha = Math.min(1, distAlpha * 1.8) * fadeEdge
      else alpha = distAlpha * (0.5 + 0.5 * twinkle) * fadeEdge
      // Aberration: bei Höchsttempo drängt das Licht nach vorn — voraus heller.
      if (headlightBoost > 0) alpha = Math.min(1, alpha * (1 + headlightBoost * (1 - norm)))
      if (star.surge) alpha *= surgeGain
      if (lensHide > 0) alpha *= 1 - lensHide
      if (ctx && alpha > 0.005) {
        const tier = starFogTier(norm)
        const fog = STAR_BG_FOG_TIERS[tier]
        const starSize = (0.8 + norm * norm * 5.0) * fog.size
        // Ein Stern wird erst zum Strich, wenn sein Schweif seinen Körper
        // deutlich überragt. Vorher bleibt er das Halo-Sprite: bei 2× ist der
        // Schweif ein einzelner Pixel, und ein Feld aus Ein-Pixel-Kapseln las
        // sich beim Losfliegen als leerer Himmel.
        // Gedeckelt am ABSTAND zum Fluchtpunkt, nicht am Tempo: ein Schweif, der
        // über den Fluchtpunkt hinausreicht, quert ihn schief — der Fluchtpunkt
        // liegt bis zu 18 % der kurzen Kante neben der Mitte — und der Tunnel
        // liest sich als Sternexplosion statt als Sog. Ohne Deckel überschösse
        // beim Crescendo fast jeder zweite Randstrich.
        const trailLength = streaking
          ? Math.min(
              speed * FLIGHT_EXPOSURE_SEC * WARP_STREAK_LEN_FACTOR * streakLenGain,
              star.dist * WARP_STREAK_LEN_MAX_FRAC,
            )
          : 0
        if (trailLength > starSize * 3) {
          const width = Math.max(streakWidth, starSize)
          // Der Strich liegt auf der ECHTEN Bewegung (radial + Slip) — sonst
          // biegt sich die Bahn, der Strich zeigt weiter radial, und die Spur
          // malt Zickzack.
          const ta = slipOn ? trailAngle(star.angle, speed, slipVx, slipVy, norm * norm) : star.angle
          drawStreakSprite(
            ctx,
            star.r,
            star.g,
            star.b,
            x,
            y,
            ta,
            trailLength,
            width,
            alpha,
            warpActive ? warpDopplerTier(norm, wo.tintGain) : WARP_DOPPLER_OWN,
          )
          streakTransformDirty = true
        } else {
          // Ein drawImage statt Kern- + Halo-Fill. Das sparte pro Frame 800
          // Canvas-Pfade und 800 `rgba(…)`-Strings (siehe starSprites.ts).
          if (streakTransformDirty) {
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            streakTransformDirty = false
          }
          const starAlpha = alpha * fog.alpha
          if (star.bloom && norm > STAR_BG_BLOOM_MIN_NORM) {
            const ramp = Math.min(1, (norm - STAR_BG_BLOOM_MIN_NORM) / 0.2)
            drawBloomSprite(
              ctx,
              star.r,
              star.g,
              star.b,
              x,
              y,
              starSize * STAR_BG_BLOOM_SCALE,
              starAlpha * STAR_BG_BLOOM_ALPHA * ramp,
            )
          }
          drawStarSprite(ctx, star.r, star.g, star.b, x, y, starSize, starAlpha, tier)
        }
      }
    }
    if (ctx) {
      ctx.globalAlpha = 1
      // Die Streak-Sprites lassen ihre Drehung stehen (ein Reset je Stern wäre
      // die halbe Arbeit umsonst) — hier EINMAL zurück auf die Einheit.
      if (streakTransformDirty) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        streakTransformDirty = false
      }
    }

    // ── Headlight — die Aufhellung um den Fluchtpunkt bei Höchsttempo ──────
    // Ein Verlauf bei (0,0), per translate an den Fokus geschoben. Die Alpha ist
    // auf den Stationärwert unter der Persistenz-Spur ausgelegt: jeden Frame
    // neu über die halb gelöschte Spur gelegt, summierte sie sich sonst hoch.
    // Der Ton kommt aus der Welt, in der geflogen wird. Es sind ZWEI gebackene
    // Verläufe — alte und neue Farbwelt — die gegenläufig überblendet werden;
    // ein je Frame neu gebauter Verlauf wäre eine Allokation in der heissesten
    // Schleife des Spiels, und ein gerasterter hätte den Farbwechsel gestuft.
    // Gebacken wird bei Radiuswechsel und beim Aufbruch: zweimal je Reise.
    if (ctx && wo.headlight > 0) {
      const radius = WARP_HEADLIGHT_RADIUS_FRAC * Math.min(w, h)
      if (
        !headlightFrom ||
        !headlightTo ||
        Math.abs(radius - headlightRadius) > 1 ||
        headlightKey !== warpGlowKey
      ) {
        headlightFrom = buildHeadlight(ctx, radius, warpGlowFrom)
        headlightTo = buildHeadlight(ctx, radius, warpGlowTo)
        headlightRadius = radius
        headlightKey = warpGlowKey
      }
      const base = persistentDrawAlpha(WARP_HEADLIGHT_ALPHA * wo.headlight, wo.trailFade)
      const m = wo.themeMix
      ctx.setTransform(1, 0, 0, 1, cx, cy)
      // Die beiden Wächter halten den Ruhefall exakt: ausserhalb der
      // Überblendung läuft EIN fillRect, so wie seit je.
      if (m < 0.997) {
        ctx.globalAlpha = base * (1 - m)
        ctx.fillStyle = headlightFrom
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2)
      }
      if (m > 0.003) {
        ctx.globalAlpha = base * m
        ctx.fillStyle = headlightTo
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2)
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
    }

    // ── Der Aufbruch des Warps: Schockringe vom Spielerkörper, Bugwelle vom
    // Fluchtpunkt. Strichkreise, additiv, ROHES Alpha: ein wandernder Ring
    // summiert sich nirgends zum Stationärwert — seine Geister unter der Spur
    // sind sein Kielwasser, additiveDrawAlpha hätte ihn gedrittelt.
    if (ctx && warp.phase !== 'idle') {
      const lp = warp.out.launchPulse
      const bw = warp.out.bowWave
      if ((lp !== 0 && lp < 1) || (bw > 0 && bw < 1)) {
        const minEdge = Math.min(w, h)
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = warpLaunchStyle
        if (lp !== 0 && lp < 1) {
          // lp < 0: der Atemzug — die Ringe laufen von aussen auf den Körper zu.
          const inhale = lp < 0
          const pulse = inhale ? -lp : lp
          const span = 1 - (WARP_LAUNCH_RING_COUNT - 1) * WARP_LAUNCH_RING_STAGGER
          for (let k = 0; k < WARP_LAUNCH_RING_COUNT; k++) {
            const u = (pulse - k * WARP_LAUNCH_RING_STAGGER) / span
            if (u <= 0 || u >= 1) continue
            const grow = inhale ? 1 - u : easeOutCubic(u)
            const r =
              minEdge *
              (WARP_LAUNCH_RING_R0_FRAC +
                (WARP_LAUNCH_RING_R1_FRAC - WARP_LAUNCH_RING_R0_FRAC) * grow)
            ctx.globalAlpha = WARP_LAUNCH_RING_ALPHA * (inhale ? u : 1 - u)
            ctx.lineWidth = Math.max(1.5, r * WARP_LAUNCH_RING_W_FRAC)
            ctx.beginPath()
            ctx.arc(w / 2 + leadShift.x, h / 2 + leadShift.y, r, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
        if (bw > 0 && bw < 1) {
          const r = maxDist * WARP_BOW_WAVE_REACH_K * easeOutCubic(bw)
          ctx.globalAlpha = WARP_BOW_WAVE_ALPHA * (1 - bw)
          ctx.lineWidth = Math.max(1.5, r * WARP_BOW_WAVE_W_FRAC)
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      }
    }

    // ── Flight streaks — the player flies INTO the screen in every phase;
    // shed material streams back past the viewer as radial phase-tinted
    // lines riding the same center-outward flow as the stars.
    // Im Warp übernehmen die Sterne selbst das Streaken; die Linien kommen mit
    // dem Staub zurück.
    if (ctx && !isFrozen && speedMultiplier > 0 && wo.ambientGain > 0) {
      const solarForStreaks = useSolarUpgradeStore()
      const streakColor = solarForStreaks.isCometState
        ? COMET_PHASE_DATA.accent
        : STAR_PHASE_DATA[solarForStreaks.starPhase].phaseGlow
      while (flightStreaks.length < FLIGHT_STREAK_COUNT) {
        flightStreaks.push({
          angle: Math.random() * Math.PI * 2,
          dist: maxDist * (0.05 + Math.random() * 0.3),
          baseSpeed: STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE,
          band: flightStreaks.length % FLIGHT_STREAK_BANDS.length,
        })
      }
      for (const s of flightStreaks) {
        const band = FLIGHT_STREAK_BANDS[s.band]
        const sNorm = s.dist / maxDist
        const sSpeed =
          s.baseSpeed *
          sNorm *
          sNorm *
          WARP_SPEED_MAX *
          speedMultiplier *
          FLIGHT_STREAK_SPEED_MULT *
          band.speed
        s.dist += sSpeed * delta
        if (slipOn) {
          s.angle += rollStep
          const wgt = sNorm * sNorm
          slipPolar(s, slipX * wgt, slipY * wgt, Math.cos(s.angle), Math.sin(s.angle))
        }
        if (s.dist > maxDist) {
          s.angle = respawnAngle()
          s.dist = maxDist * (0.05 + Math.random() * 0.1)
          s.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
        }
        const len = Math.max(6, sSpeed * FLIGHT_EXPOSURE_SEC * FLIGHT_STREAK_LEN_FACTOR)
        const hx = cx + Math.cos(s.angle) * s.dist
        const hy = cy + Math.sin(s.angle) * s.dist
        const ta = slipOn ? trailAngle(s.angle, sSpeed, slipVx, slipVy, sNorm * sNorm) : s.angle
        const tx = hx - Math.cos(ta) * len
        const ty = hy - Math.sin(ta) * len
        // fade in with distance like the stars: invisible at center, present
        // at the edges where it rushes past the camera
        const alpha = Math.min(1, sNorm * 3) * wo.ambientGain
        if (alpha < 0.05) continue
        const grad = ctx.createLinearGradient(tx, ty, hx, hy)
        grad.addColorStop(0, `${streakColor}00`)
        grad.addColorStop(1, `${streakColor}${BAND_ALPHA_HEX[s.band]}`)
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(hx, hy)
        ctx.strokeStyle = grad
        ctx.lineWidth = band.width * (0.6 + sNorm)
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.restore()
      }

      // Streak bursts: a calm→gust→calm rhythm — every few seconds a handful
      // of bright, long lines rushes past. Skipped during warp/hyperspace,
      // where the stars themselves already streak.
      burstCooldown -= delta
      if (burstCooldown <= 0 && !warpActive) {
        const count =
          FLIGHT_BURST_STREAK_MIN +
          Math.floor(Math.random() * (FLIGHT_BURST_STREAK_MAX - FLIGHT_BURST_STREAK_MIN + 1))
        for (let i = 0; i < count; i++) {
          burstStreaks.push({
            angle: Math.random() * Math.PI * 2,
            dist: maxDist * (0.1 + Math.random() * 0.2),
            baseSpeed:
              STAR_BG_BASE_SPEED_MIN + STAR_BG_BASE_SPEED_RANGE * (0.7 + Math.random() * 0.3),
            band: FLIGHT_STREAK_BANDS.length - 1,
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
        if (slipOn) {
          s.angle += rollStep
          const wgt = sNorm * sNorm
          slipPolar(s, slipX * wgt, slipY * wgt, Math.cos(s.angle), Math.sin(s.angle))
        }
        if (s.dist > maxDist) {
          // gusts are finite — the streak leaves the screen and is gone
          burstStreaks.splice(i, 1)
          continue
        }
        const len = Math.max(10, sSpeed * FLIGHT_EXPOSURE_SEC * FLIGHT_BURST_LEN_FACTOR)
        const hx = cx + Math.cos(s.angle) * s.dist
        const hy = cy + Math.sin(s.angle) * s.dist
        const ta = slipOn ? trailAngle(s.angle, sSpeed, slipVx, slipVy, sNorm * sNorm) : s.angle
        const tx = hx - Math.cos(ta) * len
        const ty = hy - Math.sin(ta) * len
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
        // hot core in the phase tint — reads as bright without expensive shadowBlur
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(hx, hy)
        ctx.strokeStyle = `${streakColor}${alphaHex(FLIGHT_BURST_ALPHA * 0.6)}`
        ctx.lineWidth = outerWidth * 0.35
        ctx.stroke()
        ctx.restore()
      }
    }

    // ── Die Schweife der Prozession ───────────────────────────────────────
    // Sie fahren HIER und nicht im DOM: zwölf bewegte Elemente wären zwölf
    // Compositor-Ebenen samt Overlap-Kaskade. Gezeichnet wird mit DEMSELBEN
    // Streak-Sprite wie die Sternstriche — der Zug spricht damit die Sprache
    // des Tunnels, in dem er fliegt, und die Persistenz-Spur verlängert ihn
    // gratis. Der Kopf sitzt am Körper, der Schweif liegt NACH AUSSEN — anders
    // als bei einem Stern, der vorbeizieht: der Zug fliegt MIT der Kamera, und
    // was er abwirft, kommt auf sie zu (`processionTrailAngle`).
    //
    // Die Positionen füllen die beiden Orbit-Schleifen; ein Frame Versatz ist
    // der Preis und bei einem weich wogenden Zug unsichtbar.
    if (ctx && !isFrozen && processionLive.t > 0.01) {
      const minEdgePx = Math.min(w, h)
      const bodyAlpha = persistentDrawAlpha(PROCESSION_TRAIL_ALPHA * processionLive.t, wo.trailFade)
      let drewTrail = false
      for (let li = 0; li < 2; li++) {
        const list = li === 0 ? processionLive.planets : processionLive.champions
        const n = li === 0 ? processionLive.planetCount : processionLive.championCount
        for (let i = 0; i < n; i++) {
          const b = list[i]
          if (b.r <= 0) continue
          const dx = b.x - cx
          const dy = b.y - cy
          drawStreakSprite(
            ctx,
            b.cr,
            b.cg,
            b.cb,
            b.x,
            b.y,
            processionTrailAngle(dx, dy),
            processionTrailLength(dx, dy, b.r, minEdgePx),
            b.r * PROCESSION_TRAIL_WIDTH_K,
            bodyAlpha,
          )
          drewTrail = true
        }
      }
      // Der Spielerkörper steht in der Bildmitte — sein Schweif zeigt vom
      // Fluchtpunkt weg wie jeder andere, ist aber länger und leiser. Liegt der
      // Fluchtpunkt noch auf ihm (der Kurs baut sich erst auf), gibt es keine
      // Richtung und er bleibt aus.
      const sunR = processionLive.sunR
      const sunX = w / 2 + leadShift.x
      const sunY = h / 2 + leadShift.y
      const sdx = sunX - cx
      const sdy = sunY - cy
      // Im Wormhole kein Sonnenschweif — er las sich als Rauch in der Bildmitte.
      if (sunR > 0 && Math.hypot(sdx, sdy) > 1 && hop.out.exitAlpha <= 0) {
        drawStreakSprite(
          ctx,
          processionLive.sunRed,
          processionLive.sunGreen,
          processionLive.sunBlue,
          sunX,
          sunY,
          processionTrailAngle(sdx, sdy),
          sunR * PROCESSION_SUN_TRAIL_LEN_K,
          sunR * PROCESSION_TRAIL_WIDTH_K,
          persistentDrawAlpha(PROCESSION_SUN_TRAIL_ALPHA * processionLive.t, wo.trailFade),
        )
        drewTrail = true
      }
      // drawStreakSprite lässt seine Drehung stehen — hier EINMAL zurück.
      if (drewTrail) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = 1
      }
    }

    // ── Comet debris — rocks streaming past while in comet origin state ────
    if (ctx && !isFrozen) {
      const isComet = useSolarUpgradeStore().isCometState
      if (!isComet && cometDebris.length > 0) cometDebris.length = 0
      if (isComet && !warpFlight) {
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
          if (slipOn) {
            d.angle += rollStep
            const wgt = dNorm * dNorm
            slipPolar(d, slipX * wgt, slipY * wgt, Math.cos(d.angle), Math.sin(d.angle))
          }
          if (d.dist > maxDist) {
            d.angle = respawnAngle()
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

    // ── Himmelsbegegnungen — auf demselben Canvas, in derselben Strömung ───
    if (ctx && !isFrozen && !warpActive) {
      const themeIndex = useGalaxyStore().currentThemeIndex
      const universeId = useGameStore().currentUniverse
      const key = `${universeId}:${themeIndex}`
      if (key !== tintKey) {
        const t = cometTintForGalaxy(themeIndex, universeId)
        encounterFrame.tint = [t.r, t.g, t.b]
        tintKey = key
      }
      stepEncounters(sky, encounterFrame, Math.random, traveling)
      if (sky.evade.pending) {
        requestEvade(helm, sky.evade.awayAngle, sky.evade.strength)
        sky.evade.pending = false
      }
      drawEncounters(ctx, sky, encounterFrame)
    }

    // ── Der Tunnel trägt die Farbe seiner Welt ─────────────────────────────
    // EINE getönte Vollfläche über dem fertigen Sternfeld — nicht in den
    // Sternfarben: `starSprites` cacht je Farbe ein Offscreen-Canvas und leert
    // die Maps nie, eine je Frame interpolierte Tönung legte pro Zwischenton ein
    // neues an. Additiv, weil der Tunnel dunkel ist und die Farbe ihn färben
    // soll, nicht abdunkeln. Die Deckkraft muss durch `persistentDrawAlpha`:
    // unter der Persistenz-Spur summierte sich eine Vollfläche sonst hoch.
    if (ctx && warp.phase !== 'idle' && wo.tintGain > 0) {
      const [tr, tg, tb] = mixGlow(warpGlowFrom, warpGlowTo, wo.themeMix)
      // Ein VERLAUF um den Fluchtpunkt, keine Fläche: flächig gelegt war die
      // Tönung ein Farbfilter über dem ganzen Bild, und der Raum verlor seine
      // Schwärze. So sitzt die Farbe dort, wo der Tunnel ist, und die Ecken
      // bleiben dunkel — dieselbe Tiefe, die auch die Vignette meint.
      const tintR = maxDist * WARP_TINT_RADIUS_K
      const key = `${tr},${tg},${tb}|${Math.round(tintR)}`
      if (key !== tunnelTintKey) {
        tunnelTint = ctx.createRadialGradient(0, 0, 0, 0, 0, tintR)
        tunnelTint.addColorStop(0, `rgb(${tr},${tg},${tb})`)
        tunnelTint.addColorStop(0.55, `rgba(${tr},${tg},${tb},0.45)`)
        tunnelTint.addColorStop(1, `rgba(${tr},${tg},${tb},0)`)
        tunnelTintKey = key
      }
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = additiveDrawAlpha(WARP_TINT_ALPHA * wo.tintGain, wo.trailFade)
      ctx.setTransform(1, 0, 0, 1, cx, cy)
      ctx.fillStyle = tunnelTint
      ctx.fillRect(-tintR, -tintR, tintR * 2, tintR * 2)
      ctx.restore()
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
      if (warpActive) opacity *= Math.max(0, 1 - wo.flightSec * 3)
      if (slipOn) {
        // fern: der Fokus dreht sie, der Slip trifft sie nur leicht
        rotateAbout(g.x, g.y, w / 2, h / 2, Math.cos(rollStep), Math.sin(rollStep), rotOut)
        g.x = rotOut.x + slipX * HELM_GALAXY_DEPTH
        g.y = rotOut.y + slipY * HELM_GALAXY_DEPTH
      }
      const gOpStr = opacity.toFixed(2)
      if (g._lastOpacity !== gOpStr) {
        g.el.style.opacity = gOpStr
        g._lastOpacity = gOpStr
      }
      const gTrStr = `translate(${(g.x + cx - w / 2).toFixed(1)}px,${(g.y + cy - h / 2).toFixed(1)}px) scale(${g.scale.toFixed(3)}) rotate(${g.rot}deg)`
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
      n.dist += nSpeed * delta
      if (slipOn) {
        n.angle += rollStep
        const wgt = nNorm * nNorm
        slipPolar(n, slipX * wgt, slipY * wgt, Math.cos(n.angle), Math.sin(n.angle))
      }
      n.scale = 0.02 + (n.maxScale - 0.02) * nNorm
      const wx = cx + Math.cos(n.angle) * n.dist
      const wy = cy + Math.sin(n.angle) * n.dist
      const hw = n.size / 2
      const distAlpha = Math.min(1, nNorm * 3)
      const fadeEdge = nNorm > 0.85 ? 1 - (nNorm - 0.85) / 0.15 : 1
      let opacity = distAlpha * fadeEdge * 0.65
      if (warpActive) opacity *= Math.max(0, 1 - wo.flightSec * 2)
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
      rescaleEncounters(sky, scale)
      rescaleClusters(clusters, scale)
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
    if (!isFrozen) {
      resetFlightLive()
      resetProcessionLive()
      clearEncounters(sky)
      registerSkyDebug(null)
    }
    resetGalaxyWarp(warp)
    resetUniverseHop(hop)
    releaseHopSprites()
    wasHopFlight = false
    headlightFrom = null
    tunnelTint = null
    tunnelTintKey = ''
    headlightTo = null
    warpNebulaHidden.value = false
    warpVignetteOn.value = false
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
    clearClusters(clusters)
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
      if (!isFrozen) {
        registerSkyDebug({
          spawn: (kind) => {
            if (encounterFrame.maxDist > 0)
              spawnEncounter(
                sky,
                kind as EncounterKind,
                Math.floor(Math.random() * 1e6),
                encounterFrame,
                Math.random,
              )
          },
          cluster: (kind) => {
            if (encounterFrame.maxDist > 0)
              spawnCluster(clusters, kind as ClusterKind, encounterFrame, Math.random)
          },
          clusters: () => clusters,
          evade: (angle, strength) => requestEvade(helm, angle, strength),
          helm: () => helm,
          sky: () => sky,
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    cleanup()
  })

  return {
    starsContainer,
    starCanvas,
    prefersReducedMotion,
    warpNebulaHidden,
    warpVignetteOn,
    warpFlashKey,
    warpAccent,
  }
}
