<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useActiveBuffList } from '@/composables/ui/useActiveBuffList'
import VitalityBar from '@/components/ui/VitalityBar.vue'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { DRIFTER_BUFF_EXPIRY_WARN_SEC, JOURNEY_BUFF_PANEL } from '@/config/constants'

const { buffs } = useActiveBuffList()
const playerStore = usePlayerStore()
const P = JOURNEY_BUFF_PANEL

const vitalW = `${P.VITAL_W}px`
const vitalWCompact = `${P.VITAL_W_COMPACT}px`
const vitalH = `${P.VITAL_H}px`
const vitalHCompact = `${P.VITAL_H_COMPACT}px`
const chipSize = `${P.CHIP_SIZE}px`
const chipSizeCompact = `${P.CHIP_SIZE_COMPACT}px`
const iconSize = `${P.ICON_SIZE}px`
const iconSizeCompact = `${P.ICON_SIZE_COMPACT}px`
const gap = `${P.GAP}px`
const gapCompact = `${P.GAP_COMPACT}px`

const regen = computed(() => Math.round(playerStore.regenPerSec * 10) / 10)
const vitalityTip = computed(
  () =>
    `Sun vitality · ${Math.ceil(playerStore.currentHP).toLocaleString()} / ${Math.round(playerStore.maxHP).toLocaleString()} · +${regen.value}/s regeneration`,
)
const vitalityLabel = computed(
  () => `Sun health ${Math.ceil(playerStore.currentHP)} of ${playerStore.maxHP}`,
)
const shown = computed(() => buffs.value.slice(0, P.COLS))
const overflow = computed(() => Math.max(0, buffs.value.length - shown.value.length))

function buffAriaLabel(buff: (typeof buffs.value)[number]) {
  const duration = buff.timer ? `${buff.timer.secondsLeft}s remaining` : 'lasts this galaxy'
  return `${buff.name}: ${buff.multiplier}× ${buff.label}, ${duration}`
}
</script>

<template>
  <section class="jbp" aria-label="Journey status">
    <div v-if="buffs.length" class="jbp-buffs" aria-label="Active effects">
      <TransitionGroup name="jbp-card" tag="div" class="jbp-row">
        <article
          v-for="buff in shown"
          :key="buff.key"
          class="jbp-card"
          :class="{
            'is-expiring': buff.timer && buff.timer.secondsLeft <= DRIFTER_BUFF_EXPIRY_WARN_SEC,
            'is-endless': !buff.timer,
            'is-ranked': !!buff.rankColor,
          }"
          :style="{ '--buff': buff.color, '--buff-rank': buff.rankColor }"
          :aria-label="buffAriaLabel(buff)"
          tabindex="0"
          v-tip="`${buff.name} — ${buff.multiplier}× ${buff.label}`"
        >
          <span class="jbp-pulse" aria-hidden="true" />
          <span class="jbp-icon">
            <img v-if="buff.image" :src="buff.image" class="jbp-art" alt="" aria-hidden="true" />
            <Icon v-else-if="buff.icon" :icon="buff.icon" class="jbp-glyph" aria-hidden="true" />
          </span>
          <span v-if="buff.timer" class="jbp-clock">
            <span class="jbp-sec">{{ buff.timer.secondsLeft }}</span><span class="jbp-unit">s</span>
          </span>
          <span v-else class="jbp-clock jbp-clock--endless" aria-hidden="true">∞</span>
          <span
            class="jbp-drain"
            :style="{ transform: `scaleX(${buff.timer ? buff.timer.progress : 1})` }"
            aria-hidden="true"
          />
        </article>

        <span
          v-if="overflow"
          key="more"
          class="jbp-more"
          :aria-label="`${overflow} more effect${overflow === 1 ? '' : 's'} running`"
          tabindex="0"
          v-tip="`${overflow} more effect${overflow === 1 ? '' : 's'} running`"
        >
          +{{ overflow }}
        </span>
      </TransitionGroup>
    </div>

    <div class="jbp-vitals" v-tip="vitalityTip">
      <VitalityBar
        class="jbp-vitality-bar"
        :current="playerStore.currentHP"
        :max="playerStore.maxHP"
        :regen-per-sec="regen"
        label-placement="inside"
        spark
        aria-role="status"
        :aria-label="vitalityLabel"
      />
    </div>
  </section>
</template>

<style scoped>
.jbp {
  position: absolute;
  right: auto;
  bottom: calc(100% + v-bind(gap));
  left: 50%;
  z-index: 5;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: v-bind(gap);
  width: min(100%, v-bind(vitalW));
  min-width: 0;
  transform: translateX(-50%);
  pointer-events: none;
}

.jbp-buffs {
  display: flex;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

.jbp-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: v-bind(gap);
  min-width: 0;
  pointer-events: none;
}

