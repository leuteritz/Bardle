<script setup lang="ts">
/**
 * Der Kopf des Universes: WELCHE Bahn man sieht, und was sie hergab.
 *
 * Das Band ist EINE Ablesungsreihe ueber die volle Breite: die Identitaet, die
 * zwei Wirkungen der Vorsehung und fuenf Ablesungen der Chronik, alle in
 * derselben zweizeiligen Form auf DERSELBEN Grundlinie. Vorher stapelte die
 * Wappenzone zwei Etagen — bei 2560 summierte der Stapel auf 117 px in einer
 * 109-px-Box, und `you are here` lag unter `+145%`.
 *
 * Das Band ist die Chronik der GEZEIGTEN Bahn — jede seiner Ablesungen
 * folgt der Auswahl der Leiste. Vorher taten das genau zwei Dinge, Wappen und
 * Vorsehung; alles andere waren Lebenszeit-Zaehler, und wer auf Universum II
 * sah, las die Zahlen des ganzen Spielstands.
 *
 * Zwei Leitern sind dabei gefallen — Wayfinder und Departures. Sie beantworten
 * "wie weit insgesamt", und das tut der Journey-Reiter: die Leiter steht auf
 * seiner Wayfinder-Unterseite samt HUD-Karte und Pause-Band. Sie hier zu
 * wiederholen war genau die Doppelung, gegen die dieser Reiter geschrieben ist.
 *
 * Der Fortschritt bis zum Aufbruch steht in der Chimes-Ablesung, und nur dort:
 * die Goldschiene, die ihn einmal als Unterkante zeigte, ist gefallen. Die
 * Unterkante traegt jetzt dieselbe Naht wie die Voyages-Kopfleiste.
 *
 * Jede Zone traegt einen festen ANTEIL an der Bandbreite, keine Inhaltsbreite:
 * eine Breite, die am Text haengt, laesst jede wachsende Zahl die Nachbarn
 * schieben — und Chimes, Stars und Elapsed wachsen im laufenden Spiel dauernd.
 * Die Anteile stehen in `UNIVERSE_MAP_CREST_SHARE`, gerechnet gegen die
 * gemessenen Textbreiten; die Zahlen selbst duerfen nie mehr eine Kante
 * bewegen.
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
import { universeProvidenceReading } from '@/utils/ui/universeProvidence'
import { formatNumber } from '@/config/ui/numberFormat'
import {
  formatCompactDuration,
  formatShortDuration,
  toRoman,
  universeLabel,
} from '@/utils/ui/format'
import {
  UNIVERSE_MAP_CREST_BAND_H,
  UNIVERSE_MAP_CREST_CHIME_ART_PX,
  UNIVERSE_MAP_CREST_ID_GAP,
  UNIVERSE_MAP_CREST_ID_PAD_X,
  UNIVERSE_MAP_CREST_KICKER_ID_CQW,
  UNIVERSE_MAP_CREST_KICKER_ID_MAX_PX,
  UNIVERSE_MAP_CREST_KICKER_ID_MIN_PX,
  UNIVERSE_MAP_CREST_LABEL_CQW,
  UNIVERSE_MAP_CREST_LABEL_MAX_PX,
  UNIVERSE_MAP_CREST_LABEL_MIN_PX,
  UNIVERSE_MAP_CREST_PROV_NAME_PX,
  UNIVERSE_MAP_CREST_READ_GAP_PX,
  UNIVERSE_MAP_CREST_READ_PAD_X,
  UNIVERSE_MAP_CREST_SHARE,
  UNIVERSE_MAP_CREST_VALUE_CQW,
  UNIVERSE_MAP_CREST_VALUE_MAX_PX,
  UNIVERSE_MAP_CREST_VALUE_MIN_PX,
  MS_PER_SECOND,
  UNIVERSE_DISC_CREST_PX,
  UNIVERSE_TOOLTIP_IMAGES,
} from '@/config/constants'
import type { UniverseChronicle } from '@/utils/ui/universeChronicle'
import UniverseDisc from './UniverseDisc.vue'

/** Das GEZEIGTE Universum und was es hergab. Die Chronik rechnet der Tab —
 *  eine reine Funktion laesst sich binden, ein Computed in der Ansicht nicht. */
