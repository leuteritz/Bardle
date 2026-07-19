<template>
  <!-- Persistent drake-effect badges under the header, stacked on the killer team's side.
       Compact pills show only the buff name; the effect appears in a hover tooltip. -->
  <div class="buff-stack buff-stack--own">
    <TransitionGroup name="badge">
      <div
        v-for="d in ownBadges"
        :key="'own' + d.id"
        class="buff-badge buff-badge--own"
        :style="{ '--dk-color': d.color, '--dk-dark': d.colorDark, '--dk-glow': d.glow }"
      >
        <img :src="d.img" :alt="d.label" class="badge-img" />
        <span class="badge-title">{{ d.label }}</span>
        <div class="badge-tooltip badge-tooltip--own">
          <div class="tip-topline"></div>
          <div class="tip-head">
            <img :src="d.img" :alt="d.label" class="tip-img" />
            <span class="tip-name">{{ d.label }}</span>
          </div>
          <p class="tip-effect">
            <template v-for="(s, i) in d.segments" :key="i">
              <span v-if="s.num" class="tip-num">{{ s.text }}</span>
              <template v-else>{{ s.text }}</template>
            </template>
          </p>
        </div>
      </div>
    </TransitionGroup>
  </div>

  <div class="buff-stack buff-stack--enemy">
    <TransitionGroup name="badge">
      <div
        v-for="d in enemyBadges"
        :key="'enemy' + d.id"
        class="buff-badge buff-badge--enemy"
        :style="{ '--dk-color': d.color, '--dk-dark': d.colorDark, '--dk-glow': d.glow }"
      >
        <span class="badge-title">{{ d.label }}</span>
        <img :src="d.img" :alt="d.label" class="badge-img" />
        <div class="badge-tooltip badge-tooltip--enemy">
          <div class="tip-topline"></div>
          <div class="tip-head">
            <img :src="d.img" :alt="d.label" class="tip-img" />
            <span class="tip-name">{{ d.label }}</span>
          </div>
          <p class="tip-effect">
            <template v-for="(s, i) in d.segments" :key="i">
              <span v-if="s.num" class="tip-num">{{ s.text }}</span>
              <template v-else>{{ s.text }}</template>
            </template>
          </p>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { DRAKE_TYPES, BARON_BUFF, type DrakeTypeDef } from '@/config/drakes'

interface EffectSegment {
  text: string
  /** numeric value (e.g. "+40%", "x2") — rendered highlighted in the drake color */
  num: boolean
}

interface Badge {
  id: string
  label: string
  color: string
  colorDark: string
  glow: string
  img: string
  segments: EffectSegment[]
}

const battleStore = useBattleStore()

/** Split effect copy so numbers/multipliers can be tinted in the drake color. */
function toSegments(effect: string): EffectSegment[] {
  return effect
    .split(/([+\-x×]?\d+(?:[.,]\d+)?%?)/g)
    .filter((s) => s !== '')
    .map((text) => ({ text, num: /\d/.test(text) }))
}

/** Both sides show the buff the killer team walked away with — same short copy as the modal. */
function drakeBadge(d: DrakeTypeDef): Badge {
  const effect = d.effectText || `+${Math.round(d.winDelta * 100)}% win chance`
  return { ...d, img: '/img/dragon.png', segments: toSegments(effect) }
}

function baronBadge(): Badge {
  return { ...BARON_BUFF, img: '/img/baron.png', segments: toSegments(BARON_BUFF.effectText) }
}

const ownBadges = computed<Badge[]>(() => [
  ...battleStore.drakeBuffs.map((id) => drakeBadge(DRAKE_TYPES[id])),
  ...(battleStore.baronKilledByTeam === 1 ? [baronBadge()] : []),
])
const enemyBadges = computed<Badge[]>(() => [
  ...battleStore.drakeBuffsT2.map((id) => drakeBadge(DRAKE_TYPES[id])),
  ...(battleStore.baronKilledByTeam === 2 ? [baronBadge()] : []),
])
</script>

