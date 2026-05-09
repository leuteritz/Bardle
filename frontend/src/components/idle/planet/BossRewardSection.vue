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
  padding: 0.75rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: rgba(5, 2, 0, 0.88);
  border-radius: 6px;
  animation: rewardReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
  width: 100%;
  flex: 1;
  min-height: 0;
  height: 100%;
}

.reward-preview--galaxy {
  background: rgba(10, 0, 20, 0.92);
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
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
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
  font-size: 0.6rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(200, 146, 42, 0.7);
  white-space: nowrap;
}

/* ── Champion ─────────────────────────────────────────────────────────────── */
.champion-block {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
  padding: 0 0.1rem;
}

.champion-portrait {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center top;
  border-radius: 4px;
  box-shadow:
    0 0 14px rgba(74, 144, 217, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.6);
}

.champion-name {
  font-size: 1rem;
  font-weight: 800;
  color: #4a90d9;
  letter-spacing: 0.04em;
  text-shadow: 0 0 12px rgba(74, 144, 217, 0.55);
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Divider ──────────────────────────────────────────────────────────────── */
.reward-divider {
  height: 1px;
  background: rgba(200, 146, 42, 0.15);
  flex-shrink: 0;
}

/* ── Slots ────────────────────────────────────────────────────────────────── */
.reward-slots {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  justify-content: center;
  gap: 0.5rem;
}

.reward-slot {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0.1rem;
  background: transparent;
  border: none;
}

/* ── Icon ─────────────────────────────────────────────────────────────────── */
.slot-icon-wrap {
  width: 40px;
  height: 40px;
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
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.slot-img--chimes {
  filter: drop-shadow(0 0 6px rgba(232, 192, 64, 0.8));
}

/* ── Label ────────────────────────────────────────────────────────────────── */
.slot-label {
  flex: 1;
  font-weight: 800;
  font-size: 1.05rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
