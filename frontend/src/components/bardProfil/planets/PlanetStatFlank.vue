<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { PlanetStatSection } from '@/utils/orbit/planetStatus'

defineProps<{
  sections: PlanetStatSection[]
  /** Innenkante zur Sonne hin — dort sitzt der Akzentstreifen. */
  side: 'left' | 'right'
  /** Level-Up wird gerade gehovert: alle beweglichen Zeilen zeigen ihr Ziel. */
  preview: boolean
}>()
</script>

<template>
  <aside class="psf" :class="`psf--${side}`" aria-hidden="true">
    <section v-for="section in sections" :key="section.key" class="psf-section">
      <h4 class="psf-title">{{ section.title }}</h4>
      <div
        v-for="row in section.rows"
        :key="row.key"
        class="psf-row"
        :class="{ 'psf-row--preview': preview && !!row.preview }"
      >
        <span class="psf-glyph">
          <img v-if="row.image" :src="row.image" class="psf-glyph-img" alt="" />
          <Icon v-else :icon="row.icon" width="14" height="14" />
        </span>
        <span class="psf-label">{{ row.label }}</span>
        <span class="psf-value" :style="row.tint ? { '--psf-tint': row.tint } : undefined">
          {{ preview && row.preview ? row.preview : row.value }}
        </span>
        <span v-if="row.atCap" class="psf-cap">MAX</span>
        <span v-if="row.note" class="psf-note">{{ row.note }}</span>
        <span v-if="row.bar !== undefined" class="psf-bar">
          <span class="psf-bar-fill" :style="{ width: row.bar * 100 + '%' }" />
        </span>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.psf {
  --psf-tint: var(--rc, #e8c040);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.psf-section {
  background: #14100a;
  border: 1px solid #4a3418;
  border-radius: 4px;
  padding: 6px 8px 7px;
}

/* Akzent an der Innenkante: die beiden Tafeln lesen sich als Paar, das zum
   Planeten gehört, statt als zwei fremde Kästen am Bildrand. */
.psf--left .psf-section {
  border-right: 2px solid var(--rc, #e8c040);
}
.psf--right .psf-section {
  border-left: 2px solid var(--rc, #e8c040);
}

.psf-title {
  margin: 0 0 5px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a50;
  border-bottom: 1px solid #33260f;
  padding-bottom: 3px;
}

/* Label und Wert teilen sich EINE Zeile — die Tafel muss unterhalb der flachen
   Planetenbahn bleiben, und auf Full HD sind das nur rund 300 px Höhe. */
.psf-row {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 4px;
  row-gap: 1px;
}

.psf-row + .psf-row {
  margin-top: 4px;
}

.psf-glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #9c8a5c;
}

.psf-glyph-img {
  width: 13px;
  height: 13px;
  object-fit: contain;
}

.psf-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9c8a5c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.psf-value {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--psf-tint);
  white-space: nowrap;
  text-align: right;
}

.psf-cap {
  grid-column: 3;
  justify-self: end;
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #e8c040;
  background: #2a2008;
  border: 1px solid #5c4410;
  border-radius: 4px;
  padding: 0 3px;
}

.psf-note {
  grid-column: 2 / -1;
  font-size: 0.56rem;
  color: #6f6247;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}

.psf-bar {
  grid-column: 2 / -1;
  height: 3px;
  background: #241a10;
  border-radius: 4px;
  overflow: hidden;
}

.psf-bar-fill {
  display: block;
  height: 100%;
  background: var(--rc, #e8c040);
  border-radius: 4px;
}

/* Vorschau: derselbe Bestätigungston wie Effekt-Pille und HP-Balken. */
.psf-row--preview .psf-value {
  color: #5ce66a;
}
.psf-row--preview .psf-glyph {
  color: #5ce66a;
}
.psf-row--preview .psf-label {
  color: #7fbe86;
}

/* Flache Viewports: die Note ist der erste Verzicht — sie erklärt, sie zählt
   nicht. Ohne sie passt die Tafel wieder unter die Bahn. */
@media (max-height: 1100px) {
  .psf {
    gap: 6px;
  }
  .psf-section {
    padding: 5px 7px 6px;
  }
  .psf-note {
    display: none;
  }
  .psf-row + .psf-row {
    margin-top: 3px;
  }
  .psf-value {
    font-size: 0.86rem;
  }
}
</style>
