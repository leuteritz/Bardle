<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const props = withDefaults(
  defineProps<{
    title: string
    icon: string
    defaultOpen?: boolean
    /** false → statische Karte ohne Einklapp-Funktion (Dashboard-Modus) */
    collapsible?: boolean
    /** true → Panel füllt die volle Höhe des Eltern-Containers */
    fill?: boolean
  }>(),
  { defaultOpen: true, collapsible: true, fill: false },
)

const collapsed = ref(false)

function toggle() {
  if (!props.collapsible) return
  collapsed.value = !collapsed.value
}

// Height-animated collapse (same pattern as the Champion Shop tier accordion):
// animate height 0 ↔ scrollHeight, then clear inline styles when fully open.
function onEnter(el: Element) {
  const node = el as HTMLElement
  node.style.height = '0'
  node.style.overflow = 'hidden'
  void node.offsetHeight // force reflow so the start height applies
  node.style.height = `${node.scrollHeight}px`
}
function onAfterEnter(el: Element) {
  const node = el as HTMLElement
  node.style.height = ''
  node.style.overflow = ''
}
function onLeave(el: Element) {
  const node = el as HTMLElement
  node.style.height = `${node.scrollHeight}px`
  node.style.overflow = 'hidden'
  void node.offsetHeight
  node.style.height = '0'
}
</script>

<template>
  <div class="ac-panel" :class="{ 'ac-panel--fill': fill }">
    <div
      class="ac-header"
      :class="{ 'is-collapsed': collapsed, 'ac-header--static': !collapsible }"
      :role="collapsible ? 'button' : undefined"
      :tabindex="collapsible ? 0 : undefined"
      :aria-expanded="collapsible ? !collapsed : undefined"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <Icon :icon="icon" width="18" height="18" class="ac-header-icon" />
      <span class="ac-header-title">{{ title }}</span>
      <span class="ac-header-meta"><slot name="meta" /></span>
      <span v-if="collapsible" class="ac-header-chevron">▾</span>
    </div>

    <Transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
      <div v-show="!collapsed" class="ac-body-outer">
        <div class="ac-body">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ac-panel {
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  background: var(--rpg-bg-dark);
  overflow: hidden;
}

.ac-panel--fill {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.ac-panel--fill .ac-body-outer {
  flex: 1;
  min-height: 0;
}
.ac-panel--fill .ac-body {
  height: 100%;
}

/* ── Header strip (clickable) ──────────────────────────────────────────────── */

.ac-header {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 12px;
  background: var(--rpg-bg-header);
  border-bottom: 2px solid var(--rpg-wood-mid);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.ac-header:hover {
  background: #25160a;
}

.ac-header--static {
  cursor: default;
}
.ac-header--static:hover {
  background: var(--rpg-bg-header);
}

.ac-header:focus-visible {
  outline: 1px solid var(--rpg-gold-dim);
  outline-offset: -2px;
}

.ac-header-icon {
  flex-shrink: 0;
  color: var(--rpg-gold-dim);
}

.ac-header:hover .ac-header-icon {
  color: var(--rpg-gold);
}

.ac-header-title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-gold);
}

.ac-header-meta {
  margin-left: auto;
  font-size: 0.68rem;
  font-weight: 400;
  color: var(--rpg-text-dim);
  white-space: nowrap;
}

.ac-header-chevron {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
  font-size: 11px;
  line-height: 1;
  color: var(--rpg-gold-dim);
  transition: transform 0.2s ease;
}

/* meta absent → chevron should still sit hard-right */
.ac-header-meta:empty {
  margin-left: auto;
}

.ac-header.is-collapsed .ac-header-chevron {
  transform: rotate(-90deg);
}

/* ── Body (height-animated) ────────────────────────────────────────────────── */

.ac-body-outer {
  transition: height 0.28s ease;
}

.ac-body {
  padding: 10px 12px 12px;
}

@media (prefers-reduced-motion: reduce) {
  .ac-body-outer {
    transition: none;
  }
}
</style>
