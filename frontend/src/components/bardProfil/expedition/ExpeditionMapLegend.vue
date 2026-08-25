<script setup lang="ts">
/**
 * Die Legende der Kartenbühne.
 *
 * Ihre Symbole kommen aus DERSELBEN Routine wie die Karte — vier winzige Canvas
 * statt nachgebautem CSS, damit Legende und Karte nie auseinanderlaufen können.
 * Gemalt wird einmal beim Mount und nur bei einem Wechsel von Pixeldichte,
 * Kurswinkel oder Themenfarbe neu.
 *
 * Die Sonde ist der ENGSTE Fall der ganzen Karte: `VOYAGE_MAP_LEGEND_R` mal
 * `LANDMARK_PAD_SPAN` sind 21,1 px in einer 22-px-Kachel, und `detail: 2` ist
 * erzwungen. Wer an einem Landmarken-Radius dreht, prüft sie zuerst.
 */
import { ref, watch, onMounted } from 'vue'
import { drawLandmark, type LandmarkKind } from '@/utils/fx/galaxyLandmarks'
import { VOYAGE_MAP_LEGEND_ICON_PX, VOYAGE_MAP_LEGEND_R } from '@/config/constants'

const props = defineProps<{
  dpr: number
  /** Richtung der ersten Etappe — nur die Portalsonde liest sie. */
  heading: number
  /** Themenakzent `"r, g, b"` — nur die Torsonde liest ihn. */
  accent: string
}>()

/**
 * „Arrival", nicht „Departure": das Portal am Aussenrand ist der Punkt, an dem
 * Bard die Galaxie BETRAT. Aufgebrochen wird seit dem Fall des Kerns am Tor,
 * und zwei Zeilen mit „departure" auf einer Karte wären eine zuviel.
 */
const ROWS: { kind: LandmarkKind; label: string }[] = [
  { kind: 'core-gate', label: "Caretaker's Gate" },
  { kind: 'departure-portal', label: 'Arrival portal' },
  { kind: 'star-freed', label: 'Star freed' },
  { kind: 'star-lost', label: 'Star lost' },
]

const probes = ref<(HTMLCanvasElement | null)[]>([])

function paint(): void {
  const size = VOYAGE_MAP_LEGEND_ICON_PX
  const dpr = Math.max(1, props.dpr)
  ROWS.forEach((row, i) => {
    const el = probes.value[i]
    if (!el) return
    el.width = Math.round(size * dpr)
    el.height = Math.round(size * dpr)
    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    // Volle Detailstufe erzwungen: die Legende zeigt, was die grosse Karte zeigt.
    drawLandmark(ctx, row.kind, size / 2, size / 2, VOYAGE_MAP_LEGEND_R, {
      dpr,
      detail: 2,
      heading: props.heading,
      tint: props.accent,
    })
  })
}

onMounted(paint)
watch(() => [props.dpr, props.heading, props.accent], paint)
</script>

<template>
  <div class="eml" aria-hidden="true">
    <div v-for="(row, i) in ROWS" :key="row.kind" class="eml-row">
      <canvas
        :ref="(el) => (probes[i] = el as HTMLCanvasElement | null)"
        class="eml-probe"
        :width="VOYAGE_MAP_LEGEND_ICON_PX"
        :height="VOYAGE_MAP_LEGEND_ICON_PX"
      />
      <span class="eml-label">{{ row.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.eml {
  position: absolute;
  left: 12px;
  /* Ueber dem Datenband, nicht an der Buehnenkante. Die Ecke bleibt, weil oben
     rechts der Herold der Zeremonie steht — dort war sie nur band-frei. */
  bottom: calc(var(--egm-band-h, 0px) + 12px);
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 10px 6px 6px;
  background: rgba(11, 8, 6, 0.82);
  border: 1px solid #3e200a;
  border-left: 3px solid #5c3310;
  border-radius: 4px;
  pointer-events: none;
}

.eml-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.eml-probe {
  display: block;
  width: v-bind('VOYAGE_MAP_LEGEND_ICON_PX + "px"');
  height: v-bind('VOYAGE_MAP_LEGEND_ICON_PX + "px"');
  flex: none;
}

.eml-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9a8a6a;
  white-space: nowrap;
}
</style>
