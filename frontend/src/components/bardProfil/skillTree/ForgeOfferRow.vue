<template>
  <article
    class="fo-row"
    :class="{
      'fo-row--ready': offer.ready,
      'fo-row--deal': offer.kind === 'bargain',
      'fo-row--sold': offer.sold,
    }"
    :style="{ '--node-c': offer.color }"
    :data-offer-id="offer.id"
    @mouseenter="$emit('hover', offer.id)"
  >
    <!-- NEU SEIT DEM LETZTEN BLICK — dieselbe Marke, dieselbe Ecke wie an der
         Upgrade-Zeile darunter, am Knoten im Baum und an der Ecktaste im Header
         (`ShopReadyBadge`). Vier Orte, eine Form: der Spieler folgt ihr vom
         Header bis zu dem einen Eintrag, der gemeint ist.

         Ihre Zahl ist hier IMMER eine Eins, und das ist keine Verlegenheit: ein
         Relikt und eine Konstellation kauft man Stufe für Stufe über denselben
         Knopf, einen Stapel gibt es nicht. „1" heisst also genau das, was der
         Fall ist — ein Kauf steht offen.

         Der HANDEL bekommt keine. Seine Zeile trägt bereits ein Laufband, eine
         Uhr und einen Rabattstempel; eine vierte Meldung in derselben Ecke wäre
         kein Zeichen mehr, sondern Lärm — und „neu" sagt beim Händler ohnehin
         die Uhr, die nur er hat. -->
    <ShopReadyBadge
      v-if="fresh && offer.kind !== 'bargain'"
      class="fo-fresh-badge"
      :count="1"
      :title="FORGE_FRESH_TITLE"
      :label="FORGE_FRESH_TITLE"
    />

    <!-- Die EINE atmende Ebene der Zeile. Statischer Schein, animiert wird allein
         ihre Deckkraft (Performance-Regel 2/11) — dasselbe Rezept wie `.fut-halo`
         in der Upgrade-Zeile nebenan.

         Sie hatte einen zweiten Anlass: „neu seit dem letzten Blick", in Azur.
         Der ist gefallen — ein frisches Angebot sieht aus wie ein kaufbares, und
         was es auszeichnet, steht als Marke in seiner Ecke. -->
    <div v-if="offer.ready" class="fo-halo fo-halo--ready" aria-hidden="true" />

    <!-- Der Handel bringt sein Laufband mit — das einzige Angebot, das eine
         Uhr hat, sagt es auch ohne Zahlen. Eigene Maske, damit das `overflow`
         nicht an der Zeile hängt und den Schein daneben abschneidet. -->
    <span v-if="offer.kind === 'bargain' && !offer.sold" class="fo-shine-mask" aria-hidden="true">
      <span class="fo-shine" />
    </span>

    <span class="fo-glyph">
      <Icon
        :icon="offer.icon"
        :width="FORGE_OFFER_GLYPH_SIZE"
        :height="FORGE_OFFER_GLYPH_SIZE"
        :style="{ color: offer.color }"
      />
    </span>

    <div class="fo-main">
      <div class="fo-head">
        <span class="fo-name" :style="{ color: offer.color }">{{ offer.name }}</span>
        <span class="fo-tag">{{ offer.tag }}</span>
        <span v-if="offer.discountPct > 0" class="fo-cut">
          −{{ Math.round(offer.discountPct * 100) }}%
        </span>
      </div>

      <div class="fo-foot">
        <!-- Die Stufe steht VOR den Kosten und nur, wo es Stufen gibt: eine
             Konstellation und ein Handel sind einmalig, ein „Lv 0 / 0" dort wäre
             eine Zahl ohne Frage. -->
        <span v-if="offer.maxLevel > 0" class="fo-lvl">
          {{ FORGE_LEVEL_PREFIX }}{{ offer.level }} / {{ offer.maxLevel }}
        </span>

        <!-- Die Uhr des Handels — sie hing bis zum Umbau an der Fußkachel der
             Abteilungs-Rail und ist der Grund, warum seine Zeile immer steht. -->
        <span v-if="offer.restockMs !== null" class="fo-clock">
          <Icon :icon="FORGE_OFFER_CLOCK_ICON" width="14" height="14" />
          {{ formatCompactDuration(offer.restockMs) }}
        </span>

        <ForgeCostRow
          v-if="offer.gold > 0 || offer.materials.length > 0"
          class="fo-cost"
          flat
          :label="false"
          :gold="offer.gold"
          :gold-ok="offer.goldOk"
          :materials="offer.materials"
        />
        <span v-else class="fo-free">{{ FORGE_OFFER_FREE_LABEL }}</span>
      </div>
    </div>

    <!-- Ein verkaufter Handel trägt keinen toten Knopf: die Marke sagt, dass es
         nichts zu entscheiden gibt, und die Uhr daneben, wie lange noch. -->
    <span v-if="offer.sold" class="fo-sold">{{ FORGE_OFFER_SOLD_LABEL }}</span>
    <button
      v-else
      class="fc-act fo-act"
      :class="{ 'fc-act--gold': offer.kind === 'bargain' }"
      :disabled="!offer.ready"
      :title="offer.ready ? `${offer.verb} ${offer.name}` : FORGE_OFFER_SHORT_TITLE"
      @click="$emit('buy', offer.id)"
    >
      {{ offer.verb }}
    </button>

    <button
      v-if="offer.kind === 'bargain'"
      class="fo-reroll"
      :disabled="!canReroll"
      :title="FORGE_OFFER_REROLL_TITLE"
      :aria-label="FORGE_OFFER_REROLL_TITLE"
      @click="$emit('reroll')"
    >
      <Icon :icon="FORGE_OFFER_REROLL_ICON" width="16" height="16" />
    </button>
  </article>
