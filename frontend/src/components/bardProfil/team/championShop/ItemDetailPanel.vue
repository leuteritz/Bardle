<template>
  <aside class="cs-detail">
    <!-- Prev / Next navigation (shared list with the champion cards) -->
    <div class="cs-detail-nav">
      <button
        class="cs-nav-btn"
        :disabled="total < 2"
        aria-label="Previous entry"
        @click="$emit('prev')"
      >←</button>
      <span class="cs-nav-pos">{{ index + 1 }} / {{ total }}</span>
      <button
        class="cs-nav-btn"
        :disabled="total < 2"
        aria-label="Next entry"
        @click="$emit('next')"
      >→</button>
    </div>

    <!-- Hero: item icon on a rarity-tinted stage -->
    <div class="cs-detail-hero" :style="{ '--rar-c': detail.rarityColor }">
      <div class="hero-stage">
        <img
          v-if="detail.icon.startsWith('/')"
          :src="detail.icon"
          :alt="detail.name"
          class="hero-icon-img rpg-img"
        />
        <Icon v-else :icon="detail.icon" class="hero-icon-gi" />
      </div>
      <div class="cs-detail-hero-fade"></div>
      <div class="cat-pill" :style="{ background: detail.categoryColor }">
        <img :src="detail.categoryImage" :alt="detail.categoryLabel" class="cat-pill-img" />
        {{ detail.categoryLabel }}
      </div>
      <div class="rarity-pill">{{ detail.rarityLabel }}</div>
      <div class="cs-detail-name">{{ detail.name }}</div>
    </div>

    <!-- Scrollable info body -->
    <div class="cs-detail-body rpg-scrollbar">
      <!-- Effect -->
      <div class="cs-detail-section">
        <div class="cs-detail-section-title">Effect</div>
        <div class="effect-card" :style="{ '--rar-c': detail.rarityColor }">
          <p class="effect-desc">{{ detail.description }}</p>
        </div>
      </div>

      <!-- Set bonus -->
      <div v-if="detail.set" class="cs-detail-section">
        <div class="cs-detail-section-title">Set Bonus</div>
        <div class="set-card" :class="{ 'set-card--active': detail.set.active }">
          <div class="set-card-head">
            <Icon
              v-if="detail.set.icon.includes(':')"
              :icon="detail.set.icon"
              width="18"
              height="18"
              class="set-card-icon"
            />
            <img v-else :src="detail.set.icon" :alt="detail.set.name" class="set-card-img rpg-img" />
            <span class="set-card-name">{{ detail.set.name }}</span>
            <span v-if="detail.set.active" class="set-card-badge">ACTIVE</span>
          </div>
          <p class="set-card-desc">{{ detail.set.description }}</p>
          <p v-if="!detail.set.active" class="set-card-hint">
            Equip weapon, armor and artefact of this set on one role to activate.
          </p>
        </div>
      </div>

      <!-- Owned -->
      <div class="cs-detail-section">
        <div class="cs-detail-section-title">Owned</div>
        <div class="owned-row">
          <Icon icon="game-icons:knapsack" width="17" height="17" class="owned-row-icon" />
          <span class="owned-row-label">In inventory</span>
          <span class="owned-row-count" :class="{ 'owned-row-count--none': detail.ownedCount === 0 }">
            ×{{ detail.ownedCount }}
          </span>
        </div>
      </div>

      <!-- Cost breakdown — same rows as the champion recruit cost -->
      <div class="cs-detail-section">
        <div class="cs-detail-section-title">Purchase Cost</div>
        <div class="cs-detail-rows">
          <div
            v-for="mat in detail.materials"
            :key="mat.id"
            class="cs-mat-row"
            :class="mat.ok ? 'cs-mat-row--ok' : 'cs-mat-row--missing'"
            :style="{ '--cost-c': mat.color }"
          >
            <img :src="mat.image" :alt="mat.name" class="rpg-img cs-mat-img" />
            <span class="cs-mat-name">{{ mat.name }}</span>
            <span class="cs-mat-amount">
              {{ formatNumber(mat.have) }} / {{ formatNumber(mat.need) }}
            </span>
            <span class="cs-mat-state">{{ mat.ok ? '✓' : '✕' }}</span>
          </div>
          <div
            class="cs-mat-row"
            :class="detail.chimes.ok ? 'cs-mat-row--ok' : 'cs-mat-row--missing'"
          >
            <img src="/img/BardAbilities/BardChime.png" alt="Chimes" class="rpg-img cs-mat-img" />
            <span class="cs-mat-name">Chimes</span>
            <span class="cs-mat-amount">
              {{ formatNumber(detail.chimes.have) }} / {{ formatNumber(detail.chimes.need) }}
            </span>
            <span class="cs-mat-state">{{ detail.chimes.ok ? '✓' : '✕' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Buy footer -->
    <div class="cs-detail-footer">
      <button
        class="cs-buy-btn"
        :class="{ 'cs-buy-btn--ready': detail.canBuy }"
        :disabled="!detail.canBuy"
        @click="$emit('buy', detail.id)"
      >
        <span v-if="detail.canBuy">Buy {{ detail.name }}</span>
        <span v-else>Missing Resources</span>
      </button>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Icon } from '@iconify/vue'
import { formatNumber } from '../../../../config/numberFormat'
import type { ShopItemDetail } from '../../../../types'

/**
 * Right-hand detail panel of the unified shop for items — purely presentational.
 * Mirrors ChampionDetailPanel: effect, set bonus, owned count, cost breakdown,
 * plus the only Buy button and shared prev/next navigation.
 */
export default defineComponent({
  name: 'ItemDetailPanel',
  components: { Icon },
  props: {
    detail: {
      type: Object as () => ShopItemDetail,
      required: true,
    },
    index: { type: Number, default: -1 },
    total: { type: Number, default: 0 },
  },
  emits: ['prev', 'next', 'buy'],
  setup() {
    return { formatNumber }
  },
})
</script>

<style scoped>
/* ══ Item detail panel — same frame metrics as ChampionDetailPanel ══ */
.cs-detail {
  width: clamp(320px, 30%, 400px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #14100a;
  border-left: 3px solid #5c3310;
}

/* ── Prev / Next navigation ── */
.cs-detail-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  flex-shrink: 0;
}
.cs-nav-btn {
  width: 38px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border: 1px solid #7a4e20;
  border-radius: 4px;
  color: #e8c040;
  font-size: 17px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.cs-nav-btn:hover:not(:disabled) {
  background: #241a0c;
  border-color: #c89040;
}
.cs-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cs-nav-pos {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #b89a5a;
  white-space: nowrap;
}

/* ── Hero: rarity-tinted icon stage ── */
.cs-detail-hero {
  position: relative;
  height: clamp(170px, 24vh, 250px);
  flex-shrink: 0;
  overflow: hidden;
  border-bottom: 2px solid #5c3310;
  background:
    radial-gradient(
      ellipse at 50% 42%,
      color-mix(in srgb, var(--rar-c, #7a4e20) 20%, transparent),
      transparent 72%
    ),
    #111008;
}
.hero-stage {
  position: absolute;
  inset: 0 0 34px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-icon-img {
  width: clamp(88px, 14vh, 128px);
  height: clamp(88px, 14vh, 128px);
  object-fit: contain;
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.8));
}
.hero-icon-gi {
  width: clamp(80px, 12vh, 112px);
  height: clamp(80px, 12vh, 112px);
  color: var(--rar-c, #c89040);
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.8));
}
.cs-detail-hero-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(17, 16, 8, 0.95) 0%,
    rgba(17, 16, 8, 0.3) 45%,
    transparent 100%
  );
}
.cs-detail-name {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 8px;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.96);
  text-shadow:
    0 2px 8px rgba(0, 0, 0, 0.9),
    0 0 14px rgba(232, 192, 64, 0.25);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Category pill (top-right) & rarity pill (top-left) on the hero */
