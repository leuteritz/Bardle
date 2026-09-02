<script setup lang="ts">
/**
 * Wer hier rausgeholt wurde — die Gesichter, oben links auf der Buehne.
 *
 * Der Zwilling des Datenbands: das Band am Fuss sagt WIE VIELE (`STARS 7/2`),
 * diese Reihe sagt WER. Sie traegt deshalb KEINEN Zaehler — dieselbe Zahl
 * zweimal auf einem Bild war der Grund, aus dem die Identitaetsplakette in
 * genau dieser Ecke gefallen ist. Gesichter wiederholen nichts: sie stehen
 * sonst nirgends im Reiter, und `FirmamentGalaxyTip` verweist fuer die NAMEN
 * ausdruecklich hierher.
 *
 * **Sie schrumpft die Fit-Box nicht.** Anders als beim Band liegen unter dieser
 * Ecke echte Marken — auf Full HD kann die naechste bei (73, 51) stehen.
 * Deshalb ein SCRIM und kein Kasten: was darunter liegt, steht abgedunkelt
 * weiter da statt zu verschwinden. Eine Kachel kann eine Marke ueberdecken und
 * nimmt dann deren Zeiger; erreichbar bleibt sie ueber die Fleet-Karte der
 * Kopfleiste (`jumpToMark`). Sperrzone und geschrumpfte Box sind beide
 * ausdruecklich verworfen — die eine verschoebe die Ankerplaetze archivierter
 * Galaxien, die andere naehme der Karte Breite, und Breite ist hier der Engpass.
 *
 * Der Verlauf faellt SENKRECHT und wird waagerecht maskiert, statt radial aus
 * der Ecke zu laufen: das Panel ist breit und flach, ein radialer Verlauf legte
 * seine Transparenzfront auf die Diagonale — die erste Kachel saesse auf 0,90
 * Deckkraft, die letzte auf 0,15.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { starSeatsFreedFirst } from '@/utils/ui/starSeats'
import { voyageManifestRow } from '@/utils/ui/voyageManifestRow'
import { getChampionIconPath } from '@/utils/game/champions'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  FIRMAMENT_FREED_COLOR,
  FIRMAMENT_LOST_COLOR,
  STAR_MANIFEST_ART_SIZE,
  VOYAGE_MANIFEST_ACCENT_BAR_PX,
  VOYAGE_MANIFEST_LABEL,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

const props = defineProps<{
  record: CompletedGalaxyRecord
  /** Breite der Buehne — dieselbe, die die Karte per ResizeObserver misst. */
  width: number
  /** Flugindex des gezeigten Sterns, oder null. Kommt zurueck, wenn der Zeiger
   *  auf der MARKE steht — die Verbindung gilt in beide Richtungen. */
  highlight: number | null
}>()

const emit = defineEmits<{ hover: [number | null] }>()

/**
 * EIN delegierter Listener statt einem je Kachel.
 *
 * `mouseover` blubbert und nennt bei jedem Wechsel das neue Ziel; `mouseenter`
 * an sieben Kacheln waere sieben Listener fuer dieselbe Auskunft. Das Ziel
 * traegt seinen Flugindex als `data-star` — der LISTENindex taugt nicht, weil
 * der Deckel Sitze wegwirft und die Liste Luecken hat.
 */
function onOver(e: MouseEvent) {
  const tile = (e.target as HTMLElement | null)?.closest<HTMLElement>('.esm-tile')
  const idx = tile?.dataset.star
  emit('hover', idx == null ? null : Number(idx))
}

/* EIN Deckel, und er liegt im Layout: `voyageManifestRow` weiss, wie viele
   Kacheln die Buehne traegt und ob ein Ueberlaufchip dazwischenmuss. */
const row = computed(() => voyageManifestRow(props.width, props.record.attemptResults.length))

/* Er wirft VERLORENE zuerst weg. Ein Schnitt von vorn versteckte bei fruehen
   Verlusten ausgerechnet die Geretteten hinter dem „+N". */
const seats = computed(
  () =>
    starSeatsFreedFirst(props.record.attemptResults, props.record.starManifests, row.value.seats)
      .seats,
)
const hidden = computed(() => (seats.value.length ? row.value.hidden : 0))

/** Derselbe Ton wie `--egsb-accent`: eine Buehne, ein Galaxieton. */
const accent = computed(() => `rgb(${minimapAccentForTheme(props.record.themeIndex)})`)

const art = (champion: string) => getChampionIconPath(champion, STAR_MANIFEST_ART_SIZE)

const u = computed(() => `${row.value.tile}px`)
const cellW = computed(() => `${row.value.cell}px`)
const gapPx = computed(() => `${row.value.gap}px`)
const padPx = computed(() => `${row.value.pad}px`)
const headPx = computed(() => `${row.value.headPx}px`)
const namePx = computed(() => `${row.value.namePx}px`)
const rowW = computed(() => `${row.value.width}px`)
const scrimW = computed(() => `${row.value.scrimW}px`)
const scrimH = computed(() => `${row.value.scrimH}px`)
const barPx = `${VOYAGE_MANIFEST_ACCENT_BAR_PX}px`
</script>

