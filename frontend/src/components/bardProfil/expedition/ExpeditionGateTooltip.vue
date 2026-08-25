<script setup lang="ts">
/**
 * Caretaker's Gate im Hover — dieselbe Gestalt wie der Markentooltip, aber ein
 * eigener Inhalt: das Tor ist keine Mission, es zählt nur, wer draußen ist.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
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

const readings = computed(() => [
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
  <div class="vtt">
    <span class="vtt-gold" aria-hidden="true" />

    <header class="vtt-head">
      <span class="vtt-glyph">
        <Icon icon="game-icons:portal" width="24" height="24" />
      </span>
      <span class="vtt-headtext">
        <span class="vtt-state">
          {{ state }}
          <i class="vtt-dot">·</i>
          {{ destination }}
        </span>
        <span class="vtt-name">Caretaker's Gate</span>
      </span>
    </header>

    <div class="vtt-readings">
      <span v-for="r in readings" :key="r.label" class="vtt-read">
        <b class="vtt-value" :class="r.tone">{{ r.value }}</b>
        <i class="vtt-label">{{ r.label }}</i>
      </span>
    </div>

    <div class="vtt-foot">
      <span class="vtt-line">Every route of this galaxy departs and returns here.</span>
    </div>
  </div>
</template>

<style scoped>
.vtt {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #16140e;
  border-radius: 2px;
  overflow: hidden;
}

.vtt-gold {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

.vtt-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 9px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  border-left: 3px solid #e8c040;
}
.vtt-glyph {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 4px;
  color: #e8c040;
}
.vtt-headtext {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.vtt-state {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.72);
}
.vtt-dot {
  font-style: normal;
  color: rgba(200, 144, 64, 0.4);
}
.vtt-name {
  font-size: 19px;
  line-height: 1.14;
  letter-spacing: 0.02em;
  color: #e8c040;
}

.vtt-readings {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 11px 8px 10px;
  background: #1a1008;
  border-bottom: 1px solid rgba(200, 164, 90, 0.16);
}
.vtt-read {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  text-align: center;
}
.vtt-read + .vtt-read {
  border-left: 1px solid rgba(200, 164, 90, 0.14);
}
.vtt-value {
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}
.vtt-value.is-good {
  color: #64dcb4;
}
.vtt-value.is-dim {
  color: rgba(230, 220, 196, 0.4);
}
.vtt-label {
  font-size: 9.5px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
}

.vtt-foot {
  padding: 9px 12px 10px;
}
.vtt-line {
  font-size: 12.5px;
  line-height: 1.3;
  color: rgba(230, 220, 196, 0.58);
}
</style>
