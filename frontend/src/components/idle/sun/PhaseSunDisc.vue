<template>
  <!-- Final phase: the star has collapsed — a black hole replaces the plasma disc. -->
  <BlackHoleDisc v-if="isCollapsed" :diameter="diameter" />
  <div v-else class="phase-sun-root" :style="discVars">
    <div class="phase-sun-disc" :class="{ 'phase-sun-disc--pulse': pulse }" />
    <template v-if="showOrnaments">
      <div class="sig-granulation" />
      <div class="sig-prominences" />
    </template>
    <div ref="pulseEl" class="sig-pulse" />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  STAR_PHASE_DATA,
  SOLAR_SIGNATURE_MIN_DIAMETER,
  SOLAR_SIGNATURE_PULSE_MS,
} from '@/config/constants'
import { plasmaSignatureVars, SIGNATURE_AXIS_COLOR } from '@/utils/game/solarSignature'
import BlackHoleDisc from './BlackHoleDisc.vue'

/**
 * Clean, phase-colored glowing sun disc — the single source of truth for the sun's
 * visual. Driven entirely by the current solar phase so every phase change recolors it.
 *
 * The last phase is not a plasma body at all, so it is delegated to BlackHoleDisc
 * instead of being coloured differently. Doing the switch HERE means every
 * consumer of PhaseSunDisc gets the black hole for free.
 *
 * Der Wurzel-Div traegt die Variablen und die Zierebenen; die Scheibe darunter ist
 * das EINZIGE, was atmet. Alles, was neben ihr haengt, laege sonst unter einer
 * laufenden `scale()`-Animation, und eine Skalenaenderung kann rastern.
 *
 * Die Zierebenen sind ZWEI, unabhaengig davon, wie viel gekauft wurde. Was
 * waechst, sind Werte, die eine bestehende Ebene ohnehin mitnimmt.
 */
export default defineComponent({
  name: 'PhaseSunDisc',
  components: { BlackHoleDisc },
  props: {
    /** Disc diameter in px. */
    diameter: { type: Number, required: true },
    /** Toggle the breathing pulse (off for calm/static contexts). */
    pulse: { type: Boolean, default: true },
  },
  setup(props) {
    const planetShopStore = usePlanetShopStore()
    const solarStore = useSolarUpgradeStore()
    const pulseEl = ref<HTMLDivElement | null>(null)

    /** Comet state is handled by the caller (CometDisc) — only phases land here. */
    const isCollapsed = computed(() => solarStore.isCollapsedStar)

    /**
     * Zierrat nur, wo man ihn sieht (Performance-Regel 7).
     *
     * Geprueft wird gegen den AUTORISIERTEN Durchmesser, nie gegen die
     * Bildschirmgroesse: der Shop skaliert seine Buehne per Zoom, und eine
     * Bedingung daran baute die Ebenen bei jedem Zoomschritt ab und wieder auf.
     */
    const showOrnaments = computed(() => props.diameter >= SOLAR_SIGNATURE_MIN_DIAMETER)

    /** Die Achsfarbe des Kaufs — `null` heisst gemischt und zeigt die Phase. */
    const pulseColor = computed(() => {
      const axis = solarStore.signaturePulseAxis
      if (!axis) return STAR_PHASE_DATA[planetShopStore.currentSunStage]?.phaseGlow ?? '#ff8c42'
      return SIGNATURE_AXIS_COLOR[axis]
    })

    const discVars = computed((): Record<string, string> => {
      const phase = STAR_PHASE_DATA[planetShopStore.currentSunStage] ?? STAR_PHASE_DATA[0]
      return {
        '--phase-core': phase.core,
        '--phase-mid': phase.mid,
        '--phase-edge': phase.edge,
        '--phase-glow': phase.phaseGlow,
        '--pulse-speed': phase.pulseSpeed,
        '--disc-d': `${props.diameter}px`,
        '--sig-pulse-c': pulseColor.value,
        '--sig-pulse-ms': `${SOLAR_SIGNATURE_PULSE_MS}ms`,
        ...plasmaSignatureVars(solarStore.solarSignature),
      }
    })

    /**
     * Den Blitz neu anstossen.
     *
     * Ueber eine KLASSE und nicht ueber `animationName`: der Keyframe-Name
     * traegt in `<style scoped>` einen Scope-Suffix, ein von Hand gesetzter
     * Name traefe ihn nicht mehr und fiele still aus. Die Klasse fehlt bis zum
     * ersten Kauf — sonst blitzte die Sonne einmal beim Laden.
     * Entfernen, Reflow, Setzen: ohne den Reflow fasst der Browser beides zu
     * „nichts geaendert" zusammen und ein zweiter Kauf innerhalb der Laufzeit
     * startet die Animation nicht neu.
     */
    watch(
      () => solarStore.signaturePulseSeq,
      (seq) => {
        if (seq <= 0) return
        solarStore.ackSignaturePulse()
        const el = pulseEl.value
        if (!el) return
        el.classList.remove('sig-pulse--on')
        void el.offsetWidth
        el.classList.add('sig-pulse--on')
      },
    )

    return { discVars, isCollapsed, showOrnaments, pulseEl }
  },
})
</script>

