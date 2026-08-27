<template>
  <div v-if="offer && anchor" class="tip fot-card" :style="cardStyle" aria-hidden="true">
    <span class="tip-accent" aria-hidden="true" />

    <div class="tip-head">
      <Icon
        :icon="offer.icon"
        width="20"
        height="20"
        class="tip-ico"
        :style="{ color: offer.color }"
      />
      <span class="tip-name" :style="{ color: offer.color }">{{ offer.name }}</span>
      <span class="tip-chip tip-chip--muted">{{ offer.tag }}</span>
    </div>

    <div class="tip-effect">{{ offer.desc }}</div>

    <!-- ══ RELIKT — was der nächste Schlag wirklich bringt ═══════════ -->
    <div v-if="offer.kind === 'relic'" class="tip-block fot-delta">
      <span class="fot-delta-cell">
        <span class="fot-delta-label">{{ FORGE_OFFER_NOW_LABEL }}</span>
        <span class="fot-delta-value">{{ offer.nowText }}</span>
      </span>
      <span class="fot-delta-arrow">→</span>
      <span class="fot-delta-cell">
        <span class="fot-delta-label">{{ FORGE_OFFER_NEXT_LABEL }}</span>
        <span class="fot-delta-value fot-delta-value--next">{{ offer.nextText }}</span>
      </span>
    </div>

    <!-- ══ KONSTELLATION — beide Tore, ausgeschrieben ════════════════ -->
    <div v-else-if="offer.reqs.length > 0" class="tip-block fot-reqs">
      <span class="fot-block-label">{{ FORGE_OFFER_REQS_LABEL }}</span>
      <div v-for="req in offer.reqs" :key="req.id" class="fot-req">
        <span class="fot-req-name" :class="{ 'fot-req-name--met': req.met }">{{ req.name }}</span>
        <span class="fc-track fot-req-track">
          <i
            :class="{ 'fot-req-fill--met': req.met }"
            :style="{ transform: `scaleX(${req.progress})` }"
          />
        </span>
        <span class="fot-req-num" :class="{ 'fot-req-num--met': req.met }">
          {{ req.have }}/{{ req.need }}
        </span>
      </div>
    </div>

    <!-- ══ HANDEL — was im Kasten liegt und was noch im Wagen ════════ -->
    <template v-else-if="offer.kind === 'bargain'">
      <div v-if="extras.rewards.length > 0 || extras.goldReward > 0" class="fot-line">
        <span class="fot-block-label">{{ FORGE_OFFER_GET_LABEL }}</span>
        <span class="fot-line-items">
          <span v-for="item in extras.rewards" :key="item.id" class="fc-cost-pair" :title="item.name">
            <img v-if="item.image" :src="item.image" class="fc-cost-img" :alt="item.name" />
            <span class="fc-cost-qty">×{{ item.need }}</span>
          </span>
          <span v-if="extras.goldReward > 0" class="fc-cost-pair">
            <img :src="FORGE_CHIME_IMAGE" class="fc-cost-img" alt="Chimes" />
            <span class="fc-cost-gold">{{ formatNumber(extras.goldReward) }}</span>
          </span>
        </span>
      </div>

      <div v-if="extras.basePrice > 0" class="fot-line">
        <span class="fot-block-label">{{ FORGE_OFFER_PAY_LABEL }}</span>
        <span class="fot-line-items">
          <span class="fot-struck">{{ formatNumber(extras.basePrice) }}</span>
          <span class="fc-cost-pair">
            <img :src="FORGE_CHIME_IMAGE" class="fc-cost-img" alt="Chimes" />
            <span class="fc-cost-gold">{{ formatNumber(offer.gold) }}</span>
          </span>
        </span>
      </div>

      <div v-if="extras.wares.length > 0" class="fot-wares">
        <span class="fot-block-label">{{ FORGE_OFFER_WARES_LABEL }}</span>
        <span v-for="ware in extras.wares" :key="ware.id" class="fot-ware">
          <span class="fot-ware-name">{{ ware.name }}</span>
          <span class="fot-ware-kind">{{ ware.kind }}</span>
        </span>
      </div>

      <p class="fot-note">{{ FORGE_OFFER_NOTE }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Die volle Auskunft zum Angebot unter dem Zeiger.
 *
 * Übernimmt die Mechanik von `ForgeRowTooltip` — der Zwillingskomponente für die
 * Upgrade-Liste — unverändert, und aus denselben zwei Gründen:
 *
 * 1. **`position: fixed`, links NEBEN der Spalte.** Alles, was im Fluss des
 *    Streifens läge, verschöbe ihn beim Erscheinen unter dem Zeiger, der Hover
 *    ginge aus, das Kärtchen verschwände, der Streifen käme zurück. Genau dieses
 *    selbsttragende Flackern hat den alten Detailkopf unbenutzbar gemacht.
 * 2. **EINE Instanz für den ganzen Streifen**, nicht eine je Zeile.
 *
 * Was es zeigt, hängt an der Art: der Wirkungssprung beim Relikt, beide Tore bei
 * der Konstellation, Kasteninhalt und Sortiment beim Handel. Der Wirkungssatz
 * steht bei allen dreien oben — er ist die eine Angabe, die in keine Zeile passt.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { formatNumber } from '@/config/ui/numberFormat'
import type { ForgeOffer, ForgeRowTipAnchor } from '@/types'
import type { ForgeBargainExtras } from '@/composables/ui/useForgeOffers'
import {
  FORGE_CHIME_IMAGE,
  FORGE_OFFER_GET_LABEL,
  FORGE_OFFER_NEXT_LABEL,
  FORGE_OFFER_NOTE,
  FORGE_OFFER_NOW_LABEL,
  FORGE_OFFER_PAY_LABEL,
  FORGE_OFFER_REQS_LABEL,
  FORGE_OFFER_TIP_GAP_PX,
  FORGE_OFFER_TIP_WIDTH_PX,
  FORGE_OFFER_WARES_LABEL,
} from '@/config/constants'

/**
 * Die Kanten kommen fertig vom Aufrufer — gemessen wird nie hier.
 *
 * `extras` ist optional, seit der Handel nicht mehr im Streifen steht: gelesen
 * wird es ausschliesslich im `kind === 'bargain'`-Zweig, und dorthin kommt nur
 * noch die Leiste im Kopf. Der Streifen soll nichts über den Handel wissen
 * müssen, um seine Relikte zu beschreiben.
 */
const props = withDefaults(
  defineProps<{
    offer: ForgeOffer | null
    anchor: ForgeRowTipAnchor | null
    extras?: ForgeBargainExtras
  }>(),
  {
    extras: () => ({ rewards: [], costs: [], wares: [], basePrice: 0, goldReward: 0 }),
  },
)

/**
 * Die Ausrichtung braucht die eigene Höhe NICHT: liegt die Zeile in der oberen
 * Bildhälfte, hängt das Kärtchen an ihrer Oberkante nach unten, sonst an ihrer
 * Unterkante nach oben. So bleibt es im Bild, ohne dass ein zweiter Reflow es
 * erst ausmessen müsste.
 */
const cardStyle = computed(() => {
  const a = props.anchor
  if (!a) return {}
  const above = a.top > window.innerHeight / 2
  return {
    '--tip-color': props.offer?.color ?? '',
    left: `${a.left - FORGE_OFFER_TIP_WIDTH_PX - FORGE_OFFER_TIP_GAP_PX}px`,
    top: `${above ? a.bottom : a.top}px`,
    transform: above ? 'translateY(-100%)' : 'none',
  }
})

const tipWidth = `${FORGE_OFFER_TIP_WIDTH_PX}px`
</script>

<style scoped>
/* Nur die Lage — sie ist breiter als ihre beiden Geschwister, weil hier
   Materialkacheln und Fortschrittsbalken stehen. Alles Sichtbare kommt als
   `.tip-*` aus `rpg-theme.css`; dort steht auch `pointer-events: none`, ohne
   das das Kärtchen den Hover der Zeile klaute, die es beschreibt. */
.fot-card {
  position: fixed;
  z-index: 60;
  width: v-bind(tipWidth);
}

.fot-block-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
}

