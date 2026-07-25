<template>
  <Transition name="btrb-slide">
    <button
      v-if="visible"
      type="button"
      class="btrb"
      title="Back to the battle tab"
      @click="backToBattleTab"
    >
      <Icon icon="game-icons:swords-emblem" width="24" height="24" class="btrb-icon" />
      <span class="btrb-title">Back to Battle</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/uiStore'
import { useStarGroupStore } from '@/stores/starGroupStore'

const uiStore = useUiStore()
const starGroupStore = useStarGroupStore()

/** A live star fight outranks this: its own return button owns the same spot
 *  and is time-critical, so we stand down while it is showing. */
const starFightReturnVisible = computed(
  () =>
    uiStore.battleReturnStarId !== null &&
    starGroupStore.activeStars.some((s) => s.id === uiStore.battleReturnStarId),
)

const visible = computed(() => uiStore.battleTabReturnPending && !starFightReturnVisible.value)

function backToBattleTab() {
  uiStore.returnToBattleTab()
}
</script>

<style scoped>
/* ── Rücksprung in den Battle-Tab — gleiche Optik, Maße und Position wie der
   StarFight-Rücksprung (BattleReturnButton), nur ohne Countdown. Beide sind nie
   gleichzeitig sichtbar, teilen sich also denselben Ankerpunkt. ──────────── */
.btrb {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 24px;
  border-radius: 5px;
  background: rgba(14, 10, 5, 0.88);
  border: 2px solid #8a2018;
  cursor: pointer;
  overflow: hidden;
  /* Ruhezustand bewusst statisch — dezenter konstanter Glow, keine Animation */
  box-shadow: 0 0 14px rgba(220, 50, 30, 0.28);
  transition:
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.btrb:hover {
  border-color: #ff5040;
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 0 0 26px rgba(255, 80, 50, 0.5);
}

.btrb:active {
  transform: translateX(-50%) scale(0.97);
}

/* Sheen-Sweep: Lichtstreifen — ruht unsichtbar, läuft nur bei Hover */
.btrb::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 30%;
  background: linear-gradient(to right, transparent, rgba(255, 200, 160, 0.16), transparent);
  transform: skewX(-18deg);
  pointer-events: none;
}

.btrb:hover::after {
  animation: btrb-sheen 1.1s ease-in-out infinite;
}

@keyframes btrb-sheen {
  0% {
    left: -40%;
  }
  100% {
    left: 130%;
  }
}

.btrb-icon {
  color: #ff7a50;
  filter: drop-shadow(0 0 6px rgba(255, 90, 40, 0.55));
  flex-shrink: 0;
}

.btrb-title {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ffb09a;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    0 0 12px rgba(255, 80, 40, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.95);
}

/* ── Slide-In von unten ──────────────────────────────────────────────────── */
.btrb-slide-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.btrb-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.btrb-slide-enter-from,
.btrb-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

@media (prefers-reduced-motion: reduce) {
  .btrb:hover::after {
    animation: none;
  }
}
</style>
