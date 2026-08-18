<template>
  <!-- Every temporary effect the player currently carries, in one row right
       above the bottom scoreboard strip. Hidden while a bard profile tab
       covers the screen — nothing under there can be read anyway.

       During a star fight the row is docked into the modal's rail instead
       (`docked`): at the bottom of the screen it sat on top of the sun horizon
       and the player's own health bar. App.vue teleports the same instance —
       only the shape changes, from a wide row to a narrow column. -->
  <TransitionGroup
    v-if="uiStore.bardActiveTab === null"
    name="buff-chip"
    tag="div"
    class="buff-bar"
    :class="{ 'buff-bar--docked': props.docked }"
    role="status"
  >
    <div
      v-for="chip in chips"
      :key="chip.key"
      class="buff-chip"
      :class="{
        'buff-chip--expiring': chip.secondsLeft <= DRIFTER_BUFF_EXPIRY_WARN_SEC,
        'buff-chip--ranked': !!chip.rankColor,
      }"
      :style="{ '--chip-color': chip.color, '--chip-rank': chip.rankColor }"
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
import { useGameStore } from '@/stores/core/gameStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { omenIcon } from '@/utils/game/rolledIcons'
import { getOmen } from '@/config/progression/omens'
import {
  getDrifter,
  DRIFTER_BUFF_EFFECT_LABELS,
  DRIFTER_BUFF_LABEL_ALL,
  MVP_BUFF_ICON,
  MVP_BUFF_COLOR,
  MVP_BUFF_LABEL,
  MVP_BUFF_NAME,
} from '@/config/world/drifters'
import type { DrifterBuffEffects, TimedBuffEffects } from '@/types'
import {
  DRIFTER_BUFF_EXPIRY_WARN_SEC,
  DRIFTER_RARITY_COLOR,
  HONOR_MVP_BUFF_MULT,
  HONOR_MVP_BUFF_DURATION_S,
} from '@/config/constants'

/**
 * `docked` — the row stands as a narrow column in the star fight modal's rail
 * instead of across the bottom of the screen. Decided by App.vue, which also
 * does the teleporting; reading it from a store here would state it twice.
 */
const props = withDefaults(defineProps<{ docked?: boolean }>(), { docked: false })

const gameStore = useGameStore()
const uiStore = useUiStore()
const drifterStore = useDrifterStore()
const omenStore = useOmenStore()

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
  /**
   * Rank colour of the drifter this came from, if it came from one.
   *
   * Undefined for the MVP honour buff and for omen rewards — neither has a
   * rarity, and inventing one for them would say something untrue. A chip
   * without a rank simply has no rank edge.
   */
  rankColor?: string
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
      rankColor: DRIFTER_RARITY_COLOR[def.rarity],
    })
  }

  // Omen rewards last: they run the longest of the three, so they belong at the
  // quiet end of the row where they are not the thing that keeps changing.
  for (const buff of omenStore.liveBuffs) {
    const def = getOmen(buff.sourceId)
    if (!def) continue
    const keys = Object.keys(buff.effects) as (keyof TimedBuffEffects)[]
    const remainingMs = Math.max(0, buff.expiresAt - omenStore.omenNow)
    out.push({
      key: `omen-${buff.sourceId}`,
      // Das Glyph der erfüllten Karte; ein Buff aus einem alten Spielstand hat
      // keines gespeichert und bekommt eines aus seiner Motivfamilie.
      icon: buff.icon ?? omenIcon(def.id, 0),
      color: def.color,
      // Der Eilbonus steht im Namen und nicht als eigenes Zeichen: der Chip
      // hat für ein zweites Abzeichen keinen Platz, und wissen muss man es nur,
      // solange der Buff läuft.
      name: buff.swift ? `${def.name} (swift)` : def.name,
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
  /* Die Fähigkeitenleiste belegt dieselbe Ankerlinie über dem Scoreboard und
     veröffentlicht ihre gemessene Höhe — die Buff-Reihe stapelt sich darüber,
     statt eine Zahl zu raten. Ohne Leiste greift der Default 0px und die Reihe
     sitzt wieder wie zuvor. */
  bottom: calc(79px * var(--hud-scale, 1) + 16px + var(--ability-bar-h, 0px));
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

/* Rank edge down the left side. Two different statements, so two different
   edges: the hairline above is the drifter's OWN colour (which buff is this),
   this one is its rarity (what was it worth). The same split the info card
   makes with its top stripe and its left border.
   No beat of its own — a chip is HUD, not an effect. */
.buff-chip--ranked::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--chip-rank);
  opacity: 0.85;
  pointer-events: none;
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

/* ── Docked: the rail of the star fight modal ───────────────────────────
   Same instance, different shape: a column of narrow plates under the ability
   tiles. Everything a chip says stays — icon, multiplier, what it lifts and how
   long — only the plate is cut down to the width of the rail.

   `--chip-w: 100%` deliberately: the rail declares ONE width (`--sf-rail-w`),
   and the plates take it. A width of their own here would be a second source
   for the same measure, and the arena would jump sideways the moment the first
   buff appeared. */
.buff-bar--docked {
  --chip-h: 50px;
  position: static;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  max-width: none;
  transform: none;
  z-index: auto;
}

.buff-bar--docked .buff-chip {
  width: 100%;
  flex: 0 0 auto;
  height: var(--chip-h);
  gap: 7px;
  padding: 0 8px 0 7px;
}

.buff-bar--docked .buff-chip::before {
  height: 2px;
}

.buff-bar--docked .chip-icon {
  width: 24px;
  height: 24px;
}

.buff-bar--docked .chip-icon__glyph {
  width: 15px;
  height: 15px;
}

.buff-bar--docked .chip-text {
  gap: 3px;
}

.buff-bar--docked .chip-head {
  gap: 4px;
}

.buff-bar--docked .chip-mult {
  font-size: 15px;
}

.buff-bar--docked .chip-seconds {
  font-size: 13px;
}

.buff-bar--docked .chip-unit {
  font-size: 9px;
}

.buff-bar--docked .chip-label {
  font-size: 9px;
  letter-spacing: 0.9px;
}

.buff-bar--docked .chip-track {
  height: 3px;
}

/* Größere Schienen tragen größere Plaketten — dieselben Schwellen wie die
   Kachelleiter der Fähigkeitenleiste. */
@media (min-width: 2400px) {
  .buff-bar--docked {
    --chip-h: 58px;
  }

  .buff-bar--docked .chip-icon {
    width: 30px;
    height: 30px;
  }

  .buff-bar--docked .chip-icon__glyph {
    width: 19px;
    height: 19px;
  }

  .buff-bar--docked .chip-mult {
    font-size: 18px;
  }

  .buff-bar--docked .chip-seconds {
    font-size: 16px;
  }

  .buff-bar--docked .chip-unit {
    font-size: 11px;
  }

  .buff-bar--docked .chip-label {
    font-size: 11px;
  }
}

@media (min-width: 3400px) {
  .buff-bar--docked {
    --chip-h: 68px;
  }

  .buff-bar--docked .chip-icon {
    width: 36px;
    height: 36px;
  }

  .buff-bar--docked .chip-icon__glyph {
    width: 23px;
    height: 23px;
  }

  .buff-bar--docked .chip-mult {
    font-size: 22px;
  }

  .buff-bar--docked .chip-seconds {
    font-size: 19px;
  }

  .buff-bar--docked .chip-unit {
    font-size: 13px;
  }

  .buff-bar--docked .chip-label {
    font-size: 13px;
  }
}
</style>
