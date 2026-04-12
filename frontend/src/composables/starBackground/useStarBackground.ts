import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useGalaxyStore } from '../../stores/galaxyStore'
import {
  STAR_COUNT,
  WARP_SPEED_MAX,
  GALAXY_TRANS_WARP_MS,
  GALAXY_TRANS_DECEL_MS,
  GALAXY_SPAWN_INTERVAL_MIN,
  GALAXY_SPAWN_INTERVAL_MAX,
  GALAXY_MAX_COUNT,
} from '../../config/constants'
import {
  NS,
  pickGalaxyTypeConfig,
  GALAXY_PALETTES_BY_TYPE,
  drawSpiral,
  drawBarredSpiral,
  drawElliptical,
  drawGlobular,
  drawIrregular,
  drawRing,
  drawLenticular,
  drawStarburst,
} from './galaxyRenderers'
import { drawEmissionNebula, drawIonCloud } from './nebulaRenderers'
import {
  EMISSION_MAX_COUNT,
  EMISSION_SPAWN_MIN,
  EMISSION_SPAWN_MAX,
  CLUSTER_COUNT,
  DUST_PATCH_COUNT,
  EMISSION_NEBULA_PALETTES,
  ION_CLOUD_PALETTES,
  type StarItem,
  type GalaxyItem,
  type DustPatch,
  type StarCluster,
  type NebulaMovingItem,
  type EmissionType,
} from './types'

// ─── Composable ───────────────────────────────────────────────────────────────

// ─── Spektralklassen O B A F G K M ───────────────────────────────────────────
// RGB-Werte nach echten Schwarzkörpertemperaturen (Planck-Approximation).
// Gewichte orientieren sich an der visuellen Häufigkeit beim Flug durch die
// Milchstraße – mehr orangerote K/M-Sterne als blaue O/B-Sterne.
const SPECTRAL_CLASSES: { rgb: [number, number, number]; weight: number }[] = [
  { rgb: [155, 176, 255], weight: 2 }, // O  – Blau-violett   > 30 000 K
  { rgb: [170, 191, 255], weight: 6 }, // B  – Blau-weiß      10 000–30 000 K
  { rgb: [202, 215, 255], weight: 10 }, // A  – Weiß-bläulich   7 500–10 000 K
  { rgb: [248, 247, 255], weight: 14 }, // F  – Gelb-weiß       6 000– 7 500 K
  { rgb: [255, 244, 234], weight: 22 }, // G  – Gelb (Sonne)    5 200– 6 000 K
  { rgb: [255, 210, 161], weight: 28 }, // K  – Orange          3 700– 5 200 K
  { rgb: [255, 167, 118], weight: 18 }, // M  – Rot-orange      2 400– 3 700 K
]

const _spectralTotal = SPECTRAL_CLASSES.reduce((s, c) => s + c.weight, 0)
const _spectralCumulative = SPECTRAL_CLASSES.reduce<number[]>((acc, c) => {
  acc.push((acc.at(-1) ?? 0) + c.weight)
  return acc
}, [])

/** Gibt eine realistisch gewichtete Sternfarbe als RGB-Tupel zurück. */
function pickStarColor(): [number, number, number] {
  const rand = Math.random() * _spectralTotal
  const idx = _spectralCumulative.findIndex((w) => rand <= w)
  const [r, g, b] = SPECTRAL_CLASSES[idx].rgb
  // Subtile Variation innerhalb der Klasse → kein Copy-Paste-Aussehen
  return [
    Math.min(255, Math.max(0, r + Math.round((Math.random() - 0.5) * 14))),
    Math.min(255, Math.max(0, g + Math.round((Math.random() - 0.5) * 10))),
    Math.min(255, Math.max(0, b + Math.round((Math.random() - 0.5) * 8))),
  ]
}

// Module-level counter so galaxyIdCounter stays in sync across modules
let galaxyIdCounter = 0

// Idle frame-throttle: cap render rate at 30 FPS when no active animation is running
const IDLE_FRAME_INTERVAL = 1000 / 30

