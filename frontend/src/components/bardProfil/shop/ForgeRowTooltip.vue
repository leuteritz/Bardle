<template>
  <div v-if="entry && anchor" class="frt-card" :style="cardStyle" aria-hidden="true">
    <div class="frt-head">
      <Icon :icon="entry.icon" width="18" height="18" :style="{ color: entry.color }" />
      <span class="frt-name" :style="{ color: entry.color }">{{ entry.name }}</span>
      <span class="frt-tier">{{ entry.tierLabel }}</span>
    </div>

    <div class="frt-meta">{{ metaLine }}</div>
    <div class="frt-desc">{{ entry.desc }}</div>

    <template v-if="entry.state === 'locked' || entry.state === 'capped'">
      <div class="frt-lock">{{ entry.lockReason }}</div>
      <div v-if="entry.state === 'locked'" class="frt-track">
        <i :style="{ transform: `scaleX(${entry.unlockProgress})` }" />
      </div>
    </template>

    <div v-else-if="entry.state === 'maxed'" class="frt-maxed">✦ MAXED</div>

    <template v-else>
      <div class="frt-next"><span class="frt-arrow">→</span> {{ entry.nextDesc }}</div>
      <div class="frt-cost-row">
        <span class="frt-cost" :class="{ 'frt-cost--cant': !entry.goldOk }">
          <img :src="FORGE_CHIME_IMAGE" class="frt-cost-img" alt="Chimes" />
          {{ formatNumber(entry.goldCost) }}
        </span>
        <span
          v-for="mat in entry.materials"
          :key="mat.id"
          class="frt-mat"
          :class="{ 'frt-mat--missing': !mat.ok }"
        >
          <img v-if="mat.image" :src="mat.image" class="frt-mat-img" :alt="mat.name" />
          {{ mat.have }}/{{ mat.need }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Was der Zeiger in der Liste streift, in voller Auskunft.
 *
 * Der Kopf der Spalte folgte dem Zeiger einmal selbst; seit er die EMPFEHLUNG
 * zeigt, hat die Liste ihren eigenen Weg gebraucht. Dieses Kärtchen ist er.
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
import { formatNumber } from '@/config/ui/numberFormat'
import type { ForgeUpgradeEntry, ForgeRowTipAnchor } from '@/types'
import {
  FORGE_CHIME_IMAGE,
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
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.68);
}

.frt-lock {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 200, 80, 0.65);
}

.frt-track {
  height: 6px;
  border-radius: 4px;
  background: #241708;
  overflow: hidden;
}

.frt-track i {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8a020);
}

.frt-maxed {
  font-size: 12px;
  font-weight: 900;
  color: #e8c040;
  text-align: center;
  letter-spacing: 1px;
}

.frt-next {
  font-size: 12px;
  font-weight: 900;
  color: #6ecc44;
}

.frt-arrow {
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
}

.frt-cost-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.frt-cost {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(82, 184, 48, 0.15);
  border: 1px solid rgba(82, 184, 48, 0.3);
  color: #a0ffa0;
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.frt-cost--cant {
  color: #cc6050;
  background: rgba(180, 40, 40, 0.12);
  border-color: rgba(140, 40, 40, 0.3);
}

.frt-cost-img {
  height: 13px;
  width: auto;
  object-fit: contain;
}

.frt-mat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 900;
  color: #e8d8b0;
  font-variant-numeric: tabular-nums;
}

.frt-mat--missing {
  color: #cc6050;
}

.frt-mat-img {
  height: 15px;
  width: auto;
  object-fit: contain;
}
</style>
