<template>
  <!-- Der stehende Riss. `pointer-events: none` auf der Hülle, `auto` nur auf
       der Trefferfläche — ein Riss darf keinen Klick abfangen, der der Sonne
       galt, und umgekehrt. -->
  <div ref="shell" class="vr-shell" :style="shellStyle">
    <button class="vr-hit" type="button" :aria-label="hitLabel" @click.stop="onHit">
      <!-- Statische Aura. Der Schein steht im CSS, animiert wird ausschliesslich
           ihre Opazität auf DIESER Ebene — kein filter/box-shadow im Takt
           (CLAUDE.md, Performance-Regel 11). -->
      <span class="vr-aura" :style="auraStyle" aria-hidden="true"></span>

      <!-- Die Zacken. Statisch gedreht, sie wachsen nur mit der Hülle mit. -->
      <span class="vr-tendrils" aria-hidden="true">
        <span
          v-for="t in tendrils"
          :key="t.i"
          class="vr-tendril"
          :style="t.style"
        ></span>
      </span>

      <!-- Der Schlund selbst: ein Loch, kein Körper. Dunkler als der
           Hintergrund, damit er als Fehlstelle gelesen wird und nicht als
           Objekt, das im Orbit schwebt. -->
      <span class="vr-maw" :style="mawStyle" aria-hidden="true"></span>

      <!-- Was im Schlund steht. Nur die schwereren Risse haben eines, und man
           sieht nie das ganze Wesen: der Rahmen clippt es auf die Ellipse des
           Schlunds, die Vignette darüber frisst die Ränder weg. Beides ist
           statisch — animiert wird allein das langsame Heben und Senken, ein
           `transform`, mehr nicht (Performance-Regel 1). -->
      <span v-if="def.dweller" class="vr-dweller" aria-hidden="true">
        <img
          class="vr-dweller__img"
          :src="def.dweller"
          alt=""
          draggable="false"
          @dragstart.prevent
        />
        <span class="vr-dweller__veil" :style="veilStyle"></span>
      </span>

      <!-- Trefferpunkte als Kreislinie. Pro Frame wird nur `stroke-dashoffset`
           geschrieben, direkt am Element vorbei an Vue. -->
      <svg class="vr-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="vr-ring-track" cx="50" cy="50" r="46" />
        <circle ref="ringFill" class="vr-ring-fill" cx="50" cy="50" r="46" :style="ringStyle" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ActiveVoidRift, VoidRiftDef } from '@/types'
import { voidRiftScreenPos, voidRiftHalfExtent } from '@/utils/orbit/voidRiftPath'
import { hexToRgba } from '@/utils/ui/format'
import {
  VOID_RIFT_HIT_PADDING_PX,
  VOID_RIFT_GROWTH_MIN_SCALE,
  VOID_RIFT_TENDRIL_COUNT,
  VOID_RIFT_RING_CIRCUMFERENCE,
  ORBIT_SCALE_QUANTIZE_STEPS,
} from '@/config/constants'

const props = defineProps<{
  rift: ActiveVoidRift
  def: VoidRiftDef
  /** Friert Wachstum und Ring ein, solange ein Overlay den Idle-Layer deckt. */
  paused: boolean
}>()

const emit = defineEmits<{ hit: [] }>()

const shell = ref<HTMLElement>()
const ringFill = ref<SVGCircleElement>()

const hitLabel = computed(() => `Seal ${props.def.name}`)

const shellStyle = computed(() => ({
  '--vr-size': `${props.def.sizePx}px`,
  '--vr-color': props.def.color,
  '--vr-hit-pad': `${VOID_RIFT_HIT_PADDING_PX}px`,
}))

const auraStyle = computed(() => ({
  background: `radial-gradient(circle, ${hexToRgba(props.def.color, 0.5)} 0%, ${hexToRgba(
    props.def.color,
    0.22,
  )} 42%, ${hexToRgba(props.def.color, 0)} 72%)`,
}))

// Der Schlund ist bewusst fast schwarz mit nur einem Hauch der Signaturfarbe:
// die Farbe gehört an den Rand, wo sie den Riss vom Hintergrund trennt.
const mawStyle = computed(() => ({
  background: `radial-gradient(ellipse at 50% 50%, #05030a 0%, #0b0616 52%, ${hexToRgba(
    props.def.color,
    0.35,
  )} 78%, ${hexToRgba(props.def.color, 0)} 100%)`,
  boxShadow: `0 0 0 2px ${hexToRgba(props.def.color, 0.55)}`,
}))

