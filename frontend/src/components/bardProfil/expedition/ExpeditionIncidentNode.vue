<script setup lang="ts">
/**
 * Die Hover-Fläche über einer Ereignismarke der Galaxiekarte.
 *
 * Sie malt NICHTS — der Zug kommt aus dem Canvas. Dieselbe Trennung wie beim
 * Ort und beim Caretaker's Gate: das Canvas trägt die FORM, das DOM den
 * ZUSTAND. Ohne sie sagt die Karte nicht, WELCHES Wesen durchkam und was es
 * gekostet hat.
 */
import { computed } from 'vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import ExpeditionMarkTooltip, { type MarkChip } from './ExpeditionMarkTooltip.vue'
import { getVoidRift } from '@/config/world/void'
import { getDrifter } from '@/config/world/drifters'
import { VOYAGE_TIP_GAP_PX, VOYAGE_TIP_OPEN_DELAY_MS, VOYAGE_TIP_WIDTH } from '@/config/constants'
import type { GalaxyIncidentKind } from '@/types'

const props = defineProps<{
  kind: GalaxyIncidentKind
  defId: string
  /** Nur beim Einschlag gesetzt. */
  hp?: number
  meeps?: number
  left: number
  top: number
  /** Kantenlänge der Fangfläche in px — sie folgt dem gemalten Zug. */
  hit: number
}>()

const isVoid = computed(() => props.kind === 'void-impact')
const rift = computed(() => (isVoid.value ? getVoidRift(props.defId) : undefined))
const drifter = computed(() => (isVoid.value ? undefined : getDrifter(props.defId)))
const def = computed(() => rift.value ?? drifter.value)

/* Der gefüllte Chip trägt den Ausgang — er wird zuerst gelesen. Beim Einschlag
   ist das die Schwere, beim Drifter, ob er gefangen wurde. */
const chips = computed<MarkChip[]>(() => {
  if (rift.value) {
    const out: MarkChip[] = [
      { text: rift.value.severity.toUpperCase(), color: '#cc6050', solid: true },
    ]
    if (props.hp) out.push({ text: `-${Math.round(props.hp)} HP` })
    if (props.meeps) out.push({ text: `-${Math.round(props.meeps)} meeps` })
    return out
  }
  if (!drifter.value) return []
  const caught = props.kind === 'drifter-caught'
  return [
    { text: caught ? 'Caught' : 'Missed', color: caught ? '#64dcb4' : '#7a6f58', solid: true },
    { text: drifter.value.rarity.toUpperCase() },
  ]
})

const label = computed(() => (isVoid.value ? 'Void impact' : 'Drifter'))
</script>

<template>
  <RpgBadgeTooltip
    v-if="def"
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
    :accent="isVoid ? '#cc6050' : '#e8c040'"
  >
    <template #default>
      <span
        class="ein"
        :style="{ left: `${left}%`, top: `${top}%`, '--ein-hit': `${hit}px` }"
        :aria-label="`${def.name} — ${label}`"
      />
    </template>
    <template #tip>
      <ExpeditionMarkTooltip
        :icon="def.icon"
        :name="def.name"
        :state="label"
        :accent="isVoid ? '#cc6050' : '#e8c040'"
        :chips="chips"
      />
    </template>
  </RpgBadgeTooltip>
</template>

<style scoped>
/* Nur Fangfläche, kein Aussehen — ein eigener Rahmen wäre eine zweite Marke
   über der gemalten. */
.ein {
  position: absolute;
  width: var(--ein-hit);
  height: var(--ein-hit);
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
</style>
