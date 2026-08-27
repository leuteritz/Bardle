<template>
  <section v-if="offer" ref="rootEl" class="fp" :style="{ '--node-c': offer.color }">
    <header class="fp-head">
      <Icon :icon="FORGE_PURSUIT_ICON" width="17" height="17" class="fp-head-ico" />
      <span class="fp-head-label">{{ FORGE_PURSUIT_TITLE }}</span>
      <span class="fp-head-rule" />
      <button class="fp-clear" type="button" @click="clearPursuit">
        {{ FORGE_FOCUS_NOTE_CLEAR }}
      </button>
    </header>

    <!-- Der Wirkungssatz steht hier im Fluss und nicht im schwebenden Kärtchen:
         der Block hat nur EINE Zeile, es gibt nichts, was er verschieben
         könnte, und ohne ihn sagt die Karte nie, wofür man das alles tut. -->
    <p class="fp-desc">{{ offer.desc }}</p>

    <ForgeOfferRow
      :offer="offer"
      :fresh="false"
      :can-reroll="false"
      @buy="handleBuy"
      @hover="handleHover"
    />

    <div v-if="offer.reqs.length > 0" class="fp-reqs">
      <span class="fp-reqs-label">{{ FORGE_OFFER_REQS_LABEL }}</span>
      <button
        v-for="req in offer.reqs"
        :key="req.id"
        class="fp-req"
        type="button"
        :title="FORGE_PURSUIT_REQ_TITLE"
        @click="focusNode(req.id, { readable: true })"
      >
        <span class="fp-req-name" :class="{ 'fp-req-name--met': req.met }">{{ req.name }}</span>
        <span class="fp-req-track">
          <i
            :class="{ 'fp-req-fill--met': req.met }"
            :style="{ transform: `scaleX(${req.progress})` }"
          />
        </span>
        <span class="fp-req-num" :class="{ 'fp-req-num--met': req.met }">
          {{ req.have }}/{{ req.need }}
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Was der Spieler gerade VERFOLGT — der eine Vault-Eintrag, auf den von aussen
 * gezeigt wurde.
 *
 * Der Streifen darunter führt ausdrücklich nur, was freigeschaltet ist; ein noch
 * gesperrtes Upgrade steht damit nirgends in dieser Spalte, und ein Sprung
 * darauf könnte nur einen seiner Zubringer treffen. Das beantwortet aber nicht
 * die Frage, mit der der Spieler herkommt — „was schaltet den Knopf frei" —,
 * sondern die übernächste.
 *
 * Deshalb dieser Block, und deshalb ganz oben: er steht ohne jedes Rollen im
 * Bild, und die Reihenfolge der Spalte bleibt ihre alte — was ich verfolge, was
 * erreichbar ist, der Baum als Liste, die Schublade.
 *
 * **Die Bedingungen sind Knöpfe.** Sie sind der zweite Schritt und stehen dort,
 * wo er erklärt wird. Ihr Klick setzt den FOKUS, nicht die Verfolgung — beides
 * liegt in `useForgeSpotlight`, aber in zwei Feldern, sonst löschte die Karte
 * sich mit ihrem eigenen Knopf.
 */
import { nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ForgeOfferRow from './ForgeOfferRow.vue'
import { useForgeOffers } from '@/composables/ui/useForgeOffers'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useForgeDetailsPane } from '@/composables/ui/useForgeDetailsPane'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import {
  FORGE_FOCUS_NOTE_CLEAR,
  FORGE_OFFER_REQS_LABEL,
  FORGE_PURSUIT_ICON,
  FORGE_PURSUIT_REQ_TITLE,
  FORGE_PURSUIT_TITLE,
} from '@/config/constants'

const { pursuedOffer: offer, buyOffer } = useForgeOffers()
const { clearPursuit, focusNode } = useForgeSpotlight()
const { detailsOpen } = useForgeDetailsPane()
const forgeStore = useStarForgeStore()

const rootEl = ref<HTMLElement | null>(null)

function handleBuy(id: string): void {
  // Was fusioniert ist, ist entschieden — dieselbe Regel wie beim Fokus der Liste.
  if (buyOffer(id)) clearPursuit()
}

function handleHover(id: string): void {
  forgeStore.acknowledgeShopEntry(id)
}

/**
 * Der Block steht ganz oben — der Rollkasten aber dort, wo ihn der letzte
 * Besuch verlassen hat. Der Reiter bleibt gemountet, `scrollTop` überlebt jeden
 * Tabwechsel; ohne diese Fahrt landet der Sprung auf einer leeren Fläche.
 *
 * Nur beim ERSTEN Auftauchen: ein Wechsel von einem verfolgten Eintrag zum
 * nächsten rollt nicht noch einmal.
 */
watch(
  () => offer.value?.id ?? null,
  async (id, prev) => {
    if (id === null || prev !== null || !detailsOpen.value) return
    await nextTick()
    rootEl.value?.closest<HTMLElement>('[data-forge-scroll]')?.scrollTo({ top: 0 })
  },
  { immediate: true },
)
</script>

<style scoped>
.fp {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 8px 10px;
  background: #16120a;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--node-c, #e8c040);
  border-radius: 4px;
}

/* ══ Kopfzeile — Etikett links, Linie nach rechts auslaufend.
   Dieselbe Satzstellung wie `.fos-head` im Streifen darunter: der Block ist ein
   eigener Ort, kein weiterer Topf derselben Liste. ══ */
.fp-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fp-head-ico {
  flex-shrink: 0;
  color: var(--node-c, #e8c040);
}

.fp-head-label {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--node-c, #e8c040);
}

.fp-head-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, #5c3310, rgba(92, 51, 16, 0));
}

.fp-clear {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.6);
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  cursor: pointer;
}

.fp-clear:hover {
  color: #e8c040;
  border-color: #5c3310;
}

.fp-desc {
  margin: 0 2px;
  font-size: 12px;
  line-height: 1.35;
  color: rgba(232, 220, 192, 0.78);
}

/* ══ Die Tore ══ */
.fp-reqs {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 2px;
}

.fp-reqs-label {
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
}

.fp-req {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 4px;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
}

.fp-req:hover {
  background: #1c1c18;
  border-color: #3e200a;
}

.fp-req:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 1px;
}

.fp-req-name {
  flex: 0 0 40%;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fp-req-name--met {
  color: #a0f0d0;
}

/* Eigener Balken statt `.fc-track`: das dort liegt absolut an der Unterkante
   einer Zeile, hier steht er IN der Reihe. */
.fp-req-track {
  position: relative;
  flex: 1;
  height: 3px;
  background: #241708;
  border-radius: 2px;
  overflow: hidden;
}

.fp-req-track i {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8a020);
}

.fp-req-track i.fp-req-fill--met {
  background: linear-gradient(to right, #2e7a1a, #7ad0a0);
}

.fp-req-num {
  flex-shrink: 0;
  min-width: 34px;
  text-align: right;
  font-size: 11.5px;
  font-weight: 900;
  color: rgba(255, 200, 80, 0.7);
}

.fp-req-num--met {
  color: #a0f0d0;
}
</style>
