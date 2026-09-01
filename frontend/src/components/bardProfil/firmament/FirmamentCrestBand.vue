<script setup lang="ts">
/**
 * Der Kopf des Firmaments: WELCHE Bahn man sieht, und was sie hergab.
 *
 * Das Band ist die Chronik der GEZEIGTEN Bahn — jede seiner vier Ablesungen
 * folgt der Auswahl der Leiste. Vorher taten das genau zwei Dinge, Wappen und
 * Vorsehung; alles andere waren Lebenszeit-Zaehler, und wer auf Universum II
 * sah, las die Zahlen des ganzen Spielstands.
 *
 * Drei Leitern sind dabei gefallen — Wayfinder, Codex und Departures. Sie
 * beantworten "wie weit insgesamt", und das tut der Journey-Reiter: die Leiter
 * steht in `WayfinderSection.vue` samt HUD-Karte und Pause-Band, der Codex in
 * `ChronicleSection.vue`. Sie hier zu wiederholen war genau die Doppelung,
 * gegen die dieser Reiter geschrieben ist.
 *
 * Der Fortschritt bis zum Aufbruch ist die UNTERKANTE, keine eigene Zeile — und
 * sie fuellt nur auf der laufenden Bahn. Eine vergangene ist aufgebrochen, ihr
 * Fortschritt ist kein Fortschritt mehr, sondern ein Ergebnis; das steht in der
 * Chimes-Ablesung.
 *
 * Die Hoehe ist FEST und haengt per `v-bind` an ihrer Konstante — was das Band
 * nimmt, nimmt es der Karte UND der Leiste.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { getUniverse } from '@/config/progression/universes'
import { formatNumber } from '@/config/ui/numberFormat'
import { formatCompactDuration, formatShortDuration, toRoman } from '@/utils/ui/format'
import {
  FIRMAMENT_CREST_BAND_H,
  FIRMAMENT_CREST_ID_W,
  FIRMAMENT_CREST_RAIL_H,
  FIRMAMENT_CREST_READ_W_CHIMES,
  FIRMAMENT_CREST_READ_W_ELAPSED,
  FIRMAMENT_CREST_READ_W_GALAXIES,
  FIRMAMENT_CREST_READ_W_STARS,
  MS_PER_SECOND,
  UNIVERSE_DISC_CREST_PX,
} from '@/config/constants'
import type { FirmamentChronicle } from '@/utils/ui/firmamentChronicle'
import UniverseDisc from './UniverseDisc.vue'

/** Das GEZEIGTE Universum und was es hergab. Die Chronik rechnet der Tab —
 *  eine reine Funktion laesst sich binden, ein Computed in der Ansicht nicht. */
const props = defineProps<{ universe: number; chronicle: FirmamentChronicle }>()

const gameStore = useGameStore()
const providenceStore = useProvidenceStore()

const universe = computed(() => getUniverse(props.universe))
const isHere = computed(() => props.universe === gameStore.currentUniverse)
const dep = computed(() => props.chronicle.departure)

/** Der letzte Lauf DIESES Universums — bei einer vergangenen Bahn ist er die
 *  einzige Stelle, an der seine Vorsehung noch zu erfahren ist. */
const pastRun = computed(() => {
  const mine = gameStore.universeRuns
    .filter((r) => r.universe === props.universe)
    .sort((a, b) => a.completedAt - b.completedAt)
  return mine.length ? mine[mine.length - 1] : null
})

const providence = computed(() =>
  isHere.value
    ? (providenceStore.active?.name ?? 'no providence drawn')
    : (pastRun.value?.providence ?? 'no providence recorded'),
)

/** Wie oft man hier war — nur, wenn es mehr als einmal war. Ein "x1" traegt
 *  nichts und stuende auf neun von zehn Bahnen. */
const visitNote = computed(() => (props.chronicle.visits > 1 ? ` · x${props.chronicle.visits}` : ''))

const chimesText = computed(() =>
  props.chronicle.chimes === null ? '—' : formatNumber(props.chronicle.chimes),
)

const elapsedText = computed(() =>
  props.chronicle.seconds === null
    ? '—'
    : formatCompactDuration(props.chronicle.seconds * MS_PER_SECOND),
)

/** Die Beschriftung traegt die Zeitform: auf der laufenden Bahn die Uhr bis zum
 *  Aufbruch, sonst das, was der Lauf erhoben hat. Fehlt der Lauf, sagt sie das —
 *  an dieser Stelle stand frueher die globale Notiz "N unmarked". */
