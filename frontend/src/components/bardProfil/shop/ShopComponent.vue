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
              <span class="buy-cost"
                >{{ formatNumber(shopStore.getTotalUpgradeCost(upgrade)) }} 🪙</span
              >
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

const ORBIT_RADIUS = 148
const START_ANGLE_DEG = 270

// Seeded starfield – stable across renders
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
   RAHMEN (CLAUDE.md Holz-Frame)
══════════════════════════════════════════════════ */
.shop-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0a0818;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 4px 20px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

/* ══════════════════════════════════════════════════
   KAUFMENGEN-SELECTOR
══════════════════════════════════════════════════ */
.selector-bar {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: #0d0b20;
  border-bottom: 2px solid #2a1f5a;
  flex-shrink: 0;
}

.selector-btn {
  flex: 1;
  padding: 4px 2px;
  font-size: 10px;
  font-weight: 900;
  color: #6058a0;
  background: #12102a;
  border: 1px solid #2a2050;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;
  letter-spacing: 0.3px;
}

.selector-btn:hover {
  background: #1c1840;
  color: #9080d0;
  border-color: #4a3880;
}

.selector-btn--active {
  background: linear-gradient(to bottom, #3a2e80, #241e60);
  border-color: #6050c0;
  color: #c0b0ff;
  box-shadow: 0 0 8px rgba(100, 70, 220, 0.4);
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

/* Sternenhimmel */
.star {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  pointer-events: none;
}

/* Bühnenfläche */
.arena-stage {
  position: relative;
  width: 420px;
  height: 420px;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   SONNE
══════════════════════════════════════════════════ */
.cosmic-sun {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
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
    0 0 30px 10px rgba(245, 160, 30, 0.55),
    0 0 70px 25px rgba(200, 80, 10, 0.3),
    0 0 120px 50px rgba(150, 40, 0, 0.15);
  animation: sun-pulse 3.2s ease-in-out infinite;
}

@keyframes sun-pulse {
  0%,
  100% {
    box-shadow:
      0 0 30px 10px rgba(245, 160, 30, 0.55),
      0 0 70px 25px rgba(200, 80, 10, 0.3),
      0 0 120px 50px rgba(150, 40, 0, 0.15);
  }
  50% {
    box-shadow:
      0 0 45px 18px rgba(245, 160, 30, 0.75),
      0 0 95px 38px rgba(200, 80, 10, 0.45),
      0 0 150px 65px rgba(150, 40, 0, 0.22);
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
  width: 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 6px 6px;
  background: #100e26;
  border: 1.5px solid #2e2860;
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
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
    transform: translateY(-7px);
  }
}

.orbit-card--can {
  border-color: #504898;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.7),
    0 0 10px rgba(100, 80, 200, 0.2);
}

.orbit-card:hover,
.orbit-card--hovered {
  border-color: #8860ff;
  box-shadow:
    0 4px 18px rgba(0, 0, 0, 0.8),
    0 0 18px rgba(140, 90, 255, 0.45);
  transform: translateY(-5px) scale(1.04);
  animation-play-state: paused;
  background: #14103a;
  z-index: 10;
}

/* Icon */
.card-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 1px 4px rgba(140, 90, 255, 0.4));
}

/* Name */
.card-name {
  font-size: 9px;
  font-weight: 900;
  color: #c8bef8;
  text-align: center;
  letter-spacing: 0.2px;
  line-height: 1.2;
}

/* Level */
.card-level {
  font-size: 9px;
  font-weight: 700;
  color: #e8c040;
}

/* Stats */
.card-stat {
  font-size: 8px;
  font-weight: 700;
  text-align: center;
}

.card-stat--cps {
  color: #50d8ff;
}

.card-stat--cpc {
  color: #90e880;
}

/* Kaufbutton */
.card-buy {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 5px;
  border-radius: 3px;
  margin-top: 2px;
  gap: 3px;
  position: relative;
  overflow: hidden;
}

.card-buy--can {
  background: linear-gradient(to bottom, #2c5a20, #1e4018);
  border: 1px solid #5ea040;
  box-shadow: 0 0 6px rgba(80, 200, 40, 0.3);
}

.card-buy--cant {
  background-color: #0e0c1e;
  background-image: linear-gradient(to right, #2a1a50, #4a2880);
  background-size: var(--prog, 0%) 100%;
  background-repeat: no-repeat;
  background-position: left center;
  border: 1px solid #2a2050;
}

.buy-cost {
  font-size: 8px;
  font-weight: 900;
  color: #d0c8f8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.card-buy--cant .buy-cost {
  color: #6050a0;
}

.buy-qty {
  font-size: 8px;
  font-weight: 700;
  color: #8878d0;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   TOOLTIP
══════════════════════════════════════════════════ */
.card-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  background: #0c0a1e;
  border: 2px solid #4a3880;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.9);
  z-index: 100;
  pointer-events: none;
}

.tooltip-title {
  font-size: 10px;
  font-weight: 900;
  color: #c0b0ff;
  margin-bottom: 5px;
  letter-spacing: 0.3px;
}

.tooltip-line {
  font-size: 9px;
  color: #8878c0;
  margin-bottom: 2px;
}

.tooltip-cost {
  font-size: 9px;
  color: #e8c040;
  margin-top: 4px;
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
   MISSIONEN (unterer Bereich)
══════════════════════════════════════════════════ */
.shop-missions {
  flex-shrink: 0;
  height: 38%;
  border-top: 2px solid #2a1f5a;
  overflow: hidden;
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
    gap: 8px;
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
