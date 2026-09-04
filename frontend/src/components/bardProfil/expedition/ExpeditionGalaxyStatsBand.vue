<script setup lang="ts">
/**
 * Der Fuss der Kartenbühne — was hier war und was ein Vertrag von hier bietet,
 * in einer Zeile über die volle Breite.
 *
 * **WIE MAN DIE KARTE LIEST ‖ WAS WAR ‖ WAS EIN VERTRAG HIER BIETET.**
 * Formlegende | Chronik (Sterne, Fahrten) | Payout | die vier Kosten. Die
 * Legende steht am ANFANG der Leserichtung: sie ist der Schlüssel zu allem, was
 * auf der Bühne darüber liegt, und zugleich der Schalter, der eine Markenart
 * dort ausleuchtet — in der Mitte war sie das Erste, was der Blick verlor.
 * Payout und Kosten bleiben beieinander, weil sie ZUSAMMEN der Deal sind.
 *
 * **Die Identitätszone ist gefallen.** Ziffer, Name und Stufe standen
 * vollständig ein zweites Mal in der markierten Leistenzeile, bis hin zu
 * denselben Stufen-Hexwerten. Sie leben im `aria-label` der Gruppe weiter.
 *
 * **Das Wort trägt die Richtung.** `TRAVEL` und `POWER` standen hier einmal und
 * lasen sich beide als Gewinn, obwohl nur der Chime-Ertrag einer ist: `+64%
 * POWER` neben `mighty-force` ist eine FORDERUNG an die eigene Crew. Farbe
 * trägt deshalb genau eine Aussage — den Gewinn; mint gegen rot bleibt der
 * Sterne-Ablesung vorbehalten, es ist seit dem Fall der Kartenlegende die
 * einzige verbliebene Farblegende.
 *
 * **Der Payout ist die dritte grosse Zahl.** Er ist der einzige Grund, hierhin
 * zu schicken, und steht deshalb in `VALUE_MAX` statt in `CHIP_MAX` — als
 * zweite `readColumn` teilt er die Wand der Ablesung, ohne sie zu heben.
 *
 * **Jede Ablesung erklärt sich selbst.** `.egsb` bleibt zeigerdurchlässig, nur
 * die Ablesungen holen sich `pointer-events` zurück: das Band SCHRUMPFT die
 * Fit-Box, unter ihm liegt keine Hafen- oder Sternmarke, nur das dekorative
 * Deep-Field. Ein Klick blubbert wie zuvor an `.egm`.
 *
 * `v-ink-center.y` an jeder Zahl und jedem Wort: `.egsb-val` hat
 * `line-height: 0.94`, eine Zeilenbox KLEINER als die Schriftgrösse, und
 * MedievalSharp setzt Ziffern fast vollständig über die Baseline — metrisch
 * mittig, optisch zu hoch. Ein fester em-Wert träfe nur eine Auflösung.
 *
 * Der Query-Container sitzt HIER und nicht weiter oben: `.etc-atlas` ist schon
 * einer und misst 1240–2940 px, die Bühne aber nur 628–2176.
 *
 * Die Höhe ist NICHT frei: sie wird der Fit-Box abgezogen, damit kein Hafen
 * darunter gerät (`VOYAGE_MAP_STATS_BAND_H`) — und weil die Zonen überstehen
 * dürfen, ohne dass ein `scrollHeight` es meldet, deckelt
 * `voyageBandFit.spec.ts` die Schriftgrössen dagegen.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { toRoman } from '@/utils/ui/format'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import ExpeditionMapLegend from './ExpeditionMapLegend.vue'
import {
  LANDMARK_FREED_CORE,
  UNIVERSE_TOOLTIP_IMAGES,
  VOYAGE_DEST_MODS,
  VOYAGE_MAP_STATS_ART_MAX,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_CHIP_LABEL_MAX,
  VOYAGE_MAP_STATS_CHIP_MAX,
  VOYAGE_MAP_STATS_ICON_MAX,
  VOYAGE_MAP_STATS_LABEL_MAX,
  VOYAGE_MAP_STATS_PAD_Y,
  VOYAGE_MAP_STATS_RECORD_TIPS,
  VOYAGE_MAP_STATS_SCRIM_H,
  VOYAGE_MAP_STATS_VALUE_MAX,
  VOYAGE_MAP_STATS_VALUE_MIN,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { LandmarkKind } from '@/utils/fx/galaxyLandmarks'

const props = defineProps<{
  record: CompletedGalaxyRecord
  /** Der Name, den der Spieler kennt — nur noch für das `aria-label`. */
  title: string
  tier: 'common' | 'rare' | 'epic'
  /** Schmale Bühne: die vier Kosten entfallen, Chronik und Payout bleiben. */
  compact: boolean
  /** Stufe der Formlegende: mit Wörtern, nur Sonden, oder gar nicht. */
  legendMode: 'full' | 'icons' | 'off'
  dpr: number
}>()

