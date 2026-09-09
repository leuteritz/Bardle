<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useActiveBuffList } from '@/composables/ui/useActiveBuffList'
import { DRIFTER_BUFF_EXPIRY_WARN_SEC } from '@/config/constants'

/** Die beiden rechten Zonen des Kommandobands: laufende Zeiteffekte, dauerhafte Summe. */
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

  if (cps > 0)
    chips.push({
      key: 'cps',
      icon: 'game-icons:sparkles',
      label: 'Production',
      value: `+${cps}%`,
      positive: true,
    })
  if (cpc > 0)
    chips.push({
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
    chips.push({
      key: 'power',
      icon: 'game-icons:mighty-force',
      label: 'Power',
      value: parts.join(' & '),
      positive: true,
    })
  }
  if (meep > 0)
    chips.push({
      key: 'meep',
      icon: 'game-icons:meeple-king',
      label: 'Meep Power',
      value: `+${meep}%`,
      positive: true,
    })
  if (dps > 0)
    chips.push({
      key: 'dps',
      icon: 'ri:sword-fill',
      label: 'Combat DPS',
      value: `+${dps}%`,
      positive: true,
    })
  if (cdr > 0)
    chips.push({
      key: 'cdr',
      icon: 'game-icons:sands-of-time',
      label: 'Cooldowns',
      value: `-${cdr}%`,
      positive: false,
    })
  if (exp > 0)
    chips.push({
      key: 'exp',
      icon: 'ph:compass-fill',
      label: 'Expeditions',
      value: `+${exp}%`,
      positive: true,
    })
  if (cost > 0)
    chips.push({
      key: 'cost',
      icon: 'game-icons:stone-wall',
      label: 'Build Cost',
      value: `-${cost}%`,
      positive: false,
    })
  if (enemy > 0)
    chips.push({
      key: 'enemy',
      icon: 'game-icons:turtle',
      label: 'Enemy Speed',
      value: `-${enemy}%`,
      positive: false,
    })
  return chips
})
</script>

<template>
  <section class="jt-strip" aria-label="Active buffs">
    <section class="jt-strip-zone">
      <span v-ink-center class="jt-strip-lbl">
        Running <span class="jt-strip-count">{{ buffs.length }}</span>
      </span>
      <div class="jt-strip-row rpg-scrollbar">
        <span v-if="buffs.length === 0" class="jt-strip-empty">
          <Icon icon="game-icons:hourglass" width="15" height="15" aria-hidden="true" />
          Nothing running
        </span>
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
          <span class="jt-buff-text">
            <span class="jt-buff-name">{{ b.name }}</span>
            <span class="jt-buff-label">
              <span class="jt-buff-mult">{{ b.multiplier }}×</span> {{ b.label }}
            </span>
          </span>
          <span v-if="b.timer" class="jt-buff-clock">
            <span class="jt-buff-sec">{{ b.timer.secondsLeft }}</span
            ><span class="jt-buff-unit">s</span>
          </span>
          <span v-else class="jt-buff-clock jt-buff-clock--galaxy">galaxy</span>
          <span v-if="b.timer" class="jt-buff-track" aria-hidden="true">
            <span class="jt-buff-progress" :style="{ transform: `scaleX(${b.timer.progress})` }" />
          </span>
        </div>
      </div>
    </section>

    <section class="jt-strip-zone jt-strip-zone--total">
      <span v-ink-center class="jt-strip-lbl">Total Bonus</span>
      <div class="jt-strip-row rpg-scrollbar">
        <span v-if="totalChips.length === 0" class="jt-strip-empty">No permanent bonuses yet</span>
        <div v-for="chip in totalChips" :key="chip.key" class="jt-tile">
          <Icon :icon="chip.icon" width="18" height="18" class="jt-tile-icon" aria-hidden="true" />
          <span class="jt-tile-body">
            <span class="jt-tile-val" :class="chip.positive ? 'is-up' : 'is-down'">{{
              chip.value
            }}</span>
            <span class="jt-tile-lbl">{{ chip.label }}</span>
          </span>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
/* Die Kachelreihe rollt waagerecht statt umzubrechen — die Bandhöhe darf nicht am
   Inhalt hängen, sonst nimmt jeder neue Buff der Sonne darunter Durchmesser. */
.jt-strip {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  align-items: center;
  min-width: 0;
}

.jt-strip-zone {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}
.jt-strip-zone--total {
  padding-left: 16px;
  margin-left: 16px;
  border-left: 1px solid #2c1806;
}

.jt-strip-lbl {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a7a58;
}
.jt-strip-count {
  font-size: 11px;
  font-weight: 800;
  color: var(--rpg-gold);
}

.jt-strip-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding-bottom: 1px;
  overflow-x: auto;
  overflow-y: hidden;
}

.jt-strip-empty {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 0;
  font-size: 12px;
  letter-spacing: 0.05em;
  color: #6b5a34;
  white-space: nowrap;
}

/* ein laufender Effekt: Glyph, Name + Achse, Uhr, Restleiste */
.jt-buff {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  min-width: 0;
  padding: 3px 8px 5px 6px;
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
  width: 22px;
  height: 22px;
  background: #141410;
  border-radius: 4px;
}
.jt-buff-glyph {
  width: 16px;
  height: 16px;
  color: var(--buff);
}
.jt-buff-art {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.jt-buff-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.jt-buff-name {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.1;
  color: #f0e6c8;
  white-space: nowrap;
}
.jt-buff-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
}
.jt-buff-mult {
  color: var(--buff);
}

.jt-buff-clock {
  flex-shrink: 0;
  margin-left: 2px;
  font-size: 14px;
  font-weight: 900;
  color: var(--rpg-gold);
  /* zwei Stellen reserviert, sonst zuckt der Chip beim Wechsel 10 → 9 */
  min-width: 3.2ch;
  text-align: right;
}
.jt-buff-unit {
  font-size: 10px;
  color: #8a7a58;
}
.jt-buff-clock--galaxy {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7a58;
  min-width: 0;
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
.jt-tile {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  padding: 3px 8px;
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
  font-size: 13px;
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
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
}

@media (max-height: 1100px) {
  .jt-strip-zone {
    gap: 3px;
  }
  .jt-strip-zone--total {
    padding-left: 12px;
    margin-left: 12px;
  }
  .jt-strip-lbl {
    font-size: 9px;
  }
  .jt-buff {
    padding: 2px 7px 4px 5px;
  }
  .jt-buff-icon {
    width: 20px;
    height: 20px;
  }
  .jt-tile {
    padding: 2px 7px;
  }
}
</style>
