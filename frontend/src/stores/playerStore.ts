import { defineStore } from 'pinia'
import {
  PLAYER_MAX_HP_BASE,
  PLAYER_HP_REGEN_PER_SEC,
  PLAYER_HP_LOSS_ON_ENRAGE,
  PLAYER_LOW_HP_THRESHOLD_PCT,
  DAMAGE_FLOAT_DURATION_MS,
} from '@/config/constants'
import { useStarForgeStore } from './starForgeStore'
import { useMeepTreeStore } from './meepTreeStore'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentHP: PLAYER_MAX_HP_BASE as number,
    maxHP: PLAYER_MAX_HP_BASE as number,
    damageFloats: [] as { id: number; value: number; expiresAt: number }[],
    _nextFloatId: 0,
  }),

  getters: {
    hpPercent(): number {
      return (this.currentHP / this.maxHP) * 100
    },
    isLow(): boolean {
      return this.hpPercent < PLAYER_LOW_HP_THRESHOLD_PCT
    },
  },

  actions: {
    regenTick() {
      // Base regen + Regeneration branch / Eternal Cadence (Star Forge)
      const forgeRegen = useStarForgeStore().hpRegenPerSec
      const treeRegen = useMeepTreeStore().fx.hpRegenPerSec
      this.currentHP = Math.min(
        this.maxHP,
        this.currentHP + PLAYER_HP_REGEN_PER_SEC + forgeRegen + treeRegen,
      )
    },
    takeDamage(amount: number = PLAYER_HP_LOSS_ON_ENRAGE) {
      // Aegis branch / Bulwark Choir (Star Forge): reduce incoming damage
      const reduced = Math.max(
        1,
        Math.round(
          amount * useStarForgeStore().damageTakenMult * useMeepTreeStore().fx.damageTakenMult,
        ),
      )
      this.currentHP = Math.max(0, this.currentHP - reduced)
      this.damageFloats.push({
        id: this._nextFloatId++,
        value: reduced,
        expiresAt: Date.now() + DAMAGE_FLOAT_DURATION_MS,
      })
    },
    pruneFloats() {
      const now = Date.now()
      this.damageFloats = this.damageFloats.filter((f) => f.expiresAt > now)
    },
  },
})
