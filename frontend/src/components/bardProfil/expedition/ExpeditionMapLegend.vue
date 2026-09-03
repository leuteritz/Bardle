<script setup lang="ts">
/**
 * Die Formlegende des Datenbands — fünf Chronikmarken, Sonde und Wort.
 *
 * Ihre Symbole kommen aus DERSELBEN Routine wie die Karte — winzige Canvas
 * statt nachgebautem CSS, damit Legende und Karte nie auseinanderlaufen können.
 * Gemalt wird beim Mount und bei einem Wechsel der Pixeldichte, sonst nie.
 *
 * Die Sonde ist der ENGSTE Fall der ganzen Karte: `VOYAGE_MAP_LEGEND_R` mal
 * `LANDMARK_PAD_SPAN` sind 15,0 px in einer 22-px-Kachel, und `detail: 2` ist
 * erzwungen — die Legende zeigt, was die grosse Karte zeigt.
 *
 * Weder `tint` noch `coreTint` werden gesetzt, und beides ist Absicht: `tint`
 * unkonditioniert durchzureichen war der Fehler der gefallenen Fassung, und
 * ohne `coreTint` malt `star-freed` seinen Kern in `LANDMARK_FREED_CORE` —
 * dieselbe Paarung wie `.egsb-val--freed` daneben —, während `void-impact`
 * seinen violetten Schwere-Kern gar nicht erst bekommt.
 *
 * Der Aufrufer mountet sie über `:key` neu, wenn die Stufe wechselt: `v-tip`
 * bindet seine Listener nur beim Mount, ein nachgereichter Wortlaut bliebe tot.
 */
import { ref, watch, onMounted } from 'vue'
import { drawLandmark } from '@/utils/fx/galaxyLandmarks'
import {
  VOYAGE_MAP_LEGEND_ICON_PX,
  VOYAGE_MAP_LEGEND_LABEL_MAX,
  VOYAGE_MAP_LEGEND_R,
  VOYAGE_MAP_LEGEND_ROWS,
} from '@/config/constants'

const props = defineProps<{
  /** `full` trägt die Wörter, `icons` nur die Sonden. */
  mode: 'full' | 'icons'
  dpr: number
}>()

const probes = ref<(HTMLCanvasElement | null)[]>([])

/** Ohne Wörter sagt die Reihe nichts — dann trägt sie die Namen als EINE Blase. */
const iconsTip =
  props.mode === 'icons'
    ? { label: 'Map marks', text: VOYAGE_MAP_LEGEND_ROWS.map((r) => r.label).join(' · ') }
    : ''

const iconPx = `${VOYAGE_MAP_LEGEND_ICON_PX}px`
const labelMax = `${VOYAGE_MAP_LEGEND_LABEL_MAX}px`

function paint(): void {
  const size = VOYAGE_MAP_LEGEND_ICON_PX
  const dpr = Math.max(1, Math.min(props.dpr || 1, 2))
  VOYAGE_MAP_LEGEND_ROWS.forEach((row, i) => {
    const el = probes.value[i]
    if (!el) return
    el.width = Math.round(size * dpr)
    el.height = Math.round(size * dpr)
    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    drawLandmark(ctx, row.kind, size / 2, size / 2, VOYAGE_MAP_LEGEND_R, { dpr, detail: 2 })
  })
}

onMounted(paint)
watch(() => props.dpr, paint, { flush: 'post' })
</script>

<template>
  <div v-tip="iconsTip" class="eml" :class="{ 'eml--icons': mode === 'icons' }">
    <span v-for="(row, i) in VOYAGE_MAP_LEGEND_ROWS" :key="row.kind" class="eml-row">
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
   bleibt der Payout-Spalte, denn dort trennt sie zwei Aussagen. */
.eml {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: clamp(8px, 1.1cqw, 18px);
  padding: 0 clamp(7px, 1.1cqw, 18px);
  white-space: nowrap;
  border-left: 1px solid rgba(122, 78, 32, 0.34);
}
/* Nur die Sondenreihe holt sich den Zeiger zurück — sie trägt dann die einzige
   Blase. Mit Wörtern erklärt sie sich selbst und bleibt durchlässig. */
.eml--icons {
  pointer-events: auto;
  gap: clamp(6px, 0.8cqw, 12px);
}

.eml-row {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

/* Feste Grösse: die Sonde ist auf 22 px gerechnet und darf nicht mitwachsen —
   `VOYAGE_MAP_LEGEND_R` sitzt sonst nicht mehr in seiner Kachel. */
.eml-probe {
  display: block;
  flex: none;
  width: v-bind(iconPx);
  height: v-bind(iconPx);
}

/* Die leiseste Schrift des Bandes: eine Lesehilfe zur Form, keine Ablesung.
   `normal` wie bei `.egsb-lbl--chip` — bei `line-height: 1` sässe das Wort
   neben der Sonde zu tief. */
.eml-lbl {
  font-size: clamp(8px, 1.05cqw, v-bind(labelMax));
  line-height: normal;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.38);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
</style>
