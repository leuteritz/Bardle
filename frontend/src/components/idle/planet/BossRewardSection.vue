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
/* ── Glaskarte ────────────────────────────────────────────────────────────── */
.reward-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0.5rem 0.75rem 0.55rem;
  border-radius: 10px;
  /* Kein backdrop-filter: müsste beim Screen-Shake jeden Frame neu blurren */
  background: rgba(12, 6, 0, 0.74);
  border: 1px solid rgba(232, 192, 64, 0.16);
  animation: rewardReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
}

.reward-card--galaxy {
  border-color: rgba(180, 40, 255, 0.22);
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
  font-size: 0.58rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(232, 192, 64, 0.7);
  white-space: nowrap;
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
  gap: 8px;
  font-size: 0.92rem;
  font-weight: 800;
  color: #c8c8c8;
  white-space: nowrap;
  line-height: 1.4;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.reward-chip--chimes {
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.55), 0 1px 3px rgba(0, 0, 0, 0.9);
}

.reward-chip-icon {
  width: 30px;
  height: 30px;
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
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center top;
  border-radius: 8px;
  border: 1px solid rgba(130, 185, 255, 0.45);
  box-shadow:
    0 0 16px rgba(74, 144, 217, 0.45),
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
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.05;
  white-space: nowrap;
  background: linear-gradient(
    105deg,
    #9cc8ff 0%,
    #4a90d9 40%,
    #d8ecff 50%,
    #4a90d9 60%,
    #9cc8ff 100%
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: champ-shimmer 3s linear infinite;
  filter: drop-shadow(0 0 12px rgba(74, 144, 217, 0.5)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.9));
}

@keyframes champ-shimmer {
  from {
    background-position: 220% 0;
  }
  to {
    background-position: 0% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reward-champion-name {
    animation: none;
  }
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
