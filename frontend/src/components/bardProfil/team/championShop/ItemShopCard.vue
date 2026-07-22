<template>
  <div
    class="item-card-slot"
    :class="[buyable ? 'card-buyable' : 'card-unaffordable', { 'is-selected': selected }]"
    :style="{ '--rar-c': rarityColor }"
    @click="$emit('select', id)"
  >
    <div class="card-inner">
      <!-- Category pill: top-right -->
      <div class="cat-badge-pill" :style="{ background: categoryColor }">
        <img :src="categoryImage" :alt="categoryLabel" class="cat-badge-img" />
      </div>

      <!-- Rarity badge: top-left -->
      <div class="rarity-badge" :title="rarityLabel">{{ rarityLabel }}</div>

      <!-- Icon layer -->
      <div class="card-img-layer">
        <div class="item-icon-stage">
          <img
            v-if="icon.startsWith('/')"
            :src="icon"
            :alt="name"
            loading="lazy"
            decoding="async"
            class="item-icon-img rpg-img card-img-scale"
          />
          <Icon
            v-else
            :icon="icon"
            class="item-icon-gi card-img-scale"
          />
        </div>
        <div class="absolute inset-0 card-overlay" />
        <div v-if="buyable" class="absolute inset-0 pointer-events-none card-shimmer card-shimmer-anim" />
      </div>

      <!-- Bottom content: name + badges -->
      <div class="card-content">
        <div class="card-content-row">
          <span class="item-name" :class="buyable ? 'item-name--bright' : 'item-name--dim'">
            {{ truncate(name, 16) }}
          </span>
          <span v-if="ownedCount > 0" class="owned-badge">×{{ ownedCount }}</span>
          <span v-if="isSet" class="set-tag">SET</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Icon } from '@iconify/vue'
import { truncate } from '../../../../config/numberFormat'

/**
 * Single item card in the unified shop grid — purely presentational, mirrors
 * ChampionShopCard. Clicking selects the item (detail panel handles buying).
 */
export default defineComponent({
  name: 'ItemShopCard',
  components: { Icon },
  props: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    rarityLabel: { type: String, required: true },
    rarityColor: { type: String, default: '#e8c040' },
    categoryLabel: { type: String, default: '' },
    categoryImage: { type: String, default: '' },
    categoryColor: { type: String, default: '#7a4e20' },
    ownedCount: { type: Number, default: 0 },
    isSet: { type: Boolean, default: false },
    buyable: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
  },
  emits: ['select'],
  setup() {
    return { truncate }
  },
})
</script>

<style scoped>
/* ══ Grid slot — same footprint as the champion cards ══ */
.item-card-slot {
  height: 140px;
  position: relative;
  z-index: 1;
  cursor: pointer;
  --text-transition-dur: 0.22s;
}
.item-card-slot:hover {
  z-index: 20;
}
.card-unaffordable {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}
.card-unaffordable:hover {
  opacity: 1;
}

