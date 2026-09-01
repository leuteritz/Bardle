<script setup lang="ts">
/**
 * Eine Zeile der Zustandsspalte: Level, Universe oder Galaxy.
 *
 * Die drei standen einmal als Chips unter dem Timer, dann als Säulen links und
 * rechts der Sonnenscheibe. Seit das Panel zweispaltig ist, stehen sie
 * untereinander in der Zustandsspalte — Name links, Herkunft rechts daneben, die
 * Schlagzahl an der Aussenkante, der Fortschritt als Haarlinie darunter.
 *
 * Die Farbe ist dieselbe wie im Journey-Ring des Stats-Tabs
 * (`JOURNEY_AXIS_COLORS`); ohne Icon, weil die drei Achsen keine drei
 * gleichwertigen Glyphen hätten — die Zuordnung trägt der Farbstrich am Label.
 */
import { computed } from 'vue'

const props = defineProps<{
  label: string
  /** Die Schlagzahl — römisch beim Universum, sonst arabisch. */
  value: string
  /** Name der Galaxie, beim Level der Rest zum nächsten. Das Universum hat
   *  keinen Namen mehr und laesst ihn weg. */
  sub?: string
  /** 0–100. */
  pct: number
  /** Beschriftung am Balken — der Bruch, den er zeigt. */
  meter: string
  color: string
  /** Der Bard steht als Ziel der Zeile allein da und darf grösser stehen. */
  emphasis?: boolean
}>()

const fill = computed(() => Math.min(100, Math.max(0, props.pct)) / 100)
</script>

<template>
  <div class="pillar" :class="{ 'pillar--emphasis': emphasis }" :style="{ '--pillar-color': color }">
    <span class="pillar__head">
      <span class="pillar__label">{{ label }}</span>
      <span v-if="sub" class="pillar__sub">{{ sub }}</span>
      <span class="pillar__value">{{ value }}</span>
    </span>
    <span class="pillar__meter">
      <span class="pillar__track">
        <!-- scaleX statt width: der Level kann während der Pause steigen, und
             eine Breitenänderung wäre Layout-Arbeit statt Compositor-Arbeit. -->
        <span class="pillar__fill" :style="{ transform: `scaleX(${fill})` }" />
      </span>
      <span class="pillar__meter-text">{{ meter }}</span>
    </span>
  </div>
</template>

<style scoped>
.pillar {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

/* Label und Zahl sitzen auf einer Grundlinie, der Name füllt den Raum dazwischen
   und weicht als einziger zurück — er ist der einzige Teil variabler Länge. */
.pillar__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  width: 100%;
  padding-left: 8px;
  border-left: 2px solid var(--pillar-color);
}

.pillar__label {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1.2;
  color: rgba(216, 200, 160, 0.6);
}

.pillar__sub {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-align: right;
  font-size: 0.84rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.15;
  color: rgba(216, 200, 160, 0.6);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pillar__value {
  flex-shrink: 0;
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1;
  color: var(--pillar-color);
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 18px color-mix(in srgb, var(--pillar-color) 38%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.85);
}

.pillar--emphasis .pillar__value {
  font-size: 3.2rem;
}

.pillar__meter {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.pillar__track {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 2px;
  background: rgba(122, 78, 32, 0.55);
  overflow: hidden;
}

.pillar__fill {
  position: absolute;
  inset: 0;
  background: var(--pillar-color);
  transform-origin: left center;
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.pillar__meter-text {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  color: rgba(216, 200, 160, 0.55);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .pillar__fill {
    transition: none;
  }
}
</style>
