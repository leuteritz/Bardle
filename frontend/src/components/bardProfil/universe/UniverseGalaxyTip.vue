<script setup lang="ts">
/**
 * Was auf einem Knoten der Bahn liegt, ohne ihn anzuklicken.
 *
 * Die Gestalt kommt vollstaendig aus den `.tip-*`-Bausteinen in
 * `assets/rpg-theme.css` — Flaeche, Rahmen, Schatten und Akzentleiste bringt
 * `RpgBadgeTooltip` mit. Hier steht nur, was DIESE Karte vom Rest unterscheidet.
 * Eine eigene Flaeche oder eine zweite `clamp()`-Skala braeche
 * `tooltipLanguage.spec.ts`, und das ist sein Zweck.
 *
 * Jede Zahl steht GENAU EINMAL: die Gesichter sagen wer, die Ablesungen sagen
 * wie viele. Warum kein „Stars" neben „rescued" und kein Tier mehr dasteht,
 * steht in `docs/firmament.md`.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { formatCompactDuration, toRoman } from '@/utils/ui/format'
import { starSeats } from '@/utils/ui/starSeats'
import { getChampionIconPath } from '@/utils/game/champions'
import {
  UNIVERSE_MAP_FREED_COLOR,
  UNIVERSE_MAP_LOST_COLOR,
  UNIVERSE_MAP_TIP_SEAT_COLS,
  UNIVERSE_MAP_TIP_SEAT_EM,
  UNIVERSE_MAP_TIP_SEAT_GAP_EM,
  UNIVERSE_MAP_TIP_SEAT_MAX,
  MS_PER_SECOND,
  STAR_MANIFEST_ART_SIZE,
} from '@/config/constants'
import type { UniverseNode } from '@/utils/ui/universeLayout'

const props = defineProps<{ node: UniverseNode; universe: number }>()

const galaxyStore = useGalaxyStore()

const accent = computed(() =>
  props.node.themeIndex >= 0
    ? `rgb(${minimapAccentForTheme(props.node.themeIndex, props.universe)})`
    : '#8a7a52',
)

const themeName = computed(() =>
  props.node.themeIndex >= 0
    ? GALAXY_THEMES[props.node.themeIndex % GALAXY_THEMES.length].name
    : 'uncharted',
)

const state = computed(() =>
  props.node.state === 'freed'
    ? 'freed'
    : props.node.state === 'current'
      ? 'you are here'
      : 'unlit',
)

/** Die Zeile, wegen der die Karte aufgeht: der NAME der Galaxie. Die Zahlen des
 *  Laufs stehen darunter als Ablesung — hier stuenden sie ein zweites Mal. */
const lead = computed(() =>
  props.node.state === 'unlit' ? 'Not charted yet' : themeName.value,
)

/** Wer geflogen ist, in FLUGREIHENFOLGE — der Sternbogen am Knoten gruppiert
 *  (gold, dann rot), die Reihe erzaehlt die Chronologie des Laufs.
 *  Der `freed`-Knoten traegt sein Archiv am Record; die LAUFENDE Galaxie hat
 *  noch keins, ihre Sitze stehen live im Store. */
const seats = computed(() =>
  props.node.state === 'current'
    ? starSeats(
        galaxyStore.attemptResults,
        galaxyStore.starManifests,
        UNIVERSE_MAP_TIP_SEAT_MAX,
      )
    : starSeats(
        props.node.record?.attemptResults,
        props.node.record?.starManifests,
        UNIVERSE_MAP_TIP_SEAT_MAX,
      ),
)

const seatArt = (champion: string) => getChampionIconPath(champion, STAR_MANIFEST_ART_SIZE)

/** Chronikstempel — als Datum gelesen, nie gegen eine Frist geprueft. */
const day = computed(() =>
  props.node.record ? new Date(props.node.record.completedAt).toLocaleDateString() : null,
)

// Masse der Reihe: die Breite deckelt sie auf genau eine Galaxie je Zeile.
const seatSize = `${UNIVERSE_MAP_TIP_SEAT_EM}em`
const seatGap = `${UNIVERSE_MAP_TIP_SEAT_GAP_EM}em`
const seatRowW = `${(
  UNIVERSE_MAP_TIP_SEAT_COLS * UNIVERSE_MAP_TIP_SEAT_EM +
  (UNIVERSE_MAP_TIP_SEAT_COLS - 1) * UNIVERSE_MAP_TIP_SEAT_GAP_EM
).toFixed(2)}em`

// Die zwei Kanaele des Sternbogens am Knoten, hier als Zahl.
const freedInk = UNIVERSE_MAP_FREED_COLOR
const lostInk = UNIVERSE_MAP_LOST_COLOR
</script>

