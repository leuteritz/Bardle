<template>
  <!-- Ein einziges `mouseleave` am Rahmen statt eines je Zeile: zwischen zwei
       Zeilen liegen 8px Lücke, und ein Handler je Eintrag ließe die Klammer bei
       jedem Übergang kurz aufgehen — samt neu einsortierter Reihenfolge.

       Ganz weg, wenn nichts erreichbar ist. Der Handel war die Dauerzeile, die
       das früher unmöglich machte; seit er im festen Kopf steht, kann der
       Streifen leer sein — und ein „WITHIN REACH 0" über nichts wäre schlimmer
       als kein Streifen. -->
  <section v-if="shown.length > 0" ref="wrapEl" class="fos" @mouseleave="leaveStrip">
    <header class="fos-head">
      <Icon :icon="FORGE_OFFER_ICON" width="17" height="17" class="fos-head-ico" />
      <span class="fos-head-label">{{ FORGE_OFFER_TITLE }}</span>
      <span class="fos-head-num">{{ readyCount }}</span>
      <span class="fos-head-rule" />
    </header>

    <!-- `can-reroll` ist hier fest falsch: der Wurf gehört zum Handel, und den
         führt dieser Streifen nicht mehr. Die Zeile zeigt den Knopf ohnehin nur
         für `kind === 'bargain'`. -->
    <TransitionGroup name="fos-pop" tag="div" class="fos-list">
      <ForgeOfferRow
        v-for="offer in shown"
        :key="offer.id"
        :offer="offer"
        :fresh="freshIds.has(offer.id)"
        :can-reroll="false"
        @buy="handleBuy"
        @hover="enterRow"
      />
    </TransitionGroup>

    <!-- Die volle Auskunft zur Zeile unter dem Zeiger. Geschwister des Streifens
         und `position: fixed` — läge es IN ihm, schöbe sein Erscheinen die Reihe
         unter dem Zeiger weg, und der Hover ginge im selben Zug wieder aus. -->
    <ForgeOfferTooltip :offer="tipOffer" :anchor="tipAnchor" />
  </section>
</template>

<script setup lang="ts">
/**
 * Was die Star Forge JETZT hergibt, ohne dass man den Baum anfassen müsste —
 * Relikte und Konstellationen als Zeilen über der Upgrade-Liste.
 *
 * Der kosmische Handel stand hier einmal als erste Zeile und rollte mit dem
 * Streifen weg; er hat seinen eigenen Platz im festen Kopf der Spalte
 * (`ForgeBargainBar`). Seither kann dieser Streifen leer sein und verschwindet
 * dann ganz.
 *
 * Sie lagen bis zum Umbau hinter je einem Reiter der Abteilungs-Rail
 * (`ForgeSectionRail`, gestrichen). Warum das nicht trug und was die
 * Sichtbarkeit entscheidet, steht an `FORGE_OFFER_TITLE` in `constants/forge.ts`
 * und an `useForgeOffers` — hier steht nur, wie daraus eine Reihe wird.
 *
 * ── Die Klammer ────────────────────────────────────────────────────────────
 * „Kaufbares zuerst" und „die Chimes ticken jede Sekunde" vertragen sich nicht
 * von selbst: sobald der Vorrat eine Schwelle überschreitet, wandert eine Zeile
 * nach oben und alles darunter rutscht — genau, während man auf einen Kaufknopf
 * zielt. Betritt der Zeiger den Streifen, friert die REIHENFOLGE deshalb ein und
 * rechnet beim Verlassen neu. Was eine Zeile anzeigt — Rahmen, Kosten,
 * Knopfzustand — folgt weiter live; nur wo sie steht, hält still.
 *
 * Dasselbe Mittel wie `frozenBuckets` in `ForgeUpgradesSection` direkt darunter,
 * und aus demselben Grund.
 */
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ForgeOfferRow from './ForgeOfferRow.vue'
import ForgeOfferTooltip from './ForgeOfferTooltip.vue'
import { useForgeOffers } from '@/composables/ui/useForgeOffers'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import type { ForgeOffer, ForgeRowTipAnchor } from '@/types'
import {
  FORGE_OFFER_COLOR,
  FORGE_OFFER_ICON,
  FORGE_OFFER_LIST_MAX_COMPACT_PX,
  FORGE_OFFER_LIST_MAX_PX,
  FORGE_OFFER_POP_MS,
  FORGE_OFFER_TITLE,
} from '@/config/constants'

const forgeStore = useStarForgeStore()
const { offers, offerById, freshIds, buyOffer, pursuedId } = useForgeOffers()

// ── Eingefrorene Reihenfolge ─────────────────────────────────────────────────
const frozenIds = ref<string[] | null>(null)

/**
 * Die Zeilen, wie sie stehen.
 *
 * Eingefroren wird die REIHENFOLGE, nicht der Bestand: was während der Klammer
 * verschwindet (ein Relikt auf letzter Stufe, ein gekaufter Handel), fällt auch
 * dann weg — eine Zeile stehen zu lassen, die es nicht mehr gibt, wäre schlimmer
 * als das Rutschen, gegen das die Klammer steht. Neue Zeilen warten dagegen bis
 * zum Verlassen.
 */
const shown = computed<ForgeOffer[]>(() => {
  const frozen = frozenIds.value
  const byId = offerById.value
  const list =
    frozen === null
      ? offers.value
      : frozen
          .map((id) => byId.get(id))
          .filter((offer): offer is ForgeOffer => offer !== undefined)
  // Verfolgtes steht im Block DARÜBER — zweimal in einer Spalte wäre ein
  // Fehler. Gefiltert wird am Ergebnis, nicht in `frozenIds`: die Klammer
  // friert die Reihenfolge ein, nicht den Bestand.
  return pursuedId.value === null ? list : list.filter((offer) => offer.id !== pursuedId.value)
})

