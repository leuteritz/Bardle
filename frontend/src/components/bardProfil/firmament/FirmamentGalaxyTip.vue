<script setup lang="ts">
/**
 * Was auf einem Knoten der Bahn liegt, ohne ihn anzuklicken.
 *
 * Die Gestalt kommt vollstaendig aus den `.tip-*`-Bausteinen in
 * `assets/rpg-theme.css` — Flaeche, Rahmen, Schatten und Akzentleiste bringt
 * `RpgBadgeTooltip` mit. Hier steht nur, was DIESE Karte vom Rest unterscheidet.
 * Eine eigene Flaeche oder eine zweite `clamp()`-Skala braeche
 * `tooltipLanguage.spec.ts`, und das ist sein Zweck.
 */
import { computed } from 'vue'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import { tierOf } from '@/stores/world/galaxyStore'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { formatCompactDuration, toRoman } from '@/utils/ui/format'
import { MS_PER_SECOND } from '@/config/constants'
import type { FirmamentNode } from '@/utils/ui/firmamentLayout'

const props = defineProps<{ node: FirmamentNode }>()

const accent = computed(() =>
  props.node.themeIndex >= 0 ? `rgb(${minimapAccentForTheme(props.node.themeIndex)})` : '#8a7a52',
)

const themeName = computed(() =>
  props.node.themeIndex >= 0
    ? GALAXY_THEMES[props.node.themeIndex % GALAXY_THEMES.length].name
    : 'uncharted',
)

const state = computed(() =>
  props.node.state === 'freed'
    ? 'freed'
    : props.node.state === 'current'
      ? 'you are here'
      : 'unlit',
)

/** Die Zeile, wegen der die Karte aufgeht. */
const headline = computed(() => {
  const n = props.node
  if (n.state === 'unlit') return 'Not charted yet'
  if (n.state === 'current') return `${n.rescued} of ${n.stars} stars rescued`
  return `${n.rescued} rescued${n.lost > 0 ? ` · ${n.lost} lost` : ''}`
})

/** Chronikstempel — als Datum gelesen, nie gegen eine Frist geprueft. */
const day = computed(() =>
  props.node.record ? new Date(props.node.record.completedAt).toLocaleDateString() : null,
)
</script>

<template>
  <div class="fgt" :style="{ '--tip-color': accent }">
    <header class="tip-head tip-head--banded">
      <span class="tip-name">Galaxy {{ toRoman(node.galaxy) }}</span>
      <span class="tip-state">{{ state }}</span>
    </header>

    <div class="tip-effect fgt-line">{{ headline }}</div>

    <div class="tip-read tip-read--lg">
      <span class="tip-read-cell">
        <span class="tip-read-k">Stars</span>
        <span class="tip-read-v">{{ node.stars }}</span>
      </span>
      <span class="tip-read-cell">
        <span class="tip-read-k">Landfalls</span>
        <span class="tip-read-v">{{ node.landfalls }}</span>
      </span>
      <span class="tip-read-cell">
        <span class="tip-read-k">Tier</span>
        <span class="tip-read-v">{{ tierOf(node.galaxy) }}</span>
      </span>
    </div>

    <div class="tip-hint fgt-foot">
      <span class="fgt-theme">{{ themeName }}</span>
      <span v-if="node.record">
        · {{ formatCompactDuration(node.record.durationSeconds * MS_PER_SECOND) }} · {{ day }}
      </span>
      <span v-else-if="node.state === 'current'">· core gate sealed</span>
      <span v-else>· the Bard has not been here yet</span>
    </div>

    <!-- Kein `.tip-act`: die Karte traegt `pointer-events: none`, ein Knopf
         waere darin nicht zu treffen. Die Geste sitzt am Knoten selbst. -->
    <div v-if="node.record" class="tip-hint fgt-cta">↗ Click to open in Voyages</div>
  </div>
</template>

<style scoped>
/* Alles in `em` gegen `--tip-u`: das ist die EINE Schriftskala der Sprache. */
.fgt {
  display: flex;
  flex-direction: column;
  gap: 0.72em;
  padding: 0 1.16em 1.05em;
}

/* Der Kopf sitzt buendig an der Akzentleiste — das Polster kommt von der Karte. */
.fgt .tip-head {
  margin: 0 -1.16em;
}

.fgt-line {
  text-transform: none;
}

.fgt-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.28em;
}

.fgt-theme {
  color: var(--tip-color);
}

/* Die einzige Zeile der Karte, die eine HANDLUNG nennt — Gold, damit sie sich
   von den Ablesungen darueber trennt. Der Abstand kommt von der Karte. */
.fgt-cta {
  margin-top: -0.36em;
  color: #e8c040;
}
</style>
