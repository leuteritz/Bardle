<template>
  <div class="yl">
    <!-- Die Leitzahl. Sie ist das ERGEBNIS des Bandes daneben, nicht eine
         weitere Ablesung: was rechts in Segmente zerfällt, steht hier als eine
         Zahl. -->
    <div class="yl-lead">
      <span class="yl-lead-label">{{ FORGE_YIELD_TITLE }}</span>
      <span class="yl-lead-value">×{{ totalText }}</span>
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
      </div>

      <!-- Genau EINES im Bild, es existiert nur solange gezeigt wird. Schwebt
           über dem Band statt darin — im Fluss verschöbe es die Reihe unter dem
           Zeiger, und der Hover ginge im selben Frame wieder aus. -->
      <div v-if="hovered" class="yl-tip" :style="{ '--seg-c': hovered.color }">
        <span class="yl-tip-name">{{ hovered.title }}</span>
        <span class="yl-tip-value">{{ hovered.detail }}</span>
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
import { yieldBandSegments } from '@/utils/ui/yieldBand'
import {
  FORGE_YIELD_TITLE,
  FORGE_YIELD_EMPTY,
  FORGE_YIELD_LABEL_MIN_PCT,
  FORGE_YIELD_PLINTH_HEIGHT_PX,
  FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX,
} from '@/config/constants'

const shopStore = useShopStore()

const hoveredId = ref<string | null>(null)

/** Das Netto-Produkt der ganzen Kette. Die Zahl links. */
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

const hovered = computed(() => segments.value.find((s) => s.id === hoveredId.value) ?? null)

const plinthHeight = `${FORGE_YIELD_PLINTH_HEIGHT_PX}px`
const plinthHeightCompact = `${FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX}px`
</script>

<style scoped>
/* Der Sockel liegt im Fluss unter der Bühne — der Sternenhintergrund des Panels
   ist absolut positioniert und deckt sonst jedes statische Geschwister zu.

   Rahmenlos mit Goldnaht statt Kastenrand: dasselbe Mittel wie `.ps-dock` im
   Planeten-Tab, damit die Bühne darüber fast alle Höhe behält. */
.yl {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  height: v-bind(plinthHeight);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
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
   LEITZAHL
══════════════════════════════════════════════════ */
.yl-lead {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.yl-lead-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  color: rgba(200, 144, 64, 0.55);
  white-space: nowrap;
}

.yl-lead-value {
  font-size: 19px;
  font-weight: 900;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.yl-band {
  display: flex;
  height: 14px;
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
  background: var(--seg-c, #c89040);
  box-shadow: inset -1px 0 0 rgba(13, 12, 6, 0.85);
  cursor: help;
}

.yl-seg:last-child {
  box-shadow: none;
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

/* ══════════════════════════════════════════════════
   BESCHRIFTUNG — dieselben Breiten wie das Band darüber
══════════════════════════════════════════════════ */
.yl-legend {
  display: flex;
  line-height: 1;
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

/* ══════════════════════════════════════════════════
   KÄRTCHEN — die Projekt-Tooltipformel
══════════════════════════════════════════════════ */
.yl-tip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 10;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  pointer-events: none;
  white-space: nowrap;
}

.yl-tip-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--seg-c, #e8c040);
}

.yl-tip-value {
  font-size: 12px;
  font-weight: 900;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .yl {
    height: v-bind(plinthHeightCompact);
    gap: 12px;
    padding: 0 12px;
  }

  .yl-lead-value {
    font-size: 16.5px;
  }

  .yl-band {
    height: 12px;
  }

  .yl-tag {
    font-size: 9px;
  }
}
</style>