.jbp-card,
.jbp-more {
  position: relative;
  display: flex;
  flex: 0 0 v-bind(chipSize);
  align-items: center;
  flex-direction: column;
  justify-content: flex-start;
  width: v-bind(chipSize);
  height: v-bind(chipSize);
  background: transparent;
  border: 0;
  cursor: help;
  outline: none;
  pointer-events: auto;
  transition: transform 160ms ease;
}

.jbp-card:hover,
.jbp-card:focus-visible,
.jbp-more:hover,
.jbp-more:focus-visible {
  transform: translateY(-3px);
}

.jbp-card:focus-visible,
.jbp-more:focus-visible {
  outline: 1px solid #e8c040;
  outline-offset: 2px;
}

.jbp-icon {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: v-bind(iconSize);
  height: v-bind(iconSize);
  background: #141410;
  border: 1px solid color-mix(in srgb, var(--buff, #5c3310) 55%, #2c1806);
  border-radius: 3px;
}

.jbp-card.is-ranked .jbp-icon {
  border-color: var(--buff-rank);
}

.jbp-card:hover .jbp-icon,
.jbp-card:focus-visible .jbp-icon {
  border-color: var(--buff, #e8c040);
}

.jbp-glyph {
  width: 23px;
  height: 23px;
  color: var(--buff, #e8c040);
}

.jbp-art {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.jbp-clock {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  min-width: 3.2ch;
  margin-top: 2px;
  color: #e8c040;
  font-size: 10px;
  font-weight: 900;
  line-height: 10px;
  text-align: center;
}

.jbp-unit {
  color: #8a7a58;
  font-size: 8px;
}

.jbp-card.is-expiring .jbp-sec {
  color: #cc6050;
}

.jbp-clock--endless {
  min-width: 0;
  color: #8a7a58;
  font-size: 13px;
}

.jbp-more {
  align-items: center;
  justify-content: center;
  color: #e8c040;
  font-size: 14px;
  font-weight: 900;
}

.jbp-drain {
  position: absolute;
  right: 6px;
  bottom: calc(100% - v-bind(iconSize) - 2px);
  left: 6px;
  z-index: 2;
  height: 2px;
  transform-origin: left center;
  background: var(--buff, #5c3310);
  opacity: 0.9;
  pointer-events: none;
  transition: transform 1s linear;
}

.jbp-pulse {
  position: absolute;
  top: 0;
  right: 6px;
  bottom: calc(100% - v-bind(iconSize));
  left: 6px;
  opacity: 0;
  background: color-mix(in srgb, #cc6050 22%, transparent);
  border-radius: 3px;
  pointer-events: none;
}

.jbp-card.is-expiring .jbp-pulse {
  animation: jbp-pulse 1s ease-in-out infinite;
}

@keyframes jbp-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

.jbp-vitals {
  width: 100%;
  min-width: 0;
  pointer-events: auto;
}

.jbp-vitality-bar {
  --vb-w: 100%;
  --vb-h: v-bind(vitalH);
  --vb-label-size: max(13px, calc(var(--vb-h) * 0.64));
  --vb-label-sub-size: max(10px, calc(var(--vb-h) * 0.44));
  --vb-regen-size: max(9px, calc(var(--vb-h) * 0.34));
  --vb-tick-inset: max(2px, calc(var(--vb-h) * 0.2));
  --vb-regen-display: inline;
  --vb-cur-reserve: 0;
}

.jbp-card-enter-active,
.jbp-card-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.jbp-card-enter-from,
.jbp-card-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.jbp-card-leave-active {
  position: absolute;
}

@media (max-height: 1100px) {
  .jbp {
    bottom: calc(100% + v-bind(gapCompact));
    gap: v-bind(gapCompact);
    width: min(100%, v-bind(vitalWCompact));
  }

  .jbp-row {
    gap: v-bind(gapCompact);
  }

  .jbp-card,
  .jbp-more {
    flex-basis: v-bind(chipSizeCompact);
    width: v-bind(chipSizeCompact);
    height: v-bind(chipSizeCompact);
  }

  .jbp-icon {
    width: v-bind(iconSizeCompact);
    height: v-bind(iconSizeCompact);
  }

  .jbp-glyph {
    width: 20px;
    height: 20px;
  }

  .jbp-art {
    width: 23px;
    height: 23px;
  }

  .jbp-clock {
    font-size: 9px;
    line-height: 8px;
  }

  .jbp-unit {
    font-size: 7px;
  }

  .jbp-clock--endless {
    font-size: 12px;
  }

  .jbp-vitality-bar {
    --vb-h: v-bind(vitalHCompact);
  }
}

@media (prefers-reduced-motion: reduce) {
  .jbp-card,
  .jbp-more,
  .jbp-drain {
    transition: none;
  }

  .jbp-card.is-expiring .jbp-pulse {
    animation: none;
    opacity: 0.6;
  }
}
</style>
