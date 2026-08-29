<script setup lang="ts">
/**
 * Die Scheibe eines Universums — zwei gebackene Ebenen, die sich verschieden
 * schnell drehen.
 *
 * Sie steht DREIMAL im Reiter: zehnmal klein in der Leiste (34), einmal im
 * Kopfband (46) und einmal gross als Herz der Buehne (bis 420). Die
 * Zeichenarbeit liegt ganz in `utils/fx/universeDisc.ts`; hier bleiben die zwei
 * `drawImage`, die sonst dreimal geschrieben stuenden.
 *
 * Tempo UND Dichte haengen an der Kantenlaenge, nicht an festen Zahlen —
 * `universeDiscSpinSec` und `universeDiscDetail`. Bei 34 px ist beides
 * unveraendert; ohne sie waere die grosse Scheibe die kleine, 5,3-fach
 * vergroessert, und drehte am Rand mit 9,4 px/s.
 *
 * Die Drehung ist KEINE Frame-Schleife: das Sprite ist fertig, das CSS dreht
 * eine Textur am Compositor. `paintCount` der Karte ruehrt sich nicht, und
 * `.rendering-paused` friert sie bei Fokusverlust von selbst ein.
 */
import { computed, ref, watchEffect } from 'vue'
import {
  buildUniverseDisc,
  universeDiscSpinSec,
  type UniverseDiscLayer,
  type UniverseDiscState,
} from '@/utils/fx/universeDisc'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { UNIVERSE_DISC_MAX_DPR, UNIVERSE_DISC_RIM_SPIN_RATIO } from '@/config/constants'

const props = defineProps<{
  universe: number
  state: UniverseDiscState
  px: number
}>()

const fieldEl = ref<HTMLCanvasElement | null>(null)
const rimEl = ref<HTMLCanvasElement | null>(null)

/** Der Reiter wird nie abgerissen und liegt lange im Hintergrund — Chrome darf
 *  den Backing-Store dann verwerfen. Ohne rAF heilt sich das nicht von selbst. */
function paint(cv: HTMLCanvasElement | null, layer: UniverseDiscLayer) {
  if (!cv) return
  resetCanvasIfContextLost(cv)
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, UNIVERSE_DISC_MAX_DPR))
  const side = Math.max(1, Math.round(props.px * dpr))
  if (cv.width !== side || cv.height !== side) {
    cv.width = side
    cv.height = side
  }
  const ctx = cv.getContext('2d')
  const sprite = buildUniverseDisc(props.universe, props.state, layer, props.px, dpr)
  if (!ctx || !sprite) return
  ctx.clearRect(0, 0, side, side)
  ctx.drawImage(sprite, 0, 0, side, side)
}

/* Die beiden Refs sind selbst reaktiv: der Effekt laeuft vor dem Mount ins
   Leere und sofort wieder, sobald die Canvas stehen. Ein `onMounted` daneben
   waere derselbe Anstrich ein zweites Mal. */
watchEffect(() => {
  paint(fieldEl.value, 'field')
  paint(rimEl.value, 'rim')
})

/** Ein unbetretenes Feld ist reiner Radialverlauf — es zu drehen ist
 *  buchstaeblich unsichtbar, kostete aber je Scheibe eine Compositor-Ebene.
 *  Im frischen Spielstand sind das neun von zehn; genau deshalb uebernimmt dort
 *  der Wall die volle Rate (`--rim-solo`). */
const fieldTurns = computed(() => props.state !== 'unlit')

const sizePx = computed(() => `${props.px}px`)

/* Die Dauer haengt an der KANTENLAENGE, nicht an einer festen Zahl: dieselbe
   Scheibe steht mit 34, 46 und bis 420 px im Bild. */
const fieldDur = computed(() => `${universeDiscSpinSec(props.px)}s`)
const rimDur = computed(
  () => `${universeDiscSpinSec(props.px) * UNIVERSE_DISC_RIM_SPIN_RATIO}s`,
)
</script>

<template>
  <span class="uni-disc" aria-hidden="true" :style="{ width: sizePx, height: sizePx }">
    <canvas
      ref="fieldEl"
      class="uni-disc-l uni-disc-l--field"
      :class="{ 'uni-disc-l--still': !fieldTurns }"
    />
    <canvas
      ref="rimEl"
      class="uni-disc-l uni-disc-l--rim"
      :class="{ 'uni-disc-l--rim-solo': !fieldTurns }"
    />
  </span>
</template>

<style scoped>
.uni-disc {
  position: relative;
  display: block;
  flex-shrink: 0;
  border-radius: 50%;
}

/* Die Drehung sitzt auf dem <canvas> selbst, nicht auf der Huelle: eine
   laufende Transform-Animation auf einem replaced element bekommt ihre eigene
   Compositor-Ebene. Bewusst OHNE `will-change` — das legte die Ebenen schon
   beim Mount an, also genau in dem Frame, der beim Oeffnen des Reiters ohnehin
   der teuerste ist. Dieselbe Begruendung wie in `SigilSvgLayers.vue`. */
.uni-disc-l {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
}

@keyframes uni-disc-turn {
  to {
    transform: rotate(360deg);
  }
}

.uni-disc-l--field {
  animation: uni-disc-turn v-bind(fieldDur) linear infinite;
}

/* Halbes Tempo, gleiche Richtung — daraus entsteht die Tiefe. */
.uni-disc-l--rim {
  animation: uni-disc-turn v-bind(rimDur) linear infinite;
}

/* Steht das Feld, ist der Wall die EINZIGE bewegte Ebene. Dann gibt es keine
   Parallaxe zu wahren, und das halbe Tempo halbierte nur die einzige sichtbare
   Bewegung — auf neun von zehn Scheiben eines normalen Spielstands. */
.uni-disc-l--rim-solo {
  animation-duration: v-bind(fieldDur);
}

.uni-disc-l--still {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .uni-disc-l {
    animation: none;
  }
}
</style>
