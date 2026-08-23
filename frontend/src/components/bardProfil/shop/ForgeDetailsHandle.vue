<template>
  <!-- Die Kante, die stehen bleibt, wenn die Detailspalte weggefahren ist.
       Drei Zonen: Chevron im Kopf, das Wort in der Mitte, die zwei Signale am
       Fuss — eine zugeklappte Spalte, die nicht mehr meldet, dass etwas zu
       holen wäre, wird vergessen. -->
  <button
    class="fdh"
    :class="{ 'fdh--open': detailsOpen }"
    :aria-expanded="detailsOpen"
    :aria-label="toggleTitle"
    :title="toggleTitle"
    @click="toggleDetails"
  >
    <span class="fdh-head">
      <span class="fdh-cap">
        <Icon
          :icon="FORGE_DETAILS_TOGGLE_ICON"
          :width="FORGE_DETAILS_TOGGLE_ICON_PX"
          :height="FORGE_DETAILS_TOGGLE_ICON_PX"
          class="fdh-chevron"
        />
      </span>
    </span>

    <span class="fdh-word">{{ FORGE_DETAILS_RAIL_LABEL }}</span>

    <span class="fdh-foot">
      <span v-if="readyCount > 0" class="fdh-ready" :title="FORGE_DETAILS_READY_TITLE">
        {{ readyCount }}
      </span>
      <span v-if="hasOffer" class="fdh-offer" :title="FORGE_DETAILS_OFFER_TITLE" aria-hidden="true" />
    </span>
  </button>
</template>

<script setup lang="ts">
/**
 * Griffleiste der Forge-Detailspalte.
 *
 * Der Auf/Zu-Zustand liegt in `useForgeDetailsPane`: der Sternbaum fährt die
 * Spalte ebenfalls aus, und die Escape-Kaskade im Tab schliesst sie wieder.
 *
 * Beide Signale kommen aus DERSELBEN Rechnung wie die Anzeigen im Panel —
 * `buyAllPlan` trägt die Zahl der Sammelkauf-Leiste, `offers` den Vorrat des
 * Angebotsstreifens. Eine eigene Zählung hier verspräche einen Materialvorrat
 * mehrfach, den `buyAllPlan` kumulativ abrechnet.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeDetailsPane } from '@/composables/ui/useForgeDetailsPane'
import { useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import { useForgeOffers } from '@/composables/ui/useForgeOffers'
import {
  FORGE_DETAILS_CLOSE_TITLE,
  FORGE_DETAILS_OFFER_TITLE,
  FORGE_DETAILS_OPEN_TITLE,
  FORGE_DETAILS_RAIL_END_PX,
  FORGE_DETAILS_RAIL_LABEL,
  FORGE_DETAILS_RAIL_PX,
  FORGE_DETAILS_READY_TITLE,
  FORGE_DETAILS_TOGGLE_ICON,
  FORGE_DETAILS_TOGGLE_ICON_PX,
} from '@/config/constants'

const { detailsOpen, toggleDetails } = useForgeDetailsPane()
const { buyAllPlan } = useForgeUpgrades()
const { offers } = useForgeOffers()

// Der Kurzschluss vor dem Zugriff ist der Grund, warum diese Komponente eine
// VIERTE `useForgeUpgrades()`-Instanz haben darf: das Composable ist eine
// Fabrik, `buyAllPlan` rechnet einen ganzen Kauflauf durch — ungelesen wertet
// Vue es nicht aus.
const readyCount = computed(() => (detailsOpen.value ? 0 : buyAllPlan.value.count))
const hasOffer = computed(() =>
  detailsOpen.value ? false : offers.value.some((offer) => offer.ready),
)

const toggleTitle = computed(() =>
  detailsOpen.value ? FORGE_DETAILS_CLOSE_TITLE : FORGE_DETAILS_OPEN_TITLE,
)

const railWidth = `${FORGE_DETAILS_RAIL_PX}px`
const railEnd = `${FORGE_DETAILS_RAIL_END_PX}px`
</script>

<style scoped>
/* Liegt ÜBER dem geparkten Panel (z-index 1), damit dessen rechter Rand nicht
   durch die Leiste scheint, während es hinter ihr steht. */
.fdh {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  width: v-bind(railWidth);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  /* Dieselbe Naht wie `.sf-panel` — zwei Linien nebeneinander verdoppelten sie. */
  border: none;
  border-left: 2px solid #5c3310;
  background: #14100c;
  color: #c89040;
  cursor: pointer;
}

.fdh:hover {
  background: #1a140d;
}

/* Goldfaden auf der Naht, dieselbe Rampe wie die Modal-Goldlinie. Statisch —
   nur die Deckung wechselt. Absolut positioniert, also kein Flex-Item. */
.fdh::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: linear-gradient(to bottom, #5c3310, #c89040, #e8c060, #c89040, #5c3310);
  opacity: 0.4;
  transition: opacity 0.18s ease;
  pointer-events: none;
}

.fdh:hover::after,
.fdh--open::after {
  opacity: 1;
}

/* Beide Enden tragen DIESELBE reservierte Höhe: ohne sie hinge das Wort an
   dem, was gerade darunter steht, und wanderte aus der Mitte. */
.fdh-head,
.fdh-foot {
  flex: 0 0 auto;
  min-height: v-bind(railEnd);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.fdh-cap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #5c3310;
  border-radius: 4px;
  background: #1c1c18;
}

.fdh:hover .fdh-cap {
  border-color: #c89040;
  background: #241a0f;
}

/* EIN Glyph für beide Richtungen. Nur `transform` — Performance-Regel 1. */
.fdh-chevron {
  flex-shrink: 0;
  transition: transform 0.18s ease;
}

.fdh--open .fdh-chevron {
  transform: rotate(180deg);
}

/* Gekippt und mittig: sie sagt, was hinter ihr liegt. Die gedrehte Achse macht
   `justify-content` zur vertikalen Zentrierung. */
.fdh-word {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  color: #c89040;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.28em;
  white-space: nowrap;
}

.fdh:hover .fdh-word,
.fdh--open .fdh-word {
  color: #e8c040;
}

/* Wie viele Stufen der Vorrat gerade deckt. Tabellenziffern, damit die Leiste
   beim Sprung von 9 auf 10 nicht die Breite wechselt. */
.fdh-ready {
  flex-shrink: 0;
  min-width: 24px;
  padding: 3px 0;
  border: 1px solid #5c3310;
  border-radius: 4px;
  background: #1c1c18;
  color: #e8c040;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

/* Ein Angebot liegt in Reichweite. Ein Punkt und keine zweite Zahl: wie viele
   es sind, entscheidet nichts — dass überhaupt eines dasteht, schon. Der Hof
   ist statisch, er atmet nicht. */
.fdh-offer {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #52b830;
  box-shadow: 0 0 0 3px rgba(82, 184, 48, 0.18);
}

@media (prefers-reduced-motion: reduce) {
  .fdh-chevron,
  .fdh::after {
    transition: none;
  }
}
</style>
