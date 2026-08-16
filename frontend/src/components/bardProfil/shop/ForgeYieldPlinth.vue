<template>
  <div class="yl">
    <!-- Die Kopfzeile SAGT, was darunter steht, statt es zu benennen — und das
         `=` macht aus drei Farbflächen eine Rechnung, die man von links nach
         rechts liest. -->
    <div class="yl-head">
      <span class="yl-head-title">{{ FORGE_YIELD_TITLE }}</span>
      <span v-if="segments.length > 0" class="yl-head-total">
        <span class="yl-head-eq">=</span>×{{ totalText }}
      </span>
    </div>

    <p v-if="segments.length === 0" class="yl-empty">{{ FORGE_YIELD_EMPTY }}</p>

    <div v-else class="yl-field">
      <div class="yl-band">
        <div
          v-for="seg in segments"
          :key="seg.id"
          class="yl-seg"
          :class="{ 'yl-seg--drain': seg.drains }"
          :style="{ width: `${seg.pct}%`, '--seg-c': seg.color }"
          @mouseenter="hoveredId = seg.id"
          @mouseleave="hoveredId = null"
        >
          <!-- Die Zahl steht IM Balken: vorher trug der Sockel keine einzige,
               und man musste hovern, um überhaupt etwas zu erfahren. -->
          <span v-if="seg.pct >= FORGE_YIELD_VALUE_MIN_PCT" class="yl-seg-value">
            {{ seg.value }}
          </span>
        </div>

        <!-- Was noch NICHTS beiträgt. Feste Breite, kein Teil der Rechnung —
             Begründung an `FORGE_YIELD_UNUSED_WIDTH_PCT`. -->
        <div
          v-if="unused.length > 0"
          class="yl-ghost"
          :style="{ width: `${FORGE_YIELD_UNUSED_WIDTH_PCT}%` }"
          @mouseenter="hoveredId = GHOST_ID"
          @mouseleave="hoveredId = null"
        />
      </div>

      <!-- Zweite Reihe mit denselben Breiten: das Wort steht damit unter seinem
           Segment, ohne dass eine Zahl doppelt gepflegt wird. Zu schmale
           Segmente lassen ihr Wort weg — abgeschnittene Buchstaben wären
           schlechter als keine. -->
      <div class="yl-legend">
        <span
          v-for="seg in segments"
          :key="seg.id"
          class="yl-tag"
          :style="{ width: `${seg.pct}%`, '--seg-c': seg.color }"
        >
          {{ seg.pct >= FORGE_YIELD_LABEL_MIN_PCT ? seg.label : '' }}
        </span>
        <span
          v-if="unused.length > 0"
          class="yl-tag yl-tag--ghost"
          :style="{ width: `${FORGE_YIELD_UNUSED_WIDTH_PCT}%` }"
        >
          {{ unused.length }} {{ FORGE_YIELD_UNUSED_LABEL }}
        </span>
      </div>

      <!-- Genau EINES im Bild, es existiert nur solange gezeigt wird. Es steht
           über dem Segment, auf das der Zeiger zeigt (`--tip-x`), und schwebt
           dabei ausserhalb des Flusses — im Fluss verschöbe es die Reihe unter
           dem Zeiger, und der Hover ginge im selben Frame wieder aus. -->
      <div v-if="tip" class="yl-tip" :style="{ '--seg-c': tip.color, '--tip-x': `${tip.x}%` }">
        <span class="yl-tip-head">
          <span class="yl-tip-name">{{ tip.title }}</span>
          <span class="yl-tip-value">{{ tip.detail }}</span>
        </span>
        <span class="yl-tip-hint">{{ tip.hint }}</span>
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
 * ── Was den Sockel LESBAR macht ─────────────────────────────────────────────
 * Die erste Fassung zeigte nur Farbflächen mit Namen darunter und wurde nicht
 * verstanden. Drei Dinge fehlten, alle drei stehen jetzt hier:
 *
 *   1. **Zahlen im Balken.** Jedes Segment trägt seinen Faktor. Vorher stand im
 *      ganzen Sockel keine einzige Zahl ausser der Summe — man MUSSTE hovern.
 *   2. **Ein Bezug für die Summe.** „Chime yield ×17,7" liess offen: 17,7-mal
 *      was? Jetzt sagt die Kopfzeile den Satz, und das `=` bindet ihn an die
 *      Faktoren darunter.
 *   3. **Das Ungenutzte.** Sieben von zehn Herkünften sind im frischen Stand
 *      neutral und waren damit unsichtbar. Als gedämpfte Zone am Ende sagen sie
 *      „hier ist noch Luft" — die einzige Aussage des Sockels, auf die man
 *      unmittelbar handeln kann.
 *
 * Die Rechnung selbst — logarithmische Anteile, weil die Kette ein PRODUKT ist,
 * und der Abzug, der vom rechten Ende frisst — steht samt Herleitung in
 * `utils/ui/yieldBand.ts`. Sie ist dort eine reine Funktion, damit ihre
 * Randfälle prüfbar sind. Hier bleibt nur das Binden.
 *
 * ── Was hier NICHT läuft ────────────────────────────────────────────────────
 * Kein Timer, kein rAF, kein Intervall — der Shop-Tab wird einmal gemountet und
 * danach nur per `v-show` umgeschaltet, ein Timer hier liefe für immer. Er
 * braucht auch keinen: alles hängt an Store-Werten, die sich bei einem Kauf
 * oder einem ablaufenden Buff ändern. Anders als der alte Sockel hängt hier
 * nichts mehr am Chime-BESTAND, der sekündlich tickte.
 *
 * Die Breiten sind bewusst NICHT animiert. Eine Transition auf `width` ist
 * Layout, kein Paint, und liefe bei jedem ablaufenden Buff; der Sprung beim
 * Kauf ist ohnehin die richtige Quittung.
 */
