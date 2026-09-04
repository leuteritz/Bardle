<script setup lang="ts">
/**
 * Die Formlegende des Datenbands — fünf Chronikmarken, Sonde und Wort.
 *
 * Ihre Symbole kommen aus DERSELBEN Routine wie die Karte — winzige Canvas
 * statt nachgebautem CSS, damit Legende und Karte nie auseinanderlaufen können.
 *
 * **Sie wächst mit der Bühne**, wie jede andere Zone des Bandes: Kachel, Wort
 * und Abstände laufen auf `clamp(…cqw…)` gegen `.egsb`. Fest gesetzt blieb auf
 * 4K der halbe Fuss leer, und auf Full HD passten die Wörter nicht daneben.
 *
 * **Deshalb der `ResizeObserver`.** Ein Canvas trägt seine Auflösung im
 * Backing-Store; auf eine grössere CSS-Fläche gezogen wäre es hochskaliert und
 * unscharf, und unscharfe Skalierung ist projektweit verboten. Der Observer
 * malt neu, sobald sich die Kachel WIRKLICH ändert — gerundet verglichen, damit
 * ein Subpixel-Zucken beim Ziehen nicht fünf Sprites neu rastert. Keine
 * Frame-Schleife: er feuert nur auf echte Grössenwechsel.
 *
 * Der Radius folgt der Kachel (`VOYAGE_MAP_LEGEND_R_RATIO`) und wird auf halbe
 * Pixel quantisiert — sonst zöge jede Zwischenbreite eigene Cache-Einträge und
 * `LANDMARK_SPRITE_CACHE_MAX` kippte in Thrashing.
 *
 * Der `v-tip` sitzt an der EINZELNEN Kachel und bleibt in BEIDEN Stufen: er
 * trägt den Satz, den das Wort nicht sagt, und ohne Wörter auch den Namen. Eine
 * Sammelliste an der Reihe liesse die Zuordnung Symbol → Name nur über die
 * Reihenfolge erraten.
 *
 * **Sie ist zugleich ein Schalter.** Wer auf eine Zeile zeigt, lässt auf der
 * Karte jede Marke dieser Art aufleuchten; das meldet EIN delegierter
 * `mouseover` an der Reihe, aufgelöst per `closest()` über `data-kind` — ein
 * Listener statt fünf, und das Muster gegen Chromes ausbleibendes `mouseout`
 * (Vorbild: `ExpeditionStarManifest`).
 *
 * Weder `tint` noch `coreTint` werden gesetzt, und beides ist Absicht: `tint`
 * unkonditioniert durchzureichen war der Fehler der gefallenen Fassung, und
 * ohne `coreTint` malt `star-freed` seinen Kern in `LANDMARK_FREED_CORE` —
 * dieselbe Paarung wie `.egsb-val--freed` daneben —, während `void-impact`
 * seinen violetten Schwere-Kern gar nicht erst bekommt.
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { drawLandmark, roundLandmarkRadius, type LandmarkKind } from '@/utils/fx/galaxyLandmarks'
import {
  VOYAGE_MAP_LEGEND_ICON_CQW,
  VOYAGE_MAP_LEGEND_ICON_MAX,
  VOYAGE_MAP_LEGEND_ICON_MIN,
  VOYAGE_MAP_LEGEND_ICON_OFFSET,
  VOYAGE_MAP_LEGEND_LABEL_CQW,
  VOYAGE_MAP_LEGEND_LABEL_MAX,
  VOYAGE_MAP_LEGEND_LABEL_MIN,
  VOYAGE_MAP_LEGEND_LABEL_OFFSET,
  VOYAGE_MAP_LEGEND_R_RATIO,
  VOYAGE_MAP_LEGEND_ROWS,
} from '@/config/constants'

const props = defineProps<{
  /** `full` trägt die Wörter, `icons` nur die Sonden. */
  mode: 'full' | 'icons'
  dpr: number
}>()

/** Auf welche Markenart der Zeiger gerade zeigt — die Karte hört mit. */
const emit = defineEmits<{ hover: [LandmarkKind | null] }>()

const probes = ref<(HTMLCanvasElement | null)[]>([])

/* Die ganze Formel entsteht hier, damit im Stylesheet keine Zahl steht — die
   Spec rechnet gegen dieselben Konstanten. Muster: `EventLogPanel`. */
const iconSize = `clamp(${VOYAGE_MAP_LEGEND_ICON_MIN}px, calc(${VOYAGE_MAP_LEGEND_ICON_CQW}cqw - ${VOYAGE_MAP_LEGEND_ICON_OFFSET}px), ${VOYAGE_MAP_LEGEND_ICON_MAX}px)`
const labelSize = `clamp(${VOYAGE_MAP_LEGEND_LABEL_MIN}px, calc(${VOYAGE_MAP_LEGEND_LABEL_CQW}cqw - ${VOYAGE_MAP_LEGEND_LABEL_OFFSET}px), ${VOYAGE_MAP_LEGEND_LABEL_MAX}px)`

