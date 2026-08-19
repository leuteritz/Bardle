<template>
  <div class="yl">
    <!-- ══════════════════════════════════════════════════
         DER RING — ein Bogen je Herkunft, die Leitzahl darin
    ══════════════════════════════════════════════════ -->
    <div class="yl-ring">
      <svg class="yl-ring-svg" viewBox="0 0 100 100" aria-hidden="true">
        <!-- Der Track trägt zwei Aussagen zugleich: er schliesst den Ring
             optisch, und wo die Geister-Zone sitzt, ist er das, was man sieht.
             Deshalb das Punktraster als Muster darüber statt einer zweiten
             Kreislinie — es ist dasselbe Zeichen wie am alten Bandende. -->
        <circle class="yl-track" cx="50" cy="50" :r="ringRadius" :stroke-width="ringStroke" />

        <!-- Ein Abzug wird ZWEILAGIG gezeichnet: erst der Bogen in Fast-Schwarz
             über volle Breite, darüber derselbe in halber. Er liest sich damit
             als ausgehöhlt statt als Beitrag — dieselbe Aussage wie die
             Schraffur des alten Balkens, aber ohne `<pattern>`, das im SVG eine
             zweite ID-Quelle wäre. Beides statisch, nichts animiert. -->
        <template v-for="arc in arcs" :key="arc.id">
          <circle
            v-if="arc.drains"
            class="yl-arc yl-arc--drain-bed"
            cx="50"
            cy="50"
            :r="ringRadius"
            :stroke-width="ringStroke"
            :stroke-dasharray="arc.dash"
            :stroke-dashoffset="arc.offset"
          />
          <circle
            class="yl-arc"
            :class="{ 'yl-arc--drain': arc.drains, 'yl-arc--lit': hoveredId === arc.id }"
            cx="50"
            cy="50"
            :r="ringRadius"
            :stroke="arc.color"
            :stroke-width="arc.drains ? ringStroke / 2 : ringStroke"
            :stroke-dasharray="arc.dash"
            :stroke-dashoffset="arc.offset"
          />
        </template>
      </svg>

      <!-- Die Zahl steht im Loch des Rings, nicht daneben: sie ist das Ergebnis
           der Bögen um sie herum, und das sagt keine Anordnung so knapp wie
           diese. Als eigenes Element über dem SVG statt als `<text>` darin —
           so erbt sie die Schrift des Projekts, ohne dass eine zweite
           Größenrechnung in viewBox-Einheiten mitgeführt werden muss. -->
      <div class="yl-total-seat">
        <span class="yl-total" :class="{ 'yl-total--long': isLongTotal }">×{{ totalText }}</span>
        <span class="yl-total-cap">{{ FORGE_YIELD_TOTAL_CAPTION }}</span>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════
         DIE SPALTE — Kopfzeile oben, Herkünfte darunter
    ══════════════════════════════════════════════════ -->
    <div class="yl-col">
      <div class="yl-head">
        <!-- EINE Zeile für zwei Zustände: der Titel, und im Hover der Hinweis
             zur berührten Herkunft. Kein schwebendes Kärtchen mehr — `.tree-panel`
             schneidet ab (`overflow: hidden`), ein Overlay bräuchte also wieder
             eine Klemmrechnung, und der Satz landet hier ohnehin genau dort, wo
             das Auge beim Lesen der Chips schon steht.
             `nowrap` + `ellipsis`: die Zeilenhöhe darf beim Wechsel nicht
             springen, sonst rückten die Chips unter dem Zeiger weg. -->
        <span v-if="hint" class="yl-head-hint">
          <span class="yl-hint-name" :style="{ color: hint.color }">{{ hint.title }}</span>
          <span v-if="hint.detail" class="yl-hint-value">{{ hint.detail }}</span>
          <span class="yl-hint-text">{{ hint.text }}</span>
        </span>
        <span v-else class="yl-head-title">{{ FORGE_YIELD_TITLE }}</span>

        <!-- Die Sonnenphase ist KEIN Faktor — `solar` im Band hängt an den fünf
             Kernstrahlen, nicht an der Phase. Sie steht hier als Kontext: sie
             sagt, welche Knoten der Baum darunter überhaupt hergibt
             (`starPhase < def.phase` → gesperrt). Deshalb abgesetzt hinter einem
             Trennstrich und leiser als der Titel. -->
        <span class="yl-phase">
          <i class="yl-phase-dot" :style="{ background: phaseColor }" />
          {{ phaseLabel }}
          <span class="yl-phase-name">{{ phaseName }}</span>
        </span>
      </div>

      <p v-if="segments.length === 0" class="yl-empty">{{ FORGE_YIELD_EMPTY }}</p>

      <!-- Jeder Chip trägt Name UND Wert, immer. Im Balken hingen beide an
           Breiten-Schwellen: wer wenig hatte, sah am wenigsten — genau
           verkehrt herum. -->
      <div v-else class="yl-chips">
        <span
          v-for="seg in segments"
          :key="seg.id"
          class="yl-chip"
          :class="{ 'yl-chip--drain': seg.drains, 'yl-chip--lit': hoveredId === seg.id }"
          :style="{ '--seg-c': seg.color }"
          @mouseenter="hoveredId = seg.id"
          @mouseleave="hoveredId = null"
        >
          <i class="yl-dot" />
          <span class="yl-chip-label">{{ seg.label }}</span>
          <span class="yl-chip-value">{{ seg.value }}</span>
        </span>

        <!-- Was noch NICHTS beiträgt. Die einzige Aussage des Kopfes, auf die
             man unmittelbar handeln kann — im frischen Spielstand sind acht von
             acht erworbenen Herkünften neutral. -->
        <span
          v-if="unused.length > 0"
          class="yl-chip yl-chip--ghost"
          @mouseenter="hoveredId = GHOST_ID"
          @mouseleave="hoveredId = null"
        >
          <i class="yl-dot" />
          <span class="yl-chip-label">{{ unused.length }} {{ FORGE_YIELD_UNUSED_LABEL }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Woher der Chime-Ertrag kommt — die einzige Auskunft, die es sonst nirgends
 * gibt.
 *
 * Der Sockel zeigte bis dahin vier Zahlen: Bestand, Chimes/Sek, Chimes/Klick
 * und einen Baum-Faktor. Die ersten drei stehen wörtlich in der Kopfzeile des
 * Spiels, und die ist sichtbar, während das Profil offen steht — das Modal
 * beginnt UNTER ihr. Geblieben ist die vierte Frage, und zwar in ganz:
 * `shopStore.calculateTotalCPS()` multipliziert ein Dutzend Faktoren, gemessen
 * kommen daraus über 99 % der CpS (Herleitung an `buildingMilestoneMultiplier`),
 * und keiner davon war irgendwo aufgeschlüsselt.
 *
 * ── Vom Balken zum RING, und von unten nach OBEN ────────────────────────────
 * Die zweite Fassung war ein waagerechtes Segment-Band am FUSS der Baumspalte.
 * Sie stimmte in der Rechnung und scheiterte an drei Dingen der Darstellung:
 *
 *   1. **Sie stand unten.** Die wichtigste Auskunft der Spalte lag dort, wo der
 *      Blick zuletzt hinkommt.
 *   2. **Die Leitzahl war das kleinste Element.** `×17,7` in 17px am rechten
 *      Rand — ausgerechnet die Zahl, um derentwillen der Sockel existiert. Sie
 *      steht jetzt im Loch des Rings, also in der Mitte dessen, was sie ergibt.
 *   3. **Namen und Werte hingen an Breiten-Schwellen.** Unter 9 % kein Wort,
 *      unter 5,5 % keine Zahl: wer wenig hatte, sah am wenigsten. Die Chips
 *      tragen jetzt beides, immer.
 *
 * Die Rechnung selbst — logarithmische Anteile, weil die Kette ein PRODUKT ist,
 * der Abzug, der vom rechten Ende frisst, und die Übersetzung in Bögen — steht
 * samt Herleitung in `utils/ui/yieldBand.ts`. Sie ist dort eine reine Funktion,
 * damit ihre Randfälle prüfbar sind. Hier bleibt nur das Binden.
 *
 * ── Was hier NICHT läuft ────────────────────────────────────────────────────
 * Kein Timer, kein rAF, kein Intervall — der Shop-Tab wird einmal gemountet und
 * danach nur per `v-show` umgeschaltet, ein Timer hier liefe für immer. Er
 * braucht auch keinen: alles hängt an Store-Werten, die sich bei einem Kauf
 * oder einem ablaufenden Buff ändern.
 *
 * Die Bögen sind bewusst NICHT animiert. Eine Transition auf `stroke-dashoffset`
 * liefe bei jedem ablaufenden Buff, und der Sprung beim Kauf ist ohnehin die
 * richtige Quittung.
 */
import { ref, computed } from 'vue'
import { useShopStore } from '@/stores/economy/shopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useSunPhaseDisplay } from '@/composables/orbit/useSunPhaseDisplay'
import { yieldBandSegments, unusedYieldSources, yieldRingArcs } from '@/utils/ui/yieldBand'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import {
  FORGE_YIELD_TITLE,
  FORGE_YIELD_EMPTY,
  FORGE_YIELD_UNUSED_LABEL,
  FORGE_YIELD_UNUSED_TITLE,
  FORGE_YIELD_TOTAL_CAPTION,
  FORGE_YIELD_TOTAL_LONG_CHARS,
  FORGE_YIELD_RING_RADIUS,
  FORGE_YIELD_RING_STROKE,
  FORGE_YIELD_RING_SIZE_PX,
  FORGE_YIELD_RING_SIZE_COMPACT_PX,
  FORGE_YIELD_TOTAL_FONT_RATIO,
  FORGE_YIELD_TOTAL_FONT_RATIO_LONG,
  FORGE_YIELD_CAPTION_FONT_RATIO,
  FORGE_YIELD_PLINTH_HEIGHT_PX,
  FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX,
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
} from '@/config/constants'

const shopStore = useShopStore()
const solarStore = useSolarUpgradeStore()

/** Kein Herkunfts-Schlüssel — die Geister-Zone ist keine Herkunft, sondern viele. */
const GHOST_ID = '__unused__'

const hoveredId = ref<string | null>(null)

/** Das Netto-Produkt der ganzen Kette. Die Zahl im Loch des Rings. */
const totalMultiplier = computed(() =>
  shopStore.cpsFactorBreakdown.reduce((product, entry) => product * entry.factor, 1),
)

/**
 * Die Leitzahl, so kurz wie das Loch im Ring es verlangt.
 *
 * Ab 1000 übernimmt `formatNumberCompact` — dieselbe Kurzform, die Kopfzeile,
 * Materialspalten und Minimap tragen. Die volle Zahl stand hier bis dahin
 * ausgeschrieben, und im Endzustand gemessen war das `×1,042,548`: zehn Zeichen,
 * die links und rechts über den Bogen hinausliefen. `×1.04M` sind sechs und
 * bleiben drin — und es ist die Schreibweise, in der der Spieler jede andere
 * Zahl des Spiels schon liest.
 */
const totalText = computed(() => {
  const m = totalMultiplier.value
  if (m < 10) return m.toFixed(2)
  if (m < 1000) return m.toFixed(1)
  return formatNumberCompact(m)
})

/** Eine Stufe kleiner, sobald die Zahl breiter wird als das Loch. */
const isLongTotal = computed(() => totalText.value.length + 1 > FORGE_YIELD_TOTAL_LONG_CHARS)

/** Die Zerlegung selbst steht in `utils/ui/yieldBand.ts` — dort ist sie prüfbar. */
const segments = computed(() => yieldBandSegments(shopStore.cpsFactorBreakdown))
const unused = computed(() => unusedYieldSources(shopStore.cpsFactorBreakdown))
const arcs = computed(() => yieldRingArcs(segments.value, unused.value.length))

/**
 * Was die Kopfzeile im Hover sagt — eine Herkunft oder die Geister-Zone.
 *
 * Beide liefern dieselbe Form, damit es nur EINEN Block im Template gibt: zwei
 * fast gleiche liefen bei der nächsten Änderung auseinander.
 */
const hint = computed(() => {
  if (hoveredId.value === GHOST_ID) {
    return {
      title: FORGE_YIELD_UNUSED_TITLE,
      detail: '',
      // Die Namen der ungenutzten Systeme SIND hier der Hinweis — welches man
      // zuerst angeht, entscheidet der Spieler, nicht der Kopf. Die KURZform,
      // dieselbe wie auf den Chips: es sind dieselben Wörter, die der Spieler
      // dort liest, sobald das System zu wirken anfängt.
      text: unused.value.map((def) => def.label).join(' · '),
      color: '#7a6a55',
    }
  }
  const seg = segments.value.find((s) => s.id === hoveredId.value)
  return seg ? { title: seg.title, detail: seg.detail, text: seg.hint, color: seg.color } : null
})

// ── Die Sonnenphase, als Kontext neben dem Titel ─────────────────────────────
// Nur abgelesen, nichts nachgerechnet: `useSunPhaseDisplay()` hält die
// Nummerierung (der Komet zählt als Phase 1), `STAR_PHASE_DATA` den Namen und
// die Kennfarbe. Dieselben zwei Quellen wie im `SunPhaseIndicator` des Headers.
const { phaseLabel } = useSunPhaseDisplay()

const phaseName = computed(() =>
  solarStore.isCometState ? COMET_PHASE_DATA.name : STAR_PHASE_DATA[solarStore.starPhase].name,
)

const phaseColor = computed(() =>
  solarStore.isCometState
    ? COMET_PHASE_DATA.accent
    : STAR_PHASE_DATA[solarStore.starPhase].phasePrimary,
)

const ringRadius = FORGE_YIELD_RING_RADIUS
const ringStroke = FORGE_YIELD_RING_STROKE

const plinthHeight = `${FORGE_YIELD_PLINTH_HEIGHT_PX}px`
const plinthHeightCompact = `${FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX}px`
const ringSize = `${FORGE_YIELD_RING_SIZE_PX}px`
const ringSizeCompact = `${FORGE_YIELD_RING_SIZE_COMPACT_PX}px`

// Die Schriftgrössen im Ring hängen an SEINER Breite, nicht an festen Pixeln —
// Begründung an `FORGE_YIELD_TOTAL_FONT_RATIO`. Einmal gerechnet und als
// `v-bind` gesetzt: sie ändern sich nur mit der Media Query, nie pro Frame.
const px = (base: number, ratio: number) => `${Math.round(base * ratio)}px`

const totalFont = px(FORGE_YIELD_RING_SIZE_PX, FORGE_YIELD_TOTAL_FONT_RATIO)
const totalFontLong = px(FORGE_YIELD_RING_SIZE_PX, FORGE_YIELD_TOTAL_FONT_RATIO_LONG)
const capFont = px(FORGE_YIELD_RING_SIZE_PX, FORGE_YIELD_CAPTION_FONT_RATIO)
const totalFontCompact = px(FORGE_YIELD_RING_SIZE_COMPACT_PX, FORGE_YIELD_TOTAL_FONT_RATIO)
const totalFontLongCompact = px(FORGE_YIELD_RING_SIZE_COMPACT_PX, FORGE_YIELD_TOTAL_FONT_RATIO_LONG)
const capFontCompact = px(FORGE_YIELD_RING_SIZE_COMPACT_PX, FORGE_YIELD_CAPTION_FONT_RATIO)
</script>

<style scoped>
/* Der Kopf liegt im Fluss ÜBER der Bühne — der Sternenhintergrund des Panels
   ist absolut positioniert und deckt sonst jedes statische Geschwister zu.

   Rahmenlos mit Goldnaht statt Kastenrand: dasselbe Mittel wie `.ps-dock` im
   Planeten-Tab, damit die Bühne darunter fast alle Höhe behält. Die Naht sitzt
   jetzt UNTEN, also zur Bühne hin — sie trennt Auskunft von Spielfeld, und die
   Trennkante ist die zur Bühne. */
.yl {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  height: v-bind(plinthHeight);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 18px;
  background: #131009;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(
      to right,
      transparent,
      #5c3310 10%,
      #c89040 30%,
      #f0d060 50%,
      #c89040 70%,
      #5c3310 90%,
      transparent
    )
    1;
}

