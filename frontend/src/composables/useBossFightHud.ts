// Abgeleitete Anzeigewerte des Star-Fight-Kampfes: Boss, HP, Despawn-Timer des
// Sterns und die drei Fähigkeits-Ringe (Strike, Rage, Nova).
//
// Alle Werte hängen an einem von außen gereichten `now`: das Modal tickt mit
// 4 Hz, und beide Verbraucher (Modal-Veils und Boss-HUD) sollen exakt denselben
// Zeitpunkt sehen — ein zweiter, eigener Ticker würde sichtbar auseinanderlaufen.
import { computed } from 'vue'
import type { Ref } from 'vue'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore, CURSE_DEFS } from '@/stores/roleBehaviorStore'
import {
  BOSS_AUTO_ATTACK_DAMAGE,
  BOSS_AUTO_INTERVAL_MS,
  BOSS_CHAMPION_ATTACK_DPS,
  BOSS_GALAXY_CHAMPION_DPS_MULT,
  BOSS_NOVA_INTERVAL_MS,
  BOSS_RAGE_DMG_MULT,
  STAR_FIGHT_TIMER_CRITICAL_S,
  STAR_FIGHT_TIMER_WARNING_S,
} from '@/config/constants'
import type { ChampionRole } from '@/types'

/** headerSlots-Index je Rolle (Slot-Reihenfolge des Teams). */
const ROLE_SLOT_INDEX: Record<ChampionRole, number> = {
  top: 0,
  jungle: 1,
  mid: 2,
  adc: 3,
  support: 4,
}

