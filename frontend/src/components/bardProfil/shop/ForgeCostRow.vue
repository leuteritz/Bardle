<template>
  <component
    :is="wrapperTag"
    class="fc-cost"
    :class="{
      'fc-cost--short': short,
      'fc-cost--bare': !label,
      'fc-cost--chips': chips,
    }"
  >
    <span v-if="label" class="fc-cost-label">{{ FORGE_COST_LABEL }}</span>

    <component :is="wrapperTag" class="fc-cost-row">
      <span v-if="gold > 0" class="fc-cost-pair" :class="{ 'fc-cost-pair--missing': !goldOk }">
        <img
          :src="FORGE_CHIME_IMAGE"
          class="fc-cost-img"
          :class="{ 'fc-cost-img--big': big }"
          alt="Chimes"
        />
        <span class="fc-cost-gold" :class="{ 'fc-cost-gold--big': big }">{{
          formatNumber(gold)
        }}</span>
      </span>

      <span
        v-for="mat in materials"
        :key="mat.id"
        class="fc-cost-pair"
        :class="{ 'fc-cost-pair--missing': !mat.ok }"
        :title="mat.name"
      >
        <img v-if="mat.image" :src="mat.image" class="fc-cost-img" :alt="mat.name" />
        <!-- Vier Materialien haben noch kein Artwork. Ohne Träger stand dort
             eine nackte Zahl, die nicht sagte, WORUM es geht — dasselbe
             Kürzel-Kästchen wie in der Header-Leiste schließt die Lücke. -->
        <span v-else class="fc-cost-ph" :style="{ color: MATERIAL_COLOR[mat.id] }">
          {{ MATERIAL_PLACEHOLDER_LABELS[mat.id] ?? mat.name.slice(0, 2).toUpperCase() }}
        </span>
        <span class="fc-cost-qty"
          >{{ mat.have }}<span class="fc-cost-need">/{{ mat.need }}</span></span
        >
        <span class="fc-cost-state" aria-hidden="true">{{ mat.ok ? '✓' : '✕' }}</span>
      </span>
    </component>
  </component>
</template>

<script setup lang="ts">
/**
 * Der Kostenblock aller vier Reiter der Forge-Spalte.
 *
 * Er stand wörtlich gleich bei den Relikten, den Konstellationen und im
 * Handel — mit der Upgrade-Liste wäre er zum vierten Mal abgeschrieben worden.
 * Die Optik liegt als `.fc-cost*` global in `rpg-theme.css`, weil auch der
 * Handel einzelne Paare AUSSERHALB dieser Zeile zeigt („You get" / „You pay");
 * hier steht nur, wie aus einer Kostenliste ein Block wird.
 *
 * Gezeigt wird immer „habe / brauche" — ein blankes „×3" beantwortet die Frage
 * nicht, die der Spieler vor dem Kauf wirklich hat. Das ✓/✕ daneben ist die
 * Zweitkodierung zur roten Zahl: Farbe allein trägt die Aussage nicht.
 */
import { computed } from 'vue'
import { formatNumber } from '@/config/ui/numberFormat'
import {
  FORGE_CHIME_IMAGE,
  FORGE_COST_LABEL,
  MATERIAL_COLOR,
  MATERIAL_PLACEHOLDER_LABELS,
} from '@/config/constants'
import type { ForgeCostItem } from '@/types'

const props = withDefaults(
  defineProps<{
    /** Chime-Preis. 0 lässt das Paar ganz weg — kostenlos ist keine Kostenzeile. */
    gold: number
    goldOk: boolean
    materials?: ForgeCostItem[]
    /** Größere Schrift für den einen Preis, der eine Karte allein trägt. */
    big?: boolean
    /** Überschrift und Rahmen. Aus, wo schon eine Beschriftung davorsteht (Handel). */
    label?: boolean
    /**
     * `<span>` statt `<div>` für beide Rahmen. Pflicht, wo der Block INNERHALB
     * eines `<button>` steht (Kaufleiste der Upgrade-Kachel) — ein `<div>` ist
     * dort kein gültiger Inhalt. Die Optik ändert sich nicht: `.fc-cost` und
     * `.fc-cost-row` sind ohnehin `display: flex`.
     */
    inline?: boolean
    /**
     * Jede Position als umrandeter Chip statt als freistehendes Paar. Gedacht
     * für dunkle Träger, auf denen die nackten Paare zerfließen — dort trägt
     * der Rahmen die Gruppierung, die sonst der Abstand allein leistet.
     */
    chips?: boolean
  }>(),
  { materials: () => [], big: false, label: true, inline: false, chips: false },
)

const wrapperTag = computed(() => (props.inline ? 'span' : 'div'))

/** Fehlt irgendetwas, kippt die ganze Kante auf Rot — nicht nur die eine Zahl. */
const short = computed(
  () => (props.gold > 0 && !props.goldOk) || props.materials.some((mat) => !mat.ok),
)
</script>
