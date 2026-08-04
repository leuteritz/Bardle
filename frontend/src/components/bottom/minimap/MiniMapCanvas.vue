<template>
  <canvas ref="canvasEl" class="map-canvas" />
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRenderingPaused } from '@/composables/useRenderingPaused'
import { resetCanvasIfContextLost } from '@/utils/canvasContext'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useGameStore } from '@/stores/gameStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useBattleStore } from '@/stores/battleStore'
import { livePlanetAngles } from '@/composables/useStarSystem'
import type { StarPlanetSlot } from '@/stores/starGroupStore'
import type { PlanetType } from '@/types'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import {
  GALAXY_TRANS_WARP_MS,
  GALAXY_TRANS_DECEL_MS,
  STAR_PHASE_DATA,
  RESCUE_ROTATION_DURATION_MS,
  ROLE_COLORS,
  MINIMAP_FLIGHTPATH_BEND,
  MINIMAP_COMET_HEAD_R,
  MINIMAP_COMET_TAIL_LEN,
  MINIMAP_COMET_TAIL_SEGMENTS,
  MINIMAP_IDLE_SUN_R,
  MINIMAP_TWINKLE_COUNT,
  MINIMAP_ZOOM_TRIGGER_MS,
  MINIMAP_ZOOM_MAX,
  MINIMAP_ZOOM_LERP,
  MINIMAP_ZOOM_OUT_LERP,
  MINIMAP_DEPARTURE_TRANSITION_MS,
  MINIMAP_GALAXY_FADE,
  MINIMAP_NEARFIELD_FADE,
  MINIMAP_NEARFIELD_STARS,
  MINIMAP_NEARFIELD_SPREAD,
  MINIMAP_TARGET_BASE_R,
  MINIMAP_TARGET_MAX_R,
  MINIMAP_WAIT_SUN_R,
  MINIMAP_GALAXY_CORE_RADIUS,
  MINIMAP_ROUTE_ARROW_SIZE,
  MINIMAP_ROUTE_ARROW_GAP,
  MINIMAP_ARRIVAL_STAR_R,
  MINIMAP_ARRIVAL_ORBIT_GAP,
  MINIMAP_ARRIVAL_ORBIT_STEP,
  MINIMAP_ARRIVAL_ORBIT_SQUASH,
  MINIMAP_ARRIVAL_PLANET_R,
  MINIMAP_ARRIVAL_PLANET_STEP,
  MINIMAP_ARRIVAL_CHAMP_PLANET_R,
  MINIMAP_ARRIVAL_CLEARED_SCALE,
  MINIMAP_ARRIVAL_CLEARED_ALPHA,
  MINIMAP_ARRIVAL_PREVIEW_MIN,
  MINIMAP_ARRIVAL_PREVIEW_RANGE,
  HYPERSPACE_FLASH_AT_MS,
  HYPERSPACE_FADEOUT_AT_MS,
  HYPERSPACE_END_AT_MS,
} from '@/config/constants'
import {
  seededRng,
  type DotPos,
  galaxyGeo,
  galaxyPlaneToWorld,
  getGalaxyParticles,
  GALAXY_PARTICLE_COLORS,
  minimapAccentForTheme,
  STAR_PALETTE,
  drawPlanet,
  drawRouteArrowhead,
  generateGalaxyDots,
} from './minimapGalaxyGeometry'

import { hexToRgba } from '@/utils/format'
import {
  ARRIVAL_TRANSITION_MS,
  PLANET_TYPE_PALETTES,
  createWarpEffect,
  drawMiniSun,
  drawPhaseSun,
  drawPlayerRing,
  drawRoleStar,
  easeInOut,
  rolePaletteFromHex,
  rolePaletteFromRgb,
  smoothstep,
  type HyperspacePhase,
} from './minimapDraw'

