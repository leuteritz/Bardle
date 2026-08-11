<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import {
  GAME_SPEED_DEFAULT,
  GAME_SPEED_MAX,
  GAME_SPEED_MIN,
  GAME_SPEED_PRESETS,
  HOURS_PER_DAY,
} from '@/config/constants'

const gameStore = useGameStore()

const speed = computed(() => gameStore.gameSpeed)
const isLive = computed(() => speed.value === GAME_SPEED_DEFAULT)

/** Freier Wert im Stepper — erst beim Verlassen des Feldes übernommen. */
const editing = ref<string | null>(null)

function apply(next: number) {
  gameStore.setGameSpeed(next)
}

function commitEdit() {
  const parsed = Number.parseFloat(editing.value ?? '')
  editing.value = null
  if (Number.isFinite(parsed)) apply(parsed)
}

/**
 * Was der Faktor konkret bedeutet. Ein nackter Multiplikator sagt nichts
 * darüber, wie lange ein Messlauf dauert — und genau das ist die Frage, die man
 * beim Einstellen hat.
 */
const realHoursPerGameDay = computed(() => HOURS_PER_DAY / speed.value)
const dayEstimate = computed(() => {
  const h = realHoursPerGameDay.value
  if (h >= 1) return `${h.toFixed(h < 10 ? 1 : 0)} h`
  return `${Math.round(h * 60)} min`
})
</script>

<template>
  <div class="gs-panel" :class="{ 'gs-panel--warp': !isLive }">
    <div class="gs-row">
      <span class="gs-label">
        <Icon icon="game-icons:extra-time" class="gs-label-icon" width="18" height="18" />
        Time Warp
      </span>

      <!-- `1×` ist bewusst kein gleichrangiges Preset: es ist der Rückweg ins
           Live-Spiel und der Knopf, den man im Zweifel sucht. -->
      <button
        class="gs-live"
        :class="{ 'gs-live--active': isLive }"
        @click="apply(GAME_SPEED_DEFAULT)"
      >
        1× LIVE
      </button>

      <div class="gs-presets">
        <button
          v-for="p in GAME_SPEED_PRESETS"
          :key="p"
          class="gs-preset"
          :class="{ 'gs-preset--active': speed === p }"
          @click="apply(p)"
        >
          {{ p }}×
        </button>
      </div>

      <div class="gs-stepper">
        <input
          type="number"
          class="gs-input"
          :min="GAME_SPEED_MIN"
          :max="GAME_SPEED_MAX"
          step="0.5"
          :value="editing ?? speed"
          @focus="editing = String(speed)"
          @input="editing = ($event.target as HTMLInputElement).value"
          @blur="commitEdit"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        />
        <span class="gs-input-suffix">×</span>
      </div>
    </div>

    <div class="gs-note">
      <template v-if="isLive">
        Live pace — every number below is what a real player experiences.
      </template>
      <template v-else>
        1 real minute = {{ speed }} game minutes · one game day in {{ dayEstimate }}
      </template>
      <button
        v-if="isLive && gameStore.lastGameSpeed !== GAME_SPEED_DEFAULT"
        class="gs-last"
        @click="apply(gameStore.lastGameSpeed)"
      >
        resume {{ gameStore.lastGameSpeed }}×
      </button>
    </div>
  </div>
</template>

<style scoped>
.gs-panel {
  flex-shrink: 0;
  padding: 7px 10px 6px;
  border-radius: var(--bp-radius);
  border: 1px solid #5c3310;
  background: #1a1008;
  transition: border-color 0.15s;
}
/* Der Kasten färbt sich um, sobald er nicht mehr live ist — dieselbe Warnfarbe
   wie der Bildschirmrahmen, damit beide als ein Zustand gelesen werden. */
.gs-panel--warp {
  border-color: #cc6050;
  background: #1e1008;
}

.gs-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.gs-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #e8c040;
  white-space: nowrap;
}
.gs-label-icon {
  color: #e8c040;
}

.gs-live,
.gs-preset {
  font-family: inherit;
  font-size: 0.72rem;
  line-height: 1;
  padding: 5px 8px;
  border-radius: 4px;
  border: 1px solid #5c3310;
  background: #141410;
  color: #c9bfa4;
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;
}
.gs-live:hover,
.gs-preset:hover {
  border-color: #7a4e20;
  color: #f0e6c8;
}

.gs-live {
  font-weight: 700;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.gs-live--active {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border-color: #6ec040;
  color: #f4ffe8;
}

.gs-presets {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.gs-preset--active {
  background: linear-gradient(to bottom, #cc6050, #7a2a1c);
  border-color: #e08070;
  color: #fff0e8;
}

.gs-stepper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}
.gs-input {
  width: 52px;
  padding: 4px 5px;
  font-family: inherit;
  font-size: 0.72rem;
  text-align: right;
  border-radius: 4px;
  border: 1px solid #5c3310;
  background: #111008;
  color: #e8c040;
}
.gs-input:focus {
  outline: none;
  border-color: #c89040;
}
.gs-input-suffix {
  font-size: 0.72rem;
  color: #8a7c5c;
}

.gs-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  font-size: 0.64rem;
  line-height: 1.2;
  color: #8a7c5c;
}
.gs-panel--warp .gs-note {
  color: #d89080;
}

.gs-last {
  font-family: inherit;
  font-size: 0.62rem;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #5c3310;
  background: #141410;
  color: #c9bfa4;
  cursor: pointer;
}
.gs-last:hover {
  border-color: #7a4e20;
  color: #f0e6c8;
}
</style>
