<template>
  <TransitionGroup
    v-if="uiStore.bardActiveTab === null || props.dock === 'pause'"
    name="buff-chip"
    tag="div"
    class="buff-bar"
    :class="{
      'buff-bar--free': props.dock === 'free',
      'buff-bar--docked': props.dock === 'rail',
      'buff-bar--pause': props.dock === 'pause',
      'buff-bar--empty': props.dock === 'pause' && buffs.length === 0,
    }"
    role="status"
  >
    <article
      v-for="buff in visibleBuffs"
      :key="buff.key"
      class="buff-chip"
      :class="{
        'buff-chip--expiring': buff.timer && buff.timer.secondsLeft <= DRIFTER_BUFF_EXPIRY_WARN_SEC,
        'buff-chip--endless': !buff.timer,
        'buff-chip--ranked': !!buff.rankColor,
      }"
      :style="{ '--chip-color': buff.color, '--chip-rank': buff.rankColor }"
      :aria-label="buffAriaLabel(buff)"
      tabindex="0"
      v-tip="buffTip(buff)"
    >
      <span class="chip-pulse" aria-hidden="true" />
      <span class="chip-icon">
        <img
          v-if="buff.image"
          :src="buff.image"
          alt=""
          class="chip-art"
          draggable="false"
        />
        <Icon v-else-if="buff.icon" :icon="buff.icon" class="chip-glyph" aria-hidden="true" />
      </span>

      <template v-if="props.dock === 'free'">
        <span class="chip-clock">
          <template v-if="buff.timer">
            <span class="chip-seconds">{{ buff.timer.secondsLeft }}</span>
            <span class="chip-unit">s</span>
          </template>
          <span v-else class="chip-endless">∞</span>
        </span>
      </template>

      <template v-else>
        <span class="chip-text">
          <span class="chip-head">
            <span v-if="props.dock === 'pause'" class="chip-name">{{ buff.name }}</span>
            <span v-else class="chip-mult">{{ buff.multiplier }}×</span>
            <span class="chip-clock">
              <template v-if="buff.timer">
                <span class="chip-seconds">{{ buff.timer.secondsLeft }}</span>
                <span class="chip-unit">s</span>
              </template>
              <span v-else class="chip-endless">∞</span>
            </span>
          </span>
          <span class="chip-label">
            <span v-if="props.dock === 'pause'" class="chip-label-mult">{{ buff.multiplier }}×</span>
            {{ buff.label }}
          </span>
        </span>
      </template>

      <span
        class="chip-track"
        :style="{ transform: `scaleX(${buff.timer ? buff.timer.progress : 1})` }"
        aria-hidden="true"
      />
    </article>

    <span
      v-if="props.dock === 'pause' || (props.dock === 'free' && overflowCount > 0)"
      key="more"
      class="buff-chip--more"
      :aria-label="
        overflowCount > 0
          ? `${overflowCount} more effect${overflowCount === 1 ? '' : 's'} running`
          : undefined
      "
      :tabindex="overflowCount > 0 ? 0 : undefined"
      v-tip="
        overflowCount > 0
          ? `${overflowCount} more effect${overflowCount === 1 ? '' : 's'} running`
          : null
      "
    >
      <span v-if="overflowCount > 0">+{{ overflowCount }}</span>
    </span>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useActiveBuffList, type ActiveBuffView } from '@/composables/ui/useActiveBuffList'
import {
  ACTIVE_BUFF_HUD,
  DRIFTER_BUFF_EXPIRY_WARN_SEC,
  DRIFTER_RARITY_COLOR,
  PAUSE_KIT_EFFECT_COLS,
} from '@/config/constants'
import type { AbilityBarDock } from '@/types'
import type { TipValue } from '@/utils/ui/tipDirective'

const props = withDefaults(defineProps<{ dock?: AbilityBarDock }>(), { dock: 'free' })
const uiStore = useUiStore()
const { buffs } = useActiveBuffList()

