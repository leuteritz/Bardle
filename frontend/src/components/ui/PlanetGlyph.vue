<script setup lang="ts">
import { PLANET_GLYPH_DEFAULT_SIZE_PX } from '@/config/constants'
/**
 * One of the game's own procedurally drawn planets, at icon size.
 *
 * The orbit already draws these; when a panel has to NAME a planet type — the
 * home planet a locked champion waits on, for instance — showing the same art
 * beats an abstract icon, because it is the thing the player will actually be
 * looking for out there.
 *
 * The viewBox is deliberately wider than tall: a ringed planet's rings reach
 * 1.9× its radius sideways (drawRinged), so a square box would either clip them
 * or force every other type to be drawn tiny.
 */
import { ref, watch, onMounted } from 'vue'
import { drawPlanet, NS } from '@/utils/planetDraw'
import { PLANET_GLYPH_VIEW_W, PLANET_GLYPH_VIEW_H, PLANET_GLYPH_RADIUS } from '@/config/constants'
import type { PlanetType } from '@/types'

const props = withDefaults(
  defineProps<{
    type: PlanetType
    /** Rendered height in px — the width follows the viewBox aspect. */
    size?: number
  }>(),
  { size: PLANET_GLYPH_DEFAULT_SIZE_PX },
)

/** Gradient/clip ids inside the generated SVG must not collide between glyphs. */
let nextGlyphId = 0

const host = ref<HTMLElement | null>(null)

function render() {
  const el = host.value
  if (!el) return
  el.innerHTML = ''
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('viewBox', `0 0 ${PLANET_GLYPH_VIEW_W} ${PLANET_GLYPH_VIEW_H}`)
  svg.style.width = '100%'
  svg.style.height = '100%'
  drawPlanet(
    svg,
    `pg-${nextGlyphId++}`,
    props.type,
    PLANET_GLYPH_VIEW_W / 2,
    PLANET_GLYPH_VIEW_H / 2,
    PLANET_GLYPH_RADIUS,
  )
  el.appendChild(svg)
}

onMounted(render)
watch(() => props.type, render)
</script>

<template>
  <div
    ref="host"
    class="planet-glyph"
    :style="{ width: `${(size * PLANET_GLYPH_VIEW_W) / PLANET_GLYPH_VIEW_H}px`, height: `${size}px` }"
    aria-hidden="true"
  />
</template>

<style scoped>
.planet-glyph {
  flex-shrink: 0;
  display: block;
  line-height: 0;
}
</style>
