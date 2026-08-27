<script setup lang="ts">
/**
 * Die Gestalt jedes Marken-Tooltips der Galaxiekarte — Kopf und Chip-Reihe.
 *
 * Sie stand zweimal wörtlich im Reiter (Subject und Gate, je ~90 Zeilen CSS).
 * Mit Stern, Portal und Ort wären es fünf Abschriften geworden, und eine
 * Gestalt, die fünfmal gepflegt wird, läuft auseinander.
 *
 * Das Vokabular ist das des Shop-Reiters (`cs-hero-chip` in
 * `ChampionDetailPanel`/`ItemDetailPanel`): Name plus Chip-Reihe, kein
 * Ablesungsband und KEIN Fliesstext. Dort steht die Regel als Kommentar —
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
  <div class="vtt" :style="{ '--vtt-accent': accent }">
    <header class="vtt-head">
      <span class="vtt-glyph">
        <Icon :icon="icon" width="24" height="24" />
      </span>
      <span class="vtt-headtext">
        <span class="vtt-state">{{ state }}</span>
        <span class="vtt-name">{{ name }}</span>
      </span>
    </header>

    <div v-if="chips.length" class="vtt-chips">
      <span
        v-for="c in chips"
        :key="c.text"
        class="vtt-chip"
        :class="{ 'vtt-chip--solid': c.solid, 'vtt-chip--num': c.numeric }"
        :style="c.color ? { '--cc': c.color } : undefined"
      >
        <Icon v-if="c.icon" :icon="c.icon" width="16" height="16" class="vtt-chip-ico" />
        {{ c.text }}
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

/* ── Kopf: Zustand und Name ──────────────────────────────────────────────── */
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
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.72);
}
/* 16px, nicht die 34 des Detail-Panels: das gehört einer 400-px-Spalte, hier
   sind es 326. Ellipsis, weil ein Sternname zweiteilig ist. */
.vtt-name {
  font-size: 16px;
  font-weight: 900;
  line-height: 1.16;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.97);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Die Chip-Reihe — Maße wörtlich aus `cs-hero-chip` ───────────────────── */
.vtt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px 12px;
  background: #1a1008;
}
.vtt-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.62);
  border: 1px solid var(--cc, #7a4e20);
  color: color-mix(in srgb, var(--cc, #e8c040) 55%, #fff);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.25;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}
/* Genau EINER je Reihe: der gefüllte Block verankert den Lauf — dieselbe Rolle,
   die der Rollen-Chip im Champion-Panel spielt. */
.vtt-chip--solid {
  background: var(--cc, #e8c040);
  border-color: var(--cc, #e8c040);
  color: #111008;
  font-weight: 900;
  text-shadow: none;
}
/* Laufende Zahl: die BREITE ist reserviert, sonst wandert die Chipkante im
   Sekundentakt und die Reihe bricht unter dem Zeiger um.

   `tabular-nums` allein trägt das NICHT — MedievalSharp hat keine
   Tabellenziffern, gemessen sind „Ends 4:55" und „Ends 4:11" 66,5 gegen 59,7 px
   mit und ohne die Eigenschaft. Sie steht trotzdem, weil sie nichts kostet und
   bei einem Schriftwechsel greift; die Zusage hält die Mindestbreite.

   12ch = 99 px deckt den breitesten Fall („Back 12:03" misst mit Polster und
   Rahmen 94,2). Die Box zählt border-box, deshalb ist der Wert die AUSSENkante. */
.vtt-chip--num {
  font-variant-numeric: tabular-nums;
  min-width: 12ch;
  justify-content: center;
}
.vtt-chip-ico {
  flex-shrink: 0;
  color: var(--cc, #e8c040);
}

.vtt-foot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 12px 10px;
  border-top: 1px solid rgba(200, 164, 90, 0.16);
}
.vtt-foot:empty {
  display: none;
}
</style>