/** Die Legende reicht nach oben, welche Markenart die Karte ausleuchten soll. */
const emit = defineEmits<{ lit: [LandmarkKind | null] }>()

const chartStore = useExpeditionChartStore()

const rescued = computed(() => props.record.attemptResults.filter((r) => r === 'rescued').length)
const lost = computed(() => props.record.attemptResults.filter((r) => r === 'failed').length)

/** Nur noch fürs `aria-label` — im Bild trägt die Leistenzeile die Identität. */
const freedOn = computed(() => new Date(props.record.completedAt).toLocaleDateString())

/** Eigenes Artwork statt eines Iconify-Ersatzes: dieselbe Währung, dasselbe Bild. */
const CHIME_IMG = UNIVERSE_TOOLTIP_IMAGES.chimes
const RECORD_TIPS = VOYAGE_MAP_STATS_RECORD_TIPS

const progress = computed(() => chartStore.progressOf(props.record.galaxy))
const dest = computed(() => destinationFor(props.record))
const accent = computed(() => `rgb(${minimapAccentForTheme(props.record.themeIndex)})`)

/** Ein Faktor als Aussage statt als Rechnung — dasselbe `Math.round((m - 1) * 100)`,
 *  mit dem das ganze Spiel eine Wirkung schreibt. */
const asBonus = (m: number) => `${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)}%`

const payout = computed(() => ({ ...VOYAGE_DEST_MODS.payout, value: asBonus(dest.value.rewardMult) }))

/** Die ersten beiden tragen die Rechnung, die letzten zwei den Zuschnitt.
 *  Alle VIER stehen immer — sie passen bei jeder Breite, auf der die Zone
 *  überhaupt gezeigt wird (`VOYAGE_MAP_STATS_ROW_NEED_MIN`). */
const costs = computed(() => {
  const d = dest.value
  return [
    { key: 'longer', icon: 'lucide:hourglass', value: asBonus(d.durationMult), ...VOYAGE_DEST_MODS.longer },
    {
      key: 'tougher',
      icon: 'game-icons:mighty-force',
      value: asBonus(d.powerMult),
      ...VOYAGE_DEST_MODS.tougher,
    },
    {
      key: 'hazards',
      icon: 'ph:warning-fill',
      value: `${d.hazardCount}`,
      ...VOYAGE_DEST_MODS.hazards,
    },
    {
      key: 'crew',
      icon: 'game-icons:meeple-group',
      // Der Sitzwert ist ein DECKEL, kein Sollwert — ein Vertrag hier würfelt
      // zwischen einem Sitz und diesem. Das sagt das WORT, nicht ein ≤: das
      // hat MedievalSharp nicht.
      value: `${d.maxRoles}`,
      ...VOYAGE_DEST_MODS.crew,
    },
  ]
})

const bandH = `${VOYAGE_MAP_STATS_BAND_H}px`
const padY = `${VOYAGE_MAP_STATS_PAD_Y}px`
const scrimH = `${VOYAGE_MAP_STATS_SCRIM_H}px`
const valueMin = `${VOYAGE_MAP_STATS_VALUE_MIN}px`
const valueMax = `${VOYAGE_MAP_STATS_VALUE_MAX}px`
// Deckel, die `voyageBandFit.spec.ts` in dieselbe Hoehenbilanz einrechnet —
// darum von dort und nicht als Zahl im clamp.
const labelMax = `${VOYAGE_MAP_STATS_LABEL_MAX}px`
const chipMax = `${VOYAGE_MAP_STATS_CHIP_MAX}px`
const chipLabelMax = `${VOYAGE_MAP_STATS_CHIP_LABEL_MAX}px`
const iconMax = `${VOYAGE_MAP_STATS_ICON_MAX}px`
const artMax = `${VOYAGE_MAP_STATS_ART_MAX}px`

const summary = computed(
  () =>
    `${toRoman(props.record.galaxy)} ${props.title}, ${props.tier} destination · ` +
    `${rescued.value} stars freed, ${lost.value} lost · ` +
    `${progress.value.runs} voyages sent · freed ${freedOn.value}`,
)
</script>

