<template>
  <div
    ref="cardEl"
    class="tip node-tooltip"
    :class="side === 'below' ? 'node-tooltip--below' : 'node-tooltip--above'"
    :style="cardStyle"
    aria-hidden="true"
  >
    <span class="tip-accent" aria-hidden="true" />

    <!-- Das Wort über dem Namen — nur an den zweiundzwanzig, die eine Regel
         kaufen. `.tip-state` ist die vorgesehene Klasse dafür („Einordnung:
         versal darüber") und stand in dieser Karte bisher ungenutzt.

         NICHT im Chip daneben: der trägt den Fortschritt (`✦ MAX` / `✦ FUSED`),
         und eine geschmiedete Krone ist beides gleichzeitig. -->
    <div v-if="tip.ruleLabel !== ''" class="tip-state">{{ tip.ruleLabel }}</div>

    <div class="tip-head">
      <Icon :icon="tip.icon" width="20" height="20" class="tip-ico" :style="{ color: tip.color }" />
      <span class="tip-name" :style="{ color: tip.color }">{{ tip.name }}</span>
      <span v-if="tip.chip !== ''" class="tip-chip">{{ tip.chip }}</span>
    </div>

    <div class="tip-effect">{{ tip.effect }}</div>

    <!-- Ein Knoten mit mehreren Vorgängern zeigt sie ALLE, einer mit genau
         einem zeigt ihn auch. Keine Überschrift darüber: das Schloss links sagt
         dasselbe ohne ein Wort. -->
    <div v-if="tip.reqs.length > 0" class="tip-block tip-reqs-block">
      <Icon :icon="FORGE_LOCK_ICON" width="14" height="14" class="tip-reqs-lock" />
      <ul class="tip-reqs">
        <li v-for="req in tip.reqs" :key="req.id" :class="{ 'tip-req--met': req.met }">
          <span class="tip-req-mark">{{ req.met ? FORGE_REQ_MET_MARK : FORGE_REQ_OPEN_MARK }}</span>
          <span class="tip-req-name">{{ req.name }}</span>
          <span class="tip-req-num">{{ req.have }}/{{ req.need }}</span>
        </li>
      </ul>
    </div>
    <!-- Phase, Prestige-Tor, Gleichwuchs-Deckel: gegen die hilft kein Vorgänger,
         also steht dort ein Satz statt einer Liste — derselbe, den `lockedFor()`
         ohnehin fertig liefert. -->
    <div v-else-if="tip.lockReason !== ''" class="tip-block tip-lockchip">
      <Icon :icon="FORGE_LOCK_ICON" width="14" height="14" class="tip-lockchip-icon" />
      <span>{{ tip.lockReason }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Was der Zeiger im Netz berührt: Einordnung, Name, Wirkung, Voraussetzungen.
 *
 * Sie trug einmal sieben Dinge, darunter Preis, Materialkacheln, Tier-Chip und
 * die nächste Stufe. Alle vier stehen gleichzeitig gross in der Kachel rechts,
 * in die die Liste beim Hover über einen KAUFBAREN Knoten von selbst rollt
 * (`ForgeUpgradesSection`) — zweimal dieselbe Zahl, eine davon kleiner. Über
 * einem GESPERRTEN Knoten rollt nichts, und dort ist der Preis auch nicht die
 * Frage, sondern was noch fehlt.
 *
 * **Sie beschreibt BEIDE Körperarten der Bühne.** Ein Baumknoten und eine
 * Konstellation haben keine gemeinsame Katalogform — die Fusion hat weder
 * `parentId` noch `tier`, `phase` oder Ränge. Sie in einen `ForgeUpgradeEntry`
 * zu zwingen hiesse, vier Felder zu erfinden, von denen drei falsch wären;
 * stattdessen füllen beide Seiten `ForgeTipView` (`forgeNodeTipView` /
 * `forgeFusionTipView`). Vorher trug der Fusionskörper ein natives `title` mit
 * blossem Namen, und dasselbe Netz antwortete auf denselben Zeiger in zwei
 * Sprachen.
 *
 * Durchgereicht wird nur, was allein der Baum weiss — die Aufklapprichtung.
 *
 * Ihre GESTALT liegt seit dem Umbau global als `.tip-*` in `rpg-theme.css` und
 * gehört ihr nicht allein: Zeilen- und Angebotskarte tragen dieselbe. Hier steht
 * nur noch, was allein der Baum weiss — Lage, Breite, Gegenskalierung.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { ForgeTipView } from '@/types'
import {
  FORGE_LOCK_ICON,
  FORGE_NODE_TIP_EDGE_PAD_PX,
  FORGE_REQ_MET_MARK,
  FORGE_REQ_OPEN_MARK,
  FORGE_TIP_WIDTH_PX,
} from '@/config/constants'

const props = defineProps<{
  tip: ForgeTipView
  /** Aus `isTooltipBelow()` — Bühnengeometrie, die nur der Baum kennt. */
  side: 'above' | 'below'
}>()

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
 * fünf Abhängigkeiten sind genau das, was ihre HÖHE ändern kann.
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
  () => [
    props.tip.name,
    props.tip.chip,
    props.tip.ruleLabel,
    props.tip.effect,
    props.tip.reqs.length,
    props.tip.lockReason,
  ],
  measure,
  { flush: 'post' },
)

/**
 * Farbe und Nachführung in EINEM Zug — die Farbe kommt vom Eintrag, die
 * Verschiebung aus der Messung, und beide landen als Eigenschaft an derselben
 * Karte. Kein laufender Wert: beide stehen fest, solange der Zeiger steht.
 */
const cardStyle = computed(() => ({
  '--tip-color': props.tip.color,
  '--tip-dx': `${shift.value.x}px`,
  '--tip-dy': `${shift.value.y}px`,
}))

const tipWidth = `${FORGE_TIP_WIDTH_PX}px`
</script>

<style scoped>
/* Nur die Lage. Grund, Rahmen, Kopf, Wirkungsblock und Bedingungen stehen als
   `.tip-*` global in `rpg-theme.css` — dieselbe Gestalt trägt die Zeilen- und
   die Angebotskarte. */
.node-tooltip {
  position: absolute;
  left: 50%;
  /* Counter-scale against the stage zoom so the tooltip always renders at a
     constant, readable screen size — regardless of zoom level or resolution.
     Ein Keyframe auf `transform` überschriebe genau diese Gegenskalierung —
     die Einblendung in `.tip` bewegt deshalb NUR die Deckkraft. */
  transform: translateX(-50%) scale(var(--inv-scale, 1))
    translate(var(--tip-dx, 0px), var(--tip-dy, 0px));
  /* `.tree-viewport` schneidet mit `overflow: hidden` ab, und je breiter die
     Karte, desto früher trifft das einen Knoten am Bühnenrand. */
  width: v-bind(tipWidth);
  z-index: 30;
}

.node-tooltip--below {
  top: calc(100% + 10px);
  transform-origin: top center;
}

.node-tooltip--above {
  bottom: calc(100% + 10px);
  transform-origin: bottom center;
}
</style>