/** Die Zahl in der Kopfzeile — wie viele davon gerade wirklich gehen. */
const readyCount = computed(
  () => offers.value.filter((offer) => offer.ready && offer.id !== pursuedId.value).length,
)

const wrapEl = ref<HTMLElement | null>(null)
const hoverId = ref<string | null>(null)

/**
 * Betreten heißt zugleich GESEHEN: der azurne Rahmen an dieser Zeile ist damit
 * erledigt, und die Marke am Header zählt sie nicht mehr mit.
 */
function enterRow(id: string): void {
  if (frozenIds.value === null) frozenIds.value = offers.value.map((offer) => offer.id)
  hoverId.value = id
  forgeStore.acknowledgeShopEntry(id)
}

function leaveStrip(): void {
  frozenIds.value = null
  hoverId.value = null
}

function handleBuy(id: string): void {
  buyOffer(id)
}

// ── Das schwebende Kärtchen ──────────────────────────────────────────────────
/**
 * Wo es hängt. Gemessen wird bei jedem HOVER-WECHSEL, nie pro Frame — und nur
 * die drei Kanten, die das Kärtchen braucht (`ForgeRowTipAnchor`).
 */
const tipAnchor = ref<ForgeRowTipAnchor | null>(null)

const tipOffer = computed<ForgeOffer | null>(() =>
  hoverId.value === null ? null : (offerById.value.get(hoverId.value) ?? null),
)

watch(hoverId, (id) => {
  if (id === null) {
    tipAnchor.value = null
    return
  }
  const row = wrapEl.value?.querySelector<HTMLElement>(`[data-offer-id="${id}"]`)
  if (!row) {
    tipAnchor.value = null
    return
  }
  const rect = row.getBoundingClientRect()
  tipAnchor.value = { top: rect.top, bottom: rect.bottom, left: rect.left }
})

const popDuration = `${FORGE_OFFER_POP_MS}ms`
const listMax = `${FORGE_OFFER_LIST_MAX_PX}px`
const listMaxCompact = `${FORGE_OFFER_LIST_MAX_COMPACT_PX}px`
</script>

<style scoped>
.fos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* `relative` trägt die abgehende Zeile: sie verlässt den Fluss, damit der Rest
   nicht zweimal springt (siehe `.fos-pop-leave-active`).

   Der DECKEL ist kein Schönheitsmaß: im Spätspiel sind fünf Relikte, sieben
   Konstellationen und der Handel dreizehn Zeilen, und ungedeckelt schob der
   Streifen die Upgrade-Liste auf Full HD vollständig aus dem Bild (gemessen
   89 % der Spaltenhöhe). Verstecken darf er trotzdem nichts — jede dieser
   Zeilen ist eine, die der Spieler kaufen kann. Also scrollt er, statt zu
   klemmen; die angeschnittene vierte Zeile sagt von selbst, dass es weitergeht. */
.fos-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: v-bind(listMax);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.fos-list::-webkit-scrollbar {
  width: 4px;
}

.fos-list::-webkit-scrollbar-track {
  background: #111;
}

.fos-list::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* Eine Zeile darf von der Spalte nie gestaucht werden — ihr `overflow: hidden`
   ließe sie sonst zu einem Streifen zusammenfallen. */
.fos-list > * {
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   KOPFZEILE
   Bewusst NICHT der Topf-Trenner der Liste darunter (`.fu-div`, Linie–Etikett–
   Linie): der Streifen ist kein weiterer Topf derselben Liste, sondern ein
   eigener Ort. Etikett links, Linie nach rechts auslaufend — dieselbe Sprache,
   andere Satzstellung.
══════════════════════════════════════════════════ */
.fos-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 2px 0;
}

.fos-head-ico {
  flex-shrink: 0;
  color: v-bind('FORGE_OFFER_COLOR');
}

.fos-head-label {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  color: v-bind('FORGE_OFFER_COLOR');
}

.fos-head-num {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #4a3010;
  color: v-bind('FORGE_OFFER_COLOR');
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.fos-head-rule {
  flex: 1;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(to right, rgba(232, 160, 32, 0.45), transparent);
}

/* ══════════════════════════════════════════════════
   AUFPOPPEN
   Nur `opacity` und `transform` (Performance-Regel 1). `fos-pop-leave-active`
   nimmt die Zeile aus dem Fluss, damit der Rest nicht zweimal springt — einmal
   beim Ausblenden und einmal beim Schließen der Lücke.
══════════════════════════════════════════════════ */
.fos-pop-enter-active,
.fos-pop-leave-active {
  transition:
    opacity v-bind(popDuration) ease,
    transform v-bind(popDuration) ease;
}

.fos-pop-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.fos-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.fos-pop-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}

.fos-pop-move {
  transition: transform v-bind(popDuration) ease;
}

/* Full HD ist der flachste Viewport — dort gibt der Streifen als Erstes nach,
   damit unter ihm fünf Upgrade-Zeilen im Bild bleiben. */
@media (max-height: 1100px) {
  .fos,
  .fos-list {
    gap: 6px;
  }

  .fos-list {
    max-height: v-bind(listMaxCompact);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fos-pop-enter-active,
  .fos-pop-leave-active,
  .fos-pop-move {
    transition: none;
  }
}
</style>
