import { defineStore } from 'pinia'
import { AUGMENTS } from '../config/augments'
import type { TimedBuff } from '../types'

export const useAugmentStore = defineStore('augment', {
  state: () => ({
    clickCounter: 0,
    lastClickValues: [] as number[],
    activeTimedBuffs: [] as TimedBuff[],
    bigBangUsed: false,
    keyboardSmashModifiers: {} as Record<string, number>,
    gravityFlipActive: false,
    lastChosenAugmentId: null as string | null,
  }),

  getters: {
    temporaryCPSMultiplier(): number {
      const now = Date.now()
      return this.activeTimedBuffs
        .filter((b) => b.effectKey === 'cpsMultiplier' && b.expiresAt > now)
        .reduce((mul, b) => mul * b.multiplier, 1)
    },

    isGravityFlipActive(): boolean {
      return this.gravityFlipActive
    },
  },

  actions: {
    getActiveBattleModifiers(activeAugments: string[], activeModifier: Record<string, unknown>) {
      return {
        enemySpeedMultiplier: (activeModifier.enemySpeedMultiplier as number) ?? 1,
        enemyMaxHPDrainPerSecond: (activeModifier.enemyMaxHPDrainPerSecond as number) ?? 0,
        bigBangAvailable:
          !this.bigBangUsed && activeAugments.includes('legendary_big_bang'),
      }
    },

    onClick(baseClickValue: number, activeAugments: string[]): number {
      this.clickCounter++
      let bonus = 0

      // Store click value in ring buffer for Infinite Loop
      this.lastClickValues.push(baseClickValue)
      if (this.lastClickValues.length > 5) {
        this.lastClickValues.shift()
      }

      // Double Tap: every Nth click counts double
      if (activeAugments.includes('rare_double_tap')) {
        const aug = AUGMENTS.find((a) => a.id === 'rare_double_tap')
        const interval = aug?.specialEffect?.params.interval ?? 10
        if (this.clickCounter % interval === 0) {
          bonus += baseClickValue
        }
      }

      // Chain Reaction: chance for extra click
      if (activeAugments.includes('epic_chain_reaction')) {
        const aug = AUGMENTS.find((a) => a.id === 'epic_chain_reaction')
        const chance = aug?.specialEffect?.params.chance ?? 0.2
        if (Math.random() < chance) {
          bonus += baseClickValue
        }
      }

      // Infinite Loop: every Nth click replays last M clicks
      if (activeAugments.includes('legendary_infinite_loop')) {
        const aug = AUGMENTS.find((a) => a.id === 'legendary_infinite_loop')
        const interval = aug?.specialEffect?.params.interval ?? 50
        if (this.clickCounter % interval === 0) {
          bonus += this.lastClickValues.reduce((sum, v) => sum + v, 0)
        }
      }

      // Quantum Luck: chance to double or nullify bonus
      if (activeAugments.includes('legendary_quantum_luck') && bonus > 0) {
        const aug = AUGMENTS.find((a) => a.id === 'legendary_quantum_luck')
        const chance = aug?.specialEffect?.params.chance ?? 0.1
        if (Math.random() < chance) {
          bonus = Math.random() < 0.5 ? bonus * 2 : 0
        }
      }

      return bonus
    },

    onTick() {
      const now = Date.now()
      this.activeTimedBuffs = this.activeTimedBuffs.filter((b) => b.expiresAt > now)
    },

    onLevelUp(activeAugments: string[]) {
      // Overclock: temporary CPS boost after level-up
      if (activeAugments.includes('rare_overclock')) {
        const aug = AUGMENTS.find((a) => a.id === 'rare_overclock')
        const duration = aug?.specialEffect?.params.duration ?? 30000
        const multiplier = aug?.specialEffect?.params.multiplier ?? 2
        this.activeTimedBuffs.push({
          augmentId: 'rare_overclock',
          effectKey: 'cpsMultiplier',
          multiplier,
          expiresAt: Date.now() + duration,
        })
      }
    },

    consumeBigBang() {
      this.bigBangUsed = true
    },

    registerAugment(id: string, activeAugments?: string[]) {
      this.lastChosenAugmentId = id

      const aug = AUGMENTS.find((a) => a.id === id)
      if (!aug?.specialEffect) return

      // Keyboard Smash: roll random modifiers on registration
      if (aug.specialEffect.type === 'keyboardSmash') {
        const min = aug.specialEffect.params.min ?? -0.05
        const max = aug.specialEffect.params.max ?? 0.5
        const keys = ['cpsMultiplier', 'cpcMultiplier', 'meepPowerMultiplier']
        const mods: Record<string, number> = {}
        for (const key of keys) {
          mods[key] = 1 + (min + Math.random() * (max - min))
        }
        this.keyboardSmashModifiers = mods
      }

      // Gravity Flip: set visual flag briefly
      if (aug.specialEffect.type === 'gravityFlip') {
        this.gravityFlipActive = true
        setTimeout(() => {
          this.gravityFlipActive = false
        }, 3000)
      }

      // Echo Chamber: re-activate last augment's effects as timed buff
      if (aug.specialEffect.type === 'echoChamber' && activeAugments) {
        this.activateEchoChamber(aug.specialEffect.params.duration ?? 60000, activeAugments)
      }
    },

    activateEchoChamber(duration: number, activeAugments: string[]) {
      // Find the last chosen augment that has multiplier effects (not the echo chamber itself)
      const lastId = activeAugments
        .filter((id) => id !== 'epic_echo_chamber')
        .at(-1)
      if (!lastId) return

      const lastAug = AUGMENTS.find((a) => a.id === lastId)
      if (!lastAug) return

      const expiresAt = Date.now() + duration
      for (const [key, val] of Object.entries(lastAug.effects)) {
        if (typeof val === 'number') {
          this.activeTimedBuffs.push({
            augmentId: 'epic_echo_chamber',
            effectKey: key,
            multiplier: val,
            expiresAt,
          })
        }
      }
    },
  },
})
