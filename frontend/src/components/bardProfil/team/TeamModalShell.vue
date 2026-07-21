<script setup lang="ts">
import { Icon } from '@iconify/vue'

withDefaults(
  defineProps<{
    title: string
    icon: string
    subtitle?: string
    size?: 'md' | 'lg' | 'xl'
    /** Hides the title header — content owns the top area, close floats top-right. */
    hideHeader?: boolean
  }>(),
  { subtitle: '', size: 'lg', hideHeader: false },
)

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="tms-backdrop" @click.self="emit('close')">
    <div class="tms-panel" :class="`tms-panel--${size}`">
      <div class="tms-gold-line" />
      <button
        v-if="hideHeader"
        class="tms-close tms-close--floating"
        aria-label="Close"
        @click="emit('close')"
      >
        ✕
      </button>
      <div v-if="!hideHeader" class="tms-header">
        <Icon :icon="icon" width="22" height="22" class="tms-header-icon" />
        <div class="tms-header-text">
          <div class="tms-title">{{ title }}</div>
          <div v-if="subtitle" class="tms-subtitle">{{ subtitle }}</div>
        </div>
        <button class="tms-close" aria-label="Close" @click="emit('close')">✕</button>
      </div>
      <div class="tms-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tms-backdrop {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(4, 3, 2, 0.74);
}
.tms-panel {
  /* fixed-px content designed for 1920×1080 — zoom down on smaller desktops
     (zoom, unlike transform, participates in layout) */
  zoom: var(--team-ui-scale, 1);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 12px 48px rgba(0, 0, 0, 0.85);
  border-radius: 4px;
}
.tms-panel--md {
  width: min(560px, 94%);
  height: min(700px, 92%);
}
.tms-panel--lg {
  width: min(920px, 96%);
  height: min(760px, 94%);
}
/* Full-height variant: fills the tab up to the backdrop padding, so the modal
   keeps the same 20px gap above and below and never overlaps the app header. */
.tms-panel--xl {
  width: min(1340px, 96%);
  height: 100%;
}
.tms-gold-line {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
}
.tms-header {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 14px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  flex-shrink: 0;
}
.tms-header-icon {
  color: #e8c040;
  flex-shrink: 0;
}
.tms-header-text {
  flex: 1;
  min-width: 0;
}
.tms-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #eccf82;
  line-height: 1.1;
}
.tms-subtitle {
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: rgba(200, 144, 64, 0.6);
  margin-top: 2px;
}
.tms-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  background: rgba(30, 16, 16, 0.6);
  border: 1px solid rgba(180, 70, 50, 0.4);
  color: #d8a090;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.tms-close:hover {
  background: rgba(120, 30, 20, 0.6);
  color: #fff;
}
.tms-close--floating {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 5;
}
.tms-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
