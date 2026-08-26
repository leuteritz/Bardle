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
import { Icon } from '@iconify/vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { getLandfall } from '@/config/world/landfalls'
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
</script>

<template>
  <RpgBadgeTooltip v-if="def" prefer="top" passive :open-delay="0">
    <template #default>
      <span
        class="lfn"
        :style="{ left: `${left}%`, top: `${top}%`, '--lfn-hit': `${hit}px` }"
        :aria-label="`${def.name} — ${cleared ? 'made' : 'missed'}`"
      />
    </template>
    <template #tip>
      <div class="lfn-tip">
        <div class="lfn-tip__head">
          <Icon :icon="def.icon" width="15" height="15" class="lfn-tip__ico" />
          <span class="lfn-tip__name">{{ def.name }}</span>
          <span class="lfn-tip__state" :class="{ 'lfn-tip__state--missed': !cleared }">
            {{ cleared ? 'made' : 'missed' }}
          </span>
        </div>
        <span class="lfn-tip__blurb">{{ def.blurb }}</span>
      </div>
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
</style>
