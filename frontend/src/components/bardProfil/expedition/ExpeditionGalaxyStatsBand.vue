<script setup lang="ts">
/**
 * Der Fuss der Kartenbühne — was diese Galaxie IST und was sie gekostet hat, in
 * einer Zeile über die volle Breite.
 *
 * DREI Zonen, und die Leserichtung ist der ganze Entwurf:
 * **WER** (Ziffer, Name, Stufe, Meta) · **WIE GELAUFEN** (Sterne, Kartografie,
 * Fahrten) · **WAS ES BRINGT** (die Modifikatoren des Ziels).
 *
 * Die Identität stand einmal als eigenes Overlay oben links auf der Karte, die
 * Formlegende unten links. Beide belegten dauerhaft eine Ecke der Bühne für
 * etwas, das hier in eine Zeile passt — und die Legende erklärte eine
 * Formsprache, die man nach der ersten Galaxie kennt. Was eine Marke IST, sagt
 * seither ihr Hover-Tooltip; was die FARBEN bedeuten, sagt diese Zeile: mint
 * gegen rot ist dieselbe Paarung wie Kernfunke gegen Hülle auf der Karte.
 *
 * Befreit und verloren sind EINE Ablesung. Zwei Türme für zwei Zahlen, die man
 * nie einzeln liest, waren zwei Spalten zuviel; und das vierteilige
 * days/hrs/min/sec-Uhrwerk davor waren acht Elemente für eine Zahl, die sich
 * nie wieder ändert — sie steht jetzt als `27m 42s` in der Meta-Zeile.
 *
 * `minmax(min-content, 1fr)` in der Ablesungszone und keine geratenen Gewichte:
 * den Bedarf liest der Browser aus dem Inhalt, verteilt wird nur der Überschuss.
 * Läge das `1fr` nur aussen, driftete die Gruppe auf 4K auseinander.
 *
 * Der Query-Container sitzt HIER und nicht weiter oben: `.etc-atlas` ist schon
 * einer und misst 1240–2940 px, die Bühne aber nur 628–2176. Ohne eigenen
 * Container skalierte alles gegen den falschen Massstab.
 *
 * Die Höhe ist NICHT frei: sie wird der Fit-Box abgezogen, damit kein Hafen
 * darunter gerät (`VOYAGE_MAP_STATS_BAND_H`) — und weil die Zonen überstehen
 * dürfen, ohne dass ein `scrollHeight` es meldet, deckelt
 * `voyageBandFit.spec.ts` die Schriftgrössen dagegen. Bindend ist die
 * Kartografie-Spalte: 63,3 von 64 nutzbaren Pixeln.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { formatCompactDuration, toRoman } from '@/utils/ui/format'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  EXPEDITION_CHART_MAX,
  LANDMARK_FREED_CORE,
  MS_PER_SECOND,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_LABEL_MAX,
  VOYAGE_MAP_STATS_NAME_MAX,
  VOYAGE_MAP_STATS_NO_MAX,
  VOYAGE_MAP_STATS_PAD_Y,
  VOYAGE_MAP_STATS_TICK_H_MAX,
  VOYAGE_MAP_STATS_SCRIM_H,
  VOYAGE_MAP_STATS_VALUE_MAX,
  VOYAGE_MAP_STATS_VALUE_MIN,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

const props = defineProps<{
  record: CompletedGalaxyRecord
  /** Der Name, den der Spieler kennt — der Theme-Name der Galaxie. */
  title: string
  tier: 'common' | 'rare' | 'epic'
  /** Schmale Bühne: die Modifikatoren entfallen, die Meta verliert ihr Datum. */
  compact: boolean
  /** Breite Bühne: die Zone trägt auch Hazards und Seats. */
  wide: boolean
}>()

const chartStore = useExpeditionChartStore()

const rescued = computed(() => props.record.attemptResults.filter((r) => r === 'rescued').length)
const lost = computed(() => props.record.attemptResults.filter((r) => r === 'failed').length)

const held = computed(() => formatCompactDuration(props.record.durationSeconds * MS_PER_SECOND))
const freedOn = computed(() => new Date(props.record.completedAt).toLocaleDateString())

