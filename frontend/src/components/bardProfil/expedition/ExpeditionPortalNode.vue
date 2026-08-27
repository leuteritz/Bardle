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
import ExpeditionMarkTooltip, { type MarkReading } from './ExpeditionMarkTooltip.vue'
import {
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

const readings = computed<MarkReading[]>(() => [
  { value: `${legs.value}`, label: 'Legs flown' },
  { value: `${props.freed}`, label: 'Freed', tone: 'is-good' },
  { value: `${props.lost}`, label: 'Lost', tone: props.lost > 0 ? 'is-poor' : 'is-dim' },
])
</script>

<template>
  <RpgBadgeTooltip
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
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
        :context="destination"
        :readings="readings"
      >
        <template #foot>
          <span class="ptn-line">Bard stepped into this galaxy here, and walked the rest.</span>
        </template>
      </ExpeditionMarkTooltip>
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

.ptn-line {
  font-size: 12.5px;
  line-height: 1.3;
  color: rgba(230, 220, 196, 0.58);
}
</style>
