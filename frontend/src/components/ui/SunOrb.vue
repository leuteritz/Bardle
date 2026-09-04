<template>
  <span ref="host" class="sun-orb" :class="`sun-orb--${body.kind}`" :style="vars" aria-hidden="true">
    <template v-if="body.kind === 'blackHole'">
      <span class="sun-slot sun-orb__bh-halo" data-layer="bhHalo" />
      <span class="sun-orb__tilt"><span class="sun-slot sun-orb__bh-disc" data-layer="bhDisc" /></span>
      <span class="sun-slot sun-orb__bh-shadow" data-layer="bhShadow" />
    </template>
    <span v-else class="sun-slot sun-orb__core" data-layer="core" />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SunBody, SunSpriteLayer } from '@/types'
import {
  BLACK_HOLE_DISC_TILT,
  COMET_DISC_FILL,
  SUN_ORB_SPRITE_PX,
  SUN_SPRITE_BODY_FRACTION,
} from '@/config/constants'
import { mountSunSprites } from '@/utils/fx/sunBodySprite'

/**
 * Der Spielerkörper in Miniatur — Header-Orb und die Sieben-Kugel-Leiter des
 * Tooltips. Dieselben Painter wie im Orbit auf Detailstufe 0; der Körper füllt
 * den Kreis des Elternteils, deshalb ist der Kern-Slot um 1/Körperanteil
 * grösser als die Box.
 */
const props = withDefaults(defineProps<{ body: SunBody; px?: number }>(), { px: SUN_ORB_SPRITE_PX })

const host = ref<HTMLElement | null>(null)

const layers = computed<SunSpriteLayer[]>(() =>
  props.body.kind === 'blackHole' ? ['bhHalo', 'bhDisc', 'bhShadow'] : ['core'],
)

const vars = computed((): Record<string, string> => ({
  '--orb-core-span': `${1 / (props.body.kind === 'comet' ? COMET_DISC_FILL : SUN_SPRITE_BODY_FRACTION)}`,
  '--orb-tilt': `${BLACK_HOLE_DISC_TILT}`,
}))

watch(
  [host, () => props.body, () => props.px],
  () => {
    const el = host.value
    if (!el) return
    mountSunSprites(el, props.body, {
      px: props.px,
      dpr: window.devicePixelRatio || 1,
      layers: layers.value,
      crossfadeMs: 250,
    })
  },
  { flush: 'post', immediate: true },
)
</script>

<style scoped>
.sun-orb {
  position: absolute;
  inset: 0;
  display: block;
  border-radius: 50%;
  overflow: visible;
  pointer-events: none;
  --sun-xfade: 250ms;
}

.sun-orb__core {
  --span: var(--orb-core-span, 1.35);
}

/* Das Loch: Scheibe auf Y gestaucht wie im Orbit, Horizont darüber. Die Box
   der Scheibe ist 0,96 r breit — mit 1,3 füllt die Scheibe den Kreis. */
.sun-orb__bh-halo {
  --span: 1.3;
}

.sun-orb__tilt {
  position: absolute;
  inset: 0;
  transform: scaleY(var(--orb-tilt, 0.58));
}

.sun-orb__bh-disc {
  --span: 1.3;
}

.sun-orb__bh-shadow {
  --span: 1.04;
}
</style>
