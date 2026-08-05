import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import {
  ROLES,
  ROLE_TOP_SHIELD_REBUILD_MS,
  ROLE_MID_CURSE_INTERVAL_MS,
  ROLE_ADC_BURST_INTERVAL_MS,
  ROLE_SUPPORT_HEAL_INTERVAL_MS,
  JUNGLE_BUFF_COOLDOWN_MS,
} from '@/config/constants'
import type { ChampionRole } from '@/types'

/** Volle Cooldown-Dauer je Rolle — Bezugsgröße für den Fortschrittsring. */
const ABILITY_CD_TOTAL_MS: Record<ChampionRole, number> = {
  top: ROLE_TOP_SHIELD_REBUILD_MS,
  jungle: JUNGLE_BUFF_COOLDOWN_MS,
  mid: ROLE_MID_CURSE_INTERVAL_MS,
  adc: ROLE_ADC_BURST_INTERVAL_MS,
  support: ROLE_SUPPORT_HEAL_INTERVAL_MS,
}

export interface RoleAbilityState {
  role: string
  image: string
  short: string
  color: string
  hasChampion: boolean
  onCooldown: boolean
  timer: string
  isFlashing: boolean
  /** Bereits abgelaufener Anteil des Cooldowns (0 → 1); 1 = einsatzbereit. */
  progress: number
}

function fmtCd(ms: number): string {
  const s = Math.ceil(ms / 1000)
  if (s <= 0) return ''
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

/**
 * Per-role ability cooldown / flash state for the five champion roles —
 * drives the cooldown pill / ready dot on the command-panel portrait cards.
 */
export function useRoleAbilityStates() {
  const battleStore = useBattleStore()
  const roleBehaviorStore = useRoleBehaviorStore()

  const roleAbilities = computed<RoleAbilityState[]>(() =>
    ROLES.map((roleData, i) => {
      const role = roleData.key
      const hasChampion = battleStore.headerSlots[i] != null
      let cdMs = 0
      let isFlashing = false

      if (role === 'top') {
        cdMs = roleBehaviorStore.tankShieldBrokenMs
        isFlashing = roleBehaviorStore.tankShieldActive && cdMs <= 0
      } else if (role === 'jungle') {
        cdMs = roleBehaviorStore.jungleBuffCooldownMs
        isFlashing = roleBehaviorStore.jungleBuffFlashActive
      } else if (role === 'mid') {
        cdMs = roleBehaviorStore.midCurseCooldownMs
        isFlashing = roleBehaviorStore.midCurseFlashActive
      } else if (role === 'adc') {
        cdMs = roleBehaviorStore.adcBurstCooldownMs
        isFlashing = roleBehaviorStore.adcBurstActive
      } else {
        cdMs = roleBehaviorStore.supportHealCooldownMs
        isFlashing = roleBehaviorStore.supportPlanetHealActive
      }

      return {
        role,
        image: roleData.image,
        short: roleData.short,
        // Kanonische Rollen-Farbe (ROLES[].color) — orbit.color sind die
        // Neon-Varianten der Orbit-Bahnen und weichen z. T. stark ab (Support)
        color: roleData.color,
        hasChampion,
        onCooldown: cdMs > 0 && !isFlashing,
        timer: fmtCd(cdMs),
        isFlashing,
        progress: cdMs > 0 ? Math.min(1, Math.max(0, 1 - cdMs / ABILITY_CD_TOTAL_MS[role])) : 1,
      }
    }),
  )

  return { roleAbilities }
}
