<script setup lang="ts">
/**
 * Der Startkreis in der Mitte der Orbit-Bühne — „The First Chime".
 * Alle fünf Arme laufen auf ihn zu; er ist selbst kein Knoten und kostet nichts.
 */
import { SKILL_TREE_RING_SPIN_MS, SKILL_TREE_START_SIZE } from '@/config/constants'
import { MEEP_TREE_START_ICON } from '@/config/progression/meepTree'

defineProps<{ x: number; y: number }>()
</script>

<template>
  <div
    class="mst-root"
    :style="{
      left: `${x}px`,
      top: `${y}px`,
      width: `${SKILL_TREE_START_SIZE}px`,
      height: `${SKILL_TREE_START_SIZE}px`,
      margin: `${-SKILL_TREE_START_SIZE / 2}px 0 0 ${-SKILL_TREE_START_SIZE / 2}px`,
    }"
    title="The First Chime — every path begins here"
  >
    <!-- Eigene Ebene, damit die Drehung nichts anderes mitzieht: rotate ist
         billig, aber sie darf nicht am Kreis samt Schein hängen. -->
    <span
      class="mst-ring"
      :style="{ animationDuration: `${SKILL_TREE_RING_SPIN_MS}ms` }"
      aria-hidden="true"
    />

    <div class="mst-circle">
      <img :src="MEEP_TREE_START_ICON" alt="Start" class="mst-icon" />
    </div>
  </div>
</template>

<style scoped>
.mst-root {
  position: absolute;
  z-index: 20;
  pointer-events: none;
}

/* Gestrichelter Ring, der langsam umläuft. Der Keyframe-Name steht in der
   CSS-Klasse, nicht in JavaScript — Vue hängt in scoped CSS einen Scope-Suffix
   an, und ein von aussen gesetzter Name träfe ihn nicht. */
.mst-ring {
  position: absolute;
  inset: -11px;
  border-radius: 50%;
  border: 1.5px dashed color-mix(in srgb, var(--rpg-gold-dim) 55%, transparent);
  animation: mst-spin linear infinite;
}

@keyframes mst-spin {
  to {
    transform: rotate(360deg);
  }
}

.mst-circle {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid var(--rpg-gold-dim);
  background: radial-gradient(circle at 35% 30%, #33270e, var(--rpg-bg-dark) 75%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 14px rgba(232, 192, 64, 0.16);
}

/* Schein als Pseudo-Element mit STATISCHEM box-shadow; animiert wird nur die
   opacity — ein animierter Schatten rastert die Box jeden Frame neu. */
.mst-circle::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  box-shadow: 0 0 24px rgba(232, 192, 64, 0.55);
  opacity: 0.6;
  pointer-events: none;
  animation: mst-glow 3s ease-in-out infinite;
}

@keyframes mst-glow {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.mst-icon {
  width: 60%;
  height: 60%;
  object-fit: contain;
}
</style>