function onOver(e: MouseEvent): void {
  const row = (e.target as HTMLElement | null)?.closest<HTMLElement>('.eml-row')
  emit('hover', (row?.dataset.kind as LandmarkKind | undefined) ?? null)
}

/** Zuletzt gemalte Kantenlänge — gegen sie prüft der Observer. */
let paintedAt = 0

function paint(size: number): void {
  const dpr = Math.max(1, Math.min(props.dpr || 1, 2))
  const r = roundLandmarkRadius(size / VOYAGE_MAP_LEGEND_R_RATIO)
  VOYAGE_MAP_LEGEND_ROWS.forEach((row, i) => {
    const el = probes.value[i]
    if (!el) return
    el.width = Math.round(size * dpr)
    el.height = Math.round(size * dpr)
    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    drawLandmark(ctx, row.kind, size / 2, size / 2, r, { dpr, detail: 2 })
  })
  paintedAt = size
}

/** Die gemessene Kante der ersten Kachel — alle fünf tragen dieselbe. */
function measure(): number {
  const el = probes.value[0]
  return el ? Math.round(el.getBoundingClientRect().width) : 0
}

function repaintIfChanged(): void {
  const size = measure()
  if (size > 0 && size !== paintedAt) paint(size)
}

let ro: ResizeObserver | null = null

onMounted(() => {
  repaintIfChanged()
  const first = probes.value[0]
  if (first && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(repaintIfChanged)
    ro.observe(first)
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

// Eine andere Pixeldichte braucht ein anderes Backing, ohne dass sich die
// CSS-Kante rührt — der Observer sähe das nicht.
watch(
  () => props.dpr,
  () => {
    paintedAt = 0
    repaintIfChanged()
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    class="eml"
    :class="{ 'eml--icons': mode === 'icons' }"
    @mouseover="onOver"
    @mouseleave="emit('hover', null)"
  >
    <span
      v-for="(row, i) in VOYAGE_MAP_LEGEND_ROWS"
      :key="row.kind"
      class="eml-row"
      :data-kind="row.kind"
      v-tip="{ label: row.label, text: row.tip }"
    >
      <canvas
        :ref="(el) => (probes[i] = el as HTMLCanvasElement | null)"
        class="eml-probe"
        aria-hidden="true"
      />
      <span v-if="mode === 'full'" class="eml-lbl">{{ row.label }}</span>
    </span>
  </div>
</template>

<style scoped>
/* Die SCHWACHE Haarlinie wie zwischen zwei Ablesungen — die kräftige (0.62)
   bleibt der Payout-Spalte, denn dort trennt sie zwei Aussagen. Sie steht
   RECHTS, seit die Zone am Anfang der Leserichtung sitzt; das rechte Polster
   ist derselbe zugesagte Rest wie zuvor, er trennt jetzt nur die Legende von
   der Chronik statt vom Payout. Links steht die Kante des Bandes. */
.eml {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  /* Sie sitzt in der elastischen Bahn und VERTEILT sich darin: der freie Fuss
     geht in die Lücken zwischen den Marken, statt als eine Lücke danach zu
     stehen. `gap` bleibt der Boden, unter den `space-between` nie drückt. */
  justify-content: space-between;
  gap: clamp(7px, 0.74cqw, 30px);
  padding-right: clamp(24px, 1.68cqw, 44px);
  white-space: nowrap;
  border-right: 1px solid rgba(122, 78, 32, 0.34);
}
/* Ohne Wörter rücken die Sonden enger — sonst stünde die Reihe in derselben
   Breite und hätte nichts gewonnen. */
.eml--icons {
  gap: clamp(8px, 1.1cqw, 24px);
}

/* Jede Kachel holt sich den Zeiger zurück, den `.egsb` abgibt — Muster
   `.egsb-col` / `.egsb-mod`. Sie trägt ihre eigene Blase. */
.eml-row {
  display: inline-flex;
  align-items: center;
  gap: clamp(4px, 0.45cqw, 12px);
  pointer-events: auto;
}

/* Die Kachel wächst mit der Bühne; der `ResizeObserver` im Script rastert die
   Sonde in der ECHTEN Grösse nach, statt sie hochzuskalieren. Die Skala ist
   AFFIN — die Begründung steht an den Konstanten. */
.eml-probe {
  display: block;
  flex: none;
  width: v-bind(iconSize);
  height: v-bind(iconSize);
}

/* Gleiche Skalierungsart wie die übrigen Beschriftungen, aber leiser: die
   Rangordnung trägt hier die Deckkraft und nicht die Schriftgrösse. `normal`
   wie bei `.egsb-lbl--chip` — bei `line-height: 1` sässe das Wort neben der
   Sonde zu tief. */
.eml-lbl {
  font-size: v-bind(labelSize);
  line-height: normal;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
</style>
