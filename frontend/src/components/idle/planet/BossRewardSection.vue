<template>
  <div class="reward-preview" :class="{ 'reward-preview--galaxy': isGalaxyBoss }">
    <!-- 1. Header -->
    <div class="reward-header">
      <span class="reward-header-line" />
      <span class="reward-header-text">✦ Besiege den Champion und erhalte ✦</span>
      <span class="reward-header-line" />
    </div>

    <!-- 2. Champion ZUERST (oben) -->
    <div v-if="homePlanetChampion" class="champion-row">
      <img
        v-if="homePlanetChampionImage"
        :src="homePlanetChampionImage"
        :alt="homePlanetChampion"
        class="champion-portrait"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <span class="champion-name">{{ homePlanetChampion }}</span>
    </div>

    <!-- 3. Slots DANACH (unten) -->
    <div class="reward-slots">
      <div
        v-for="(slot, i) in orderedRewardSlots"
        :key="i"
        class="reward-slot"
        :class="{
          'reward-slot--material': slot.type === 'material',
          'reward-slot--galaxy': isGalaxyBoss,
        }"
      >
        <div class="slot-icon-wrap">
          <img
            v-if="slot.type === 'material' && slotMaterial(slot)"
            :src="slotMaterial(slot)!.image"
            :alt="slotMaterial(slot)!.name"
            class="slot-mat-img"
          />
          <img v-else src="/img/BardAbilities/BardChime.png" alt="Chimes" class="slot-chimes-img" />
        </div>
        <div class="slot-body">
          <span class="slot-type-label">
            {{ slot.type === 'material' ? 'Material' : 'Chimes' }}
          </span>
          <span
            class="slot-name"
            :class="
              slot.type === 'material' ? `rarity--${slotMaterial(slot)?.rarity}` : 'slot-chimes-val'
            "
          >
            {{ slot.type === 'material' ? slotMaterial(slot)?.name : `${slot.amount}` }}
          </span>
        </div>
        <span class="slot-guaranteed">✓</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MATERIALS } from '@/config/materials'
import type { PlanetBossRewardSlot } from '@/types'

const props = defineProps<{
  isGalaxyBoss: boolean
  rewardSlots: PlanetBossRewardSlot[]
  homePlanetChampion: string | null
  homePlanetChampionImage: string | null
}>()

const orderedRewardSlots = computed(() => {
  const chimes = props.rewardSlots.filter((s) => s.type !== 'material')
  const materials = props.rewardSlots.filter((s) => s.type === 'material')
  return [...chimes, ...materials]
})

function slotMaterial(slot: PlanetBossRewardSlot) {
  return slot.materialId ? (MATERIALS.find((m) => m.id === slot.materialId) ?? null) : null
}
</script>

<style scoped>
.reward-preview {
  border-bottom: 1px solid rgba(100, 60, 10, 0.5);
  padding: 0.75rem 0.9rem 0.75rem;
  background: rgba(0, 0, 0, 0.35);
  animation: rewardReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reward-preview--galaxy {
  border-bottom-color: rgba(120, 40, 160, 0.5);
}

@keyframes rewardReveal {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.reward-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reward-header-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(200, 146, 42, 0.5));
}
.reward-header-line:last-child {
  background: linear-gradient(to left, transparent, rgba(200, 146, 42, 0.5));
}

.reward-header-text {
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--rpg-gold, #c8922a);
  white-space: nowrap;
}

/* ── Champion (oben, mittig, groß) ───────────────────────────────────────── */
.champion-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.6rem 0.9rem 0.7rem;
  background: rgba(30, 60, 160, 0.09);
  border: 1px solid rgba(60, 100, 200, 0.22);
  border-radius: 6px;
}

.champion-portrait {
  height: 88px;
  width: auto;
  object-fit: contain;
  border-radius: 5px;
  flex-shrink: 0;
  box-shadow: 0 0 16px rgba(74, 144, 217, 0.25);
}

.champion-name {
  font-size: 1.9rem;
  font-weight: 900;
  color: var(--rpg-blue, #4a90d9);
  letter-spacing: 0.05em;
  text-shadow: 0 0 18px rgba(74, 144, 217, 0.6);
  line-height: 1;
}

/* ── Slots (unten, nebeneinander) ────────────────────────────────────────── */
.reward-slots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.reward-slot {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.65rem;
  background: rgba(200, 146, 42, 0.05);
  border: 1px solid rgba(120, 78, 32, 0.55);
  border-radius: 4px;
  box-shadow: inset 0 1px 0 rgba(200, 146, 42, 0.06);
}

.reward-slot--material {
  background: rgba(120, 40, 180, 0.07);
  border-color: rgba(140, 60, 200, 0.45);
  box-shadow: inset 0 1px 0 rgba(160, 80, 220, 0.08);
}

.reward-slot--galaxy.reward-slot--material {
  border-color: rgba(180, 60, 255, 0.5);
}

.slot-icon-wrap {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border: 1px solid rgba(120, 78, 32, 0.6);
  border-radius: 4px;
}

.reward-slot--material .slot-icon-wrap {
  border-color: rgba(140, 60, 200, 0.5);
}

.slot-mat-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.slot-chimes-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.7));
}

.slot-body {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  flex: 1;
  min-width: 0;
}

.slot-type-label {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(200, 180, 140, 0.5);
}

.slot-name {
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.2;
}

.slot-chimes-val {
  color: #e8c040;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
}

.slot-guaranteed {
  font-size: 0.9rem;
  font-weight: 900;
  color: #52b830;
  flex-shrink: 0;
  text-shadow: 0 0 6px rgba(82, 184, 48, 0.6);
}

/* ── Rarity ──────────────────────────────────────────────────────────────── */
.rarity--common {
  color: var(--rpg-rarity-common, #aaaaaa);
}
.rarity--uncommon {
  color: var(--rpg-rarity-uncommon, #1eff00);
}
.rarity--rare {
  color: var(--rpg-rarity-rare, #0070dd);
}
.rarity--epic {
  color: var(--rpg-rarity-epic, #a335ee);
}
</style>
