<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { getDrifter } from '@/config/world/drifters'
import { hexToRgba } from '@/utils/ui/format'
import {
  DRIFTER_STRIKE_FX_MS,
  DRIFTER_STRIKE_RIFT_COUNT,
  DRIFTER_STRIKE_RIFT_SEQ_TURN_DEG,
  DRIFTER_STRIKE_REACH_FACTOR,
  DRIFTER_STRIKE_REPORT_TOP_PCT,
} from '@/config/constants'

/**
 * Der Schlag eines Schadens-Drifters, sichtbar gemacht: eine Druckwelle, die
 * vom Bildmittelpunkt über den ganzen Orbit läuft.
 *
 * Warum aus der Mitte und nicht vom Klickpunkt: dort steht die Sonne, um die
 * jeder getroffene Planet kreist. Eine Welle vom Rand her liefe an den Bahnen
 * vorbei statt durch sie hindurch — der Effekt würde nicht erzählen, was
 * gerade passiert ist. Der Klickpunkt hat seinen eigenen Funkenschlag
 * (`DrifterLayer`), beides zusammen liest sich als Ursache und Wirkung.
 *
 * Performance: alles hier ist ein einmaliger, gut 1 s langer Ausbruch aus rund
 * einem Dutzend Knoten, und ausschließlich `transform`/`opacity` sind animiert.
 * Die Verläufe werden einmal gerastert und danach nur noch vom Compositor
 * bewegt — auch wenn Orbit, Sternenkampf und Hintergrund-Canvas weiterlaufen.
 */
const drifterStore = useDrifterStore()
const { lastOrbitStrike } = storeToRefs(drifterStore)

interface WaveState {
  seq: number
  color: string
  /** Endradius der Ringe in px — Bildschirmdiagonale plus Zuschlag. */
  reachPx: number
  /** Winkel der radialen Risse, aus der Sequenznummer abgeleitet. */
  rifts: number[]
  planetsHit: number
  damage: number
  kills: number
  tint: Record<string, string>
}

const wave = ref<WaveState | null>(null)
let fxTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => lastOrbitStrike.value.seq,
  (seq) => {
    if (!seq) return
    const strike = lastOrbitStrike.value
    const def = getDrifter(strike.defId)
    if (!def) return

    // Die Risse stehen fest, sobald die Welle gezündet ist: der Versatz kommt
    // aus der Sequenznummer, nicht aus Math.random. Ein Zufallswert im
    // Style-Getter würde bei jedem Re-Render neu ziehen und die Risse mitten
    // in der Animation umspringen lassen (siehe utils/fx/particleField.ts).
    const turn = seq * DRIFTER_STRIKE_RIFT_SEQ_TURN_DEG
    wave.value = {
      seq,
      color: def.color,
      reachPx: Math.hypot(window.innerWidth, window.innerHeight) * DRIFTER_STRIKE_REACH_FACTOR,
      rifts: Array.from(
        { length: DRIFTER_STRIKE_RIFT_COUNT },
        (_, i) => (i * 360) / DRIFTER_STRIKE_RIFT_COUNT + turn,
      ),
      planetsHit: strike.planetsHit,
      damage: strike.damage,
      kills: strike.kills,
      tint: {
        '--c': def.color,
        '--c-80': hexToRgba(def.color, 0.8),
        '--c-55': hexToRgba(def.color, 0.55),
        '--c-30': hexToRgba(def.color, 0.3),
        '--c-14': hexToRgba(def.color, 0.14),
        '--c-0': hexToRgba(def.color, 0),
      },
    }

    if (fxTimer) clearTimeout(fxTimer)
    fxTimer = setTimeout(() => {
      wave.value = null
      fxTimer = null
    }, DRIFTER_STRIKE_FX_MS)
  },
)

onUnmounted(() => {
  if (fxTimer) clearTimeout(fxTimer)
})
</script>

