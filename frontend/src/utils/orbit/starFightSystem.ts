/* ── Die Systembühne des Star-Fight-Modals: Stern, Bahnen, Kamera ────────────
   Rein und DOM-frei — StarFightSystemStage.vue und die Spec lesen dieselben
   Zahlen. Alles aus Slot-Feldern und Konstanten, nichts gewürfelt.            */

import {
  STAR_FIGHT_SYS_CENTER_X_PCT,
  STAR_FIGHT_SYS_CENTER_Y_PCT,
  STAR_FIGHT_SYS_MARGIN_X,
  STAR_FIGHT_SYS_MARGIN_TOP,
  STAR_FIGHT_SYS_MARGIN_BOTTOM,
  STAR_FIGHT_SYS_PLANET_D_PCT,
  STAR_FIGHT_SYS_STAR_PX_PCT,
  STAR_FIGHT_SYS_MIN_GAP_PX,
  STAR_FIGHT_SYS_NUDGE_RAD,
  STAR_FIGHT_SYS_NUDGE_TRIES,
  STAR_FIGHT_ANCHOR_X_PCT,
  STAR_FIGHT_ANCHOR_Y_PCT,
  STAR_FIGHT_FIGHT_PLANET_D_PCT,
  STAR_FIGHT_PLANET_PX_STEP,
  STAR_FIGHT_SYS_SPRITE_OVERSAMPLE,
} from '@/config/constants'
import { getOrbitPos } from '@/utils/orbit/geometry'
import { planetSeedFor } from '@/utils/fx/planetSprite'
import type { PlanetType } from '@/types'

export interface SystemSlotInput {
  planetId: string
  type: PlanetType
  isChampionPlanet: boolean
  orbitAngle: number
  orbitDirection: 1 | -1
  orbitRx: number
  orbitRy: number
  orbitTilt: number
  cleared: boolean
}

export interface SystemStarInput {
  planetSlots: SystemSlotInput[]
}

export interface SystemPlanet {
  planetId: string
  type: PlanetType
  seed: number
  cleared: boolean
  isChampionPlanet: boolean
  isGalaxyBoss: boolean
  x: number
  y: number
  r: number
  /** Richtung Planet → Stern, rad. */
  lightAngle: number
  orbit: { cx: number; cy: number; rx: number; ry: number; tilt: number }
}

export interface SystemLayout {
  w: number
  h: number
  star: { x: number; y: number; px: number }
  unit: number
  planets: SystemPlanet[]
}

export interface CameraTransform {
  tx: number
  ty: number
  k: number
}

function extent(slot: SystemSlotInput): { ex: number; ey: number } {
  const c = Math.cos(slot.orbitTilt)
  const s = Math.sin(slot.orbitTilt)
  return {
    ex: Math.hypot(slot.orbitRx * c, slot.orbitRy * s),
    ey: Math.hypot(slot.orbitRx * s, slot.orbitRy * c),
  }
}