import { ref, computed } from 'vue'
import { useShopStore } from '@/stores/economy/shopStore'
import { yieldBandSegments, unusedYieldSources } from '@/utils/ui/yieldBand'
import {
  FORGE_YIELD_TITLE,
  FORGE_YIELD_EMPTY,
  FORGE_YIELD_LABEL_MIN_PCT,
  FORGE_YIELD_VALUE_MIN_PCT,
  FORGE_YIELD_UNUSED_LABEL,
  FORGE_YIELD_UNUSED_TITLE,
  FORGE_YIELD_UNUSED_WIDTH_PCT,
  FORGE_YIELD_TIP_WIDTH_PX,
  FORGE_YIELD_PLINTH_HEIGHT_PX,
  FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX,
} from '@/config/constants'

const shopStore = useShopStore()

/** Kein Herkunfts-Schlüssel — die Geister-Zone ist keine Herkunft, sondern viele. */
const GHOST_ID = '__unused__'

const hoveredId = ref<string | null>(null)

/** Das Netto-Produkt der ganzen Kette. Die Zahl in der Kopfzeile. */
const totalMultiplier = computed(() =>
  shopStore.cpsFactorBreakdown.reduce((product, entry) => product * entry.factor, 1),
)

const totalText = computed(() => {
  const m = totalMultiplier.value
  if (m < 10) return m.toFixed(2)
  if (m < 1000) return m.toFixed(1)
  return Math.round(m).toLocaleString('en-US')
})

/** Die Zerlegung selbst steht in `utils/ui/yieldBand.ts` — dort ist sie prüfbar. */
const segments = computed(() => yieldBandSegments(shopStore.cpsFactorBreakdown))
const unused = computed(() => unusedYieldSources(shopStore.cpsFactorBreakdown))

/**
 * Was das Kärtchen zeigt — ein Segment oder die Geister-Zone.
 *
 * Beide liefern dieselbe Form, damit es nur EIN Kärtchen im Template gibt: zwei
 * fast gleiche Blöcke liefen bei der nächsten Änderung auseinander.
 */
const tip = computed(() => {
  if (hoveredId.value === GHOST_ID) {
    return {
      title: FORGE_YIELD_UNUSED_TITLE,
      detail: `${unused.value.length}`,
      // Die Namen der ungenutzten Systeme SIND hier der Hinweis — welches man
      // zuerst angeht, entscheidet der Spieler, nicht der Sockel.
      //
      // Die KURZform, dieselbe wie unter den Segmenten: mit den ausgeschriebenen
      // Namen wuchs das Kärtchen bei sieben Einträgen auf drei Zeilen und deckte
      // ein gutes Stück des Baums zu. Und es sind dieselben Wörter, die der
      // Spieler im Band liest, sobald das System zu wirken anfängt.
      hint: unused.value.map((def) => def.label).join(' · '),
      color: '#7a6a55',
      // Die Zone liegt am rechten Ende und ist bereits in Bandkoordinaten —
      // sie wird nicht gestaucht (`flex-shrink: 0`), also auch nicht skaliert.
      x: 100 - FORGE_YIELD_UNUSED_WIDTH_PCT / 2,
    }
  }
  const seg = segments.value.find((s) => s.id === hoveredId.value)
  return seg ? { ...seg, x: seg.center * segmentScale.value } : null
})