</template>

<script setup lang="ts">
/**
 * EIN Angebot als Zeile — Relikt, Konstellation oder Handel.
 *
 * Die Zeile weiß nicht, was sie verkauft: alles Art-Spezifische steckt im
 * `ForgeOffer`, den `useForgeOffers` baut. Was hier steht, ist ausschließlich
 * Form — und die ist bewusst dieselbe wie bei `ForgeUpgradeTile` darunter, denn
 * beide beantworten dem Spieler dieselbe Frage: „kann ich das jetzt, und was
 * kostet es?".
 *
 * ── Die zwei Zustände ───────────────────────────────────────────────────────
 * Erscheinen und Kaufbarsein sind getrennt (Herleitung in `useForgeOffers`).
 * Sichtbar heißt hier: freigeschaltet. Die KAUFBARE Optik — volle Leitfarbe,
 * atmender Schein, grüner Knopf — trägt allein `offer.ready`. Was noch spart,
 * steht gedämpft da, mit roter Zahl an der fehlenden Position und einem
 * gesperrten Knopf.
 *
 * ── Was NICHT hier steht ────────────────────────────────────────────────────
 * Der Wirkungssatz, die Anforderungen einer Konstellation und das Sortiment des
 * Händlers. Sie stehen im schwebenden Kärtchen (`ForgeOfferTooltip`) — im Fluss
 * der Zeile verschöben sie beim Erscheinen die Reihe unter dem Zeiger, und der
 * Hover ginge im selben Frame wieder aus.
 */
import { Icon } from '@iconify/vue'
import ForgeCostRow from './ForgeCostRow.vue'
import ShopReadyBadge from '@/components/ui/ShopReadyBadge.vue'
import { formatCompactDuration } from '@/utils/ui/format'
import type { ForgeOffer } from '@/types'
import {
  FORGE_FRESH_BADGE_OFFER_PX,
  FORGE_FRESH_TITLE,
  FORGE_LEVEL_PREFIX,
  FORGE_OFFER_CLOCK_ICON,
  FORGE_OFFER_COST_IMAGE_PX,
  FORGE_OFFER_FREE_LABEL,
  FORGE_OFFER_GLYPH_SIZE,
  FORGE_OFFER_SHINE_MS,
  FORGE_OFFER_REROLL_ICON,
  FORGE_OFFER_REROLL_TITLE,
  FORGE_OFFER_SHORT_TITLE,
  FORGE_OFFER_SOLD_LABEL,
} from '@/config/constants'

