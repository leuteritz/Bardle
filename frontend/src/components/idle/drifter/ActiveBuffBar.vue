<template>
  <!-- Every temporary effect the player currently carries, in one row right
       above the bottom scoreboard strip. Hidden while a bard profile tab
       covers the screen — nothing under there can be read anyway. -->
  <TransitionGroup
    v-if="uiStore.bardActiveTab === null"
    name="buff-chip"
    tag="div"
    class="buff-bar"
    role="status"
  >
    <div
      v-for="chip in chips"
      :key="chip.key"
      class="buff-chip"
      :class="{ 'buff-chip--expiring': chip.secondsLeft <= DRIFTER_BUFF_EXPIRY_WARN_SEC }"
      :style="{ '--chip-color': chip.color }"
    >
      <!-- The icon carries the identity (every drifter has its own), so the
           text can stay down to what the buff DOES and how long it lasts.
           The full name is announced by the collect burst and the toast. -->
      <span class="chip-icon" :title="chip.name">
        <Icon :icon="chip.icon" class="chip-icon__glyph" :style="{ color: chip.color }" />
      </span>

      <span class="chip-text">
        <span class="chip-head">
          <span class="chip-mult">{{ chip.multiplier }}×</span>
          <!-- Reserved width: the seconds drop from two digits to one, and
               without the reservation every chip in the row would twitch
               sideways once per second. -->
          <span class="chip-clock">
            <span class="chip-seconds">{{ chip.secondsLeft }}</span>
            <span class="chip-unit">s</span>
          </span>
        </span>
        <!-- Own line across the full text column, so "DAMAGE" is not competing
             with the clock for the same few pixels. -->
        <span class="chip-label">{{ chip.label }}</span>
      </span>

      <span class="chip-track" aria-hidden="true">
        <span class="chip-progress" :style="{ transform: `scaleX(${chip.progress})` }"></span>
      </span>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useDrifterStore } from '@/stores/drifterStore'
import {
  getDrifter,
  DRIFTER_BUFF_EFFECT_LABELS,
  DRIFTER_BUFF_LABEL_ALL,
  MVP_BUFF_ICON,
  MVP_BUFF_COLOR,
  MVP_BUFF_LABEL,
  MVP_BUFF_NAME,
} from '@/config/drifters'
import type { DrifterBuffEffects } from '@/types'
import {
  DRIFTER_BUFF_EXPIRY_WARN_SEC,
  HONOR_MVP_BUFF_MULT,
  HONOR_MVP_BUFF_DURATION_S,
} from '@/config/constants'

const gameStore = useGameStore()
const uiStore = useUiStore()
const drifterStore = useDrifterStore()

interface BuffChip {
  key: string
  icon: string
  color: string
  name: string
  label: string
  multiplier: number
  secondsLeft: number
  /** 0..1 — remaining share of the buff's full duration. */
  progress: number
}

/**
 * One list for every timed effect. The MVP honor buff comes first because it
 * is granted by a battle result the player just watched; drifter buffs follow
 * in the order they were collected.
 */
const chips = computed<BuffChip[]>(() => {
  const out: BuffChip[] = []

  if (gameStore.mvpBuffSecondsLeft > 0) {
    out.push({
      key: 'mvp',
      icon: MVP_BUFF_ICON,
      color: MVP_BUFF_COLOR,
      name: MVP_BUFF_NAME,
      label: MVP_BUFF_LABEL,
      multiplier: HONOR_MVP_BUFF_MULT,
      secondsLeft: gameStore.mvpBuffSecondsLeft,
      progress: Math.min(1, gameStore.mvpBuffSecondsLeft / HONOR_MVP_BUFF_DURATION_S),
    })
  }

  for (const buff of drifterStore.liveBuffs) {
    const def = getDrifter(buff.sourceId)
    if (!def) continue
    const keys = Object.keys(buff.effects) as (keyof DrifterBuffEffects)[]
    const remainingMs = Math.max(0, buff.expiresAt - drifterStore.drifterNow)
    out.push({
      key: `drifter-${buff.sourceId}`,
      icon: def.icon,
      color: def.color,
      name: def.name,
      // A buff on a single axis names it; one that lifts several says so.
      label: keys.length === 1 ? DRIFTER_BUFF_EFFECT_LABELS[keys[0]] : DRIFTER_BUFF_LABEL_ALL,
      multiplier: Math.max(...keys.map((k) => buff.effects[k] ?? 1)),
      secondsLeft: Math.ceil(remainingMs / 1000),
      progress: buff.durationMs > 0 ? Math.min(1, remainingMs / buff.durationMs) : 0,
    })
  }

  return out
})
</script>

<style scoped>
/* The center strip of the bottom bar is 79px tall, scaled by --hud-scale —
   same anchor the MVP badge used before it moved in here.
   The width is capped to the gap between the two raised HUD panels (measured:
   1260px on Full HD, 1680px on QHD). Beyond that the row wraps upward instead
   of sliding over the travel and command panels. */