const freeTileSize = `${ACTIVE_BUFF_HUD.TILE_SIZE}px`
const freeTileSizeCompact = `${ACTIVE_BUFF_HUD.TILE_SIZE_COMPACT}px`
const freeTileSizeWide = `${ACTIVE_BUFF_HUD.TILE_SIZE_WIDE}px`
const freeIconSize = `${ACTIVE_BUFF_HUD.ICON_SIZE}px`
const freeIconSizeCompact = `${ACTIVE_BUFF_HUD.ICON_SIZE_COMPACT}px`
const freeIconSizeWide = `${ACTIVE_BUFF_HUD.ICON_SIZE_WIDE}px`
const freeGap = `${ACTIVE_BUFF_HUD.GAP}px`
const freeGapCompact = `${ACTIVE_BUFF_HUD.GAP_COMPACT}px`
const freeGapWide = `${ACTIVE_BUFF_HUD.GAP_WIDE}px`
const panelInset = `${ACTIVE_BUFF_HUD.PANEL_INSET}px`
const viewportInset = `${ACTIVE_BUFF_HUD.VIEWPORT_INSET}px`
const bottomGap = `${ACTIVE_BUFF_HUD.BOTTOM_GAP}px`
const auxiliaryHudClearance = `${ACTIVE_BUFF_HUD.AUX_HUD_CLEARANCE}px`
const drainInset = `${ACTIVE_BUFF_HUD.DRAIN_INSET}px`

const visibleBuffs = computed<ActiveBuffView[]>(() => {
  if (props.dock === 'pause') return buffs.value.slice(0, PAUSE_KIT_EFFECT_COLS)
  if (props.dock !== 'free') return buffs.value

  const limit =
    buffs.value.length > ACTIVE_BUFF_HUD.COLS ? ACTIVE_BUFF_HUD.COLS - 1 : ACTIVE_BUFF_HUD.COLS
  return buffs.value.slice(-limit)
})

const overflowCount = computed(() => Math.max(0, buffs.value.length - visibleBuffs.value.length))

type BuffRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

function buffRarity(buff: ActiveBuffView): BuffRarity | null {
  if (buff.source !== 'drifter' || !buff.rankColor) return null
  if (buff.rankColor === DRIFTER_RARITY_COLOR.legendary) return 'legendary'
  if (buff.rankColor === DRIFTER_RARITY_COLOR.rare) return 'rare'
  if (buff.rankColor === DRIFTER_RARITY_COLOR.uncommon) return 'uncommon'
  return 'common'
}

function buffAriaLabel(buff: ActiveBuffView): string {
  const duration = buff.timer ? `${buff.timer.secondsLeft}s remaining` : 'lasts this galaxy'
  return `${buff.name}: ${buff.multiplier}× ${buff.label}, ${duration}`
}

function buffTip(buff: ActiveBuffView): TipValue {
  const rarity = buffRarity(buff)
  const duration = buff.timer ? `${buff.timer.secondsLeft}s remaining` : 'lasts this galaxy'
  return {
    label: rarity ? `${rarity} buff` : 'active effect',
    labelAccent: buff.name,
    text: `${buff.multiplier}× ${buff.label} · ${duration}`,
    color: buff.color,
  }
}
</script>

<style scoped>
.buff-bar {
  position: fixed;
  z-index: 10001;
  display: flex;
  pointer-events: none;
}

.buff-bar--free {
  right: calc(v-bind(panelInset) * var(--hud-scale, 1));
  bottom: calc(
    var(--hud-panel-size, 330px) + var(--kb-hud-h, 0px) + v-bind(bottomGap) +
      v-bind(auxiliaryHudClearance)
  );
  align-items: flex-end;
  justify-content: flex-end;
  gap: v-bind(freeGap);
  width: min(
    calc(var(--hud-panel-size, 330px) - v-bind(panelInset)),
    calc(100vw - v-bind(viewportInset))
  );
  --chip-w: v-bind(freeTileSize);
  --chip-h: v-bind(freeTileSize);
}

.buff-bar--free .buff-chip,
.buff-bar--free .buff-chip--more {
  position: relative;
  display: flex;
  flex: 0 0 var(--chip-w);
  align-items: center;
  flex-direction: column;
  justify-content: flex-start;
  width: var(--chip-w);
  height: var(--chip-h);
  background: transparent;
  border: 0;
  border-radius: 0;
  outline: none;
  cursor: default;
  pointer-events: auto;
  transition: transform 160ms ease;
}

.buff-bar--free .buff-chip:hover,
.buff-bar--free .buff-chip:focus-visible,
.buff-bar--free .buff-chip--more:hover,
.buff-bar--free .buff-chip--more:focus-visible {
  transform: translateY(-4px);
}

.buff-bar--free .buff-chip:focus-visible,
.buff-bar--free .buff-chip--more:focus-visible {
  outline: 1px solid #e8c040;
  outline-offset: 2px;
}