const ringStyle = computed(() => ({
  stroke: props.def.color,
  strokeDasharray: `${VOID_RIFT_RING_CIRCUMFERENCE}`,
}))

/** Die Vignette über dem Wesen: aussen dicht, in der Mitte offen. Sie ist der
 *  Grund, warum das Sprite nicht wie aufgeklebt wirkt — die Silhouette läuft
 *  zum Rand hin ins Nichts, statt an einer Bildkante zu enden. */
const veilStyle = computed(() => ({
  background: `radial-gradient(ellipse at 50% 40%, rgba(5, 3, 10, 0.05) 0%, rgba(5, 3, 10, 0.5) 34%, rgba(5, 3, 10, 0.93) 66%, #05030a 86%)`,
}))

/** Zacken einmal berechnet — sie drehen sich nicht, sie wachsen nur mit. Der
 *  Winkel kommt aus dem Index, nicht aus Math.random: ein Zufallswert im
 *  Style-Getter zöge bei jedem Re-Render neu und liesse die Form springen. */
const tendrils = computed(() => {
  const step = 360 / VOID_RIFT_TENDRIL_COUNT
  return Array.from({ length: VOID_RIFT_TENDRIL_COUNT }, (_, i) => {
    // Ungleiche Längen aus dem Index abgeleitet, damit die Silhouette nicht
    // zum Zahnrad wird.
    const lengthFactor = 0.62 + ((i * 7) % 5) * 0.09
    return {
      i,
      style: {
        transform: `translate(-50%, -50%) rotate(${(i * step).toFixed(2)}deg)`,
        height: `${(lengthFactor * 100).toFixed(1)}%`,
        background: `linear-gradient(to top, ${hexToRgba(props.def.color, 0)} 0%, ${hexToRgba(
          props.def.color,
          0.85,
        )} 52%, ${hexToRgba(props.def.color, 0)} 100%)`,
      },
    }
  })
})

// ── Frame-Schleife ──────────────────────────────────────────────────────────
// Wachstum und Trefferpunkte kommen aus der Wanduhr bzw. dem Store und werden
// direkt an die Elemente geschrieben. Über Vue geführt schickte das 60× je
// Sekunde einen VNode-Diff über die ganze Hülle samt Zacken und Ring.
//
// Die Grösse fährt ausschliesslich im `transform` mit (Regel 10): `width`/
// `height` pro Frame zu setzen erzwänge Layout und Repaint, und der Faktor
// wird zusätzlich auf 1-%-Stufen quantisiert, weil jede Scale-ÄNDERUNG eine
// Neurasterung auslösen kann — das Wachstum bleibt optisch stufenlos.

let frame = 0
let cachedPos = { x: 0, y: 0 }

function refreshPos(): void {
  cachedPos = voidRiftScreenPos(props.rift, voidRiftHalfExtent(props.def.sizePx))
}

// Bewusst OHNE Vergleich auf den zuletzt geschriebenen Wert: der Riss steht
// 75–160 s und schreibt damit tausende Male denselben `transform`, aber Blink
// verwirft eine Zuweisung an `element.style`, wenn der Wert identisch ist —
// gemessen 0 Attribut-Mutationen bei 100 gleichen Zuweisungen gegen 100 bei
// wechselnden. Ein `if (wert !== zuletzt)` davor spart also nichts und schafft
// nur zwei Felder, die mit dem Element auseinanderlaufen können.
function renderFrame(): void {
  const el = shell.value
  if (!el) {
    frame = 0
    return
  }
  if (props.paused) {
    frame = requestAnimationFrame(renderFrame)
    return
  }

  const rift = props.rift
  const span = rift.collapseAt - rift.openedAt
  const t = span > 0 ? Math.min(1, Math.max(0, (Date.now() - rift.openedAt) / span)) : 1

  const raw = VOID_RIFT_GROWTH_MIN_SCALE + (1 - VOID_RIFT_GROWTH_MIN_SCALE) * t
  const scale = Math.round(raw * ORBIT_SCALE_QUANTIZE_STEPS) / ORBIT_SCALE_QUANTIZE_STEPS
  el.style.transform = `translate3d(${cachedPos.x}px, ${cachedPos.y}px, 0) scale(${scale})`

  if (ringFill.value) {
    const hp = rift.maxHp > 0 ? rift.currentHp / rift.maxHp : 0
    ringFill.value.style.strokeDashoffset = `${(VOID_RIFT_RING_CIRCUMFERENCE * (1 - hp)).toFixed(2)}`
  }

  frame = requestAnimationFrame(renderFrame)
}

