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
  BOSS_PLANET_ATTACK_DPS,
  BOSS_GALAXY_CHAMPION_DPS_MULT,
  CHAMPION_REVIVE_MS,
  CHAMPION_HP_REGEN_FRAC,
  BOSS_RAGE_DMG_MULT,
  BOSS_RAGE_INTERVAL_MIN_MS,
  BOSS_RAGE_INTERVAL_MAX_MS,
  BOSS_RAGE_DURATION_MIN_MS,
  BOSS_RAGE_DURATION_MAX_MS,
  BOSS_NOVA_INTERVAL_MS,
  BOSS_NOVA_PLAYER_DAMAGE,
  BOSS_AUTO_INTERVAL_MS,
  BOSS_AUTO_ATTACK_DAMAGE,
  BOSS_AUTO_AIM_MS,
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
  STRIKER_PROJECTILE_FLIGHT_MS,
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
import {
  championInForeground,
  playerSlotInForeground,
  bossPlanetInForeground,
} from '../utils/foregroundGate'
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
    // Rebuild fertig, aber Top (noch) hinter der Sonne — Log erst bei Aktivierung
    tankShieldRebuildPending: false,

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

    // Boss-Gegenschlag auf die Spieler-Planeten (alle Slots): Zeitstempel +
    // Schadenswert des letzten Treffers (treibt Flash + Floats im Planet-HUD)
    planetHitAt: 0,
    planetHitDmg: 0,

    // Boss ability "Shock Nova" — the AoE wave runs on this cooldown; the
    // idle-orbit star of the active boss mirrors it 1:1. novaCounter is a
    // monotonic firing counter the UI layers watch for wave/projectile FX.
    // novaReadyAt: Zeitstempel des nächsten Auslösens — Ringe interpolieren
    // daraus PRO FRAME statt im 1s-Tick-Raster (smooth statt abgehackt).
    novaCooldownMs: BOSS_NOVA_INTERVAL_MS,
    novaReadyAt: 0,
    novaCounter: 0,

    // Boss ability "Strike" (Auto-Attack) — kurzer Cooldown, trifft EIN
    // zufälliges lebendes Ziel. autoTargetRole ODER autoTargetSlotId ist
    // gesetzt; autoDmg trägt den Schaden des letzten Schlags für die Labels.
    autoCooldownMs: BOSS_AUTO_INTERVAL_MS,
    autoReadyAt: 0,
    autoCounter: 0,
    autoTargetRole: null as ChampionRole | null,
    autoTargetSlotId: null as string | null,
    autoDmg: 0,
    // Anvisier-Phase: bei vollem Ring wählt der Boss ein sichtbares Ziel und
    // hält BOSS_AUTO_AIM_MS lang die Zielscheibe darauf, bevor der Bolt fliegt
    autoAimRole: null as ChampionRole | null,
    autoAimSlotId: null as string | null,
    autoAimUntil: 0,
    autoAimCounter: 0,

    // Boss Rage — interval + duration are rolled fresh PER STAR: the cooldown
    // keeps counting across boss transitions within the same star fight
    rageStarId: null as string | null,
    rageIntervalMs: 0,
    rageDurationMs: 0,
    rageCooldownMs: 0,
    // Zeitstempel, wann die nächste Rage zündet — für frame-smoothe Ringe
    rageReadyAt: 0,
    rageActiveUntil: 0,
  }),

  actions: {
    tick() {
      const { isRenderingPaused } = useRenderingPaused()
      if (isRenderingPaused.value) return

      const TICK_MS = GAME_TICK_INTERVAL_MS
      const roles = getOrbitingRoles()

      this._syncChampionHp()
      this._expireJungleBuffs()
      this._tickBossRage(TICK_MS)
      this._tickBossAttack(roles, TICK_MS)
      this._tickBossAutoAttack(roles, TICK_MS)
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

    /** Boss Rage: every boss periodically enrages and deals double damage.
     *  Interval, duration and the running cooldown are shared per STAR — when
     *  the next boss of the same star steps up, the cooldown keeps counting
     *  down instead of restarting. A fresh profile is only rolled when the
     *  fight moves to a different star. */
    _tickBossRage(tickMs: number) {
      const bossStore = usePlanetBossStore()
      const starGroupStore = useStarGroupStore()
      const activeBoss = bossStore.activeBoss
      const { addEvent } = useEventLog()
      const now = Date.now()

      if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
        // Boss besiegt/weg: eine laufende Rage gilt als verbraucht — der
        // Stern-Cooldown bleibt jedoch stehen und läuft beim nächsten Boss
        // desselben Sterns weiter
        if (this.rageActiveUntil > 0) {
          this.rageActiveUntil = 0
          this.rageCooldownMs = this.rageIntervalMs
        }
        return
      }

      // Stern des aktiven Bosses ermitteln (Fallback: planetId, falls der
      // Boss keinem aktiven Stern zugeordnet ist)
      const starId =
        starGroupStore.activeStars.find((s) =>
          s.planetSlots.some((p) => p.planetId === activeBoss.planetId),
        )?.id ?? activeBoss.planetId

      // Neuer Stern → Rage-Profil frisch auswürfeln; die erste Rage kommt
      // erst nach Ablauf des Cooldowns
      if (this.rageStarId !== starId) {
        this.rageStarId = starId
        this.rageIntervalMs =
          BOSS_RAGE_INTERVAL_MIN_MS +
          Math.random() * (BOSS_RAGE_INTERVAL_MAX_MS - BOSS_RAGE_INTERVAL_MIN_MS)
        this.rageDurationMs =
          BOSS_RAGE_DURATION_MIN_MS +
          Math.random() * (BOSS_RAGE_DURATION_MAX_MS - BOSS_RAGE_DURATION_MIN_MS)
        this.rageCooldownMs = this.rageIntervalMs
        this.rageActiveUntil = 0
      }

      if (this.rageActiveUntil > 0) {
        if (now >= this.rageActiveUntil) {
          this.rageActiveUntil = 0
          this.rageCooldownMs = this.rageIntervalMs
          addEvent(`${activeBoss.bossName}'s rage subsides.`, 'combat')
        }
        return
      }

      // Zünden erst im Tick NACH Erreichen von 0 — so ist "0s" + voller Ring
      // im UI einen Tick lang sichtbar, bevor die Rage losgeht
      const rageWasReady = this.rageCooldownMs <= 0
      this.rageCooldownMs = Math.max(0, this.rageCooldownMs - tickMs)
      // readyAt jeden Tick nachführen — Ringe interpolieren daraus pro Frame
      this.rageReadyAt = now + this.rageCooldownMs
      if (rageWasReady) {
        this.rageActiveUntil = now + this.rageDurationMs
        addEvent(
          `${activeBoss.bossName} flies into a rage! (×${BOSS_RAGE_DMG_MULT} dmg, ${Math.round(this.rageDurationMs / 1000)}s)`,
          'combat',
        )
      }
    },

    /** Boss ability "Shock Nova": on a fixed cooldown the boss unleashes an
     *  AoE wave that hits every orbiting champion, every turret planet AND
     *  the player. Damage per wave = dps × interval — balance-neutral to the
     *  old per-second strike. Downed champions revive at full HP after
     *  CHAMPION_REVIVE_MS; without an active boss the squad regenerates and
     *  the nova cooldown stays fully wound up. */
    _tickBossAttack(roles: Set<string>, tickMs: number) {
      const bossStore = usePlanetBossStore()
      const activeBoss = bossStore.activeBoss
      const bossAlive = !!activeBoss && !activeBoss.defeated && !activeBoss.expired
      const combatStore = useCombatStore()
      const { addEvent } = useEventLog()
      const now = Date.now()

      // Revive-Fenster + Out-of-Combat-Regeneration laufen im Sekundentakt
      for (const role of Object.keys(this.championHp) as ChampionRole[]) {
        if (!roles.has(role)) continue
        const hp = this.championHp[role]
        if (hp.max <= 0) continue

        if (this.championDownUntil[role] > 0) {
          if (now >= this.championDownUntil[role]) {
            this.championDownUntil[role] = 0
            hp.current = hp.max
            addEvent(`${getChampionNameByRole(role)} is back in the fight!`, role)
          }
          continue
        }

        if (!bossAlive && hp.current < hp.max) {
          hp.current = Math.min(hp.max, hp.current + hp.max * CHAMPION_HP_REGEN_FRAC * (tickMs / 1000))
        }
      }

      // ── Shock Nova: Cooldown herunterzählen, bei 0 die Welle auslösen ──────
      if (!bossAlive) {
        this.novaCooldownMs = BOSS_NOVA_INTERVAL_MS
        this.novaReadyAt = 0
        return
      }

      // Zünden erst im Tick NACH Erreichen von 0 — "0s" + voller Ring sind
      // im UI einen Tick lang sichtbar, bevor die Welle losbricht
      const novaWasReady = this.novaCooldownMs <= 0
      this.novaCooldownMs = Math.max(0, this.novaCooldownMs - tickMs)
      // readyAt jeden Tick nachführen — selbstkorrigierend nach Pausen
      this.novaReadyAt = now + this.novaCooldownMs
      if (!novaWasReady) return

      // Vordergrund-Gate: Steht der Boss hinter der Sonne, wartet die Nova
      // bei vollem Ring, bis er wieder sichtbar ist
      if (!bossPlanetInForeground(activeBoss.planetId)) return

      this.novaCooldownMs = BOSS_NOVA_INTERVAL_MS
      this.novaReadyAt = now + BOSS_NOVA_INTERVAL_MS
      this.novaCounter++

      const raging = this.rageActiveUntil > now
      const novaSecs = BOSS_NOVA_INTERVAL_MS / 1000
      const dmg = Math.round(
        BOSS_CHAMPION_ATTACK_DPS *
          (activeBoss.isGalaxyBoss ? BOSS_GALAXY_CHAMPION_DPS_MULT : 1) *
          (raging ? BOSS_RAGE_DMG_MULT : 1) *
          novaSecs,
      )

      for (const role of Object.keys(this.championHp) as ChampionRole[]) {
        if (!roles.has(role)) continue
        const hp = this.championHp[role]
        if (hp.max <= 0 || this.championDownUntil[role] > 0) continue
        // Hinter der Sonne wird nicht getroffen
        if (!championInForeground(getChampionNameByRole(role))) continue

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
        }
        // Routine-Treffer werden nicht geloggt — nur Knockouts und Revives
      }

      // Die Nova trifft ALLE Spieler-Planeten (jede Planetenart) — das
      // Planet-HUD im Star-Fight-Modal koppelt Flash + Floats daran
      const planetShopStore = usePlanetShopStore()
      const planetDmg = Math.round(
        BOSS_PLANET_ATTACK_DPS *
          (activeBoss.isGalaxyBoss ? BOSS_GALAXY_CHAMPION_DPS_MULT : 1) *
          (raging ? BOSS_RAGE_DMG_MULT : 1) *
          novaSecs,
      )
      // Hinter der Sonne wird nicht getroffen — nur sichtbare Slots
      const planetSlots = planetShopStore.activeSlots.filter((s) =>
        playerSlotInForeground(s.id),
      )
      if (planetDmg > 0 && planetSlots.length > 0) {
        for (const slot of planetSlots) planetShopStore.takeDamage(slot.id, planetDmg)
        this.planetHitAt = now
        this.planetHitDmg = planetDmg
      }

      // ... und den Spieler in der Orbit-Mitte — der Stern-Schuss im
      // Idle-Orbit ist die Visualisierung dieses Treffers
      usePlayerStore().takeDamage(BOSS_NOVA_PLAYER_DAMAGE)
    },

    /** Zielpool des Strikes: lebende Orbit-Champions + Spieler-Planeten
     *  (jede Planetenart) mit Rest-HP — nur Ziele VOR der Sonne, wer dahinter
     *  steht, kann nicht anvisiert werden. Liefert ein Zufallsziel oder null. */
    _rollStrikeTarget(
      roles: Set<string>,
    ): { role: ChampionRole } | { slotId: string } | null {
      const planetShopStore = usePlanetShopStore()
      const champTargets = (Object.keys(this.championHp) as ChampionRole[]).filter(
        (role) =>
          roles.has(role) &&
          this.championHp[role].max > 0 &&
          this.championHp[role].current > 0 &&
          this.championDownUntil[role] <= 0 &&
          championInForeground(getChampionNameByRole(role)),
      )
      const planetTargets = planetShopStore.activeSlots.filter(
        (s) => (s.currentHp ?? 1) > 0 && playerSlotInForeground(s.id),
      )
      const poolSize = champTargets.length + planetTargets.length
      if (poolSize === 0) return null

      const pick = Math.floor(Math.random() * poolSize)
      return pick < champTargets.length
        ? { role: champTargets[pick] }
        : { slotId: planetTargets[pick - champTargets.length].id }
    },

    /** Anvisier-Phase abbrechen — Zielscheibe verschwindet im UI */
    _clearStrikeAim() {
      this.autoAimRole = null
      this.autoAimSlotId = null
      this.autoAimUntil = 0
    },

    /** Boss ability "Strike" — Phasen-Ablauf:
     *  1. Cooldown läuft herunter (Ring füllt sich).
     *  2. Ring voll: steht der Boss hinter der Sonne, wartet er bei vollem
     *     Ring, bis er wieder vorn ist.
     *  3. Der Boss wählt zufällig EIN sichtbares Ziel (Champion oder
     *     Spieler-Planet, nicht hinter der Sonne) und hält BOSS_AUTO_AIM_MS
     *     lang die Zielscheibe darauf (autoAim*).
     *  4. Stirbt das Ziel oder wandert es hinter die Sonne, bricht das
     *     Anvisieren ab und ein neues Ziel wird gewählt.
     *  5. Feuern: Bolt fliegt, Schaden fällt, Cooldown startet neu.
     *  Rage verdoppelt den Schaden — das macht die Rage-Phase gefährlich. */
    _tickBossAutoAttack(roles: Set<string>, tickMs: number) {
      const bossStore = usePlanetBossStore()
      const activeBoss = bossStore.activeBoss
      const bossAlive = !!activeBoss && !activeBoss.defeated && !activeBoss.expired
      const now = Date.now()

      if (!bossAlive) {
        this.autoCooldownMs = BOSS_AUTO_INTERVAL_MS
        this.autoReadyAt = 0
        this.autoTargetRole = null
        this.autoTargetSlotId = null
        this._clearStrikeAim()
        return
      }

      // Phase 1: Cooldown herunterzählen — Ring füllt sich
      if (this.autoCooldownMs > 0) {
        this.autoCooldownMs = Math.max(0, this.autoCooldownMs - tickMs)
        this.autoReadyAt = now + this.autoCooldownMs
        return
      }

      // Phase 2: Boss hinter der Sonne → kann nicht ausführen, wartet bei
      // vollem Ring; ein laufendes Anvisieren wird abgebrochen
      if (!bossPlanetInForeground(activeBoss.planetId)) {
        this._clearStrikeAim()
        return
      }

      // Phase 3: noch kein Ziel im Visier → zufällig eines der sichtbaren
      // Ziele wählen und die Zielscheibe daraufsetzen
      if (!this.autoAimRole && !this.autoAimSlotId) {
        const rolled = this._rollStrikeTarget(roles)
        if (!rolled) return
        this.autoAimRole = 'role' in rolled ? rolled.role : null
        this.autoAimSlotId = 'slotId' in rolled ? rolled.slotId : null
        this.autoAimUntil = now + BOSS_AUTO_AIM_MS
        this.autoAimCounter++
        return
      }

      // Phase 4: Visier validieren — Ziel tot, down oder hinter der Sonne →
      // abbrechen, nächster Tick wählt ein neues Ziel
      const aimRole = this.autoAimRole
      const aimValid = aimRole
        ? roles.has(aimRole) &&
          this.championHp[aimRole].current > 0 &&
          this.championDownUntil[aimRole] <= 0 &&
          championInForeground(getChampionNameByRole(aimRole))
        : usePlanetShopStore().activeSlots.some(
            (s) => s.id === this.autoAimSlotId && (s.currentHp ?? 1) > 0,
          ) && playerSlotInForeground(this.autoAimSlotId!)
      if (!aimValid) {
        this._clearStrikeAim()
        return
      }

      // Zielscheibe noch nicht lang genug auf dem Opfer → weiter anvisieren
      if (now < this.autoAimUntil) return

      // Phase 5: Feuern — Bolt fliegt, Schaden fällt, Cooldown startet neu
      this.autoCooldownMs = BOSS_AUTO_INTERVAL_MS
      this.autoReadyAt = now + BOSS_AUTO_INTERVAL_MS

      const raging = this.rageActiveUntil > now
      const dmg = Math.round(
        BOSS_AUTO_ATTACK_DAMAGE *
          (activeBoss.isGalaxyBoss ? BOSS_GALAXY_CHAMPION_DPS_MULT : 1) *
          (raging ? BOSS_RAGE_DMG_MULT : 1),
      )

      if (aimRole) {
        const hp = this.championHp[aimRole]
        hp.current = Math.max(0, hp.current - dmg)
        this.autoTargetRole = aimRole
        this.autoTargetSlotId = null

        if (hp.current <= 0) {
          const { addEvent } = useEventLog()
          this.championDownUntil[aimRole] = now + CHAMPION_REVIVE_MS
          addEvent(
            `${getChampionNameByRole(aimRole)} is knocked out by ${activeBoss.bossName}! (${CHAMPION_REVIVE_MS / 1000}s)`,
            aimRole,
          )
        }
      } else if (this.autoAimSlotId) {
        usePlanetShopStore().takeDamage(this.autoAimSlotId, dmg)
        this.autoTargetRole = null
        this.autoTargetSlotId = this.autoAimSlotId
      }

      this.autoDmg = dmg
      this.autoCounter++
      this._clearStrikeAim()
    },

    /** Every orbiting role fires a star attack at the active boss on its own
     *  cooldown — on top of its normal role ability. */
    _tickRoleAttacks(roles: Set<string>, tickMs: number) {
      const bossStore = usePlanetBossStore()
      const activeBoss = bossStore.activeBoss

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

        if (!activeBoss || activeBoss.defeated || activeBoss.expired) {
          this.roleAttackCooldownMs[role] = def.intervalMs
          continue
        }

        // Vordergrund-Gate: Schütze und Boss müssen vor der Sonne stehen —
        // der Angriff wartet bei CD 0, bis beide wieder sichtbar sind
        if (
          !championInForeground(getChampionNameByRole(role)) ||
          !bossPlanetInForeground(activeBoss.planetId)
        ) {
          continue
        }

        this.roleAttackCooldownMs[role] = def.intervalMs

        // Abschuss sofort (treibt Projektil-Animation) — der SCHADEN landet
        // erst beim visuellen Einschlag des Projektils am Boss
        this.roleAttackShots[role]++

        // Kein Log pro Routine-Angriff — 5 Rollen im Sekundenrhythmus würden
        // das Event-Log fluten

        const target = activeBoss
        window.setTimeout(() => {
          if (target.defeated || target.expired) return
          const defeated = bossStore.dealDamageToBoss(target, def.damage)
          if (!defeated) {
            const pos = activePlanetPositions.get(target.planetId)
            if (pos) {
              spawnFloat(def.damage, pos.cx + (Math.random() - 0.5) * 36, pos.cy - 48, 1100)
            }
          }
        }, STRIKER_PROJECTILE_FLIGHT_MS)
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

      // Vordergrund-Gate: Heals wirken nur, wenn der Support vor der Sonne
      // steht — die Cooldowns laufen weiter und warten bei 0
      if (!championInForeground(supportName)) return

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
        // Planeten hinter der Sonne empfangen keinen Heal
        .filter(
          (entry) =>
            entry.slot.currentHp < entry.slot.maxHp && playerSlotInForeground(entry.slot.id),
        )
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
        this.tankShieldRebuildPending = false
        return
      }

      if (this.tankShieldBrokenMs > 0) {
        this.tankShieldBrokenMs = Math.max(0, this.tankShieldBrokenMs - tickMs)
        if (this.tankShieldBrokenMs > 0) return
        // Rebuild-Timer abgelaufen — Aktivierung unten (Vordergrund-Gate)
        this.tankShieldRebuildPending = true
      }

      if (this.tankShieldActive) return

      // Vordergrund-Gate: das Schild aktiviert sich erst, wenn Top wieder
      // vor der Sonne steht — der Rebuild-Timer ist dann bereits durch
      if (!championInForeground(getChampionNameByRole('top'))) return

      this.tankShieldActive = true
      if (this.tankShieldRebuildPending) {
        this.tankShieldRebuildPending = false
        const { addEvent } = useEventLog()
        addEvent(`${getChampionNameByRole('top')}'s shield is restored.`, 'top')
      }
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

      // ── Active Curse: Verderbnis DoT — tickt nur, solange der Boss vor
      // der Sonne steht (hinter der Sonne wird nicht getroffen) ──────────────
      if (
        this.activeCurse?.type === 'corruption' &&
        activeBoss &&
        !activeBoss.defeated &&
        !activeBoss.expired &&
        bossPlanetInForeground(activeBoss.planetId)
      ) {
        const defeated = bossStore.dealDamage(ROLE_MID_CURSE_DOT_DPS)
        throttledEvent(`mid-curse-dot-${activeBoss.planetId}`, 10000, () => {
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

      // Vordergrund-Gate: Fluch wartet bei CD 0, bis Mid und Boss sichtbar sind
      if (
        !championInForeground(midName) ||
        !bossPlanetInForeground(activeBoss.planetId)
      ) {
        return
      }

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

      this.adcBurstCooldownMs = Math.max(0, this.adcBurstCooldownMs - tickMs)

      if (this.adcBurstCooldownMs <= 0) {
        const bossStore = usePlanetBossStore()
        const activeBoss = bossStore.activeBoss
        const { addEvent } = useEventLog()
        const championName = getChampionNameByRole('adc')

        // Vordergrund-Gate: bei lebendem Boss warten Burst + Cooldown bei 0,
        // bis ADC und Boss vor der Sonne stehen
        if (
          activeBoss &&
          !activeBoss.defeated &&
          !activeBoss.expired &&
          (!championInForeground(championName) ||
            !bossPlanetInForeground(activeBoss.planetId))
        ) {
          return
        }

        this.adcBurstCooldownMs = ROLE_ADC_BURST_INTERVAL_MS
        this.adcBurstActive = true
        window.setTimeout(() => { this.adcBurstActive = false }, 350)

        if (activeBoss && !activeBoss.defeated && !activeBoss.expired) {
          throttledEvent(`adc-burst-${activeBoss.planetId}`, 10000, () => {
            addEvent(`${championName} burst: ${ROLE_ADC_BURST_DAMAGE} dmg.`, 'adc')
          })

          // Auch der Burst fliegt als Projektil — Schaden erst beim Einschlag
          const target = activeBoss
          window.setTimeout(() => {
            if (target.defeated || target.expired) return
            const defeated = bossStore.dealDamageToBoss(target, ROLE_ADC_BURST_DAMAGE)
            if (!defeated) {
              const pos = activePlanetPositions.get(target.planetId)
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
              addEvent(`${championName} slays boss (${formatSlotId(target.planetId)}).`, 'adc')
            }
          }, STRIKER_PROJECTILE_FLIGHT_MS)
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

      // Vordergrund-Gate: der Jungler bufft nur, wenn er vor der Sonne steht —
      // der Cooldown wartet bei 0
      if (!championInForeground(jungleName)) return

      const planetShopStore = usePlanetShopStore()
      const { addEvent: logEvent } = useEventLog()
      let triggered = false

      for (const slot of planetShopStore.purchasedSlots) {
        if (!slot.role) continue
        if (slot.jungleBuff?.active) continue
        // Planeten hinter der Sonne empfangen keinen Buff
        if (!playerSlotInForeground(slot.id)) continue
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
