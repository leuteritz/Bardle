<template>
  <aside class="cs-detail">
    <!-- Clearing the subject leaves the overview card standing in this
         column; prev/next walk the same list the cards are drawn from. -->
    <div class="cs-detail-nav">
      <button
        v-if="wide"
        class="cs-back-btn"
        title="Clear the selection (Esc)"
        @click="$emit('back')"
      >
        <span class="cs-back-arrow">✕</span>
        Close
      </button>
      <div class="cs-detail-steps">
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
    </div>

    <!-- Hero — the icon on a rarity-tinted stage, and the whole identity below
         the name as one chip run. Mirrors ChampionDetailPanel: rarity and
         category used to sit in the corners, split apart from the name. -->
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
      <div class="cs-hero-foot">
        <div class="cs-detail-name">{{ detail.name }}</div>
        <div class="cs-hero-chips">
          <span class="cs-hero-chip" :style="{ '--cc': detail.rarityColor }">
            {{ detail.rarityLabel }}
          </span>
          <span
            class="cs-hero-chip cs-hero-chip--solid"
            :style="{ '--cc': detail.categoryColor }"
          >
            <img :src="detail.categoryImage" :alt="detail.categoryLabel" class="cs-hero-chip-img" />
            {{ detail.categoryLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Info body. It never scrolls: it asks for the height it needs and the
         hero above takes whatever is left. -->
    <div class="cs-detail-body">
      <!-- Effect — the item's whole point, so it carries no headline; the
           rarity edge and the green reading are what mark it. -->
      <div class="cs-block cs-block--stack" :style="{ '--ac': detail.rarityColor }">
        <p class="effect-desc">{{ detail.description }}</p>
      </div>

      <!-- Set bonus -->
      <div
        v-if="detail.set"
        class="cs-block cs-block--stack set-card"
        :class="{ 'set-card--active': detail.set.active }"
      >
        <div class="set-card-head">
          <Icon
            v-if="detail.set.icon.includes(':')"
            :icon="detail.set.icon"
            width="20"
            height="20"
            class="set-card-icon"
          />
          <img v-else :src="detail.set.icon" :alt="detail.set.name" class="set-card-img rpg-img" />
          <span class="set-card-name">{{ detail.set.name }}</span>
          <span v-if="detail.set.active" class="set-card-badge">Active</span>
        </div>
        <p class="set-card-desc">{{ detail.set.description }}</p>
        <p v-if="!detail.set.active" class="set-card-hint">
          Equip weapon, armor and artefact of this set on one role to activate.
        </p>
      </div>

      <!-- Cost breakdown. The stock count rides in the label row: what the
           player owns and what it costs are the same question. -->
      <div class="cs-cost">
        <div class="cs-cost-label">
          <span>Purchase Cost</span>
          <span class="cs-owned" :class="{ 'cs-owned--none': detail.ownedCount === 0 }">
            <Icon icon="game-icons:knapsack" width="16" height="16" class="cs-owned-icon" />
            In inventory ×{{ detail.ownedCount }}
          </span>
        </div>
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
            <i class="cs-mat-fill" :style="fillStyle(mat.have, mat.need)"></i>
          </div>
          <div
            class="cs-mat-row"
            :class="detail.chimes.ok ? 'cs-mat-row--ok' : 'cs-mat-row--missing'"
          >
            <img
              src="/img/BardAbilities/BardChime-128.png"
              alt="Chimes"
              class="rpg-img cs-mat-img"
            />
            <span class="cs-mat-name">Chimes</span>
            <span class="cs-mat-amount">
              {{ formatNumber(detail.chimes.have) }} / {{ formatNumber(detail.chimes.need) }}
            </span>
            <span class="cs-mat-state">{{ detail.chimes.ok ? '✓' : '✕' }}</span>
            <i
              class="cs-mat-fill"
              :style="fillStyle(detail.chimes.have, detail.chimes.need)"
            ></i>
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
import { formatNumber } from '@/config/ui/numberFormat'
import type { ShopItemDetail } from '@/types'

/**
 * Right-hand detail panel of the unified shop for items — purely presentational.
 * Mirrors ChampionDetailPanel: identity on the hero, then effect, set bonus and
 * cost breakdown, plus the only Buy button and shared prev/next navigation.
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
    /** Standing in the shop's own column rather than over it — shows Close. */
    wide: { type: Boolean, default: false },
  },
  emits: ['prev', 'next', 'buy', 'back'],
  setup() {
    const fillStyle = (have: number, need: number) => ({
      transform: `scaleX(${need > 0 ? Math.min(1, have / need) : 1})`,
    })
    return { formatNumber, fillStyle }
  },
})
</script>

