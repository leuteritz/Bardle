<template>
  <div class="fc-cost-row">
    <span v-if="gold > 0" class="fc-cost-pair" :class="{ 'fc-cost-pair--missing': !goldOk }">
      <img :src="FORGE_CHIME_IMAGE" class="fc-cost-img" :class="{ 'fc-cost-img--big': big }" alt="Chimes" />
      <span class="fc-cost-gold" :class="{ 'fc-cost-gold--big': big }">{{ formatNumber(gold) }}</span>
    </span>
    <span
      v-for="mat in materials"
      :key="mat.id"
      class="fc-cost-pair"
      :class="{ 'fc-cost-pair--missing': !mat.ok }"
      :title="mat.name"
    >
      <img v-if="mat.image" :src="mat.image" class="fc-cost-img" :alt="mat.name" />
      <span class="fc-cost-qty">{{ mat.have }}<span class="fc-cost-need">/{{ mat.need }}</span></span>
    </span>
  </div>
</template>

<script setup lang="ts">
/**
 * Die Kostenzeile aller vier Reiter der Forge-Spalte.
 *
 * Sie stand wörtlich gleich bei den Relikten, den Konstellationen und im
 * Handel — mit der Upgrade-Liste wäre sie zum vierten Mal abgeschrieben worden.
 * Die Optik liegt als `.fc-cost-*` global in `rpg-theme.css`, weil auch der
 * Handel einzelne Paare AUSSERHALB dieser Zeile zeigt („You get" / „You pay");
 * hier steht nur, wie aus einer Kostenliste eine Zeile wird.
 *
 * Gezeigt wird immer „habe / brauche" — ein blankes „×3" beantwortet die Frage
 * nicht, die der Spieler vor dem Kauf wirklich hat.
 */
import { formatNumber } from '@/config/ui/numberFormat'
import { FORGE_CHIME_IMAGE } from '@/config/constants'
import type { ForgeCostItem } from '@/types'

withDefaults(
  defineProps<{
    /** Chime-Preis. 0 lässt das Paar ganz weg — kostenlos ist keine Kostenzeile. */
    gold: number
    goldOk: boolean
    materials?: ForgeCostItem[]
    /** Größere Schrift für den einen Preis, der eine Karte allein trägt. */
    big?: boolean
  }>(),
  { materials: () => [], big: false },
)
</script>
