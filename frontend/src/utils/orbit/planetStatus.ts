// Anzeige-Helfer für Planeten-Zustände. Bewusst hier statt in den Komponenten:
// Rail-Kachel, Bühne und Command Panel müssen dieselbe Farbstufe und denselben
// Prozentwert zeigen, sonst driften die drei Anzeigen auseinander.
import {
  HP_COLOR_THRESHOLD_HIGH,
  HP_COLOR_THRESHOLD_LOW,
  PLANET_MILESTONE_INTERVAL,
  PLANET_ORBIT_SPEED_MAX_MULT,
  PLANET_SLOT_CONFIG,
} from '@/config/constants'
import {
  PLANET_ROLES,
  harvestIntervalTicks,
  planetLevelBonusMultiplier,
  planetMilestoneCount,
  planetOrbitSpeedMultiplier,
} from '@/stores/world/planetShopStore'
import type { PlanetRole, PlanetRoleType, PlanetSlot } from '@/stores/world/planetShopStore'
import { orbitTierForSlotIndex, planetOrbitTiming } from '@/utils/orbit/planetOrbitPhase'

export type HpTier = 'high' | 'mid' | 'low'

/**
 * Farbstufe der HP-Leiste. Nutzt die spielweiten HP-Schwellen, damit die
 * Grün → Gold → Rot-Sprache überall dieselbe ist.
 */
export function hpTier(current: number, max: number): HpTier {
  const frac = max > 0 ? current / max : 1
  if (frac > HP_COLOR_THRESHOLD_HIGH) return 'high'
  if (frac > HP_COLOR_THRESHOLD_LOW) return 'mid'
  return 'low'
}

/** HP in Prozent (0 … 100); ohne Max-HP gilt der Planet als unversehrt. */
export function hpPercentOf(current: number, max: number): number {
  if (max === 0) return 100
  return Math.max(0, Math.min(100, (current / max) * 100))
}

/** Rohen Bonuswert formatieren: Ganzzahlen bleiben clean, sonst eine Nachkommastelle. */
function formatBonusValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * Wirkungstext einer Planeten-Rolle auf einem bestimmten Level. Das Rollen-Grid
 * zeigt den Basiswert (Level 1), die Bühne den Ist-Wert des Slots.
 *
 * `harvestForgeMult` muss derselbe Faktor sein, den `activeHarvestSlots` benutzt —
 * sonst nennt die Bühne einen anderen Takt, als der Tick liefert.
 */
export function planetBonusText(role: PlanetRole, level = 1, harvestForgeMult = 1): string {
  const v = role.bonusPerSlot * planetLevelBonusMultiplier(level)
  switch (role.bonusType) {
    case 'auto_attack_dps':
      return `+${formatBonusValue(v)} DPS/s on Boss`
    case 'material_harvest_rate':
      return `1 Material every ${harvestIntervalTicks(level, harvestForgeMult)}s`
    case 'expedition_reward_multiplier':
      return `+${Math.round(v * 100)}% Exp. Reward`
    case 'boss_damage_reduction':
      return `-${Math.round(v * 100)}% Boss Damage`
    case 'offline_boost':
      return `+${Math.round(v * 100)}% Offline Yield`
    case 'building_cps_multiplier':
      return `+${Math.round(v * 100)}% Building CPS`
  }
}

/** Wirkungstext für eine Rollen-ID — Kurzform für die Bühne. */
export function planetBonusTextFor(
  roleId: PlanetRoleType,
  level = 1,
  harvestForgeMult = 1,
): string {
  return planetBonusText(PLANET_ROLES[roleId], level, harvestForgeMult)
}

// ── Die sechs Kennwerte eines Planeten ─────────────────────────────────────
// Bewusst hier und nicht in der Komponente: die Bühne zeigt sie heute, Rail und
// Command Panel könnten sie morgen zeigen — und müssten dann dieselben Zahlen
// nennen, sonst widersprechen sich zwei Anzeigen desselben Planeten.
//
// Ausschliesslich Zahlen. Textwerte (Rangname, Void-Verb) und alles, was der
// Readout darüber schon zeigt (max HP, Rollenbonus), gehören nicht hierher —
// eine Kachel trägt einen Messwert, sonst ist sie keine.

export interface PlanetStatRow {
  key: string
  label: string
  /** Der Zahlwert allein — die Einheit steht getrennt in `suffix`. */
  value: string
  /** Einheit, klein gesetzt: 's', '%', 'AU', 'lv'. Kurz halten — bei drei Zeichen
   *  verschmilzt MedievalSharp sie in diesem Grad zu einem Klumpen. */
  suffix?: string
  /** Wert nach dem nächsten Attunement — nur wo das Level etwas bewegt. */
  preview?: string
  /** Der Wert steht an seinem Deckel und geht nicht weiter. */
  atCap?: boolean
  /** Füllstand 0 … 1 einer Leiste am Kachelboden. */
  bar?: number
}

