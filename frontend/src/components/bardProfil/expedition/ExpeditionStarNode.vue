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
 * Der NAME ist abgeleitet (`utils/game/starNames.ts`) und hängt NICHT am
 * Ausgang — ein Stern steht auf der Karte, bevor er befreit oder verloren ist.
 *
 * Das MANIFEST dagegen ist mitgeschrieben (`types/world.ts`) und darf fehlen:
 * Spielstände von vor ihm und nachgetragene Galaxien tragen keines. Dann bleibt
 * der Fuss leer, und `.vtt-foot:empty` blendet ihn aus — Kopf und Chips wie
 * eh und je. Das ist wahr, nicht gelogen.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import ExpeditionMarkTooltip, { type MarkChip } from './ExpeditionMarkTooltip.vue'
import { getChampionIconPath } from '@/utils/game/champions'
import { formatMinuteClock } from '@/utils/ui/format'
import {
  LANDMARK_FREED_CORE,
  MS_PER_SECOND,
  ROLE_BY_KEY,
  STAR_MANIFEST_ART_SIZE,
  VOYAGE_TIP_GAP_PX,
  VOYAGE_TIP_OPEN_DELAY_MS,
  VOYAGE_TIP_WIDTH,
} from '@/config/constants'
import type { StarManifest } from '@/types'
import type { GalaxyStarMark } from '@/utils/game/starNames'

const props = defineProps<{
  mark: GalaxyStarMark
  /** Sternsoll dieser Galaxie — die dritte Ablesung misst dagegen. */
  required: number
  /** Wie viele Sterne bis einschliesslich diesem befreit waren. */
  freedSoFar: number
  /** Was der Stern hergab. Fehlt bei Altbestand und nachgetragenen Galaxien. */
  manifest?: StarManifest
  left: number
  top: number
  hit: number
}>()

const lost = computed(() => props.mark.outcome === 'failed')

/* Dieselben zwei Farben, die das Datenband unter der Karte führt — es ist die
   Legende zur Marke, und zwei Töne für dieselbe Sache wären einer zuviel. */
const LOST_TONE = '#e08a7a'

/** 1st, 2nd, 3rd, 4th … — die Nummer ist alles, was ein Stern an Ordnung hat. */
const ordinal = computed(() => {
  const n = props.mark.index + 1
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
})

const chips = computed<MarkChip[]>(() => [
  {
    text: lost.value ? 'Lost' : 'Freed',
    color: lost.value ? LOST_TONE : LANDMARK_FREED_CORE,
    solid: true,
  },
  { text: `${ordinal.value} star` },
  { text: `${props.freedSoFar} of ${props.required} charted` },
])

const role = computed(() => (props.manifest?.role ? ROLE_BY_KEY[props.manifest.role] : null))

/**
 * Wer an diesem Stern hing — der Grund, warum die Karte aufgeht.
 *
 * Ohne Champion ist der Stern trotzdem befreit: sind die freigeschalteten Tiers
 * leergeräumt, gibt der Heimatplanet keinen mehr her (`planetBossStore`). Das
 * Schloss ist derselbe Glyph, den gesperrte Zustände im ganzen Spiel tragen.
 */
const champion = computed(() => {
  const name = props.manifest?.champion
  if (!name) return { name: 'No champion aboard', note: 'All unlocked tiers claimed' }
  return {
    name,
    art: getChampionIconPath(name, STAR_MANIFEST_ART_SIZE),
    note: lost.value ? 'Never reached' : 'Recruit unlocked',
  }
})

const label = computed(() => {
  const base = `${props.mark.name} — star ${lost.value ? 'lost' : 'freed'}, attempt ${props.mark.index + 1}`
  const m = props.manifest
  if (!m) return base
  const who = m.champion ? `, ${m.champion} ${lost.value ? 'never reached' : 'unlocked'}` : ''
  return `${base}${who}, ${m.cleared} of ${m.worlds} worlds cleared`
})

const clock = (sec: number) => formatMinuteClock(sec * MS_PER_SECOND)
</script>

<template>
  <RpgBadgeTooltip
    prefer="top"
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
    :accent="lost ? LOST_TONE : LANDMARK_FREED_CORE"
  >
    <template #default>
      <span
        class="stn"
        :style="{ left: `${left}%`, top: `${top}%`, '--stn-hit': `${hit}px` }"
        :aria-label="label"
      />
    </template>
    <template #tip>
      <ExpeditionMarkTooltip
        :icon="lost ? 'game-icons:falling-star' : 'game-icons:star-satellites'"
        :accent="lost ? LOST_TONE : LANDMARK_FREED_CORE"
        :name="mark.name"
        :state="lost ? 'Star lost' : 'Star freed'"
        :chips="chips"
      >
        <template v-if="manifest" #foot>
          <div class="tip-effect stn-champ" :class="{ 'stn-champ--lost': lost }">
            <img v-if="champion.art" class="stn-art" :src="champion.art" alt="" />
            <Icon v-else icon="lucide:lock" width="20" height="20" class="stn-lock" />
            <span class="stn-who">
              <b class="stn-name">{{ champion.name }}</b>
              <span class="tip-meta">
                <template v-if="role"
                  ><span class="stn-role" :style="{ color: role.color }">{{ role.label }}</span> ·
                </template>
                {{ champion.note }}
              </span>
            </span>
          </div>

          <div class="tip-read">
            <span class="tip-read-cell">
              <span class="tip-read-k">Worlds</span>
              <span class="tip-read-v">
                {{ manifest.cleared }}<span class="tip-read-sep">/</span>{{ manifest.worlds }}
              </span>
            </span>
            <span class="tip-read-cell">
              <span class="tip-read-k">Chimes</span>
              <span class="tip-read-v">
                <Icon icon="game-icons:windchimes" width="14" height="14" class="stn-chime" />
                {{ $formatNumber(manifest.chimes) }}
              </span>
            </span>
            <span class="tip-read-cell">
              <span class="tip-read-k">Clock</span>
              <span class="tip-read-v">
                {{ clock(manifest.heldSec) }}<span class="tip-read-sep">/</span
                >{{ clock(manifest.windowSec) }}
              </span>
            </span>
          </div>
        </template>
      </ExpeditionMarkTooltip>
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

/* Fläche, linke Kante und Schriftgrösse kommen aus `.tip-effect`. Hier steht
   nur, was den Champion vom Fliesstext unterscheidet: sein Bild daneben. */
.stn-champ {
  display: flex;
  align-items: center;
  gap: 0.6em;
}

.stn-art,
.stn-lock {
  flex-shrink: 0;
  width: 2.6em;
  height: 2.6em;
  border: 1px solid var(--rpg-wood-inner);
  border-radius: 4px;
}

.stn-lock {
  padding: 0.5em;
  background: var(--rpg-bg-icon);
  color: rgba(232, 220, 192, 0.5);
}

/* Statischer Zustand, keine laufende Animation — ein Champion, den der Stern
   verschluckt hat, ist gesperrt wie jeder gesperrte Eintrag im Spiel. */
.stn-champ--lost .stn-art {
  filter: grayscale(70%);
  opacity: 0.62;
}

.stn-who {
  display: flex;
  flex-direction: column;
  gap: 0.1em;
  min-width: 0;
}

.stn-name {
  font-weight: 800;
  line-height: 1.15;
}

.stn-role {
  font-weight: 700;
}

.stn-chime {
  color: var(--rpg-gold);
}
</style>
