import { defineStore } from 'pinia'
import {
  PLAYER_MAX_HP_BASE,
  PLAYER_HP_REGEN_PER_SEC,
  PLAYER_HP_LOSS_ON_ENRAGE,
} from '@/config/constants'

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
      return this.hpPercent < 25
    },
  },

  actions: {
    regenTick() {
      this.currentHP = Math.min(this.maxHP, this.currentHP + PLAYER_HP_REGEN_PER_SEC)
    },
    takeDamage(amount: number = PLAYER_HP_LOSS_ON_ENRAGE) {
      this.currentHP = Math.max(0, this.currentHP - amount)
      this.damageFloats.push({
        id: this._nextFloatId++,
        value: amount,
        expiresAt: Date.now() + 1400,
      })
    },
    pruneFloats() {
      const now = Date.now()
      this.damageFloats = this.damageFloats.filter((f) => f.expiresAt > now)
    },
  },
})
