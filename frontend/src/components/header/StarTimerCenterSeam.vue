<script setup lang="ts">
import {
  BOTTOM_FRAME_STROKE_SHADOW,
  BOTTOM_FRAME_STROKE_WOOD,
  BOTTOM_FRAME_STROKE_GOLD,
  BOTTOM_FRAME_W_SHADOW,
  BOTTOM_FRAME_W_WOOD,
  BOTTOM_FRAME_W_GOLD,
} from '@/config/constants'

/* Die Mittelachse der Star-Timer-Bars als senkrechte Zierleiste.
   Gebaut wie RpgFrame: drei Strokes übereinander — Schatten → Holz → Goldlinie
   — aus denselben Konstanten. Damit spricht die Achse dieselbe Sprache wie
   jeder Rahmen im übrigen UI, statt eine eigene zu erfinden.

   Sie setzt an der Unterkante des Level-Badges an und läuft bis zum unteren
   Ende ihres Containers, also bis zur Unterkante der letzten Bar. Darüber
   braucht es sie nicht: Dort halten Header-Oval und Badge die Mitte besetzt.

   Anders als RpgFrame misst sie nichts. Eine gerade Linie lässt sich in SVG
   über Prozentkoordinaten ausdrücken (`y2="100%"`), und ohne viewBox bleibt
   das Koordinatensystem 1:1 zu CSS-Pixeln — die Strichstärken kommen also
   unverzerrt an, ohne ResizeObserver und ohne einen Wert im Zustand. */
</script>

<template>
  <div class="center-seam" :style="{ width: `${BOTTOM_FRAME_W_SHADOW}px` }" aria-hidden="true">
    <svg class="center-seam__svg">
      <line
        x1="50%"
        y1="0"
        x2="50%"
        y2="100%"
        :stroke="BOTTOM_FRAME_STROKE_SHADOW"
        :stroke-width="BOTTOM_FRAME_W_SHADOW"
      />
      <line
        x1="50%"
        y1="0"
        x2="50%"
        y2="100%"
        :stroke="BOTTOM_FRAME_STROKE_WOOD"
        :stroke-width="BOTTOM_FRAME_W_WOOD"
      />
      <line
        x1="50%"
        y1="0"
        x2="50%"
        y2="100%"
        :stroke="BOTTOM_FRAME_STROKE_GOLD"
        :stroke-width="BOTTOM_FRAME_W_GOLD"
      />
    </svg>
  </div>
</template>

<style scoped>
/* `--level-badge-bottom` ist viewport-absolut, der Bar-Stapel beginnt an der
   Header-Unterkante — die Differenz ist der Ansatzpunkt. Reicht der Stapel
   nicht bis dorthin, wird die Höhe negativ und die Leiste verschwindet von
   selbst. */
.center-seam {
  position: absolute;
  left: 50%;
  top: calc(var(--level-badge-bottom, 110px) - var(--header-total-height, 50px));
  bottom: 0;
  /* Die Breite kommt aus dem breitesten Stroke (siehe `:style` im Template) —
     ein `<svg>` ohne Breite wird laut Spec überhaupt nicht gezeichnet, ein
     0-breiter Container wäre also unsichtbar. `overflow: visible` am SVG
     rettet die Antialiasing-Kante, die am bündigen Viewport wegfiele. */
  transform: translateX(-50%);
  pointer-events: none;
}

.center-seam__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
</style>