function onHit(): void {
  emit('hit')
}

onMounted(() => {
  refreshPos()
  window.addEventListener('resize', refreshPos)
  // Erste Lage vor dem ersten Paint, sonst blitzt der Riss eine Frame lang in
  // der linken oberen Ecke auf.
  renderFrame()
})

onUnmounted(() => {
  window.removeEventListener('resize', refreshPos)
  if (frame) cancelAnimationFrame(frame)
  frame = 0
})
</script>

<style scoped>
.vr-shell {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  will-change: transform;
}

.vr-hit {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--vr-size) + var(--vr-hit-pad) * 2);
  height: calc(var(--vr-size) + var(--vr-hit-pad) * 2);
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  pointer-events: auto;
}

/* ── Aura ── */
.vr-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--vr-size) * 2.1);
  height: calc(var(--vr-size) * 2.1);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: vr-aura-breathe 2.6s ease-in-out infinite;
}

/* Nur Opazität — der Schein selbst steht statisch im Gradient darüber. */
@keyframes vr-aura-breathe {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

/* ── Zacken ── */
.vr-tendrils {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--vr-size) * 1.9);
  height: calc(var(--vr-size) * 1.9);
  transform: translate(-50%, -50%);
}

/* Breite proportional zur Riss-Grösse, nicht fix: mit festen 2 px verschwanden
   die Zacken beim kleinen Riss ganz und blieben beim grossen ein Haarstrich —
   in beiden Fällen bezahlt, in keinem sichtbar. */
.vr-tendril {
  position: absolute;
  top: 50%;
  left: 50%;
  width: max(3px, calc(var(--vr-size) * 0.04));
  transform-origin: 50% 50%;
}

/* ── Schlund ── */
.vr-maw {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--vr-size);
  height: calc(var(--vr-size) * 0.72);
  /* Kein rounded-xl: die Ellipse ist eine Form, keine abgerundete Box. */
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(-14deg);
}

/* ── Der Bewohner ── */
/* Deckungsgleich mit dem Schlund, damit das Bild exakt auf dessen Ellipse
   beschnitten wird — dieselben Maße und dieselbe Drehung wie `.vr-maw`. */
.vr-dweller {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--vr-size);
  height: calc(var(--vr-size) * 0.72);
  border-radius: 50%;
  overflow: hidden;
  transform: translate(-50%, -50%) rotate(-14deg);
}

.vr-dweller__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* `cover` statt `contain`: der Schlund soll gefüllt wirken. Der Fokus liegt
     im oberen Drittel — dort sitzt bei beiden Motiven der Kopf, und der ist
     das, was herausschauen soll. */
  object-fit: cover;
  object-position: 50% 32%;
  /* Die Gegendrehung zur Hülle: sonst stünde das Wesen schief im Loch. */
  transform: rotate(14deg) scale(1.15);
  /* Kräftiger als man erwartet — die Vignette darüber nimmt die Ränder ohnehin
     weg, und ohne diesen Kontrast in der Mitte wirkt der Schlund texturiert
     statt bewohnt. */
  opacity: 0.92;
  animation: vr-dweller-stir 5.5s ease-in-out infinite;
}

.vr-dweller__veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Nur `transform` — ein langsames Heben und Senken, damit „da regt sich etwas"
   ohne jede Repaint-Arbeit auskommt. */
@keyframes vr-dweller-stir {
  0%,
  100% {
    transform: rotate(14deg) scale(1.15) translateY(0);
  }
  50% {
    transform: rotate(14deg) scale(1.18) translateY(-3%);
  }
}

/* ── Trefferpunkte ── */
.vr-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--vr-size) * 1.44);
  height: calc(var(--vr-size) * 1.44);
  transform: translate(-50%, -50%) rotate(-90deg);
  overflow: visible;
}

.vr-ring-track {
  fill: none;
  stroke: #241536;
  stroke-width: 3;
}

.vr-ring-fill {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
}

@media (prefers-reduced-motion: reduce) {
  .vr-aura {
    animation: none;
    opacity: 0.8;
  }
  .vr-dweller__img {
    animation: none;
  }
}
</style>
