<script setup lang="ts">
import { computed } from 'vue'
import {
  PLANET_TAB_RAIL_CLOSE_TITLE,
  PLANET_TAB_RAIL_HANDLE_PX,
  PLANET_TAB_RAIL_LABEL,
  PLANET_TAB_RAIL_OPEN_TITLE,
} from '@/config/constants'

const props = defineProps<{ active: number; total: number; open: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const toggleTitle = computed(() =>
  props.open ? PLANET_TAB_RAIL_CLOSE_TITLE : PLANET_TAB_RAIL_OPEN_TITLE,
)
const tipText = computed(
  () => `${toggleTitle.value} — ${props.active} of ${props.total} orbit slots active`,
)
const handleWidth = `${PLANET_TAB_RAIL_HANDLE_PX}px`
</script>

<template>
  <button
    class="prh"
    :class="{ 'prh--open': open }"
    :aria-expanded="open"
    :aria-label="tipText"
    v-tip="tipText"
    type="button"
    @click="emit('toggle')"
  >
    <span class="prh-word">
      {{ PLANET_TAB_RAIL_LABEL }}
      <span class="prh-total">{{ active }}</span>
    </span>
  </button>
</template>

<style scoped>
.prh {
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 2;
  width: v-bind(handleWidth);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 6px 12px 4px;
  border: none;
  border-left: 2px solid #5c3310;
  background: #14100c;
  color: #c89040;
  cursor: pointer;
}

.prh:hover {
  background: #1a140d;
}

.prh::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: linear-gradient(to bottom, #5c3310, #c89040, #e8c060, #c89040, #5c3310);
  opacity: 0.4;
  transition: opacity 0.18s ease;
  pointer-events: none;
}

.prh:hover::after,
.prh--open::after {
  opacity: 1;
}

.prh-word {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  color: #c89040;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.28em;
  white-space: nowrap;
}

.prh:hover .prh-word,
.prh--open .prh-word {
  color: #e8c040;
}

.prh-total {
  color: rgba(200, 144, 64, 0.5);
  letter-spacing: 0.1em;
}

.prh:hover .prh-total,
.prh--open .prh-total {
  color: rgba(232, 192, 64, 0.62);
}

@media (prefers-reduced-motion: reduce) {
  .prh::after {
    transition: none;
  }
}
</style>