const props = defineProps<{ universe: number; chronicle: UniverseChronicle }>()

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

/** Was in diesem Universum GILT beziehungsweise GALT. Ein Lauf legt seinen
 *  ganzen Wurf ins Archiv, seit es das Feld gibt — davor nur den Namen. Zwei
 *  Ablesungen oder eine breite entscheidet `universeProvidenceReading`. */
const prov = computed(() =>
  universeProvidenceReading({
    roll: isHere.value ? providenceStore.active : (pastRun.value?.providenceRoll ?? null),
    name: (isHere.value ? providenceStore.active?.name : pastRun.value?.providence) ?? null,
    isHere: isHere.value,
  }),
)
const provLines = computed(() => prov.value.lines)
const provFallback = computed(() => prov.value.fallback)

/** Die Zeitform haengt an der gezeigten Bahn: eine vergangene Vorsehung regiert
 *  nichts mehr. */
const tense = computed(() => (isHere.value ? ['rules', 'grants', 'costs'] : ['ruled', 'granted', 'cost']))
const PROV_TIP = computed(
  () => `The providence drawn on entering this universe — it ${tense.value[0]} the whole run.`,
)
const PROV_TIP_UP = computed(
  () => `What this universe's providence ${tense.value[1]} for the whole run.`,
)
const PROV_TIP_DOWN = computed(
  () => `What this universe's providence ${tense.value[2]} for the whole run.`,
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

/** Dieselbe Waehrung, dasselbe Bild wie auf der Fleet-Karte — kein Iconify-Ersatz. */
const CHIME_IMG = UNIVERSE_TOOLTIP_IMAGES.chimes

const bandH = `${UNIVERSE_MAP_CREST_BAND_H}px`
const idPadX = `${UNIVERSE_MAP_CREST_ID_PAD_X}px`
const idGap = `${UNIVERSE_MAP_CREST_ID_GAP}px`
const readGap = `${UNIVERSE_MAP_CREST_READ_GAP_PX}px`
const readPadX = `${UNIVERSE_MAP_CREST_READ_PAD_X}px`
const provNamePx = `${UNIVERSE_MAP_CREST_PROV_NAME_PX}px`
const chimeArtPx = `${UNIVERSE_MAP_CREST_CHIME_ART_PX}px`

/* Feste Zonenbreiten als PROZENT-Basis. Nicht `flex-grow`: unter
   `box-sizing: border-box` floort `flex-basis: 0` auf Polsterung plus Kante,
   und die Verteilung waere dann nicht mehr proportional. */
const pct = (n: number) => `${n}%`
const shareId = pct(UNIVERSE_MAP_CREST_SHARE.id)
const shareProv = pct(UNIVERSE_MAP_CREST_SHARE.prov)
const shareProvWide = pct(UNIVERSE_MAP_CREST_SHARE.provWide)
const shareGalaxies = pct(UNIVERSE_MAP_CREST_SHARE.galaxies)
const shareStars = pct(UNIVERSE_MAP_CREST_SHARE.stars)
const shareChimes = pct(UNIVERSE_MAP_CREST_SHARE.chimes)
const shareElapsed = pct(UNIVERSE_MAP_CREST_SHARE.elapsed)

/* Die drei Schriftskalen des Bandes. Sie messen in `cqw` gegen `.un-crest`,
   nicht in `vw` gegen den Viewport: `--hud-scale` entkoppelt beide. */
const valueScale = `clamp(${UNIVERSE_MAP_CREST_VALUE_MIN_PX}px, ${UNIVERSE_MAP_CREST_VALUE_CQW}cqw, ${UNIVERSE_MAP_CREST_VALUE_MAX_PX}px)`
const labelScale = `clamp(${UNIVERSE_MAP_CREST_LABEL_MIN_PX}px, ${UNIVERSE_MAP_CREST_LABEL_CQW}cqw, ${UNIVERSE_MAP_CREST_LABEL_MAX_PX}px)`
const kickerScale = `clamp(${UNIVERSE_MAP_CREST_KICKER_ID_MIN_PX}px, ${UNIVERSE_MAP_CREST_KICKER_ID_CQW}cqw, ${UNIVERSE_MAP_CREST_KICKER_ID_MAX_PX}px)`
</script>

<template>
  <div class="un-crest">
    <div class="un-crest-body">
      <!-- Die Identitaet: WELCHE Bahn die Karte zeigt. Fester Anteil wie jede
           Ablesung, und wie jede traegt sie ihren Inhalt mittig. -->
      <div class="un-crest-id">
        <span class="un-crest-medal">
          <UniverseDisc
            :universe="props.universe"
            :state="isHere ? 'current' : 'walked'"
            :px="UNIVERSE_DISC_CREST_PX"
          />
          <span class="un-crest-roman">{{ toRoman(props.universe) }}</span>
        </span>
        <span class="un-crest-kicker">
          <span v-ink-center.y class="un-crest-v un-crest-v--id">{{
            universeLabel(props.universe)
          }}</span>
          <span v-ink-center.y class="un-crest-k"
            >{{ isHere ? 'you are here' : 'visited' }}{{ visitNote }}</span
          >
        </span>
      </div>

      <!-- Die Vorsehung IST das Gesetz dieses Universums und steht deshalb IN
           der Reihe, nicht daneben — auf einer vergangenen Bahn ebenso, seit ihr
           Wurf mit ins Archiv geht. Die Richtung haengt an `line.positive`, NIE
           am Vorzeichen: eine Achse mit `higherIsBetter: false` (Building cost)
           traegt als BUFF ein Minus. -->
      <template v-if="provLines.length">
        <div
          v-for="(line, i) in provLines"
          :key="i"
          v-tip="{ label: line.label, text: line.positive ? PROV_TIP_UP : PROV_TIP_DOWN }"
          class="un-crest-read un-crest-read--prov"
        >
          <span
            v-ink-center.y
            class="un-crest-v"
            :class="line.positive ? 'un-crest-v--up' : 'un-crest-v--down'"
          >
            <span class="un-crest-dir">{{ line.positive ? '▲' : '▼' }}</span
            >{{ line.value }}
          </span>
          <span v-ink-center.y class="un-crest-k">{{ line.label }}</span>
        </div>
      </template>
      <div
        v-else-if="provFallback"
        v-tip="{ label: 'Providence', text: PROV_TIP }"
        class="un-crest-read un-crest-read--provwide"
      >
        <span v-ink-center.y class="un-crest-v un-crest-v--name">{{ provFallback.value }}</span>
        <span v-ink-center.y class="un-crest-k">{{ provFallback.key }}</span>
      </div>

      <!-- Was DIESE Bahn hergab. -->
      <div
        v-tip="{ label: 'Galaxies', text: READ_TIPS.galaxies }"
        class="un-crest-read un-crest-read--galaxies"
      >
        <span v-ink-center.y class="un-crest-v un-crest-v--gold">{{
          props.chronicle.galaxies
        }}</span>
        <span v-ink-center.y class="un-crest-k">Galaxies</span>
      </div>
      <div
        v-tip="{ label: 'Stars', text: READ_TIPS.stars }"
        class="un-crest-read un-crest-read--stars"
      >
        <span v-ink-center.y class="un-crest-v un-crest-v--gold">
          {{ props.chronicle.rescued }}<span class="un-crest-sep">/</span
          ><span class="un-crest-lost">{{ props.chronicle.lost }}</span>
        </span>
        <span v-ink-center.y class="un-crest-k">Stars</span>
      </div>
      <div
        v-tip="{ label: 'Chimes', text: chimesTip }"
        class="un-crest-read un-crest-read--chimes"
      >
        <span class="un-crest-v un-crest-v--gold un-crest-v--art">
          <img class="un-crest-chime" :src="CHIME_IMG" alt="" aria-hidden="true" />
          <span v-ink-center.y
            >{{ chimesText
            }}<span v-if="dep" class="un-crest-goal"> / {{ formatNumber(dep.goal) }}</span></span
          >
        </span>
        <span v-ink-center.y class="un-crest-k" :class="{ 'un-crest-k--ready': dep?.etaSeconds === 0 }">
          {{ chimesKey }}
        </span>
      </div>
      <div
        v-tip="{ label: 'Elapsed', text: elapsedTip }"
        class="un-crest-read un-crest-read--elapsed"
      >
        <span v-ink-center.y class="un-crest-v un-crest-v--time">{{ elapsedText }}</span>
        <span v-ink-center.y class="un-crest-k">{{ elapsedKey }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Der Massstab jeder Schriftskala darunter. Eigenschaften DIESES Elements
   duerfen kein `cqw` benutzen — die loesten gegen den naechsten Vorfahren auf,
   nicht gegen das Band. */
.un-crest {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  height: v-bind(bandH);
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  /* Der Gurt, nicht die Regel: `universeCrest.spec.ts` rechnet nach, dass die
     Reihe in jedes Zielband passt. Reisst die Rechnung doch, endet der Ueberlauf
     an der Bandkante statt auf der Karte. `clip` statt `hidden` — der Rahmen
     traegt geparkten Inhalt. */
  overflow: clip;
  background: #16120a;
  /* Dieselbe Kante wie unter der Voyages-Kopfleiste (`.ecb`) — die beiden
     Reiterkoepfe sind gleich hoch UND gleich abgeschlossen. `box-sizing:
     border-box` (Tailwind-Preflight) haelt die Aussenhoehe bei 112. */
  border-bottom: 3px solid #5c3310;
}

/* DIE Reihe: Identitaet und alle Ablesungen sind Geschwister und stehen damit
   auf derselben Grundlinie. Vorher lag die Vorsehung in der Wappenzone, eine
   Etage unter der Kennzeile — der Stapel sprengte bei 2560 die Innenhoehe. */
.un-crest-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
}

/* Wappen */
.un-crest-id {
  /* Fester Anteil wie jede Ablesung — die Scheibe und die Kennzeile stehen
     darin, aber sie bestimmen ihn nicht. Und wie jede Ablesung traegt sie ihren
     Inhalt MITTIG: linksbuendig blieb der Rest der Zone leer, seit sie nicht
     mehr inhaltsbreit ist. */
  flex: 0 0 v-bind(shareId);
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: v-bind(idGap);
  padding: 0 v-bind(idPadX);
}

/* Dieselbe Scheibe wie in der Leiste, nur gross — das Heldenbild des Reiters.
   Kein Teller darunter: sie ist rund und braucht keinen Kasten. Mit 64 px ist
   sie das hoechste Element des Bandes; der Textstapel misst hoechstens 61. */
.un-crest-medal {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.un-crest-roman {
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

/* Die Kennzeile traegt die Gestalt einer Ablesung: Wert oben, versale
   Beschriftung darunter. Erst dadurch steht die Identitaet auf derselben
   Tintenlinie wie die Zahlen. */
.un-crest-kicker {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: v-bind(readGap);
  min-width: 0;
  white-space: nowrap;
}

/* Ablesungen */
.un-crest-read {
  /* Die Breite ist ein fester ANTEIL am Band (unten je Zone), nie der Inhalt:
     sonst schiebt jede wachsende Zahl ihre Nachbarn. Prozent-Basis, NICHT
     `flex-grow` mit `flex-basis: 0` — unter `box-sizing: border-box` floort die
     auf Polsterung plus Kante, und die Verteilung waere nicht proportional.
     `min-width: 0` ist Pflicht: der Flex-Default `auto` setzte sonst einen
     Min-Content-Boden, und die Zelle haenge doch wieder am Text. */
  flex-grow: 0;
  flex-shrink: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: v-bind(readGap);
  padding: 0 v-bind(readPadX);
  /* Derselbe Trennstrich, mit dem die Voyages-Kopfleiste ihre Zonen gliedert
     (`.ecb-rank`) — EIN Ton fuer dieselbe Aufgabe, statt zweier. */
  border-left: 1px solid #3e200a;
}

.un-crest-read--prov {
  flex-basis: v-bind(shareProv);
}

/* Ohne Achsen im Archiv nimmt EINE Ablesung den Platz der beiden — zwingend
   ihr doppelter Anteil, sonst summiert dieser Fall nicht auf 100 %. */
.un-crest-read--provwide {
  flex-basis: v-bind(shareProvWide);
}

.un-crest-read--galaxies {
  flex-basis: v-bind(shareGalaxies);
}

.un-crest-read--stars {
  flex-basis: v-bind(shareStars);
}

.un-crest-read--chimes {
  flex-basis: v-bind(shareChimes);
}

.un-crest-read--elapsed {
  flex-basis: v-bind(shareElapsed);
}

/* `v-ink-center.y` an JEDER Zahl und JEDER Beschriftung des Bandes — dasselbe
   Rezept wie im Voyages-Datenband: MedievalSharp setzt Ziffern fast vollstaendig
   ueber die Baseline, metrisch mittig heisst damit optisch zu hoch, und wie weit
   haengt an den Zeichen selbst („18 / 0" reicht hoeher als „6").

   `line-height: 1` an der Beschriftung war hier einmal gemessen und VERWORFEN —
   gegen die damals feste 10,5-px-Beschriftung machte es 1536 schlechter. Mit der
   mitwachsenden Beschriftung dreht sich das: nachgemessen faellt die
   schlechteste Abweichung von der Bandmitte auf ALLEN drei Breiten

     1536   2,50 px -> 1,25     1920   3,00 -> 1,50     2560   2,75 -> 1,25

   Die Kennzeile bekommt die Direktive seit dem Umbau an ihren beiden Spans:
   jeder ist einschriftig, und die Direktive misst mit der Schrift des Elements.
   Der Traeger `.un-crest-kicker` bleibt ohne — er umschliesst ZWEI Schriftgrade. */
/* EINE Zeilenhoehe fuer JEDE Wertzeile, unabhaengig von ihrem Grad — sonst ist
   der Stapel der Kennzeile (17–26 px) kuerzer als der einer Ablesung (25–38),
   beide werden je fuer sich zentriert, und die Beschriftungen liegen rund 7 px
   auseinander. Betrifft ebenso den festen 24-px-Grad des Vorsehungsnamens. */
.un-crest-v {
  font-size: v-bind(valueScale);
  height: v-bind(valueScale);
  line-height: v-bind(valueScale);
  font-weight: 900;
  white-space: nowrap;
}

/* Die Kennung etwas kleiner als die Zahlen und in Gold: sie ist alles, was von
   der Identitaet uebrig ist, seit der Name gefallen ist. */
.un-crest-v--id {
  font-size: v-bind(kickerScale);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8c040;
}

.un-crest-v--art {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Unter dem Schriftboden der Ablesung: darueber bestimmte das BILD die
   Zeilenhoehe. Die `-128`-Stufe traegt bis 34 px. */
.un-crest-chime {
  flex-shrink: 0;
  width: v-bind(chimeArtPx);
  height: v-bind(chimeArtPx);
  object-fit: contain;
}

.un-crest-v--gold {
  color: #e8c040;
}

/* Dieselben Toene wie im Header-Tooltip und auf der Prestige-Karte. Die
   Richtung kommt aus dem Roll, nicht aus dem Vorzeichen — eine senkende Achse
   (Building cost) traegt als BUFF ein Minus. */
.un-crest-v--up {
  color: #7fc95e;
}

.un-crest-v--down {
  color: #cc6050;
}

/* Ein Name ist kein Zaehler: fester Grad statt der Skala der Zahlen, sonst
   liefe der laengste aus seiner Ablesung heraus. */
.un-crest-v--name {
  font-size: v-bind(provNamePx);
  font-weight: 700;
  color: #c8b890;
}

.un-crest-dir {
  font-size: 0.5em;
  padding-right: 0.16em;
}

.un-crest-v--time {
  color: #ffd88a;
}

.un-crest-lost {
  color: #e08a7a;
}

/* Der Trennstrich gehoert keiner der beiden Zahlen. In voller Groesse kostete
   „ / " allein 0,72 em — bei 38 px also 27 px Zellbreite fuer ein Zeichen. */
.un-crest-sep {
  font-size: 0.55em;
  margin: 0 0.1em;
  color: #5c4a30;
}

/* Das Ziel steht klein neben der erhobenen Summe: die grosse Zahl ist die, die
   waechst. */
.un-crest-goal {
  font-size: 0.5em;
  font-weight: 400;
  color: #8a7a52;
}

.un-crest-k {
  font-size: v-bind(labelScale);
  line-height: 1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7a52;
  white-space: nowrap;
}

.un-crest-k--ready {
  color: #e8c040;
}
</style>
