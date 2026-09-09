<script setup lang="ts">
import { computed } from 'vue'
import { crestStageFor } from '@/config/champions/championLevels'
import { CHAMPION_CREST_AURA_MS } from '@/config/constants'

const props = defineProps<{
  level: number
  color: string
}>()

const stage = computed(() => crestStageFor(props.level))
const label = computed(() => `Level ${props.level} — ${stage.value.name}`)
const vars = computed<Record<string, string>>(() => ({
  '--frame-color': props.color,
  '--frame-heat': `${Math.round(stage.value.heat * 100)}%`,
  '--frame-breathe': `${CHAMPION_CREST_AURA_MS}ms`,
}))
</script>

<template>
  <span
    v-if="stage.rim > 0"
    class="champion-level-frame"
    :class="{
      'champion-level-frame--blades': stage.blades > 0,
      'champion-level-frame--blade-long': stage.bladeLong,
      'champion-level-frame--crown': stage.crown,
      'champion-level-frame--rays': stage.rays > 0,
      'champion-level-frame--aura': stage.aura,
    }"
    :style="vars"
    :title="label"
    aria-hidden="true"
  >
    <span class="champion-level-frame__inner" />
    <span class="champion-level-frame__corner champion-level-frame__corner--tl" />
    <span class="champion-level-frame__corner champion-level-frame__corner--tr" />
    <span class="champion-level-frame__corner champion-level-frame__corner--bl" />
    <span class="champion-level-frame__corner champion-level-frame__corner--br" />
    <span v-if="stage.blades > 0" class="champion-level-frame__rails" />
    <span v-if="stage.crown" class="champion-level-frame__crown" />
    <span v-if="stage.rays > 0" class="champion-level-frame__rays" />
    <span v-if="stage.aura" class="champion-level-frame__aura" />
    <span v-if="stage.gem" class="champion-level-frame__gem" />
  </span>
</template>

<style scoped>
.champion-level-frame {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, #fff var(--frame-heat), var(--frame-color));
  border-radius: inherit;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--frame-color) 70%, #0a0704),
    0 0 10px color-mix(in srgb, var(--frame-color) 32%, transparent);
  pointer-events: none;
}

.champion-level-frame__inner {
  position: absolute;
  inset: 4px;
  border: 1px solid color-mix(in srgb, var(--frame-color) 58%, #0a0704);
  border-radius: inherit;
  opacity: 0.72;
}

.champion-level-frame__corner {
  position: absolute;
  width: 13px;
  height: 13px;
  border: 2px solid color-mix(in srgb, #fff var(--frame-heat), var(--frame-color));
}

.champion-level-frame__corner--tl {
  top: 4px;
  left: 4px;
  border-right: 0;
  border-bottom: 0;
}

.champion-level-frame__corner--tr {
  top: 4px;
  right: 4px;
  border-left: 0;
  border-bottom: 0;
}

.champion-level-frame__corner--bl {
  bottom: 4px;
  left: 4px;
  border-right: 0;
  border-top: 0;
}

.champion-level-frame__corner--br {
  right: 4px;
  bottom: 4px;
  border-left: 0;
  border-top: 0;
}

.champion-level-frame--blades .champion-level-frame__corner {
  width: 17px;
  height: 17px;
}

.champion-level-frame--blade-long .champion-level-frame__corner {
  border-width: 3px;
}

.champion-level-frame__rails {
  position: absolute;
  inset: 10px 0;
  border-top: 1px solid color-mix(in srgb, var(--frame-color) 68%, #0a0704);
  border-bottom: 1px solid color-mix(in srgb, var(--frame-color) 68%, #0a0704);
  opacity: 0.8;
}

.champion-level-frame--blade-long .champion-level-frame__rails {
  inset: 7px 0;
  border-width: 2px;
}

.champion-level-frame__crown {
  position: absolute;
  top: -1px;
  left: 50%;
  width: 34px;
  height: 14px;
  transform: translateX(-50%);
  background: color-mix(in srgb, #fff var(--frame-heat), var(--frame-color));
  clip-path: polygon(0 100%, 12% 20%, 34% 60%, 50% 0, 66% 60%, 88% 20%, 100% 100%);
}

.champion-level-frame__rays {
  position: absolute;
  inset: 2px;
  border: 1px dashed color-mix(in srgb, var(--frame-color) 82%, #fff);
  opacity: 0.82;
}

.champion-level-frame__aura {
  position: absolute;
  inset: -2px;
  border: 1px solid color-mix(in srgb, var(--frame-color) 86%, #fff);
  box-shadow: 0 0 12px color-mix(in srgb, var(--frame-color) 55%, transparent);
  animation: champion-level-frame-aura var(--frame-breathe) ease-in-out infinite alternate;
}

.champion-level-frame__gem {
  position: absolute;
  top: 5px;
  left: 50%;
  width: 9px;
  height: 9px;
  transform: translateX(-50%) rotate(45deg);
  background: color-mix(in srgb, #fff 70%, var(--frame-color));
  box-shadow: 0 0 8px color-mix(in srgb, var(--frame-color) 75%, transparent);
}

@keyframes champion-level-frame-aura {
  from {
    opacity: 0.36;
  }
  to {
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .champion-level-frame__aura {
    animation: none;
  }
  .champion-level-frame__aura {
    opacity: 0.72;
  }
}
</style>
