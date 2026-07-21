<template>
  <aside class="cs-detail">
    <template v-if="detail">
      <!-- Prev / Next navigation -->
      <div class="cs-detail-nav">
        <button
          class="cs-nav-btn"
          :disabled="total < 2"
          aria-label="Previous champion"
          @click="$emit('prev')"
        >←</button>
        <span class="cs-nav-pos">{{ index + 1 }} / {{ total }}</span>
        <button
          class="cs-nav-btn"
          :disabled="total < 2"
          aria-label="Next champion"
          @click="$emit('next')"
        >→</button>
      </div>

      <!-- Hero image -->
      <div class="cs-detail-hero">
        <img
          :src="detail.image"
          :alt="detail.name"
          class="cs-detail-img rpg-img"
          :class="{ grayscale: detail.locked }"
        />
        <div class="cs-detail-hero-fade"></div>
        <div class="role-badge-pill" :style="{ background: detail.roleColor }">
          {{ detail.roleLabel }}
        </div>
        <div class="tier-badge" :style="{ '--tier-c': detail.tierColor }">
          ★{{ detail.starLevel }}
        </div>
        <div class="cs-detail-name">{{ detail.name }}</div>
      </div>

      <!-- Scrollable info body -->
      <div class="cs-detail-body rpg-scrollbar">
        <!-- Traits & Origin -->
        <div class="cs-detail-section">
          <div class="cs-detail-section-title">Traits &amp; Origin</div>
          <div class="cs-detail-badges">
            <div
              v-for="trait in detail.traits"
              :key="trait.id"
              class="card-trait-badge"
              :style="{ '--tc': trait.color }"
            >
              <Icon :icon="trait.icon" class="card-trait-icon" />
              <span>{{ trait.name }}</span>
            </div>
            <div
              v-if="detail.origin"
              class="card-trait-badge"
              :style="{ '--tc': detail.origin.color }"
            >
              <Icon :icon="detail.origin.icon" class="card-trait-icon" />
              <span>{{ detail.origin.origin }}</span>
            </div>
          </div>
        </div>

        <!-- Champion Tier -->
        <div class="cs-detail-section">
          <div class="cs-detail-section-title">Champion Tier</div>
          <div class="cs-detail-tier-card" :style="{ '--tier-c': detail.tierColor }">
            <div class="cs-detail-tier-head">
              <Icon :icon="detail.tierIcon" width="18" height="18" class="cs-detail-tier-icon" />
              <span class="cs-detail-tier-name">★{{ detail.starLevel }} {{ detail.tierName }}</span>
              <span
                class="cs-tier-chance"
                :class="{ 'is-locked': detail.spawnPercent == null }"
                title="This tier's current spawn chance"
              >
                {{ detail.spawnPercent != null ? detail.spawnPercent + '%' : 'Locked' }}
              </span>
            </div>
            <p class="cs-detail-tier-desc">{{ detail.tierDescription }}</p>
          </div>
        </div>

        <!-- Locked hint -->
        <div v-if="detail.locked" class="cs-detail-locked">
          <Icon icon="game-icons:padlock" width="18" height="18" style="color: #cc6050; flex-shrink: 0" />
          <span>{{ detail.lockedHint }}</span>
        </div>

        <!-- Cost breakdown -->
        <div v-else class="cs-detail-section">
          <div class="cs-detail-section-title">Recruit Cost</div>
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
          @click="$emit('buy', detail.name)"
        >
          <span v-if="detail.locked">Locked</span>
          <span v-else-if="detail.canBuy">Recruit {{ detail.name }}</span>
          <span v-else>Missing Resources</span>
        </button>
      </div>
    </template>
    <div v-else class="cs-detail-empty">
      <span class="cs-detail-empty-mark">✦</span>
      <span>Select a champion</span>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Icon } from '@iconify/vue'
import { formatNumber } from '../../../../config/numberFormat'
import type { ShopChampionDetail } from '../../../../types'

/**
 * Right-hand detail panel of the Champion Shop — purely presentational.
 * Shows everything about the selected champion (traits, origin, tier, cost
 * breakdown) and hosts the only Recruit button plus prev/next navigation.
 */
export default defineComponent({
  name: 'ChampionDetailPanel',
  components: { Icon },
  props: {
    detail: {
      type: Object as () => ShopChampionDetail | null,
      default: null,
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
/* ══ Champion detail panel (right column of the shop) ══ */
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

/* ── Hero image ── */
.cs-detail-hero {
  position: relative;
  height: clamp(170px, 24vh, 250px);
  flex-shrink: 0;
  overflow: hidden;
  border-bottom: 2px solid #5c3310;
  background: #111008;
}
.cs-detail-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
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

/* Role pill (top-right) & tier badge (top-left) on the hero */
.role-badge-pill {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 15;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #111008;
  padding: 3px 7px;
  border-radius: 3px;
  line-height: 1.2;
  pointer-events: none;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
}
.tier-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 15;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: var(--tier-c);
  background: rgba(0, 0, 0, 0.78);
  border: 1px solid color-mix(in srgb, var(--tier-c) 70%, #111);
  padding: 3px 7px;
  border-radius: 3px;
  line-height: 1.2;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.7), 0 0 8px color-mix(in srgb, var(--tier-c) 25%, transparent);
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
.cs-detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.cs-detail-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* Trait/origin badges — same look as the former on-card badges */
.card-trait-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 6px;
  border-radius: var(--bp-radius);
  background: rgba(10, 8, 4, 0.92);
  border: 1px solid var(--tc, #7a4e20);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  color: color-mix(in srgb, var(--tc, #e8c040) 60%, #fff);
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.65),
    0 0 6px color-mix(in srgb, var(--tc, #7a4e20) 30%, transparent);
}
.card-trait-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--tc, #e8c040);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

/* Tier info card: tier-tinted frame + description */
.cs-detail-tier-card {
  background: #1c1c18;
  border: 1px solid color-mix(in srgb, var(--tier-c, #7a4e20) 55%, #111);
  border-radius: 4px;
  padding: 8px 10px;
}
.cs-detail-tier-head {
  display: flex;
  align-items: center;
  gap: 7px;
}
.cs-detail-tier-icon {
  color: var(--tier-c, #e8c040);
  flex-shrink: 0;
}
.cs-detail-tier-name {
  flex: 1;
  font-size: 13px;
  font-weight: 800;
  color: var(--tier-c, #e8c040);
}
.cs-detail-tier-desc {
  margin-top: 5px;
  font-size: 11.5px;
  line-height: 1.4;
  color: #a89878;
}
/* Live spawn-chance pill: solid tier color when spawning, muted outline when locked */
.cs-tier-chance {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #161208;
  background: var(--tier-c, #e8c040);
  padding: 1px 7px;
  border-radius: 4px;
  line-height: 1.5;
}
.cs-tier-chance.is-locked {
  color: #b89a5a;
  background: transparent;
  border: 1px solid #5c3310;
}

/* Cost rows: one row per material + one for chimes */
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

/* Locked hint */
.cs-detail-locked {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(204, 96, 80, 0.08);
  border: 1px solid rgba(204, 96, 80, 0.4);
  border-radius: 4px;
  padding: 9px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: #d8a49a;
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

/* Empty state */
.cs-detail-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #7a6040;
  font-size: 13px;
}
.cs-detail-empty-mark {
  font-size: 30px;
  color: #7a4e20;
  opacity: 0.6;
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
