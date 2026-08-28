<script setup lang="ts">
/**
 * Die Scheibe eines Universums — ein Standbild, kein Frame.
 *
 * Sie steht zweimal im Reiter: zehnmal klein in der Leiste und einmal gross im
 * Kopfband. Die Zeichenarbeit liegt ganz in `utils/fx/universeDisc.ts`; hier
 * bleibt das eine `drawImage`, das sonst zweimal geschrieben stuende.
 */
import { computed, ref, watchEffect } from 'vue'
import { buildUniverseDisc, type UniverseDiscState } from '@/utils/fx/universeDisc'
import { resetCanvasIfContextLost } from '@/utils/fx/canvasContext'
import { UNIVERSE_DISC_MAX_DPR } from '@/config/constants'

const props = defineProps<{
  universe: number
  state: UniverseDiscState
  px: number
}>()

const el = ref<HTMLCanvasElement | null>(null)

/** Der Reiter wird nie abgerissen und liegt lange im Hintergrund — Chrome darf
 *  den Backing-Store dann verwerfen. Ohne rAF heilt sich das nicht von selbst. */
function paint() {
  const cv = el.value
  if (!cv) return
  resetCanvasIfContextLost(cv)
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, UNIVERSE_DISC_MAX_DPR))
  const side = Math.max(1, Math.round(props.px * dpr))
  if (cv.width !== side || cv.height !== side) {
    cv.width = side
    cv.height = side
  }
  const ctx = cv.getContext('2d')
  const sprite = buildUniverseDisc(props.universe, props.state, props.px, dpr)
  if (!ctx || !sprite) return
  ctx.clearRect(0, 0, side, side)
  ctx.drawImage(sprite, 0, 0, side, side)
}

/* `el` ist selbst reaktiv: der Effekt laeuft vor dem Mount ins Leere und
   sofort wieder, sobald das Canvas steht. Ein `onMounted` daneben waere
   derselbe Anstrich ein zweites Mal. */
watchEffect(paint)

const sizePx = computed(() => `${props.px}px`)
</script>

<template>
  <canvas
    ref="el"
    class="uni-disc"
    aria-hidden="true"
    :style="{ width: sizePx, height: sizePx }"
  />
</template>

<style scoped>
.uni-disc {
  display: block;
  flex-shrink: 0;
  border-radius: 50%;
}
</style>
