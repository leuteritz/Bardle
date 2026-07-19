import { defineStore } from 'pinia'
import {
  ROLES,
  ROLE_SUPPORT_HEAL_INTERVAL_MS,
  ROLE_SUPPORT_HEAL_AMOUNT,
  ROLE_TOP_SHIELD_REBUILD_MS,
  ROLE_MID_CURSE_INTERVAL_MS,
  ROLE_MID_CURSE_DURATION_MS,
  ROLE_MID_CURSE_RANGE,
  ROLE_MID_CURSE_CAST_MS,
  ROLE_MID_CURSE_DOT_DPS,
  ROLE_MID_CURSE_DAMNATION_FRAC,
  ROLE_ADC_BURST_DAMAGE,
  ROLE_ADC_BURST_INTERVAL_MS,
  ROLE_STAR_ATTACKS,
  CHAMPION_BASE_HP_BY_ROLE,
  CHAMPION_HP_PER_STAR,
  BOSS_CHAMPION_ATTACK_DPS,
  BOSS_GALAXY_CHAMPION_DPS_MULT,
  CHAMPION_REVIVE_MS,
  CHAMPION_HP_REGEN_FRAC,
  SUPPORT_HEAL_RANGE,
  SUPPORT_PLANET_HEAL_AMOUNT,
  SUPPORT_PLANET_HEAL_INTERVAL_MS,
  SUPPORT_MAX_HEAL_TARGETS,
  JUNGLE_BUFF_RANGE,
  JUNGLE_BUFF_COOLDOWN_MS,
  GAME_TICK_INTERVAL_MS,
  HEAL_FLOAT_DURATION_MS,
  HEAL_FLOAT_Y_OFFSET,
  HEAL_FLOAT_X_SPREAD,
  HEAL_FLOAT_PLAYER_Y_OFFSET,
  INTERCEPT_SHIELD_ANIM_MS,
  JUNGLE_BUFF_FLASH_ANIM_MS,
} from '../config/constants'
import { getOrbitingRoles } from '../utils/getOrbitingRoles'
import { getChampionStarLevel } from '../config/championTiers'
import { usePlayerStore } from './playerStore'
import { useBattleStore } from './battleStore'
import { usePlanetBossStore } from './planetBossStore'
import { useCombatStore } from './combatStore'
import { usePlanetShopStore, PLANET_ROLES, JUNGLE_BUFF_DEFS, type PlanetSlot } from './planetShopStore'
import { useStarGroupStore } from './starGroupStore'
import { activePlanetPositions } from '../utils/activePlanetPositions'
import { activePlayerPlanetPositions } from '../utils/activePlayerPlanetPositions'
import { activeMidCurse } from '../utils/activeMidCurse'
import type { ChampionRole, MidCurseType, ActiveCurse } from '../types'
import { useEventLog } from '@/composables/useEventLog'
import { useRenderingPaused } from '@/composables/useRenderingPaused'

export const CURSE_DEFS: Record<MidCurseType, { name: string; icon: string; effect: string }> = {
  corruption: { name: 'Corruption',  icon: 'game-icons:skull-crossed-bones', effect: '8 damage/sec.' },
  weakness:   { name: 'Weakness',    icon: 'game-icons:sword-wound',         effect: 'Enemy attack −60%' },
  banishment: { name: 'Hexblight',   icon: 'game-icons:death-zone',          effect: 'Player damage ×1.8' },
  glaciation: { name: 'Petrify',     icon: 'game-icons:ice-bolt',            effect: 'Enemy attack 3× slower' },
  damnation:  { name: 'Damnation',   icon: 'game-icons:death-skull',         effect: 'Instant 20% MaxHP damage' },
}

const CURSE_TYPES = Object.keys(CURSE_DEFS) as MidCurseType[]

let _floatId = 900_000
const _throttleMap = new Map<string, number>()

function throttledEvent(key: string, intervalMs: number, fn: () => void) {
  const now = Date.now()
  const last = _throttleMap.get(key) ?? 0

  if (now - last >= intervalMs) {
    _throttleMap.set(key, now)
    fn()
  }
}

function spawnFloat(
  value: number,
  x: number,
  y: number,
  durationMs: number,
  extra: Record<string, boolean> = {},
) {
  const combatStore = useCombatStore()
  combatStore.damageFloats.push({
    id: _floatId++,
    value,
    x,
    y,
    expiresAt: Date.now() + durationMs,
    ...extra,
  } as (typeof combatStore.damageFloats)[number])
}

