import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'

/**
 * Career totals merged with the running battle — shared between the battle
 * landing screen and the bottom-bar scoreboard so both always show the same
 * numbers. Display-only; the store's allTime stays untouched (liveBattleStats
 * zeroes out the moment the battle finalizes and accumulateBattleStats()
 * takes over the same numbers).
 */
export function useBattleScoreboardStats() {
  const battleStore = useBattleStore()

  const live = computed(() => battleStore.liveBattleStats)

  const kills = computed(() => battleStore.totalKills + live.value.kills)
  const deaths = computed(() => battleStore.totalDeaths + live.value.deaths)
  const assists = computed(() => battleStore.totalAssists + live.value.assists)
  const playtimeGameSeconds = computed(
    () => battleStore.totalBattleTime + live.value.battleSeconds,
  )

  const kdaStr = computed(() => {
    if (deaths.value === 0) return kills.value + assists.value > 0 ? 'Perfect' : '—'
    return ((kills.value + assists.value) / deaths.value).toFixed(2)
  })

  const killPartPct = computed(() => Math.round(battleStore.avgKillParticipation * 100))

  const gold = computed(() => battleStore.allTime.gold + live.value.gold)
  const cs = computed(() => battleStore.allTime.cs + live.value.cs)
  const damage = computed(() => battleStore.allTime.damage + live.value.damage)
  const dragons = computed(() => battleStore.allTime.dragons + live.value.dragons)
  const barons = computed(() => battleStore.allTime.barons + live.value.barons)

  return {
    live,
    kills,
    deaths,
    assists,
    playtimeGameSeconds,
    kdaStr,
    killPartPct,
    gold,
    cs,
    damage,
    dragons,
    barons,
  }
}