export function useBossFightHud(now: Ref<number>) {
  const starGroupStore = useStarGroupStore()
  const bossStore = usePlanetBossStore()
  const battleStore = useBattleStore()
  const roleBehaviorStore = useRoleBehaviorStore()

  const activeBoss = computed(() => bossStore.activeBoss)
  const isGalaxyBoss = computed(() => activeBoss.value?.isGalaxyBoss ?? false)
  const hpPct = computed(() => Math.max(0, Math.min(100, bossStore.bossHPPercent)))

  // ── Star-Despawn-Timer ──────────────────────────────────────────────────
  const fightStar = computed(
    () => starGroupStore.activeStars.find((s) => s.id === starGroupStore.activeFightStarId) ?? null,
  )

  const starSecsLeft = computed<number | null>(() => {
    const s = fightStar.value
    if (!s || s.spawnedAt === undefined || s.durationMs === undefined) return null
    return Math.max(0, Math.ceil((s.spawnedAt + s.durationMs - now.value) / 1000))
  })

  const starTimePct = computed(() => {
    const s = fightStar.value
    if (!s || s.spawnedAt === undefined || s.durationMs === undefined) return 0
    const remaining = (s.spawnedAt + s.durationMs - now.value) / s.durationMs
    return Math.max(0, Math.min(100, remaining * 100))
  })

  // Ampel-Zustand des Despawn-Rings: Gold → Warn-Orange → Kritisch-Rot (+Puls)
  const starRingCritical = computed(
    () => starSecsLeft.value !== null && starSecsLeft.value <= STAR_FIGHT_TIMER_CRITICAL_S,
  )

  const starRingColor = computed(() => {
    if (starRingCritical.value) return '#ff5040'
    if (starSecsLeft.value !== null && starSecsLeft.value <= STAR_FIGHT_TIMER_WARNING_S)
      return '#e8a030'
    return '#e8c040'
  })

  /** Position des aktuellen Kampfs innerhalb des Sterns. */
  const planetProgress = computed(() => {
    const s = fightStar.value
    if (!s || s.planetSlots.length === 0) return null
    const total = s.planetSlots.length
    const cleared = s.planetSlots.filter((p) => p.cleared).length
    return { total, cleared, current: Math.min(cleared + 1, total) }
  })

  // ── Curse ───────────────────────────────────────────────────────────────
  const activeCurse = computed(() => {
    const c = roleBehaviorStore.activeCurse
    if (!c || now.value >= c.activeUntil) return null
    if (roleBehaviorStore.cursedStarId !== starGroupStore.activeFightStarId) return null
    return c
  })
  const curseSecsLeft = computed(() =>
    activeCurse.value ? Math.max(0, Math.ceil((activeCurse.value.activeUntil - now.value) / 1000)) : 0,
  )
  const curseDef = computed(() => (activeCurse.value ? CURSE_DEFS[activeCurse.value.type] : null))

  // ── Boss-Rage ───────────────────────────────────────────────────────────
  const rageActive = computed(() => roleBehaviorStore.rageActiveUntil > now.value)

  const rageSecsLeft = computed(() =>
    rageActive.value
      ? Math.max(0, Math.ceil((roleBehaviorStore.rageActiveUntil - now.value) / 1000))
      : Math.max(0, Math.ceil(roleBehaviorStore.rageCooldownMs / 1000)),
  )

  // Cooldown-Phase: Arc füllt sich zur Rage hin; aktive Phase: Arc läuft ab.
  // Beide Phasen interpolieren aus Zeitstempeln (readyAt/activeUntil) — das
  // 250ms-now + 0.2s-Transition füllt den Ring smooth statt in 1s-Stufen
  const rageRingPct = computed(() => {
    if (rageActive.value) {
      const dur = roleBehaviorStore.rageDurationMs || 1
      return Math.max(0, Math.min(1, (roleBehaviorStore.rageActiveUntil - now.value) / dur))
    }
    if (roleBehaviorStore.rageReadyAt <= 0) return 0
    const interval = roleBehaviorStore.rageIntervalMs || 1
    return Math.max(0, Math.min(1, 1 - (roleBehaviorStore.rageReadyAt - now.value) / interval))
  })

  // ── Shock Nova (synchron zum Boss-Stern im Idle-Orbit) ──────────────────
  // Zeitstempel-basiert wie der Star-Despawn-Ring — füllt smooth statt in
  // 1s-Tick-Stufen
  const novaSecsLeft = computed(() =>
    roleBehaviorStore.novaReadyAt > 0
      ? Math.max(0, Math.ceil((roleBehaviorStore.novaReadyAt - now.value) / 1000))
      : Math.ceil(BOSS_NOVA_INTERVAL_MS / 1000),
  )

  const novaRingPct = computed(() => {
    if (roleBehaviorStore.novaReadyAt <= 0) return 0
    return Math.max(
      0,
      Math.min(1, 1 - (roleBehaviorStore.novaReadyAt - now.value) / BOSS_NOVA_INTERVAL_MS),
    )
  })

  // ── Strike (Auto-Attack) ────────────────────────────────────────────────
  const autoSecsLeft = computed(() =>
    roleBehaviorStore.autoReadyAt > 0
      ? Math.max(0, Math.ceil((roleBehaviorStore.autoReadyAt - now.value) / 1000))
      : Math.ceil(BOSS_AUTO_INTERVAL_MS / 1000),
  )

  const autoRingPct = computed(() => {
    if (roleBehaviorStore.autoReadyAt <= 0) return 0
    return Math.max(
      0,
      Math.min(1, 1 - (roleBehaviorStore.autoReadyAt - now.value) / BOSS_AUTO_INTERVAL_MS),
    )
  })

  // ── Damage-Badges unter den Fähigkeits-Ringen ───────────────────────────
  const autoDmgDisplay = computed(() =>
    Math.round(
      BOSS_AUTO_ATTACK_DAMAGE *
        (isGalaxyBoss.value ? BOSS_GALAXY_CHAMPION_DPS_MULT : 1) *
        (rageActive.value ? BOSS_RAGE_DMG_MULT : 1),
    ),
  )

  const novaDmgDisplay = computed(() =>
    Math.round(
      BOSS_CHAMPION_ATTACK_DPS *
        (isGalaxyBoss.value ? BOSS_GALAXY_CHAMPION_DPS_MULT : 1) *
        (rageActive.value ? BOSS_RAGE_DMG_MULT : 1) *
        (BOSS_NOVA_INTERVAL_MS / 1000),
    ),
  )

  /**
   * Strike-Ziel-Ansage: nur während der Anvisier-Phase gesetzt — zeigt unter der
   * HP-Leiste, wen der Boss gerade im Visier hat (Champion-Name, Planeten-Slot
   * oder die eigene Sonne).
   */
  const strikeAimTarget = computed(() => {
    const role = roleBehaviorStore.autoAimRole
    if (role) return battleStore.headerSlots[ROLE_SLOT_INDEX[role]] ?? role.toUpperCase()
    if (roleBehaviorStore.autoAimSun) return 'Sun'
    const slotId = roleBehaviorStore.autoAimSlotId
    return slotId ? slotId.replace('slot_', 'Slot ') : null
  })

  return {
    activeBoss,
    isGalaxyBoss,
    hpPct,
    fightStar,
    starSecsLeft,
    starTimePct,
    starRingCritical,
    starRingColor,
    planetProgress,
    activeCurse,
    curseSecsLeft,
    curseDef,
    rageActive,
    rageSecsLeft,
    rageRingPct,
    novaSecsLeft,
    novaRingPct,
    novaDmgDisplay,
    autoSecsLeft,
    autoRingPct,
    autoDmgDisplay,
    strikeAimTarget,
  }
}
