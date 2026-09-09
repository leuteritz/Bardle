<script setup lang="ts">
import type { PlanetStatRow } from '@/utils/orbit/planetStatus'

defineProps<{
  rows: PlanetStatRow[]
  /** Level-Up wird gerade gehovert: alle beweglichen Kacheln zeigen ihr Ziel. */
  preview: boolean
}>()
</script>

<template>
  <!-- Instrumentenreihe unter dem HP-Balken, in dessen Breite: eine Leiste mit
       Trennlinien, keine sechs Einzelkästen — sie liest sich als Fortsetzung
       desselben Geräts. -->
  <div class="psb" aria-hidden="true">
    <div
      v-for="row in rows"
      :key="row.key"
      class="psb-cell"
      :class="{ 'psb-cell--preview': preview && !!row.preview }"
    >
      <span class="psb-figure">
        <span class="psb-value">{{ preview && row.preview ? row.preview : row.value }}</span>
        <span v-if="row.suffix" class="psb-suffix">{{ row.suffix }}</span>
      </span>
      <span class="psb-label">{{ row.label }}</span>
      <span v-if="row.atCap" class="psb-cap">MAX</span>
      <span v-if="row.bar !== undefined" class="psb-bar">
        <span class="psb-bar-fill" :style="{ width: row.bar * 100 + '%' }" />
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Breite und Radius spiegeln `.ps-planet-hp` — das ist der ganze Punkt der
   Gestalt: der Balken oben und die Reihe darunter sind EIN Instrument. */
.psb {
  width: 100%;
  max-width: 560px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  background: #14100a;
  border: 2px solid #0e0c08;
  border-radius: 5px;
  overflow: hidden;
}

.psb-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: 7px 4px 8px;
}

.psb-cell + .psb-cell {
  border-left: 1px solid #2c2110;
}

.psb-figure {
  display: flex;
  align-items: baseline;
  gap: 1px;
  max-width: 100%;
}

.psb-value {
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.01em;
  color: var(--rc, #e8c040);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px color-mix(in srgb, var(--rc, #e8c040) 40%, transparent);
}

.psb-suffix {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  color: color-mix(in srgb, var(--rc, #e8c040) 62%, #6f6247);
}

.psb-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #9c8a5c;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.psb-cap {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 0.48rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #e8c040;
  background: #2a2008;
  border: 1px solid #5c4410;
  border-radius: 4px;
  padding: 0 2px;
}

.psb-bar {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 3px;
  height: 3px;
  background: #241a10;
  border-radius: 4px;
  overflow: hidden;
}

.psb-bar-fill {
  display: block;
  height: 100%;
  background: var(--rc, #e8c040);
  border-radius: 4px;
}

/* Vorschau: derselbe Bestätigungston wie Effekt-Pille und HP-Balken. */
.psb-cell--preview .psb-value {
  color: #5ce66a;
  text-shadow: 0 0 10px rgba(92, 230, 106, 0.45);
}
.psb-cell--preview .psb-suffix {
  color: #7fbe86;
}
.psb-cell--preview .psb-label {
  color: #7fbe86;
}

@media (max-height: 1100px) {
  .psb-cell {
    padding: 5px 3px 6px;
  }
  .psb-value {
    font-size: 1.25rem;
  }
  .psb-label {
    font-size: 0.62rem;
  }
}
</style>
