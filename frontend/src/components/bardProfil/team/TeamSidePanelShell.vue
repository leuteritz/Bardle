<script setup lang="ts">
/**
 * The frame every board destination opens into — shop, expeditions, equipment.
 *
 * These three used to be modals over the whole tab. A modal answers a question
 * by hiding the thing the question is about: the shop covered the very sigil the
 * player is recruiting for. The details page had already moved to a rail on the
 * right edge, so this shell is that rail, generalised — same goldline, same
 * header stripe, same left border, so a destination opening does not look like a
 * different kind of surface than the role page opening.
 *
 * The shell owns the chrome only. Everything inside is the destination's own
 * component, unchanged, filling the body.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = withDefaults(
  defineProps<{
    title: string
    icon: string
    subtitle?: string
    /** Rail width in px — see TEAM_*_PANEL_WIDTH. */
    width: number
  }>(),
  { subtitle: '' },
)

const emit = defineEmits<{ close: [] }>()

const widthPx = computed(() => `${props.width}px`)
</script>

<template>
  <section class="tsps-panel">
    <div class="tsps-goldline" />
    <header class="tsps-head">
      <Icon :icon="icon" width="20" height="20" class="tsps-head-icon" />
      <div class="tsps-head-text">
        <span class="tsps-head-title">{{ title }}</span>
        <span v-if="subtitle" class="tsps-head-sub">{{ subtitle }}</span>
      </div>
      <!-- destination-specific controls sit left of the close button -->
      <slot name="actions" />
      <button class="tsps-close" :aria-label="`Close ${title}`" @click="emit('close')">✕</button>
    </header>
    <div class="tsps-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.tsps-panel {
  /* fixed-px content designed for 1920×1080 — zoom down on smaller desktops */
  zoom: var(--team-ui-scale, 1);
  width: v-bind(widthPx);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #1a1008, #0d0905);
  border-left: 2px solid #5c3310;
}
.tsps-goldline {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}
.tsps-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  flex-shrink: 0;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}
.tsps-head-icon {
  color: #e8c040;
  flex-shrink: 0;
}
.tsps-head-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tsps-head-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8c040;
  line-height: 1.1;
}
.tsps-head-sub {
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: rgba(200, 144, 64, 0.6);
  line-height: 1.1;
}
.tsps-close {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 4px;
  background: rgba(14, 10, 4, 0.85);
  border: 1px solid #5c3310;
  color: #c89040;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}
.tsps-close:hover {
  color: #ffdddd;
  border-color: #cc6050;
  background: rgba(60, 20, 14, 0.7);
}
.tsps-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* the layer a destination's overlay (e.g. the shop's detail) anchors to */
  position: relative;
}
</style>
