<template>
  <div class="reward-preview" :class="{ 'reward-preview--galaxy': isGalaxyBoss }">
    <!-- Header -->
    <div class="reward-header">
      <span class="reward-header-line" />
      <span class="reward-header-text">Belohnungen</span>
      <span class="reward-header-line" />
    </div>

    <!-- Champion -->
    <div v-if="homePlanetChampion" class="champion-block">
      <img
        v-if="homePlanetChampionImage"
        :src="homePlanetChampionImage"
        :alt="homePlanetChampion"
        class="champion-portrait"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <span class="champion-name">{{ homePlanetChampion }}</span>
      <span class="champion-badge">✦ Champion</span>
    </div>

    <!-- Slots -->
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
            class="slot-img"
          />
          <img
            v-else
            src="/img/BardAbilities/BardChime.png"
            alt="Chimes"
            class="slot-img slot-img--chimes"
          />
        </div>
        <div class="slot-body">
          <span class="slot-type-label">{{
            slot.type === 'material' ? 'Material' : 'Chimes'
          }}</span>
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
  padding: 0.6rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  animation: rewardReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

@keyframes rewardReveal {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ── Header ─────────────────────────────────────────────────────────────── */
.reward-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.reward-header-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(200, 146, 42, 0.35));
}
.reward-header-line:last-child {
  background: linear-gradient(to left, transparent, rgba(200, 146, 42, 0.35));
}

.reward-header-text {
  font-size: 0.58rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(200, 146, 42, 0.7);
  white-space: nowrap;
}

/* ── Champion Block ──────────────────────────────────────────────────────── */
.champion-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.55rem 0.4rem 0.5rem;
  background: rgba(20, 40, 100, 0.12);
  border-radius: 5px;
  border: 1px solid rgba(60, 100, 200, 0.2);
}

.champion-portrait {
  width: 60px;
  height: 60px;
  object-fit: cover;
  object-position: center top;
  border-radius: 4px;
  box-shadow:
    0 0 14px rgba(74, 144, 217, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.6);
}

.champion-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: #4a90d9;
  letter-spacing: 0.04em;
  text-shadow: 0 0 12px rgba(74, 144, 217, 0.55);
  text-align: center;
  line-height: 1;
}

.champion-badge {
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(74, 144, 217, 0.55);
  text-transform: uppercase;
}

/* ── Slots ───────────────────────────────────────────────────────────────── */
.reward-slots {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.reward-slot {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.5rem;
  background: rgba(200, 146, 42, 0.04);
  border: 1px solid rgba(100, 60, 10, 0.35);
  border-radius: 4px;
  transition: border-color 0.2s;
}

.reward-slot--material {
  background: rgba(120, 40, 180, 0.06);
  border-color: rgba(130, 50, 190, 0.35);
}

.reward-slot--galaxy.reward-slot--material {
  border-color: rgba(170, 50, 240, 0.4);
}

.slot-icon-wrap {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 5, 0, 0.7);
  border-radius: 3px;
  border: 1px solid rgba(80, 50, 10, 0.4);
}

.reward-slot--material .slot-icon-wrap {
  border-color: rgba(120, 50, 180, 0.4);
}

.slot-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.slot-img--chimes {
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.7));
}

.slot-body {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  flex: 1;
  min-width: 0;
}

.slot-type-label {
  font-size: 0.52rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(180, 160, 120, 0.45);
}

.slot-name {
  font-weight: 700;
  font-size: 0.82rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-chimes-val {
  color: #e8c040;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
}

.slot-guaranteed {
  font-size: 0.75rem;
  font-weight: 900;
  color: #52b830;
  flex-shrink: 0;
  text-shadow: 0 0 5px rgba(82, 184, 48, 0.5);
}

/* ── Rarity ──────────────────────────────────────────────────────────────── */
.rarity--common {
  color: #aaaaaa;
}
.rarity--uncommon {
  color: #1eff00;
}
.rarity--rare {
  color: #0070dd;
}
.rarity--epic {
  color: #a335ee;
}
</style>
