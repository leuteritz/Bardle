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
        :class="{ 'stn--on': highlight }"
        :style="{
          left: `${left}%`,
          top: `${top}%`,
          '--stn-hit': `${hit}px`,
          '--stn-r': `${markR}px`,
          '--stn-ink': accent,
        }"
        :aria-label="label"
        @mouseenter="emit('hover', mark.index)"
        @mouseleave="emit('hover', null)"
      >
        <!-- Eigene Ebene mit statischem Schein; eingeblendet wird nur ihre
             opacity. Bauform von `.sn-breath`, aber OHNE dessen Keyframes —
             der hervorgehobene Zustand ist ein einmaliger Umschlag. -->
        <span class="stn-glow" aria-hidden="true" />
        <span class="stn-ring" aria-hidden="true" />
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

/* Beide Ebenen ruhen unsichtbar und kosten nichts: kein Keyframe, kein
   `will-change`, und `paintKey` sieht sie nicht — die Platte wird beim Hovern
   NICHT neu gemalt. */
.stn-glow,
.stn-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.stn-glow {
  width: calc(var(--stn-r) * 4.2);
  height: calc(var(--stn-r) * 4.2);
  margin: calc(var(--stn-r) * -2.1) 0 0 calc(var(--stn-r) * -2.1);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--stn-ink) 42%, transparent) 0%,
    color-mix(in srgb, var(--stn-ink) 13%, transparent) 45%,
    transparent 72%
  );
  transform: scale(0.86);
}

/* Ein Ring statt einer animierten Randfarbe — dieselbe Regel wie beim Hafen.
   Er sitzt auf dem GEMALTEN Radius, 19 % nach aussen versetzt wie `.sn--on`. */
.stn-ring {
  width: calc(var(--stn-r) * 2.38);
  height: calc(var(--stn-r) * 2.38);
  margin: calc(var(--stn-r) * -1.19) 0 0 calc(var(--stn-r) * -1.19);
  border: 2px solid var(--stn-ink);
  transform: scale(0.88);
}

.stn--on .stn-glow {
  opacity: 1;
  transform: scale(1);
}
.stn--on .stn-ring {
  opacity: 1;
  transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .stn-glow,
  .stn-ring {
    transition: none;
  }
}
</style>
