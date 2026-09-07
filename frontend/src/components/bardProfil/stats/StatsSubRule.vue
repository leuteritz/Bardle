<script setup lang="ts">
/** Rubrik-Zeile innerhalb eines Journey-Panels: Beschriftung, Linie, optionaler Zähler. */
defineProps<{ label: string; count?: number }>()
</script>

<template>
  <div class="jt-rule">
    <span v-ink-center class="jt-rule-lbl">{{ label }}</span>
    <span class="jt-rule-line" />
    <span v-if="count !== undefined" v-ink-center class="jt-rule-count">{{ count }}</span>
  </div>
</template>

<style scoped>
.jt-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.jt-rule-lbl {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a7a58;
  white-space: nowrap;
}
.jt-rule-line {
  flex: 1;
  height: 1px;
  background: #2c1806;
}
.jt-rule-count {
  font-size: 12px;
  font-weight: 800;
  color: var(--rpg-gold);
}
</style>