/* ══════════════════════════════════════════════════
   WIRKUNGSSPRUNG
══════════════════════════════════════════════════ */
/* Grund und Polster kommen von `.tip-block` — dieselbe Fläche, auf der die
   Knotenkarte ihre Bedingungen zeigt. */
.fot-delta {
  display: flex;
  align-items: center;
  gap: 9px;
}

.fot-delta-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fot-delta-label {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
}

.fot-delta-value {
  font-size: 13.5px;
  font-weight: 900;
  color: rgba(232, 220, 192, 0.6);
  font-variant-numeric: tabular-nums;
}

.fot-delta-value--next {
  color: #7fd048;
}

.fot-delta-arrow {
  flex-shrink: 0;
  font-size: 13px;
  color: rgba(200, 144, 64, 0.5);
}

/* ══════════════════════════════════════════════════
   BEIDE TORE EINER KONSTELLATION
══════════════════════════════════════════════════ */
.fot-reqs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fot-req {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fot-req-name {
  flex: 0 0 40%;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fot-req-name--met {
  color: #a0f0d0;
}

/* `.fc-track` bringt Höhe, Grund und den Verlauf mit (rpg-theme.css) — hier
   bleibt nur die grüne Fassung für ein erfülltes Tor. */
.fot-req-track {
  flex: 1;
}

.fot-req-track i.fot-req-fill--met {
  background: linear-gradient(to right, #2e7a1a, #7ad0a0);
}

.fot-req-num {
  flex-shrink: 0;
  min-width: 34px;
  text-align: right;
  font-size: 11.5px;
  font-weight: 900;
  color: rgba(255, 200, 80, 0.7);
  font-variant-numeric: tabular-nums;
}

.fot-req-num--met {
  color: #a0f0d0;
}

/* ══════════════════════════════════════════════════
   HANDEL
══════════════════════════════════════════════════ */
.fot-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 9px;
  background: rgba(10, 8, 4, 0.5);
  border: 1px solid #3e200a;
  border-radius: 4px;
}

.fot-line-items {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
}

.fot-struck {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  text-decoration: line-through;
  font-variant-numeric: tabular-nums;
}

.fot-wares {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fot-ware {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.fot-ware-name {
  min-width: 0;
  font-size: 11.5px;
  font-weight: 800;
  color: rgba(232, 220, 192, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fot-ware-kind {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.45);
}

.fot-note {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.45;
  color: rgba(200, 144, 64, 0.42);
}
</style>
