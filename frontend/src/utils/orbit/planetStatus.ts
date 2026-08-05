// Anzeige-Helfer für Planeten-Zustände. Bewusst hier statt in den Komponenten:
// Rail-Kachel, Bühne und Command Panel müssen dieselbe Farbstufe und denselben
// Prozentwert zeigen, sonst driften die drei Anzeigen auseinander.
import { HP_COLOR_THRESHOLD_HIGH, HP_COLOR_THRESHOLD_LOW } from '@/config/constants'
import { PLANET_ROLES, planetLevelBonusMultiplier } from '@/stores/world/planetShopStore'
import type { PlanetRole, PlanetRoleType } from '@/stores/world/planetShopStore'

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
 */
export function planetBonusText(role: PlanetRole, level = 1): string {
  const v = role.bonusPerSlot * planetLevelBonusMultiplier(level)
  switch (role.bonusType) {
    case 'auto_attack_dps':
      return `+${formatBonusValue(v)} DPS/s on Boss`
    case 'material_harvest_rate':
      return `1 Material every 30s`
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
export function planetBonusTextFor(roleId: PlanetRoleType, level = 1): string {
  return planetBonusText(PLANET_ROLES[roleId], level)
}
