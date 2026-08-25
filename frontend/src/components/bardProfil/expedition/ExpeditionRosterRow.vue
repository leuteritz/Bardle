<script setup lang="ts">
/**
 * Eine Marke als Zeile — dieselbe in der Galaxie-Übersicht und auf dem
 * Fleet-Brett.
 *
 * Die Zeile ist der EINZIGE Ort, der hier die Uhr liest: `VoyageRosterRow` trägt
 * Zeitstempel, kein fertiges Ziffernblatt. Pro Sekunde ändern sich damit zwei
 * Textknoten und ein `transform`, nicht die Liste.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { formatMinuteClock } from '@/utils/ui/format'
import { EXPEDITION_EXPIRY_WARNING_MS } from '@/config/constants'
import type { VoyageRosterRow } from '@/types'

const props = defineProps<{ row: VoyageRosterRow; now: number }>()
const emit = defineEmits<{ select: [string] }>()

const expiresIn = computed(() =>
  props.row.expiresAt === null ? null : props.row.expiresAt - props.now,
)
const remaining = computed(() =>
  props.row.endsAt === null ? null : props.row.endsAt - props.now,
)
const urgent = computed(
  () => expiresIn.value !== null && expiresIn.value < EXPEDITION_EXPIRY_WARNING_MS,
)

const progress = computed(() => {
  const { endsAt, spanMs } = props.row
  if (endsAt === null || spanMs === null) return null
  return Math.min(1, Math.max(0, (props.now - (endsAt - spanMs)) / spanMs))
})

const note = computed(() => {
  const r = props.row
  if (r.state === 'offer') {
    return `${r.seatsFilled}/${r.seatsTotal} crewed · expires ${formatMinuteClock(expiresIn.value ?? 0)}`
  }
  if (r.state === 'field') {
    return `${r.crewCount} crew · ${formatMinuteClock(remaining.value ?? 0)} left · ${r.odds}%`
  }
  return r.state === 'ready'
    ? `${r.crewCount} crew home · claim the spoils`
    : `${r.crewCount} crew home · salvage only`
})

const aria = computed(() => `${props.row.ariaLead}, ${note.value}`)
</script>

<template>
  <button
    class="vrr"
    :class="`vrr--${row.state}`"
    :style="{ '--row-accent': row.accent }"
    :aria-label="aria"
    @click="emit('select', row.pinKey)"
  >
    <span class="vrr-ico">
      <Icon :icon="row.icon" width="20" height="20" />
    </span>
    <span class="vrr-body">
      <span class="vrr-top">
        <span class="vrr-name">{{ row.name }}</span>
        <span class="vrr-chip">
          <Icon :icon="row.chipIcon" width="11" height="11" />
          {{ row.chip }}
        </span>
      </span>
      <span class="vrr-line">
        <span v-if="row.reward !== null" class="vrr-pay">
          <Icon icon="game-icons:windchimes" width="11" height="11" />
          {{ row.rewardPrefix }}{{ $formatNumber(row.reward) }}
        </span>
        <span class="vrr-note" :class="{ 'is-urgent': urgent }">{{ note }}</span>
      </span>
      <span v-if="progress !== null" class="vrr-bar" aria-hidden="true">
        <span class="vrr-fill" :style="{ transform: `scaleX(${progress})` }" />
      </span>
    </span>
    <span class="vrr-go" aria-hidden="true">›</span>
  </button>
</template>

<style scoped>
.vrr {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 6px 6px 7px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  /* Die linke Kante trägt die Farbe der Marke auf der Karte. */
  border-left: 3px solid var(--row-accent, #e8c040);
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.13s,
    border-color 0.13s;
}
.vrr:hover {
  background: #241f14;
}
.vrr:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -2px;
}
.vrr--ready {
  border-left-color: #64dcb4;
}
.vrr--failed {
  border-left-color: #cc6050;
}

.vrr-ico {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #3e200a;
  border-radius: 4px;
  background: #141410;
  color: var(--row-accent, #e8c040);
}
.vrr--ready .vrr-ico {
  color: #a0f0d0;
}
.vrr--failed .vrr-ico {
  color: #cc6050;
}

.vrr-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.vrr-top {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.vrr-name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vrr-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 4px;
  border: 1px solid rgba(200, 144, 64, 0.45);
  border-radius: 3px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.55;
  color: #e8c040;
}
.vrr--field .vrr-chip {
  color: rgba(230, 220, 196, 0.7);
  border-color: rgba(230, 220, 196, 0.28);
}
.vrr--ready .vrr-chip {
  color: #a0f0d0;
  border-color: rgba(100, 220, 180, 0.5);
}
.vrr--failed .vrr-chip {
  color: #cc6050;
  border-color: rgba(204, 96, 80, 0.5);
}

.vrr-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.vrr-pay {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 800;
  color: #e8c040;
}
.vrr--failed .vrr-pay {
  color: rgba(200, 144, 64, 0.55);
}
.vrr-note {
  min-width: 0;
  color: rgba(230, 220, 196, 0.52);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vrr-note.is-urgent {
  color: #cc6050;
  font-weight: 800;
}

/* scaleX statt width — Performance-Regel 10. */
.vrr-bar {
  display: block;
  height: 3px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(200, 164, 90, 0.14);
}
.vrr-fill {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8c060);
  transition: transform 0.35s linear;
}

.vrr-go {
  flex-shrink: 0;
  font-size: 15px;
  line-height: 1;
  color: rgba(200, 144, 64, 0.45);
}
.vrr:hover .vrr-go {
  color: #e8c040;
}
</style>