/* ══════════════════════════════════════════════════
   RING
══════════════════════════════════════════════════ */
.yl-ring {
  position: relative;
  flex-shrink: 0;
  width: v-bind(ringSize);
  height: v-bind(ringSize);
}

/* Der Ring beginnt auf zwölf Uhr statt auf drei — dieselbe Startrichtung wie
   jeder andere Fortschrittsring im Projekt. Die Drehung liegt am SVG und nicht
   an den Kreisen: eine Drehung je Bogen wäre elf Transformationen für eine
   Aussage. */
.yl-ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  overflow: visible;
}

/* Punktraster im Track: wo kein Bogen liegt, steht die Geister-Zone, und die
   liest sich damit als „noch leer" statt als Loch. Dasselbe Zeichen, das die
   Zone im alten Band trug. */
.yl-track {
  fill: none;
  stroke: #100e08;
  stroke-dasharray: 1.6 4.2;
  opacity: 0.9;
}

.yl-arc {
  fill: none;
  /* `butt`, nicht `round`: ein runder Abschluss schöbe jeden Bogen an beiden
     Enden um die halbe Strichbreite über seine Länge hinaus — bei elf Bögen ist
     das mehr als die Lücke zwischen ihnen, und die Reihenfolge im Ring wäre
     nicht mehr ablesbar. */
  stroke-linecap: butt;
}