.buff-bar--free .chip-icon {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: v-bind(freeIconSize);
  height: v-bind(freeIconSize);
  background: #141410;
  border: 1px solid color-mix(in srgb, var(--chip-color, #5c3310) 55%, #2c1806);
  border-radius: 3px;
}

.buff-bar--free .buff-chip--ranked .chip-icon {
  border-color: var(--chip-rank);
}

.buff-bar--free .buff-chip--ranked .chip-icon::after {
  position: absolute;
  inset: 3px;
  border: 1px solid color-mix(in srgb, var(--chip-rank) 60%, transparent);
  border-radius: 2px;
  content: '';
  pointer-events: none;
}

.buff-bar--free .buff-chip--endless .chip-icon {
  border-color: color-mix(in srgb, var(--chip-color, #8a7a58) 65%, #2c1806);
}

.chip-pulse {
  position: absolute;
  top: 0;
  left: 50%;
  width: v-bind(freeIconSize);
  height: v-bind(freeIconSize);
  border-radius: 3px;
  background: color-mix(in srgb, #cc6050 22%, transparent);
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%);
}

.buff-chip--expiring .chip-pulse {
  animation: buff-pulse 1s ease-in-out infinite;
}

.chip-art {
  display: block;
  width: 90%;
  height: 90%;
  max-width: none;
  object-fit: contain;
  pointer-events: none;
}

.chip-glyph {
  width: 52px;
  height: 52px;
  color: var(--chip-color, #e8c040);
}

.buff-bar--free .chip-clock {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  min-width: 3.2ch;
  margin-top: 2px;
  color: #e8c040;
  font-size: 15px;
  font-weight: 900;
  line-height: 15px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.buff-bar--free .chip-unit {
  color: #8a7a58;
  font-size: 10px;
}

.buff-bar--free .buff-chip--expiring .chip-seconds {
  color: #cc6050;
}

.chip-endless {
  color: #8a7a58;
  font-size: 19px;
  line-height: 15px;
}

.buff-bar--free .chip-track {
  position: absolute;
  right: v-bind(drainInset);
  bottom: calc(100% - v-bind(freeIconSize) - v-bind(drainInset));
  left: v-bind(drainInset);
  z-index: 2;
  height: 2px;
  transform-origin: left center;
  background: var(--chip-color, #5c3310);
  opacity: 0.9;
  pointer-events: none;
  transition: transform 1s linear;
}

.buff-bar--free .buff-chip--more {
  align-items: center;
  justify-content: center;
  color: #e8c040;
  font-size: 22px;
  font-weight: 900;
}

.buff-bar--free .buff-chip--more::before {
  position: absolute;
  inset: 8px;
  background: #141410;
  border: 1px solid #5c3310;
  border-radius: 3px;
  content: '';
}

.buff-bar--free .buff-chip--more span {
  position: relative;
  z-index: 1;
}

.buff-bar--docked {
  position: static;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  max-width: none;
  transform: none;
  z-index: auto;
}

.buff-bar--docked .buff-chip {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  width: 100%;
  height: 50px;
  gap: 7px;
  padding: 0 8px 0 7px;
  background: #1c1c18;
  border: 2px solid #5c3310;
  border-radius: 4px;
  pointer-events: auto;
}

.buff-bar--docked .buff-chip::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: var(--chip-color, #e8c040);
  content: '';
}

.buff-bar--docked .buff-chip--ranked::after {
  position: absolute;
  top: 2px;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--chip-rank);
  content: '';
  pointer-events: none;
}

.buff-bar--docked .chip-icon {
  display: grid;
  flex: 0 0 24px;
  place-items: center;
  width: 24px;
  height: 24px;
  background: #141410;
  border: 1px solid color-mix(in srgb, var(--chip-color, #5c3310) 55%, #2c1806);
  border-radius: 3px;
}

.buff-bar--docked .chip-art {
  width: 88%;
  height: 88%;
}

.buff-bar--docked .chip-glyph {
  width: 15px;
  height: 15px;
}

.chip-text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  line-height: 1;
}

.chip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.chip-name {
  min-width: 0;
  overflow: hidden;
  color: #e8dcc0;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-mult {
  color: var(--chip-color, #e8c040);
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
}

.buff-bar--docked .chip-clock,
.buff-bar--pause .chip-clock {
  display: flex;
  flex-shrink: 0;
  align-items: baseline;
  justify-content: flex-end;
  min-width: 3.2ch;
  color: #f2ead2;
  font-variant-numeric: tabular-nums;
}

.buff-bar--docked .chip-seconds,
.buff-bar--pause .chip-seconds {
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
}

.buff-bar--docked .chip-unit,
.buff-bar--pause .chip-unit {
  color: #8a7a52;
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
}

.buff-bar--docked .chip-label,
.buff-bar--pause .chip-label {
  overflow: hidden;
  color: #b89b5a;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-label-mult {
  margin-right: 6px;
  color: var(--chip-color, #e8c040);
  font-weight: 700;
}

.buff-bar--docked .chip-track,
.buff-bar--pause .chip-track {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  transform-origin: left center;
  background: var(--chip-color, #e8c040);
  opacity: 0.9;
  pointer-events: none;
  transition: transform 1s linear;
}

.buff-bar.buff-bar--pause {
  position: static;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: flex-start;
  gap: var(--pause-kit-gap, 12px);
  width: 100%;
  max-width: none;
  transform: none;
  z-index: auto;
}

.buff-bar--pause .buff-chip {
  width: var(--pause-kit-chip-w, 210px);
  flex: 0 0 var(--pause-kit-chip-w, 210px);
  height: var(--pause-kit-chip-h, 80px);
  gap: 8px;
  padding: 0 10px 0 8px;
}

.buff-bar--pause .chip-icon {
  display: grid;
  flex: 0 0 26px;
  place-items: center;
  width: 26px;
  height: 26px;
  background: #141410;
  border: 1px solid color-mix(in srgb, var(--chip-color, #5c3310) 55%, #2c1806);
  border-radius: 3px;
}

.buff-bar--pause .chip-art {
  width: 88%;
  height: 88%;
}

.buff-bar--pause .chip-glyph {
  width: 20px;
  height: 20px;
}

.buff-bar--pause .chip-mult {
  font-size: 16px;
}

.buff-bar--pause .chip-seconds {
  font-size: 16px;
}

.buff-bar--pause .chip-unit {
  font-size: 11px;
}

.buff-bar--pause .chip-label {
  font-size: 12px;
}

.buff-chip--more {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a7a62;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.06em;
  pointer-events: auto;
}

.buff-bar--pause .buff-chip--more {
  flex: 0 0 var(--pause-kit-more-w, 56px);
  width: var(--pause-kit-more-w, 56px);
  height: var(--pause-kit-chip-h, 80px);
}

.buff-chip-enter-active,
.buff-chip-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.buff-chip-enter-from,
.buff-chip-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.buff-chip-leave-active {
  position: absolute;
}

.buff-chip-move {
  transition: transform 0.22s ease;
}

@keyframes buff-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

@media (min-width: 2400px) {
  .buff-bar--free {
    --chip-w: v-bind(freeTileSizeWide);
    --chip-h: v-bind(freeTileSizeWide);
    gap: v-bind(freeGapWide);
  }

  .buff-bar--free .chip-icon,
  .buff-bar--free .chip-pulse {
    width: v-bind(freeIconSizeWide);
    height: v-bind(freeIconSizeWide);
  }

  .buff-bar--free .chip-glyph {
    width: 64px;
    height: 64px;
  }

  .buff-bar--free .chip-clock {
    font-size: 18px;
    line-height: 18px;
  }

  .buff-bar--free .chip-unit {
    font-size: 12px;
  }
}

@media (min-width: 3400px) {
  .buff-bar--free .chip-glyph {
    width: 72px;
    height: 72px;
  }

  .buff-bar--free .chip-clock {
    font-size: 20px;
    line-height: 20px;
  }
}

@media (max-height: 1100px) {
  .buff-bar--free {
    --chip-w: v-bind(freeTileSizeCompact);
    --chip-h: v-bind(freeTileSizeCompact);
    gap: v-bind(freeGapCompact);
  }

  .buff-bar--free .chip-icon,
  .buff-bar--free .chip-pulse {
    width: v-bind(freeIconSizeCompact);
    height: v-bind(freeIconSizeCompact);
  }

  .buff-bar--free .chip-glyph {
    width: 44px;
    height: 44px;
  }

  .buff-bar--free .chip-clock {
    font-size: 14px;
    line-height: 14px;
  }

  .buff-bar--free .chip-unit {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .buff-chip--expiring .chip-pulse {
    animation: none;
    opacity: 0.6;
  }

  .buff-chip,
  .buff-chip--more,
  .buff-bar--free .chip-track,
  .buff-bar--docked .chip-track,
  .buff-bar--pause .chip-track {
    transition: none;
  }
}
</style>