<template>
  <div class="egsb" :style="{ '--egsb-accent': accent }">
    <span class="egsb-scrim" aria-hidden="true" />

    <div
      class="egsb-row"
      :class="{ 'egsb-row--legend': legendMode !== 'off' }"
      role="group"
      :aria-label="summary"
    >
      <!-- WIE MAN DIE KARTE LIEST ─────────────────────────────────────────── -->
      <!-- Die elastische Bahn, und sie steht ganz vorn: der Überschuss geht in
           die Lücken zwischen ihren fünf Marken statt als eine Fuge daneben.
           `key` mountet neu, wenn die Stufe wechselt — `v-tip` bindet nur beim
           Mount, ein nachgereichter Wortlaut bliebe tot. -->
      <ExpeditionMapLegend
        v-if="legendMode !== 'off'"
        :key="legendMode"
        :mode="legendMode"
        :dpr="dpr"
        @hover="emit('lit', $event)"
      />

      <!-- WAS WAR ─────────────────────────────────────────────────────────── -->
      <div class="egsb-read">
        <!-- Befreit und verloren sind EINE Ablesung: die Null bleibt STEHEN und
             wird gedämpft, damit die Reihe ihre Form nie wechselt. -->
        <section class="egsb-col" v-tip="{ label: 'Stars', text: RECORD_TIPS.stars }">
          <span v-ink-center.y class="egsb-val">
            <span class="egsb-val--freed">{{ rescued }}</span>
            <span class="egsb-slash">/</span>
            <span class="egsb-val--lost" :class="{ 'egsb-nil': !lost }">{{ lost }}</span>
          </span>
          <span v-ink-center.y class="egsb-lbl">Stars</span>
        </section>

        <section class="egsb-col" v-tip="{ label: 'Voyages', text: RECORD_TIPS.voyages }">
          <span v-ink-center.y class="egsb-val">{{ progress.runs }}</span>
          <span v-ink-center.y class="egsb-lbl">Voyages</span>
        </section>
      </div>

      <!-- DER GEWINN ──────────────────────────────────────────────────────── -->
      <!-- Die einzige farbige Ablesung des Bandes: alles andere hier ist Preis. -->
      <div class="egsb-deal">
        <section class="egsb-col" v-tip="{ label: payout.label, text: payout.tip }">
          <span class="egsb-val egsb-val--payout">
            <img class="egsb-ico egsb-ico--art" :src="CHIME_IMG" alt="" aria-hidden="true" />
            <span v-ink-center.y class="egsb-num">{{ payout.value }}</span>
          </span>
          <span v-ink-center.y class="egsb-lbl">{{ payout.label }}</span>
        </section>
      </div>

      <!-- WAS ES KOSTET ───────────────────────────────────────────────────── -->
      <!-- Jeder Chip trägt sein WORT, und das Wort trägt die Richtung: ein
           Prozentwert ohne Vorzeichen im Wortlaut ist keine Auskunft. -->
      <div v-if="!compact" class="egsb-mods">
        <span
          v-for="m in costs"
          :key="m.key"
          class="egsb-mod"
          v-tip="{ label: m.label, text: m.tip }"
        >
          <span class="egsb-mod-top">
            <Icon :icon="m.icon" class="egsb-ico" />
            <span v-ink-center.y class="egsb-num">{{ m.value }}</span>
          </span>
          <span v-ink-center.y class="egsb-lbl egsb-lbl--chip">{{ m.label }}</span>
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

/* Die Legende führt und trägt den Überschuss, den sie zwischen ihren fünf
   Marken verteilt; Chronik, Payout und Kosten hugen rechts. Ohne Legende
   bleibt es bei drei Bahnen und der Payout bekommt die elastische zurück. */
.egsb-row {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  /* Die gemeinsame Bezugslinie ist die MITTE, und das traegt erst, seit alle
     Zonen dieselbe zweizeilige Form haben: Wert ueber Wort. */
  align-items: center;
  height: v-bind(bandH);
  padding: v-bind(padY) clamp(12px, 1.5cqw, 30px);
  border-top: 1px solid rgba(122, 78, 32, 0.42);
}
/* Mit Legende ist SIE die elastische Bahn, und sie steht vorn — sie soll den
   freien Fuss belegen. Ohne sie fällt die Zuordnung um eine Bahn zurück und der
   Payout bekommt sie wieder. */
.egsb-row--legend {
  grid-template-columns: 1fr auto auto auto;
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

/* ── WAS WAR ─────────────────────────────────────────────────────────────── */
.egsb-read {
  display: flex;
  align-items: center;
}
.egsb-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  padding: 0 clamp(7px, 1.1cqw, 18px);
  /* Die Ablesung holt sich den Zeiger zurück, den `.egsb` abgibt — das Band
     schrumpft die Fit-Box, darunter liegt keine Marke. */
  pointer-events: auto;
}
/* Haarlinien statt Kästen. Die Naht zwischen Chronik und Deal trägt die
   kräftigere — sie trennt zwei Aussagen, nicht zwei Zahlen. */
