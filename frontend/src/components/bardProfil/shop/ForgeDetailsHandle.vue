<template>
  <!-- Die Kante, die stehen bleibt, wenn die Detailspalte weggefahren ist.

       Sie ist kein blosser Griff: eine zugeklappte Spalte, die nicht mehr
       meldet, dass etwas zu holen wäre, wird vergessen. Deshalb tragen die
       36px zwei Signale — wie viele Stufen der Vorrat gerade deckt, und ob ein
       Angebot in Reichweite liegt. Beide verschwinden im offenen Zustand: dort
       sagen sie Sammelkauf-Leiste und Angebotsstreifen ausführlicher. -->
  <button
    class="fdh"
    :class="{ 'fdh--open': detailsOpen }"
    :aria-expanded="detailsOpen"
    :aria-label="toggleTitle"
    :title="toggleTitle"
    @click="toggleDetails"
  >
    <Icon
      :icon="FORGE_DETAILS_TOGGLE_ICON"
      :width="FORGE_DETAILS_TOGGLE_ICON_PX"
      :height="FORGE_DETAILS_TOGGLE_ICON_PX"
      class="fdh-chevron"
    />

    <span v-if="readyCount > 0" class="fdh-ready" :title="FORGE_DETAILS_READY_TITLE">
      {{ readyCount }}
    </span>
    <span v-if="hasOffer" class="fdh-offer" :title="FORGE_DETAILS_OFFER_TITLE" aria-hidden="true" />

    <span class="fdh-label">{{ FORGE_DETAILS_RAIL_LABEL }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * Griffleiste der Forge-Detailspalte.
 *
 * Der Auf/Zu-Zustand liegt in `useForgeDetailsPane` und nicht hier: der
 * Sternbaum fährt die Spalte ebenfalls aus (Klick auf einen Knoten), und die
 * Escape-Kaskade im Tab schliesst sie wieder.
 *
 * Die beiden Signale kommen aus DERSELBEN Rechnung wie die Anzeigen im Panel —
 * `buyAllPlan` trägt die Zahl der Sammelkauf-Leiste, `offers` den Vorrat des
 * Angebotsstreifens. Eine eigene Zählung hier („alle Einträge mit `canBuy`")
 * sähe richtig aus und wäre falsch: sie verspräche einen Materialvorrat
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
  FORGE_DETAILS_RAIL_LABEL,
  FORGE_DETAILS_RAIL_PX,
  FORGE_DETAILS_READY_TITLE,
  FORGE_DETAILS_TOGGLE_ICON,
  FORGE_DETAILS_TOGGLE_ICON_PX,
} from '@/config/constants'

const { detailsOpen, toggleDetails } = useForgeDetailsPane()
const { buyAllPlan } = useForgeUpgrades()
const { offers } = useForgeOffers()

/**
 * Beide Signale schalten im offenen Zustand auf einen festen Wert ab — und das
 * ist keine Kosmetik, sondern der Grund, warum diese Komponente eine VIERTE
 * `useForgeUpgrades()`-Instanz haben darf.
 *
 * Das Composable ist eine Fabrik, keine Singleton: jeder Aufrufer baut eigene
 * Computeds über gut hundertfünfzig Einträge, und `buyAllPlan` rechnet einen
 * ganzen Kauflauf durch. Vue wertet ein Computed aber nur aus, wenn es gelesen
 * wird — der Kurzschluss vor dem Zugriff hält die Rechnung genau dann still,
 * wenn die Zahl ohnehin niemand sieht.
 */
const readyCount = computed(() => (detailsOpen.value ? 0 : buyAllPlan.value.count))
const hasOffer = computed(() =>
  detailsOpen.value ? false : offers.value.some((offer) => offer.ready),
)

const toggleTitle = computed(() =>
  detailsOpen.value ? FORGE_DETAILS_CLOSE_TITLE : FORGE_DETAILS_OPEN_TITLE,
)

const railWidth = `${FORGE_DETAILS_RAIL_PX}px`
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
  gap: 10px;
  padding: 14px 0 16px;
  /* Dieselbe Naht wie `.sf-panel` — zwei Linien nebeneinander verdoppelten sie. */
  border: none;
  border-left: 2px solid #5c3310;
  background: #14100c;
  color: #c89040;
  cursor: pointer;
}

.fdh:hover {
  background: #1a140d;
  color: #e8c040;
}

/* EIN Glyph für beide Richtungen. Nur `transform` — Performance-Regel 1. */
.fdh-chevron {
  flex-shrink: 0;
  transition: transform 0.18s ease;
}

.fdh--open .fdh-chevron {
  transform: rotate(180deg);
}

/* Wie viele Stufen der Vorrat gerade deckt. Tabellenziffern, damit die Leiste
   beim Sprung von 9 auf 10 nicht die Breite wechselt. */
.fdh-ready {
  flex-shrink: 0;
  min-width: 20px;
  padding: 2px 0;
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
   es sind, entscheidet nichts — dass überhaupt eines dasteht, schon. */
.fdh-offer {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #52b830;
}

/* Gekippt an den Fuss, damit die Leiste sagt, was hinter ihr liegt. `auto`
   oben schiebt es ans Ende, ohne dass ein leerer Spacer im Baum steht. */
.fdh-label {
  margin-top: auto;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  color: #7a4e20;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
}

.fdh:hover .fdh-label {
  color: #c89040;
}

@media (prefers-reduced-motion: reduce) {
  .fdh-chevron {
    transition: none;
  }
}
</style>
