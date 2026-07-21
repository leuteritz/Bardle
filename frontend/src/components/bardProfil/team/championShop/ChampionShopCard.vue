<template>
  <div
    class="champion-card-slot"
    :class="[cardClass, { 'is-selected': selected }]"
    :data-role="role"
    @click="$emit('select', name)"
    @mouseenter="$emit('hover', name)"
  >
    <div class="card-inner">
      <!-- Role badge pill: top-right — champion's role -->
      <div class="role-badge-pill" :style="{ background: roleBadge?.color }">
        {{ roleBadge?.label }}
      </div>

      <!-- Tier badge: top-left — Cosmic/Champion Tier (★N) -->
      <div
        v-if="!owned"
        class="tier-badge"
        :style="{ '--tier-c': tierColor }"
        :title="tierName"
      >
        ★{{ starLevel }}
      </div>

      <!-- Image layer: clipped to card-inner bounds -->
      <div class="card-img-layer">
        <img
          :src="image"
          :alt="name"
          loading="lazy"
          decoding="async"
          class="absolute inset-0 object-cover object-top w-full h-full rpg-img card-img-scale"
          :class="locked ? 'grayscale' : ''"
        />

        <img v-if="locked" src="/img/lock.png" alt="Locked" class="lock-overlay" />

        <div
          class="absolute inset-0 card-overlay"
          :class="buyable ? 'card-overlay--buyable' : 'card-overlay--default'"
        />

        <div
          v-if="buyable && !owned"
          class="absolute inset-0 pointer-events-none card-shimmer card-shimmer-anim"
        />
      </div>

      <!-- Content: name anchored to bottom of card-inner -->
      <div class="card-content">
        <span
          class="text-base font-black leading-tight tracking-wide champion-name"
          :class="owned || locked ? 'champion-name--dim' : 'champion-name--bright'"
        >
          {{ truncate(name, 12) }}
        </span>
      </div>

      <!-- Locked Tooltip -->
      <div v-if="locked" class="locked-tooltip">{{ lockedTooltip }}</div>
    </div>

    <!-- New champion badge (outside card-inner so it's not clipped) -->
    <RpgBadgeTooltip>
      <Transition name="champion-badge-fade">
        <RpgNotifyBadge v-if="isNew" :count="1" variant="shop" label="New champion" hoverable />
      </Transition>
      <template #tip>
        <div class="new-champ-tip">
          <div class="new-champ-tip__title">New Champion</div>
          <div class="new-champ-tip__text">
            {{ name }} was recently unlocked — recruit to add them to your roster.
          </div>
        </div>
      </template>
    </RpgBadgeTooltip>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import RpgNotifyBadge from '../../../ui/RpgNotifyBadge.vue'
import RpgBadgeTooltip from '../../../ui/RpgBadgeTooltip.vue'
import { truncate } from '../../../../config/numberFormat'

/**
 * Single champion card in the shop grid — purely presentational.
 * Clicking selects the champion (detail panel handles buying).
 */
export default defineComponent({
  name: 'ChampionShopCard',
  components: { RpgNotifyBadge, RpgBadgeTooltip },
  props: {
    name: { type: String, required: true },
    image: { type: String, required: true },
    role: { type: String, default: '' },
    roleBadge: {
      type: Object as () => { label: string; color: string } | undefined,
      default: undefined,
    },
    tierColor: { type: String, default: '#e8c040' },
    tierName: { type: String, default: '' },
    starLevel: { type: Number, default: 1 },
    cardClass: { type: String, default: '' },
    owned: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    buyable: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    lockedTooltip: { type: String, default: '' },
  },
  emits: ['select', 'hover'],
  setup() {
    return { truncate }
  },
})
</script>

<style scoped>
/* ══ Grid slot — invisible, holds layout space only ══ */
.champion-card-slot {
  height: 140px;
  position: relative;
  z-index: 1;
  --text-transition-dur: 0.22s;
}
.champion-card-slot:hover {
  z-index: 20;
}

/* Card state: pointer-events / opacity / filter on the slot.
   Every card is selectable (click opens the detail panel) — buying happens
   exclusively via the panel's Recruit button. */
.card-owned {
  opacity: 0.55;
  filter: grayscale(30%);
  cursor: default;
  pointer-events: none;
}
.card-buyable { cursor: pointer; }
.card-unlocked {
  opacity: 0.7;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.card-unlocked:hover {
  opacity: 1;
}
.card-locked {
  opacity: 0.4;
  filter: grayscale(55%);
  cursor: pointer;
}
.card-locked:hover {
  opacity: 0.6;
}

/* ══ Visual card ══ */
.card-inner {
  position: absolute;
  inset: 0;
  border-radius: var(--bp-radius);
  border: 1px solid var(--rpg-wood-mid);
  overflow: hidden;
  transition: border-color 0.25s ease;
  /* box-shadow snaps deliberately — transitioning the large glow blurs forced
     full repaints */
}
/* ── Role-specific card borders ── */
.champion-card-slot[data-role="top"]     { --role-c: #e05050; --role-c-hi: #f07070; }
.champion-card-slot[data-role="jungle"]  { --role-c: #50c060; --role-c-hi: #70d880; }
.champion-card-slot[data-role="mid"]     { --role-c: #5090e8; --role-c-hi: #70a8f8; }
.champion-card-slot[data-role="adc"]     { --role-c: #e89840; --role-c-hi: #f0b060; }
.champion-card-slot[data-role="support"] { --role-c: #b8c8d8; --role-c-hi: #d0dde8; }

/* Thicker role-colored frame so the champion's role reads at a glance */
.champion-card-slot[data-role] .card-inner {
  border-width: 3px;
  border-color: var(--role-c);
}

/* Role hover glow — excluded on buyable/owned so state styles always dominate */
.champion-card-slot[data-role="top"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #f07070;
  box-shadow: inset 0 0 0 1px rgba(224,80,80,0.25), 0 0 14px rgba(224,80,80,0.35);
}
.champion-card-slot[data-role="jungle"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #70d880;
  box-shadow: inset 0 0 0 1px rgba(80,192,96,0.25), 0 0 14px rgba(80,192,96,0.40);
}
.champion-card-slot[data-role="mid"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #70a8f8;
  box-shadow: inset 0 0 0 1px rgba(80,144,232,0.30), 0 0 16px rgba(80,144,232,0.45);
}
.champion-card-slot[data-role="adc"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #f0b060;
  box-shadow: inset 0 0 0 1px rgba(232,152,64,0.25), 0 0 16px rgba(232,152,64,0.40);
}
.champion-card-slot[data-role="support"]:not(.card-buyable):not(.card-owned):hover .card-inner {
  border-color: #d0dde8;
  box-shadow: inset 0 0 0 1px rgba(184,200,216,0.30), 0 0 16px rgba(184,200,216,0.35);
}

/* Buyable pulse — role inset glow complements the gold buyable border.
   Shadows are static on pseudo-elements; only opacity animates (compositor-only,
   no per-frame repaints — animating box-shadow directly caused scroll jank). */
.card-buyable.champion-card-slot:not(:hover)::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--bp-radius);
  pointer-events: none;
  box-shadow: 0 0 26px rgba(232, 192, 64, 0.12);
  animation: card-glow-pulse 2.5s ease-in-out infinite;
  animation-play-state: var(--pulse-play, running);
}
.card-buyable.champion-card-slot:not(:hover) .card-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--role-c, #e8c040) 35%, transparent);
  animation: card-ring-pulse 2.5s ease-in-out infinite;
  animation-play-state: var(--pulse-play, running);
}

@keyframes card-glow-pulse {
  0%, 100% { opacity: 0; }
  50%      { opacity: 1; }
}
@keyframes card-ring-pulse {
  0%, 100% { opacity: 0.43; }
  50%      { opacity: 1; }
}

.card-buyable .card-inner {
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 20px rgba(232, 192, 64, 0.12);
}
.champion-card-slot.card-buyable:hover .card-inner {
  border-color: #e8c040;
  box-shadow:
    0 0 38px rgba(232, 192, 64, 0.55),
    0 0 70px rgba(200, 144, 64, 0.25),
    inset 0 0 0 2px rgba(232, 192, 64, 0.58);
}

/* Hover no longer expands the card — it only enlarges the champion image and
   warms the border; all info lives in the detail panel. */
.champion-card-slot:hover .card-inner {
  border-color: #c89040;
  box-shadow:
    inset 0 0 0 1px #5c3310,
    0 0 22px rgba(200, 144, 64, 0.22);
}

/* ── Selected card: gold ring around the slot (drives the detail panel) ── */
.champion-card-slot.is-selected::before {
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

/* ── Image layer: clipped within card-inner ── */
.card-img-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--bp-radius);
}

/* Hover: only the champion image zooms in */
.card-img-scale {
  transition: transform 0.4s ease;
}
.champion-card-slot:hover .card-img-scale {
  transform: scale(1.14);
}

/* ── Gradient overlays ── */
.card-overlay {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.45) 50%,
    rgba(0, 0, 0, 0.15) 100%
  );
}
.card-overlay--buyable {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.35) 50%,
    transparent 100%
  );
}
.card-overlay--default {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.45) 50%,
    rgba(0, 0, 0, 0.1) 100%
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

