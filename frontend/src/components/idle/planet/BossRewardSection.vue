<template>
  <div class="loot" :class="{ 'loot--galaxy': isGalaxyBoss }">
    <!-- Eyebrow zwischen HUD-Klammerlinien — spiegelt den Bossnamen oben -->
    <div class="loot-head">
      <span class="loot-line" />
      <span class="loot-eyebrow">✦ Loot ✦</span>
      <span class="loot-line loot-line--right" />
    </div>

    <!-- Rewards als frei stehende, glühende Elemente — keine Karte -->
    <div class="loot-row">
      <!-- Champion zuerst — die Hauptbelohnung -->
      <span v-if="homePlanetChampion" class="loot-champion">
        <img
          v-if="homePlanetChampionImage"
          :src="homePlanetChampionImage"
          :alt="homePlanetChampion"
          class="loot-champion-portrait"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <span class="loot-champion-text">
          <span class="loot-champion-eyebrow">Champion</span>
          <span class="loot-champion-name">{{ homePlanetChampion }}</span>
        </span>
      </span>

      <span v-if="totalChimes > 0" class="loot-chip loot-chip--chimes">
        <img src="/img/BardAbilities/BardChime.png" alt="Chimes" class="loot-chip-icon" />
        {{ totalChimes }}
      </span>

      <span
        v-for="entry in stackedMaterials"
        :key="entry.material.id"
        class="loot-chip"
        :class="`rarity--${entry.material.rarity}`"
        :title="entry.material.name"
      >
        <img :src="entry.material.image" :alt="entry.material.name" class="loot-chip-icon" />
        {{ entry.count }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MATERIALS } from '@/config/materials'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useBattleStore } from '@/stores/battleStore'

const bossStore = usePlanetBossStore()
const battleStore = useBattleStore()

const activeBoss = computed(() => bossStore.activeBoss)
const isGalaxyBoss = computed(() => activeBoss.value?.isGalaxyBoss ?? false)
const rewardSlots = computed(() => activeBoss.value?.rewardSlots ?? [])
const homePlanetChampion = computed(() => activeBoss.value?.homePlanetChampion ?? null)
const homePlanetChampionImage = computed(() => {
  const name = homePlanetChampion.value
  if (!name) return null
  return battleStore.getChampionImage(name)
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
/* ── Loot unter dem Boss: rahmenlos, weich verschmolzen ──────────────────
   Kein hartes Panel: ein warmer Gold-Schleier läuft zu allen Seiten in den
   Planeten-Hintergrund aus und hebt die Rewards trotzdem klar hervor —
   gleiche Design-Sprache wie die Threat-Anzeige unter der HP-Leiste */
.loot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: auto;
  max-width: 100%;
  padding: 12px 38px 14px;
  background: radial-gradient(
    ellipse 100% 130% at 50% 50%,
    rgba(34, 22, 6, 0.62) 0%,
    rgba(22, 14, 4, 0.35) 45%,
    transparent 74%
  );
  animation: loot-reveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
}

/* Feine Goldlinie darunter, die zu den Rändern hin ausläuft */
.loot::after {
  content: '';
  position: absolute;
  bottom: 3px;
  left: 16%;
  right: 16%;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.5), transparent);
}

.loot--galaxy {
  background: radial-gradient(
    ellipse 100% 130% at 50% 50%,
    rgba(30, 12, 44, 0.62) 0%,
    rgba(18, 8, 28, 0.35) 45%,
    transparent 74%
  );
}

.loot--galaxy::after {
  background: linear-gradient(to right, transparent, rgba(200, 100, 255, 0.5), transparent);
}

@keyframes loot-reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Eyebrow zwischen dünnen Klammerlinien ────────────────────────────────── */
.loot-head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: min(420px, 80%);
}

.loot-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.45));
}

.loot-line--right {
  background: linear-gradient(to left, transparent, rgba(232, 192, 64, 0.45));
}

.loot-eyebrow {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #e8c040;
  white-space: nowrap;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.loot--galaxy .loot-eyebrow {
  color: #dd99ff;
  text-shadow:
    0 0 10px rgba(200, 100, 255, 0.55),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.loot--galaxy .loot-line {
  background: linear-gradient(to right, transparent, rgba(200, 100, 255, 0.45));
}

.loot--galaxy .loot-line--right {
  background: linear-gradient(to left, transparent, rgba(200, 100, 255, 0.45));
}

/* ── Reward-Reihe ─────────────────────────────────────────────────────────── */
.loot-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 22px;
  min-width: 0;
}

/* Rewards frei stehend auf der Plate — kein eigener Rahmen, Rarity färbt Text */
.loot-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 900;
  color: #e6e0d0;
  white-space: nowrap;
  line-height: 1.3;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.95);
}

.loot-chip--chimes {
  color: #ffd970;
  text-shadow:
    0 0 14px rgba(232, 192, 64, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

.loot-chip-icon {
  width: 34px;
  height: 34px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
}

/* ── Champion — die Hauptbelohnung, episch hervorgehoben ─────────────────── */
.loot-champion {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.loot-champion-portrait {
  width: 62px;
  height: 62px;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center top;
  border-radius: 4px;
  border: 1px solid #82b9ff;
  box-shadow:
    0 0 20px rgba(74, 144, 217, 0.55),
    0 3px 10px rgba(0, 0, 0, 0.85);
}

.loot-champion-text {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
}

.loot-champion-eyebrow {
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(130, 185, 255, 0.8);
  text-shadow: 0 0 8px rgba(74, 144, 217, 0.5), 0 1px 2px rgba(0, 0, 0, 0.9);
}

.loot-champion-name {
  font-size: 1.55rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.05;
  white-space: nowrap;
  color: #9cc8ff;
  text-shadow:
    0 0 16px rgba(74, 144, 217, 0.6),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

/* ── Rarities — färben den Reward-Text ───────────────────────────────────── */
.rarity--common {
  color: #c8c8c8;
}
.rarity--uncommon {
  color: #4dff35;
  text-shadow: 0 0 12px rgba(30, 255, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.95);
}
.rarity--rare {
  color: #5aabff;
  text-shadow: 0 0 12px rgba(58, 154, 255, 0.45), 0 2px 4px rgba(0, 0, 0, 0.95);
}
.rarity--epic {
  color: #c37aff;
  text-shadow: 0 0 12px rgba(180, 90, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.95);
}

@media (prefers-reduced-motion: reduce) {
  .loot {
    animation: none;
  }
}
</style>
