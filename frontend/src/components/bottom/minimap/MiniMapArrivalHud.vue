<template>
  <!-- Instrument row of the docked star system: how long the star still
       stands (top left, where the arrival countdown sat during the flight)
       and how many of its planets are still hostile (top right, where the
       rescue counter sits). Both slots are free while arrived, so the eye
       finds the numbers exactly where it left them. -->
  <div v-if="star" class="arrival-hud" aria-hidden="true">
    <div v-if="secsLeft !== null" class="ah-timer" :class="{ 'ah-timer--critical': isCritical }">
      <div class="ah-timer-row">
        <span v-ink-center class="ah-timer-label">Star</span>
        <span v-ink-center class="ah-timer-value" :style="{ color: timerColor }">
          {{ timerText }}
        </span>
      </div>
      <div class="ah-timer-track">
        <div
          class="ah-timer-fill"
          :style="{ transform: `scaleX(${timePct})`, background: timerColor }"
        />
      </div>
    </div>

    <div class="ah-planets">
      <div class="ah-planets-row">
        <Icon icon="game-icons:ringed-planet" width="28" height="28" class="ah-planets-icon" />
        <span class="ah-planets-value"
          >{{ activeCount }}<span class="ah-planets-sep">/</span>{{ totalCount }}</span
        >
      </div>
      <div class="ah-planets-label">Planets active</div>
    </div>

    <!-- Statusmarken des Systems, unten mittig im freien Feld. Reihenfolge
         wie am Stern selbst (StarSystemComponent): Fluch oben — unser Debuff
         AUF dem Stern —, Rage darunter, weil sie dem Boss gehört. -->
    <div class="ah-states">
      <Transition name="ah-state">
        <div
          v-if="curseDef && curseSecsLeft > 0"
          class="ah-state ah-state--curse"
          :class="{ 'ah-state--urgent': curseSecsLeft <= STATE_URGENT_S }"
        >
          <Icon :icon="curseDef.icon" class="ah-state-icon" width="16" height="16" />
          <span class="ah-state-label">{{ curseDef.name }}</span>
          <span class="ah-state-secs">{{ curseSecsLeft }}s</span>
        </div>
      </Transition>

      <Transition name="ah-state">
        <div v-if="rageSecsLeft > 0" class="ah-state ah-state--rage">
          <span class="ah-state-label">Rage</span>
          <span class="ah-state-secs">{{ rageSecsLeft }}s</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useRoleBehaviorStore, CURSE_DEFS } from '@/stores/battle/roleBehaviorStore'
import {
  HUD_COUNTDOWN_TICK_MS,
  MS_PER_SECOND,
  ROLE_MID_CURSE_URGENT_S,
  STAR_FIGHT_TIMER_CRITICAL_S,
  STAR_FIGHT_TIMER_WARNING_S,
} from '@/config/constants'
import { gameNow } from '@/utils/game/gameClock'
import { championStarDeadlineAt } from '@/utils/orbit/starLifetime'

const starGroupStore = useStarGroupStore()
const roleBehaviorStore = useRoleBehaviorStore()

const STATE_URGENT_S = ROLE_MID_CURSE_URGENT_S

// Die Deadline im Store ist reaktiv, gameNow() nicht — ein Ticker treibt den
// Vergleich. Die Komponente existiert nur im Arrival-Zustand (v-if im Parent),
// der Timer läuft also nicht nebenher weiter.
const now = ref(gameNow())
let tickId: number | null = null

onMounted(() => {
  tickId = window.setInterval(() => {
    now.value = gameNow()
  }, HUD_COUNTDOWN_TICK_MS)
})

onUnmounted(() => {
  if (tickId !== null) window.clearInterval(tickId)
  tickId = null
})

const star = computed(
  () => starGroupStore.activeStars.find((s) => s.starType === 'champion') ?? null,
)

/** Die Frist kommt aus `starLifetime` — dieselbe Rechnung, die auch die
 *  Header-Bars und die Pause-Karte des Champion-Sterns anstellen. */
const deadline = computed(() => (star.value ? championStarDeadlineAt(star.value) : null))

const secsLeft = computed<number | null>(() => {
  if (deadline.value === null) return null
  return Math.max(0, Math.ceil((deadline.value - now.value) / MS_PER_SECOND))
})

/** Restanteil 0–1 für den Balken — feiner als die auf Sekunden gerundete Zahl. */
const timePct = computed(() => {
  const s = star.value
  if (!s || deadline.value === null || !s.durationMs) return 0
  return Math.max(0, Math.min(1, (deadline.value - now.value) / s.durationMs))
})