<template>
  <!-- `:key` auf der Sequenz: zwei Schläge kurz nacheinander müssen beide
       spielen, nicht der zweite den ersten stumm fortsetzen. -->
  <div
    v-if="wave"
    :key="`strike-${wave.seq}`"
    class="sw"
    :style="{
      ...wave.tint,
      '--reach': `${wave.reachPx}px`,
      '--report-top': `${DRIFTER_STRIKE_REPORT_TOP_PCT}%`,
    }"
    aria-hidden="true"
  >
    <!-- Randabdunklung: der Orbit wird für einen Moment nach innen gezogen. -->
    <span class="sw-vignette"></span>

    <!-- Drei Fronten kurz hintereinander — eine einzelne liest sich als Ring,
         drei lesen sich als Schlag. -->
    <span class="sw-ring"></span>
    <span class="sw-ring sw-ring--b"></span>
    <span class="sw-ring sw-ring--c"></span>

    <!-- Die Risse, die mit der Welle nach außen schießen. -->
    <i v-for="(deg, i) in wave.rifts" :key="i" class="sw-rift" :style="{ '--deg': `${deg}deg` }"></i>

    <!-- Der Anschlag selbst, dort wo die Sonne steht. -->
    <span class="sw-core"></span>

    <!-- Trefferbilanz. Auch der Fehlschlag steht hier: ein leerer Orbit ist
         eine Information, kein Grund, den Spieler raten zu lassen. -->
    <span class="sw-report">
      <span v-if="wave.planetsHit === 0" class="sw-headline">NO PLANETS IN ORBIT</span>
      <span v-else class="sw-headline">
        {{ wave.planetsHit }} PLANET{{ wave.planetsHit === 1 ? '' : 'S' }} STRUCK
      </span>
      <span v-if="wave.planetsHit === 0" class="sw-sub">The chord finds nothing to break</span>
      <span v-else class="sw-sub">
        −{{ $formatNumber(wave.damage) }} HP
        <template v-if="wave.kills > 0">
          · {{ wave.kills }} SHATTERED
        </template>
      </span>
    </span>
  </div>
</template>

<style scoped>
/* Vollflächig und unantastbar: die Welle darf keinen Klick abfangen, der der
   Sonne oder einem Planeten gilt. */
.sw {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.sw > * {
  position: absolute;
}

/* ── Fronten ──────────────────────────────────────────────────────────────
   Die Front ist ein radialer Verlauf, keine Border. Eine hochskalierte Border
   ist genau dann hauchdünn, wenn die Welle noch im Bild steht (3px × scale 0.3
   ist unter einem Pixel) und erst außerhalb kräftig — sichtbar war davon
   nichts. Der Verlauf legt seine Schale in PROZENT des Radius an: sie wächst
   mit und bleibt auf jeder Etappe eine Wand statt eines Haars.

   Das Element wird halb so groß angelegt wie seine Reichweite und dafür auf
   scale 2 gefahren: die Textur, die der Compositor hält, ist damit ein Viertel
   so groß. Bei einem weichen Verlauf ist das Hochskalieren nicht zu sehen. */
.sw-ring {
  /* Endradius und Helligkeit je Front — die Nachläufer bleiben kürzer und
     schwächer, damit die erste Wand die Schlagrichtung vorgibt und der Rest
     sie nur nachzeichnet. Die Abschwächung MUSS über die Keyframes laufen:
     eine statische `opacity` würde von der Animation überschrieben. */
  --sc: 1.6;
  --dim: 1;
  top: 50%;
  left: 50%;
  width: calc(var(--reach) * 0.66);
  height: calc(var(--reach) * 0.66);
  margin: calc(var(--reach) * -0.33) 0 0 calc(var(--reach) * -0.33);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    var(--c-0) 82%,
    var(--c-30) 89%,
    var(--c-80) 94%,
    #ffffff 96.5%,
    var(--c-55) 98.5%,
    var(--c-0) 100%
  );
  /* Fast gleichmäßiges Tempo statt ease-out: eine front-lastige Kurve hat die
     Welle in ~150 ms durch das Bild geschossen — sichtbar war sie damit nur
     für zwei Frames. So läuft sie rund eine Sekunde durch den Orbit. */
  animation: sw-ring 1.1s cubic-bezier(0.3, 0.38, 0.6, 1) forwards;
}

