<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { providenceEffectLines } from '@/config/progression/providences'
import {
  PRESTIGE_CARD_PROVIDENCE_ICON_PX,
  PRESTIGE_CARD_UNIVERSE_ICON_PX,
} from '@/config/constants'
import { universeLabel } from '@/utils/ui/format'
import type { PrestigeOfferCard } from '@/stores/progression/providenceStore'

const props = defineProps<{
  offers: PrestigeOfferCard[]
  hoveredUniverse: number | null
}>()

const emit = defineEmits<{
  (e: 'hover', universe: number | null): void
}>()

const hoveredOffer = computed(() =>
  props.offers.find((offer) => offer.universe.id === props.hoveredUniverse),
)

const focusTitle = computed(() =>
  hoveredOffer.value ? universeLabel(hoveredOffer.value.universe.id) : 'Choose your next universe',
)

const focusDetail = computed(() =>
  hoveredOffer.value ? hoveredOffer.value.providence.name : 'Hover a path to wake its portal',
)

const focusKicker = computed(() =>
  hoveredOffer.value ? 'PORTAL HIGHLIGHTED' : 'PRESTIGE AVAILABLE',
)

function effectsFor(offer: PrestigeOfferCard) {
  return providenceEffectLines(offer.providence)
}

function setHovered(universe: number | null) {
  emit('hover', universe)
}
</script>

<template>
  <section
    class="un-offer-command"
    :style="{ '--un-command-tint': hoveredOffer?.universe.tint ?? '#e8c040' }"
    aria-label="Choose your next universe"
  >
    <header class="un-offer-command-head">
      <span class="un-offer-command-mark" aria-hidden="true">✦</span>
      <div class="un-offer-command-reading">
        <span class="un-offer-command-kicker">{{ focusKicker }}</span>
        <h2>{{ focusTitle }}</h2>
        <p>{{ focusDetail }}</p>
      </div>
      <span class="un-offer-command-mark" aria-hidden="true">✦</span>
    </header>

    <div class="un-offer-command-rule" aria-hidden="true" />

    <div class="un-offer-options">
      <article
        v-for="offer in offers"
        :key="offer.universe.id"
        class="un-offer-option"
        :class="{ 'is-hovered': hoveredUniverse === offer.universe.id }"
        :style="{ '--un-offer-tint': offer.universe.tint }"
        tabindex="0"
        :aria-label="`${universeLabel(offer.universe.id)} — ${offer.providence.name}`"
        @pointerenter="setHovered(offer.universe.id)"
        @pointerleave="setHovered(null)"
        @focusin="setHovered(offer.universe.id)"
        @focusout="setHovered(null)"
      >
        <div class="un-offer-option-head">
          <Icon
            :icon="offer.universe.icon"
            :width="PRESTIGE_CARD_UNIVERSE_ICON_PX"
            :height="PRESTIGE_CARD_UNIVERSE_ICON_PX"
            class="un-offer-universe-icon"
            aria-hidden="true"
          />
          <div class="un-offer-option-title">
            <span class="un-offer-option-kicker">PATH {{ offer.universe.id }}</span>
            <strong>{{ universeLabel(offer.universe.id) }}</strong>
          </div>
        </div>

        <div class="un-offer-providence">
          <Icon
            :icon="offer.providence.icon"
            :width="PRESTIGE_CARD_PROVIDENCE_ICON_PX"
            :height="PRESTIGE_CARD_PROVIDENCE_ICON_PX"
            class="un-offer-providence-icon"
            aria-hidden="true"
          />
          <span>{{ offer.providence.name }}</span>
        </div>

        <div class="un-offer-effects">
          <div
            v-for="line in effectsFor(offer)"
            :key="line.label"
            class="un-offer-effect"
            :class="line.positive ? 'is-positive' : 'is-negative'"
          >
            <span class="un-offer-effect-value">
              <span class="un-offer-effect-arrow" aria-hidden="true">{{
                line.positive ? '▲' : '▼'
              }}</span>
              {{ line.value }}
            </span>
            <span class="un-offer-effect-label">{{ line.label }}</span>
          </div>
        </div>

        <span class="un-offer-option-cta">FOLLOW PORTAL <span aria-hidden="true">↗</span></span>
      </article>
    </div>

    <p class="un-offer-command-hint">Click the matching portal to cross the threshold</p>
  </section>
</template>

<style scoped>
.un-offer-command {
  position: absolute;
  z-index: 4;
  left: 50%;
  top: 50%;
  width: min(860px, calc(100% - 48px));
  transform: translate(-50%, -50%);
  padding: 0.5rem 0;
  color: #e8dcc0;
  text-align: center;
  pointer-events: none;
}

.un-offer-command-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  padding: 0 1rem;
}

.un-offer-command-mark {
  flex: 0 0 auto;
  color: #e8c040;
  font-size: 1.35rem;
  text-shadow: 0 0 12px var(--un-command-tint);
}