<template>
  <div
    class="esm"
    :style="{ '--esm-accent': accent }"
    role="group"
    :aria-label="`Star manifest — champions of galaxy ${record.galaxy}`"
  >
    <span class="esm-scrim" aria-hidden="true" />

    <div class="esm-body">
      <span class="esm-head">{{ VOYAGE_MANIFEST_LABEL }}</span>

      <ul class="esm-seats" @mouseover="onOver" @mouseleave="emit('hover', null)">
        <li
          v-for="(seat, i) in seats"
          :key="i"
          class="esm-tile"
          :class="{ 'esm-tile--lost': seat.lost, 'esm-tile--on': seat.index === highlight }"
          :data-star="seat.index"
          :style="{ '--esm-ink': seat.lost ? FIRMAMENT_LOST_COLOR : FIRMAMENT_FREED_COLOR }"
        >
          <span class="esm-art">
            <img v-if="seat.champion" :src="art(seat.champion)" :alt="seat.champion" />
            <Icon v-else icon="lucide:lock" width="24" height="24" aria-hidden="true" />
          </span>
          <span class="esm-name">{{ seat.champion ?? 'No champion' }}</span>
        </li>

        <li v-if="hidden > 0" class="esm-more">+{{ hidden }} more</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* Zeigerdurchlaessig bis auf die Kacheln — wortwoertlich die Regel von `.egsb`.
   z-index 2 wie das Datenband: ueber den Marken, damit eine Sternfangflaeche
   den Hover einer Kachel nicht schluckt. */
.esm {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;
  pointer-events: none;
}

/* Faellt senkrecht, wird waagerecht ausmaskiert. Dieselbe Tinte wie
   `.egsb-scrim`, etwas heller: unten stehen 37-px-Zahlen ueber der hellen
   Scheibe, hier deckende Portraits ueber Tiefraum. */
.esm-scrim {
  position: absolute;
  left: 0;
  top: 0;
  width: v-bind(scrimW);
  height: v-bind(scrimH);
  background: linear-gradient(
    to bottom,
    rgba(8, 6, 3, 0.88),
    rgba(8, 6, 3, 0.7) 56%,
    rgba(8, 6, 3, 0)
  );
  -webkit-mask-image: linear-gradient(to right, #000 v-bind(rowW), transparent 100%);
  mask-image: linear-gradient(to right, #000 v-bind(rowW), transparent 100%);
}

.esm-body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: v-bind(gapPx);
  padding: v-bind(padPx);
}

/* Ton und Sperrung von `.egsb-lbl` — eine Buehne, eine Stimme. Der Schatten ist
   Pflicht: die Ankersterne des Deep Field stehen AUSSERHALB der Scheibe dichter
   und heller, samt Beugungskreuz. */
.esm-head {
  position: relative;
  align-self: flex-start;
  padding-left: calc(v-bind(barPx) + 6px);
  font-size: v-bind(headPx);
  line-height: 1.15;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.52);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
/* Zugehoerigkeit als Leiste, im Idiom von `.tip-accent` — und nicht als
   Haarlinie unter der Reihe: die haette eine harte Kante an einen Rand gesetzt,
   den der Scrim absichtlich nicht hat. */
.esm-head::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: v-bind(barPx);
  background: var(--esm-accent);
}

/* Kein `flex-wrap`: die Reihe bricht nie um, dafuer sorgt der Sitzdeckel. */
.esm-seats {
  display: flex;
  align-items: flex-start;
  gap: v-bind(gapPx);
  margin: 0;
  padding: 0;
  list-style: none;
}

.esm-tile {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: v-bind(gapPx);
  width: v-bind(cellW);
  /* Nur die Kachel holt sich den Zeiger zurueck, den `.esm` abgibt. */
  pointer-events: auto;
}

.esm-art {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: v-bind(u);
  height: v-bind(u);
  /* Feste px und NICHT `em`: ein mitwachsender Radius risse auf 4K die
     4-5-px-Grenze des Hauses. */
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--esm-ink) 62%, #1c1c18);
  background: #1c1c18;
  overflow: hidden;
  color: rgba(232, 220, 192, 0.5);
}

.esm-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Statischer Zustand, keine laufende Animation — wortwoertlich die Behandlung
   von `.fgt-seat--lost` und `.stt-champ--lost`. */
.esm-tile--lost .esm-art img {
  filter: grayscale(70%);
  opacity: 0.62;
}

/* Die Gegenrichtung: der Zeiger steht auf der MARKE, das Gesicht antwortet.
   Dieselbe Geste wie am Stern — kraeftigere Kante und ein Schritt nach vorn,
   kein Dauerlaeufer. Nicht `:hover`, weil die Klasse auch von aussen kommt. */
.esm-art {
  transition: transform 0.14s ease;
}
.esm-tile--on .esm-art {
  transform: scale(1.08);
  border-color: var(--esm-ink);
}
.esm-tile--on .esm-name {
  color: #f2e2b0;
}
/* Die Graustufe des verlorenen Sterns bleibt AUCH hervorgehoben — sie ist seine
   Bedeutung, nicht seine Ruhestellung. */

@media (prefers-reduced-motion: reduce) {
  .esm-art {
    transition: none;
  }
}

.esm-name {
  max-width: 100%;
  font-size: v-bind(namePx);
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(236, 224, 192, 0.86);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.esm-more {
  align-self: center;
  padding-left: 2px;
  font-size: v-bind(headPx);
  line-height: 1.15;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.52);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
</style>
