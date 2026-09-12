import { computed, type ComputedRef } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useLandfallStore } from '@/stores/world/landfallStore'
import {
  getDrifter,
  DRIFTER_BUFF_EFFECT_LABELS,
  MVP_BUFF_ICON,
  MVP_BUFF_COLOR,
  MVP_BUFF_LABEL,
  MVP_BUFF_NAME,
} from '@/config/world/drifters'
import { getOmen } from '@/config/progression/omens'
import { getBardAbility } from '@/config/progression/bardAbilities'
import { FORGE_BARGAINS } from '@/config/progression/starForge'
import { AUGMENTS } from '@/config/economy/augments'
import { getLandfallBoon } from '@/config/world/landfallBoons'
import { augmentIcon, omenIcon } from '@/utils/game/rolledIcons'
import { buffAxisLabel, buffPeakMultiplier } from '@/utils/ui/buffAxis'
import {
  AUGMENT_OVERCLOCK_DEFAULT_MS,
  AUGMENT_RARITY_COLOR,
  AUGMENT_TIMED_BUFF_COLOR,
  AUGMENT_TIMED_EFFECT_LABELS,
  DRIFTER_RARITY_COLOR,
  FORGE_TIMED_BUFF_COLOR,
  FORGE_TIMED_BUFF_ICON,
  HONOR_MVP_BUFF_DURATION_S,
  HONOR_MVP_BUFF_MULT,
  LANDFALL_ACCENT_HEX,
  LANDFALL_CAIRN_BOON_MULT,
} from '@/config/constants'
import type { BuffRank, ForgeBuffId, TimedBuffEffects } from '@/types'

export type ActiveBuffSource =
  | 'ability'
  | 'mvp'
  | 'drifter'
  | 'omen'
  | 'forge'
  | 'augment'
  | 'landfall'

export interface ActiveBuffView {
  key: string
  source: ActiveBuffSource
  name: string
  /** Die Achse in Großbuchstaben, z. B. `CHIMES`. */
  label: string
  multiplier: number
  color: string
  icon?: string
  /** Bard-Fähigkeiten tragen ein Bild statt eines Glyphs. */
  image?: string
  /** Nur Quellen mit ECHTER Rarität (Drifter, Augment) — nie erfunden. */
  rank?: BuffRank
  rankColor?: string
  /** `null` = ohne Uhr; der Landfall-Segen gilt bis zum Galaxieende. */
  timer: { secondsLeft: number; progress: number } | null
  /** Spielzeit-Stempel der Ankunft; `null` = seit Galaxiebeginn (ältester). */
  startedAt: number | null
}

const FORGE_BUFF_LABEL: Record<ForgeBuffId, { name: string; label: string }> = {
  cpcX2: { name: 'Midas Hour', label: 'PER CLICK' },
  cpsX2: { name: 'Stellar Surge', label: 'CHIMES' },
  dropX2: { name: 'Phase Lantern', label: 'DROPS' },
}

function timer(remainingMs: number, durationMs: number) {
  const left = Math.max(0, remainingMs)
  return {
    secondsLeft: Math.ceil(left / 1000),
    progress: durationMs > 0 ? Math.min(1, left / durationMs) : 0,
  }
}

/**
 * Alle laufenden Zeiteffekte des Spielers in EINER Liste — kurz laufende zuerst.
 * Jede Quelle liest ihre eigene Store-Uhr; Augment-Buffs haben keine und
 * rechnen gegen `drifterNow` (dieselbe Spieluhr, tickt sekündlich).
 */
