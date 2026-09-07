<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useActiveBuffList } from '@/composables/ui/useActiveBuffList'
import { DRIFTER_BUFF_EXPIRY_WARN_SEC } from '@/config/constants'
import StatsSubRule from './StatsSubRule.vue'

/** Alles, was gerade wirkt: laufende Zeiteffekte oben, die dauerhafte Summe darunter. */
const gameStore = useGameStore()
const synergyStore = useSynergyStore()
const augmentStore = useAugmentStore()
const { buffs } = useActiveBuffList()

const { activeModifier, abilityCPSMultiplier, abilityCPCMultiplier, abilityPowerBonus } =
  storeToRefs(gameStore)
const { cpsSynergyMultiplier, powerSynergyMultiplier, dpsSynergyMultiplier } =
  storeToRefs(synergyStore)
const { temporaryCPSMultiplier } = storeToRefs(augmentStore)

const pctOf = (mul: number | undefined) => Math.round(((mul ?? 1) - 1) * 100)
const cutOf = (mul: number | undefined) => ((mul ?? 1) < 1 ? Math.round((1 - (mul ?? 1)) * 100) : 0)

interface TotalChip {
  key: string
  icon: string
  label: string
  value: string
  positive: boolean
}

const totalChips = computed<TotalChip[]>(() => {
  const mod = activeModifier.value
  const chips: TotalChip[] = []
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

  if (cps > 0) chips.push({ key: 'cps', icon: 'game-icons:sparkles', label: 'Production', value: `+${cps}%`, positive: true })
  if (cpc > 0) chips.push({ key: 'cpc', icon: 'game-icons:hand', label: 'Click', value: `+${cpc}%`, positive: true })
  if (powerPct > 0 || powerFlat > 0) {
    const parts: string[] = []
    if (powerPct > 0) parts.push(`+${powerPct}%`)
    if (powerFlat > 0) parts.push(`+${powerFlat}`)
    chips.push({ key: 'power', icon: 'game-icons:mighty-force', label: 'Power', value: parts.join(' & '), positive: true })
  }
  if (meep > 0) chips.push({ key: 'meep', icon: 'game-icons:meeple-king', label: 'Meep Power', value: `+${meep}%`, positive: true })
  if (dps > 0) chips.push({ key: 'dps', icon: 'ri:sword-fill', label: 'Combat DPS', value: `+${dps}%`, positive: true })
  if (cdr > 0) chips.push({ key: 'cdr', icon: 'game-icons:sands-of-time', label: 'Cooldowns', value: `-${cdr}%`, positive: false })
  if (exp > 0) chips.push({ key: 'exp', icon: 'ph:compass-fill', label: 'Expeditions', value: `+${exp}%`, positive: true })
  if (cost > 0) chips.push({ key: 'cost', icon: 'game-icons:stone-wall', label: 'Build Cost', value: `-${cost}%`, positive: false })
  if (enemy > 0) chips.push({ key: 'enemy', icon: 'game-icons:turtle', label: 'Enemy Speed', value: `-${enemy}%`, positive: false })
  return chips
})
</script>