const chimesKey = computed(() => {
  const d = dep.value
  if (!d) return props.chronicle.chimes === null ? 'Unrecorded' : 'Chimes raised'
  if (d.etaSeconds === 0) return 'Chimes · ready'
  if (d.etaSeconds === null) return 'Chimes'
  return `Chimes · ~${formatShortDuration(d.etaSeconds)}`
})

const elapsedKey = computed(() => (props.chronicle.seconds === null ? 'Unrecorded' : 'Elapsed'))

const READ_TIPS = {
  galaxies: 'Galaxies freed on this path. The running one counts once its core falls.',
  stars: 'Stars rescued against stars lost in this universe, the running galaxy included.',
  chimesHere: 'Chimes raised toward leaving this universe. The band edge below fills with it.',
  chimesPast: 'Chimes this universe raised before its departure, across every visit.',
  chimesGone: 'This run was pushed out of the archive, so its chimes are no longer recorded.',
  elapsed: 'Game time spent in this universe, across every visit.',
  elapsedGone: 'This run was pushed out of the archive, so its duration is no longer recorded.',
}

const chimesTip = computed(() =>
  dep.value
    ? READ_TIPS.chimesHere
    : props.chronicle.chimes === null
      ? READ_TIPS.chimesGone
      : READ_TIPS.chimesPast,
)

const elapsedTip = computed(() =>
  props.chronicle.seconds === null ? READ_TIPS.elapsedGone : READ_TIPS.elapsed,
)

const tint = computed(() => universe.value.tint)
const railFill = computed(() => `${dep.value?.percent ?? 0}%`)

const bandH = `${FIRMAMENT_CREST_BAND_H}px`
const idW = `${FIRMAMENT_CREST_ID_W}px`
const railH = `${FIRMAMENT_CREST_RAIL_H}px`
const wGalaxies = `${FIRMAMENT_CREST_READ_W_GALAXIES}px`
const wStars = `${FIRMAMENT_CREST_READ_W_STARS}px`
const wChimes = `${FIRMAMENT_CREST_READ_W_CHIMES}px`
const wElapsed = `${FIRMAMENT_CREST_READ_W_ELAPSED}px`
</script>

<template>
  <div class="fm-crest">
    <div class="fm-crest-body">
      <!-- Wappen: die Bahn, die die Karte gerade zeigt. -->
      <div class="fm-crest-id">
        <span class="fm-crest-medal">
          <UniverseDisc
            :universe="props.universe"
            :state="isHere ? 'current' : 'walked'"
            :px="UNIVERSE_DISC_CREST_PX"
          />
          <span class="fm-crest-roman">{{ toRoman(props.universe) }}</span>
        </span>
        <span class="fm-crest-name-box">
          <span class="fm-crest-kicker">
            Universe {{ toRoman(props.universe) }} ·
            {{ isHere ? 'you are here' : 'visited' }}{{ visitNote }}
          </span>
          <span class="fm-crest-name">{{ universe.name }}</span>
          <span class="fm-crest-prov">
            <Icon icon="game-icons:eye-of-horus" width="13" height="13" />
            <span class="fm-crest-prov-text">{{ providence }}</span>
          </span>
        </span>
      </div>

      <!-- Was DIESE Bahn hergab. Vier Ablesungen, keine fuenfte. -->
      <div class="fm-crest-reads">
        <div
          v-tip="{ label: 'Galaxies', text: READ_TIPS.galaxies }"
          class="fm-crest-read fm-crest-read--galaxies"
        >
          <span class="fm-crest-v fm-crest-v--gold">{{ props.chronicle.galaxies }}</span>
          <span class="fm-crest-k">Galaxies</span>
        </div>
        <div
          v-tip="{ label: 'Stars', text: READ_TIPS.stars }"
          class="fm-crest-read fm-crest-read--stars"
        >
          <span class="fm-crest-v fm-crest-v--gold">
            {{ props.chronicle.rescued }}<span class="fm-crest-sep"> / </span
            ><span class="fm-crest-lost">{{ props.chronicle.lost }}</span>
          </span>
          <span class="fm-crest-k">Stars</span>
        </div>
        <div
          v-tip="{ label: 'Chimes', text: chimesTip }"
          class="fm-crest-read fm-crest-read--chimes"
        >
          <span class="fm-crest-v fm-crest-v--gold">
            {{ chimesText
            }}<span v-if="dep" class="fm-crest-goal"> / {{ formatNumber(dep.goal) }}</span>
          </span>
          <span class="fm-crest-k" :class="{ 'fm-crest-k--ready': dep?.etaSeconds === 0 }">
            {{ chimesKey }}
          </span>
        </div>
        <div
          v-tip="{ label: 'Elapsed', text: elapsedTip }"
          class="fm-crest-read fm-crest-read--elapsed"
        >
          <span class="fm-crest-v fm-crest-v--time">{{ elapsedText }}</span>
          <span class="fm-crest-k">{{ elapsedKey }}</span>
        </div>
      </div>
    </div>

    <!-- Die Unterkante IST die Schiene bis zum Aufbruch. Auf einer vergangenen
         Bahn steht sie flach im Ton des Universums. -->
    <div class="fm-crest-rail">
      <span v-if="dep" class="fm-crest-rail-fill" :style="{ width: railFill }" />
    </div>
  </div>