export function useActiveBuffList(): {
  buffs: ComputedRef<ActiveBuffView[]>
  count: ComputedRef<number>
} {
  const gameStore = useGameStore()
  const drifterStore = useDrifterStore()
  const omenStore = useOmenStore()
  const abilityStore = useBardAbilityStore()
  const forgeStore = useStarForgeStore()
  const augmentStore = useAugmentStore()
  const landfallStore = useLandfallStore()

  const buffs = computed<ActiveBuffView[]>(() => {
    const out: ActiveBuffView[] = []

    for (const buff of abilityStore.liveBuffs) {
      const def = getBardAbility(buff.sourceId)
      if (!def) continue
      const effects: TimedBuffEffects = {}
      if (buff.cpsMult) effects.cpsMult = buff.cpsMult
      if (buff.cpcMult) effects.cpcMult = buff.cpcMult
      if (buff.combatDpsMult) effects.combatDpsMult = buff.combatDpsMult
      out.push({
        key: `ability-${buff.sourceId}`,
        source: 'ability',
        name: def.name,
        label: buffAxisLabel(effects),
        multiplier: buffPeakMultiplier(effects),
        color: def.color,
        image: def.image,
        timer: timer(buff.expiresAt - abilityStore.abilityNow, buff.durationMs),
        startedAt: buff.expiresAt - buff.durationMs,
      })
    }

    if (gameStore.mvpBuffSecondsLeft > 0) {
      out.push({
        key: 'mvp',
        source: 'mvp',
        name: MVP_BUFF_NAME,
        label: MVP_BUFF_LABEL,
        multiplier: HONOR_MVP_BUFF_MULT,
        color: MVP_BUFF_COLOR,
        icon: MVP_BUFF_ICON,
        timer: {
          secondsLeft: gameStore.mvpBuffSecondsLeft,
          progress: Math.min(1, gameStore.mvpBuffSecondsLeft / HONOR_MVP_BUFF_DURATION_S),
        },
        // Der Ehrenbuff kennt nur Restsekunden — die Ankunft wird zurückgerechnet.
        startedAt:
          drifterStore.drifterNow - (HONOR_MVP_BUFF_DURATION_S - gameStore.mvpBuffSecondsLeft) * 1000,
      })
    }

    for (const buff of drifterStore.liveBuffs) {
      const def = getDrifter(buff.sourceId)
      if (!def) continue
      out.push({
        key: `drifter-${buff.sourceId}`,
        source: 'drifter',
        name: def.name,
        label: buffAxisLabel(buff.effects),
        multiplier: buffPeakMultiplier(buff.effects),
        color: def.color,
        icon: def.icon,
        image: def.image,
        rank: def.rarity,
        rankColor: DRIFTER_RARITY_COLOR[def.rarity],
        timer: timer(buff.expiresAt - drifterStore.drifterNow, buff.durationMs),
        startedAt: buff.expiresAt - buff.durationMs,
      })
    }

    for (const buff of omenStore.liveBuffs) {
      const def = getOmen(buff.sourceId)
      if (!def) continue
      out.push({
        key: `omen-${buff.sourceId}`,
        source: 'omen',
        name: buff.swift ? `${def.name} (swift)` : def.name,
        label: buffAxisLabel(buff.effects),
        multiplier: buffPeakMultiplier(buff.effects),
        color: def.color,
        icon: buff.icon ?? omenIcon(def.id, 0),
        timer: timer(buff.expiresAt - omenStore.omenNow, buff.durationMs),
        startedAt: buff.expiresAt - buff.durationMs,
      })
    }

    for (const buff of forgeStore.activeBuffs) {
      if (buff.expiresAt <= forgeStore.forgeNow) continue
      const bargain = FORGE_BARGAINS.find((b) => b.buffId === buff.id)
      const face = FORGE_BUFF_LABEL[buff.id]
      out.push({
        key: `forge-${buff.id}`,
        source: 'forge',
        name: bargain?.name ?? face.name,
        label: face.label,
        multiplier: 2,
        color: FORGE_TIMED_BUFF_COLOR,
        icon: FORGE_TIMED_BUFF_ICON,
        timer: timer(buff.expiresAt - forgeStore.forgeNow, bargain?.durationMs ?? 0),
        startedAt: buff.expiresAt - (bargain?.durationMs ?? 0),
      })
    }

    const now = drifterStore.drifterNow
    augmentStore.activeTimedBuffs.forEach((buff, i) => {
      if (buff.expiresAt <= now) return
      const def = AUGMENTS.find((a) => a.id === buff.augmentId)
      const durationMs = def?.specialEffect?.params.duration ?? AUGMENT_OVERCLOCK_DEFAULT_MS
      const idx = Math.max(0, gameStore.activeAugments.indexOf(buff.augmentId))
      out.push({
        key: `augment-${buff.augmentId}-${buff.effectKey}-${i}`,
        source: 'augment',
        name: def?.name ?? buff.augmentId,
        label: AUGMENT_TIMED_EFFECT_LABELS[buff.effectKey] ?? buff.effectKey.toUpperCase(),
        multiplier: buff.multiplier,
        color: AUGMENT_TIMED_BUFF_COLOR,
        icon: augmentIcon(buff.augmentId, idx),
        rank: def?.rarity,
        rankColor: def ? AUGMENT_RARITY_COLOR[def.rarity] : undefined,
        timer: timer(buff.expiresAt - now, durationMs),
        startedAt: buff.expiresAt - durationMs,
      })
    })

    if (landfallStore.boon) {
      const def = getLandfallBoon(landfallStore.boon)
      if (def)
        out.push({
          key: `landfall-${def.id}`,
          source: 'landfall',
          name: def.name,
          label: DRIFTER_BUFF_EFFECT_LABELS[def.axis],
          multiplier: LANDFALL_CAIRN_BOON_MULT,
          color: LANDFALL_ACCENT_HEX,
          icon: def.icon,
          timer: null,
          startedAt: null,
        })
    }

    return out
  })

  return { buffs, count: computed(() => buffs.value.length) }
}
