<template>
  <!-- Die Kante, die stehen bleibt, wenn die Detailspalte weggefahren ist.
       EINE Gruppe: das Wort exakt in der Leistenmitte, die Signale hängen
       absolut an seinem oberen Ende — eine zugeklappte Spalte, die nicht mehr
       meldet, dass etwas zu holen wäre, wird vergessen. -->
  <button
    class="fdh"
    :class="{ 'fdh--open': detailsOpen }"
    :aria-expanded="detailsOpen"
    :aria-label="toggleTitle"
    v-tip="toggleTitle"
    @click="toggleDetails"
  >
    <span class="fdh-stack">
      <span v-if="readyCount > 0 || hasOffer" class="fdh-signals">
        <span v-if="readyCount > 0" class="fdh-count" v-tip="FORGE_DETAILS_READY_TITLE">
          {{ readyCount }}
          <span
            v-if="hasOffer"
            class="fdh-offer"
            v-tip="FORGE_DETAILS_OFFER_TITLE"
            aria-hidden="true"
          />
        </span>
        <span
          v-else
          class="fdh-offer fdh-offer--solo"
          v-tip="FORGE_DETAILS_OFFER_TITLE"
          aria-hidden="true"
        />
      </span>

      <span class="fdh-word">{{ FORGE_DETAILS_RAIL_LABEL }}</span>
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
import { useForgeDetailsPane } from '@/composables/ui/useForgeDetailsPane'
import { useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import { useForgeOffers } from '@/composables/ui/useForgeOffers'
import {
  FORGE_DETAILS_BADGE_GAP_PX,
  FORGE_DETAILS_CLOSE_TITLE,
  FORGE_DETAILS_OFFER_TITLE,
  FORGE_DETAILS_OPEN_TITLE,
  FORGE_DETAILS_RAIL_LABEL,
  FORGE_DETAILS_RAIL_PX,
  FORGE_DETAILS_READY_TITLE,
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
const badgeGap = `${FORGE_DETAILS_BADGE_GAP_PX}px`
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
  align-items: center;
  justify-content: center;
  /* Rechts 2 px mehr — genau die Naht links, die zur Breite zaehlt: sonst saesse
     die Gruppe um deren Haelfte neben der Leistenmitte. */
  padding: 12px 6px 12px 4px;
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

/* Goldfaden auf der Naht. Statisch — nur die DECKUNG wechselt, und das ist
   der Punkt: seit der Chevron weg ist, trägt er allein den Zustand (matt zu,
   hell offen oder unter dem Zeiger). Kein Zierrat, sondern die Auskunft des
   Griffs. Absolut positioniert, also kein Flex-Item. */
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

/* Nur das Wort steht hier im Fluss — die Gruppe ist damit genau so hoch wie es
   und sitzt mittig in der Leiste. */
.fdh-stack {
  position: relative;
  display: flex;
}

/* Am Wortende, OHNE Fluss-Platz: sonst wanderte das Wort, sobald ein Signal
   kommt oder geht. */
.fdh-signals {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: v-bind(badgeGap);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Wie viele Stufen der Vorrat gerade deckt — aufrecht, nicht mitgekippt: eine
   Zahl liest man nicht seitwärts. Tabellenziffern, damit der Sprung von 9 auf
   10 die Pille nicht springen lässt. */
.fdh-count {
  position: relative;
  min-width: 24px;
  padding: 2px 5px;
  border: 1px solid #5c3310;
  border-radius: 4px;
  background: #1c1c18;
  color: #e8c040;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  text-align: center;
}

.fdh:hover .fdh-count {
  border-color: #c89040;
  background: #241a0f;
}

/* Ein Angebot liegt in Reichweite. Ein Punkt und keine zweite Zahl: wie viele
   es sind, entscheidet nichts — dass überhaupt eines dasteht, schon. An der
   Ecke der Pille, weil er sonst der 44 px breiten Leiste eine Spalte wegnähme;
   der Ring ist die Leistenfarbe, kein Hof. */
.fdh-offer {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #52b830;
  box-shadow: 0 0 0 2px #14100c;
}

/* Ohne Pille steht er allein an der Wortkante und trägt wieder seinen Hof. */
.fdh-offer--solo {
  position: static;
  box-shadow: 0 0 0 3px rgba(82, 184, 48, 0.18);
}

/* Gekippt und mittig: sie sagt, was hinter ihr liegt. */
.fdh-word {
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

@media (prefers-reduced-motion: reduce) {
  .fdh::after {
    transition: none;
  }
}
</style>
