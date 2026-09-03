<script setup lang="ts">
/**
 * Die Formlegende des Datenbands — fünf Chronikmarken als blanke Sonden.
 *
 * Ihre Symbole kommen aus DERSELBEN Routine wie die Karte — winzige Canvas
 * statt nachgebautem CSS, damit Legende und Karte nie auseinanderlaufen können.
 * Gemalt wird beim Mount und bei einem Wechsel der Pixeldichte, sonst nie.
 *
 * **Ohne Wörter, und das ist der Punkt.** Mit ihnen war die Reihe auf 2K 390 px
 * lang und die Marke darin halb so gross wie ihre Kachel; beides zusammen war
 * in einer Zeile nicht zu beheben. Jetzt trägt die Kachel 30 px und die Marke
 * `VOYAGE_MAP_LEGEND_R` — der Name steht im Tooltip.
 *
 * Der sitzt an der EINZELNEN Kachel, nicht an der Reihe: eine Sammelliste
 * „Freed · Lost · …" liesse die Zuordnung Symbol → Name nur über die
 * Reihenfolge erraten.
 *
 * Weder `tint` noch `coreTint` werden gesetzt, und beides ist Absicht: `tint`
 * unkonditioniert durchzureichen war der Fehler der gefallenen Fassung, und
 * ohne `coreTint` malt `star-freed` seinen Kern in `LANDMARK_FREED_CORE` —
 * dieselbe Paarung wie `.egsb-val--freed` daneben —, während `void-impact`
 * seinen violetten Schwere-Kern gar nicht erst bekommt.
 */
import { ref, watch, onMounted } from 'vue'
import { drawLandmark } from '@/utils/fx/galaxyLandmarks'
import { VOYAGE_MAP_LEGEND_ICON_PX, VOYAGE_MAP_LEGEND_R, VOYAGE_MAP_LEGEND_ROWS } from '@/config/constants'

const props = defineProps<{ dpr: number }>()

const probes = ref<(HTMLCanvasElement | null)[]>([])

const iconPx = `${VOYAGE_MAP_LEGEND_ICON_PX}px`

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
  <div class="eml">
    <span
      v-for="(row, i) in VOYAGE_MAP_LEGEND_ROWS"
      :key="row.kind"
      class="eml-row"
      v-tip="{ label: row.label, text: row.tip }"
    >
      <canvas
        :ref="(el) => (probes[i] = el as HTMLCanvasElement | null)"
        class="eml-probe"
        aria-hidden="true"
      />
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
  gap: clamp(6px, 0.7cqw, 12px);
  padding: 0 clamp(8px, 1cqw, 16px);
  white-space: nowrap;
  border-left: 1px solid rgba(122, 78, 32, 0.34);
}

/* Jede Kachel holt sich den Zeiger zurück, den `.egsb` abgibt — Muster
   `.egsb-col` / `.egsb-mod`. Sie trägt ihre eigene Blase. */
.eml-row {
  display: inline-flex;
  align-items: center;
  pointer-events: auto;
}

/* Feste Grösse: die Sonde ist auf `VOYAGE_MAP_LEGEND_ICON_PX` gerechnet und
   darf nicht mitwachsen — der Radius sitzt sonst nicht mehr in seiner Kachel. */
.eml-probe {
  display: block;
  flex: none;
  width: v-bind(iconPx);
  height: v-bind(iconPx);
}
</style>
