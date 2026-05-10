<template>
  <div class="shop-frame">
    <!-- ── Kaufmengen-Selector ── -->
    <div class="selector-bar">
      <button
        v-for="opt in buyOptions"
        :key="String(opt.value)"
        class="selector-btn"
        :class="{ 'selector-btn--active': shopStore.buyAmount === opt.value }"
        @click="shopStore.setBuyAmount(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- ── Kosmische Arena ── -->
    <div class="cosmic-arena">
      <!-- Sternenhimmel -->
      <span
        v-for="star in stars"
        :key="star.id"
        class="star"
        :style="{
          left: star.x + '%',
          top: star.y + '%',
          width: star.size + 'px',
          height: star.size + 'px',
          opacity: star.opacity,
        }"
      />

      <!-- Bühnenfläche: Sonne + Orbit-Karten -->
      <div class="arena-stage">
        <!-- Sonne -->
        <div class="cosmic-sun" />

        <!-- Orbit-Positionen -->
        <div
          v-for="(upgrade, index) in shopStore.shopUpgrades"
          :key="upgrade.id"
          class="orbit-pos"
          :style="getOrbitPos(index)"
        >
          <div
            class="orbit-card"
            :class="{
              'orbit-card--can': shopStore.canAffordUpgrade(upgrade),
              'orbit-card--hovered': hoveredId === upgrade.id,
            }"
            :style="{ '--idx': index }"
            @mouseenter="hoveredId = upgrade.id"
            @mouseleave="hoveredId = null"
            @click="shopStore.buyUpgrade(upgrade.id)"
          >
            <!-- Icon -->
            <img :src="upgrade.icon" :alt="upgrade.name" class="card-icon" />

            <!-- Name + Level -->
            <div class="card-name">{{ upgrade.name }}</div>
            <div class="card-level">Lv. {{ upgrade.level }}</div>

            <!-- CPS/CPC wenn aktiv -->
            <div v-if="upgrade.baseCPS && upgrade.level > 0" class="card-stat card-stat--cps">
              +{{ formatNumber(upgrade.baseCPS * upgrade.level) }} CpS
            </div>
            <div v-if="upgrade.baseCPC && upgrade.level > 0" class="card-stat card-stat--cpc">
              +{{ formatNumber(upgrade.baseCPC * upgrade.level) }} CpC
            </div>

            <!-- Kaufbutton -->
            <div
              class="card-buy"
              :class="shopStore.canAffordUpgrade(upgrade) ? 'card-buy--can' : 'card-buy--cant'"
              :style="
                !shopStore.canAffordUpgrade(upgrade) ? { '--prog': getProgress(upgrade) + '%' } : {}
              "
            >
              <span class="buy-cost">
                {{ formatNumber(shopStore.getTotalUpgradeCost(upgrade)) }} 🪙
              </span>
              <span class="buy-qty">×{{ shopStore.getActualBuyAmount(upgrade) || 1 }}</span>
            </div>

            <!-- Tooltip -->
            <Transition name="tooltip-fade">
              <div v-if="hoveredId === upgrade.id" class="card-tooltip">
                <div class="tooltip-title">{{ upgrade.name }}</div>
                <div v-if="upgrade.baseCPS" class="tooltip-line">
                  +{{ upgrade.baseCPS }} CpS pro Stufe
                </div>
                <div v-if="upgrade.baseCPC" class="tooltip-line">
                  +{{ upgrade.baseCPC }} CpC pro Stufe
                </div>
                <div class="tooltip-cost">
                  Kosten: {{ formatNumber(shopStore.getTotalUpgradeCost(upgrade)) }} 🪙
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useShopStore } from '@/stores/shopStore'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/config/numberFormat'
import type { ShopUpgrade } from '@/types'

const ORBIT_RADIUS = 240
const START_ANGLE_DEG = 270

const stars = Array.from({ length: 62 }, (_, i) => {
  let s = (i * 1664525 + 1013904223) & 0x7fffffff
  s = (s * 1664525 + 1013904223) & 0x7fffffff
  const s2 = (s * 1664525 + 1013904223) & 0x7fffffff
  const s3 = (s2 * 1664525 + 1013904223) & 0x7fffffff
  return {
    id: i,
    x: (s % 1000) / 10,
    y: (s2 % 1000) / 10,
    size: 1 + (s3 % 3),
    opacity: (3 + (s % 6)) / 10,
  }
})

