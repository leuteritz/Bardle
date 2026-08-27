<script setup lang="ts">
/**
 * Caretaker's Gate im Hover — dieselbe Gestalt wie der Markentooltip, aber ein
 * eigener Inhalt: das Tor ist keine Mission, es zählt nur, wer draußen ist.
 *
 * Die Gestalt liegt in `ExpeditionMarkTooltip`; hier steht nur, was das Tor zu
 * sagen hat.
 */
import { computed } from 'vue'
import ExpeditionMarkTooltip, { type MarkChip } from './ExpeditionMarkTooltip.vue'
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

const chips = computed<MarkChip[]>(() => [
  { text: state.value, color: props.arriving ? '#64dcb4' : '#e8c040', solid: true },
  // `numeric` nur, wenn wirklich etwas tickt: ein Gedankenstrich braucht die
  // reservierte Breite nicht und saehe darin verloren aus.
  { text: `Home ${nextHome.value}`, numeric: props.nextReturnAt !== null },
  { text: `${props.crewsOut} in field` },
  { text: `${props.waiting} at berth`, color: props.waiting > 0 ? '#64dcb4' : '#7a6f58' },
])
</script>

<template>
  <ExpeditionMarkTooltip
    icon="game-icons:portal"
    name="Caretaker's Gate"
    :state="destination"
    :chips="chips"
  />
</template>
