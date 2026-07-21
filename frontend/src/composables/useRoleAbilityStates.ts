import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { ROLES } from '@/config/constants'

export interface RoleAbilityState {
  role: string
  image: string
  short: string
  color: string
  hasChampion: boolean
  onCooldown: boolean
  timer: string
  isFlashing: boolean
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
      }
    }),
  )

  return { roleAbilities }
}
