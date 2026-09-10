<template>
  <aside class="cs-detail">
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
          <span class="cs-hero-chip cs-hero-chip--solid" :style="{ '--cc': detail.categoryColor }">
            <img :src="detail.categoryImage" :alt="detail.categoryLabel" class="cs-hero-chip-img" />
            {{ detail.categoryLabel }}
          </span>
        </div>
      </div>
    </div>

    <div class="cs-detail-body">
      <div class="cs-identity" aria-label="Item identity">
        <div class="cs-tier-band cs-item-rarity-band" :style="{ '--ac': detail.rarityColor }">
          <span class="cs-tier-crest cs-item-crest" aria-hidden="true">
            <img
              v-if="detail.icon.startsWith('/')"
              :src="detail.icon"
              :alt="detail.name"
              class="rpg-img"
            />
            <Icon v-else :icon="detail.icon" width="24" height="24" />
          </span>
          <span class="cs-tier-copy">
            <span class="cs-affinity-head"><small>Item Rarity</small></span>
            <strong>{{ detail.rarityLabel }}</strong>
          </span>
          <span class="cs-item-owned">
            <Icon icon="game-icons:knapsack" width="15" height="15" aria-hidden="true" />
            ×{{ detail.ownedCount }}
          </span>
        </div>

        <div class="cs-affinity-list" aria-label="Item category and set">
          <div class="cs-affinity cs-item-affinity" :style="{ '--ac': detail.categoryColor }">
            <span class="cs-affinity-crest" aria-hidden="true">
              <img :src="detail.categoryImage" :alt="detail.categoryLabel" class="rpg-img" />
            </span>
            <span class="cs-affinity-copy">
              <span class="cs-affinity-head"><small>Category</small></span>
              <strong>{{ detail.categoryLabel }}</strong>
              <span class="cs-affinity-next">Equipment slot</span>
            </span>
          </div>

          <div
            v-if="detail.set"
            class="cs-affinity cs-item-affinity"
            :class="{ 'cs-item-affinity--active': detail.set.active }"
            :style="{ '--ac': detail.set.active ? '#e8c040' : '#7a4e20' }"
          >
            <span class="cs-affinity-crest" aria-hidden="true">
              <Icon
                v-if="detail.set.icon.includes(':')"
                :icon="detail.set.icon"
                width="19"
                height="19"
              />
              <img v-else :src="detail.set.icon" :alt="detail.set.name" class="rpg-img" />
            </span>
            <span class="cs-affinity-copy">
              <span class="cs-affinity-head">
                <small>Set Bonus</small>
                <em v-if="detail.set.active">Active</em>
              </span>
              <strong>{{ detail.set.name }}</strong>
              <span class="cs-affinity-next">{{
                detail.set.active ? 'Activated' : 'Inactive'
              }}</span>
            </span>
          </div>
          <div v-else class="cs-affinity cs-item-affinity cs-item-affinity--empty">
            <span class="cs-affinity-crest" aria-hidden="true">
              <Icon icon="lucide:minus" width="19" height="19" />
            </span>
            <span class="cs-affinity-copy">
              <span class="cs-affinity-head"><small>Set Bonus</small></span>
              <strong>None</strong>
              <span class="cs-affinity-next">No set bonus</span>
            </span>
          </div>
        </div>
      </div>

      <div class="cs-block cs-block--stack cs-effect-card" :style="{ '--ac': detail.rarityColor }">
        <div class="cs-block-head">
          <span class="cs-block-kicker">Item Effect</span>
          <span class="cs-block-rule" aria-hidden="true"></span>
        </div>
        <p class="effect-desc">{{ detail.description }}</p>
      </div>

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

      <div class="cs-cost">
        <div class="cs-cost-label">
          <span>Cost</span>
          <span class="cs-owned" :class="{ 'cs-owned--none': detail.ownedCount === 0 }">
            <Icon icon="game-icons:knapsack" width="16" height="16" class="cs-owned-icon" />
            Owned ×{{ detail.ownedCount }}
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
            <i class="cs-mat-fill" :style="fillStyle(detail.chimes.have, detail.chimes.need)"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="cs-detail-footer">
      <button
        type="button"
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
    /** Standing in the shop's own column rather than over it — shows Close. */
  },
  emits: ['buy'],
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