</template>

<style scoped>
.fm-crest {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  height: v-bind(bandH);
  display: flex;
  flex-direction: column;
  background: #16120a;
}

.fm-crest-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
}

/* Wappen */
.fm-crest-id {
  display: flex;
  align-items: center;
  gap: 14px;
  /* Sie WAECHST in den freien Rest und gibt nach unten nach — die Ablesungen
     tun weder das eine noch das andere. Starr auf ihrer Basis liess sie
     „Runeterra Prime" ellipsieren, waehrend rechts daneben 314 px leer standen;
     die Konstante ist die BASIS, nicht die Breite. */
  flex: 1 1 v-bind(idW);
  min-width: 0;
  padding: 0 18px;
}

/* Dieselbe Scheibe wie in der Leiste, nur gross — das Heldenbild des Reiters.
   Kein Teller darunter: sie ist rund und braucht keinen Kasten. */
.fm-crest-medal {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.fm-crest-roman {
  position: absolute;
  right: -4px;
  bottom: -2px;
  padding: 1px 5px;
  font-size: 10.5px;
  font-weight: 900;
  color: #0c0a06;
  background: #c8b890;
  border-radius: 3px;
}

.fm-crest-name-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.fm-crest-kicker {
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a52;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-crest-name {
  font-size: clamp(22px, 1.55vw, 30px);
  line-height: 1.05;
  color: #f2ead2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-crest-prov {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 12px;
  color: #c9a8f0;
}

.fm-crest-prov-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ablesungen */
.fm-crest-reads {
  display: flex;
  align-items: stretch;
  margin-left: auto;
  flex-shrink: 0;
  border-left: 1px solid #2a1c0c;
}

.fm-crest-read {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 4px;
  border-right: 1px solid #241806;
}

.fm-crest-read:last-child {
  border-right: none;
}

/* AUSSENMASSE aus `constants/firmament.ts` — die Bilanz gegen das schmalste
   Zielband bindet `firmamentCrest.spec.ts`. */
.fm-crest-read--galaxies {
  width: v-bind(wGalaxies);
}

.fm-crest-read--stars {
  width: v-bind(wStars);
}

.fm-crest-read--chimes {
  width: v-bind(wChimes);
}

.fm-crest-read--elapsed {
  width: v-bind(wElapsed);
}

.fm-crest-v {
  font-size: clamp(26px, 1.9vw, 34px);
  line-height: 1;
  font-weight: 900;
  white-space: nowrap;
}

.fm-crest-v--gold {
  color: #e8c040;
}

.fm-crest-v--time {
  color: #ffd88a;
}

.fm-crest-lost {
  color: #e08a7a;
}

.fm-crest-sep {
  color: #5c4a30;
}

/* Das Ziel steht klein neben der erhobenen Summe: die grosse Zahl ist die, die
   waechst. */
.fm-crest-goal {
  font-size: 0.5em;
  font-weight: 400;
  color: #8a7a52;
}

.fm-crest-k {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7a52;
  white-space: nowrap;
}

.fm-crest-k--ready {
  color: #e8c040;
}

/* Unterkante */
.fm-crest-rail {
  flex-shrink: 0;
  height: v-bind(railH);
  background: v-bind(tint);
}

/* KEINE Transition: die Breite aendert sich einmal pro Sekunde, und eine
   laufende Transition auf `width` rastert das Band in jedem Frame neu. */
.fm-crest-rail-fill {
  display: block;
  height: 100%;
  background: linear-gradient(to bottom, #e8c060, #a87418);
}
</style>