const timerText = computed(() => {
  const total = secsLeft.value ?? 0
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${String(sec).padStart(2, '0')}`
})

const isCritical = computed(
  () => secsLeft.value !== null && secsLeft.value <= STAR_FIGHT_TIMER_CRITICAL_S,
)

// Gleiche Ampel wie der Despawn-Ring im Star-Fight-HUD (useBossFightHud)
const timerColor = computed(() => {
  if (isCritical.value) return '#ff5040'
  if (secsLeft.value !== null && secsLeft.value <= STAR_FIGHT_TIMER_WARNING_S) return '#e8a030'
  return '#e8c040'
})

const totalCount = computed(() => star.value?.planetSlots.length ?? 0)
const activeCount = computed(
  () => star.value?.planetSlots.filter((p) => !p.cleared).length ?? 0,
)

// ── Statuslage: Fluch liegt auf dem Stern, Rage gehört seinem Boss ──────────
const activeCurse = computed(() => {
  const c = roleBehaviorStore.activeCurse
  if (!c || !star.value) return null
  if (roleBehaviorStore.cursedStarId !== star.value.id) return null
  if (now.value >= c.activeUntil) return null
  return c
})

const curseDef = computed(() => (activeCurse.value ? CURSE_DEFS[activeCurse.value.type] : null))

const curseSecsLeft = computed(() =>
  activeCurse.value
    ? Math.max(0, Math.ceil((activeCurse.value.activeUntil - now.value) / MS_PER_SECOND))
    : 0,
)

const rageSecsLeft = computed(() => {
  if (!star.value || roleBehaviorStore.rageStarId !== star.value.id) return 0
  const until = roleBehaviorStore.rageActiveUntil
  if (until <= now.value) return 0
  return Math.max(0, Math.ceil((until - now.value) / MS_PER_SECOND))
})
</script>

<style scoped>
.arrival-hud {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  user-select: none;
  animation: arrival-hud-fadein 0.4s ease both;
}

@keyframes arrival-hud-fadein {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Star despawn timer (top left, same slot as the arrival countdown) ── */
.ah-timer {
  position: absolute;
  top: 16px;
  left: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.ah-timer-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.ah-timer-label {
  font-size: 14px;
  letter-spacing: 0.18em;
  color: #8a6a30;
  text-transform: uppercase;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.ah-timer-value {
  font-size: 34px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow:
    0 2px 5px rgba(0, 0, 0, 0.95),
    0 0 16px rgba(0, 0, 0, 0.5);
  transition: color 0.3s ease;
}

/* Nur opacity animiert — der Wert steht über dem laufenden Canvas */
.ah-timer--critical .ah-timer-value {
  animation: ah-timer-blink 0.8s ease-in-out infinite alternate;
}

@keyframes ah-timer-blink {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

.ah-timer-track {
  position: relative;
  width: 132px;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  background: #14100a;
  box-shadow: inset 0 0 0 1px #3e200a;
}

.ah-timer-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  border-radius: 3px;
  transition:
    transform 0.25s linear,
    background 0.3s ease;
}

/* ── Planet counter (top right, mirrors the rescue counter) ── */
.ah-planets {
  position: absolute;
  top: 16px;
  right: 42px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.ah-planets-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ah-planets-icon {
  color: #9fb4e8;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.9));
}

.ah-planets-value {
  font-size: 34px;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow:
    0 2px 5px rgba(0, 0, 0, 0.95),
    0 0 16px rgba(232, 192, 64, 0.3);
}

.ah-planets-sep {
  font-size: 24px;
  color: rgba(232, 192, 64, 0.55);
  margin: 0 3px;
}

.ah-planets-label {
  font-size: 17px;
  color: rgba(232, 192, 64, 0.72);
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

/* ── Status marks (bottom centre, in the free field below the system) ── */
.ah-states {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.ah-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  padding: 3px 9px;
  border-radius: 4px;
}

.ah-state--rage {
  background: rgba(26, 5, 14, 0.88);
  border: 1px solid rgba(255, 46, 99, 0.75);
}

.ah-state--curse {
  background: rgba(16, 4, 30, 0.88);
  border: 1px solid rgba(160, 40, 255, 0.75);
}

.ah-state-label {
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.ah-state-secs {
  font-size: 17px;
  font-weight: 800;
  line-height: 1;
  /* Tabellenziffern: die Marke darf beim Herunterzählen nicht zappeln */
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.ah-state-icon {
  flex-shrink: 0;
}

.ah-state--rage .ah-state-label {
  color: #ffb0c4;
  text-shadow:
    0 0 8px rgba(255, 46, 99, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.ah-state--rage .ah-state-secs {
  color: #ff5c85;
  text-shadow:
    0 0 8px rgba(255, 46, 99, 0.7),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.ah-state--curse .ah-state-label {
  /* Fluchnamen sind länger als "Rage" — engere Sperrung hält die Marke schmal */
  letter-spacing: 0.14em;
  color: #d9a0ff;
  text-shadow:
    0 0 8px rgba(160, 40, 255, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.ah-state--curse .ah-state-secs {
  color: #c060ff;
  text-shadow:
    0 0 8px rgba(160, 40, 255, 0.7),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.ah-state--curse .ah-state-icon {
  color: #cc44ff;
}

/* Letzte Sekunden: der Fluch blinkt, bleibt aber violett — ein Umschlag auf
   Rot läse sich direkt über der Crimson-Rage als zweiter Rage-Zustand. */
.ah-state--urgent {
  animation: ah-state-urgent 0.55s ease-in-out infinite;
}

@keyframes ah-state-urgent {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.ah-state-enter-active,
.ah-state-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.ah-state-enter-from,
.ah-state-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .ah-timer--critical .ah-timer-value,
  .ah-state--urgent {
    animation: none;
  }
}
</style>
