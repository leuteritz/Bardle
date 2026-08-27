<script setup lang="ts">
/**
 * Die Hover-Fläche über einer Sternmarke — befreit wie verloren.
 *
 * Wie beim Ort: sie malt NICHTS, der Ring und die massive Hülle kommen aus dem
 * Canvas. Sie trägt allein die Auskunft, und die gab es bis hierher gar nicht —
 * ein Stern war auf der Karte ausschliesslich `'rescued' | 'failed'` plus seine
 * Nummer. Die Legende sagt WAS die Form bedeutet, nicht WELCHER Stern hier
 * stand und was aus ihm wurde.
 *
 * Der NAME ist abgeleitet (`utils/game/starNames.ts`) und hängt NICHT am
 * Ausgang — ein Stern steht auf der Karte, bevor er befreit oder verloren ist.
 */
import { computed } from 'vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import ExpeditionMarkTooltip, { type MarkChip } from './ExpeditionMarkTooltip.vue'
import {
  LANDMARK_FREED_CORE,
  VOYAGE_TIP_GAP_PX,
  VOYAGE_TIP_OPEN_DELAY_MS,
  VOYAGE_TIP_WIDTH,
} from '@/config/constants'
import type { GalaxyStarMark } from '@/utils/game/starNames'

const props = defineProps<{
  mark: GalaxyStarMark
  /** Sternsoll dieser Galaxie — die dritte Ablesung misst dagegen. */
  required: number
  /** Wie viele Sterne bis einschliesslich diesem befreit waren. */
  freedSoFar: number
  left: number
  top: number
  hit: number
}>()

const lost = computed(() => props.mark.outcome === 'failed')

/* Dieselben zwei Farben, die das Datenband unter der Karte führt — es ist die
   Legende zur Marke, und zwei Töne für dieselbe Sache wären einer zuviel. */
const LOST_TONE = '#e08a7a'

/** 1st, 2nd, 3rd, 4th … — die Nummer ist alles, was ein Stern an Ordnung hat. */
const ordinal = computed(() => {
  const n = props.mark.index + 1
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
})

const chips = computed<MarkChip[]>(() => [
  {
    text: lost.value ? 'Lost' : 'Freed',
    color: lost.value ? LOST_TONE : LANDMARK_FREED_CORE,
    solid: true,
  },
  { text: `${ordinal.value} star` },
  { text: `${props.freedSoFar} of ${props.required} charted` },
])
</script>

<template>
  <RpgBadgeTooltip
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
    :accent="lost ? LOST_TONE : LANDMARK_FREED_CORE"
  >
    <template #default>
      <span
        class="stn"
        :style="{ left: `${left}%`, top: `${top}%`, '--stn-hit': `${hit}px` }"
        :aria-label="`${mark.name} — star ${lost ? 'lost' : 'freed'}, attempt ${mark.index + 1}`"
      />
    </template>
    <template #tip>
      <ExpeditionMarkTooltip
        :icon="lost ? 'game-icons:falling-star' : 'game-icons:star-satellites'"
        :accent="lost ? LOST_TONE : LANDMARK_FREED_CORE"
        :name="mark.name"
        :state="lost ? 'Star lost' : 'Star freed'"
        :chips="chips"
      />
    </template>
  </RpgBadgeTooltip>
</template>

<style scoped>
.stn {
  position: absolute;
  width: var(--stn-hit);
  height: var(--stn-hit);
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
</style>