.sw-ring--b {
  --sc: 1.2;
  --dim: 0.72;
  animation-delay: 0.11s;
}

.sw-ring--c {
  --sc: 0.85;
  --dim: 0.5;
  animation-delay: 0.24s;
}

@keyframes sw-ring {
  0% {
    transform: scale(0.1);
    opacity: 0;
  }
  14% {
    opacity: var(--dim);
  }
  66% {
    opacity: calc(0.9 * var(--dim));
  }
  100% {
    transform: scale(var(--sc));
    opacity: 0;
  }
}

/* ── Risse ── */
.sw-rift {
  top: 50%;
  left: 50%;
  width: calc(var(--reach) / 2);
  height: 3px;
  margin-top: -1.5px;
  transform-origin: 0 50%;
  background: linear-gradient(90deg, #fff 0%, var(--c) 16%, var(--c-30) 56%, var(--c-0) 100%);
  /* Etwas schneller als die Front, aber auf derselben Strecke — die Risse
     laufen ihr voraus und reißen den Weg auf, den sie danach nimmt. */
  animation: sw-rift 0.92s cubic-bezier(0.22, 0.5, 0.5, 1) forwards;
}

/* Die feste Drehung muss in jedem Keyframe mitstehen — ein Element trägt nur
   EINE transform-Eigenschaft, und die schreibt hier die Animation. */
@keyframes sw-rift {
  0% {
    transform: rotate(var(--deg)) scaleX(0.03);
    opacity: 0;
  }
  14% {
    opacity: 1;
  }
  100% {
    transform: rotate(var(--deg)) scaleX(1);
    opacity: 0;
  }
}

/* ── Anschlag ── */
.sw-core {
  top: 50%;
  left: 50%;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, var(--c) 34%, var(--c-30) 58%, var(--c-0) 74%);
  animation: sw-core 0.62s ease-out forwards;
}

@keyframes sw-core {
  0% {
    transform: translate(-50%, -50%) scale(0.12);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.4);
    opacity: 0;
  }
}

/* ── Randabdunklung ── */
.sw-vignette {
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, transparent 32%, var(--c-14) 74%, transparent 100%);
  animation: sw-vignette 0.95s ease-out forwards;
}

@keyframes sw-vignette {
  0% {
    opacity: 0;
  }
  22% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ── Trefferbilanz ────────────────────────────────────────────────────────
   Über der Sonne, unter dem Header: auf Full HD wie auf 4K bleibt der Streifen
   frei, weil die Höhe relativ zum Viewport steht und die Schrift mit clamp()
   mitwächst statt fest zu bleiben. */
.sw-report {
  top: var(--report-top);
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  animation: sw-report 1.25s ease-out forwards;
}

.sw-headline {
  color: var(--c);
  font-size: clamp(22px, 1.9vw, 42px);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-shadow:
    0 0 14px rgba(0, 0, 0, 0.95),
    0 3px 8px rgba(0, 0, 0, 0.95);
}

.sw-sub {
  color: #e6dcc0;
  font-size: clamp(13px, 1vw, 22px);
  letter-spacing: 0.14em;
  text-shadow: 0 2px 7px rgba(0, 0, 0, 0.95);
}

@keyframes sw-report {
  0% {
    transform: translate(-50%, 14px) scale(0.9);
    opacity: 0;
  }
  16% {
    transform: translate(-50%, 0) scale(1);
    opacity: 1;
  }
  74% {
    transform: translate(-50%, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -26px) scale(1);
    opacity: 0;
  }
}

/* Ohne Bewegung bleibt nur die Meldung — sie trägt die Information, der Rest
   ist Inszenierung. */
@media (prefers-reduced-motion: reduce) {
  .sw-ring,
  .sw-rift,
  .sw-core,
  .sw-vignette {
    display: none;
  }

  .sw-report {
    animation: none;
    transform: translateX(-50%);
  }
}
</style>
