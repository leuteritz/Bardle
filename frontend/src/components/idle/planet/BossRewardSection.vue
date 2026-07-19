<template>
  <div class="reward-card" :class="{ 'reward-card--galaxy': isGalaxyBoss }">
    <span class="reward-eyebrow">Loot · This Boss</span>

    <div class="reward-chips">
      <!-- Champion zuerst — die Hauptbelohnung -->
      <span v-if="homePlanetChampion" class="reward-champion">
        <img
          v-if="homePlanetChampionImage"
          :src="homePlanetChampionImage"
          :alt="homePlanetChampion"
          class="reward-champion-portrait"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <span class="reward-champion-text">
          <span class="reward-champion-eyebrow">Champion</span>
          <span class="reward-champion-name">{{ homePlanetChampion }}</span>
        </span>
      </span>

      <span v-if="totalChimes > 0" class="reward-chip reward-chip--chimes">
        <img src="/img/BardAbilities/BardChime.png" alt="Chimes" class="reward-chip-icon" />
        {{ totalChimes }}
      </span>

      <span
        v-for="entry in stackedMaterials"
        :key="entry.material.id"
        class="reward-chip"
        :class="`rarity--${entry.material.rarity}`"
      >
        <img :src="entry.material.image" :alt="entry.material.name" class="reward-chip-icon" />
        {{ entry.material.name }}<template v-if="entry.count > 1"> ×{{ entry.count }}</template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MATERIALS } from '@/config/materials'
import { usePlanetBossStore } from '@/stores/planetBossStore'

const bossStore = usePlanetBossStore()

const activeBoss = computed(() => bossStore.activeBoss)
const isGalaxyBoss = computed(() => activeBoss.value?.isGalaxyBoss ?? false)
const rewardSlots = computed(() => activeBoss.value?.rewardSlots ?? [])
const homePlanetChampion = computed(() => activeBoss.value?.homePlanetChampion ?? null)
const homePlanetChampionImage = computed(() => {
  const name = homePlanetChampion.value
  if (!name) return null
  return name === 'Bard' ? '/img/BardAbilities/Bard.png' : `/img/champion/${name}.jpg`
})

const totalChimes = computed(() =>
  rewardSlots.value.filter((s) => s.type === 'chimes').reduce((sum, s) => sum + (s.amount ?? 0), 0),
)

const stackedMaterials = computed(() => {
  const map = new Map<string, { material: (typeof MATERIALS)[number]; count: number }>()

  for (const slot of rewardSlots.value) {
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
/* ── Primärkarte — Loot des aktuellen Bosses, dominiert das Bottom-Dock ──── */
.reward-card {
  flex: 1.7;
  min-width: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0.7rem 0.95rem 0.75rem;
  border-radius: 4px;
  /* Kein backdrop-filter: müsste beim Screen-Shake jeden Frame neu blurren */
  background: rgba(17, 12, 4, 0.86);
  border: 1px solid #5c3310;
  box-shadow:
    0 6px 22px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(232, 192, 64, 0.08);
  overflow: hidden;
  animation: rewardReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
}

/* Goldene Signatur-Linie oben — markiert die Hauptkarte */
.reward-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

.reward-card--galaxy {
  border-color: #5a2478;
}

.reward-card--galaxy::before {
  background: linear-gradient(to right, #3a1050, #9040c8, #cc70ff, #a850e0, #9040c8, #3a1050);
}

@keyframes rewardReveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Eyebrow ──────────────────────────────────────────────────────────────── */
.reward-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #e8c040;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.35);
  white-space: nowrap;
}

/* kleiner Akzentbalken vor dem Eyebrow — moderne Sektionsmarke */
.reward-eyebrow::before {
  content: '';
  width: 14px;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to right, #c89040, #e8c060);
  flex-shrink: 0;
}

/* ── Chips ────────────────────────────────────────────────────────────────── */
.reward-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  min-width: 0;
}

.reward-chip {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 1.02rem;
  font-weight: 800;
  color: #d0d0d0;
  white-space: nowrap;
  line-height: 1.4;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.reward-chip--chimes {
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.55), 0 1px 3px rgba(0, 0, 0, 0.9);
}

.reward-chip-icon {
  width: 34px;
  height: 34px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7));
}

/* ── Champion — die Hauptbelohnung, episch hervorgehoben ─────────────────── */
.reward-champion {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding-right: 16px;
  margin-right: 2px;
  border-right: 1px solid rgba(74, 144, 217, 0.25);
}

.reward-champion-portrait {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center top;
  border-radius: 4px;
  border: 1px solid #82b9ff;
  box-shadow:
    0 0 18px rgba(74, 144, 217, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.8);
}

.reward-champion-text {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
}

.reward-champion-eyebrow {
  font-size: 0.52rem;
  font-weight: 900;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(130, 185, 255, 0.75);
  text-shadow: 0 0 8px rgba(74, 144, 217, 0.5);
}

.reward-champion-name {
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.05;
  white-space: nowrap;
  color: #9cc8ff;
  text-shadow:
    0 0 14px rgba(74, 144, 217, 0.55),
    0 2px 3px rgba(0, 0, 0, 0.9);
}

/* ── Rarities ─────────────────────────────────────────────────────────────── */
.rarity--common {
  color: #b8b8b8;
}
.rarity--uncommon {
  color: #1eff00;
}
.rarity--rare {
  color: #3a9aff;
}
.rarity--epic {
  color: #b45aff;
}
</style>