.egsb-col + .egsb-col,
.egsb-mods {
  border-left: 1px solid rgba(122, 78, 32, 0.34);
}
/* Die Naht traegt die PAYOUT-SPALTE, nicht ihre Gridbahn — sie stand einmal an
   der Bahn, deren linke Kante bis zu 400 px vor dem lag, was sie abtrennt, und
   war im Browser eine Haarlinie im Nichts. Kraeftiger als die uebrigen, weil
   sie zwei Aussagen trennt und nicht zwei Zahlen. */
/* Kein `flex-end` mehr: die Bahn ist nicht mehr die elastische, der Payout
   steht ohnehin unmittelbar vor den Kosten. */
.egsb-deal {
  display: flex;
}
.egsb-deal > .egsb-col {
  border-left: 1px solid rgba(122, 78, 32, 0.62);
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
/* Der Payout stellt seine Zahl NEBEN ein Artwork, nicht auf dessen Grundlinie. */
.egsb-val--payout {
  align-items: center;
  gap: 0.22em;
  color: #e8c040;
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

/* `line-height: 1` an der Beschriftung der grossen Ablesung, und das ist kein
   Geschmack: auf `normal` ueberschiesst MedievalSharp seine Zeilenbox um die
   Haelfte (16,5 px bei 11), und dieser Vorlauf sitzt UNTER der Tinte. Der
   Stapel stand dadurch zu hoch, obwohl seine Boxen exakt mittig sassen.
   Gemessen ueber alle Zonen, schlechteste Abweichung von der Bandmitte:
   2,76 px roh, 1,75 mit `v-ink-center.y` allein, 1,00 mit beidem — und die
   Sterne, um die es ging, auf 0,00. */
.egsb-lbl {
  font-size: clamp(10px, 1.35cqw, v-bind(labelMax));
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.52);
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
/* NACH `.egsb-lbl`, nicht davor: beide haben eine Klasse Spezifitaet, also
   entscheidet die Reihenfolge. Oberhalb stehend hat dieser Block nie gegriffen
   — die Chip-Beschriftung rannte im Browser gemessen mit 11 px statt 10 und
   war von der grossen Ablesung nicht zu unterscheiden.
   `normal` bleibt hier bewusst: bei `line-height: 1` steht der Chip-Stapel
   gemessen 2,31 px zu tief, weil die kleine Zahl darueber kaum Vorlauf hat,
   den das Label ausgleichen koennte. */
.egsb-lbl--chip {
  font-size: clamp(8px, 1.1cqw, v-bind(chipLabelMax));
  line-height: normal;
  letter-spacing: 0.1em;
  color: rgba(216, 200, 160, 0.42);
}

/* ── WAS ES KOSTET ───────────────────────────────────────────────────────── */
/* `nowrap`: vier Chips müssen auf Full HD nebeneinander bleiben — umgebrochen
   wäre die Zone 87 px hoch und spränge aus dem Band. */
.egsb-mods {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(9px, 1.2cqw, 22px);
  padding-left: clamp(10px, 1.4cqw, 22px);
}
.egsb-mod {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
  pointer-events: auto;
}
/* Wärmer als die Zahlen der Chronik, aber KEIN eigener Legendenton: Farbe trägt
   in diesem Band genau eine Aussage, und das ist der Gewinn. */
.egsb-mod-top {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(12px, 1.5cqw, v-bind(chipMax));
  /* Dieselbe Rechnung wie bei `.egsb-lbl`: auf `normal` ist die Zeilenbox der
     Chip-Zahl 22,4 px bei 14,9 px Schrift, und der Vorlauf sitzt unter der
     Tinte. Gemessen fiel der Chip-Stapel damit von +1,56 / +2,00 auf −0,21 /
     +0,25 — die letzte Zone, die noch sichtbar aus der Mitte lag. */
  line-height: 1;
  font-weight: 800;
  color: rgba(230, 200, 170, 0.78);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Weisses Glyph mit dunklem Hof: die kleinen Zeichen müssen sich auf JEDEM
   Galaxienbild absetzen. Statisch, nie animiert. Grösse per CSS und nicht als
   Attribut, damit sie mitwächst. */
.egsb-ico {
  flex-shrink: 0;
  width: clamp(12px, 1.6cqw, v-bind(iconMax));
  height: clamp(12px, 1.6cqw, v-bind(iconMax));
  color: #ffffff;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 1)) drop-shadow(0 1px 2px rgba(0, 0, 0, 1));
}
/* Das Chime-Artwork trägt seine eigene Farbe und braucht den Hof nicht — der
   Glyph-Filter würde es nur zumatschen. Es steht neben einer 37-px-Zahl und
   bleibt trotzdem unter deren Zeilenbox (34,8), damit die Spalte nicht wächst. */
.egsb-ico--art {
  width: clamp(17px, 2.4cqw, v-bind(artMax));
  height: clamp(17px, 2.4cqw, v-bind(artMax));
  filter: none;
  object-fit: contain;
}
</style>
