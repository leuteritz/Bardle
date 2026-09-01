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
 * Der Fortschritt bis zum Aufbruch steht in der Chimes-Ablesung, und nur dort:
 * die Goldschiene, die ihn einmal als Unterkante zeigte, ist gefallen. Die
 * Unterkante traegt jetzt dieselbe Naht wie die Voyages-Kopfleiste.
 *
 * Was ein Universum BEDEUTET, bringt die beim Prestige gezogene Vorsehung mit —
 * und ihre zwei Wirkungen stehen als ABLESUNGEN da, in derselben Gestalt und
 * derselben Schriftskala wie die vier der Chronik. Sie waren einmal zwei
 * 11-px-Chips unter einem lila Namen, also die kleinste Zeile des Bandes fuer
 * das einzige, was JETZT gilt; darueber stand der Universumsname in 30 px,
 * obwohl die Kennzeile schon „Universe VI" sagte. Beides ist gefallen: der Name
 * ganz, der Vorsehungsname bis auf die vergangene Bahn, wo er das einzige
 * Ueberlieferte ist — ein Archiveintrag traegt ihren Namen, nicht ihre Achsen.
 *
 * Die Hoehe ist FEST und haengt per `v-bind` an ihrer Konstante — was das Band
 * nimmt, nimmt es der Karte UND der Leiste.
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { providenceEffectLines } from '@/config/progression/providences'
import { formatNumber } from '@/config/ui/numberFormat'
import {
  formatCompactDuration,
  formatShortDuration,
  toRoman,
  universeLabel,
} from '@/utils/ui/format'
import {
  FIRMAMENT_CREST_BAND_H,
  FIRMAMENT_CREST_CHIME_ART_PX,
  FIRMAMENT_CREST_ID_GAP,
  FIRMAMENT_CREST_ID_PAD_X,
  FIRMAMENT_CREST_ID_W,
  FIRMAMENT_CREST_PROV_NAME_PX,
  FIRMAMENT_CREST_READ_PAD_X,
  FIRMAMENT_CREST_READ_W_CHIMES,
  FIRMAMENT_CREST_READ_W_PROV,
  FIRMAMENT_CREST_READ_W_ELAPSED,
  FIRMAMENT_CREST_READ_W_GALAXIES,
  FIRMAMENT_CREST_READ_W_STARS,
  FIRMAMENT_CREST_VALUE_MIN_PX,
  MS_PER_SECOND,
  UNIVERSE_DISC_CREST_PX,
  UNIVERSE_TOOLTIP_IMAGES,
} from '@/config/constants'
import type { FirmamentChronicle } from '@/utils/ui/firmamentChronicle'
import UniverseDisc from './UniverseDisc.vue'

/** Das GEZEIGTE Universum und was es hergab. Die Chronik rechnet der Tab —
 *  eine reine Funktion laesst sich binden, ein Computed in der Ansicht nicht. */
const props = defineProps<{ universe: number; chronicle: FirmamentChronicle }>()

const gameStore = useGameStore()
const providenceStore = useProvidenceStore()

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

/** Was in diesem Universum GILT. Nur auf der laufenden Bahn: ein vergangener
 *  Lauf speichert den Namen seiner Vorsehung, nicht ihre Achsen — dort waere
 *  jede Zahl erfunden. */
const provLines = computed(() =>
  isHere.value && providenceStore.active ? providenceEffectLines(providenceStore.active) : [],
)

/** Ohne Achsen bleibt EINE Ablesung ueber die Breite der beiden. Ihr Wert ist
 *  dann ein Name statt einer Zahl — und wo auch der fehlt, ein „—" mit dem
 *  Grund als Beschriftung, wie bei Chimes und Elapsed. */
const provFallback = computed(() => {
  const name = isHere.value ? providenceStore.active?.name : pastRun.value?.providence
  if (name) return { value: name, key: 'Providence' }
  return { value: '—', key: isHere.value ? 'No providence drawn' : 'No providence recorded' }
})