<template>
  <div class="fgt" :style="{ '--tip-color': accent }">
    <header class="tip-head tip-head--banded">
      <span class="tip-name">Galaxy {{ toRoman(node.galaxy) }}</span>
      <span class="tip-state">{{ state }}</span>
    </header>

    <div class="tip-effect" :class="{ 'fgt-name': node.state !== 'unlit' }">{{ lead }}</div>

    <!-- Wer, nicht wie viele: die Zahl steht darunter, hier stehen die
         Gesichter. Kein Name und kein Knopf — die Karte ist
         `pointer-events: none`, und Namen traegt die Galaxie in Voyages. -->
    <ul v-if="seats.seats.length" class="fgt-seats">
      <li
        v-for="(seat, i) in seats.seats"
        :key="i"
        class="fgt-seat"
        :class="{ 'fgt-seat--lost': seat.lost }"
        :style="{ '--fgt-ink': seat.lost ? UNIVERSE_MAP_LOST_COLOR : UNIVERSE_MAP_FREED_COLOR }"
      >
        <img v-if="seat.champion" :src="seatArt(seat.champion)" :alt="seat.champion" />
        <Icon v-else icon="lucide:lock" width="16" height="16" aria-hidden="true" />
      </li>
    </ul>
    <div v-if="seats.hidden > 0" class="tip-hint fgt-more">+{{ seats.hidden }} more</div>

    <div class="tip-read tip-read--lg">
      <span class="tip-read-cell">
        <span class="tip-read-k">Stars</span>
        <span class="tip-read-v">
          <template v-if="node.state === 'unlit'">{{ node.stars }}</template>
          <template v-else>
            <span class="fgt-freed">{{ node.rescued }}</span>
            <template v-if="node.state === 'current'">
              <span class="tip-read-sep">/</span>
              <span class="fgt-need">{{ node.stars }}</span>
            </template>
            <template v-if="node.lost > 0">
              <span class="tip-read-sep">·</span>
              <span class="fgt-lost">{{ node.lost }}</span>
            </template>
          </template>
        </span>
      </span>
      <span v-if="node.state !== 'unlit'" class="tip-read-cell">
        <span class="tip-read-k">Landfalls</span>
        <span class="tip-read-v">{{ node.landfalls }}</span>
      </span>
      <span v-if="node.record" class="tip-read-cell fgt-run">
        <span class="tip-read-k">Run</span>
        <span class="tip-read-v">
          {{ formatCompactDuration(node.record.durationSeconds * MS_PER_SECOND) }}
        </span>
      </span>
    </div>

    <!-- Die Fusszeile haengt am Record: ohne Lauf gibt es weder Datum noch
         Geste. Kein `.tip-act` — die Karte traegt `pointer-events: none`, ein
         Knopf waere darin nicht zu treffen; die Geste sitzt am Knoten selbst. -->
    <div v-if="node.record" class="tip-hint fgt-foot">
      <span class="fgt-cta">↗ Click to open in Galaxy</span>
      <span class="fgt-day">{{ day }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Alles in `em` gegen `--tip-u`: das ist die EINE Schriftskala der Sprache. */
.fgt {
  display: flex;
  flex-direction: column;
  gap: 0.72em;
  padding: 0 1.16em 1.05em;
}

/* Der Kopf sitzt buendig an der Akzentleiste — das Polster kommt von der Karte. */
.fgt .tip-head {
  margin: 0 -1.16em;
}

.fgt-name {
  color: var(--tip-color);
}

.fgt-seats {
  display: flex;
  flex-wrap: wrap;
  gap: v-bind(seatGap);
  max-width: v-bind(seatRowW);
  margin: 0;
  padding: 0;
  list-style: none;
}

.fgt-seat {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: v-bind(seatSize);
  height: v-bind(seatSize);
  border: 1px solid color-mix(in srgb, var(--fgt-ink) 55%, var(--rpg-wood-inner));
  border-radius: 4px;
  background: var(--rpg-bg-icon);
  overflow: hidden;
  color: rgba(232, 220, 192, 0.5);
}

.fgt-seat img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Statischer Zustand, keine laufende Animation — dieselbe Behandlung wie der
   verschluckte Champion im Sternmanifest. */
.fgt-seat--lost img {
  filter: grayscale(70%);
  opacity: 0.62;
}

.fgt-more {
  margin-top: -0.36em;
  border-top: none;
  padding-top: 0;
}

/* Die zwei Kanaele des Sternbogens am Knoten, hier als Zahl. */
.fgt-freed {
  color: v-bind(freedInk);
}

.fgt-lost {
  color: v-bind(lostInk);
}

/* Was die laufende Galaxie noch verlangt — Ziel, nicht Ertrag. */
.fgt-need {
  color: rgba(232, 220, 192, 0.55);
}

/* Die Dauer ist der breiteste Wert der Reihe — bei gleichen Anteilen fehlten ihr
   gemessen 17 px, und `nowrap` schnitt sie an. Der Elternselektor ist noetig:
   `.tip-read--lg .tip-read-cell` traegt dieselbe Spezifitaet und steht spaeter. */
.fgt .fgt-run {
  flex: 1.7;
}

.fgt-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em;
}

/* Die einzige Zeile der Karte, die eine HANDLUNG nennt — Gold, damit sie sich
   von der Ablesung darueber trennt. */
.fgt-cta {
  color: #e8c040;
}

.fgt-day {
  margin-left: auto;
}
</style>
