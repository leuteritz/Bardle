<template>
  <div
    class="ab-passive"
    :style="{ '--ab-color': BARD_PASSIVE.color }"
    :aria-label="`${BARD_PASSIVE.name} — ${resonance} resonance`"
    @mouseenter="$emit('hover', true)"
    @mouseleave="$emit('hover', false)"
  >
    <!--
      Fortschritt zur nächsten Stufe als Kreislinie über `stroke-dashoffset` —
      der Weg, den jeder Ring im Spiel geht. Ein conic-gradient würde pro
      Änderung den Verlauf neu rechnen (Performance-Regel 11); hier ändert sich
      ohnehin nur beim Klick etwas, aber der Klick ist der häufigste Vorgang
      im Spiel überhaupt.
    -->
    <svg class="ab-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle class="ab-ring-track" cx="50" cy="50" :r="RING_R" />
      <circle
        class="ab-ring-fill"
        cx="50"
        cy="50"
        :r="RING_R"
        :stroke-dasharray="RING_C"
        :stroke-dashoffset="RING_C * (1 - fill)"
      />
    </svg>

    <span class="ab-passive-disc" aria-hidden="true"></span>

    <img
      class="ab-passive-art"
      :src="BARD_PASSIVE.image"
      :alt="BARD_PASSIVE.name"
      draggable="false"
      @dragstart.prevent
    />

    <!-- Die Stufenzahl sitzt auf der Kachel, nicht daneben: sie ist der ganze
         Grund, warum die Passive überhaupt eine eigene Fläche bekommt. -->
    <span class="ab-stacks">{{ resonance }}</span>
  </div>
</template>

<script setup lang="ts">
import { BARD_PASSIVE } from '@/config/progression/bardAbilities'

defineProps<{
  resonance: number
  /** 0..1 — Anteil der laufenden Stufe. */
  fill: number
}>()

defineEmits<{ hover: [boolean] }>()

/** Radius und Umfang der Kreislinie im 100×100-Koordinatenraum des SVG. */
const RING_R = 45
const RING_C = 2 * Math.PI * RING_R
</script>

<style scoped>
/* Rund und kleiner als die vier Slots: die Passive ist kein Knopf, sondern ein
   Zustand — sie soll die Zeile anführen, ohne mit ihr um Aufmerksamkeit zu
   ringen. */
.ab-passive {
  position: relative;
  width: var(--ab-passive-size, 72px);
  height: var(--ab-passive-size, 72px);
  flex: 0 0 auto;
  pointer-events: auto;
  user-select: none;
}

.ab-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Nullpunkt oben statt rechts */
  transform: rotate(-90deg);
  overflow: visible;
}

.ab-ring-track {
  fill: none;
  stroke: #4a2a0e;
  stroke-width: 8;
}

.ab-ring-fill {
  fill: none;
  stroke: var(--ab-color, #f0d890);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 260ms ease-out;
}

/* Die Scheibe unter der Figur — sie trägt den dunklen Grund, damit das Motiv
   selbst frei stehen kann. */
.ab-passive-disc {
  position: absolute;
  top: 10%;
  left: 10%;
  width: 80%;
  height: 80%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 34%, #241708, #100e08 72%);
  box-shadow: inset 0 0 0 2px #5c3310;
}

/* `contain`, nicht `cover`: die Vorlage ist eine freigestellte Figur, kein
   Splash — beschnitten blieb bei dieser Größe nur ein goldener Fleck übrig.
   Ganz gezeigt ist Bard auch auf 62 px als Figur zu erkennen. */
.ab-passive-art {
  position: absolute;
  top: 12%;
  left: 12%;
  width: 76%;
  height: 62%;
  object-fit: contain;
  image-rendering: high-quality;
}

/* Auf dem Fuß der Scheibe, damit die Zahl das Motiv nicht zerschneidet. Die
   Figur endet darüber (Höhe 62 %), die Platte sitzt also auf freiem Grund. */
.ab-stacks {
  position: absolute;
  bottom: 2%;
  left: 50%;
  transform: translateX(-50%);
  min-width: 2.4em;
  padding: 1px 5px 2px;
  background: #1e1006;
  border: 1px solid #5c3310;
  border-radius: 3px;
  font-size: calc(var(--ab-passive-size, 72px) * 0.26);
  font-weight: 900;
  line-height: 1;
  color: var(--ab-color, #f0d890);
  font-variant-numeric: tabular-nums;
  text-align: center;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .ab-ring-fill {
    transition: none;
  }
}
</style>