/* ── Identity ── */
.cs-identity {
  margin-bottom: 4px;
}
.cs-tier-band {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--ac) 46%, #3e200a);
  border-left: 3px solid var(--ac);
  border-radius: 4px;
  background: linear-gradient(105deg, color-mix(in srgb, var(--ac) 17%, #17150e), #141410 78%);
  color: inherit;
}
.cs-tier-crest,
.cs-affinity-crest {
  display: grid;
  place-items: center;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: var(--ac);
  color: #fff;
}
.cs-tier-crest {
  width: 38px;
  height: 42px;
}
.cs-item-crest img {
  width: 25px;
  height: 25px;
  object-fit: contain;
}
.cs-tier-copy,
.cs-affinity-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.cs-tier-copy strong,
.cs-affinity strong {
  overflow: hidden;
  color: var(--ac);
  font-size: 20px;
  font-weight: 400;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-shadow: 0 0 12px color-mix(in srgb, var(--ac) 34%, transparent);
  white-space: nowrap;
}
.cs-affinity-head {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cs-affinity-head small {
  color: #a59675;
  font-size: 10px;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: uppercase;
}
.cs-item-owned {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #6ec040;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  white-space: nowrap;
}
.cs-item-owned svg {
  color: #c89040;
}
.cs-affinity-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 8px;
  margin-top: 9px;
}
.cs-affinity {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--ac) 46%, #3e200a);
  border-left: 3px solid var(--ac);
  border-radius: 4px;
  background: linear-gradient(105deg, color-mix(in srgb, var(--ac) 15%, #17150e), #141410 78%);
  color: inherit;
}
.cs-affinity-crest {
  width: 30px;
  height: 33px;
}
.cs-affinity-crest img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.cs-affinity-next {
  display: block;
  overflow: hidden;
  color: color-mix(in srgb, var(--ac) 76%, #fff9e8);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-affinity em {
  margin-left: auto;
  color: var(--ac);
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.cs-item-affinity--active {
  box-shadow: inset 0 0 14px rgba(232, 192, 64, 0.08);
}
.cs-item-affinity--empty {
  --ac: #7a4e20;
  opacity: 0.76;
}

/* ── Info body ── */
.cs-detail-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-color: #5c3310 #111008;
  scrollbar-width: thin;
}

/* ── Effect ── */
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
.cs-block-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cs-block-kicker {
  color: #e8c040;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.cs-block-rule {
  height: 1px;
  flex: 1;
  background: #5c3310;
  opacity: 0.7;
}
.effect-desc {
  margin: 0;
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

.cs-detail-hero {
  order: 1;
  flex: 0 0 400px;
  min-height: 0;
  border-bottom: 1px solid #5c3310;
  background: #111008;
}
.hero-stage {
  padding: 14px;
}
.hero-icon-img {
  height: min(100%, 196px);
}
.hero-icon-gi {
  height: min(100%, 176px);
}
.cs-hero-foot {
  min-height: 94px;
  gap: 8px;
  padding: 30px 18px 14px;
  background: linear-gradient(to top, rgba(13, 11, 6, 0.98), rgba(13, 11, 6, 0.7) 64%, transparent);
}
.cs-detail-name {
  font-size: 31px;
}
.cs-hero-chips {
  gap: 5px;
  max-height: 36px;
  overflow: hidden;
}
.cs-hero-chip {
  padding: 4px 9px;
  font-size: 11.5px;
  letter-spacing: 0.05em;
}
.cs-detail-body {
  order: 2;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 18px;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111008;
}
.cs-block,
.cs-mat-row {
  background: #1c1c18;
  border-color: #3e200a;
}
.cs-block {
  padding: 11px 13px 11px 15px;
}
.effect-desc,
.set-card-desc {
  font-size: 13.5px;
  line-height: 1.45;
}
.set-card-hint {
  font-size: 12px;
}
.cs-cost {
  gap: 8px;
}
.cs-cost-label {
  font-size: 12px;
  color: #e8c040;
}
.cs-mat-row {
  min-height: 48px;
  padding: 8px 11px;
  gap: 10px;
}
.cs-mat-img {
  width: 30px;
  height: 30px;
}
.cs-mat-name {
  font-size: 13.5px;
}
.cs-mat-amount {
  font-size: 15px;
}
.cs-detail-footer {
  order: 3;
  padding: 12px 18px 14px;
  background: #1a1008;
  border-top: 1px solid #5c3310;
}
.cs-buy-btn {
  min-height: 58px;
  padding: 14px 16px;
  font-size: 15px;
  letter-spacing: 0.09em;
}
.cs-buy-btn--ready {
  box-shadow: none;
}
@media (max-height: 1100px) {
  .cs-detail-hero {
    flex-basis: 340px;
  }
  .cs-detail-name {
    font-size: 28px;
  }
  .cs-hero-foot {
    min-height: 84px;
    padding: 26px 16px 12px;
  }
}
</style>
