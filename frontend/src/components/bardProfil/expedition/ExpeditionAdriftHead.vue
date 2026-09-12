<script setup lang="ts">
/** Vor Wayfinder-Stufe 2: Bard treibt, das Scrim nennt den Führer — dieselbe Gestalt wie der Kurs-Kopf. */
import { VOYAGE_ADRIFT_HEAD_LABEL, VOYAGE_ADRIFT_HEAD_SUB } from '@/config/constants'
</script>

<template>
  <div class="eah" role="heading" aria-level="3">
    <span class="eah-scrim" aria-hidden="true" />
    <span class="eah-title">{{ VOYAGE_ADRIFT_HEAD_LABEL }}</span>
    <span class="eah-sub">{{ VOYAGE_ADRIFT_HEAD_SUB }}</span>
  </div>
</template>

<style scoped>
.eah {
  position: absolute;
  left: 50%;
  top: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 36px 16px;
  transform: translateX(-50%);
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}
.eah-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(8, 6, 3, 0.9), rgba(8, 6, 3, 0));
  -webkit-mask-image: linear-gradient(to right, transparent, #000 18%, #000 82%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 18%, #000 82%, transparent);
}
.eah-title {
  position: relative;
  font-size: clamp(17px, 1.2vw, 24px);
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(232, 220, 192, 0.85);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}
.eah-sub {
  position: relative;
  font-size: clamp(12px, 0.8vw, 15px);
  letter-spacing: 0.06em;
  color: rgba(232, 220, 192, 0.65);
}
</style>