/* Das Bett unter einem Abzug: fast schwarz und über volle Strichbreite, damit
   der halbbreite Bogen darüber als ausgehöhlt liest statt als dünner Beitrag. */
.yl-arc--drain-bed {
  stroke: #14080f;
}

/* Welcher Bogen zum Chip unter dem Zeiger gehört. Ein statischer Umschlag mit
   Transition NUR auf `opacity` — `filter` oder `stroke-width` in einer laufenden
   Animation rasterten die Box je Frame neu (Performance-Regel 2). */
.yl-arc:not(.yl-arc--lit) {
  opacity: 0.92;
}

.yl-arc--lit {
  opacity: 1;
}

/* Die Leitzahl im Loch. `pointer-events: none`, damit sie den Bögen darunter
   nichts wegnimmt — sie ist Ergebnis, keine Schaltfläche. */
.yl-total-seat {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  pointer-events: none;
}

.yl-total {
  font-size: v-bind(totalFont);
  font-weight: 900;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Sechs Zeichen statt fuenf — `×999.9` und `×1.04M` sind die einzigen Faelle. */
.yl-total--long {
  font-size: v-bind(totalFontLong);
}

.yl-total-cap {
  font-size: v-bind(capFont);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
  color: rgba(200, 144, 64, 0.62);
  white-space: nowrap;
}

/* ══════════════════════════════════════════════════
   SPALTE
══════════════════════════════════════════════════ */
.yl-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

/* ══════════════════════════════════════════════════
   KOPFZEILE — Titel oder Hinweis links, die Phase rechts
══════════════════════════════════════════════════ */
.yl-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  line-height: 1.1;
}

