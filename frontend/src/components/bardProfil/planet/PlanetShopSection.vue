<!-- frontend/src/components/idle/bottom/PlanetShopSection.vue -->
<template>
  <section class="planet-shop-section">
    <h3 class="planet-shop-title">🪐 Planeten</h3>

    <div class="planet-shop-grid">
      <div
        v-for="planet in planetShopStore.planets"
        :key="planet.id"
        class="planet-shop-card"
        :class="{
          'planet-shop-card--owned': planet.level > 0,
          'planet-shop-card--locked': !planetShopStore.canAfford(planet.id) && planet.level === 0,
        }"
        :style="{ '--card-accent': planet.color }"
      >
        <!-- Planeten-Bild -->
        <div class="planet-shop-img-wrap">
          <img :src="planet.icon" :alt="planet.name" class="planet-shop-img" loading="lazy" />
          <span v-if="planet.level > 0" class="planet-level-badge">Lv.{{ planet.level }}</span>
        </div>

        <!-- Info -->
        <div class="planet-shop-info">
          <div class="planet-shop-name">{{ planet.name }}</div>
          <div class="planet-shop-desc">{{ planet.description }}</div>

          <!-- Bonus-Anzeige -->
          <div class="planet-shop-bonus">
            <span class="planet-bonus-icon">{{ bonusIcons[planet.bonusType] }}</span>
            <span v-if="planet.level > 0" class="planet-bonus-value">
              {{ currentBonusLabel(planet) }}
            </span>
            <span v-else class="planet-bonus-preview">
              {{ previewBonusLabel(planet) }} pro Stufe
            </span>
          </div>
        </div>

        <!-- Kauf-Button -->
        <button
          class="planet-buy-btn"
          :disabled="!planetShopStore.canAfford(planet.id)"
          @click="buy(planet.id)"
        >
          <span class="planet-buy-cost">
            🔔 {{ formatNumber(planetShopStore.getCost(planet.id)) }}
          </span>
          <span class="planet-buy-label">
            {{ planet.level === 0 ? 'Kaufen' : 'Aufwerten' }}
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { usePlanetShopStore } from '../../../stores/planetShopStore'
import type { ShopPlanet, PlanetBonus } from '../../../stores/planetShopStore'

export default defineComponent({
  name: 'PlanetShopSection',
  setup() {
    const planetShopStore = usePlanetShopStore()

    const bonusIcons: Record<PlanetBonus, string> = {
      chimes_per_second: '🎵',
      chimes_per_click: '👆',
      meep_cost_reduction: '💰',
      cps_multiplier: '✨',
    }

    function formatNumber(n: number): string {
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
      if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
      return n.toString()
    }

    function currentBonusLabel(planet: ShopPlanet): string {
      switch (planet.bonusType) {
        case 'chimes_per_second':
          return `+${planet.bonusPerLevel * planet.level} CPS`
        case 'chimes_per_click':
          return `+${planet.bonusPerLevel * planet.level} CPC`
        case 'meep_cost_reduction':
          return `-${Math.round(planet.bonusPerLevel * planet.level * 100)} % Meep-Kosten`
        case 'cps_multiplier':
          return `×${(1 + planet.bonusPerLevel * planet.level).toFixed(2)} CPS`
      }
    }

    function previewBonusLabel(planet: ShopPlanet): string {
      switch (planet.bonusType) {
        case 'chimes_per_second':
          return `+${planet.bonusPerLevel} CPS`
        case 'chimes_per_click':
          return `+${planet.bonusPerLevel} CPC`
        case 'meep_cost_reduction':
          return `-${Math.round(planet.bonusPerLevel * 100)} % Meep`
        case 'cps_multiplier':
          return `+${Math.round(planet.bonusPerLevel * 100)} % CPS`
      }
    }

    function buy(planetId: string) {
      planetShopStore.buyPlanet(planetId)
    }

    return { planetShopStore, bonusIcons, formatNumber, currentBonusLabel, previewBonusLabel, buy }
  },
})
</script>

<style scoped>
.planet-shop-section {
  padding: 0.75rem 0.5rem;
}

.planet-shop-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #e8c040;
  margin-bottom: 0.6rem;
  letter-spacing: 0.04em;
}

.planet-shop-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ── Card ─────────────────────────────────────────────────────────────────── */
.planet-shop-card {
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid oklch(from var(--card-accent, #888) l c h / 0.3);
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.planet-shop-card--owned {
  background: oklch(from var(--card-accent, #888) 0.15 0.03 h / 0.15);
  border-color: oklch(from var(--card-accent, #888) l c h / 0.55);
}

.planet-shop-card--locked {
  opacity: 0.55;
}

/* ── Bild ─────────────────────────────────────────────────────────────────── */
.planet-shop-img-wrap {
  position: relative;
  width: 48px;
  height: 48px;
}

.planet-shop-img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--card-accent, #888);
  box-shadow: 0 0 8px oklch(from var(--card-accent, #888) l c h / 0.5);
  display: block;
}

.planet-level-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid var(--card-accent, #888);
  border-radius: 10px;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 4px;
  color: var(--card-accent, #ccc);
  white-space: nowrap;
}

/* ── Info ─────────────────────────────────────────────────────────────────── */
.planet-shop-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.planet-shop-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #f0f0f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.planet-shop-desc {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.planet-shop-bonus {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  margin-top: 0.1rem;
}

.planet-bonus-icon {
  font-size: 0.75rem;
}

.planet-bonus-value {
  color: var(--card-accent, #e8c040);
  font-weight: 600;
}

.planet-bonus-preview {
  color: rgba(255, 255, 255, 0.4);
}

/* ── Kauf-Button ──────────────────────────────────────────────────────────── */
.planet-buy-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid oklch(from var(--card-accent, #888) l c h / 0.4);
  border-radius: 6px;
  padding: 0.35rem 0.55rem;
  cursor: pointer;
  min-width: 70px;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;
  color: inherit;
}

.planet-buy-btn:hover:not(:disabled) {
  background: oklch(from var(--card-accent, #888) 0.2 0.04 h / 0.25);
  border-color: var(--card-accent, #888);
}

.planet-buy-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.planet-buy-cost {
  font-size: 0.72rem;
  font-weight: 700;
  color: #e8c040;
  white-space: nowrap;
}

.planet-buy-label {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}
</style>