const PROV_TIP = 'The providence drawn on entering this universe — it rules the whole run.'
const PROV_TIP_UP = `What this universe's providence grants for the whole run.`
const PROV_TIP_DOWN = `What this universe's providence costs for the whole run.`

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

/** Dieselbe Waehrung, dasselbe Bild wie auf der Fleet-Karte — kein Iconify-Ersatz. */
const CHIME_IMG = UNIVERSE_TOOLTIP_IMAGES.chimes

const bandH = `${FIRMAMENT_CREST_BAND_H}px`
const idW = `${FIRMAMENT_CREST_ID_W}px`
const idPadX = `${FIRMAMENT_CREST_ID_PAD_X}px`
const idGap = `${FIRMAMENT_CREST_ID_GAP}px`
const readPadX = `${FIRMAMENT_CREST_READ_PAD_X}px`
const valueMinPx = `${FIRMAMENT_CREST_VALUE_MIN_PX}px`
const provNamePx = `${FIRMAMENT_CREST_PROV_NAME_PX}px`
const chimeArtPx = `${FIRMAMENT_CREST_CHIME_ART_PX}px`
const wProv = `${FIRMAMENT_CREST_READ_W_PROV}px`
const wProvWide = `${2 * FIRMAMENT_CREST_READ_W_PROV}px`
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
            <span class="fm-crest-kicker-id">{{ universeLabel(props.universe) }}</span> ·
            {{ isHere ? 'you are here' : 'visited' }}{{ visitNote }}
          </span>

          <!-- Die Vorsehung IST das Gesetz dieses Universums, also steht sie in
               der Gestalt der Chronik-Ablesungen — nicht als Chipzeile unter
               einem Namen. Die Richtung haengt an `line.positive`, NIE am
               Vorzeichen: eine Achse mit `higherIsBetter: false` (Building cost)
               traegt als BUFF ein Minus. -->
          <span class="fm-crest-prov-reads">
            <template v-if="provLines.length">
              <span
                v-for="(line, i) in provLines"
                :key="i"
                v-tip="{ label: line.label, text: line.positive ? PROV_TIP_UP : PROV_TIP_DOWN }"
                class="fm-crest-read fm-crest-read--prov"
              >
                <span
                  class="fm-crest-v"
                  :class="line.positive ? 'fm-crest-v--up' : 'fm-crest-v--down'"
                >
                  <span class="fm-crest-dir">{{ line.positive ? '▲' : '▼' }}</span
                  >{{ line.value }}
                </span>
                <span class="fm-crest-k">{{ line.label }}</span>
              </span>
            </template>
            <span
              v-else
              v-tip="{ label: 'Providence', text: PROV_TIP }"
              class="fm-crest-read fm-crest-read--provwide"
            >
              <span class="fm-crest-v fm-crest-v--name">{{ provFallback.value }}</span>
              <span class="fm-crest-k">{{ provFallback.key }}</span>
            </span>
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
          <span class="fm-crest-v fm-crest-v--gold fm-crest-v--art">
            <img class="fm-crest-chime" :src="CHIME_IMG" alt="" aria-hidden="true" />
            <span
              >{{ chimesText
              }}<span v-if="dep" class="fm-crest-goal"> / {{ formatNumber(dep.goal) }}</span></span
            >
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
  /* Dieselbe Kante wie unter der Voyages-Kopfleiste (`.ecb`) — die beiden
     Reiterkoepfe sind gleich hoch UND gleich abgeschlossen. `box-sizing:
     border-box` (Tailwind-Preflight) haelt die Aussenhoehe bei 112. */
  border-bottom: 3px solid #5c3310;
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
  gap: v-bind(idGap);
  /* Sie WAECHST in den freien Rest und gibt nach unten nach — die Ablesungen
     tun weder das eine noch das andere. Die Konstante ist die BASIS, nicht die
     Breite; sie ist aus Polsterung, Scheibe, Luecke und den zwei
     Vorsehungs-Ablesungen gerechnet, und `firmamentCrest.spec.ts` rechnet nach. */
  flex: 1 1 v-bind(idW);
  min-width: 0;
  padding: 0 v-bind(idPadX);
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