/* ── Card content: anchored to bottom of card-inner ── */
.card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  z-index: 10;
  transition: transform var(--text-transition-dur) ease;
}
.champion-card-slot:hover .card-content {
  transform: translateY(-2px);
}

/* ── Champion name ── */
.champion-name {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
  transition: transform var(--text-transition-dur) ease, text-shadow var(--text-transition-dur) ease;
}
.champion-name--bright { color: rgba(255, 255, 255, 0.95); }
.champion-name--dim { color: rgba(255, 255, 255, 0.45); }
.champion-card-slot:hover .champion-name--bright {
  transform: scale(1.08);
  transform-origin: left bottom;
  text-shadow:
    0 2px 8px rgba(0, 0, 0, 0.9),
    0 0 12px rgba(232, 192, 64, 0.25);
}
.champion-card-slot:hover .champion-name--dim {
  transform: scale(1.06);
  transform-origin: left bottom;
}

/* ── Lock-Icon Overlay ── */
.lock-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  width: 32px;
  height: 32px;
  object-fit: contain;
  z-index: 12;
  opacity: 0.85;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.9));
  pointer-events: none;
}

/* ── Locked tooltip ── */
.locked-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.4rem 0.75rem;
  background: var(--rpg-bg-tooltip);
  border: 2px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  font-size: 0.6rem;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
}
.card-inner:hover .locked-tooltip {
  opacity: 1;
}

/* ── Role pill (top-right) & tier badge (top-left) ── */
.role-badge-pill {
  position: absolute;
  top: 5px;
  right: 5px;
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
  top: 5px;
  left: 5px;
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

/* ── New-champion badge tooltip content ── */
.new-champ-tip {
  padding: 8px 12px 9px;
  max-width: 240px;
}
.new-champ-tip__title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  margin-bottom: 4px;
}
.new-champ-tip__text {
  font-size: 0.8rem;
  line-height: 1.35;
  color: #e8e0cc;
}

.champion-badge-fade-leave-active {
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.champion-badge-fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .card-content,
  .champion-name,
  .card-img-scale {
    transition: none !important;
  }
  .card-inner {
    animation: none !important;
    transition: border-color 0.25s ease, box-shadow 0.25s ease !important;
  }
  .champion-card-slot::after,
  .card-inner::after {
    animation: none !important;
  }
}
</style>
