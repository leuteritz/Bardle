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
        <span class="badge-tooltip badge-tooltip--own">{{ d.effect }}</span>
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
        <span class="badge-tooltip badge-tooltip--enemy">{{ d.effect }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { DRAKE_TYPES, BARON_BUFF, type DrakeTypeDef } from '@/config/drakes'

interface Badge {
  id: string
  label: string
  color: string
  colorDark: string
  glow: string
  img: string
  effect: string
}

const battleStore = useBattleStore()

/** Both sides show the buff the killer team walked away with — same short copy as the modal. */
function drakeBadge(d: DrakeTypeDef): Badge {
  return { ...d, img: '/img/dragon.png', effect: d.effectText || `+${Math.round(d.winDelta * 100)}% win chance` }
}

function baronBadge(): Badge {
  return { ...BARON_BUFF, img: '/img/baron.png', effect: BARON_BUFF.effectText }
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

/* Effect tooltip: revealed on hover, floats below the pill so nothing reflows */
.badge-tooltip {
  position: absolute;
  top: calc(100% + 5px);
  max-width: min(280px, 34cqw);
  width: max-content;
  padding: 5px 10px;
  background: rgba(8, 7, 4, 0.95);
  border: 1px solid var(--dk-dark);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 8px var(--dk-glow);
  font-size: clamp(10px, 1.5cqh, 11px);
  line-height: 1.35;
  color: #c0b090;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.12s ease, visibility 0.12s ease;
  pointer-events: none;
}
.badge-tooltip--own {
  left: 0;
  text-align: left;
}
.badge-tooltip--enemy {
  right: 0;
  text-align: right;
}
.buff-badge:hover .badge-tooltip {
  opacity: 1;
  visibility: visible;
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
