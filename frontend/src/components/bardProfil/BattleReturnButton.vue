<template>
  <Transition name="brb-slide">
    <button
      v-if="visible"
      type="button"
      class="brb"
      :class="{ 'brb--warning': isWarning, 'brb--critical': isCritical }"
      title="Jump back into the star fight"
      @click="returnToBattle"
    >
      <Icon icon="game-icons:sword-spin" width="24" height="24" class="brb-icon" />
      <span class="brb-title">Return to Battle</span>
      <span class="brb-timer">{{ secsLeft }}s</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/uiStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import {
  BATTLE_RETURN_TICK_MS,
  STAR_FIGHT_TIMER_WARNING_S,
  STAR_FIGHT_TIMER_CRITICAL_S,
} from '@/config/constants'

const uiStore = useUiStore()
const starGroupStore = useStarGroupStore()

const now = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, BATTLE_RETURN_TICK_MS)
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

// Der gemerkte Kampf-Stern — nur solange er noch lebt, gibt es einen Rückweg
const returnStar = computed(() => {
  if (!uiStore.battleReturnStarId) return null
  return starGroupStore.activeStars.find((s) => s.id === uiStore.battleReturnStarId) ?? null
})

const secsLeft = computed(() => {
  const s = returnStar.value
  if (!s || s.spawnedAt === undefined || s.durationMs === undefined) return 0
  return Math.max(0, Math.ceil((s.spawnedAt + s.durationMs - now.value) / 1000))
})

const visible = computed(() => returnStar.value !== null && secsLeft.value > 0)

const isWarning = computed(
  () => secsLeft.value <= STAR_FIGHT_TIMER_WARNING_S && secsLeft.value > STAR_FIGHT_TIMER_CRITICAL_S,
)
const isCritical = computed(() => secsLeft.value <= STAR_FIGHT_TIMER_CRITICAL_S)

function returnToBattle() {
  const starId = uiStore.battleReturnStarId
  uiStore.clearBattleReturn()
  uiStore.closeBardModal()
  if (starId) starGroupStore.openStarFightModal(starId)
}
</script>

<style scoped>
/* ── Rücksprung-Button — mittig zwischen Shop- und Expedition-Button im
   Sigil-Board (gleiche Grundmaße wie .sigil-action), aber als moderne
   Kampf-CTA: Crimson-Glow, Sheen-Sweep, kompakter Countdown ─────────────── */
.brb {
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
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.brb:hover {
  border-color: #ff5040;
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 0 0 26px rgba(255, 80, 50, 0.5);
}

.brb:active {
  transform: translateX(-50%) scale(0.97);
}

/* Sheen-Sweep: Lichtstreifen — ruht unsichtbar, läuft nur bei Hover */
.brb::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 30%;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 200, 160, 0.16),
    transparent
  );
  transform: skewX(-18deg);
  pointer-events: none;
}

.brb:hover::after {
  animation: brb-sheen 1.1s ease-in-out infinite;
}

@keyframes brb-sheen {
  0% {
    left: -40%;
  }
  100% {
    left: 130%;
  }
}

.brb-icon {
  color: #ff7a50;
  filter: drop-shadow(0 0 6px rgba(255, 90, 40, 0.55));
  flex-shrink: 0;
}

.brb-title {
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

/* Countdown — rahmenlos, große glühende Ziffern als eigener Blickfang */
.brb-timer {
  margin-left: 2px;
  /* Feste Ziffernbreite ("60s" = 2 Ziffern + s): der Button behält beim
     Runterzählen — auch beim Sprung auf einstellige Sekunden — seine Breite */
  min-width: 3.2ch;
  text-align: right;
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  text-shadow:
    0 0 12px rgba(232, 192, 64, 0.55),
    0 0 26px rgba(200, 130, 20, 0.3),
    0 2px 3px rgba(0, 0, 0, 0.95);
  flex-shrink: 0;
}

/* Warnung: Stern läuft bald ab — Countdown kippt in Amber */
.brb--warning .brb-timer {
  color: #e8a030;
  text-shadow:
    0 0 12px rgba(232, 160, 48, 0.6),
    0 0 26px rgba(200, 110, 20, 0.3),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

/* Kritisch: Rot — nur der Countdown pulsiert als Dringlichkeits-Signal */
.brb--critical {
  border-color: #ff5040;
}

.brb--critical .brb-timer {
  color: #ff5040;
  text-shadow:
    0 0 14px rgba(255, 60, 40, 0.7),
    0 0 30px rgba(220, 30, 20, 0.35),
    0 2px 3px rgba(0, 0, 0, 0.95);
  animation: brb-crit-pulse 0.7s ease-in-out infinite alternate;
}

@keyframes brb-crit-pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.12);
  }
}

/* ── Slide-In von unten ──────────────────────────────────────────────────── */
.brb-slide-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.brb-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.brb-slide-enter-from,
.brb-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

@media (prefers-reduced-motion: reduce) {
  .brb:hover::after,
  .brb--critical .brb-timer {
    animation: none;
  }
}
</style>