export default defineComponent({
  name: 'MiniMapCanvas',
  setup() {
    const galaxyStore = useGalaxyStore()
    const gameStore = useGameStore()
    const starGroupStore = useStarGroupStore()
    const planetBossStore = usePlanetBossStore()
    const solarUpgradeStore = useSolarUpgradeStore()

    const battleStore = useBattleStore()
    // keyed by URL, not name — the URL changes when the player equips a skin
    const championImageCache = new Map<string, HTMLImageElement>()

    function getOrLoadChampionImage(name: string): HTMLImageElement | null {
      const src = battleStore.getChampionImage(name, { size: 'sm' })
      if (championImageCache.has(src)) return championImageCache.get(src)!
      const img = new Image()
      img.src = src
      img.onload = () => championImageCache.set(src, img)
      return null
    }

    const canvasEl = ref<HTMLCanvasElement | null>(null)
    // dotPositions[i] = world position of champion-star attempt i (in visit
    // order); the last entry is the upcoming target while the run is active.
    const dotPositions = ref<DotPos[]>([])
    const spawnPos = ref<DotPos>({ x: 0.5, y: 0.5 })

    let rafId: number | null = null
    // Camera (world-space center + zoom). zoom 1 = whole galaxy visible;
    // during the final travel phase it eases toward the destination star.
    const camera = { x: 0.5, y: 0.5, zoom: 1 }
    let prevCamZoom = 1

    // ── Canvas-Maße ohne Layout-Zwang ───────────────────────────────────────
    // offsetWidth/offsetHeight im rAF-Loop zu lesen erzwingt pro Frame ein
    // Layout der GANZEN Seite (im CPU-Profil ~9 % Self-Time). Die Maße kommen
    // deshalb aus einem ResizeObserver und werden nur bei echter Größen-
    // änderung aktualisiert.
    const canvasSize = { w: 0, h: 0 }
    let sizeObserver: ResizeObserver | null = null
    let renderDpr = 1

    /** Fallback für Aufrufe vor dem ersten Observer-Callback. */
    function ensureCanvasSize(canvas: HTMLCanvasElement) {
      if (canvasSize.w === 0 || canvasSize.h === 0) {
        canvasSize.w = canvas.offsetWidth
        canvasSize.h = canvas.offsetHeight
      }
      return canvasSize
    }

    // ── Offscreen-Layer für den statischen Galaxienkörper ───────────────────
    // Wird nur neu gerastert, wenn sich Kamera, Seed, Theme, Auflösung oder
    // die Overview-Deckkraft ändern; sonst kostet die Galaxie pro Frame ein
    // einziges drawImage statt MINIMAP_GALAXY_PARTICLES Einzelpfade.
    let galaxyLayer: HTMLCanvasElement | null = null
    let galaxyLayerKey = ''

    function getGalaxyLayer(
      w: number,
      h: number,
      key: string,
      render: (c: CanvasRenderingContext2D) => void,
    ): HTMLCanvasElement {
      const pw = Math.max(1, Math.round(w * renderDpr))
      const ph = Math.max(1, Math.round(h * renderDpr))
      if (!galaxyLayer) galaxyLayer = document.createElement('canvas')
      const resized = galaxyLayer.width !== pw || galaxyLayer.height !== ph
      if (resized) {
        galaxyLayer.width = pw
        galaxyLayer.height = ph
      }
      if (!resized && galaxyLayerKey === key) return galaxyLayer

      const lctx = galaxyLayer.getContext('2d')
      if (lctx) {
        lctx.setTransform(renderDpr, 0, 0, renderDpr, 0, 0)
        lctx.clearRect(0, 0, w, h)
        lctx.globalCompositeOperation = 'lighter'
        render(lctx)
      }
      galaxyLayerKey = key
      return galaxyLayer
    }

    let hyperspacePhase: HyperspacePhase = 'idle'
    let hyperspacePhaseStart = 0
    let hyperspaceTimeouts: number[] = []
    let arrivalTransitionStart = -1
    let departureTransitionStart = -1

    const show = computed(
      () =>
        galaxyStore.pendingRoleSelection ||
        galaxyStore.isRescueRotating ||
        ((galaxyStore.championTravelState === 'traveling' ||
          galaxyStore.championTravelState === 'champion_available' ||
          galaxyStore.championTravelState === 'champion_spawned') &&
          !galaxyStore.bossPhaseActive &&
          !galaxyStore.isComplete) ||
        galaxyStore.bossPhaseActive ||
        galaxyStore.isGalaxyTransitioning ||
        galaxyStore.isComplete,
    )

    const warp = createWarpEffect()

    function drawFadeoutPhase(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const t = Math.min((Date.now() - hyperspacePhaseStart) / 1000, 1)
      ctx.save()
      ctx.globalAlpha = t
      drawNormalMap(ctx, w, h)
      ctx.restore()
      const flashAlpha = (1 - t) * 0.85
      if (flashAlpha > 0.001) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
        ctx.fillRect(0, 0, w, h)
      }
    }

    function generateDots() {
      // One dot per past attempt (rescued or failed) + the upcoming target.
      // Placement lives in minimapGalaxyGeometry so the archived-galaxy
      // snapshot renderer reproduces the exact same layout.
      const { spawn, dots } = generateGalaxyDots(
        galaxyStore.mapSeed,
        galaxyStore.attemptResults.length + 1,
      )
      spawnPos.value = spawn
      dotPositions.value = dots
    }

    function getPlayerWorldPos(dots: DotPos[], attempts: number): { x: number; y: number } {
      // Docked at the boss star in the galaxy core
      if (galaxyStore.bossPhaseActive || galaxyStore.isComplete) return { x: 0.5, y: 0.5 }
      const from = attempts > 0 && dots.length >= attempts ? dots[attempts - 1] : spawnPos.value
      if (galaxyStore.isRescueRotating) return from
      const target = galaxyStore.travelingToGalaxyBoss
        ? { x: 0.5, y: 0.5 }
        : attempts < dots.length
          ? dots[attempts]
          : null
      const state = galaxyStore.championTravelState
      if (state === 'traveling' && target) {
        const startTime = galaxyStore.championTravelStartTime
        const duration = galaxyStore.championTravelDurationMs
        const progress =
          startTime > 0 && duration > 0 ? Math.min((Date.now() - startTime) / duration, 1) : 0
        return {
          x: from.x + (target.x - from.x) * progress,
          y: from.y + (target.y - from.y) * progress,
        }
      }
      const arrived = state === 'champion_available' || state === 'champion_spawned'
      if (arrived && target) return target
      return from
    }

    function drawNormalMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const dots = dotPositions.value
      const results = galaxyStore.attemptResults
      const attempts = Math.min(results.length, dots.length)
      const isTraveling = galaxyStore.championTravelState === 'traveling'
      const nowMs = Date.now()
      // Only the NEXT star is revealed — and only once a role has been chosen
      // for it. Every star already visited stays as a rescued/failed marker.
      const roleChosen = !!galaxyStore.nextStarRole && !galaxyStore.pendingRoleSelection
      const targetIdx =
        galaxyStore.starsRescued < galaxyStore.starsRequired && attempts < dots.length && roleChosen
          ? attempts
          : -1
      // Final leg: after the last champion star the destination is the fixed
      // boss star at the galaxy core.
      const bossTravel = galaxyStore.travelingToGalaxyBoss
      const travelDest = bossTravel
        ? { x: 0.5, y: 0.5 }
        : targetIdx >= 0
          ? dots[targetIdx]
          : null

      // Static map with a soft camera: world coords (0..1) map onto the
      // canvas relative to the camera center + zoom (no rotation). At
      // zoom 1 / center (0.5, 0.5) the whole galaxy is visible; the base
      // stays fully transparent so the flat unified bar background IS the
      // map background — no sprites or tints of its own.
      const cam = camera
      function wToC(wx: number, wy: number): [number, number] {
        return [w / 2 + (wx - cam.x) * w * cam.zoom, h / 2 + (wy - cam.y) * h * cam.zoom]
      }

      // Overview content fades out while the camera zooms onto the target —
      // late enough that the player visibly flies THROUGH the galaxy body.
      const farAlpha = 1 - smoothstep(cam.zoom, MINIMAP_GALAXY_FADE[0], MINIMAP_GALAXY_FADE[1])

      // Zoom velocity → motion streaks while the camera dives in
      const zoomVel = cam.zoom - prevCamZoom
      prevCamZoom = cam.zoom
      const streaking = zoomVel > 0.002 && cam.zoom > 1.6
      // Zielkontext ist Parameter, damit derselbe Partikel-Look sowohl direkt
      // auf den Hauptcanvas als auch in den Offscreen-Layer gezeichnet wird.
      function drawStarParticle(
        c: CanvasRenderingContext2D,
        px: number,
        py: number,
        size: number,
        rgb: string,
        a: number,
      ) {
        const style = `rgba(${rgb}, ${a.toFixed(3)})`
        if (streaking) {
          const dx = px - w / 2
          const dy = py - h / 2
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 1) {
            const len = Math.min(16, zoomVel * dist * 0.5)
            if (len > 0.8) {
              c.beginPath()
              c.strokeStyle = style
              c.lineWidth = size
              c.lineCap = 'round'
              c.moveTo(px, py)
              c.lineTo(px + (dx / dist) * len, py + (dy / dist) * len)
              c.stroke()
              return
            }
          }
        }
        c.beginPath()
        c.arc(px, py, size, 0, Math.PI * 2)
        c.fillStyle = style
        c.fill()
      }

      // Seeded twinkling background stars
      const twRng = seededRng(galaxyStore.currentGalaxy * 52361 + 7)
      for (let i = 0; i < MINIMAP_TWINKLE_COUNT; i++) {
        const tx = twRng() * w
        const ty = twRng() * h
        const phase = twRng() * Math.PI * 2
        const period = 2200 + twRng() * 2600
        const size = 0.8 + twRng() * 1.0
        const tint = twRng()
        const a = 0.2 + 0.55 * (0.5 + 0.5 * Math.sin((nowMs / period) * Math.PI * 2 + phase))
        ctx.beginPath()
        ctx.arc(tx, ty, size, 0, Math.PI * 2)
        ctx.fillStyle =
          tint < 0.33
            ? `rgba(255, 233, 176, ${a.toFixed(3)})`
            : tint < 0.66
              ? `rgba(207, 224, 255, ${a.toFixed(3)})`
              : `rgba(255, 255, 255, ${a.toFixed(3)})`
        ctx.fill()
      }

      // ── Procedural spiral galaxy (no sprite): precomputed seeded particles
      // (bulge / two arms / knots / haze) drawn additively over a two-layer
      // core glow. Follows the camera and fades with the overview layer.
      // Static (no rotation) so the rescue stars stay pinned to the arms.
      //
      // MINIMAP_GALAXY_PARTICLES einzelne arc()+fill() pro Frame waren der
      // teuerste Posten der ganzen HUD-Leiste. Da der Körper nur von Kamera,
      // Seed, Theme und Canvas-Größe abhängt (keine Zeitkomponente), wird er
      // in einen Offscreen-Layer gerastert und pro Frame nur noch als EIN
      // drawImage komponiert — solange die Kamera steht, also fast immer.
      // Additiv bleibt additiv: der Layer wird selbst mit 'lighter' aufgelegt.
      const geo = galaxyGeo(galaxyStore.mapSeed)
      const themeAccent = minimapAccentForTheme(galaxyStore.currentThemeIndex)

      // Gemeinsamer Zeichenkörper für Live- und Cache-Pfad — einzige Quelle
      // der Wahrheit für das Aussehen der Galaxie.
      function drawGalaxyBody(c: CanvasRenderingContext2D) {
        const [gcx, gcy] = wToC(0.5, 0.5)
        const coreR = MINIMAP_GALAXY_CORE_RADIUS * w * cam.zoom
        const coreBright = c.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreR * 0.55)
        coreBright.addColorStop(0, `rgba(255, 240, 200, ${(0.35 * farAlpha).toFixed(3)})`)
        coreBright.addColorStop(1, 'rgba(255, 240, 200, 0)')
        c.fillStyle = coreBright
        c.fillRect(gcx - coreR, gcy - coreR, coreR * 2, coreR * 2)
        const halo = c.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreR * 1.9)
        halo.addColorStop(0, `rgba(240, 205, 140, ${(0.1 * farAlpha).toFixed(3)})`)
        halo.addColorStop(1, 'rgba(240, 205, 140, 0)')
        c.fillStyle = halo
        c.fillRect(gcx - coreR * 2, gcy - coreR * 2, coreR * 4, coreR * 4)

        for (const p of getGalaxyParticles(galaxyStore.mapSeed)) {
          const wp = galaxyPlaneToWorld(geo, p.angle, p.r)
          const [px, py] = wToC(wp.x, wp.y)
          const rgb = p.color === 2 ? themeAccent : GALAXY_PARTICLE_COLORS[p.color]
          drawStarParticle(c, px, py, p.size, rgb, p.alpha * farAlpha)
        }
      }

      if (farAlpha > 0.01) {
        // Während der Zoomfahrt ziehen die Partikel Bewegungsstreifen — die
        // hängen an der Zoom-Geschwindigkeit und lassen sich nicht cachen.
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        if (streaking) {
          drawGalaxyBody(ctx)
        } else {
          const key = `${w}|${h}|${renderDpr}|${galaxyStore.mapSeed}|${galaxyStore.currentThemeIndex}|${cam.x}|${cam.y}|${cam.zoom}|${farAlpha.toFixed(4)}`
          ctx.drawImage(getGalaxyLayer(w, h, key, drawGalaxyBody), 0, 0, w, h)
        }
        ctx.restore()
      }

      // ── Near-field star field around the destination: fades in while the
      // galaxy body thins out → depth during the fly-through, replaces the
      // old galaxy-near sprite. Expands naturally with the camera zoom.
      const nearAlpha = smoothstep(
        cam.zoom,
        MINIMAP_NEARFIELD_FADE[0],
        MINIMAP_NEARFIELD_FADE[1],
      )
      if (nearAlpha > 0.01 && travelDest) {
        const anchor = travelDest
        const nfRng = seededRng(
          galaxyStore.currentGalaxy * 7717 + (bossTravel ? 911 : targetIdx) * 131,
        )
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < MINIMAP_NEARFIELD_STARS; i++) {
          const wx = anchor.x + (nfRng() - 0.5) * 2 * MINIMAP_NEARFIELD_SPREAD
          const wy = anchor.y + (nfRng() - 0.5) * 2 * MINIMAP_NEARFIELD_SPREAD
          const size = 0.5 + nfRng() * 1.3
          const tint = nfRng()
          const a = (0.25 + nfRng() * 0.5) * nearAlpha
          const [px, py] = wToC(wx, wy)
          drawStarParticle(ctx, px, py, size, tint < 0.6 ? '255, 246, 228' : themeAccent, a)
        }
        ctx.restore()
      }

      // Flown route so far: spawn point → every visited star, in visit order
      if (attempts >= 1 && farAlpha > 0.01) {
        ctx.save()
        ctx.globalAlpha = farAlpha
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(232, 192, 64, 0.55)'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const [spx, spy] = wToC(spawnPos.value.x, spawnPos.value.y)
        ctx.moveTo(spx, spy)
        for (let i = 0; i < attempts; i++) {
          const [sx, sy] = wToC(dots[i].x, dots[i].y)
          ctx.lineTo(sx, sy)
        }
        ctx.stroke()
        // One chevron per flown leg, just before its destination star —
        // the route reads as a followable trail of arrowheads.
        let [ax, ay] = [spx, spy]
        for (let i = 0; i < attempts; i++) {
          const [sx, sy] = wToC(dots[i].x, dots[i].y)
          drawRouteArrowhead(
            ctx,
            ax,
            ay,
            sx,
            sy,
            MINIMAP_ROUTE_ARROW_GAP,
            MINIMAP_ROUTE_ARROW_SIZE,
            'rgba(240, 205, 96, 0.85)',
            2,
          )
          ;[ax, ay] = [sx, sy]
        }
        ctx.restore()
      }

      // Current flight leg as a curved, dashed gold path (origin → next star)
      let flight: {
        x0: number
        y0: number
        cx: number
        cy: number
        x2: number
        y2: number
      } | null = null
      if (travelDest && isTraveling) {
        const from = attempts > 0 ? dots[attempts - 1] : spawnPos.value
        const [x0, y0] = wToC(from.x, from.y)
        const [x2, y2] = wToC(travelDest.x, travelDest.y)
        const dx = x2 - x0
        const dy = y2 - y0
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 1) {
          const bend = len * MINIMAP_FLIGHTPATH_BEND
          const cx = (x0 + x2) / 2 - (dy / len) * bend
          const cy = (y0 + y2) / 2 + (dx / len) * bend
          flight = { x0, y0, cx, cy, x2, y2 }
          ctx.beginPath()
          ctx.setLineDash([4, 7])
          ctx.lineDashOffset = -((nowMs / 55) % 11)
          ctx.strokeStyle = 'rgba(255, 210, 120, 0.4)'
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.moveTo(x0, y0)
          ctx.quadraticCurveTo(cx, cy, x2, y2)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.lineDashOffset = 0
        }
      }

      // Overview markers belong to the galaxy overview → fade with it.
      // Only stars already visited are drawn: rescued ✦ or failed ✕ — the
      // upcoming target is rendered separately, future stars stay hidden.
      const galaxySeed = galaxyStore.currentGalaxy * 10007
      if (farAlpha > 0.01) {
        ctx.save()
        ctx.globalAlpha = farAlpha
        for (let i = 0; i < attempts; i++) {
          const [sx, sy] = wToC(dots[i].x, dots[i].y)
          if (results[i] === 'failed') {
            drawPlanet(ctx, sx, sy, 9, galaxySeed + i, 'failed')
          } else {
            drawPlanet(ctx, sx, sy, 11, galaxySeed + i, 'rescued')
          }
        }
        ctx.restore()
      }

      // Galaxy-boss star at the core: hidden while champion stars remain —
      // it reveals itself (pulsing, route-linked) once the last star is saved.
      // The marker survives the camera dive (grows with the zoom like the
      // champion target); only the route line fades with the overview.
      if (galaxyStore.needsFinalBoss) {
        const [bx, by] = wToC(0.5, 0.5)
        if (attempts > 0 && farAlpha > 0.01 && isTraveling) {
          ctx.save()
          ctx.globalAlpha = farAlpha
          const last = dots[attempts - 1]
          const [lx, ly] = wToC(last.x, last.y)
          ctx.beginPath()
          ctx.setLineDash([4, 4])
          ctx.strokeStyle = 'rgba(255,80,30,0.55)'
          ctx.lineWidth = 1.5
          ctx.moveTo(lx, ly)
          ctx.lineTo(bx, by)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }
        const bossScale =
          1 + 1.1 * smoothstep(cam.zoom, MINIMAP_NEARFIELD_FADE[0], MINIMAP_ZOOM_MAX)
        const bossPulse = 0.8 + 0.2 * Math.sin(nowMs / 420)
        for (const [r, a] of [
          [22, 0.08],
          [16, 0.18],
          [12, 0.32],
        ] as [number, number][]) {
          ctx.beginPath()
          ctx.arc(bx, by, r * bossScale, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200,30,10,${(a * bossPulse).toFixed(3)})`
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(bx, by, 9 * bossScale, 0, Math.PI * 2)
        ctx.fillStyle = '#9b1020'
        ctx.fill()
        ctx.strokeStyle = '#ff4020'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(bx, by, 5 * bossScale, 0, Math.PI * 2)
        ctx.fillStyle = '#1a0404'
        ctx.fill()
        ctx.font = `bold ${Math.round(9 * bossScale)}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ff6040'
        ctx.fillText('☠', bx, by)
      }

      // Next-target star, in the color of the role chosen for it — visible
      // from the moment the role is confirmed (departure spin, flight, …).
      if (targetIdx >= 0) {
        const [tx, ty] = wToC(dots[targetIdx].x, dots[targetIdx].y)
        const champStar = starGroupStore.activeStars.find((s) => s.starType === 'champion')
        const nextRole = galaxyStore.nextStarRole
        let targetPal: typeof STAR_PALETTE = STAR_PALETTE
        if (champStar) {
          targetPal = rolePaletteFromRgb(...champStar.starColor)
        } else if (nextRole && ROLE_COLORS[nextRole]) {
          targetPal = rolePaletteFromHex(ROLE_COLORS[nextRole])
        }
        // Small in the far overview (comet-relative scale), growing only
        // moderately with the zoom — the arrival crossfade bridges the
        // remaining size gap to the arrival sun
        const targetR =
          MINIMAP_TARGET_BASE_R +
          (MINIMAP_TARGET_MAX_R - MINIMAP_TARGET_BASE_R) *
            smoothstep(cam.zoom, MINIMAP_NEARFIELD_FADE[0], MINIMAP_ZOOM_MAX)
        drawRoleStar(ctx, tx, ty, targetR, targetPal, nowMs)

        // Expanding beacon rings in the destination's role color — draws the
        // eye more reliably than a text label and scales with the zoom
        for (let ring = 0; ring < 2; ring++) {
          const ringT = (nowMs / 1800 + ring / 2) % 1
          const ringR = targetR * (1.3 + ringT * 1.6)
          const ringA = (1 - ringT) * 0.6
          ctx.beginPath()
          ctx.arc(tx, ty, ringR, 0, Math.PI * 2)
          ctx.strokeStyle = hexToRgba(targetPal.base, ringA)
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }

      if (flight) {
        // Player comet travelling along the quadratic flight path:
        // glowing white-gold head + tapering tail along the flown route
        const startTime = galaxyStore.championTravelStartTime
        const duration = galaxyStore.championTravelDurationMs
        const t =
          startTime > 0 && duration > 0 ? Math.min((nowMs - startTime) / duration, 1) : 0
        const qx = (tt: number) => {
          const m = 1 - tt
          return m * m * flight.x0 + 2 * m * tt * flight.cx + tt * tt * flight.x2
        }
        const qy = (tt: number) => {
          const m = 1 - tt
          return m * m * flight.y0 + 2 * m * tt * flight.cy + tt * tt * flight.y2
        }

        // Tail: sample the curve backwards from the current position
        const legLen = Math.hypot(flight.x2 - flight.x0, flight.y2 - flight.y0)
        const tailT =
          legLen > 1
            ? Math.min(t, (MINIMAP_COMET_TAIL_LEN * Math.sqrt(cam.zoom)) / legLen)
            : 0
        if (tailT > 0.0001) {
          ctx.lineCap = 'round'
          for (let i = MINIMAP_COMET_TAIL_SEGMENTS; i >= 1; i--) {
            const f1 = i / MINIMAP_COMET_TAIL_SEGMENTS
            const f0 = (i - 1) / MINIMAP_COMET_TAIL_SEGMENTS
            const t1 = Math.max(0, t - tailT * f1)
            const t0 = Math.max(0, t - tailT * f0)
            const nearHead = 1 - f1
            ctx.beginPath()
            ctx.strokeStyle = `rgba(255, 214, 120, ${(nearHead * 0.85).toFixed(3)})`
            ctx.lineWidth = 0.4 + nearHead * 2.8
            ctx.shadowColor = 'rgba(255, 190, 80, 0.6)'
            ctx.shadowBlur = nearHead * 5
            ctx.moveTo(qx(t1), qy(t1))
            ctx.lineTo(qx(t0), qy(t0))
            ctx.stroke()
          }
          ctx.shadowBlur = 0
        }

        // Head: hot white core with warm gold glow
        const hx = qx(t)
        const hy = qy(t)
        const headR = MINIMAP_COMET_HEAD_R * Math.sqrt(cam.zoom)
        const headGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, headR * 3.2)
        headGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
        headGlow.addColorStop(0.35, 'rgba(255, 216, 112, 0.65)')
        headGlow.addColorStop(1, 'rgba(255, 190, 80, 0)')
        ctx.beginPath()
        ctx.arc(hx, hy, headR * 3.2, 0, Math.PI * 2)
        ctx.fillStyle = headGlow
        ctx.fill()
        ctx.beginPath()
        ctx.arc(hx, hy, headR, 0, Math.PI * 2)
        ctx.fillStyle = '#fff8e8'
        ctx.fill()
        drawPlayerRing(ctx, hx, hy, headR * 2.2, nowMs)
      } else if (!galaxyStore.isRescueRotating && !galaxyStore.pendingRoleSelection) {
        // Idle: player-sun at the current position (the waiting screen draws
        // its own departure beacon at the flight origin instead)
        const player = getPlayerWorldPos(dots, attempts)
        const [px, py] = wToC(player.x, player.y)
        drawMiniSun(ctx, px, py, MINIMAP_IDLE_SUN_R, nowMs)
        drawPlayerRing(ctx, px, py, MINIMAP_IDLE_SUN_R * 1.5, nowMs)
      }
    }

    function drawChampionPortrait(
      ctx: CanvasRenderingContext2D,
      px: number,
      py: number,
      r: number,
      slot: { planetId?: string; isChampionPlanet?: boolean },
      alpha: number,
    ) {
      if (!slot.isChampionPlanet || !slot.planetId) return
      const boss = planetBossStore.activeBosses.find((b) => b.planetId === slot.planetId)
      if (!boss?.homePlanetChampion) return
      const img = getOrLoadChampionImage(boss.homePlanetChampion)
      if (!img) return
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(px, py, r * 0.88, 0, Math.PI * 2)
      ctx.clip()
      // centered square source crop — splash-art skins are wide, icons square
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const sx = (img.naturalWidth - side) / 2
      const sy = (img.naturalHeight - side) / 2
      ctx.drawImage(img, sx, sy, side, side, px - r, py - r, r * 2, r * 2)
      ctx.restore()
      // gold ring around champion planet
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.strokeStyle = '#e8c040'
      ctx.lineWidth = 1.2
      ctx.shadowColor = 'rgba(232,192,64,0.8)'
      ctx.shadowBlur = 4
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()
    }

    function drawArrivalView(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const cx = w / 2
      const cy = h / 2
      const nowMs = Date.now()

      // Deep-space glow that fades out toward the edges so the unified
      // bar background stays visible around the star system
      const space = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.62)
      space.addColorStop(0, 'rgba(10, 6, 2, 0.88)')
      space.addColorStop(0.72, 'rgba(10, 6, 2, 0.5)')
      space.addColorStop(1, 'rgba(10, 6, 2, 0)')
      ctx.fillStyle = space
      ctx.fillRect(0, 0, w, h)

      // Seeded background star field
      const bgRng = seededRng(galaxyStore.currentGalaxy * 77771)
      for (let i = 0; i < 60; i++) {
        const bx = bgRng() * w
        const by = bgRng() * h
        const br = 0.5 + bgRng() * 0.7
        const ba = 0.2 + bgRng() * 0.4
        const bc = 180 + Math.floor(bgRng() * 75)
        ctx.beginPath()
        ctx.arc(bx, by, br, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${bc}, ${bc + 10}, 255, ${ba.toFixed(2)})`
        ctx.fill()
      }

      // Star color from store (RGB 0-255)
      const championStar = starGroupStore.activeStars.find((s) => s.starType === 'champion')
      const [sr, sg, sb] = championStar?.starColor ?? [255, 160, 60]

      // Hover state — drives visual enhancements
      const isHovered = !!championStar && starGroupStore.hoveredTimerStarId === championStar.id
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const hoverGlowMult = isHovered ? 1.18 : 1.0
      const hoverBodyMult = isHovered ? 1.06 : 1.0
      const hoverBlurMult = isHovered ? 1.35 : 1.0
      const hoverAlphaBoost = isHovered ? 0.12 : 0.0
      const hoverSpeedMult = isHovered && !reducedMotion ? 1.55 : 1.0
      const hoverPlanetAlpha = isHovered ? 0.62 : 0.45

      // Pulse animation
      const pulse = 0.5 + 0.5 * Math.sin(nowMs / 900)
      const ARRIVAL_STAR_R = MINIMAP_ARRIVAL_STAR_R

      // Outer corona (large diffuse glow)
      const coroR = ARRIVAL_STAR_R * (3.6 + 0.4 * pulse) * hoverGlowMult
      const outerCorona = ctx.createRadialGradient(cx, cy, ARRIVAL_STAR_R * 0.85, cx, cy, coroR)
      outerCorona.addColorStop(0, `rgba(${sr}, ${sg}, ${sb}, ${0.28 + hoverAlphaBoost})`)
      outerCorona.addColorStop(0.45, `rgba(${sr}, ${Math.max(0, sg - 40)}, 0, ${0.08 + hoverAlphaBoost * 0.5})`)
      outerCorona.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.beginPath()
      ctx.arc(cx, cy, coroR, 0, Math.PI * 2)
      ctx.fillStyle = outerCorona
      ctx.fill()

      // Inner halo (tighter, warmer)
      const innerHalo = ctx.createRadialGradient(
        cx,
        cy,
        ARRIVAL_STAR_R * 0.6,
        cx,
        cy,
        ARRIVAL_STAR_R * 2.2,
      )
      innerHalo.addColorStop(0, 'rgba(255, 230, 190, 0.6)')
      innerHalo.addColorStop(0.4, `rgba(${sr}, ${sg}, ${sb}, ${0.25 + hoverAlphaBoost})`)
      innerHalo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.beginPath()
      ctx.arc(cx, cy, ARRIVAL_STAR_R * 2.2, 0, Math.PI * 2)
      ctx.fillStyle = innerHalo
      ctx.fill()

      // Build planet slot list — every slot of the star keeps its orbit, also
      // once it is freed. A cleared slot is drawn small and dim instead of
      // vanishing: the remaining planets would otherwise shift one orbit
      // inward on every kill, and the x/y counter in the HUD would have
      // nothing to point at.
      const galaxySeed = galaxyStore.currentGalaxy * 10007
      const rawSlots = championStar?.planetSlots ?? []

      type ArrivalSlot = {
        orbitDirection: 1 | -1
        planetId?: string
        type?: PlanetType
        isChampionPlanet?: boolean
        cleared?: boolean
      }
      let slots: ArrivalSlot[]
      if (rawSlots.length > 0) {
        slots = (rawSlots as StarPlanetSlot[]).map((s) => ({
          orbitDirection: s.orbitDirection,
          planetId: s.planetId,
          type: s.type,
          isChampionPlanet: s.isChampionPlanet,
          cleared: s.cleared,
        }))
      } else {
        const previewRng = seededRng(
          galaxyStore.currentGalaxy * 997 + galaxyStore.starsRescued * 31,
        )
        const previewCount =
          MINIMAP_ARRIVAL_PREVIEW_MIN + Math.floor(previewRng() * MINIMAP_ARRIVAL_PREVIEW_RANGE)
        slots = Array.from({ length: previewCount }, () => ({
          orbitDirection: (previewRng() < 0.5 ? 1 : -1) as 1 | -1,
        }))
      }

      // Compute planet positions for this frame (speed boosted when hovered)
      const planetData = slots.map((slot, idx) => {
        const isChamp = slot.isChampionPlanet ?? false
        const cleared = slot.cleared ?? false
        const fullR = isChamp
          ? MINIMAP_ARRIVAL_CHAMP_PLANET_R
          : MINIMAP_ARRIVAL_PLANET_R + idx * MINIMAP_ARRIVAL_PLANET_STEP
        const planetR = cleared ? fullR * MINIMAP_ARRIVAL_CLEARED_SCALE : fullR

        const orbitRx = ARRIVAL_STAR_R + MINIMAP_ARRIVAL_ORBIT_GAP + idx * MINIMAP_ARRIVAL_ORBIT_STEP
        const orbitRy = orbitRx * MINIMAP_ARRIVAL_ORBIT_SQUASH

        // Sync with main UI: read live angle from useStarSystem; fallback to time-based
        const liveAngle = slot.planetId ? livePlanetAngles.get(slot.planetId) : undefined
        let angle: number
        if (liveAngle !== undefined) {
          angle = liveAngle
        } else {
          const speed = slot.orbitDirection * (0.32 + idx * 0.15) * hoverSpeedMult
          angle = (nowMs / 1000) * speed + idx * Math.PI * 0.67
        }

        return {
          px: cx + Math.cos(angle) * orbitRx,
          py: cy + Math.sin(angle) * orbitRy,
          orbitRx,
          orbitRy,
          planetR,
          cleared,
          isChamp,
          idx,
        }
      })

      // Orbit ellipses (dashed, subtle — slightly more visible when hovered).
      // The champion's orbit carries the gold of its portrait ring so the lane
      // that matters is readable even while the planet is behind the star.
      planetData.forEach(({ orbitRx, orbitRy, isChamp, cleared }) => {
        ctx.save()
        ctx.globalAlpha = cleared ? 0.05 : isChamp ? (isHovered ? 0.32 : 0.2) : isHovered ? 0.18 : 0.1
        ctx.beginPath()
        ctx.ellipse(cx, cy, orbitRx, orbitRy, 0, 0, Math.PI * 2)
        ctx.strokeStyle = isChamp ? 'rgba(232, 192, 64, 1)' : 'rgba(140, 160, 220, 1)'
        ctx.lineWidth = isChamp ? 1 : 0.7
        ctx.setLineDash([3, 5])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      })

      // Behind-planets (py < cy) drawn first at reduced opacity (brighter when hovered)
      planetData.forEach(({ px, py, planetR, idx, cleared }) => {
        if (py >= cy) return
        const slot = slots[idx]
        const typePal = slot.type ? PLANET_TYPE_PALETTES[slot.type] : undefined
        const alpha = cleared ? MINIMAP_ARRIVAL_CLEARED_ALPHA : hoverPlanetAlpha
        ctx.save()
        ctx.globalAlpha = alpha
        drawPlanet(
          ctx,
          px,
          py,
          planetR,
          galaxySeed + idx * 17,
          cleared ? 'rescued' : 'unrescued',
          false,
          cleared ? undefined : typePal,
        )
        ctx.restore()
        if (!cleared) drawChampionPortrait(ctx, px, py, planetR, slot, alpha)
      })

      // Star body (on top of behind-planets, below foreground-planets)
      const pulseGlow = (1 + 0.12 * pulse) * hoverBodyMult
      const bodyGrad = ctx.createRadialGradient(
        cx - ARRIVAL_STAR_R * 0.28,
        cy - ARRIVAL_STAR_R * 0.25,
        2,
        cx,
        cy,
        ARRIVAL_STAR_R * pulseGlow,
      )
      bodyGrad.addColorStop(0, '#fff8f0')
      bodyGrad.addColorStop(
        0.22,
        `rgb(${Math.min(255, sr + 30)}, ${Math.min(255, sg + 15)}, ${sb})`,
      )
      bodyGrad.addColorStop(0.65, `rgb(${sr}, ${sg}, ${Math.max(0, sb - 20)})`)
      bodyGrad.addColorStop(1, `rgb(${Math.max(0, sr - 90)}, ${Math.max(0, sg - 70)}, 0)`)
      ctx.shadowColor = `rgba(${sr}, ${sg}, ${sb}, 0.9)`
      ctx.shadowBlur = ARRIVAL_STAR_R * (1.6 + 0.3 * pulse) * hoverBlurMult
      ctx.beginPath()
      ctx.arc(cx, cy, ARRIVAL_STAR_R * pulseGlow, 0, Math.PI * 2)
      ctx.fillStyle = bodyGrad
      ctx.fill()
      ctx.shadowBlur = 0

      // Foreground planets (py >= cy) at full opacity
      planetData.forEach(({ px, py, planetR, idx, cleared }) => {
        if (py < cy) return
        const slot = slots[idx]
        const typePal = slot.type ? PLANET_TYPE_PALETTES[slot.type] : undefined
        if (cleared) {
          ctx.save()
          ctx.globalAlpha = MINIMAP_ARRIVAL_CLEARED_ALPHA
          drawPlanet(ctx, px, py, planetR, galaxySeed + idx * 17, 'rescued')
          ctx.restore()
          return
        }
        drawPlanet(ctx, px, py, planetR, galaxySeed + idx * 17, 'unrescued', false, typePal)
        drawChampionPortrait(ctx, px, py, planetR, slot, 1)
      })

    }

    function drawRotationTransition(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const nowMs = Date.now()
      const elapsed = Math.max(0, nowMs - galaxyStore.rescueRotationStartTime)
      // The orbit rAF loop normally ends the rotation, but it pauses while
      // the Bard profile is open — finish it from here too, so the departure
      // transition hands over to the flight without closing the modal first.
      if (elapsed >= RESCUE_ROTATION_DURATION_MS) galaxyStore.endRescueRotation()
      const t = Math.min(elapsed / RESCUE_ROTATION_DURATION_MS, 1)
      const te = easeInOut(t)

      // The galaxy map stays visible throughout — the waiting screen already
      // shows it. The player sun glides from the center to the flight origin,
      // shrinking down to the small departure marker while launch streaks fire.
      drawNormalMap(ctx, w, h)

      if (te < 0.99) {
        const fade = 1 - te
        const origin = getFlightOrigin()
        const bx = w / 2 + (origin.x * w - w / 2) * te
        const by = h / 2 + (origin.y * h - h / 2) * te
        const sunR = MINIMAP_WAIT_SUN_R + (MINIMAP_IDLE_SUN_R - MINIMAP_WAIT_SUN_R) * te

        // Contrast scrim fades out as the sun docks at its departure point
        drawSunScrim(ctx, bx, by, sunR, fade)

        const phase = STAR_PHASE_DATA[solarUpgradeStore.starPhase] ?? STAR_PHASE_DATA[0]
        drawPhaseSun(ctx, bx, by, sunR, phase, nowMs)

        // Radial launch streaks (grow longer as t increases, then fade out)
        const numStreaks = 8
        const streakBaseLen = sunR * (1.2 + te * 5)
        const streakAlpha = te * 0.55 * fade
        const streakOffset = galaxyStore.rescueRotationDirection * te * Math.PI * 0.5
        for (let i = 0; i < numStreaks; i++) {
          const angle = (i / numStreaks) * Math.PI * 2 + streakOffset
          const startR = sunR * 1.15
          const endR = startR + streakBaseLen
          const sx = bx + Math.cos(angle) * startR
          const sy = by + Math.sin(angle) * startR
          const ex = bx + Math.cos(angle) * endR
          const ey = by + Math.sin(angle) * endR
          const grad = ctx.createLinearGradient(sx, sy, ex, ey)
          grad.addColorStop(0, `rgba(255, 210, 120, ${streakAlpha.toFixed(3)})`)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.beginPath()
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.2
          ctx.moveTo(sx, sy)
          ctx.lineTo(ex, ey)
          ctx.stroke()
        }
      }
    }

    /** World position the next flight departs from (last visited star or spawn). */
    function getFlightOrigin(): DotPos {
      const dots = dotPositions.value
      const attempts = Math.min(galaxyStore.attemptResults.length, dots.length)
      return attempts > 0 ? dots[attempts - 1] : spawnPos.value
    }

    /** Dark radial scrim behind the sun so it stays readable on the golden
     *  galaxy sprite (yellow-on-yellow contrast fix). */
    function drawSunScrim(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
      alpha: number,
    ) {
      const scrim = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5)
      scrim.addColorStop(0, `rgba(6, 4, 14, ${(0.65 * alpha).toFixed(3)})`)
      scrim.addColorStop(0.6, `rgba(6, 4, 14, ${(0.42 * alpha).toFixed(3)})`)
      scrim.addColorStop(1, 'rgba(6, 4, 14, 0)')
      ctx.beginPath()
      ctx.arc(x, y, r * 3.5, 0, Math.PI * 2)
      ctx.fillStyle = scrim
      ctx.fill()
    }

    function drawCanvas(timestamp = performance.now()) {
      const canvas = canvasEl.value
      if (!canvas) return
      const { w, h } = ensureCanvasSize(canvas)
      if (w === 0 || h === 0) return
      // Render at device-pixel resolution so the map stays crisp on
      // HiDPI/Retina displays; all drawing keeps using CSS-pixel coords.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      renderDpr = dpr
      const pw = Math.round(w * dpr)
      const ph = Math.round(h * dpr)
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (galaxyStore.pendingRoleSelection) {
        // Waiting for role selection: plain galaxy overview only — the
        // "Choose your Role" label is a DOM overlay in MiniMap.vue.
        drawNormalMap(ctx, w, h)
        return
      }
      if (galaxyStore.isRescueRotating) {
        drawRotationTransition(ctx, w, h)
        return
      }
      if (hyperspacePhase === 'streaks') {
        warp.drawStreaks(ctx, w, h, timestamp, hyperspacePhaseStart)
        return
      }
      if (hyperspacePhase === 'flash') {
        warp.drawFlash(ctx, w, h, hyperspacePhaseStart)
        return
      }
      if (hyperspacePhase === 'fadeout') {
        drawFadeoutPhase(ctx, w, h)
        return
      }
      const isArrived =
        galaxyStore.championTravelState === 'champion_available' ||
        galaxyStore.championTravelState === 'champion_spawned'
      if (isArrived) {
        const elapsed =
          arrivalTransitionStart >= 0
            ? Date.now() - arrivalTransitionStart
            : ARRIVAL_TRANSITION_MS
        const t = easeInOut(Math.min(1, elapsed / ARRIVAL_TRANSITION_MS))
        if (t < 1) {
          drawNormalMap(ctx, w, h)
          ctx.save()
          ctx.globalAlpha = t
          drawArrivalView(ctx, w, h)
          ctx.restore()
        } else {
          drawArrivalView(ctx, w, h)
        }
        return
      }

      // Departure crossfade: star system fades out over the (still zoomed-in)
      // galaxy map — the camera then glides back out through the near field.
      if (departureTransitionStart >= 0) {
        const elapsed = Date.now() - departureTransitionStart
        if (elapsed < MINIMAP_DEPARTURE_TRANSITION_MS) {
          const t = easeInOut(Math.min(1, elapsed / MINIMAP_DEPARTURE_TRANSITION_MS))
          drawNormalMap(ctx, w, h)
          ctx.save()
          ctx.globalAlpha = 1 - t
          drawArrivalView(ctx, w, h)
          ctx.restore()
          return
        }
        departureTransitionStart = -1
      }

      drawNormalMap(ctx, w, h)
    }

    function updateCamera() {
      // Desired camera per frame: full galaxy by default; during the final
      // MINIMAP_ZOOM_TRIGGER_MS of a flight ease onto the destination star so
      // the camera is fully zoomed exactly at arrival 0:00. After clearing a
      // star the same lerp glides back out to the whole galaxy.
      let dz = 1
      let dx = 0.5
      let dy = 0.5

      const dots = dotPositions.value
      const attempts = Math.min(galaxyStore.attemptResults.length, dots.length)
      const target = galaxyStore.travelingToGalaxyBoss
        ? { x: 0.5, y: 0.5 }
        : galaxyStore.starsRescued < galaxyStore.starsRequired && attempts < dots.length
          ? dots[attempts]
          : null
      const isArrived =
        (galaxyStore.championTravelState === 'champion_available' ||
          galaxyStore.championTravelState === 'champion_spawned') &&
        !galaxyStore.isRescueRotating &&
        !galaxyStore.pendingRoleSelection

      if (galaxyStore.bossPhaseActive) {
        // Docked at the boss star → hold the zoom on the galaxy core
        dz = MINIMAP_ZOOM_MAX
        dx = 0.5
        dy = 0.5
      } else if (isArrived && target) {
        dz = MINIMAP_ZOOM_MAX
        dx = target.x
        dy = target.y
      } else if (galaxyStore.championTravelState === 'traveling' && target) {
        const remaining = galaxyStore.travelRemainingMs
        if (remaining <= MINIMAP_ZOOM_TRIGGER_MS) {
          const tz = easeInOut(
            Math.max(0, Math.min(1, 1 - remaining / MINIMAP_ZOOM_TRIGGER_MS)),
          )
          dz = 1 + (MINIMAP_ZOOM_MAX - 1) * tz
          dx = 0.5 + (target.x - 0.5) * tz
          dy = 0.5 + (target.y - 0.5) * tz
        }
      }

      // Zoom out noticeably slower than in, so the near-field star field stays
      // readable for a moment on the way back to the galaxy overview
      const lerp = dz < camera.zoom ? MINIMAP_ZOOM_OUT_LERP : MINIMAP_ZOOM_LERP
      camera.zoom += (dz - camera.zoom) * lerp
      camera.x += (dx - camera.x) * lerp
      camera.y += (dy - camera.y) * lerp
    }

    function rafTick(timestamp: number) {
      updateCamera()
      drawCanvas(timestamp)
      if (show.value) {
        rafId = requestAnimationFrame(rafTick)
      } else {
        rafId = null
      }
    }

    watch(
      () => [
        galaxyStore.currentGalaxy,
        galaxyStore.mapSeed,
        galaxyStore.attemptResults.length,
      ],
      () => generateDots(),
      { immediate: true },
    )

    watch(
      () => galaxyStore.currentThemeIndex,
      () => drawCanvas(),
    )

    watch(
      show,
      (val) => {
        if (val && rafId === null) {
          rafId = requestAnimationFrame(rafTick)
        }
      },
      { immediate: true },
    )

    // Deliberately the HUD pause signal: the minimap keeps flying to the next
    // star while a bard tab is open ODER das Spiel pausiert ist — die Leiste
    // liegt über dem Pause-Overlay und bleibt sichtbar, der Flug muss dort
    // weiterlaufen. Angehalten wird nur im echten Hintergrund-Tab.
    const { isHudPaused } = useRenderingPaused()

    watch(isHudPaused, (paused) => {
      if (paused) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      } else if (show.value && rafId === null) {
        resetCanvasIfContextLost(canvasEl.value)
        rafId = requestAnimationFrame(rafTick)
      }
    })

    watch(
      () => galaxyStore.isGalaxyTransitioning,
      (active) => {
        if (!active) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const canvas = canvasEl.value
        const { w, h } = canvas ? ensureCanvasSize(canvas) : { w: 440, h: 440 }
        for (const id of hyperspaceTimeouts) window.clearTimeout(id)
        hyperspaceTimeouts = []
        warp.init(w, h)
        hyperspacePhase = 'streaks'
        hyperspacePhaseStart = Date.now()
        hyperspaceTimeouts.push(
          window.setTimeout(() => {
            hyperspacePhase = 'flash'
            hyperspacePhaseStart = Date.now()
          }, GALAXY_TRANS_WARP_MS),
          window.setTimeout(() => {
            hyperspacePhase = 'fadeout'
            hyperspacePhaseStart = Date.now()
          }, GALAXY_TRANS_WARP_MS + 500),
          window.setTimeout(() => {
            hyperspacePhase = 'idle'
            warp.reset()
            camera.x = 0.5
            camera.y = 0.5
            camera.zoom = 1
            departureTransitionStart = -1
          }, GALAXY_TRANS_WARP_MS + GALAXY_TRANS_DECEL_MS),
        )
      },
    )

    watch(
      () => gameStore.isHyperspaceActive,
      (active) => {
        if (!active) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const canvas = canvasEl.value
        const { w, h } = canvas ? ensureCanvasSize(canvas) : { w: 440, h: 440 }
        for (const id of hyperspaceTimeouts) window.clearTimeout(id)
        hyperspaceTimeouts = []
        warp.init(w, h)
        hyperspacePhase = 'streaks'
        hyperspacePhaseStart = Date.now()
        hyperspaceTimeouts.push(
          window.setTimeout(() => {
            hyperspacePhase = 'flash'
            hyperspacePhaseStart = Date.now()
          }, HYPERSPACE_FLASH_AT_MS),
          window.setTimeout(() => {
            hyperspacePhase = 'fadeout'
            hyperspacePhaseStart = Date.now()
          }, HYPERSPACE_FADEOUT_AT_MS),
          window.setTimeout(() => {
            hyperspacePhase = 'idle'
            warp.reset()
            camera.x = 0.5
            camera.y = 0.5
            camera.zoom = 1
          }, HYPERSPACE_END_AT_MS),
        )
      },
    )

    watch(
      () => galaxyStore.championTravelState,
      (state, prevState) => {
        const arrived = state === 'champion_available' || state === 'champion_spawned'
        const wasArrived =
          prevState === 'champion_available' || prevState === 'champion_spawned'
        if (arrived && arrivalTransitionStart === -1) {
          arrivalTransitionStart = Date.now()
          departureTransitionStart = -1
        } else if (!arrived) {
          arrivalTransitionStart = -1
          // leaving the star system → crossfade back onto the galaxy map
          if (wasArrived) departureTransitionStart = Date.now()
        }
      },
    )

    onMounted(() => {
      nextTick(() => {
        const canvas = canvasEl.value
        if (canvas) {
          sizeObserver = new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect
            if (!box) return
            canvasSize.w = box.width
            canvasSize.h = box.height
          })
          sizeObserver.observe(canvas)
        }
        drawCanvas()
      })
    })

    onUnmounted(() => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      sizeObserver?.disconnect()
      sizeObserver = null
      galaxyLayer = null
      galaxyLayerKey = ''
      for (const id of hyperspaceTimeouts) window.clearTimeout(id)
      hyperspaceTimeouts = []
      arrivalTransitionStart = -1
      departureTransitionStart = -1
    })

    return { canvasEl }
  },
})
</script>

<style scoped>
.map-canvas {
  display: block;
  width: 100%;
  height: 100%;
  /* Canvas erbt den clip-path des Wrappers – keine eigene Rundung nötig */
}
</style>
