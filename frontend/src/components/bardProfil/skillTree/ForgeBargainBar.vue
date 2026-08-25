<template>
  <!-- Ein `mouseleave` am Rahmen statt eines an der Zeile: der Rahmen ist der
       Kopfgrund, und zwischen seinem Rand und der Zeile liegt Polsterung, über
       die der Zeiger sonst das Kärtchen mitnähme. -->
  <div v-if="offer" ref="wrapEl" class="fbb" @mouseleave="leave">
    <ForgeOfferRow
      :offer="offer"
      :fresh="false"
      :can-reroll="canReroll"
      @buy="buyOffer"
      @hover="enterRow"
      @reroll="rerollBargain"
    />

    <!-- Dieselbe Mechanik wie im Streifen darunter: `position: fixed`,
         Geschwister der Zeile. Im Fluss der Leiste schöbe sein Erscheinen die
         Zeile unter dem Zeiger weg, und der Hover ginge im selben Zug aus. -->
    <ForgeOfferTooltip :offer="tipOffer" :anchor="tipAnchor" :extras="bargainExtras" />
  </div>
</template>

<script setup lang="ts">
/**
 * Der kosmische Handel als fester Kopf der Detailspalte.
 *
 * Er war die erste Zeile des Angebotsstreifens und rollte mit ihm weg —
 * ausgerechnet das eine Angebot mit einer ABLAUFENDEN Uhr, das man sehen soll,
 * ohne etwas zu öffnen oder zu rollen.
 *
 * Er steht über allem, und das ist keine Rangfolge, sondern Ruhe: er ist das
 * einzige DAUERHAFTE Stück des Kopfes — Segensreihe und Sammelkauf-Leiste kommen
 * und gehen, letztere laut ihrem eigenen Kommentar „ständig", sooft die Chimes
 * eine Kaufschwelle kreuzen. Läge der Handel darunter, spränge sein Kaufknopf bei
 * jeder Schwelle unter dem Zeiger weg.
 *
 * ── Was hier NICHT steht ────────────────────────────────────────────────────
 * Die Zeile selbst. Sie ist unverändert `ForgeOfferRow` — dieselbe, die der
 * Streifen für Relikte und Konstellationen benutzt, mit ihrem Laufband, ihrem
 * Rabattstempel und ihrer Uhr. Eine zweite Gestalt für dieselbe Sache wäre die
 * eine Sorte Doppelung, die sich später auseinanderentwickelt.
 */
import { computed, ref } from 'vue'
import ForgeOfferRow from './ForgeOfferRow.vue'
import ForgeOfferTooltip from './ForgeOfferTooltip.vue'
import { useForgeOffers } from '@/composables/ui/useForgeOffers'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import type { ForgeRowTipAnchor } from '@/types'

const forgeStore = useStarForgeStore()
const { bargainOffer: offer, bargainExtras, buyOffer, rerollBargain, canReroll } = useForgeOffers()

const wrapEl = ref<HTMLElement | null>(null)
const hovering = ref(false)

/**
 * Wo das Kärtchen hängt. Gemessen wird beim EINTRITT, nie pro Frame — und nur
 * die drei Kanten, die es braucht (`ForgeRowTipAnchor`). Die Leiste rollt nicht
 * mit, ihre Kanten stehen also, solange der Zeiger auf ihr liegt.
 */
const tipAnchor = ref<ForgeRowTipAnchor | null>(null)

const tipOffer = computed(() => (hovering.value ? offer.value : null))

/**
 * Betreten heißt zugleich GESEHEN — dieselbe Quittung wie an einer Zeile des
 * Streifens. Der Handel zählt in `shopReadyIds` mit; ohne sie bliebe die Marke
 * am Header stehen, obwohl der Spieler längst hingesehen hat.
 */
function enterRow(id: string): void {
  const row = wrapEl.value?.querySelector<HTMLElement>(`[data-offer-id="${id}"]`)
  if (!row) return
  const rect = row.getBoundingClientRect()
  tipAnchor.value = { top: rect.top, bottom: rect.bottom, left: rect.left }
  hovering.value = true
  forgeStore.acknowledgeShopEntry(id)
}

function leave(): void {
  hovering.value = false
  tipAnchor.value = null
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   DER KOPFGRUND
   Dieselbe Fläche wie die Segensreihe direkt darunter (`.sf-buffs`): der Kopf
   der Spalte liest sich als EIN Ort, nicht als Stapel aus Bauteilen. Die Zeile
   darin bringt ihren eigenen Rahmen und ihren Gold-Braun-Verlauf mit und steht
   deshalb als Karte darauf.
══════════════════════════════════════════════════ */
.fbb {
  flex-shrink: 0;
  padding: 11px 18px;
  background: #14100c;
  border-bottom: 1px solid #2a1a08;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fbb {
    padding: 9px 15px;
  }
}
</style>