export function useStarBackground() {
  const starsContainer = ref<HTMLElement>()
  const starCanvas = ref<HTMLCanvasElement>()
  const prefersReducedMotion = ref(false)
  const stars: StarItem[] = []
  const galaxies: GalaxyItem[] = []
  const emissionNebulas: NebulaMovingItem[] = []
  const dustPatches: DustPatch[] = []
  const starClusters: StarCluster[] = []
  let nextStarId = 1
  let animFrame = 0
  let lastTimestamp = 0
  let lastIdleFrameTime = 0
  let hyperspaceElapsed = 0
  let wasHyperspaceActive = false

  // ── Galaxy-Transitions-Zustand ──────────────────────────────────────────────
  let galaxyTransPhase: 'idle' | 'warp' | 'decel' = 'idle'
  let galaxyTransElapsed = 0
  let wasPendingTransition = false
  let galaxyTransDir = 0

  let resizeTimeout: ReturnType<typeof setTimeout> | null = null
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
  }

  // ── Galaxy-Spawn-Logik ────────────────────────────────────────────────────
  function spawnGalaxy(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    if (galaxies.length >= GALAXY_MAX_COUNT) return

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

    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.classList.add('galaxy')
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

    svg.style.transform = `translate(${x}px,${y}px) scale(0.05) rotate(${rot}deg)`
    starsContainer.value.appendChild(svg)
    const item: GalaxyItem = { el: svg, x, y, scale: 0.05, maxScale, lifetime, elapsed: 0, rot }
    galaxies.push(item)
  }

  function scheduleNextGalaxy(): void {
    const delay =
      GALAXY_SPAWN_INTERVAL_MIN +
      Math.random() * (GALAXY_SPAWN_INTERVAL_MAX - GALAXY_SPAWN_INTERVAL_MIN)
    galaxySpawnTimeout = setTimeout(() => {
      spawnGalaxy()
      scheduleNextGalaxy()
    }, delay)
  }

  // ── Emission Nebula Spawn ────────────────────────────────────────────────────
  // randomDist=true → spread across screen at start; false → spawn near center
  function spawnEmissionNebula(randomDist = false): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    if (emissionNebulas.length >= EMISSION_MAX_COUNT) return

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
    // Emission nebulae are very distant → move ~5–8% of star speed (parallax layer)
    const baseSpeed = 0.44 + Math.random() * 0.32
    const maxScale = 1.4 + Math.random() * 1.2

    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.classList.add(type)
    svg.style.opacity = '0'

    const id = `e${++galaxyIdCounter}`
    const half = size / 2

    if (type === 'emission-nebula') {
      drawEmissionNebula(svg, id, half, half, half, palette)
    } else {
      drawIonCloud(svg, id, half, half, half, palette)
    }

    // Initial transform: centered on screen center, nearly invisible
    svg.style.transform = `translate(0px,0px) scale(0.02) translate(${-half}px,${-half}px)`
    starsContainer.value.appendChild(svg)
    emissionNebulas.push({ el: svg, angle, dist, baseSpeed, scale: 0.02, maxScale, size })
  }

  function scheduleNextEmission(): void {
    const delay = EMISSION_SPAWN_MIN + Math.random() * (EMISSION_SPAWN_MAX - EMISSION_SPAWN_MIN)
    emissionSpawnTimeout = setTimeout(() => {
      spawnEmissionNebula()
      scheduleNextEmission()
    }, delay)
  }

  // ── Dust Patches Init ────────────────────────────────────────────────────────
  function initDust(): void {
    dustPatches.length = 0
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    const maxDist = Math.hypot(w / 2, h / 2) + 20
    const dustConfigs: [number, number, number, number][] = [
      [10, 8, 5, 0.22], // warm dark brown
      [5, 5, 12, 0.18], // cold dark blue-grey
      [12, 5, 3, 0.2], // reddish dark
      [8, 4, 8, 0.16], // dark purple-brown
      [6, 7, 4, 0.19], // neutral dark
      [9, 6, 6, 0.21], // muted red-brown
      [4, 6, 10, 0.17], // deep blue
    ]
    for (let i = 0; i < DUST_PATCH_COUNT; i++) {
      const [r, g, b, opacity] = dustConfigs[i]
      dustPatches.push({
        angle: Math.random() * Math.PI * 2,
        // Spread across screen initially, like spawnStar(randomDist=true)
        dist: maxDist * (0.1 + Math.random() * 0.8),
        // Dust is the deepest layer: moves at ~2–3% of star speed
        baseSpeed: 0.2 + Math.random() * 0.16,
        rx: 180 + Math.random() * 200,
        ry: 100 + Math.random() * 150,
        rotation: Math.random() * Math.PI,
        opacity: opacity * (0.8 + Math.random() * 0.4),
        r,
        g,
        b,
      })
    }
  }

  // ── Star Clusters Init ───────────────────────────────────────────────────────
  function initClusters(): void {
    starClusters.length = 0
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    const maxDist = Math.hypot(w / 2, h / 2) + 20
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const count = 15 + Math.floor(Math.random() * 12)
      const radius = 18 + Math.random() * 32
      const clusterStars = []
      for (let j = 0; j < count; j++) {
        const a = Math.random() * Math.PI * 2
        const d = Math.random() * radius
        const [r, g, b] = pickStarColor() // ← Spektralklassen
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
        // Spread across screen initially
        dist: maxDist * (0.08 + Math.random() * 0.8),
        // Clusters move at ~8–12% of star speed (midground parallax layer)
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
    const baseSpeed = 0.5 + Math.random() * 1.0
    const [r, g, b] = pickStarColor() // ← Spektralklassen

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

  // ── Haupt-Animationsschleife ────────────────────────────────────────────────
  function animateStars(timestamp: number): void {
    if (lastTimestamp === 0) lastTimestamp = timestamp
    const rawDelta = (timestamp - lastTimestamp) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTimestamp = timestamp

    // Hyperspace
    const gameStore = useGameStore()
    const hyperActive = gameStore.isHyperspaceActive
    if (hyperActive && !wasHyperspaceActive) hyperspaceElapsed = 0
    wasHyperspaceActive = hyperActive
    if (hyperActive) hyperspaceElapsed += delta

    // ── Galaxy-Transitions-Phasenmaschine ────────────────────────────────────
    const galaxyStore = useGalaxyStore()
    const pendingTrans = galaxyStore.pendingTransition

    // ── Frame-Throttle: 30 FPS im Idle-Zustand ───────────────────────────────
    const isActiveAnimation = hyperActive || galaxyTransPhase !== 'idle' || pendingTrans
    if (!isActiveAnimation) {
      if (timestamp - lastIdleFrameTime < IDLE_FRAME_INTERVAL) {
        animFrame = requestAnimationFrame(animateStars)
        return
      }
      lastIdleFrameTime = timestamp
    }

    if (pendingTrans && !wasPendingTransition) {
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
          // ── Ankunft: commitAdvance, nahtloser Übergang in Decel ───────────────
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

    // ── Geschwindigkeitsmultiplikator ─────────────────────────────────────────
    let speedMultiplier: number
    if (galaxyTransPhase === 'warp') {
      // Kubisches Ease-In: sanft starten, explosiv enden → 1× bis 45×
      const t = Math.min(galaxyTransElapsed / GALAXY_TRANS_WARP_MS, 1)
      speedMultiplier = 1 + 44 * (t * t * t)
    } else if (galaxyTransPhase === 'decel') {
      // Steiles Ease-Out: 45× → 1× — matcht Warp-Ende, bremst schnell auf Normal
      const t = Math.min(galaxyTransElapsed / GALAXY_TRANS_DECEL_MS, 1)
      speedMultiplier = 1 + 44 * Math.pow(1 - t, 3.5)
    } else {
      speedMultiplier = hyperActive ? 1 + Math.min(hyperspaceElapsed / 2, 1) * 19 : 1
    }

    const w = starsContainer.value?.clientWidth ?? window.innerWidth
    const h = starsContainer.value?.clientHeight ?? window.innerHeight
    const ctx = starCanvas.value?.getContext('2d') ?? null

    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    const cx = w / 2,
      cy = h / 2
    const maxDist = Math.hypot(cx, cy) + 20

    // ── Kosmischer Staub (Canvas, tiefste Hintergrundschicht) ──
    if (ctx) {
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      for (const d of dustPatches) {
        const dNorm = d.dist / maxDist

        // Move outward, very slow (deepest parallax layer)
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
        // Scale dust with distance (grows as it approaches)
        const dScale = 0.3 + dNorm * 1.4
        const rx = d.rx * dScale
        const ry = d.ry * dScale
        const fadeEdge = dNorm > 0.85 ? 1 - (dNorm - 0.85) / 0.15 : 1
        const finalOpacity = d.opacity * Math.min(1, dNorm * 2.5) * fadeEdge

        // Cache gradient in normalised coords (0,0)→r=1 so it's created once per patch
        if (!d.cachedGradient) {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
          g.addColorStop(0, `rgba(${d.r},${d.g},${d.b},1)`)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          d.cachedGradient = g
        }
        ctx.save()
        ctx.globalAlpha = finalOpacity
        ctx.translate(px, py)
        ctx.rotate(d.rotation)
        ctx.scale(rx, ry)
        ctx.beginPath()
        ctx.arc(0, 0, 1, 0, Math.PI * 2)
        ctx.fillStyle = d.cachedGradient
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()
    }

    // ── Sternenhaufen (Canvas, Mittelgrund-Parallax) ──
    if (ctx) {
      for (const cluster of starClusters) {
        const cNorm = cluster.dist / maxDist

        // Move outward at cluster's own baseSpeed (midground layer)
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

        // Scale cluster spread with distance → expands as it approaches (perspective)
        const spreadScale = 0.25 + cNorm * 1.6

        for (const s of cluster.stars) {
          const a = baseAlpha * s.brightness
          if (a < 0.02) continue
          const dotSize = s.brightness * spreadScale * 1.2
          ctx.beginPath()
          ctx.arc(pcx + s.dx * spreadScale, pcy + s.dy * spreadScale, dotSize, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${a.toFixed(3)})`
          ctx.fill()
        }
      }
    }

    for (const star of stars) {
      const norm = star.dist / maxDist // 0–1

      // Bewegungsgeschwindigkeit je Phase
      let speed: number
      if (galaxyTransPhase === 'warp') {
        // Kartesische Bewegung: alle Sterne fliegen in galaxyTransDir
        speed = star.baseSpeed * WARP_SPEED_MAX * speedMultiplier

        const sx = cx + Math.cos(star.angle) * star.dist
        const sy = cy + Math.sin(star.angle) * star.dist
        const nx = sx + Math.cos(galaxyTransDir) * speed * delta
        const ny = sy + Math.sin(galaxyTransDir) * speed * delta
        const ddx = nx - cx
        const ddy = ny - cy
        star.dist = Math.hypot(ddx, ddy)
        star.angle = Math.atan2(ddy, ddx)
      } else if (galaxyTransPhase === 'decel') {
        // Normale Polarbewegung: Sterne fliegen von überall auf Spieler zu, bremsen sanft ab
        speed = star.baseSpeed * norm * norm * WARP_SPEED_MAX * speedMultiplier
        star.dist += speed * delta
      } else {
        speed = star.baseSpeed * norm * norm * WARP_SPEED_MAX * speedMultiplier
        star.dist += speed * delta
      }

      if (star.dist > maxDist) {
        if (galaxyTransPhase === 'warp') {
          // Gleichmäßige Verteilung im hinteren Halbkreis → füllt den ganzen Screen
          star.angle = galaxyTransDir + Math.PI / 2 + Math.random() * Math.PI
          star.dist = maxDist * (0.05 + Math.random() * 0.88)
          star.baseSpeed = 0.5 + Math.random() * 1.0
        } else if (galaxyTransPhase === 'decel') {
          // Sterne im sichtbaren Helligkeitsbereich (norm ≥ 0.25 → distAlpha = 1)
          star.angle = Math.random() * Math.PI * 2
          star.dist = maxDist * (0.25 + Math.random() * 0.65)
          star.baseSpeed = 0.5 + Math.random() * 1.0
        } else {
          star.angle = Math.random() * Math.PI * 2
          star.dist = hyperActive
            ? maxDist * (0.02 + Math.random() * 0.08)
            : maxDist * (0.1 + Math.random() * 0.35)
          star.baseSpeed = 0.5 + Math.random() * 1.0
        }
      }

      // Polar → Kartesisch
      const x = cx + Math.cos(star.angle) * star.dist
      const y = cy + Math.sin(star.angle) * star.dist

      // Alpha-Berechnung
      const distAlpha = Math.min(1, norm * 4)
      star.twinklePhase += star.twinkleSpeed * delta
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase)
      const fadeEdge = norm > 0.88 ? 1 - (norm - 0.88) / 0.12 : 1

      let alpha: number
      if (hyperActive) {
        alpha = Math.min(1, distAlpha * 1.5)
      } else if (galaxyTransPhase === 'decel') {
        // Boost während Decel — verhindert dunkle Sterne im Übergang
        alpha = Math.min(1, distAlpha * 1.8) * fadeEdge
      } else {
        alpha = distAlpha * (0.5 + 0.5 * twinkle) * fadeEdge
      }

      if (ctx) {
        const isStreaking =
          (hyperActive || galaxyTransPhase === 'warp' || galaxyTransPhase === 'decel') &&
          speedMultiplier > 1.5

        const trailAngle = galaxyTransPhase === 'warp' ? galaxyTransDir : star.angle

        if (isStreaking) {
          const trailLength = speed * delta * 2.2
          const trailFromX = x - Math.cos(trailAngle) * trailLength
          const trailFromY = y - Math.sin(trailAngle) * trailLength

          const lineWidth = 0.8 + speedMultiplier * 0.12
          ctx.beginPath()
          ctx.moveTo(trailFromX, trailFromY)
          ctx.lineTo(x, y)
          ctx.strokeStyle = `rgba(${star.r},${star.g},${star.b},${alpha})`
          ctx.lineWidth = lineWidth
          ctx.lineCap = 'round'
          ctx.stroke()
        } else {
          // Normaler Stern mit Glühen
          const starSize = 0.8 + norm * norm * 5.0
          ctx.beginPath()
          ctx.arc(x, y, starSize, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${star.r},${star.g},${star.b},${alpha})`
          ctx.fill()
          ctx.beginPath()
          ctx.arc(x, y, starSize * 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${star.r},${star.g},${star.b},${alpha * 0.12})`
          ctx.fill()
        }
      }
    }

    // ── Galaxy-SVG-Animation ──────────────────────────────────────────────────
    for (let i = galaxies.length - 1; i >= 0; i--) {
      const g = galaxies[i]
      g.elapsed += delta * 1000
      const p = Math.min(g.elapsed / g.lifetime, 1)
      g.scale = 0.05 + (g.maxScale - 0.05) * (p * p)

      let opacity: number
      if (p < 0.15) opacity = p / 0.15
      else if (p < 0.75) opacity = 1
      else opacity = 1 - (p - 0.75) / 0.25

      // Galaxien bei Warp schnell ausblenden (3× schneller als bisher)
      if (hyperActive || galaxyTransPhase === 'warp') {
        const fadeTime = hyperActive ? hyperspaceElapsed : galaxyTransElapsed / 1000
        opacity *= Math.max(0, 1 - fadeTime * 3)
      }

      const gOpStr = opacity.toFixed(2)
      const gTrStr = `translate(${g.x}px,${g.y}px) scale(${g.scale.toFixed(3)}) rotate(${g.rot}deg)`
      if (g._lastOpacity !== gOpStr) {
        g.el.style.opacity = gOpStr
        g._lastOpacity = gOpStr
      }
      if (g._lastTransform !== gTrStr) {
        g.el.style.transform = gTrStr
        g._lastTransform = gTrStr
      }

      if (p >= 1) {
        if (starsContainer.value?.contains(g.el)) starsContainer.value.removeChild(g.el)
        galaxies.splice(i, 1)
      }
    }

    // ── Emission Nebula / Ion Cloud – Parallax-Flug auf Spieler zu ───────────
    for (let i = emissionNebulas.length - 1; i >= 0; i--) {
      const n = emissionNebulas[i]
      const nNorm = n.dist / maxDist

      // Move outward at nebula's own baseSpeed (~5–9% of star speed → deep background)
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

      // Scale grows with distance (perspective: small far away, large close up)
      n.scale = 0.02 + (n.maxScale - 0.02) * nNorm

      // World position of the nebula center
      const wx = cx + Math.cos(n.angle) * n.dist
      const wy = cy + Math.sin(n.angle) * n.dist
      const hw = n.size / 2

      // Opacity: fade in from center, fade out at edge
      const distAlpha = Math.min(1, nNorm * 3)
      const fadeEdge = nNorm > 0.85 ? 1 - (nNorm - 0.85) / 0.15 : 1
      let opacity = distAlpha * fadeEdge * 0.65

      if (hyperActive || galaxyTransPhase === 'warp') {
        const fadeTime = hyperActive ? hyperspaceElapsed : galaxyTransElapsed / 1000
        opacity *= Math.max(0, 1 - fadeTime * 2)
      }

      const nOpStr = opacity.toFixed(3)
      const nTrStr = `translate(${wx.toFixed(1)}px,${wy.toFixed(1)}px) scale(${n.scale.toFixed(3)}) translate(${-hw}px,${-hw}px)`
      if (n._lastOpacity !== nOpStr) {
        n.el.style.opacity = nOpStr
        n._lastOpacity = nOpStr
      }
      // Scale from SVG center: translate to world pos → scale → re-center SVG
      if (n._lastTransform !== nTrStr) {
        n.el.style.transform = nTrStr
        n._lastTransform = nTrStr
      }

      if (n.dist > maxDist) {
        if (starsContainer.value?.contains(n.el)) starsContainer.value.removeChild(n.el)
        emissionNebulas.splice(i, 1)
        // Immediately respawn near center so the pool stays full
        if (!prefersReducedMotion.value) {
          setTimeout(() => spawnEmissionNebula(), 200 + Math.random() * 1500)
        }
      }
    }

    animFrame = requestAnimationFrame(animateStars)
  }

  // ── Resize, Stars, Cleanup ─────────────────────────────────────────────────
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
    }, 150)
  }

  function createStars(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    stars.length = 0
    resizeCanvas()
    initDust()
    initClusters()
    // Seed emission nebulae spread across screen at startup
    for (let i = 0; i < EMISSION_MAX_COUNT; i++) spawnEmissionNebula(true)
    for (let i = 0; i < STAR_COUNT; i++) spawnStar(true)
    lastTimestamp = 0
    animFrame = requestAnimationFrame(animateStars)
  }

  function cleanup(): void {
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = 0
    }
    lastIdleFrameTime = 0
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
      for (const galaxy of galaxies) {
        if (starsContainer.value.contains(galaxy.el)) starsContainer.value.removeChild(galaxy.el)
      }
      for (const nebula of emissionNebulas) {
        if (starsContainer.value.contains(nebula.el)) starsContainer.value.removeChild(nebula.el)
      }
    }
    galaxies.length = 0
    emissionNebulas.length = 0
    dustPatches.length = 0
    starClusters.length = 0
    window.removeEventListener('resize', handleResize)
    if (resizeTimeout) clearTimeout(resizeTimeout)
  }

  function handleVisibilityChange(): void {
    if (document.hidden) {
      if (animFrame) {
        cancelAnimationFrame(animFrame)
        animFrame = 0
      }
      if (galaxySpawnTimeout) {
        clearTimeout(galaxySpawnTimeout)
        galaxySpawnTimeout = null
      }
      if (emissionSpawnTimeout) {
        clearTimeout(emissionSpawnTimeout)
        emissionSpawnTimeout = null
      }
    } else {
      if (!prefersReducedMotion.value && stars.length > 0) {
        lastTimestamp = 0
        animFrame = requestAnimationFrame(animateStars)
        scheduleNextGalaxy()
        scheduleNextEmission()
      }
    }
  }

  onMounted(async () => {
    checkReducedMotion()
    if (!prefersReducedMotion.value) {
      await nextTick()
      setTimeout(createStars, 100)
      window.addEventListener('resize', handleResize)
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
