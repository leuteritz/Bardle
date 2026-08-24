<script setup lang="ts">
/** Abschnittskopf der Missionskarte: Glyph, Wort, Haarlinie, Ablesung rechts. */
defineProps<{ label: string; readout?: string }>()
</script>

<template>
  <div class="esh">
    <span class="esh-accent" aria-hidden="true">✦</span>
    <span class="esh-title">{{ label }}</span>
    <span class="esh-rule" aria-hidden="true" />
    <span v-if="readout" class="esh-readout">{{ readout }}</span>
  </div>
</template>

<style scoped>
.esh {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  height: 22px;
}
.esh-accent {
  font-size: 11px;
  color: rgba(200, 144, 64, 0.55);
}
.esh-title {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #c8a860;
  white-space: nowrap;
}
.esh-rule {
  flex: 1;
  height: 1px;
  background: rgba(200, 164, 90, 0.16);
}
.esh-readout {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(230, 220, 196, 0.55);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (max-height: 1100px) {
  .esh {
    height: 18px;
  }
  .esh-title {
    font-size: 10.5px;
  }
  .esh-readout {
    font-size: 11.5px;
  }
}
</style>