<style scoped>
.buff-stack {
  position: absolute;
  top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 7;
  /* Stack itself stays transparent to clicks; each pill re-enables hover */
  pointer-events: none;
}
/* team HUD width (--hud-w from .rift-board) + gaps keeps the stacks clear of
   the floating team columns at every board size */
.buff-stack--own {
  left: calc(var(--hud-w, 192px) + 16px);
  align-items: flex-start;
}
.buff-stack--enemy {
  right: calc(var(--hud-w, 192px) + 16px);
  align-items: flex-end;
}

.buff-badge {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid var(--dk-dark);
  border-radius: 999px;
  pointer-events: auto;
  cursor: default;
}
/* Team edge marks whose trophy this is */
.buff-badge--own {
  box-shadow: inset 2px 0 0 #3b82f6, 0 0 8px var(--dk-glow);
}
.buff-badge--enemy {
  box-shadow: inset -2px 0 0 #ef4444, 0 0 8px var(--dk-glow);
}
.buff-badge:hover {
  background: rgba(0, 0, 0, 0.85);
  z-index: 1;
}

.badge-img {
  width: clamp(16px, 3cqh, 22px);
  height: auto;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 4px var(--dk-glow));
}

.badge-title {
  font-size: clamp(10px, 1.6cqh, 12px);
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--dk-color);
  text-shadow: 0 0 6px var(--dk-glow);
  white-space: nowrap;
}

/* Effect tooltip: RPG item-card revealed on hover, floats below the pill so
   nothing reflows. Sized with cq units so it stays readable on every desktop
   resolution without ever dwarfing the minimap. */
.badge-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  width: max-content;
  background: #0e0c07;
  border: 1px solid var(--dk-dark);
  border-radius: 5px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.75), 0 0 12px var(--dk-glow);
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity 0.14s ease, transform 0.14s ease, visibility 0.14s ease;
  pointer-events: none;
}
.badge-tooltip--own {
  left: 0;
}
.badge-tooltip--enemy {
  right: 0;
}
.buff-badge:hover .badge-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

/* Colored signature line across the card top, in the drake's color */
.tip-topline {
  height: 3px;
  background: linear-gradient(to right, transparent, var(--dk-color), transparent);
}

.tip-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 5px;
}

.tip-img {
  width: clamp(20px, 3.2cqh, 28px);
  height: auto;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 5px var(--dk-glow));
}

.tip-name {
  font-size: clamp(12px, 1.9cqh, 15px);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--dk-color);
  text-shadow: 0 0 8px var(--dk-glow);
  white-space: nowrap;
}

/* Effect always on one single line — the card grows to fit instead of wrapping */
.tip-effect {
  margin: 0;
  padding: 0 12px 10px;
  font-size: clamp(12px, 1.8cqh, 14px);
  line-height: 1.5;
  color: #e2d9c4;
  text-align: left;
  white-space: nowrap;
}
.tip-effect::first-letter {
  text-transform: uppercase;
}

/* Numbers pop in the drake color so the payoff is scannable at a glance */
.tip-num {
  color: var(--dk-color);
  font-weight: 800;
  text-shadow: 0 0 6px var(--dk-glow);
}

/* Entrance: punch in with a short glow flare, then rest — no idle looping */
.badge-enter-active {
  animation: badge-punch 0.5s cubic-bezier(0.2, 1.5, 0.4, 1);
}
.badge-leave-active {
  transition: opacity 0.2s ease;
}
.badge-leave-to {
  opacity: 0;
}

@keyframes badge-punch {
  0% {
    opacity: 0;
    transform: scale(1.3);
    filter: brightness(1.7) drop-shadow(0 0 14px var(--dk-glow));
  }
  60% {
    opacity: 1;
    filter: brightness(1.35) drop-shadow(0 0 10px var(--dk-glow));
  }
  100% {
    transform: scale(1);
    filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .badge-enter-active {
    animation: none !important;
  }
  .badge-tooltip {
    transition: none;
  }
}
</style>
