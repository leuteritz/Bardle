<template>
  <div v-if="entry && anchor" class="frt-card" :style="cardStyle" aria-hidden="true">
    <div class="frt-head">
      <Icon :icon="entry.icon" width="18" height="18" :style="{ color: entry.color }" />
      <span class="frt-name" :style="{ color: entry.color }">{{ entry.name }}</span>
      <span class="frt-tier">{{ entry.tierLabel }}</span>
    </div>

    <div class="frt-meta">{{ metaLine }}</div>
    <div class="frt-desc">{{ entry.desc }}</div>
  </div>
</template>

<script setup lang="ts">
/**
 * Was der Zeiger in der Liste streift — und zwar genau das, was die Kachel
 * darunter NICHT zeigt.
 *
 * Der Kopf der Spalte folgte dem Zeiger einmal selbst; seit er die EMPFEHLUNG
 * zeigt, hat die Liste ihren eigenen Weg gebraucht. Dieses Kärtchen ist er.
 *
 * Es trug bis zum Kachel-Umbau vier Zweige: Preis, Wirkungssprung, Sperrgrund
 * samt Balken und die MAX-Marke. Alle vier stehen jetzt gross in der Kachel
 * selbst — hier wären sie dieselbe Zahl in kleinerer Schrift, direkt neben
 * ihrem Original. Übrig bleibt, was in eine Zeile nie gepasst hat: der volle
 * Wortlaut der Wirkung, der Rang und der Knoten, an dem der Eintrag hängt.
 *
 * Zwei Regeln tragen es:
 *
 * 1. **`position: fixed`, links NEBEN der Spalte.** Alles, was im Fluss der
 *    Liste läge — eine aufklappende Zeile, ein eingeschobener Block — schöbe
 *    sie beim Erscheinen unter dem Zeiger weg, der Hover ginge aus, das
 *    Kärtchen verschwände, die Liste käme zurück. Genau dieses selbsttragende
 *    Flackern hat den Detailkopf schon einmal unbenutzbar gemacht.
 * 2. **EINE Instanz für die ganze Liste**, nicht eine je Zeile — bei
 *    Vollausbau stünden dort fünfundvierzig.
 *
 * Die Ausrichtung braucht die eigene Höhe NICHT: liegt die Zeile in der oberen
 * Bildhälfte, hängt das Kärtchen an ihrer Oberkante nach unten, sonst an ihrer
 * Unterkante nach oben. So bleibt es im Bild, ohne dass ein zweiter Reflow es
 * erst ausmessen müsste.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { ForgeUpgradeEntry, ForgeRowTipAnchor } from '@/types'
import {
  FORGE_ROW_TIP_WIDTH_PX,
  FORGE_ROW_TIP_GAP_PX,
  FORGE_DETAIL_ENDLESS_META,
  FORGE_DETAIL_PARENT_PREFIX,
} from '@/config/constants'

/** Die Kanten kommen fertig vom Aufrufer — gemessen wird nie hier. */
const props = defineProps<{
  entry: ForgeUpgradeEntry | null
  anchor: ForgeRowTipAnchor | null
}>()

const cardStyle = computed(() => {
  const a = props.anchor
  if (!a) return {}
  const above = a.top > window.innerHeight / 2
  return {
    left: `${a.left - FORGE_ROW_TIP_WIDTH_PX - FORGE_ROW_TIP_GAP_PX}px`,
    top: `${above ? a.bottom : a.top}px`,
    transform: above ? 'translateY(-100%)' : 'none',
  }
})

/** „Lv 3 / 6 · hangs on Wayfinder's Cache" — ein Bough trägt `Infinity`. */
const metaLine = computed(() => {
  const e = props.entry
  if (!e) return ''
  const parts = [
    Number.isFinite(e.maxLevel)
      ? `Lv ${e.level} / ${e.maxLevel}`
      : `Lv ${e.level} · ${FORGE_DETAIL_ENDLESS_META}`,
  ]
  if (e.parentName !== '') parts.push(`${FORGE_DETAIL_PARENT_PREFIX}${e.parentName}`)
  return parts.join(' · ')
})

const tipWidth = `${FORGE_ROW_TIP_WIDTH_PX}px`
</script>

<style scoped>
/* Tooltip-Standard des Projekts. `pointer-events: none` ist nicht Kosmetik:
   ohne es klaute das Kärtchen den Hover der Zeile, die es beschreibt. */
.frt-card {
  position: fixed;
  z-index: 60;
  width: v-bind(tipWidth);
  padding: 10px 12px 11px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  pointer-events: none;
}

.frt-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.frt-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.frt-tier {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.35);
}

.frt-meta {
  font-size: 11px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.45);
}

.frt-desc {
  font-size: 12.5px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.68);
}
</style>