.yl-head-title {
  min-width: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.6);
  white-space: nowrap;
}

/* Der Hinweis nimmt den Platz des Titels ein. `min-width: 0` plus `hidden` am
   letzten Kind: läuft der Satz über, wird SEIN Ende gekürzt — Name und Wert
   davor stehen fest, denn sie sagen, worüber überhaupt geredet wird. */
.yl-head-hint {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
}

.yl-hint-name {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
}

.yl-hint-value {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 900;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}

.yl-hint-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: rgba(232, 220, 192, 0.62);
}

/* ══════════════════════════════════════════════════
   PHASEN-CHIP — Kontext, kein Faktor

   Die Sonnenphase multipliziert NICHTS: `solar` im Ring ist
   `flightSpeedMultiplier` und hängt an den fünf Kernstrahlen. Was die Phase tut,
   ist Knoten aufsperren. Der Trennstrich davor und die gedämpfte Schrift sagen
   genau das — sie gehört zur Bühne darunter, nicht zur Rechnung daneben.
══════════════════════════════════════════════════ */
.yl-phase {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  padding-left: 14px;
  border-left: 1px solid #3a2a14;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(232, 220, 192, 0.45);
  white-space: nowrap;
}

.yl-phase-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.yl-phase-name {
  color: rgba(232, 220, 192, 0.75);
}

