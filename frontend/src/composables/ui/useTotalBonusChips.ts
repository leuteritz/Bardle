import { computed, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'

/** Eine dauerhaft wirkende Verstärkung, fertig zum Anzeigen. */
export interface TotalBonusChip {
  key: string
  icon: string
  label: string
  /** Bereits formatiert, mit Vorzeichen. */
  value: string
  /** `false` = der Wert senkt etwas (Kosten, Abklingzeit, Gegnertempo). */
  positive: boolean
}

/**
 * Die Summe aller dauerhaft wirkenden Modifikatoren — Gegenstück zu
 * `useActiveBuffList`, das die befristeten Effekte liefert.
 */
export function useTotalBonusChips(): { chips: ComputedRef<TotalBonusChip[]> } {
  const gameStore = useGameStore()
  const synergyStore = useSynergyStore()
  const augmentStore = useAugmentStore()

  const { activeModifier, abilityCPSMultiplier, abilityCPCMultiplier, abilityPowerBonus } =
    storeToRefs(gameStore)
  const { cpsSynergyMultiplier, powerSynergyMultiplier, dpsSynergyMultiplier } =
    storeToRefs(synergyStore)
  const { temporaryCPSMultiplier } = storeToRefs(augmentStore)

  const pctOf = (mul: number | undefined) => Math.round(((mul ?? 1) - 1) * 100)
  const cutOf = (mul: number | undefined) =>
    (mul ?? 1) < 1 ? Math.round((1 - (mul ?? 1)) * 100) : 0

  const chips = computed<TotalBonusChip[]>(() => {
    const mod = activeModifier.value
    const out: TotalBonusChip[] = []
    const cps = Math.round(
      ((mod.cpsMultiplier ?? 1) -
        1 +
        (abilityCPSMultiplier.value - 1) +
        (cpsSynergyMultiplier.value - 1) +
        (temporaryCPSMultiplier.value - 1)) *
        100,
    )
    const cpc = Math.round(((mod.cpcMultiplier ?? 1) - 1 + (abilityCPCMultiplier.value - 1)) * 100)
    const powerPct = pctOf(powerSynergyMultiplier.value)
    const powerFlat = abilityPowerBonus.value
    const meep = pctOf(mod.meepPowerMultiplier)
    const dps = pctOf(dpsSynergyMultiplier.value)
    const cdr = cutOf(mod.cooldownMultiplier)
    const exp = pctOf(mod.expeditionRewardMultiplier)
    const cost = cutOf(mod.buildingCostMultiplier)
    const enemy = cutOf(mod.enemySpeedMultiplier)

    if (cps > 0)
      out.push({
        key: 'cps',
        icon: 'game-icons:sparkles',
        label: 'Production',
        value: `+${cps}%`,
        positive: true,
      })
    if (cpc > 0)
      out.push({
        key: 'cpc',
        icon: 'game-icons:hand',
        label: 'Click',
        value: `+${cpc}%`,
        positive: true,
      })
    if (powerPct > 0 || powerFlat > 0) {
      const parts: string[] = []
      if (powerPct > 0) parts.push(`+${powerPct}%`)
      if (powerFlat > 0) parts.push(`+${powerFlat}`)
      out.push({
        key: 'power',
        icon: 'game-icons:mighty-force',
        label: 'Power',
        value: parts.join(' & '),
        positive: true,
      })
    }
    if (meep > 0)
      out.push({
        key: 'meep',
        icon: 'game-icons:meeple-king',
        label: 'Meep Power',
        value: `+${meep}%`,
        positive: true,
      })
    if (dps > 0)
      out.push({
        key: 'dps',
        icon: 'ri:sword-fill',
        label: 'Combat DPS',
        value: `+${dps}%`,
        positive: true,
      })
    if (cdr > 0)
      out.push({
        key: 'cdr',
        icon: 'game-icons:sands-of-time',
        label: 'Cooldowns',
        value: `-${cdr}%`,
        positive: false,
      })
    if (exp > 0)
      out.push({
        key: 'exp',
        icon: 'ph:compass-fill',
        label: 'Expeditions',
        value: `+${exp}%`,
        positive: true,
      })
    if (cost > 0)
      out.push({
        key: 'cost',
        icon: 'game-icons:stone-wall',
        label: 'Build Cost',
        value: `-${cost}%`,
        positive: false,
      })
    if (enemy > 0)
      out.push({
        key: 'enemy',
        icon: 'game-icons:turtle',
        label: 'Enemy Speed',
        value: `-${enemy}%`,
        positive: false,
      })
    return out
  })

  return { chips }
}