export function systemLayout(
  star: SystemStarInput,
  w: number,
  h: number,
  galaxyBossPlanetIds: ReadonlySet<string> = new Set(),
): SystemLayout {
  const sx = (w * STAR_FIGHT_SYS_CENTER_X_PCT) / 100
  const sy = (h * STAR_FIGHT_SYS_CENTER_Y_PCT) / 100
  const r = (h * STAR_FIGHT_SYS_PLANET_D_PCT) / 200
  const slots = star.planetSlots
  let maxEx = 0
  let maxEy = 0
  for (const slot of slots) {
    const e = extent(slot)
    maxEx = Math.max(maxEx, e.ex)
    maxEy = Math.max(maxEy, e.ey)
  }
  const availX = w * (0.5 - STAR_FIGHT_SYS_MARGIN_X) - r
  const availY =
    Math.min(sy - h * STAR_FIGHT_SYS_MARGIN_TOP, h * (1 - STAR_FIGHT_SYS_MARGIN_BOTTOM) - sy) - r
  const unit = Math.max(
    0,
    Math.min(maxEx > 0 ? availX / maxEx : Infinity, maxEy > 0 ? availY / maxEy : Infinity),
  )
  const safeUnit = Number.isFinite(unit) ? unit : 0
  const minDist = 2 * r + STAR_FIGHT_SYS_MIN_GAP_PX

  const planets: SystemPlanet[] = []
  for (const slot of slots) {
    const rx = slot.orbitRx * safeUnit
    const ry = slot.orbitRy * safeUnit
    let angle = slot.orbitAngle
    let pos = getOrbitPos(angle, rx, ry, slot.orbitTilt, sx, sy)
    // Ablehnungspass: zu nah an einem früheren Planeten → auf der eigenen Bahn weiterdrehen
    for (let t = 0; t < STAR_FIGHT_SYS_NUDGE_TRIES; t++) {
      const crowded = planets.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < minDist)
      if (!crowded) break
      angle += STAR_FIGHT_SYS_NUDGE_RAD * slot.orbitDirection
      pos = getOrbitPos(angle, rx, ry, slot.orbitTilt, sx, sy)
    }
    planets.push({
      planetId: slot.planetId,
      type: slot.type,
      seed: planetSeedFor(slot.planetId),
      cleared: slot.cleared,
      isChampionPlanet: slot.isChampionPlanet,
      isGalaxyBoss: galaxyBossPlanetIds.has(slot.planetId),
      x: pos.x,
      y: pos.y,
      r,
      lightAngle: Math.atan2(sy - pos.y, sx - pos.x),
      orbit: { cx: sx, cy: sy, rx, ry, tilt: slot.orbitTilt },
    })
  }
  return {
    w,
    h,
    star: { x: sx, y: sy, px: (h * STAR_FIGHT_SYS_STAR_PX_PCT) / 100 },
    unit: safeUnit,
    planets,
  }
}

/** Kampf-Zoom: konstant, unabhängig von der Bühnengrösse. */
export function fightZoom(): number {
  return STAR_FIGHT_FIGHT_PLANET_D_PCT / STAR_FIGHT_SYS_PLANET_D_PCT
}

function anchor(layout: SystemLayout): { x: number; y: number } {
  return {
    x: (layout.w * STAR_FIGHT_ANCHOR_X_PCT) / 100,
    y: (layout.h * STAR_FIGHT_ANCHOR_Y_PCT) / 100,
  }
}

export function planetOf(layout: SystemLayout, planetId: string): SystemPlanet | undefined {
  return layout.planets.find((p) => p.planetId === planetId)
}

/** Weltkamera, transform-origin 0 0: `k·P + t` legt den Planeten auf den Anker. */
export function cameraTransform(layout: SystemLayout, planetId: string): CameraTransform {
  const p = planetOf(layout, planetId)
  if (!p) return systemTransform()
  const a = anchor(layout)
  const k = fightZoom()
  return { tx: a.x - k * p.x, ty: a.y - k * p.y, k }
}

export function fightTransform(layout: SystemLayout, planetId: string): CameraTransform {
  return cameraTransform(layout, planetId)
}

export function systemTransform(): CameraTransform {
  return { tx: 0, ty: 0, k: 1 }
}

/** Kompatibler Alias für die gemeinsame Weltkamera. */
export function farTransform(layout: SystemLayout, planetId: string | null): CameraTransform {
  return planetId === null ? systemTransform() : cameraTransform(layout, planetId)
}

export function courseLine(
  layout: SystemLayout,
  fromId: string,
  toId: string,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const a = planetOf(layout, fromId)
  const b = planetOf(layout, toId)
  if (!a || !b) return null
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}

/** Auf die Schrittweite quantisiert: ein Resize rastert nicht neu. */
export function quantSpritePx(px: number): number {
  return Math.max(
    STAR_FIGHT_PLANET_PX_STEP,
    Math.ceil(px / STAR_FIGHT_PLANET_PX_STEP) * STAR_FIGHT_PLANET_PX_STEP,
  )
}

/** Rasterkante eines kleinen Planeten der Systemansicht (4× überzeichnet, im Kampf 16× skaliert). */
export function systemSpritePx(r: number): number {
  return quantSpritePx(2 * r * STAR_FIGHT_SYS_SPRITE_OVERSAMPLE)
}

/** Rasterkante des Hero-Planeten bei Bühnenhöhe h. */
export function heroSpritePx(h: number): number {
  return quantSpritePx((h * STAR_FIGHT_FIGHT_PLANET_D_PCT) / 100)
}

export function cameraCss(t: CameraTransform): string {
  return `translate(${t.tx.toFixed(2)}px, ${t.ty.toFixed(2)}px) scale(${t.k})`
}