<style scoped>
/* Traegerebene: keine eigene Optik, nur Ort, Variablen und die abgeleiteten
   Signaturfarben — die stehen hier einmal statt fuenfmal im Verlauf. */
.phase-sun-root {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--disc-d, 200px);
  height: var(--disc-d, 200px);
  transform: translate(-50%, -50%);
  transition: width 1.2s ease, height 1.2s ease;

  /* Jede Achsfarbe wird ERST mit Weiss gebrochen und dann erst durchsichtig
     gemacht. Ungebrochen sassen fuenf satte Farbtoene auf einer gelben Scheibe,
     und die Sonne war bunt statt reicher — genau das, was die Regel aus
     CHAMPION_REGALIA_STAGES ausschliesst („the identity colour is never joined
     by a second hue"). Erkennbar bleiben die Achsen an ihrer GEOMETRIE:
     Punkte, Zellen, Boegen. Die Toenung sagt nur, welche es ist. */
  --sig-spark: color-mix(
    in srgb,
    color-mix(in srgb, var(--sig-spark-c, #52b830) 26%, white) var(--sig-spark-a, 0%),
    transparent
  );
  /* Granulation ist eine AUFHELLUNG der Oberflaeche, kein Farbfleck: echte
     Sonnengranulation sind helle Zellen mit dunklen Raendern. */
  --sig-granule: color-mix(
    in srgb,
    color-mix(in srgb, var(--sig-granule-c, #e89840) 18%, white) var(--sig-granule-a, 0%),
    transparent
  );
  --sig-prom: color-mix(
    in srgb,
    color-mix(in srgb, var(--sig-prom-c, #c060a0) 40%, white) var(--sig-prom-a, 0%),
    transparent
  );
}

.phase-sun-disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  /* Reihenfolge = Malreihenfolge, von oben nach unten:
     Kernfunken (chimesPerClick) · Glanzpunkt · Koerper.
     Die Funken stehen an FESTEN Orten — gewuerfelt saessen sie bei jedem
     Re-Render woanders, und dieselbe Sonne saehe zweimal anders aus. */
  background:
    radial-gradient(circle at 62% 31%, var(--sig-spark) 0%, transparent 2.2%),
    radial-gradient(circle at 34% 58%, var(--sig-spark) 0%, transparent 1.8%),
    radial-gradient(circle at 71% 64%, var(--sig-spark) 0%, transparent 1.5%),
    radial-gradient(circle at 45% 39%, var(--sig-spark) 0%, transparent 1.3%),
    radial-gradient(circle at 55% 75%, var(--sig-spark) 0%, transparent 1.7%),
    radial-gradient(circle at 28% 42%, var(--sig-spark) 0%, transparent 1.2%),
    radial-gradient(circle at 66% 50%, var(--sig-spark) 0%, transparent 1.4%),
    radial-gradient(
      circle at 42% 38%,
      color-mix(in srgb, white calc(92% + var(--sig-core-lift, 0%)), var(--phase-core, #fff)) 0%,
      transparent 22%
    ),
    radial-gradient(
      circle at 50% 50%,
      var(--phase-core, #fff0e0) 0%,
      var(--phase-mid, #ffd4a3) 34%,
      var(--phase-edge, #cc5500) 52%,
      color-mix(in srgb, var(--phase-edge, #cc5500) 45%, transparent) 70%,
      transparent 86%
    );
  /* Schutzsaum (maxHp) nach innen, Korona nach aussen. Der vierte Ring gehoert
     der Signatur; er steht auf 0 %, solange nichts gekauft wurde.
     Radien als Variablen, weil der Shop sie relativ zur Scheibe braucht: bei
     320px las sich der feste Rand dort hart abgeschnitten. Alles hier ist ein
     STATISCHER Schatten — animiert sind nur `opacity`/`transform` (Regel 2). */
  /* Der Schutzsaum bleibt in der Farbfamilie der PHASE. Ungebrochen lag ein
     roter Ring um eine gelbe Sonne und las sich als Rahmen, nicht als Limbus —
     seine Aussage ist die BREITE, nicht der Ton. */
  box-shadow:
    inset 0 0 calc(var(--disc-d, 200px) * var(--sig-limb-w, 0))
      color-mix(
        in srgb,
        color-mix(in srgb, var(--sig-limb-c, #e05050) 38%, var(--phase-edge, #cc5500))
          var(--sig-limb-a, 0%),
        transparent
      ),
    0 0 var(--sun-corona-a, 90px) color-mix(in srgb, var(--phase-glow, #ff8c42) 55%, transparent),
    0 0 var(--sun-corona-b, 180px) color-mix(in srgb, var(--phase-glow, #ff8c42) 28%, transparent),
    0 0 calc(var(--sun-corona-b, 180px) * 1.6)
      color-mix(in srgb, var(--phase-glow, #ff8c42) var(--sig-corona-a, 0%), transparent);
}

.phase-sun-disc--pulse {
  animation: phase-sun-pulse var(--pulse-speed, 5s) ease-in-out infinite;
}

@keyframes phase-sun-pulse {
  0%,
  100% {
    opacity: 0.9;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

/* ── Granulation (chimesPerSecond) — die Zellstruktur der Oberflaeche ───────
   Zwei versetzt GEKACHELTE Verlaeufe; die Dichte steckt im Kachelmass, nicht
   in einer Zahl von Elementen. Die Maske blendet sie zum Rand hin aus, sonst
   laegen die Zellen flach auf einer Kugel. Statisch — hier animiert nichts. */
.sig-granulation {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-image:
    radial-gradient(circle at 30% 30%, var(--sig-granule) 0%, transparent 42%),
    radial-gradient(circle at 72% 68%, var(--sig-granule) 0%, transparent 38%);
  background-size: var(--sig-granule-size, 25%) var(--sig-granule-size, 25%);
  background-position:
    0 0,
    calc(var(--sig-granule-size, 25%) / 2) calc(var(--sig-granule-size, 25%) / 2);
  mask-image: radial-gradient(circle at 50% 50%, #000 0 46%, transparent 72%);
  pointer-events: none;
}

/* ── Protuberanzen (dmgPerClick) — Boegen am Rand ───────────────────────────
   EIN statischer `repeating-conic-gradient`; die Zahl der Boegen ist seine
   Wiederholung, nicht eine Zahl von Spans. Regel 2 verbietet `conic-gradient`
   nur IN einer laufenden Animation — hier laeuft keine.
   Die Ebene ragt um die Bogenhoehe ueber die Scheibe hinaus und wird auf ein
   schmales Ringband maskiert, damit die Boegen am Limbus stehen. */
.sig-prominences {
  position: absolute;
  inset: calc(-1 * var(--sig-prom-h, 0%));
  border-radius: 50%;
  /* Weiche Flanken an beiden Enden des Bogens und ein weich auslaufendes
     Ringband: mit harten Stopps sassen dort Zacken auf der Scheibe statt
     Zungen, die sie verlassen. */
  background: repeating-conic-gradient(
    from 0deg,
    transparent 0deg,
    var(--sig-prom) calc(var(--sig-prom-step, 40deg) * 0.09),
    var(--sig-prom) calc(var(--sig-prom-step, 40deg) * 0.15),
    transparent calc(var(--sig-prom-step, 40deg) * 0.26),
    transparent var(--sig-prom-step, 40deg)
  );
  mask-image: radial-gradient(
    circle at 50% 50%,
    transparent 0 40%,
    #000 46%,
    #000 48%,
    transparent 54%
  );
  pointer-events: none;
}

/* ── Kaufblitz ──────────────────────────────────────────────────────────────
   Ein heller Schleier, der NUR seine Deckkraft aendert. Ein `filter:
   brightness()` auf dem Wurzel-Div zwaenge Scheibe und Zierebenen gemeinsam
   auf eine eigene Rendering-Surface; dieselbe Aufhellung leistet diese Ebene
   ohne Neurasterung (Muster: ChampionOrbit.vue).
   Er liegt hier und nicht mehr im Forge-Panel, damit der Idle-Orbit ihn auch
   bekommt — und er faehrt nach AUSSEN, waehrend der Klick-Ripple nach innen
   staucht: zwei Gesten, zwei Bewegungen. */
.sig-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, var(--sig-pulse-c, #ff8c42) 55%, transparent) 0%,
    color-mix(in srgb, var(--sig-pulse-c, #ff8c42) 22%, transparent) 58%,
    transparent 78%
  );
  opacity: 0;
  pointer-events: none;
}

.sig-pulse--on {
  animation: sig-pulse-flare var(--sig-pulse-ms, 500ms) ease-out;
}

@keyframes sig-pulse-flare {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  28% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.22);
  }
}

@media (prefers-reduced-motion: reduce) {
  .phase-sun-disc--pulse,
  .sig-pulse--on {
    animation: none;
  }
}
</style>