<style scoped>
/* ══ Item detail panel — same frame metrics as ChampionDetailPanel ══
   The two files share every skeleton rule below; a change to one belongs in the
   other in the same breath. */
.cs-detail {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* No veil here: .cs-atlas-detail carries it — a second one would close it. */
  background: transparent;
}

/* ── Back + prev / next navigation ── */
.cs-detail-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  background: rgba(30, 16, 6, var(--cs-veil, 1));
  border-bottom: 3px solid #5c3310;
  flex-shrink: 0;
}
.cs-detail-steps {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.cs-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px 7px 11px;
  background: #141410;
  border: 1px solid #7a4e20;
  border-radius: 4px;
  color: #e8c040;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.cs-back-btn:hover {
  background: #241a0c;
  border-color: #c89040;
  color: #f0d870;
}
.cs-back-arrow {
  font-size: 16px;
  line-height: 1;
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
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
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
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #b89a5a;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ── Hero: rarity-tinted icon stage ──
   Flexible, like the champion panel's: the body asks for the height it needs
   and the stage takes the rest. */
.cs-detail-hero {
  position: relative;
  flex: 1 1 auto;
  min-height: 168px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-bottom: 2px solid #5c3310;
  background:
    radial-gradient(
      ellipse at 50% 42%,
      color-mix(in srgb, var(--rar-c, #7a4e20) 20%, transparent),
      transparent 72%
    ),
    rgba(17, 16, 8, var(--cs-veil, 1));
}
.hero-stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
}
/* The stage is what absorbs the panel's spare height, so the icon grows into it
   instead of floating in the middle of an empty plate. 200px is the ceiling:
   the art files are the -256 variant, and past 220 they would need the
   original — see the resolution steps in CLAUDE.md. */
.hero-icon-img {
  width: auto;
  height: min(100%, 200px);
  max-width: 100%;
  object-fit: contain;
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.8));
}
.hero-icon-gi {
  width: auto;
  height: min(100%, 176px);
  aspect-ratio: 1;
  max-width: 100%;
  color: var(--rar-c, #c89040);
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.8));
}
/* Bottom-anchored with room for one chip row reserved, so stepping the list
   with ←/→ keeps the same window on the stage. The scrim belongs to the FOOT,
   not to the whole hero — see ChampionDetailPanel. */