function formatSlotId(id: string): string {
  return id.replace('slot_', 'Slot ')
}

function getPlanetLabel(slot: PlanetSlot): string {
  if (slot.role && PLANET_ROLES[slot.role]) {
    return `${PLANET_ROLES[slot.role].name} (${formatSlotId(slot.id)})`
  }

  return formatSlotId(slot.id)
}

function getChampionNameByRole(role: ChampionRole): string {
  const battleStore = useBattleStore()
  const idx = ROLES.findIndex((r) => r.key === role)
  return (idx >= 0 ? battleStore.headerSlots[idx] : null) ?? role.toUpperCase()
}

export const useRoleBehaviorStore = defineStore('roleBehavior', {
  state: () => ({
    supportHealCooldownMs: ROLE_SUPPORT_HEAL_INTERVAL_MS,
    supportPlanetHealActive: false,
    supportPlanetHealCooldownMs: 0,

    tankShieldActive: false,
    tankShieldBrokenMs: 0,

    tankInterceptActive: false,
    tankInterceptStartMs: 0,
    tankInterceptDirX: 0,
    tankInterceptDirY: 0,

    midCurseCooldownMs: ROLE_MID_CURSE_INTERVAL_MS,
    midCurseFlashActive: false,
    activeCurse: null as ActiveCurse | null,
    cursedStarId: null as string | null,

    adcBurstCooldownMs: ROLE_ADC_BURST_INTERVAL_MS,
    adcBurstActive: false,

    jungleBuffCooldownMs: 0,
    jungleBuffFlashActive: false,

    // Star attacks: every orbiting role strikes the active boss on its own CD
    roleAttackCooldownMs: Object.fromEntries(
      Object.entries(ROLE_STAR_ATTACKS).map(([role, def]) => [role, def.intervalMs]),
    ) as Record<ChampionRole, number>,
    // Monotonic shot counters — the Star Fight Modal watches these to fire projectiles
    roleAttackShots: { top: 0, jungle: 0, mid: 0, adc: 0, support: 0 } as Record<
      ChampionRole,
      number
    >,

    // Champion HP per role — max scales with the slotted champion's star level
    championHp: {
      top: { current: 0, max: 0 },
      jungle: { current: 0, max: 0 },
      mid: { current: 0, max: 0 },
      adc: { current: 0, max: 0 },
      support: { current: 0, max: 0 },
    } as Record<ChampionRole, { current: number; max: number }>,
    // Which champion the HP pool belongs to — swap in slot resets the pool
    championHpOwner: { top: null, jungle: null, mid: null, adc: null, support: null } as Record<
      ChampionRole,
      string | null
    >,
    // Timestamp until which a downed champion stays out of the fight (0 = alive)
    championDownUntil: { top: 0, jungle: 0, mid: 0, adc: 0, support: 0 } as Record<
      ChampionRole,
      number
    >,
    // Last boss-hit timestamp per role — drives hit-flash animations in the UI
    championHitAt: { top: 0, jungle: 0, mid: 0, adc: 0, support: 0 } as Record<
      ChampionRole,
      number
    >,
  }),

  actions: {
    tick() {
      const { isRenderingPaused } = useRenderingPaused()
      if (isRenderingPaused.value) return

      const TICK_MS = GAME_TICK_INTERVAL_MS
      const roles = getOrbitingRoles()

      this._syncChampionHp()
      this._expireJungleBuffs()
      this._tickBossAttack(roles, TICK_MS)
      this._tickSupport(roles, TICK_MS)
      this._tickTop(roles, TICK_MS)
      this._tickMid(roles, TICK_MS)
      this._tickAdc(roles, TICK_MS)
      this._tickJungler(roles, TICK_MS)
      this._tickRoleAttacks(roles, TICK_MS)
    },

    /** Keep the per-role HP pool in sync with the slotted champion — max HP
     *  scales with the champion's star level; a swap resets the pool. */
    _syncChampionHp() {
      const battleStore = useBattleStore()
      for (let i = 0; i < ROLES.length; i++) {
        const role = ROLES[i].key
        const name = battleStore.headerSlots[i]
        if (name === this.championHpOwner[role]) continue
        this.championHpOwner[role] = name
        this.championDownUntil[role] = 0
        if (!name) {
          this.championHp[role] = { current: 0, max: 0 }
          continue
        }
        const star = getChampionStarLevel(name)
        const max = Math.round(
          CHAMPION_BASE_HP_BY_ROLE[role] * (1 + (star - 1) * CHAMPION_HP_PER_STAR),
        )
        this.championHp[role] = { current: max, max }
      }
    },

    /** The active boss strikes back: dmg/s on every orbiting champion. Downed
     *  champions revive at full HP after CHAMPION_REVIVE_MS; without an active
     *  boss the squad slowly regenerates. */
    _tickBossAttack(roles: Set<string>, tickMs: number) {
      const bossStore = usePlanetBossStore()
      const activeBoss = bossStore.activeBoss
      const bossAlive = !!activeBoss && !activeBoss.defeated && !activeBoss.expired
      const combatStore = useCombatStore()
      const { addEvent } = useEventLog()
      const now = Date.now()

      for (const role of Object.keys(this.championHp) as ChampionRole[]) {
        if (!roles.has(role)) continue
        const hp = this.championHp[role]
        if (hp.max <= 0) continue

        // Revive-Fenster
        if (this.championDownUntil[role] > 0) {
          if (now >= this.championDownUntil[role]) {
            this.championDownUntil[role] = 0
            hp.current = hp.max
            addEvent(`${getChampionNameByRole(role)} is back in the fight!`, role)
          }
          continue
        }

        if (!bossAlive) {
          // Out of combat: langsam regenerieren
          if (hp.current < hp.max) {
            hp.current = Math.min(hp.max, hp.current + hp.max * CHAMPION_HP_REGEN_FRAC * (tickMs / 1000))
          }
          continue
        }

        const dps =
          BOSS_CHAMPION_ATTACK_DPS * (activeBoss.isGalaxyBoss ? BOSS_GALAXY_CHAMPION_DPS_MULT : 1)
        const dmg = Math.round(dps * (tickMs / 1000))
        hp.current = Math.max(0, hp.current - dmg)
        this.championHitAt[role] = now

        const champName = getChampionNameByRole(role)
        const champ = combatStore.champions.find((c) => c.name === champName)
        if (champ && (champ.screenX !== 0 || champ.screenY !== 0)) {
          spawnFloat(dmg, champ.screenX + (Math.random() - 0.5) * 24, champ.screenY - 34, 900)
        }

        if (hp.current <= 0) {
          this.championDownUntil[role] = now + CHAMPION_REVIVE_MS
          addEvent(
            `${champName} is knocked out by ${activeBoss.bossName}! (${CHAMPION_REVIVE_MS / 1000}s)`,
            role,
          )
        } else {
          throttledEvent(`boss-champ-hit-${role}`, 8000, () => {
            addEvent(`${activeBoss.bossName} strikes ${champName}: ${dmg} dmg/s.`, role)
          })
        }
      }
    },

    /** Every orbiting role fires a star attack at the active boss on its own
     *  cooldown — on top of its normal role ability. */
    _tickRoleAttacks(roles: Set<string>, tickMs: number) {
      const bossStore = usePlanetBossStore()
      const activeBoss = bossStore.activeBoss
      const { addEvent } = useEventLog()

      for (const role of Object.keys(ROLE_STAR_ATTACKS) as ChampionRole[]) {
        const def = ROLE_STAR_ATTACKS[role]

        if (!roles.has(role)) {
          this.roleAttackCooldownMs[role] = def.intervalMs
          continue
        }

        // Am Boden liegende Champions greifen nicht an — Cooldown friert ein
        if (this.championDownUntil[role] > Date.now()) continue

        this.roleAttackCooldownMs[role] = Math.max(0, this.roleAttackCooldownMs[role] - tickMs)
        if (this.roleAttackCooldownMs[role] > 0) continue
        this.roleAttackCooldownMs[role] = def.intervalMs

        if (!activeBoss || activeBoss.defeated || activeBoss.expired) continue

        const defeated = bossStore.dealDamage(def.damage)
        this.roleAttackShots[role]++

        throttledEvent(`role-attack-${role}`, 4000, () => {
          addEvent(`${getChampionNameByRole(role)} strikes the boss: ${def.damage} dmg.`, role)
        })

        if (!defeated) {
          const pos = activePlanetPositions.get(activeBoss.planetId)
          if (pos) {
            spawnFloat(def.damage, pos.cx + (Math.random() - 0.5) * 36, pos.cy - 48, 1100)
          }
        }
      }
    },

    _expireJungleBuffs() {
      const planetShopStore = usePlanetShopStore()
      const { addEvent } = useEventLog()
      const now = Date.now()
      for (const slot of planetShopStore.purchasedSlots) {
        if (slot.jungleBuff?.active && slot.jungleBuff.activeUntil <= now) {
          const label = getPlanetLabel(slot)
          const buffType = slot.jungleBuff.buffType
          planetShopStore.clearJungleBuff(slot.id)
          throttledEvent(`jungle-buff-expire-${slot.id}`, 500, () => {
            addEvent(`${buffType} expired on ${label}.`, 'jungle')
          })
        }
      }
    },

    _tickSupport(roles: Set<string>, tickMs: number) {
      this.supportPlanetHealActive = false
      if (!roles.has('support')) return

      this.supportHealCooldownMs -= tickMs
      this.supportPlanetHealCooldownMs -= tickMs

      const combatStore = useCombatStore()
      const battleStore = useBattleStore()
      const supportName = battleStore.headerSlots[4]
      if (!supportName) return
      const supportChampion = combatStore.champions.find((c) => c.name === supportName)

      if (!supportChampion || (supportChampion.screenX === 0 && supportChampion.screenY === 0)) {
        return
      }

      if (this.supportHealCooldownMs <= 0) {
        this.supportHealCooldownMs = ROLE_SUPPORT_HEAL_INTERVAL_MS
      }

      if (this.supportPlanetHealCooldownMs > 0) return
      this.supportPlanetHealCooldownMs = SUPPORT_PLANET_HEAL_INTERVAL_MS

      const planetShopStore = usePlanetShopStore()
      const { addEvent } = useEventLog()

      const damagedCandidates = planetShopStore.purchasedSlots
        .map((slot) => {
          const pos = activePlayerPlanetPositions.get(slot.id)
          if (!pos) return null
          return { slot, pos }
        })
        .filter((entry) => entry !== null)

      const healablePlanets = damagedCandidates
        .filter((entry) => entry.slot.currentHp < entry.slot.maxHp)
        .map((entry) => {
          const dist = Math.hypot(
            supportChampion.screenX - entry.pos.cx,
            supportChampion.screenY - entry.pos.cy,
          )

          return { slot: entry.slot, pos: entry.pos, dist }
        })
        .filter(({ dist }) => dist <= SUPPORT_HEAL_RANGE)

      healablePlanets.sort((a, b) => a.dist - b.dist)

      if (healablePlanets.length > 0) {
        const targets = healablePlanets.slice(0, SUPPORT_MAX_HEAL_TARGETS)

        for (const { slot, pos } of targets) {
          const healAmount = Math.min(SUPPORT_PLANET_HEAL_AMOUNT, slot.maxHp - slot.currentHp)
          if (healAmount <= 0) continue

          planetShopStore.healSlot(slot.id, healAmount)
          spawnFloat(healAmount, pos.cx, pos.cy - HEAL_FLOAT_Y_OFFSET, HEAL_FLOAT_DURATION_MS, { healFloat: true })

          throttledEvent(`support-heal-${slot.id}`, 4000, () => {
            addEvent(
              `${supportChampion.name} heals ${getPlanetLabel(slot)} +${Math.round(healAmount)} HP.`,
              'support',
            )
          })
        }

        this.supportPlanetHealActive = targets.length > 0
        return
      }

      const playerStore = usePlayerStore()
      if (playerStore.currentHP < playerStore.maxHP) {
        const healed = Math.min(ROLE_SUPPORT_HEAL_AMOUNT, playerStore.maxHP - playerStore.currentHP)
        playerStore.currentHP += healed

        spawnFloat(
          healed,
          window.innerWidth / 2 + (Math.random() - 0.5) * HEAL_FLOAT_X_SPREAD,
          window.innerHeight / 2 - HEAL_FLOAT_PLAYER_Y_OFFSET,
          HEAL_FLOAT_DURATION_MS,
          { healFloat: true },
        )

        throttledEvent('support-heal-player', 5000, () => {
          addEvent(`${supportChampion.name} heals Bard +${Math.round(healed)} HP.`, 'support')
        })
      }
    },

    _tickTop(roles: Set<string>, tickMs: number) {
      if (!roles.has('top')) {
        this.tankShieldActive = false
        this.tankShieldBrokenMs = 0
        return
      }

      if (this.tankShieldBrokenMs > 0) {
        this.tankShieldBrokenMs = Math.max(0, this.tankShieldBrokenMs - tickMs)
        if (this.tankShieldBrokenMs === 0) {
          this.tankShieldActive = true
          const { addEvent } = useEventLog()
          const championName = getChampionNameByRole('top')
          addEvent(`${championName}'s shield is restored.`, 'top')
        }
        return
      }

      this.tankShieldActive = true
    },

    _tickMid(roles: Set<string>, tickMs: number) {
      if (!roles.has('mid')) {
        this.activeCurse = null
        this.cursedStarId = null
        activeMidCurse.type = null
        activeMidCurse.activeUntil = 0
        return
      }

      const bossStore = usePlanetBossStore()
      const activeBoss = bossStore.activeBoss
      const { addEvent } = useEventLog()
      const championName = getChampionNameByRole('mid')
      const now = Date.now()

      // ── Curse expiry ────────────────────────────────────────────────────────
      if (this.activeCurse && now >= this.activeCurse.activeUntil) {
        const expiredName = CURSE_DEFS[this.activeCurse.type].name
        throttledEvent('mid-curse-expire', 500, () => {
          addEvent(`${expiredName} has worn off.`, 'mid')
        })
        this.activeCurse = null
        this.cursedStarId = null
        activeMidCurse.type = null
        activeMidCurse.activeUntil = 0
      }

      // ── Active Curse: Verderbnis DoT ────────────────────────────────────────
      if (this.activeCurse?.type === 'corruption' && activeBoss && !activeBoss.defeated && !activeBoss.expired) {
        const defeated = bossStore.dealDamage(ROLE_MID_CURSE_DOT_DPS)
        throttledEvent(`mid-curse-dot-${activeBoss.planetId}`, 3000, () => {
          addEvent(`${championName} Corruption: ${ROLE_MID_CURSE_DOT_DPS} dmg.`, 'mid')
        })
        if (!defeated) {
          const pos = activePlanetPositions.get(activeBoss.planetId)
          if (pos) {
            spawnFloat(ROLE_MID_CURSE_DOT_DPS, pos.cx + (Math.random() - 0.5) * 40, pos.cy - 50, 1000, {
              curseFloat: true,
            })
          }
        }
      }

      // ── Fluch (curse cast) ─────────────────────────────────────────────────
      if (this.midCurseCooldownMs > 0) {
        this.midCurseCooldownMs = Math.max(0, this.midCurseCooldownMs - tickMs)
        return
      }

      // Cooldown abgelaufen — prüfe ob Boss existiert und in Reichweite
      if (!activeBoss || activeBoss.defeated || activeBoss.expired) return

      const combatStore = useCombatStore()
      const midName = getChampionNameByRole('mid')
      const midChamp = combatStore.champions.find((c) => c.name === midName)
      if (!midChamp || (midChamp.screenX === 0 && midChamp.screenY === 0)) return

      const bossPos = activePlanetPositions.get(activeBoss.planetId)
      if (!bossPos) return

      const dist = Math.hypot(midChamp.screenX - bossPos.cx, midChamp.screenY - bossPos.cy)
      if (dist > ROLE_MID_CURSE_RANGE) return

      // Fluch wirken
      const type = CURSE_TYPES[Math.floor(Math.random() * CURSE_TYPES.length)]
      const curse: ActiveCurse = { type, activeUntil: now + ROLE_MID_CURSE_DURATION_MS }
      this.activeCurse = curse
      const starGroupStore = useStarGroupStore()
      this.cursedStarId =
        starGroupStore.activeStars.find((s) =>
          s.planetSlots.some((p) => p.planetId === activeBoss.planetId),
        )?.id ?? null
      activeMidCurse.type = type
      activeMidCurse.activeUntil = curse.activeUntil

      this.midCurseFlashActive = true
      window.setTimeout(() => { this.midCurseFlashActive = false }, ROLE_MID_CURSE_CAST_MS)
      this.midCurseCooldownMs = ROLE_MID_CURSE_INTERVAL_MS

      if (type === 'damnation') {
        const dmg = Math.floor(activeBoss.maxHP * ROLE_MID_CURSE_DAMNATION_FRAC)
        bossStore.dealDamage(dmg)
        const pos2 = activePlanetPositions.get(activeBoss.planetId)
        if (pos2) {
          spawnFloat(dmg, pos2.cx, pos2.cy - 65, 1500, { curseFloat: true })
        }
        addEvent(`${championName} casts Damnation: −${dmg} HP (20%)!`, 'mid')
      } else {
        addEvent(`${championName} curses the boss with ${CURSE_DEFS[type].name}! (10s)`, 'mid')
      }
    },

    _tickAdc(roles: Set<string>, tickMs: number) {
      if (!roles.has('adc')) return

      this.adcBurstCooldownMs -= tickMs

      if (this.adcBurstCooldownMs <= 0) {
        this.adcBurstCooldownMs = ROLE_ADC_BURST_INTERVAL_MS
        this.adcBurstActive = true
        window.setTimeout(() => { this.adcBurstActive = false }, 350)

        const bossStore = usePlanetBossStore()
        const activeBoss = bossStore.activeBoss
        const { addEvent } = useEventLog()
        const championName = getChampionNameByRole('adc')

        if (activeBoss && !activeBoss.defeated && !activeBoss.expired) {
          const defeated = bossStore.dealDamage(ROLE_ADC_BURST_DAMAGE)

          throttledEvent(`adc-burst-${activeBoss.planetId}`, 2500, () => {
            addEvent(`${championName} burst: ${ROLE_ADC_BURST_DAMAGE} dmg.`, 'adc')
          })

          if (!defeated) {
            const pos = activePlanetPositions.get(activeBoss.planetId)
            if (pos) {
              spawnFloat(
                ROLE_ADC_BURST_DAMAGE,
                pos.cx + (Math.random() - 0.5) * 30,
                pos.cy - 45,
                1200,
                { adcFloat: true },
              )
            }
          } else {
            addEvent(`${championName} slays boss (${formatSlotId(activeBoss.planetId)}).`, 'adc')
          }
        }
      }
    },

    triggerIntercept(dirX: number, dirY: number, topX: number, topY: number) {
      this.tankInterceptActive = true
      this.tankInterceptStartMs = Date.now()
      this.tankInterceptDirX = dirX
      this.tankInterceptDirY = dirY

      this.tankShieldActive = false
      this.tankShieldBrokenMs = ROLE_TOP_SHIELD_REBUILD_MS

      spawnFloat(0, topX, topY - 45, 1000, { shieldFloat: true })

      const { addEvent } = useEventLog()
      const championName = getChampionNameByRole('top')
      addEvent(`${championName}'s shield absorbs a shot! (${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s rebuild)`, 'top')

      setTimeout(() => {
        this.tankInterceptActive = false
      }, INTERCEPT_SHIELD_ANIM_MS)
    },

    _tickJungler(roles: Set<string>, tickMs: number) {
      if (!roles.has('jungle')) {
        this.jungleBuffCooldownMs = 0
        return
      }

      if (this.jungleBuffCooldownMs > 0) {
        this.jungleBuffCooldownMs = Math.max(0, this.jungleBuffCooldownMs - tickMs)
        return
      }

      // Jungle buff proximity check — only when cooldown is expired
      const combatStore = useCombatStore()
      const jungleName = getChampionNameByRole('jungle')
      const jungleChamp = combatStore.champions.find((c) => c.name === jungleName)

      if (!jungleChamp || (jungleChamp.screenX === 0 && jungleChamp.screenY === 0)) return

      const planetShopStore = usePlanetShopStore()
      const { addEvent: logEvent } = useEventLog()
      let triggered = false

      for (const slot of planetShopStore.purchasedSlots) {
        if (!slot.role) continue
        if (slot.jungleBuff?.active) continue
        const pos = activePlayerPlanetPositions.get(slot.id)
        if (!pos) continue
        const dist = Math.hypot(jungleChamp.screenX - pos.cx, jungleChamp.screenY - pos.cy)
        if (dist <= JUNGLE_BUFF_RANGE) {
          const def = JUNGLE_BUFF_DEFS[slot.role]
          planetShopStore.applyJungleBuff(slot.id, def)
          triggered = true
          const durSec = Math.round(def.durationMs / 1000)
          logEvent(
            `${jungleName}: ${def.name} on ${getPlanetLabel(slot)} (×${def.multiplier}, ${durSec}s)!`,
            'jungle',
          )
        }
      }

      if (triggered) {
        this.jungleBuffCooldownMs = JUNGLE_BUFF_COOLDOWN_MS
        this.jungleBuffFlashActive = true
        window.setTimeout(() => {
          this.jungleBuffFlashActive = false
        }, JUNGLE_BUFF_FLASH_ANIM_MS)
      }
    },
  },
})
