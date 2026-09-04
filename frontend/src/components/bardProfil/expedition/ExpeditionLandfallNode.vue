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
import ExpeditionMarkTooltip, { type MarkChip } from './ExpeditionMarkTooltip.vue'
import ExpeditionMarkHalo from './ExpeditionMarkHalo.vue'
import { getLandfall } from '@/config/world/landfalls'
import {
  LANDFALL_PRESENCE_LABEL,
  LANDMARK_LANDFALL_RING,
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
  /** Der GEMALTE Radius (`landfallMarkRadius`), nicht aus `hit` gerechnet. */
  markR: number
  /** Von der Formlegende ausgeleuchtet — sie meint alle sechs Orte auf einmal. */
  lit?: boolean
}>()

const def = getLandfall(props.kind)

/* Seltenheit und Geste stehen NUR hier: am Körper zeigt sich die Präsenz als
   Raum, die Geste als Stand in der HUD-Karte — im Archiv ist beides vorbei.
   Der Ausgang ist der gefüllte Chip: er wird zuerst gelesen. */
const chips = computed<MarkChip[]>(() =>
  def
    ? [
        {
          text: props.cleared ? 'Made' : 'Missed',
          color: props.cleared ? '#64dcb4' : '#7a6f58',
          solid: true,
        },
        { text: LANDFALL_PRESENCE_LABEL[def.presence] },
        { text: landfallGestureLabel(def.gesture, def.burst) },
      ]
    : [],
)
</script>

<template>
  <RpgBadgeTooltip
    v-if="def"
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
    accent="#e8c040"
  >
    <template #default>
      <span
        class="lfn"
        :style="{ left: `${left}%`, top: `${top}%`, '--lfn-hit': `${hit}px` }"
        :aria-label="`${def.name} — ${cleared ? 'made' : 'missed'}`"
      >
        <ExpeditionMarkHalo :mark-r="markR" :ink="LANDMARK_LANDFALL_RING" :on="!!lit" />
      </span>
    </template>
    <template #tip>
      <ExpeditionMarkTooltip
        :icon="def.icon"
        :name="def.name"
        state="Landfall"
        :chips="chips"
      />
    </template>
  </RpgBadgeTooltip>
</template>

<style scoped>
/* Nur Fangfläche, kein Aussehen. Ein DAUERHAFTER Rahmen wäre eine zweite Marke
   über der gemalten — dieselbe Doppelung, die dem Tor seinen Ring gekostet hat.
   Der Halo darin ist kein Widerspruch: er ruht unsichtbar und geht nur auf,
   solange die Legende auf „Landfall" zeigt. */
.lfn {
  position: absolute;
  width: var(--lfn-hit);
  height: var(--lfn-hit);
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
</style>
