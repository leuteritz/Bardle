<script setup lang="ts">
/**
 * Das Abflugportal: wohin der Weg von hier aus weiterging.
 *
 * Die Gestalt kommt vollstaendig aus den `.tip-*`-Bausteinen — Flaeche, Rahmen
 * und Akzentleiste bringt `RpgBadgeTooltip` mit. Hier steht nur, was DIESE
 * Karte vom Rest unterscheidet.
 */
import { computed } from 'vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { formatCompactDuration, universeLabel } from '@/utils/ui/format'
import { MS_PER_SECOND } from '@/config/constants'
import type { FirmamentDeparture } from '@/utils/ui/firmamentLayout'

const props = defineProps<{ departure: FirmamentDeparture; tint: string }>()

/** Chronikstempel — als Datum gelesen, nie gegen eine Frist geprueft. */
const day = computed(() => new Date(props.departure.run.completedAt).toLocaleDateString())
</script>

<template>
  <div class="fdt" :style="{ '--tip-color': tint }">
    <header class="tip-head tip-head--banded">
      <span class="tip-name">Departure</span>
      <span class="tip-state">onward</span>
    </header>

    <div class="tip-effect fdt-line">
      The road went on to {{ universeLabel(departure.toUniverse) }}
    </div>

    <div class="tip-read tip-read--lg">
      <span class="tip-read-cell">
        <span class="tip-read-k">Freed here</span>
        <span class="tip-read-v">{{ departure.run.galaxiesFreed }}</span>
      </span>
      <span class="tip-read-cell">
        <span class="tip-read-k">Stars</span>
        <span class="tip-read-v">{{ departure.run.starsRescued }}</span>
      </span>
      <span class="tip-read-cell">
        <span class="tip-read-k">Chimes</span>
        <span class="tip-read-v">{{ formatNumber(departure.run.chimes) }}</span>
      </span>
    </div>

    <div class="tip-hint fdt-foot">
      {{ formatCompactDuration(departure.run.durationSeconds * MS_PER_SECOND) }} · {{ day }}
      <span v-if="departure.visits > 1"> · {{ departure.visits }} visits</span>
      <span v-if="departure.run.providence"> · {{ departure.run.providence }}</span>
    </div>

    <!-- Kein `.tip-act`: die Karte traegt `pointer-events: none`. Die Geste
         sitzt am Portal selbst. -->
    <div class="tip-hint fdt-cta">↗ Click to travel on</div>
  </div>
</template>

<style scoped>
/* Alles in `em` gegen `--tip-u`: das ist die EINE Schriftskala der Sprache. */
.fdt {
  display: flex;
  flex-direction: column;
  gap: 0.72em;
  padding: 0 1.16em 1.05em;
}

.fdt-line {
  line-height: 1.2;
}

.fdt-foot {
  color: #8a8172;
}

.fdt-cta {
  color: var(--tip-color);
}
</style>