defineProps<{
  offer: ForgeOffer
  /** Seit dem letzten Blick des Spielers erreichbar geworden. */
  fresh: boolean
  canReroll: boolean
}>()

defineEmits<{
  (e: 'buy', id: string): void
  (e: 'hover', id: string): void
  (e: 'reroll'): void
}>()

const shineDuration = `${FORGE_OFFER_SHINE_MS}ms`
/* Statisch, einmal je Zeile — kein Frame-Wert (Performance-Regel 3). */
const freshBadgeSize = `${FORGE_FRESH_BADGE_OFFER_PX}px`
const costImageSize = `${FORGE_OFFER_COST_IMAGE_PX}px`
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   ZEILE
   Dieselbe Grundform wie `.fut-row` in der Upgrade-Liste: Glyph vorn, Text in
   der Mitte, Kauffläche rechts. Sie stehen im selben Scrollfeld untereinander
   und dürfen sich nicht wie zwei Bauteile lesen.
══════════════════════════════════════════════════ */
.fo-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 10px;
  border: 1px solid #3e200a;
  border-radius: 4px;
  background: #1c1c18;
  /* Nur Farbwechsel, kein Dauerläufer — der Umschlag „bezahlbar geworden"
     bekommt eine Transition, sonst nichts (Performance-Regel 2). */
  transition:
    border-color 0.14s ease,
    opacity 0.14s ease;
}

/* Was noch spart, tritt zurück — aber nicht so weit, dass man es übersieht:
   es ist der Grund, warum der Spieler weiterklickt. */
.fo-row:not(.fo-row--ready) {
  opacity: 0.78;
}

.fo-row:hover {
  opacity: 1;
  border-color: #7a4e20;
}

.fo-row--ready {
  border-color: #c89040;
}