function fmtSeconds(ms: number): string {
  const s = ms / 1000
  return s < 100 ? s.toFixed(1) : String(Math.round(s))
}

function fmtMult(v: number): string {
  return `×${v.toFixed(v < 10 ? 2 : 1)}`
}

/** Nur setzen, wo sich der Wert wirklich bewegt — sonst flackert die Vorschau grundlos. */
function previewOf(now: string, next: string): string | undefined {
  return now === next ? undefined : next
}

/**
 * Bahnradius nach dem dritten Keplerschen Gesetz (a ∝ T^⅔), Slot 1 als 1 AU.
 *
 * Bewusst aus der BASIS-Periode: ein Attunement zieht die Bahn an, es zieht den
 * Planeten aber nicht nach innen. `PLANET_SLOT_ORBITS.rx` taugt als Quelle nicht —
 * es liegt im State, wird aber seit dem Wechsel auf `ORBIT_TIERS` nicht mehr
 * gerendert.
 */
function orbitRadiusAu(orbitIndex: number, baseSpeed: number, direction: 1 | -1): number {
  const tier = orbitTierForSlotIndex(orbitIndex)
  const own = planetOrbitTiming(baseSpeed, 1, direction, tier.ratio, tier.tiltRad).periodMs
  const ref = orbitTierForSlotIndex(0)
  const refMs = planetOrbitTiming(
    PLANET_SLOT_CONFIG[0].baseSpeed,
    1,
    PLANET_SLOT_CONFIG[0].direction,
    ref.ratio,
    ref.tiltRad,
  ).periodMs
  return refMs > 0 ? (own / refMs) ** (2 / 3) : 1
}

export interface PlanetStatInput {
  slot: PlanetSlot
  /** Rang des Slots in der Bahnreihenfolge (`orbitOrderedSlots`) — bestimmt das Tier. */
  orbitIndex: number
  /** Level, das die Vorschau zeigen soll (= Ist-Level, wenn keine Vorschau läuft). */
  previewLevel: number
}

/**
 * Die Instrumentenreihe unter dem HP-Balken — sechs Zahlen, feste Reihenfolge.
 *
 * Jede Zeile trägt ihre Vorschau selbst: `preview` ist genau dort gesetzt, wo das
 * nächste Attunement den Wert bewegt. Zeilen ohne `preview` (In Reach, Radius) sind
 * level-stabil, und dass sie beim Hover stehen bleiben, ist die eigentliche Aussage.
 */
export function planetStatRows(input: PlanetStatInput): PlanetStatRow[] {
  const { slot, orbitIndex, previewLevel } = input
  const level = slot.level
  const tier = orbitTierForSlotIndex(orbitIndex)

  const now = planetOrbitTiming(
    slot.baseSpeed,
    planetOrbitSpeedMultiplier(level),
    slot.direction,
    tier.ratio,
    tier.tiltRad,
  )
  const next = planetOrbitTiming(
    slot.baseSpeed,
    planetOrbitSpeedMultiplier(previewLevel),
    slot.direction,
    tier.ratio,
    tier.tiltRad,
  )
  const speedAtCap = planetOrbitSpeedMultiplier(level) >= PLANET_ORBIT_SPEED_MAX_MULT

  const bonusNow = planetLevelBonusMultiplier(level)
  const milestoneLeft = (planetMilestoneCount(level) + 1) * PLANET_MILESTONE_INTERVAL - level
  const milestoneNext =
    (planetMilestoneCount(previewLevel) + 1) * PLANET_MILESTONE_INTERVAL - previewLevel

  return [
    {
      key: 'period',
      label: 'Period',
      value: fmtSeconds(now.periodMs),
      suffix: 's',
      preview: previewOf(fmtSeconds(now.periodMs), fmtSeconds(next.periodMs)),
      atCap: speedAtCap,
    },
    {
      key: 'eclipse',
      label: 'Eclipse',
      value: fmtSeconds(now.behindMs),
      suffix: 's',
      preview: previewOf(fmtSeconds(now.behindMs), fmtSeconds(next.behindMs)),
      atCap: speedAtCap,
    },
    {
      key: 'in-reach',
      label: 'In Reach',
      value: String(Math.round(now.inReachFrac * 100)),
      suffix: '%',
    },
    {
      key: 'resonance',
      label: 'Resonance',
      value: fmtMult(bonusNow),
      preview: previewOf(fmtMult(bonusNow), fmtMult(planetLevelBonusMultiplier(previewLevel))),
    },
    {
      key: 'milestone',
      label: 'Milestone',
      value: String(milestoneLeft),
      suffix: 'lv',
      preview: previewOf(String(milestoneLeft), String(milestoneNext)),
      bar: (level % PLANET_MILESTONE_INTERVAL) / PLANET_MILESTONE_INTERVAL,
    },
    {
      key: 'radius',
      label: 'Radius',
      value: orbitRadiusAu(orbitIndex, slot.baseSpeed, slot.direction).toFixed(2),
      suffix: 'AU',
    },
  ]
}
