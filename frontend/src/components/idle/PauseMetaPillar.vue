<script setup lang="ts">
/**
 * Ein Feld der Standtafel neben der Sonnenscheibe: Level, Universe oder Galaxy.
 *
 * Die drei standen vorher als winzige Chips unter dem Timer — drei nackte Zahlen
 * ohne Farbe und ohne Namen. Hier tragen sie, was der Bestand über sie weiß: den
 * Namen des Universums, das Theme der Galaxie, den Weg zum nächsten Level. Die
 * Farbe ist dieselbe wie im Journey-Ring des Stats-Tabs (`JOURNEY_AXIS_COLORS`).
 *
 * Ohne Icon: Universe hätte ein Iconify-Glyph, Galaxy nur ein PNG, Level gar
 * nichts — drei uneinheitliche Marken nebeneinander wären schlechter als keine.
 * Die Zuordnung trägt der Farbstrich am Label, für alle drei gleich.
 *
 * Die Größe hängt an der SCHEIBE (`--sun-d` aus der Heldenzeile), nicht am
 * Viewport: die Säule darf die Zeile nie höher machen als die Sonne daneben.
 */
import { computed } from 'vue'

const props = defineProps<{
  label: string
  /** Die Schlagzahl — römisch beim Universum, sonst arabisch. */
  value: string
  /** Zeile darunter: Name des Universums bzw. der Galaxie, beim Level der Rest. */
  sub: string
  /** 0–100. */
  pct: number
  /** Beschriftung am Balken — der Bruch, den er zeigt. */
  meter: string
  color: string
  /** Seite der Scheibe: die Säule richtet sich zur Panelkante hin aus. */
  align: 'left' | 'right'
  /** Der Bard steht allein auf seiner Seite und darf größer stehen. */
  emphasis?: boolean
}>()

const fill = computed(() => Math.min(100, Math.max(0, props.pct)) / 100)
</script>

<template>
  <div
    class="pillar"
    :class="[`pillar--${align}`, { 'pillar--emphasis': emphasis }]"
    :style="{ '--pillar-color': color }"
  >
    <span class="pillar__head">
      <span class="pillar__label">{{ label }}</span>
      <span class="pillar__value">{{ value }}</span>
    </span>
    <span class="pillar__sub">{{ sub }}</span>
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
  gap: 3px;
  min-width: 0;
}

.pillar--left {
  align-items: flex-start;
  text-align: left;
}

.pillar--right {
  align-items: flex-end;
  text-align: right;
}

/* Der Farbstrich trägt die ganze Kopfzeile, nicht nur das Wort — er ist die
   einzige Zuordnung, die alle drei Säulen gleich führen können. */
.pillar__head {
  display: flex;
  align-items: baseline;
  gap: 9px;
  max-width: 100%;
  padding-left: 8px;
  border-left: 2px solid var(--pillar-color);
}

.pillar--right .pillar__head {
  flex-direction: row-reverse;
  padding-left: 0;
  padding-right: 8px;
  border-left: none;
  border-right: 2px solid var(--pillar-color);
}

.pillar__label {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1.2;
  color: rgba(216, 200, 160, 0.68);
}

.pillar__value {
  font-size: clamp(1.7rem, calc(var(--sun-d, 180px) * 0.24), 3rem);
  font-weight: 800;
  line-height: 1.02;
  color: var(--pillar-color);
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 18px color-mix(in srgb, var(--pillar-color) 38%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.85);
}

.pillar--emphasis .pillar__value {
  font-size: clamp(2.3rem, calc(var(--sun-d, 180px) * 0.34), 4.2rem);
}

.pillar__sub {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.15;
  color: rgba(216, 200, 160, 0.6);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pillar__meter {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  margin-top: 2px;
}

.pillar--right .pillar__meter {
  flex-direction: row-reverse;
}

.pillar__track {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 3px;
  border-radius: 2px;
  background: rgba(122, 78, 32, 0.55);
  overflow: hidden;
}

.pillar__fill {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: var(--pillar-color);
  transform-origin: left center;
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.pillar--right .pillar__fill {
  transform-origin: right center;
}

.pillar__meter-text {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  color: rgba(216, 200, 160, 0.66);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .pillar__fill {
    transition: none;
  }
}
</style>