/* ══ Visual card — rarity-colored frame instead of role color ══ */
.card-inner {
  position: absolute;
  inset: 0;
  border-radius: var(--bp-radius);
  border: 3px solid color-mix(in srgb, var(--rar-c, #7a4e20) 65%, #1a1008);
  background: #141410;
  overflow: hidden;
  transition: border-color 0.25s ease;
}
.item-card-slot:hover .card-inner {
  border-color: var(--rar-c, #c89040);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--rar-c, #c89040) 30%, transparent),
    0 0 16px color-mix(in srgb, var(--rar-c, #c89040) 35%, transparent);
}

/* Buyable pulse — same compositor-only opacity animation as the champion cards */
.card-buyable.item-card-slot:not(:hover)::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--bp-radius);
  pointer-events: none;
  box-shadow: 0 0 26px rgba(232, 192, 64, 0.12);
  animation: item-glow-pulse 2.5s ease-in-out infinite;
  animation-play-state: var(--pulse-play, running);
}
.card-buyable.item-card-slot:not(:hover) .card-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rar-c, #e8c040) 35%, transparent);
  animation: item-ring-pulse 2.5s ease-in-out infinite;
  animation-play-state: var(--pulse-play, running);
}
@keyframes item-glow-pulse {
  0%, 100% { opacity: 0; }
  50%      { opacity: 1; }
}
@keyframes item-ring-pulse {
  0%, 100% { opacity: 0.43; }
  50%      { opacity: 1; }
}
.card-buyable .card-inner {
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 20px rgba(232, 192, 64, 0.12);
}
.item-card-slot.card-buyable:hover .card-inner {
  border-color: #e8c040;
  box-shadow:
    0 0 38px rgba(232, 192, 64, 0.55),
    0 0 70px rgba(200, 144, 64, 0.25),
    inset 0 0 0 2px rgba(232, 192, 64, 0.58);
}

/* ── Selected card: gold ring (drives the detail panel) ── */
.item-card-slot.is-selected::before {
  content: '';
  position: absolute;
  inset: -3px;
  border: 2px solid #e8c060;
  border-radius: calc(var(--bp-radius) + 2px);
  box-shadow:
    0 0 14px rgba(232, 192, 64, 0.45),
    inset 0 0 8px rgba(232, 192, 64, 0.15);
  pointer-events: none;
  z-index: 21;
}

/* ── Icon stage ── */
.card-img-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--bp-radius);
  background:
    radial-gradient(
      ellipse at 50% 38%,
      color-mix(in srgb, var(--rar-c, #7a4e20) 16%, transparent),
      transparent 70%
    ),
    #16130c;
}
.item-icon-stage {
  position: absolute;
  inset: 0 0 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.item-icon-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.7));
}
.item-icon-gi {
  width: 56px;
  height: 56px;
  color: var(--rar-c, #c89040);
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.7));
}
.card-img-scale {
  transition: transform 0.4s ease;
}
.item-card-slot:hover .card-img-scale {
  transform: scale(1.14);
}

/* ── Bottom gradient so the name always reads ── */
.card-overlay {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.35) 40%,
    transparent 70%
  );
}

/* ── Shimmer ── */
.card-shimmer {
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.07), transparent);
}
.card-shimmer-anim {
  transform: translateX(-100%);
  transition: transform 0.7s ease;
}
.card-buyable:hover .card-shimmer-anim {
  transform: translateX(100%);
}

/* ── Content bottom ── */
.card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  z-index: 10;
  transition: transform var(--text-transition-dur) ease;
}
.item-card-slot:hover .card-content {
  transform: translateY(-2px);
}
.card-content-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.item-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
  transition: transform var(--text-transition-dur) ease, text-shadow var(--text-transition-dur) ease;
}
.item-name--bright { color: rgba(255, 255, 255, 0.95); }
.item-name--dim { color: rgba(255, 255, 255, 0.7); }
.item-card-slot:hover .item-name--bright {
  transform: scale(1.06);
  transform-origin: left bottom;
  text-shadow:
    0 2px 8px rgba(0, 0, 0, 0.9),
    0 0 12px rgba(232, 192, 64, 0.25);
}

.owned-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 3px;
  color: #52b830;
  background: rgba(46, 122, 26, 0.25);
  border: 1px solid rgba(110, 192, 64, 0.5);
  line-height: 1.4;
}
.set-tag {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  padding: 1px 4px;
  border-radius: 3px;
  color: var(--rar-c, #e8c040);
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid color-mix(in srgb, var(--rar-c, #e8c040) 55%, #111);
  line-height: 1.4;
}

/* ── Rarity badge (top-left) & category pill (top-right) ── */
.rarity-badge {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 15;
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rar-c, #e8c040);
  background: rgba(0, 0, 0, 0.78);
  border: 1px solid color-mix(in srgb, var(--rar-c, #e8c040) 70%, #111);
  padding: 3px 6px;
  border-radius: 3px;
  line-height: 1.2;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.7), 0 0 8px color-mix(in srgb, var(--rar-c, #e8c040) 25%, transparent);
}
.cat-badge-pill {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  pointer-events: none;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
}
.cat-badge-img {
  width: 15px;
  height: 15px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}

@media (prefers-reduced-motion: reduce) {
  .card-content,
  .item-name,
  .card-img-scale {
    transition: none !important;
  }
  .item-card-slot::after,
  .card-inner::after {
    animation: none !important;
  }
}
</style>
