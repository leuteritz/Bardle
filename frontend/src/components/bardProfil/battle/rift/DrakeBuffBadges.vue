<template>
  <!-- Persistent drake-effect badges under the header, stacked on the killer team's side -->
  <div class="buff-stack buff-stack--own">
    <TransitionGroup name="badge">
      <div
        v-for="d in ownBadges"
        :key="'own' + d.id"
        class="buff-badge buff-badge--own"
        :style="{ '--dk-color': d.color, '--dk-dark': d.colorDark, '--dk-glow': d.glow }"
      >
        <img src="/img/dragon.png" :alt="d.label" class="badge-img" />
        <div class="badge-text">
          <span class="badge-title">{{ d.label }}</span>
          <span class="badge-effect">{{ ownEffectText(d) }}</span>
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
        <div class="badge-text badge-text--enemy">
          <span class="badge-title">{{ d.label }}</span>
          <span class="badge-effect">−{{ Math.round(d.winDelta * 100) }}% your win chance</span>
        </div>
        <img src="/img/dragon.png" :alt="d.label" class="badge-img" />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { DRAKE_TYPES, type DrakeTypeDef } from '@/config/drakes'

const battleStore = useBattleStore()

const ownBadges = computed(() => battleStore.drakeBuffs.map((id) => DRAKE_TYPES[id]))
const enemyBadges = computed(() => battleStore.drakeBuffsT2.map((id) => DRAKE_TYPES[id]))

/** Own side shows the real battle effect; pure win-chance drakes show their swing instead. */
function ownEffectText(d: DrakeTypeDef): string {
  return d.effectText || `+${Math.round(d.winDelta * 100)}% win chance`
}
</script>

<style scoped>
.buff-stack {
  position: absolute;
  top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 7;
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
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid var(--dk-dark);
  border-radius: 4px;
}
/* Team edge marks whose trophy this is */
.buff-badge--own {
  box-shadow: inset 3px 0 0 #3b82f6, 0 0 10px var(--dk-glow);
}
.buff-badge--enemy {
  box-shadow: inset -3px 0 0 #ef4444, 0 0 10px var(--dk-glow);
}

.badge-img {
  width: clamp(32px, 5.8cqh, 44px);
  height: auto;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 6px var(--dk-glow));
}

.badge-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.badge-text--enemy {
  align-items: flex-end;
  text-align: right;
}
.badge-title {
  font-size: clamp(12px, 1.9cqh, 14px);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--dk-color);
  text-shadow: 0 0 8px var(--dk-glow);
  white-space: nowrap;
}
.badge-effect {
  font-size: clamp(10px, 1.5cqh, 11px);
  color: #c0b090;
  white-space: nowrap;
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
}
</style>
