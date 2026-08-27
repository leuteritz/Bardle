<script setup lang="ts">
/**
 * Caretaker's Gate im Hover — dieselbe Gestalt wie der Markentooltip, aber ein
 * eigener Inhalt: das Tor ist keine Mission, es zählt nur, wer draußen ist.
 *
 * Die Gestalt liegt in `ExpeditionMarkTooltip`; hier steht nur, was das Tor zu
 * sagen hat.
 */
import { computed } from 'vue'
import ExpeditionMarkTooltip, { type MarkReading } from './ExpeditionMarkTooltip.vue'
import { formatMinuteClock } from '@/utils/ui/format'

const props = defineProps<{
  destination: string
  now: number
  crewsOut: number
  waiting: number
  nextReturnAt: number | null
  arriving: boolean
}>()

const state = computed(() => {
  if (props.arriving) return 'Coming home'
  if (props.waiting > 0) return 'Crews at berth'
  return props.crewsOut > 0 ? 'Watching the road' : 'Gate open'
})

const nextHome = computed(() =>
  props.nextReturnAt === null
    ? '—'
    : formatMinuteClock(Math.max(0, props.nextReturnAt - props.now)),
)

const readings = computed<MarkReading[]>(() => [
  { value: nextHome.value, label: 'Next home', tone: props.arriving ? 'is-good' : '' },
  { value: `${props.crewsOut}`, label: 'In field', tone: '' },
  {
    value: `${props.waiting}`,
    label: 'At berth',
    tone: props.waiting > 0 ? 'is-good' : 'is-dim',
  },
])
</script>

<template>
  <ExpeditionMarkTooltip
    icon="game-icons:portal"
    name="Caretaker's Gate"
    :state="state"
    :context="destination"
    :readings="readings"
  >
    <template #foot>
      <span class="gtt-line">Every route of this galaxy departs and returns here.</span>
    </template>
  </ExpeditionMarkTooltip>
</template>

<style scoped>
.gtt-line {
  font-size: 12.5px;
  line-height: 1.3;
  color: rgba(230, 220, 196, 0.58);
}
</style>