.un-offer-command-reading {
  min-width: 0;
}

.un-offer-command-kicker,
.un-offer-option-kicker {
  display: block;
  color: #9b8968;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1.1;
  text-transform: uppercase;
}

.un-offer-command h2 {
  margin: 0.2rem 0 0;
  color: var(--un-command-tint);
  font-size: clamp(1.35rem, 2.35vw, 2.15rem);
  letter-spacing: 0.08em;
  line-height: 1.05;
  text-shadow: 0 2px 9px #111008;
  text-transform: uppercase;
}

.un-offer-command p {
  margin: 0.35rem 0 0;
  color: #c9b994;
  font-size: clamp(0.78rem, 1vw, 0.96rem);
  letter-spacing: 0.06em;
  text-shadow: 0 2px 7px #111008;
}

.un-offer-command-rule {
  position: relative;
  height: 1px;
  margin: 0.65rem auto 0.65rem;
  background: linear-gradient(to right, transparent, var(--un-command-tint), transparent);
  opacity: 0.65;
}

.un-offer-options {
  position: relative;
  display: grid;
  gap: 0.45rem;
}

.un-offer-option {
  position: relative;
  display: grid;
  grid-template-columns: minmax(145px, 1.05fr) minmax(130px, 0.95fr) minmax(190px, 1.4fr) auto;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  padding: 0.48rem 0.65rem 0.48rem 0.7rem;
  background: #111008;
  border-bottom: 1px solid #5c3310;
  border-left: 4px solid var(--un-offer-tint);
  border-radius: 4px;
  text-align: left;
  outline: none;
  pointer-events: auto;
}

.un-offer-option::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--un-offer-tint);
  opacity: 0;
  pointer-events: none;
}

.un-offer-option.is-hovered::after,
.un-offer-option:focus-visible::after {
  opacity: 0.9;
}

.un-offer-option-head {
  display: flex;
  align-items: center;
  gap: 0.62rem;
  min-width: 0;
}

.un-offer-universe-icon {
  flex: 0 0 auto;
  color: var(--un-offer-tint);
  font-size: 1.7rem;
}

.un-offer-option-title {
  min-width: 0;
}

.un-offer-option-title strong {
  display: block;
  overflow: hidden;
  color: var(--un-offer-tint);
  font-size: clamp(1rem, 1.3vw, 1.25rem);
  letter-spacing: 0.04em;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.un-offer-option-kicker {
  color: #8a7a5c;
  font-size: 0.56rem;
  letter-spacing: 0.16em;
}

.un-offer-providence {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  color: #e8c040;
  font-size: clamp(0.8rem, 0.95vw, 0.92rem);
  letter-spacing: 0.04em;
  line-height: 1.1;
  white-space: nowrap;
}

.un-offer-providence span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.un-offer-providence-icon {
  flex: 0 0 auto;
  color: #e8c040;
}

.un-offer-effects {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.un-offer-effect {
  min-width: 0;
  padding: 0.3rem 0.42rem 0.28rem;
  border-left: 3px solid;
  background: #141410;
}

.un-offer-effect.is-positive {
  border-left-color: #52b830;
}

.un-offer-effect.is-negative {
  border-left-color: #cc6050;
}

.un-offer-effect-value {
  display: block;
  font-size: clamp(0.9rem, 1.1vw, 1.08rem);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.un-offer-effect.is-positive .un-offer-effect-value {
  color: #7fc95e;
}

.un-offer-effect.is-negative .un-offer-effect-value {
  color: #d9755f;
}

.un-offer-effect-arrow {
  font-size: 0.64em;
  vertical-align: 0.12em;
}

.un-offer-effect-label {
  display: block;
  overflow: hidden;
  margin-top: 0.32rem;
  color: #a59371;
  font-size: clamp(0.57rem, 0.72vw, 0.7rem);
  letter-spacing: 0.05em;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.un-offer-option-cta {
  color: var(--un-offer-tint);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  line-height: 1;
  text-align: right;
}

.un-offer-command-hint {
  position: relative;
  margin: 0.6rem 0 0;
  color: #8a7a5c;
  font-size: clamp(0.68rem, 0.85vw, 0.82rem);
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

@media (max-height: 1100px) {
  .un-offer-command {
    padding: 0.35rem 0;
  }

  .un-offer-command-head {
    padding: 0 0.75rem;
  }

  .un-offer-command-rule {
    margin-top: 0.48rem;
    margin-bottom: 0.48rem;
  }

  .un-offer-option {
    gap: 0.42rem;
    padding: 0.4rem 0.55rem 0.4rem 0.6rem;
  }

  .un-offer-providence {
    font-size: 0.82rem;
  }

  .un-offer-effect {
    padding: 0.26rem 0.35rem 0.24rem;
  }

  .un-offer-command-hint {
    margin-top: 0.52rem;
  }
}
</style>
