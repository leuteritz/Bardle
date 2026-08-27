<script setup lang="ts">
/**
 * Die Gestalt jedes Marken-Tooltips der Galaxiekarte — Goldlinie, Kopf, drei
 * Ablesungen, Fuss.
 *
 * Sie stand zweimal wörtlich im Reiter (Subject und Gate, je ~90 Zeilen CSS).
 * Mit Stern, Portal und Ort wären es fünf Abschriften geworden, und eine
 * Gestalt, die fünfmal gepflegt wird, läuft auseinander.
 *
 * KEIN Rahmen, KEIN Schatten: die liefert `RpgBadgeTooltip`, ein zweiter läge
 * darin. `border-radius: 2px` ist der 4px-Kastenradius minus seine 2px Rahmen.
 */
import { Icon } from '@iconify/vue'

export interface MarkReading {
  value: string
  label: string
  /** `is-good` | `is-mid` | `is-poor` | `is-dim` — sonst der Grundton. */
  tone?: string
}

withDefaults(
  defineProps<{
    icon: string
    name: string
    /** Zustandszeile über dem Namen, klein und versal. */
    state: string
    /** Steht hinter dem Trennpunkt in derselben Zeile. */
    context?: string
    accent?: string
    readings: MarkReading[]
  }>(),
  { accent: '#e8c040', context: '' },
)
</script>

<template>
  <div class="vtt" :style="{ '--vtt-accent': accent }">
    <span class="vtt-gold" aria-hidden="true" />

    <header class="vtt-head">
      <span class="vtt-glyph">
        <Icon :icon="icon" width="24" height="24" />
      </span>
      <span class="vtt-headtext">
        <span class="vtt-state">
          {{ state }}
          <template v-if="context">
            <i class="vtt-dot">·</i>
            {{ context }}
          </template>
        </span>
        <span class="vtt-name">{{ name }}</span>
      </span>
    </header>

    <div v-if="readings.length" class="vtt-readings">
      <span v-for="r in readings" :key="r.label" class="vtt-read">
        <b class="vtt-value" :class="r.tone">{{ r.value }}</b>
        <i class="vtt-label">{{ r.label }}</i>
      </span>
    </div>

    <div class="vtt-foot">
      <slot name="foot" />
    </div>
  </div>
</template>

<style scoped>
.vtt {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #16140e;
  border-radius: 2px;
  overflow: hidden;
}

.vtt-gold {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* ── Kopf: Zustand, Kontext, Name ────────────────────────────────────────── */
.vtt-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 9px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  border-left: 3px solid var(--vtt-accent, #e8c040);
}
.vtt-glyph {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 4px;
  color: var(--vtt-accent, #e8c040);
}
.vtt-headtext {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.vtt-state {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.72);
}
.vtt-dot {
  font-style: normal;
  color: rgba(200, 144, 64, 0.4);
}
.vtt-name {
  font-size: 19px;
  line-height: 1.14;
  letter-spacing: 0.02em;
  color: #e8c040;
}

/* ── Die drei grossen Zahlen ─────────────────────────────────────────────── */
.vtt-readings {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 11px 8px 10px;
  background: #1a1008;
  border-bottom: 1px solid rgba(200, 164, 90, 0.16);
}
.vtt-read {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  text-align: center;
}
.vtt-read + .vtt-read {
  border-left: 1px solid rgba(200, 164, 90, 0.14);
}
.vtt-value {
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.01em;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}
/* Wortablesungen (Seltenheit, Geste) tragen die Kante nicht — 26px sprengten
   die Spalte. Die Stufe hängt an der LÄNGE, nicht an der Bedeutung. */
.vtt-value.is-word {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.12;
}
.vtt-value.is-good {
  color: #64dcb4;
}
.vtt-value.is-mid {
  color: #e8c040;
}
.vtt-value.is-poor {
  color: #cc6050;
}
.vtt-value.is-dim {
  color: rgba(230, 220, 196, 0.4);
}
.vtt-label {
  font-size: 9.5px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
}

.vtt-foot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 12px 10px;
}
.vtt-foot:empty {
  display: none;
}
</style>
