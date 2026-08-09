<template>
  <div
    class="ab-passive"
    :style="{ '--ab-color': BARD_PASSIVE.color }"
    :aria-label="`${BARD_PASSIVE.name} — ${resonance} resonance, ${meeps} meeps held`"
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
      :src="MEEP_ART_IMAGE"
      alt="Meep"
      draggable="false"
      @dragstart.prevent
    />

    <!-- Die gehaltenen Meeps, in derselben Kurzform wie die Header-Kachel —
         dieselbe Sache darf im HUD nicht zweimal anders geschrieben stehen. -->
    <span class="ab-stacks">{{ formatNumberCompact(meeps) }}</span>
  </div>
</template>

<script setup lang="ts">
import { BARD_PASSIVE } from '@/config/progression/bardAbilities'
import { MEEP_ART_IMAGE } from '@/config/constants'
import { formatNumberCompact } from '@/config/ui/numberFormat'

defineProps<{
  resonance: number
  /** 0..1 — Anteil der laufenden Stufe. */
  fill: number
  /** Gehaltene Meeps — dieselbe Zahl, die der Header zeigt. */
  meeps: number
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
   Splash — beschnitten blieb bei dieser Größe nur ein gelber Fleck übrig.

   Das Meep-Sprite ist hochformatig (1024×1536) und trägt oben wie unten einen
   Alpha-Rand. Die Box ist deshalb höher als beim quadratischen Bard-Artwork:
   `contain` bindet hier an der HÖHE, die Breite folgt von selbst — eine
   breitere Box würde die Figur kein Stück wachsen lassen. Der Fuß darf hinter
   der Zahlenplatte enden; sie ist deckend, das liest sich als Standfläche. */
.ab-passive-art {
  position: absolute;
  top: 5%;
  left: 12%;
  width: 76%;
  height: 68%;
  object-fit: contain;
  image-rendering: high-quality;
  /* Statisch, nicht animiert: derselbe warme Schein wie an der Header-Kachel,
     aber ohne deren pulsierenden `drop-shadow` — der wäre pro Frame eine
     Neurasterung (Performance-Regel 2). */
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.55));
}

/* Auf dem Fuß der Scheibe, damit die Zahl das Motiv nicht zerschneidet.
   Orange wie im Header: die gehaltenen Meeps sind dieselbe Sache und tragen
   im ganzen Spiel dieselbe Farbe. */
.ab-stacks {
  position: absolute;
  bottom: 2%;
  left: 50%;
  transform: translateX(-50%);
  min-width: 2.4em;
  max-width: 96%;
  padding: 1px 5px 2px;
  background: #1e1006;
  border: 1px solid #5c3310;
  border-radius: 3px;
  /* Etwas kleiner als die frühere Stufenzahl: die Kurzform wird bis zu fünf
     Zeichen lang ("125Qa"), die einstellige Resonance war es nie. */
  font-size: calc(var(--ab-passive-size, 72px) * 0.23);
  font-weight: 900;
  line-height: 1;
  color: #fed7aa;
  text-shadow: 0 0 8px rgba(251, 146, 60, 0.35);
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .ab-ring-fill {
    transition: none;
  }
}
</style>
