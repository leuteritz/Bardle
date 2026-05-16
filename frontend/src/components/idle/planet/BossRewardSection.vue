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
    </div>

    <div v-if="homePlanetChampion" class="reward-divider" />

    <!-- Slots -->
    <div class="reward-slots">
      <!-- Chimes zusammengefasst -->
      <div v-if="totalChimes > 0" class="reward-slot">
        <div class="slot-icon-wrap">
          <img
            src="/img/BardAbilities/BardChime.png"
            alt="Chimes"
            class="slot-img slot-img--chimes"
          />
        </div>
        <span class="slot-label slot-chimes-val">{{ totalChimes }}</span>
      </div>

      <!-- Materials gestackt (gleiche materialId zusammengefasst) -->
      <div v-for="entry in stackedMaterials" :key="entry.material.id" class="reward-slot">
        <div class="slot-icon-wrap slot-icon-wrap--material">
          <img :src="entry.material.image" :alt="entry.material.name" class="slot-img" />
        </div>
        <span class="slot-label" :class="`rarity--${entry.material.rarity}`">
          {{ entry.material.name }}
        </span>
        <span v-if="entry.count > 1" class="slot-count">×{{ entry.count }}</span>
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

const totalChimes = computed(() =>
  props.rewardSlots.filter((s) => s.type === 'chimes').reduce((sum, s) => sum + (s.amount ?? 0), 0),
)

const stackedMaterials = computed(() => {
  const map = new Map<string, { material: (typeof MATERIALS)[number]; count: number }>()

  for (const slot of props.rewardSlots) {
    if (slot.type !== 'material' || !slot.materialId) continue
    const mat = MATERIALS.find((m) => m.id === slot.materialId)
    if (!mat) continue
    const existing = map.get(slot.materialId)
    if (existing) {
      existing.count += slot.amount ?? 1
    } else {
      map.set(slot.materialId, { material: mat, count: slot.amount ?? 1 })
    }
  }

  return Array.from(map.values())
})
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────────────────────── */
.reward-preview {
  padding: 0.65rem 1rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.5rem;
  background: rgba(5, 2, 0, 0.55);
  border-radius: 5px;
  border-top: 1px solid rgba(90, 45, 10, 0.35);
  animation: rewardReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
  width: 100%;
}

.reward-preview--galaxy {
  background: rgba(10, 0, 20, 0.58);
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

/* ── Header ───────────────────────────────────────────────────────────────── */
.reward-header {
  display: none;
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
  font-size: 0.75rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(200, 146, 42, 0.8);
  white-space: nowrap;
}

/* ── Champion ─────────────────────────────────────────────────────────────── */
.champion-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
  min-width: 70px;
}

.champion-portrait {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center top;
  border-radius: 4px;
  box-shadow:
    0 0 18px rgba(74, 144, 217, 0.4),
    0 2px 10px rgba(0, 0, 0, 0.7);
}

.champion-name {
  font-size: 1.2rem;
  font-weight: 800;
  color: #4a90d9;
  letter-spacing: 0.04em;
  text-shadow: 0 0 14px rgba(74, 144, 217, 0.6);
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Divider ──────────────────────────────────────────────────────────────── */
.reward-divider {
  width: 1px;
  height: 48px;
  background: rgba(200, 146, 42, 0.2);
  flex-shrink: 0;
}

/* ── Slots ────────────────────────────────────────────────────────────────── */
.reward-slots {
  display: flex;
  flex-direction: row;
  flex: 1;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.reward-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
}

/* ── Icon ─────────────────────────────────────────────────────────────────── */
.slot-icon-wrap {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 5, 0, 0.5);
  border-radius: 4px;
}

.slot-icon-wrap--material {
  background: rgba(20, 5, 35, 0.5);
}

.slot-img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.slot-img--chimes {
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.8));
}

/* ── Label ────────────────────────────────────────────────────────────────── */
.slot-label {
  font-weight: 800;
  font-size: 0.85rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.slot-chimes-val {
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.6);
}

/* ── Count Badge (×2, ×3 …) ──────────────────────────────────────────────── */
.slot-count {
  font-size: 0.78rem;
  font-weight: 700;
  color: rgba(200, 180, 120, 0.65);
  flex-shrink: 0;
  letter-spacing: 0.03em;
}

/* ── Rarities ─────────────────────────────────────────────────────────────── */
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