/* ══════════════════════════════════════════════════
   LEERZUSTAND — der Normalfall im frischen Spielstand
══════════════════════════════════════════════════ */
.yl-empty {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 220, 192, 0.4);
}

/* ══════════════════════════════════════════════════
   CHIPS — je Herkunft Name UND Wert, immer
══════════════════════════════════════════════════ */
.yl-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
  overflow: hidden;
}

.yl-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px 2px 5px;
  border-radius: 4px;
  background: #1a1610;
  box-shadow: inset 0 0 0 1px #2a2218;
  line-height: 1;
  white-space: nowrap;
  /* `default`, nicht `help` oder `pointer`: hier ist nichts anzuklicken, und
     weder ein Fragezeichen noch eine Hand sollen etwas anderes versprechen. Der
     Hinweis in der Kopfzeile hängt am `mouseenter` und erscheint davon
     unabhängig. */
  cursor: default;
}

/* Statischer Umschlag, Transition nur auf `background`/`box-shadow` beim Ein-
   und Austritt; nichts davon läuft dauernd (Performance-Regel 2). */
.yl-chip--lit {
  background: #221c12;
  box-shadow: inset 0 0 0 1px var(--seg-c, #5c3310);
}

.yl-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--seg-c, #c89040);
}

/* Ein Abzug trägt einen OFFENEN Punkt: dieselbe Farbe, aber als Ring statt als
   Fläche — er nimmt weg, wo die anderen füllen. Dasselbe Zeichen wie der
   halbbreite Bogen im Ring. */
