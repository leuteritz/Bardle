<template>
  <div class="next-card" :class="{ 'next-card--galaxy': nextEntry?.boss?.isGalaxyBoss }">
    <span class="next-eyebrow">
      <img src="/img/star.png" alt="★" class="next-star-icon" />
      Up Next
    </span>

    <div v-if="nextEntry?.boss" class="next-chips">
      <!-- Champion zuerst — die Hauptbelohnung -->
      <span v-if="nextEntry.boss.homePlanetChampion" class="next-champion">
        <img
          :src="championImageUrl(nextEntry.boss.homePlanetChampion)"
          :alt="nextEntry.boss.homePlanetChampion"
          class="next-champion-portrait"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <span class="next-champion-text">
          <span class="next-champion-eyebrow">Champion</span>
          <span class="next-champion-name">{{ nextEntry.boss.homePlanetChampion }}</span>
        </span>
      </span>

      <span v-if="chimesOf(nextEntry.boss) > 0" class="next-chip next-chip--chimes">
        <img src="/img/BardAbilities/BardChime.png" alt="Chimes" class="next-chip-icon" />
        {{ chimesOf(nextEntry.boss) }}
      </span>
      <span
        v-for="m in materialsOf(nextEntry.boss)"
        :key="m.material.id"
        class="next-chip"
        :class="`rarity--${m.material.rarity}`"
      >
        <img :src="m.material.image" :alt="m.material.name" class="next-chip-icon" />
        {{ m.material.name }}<template v-if="m.count > 1"> ×{{ m.count }}</template>
      </span>
    </div>

    <span v-else class="next-final">Final planet in this star</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MATERIALS } from '../../../config/materials'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { useStarGroupStore } from '../../../stores/starGroupStore'
import type { PlanetBossEvent } from '../../../types'

const bossStore = usePlanetBossStore()
const starGroupStore = useStarGroupStore()

const planetQueue = computed(() => starGroupStore.starFightPlanetQueue)
const activeIndex = computed(() => starGroupStore.starFightCurrentIndex)

// Nur der wirklich nächste Planet — und von dem nur die Belohnung
const nextEntry = computed<{ planetId: string; boss: PlanetBossEvent | null } | null>(() => {
  const planetId = planetQueue.value[activeIndex.value + 1]
  if (!planetId) return null
  return {
    planetId,
    boss: bossStore.activeBosses.find((b) => b.planetId === planetId) ?? null,
  }
})

function championImageUrl(name: string): string {
  return name === 'Bard' ? '/img/BardAbilities/Bard.png' : `/img/champion/${name}.jpg`
}

function chimesOf(boss: PlanetBossEvent): number {
  return boss.rewardSlots
    .filter((s) => s.type === 'chimes')
    .reduce((sum, s) => sum + (s.amount ?? 0), 0)
}

function materialsOf(boss: PlanetBossEvent) {
  const map = new Map<string, { material: (typeof MATERIALS)[number]; count: number }>()
  for (const slot of boss.rewardSlots) {
    if (slot.type !== 'material' || !slot.materialId) continue
    const mat = MATERIALS.find((m) => m.id === slot.materialId)
    if (!mat) continue
    const existing = map.get(slot.materialId)
    if (existing) existing.count += slot.amount ?? 1
    else map.set(slot.materialId, { material: mat, count: slot.amount ?? 1 })
  }
  return Array.from(map.values())
}

</script>

<style scoped>
/* ── Sekundärkarte — bewusst kompakter & gedimmter als die Loot-Karte ────── */
.next-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0.45rem 0.7rem 0.5rem;
  border-radius: 4px;
  /* Kein backdrop-filter: müsste beim Screen-Shake jeden Frame neu blurren */
  background: rgba(12, 8, 3, 0.72);
  border: 1px solid #3a2410;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  animation: nextReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
}

.next-card--galaxy {
  border-color: #45205c;
}

@keyframes nextReveal {
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
.next-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.54rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(200, 180, 140, 0.55);
  white-space: nowrap;
}

.next-star-icon {
  width: 10px;
  height: 10px;
  object-fit: contain;
  opacity: 0.75;
}

/* ── Chips ────────────────────────────────────────────────────────────────── */
.next-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 12px;
  min-width: 0;
}

.next-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 800;
  color: #a8a8a8;
  white-space: nowrap;
  line-height: 1.35;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.next-chip--chimes {
  color: #c8a838;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.4), 0 1px 3px rgba(0, 0, 0, 0.9);
}

.next-chip-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7));
}

/* ── Champion — die Hauptbelohnung, episch hervorgehoben ─────────────────── */
.next-champion {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  margin-right: 2px;
  border-right: 1px solid rgba(74, 144, 217, 0.2);
}

.next-champion-portrait {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center top;
  border-radius: 4px;
  border: 1px solid #5c88b8;
  box-shadow:
    0 0 10px rgba(74, 144, 217, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.8);
}

.next-champion-text {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
}

.next-champion-eyebrow {
  font-size: 0.46rem;
  font-weight: 900;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(130, 185, 255, 0.6);
}

.next-champion-name {
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.05;
  white-space: nowrap;
  color: #88b4e8;
  text-shadow:
    0 0 10px rgba(74, 144, 217, 0.4),
    0 1px 3px rgba(0, 0, 0, 0.9);
}

/* ── Letzter Planet ───────────────────────────────────────────────────────── */
.next-final {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(200, 180, 140, 0.5);
  text-transform: uppercase;
  padding: 4px 0;
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