.fo-row--deal {
  border-color: #7a4e20;
  background: linear-gradient(120deg, #1c130a, #241608);
}

.fo-row--sold {
  opacity: 0.72;
}

/* ── DIE NEU-MARKE ───────────────────────────────────────────
   Sitz und Mass für `ShopReadyBadge`; Farbe, Rundung und Schein bringt sie
   selbst mit.

   Diese Zeile trägt KEIN `overflow`, die Marke dürfte also überstehen — sie tut
   es trotzdem nicht: drüben an der Upgrade-Zeile muss sie innen bleiben, und
   zwei Marken, die je nach Zeilenart anders an der Kante sitzen, läsen sich als
   zwei verschiedene Zeichen.

   `pointer-events: none` überschreibt das `auto` der Komponente — unter der
   Ecke liegt der Kaufknopf. Doppelter Selektor, weil die Komponente ihr `auto`
   mit gleicher Spezifität setzt. */
.fo-fresh-badge.fo-fresh-badge {
  --sbadge-d: v-bind(freshBadgeSize);
  --sbadge-top: 3px;
  --sbadge-right: 3px;
  z-index: 3;
  pointer-events: none;
}

/* ══════════════════════════════════════════════════
   ATMENDE EBENE — statischer Schein, animierte Deckkraft
══════════════════════════════════════════════════ */
.fo-halo {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  pointer-events: none;
  animation: fo-breathe 2.2s ease-in-out infinite;
}

.fo-halo--ready {
  border: 1px solid #e8c060;
  box-shadow: inset 0 0 16px rgba(232, 192, 64, 0.38);
}

@keyframes fo-breathe {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

/* Ruhig stellen, sobald der Zeiger ohnehin auf der Zeile liegt. */
.fo-row:hover .fo-halo {
  animation: none;
  opacity: 1;
}

/* ══════════════════════════════════════════════════
   LAUFBAND DES HÄNDLERS
   Ein wanderndes Band, keine animierte `background-position` — der Lauf bleibt
   Compositor-Arbeit (dieselbe Mechanik wie `.bg-shine` auf der alten Karte).
══════════════════════════════════════════════════ */
.fo-shine-mask {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  overflow: hidden;
  pointer-events: none;
}

.fo-shine {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -45%;
  width: 45%;
  background: linear-gradient(105deg, transparent, rgba(255, 225, 150, 0.16), transparent);
  animation: fo-sweep v-bind(shineDuration) ease-in-out infinite;
}

@keyframes fo-sweep {
  0% {
    transform: translateX(0);
  }
  60%,
  100% {
    transform: translateX(340%);
  }
}

/* ══════════════════════════════════════════════════
   GLYPH
   Nackt, ohne Sockel — die Leitfarbe trägt das Zeichen selbst, genau wie in der
   Upgrade-Zeile.
══════════════════════════════════════════════════ */
.fo-glyph {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ══════════════════════════════════════════════════
   TEXT
══════════════════════════════════════════════════ */
.fo-main {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fo-head {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.fo-name {
  min-width: 0;
  font-size: 14.5px;
  font-weight: 900;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fo-tag {
  flex-shrink: 0;
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(232, 220, 192, 0.42);
  white-space: nowrap;
}

.fo-cut {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 900;
  color: #08130a;
  background: #e8a020;
}

.fo-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.fo-lvl {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.75);
  font-variant-numeric: tabular-nums;
}

.fo-clock {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

/* Das Kostenband darf schrumpfen — der Name oben soll seine Breite behalten.
   Sein Bild ist kleiner als die geteilten 26px: es allein trug gemessen 38 der
   78 Pixel Zeilenhöhe, und acht Zeilen davon füllten die halbe Spalte. Bei 17px
   bleibt die Zahl daneben unverändert lesbar (Herleitung an
   `FORGE_OFFER_COST_IMAGE_PX`). */
.fo-cost {
  min-width: 0;
  overflow: hidden;
}

.fo-cost :deep(.fc-cost-img) {
  height: v-bind(costImageSize);
}

.fo-free {
  font-size: 12.5px;
  font-weight: 900;
  color: #a0f0d0;
}

/* ══════════════════════════════════════════════════
   KAUFFLÄCHE
   `.fc-act` ist der geteilte Kaufknopf (rpg-theme.css) und dort volle Breite —
   in einer Zeile ist er ein Feld unter mehreren.
══════════════════════════════════════════════════ */
.fo-act {
  position: relative;
  flex-shrink: 0;
  width: auto;
  min-width: 78px;
  padding: 9px 13px;
  font-size: 13px;
}

.fo-sold {
  position: relative;
  flex-shrink: 0;
  min-width: 78px;
  text-align: center;
  font-size: 12.5px;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: rgba(160, 255, 160, 0.75);
}

.fo-reroll {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid #5c3310;
  border-radius: 4px;
  background: #1e1006;
  color: #c9a0ff;
  cursor: pointer;
  transition: border-color 0.14s ease;
}

.fo-reroll:hover:not(:disabled) {
  border-color: #7a4e20;
}

.fo-reroll:disabled {
  border-color: #3a2a12;
  color: rgba(201, 160, 255, 0.35);
  cursor: not-allowed;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fo-row {
    gap: 9px;
    padding: 7px 9px;
  }

  .fo-name {
    font-size: 13.5px;
  }

  .fo-act {
    min-width: 70px;
    padding: 8px 11px;
    font-size: 12.5px;
  }

  .fo-sold {
    min-width: 70px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fo-halo,
  .fo-shine {
    animation: none;
  }
}
</style>