<template>
  <section class="jt-buffs" aria-label="Active buffs">
    <StatsSubRule label="Running" :count="buffs.length" />

    <div class="jt-buffs-list rpg-scrollbar">
      <div v-if="buffs.length === 0" class="jt-buffs-empty">
        <Icon icon="game-icons:hourglass" width="22" height="22" aria-hidden="true" />
        <span>Nothing running</span>
      </div>
      <div
        v-for="b in buffs"
        :key="b.key"
        class="jt-buff"
        :class="{
          'is-expiring': b.timer && b.timer.secondsLeft <= DRIFTER_BUFF_EXPIRY_WARN_SEC,
          'is-ranked': !!b.rankColor,
        }"
        :style="{ '--buff': b.color, '--buff-rank': b.rankColor }"
        v-tip="`${b.name} — ${b.multiplier}× ${b.label}`"
      >
        <span class="jt-buff-icon">
          <img v-if="b.image" :src="b.image" class="jt-buff-art" alt="" aria-hidden="true" />
          <Icon v-else-if="b.icon" :icon="b.icon" class="jt-buff-glyph" aria-hidden="true" />
        </span>
        <span class="jt-buff-name">{{ b.name }}</span>
        <span class="jt-buff-label">
          <span class="jt-buff-mult">{{ b.multiplier }}×</span> {{ b.label }}
        </span>
        <span v-if="b.timer" class="jt-buff-clock">
          <span class="jt-buff-sec">{{ b.timer.secondsLeft }}</span><span class="jt-buff-unit">s</span>
        </span>
        <span v-else class="jt-buff-clock jt-buff-clock--galaxy">this galaxy</span>
        <span v-if="b.timer" class="jt-buff-track" aria-hidden="true">
          <span class="jt-buff-progress" :style="{ transform: `scaleX(${b.timer.progress})` }" />
        </span>
      </div>
    </div>

    <StatsSubRule label="Total Bonus" />
    <div class="jt-tiles">
      <div v-if="totalChips.length === 0" class="jt-tiles-empty">No permanent bonuses yet</div>
      <div v-for="chip in totalChips" :key="chip.key" class="jt-tile">
        <Icon :icon="chip.icon" width="20" height="20" class="jt-tile-icon" aria-hidden="true" />
        <span class="jt-tile-body">
          <span class="jt-tile-val" :class="chip.positive ? 'is-up' : 'is-down'">{{ chip.value }}</span>
          <span class="jt-tile-lbl">{{ chip.label }}</span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.jt-buffs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  min-width: 0;
  padding: 12px 14px;
  background: #1a1008;
  border: 1px solid #2c1806;
  border-radius: 4px;
}

.jt-buffs-list {
  flex: 1 1 0;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.jt-buffs-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 4px;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: #6b5a34;
}

/* ein laufender Effekt: Glyph, Name + Uhr, Achse, Restleiste */
.jt-buff {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 5px 10px 7px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--buff);
  border-radius: 4px;
  overflow: hidden;
  cursor: help;
}
.jt-buff.is-ranked {
  border-color: var(--buff-rank);
  border-left-color: var(--buff);
}
.jt-buff.is-expiring .jt-buff-sec {
  color: #cc6050;
}

.jt-buff-icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  background: #141410;
  border-radius: 4px;
}
.jt-buff-glyph {
  width: 20px;
  height: 20px;
  color: var(--buff);
}
.jt-buff-art {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.jt-buff-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: #f0e6c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jt-buff-clock {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 900;
  color: var(--rpg-gold);
  /* zwei Stellen reserviert, sonst zuckt die Zeile beim Wechsel 10 → 9 */
  min-width: 3.2ch;
  text-align: right;
}
.jt-buff-unit {
  font-size: 11px;
  color: #8a7a58;
}
.jt-buff-clock--galaxy {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7a58;
  min-width: 0;
}
.jt-buff-label {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}
.jt-buff-mult {
  color: var(--buff);
}

.jt-buff-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: #0d0904;
}
.jt-buff-progress {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--buff);
}

/* Total-Bonus-Kacheln */
.jt-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 6px;
  flex-shrink: 0;
}
.jt-tiles-empty {
  grid-column: 1 / -1;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: #6b5a34;
}
.jt-tile {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 9px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.jt-tile-icon {
  flex-shrink: 0;
  color: #c89040;
}
.jt-tile-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.jt-tile-val {
  font-size: 17px;
  font-weight: 900;
  line-height: 1.05;
  white-space: nowrap;
}
.jt-tile-val.is-up {
  color: var(--rpg-gold);
}
.jt-tile-val.is-down {
  color: #52b830;
}
.jt-tile-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-height: 1100px) {
  .jt-buffs {
    gap: 6px;
    padding: 10px 12px;
  }
  .jt-buff {
    padding: 4px 9px 6px;
  }
}
</style>