/* Drei Zeilen, aussen zwei gleiche Reste: so stehen die Vorsehungs-Ablesungen
   auf DERSELBEN Mitte wie die vier der Chronik, obwohl die Kennzeile darueber
   liegt. Gestapelt und mittig gesetzt sassen sie 10 px tiefer — im Bild las
   sich das als Versehen, und eine Ausgleichspolsterung waere eine Zahl, die
   der Zeilenhoehe hinterherliefe. */
.fm-crest-name-box {
  align-self: stretch;
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.fm-crest-kicker {
  align-self: end;
  padding-bottom: 3px;
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a52;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Die Kennung etwas groesser und heller als der Rest der Zeile: sie ist alles,
   was von der Identitaet uebrig ist, seit der Name gefallen ist. Gemessen
   braucht der laengste Fall („Universe VIII · you are here · x12") 255,3 px in
   einer Box, die im schmalsten Zielband 289 misst. */
.fm-crest-kicker-id {
  font-size: 13px;
  color: #c8b890;
}

/* Die zwei Wirkungen der Vorsehung, in der Gestalt der Chronik-Ablesungen. Sie
   stehen in der Wappenzone, weil sie zum UNIVERSUM gehoeren und nicht zur
   Chronik — die Trennlinie rechts scheidet beides. */
.fm-crest-prov-reads {
  grid-row: 2;
  display: flex;
  align-items: stretch;
  min-width: 0;
}

/* Ablesungen */
.fm-crest-reads {
  display: flex;
  align-items: stretch;
  margin-left: auto;
  flex-shrink: 0;
  /* Derselbe Trennstrich, mit dem die Voyages-Kopfleiste ihre Zonen gliedert
     (`.ecb-rank`) — EIN Ton fuer dieselbe Aufgabe, statt zweier. */
  border-left: 1px solid #3e200a;
}

.fm-crest-read {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 v-bind(readPadX);
  border-right: 1px solid #3e200a;
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

/* Gebunden ist hier die BESCHRIFTUNG, nicht die Zahl: `.fm-crest-k` ist `nowrap`
   ohne Ellipse und schneidet still ab. Ohne Achsen nimmt EINE Ablesung die
   Breite der beiden. */
.fm-crest-read--prov {
  width: v-bind(wProv);
}

.fm-crest-read--provwide {
  width: v-bind(wProvWide);
}

.fm-crest-v {
  font-size: clamp(v-bind(valueMinPx), 1.9vw, 34px);
  line-height: 1;
  font-weight: 900;
  white-space: nowrap;
}

.fm-crest-v--art {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Unter dem Schriftboden der Ablesung: darueber bestimmte das BILD die
   Zeilenhoehe. Die `-128`-Stufe traegt bis 34 px. */
.fm-crest-chime {
  flex-shrink: 0;
  width: v-bind(chimeArtPx);
  height: v-bind(chimeArtPx);
  object-fit: contain;
}

.fm-crest-v--gold {
  color: #e8c040;
}

/* Dieselben Toene wie im Header-Tooltip und auf der Prestige-Karte. Die
   Richtung kommt aus dem Roll, nicht aus dem Vorzeichen — eine senkende Achse
   (Building cost) traegt als BUFF ein Minus. */
.fm-crest-v--up {
  color: #7fc95e;
}

.fm-crest-v--down {
  color: #cc6050;
}

/* Ein Name ist kein Zaehler: fester Grad statt der Skala der Zahlen, sonst
   liefe der laengste aus seiner Ablesung heraus. */
.fm-crest-v--name {
  font-size: v-bind(provNamePx);
  font-weight: 700;
  color: #c8b890;
}

.fm-crest-dir {
  font-size: 0.5em;
  padding-right: 0.16em;
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
</style>
