<template>
  <div class="tier-unlock">
    <div class="tier-gold-line" aria-hidden="true" />

    <div class="tier-head">
      <Icon icon="game-icons:locked-fortress" class="tier-lock-icon" width="22" height="22" />
      <span class="tier-head-title">Tier {{ galaxyStore.nextTier }} Locked</span>
    </div>

    <!-- Current → next tier + the star level the next tier introduces -->
    <div class="tier-progress-row">
      <span class="tier-pill tier-pill--done">Tier {{ galaxyStore.currentTier }}</span>
      <span class="tier-arrow">→</span>
      <span class="tier-pill tier-pill--next">Tier {{ galaxyStore.nextTier }}</span>
      <span class="tier-star" :style="{ color: nextStarTrait.color }" :title="nextStarTrait.name">
        <Icon :icon="nextStarTrait.icon" width="16" height="16" />
        ★{{ nextStarLevel }} {{ nextStarTrait.name }}
      </span>
    </div>

    <div class="tier-cost-label">Unlock Cost</div>

    <!-- Cost badges: owned / required, with a difference tooltip -->
    <div class="tier-cost-row">
      <span
        class="tier-cost-badge"
        :class="hasChimes ? 'tier-cost-badge--ok' : 'tier-cost-badge--missing'"
        :title="hasChimes ? 'Enough Chimes' : `Need ${formatNumber(chimesShort)} more Chimes`"
      >
        <img src="/img/BardAbilities/BardChime.png" alt="Chimes" class="tier-cost-img" />
        {{ formatNumber(gameStore.chimes) }}/{{ formatNumber(cost.chimes) }}
      </span>

      <span
        v-for="m in materialRows"
        :key="m.id"
        class="tier-cost-badge"
        :class="m.ok ? 'tier-cost-badge--ok' : 'tier-cost-badge--missing'"
        :title="m.ok ? `Enough ${m.name}` : `Need ${formatNumber(m.short)} more ${m.name}`"
      >
        <img :src="m.image" :alt="m.name" class="tier-cost-img" />
        {{ formatNumber(m.owned) }}/{{ formatNumber(m.required) }}
      </span>
    </div>

    <button
      class="tier-unlock-btn"
      :class="{ 'tier-unlock-btn--ready': canAfford }"
      :disabled="!canAfford"
      @click="onUnlock"
    >
      <Icon icon="game-icons:star-gate" width="18" height="18" />
      Unlock Tier {{ galaxyStore.nextTier }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '../../../stores/galaxyStore'
import { useGameStore } from '../../../stores/gameStore'
import { useInventoryStore } from '../../../stores/inventoryStore'
import { MATERIALS } from '../../../config/materials'
import { COSMIC_TRAIT_BY_STAR, COSMIC_TRAITS } from '../../../config/cosmicTraits'
import { starLevelForGalaxy } from '../../../stores/galaxyStore'
import { formatNumber } from '../../../config/numberFormat'

export default defineComponent({
  name: 'TierUnlockPanel',
  components: { Icon },
  setup() {
    const galaxyStore = useGalaxyStore()
    const gameStore = useGameStore()
    const inventoryStore = useInventoryStore()

    const cost = computed(() => galaxyStore.tierUnlockCost)

    // Star level / cosmic trait that the next tier's first galaxy introduces.
    const nextStarLevel = computed(() => starLevelForGalaxy(galaxyStore.currentGalaxy + 1))
    const nextStarTrait = computed(
      () => COSMIC_TRAIT_BY_STAR[nextStarLevel.value] ?? COSMIC_TRAITS.lone_wanderer,
    )

    const hasChimes = computed(() => gameStore.chimes >= cost.value.chimes)
    const chimesShort = computed(() => Math.max(0, cost.value.chimes - gameStore.chimes))

    const materialRows = computed(() =>
      Object.entries(cost.value.material).map(([id, required]) => {
        const owned = inventoryStore.collectedMaterials[id] ?? 0
        const def = MATERIALS.find((mm) => mm.id === id)
        return {
          id,
          required,
          owned,
          ok: owned >= required,
          short: Math.max(0, required - owned),
          name: def?.name ?? id,
          image: def?.image ?? '',
        }
      }),
    )

    const canAfford = computed(
      () => hasChimes.value && materialRows.value.every((m) => m.ok),
    )

    function onUnlock() {
      if (!canAfford.value) return
      galaxyStore.unlockNextTier()
    }

    return {
      galaxyStore,
      gameStore,
      cost,
      nextStarLevel,
      nextStarTrait,
      hasChimes,
      chimesShort,
      materialRows,
      canAfford,
      onUnlock,
      formatNumber,
    }
  },
})
</script>

<style scoped>
.tier-unlock {
  position: relative;
  width: 308px;
  max-width: 90%;
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 8px 28px rgba(0, 0, 0, 0.85);
  border-radius: 5px;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  pointer-events: auto;
}

.tier-gold-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
}

.tier-head {
  display: flex;
  align-items: center;
  gap: 7px;
}

.tier-lock-icon {
  color: #cc6050;
}

.tier-head-title {
  font-size: 0.98rem;
  letter-spacing: 0.1em;
  color: #e8c040;
  text-transform: uppercase;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.tier-progress-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  justify-content: center;
}

.tier-pill {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.tier-pill--done {
  background: #1c1c18;
  border: 1px solid #5c3310;
  color: #a08c72;
}

.tier-pill--next {
  background: #1e1006;
  border: 1px solid #c89040;
  color: #e8c040;
}

.tier-arrow {
  color: #7a4e20;
  font-size: 0.85rem;
}

.tier-star {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.74rem;
  letter-spacing: 0.04em;
}

.tier-cost-label {
  font-size: 0.66rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a7355;
}

.tier-cost-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.tier-cost-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  padding: 3px 7px;
  border-radius: 4px;
  border: 1px solid #5c3310;
  background: #16140e;
  cursor: help;
}

.tier-cost-img {
  width: 14px;
  height: 14px;
  display: inline-block;
  image-rendering: pixelated;
}

.tier-cost-badge--ok {
  color: #a0ffa0;
  border-color: rgba(82, 184, 48, 0.45);
  background: rgba(82, 184, 48, 0.14);
}

.tier-cost-badge--missing {
  color: #e08a78;
  border-color: rgba(180, 60, 50, 0.5);
  background: rgba(140, 40, 40, 0.16);
}

.tier-unlock-btn {
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1c1c18;
  border: 1px solid #5c3310;
  border-radius: 5px;
  color: #8a7355;
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  padding: 8px 18px;
  text-transform: uppercase;
  cursor: not-allowed;
  opacity: 0.65;
  filter: grayscale(40%);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.tier-unlock-btn--ready {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
  cursor: pointer;
  opacity: 1;
  filter: none;
  box-shadow: 0 2px 10px rgba(46, 122, 26, 0.5);
  animation: tier-btn-pulse 2s ease-in-out infinite;
}

.tier-unlock-btn--ready:hover {
  background: linear-gradient(to bottom, #66d040, #3a9a22);
  box-shadow: 0 0 16px rgba(82, 184, 48, 0.75);
  transform: translateY(-1px);
}

.tier-unlock-btn--ready:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(46, 122, 26, 0.4);
}

@keyframes tier-btn-pulse {
  0%,
  100% {
    box-shadow: 0 2px 10px rgba(46, 122, 26, 0.5);
  }
  50% {
    box-shadow: 0 0 18px rgba(82, 184, 48, 0.7);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tier-unlock-btn--ready {
    animation: none;
  }
}
</style>