.buff-bar {
  /* Every chip is exactly this wide, whatever it says. A row where each plate
     sizes itself would re-flow once a second as "12s" becomes "9s" — six chips
     twitching sideways in the corner of the eye, right above the scoreboard.
     Six of these plus the gaps fit the narrowest gap (Full HD, 1260px) with
     room to spare; wider screens get bigger plates further down. */
  --chip-w: 176px;
  --chip-h: 84px;
  position: fixed;
  bottom: calc(79px * var(--hud-scale, 1) + 16px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10001;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: stretch;
  gap: 10px;
  /* Ohne max-content bekäme ein fixed-Element mit left:50% als Shrink-to-fit-
     Breite nur den Raum RECHTS davon, also die halbe Viewportbreite (Full HD:
     960px). Die Reihe wäre dann umgebrochen, lange bevor die max-width unten
     überhaupt greift — gemessen an sechs Chips, die in zwei Zeilen fielen,
     obwohl 1106px Inhalt in 1236px erlaubte Breite gepasst hätten. */
  width: max-content;
  max-width: calc(100vw - 2 * var(--hud-panel-size, 440px) - 24px);
  pointer-events: none;
}

.buff-chip {
  position: relative;
  width: var(--chip-w);
  height: var(--chip-h);
  flex: 0 0 var(--chip-w);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px 0 10px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  overflow: hidden;
}

/* Hairline in the buff's own color, so a row of chips stays readable at a
   glance without tinting the whole plate. */
.buff-chip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--chip-color, #e8c040);
}

/* Round stage in the buff's colour — the same treatment the drifter info card
   uses for the same object, so the two read as one system. */
.chip-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--chip-color, #e8c040) 55%, #14120c);
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--chip-color, #e8c040) 22%, #14120c),
    #100e08 74%
  );
}

.chip-icon__glyph {
  width: 30px;
  height: 30px;
}

.chip-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  line-height: 1;
}

.chip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.chip-mult {
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
  color: var(--chip-color, #e8c040);
}

.chip-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.6px;
  color: #b89b5a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Right-aligned with a reserved width: the number may lose a digit without
   moving anything else. Tabular figures keep the digits from dancing. */
.chip-clock {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 1px;
  min-width: 3.2ch;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.chip-seconds {
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
  color: #f2ead2;
}

.chip-unit {
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  color: #8a7a52;
}

.chip-track {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.07);
}

/* scaleX on the bar itself, driven by an inline transform — a width in percent
   would relayout the chip every second, and a CSS variable on the chip would
   invalidate its whole subtree. */
.chip-progress {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--chip-color, #e8c040);
  transition: transform 1s linear;
}

/* Last seconds: the chip pulses so an expiring window is noticed while the
   player is looking elsewhere. Opacity only — never a shadow or border color. */
.buff-chip--expiring {
  animation: chip-expiring 0.9s ease-in-out infinite;
}

@keyframes chip-expiring {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

/* ── Enter / leave ── */
.buff-chip-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.buff-chip-leave-active {
  transition:
    opacity 0.45s ease,
    transform 0.45s ease;
  animation: none !important;
}
.buff-chip-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.88);
}
.buff-chip-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.94);
}
.buff-chip-move {
  transition: transform 0.3s ease;
}

/* ── Auflösungsstufen ────────────────────────────────────────────────
   Die Plakette wächst mit dem Bildschirm; die Obergrenze ist stets, dass
   sechs davon zwischen die HUD-Panels passen (2K: 1680px frei, 4K: 2960px). */
@media (min-width: 2400px) {
  .buff-bar {
    --chip-w: 212px;
    --chip-h: 98px;
    gap: 12px;
  }
  .chip-icon {
    width: 62px;
    height: 62px;
  }
  .chip-icon__glyph {
    width: 36px;
    height: 36px;
  }
  .chip-mult {
    font-size: 35px;
  }
  .chip-label {
    font-size: 13px;
    letter-spacing: 1.9px;
  }
  .chip-seconds {
    font-size: 28px;
  }
  .chip-unit {
    font-size: 14px;
  }
  .chip-track {
    height: 5px;
  }
}

@media (min-width: 3400px) {
  .buff-bar {
    --chip-w: 258px;
    --chip-h: 118px;
    gap: 14px;
  }
  .chip-icon {
    width: 74px;
    height: 74px;
  }
  .chip-icon__glyph {
    width: 44px;
    height: 44px;
  }
  .chip-mult {
    font-size: 42px;
  }
  .chip-label {
    font-size: 15px;
    letter-spacing: 2.2px;
  }
  .chip-seconds {
    font-size: 34px;
  }
  .chip-unit {
    font-size: 17px;
  }
  .chip-track {
    height: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .buff-chip--expiring {
    animation: none;
  }
  .chip-progress {
    transition: none;
  }
}
</style>