.yl-chip--drain .yl-dot {
  background: transparent;
  box-shadow: inset 0 0 0 2px var(--seg-c, #cc6050);
}

.yl-chip-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--seg-c, #c89040);
}

.yl-chip-value {
  font-size: 11px;
  font-weight: 900;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}

.yl-chip--drain .yl-chip-value {
  color: var(--seg-c, #cc6050);
}

/* Erkennbar, aber leiser als jede echte Herkunft: der Chip zeigt eine
   Möglichkeit, keinen Bestand. */
.yl-chip--ghost {
  --seg-c: #7a6a55;
  background: #14120c;
}

.yl-chip--ghost .yl-dot {
  background: transparent;
  box-shadow: inset 0 0 0 1px #5a4a34;
}

.yl-chip--ghost .yl-chip-label {
  color: #7a6a55;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .yl {
    height: v-bind(plinthHeightCompact);
    gap: 11px;
    padding: 6px 12px;
  }

  .yl-ring {
    width: v-bind(ringSizeCompact);
    height: v-bind(ringSizeCompact);
  }

  .yl-total {
    font-size: v-bind(totalFontCompact);
  }

  .yl-total--long {
    font-size: v-bind(totalFontLongCompact);
  }

  .yl-total-cap {
    font-size: v-bind(capFontCompact);
  }

  .yl-head-title {
    font-size: 9px;
  }

  .yl-chip-label {
    font-size: 9px;
  }

  .yl-chip-value {
    font-size: 10px;
  }
}
</style>