.cs-hero-foot {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  min-height: 88px;
  padding: 36px 18px 14px;
  background: linear-gradient(
    to top,
    rgba(13, 11, 6, 0.96) 0%,
    rgba(13, 11, 6, 0.9) 52%,
    rgba(13, 11, 6, 0.55) 78%,
    transparent 100%
  );
}
.cs-detail-name {
  font-size: 34px;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.97);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.cs-hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.62);
  border: 1px solid var(--cc, #7a4e20);
  color: color-mix(in srgb, var(--cc, #e8c040) 55%, #fff);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.25;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}
.cs-hero-chip-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}
/* The category reads solid on the grid cards too, and the filled block anchors
   the run — same role the champion panel gives its role chip. */
.cs-hero-chip--solid {
  background: var(--cc);
  border-color: var(--cc);
  color: #111008;
  font-weight: 900;
  text-shadow: none;
}

/* ── Info body — never a scrollport ──
   `clip` rather than `hidden`: hidden is a scrollport and can still be moved
   programmatically, clip cannot. */
.cs-detail-body {
  flex: 0 0 auto;
  overflow: clip;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Blocks carry no headline: the accent edge and the content say what they are. */
.cs-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px 11px 15px;
  border-radius: 4px;
  background: rgba(26, 23, 15, var(--cs-block, 1));
  border: 1px solid #2a2318;
  border-left: 3px solid var(--ac, #7a4e20);
}
.cs-block--stack {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}
.effect-desc {
  font-size: 13.5px;
  line-height: 1.45;
  color: #b8e0a0;
}

/* Set bonus */
.set-card {
  --ac: #5c3310;
}
.set-card--active {
  --ac: #e8c040;
  box-shadow: inset 0 0 14px rgba(232, 192, 64, 0.08);
}
.set-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.set-card-icon {
  color: #e8c040;
  flex-shrink: 0;
}
.set-card-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}
.set-card-name {
  flex: 1;
  min-width: 0;
  font-size: 14.5px;
  font-weight: 800;
  color: #e8c040;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.set-card-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e8c040;
  background: rgba(232, 192, 64, 0.15);
  border: 1px solid rgba(232, 192, 64, 0.3);
  border-radius: 4px;
  padding: 2px 7px;
  line-height: 1.4;
}
.set-card-desc {
  font-size: 13px;
  line-height: 1.42;
  color: #b0a184;
}
.set-card-hint {
  font-size: 12px;
  line-height: 1.4;
  color: #7a6f58;
}

/* ── Cost ── */
.cs-cost {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
/* The stock count rides in the label row — what the player owns and what it
   costs answer the same question, and a row of its own cost a block. */
.cs-cost-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b89a5a;
}
.cs-owned {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  letter-spacing: 0.06em;
  color: #6ec040;
  font-variant-numeric: tabular-nums;
}
.cs-owned--none {
  color: #7a6f58;
}
.cs-owned-icon {
  flex-shrink: 0;
  color: #c89040;
}
.cs-detail-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cs-mat-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(28, 28, 24, var(--cs-block, 1));
  border: 1px solid color-mix(in srgb, var(--cost-c, #e8c040) 40%, transparent);
  border-radius: 4px;
  padding: 8px 11px;
  overflow: hidden;
}
.cs-mat-row--missing {
  border-color: rgba(204, 96, 80, 0.5);
}
.cs-mat-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  flex-shrink: 0;
}
.cs-mat-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: #d8d0bc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-mat-amount {
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.cs-mat-row--ok .cs-mat-amount {
  color: var(--cost-c, #e8c040);
}
.cs-mat-row--missing .cs-mat-amount {
  color: #cc6050;
}
.cs-mat-state {
  width: 15px;
  text-align: center;
  font-size: 14px;
  font-weight: 900;
  flex-shrink: 0;
}
.cs-mat-row--ok .cs-mat-state {
  color: #6ec040;
}
.cs-mat-row--missing .cs-mat-state {
  color: #cc6050;
}
/* How far the stock has come. scaleX, not width — the value moves when the store
   moves, and a width would relayout the row on every tick. */
.cs-mat-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  transform-origin: left center;
  background: var(--cost-c, #e8c040);
  opacity: 0.75;
  transition: transform 0.25s ease-out;
}
.cs-mat-row--missing .cs-mat-fill {
  background: #cc6050;
}

/* Buy footer */
.cs-detail-footer {
  padding: 12px 18px 14px;
  border-top: 2px solid #3e200a;
  background: rgba(22, 18, 10, var(--cs-veil, 1));
  flex-shrink: 0;
}
/* a full-column button reads as a banner, not as a press */
.cs-buy-btn {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 14px;
  font-size: 15px;
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

/* Compact layout on flatter viewports (Full HD). The hero height is NOT here —
   that one settles itself, see .cs-detail-hero. */
@media (max-height: 1100px) {
  .cs-detail-name {
    font-size: 30px;
  }
  .cs-hero-foot {
    min-height: 80px;
    gap: 7px;
    padding: 32px 16px 12px;
  }
  .cs-detail-body {
    gap: 10px;
    padding: 13px 16px;
  }
  .cs-block {
    padding: 9px 12px 9px 14px;
  }
}
</style>