.cat-pill {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 15;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #111008;
  padding: 3px 7px;
  border-radius: 3px;
  line-height: 1.2;
  pointer-events: none;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
}
.cat-pill-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}
.rarity-pill {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 15;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rar-c, #e8c040);
  background: rgba(0, 0, 0, 0.78);
  border: 1px solid color-mix(in srgb, var(--rar-c, #e8c040) 70%, #111);
  padding: 3px 7px;
  border-radius: 3px;
  line-height: 1.2;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.7), 0 0 8px color-mix(in srgb, var(--rar-c, #e8c040) 25%, transparent);
}

/* ── Scrollable info body ── */
.cs-detail-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cs-detail-section-title {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b89a5a;
  margin-bottom: 6px;
}
.cs-detail-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* Effect card — rarity-tinted frame like the champion tier card */
.effect-card {
  background: #1c1c18;
  border: 1px solid color-mix(in srgb, var(--rar-c, #7a4e20) 55%, #111);
  border-radius: 4px;
  padding: 8px 10px;
}
.effect-desc {
  font-size: 12.5px;
  line-height: 1.45;
  color: #b8e0a0;
}

/* Set bonus card */
.set-card {
  background: #1c1c18;
  border: 1px solid #5c3310;
  border-radius: 4px;
  padding: 8px 10px;
}
.set-card--active {
  border-color: rgba(232, 192, 64, 0.55);
  box-shadow: inset 0 0 14px rgba(232, 192, 64, 0.08);
}
.set-card-head {
  display: flex;
  align-items: center;
  gap: 7px;
}
.set-card-icon {
  color: #e8c040;
  flex-shrink: 0;
}
.set-card-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}
.set-card-name {
  flex: 1;
  font-size: 13px;
  font-weight: 800;
  color: #e8c040;
}
.set-card-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #e8c040;
  background: rgba(232, 192, 64, 0.15);
  border: 1px solid rgba(232, 192, 64, 0.3);
  border-radius: 4px;
  padding: 1px 6px;
  line-height: 1.5;
}
.set-card-desc {
  margin-top: 5px;
  font-size: 11.5px;
  line-height: 1.4;
  color: #a89878;
}
.set-card-hint {
  margin-top: 4px;
  font-size: 10.5px;
  line-height: 1.4;
  color: #7a6f58;
}

/* Owned row */
.owned-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1c1c18;
  border: 1px solid #3a3226;
  border-radius: 4px;
  padding: 6px 9px;
}
.owned-row-icon {
  color: #c89040;
  flex-shrink: 0;
}
.owned-row-label {
  flex: 1;
  font-size: 12.5px;
  font-weight: 700;
  color: #d8d0bc;
}
.owned-row-count {
  font-size: 12.5px;
  font-weight: 800;
  color: #52b830;
}
.owned-row-count--none {
  color: #7a6f58;
}

/* Cost rows: identical look to the champion recruit cost */
.cs-mat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1c1c18;
  border: 1px solid color-mix(in srgb, var(--cost-c, #e8c040) 40%, transparent);
  border-radius: 4px;
  padding: 6px 9px;
}
.cs-mat-row--missing {
  border-color: rgba(204, 96, 80, 0.5);
}
.cs-mat-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}
.cs-mat-name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: #d8d0bc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-mat-amount {
  font-size: 12.5px;
  font-weight: 800;
  white-space: nowrap;
}
.cs-mat-row--ok .cs-mat-amount {
  color: var(--cost-c, #e8c040);
}
.cs-mat-row--missing .cs-mat-amount {
  color: #cc6050;
}
.cs-mat-state {
  width: 14px;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
  flex-shrink: 0;
}
.cs-mat-row--ok .cs-mat-state {
  color: #6ec040;
}
.cs-mat-row--missing .cs-mat-state {
  color: #cc6050;
}

/* Buy footer */
.cs-detail-footer {
  padding: 10px 12px 12px;
  border-top: 2px solid #3e200a;
  background: #16120a;
  flex-shrink: 0;
}
.cs-buy-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 12px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid #3a3226;
  color: #7a6f58;
  cursor: not-allowed;
}
.cs-buy-btn--ready {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #eaffe0;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.25);
  transition: filter 0.15s ease;
}
.cs-buy-btn--ready:hover {
  filter: brightness(1.12);
}

/* Compact layout on flatter viewports (Full HD) */
@media (max-height: 1100px) {
  .cs-detail-hero {
    height: clamp(150px, 20vh, 200px);
  }
  .cs-detail-body {
    gap: 11px;
  }
  .cs-detail-name {
    font-size: 19px;
  }
}
</style>