const progress = computed(() => chartStore.progressOf(props.record.galaxy))
const dest = computed(() => destinationFor(props.record))
const accent = computed(() => `rgb(${minimapAccentForTheme(props.record.themeIndex)})`)

/** Die ersten drei tragen die Rechnung, die letzten zwei den Zuschnitt. */
const mods = computed(() => {
  const d = dest.value
  const all = [
    {
      key: 'reward',
      icon: 'game-icons:windchimes',
      text: `×${d.rewardMult.toFixed(2)}`,
      hint: 'Reward',
    },
    {
      key: 'travel',
      icon: 'lucide:hourglass',
      text: `×${d.durationMult.toFixed(2)}`,
      hint: 'Travel time',
    },
    {
      key: 'power',
      icon: 'game-icons:mighty-force',
      text: `×${d.powerMult.toFixed(2)}`,
      hint: 'Crew power needed',
    },
    { key: 'hazard', icon: 'ph:warning-fill', text: `${d.hazardCount}`, hint: 'Hazards' },
    { key: 'seats', icon: 'game-icons:meeple-group', text: `${d.maxRoles}`, hint: 'Seats up to' },
  ]
  return props.wide ? all : all.slice(0, 3)
})

const bandH = `${VOYAGE_MAP_STATS_BAND_H}px`
const padY = `${VOYAGE_MAP_STATS_PAD_Y}px`
const scrimH = `${VOYAGE_MAP_STATS_SCRIM_H}px`
const valueMin = `${VOYAGE_MAP_STATS_VALUE_MIN}px`
const valueMax = `${VOYAGE_MAP_STATS_VALUE_MAX}px`
// Deckel, die `voyageBandFit.spec.ts` in dieselbe Hoehenbilanz einrechnet —
// darum von dort und nicht als Zahl im clamp.
const labelMax = `${VOYAGE_MAP_STATS_LABEL_MAX}px`
const tickHMax = `${VOYAGE_MAP_STATS_TICK_H_MAX}px`
const noMax = `${VOYAGE_MAP_STATS_NO_MAX}px`
const nameMax = `${VOYAGE_MAP_STATS_NAME_MAX}px`

const summary = computed(
  () =>
    `${toRoman(props.record.galaxy)} ${props.title}, ${props.tier} destination · ` +
    `${rescued.value} stars freed, ${lost.value} lost · charted ` +
    `${progress.value.charted} of ${EXPEDITION_CHART_MAX} · ` +
    `${progress.value.runs} voyages sent · freed ${freedOn.value} in ${held.value}`,
)
</script>

