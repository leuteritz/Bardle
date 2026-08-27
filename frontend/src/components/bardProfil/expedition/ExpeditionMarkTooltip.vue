<script setup lang="ts">
/**
 * Die Gestalt jedes Marken-Tooltips der Galaxiekarte — Kopf und Chip-Reihe.
 *
 * Sie stand zweimal wörtlich im Reiter (Subject und Gate, je ~90 Zeilen CSS).
 * Mit Stern, Portal und Ort wären es fünf Abschriften geworden, und eine
 * Gestalt, die fünfmal gepflegt wird, läuft auseinander.
 *
 * Die Gestalt ist die Tooltip-Sprache (`.tip-*` in `rpg-theme.css`): Kopf mit
 * Streifen, Name plus Chip-Reihe, kein Ablesungsband und KEIN Fliesstext.
 * „Blocks carry no headline: glyph, accent edge and content say what they are".
 *
 * KEIN Rahmen, KEIN Schatten: die liefert `RpgBadgeTooltip`, ein zweiter läge
 * darin. `border-radius: 2px` ist der 4px-Kastenradius minus seine 2px Rahmen.
 */
import { Icon } from '@iconify/vue'

export interface MarkChip {
  text: string
  /** Optionales Glyph, 16×16 wie im Shop. */
  icon?: string
  /** Eigenfarbe des Chips (`--cc`); ohne sie Gold. */
  color?: string
  /** Der EINE gefüllte Chip je Reihe — er trägt den Zustand. */
  solid?: boolean
  /**
   * Trägt eine laufende Zahl.
   *
   * Ohne das bricht die Reihe unter dem Zeiger um, sobald eine Uhr von `9:59`
   * auf `10:03` springt: der Chip wird breiter, `flex-wrap` schiebt den letzten
   * in die nächste Zeile und das Panel wächst, während man es liest.
   */
  numeric?: boolean
}

withDefaults(
  defineProps<{
    icon: string
    name: string
    /** Die einzige Beschriftung: eine Zeile über dem Namen, klein und versal. */
    state: string
    accent?: string
    chips: MarkChip[]
  }>(),
  { accent: '#e8c040' },
)
</script>

<template>
  <div class="vtt" :style="{ '--tip-color': accent }">
    <header class="tip-head tip-head--banded">
      <span class="vtt-glyph">
        <Icon :icon="icon" width="24" height="24" />
      </span>
      <span class="vtt-headtext">
        <span class="tip-state">{{ state }}</span>
        <span class="tip-name">{{ name }}</span>
      </span>
    </header>

    <div v-if="chips.length" class="tip-chips">
      <span
        v-for="c in chips"
        :key="c.text"
        class="tip-chip"
        :class="{ 'tip-chip--solid': c.solid, 'tip-chip--num': c.numeric }"
        :style="c.color ? { '--cc': c.color } : undefined"
      >
        <Icon v-if="c.icon" :icon="c.icon" width="16" height="16" class="tip-chip-ico" />
        {{ c.text }}
      </span>
    </div>

    <div class="vtt-foot">
      <slot name="foot" />
    </div>
  </div>
</template>

<style scoped>
/* Kopf, Zustandszeile, Name und Chip-Reihe stehen als `.tip-*` global in
   `rpg-theme.css`. Hier bleibt nur, was die Marke davon unterscheidet: ihre
   Motivkachel und der Fuß, den die Aufrufer füllen. */
.vtt {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--tip-surface);
  border-radius: 2px;
  overflow: hidden;
}

.vtt-glyph {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.4em;
  height: 2.4em;
  background: var(--rpg-bg-icon);
  border: 1px solid var(--rpg-wood-inner);
  border-radius: 4px;
  color: var(--tip-color, var(--rpg-gold));
}

.vtt-headtext {
  display: flex;
  flex-direction: column;
  gap: 0.2em;
  min-width: 0;
}

.vtt-foot {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
  padding: 0.74em 1em 0.83em;
  border-top: 1px solid rgba(200, 164, 90, 0.16);
}

.vtt-foot:empty {
  display: none;
}
</style>