export default defineComponent({
  name: 'ShopComponent',

  setup() {
    const shopStore = useShopStore()
    const gameStore = useGameStore()
    const hoveredId = ref<string | null>(null)

    const buyOptions: { label: string; value: number | 'max' }[] = [
      { label: '1×', value: 1 },
      { label: '5×', value: 5 },
      { label: '10×', value: 10 },
      { label: '50×', value: 50 },
      { label: '100×', value: 100 },
      { label: 'Max', value: 'max' },
    ]

    const getOrbitPos = (index: number) => {
      const angleDeg = START_ANGLE_DEG + index * 60
      const rad = (angleDeg * Math.PI) / 180
      const x = Math.cos(rad) * ORBIT_RADIUS
      const y = Math.sin(rad) * ORBIT_RADIUS
      return {
        left: `calc(50% + ${Math.round(x)}px)`,
        top: `calc(50% + ${Math.round(y)}px)`,
      }
    }

    const getProgress = (upgrade: ShopUpgrade): number => {
      const cost = shopStore.getTotalUpgradeCost(upgrade)
      if (cost <= 0) return 100
      return Math.min(100, Math.floor((gameStore.chimes / cost) * 100))
    }

    return { shopStore, hoveredId, stars, buyOptions, getOrbitPos, getProgress, formatNumber }
  },
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   RAHMEN
══════════════════════════════════════════════════ */
.shop-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--rpg-bg-deep);
  border: 4px solid var(--rpg-wood);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 4px 20px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

/* ══════════════════════════════════════════════════
   KAUFMENGEN-SELECTOR
══════════════════════════════════════════════════ */
.selector-bar {
  display: flex;
  gap: 5px;
  padding: 8px 10px;
  background: var(--rpg-bg-dark);
  border-bottom: 2px solid var(--rpg-wood-mid);
  flex-shrink: 0;
}

.selector-btn {
  flex: 1;
  padding: 7px 2px;
  font-size: 13px;
  font-weight: 900;
  color: var(--rpg-gold-dim);
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-inner);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;
  letter-spacing: 0.3px;
}

.selector-btn:hover {
  background: var(--rpg-bg-hover);
  color: var(--rpg-gold);
  border-color: var(--rpg-wood-mid);
}

.selector-btn--active {
  background: var(--rpg-bg-selected);
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold-bright);
  box-shadow: 0 0 8px rgba(200, 144, 64, 0.35);
}

/* ══════════════════════════════════════════════════
   KOSMISCHE ARENA
══════════════════════════════════════════════════ */
.cosmic-arena {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  pointer-events: none;
}

.arena-stage {
  position: relative;
  width: 640px;
  height: 640px;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   SONNE
══════════════════════════════════════════════════ */
.cosmic-sun {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 35%,
    #fffce0 0%,
    #ffd060 20%,
    #f5a020 45%,
    #e06808 70%,
    #8b2800 100%
  );
  box-shadow:
    0 0 55px 22px rgba(245, 160, 30, 0.8),
    0 0 120px 50px rgba(200, 80, 10, 0.55),
    0 0 200px 90px rgba(150, 40, 0, 0.32),
    0 0 300px 130px rgba(120, 30, 0, 0.16);
  animation: sun-pulse 3.2s ease-in-out infinite;
}

@keyframes sun-pulse {
  0%,
  100% {
    box-shadow:
      0 0 55px 22px rgba(245, 160, 30, 0.8),
      0 0 120px 50px rgba(200, 80, 10, 0.55),
      0 0 200px 90px rgba(150, 40, 0, 0.32),
      0 0 300px 130px rgba(120, 30, 0, 0.16);
  }
  50% {
    box-shadow:
      0 0 80px 36px rgba(255, 210, 50, 1),
      0 0 170px 75px rgba(230, 100, 10, 0.78),
      0 0 280px 125px rgba(180, 60, 0, 0.48),
      0 0 400px 175px rgba(140, 40, 0, 0.22);
  }
}

/* ══════════════════════════════════════════════════
   ORBIT-POSITIONIERUNG
══════════════════════════════════════════════════ */
.orbit-pos {
  position: absolute;
  transform: translate(-50%, -50%);
}

/* ══════════════════════════════════════════════════
   ORBIT-KARTE
══════════════════════════════════════════════════ */
.orbit-card {
  width: 128px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 13px 10px 10px;
  background: var(--rpg-bg-dark);
  border: 2px solid var(--rpg-wood-inner);
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.7);
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
  animation: float 3.8s ease-in-out infinite;
  animation-delay: calc(var(--idx, 0) * 0.55s);
  position: relative;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* Grüner Rand = kaufbar */