<template>
  <div class="egsb" :style="{ '--egsb-accent': accent }">
    <span class="egsb-scrim" aria-hidden="true" />

    <div class="egsb-row" :class="`egsb-row--${tier}`" role="group" :aria-label="summary">
      <!-- WER ─────────────────────────────────────────────────────────────── -->
      <div class="egsb-id">
        <span class="egsb-id-rule" aria-hidden="true" />
        <span class="egsb-id-no">{{ toRoman(record.galaxy) }}</span>
        <span class="egsb-id-text">
          <span class="egsb-id-name">{{ title }}</span>
          <span class="egsb-id-meta">
            <span class="egsb-id-tier">{{ tier }}</span>
            <span class="egsb-id-dot">·</span>
            {{ held }}
            <template v-if="!compact">
              <span class="egsb-id-dot">·</span>
              <Icon icon="lucide:calendar-days" class="egsb-ico egsb-ico--date" />
              {{ freedOn }}
            </template>
          </span>
        </span>
      </div>

      <!-- WIE GELAUFEN ────────────────────────────────────────────────────── -->
      <div class="egsb-read">
        <!-- Befreit und verloren sind EINE Ablesung: die Null bleibt STEHEN und
             wird gedämpft, damit die Reihe ihre Form nie wechselt. -->
        <section class="egsb-col">
          <span class="egsb-val">
            <span class="egsb-val--freed">{{ rescued }}</span>
            <span class="egsb-slash">/</span>
            <span class="egsb-val--lost" :class="{ 'egsb-nil': !lost }">{{ lost }}</span>
          </span>
          <span class="egsb-lbl">Stars</span>
        </section>

        <section class="egsb-col">
          <span class="egsb-chart" aria-hidden="true">
            <span
              v-for="i in EXPEDITION_CHART_MAX"
              :key="i"
              class="egsb-tick"
              :class="{ 'is-on': i <= progress.charted }"
            />
          </span>
          <span class="egsb-val">{{ progress.charted }}/{{ EXPEDITION_CHART_MAX }}</span>
          <span class="egsb-lbl">Charted</span>
        </section>

        <section class="egsb-col">
          <span class="egsb-val">{{ progress.runs }}</span>
          <span class="egsb-lbl">Voyages</span>
        </section>
      </div>

      <!-- WAS ES BRINGT ───────────────────────────────────────────────────── -->
      <!-- Die einzige Zone mit mehreren Zeilen: sie fächert mit der Breite von
           gestapelt zu nebeneinander auf. aria-label und kein title — das Band
           nimmt keine Zeigerereignisse entgegen. -->
      <div v-if="!compact" class="egsb-mods">
        <span v-for="m in mods" :key="m.key" class="egsb-mod" :aria-label="`${m.hint} ${m.text}`">
          <Icon :icon="m.icon" class="egsb-ico" />
          {{ m.text }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Der Massstab für alle cqw darunter. Eigene Eigenschaften dieses Elements
   dürfen KEIN cqw benutzen — die lösen gegen den nächsten Vorfahr auf. */
.egsb {
  container-type: inline-size;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
}

/* Der Verlauf reicht höher als der Textblock und läuft transparent aus — er
   verdeckt nichts und bleibt deshalb aus der Fit-Box heraus. */
.egsb-scrim {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: v-bind(scrimH);
  background: linear-gradient(
    to top,
    rgba(8, 6, 3, 0.95),
    rgba(8, 6, 3, 0.82) 46%,
    rgba(8, 6, 3, 0)
  );
}

/* Die Identität nimmt, was sie braucht, und gibt als EINZIGE nach; die
   Ablesungen bekommen den Überschuss, die Modifikatoren wieder ihren Bedarf. */
.egsb-row {
  --egsb-tier: #c89040;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, auto) 1fr auto;
  /* Die Labels liegen auf EINER Grundlinie — die Zonen sind verschieden hoch
     (Segmentleiste gegen Ziffer), zentriert saessen ihre Labels auf drei
     Hoehen. */
  align-items: end;
  height: v-bind(bandH);
  padding: v-bind(padY) clamp(12px, 1.5cqw, 30px);
  border-top: 1px solid rgba(122, 78, 32, 0.42);
}
.egsb-row--rare {
  --egsb-tier: #7aa8e0;
}
.egsb-row--epic {
  --egsb-tier: #c090e0;
}
/* Die Akzentkante der Galaxie — der einzige farbige Strich im Band. */
.egsb-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: -1px;
  width: 34%;
  height: 1px;
  background: linear-gradient(to right, var(--egsb-accent, #c89040), transparent);
}

/* ── WER ─────────────────────────────────────────────────────────────────── */
/* `baseline` und nicht `flex-end`: die Ziffer soll auf der Grundlinie des
   NAMENS sitzen, nicht auf der der Meta-Zeile — unten ausgerichtet stand sie
   eine Zeile zu tief und las sich als Fussnote statt als Nummer. */
.egsb-id {
  display: flex;
  align-items: baseline;
  gap: clamp(7px, 0.9cqw, 13px);
  min-width: 0;
  padding-right: clamp(10px, 1.4cqw, 22px);
}
/* Die Stufe als Kante statt als Kasten — sie steht neben dem Namen und braucht
   dafür keinen zweiten Rahmen im Bild. */
.egsb-id-rule {
  align-self: stretch;
  flex: none;
  width: 3px;
  border-radius: 2px;
  background: var(--egsb-tier);
}
.egsb-id-no {
  flex: none;
  font-size: clamp(18px, 2.2cqw, v-bind(noMax));
  line-height: 1;
  color: rgba(200, 144, 64, 0.5);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.egsb-id-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.egsb-id-name {
  font-size: clamp(15px, 1.9cqw, v-bind(nameMax));
  line-height: 1;
  letter-spacing: 0.04em;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.egsb-id-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(9px, 1.2cqw, v-bind(labelMax));
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(200, 184, 144, 0.62);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.egsb-id-tier {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--egsb-tier);
}
.egsb-id-dot {
  color: rgba(200, 184, 144, 0.3);
}

/* ── WIE GELAUFEN ────────────────────────────────────────────────────────── */
.egsb-read {
  display: grid;
  grid-template-columns: repeat(3, minmax(min-content, 1fr));
  align-items: end;
}
.egsb-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  min-width: 0;
  padding: 0 clamp(7px, 1.1cqw, 18px);
}
/* Haarlinien statt Kästen — zwischen den Zonen wie zwischen den Ablesungen. */
.egsb-col + .egsb-col,
.egsb-read,
.egsb-mods {
  border-left: 1px solid rgba(122, 78, 32, 0.34);
}

.egsb-val {
  display: inline-flex;
  align-items: baseline;
  font-size: clamp(v-bind(valueMin), 5.4cqw, v-bind(valueMax));
  font-weight: 800;
  line-height: 0.94;
  color: #ece0c0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
/* Die Legende zur Marke: dieselbe Konstante wie ihr Kernfunke. Weiss ginge
   hier nicht — die Standardfarbe der Zahlen ist #ece0c0, ein weisser Wert waere
   von einer gewoehnlichen Zahl nicht zu unterscheiden. */
.egsb-val--freed {
  color: v-bind(LANDMARK_FREED_CORE);
}
.egsb-val--lost {
  color: #e08a7a;
}
/* Eine leere Kategorie bleibt STEHEN — die Reihe darf ihre Form nicht wechseln. */
.egsb-nil {
  opacity: 0.32;
}
/* Der Trennstrich gehört keiner der beiden Zahlen und darf deshalb keine von
   beiden überstimmen. */
.egsb-slash {
  margin: 0 0.1em;
  font-size: 0.62em;
  font-weight: 400;
  color: rgba(236, 224, 192, 0.32);
}

.egsb-lbl {
  font-size: clamp(10px, 1.35cqw, v-bind(labelMax));
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.52);
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Fünf Segmente statt eines Balkens: bei einem Maximum von 5 ist die Stufe
   ablesbar, ein Füllstand nicht. */
.egsb-chart {
  display: flex;
  gap: 4px;
}
.egsb-tick {
  width: clamp(12px, 1.7cqw, 17px);
  height: clamp(5px, 0.6cqw, v-bind(tickHMax));
  border-radius: 2px;
  background: rgba(200, 164, 90, 0.16);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55);
  transition: background 0.3s ease;
}
.egsb-tick.is-on {
  background: linear-gradient(to bottom, #f0d080, #c89040);
}

/* ── WAS ES BRINGT ───────────────────────────────────────────────────────── */
.egsb-mods {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-end;
  justify-content: flex-end;
  gap: 4px clamp(10px, 1.3cqw, 24px);
  padding-left: clamp(10px, 1.4cqw, 22px);
}
.egsb-mod {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(13px, 1.7cqw, 18px);
  font-weight: 800;
  color: rgba(230, 220, 196, 0.72);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Weisses Glyph mit dunklem Hof: die kleinen Zeichen müssen sich auf JEDEM
   Galaxienbild absetzen. Statisch, nie animiert. Grösse per CSS und nicht als
   Attribut, damit sie mitwächst. */
.egsb-ico {
  flex-shrink: 0;
  width: clamp(12px, 1.6cqw, 17px);
  height: clamp(12px, 1.6cqw, 17px);
  color: #ffffff;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 1)) drop-shadow(0 1px 2px rgba(0, 0, 0, 1));
}
.egsb-ico--date {
  width: clamp(10px, 1.3cqw, 13px);
  height: clamp(10px, 1.3cqw, 13px);
  color: rgba(200, 184, 144, 0.8);
}
</style>
