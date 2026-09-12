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
  width: min(1040px, calc(100% - 40px));
  transform: translate(-50%, -50%);
  padding: 1.2rem 1.35rem 0.9rem;
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 12px 32px rgba(0, 0, 0, 0.55);
  color: #e8dcc0;
  text-align: center;
  pointer-events: auto;
}

.un-offer-command::before {
  content: '';
  position: absolute;
  inset: 7px;
  border: 1px solid color-mix(in srgb, var(--un-command-tint) 62%, #5c3310);
  pointer-events: none;
}

.un-offer-command-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.3rem;
  min-height: 5.7rem;
}

.un-offer-command-mark {
  flex: 0 0 auto;
  color: var(--un-command-tint);
  font-size: 1.55rem;
  text-shadow: 0 0 12px color-mix(in srgb, var(--un-command-tint) 54%, transparent);
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
  font-size: clamp(1.45rem, 2.5vw, 2.35rem);
  letter-spacing: 0.08em;
  line-height: 1.05;
  text-shadow: 0 0 16px color-mix(in srgb, var(--un-command-tint) 34%, transparent);
  text-transform: uppercase;
}

.un-offer-command p {
  margin: 0.35rem 0 0;
  color: #c9b994;
  font-size: clamp(0.84rem, 1.1vw, 1.05rem);
  letter-spacing: 0.06em;
}

.un-offer-command-rule {
  position: relative;
  height: 1px;
  margin: 0.25rem auto 0.9rem;
  background: linear-gradient(to right, transparent, var(--un-command-tint), transparent);
  opacity: 0.65;
}

.un-offer-options {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.un-offer-option {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.58rem;
  padding: 0.7rem 0.75rem 0.62rem;
  background: #1c1c18;
  border: 1px solid #5c3310;
  border-top: 3px solid var(--un-offer-tint);
  border-radius: 4px;
  text-align: left;
  outline: none;
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
  font-size: 2rem;
}

.un-offer-option-title {
  min-width: 0;
}

.un-offer-option-title strong {
  display: block;
  overflow: hidden;
  color: var(--un-offer-tint);
  font-size: clamp(1.1rem, 1.55vw, 1.45rem);
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
  font-size: clamp(0.85rem, 1.05vw, 1rem);
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
  padding: 0.42rem 0.42rem 0.35rem;
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
  font-size: clamp(0.96rem, 1.35vw, 1.25rem);
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
  margin-top: auto;
  color: var(--un-offer-tint);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  line-height: 1;
  text-align: right;
}

.un-offer-command-hint {
  position: relative;
  margin: 0.7rem 0 0;
  color: #8a7a5c;
  font-size: clamp(0.68rem, 0.85vw, 0.82rem);
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

@media (max-height: 1100px) {
  .un-offer-command {
    padding: 0.85rem 1rem 0.7rem;
  }

  .un-offer-command-head {
    min-height: 4.4rem;
  }

  .un-offer-command-rule {
    margin-bottom: 0.62rem;
  }

  .un-offer-option {
    gap: 0.42rem;
    padding: 0.55rem 0.6rem 0.5rem;
  }

  .un-offer-providence {
    font-size: 0.82rem;
  }

  .un-offer-effect {
    padding: 0.32rem 0.35rem 0.3rem;
  }

  .un-offer-command-hint {
    margin-top: 0.52rem;
  }
}
</style>
