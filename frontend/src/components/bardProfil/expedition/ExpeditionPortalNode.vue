<script setup lang="ts">
/**
 * Die Hover-Fläche über dem Ankunftsportal am Aussenrand.
 *
 * „Arrival", nicht „Departure" — dieselbe Wortwahl wie in der Legende: das
 * Portal ist der Punkt, an dem Bard die Galaxie BETRAT. Aufgebrochen wird seit
 * dem Fall des Kerns am Caretaker's Gate.
 *
 * Genau eine Marke je Karte, also kein Zufall und keine Ableitung — die Zahlen
 * stehen alle schon im Archiv-Datensatz.
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

const props = defineProps<{
  /** Der Galaxiename, den der Spieler kennt. */
  destination: string
  freed: number
  lost: number
  left: number
  top: number
  hit: number
}>()

const legs = computed(() => props.freed + props.lost)

/* Das Ziel ist der gefüllte Chip: es ist das einzige Wort, das diese eine Marke
   von der desselben Portals in einer anderen Galaxie unterscheidet. */
const chips = computed<MarkChip[]>(() => [
  { text: props.destination, solid: true },
  { text: `${legs.value} legs` },
  { text: `${props.freed} freed`, color: LANDMARK_FREED_CORE },
  { text: `${props.lost} lost`, color: props.lost > 0 ? '#e08a7a' : '#7a6f58' },
])
</script>

<template>
  <RpgBadgeTooltip
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
    accent="#e8c040"
  >
    <template #default>
      <span
        class="ptn"
        :style="{ left: `${left}%`, top: `${top}%`, '--ptn-hit': `${hit}px` }"
        :aria-label="`Arrival portal — Bard entered ${destination} here`"
      />
    </template>
    <template #tip>
      <ExpeditionMarkTooltip
        icon="game-icons:portal"
        name="Arrival Portal"
        state="Where it began"
        :chips="chips"
      />
    </template>
  </RpgBadgeTooltip>
</template>

<style scoped>
.ptn {
  position: absolute;
  width: var(--ptn-hit);
  height: var(--ptn-hit);
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
</style>
