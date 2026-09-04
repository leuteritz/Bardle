<script setup lang="ts">
/**
 * Die Hover-Fläche über einer Sternmarke — befreit wie verloren.
 *
 * Wie beim Ort: sie malt NICHTS, der Ring und die massive Hülle kommen aus dem
 * Canvas. Sie trägt allein die Auskunft, und die gab es bis hierher gar nicht —
 * ein Stern war auf der Karte ausschliesslich `'rescued' | 'failed'` plus seine
 * Nummer. Die Legende sagt WAS die Form bedeutet, nicht WELCHER Stern hier
 * stand und was aus ihm wurde.
 *
 * Der Inhalt ist das MANIFEST (`ExpeditionStarTooltip`) — Champion, Welten,
 * Chimes, Uhr. Sternname, Nummer und Kartierungsstand sind dafür entfallen: sie
 * standen über dem eigentlichen Inhalt und drückten ihn klein.
 *
 * `ExpeditionMarkTooltip` bleibt als RIEGEL, nicht als Regelfall. Jedes Archiv
 * trägt ein Manifest — echte Läufe schreiben es mit, Admin-Sprünge und
 * Altbestand bekommen es nachgetragen (`galaxyArchiveBackfill`). Eine Karte,
 * die im Fehlerfall leer aufginge, wäre aber schlimmer als eine, die auf ihre
 * alte Gestalt zurückfällt.
 */
import { computed } from 'vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import ExpeditionMarkTooltip, { type MarkChip } from './ExpeditionMarkTooltip.vue'
import ExpeditionStarTooltip from './ExpeditionStarTooltip.vue'
import ExpeditionMarkHalo from './ExpeditionMarkHalo.vue'
import { starCoreTint } from '@/utils/fx/galaxyPlate'
import { ordinalOf } from '@/utils/ui/format'
import {
  LANDMARK_FREED_CORE,
  VOYAGE_TIP_GAP_PX,
  VOYAGE_TIP_OPEN_DELAY_MS,
  VOYAGE_TIP_WIDTH,
} from '@/config/constants'
import type { StarManifest } from '@/types'
import type { GalaxyStarMark } from '@/utils/game/starNames'

const props = defineProps<{
  mark: GalaxyStarMark
  /** Sternsoll dieser Galaxie — die Chip-Reihe des Riegels misst dagegen. */
  required: number
  /** Wie viele Sterne bis einschliesslich diesem befreit waren. */
  freedSoFar: number
  /** Was der Stern hergab. Fehlt nur, wenn der Nachtrag nicht gegriffen hat. */
  manifest?: StarManifest
  left: number
  top: number
  hit: number
  /** Der GEMALTE Radius dieser Marke — nicht aus `hit` zurueckgerechnet.
   *  `starHit` nimmt fuer beide Ausgaenge den Radius des befreiten Sterns und
   *  hat ausserdem einen Boden; ein daraus gerechneter Ring saesse beim
   *  verlorenen Stern 18 % zu weit aussen. */
  markR: number
  /** Von der Manifestreihe gezeigt: Ring, Schein und die eigene Karte. */
  highlight?: boolean
  /**
   * Von der Formlegende ausgeleuchtet: Ring und Schein, sonst NICHTS.
   *
   * Bewusst nicht `highlight`: das öffnet zusätzlich die Sternkarte, und die
   * Legende meint alle Marken ihrer Art auf einmal — sieben gleichzeitig
   * aufgehende Karten wären unlesbar.
   */
  lit?: boolean
}>()

/** Der Flugindex dieser Marke, damit die Reihe oben mitleuchten kann. */
const emit = defineEmits<{ hover: [number | null] }>()

const lost = computed(() => props.mark.outcome === 'failed')

/* Der Ton, den das Datenband unter der Karte für verlorene Sterne führt. */
const LOST_TONE = '#e08a7a'

/* Dieselbe Quelle wie der KERN der Marke auf dem Canvas — die Karte trägt den
   Ton des Punktes, auf den sie zeigt. Der verlorene Stern hat keinen Kern. */
const accent = computed(() =>
  lost.value ? LOST_TONE : (starCoreTint(props.manifest) ?? LANDMARK_FREED_CORE),
)

/* Dieselbe Ordnung nennt die Kachel der Manifestreihe — deshalb `format.ts`. */
const ordinal = computed(() => ordinalOf(props.mark.index + 1))

const chips = computed<MarkChip[]>(() => [
  { text: lost.value ? 'Lost' : 'Freed', color: accent.value, solid: true },
  { text: `${ordinal.value} star` },
  { text: `${props.freedSoFar} of ${props.required} charted` },
])

const label = computed(() => {
  const base = `${props.mark.name} — star ${lost.value ? 'lost' : 'freed'}, attempt ${props.mark.index + 1}`
  const m = props.manifest
  if (!m) return base
  const who = m.champion ? `, ${m.champion} ${lost.value ? 'never reached' : 'unlocked'}` : ''
  return `${base}${who}, ${m.cleared} of ${m.planets} planets cleared`
})
</script>

<template>
  <RpgBadgeTooltip
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
    :accent="accent"
    :force-open="highlight"
  >
    <template #default>
      <span
        class="stn"
        :class="{ 'stn--on': highlight || lit }"
        :style="{
          left: `${left}%`,
          top: `${top}%`,
          '--stn-hit': `${hit}px`,
        }"
        :aria-label="label"
        @mouseenter="emit('hover', mark.index)"
        @mouseleave="emit('hover', null)"
      >
        <ExpeditionMarkHalo :mark-r="markR" :ink="accent" :on="!!(highlight || lit)" />
      </span>
    </template>
    <template #tip>
      <ExpeditionStarTooltip v-if="manifest" :manifest="manifest" :lost="lost" :accent="accent" />
      <ExpeditionMarkTooltip
        v-else
        :icon="lost ? 'game-icons:falling-star' : 'game-icons:star-satellites'"
        :accent="accent"
        :name="mark.name"
        :state="lost ? 'Star lost' : 'Star freed'"
        :chips="chips"
      />
    </template>
  </RpgBadgeTooltip>
</template>

<style scoped>
.stn {
  position: absolute;
  width: var(--stn-hit);
  height: var(--stn-hit);
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
/* Wie `.sn--on`: der gezeigte Stern liegt ueber seinen Nachbarn. Ueber die
   Manifestreihe hebt ihn das nicht — `.egm-nodes` ist ein eigener
   Stapelkontext, und die Reihe liegt daneben auf z-index 2. */
.stn--on {
  z-index: 3;
}

/* Der Ring lebt in `ExpeditionMarkHalo` — dieselben gemessenen Faktoren tragen
   seit der Formlegende auch Ort und Ereignis. */
</style>