/**
 * Was die Segmente vom Band tatsächlich belegen.
 *
 * `center` und `pct` rechnen auf einer Skala, auf der die Segmente ZUSAMMEN 100
 * ergeben — die Geister-Zone kommt darin nicht vor, mit Absicht (sie ist kein
 * Teil der Aufteilung). Im Band liegt sie aber daneben und nimmt ihre feste
 * Breite; Flexbox staucht die Segmente dadurch auf den Rest.
 *
 * Gemessen ohne diese Umrechnung stand das Kärtchen um bis zu 30px neben seinem
 * Segment — nicht falsch gerechnet, sondern in der falschen Skala gelesen.
 */
const segmentScale = computed(() =>
  unused.value.length > 0 ? (100 - FORGE_YIELD_UNUSED_WIDTH_PCT) / 100 : 1,
)

const plinthHeight = `${FORGE_YIELD_PLINTH_HEIGHT_PX}px`
const plinthHeightCompact = `${FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX}px`
const tipWidth = `${FORGE_YIELD_TIP_WIDTH_PX}px`
const tipHalf = `${FORGE_YIELD_TIP_WIDTH_PX / 2}px`
</script>

<style scoped>
/* Der Sockel liegt im Fluss unter der Bühne — der Sternenhintergrund des Panels
   ist absolut positioniert und deckt sonst jedes statische Geschwister zu.

   Rahmenlos mit Goldnaht statt Kastenrand: dasselbe Mittel wie `.ps-dock` im
   Planeten-Tab, damit die Bühne darüber fast alle Höhe behält.

   Eine SPALTE, nicht mehr Leitzahl-neben-Band: so bekommt das Band die volle
   Breite der Baumspalte, und die Kopfzeile steht als Satz darüber statt als
   Etikett daneben. */
.yl {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  height: v-bind(plinthHeight);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 6px 18px;
  background: #131009;
  border-top: 3px solid transparent;
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
   KOPFZEILE — der Satz links, das Ergebnis rechts
══════════════════════════════════════════════════ */
.yl-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  line-height: 1;
}

.yl-head-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.6);
  white-space: nowrap;
}