.orbit-card--can {
  border-color: var(--rpg-green-border);
  box-shadow:
    0 2px 14px rgba(0, 0, 0, 0.7),
    0 0 18px rgba(78, 192, 64, 0.35);
}

/* Hover — Gold statt Lila */
.orbit-card:hover,
.orbit-card--hovered {
  border-color: var(--rpg-gold);
  box-shadow:
    0 4px 22px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(200, 144, 64, 0.45);
  transform: translateY(-6px) scale(1.05);
  animation-play-state: paused;
  background: var(--rpg-bg-hover);
  z-index: 10;
}

/* Icon — kein pixelated, kein lila Drop-Shadow */
.card-icon {
  width: 52px;
  height: 52px;
  object-fit: contain;
  image-rendering: auto;
  filter: drop-shadow(0 2px 5px rgba(200, 144, 64, 0.4));
}

/* Name */
.card-name {
  font-size: 13px;
  font-weight: 900;
  color: var(--rpg-text);
  text-align: center;
  letter-spacing: 0.2px;
  line-height: 1.2;
}

/* Level */
.card-level {
  font-size: 12px;
  font-weight: 700;
  color: var(--rpg-gold);
}

/* Stats */
.card-stat {
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.card-stat--cps {
  color: var(--rpg-orange);
}

.card-stat--cpc {
  color: var(--rpg-green-light);
}

/* ══════════════════════════════════════════════════
   KAUFBUTTON
══════════════════════════════════════════════════ */
.card-buy {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-radius: 5px;
  margin-top: 3px;
  gap: 4px;
  position: relative;
  overflow: hidden;
}

/* GRÜN: genug Chimes */
.card-buy--can {
  background: linear-gradient(to bottom, var(--rpg-green-top), var(--rpg-green-bottom));
  border: 2px solid var(--rpg-green-border);
  box-shadow:
    0 0 10px rgba(60, 220, 40, 0.45),
    inset 0 1px 0 rgba(100, 255, 60, 0.15);
}

.card-buy--can .buy-cost {
  color: #a0ffa0;
  font-weight: 900;
}

.card-buy--can .buy-qty {
  color: var(--rpg-green-light);
  font-weight: 700;
}

/* ROT: zu wenig Chimes (mit Fortschrittsbalken) */
.card-buy--cant {
  background-color: var(--rpg-bg-red-subtle);
  background-image: linear-gradient(to right, #502010, #803020);
  background-size: var(--prog, 0%) 100%;
  background-repeat: no-repeat;
  background-position: left center;
  border: 2px solid var(--rpg-red);
  box-shadow: 0 0 8px rgba(180, 40, 40, 0.3);
}

.card-buy--cant .buy-cost {
  color: var(--rpg-red);
  font-weight: 900;
}

.card-buy--cant .buy-qty {
  color: #904040;
  font-weight: 700;
}

.buy-cost {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.buy-qty {
  font-size: 11px;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   TOOLTIP
══════════════════════════════════════════════════ */
.card-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  width: 170px;
  background: var(--rpg-bg-tooltip);
  border: 2px solid var(--rpg-wood-mid);
  border-radius: 6px;
  padding: 10px 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.9);
  z-index: 100;
  pointer-events: none;
}

.tooltip-title {
  font-size: 13px;
  font-weight: 900;
  color: var(--rpg-gold-bright);
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.tooltip-line {
  font-size: 11px;
  color: var(--rpg-text-muted);
  margin-bottom: 3px;
}

.tooltip-cost {
  font-size: 11px;
  color: var(--rpg-gold);
  margin-top: 6px;
  font-weight: 700;
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.12s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}

/* ══════════════════════════════════════════════════
   REDUCED MOTION
══════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .cosmic-sun,
  .orbit-card {
    animation: none;
  }
}

/* ══════════════════════════════════════════════════
   MOBILE: Karten untereinander statt Kreis
══════════════════════════════════════════════════ */
@media (max-width: 560px) {
  .cosmic-arena {
    overflow-y: auto;
    align-items: flex-start;
    padding: 8px;
  }

  .arena-stage {
    width: 100%;
    height: auto;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .cosmic-sun {
    display: none;
  }

  .orbit-pos {
    position: static;
    transform: none;
  }

  .orbit-card {
    width: 100%;
    animation: none;
  }
}
</style>
