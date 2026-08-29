<script setup lang="ts">
/**
 * Der Ursprung der Bahn — was in der Mitte der Kartenscheibe liegt.
 *
 * Sie erzaehlt, wo alles anfing: die erste Galaxie der Kette, wie weit die
 * Kette reicht, wie viele Universen durchwandert sind. Bewusst NICHT den
 * gegenwaertigen Standort — das sagt die Leiste links mit „you are here" schon,
 * und bewusst nicht die Summen des Kopfbands (Galaxies, Won/Lost, Landfalls,
 * In flight).
 *
 * Die Gestalt kommt vollstaendig aus den `.tip-*`-Bausteinen in
 * `assets/rpg-theme.css` — Flaeche, Rahmen, Schatten und Akzentleiste bringt
 * `RpgBadgeTooltip` mit. Eine eigene Flaeche oder eine zweite `clamp()`-Skala
 * braeche `tooltipLanguage.spec.ts`, und das ist sein Zweck.
 */
import { computed } from 'vue'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import { FIRMAMENT_FREED_COLOR } from '@/config/constants'
import { toRoman } from '@/utils/ui/format'
import type { FirmamentNode } from '@/utils/ui/firmamentLayout'

const props = defineProps<{ nodes: FirmamentNode[]; universe: number }>()

const first = computed<FirmamentNode | null>(() => props.nodes[0] ?? null)

/** Wie weit die Kette reicht — die hoechste ERREICHTE Galaxienummer.
 *
 *  Die Nummer, nicht die Anzahl: ein Admin-Sprung laesst Luecken, und die
 *  Reichweite ist das, was der Ursprung ueber die Bahn sagt. Und ohne die
 *  unbeleuchteten Plaetze: `FIRMAMENT_UNLIT_AHEAD` haengt vier Knoten voraus,
 *  an denen der Bard nie war — sie melden eine Reichweite, die es nicht gibt. */
const reach = computed(() =>
  props.nodes.reduce((max, n) => (n.state === 'unlit' ? max : Math.max(max, n.galaxy)), 0),
)

const walked = computed(() => first.value?.record != null)

const themeName = computed(() =>
  first.value && first.value.themeIndex >= 0
    ? GALAXY_THEMES[first.value.themeIndex % GALAXY_THEMES.length].name
    : 'uncharted',
)

/** Chronikstempel — als Datum gelesen, nie gegen eine Frist geprueft. */
const day = computed(() =>
  first.value?.record ? new Date(first.value.record.completedAt).toLocaleDateString() : null,
)
</script>

<template>
  <div class="fot" :style="{ '--tip-color': FIRMAMENT_FREED_COLOR }">
    <header class="tip-head tip-head--banded">
      <span class="tip-name">Start</span>
      <span class="tip-state">{{ walked ? 'the origin' : 'the road ahead' }}</span>
    </header>

    <div class="tip-effect fot-line">Where the Caretaker's road begins</div>

    <div class="tip-read tip-read--lg">
      <span class="tip-read-cell">
        <span class="tip-read-k">First</span>
        <span class="tip-read-v">{{ first ? toRoman(first.galaxy) : '—' }}</span>
      </span>
      <span class="tip-read-cell">
        <span class="tip-read-k">Reach</span>
        <span class="tip-read-v">{{ reach > 0 ? toRoman(reach) : '—' }}</span>
      </span>
      <span class="tip-read-cell">
        <span class="tip-read-k">Universes</span>
        <span class="tip-read-v">{{ universe }}</span>
      </span>
    </div>

    <div class="tip-hint fot-foot">
      <span class="fot-theme">{{ themeName }}</span>
      <span v-if="day">· since {{ day }}</span>
      <span v-else>· no galaxy freed yet</span>
    </div>
  </div>
</template>

<style scoped>
/* Alles in `em` gegen `--tip-u`: das ist die EINE Schriftskala der Sprache. */
.fot {
  display: flex;
  flex-direction: column;
  gap: 0.72em;
  padding: 0 1.16em 1.05em;
}

/* Der Kopf sitzt buendig an der Akzentleiste — das Polster kommt von der Karte. */
.fot .tip-head {
  margin: 0 -1.16em;
}

.fot-line {
  text-transform: none;
}

.fot-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.28em;
}

.fot-theme {
  color: var(--tip-color);
}
</style>