.yl-head-total {
  font-size: 17px;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Leiser als die Zahl dahinter: das `=` ist Grammatik, kein Wert. */
.yl-head-eq {
  margin-right: 5px;
  color: rgba(200, 144, 64, 0.5);
  font-weight: 700;
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
   BAND
══════════════════════════════════════════════════ */
.yl-field {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.yl-band {
  display: flex;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  background: #0d0c06;
}

/* Ein Beitrag ist gefüllt. Die Trennlinie liegt als `box-shadow: inset` INNEN
   statt als `border` — ein Rand käme zur Breite hinzu und die Reihe liefe über
   100 %. Statischer Zustand, keine laufende Animation (Performance-Regel 2). */
.yl-seg {
  height: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--seg-c, #c89040);
  box-shadow: inset -1px 0 0 rgba(13, 12, 6, 0.85);
  cursor: help;
}

/* Dunkel auf hell: jede Segmentfarbe der Tabelle ist ein heller Ton, ein weisser
   Wert darauf wäre unlesbar. Das schraffierte Abzugssegment kehrt es unten um. */
.yl-seg-value {
  font-size: 11.5px;
  font-weight: 900;
  line-height: 1;
  color: #14100a;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Ein Abzug ist schraffiert statt gefüllt: er liest sich sofort als Lücke, und
   der Verlauf ist statisch — er wird einmal gerastert und nie neu.

   Der Streifen steht GEDÄMPFT auf viel Dunkel, nicht in voller Farbe auf wenig:
   in voller Deckung las sich die Zone als Warnband und war der lauteste Punkt
   des Sockels, statt als das, was sie ist — ausgehöhlte Fläche. Das Verhältnis
   3 : 5 zugunsten des Dunklen trägt dieselbe Aussage leiser. */
.yl-seg--drain {
  background: repeating-linear-gradient(
    135deg,
    color-mix(in srgb, var(--seg-c, #cc6050) 55%, #14080f) 0 3px,
    #14080f 3px 8px
  );
}

/* Auf der Schraffur steht der Wert als PILLE, nicht als blanker Text: gemessen
   im Bild verschwand er sonst zwischen den Streifen — heller Text auf einem
   Grund, der selbst abwechselnd hell und dunkel ist, hat nirgends Kontrast. Ein
   deckender Grund darunter löst das und liest sich zugleich richtig: ein Loch
   mit seiner Größe darin. */
.yl-seg--drain .yl-seg-value {
  padding: 2px 6px;
  border-radius: 3px;
  background: #14080f;
  color: var(--seg-c, #cc6050);
}

/* Welches Segment gerade gemeint ist.
   Nicht Zierrat, sondern die Zuordnung: am äussersten Segment zieht die
   Klemmung das Kärtchen bis zu 80px nach innen (gemessen), damit es nicht aus
   der Baumspalte fällt. Ohne eine Marke AM Segment läse man es dann beim
   Nachbarn. Ein heller Innenrand statt eines Pfeils am Kärtchen — der müsste
   die Klemmung in Pixeln nachrechnen, wofür es keine Messung ohne
   ResizeObserver gibt.
   Statischer Umschlag mit Transition nur auf `box-shadow` beim Ein- und
   Austritt; nichts davon läuft dauernd (Performance-Regel 2). */
.yl-seg:hover,
.yl-ghost:hover {
  box-shadow:
    inset 0 0 0 2px #f0e0b0,
    inset -1px 0 0 rgba(13, 12, 6, 0.85);
}

/* ══════════════════════════════════════════════════
   GEISTER-ZONE — was noch nichts beiträgt
   Erkennbar, aber leiser als jedes echte Segment: sie zeigt eine Möglichkeit,
   keinen Bestand. Punktraster statt Fläche, damit sie auch ohne Farbe als
   „noch leer" liest.
══════════════════════════════════════════════════ */
.yl-ghost {
  height: 100%;
  flex-shrink: 0;
  background:
    radial-gradient(circle at center, #4a4038 1px, transparent 1.2px) 0 0 / 7px 7px,
    #100e08;
  box-shadow: inset 1px 0 0 rgba(90, 74, 52, 0.5);
  cursor: help;
}

/* ══════════════════════════════════════════════════
   BESCHRIFTUNG — dieselben Breiten wie das Band darüber
══════════════════════════════════════════════════ */
/* `line-height: 1.1` und nicht 1: bei glatter Schrifthöhe schnitt die
   `overflow: hidden` der Zelle gemessen 1px der Font-Box ab. Das `hidden` selbst
   muss bleiben — ohne es liefe ein langer Name in das Nachbarsegment. */
.yl-legend {
  display: flex;
  line-height: 1.1;
}

.yl-tag {
  min-width: 0;
  overflow: hidden;
  padding: 0 2px;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--seg-c, #c89040);
  opacity: 0.85;
}

.yl-tag--ghost {
  flex-shrink: 0;
  color: #7a6a55;
  opacity: 1;
}

/* ══════════════════════════════════════════════════
   KÄRTCHEN — die Projekt-Tooltipformel

   Es steht über dem Segment, auf das der Zeiger zeigt. Die Klemmung ist nicht
   kosmetisch: `.tree-panel` trägt `overflow: hidden`, und ein Kärtchen am
   äussersten Segment würde ohne sie abgeschnitten. Sie funktioniert nur mit
   FESTER Breite — sonst wüsste `calc()` nicht, wie weit es einrücken muss.
══════════════════════════════════════════════════ */
.yl-tip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: clamp(v-bind(tipHalf), var(--tip-x, 50%), calc(100% - v-bind(tipHalf)));
  transform: translateX(-50%);
  z-index: 10;
  width: v-bind(tipWidth);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 7px 10px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  pointer-events: none;
}

.yl-tip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.yl-tip-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--seg-c, #e8c040);
}

.yl-tip-value {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 900;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}

/* Der Satz, der aus einer Zahl eine Handlung macht: WO man dieses System
   grösser zieht. */
.yl-tip-hint {
  font-size: 11px;
  line-height: 1.3;
  color: rgba(232, 220, 192, 0.62);
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .yl {
    height: v-bind(plinthHeightCompact);
    gap: 4px;
    padding: 5px 12px;
  }

  .yl-head-title {
    font-size: 9px;
  }

  .yl-head-total {
    font-size: 15px;
  }

  .yl-band {
    height: 18px;
  }

  .yl-seg-value {
    font-size: 10.5px;
  }

  .yl-tag {
    font-size: 9px;
  }
}
</style>
