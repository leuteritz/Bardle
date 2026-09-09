// Anzeige-Helfer für Planeten-Zustände. Bewusst hier statt in den Komponenten:
// Rail-Kachel, Bühne und Command Panel müssen dieselbe Farbstufe und denselben
// Prozentwert zeigen, sonst driften die drei Anzeigen auseinander.
import {
  BOSS_DAMAGE_REDUCTION_CAP,
  HP_COLOR_THRESHOLD_HIGH,
  HP_COLOR_THRESHOLD_LOW,
  PLANET_LEVEL_HP_PCT,
  PLANET_MILESTONE_BONUS,
  PLANET_MILESTONE_INTERVAL,
  PLANET_ORBIT_SPEED_MAX_MULT,
  PLANET_RESPAWN_MS,
  PLANET_SLOT_CONFIG,
  PLANET_SLOT_MAX_HP,
  VOID_PLANET_RIDER,
} from '@/config/constants'
import {
  PLANET_ROLES,
  computePlanetMaxHp,
  harvestIntervalTicks,
  planetLevelBonusMultiplier,
  planetMilestoneCount,
  planetOrbitSpeedMultiplier,
  planetRankTier,
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

// ── Kennwerte eines Planeten — das Datenblatt der Bühne ────────────────────
// Bewusst hier und nicht in der Komponente: die Bühne zeigt sie heute, Rail und
// Command Panel könnten sie morgen zeigen — und müssten dann dieselben Zahlen
// nennen, sonst widersprechen sich zwei Anzeigen desselben Planeten.

export interface PlanetStatRow {
  key: string
  label: string
  value: string
  icon: string
  /** Kleiner Zusatz rechts vom Wert: Einheit, Laufrichtung, Deckel. */
  note?: string
  /** Wert nach dem nächsten Attunement — nur wo das Level etwas bewegt. */
  preview?: string
  /** Der Wert steht an seinem Deckel und geht nicht weiter. */
  atCap?: boolean
  /** Eigene Farbe statt der Rollenfarbe (Rangstufe). */
  tint?: string
  /** Füllstand 0 … 1 einer Mini-Leiste unter der Zeile. */
  bar?: number
  /** Bildpfad statt Iconify-Glyph (die Aegis-Rolle trägt ein PNG). */
  image?: string
}

export interface PlanetStatSection {
  key: string
  title: string
  rows: PlanetStatRow[]
}

function fmtSeconds(ms: number): string {
  const s = ms / 1000
  return s < 100 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`
}

function fmtPct(frac: number): string {
  return `${Math.round(frac * 100)}%`
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
  /** Derselbe Forge-Faktor, den `activeHarvestSlots` benutzt. */
  harvestForgeMult: number
}

/**
 * Die zwei Instrumententafeln der Bühne — links die Bahn, rechts der Ausbau.
 *
 * Jede Zeile trägt ihre Vorschau selbst: `preview` ist genau dort gesetzt, wo das
 * nächste Attunement den Wert bewegt. Zeilen ohne `preview` sind level-stabil, und
 * dass sie beim Hover stehen bleiben, ist die eigentliche Aussage.
 */
export function planetStatSections(input: PlanetStatInput): {
  left: PlanetStatSection[]
  right: PlanetStatSection[]
} {
  const { slot, orbitIndex, previewLevel, harvestForgeMult } = input
  const roleId = slot.role as PlanetRoleType
  const role = PLANET_ROLES[roleId]
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

  // ── Bahn ──────────────────────────────────────────────────────────────────
  const orbit: PlanetStatSection = {
    key: 'orbit',
    title: 'Orbit',
    rows: [
      {
        key: 'period',
        label: 'Period',
        icon: 'ph:spiral-fill',
        value: fmtSeconds(now.periodMs),
        note: 'per lap',
        preview: previewOf(fmtSeconds(now.periodMs), fmtSeconds(next.periodMs)),
        atCap: speedAtCap,
      },
      {
        key: 'eclipse',
        label: 'Eclipse',
        icon: 'game-icons:eclipse-flare',
        value: fmtSeconds(now.behindMs),
        note: 'per lap',
        preview: previewOf(fmtSeconds(now.behindMs), fmtSeconds(next.behindMs)),
        atCap: speedAtCap,
      },
      {
        key: 'in-reach',
        label: 'In Reach',
        icon: 'ph:eye-fill',
        value: fmtPct(now.inReachFrac),
        note: 'reachable',
      },
      {
        key: 'radius',
        label: 'Radius',
        icon: 'ph:path-fill',
        value: `${orbitRadiusAu(orbitIndex, slot.baseSpeed, slot.direction).toFixed(2)} AU`,
        note: slot.direction === 1 ? 'prograde' : 'retrograde',
      },
    ],
  }

  const rider = VOID_PLANET_RIDER[roleId]
  const voidSection: PlanetStatSection = {
    key: 'void',
    title: 'The Void',
    rows: [
      {
        key: 'void-toll',
        label: 'Void Toll',
        icon: 'ph:skull-fill',
        value: rider.damageMult === 0 ? 'None' : fmtMult(rider.damageMult),
        note: rider.damageMult === 0 ? `it ${rider.verb}s instead` : `on ${rider.verb}`,
      },
      {
        key: 'rebuild',
        label: 'Rebuild',
        icon: 'ph:hammer-fill',
        value: fmtSeconds(PLANET_RESPAWN_MS),
        note: 'once destroyed',
      },
    ],
  }

  // ── Ausbau ────────────────────────────────────────────────────────────────
  const rankNow = planetRankTier(level)
  const rankNext = planetRankTier(previewLevel)
  const bonusNow = planetLevelBonusMultiplier(level)
  const bonusNext = planetLevelBonusMultiplier(previewLevel)
  const nextMilestone = (planetMilestoneCount(level) + 1) * PLANET_MILESTONE_INTERVAL
  const hpNow = computePlanetMaxHp(level)
  const hpStep = Math.round(PLANET_SLOT_MAX_HP * PLANET_LEVEL_HP_PCT)

  const attunement: PlanetStatSection = {
    key: 'attunement',
    title: 'Attunement',
    rows: [
      {
        key: 'rank',
        label: 'Rank',
        icon: 'ph:medal-military-fill',
        value: rankNow.name,
        tint: rankNow.color,
        note: `level ${level}`,
        preview: previewOf(rankNow.name, rankNext.name),
      },
      {
        key: 'resonance',
        label: 'Resonance',
        icon: 'ph:sparkle-fill',
        value: fmtMult(bonusNow),
        note: 'on role bonus',
        preview: previewOf(fmtMult(bonusNow), fmtMult(bonusNext)),
      },
      {
        key: 'milestone',
        label: 'Milestone',
        icon: 'ph:flag-banner-fill',
        value: `${nextMilestone - level} lvl`,
        note: `to +${Math.round(PLANET_MILESTONE_BONUS * 100)}%`,
        bar: (level % PLANET_MILESTONE_INTERVAL) / PLANET_MILESTONE_INTERVAL,
      },
      {
        key: 'integrity',
        label: 'Integrity',
        icon: 'ph:shield-chevron-fill',
        value: `${hpNow} HP`,
        note: `+${hpStep} / lvl`,
        preview: previewOf(`${hpNow} HP`, `${computePlanetMaxHp(previewLevel)} HP`),
      },
    ],
  }

  // ── Rolle ─────────────────────────────────────────────────────────────────
  // Nur die Turrets kämpfen, und Kampf gibt es allein im Vordergrund. Für jede
  // andere Rolle ist die Eclipse reine Optik — genau das sagt diese Zeile, und
  // sie ist der Grund, warum "In Reach" nebenan überhaupt eine Zahl verdient.
  const gated = role.bonusType === 'auto_attack_dps'
  const contribution = (lvl: number): { value: string; note: string } => {
    const v = role.bonusPerSlot * planetLevelBonusMultiplier(lvl)
    switch (role.bonusType) {
      case 'auto_attack_dps':
        return { value: `${(v * now.inReachFrac).toFixed(1)} DPS`, note: 'lap average' }
      case 'material_harvest_rate': {
        const secs = harvestIntervalTicks(lvl, harvestForgeMult)
        return { value: `${(3600 / secs).toFixed(1)} / h`, note: `one every ${secs}s` }
      }
      case 'boss_damage_reduction':
        return {
          value: `−${Math.round(v * 100)}%`,
          note: `cap −${Math.round(BOSS_DAMAGE_REDUCTION_CAP * 100)}%`,
        }
      case 'expedition_reward_multiplier':
        return { value: `+${Math.round(v * 100)}%`, note: 'expedition payout' }
      case 'offline_boost':
        return { value: `+${Math.round(v * 100)}%`, note: 'offline yield' }
      case 'building_cps_multiplier':
        return { value: `+${Math.round(v * 100)}%`, note: 'building CPS' }
    }
  }
  const contribNow = contribution(level)
  const isImage = role.icon.startsWith('/')

  const calling: PlanetStatSection = {
    key: 'calling',
    title: 'Calling',
    rows: [
      {
        key: 'contribution',
        label: role.name,
        icon: isImage ? '' : role.icon,
        image: isImage ? role.icon : undefined,
        value: contribNow.value,
        note: contribNow.note,
        preview: previewOf(contribNow.value, contribution(previewLevel).value),
      },
      {
        key: 'orbit-gated',
        label: 'Gated',
        icon: gated ? 'ph:eye-fill' : 'ph:check-circle-fill',
        value: gated ? fmtPct(now.inReachFrac) : 'Always on',
        note: gated ? 'fires in front only' : 'eclipse is cosmetic',
      },
    ],
  }

  return { left: [orbit, voidSection], right: [attunement, calling] }
}
