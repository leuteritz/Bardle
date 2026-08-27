<script setup lang="ts">
/**
 * Die Hover-Fläche über einer Ortsmarke der Galaxiekarte.
 *
 * Sie malt NICHTS. Die Raute samt Binnenmarke kommt aus dem Canvas
 * (`paintLandfall`) — hier liegt nur ein durchsichtiges Quadrat darüber, das den
 * Zeiger fängt. Dieselbe Trennung wie beim Caretaker's Gate: das Canvas trägt
 * die FORM, das DOM den ZUSTAND.
 *
 * Warum es sie überhaupt gibt: die Legende führt alle Orte als EINE Zeile
 * („Landfall"), weil sechs Silhouetten bei 4,4 px nicht zu trennen wären. Mit
 * einem Ortstyp war das verschmerzbar. Mit sechs sagt die Karte sonst nicht mehr,
 * WELCHER Ort hier lag und ob er geglückt ist.
 */
import { computed } from 'vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import ExpeditionMarkTooltip, { type MarkReading } from './ExpeditionMarkTooltip.vue'
import { getLandfall } from '@/config/world/landfalls'
import {
  LANDFALL_PRESENCE_LABEL,
  VOYAGE_TIP_GAP_PX,
  VOYAGE_TIP_OPEN_DELAY_MS,
  VOYAGE_TIP_WIDTH,
  landfallGestureLabel,
} from '@/config/constants'
import type { LandfallKindId } from '@/types'

const props = defineProps<{
  kind: LandfallKindId
  cleared: boolean
  left: number
  top: number
  /** Kantenlänge der Fangfläche in px — sie folgt der gemalten Marke. */
  hit: number
}>()

const def = getLandfall(props.kind)

/* Seltenheit und Geste stehen NUR hier: am Körper zeigt sich die Präsenz als
   Raum, die Geste als Stand in der HUD-Karte — im Archiv ist beides vorbei. */
const readings = computed<MarkReading[]>(() => [
  {
    value: props.cleared ? 'Made' : 'Missed',
    label: 'Outcome',
    tone: `is-word ${props.cleared ? 'is-good' : 'is-dim'}`,
  },
  {
    value: def ? LANDFALL_PRESENCE_LABEL[def.presence] : '—',
    label: 'Sighted',
    tone: 'is-word',
  },
  {
    value: def ? landfallGestureLabel(def.gesture, def.burst) : '—',
    label: 'Asked of',
    tone: 'is-word',
  },
])
</script>

<template>
  <RpgBadgeTooltip
    v-if="def"
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
  >
    <template #default>
      <span
        class="lfn"
        :style="{ left: `${left}%`, top: `${top}%`, '--lfn-hit': `${hit}px` }"
        :aria-label="`${def.name} — ${cleared ? 'made' : 'missed'}`"
      />
    </template>
    <template #tip>
      <ExpeditionMarkTooltip
        :icon="def.icon"
        :name="def.name"
        state="Landfall"
        :context="cleared ? 'Made' : 'Missed'"
        :readings="readings"
      >
        <template #foot>
          <span class="lfn-blurb">{{ def.blurb }}</span>
        </template>
      </ExpeditionMarkTooltip>
    </template>
  </RpgBadgeTooltip>
</template>

<style scoped>
/* Nur Fangfläche, kein Aussehen. Ein eigener Rahmen wäre eine zweite Marke über
   der gemalten — dieselbe Doppelung, die dem Tor seinen Ring gekostet hat. */
.lfn {
  position: absolute;
  width: var(--lfn-hit);
  height: var(--lfn-hit);
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.lfn-blurb {
  font-size: 12.5px;
  line-height: 1.3;
  color: rgba(230, 220, 196, 0.58);
}
</style>
