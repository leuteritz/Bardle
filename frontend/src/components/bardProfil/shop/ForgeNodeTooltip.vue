<template>
  <div
    ref="cardEl"
    class="node-tooltip"
    :class="side === 'below' ? 'node-tooltip--below' : 'node-tooltip--above'"
    :style="cardStyle"
    aria-hidden="true"
  >
    <!-- Akzentleiste und die linke Kante der Wirkung tragen die Farbe des
         Knotens: so liest man Karte und Kreis als dasselbe Ding, ohne dass ein
         Wort es sagen müsste. Eigene Eigenschaft und nicht das `--node-color`
         des Baums — das hängt am Kreis, und der ist hier ein Geschwister, kein
         Vorfahr. -->
    <span class="tt-accent" aria-hidden="true" />

    <div class="tt-head">
      <Icon
        :icon="entry.icon"
        width="20"
        height="20"
        class="tt-icon"
        :style="{ color: entry.color }"
      />
      <span class="tt-name" :style="{ color: entry.color }">{{ entry.name }}</span>
      <span v-if="entry.state === 'maxed'" class="tt-max">✦ MAX</span>
    </div>

    <div class="tt-effect">{{ effectText }}</div>

    <!-- Ein Knoten mit mehreren Vorgängern zeigt sie ALLE, einer mit genau
         einem zeigt ihn auch. Keine Überschrift darüber: das Schloss links sagt
         dasselbe ohne ein Wort. -->
    <div v-if="reqs.length > 0" class="tt-reqs-block">
      <Icon :icon="FORGE_LOCK_ICON" width="14" height="14" class="tt-reqs-lock" />
      <ul class="tt-reqs">
        <li v-for="req in reqs" :key="req.id" :class="{ 'tt-req--met': req.met }">
          <span class="tt-req-mark">{{ req.met ? FORGE_REQ_MET_MARK : FORGE_REQ_OPEN_MARK }}</span>
          <span class="tt-req-name">{{ req.name }}</span>
          <span class="tt-req-num">{{ req.have }}/{{ req.need }}</span>
        </li>
      </ul>
    </div>
    <!-- Phase, Prestige-Tor, Gleichwuchs-Deckel: gegen die hilft kein Vorgänger,
         also steht dort ein Satz statt einer Liste — derselbe, den `lockedFor()`
         ohnehin fertig liefert. -->
    <div v-else-if="entry.lockReason !== ''" class="tt-lockchip">
      <Icon :icon="FORGE_LOCK_ICON" width="14" height="14" class="tt-lockchip-icon" />
      <span>{{ entry.lockReason }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Was der Zeiger im Sternbaum berührt — und zwar in DREI Elementen: Name,
 * Wirkung, Voraussetzungen.
 *
 * Sie trug einmal sieben Dinge, darunter Preis, Materialkacheln, Tier-Chip und
 * die nächste Stufe. Alle vier stehen gleichzeitig gross in der Kachel rechts,
 * in die die Liste beim Hover über einen KAUFBAREN Knoten von selbst rollt
 * (`ForgeUpgradesSection`) — zweimal dieselbe Zahl, eine davon kleiner. Über
 * einem GESPERRTEN Knoten rollt nichts, und dort ist der Preis auch nicht die
 * Frage, sondern was noch fehlt.
 *
 * Sie braucht KEINEN Baumknoten. `ForgeUpgradeEntry` trägt Name, Motiv und
 * Farbe bereits, und aus derselben Quelle: Baum und Liste bauen beide aus
 * `SOLAR_BRANCHES` und `FORGE_NODES`. Durchgereicht wird nur, was allein der
 * Baum weiss — die Aufklapprichtung.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { ForgeOfferReq, ForgeUpgradeEntry } from '@/types'
import {
  FORGE_LOCK_ICON,
  FORGE_NODE_TIP_EDGE_PAD_PX,
  FORGE_REQ_MET_MARK,
  FORGE_REQ_OPEN_MARK,
} from '@/config/constants'

const props = defineProps<{
  entry: ForgeUpgradeEntry
  /** Aus `isTooltipBelow()` — Bühnengeometrie, die nur der Baum kennt. */
  side: 'above' | 'below'
}>()

/**
 * Was der Satz nennt — auf Stufe 0 die Wirkung des ERSTEN Kaufs.
 *
 * `desc` setzt immer den Wert der AKTUELLEN Stufe ein, und der ist bei allem
 * Ungekauften null: „Expeditions complete 0% faster." ist die einzige Zahl auf
 * dieser Karte und sagt nichts. `nextDesc` ist derselbe Satz mit dem Wert der
 * nächsten Stufe — bei Stufe 0 also genau das, was der erste Kauf brächte.
 *
 * Gilt für ALLES auf Stufe 0, nicht nur für Gesperrtes: ein kaufbarer,
 * ungekaufter Knoten zeigt dieselbe nichtssagende Null. Ohne eigene Marke — bei
 * einem gesperrten Knoten sagen die Kreuze darunter ohnehin, dass davon nichts
 * läuft, und eine Marke wäre der vierte Textblock auf einer Karte, die gerade
 * auf drei gebracht wurde.
 *
 * Kronen tragen Klartext ohne Platzhalter; dort sind beide Sätze gleich, und
 * der Zweig fällt nicht auf.
 */
const effectText = computed(() =>
  props.entry.level === 0 ? props.entry.nextDesc : props.entry.desc,
)

/**
 * Welche Vorgänger als ZEILEN erscheinen — leer heisst: ein Vorgänger ist hier
 * nicht die Antwort.
 *
 * Die Frage war einmal wortgleich mit „trägt dieser Knoten einen Kranz", und
 * beide wurden deshalb im Baum an EINER Stelle beantwortet (`reqWreaths`). Sie
 * sind es nicht mehr, und das mit Absicht: der Kranz ist eine Marke am Kreis,
 * und ein Fächer aus EINEM Punkt ist keiner — er bleibt bei zwei Bedingungen.
 * Diese Karte dagegen IST die Antwort und zeigt schon die erste, weil die Zeile
 * „✕ Verdant Bough 0/1" kürzer ist als der Satz „Requires Verdant Bough Lv 3",
 * den sie ersetzt.
 *
 * Ausgenommen bleiben Phasen- und Prestige-Sperre — gegen die hilft kein
 * Vorgänger, und beim Prestige-Tor stünde die Liste sogar vollständig auf
 * Häkchen. Beide fallen auf den Sperr-Chip zurück, ebenso der
 * Gleichwuchs-Deckel eines Kernstrahls (`lockKind: ''` samt Sperrsatz).
 */
const reqs = computed<ForgeOfferReq[]>(() =>
  props.entry.lockKind === 'parent' ? props.entry.reqs : [],
)

/**
 * Wie weit die Karte zurückgeschoben werden muss, damit das Baumfenster sie ganz
 * zeigt — in BILDSCHIRM-Pixeln.
 *
 * Sie hängt am KNOTEN, nicht am Bild: `side` entscheidet nur, ob sie nach oben
 * oder nach unten aufklappt, und der Baum misst dafür die Lage des Knotens auf
 * der BÜHNE. Wer verschoben oder hineingezoomt hat, kann denselben Knoten
 * trotzdem an der Fensterkante stehen haben — und `.tree-viewport` schneidet mit
 * `overflow: hidden` gnadenlos ab. Ungeführt lagen 2 von 9 Karten teilweise
 * ausserhalb, eine davon um 53 px.
 *
 * `ForgeRowTooltip` hält fest: „Die Kanten kommen fertig vom Aufrufer — gemessen
 * wird nie hier." Dort stimmt das, weil nur der Aufrufer weiss, wo die ZEILE
 * steht. Hier misst die Karte ihre EIGENE Kante gegen ein Fenster, das sie
 * selbst findet — und ihr Aufrufer ist eine Schleife über 155 Knoten, der diese
 * Arbeit nicht gehört.
 *
 * EINE Messung je Karte, nie pro Frame: das `v-if` am Aufrufer lässt sie je
 * Knoten neu entstehen, `flush: 'post'` legt den Lauf hinter das Zeichnen. Die
 * vier Abhängigkeiten sind genau das, was ihre HÖHE ändern kann.
 */
const cardEl = ref<HTMLElement | null>(null)
const shift = ref({ x: 0, y: 0 })

function measure(): void {
  shift.value = { x: 0, y: 0 }
  const card = cardEl.value
  const viewport = card?.closest<HTMLElement>('.tree-viewport')
  if (!card || !viewport) return
  const c = card.getBoundingClientRect()
  const b = viewport.getBoundingClientRect()
  const pad = FORGE_NODE_TIP_EDGE_PAD_PX
  let x = 0
  if (c.left < b.left + pad) x = b.left + pad - c.left
  else if (c.right > b.right - pad) x = b.right - pad - c.right
  // Die Zoom-Leiste liegt IM Fenster und ist undurchsichtig — was unter ihr
  // steht, ist für den Spieler nicht vorhanden. Sie verkürzt das freie Feld nach
  // unten, aber nur in den Spalten, die sie wirklich belegt: dasselbe „engste
  // Band über dem Körper", nach dem `hudFreeBandOver` die Bühne fragt.
  let floor = b.bottom - pad
  const zoomBar = viewport.querySelector<HTMLElement>('.tree-zoom')
  if (zoomBar !== null) {
    const z = zoomBar.getBoundingClientRect()
    if (c.right + x > z.left - pad && c.left + x < z.right + pad) floor = Math.min(floor, z.top - pad)
  }
  let y = 0
  if (c.top < b.top + pad) y = b.top + pad - c.top
  else if (c.bottom > floor) y = floor - c.bottom
  // Passt sie zwischen Deckel und Boden nicht, gewinnt der Kopf: ein
  // abgeschnittener Fuss kostet die letzte Bedingungszeile, ein abgeschnittener
  // Kopf den Namen.
  if (c.top + y < b.top + pad) y = b.top + pad - c.top
  shift.value = { x: Math.round(x), y: Math.round(y) }
}

// `onMounted` und NICHT `{ immediate: true }` am Beobachter: der sofortige Lauf
// eines Beobachters geschieht beim Anlegen, also noch in `setup()` — die Karte
// steht dann nicht im Dokument, `cardEl` ist null, und weil sich danach keine
// Abhängigkeit mehr ändert, misst niemand je nach. Gemessen: 42 von 155 Karten
// ragten wieder aus dem Fenster.
onMounted(measure)
watch(
  () => [props.entry.id, props.entry.state, reqs.value.length, effectText.value],
  measure,
  { flush: 'post' },
)

/**
 * Farbe und Nachführung in EINEM Zug — die Farbe kommt vom Eintrag, die
 * Verschiebung aus der Messung, und beide landen als Eigenschaft an derselben
 * Karte. Kein laufender Wert: beide stehen fest, solange der Zeiger steht.
 */
const cardStyle = computed(() => ({
  '--tip-color': props.entry.color,
  '--tip-dx': `${shift.value.x}px`,
  '--tip-dy': `${shift.value.y}px`,
}))
</script>

<style scoped>
/* Drei Elemente, mehr nicht — Name, Wirkung, Voraussetzungen. Die Gestalt trägt
   die Zugehörigkeit über die Farbe des Knotens: Akzentleiste oben, linke Kante
   an der Wirkung. */
.node-tooltip {
  position: absolute;
  left: 50%;
  /* Counter-scale against the stage zoom so the tooltip always renders at a
     constant, readable screen size — regardless of zoom level or resolution.
     Ein Keyframe auf `transform` überschriebe genau diese Gegenskalierung —
     die Einblendung unten bewegt deshalb NUR die Deckkraft. */
  transform: translateX(-50%) scale(var(--inv-scale, 1))
    translate(var(--tip-dx, 0px), var(--tip-dy, 0px));
  /* 244 statt 230: der Platz für die grössere Schrift kommt aus den drei
     gestrichenen Blöcken, nicht aus der Breite. `.tree-viewport` schneidet mit
     `overflow: hidden` ab, und je breiter die Karte, desto früher trifft das
     einen Knoten am Bühnenrand. */
  width: 244px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  padding: 13px 15px 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  z-index: 30;
  pointer-events: none;
  /* Hält die Akzentleiste in den Ecken des Rahmens. */
  overflow: hidden;
  animation: forge-tip-in 90ms ease-out;
}

@keyframes forge-tip-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.node-tooltip--below {
  top: calc(100% + 10px);
  transform-origin: top center;
}

.node-tooltip--above {
  bottom: calc(100% + 10px);
  transform-origin: bottom center;
}

.tt-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, transparent, var(--tip-color, #c89040), transparent);
}

.tt-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tt-icon {
  flex-shrink: 0;
}

/* Umbrechen statt kürzen: bei diesem Schriftgrad ist ein abgeschnittener Name
   unlesbarer als eine zweite Zeile. */
.tt-name {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.4px;
  line-height: 1.2;
}

.tt-max {
  flex-shrink: 0;
  padding: 2px 6px;
  border: 1px solid rgba(232, 192, 64, 0.45);
  border-radius: 3px;
  background: rgba(232, 192, 64, 0.13);
  color: #e8c040;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

/* Die Wirkung ist der Grund, warum die Karte überhaupt aufgeht — sie bekommt
   die grösste Schrift und eine eigene Fläche. */
.tt-effect {
  padding: 9px 11px;
  border-left: 3px solid var(--tip-color, #5c3310);
  border-radius: 4px;
  background: #1b180f;
  color: #e8dcc0;
  font-size: 15px;
  line-height: 1.5;
}

.tt-reqs-block {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 11px;
  border-radius: 4px;
  background: #1b1409;
}

.tt-reqs-lock {
  flex-shrink: 0;
  margin-top: 1px;
  color: #c89040;
}

.tt-reqs {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tt-reqs li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  line-height: 16px;
  color: rgba(255, 200, 80, 0.72);
}

.tt-req--met {
  color: rgba(110, 192, 64, 0.9);
}

.tt-req-mark {
  flex-shrink: 0;
  width: 11px;
  text-align: center;
}

.tt-req-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tt-req-num {
  flex-shrink: 0;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

/* Was kein Vorgänger löst — Sonnenphase, Prestige-Tor, Gleichwuchs-Deckel. */
.tt-lockchip {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  border-radius: 4px;
  background: #1b1409;
  color: rgba(255, 200, 80, 0.78);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.tt-lockchip-icon {
  flex-shrink: 0;
  color: #c89040;
}

@media (prefers-reduced-motion: reduce) {
  /* Die Einblendung. Nur Deckkraft, aber auch die ist eine Bewegung. */
  .node-tooltip {
    animation: none;
  }
}
</style>
