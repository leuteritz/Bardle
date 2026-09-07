<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { JOURNEY_SUBPAGES } from '@/config/constants'
import type { JourneySubpageId } from '@/types'

/** Segment-Leiste der Journey-Unterseiten. */
const page = defineModel<JourneySubpageId>({ required: true })
</script>

<template>
  <nav class="jt-nav" role="tablist" aria-label="Journey pages">
    <button
      v-for="p in JOURNEY_SUBPAGES"
      :key="p.id"
      type="button"
      role="tab"
      class="jt-nav-tab"
      :class="{ 'is-active': page === p.id }"
      :aria-selected="page === p.id"
      @click="page = p.id"
    >
      <Icon :icon="p.icon" width="18" height="18" aria-hidden="true" />
      <span v-ink-center class="jt-nav-lbl">{{ p.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.jt-nav {
  display: flex;
  align-items: stretch;
  gap: 4px;
  flex-shrink: 0;
  padding: 0 12px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.jt-nav-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px 9px;
  color: #8a7a58;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -3px;
  cursor: pointer;
  transition: color 0.15s;
}
.jt-nav-tab:hover {
  color: #d8c890;
}
.jt-nav-tab.is-active {
  color: var(--rpg-gold);
  border-bottom-color: var(--rpg-gold);
}

.jt-nav-lbl {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-height: 1100px) {
  .jt-nav-tab {
    padding: 8px 15px 6px;
  }
  .jt-nav-lbl {
    font-size: 13px;
  }
}
</style>
