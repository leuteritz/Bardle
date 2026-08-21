<template>
  <div class="hp-bar-container" :style="sunRVar">
    <!--
      Die Leiste selbst ist das gemeinsame Bauteil; dieser Container besitzt nur
      noch, was zur BÜHNE gehört: die Lage über der Sonnenscheibe, die mit dem
      Sonnenradius mitwächst, und die beiden Ebenen im Teleport darunter.
    -->
    <VitalityBar
      :current="playerStore.currentHP"
      :max="playerStore.maxHP"
      :regen-per-sec="regen"
      label-placement="inside"
      lead-icon="ph:heart-fill"
      width-probes
      spark
      :aria-label="`Sun health ${Math.ceil(playerStore.currentHP)} of ${playerStore.maxHP}`"
    />

    <Teleport to="body">
      <div v-if="playerStore.isLow" class="hp-vignette" aria-hidden="true" />
      <div class="dmg-float-layer" :style="sunRVar" aria-hidden="true">
        <span v-for="f in playerStore.damageFloats" :key="f.id" class="dmg-float"
          >-{{ f.value }}</span
        >
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import VitalityBar from '@/components/ui/VitalityBar.vue'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import {
  SUN_ORBIT_HP_MAX_WIDTH_PX,
  SUN_ORBIT_HP_MIN_WIDTH_PX,
  SUN_ORBIT_HP_REGEN_MIN_WIDTH_PX,
  SUN_ORBIT_HP_WIDTH_FACTOR,
} from '@/config/constants'

const playerStore = usePlayerStore()
const planetShopStore = usePlanetShopStore()

/** Eine Nachkommastelle, wie im Profilkopf — die exakte Zahl steht dort im
 *  Hover-Kasten, hier gibt es keinen. */
const regen = computed(() => Math.round(playerStore.regenPerSec * 10) / 10)

/**
 * Die Breite wird HIER gerechnet und nicht als `clamp()` im Stylesheet: die
 * Regen-Schwelle darunter vergleicht gegen sie, und zwei Fassungen derselben
 * Rechnung laufen beim ersten Nachjustieren auseinander.
 */
const barWidth = computed(() =>
  Math.min(
    SUN_ORBIT_HP_MAX_WIDTH_PX,
    Math.max(
      SUN_ORBIT_HP_MIN_WIDTH_PX,
      planetShopStore.currentSunRadius * SUN_ORBIT_HP_WIDTH_FACTOR,
    ),
  ),
)

/**
 * Kein Frame-Wert, sondern ein Phasenwechsel alle paar Minuten — die
 * Performance-Regel gegen Variablen am Container zielt auf pro Frame
 * geschriebene Werte, `--sun-r` steht hier seit jeher genauso.
 *
 * Beide Ebenen lesen dasselbe Objekt. Die Float-Ebene braucht nur `--sun-r`,
 * ein eigenes computed für sie wäre aber eine zweite Quelle für den Radius.
 */
const sunRVar = computed(() => ({
  '--sun-r': `${planetShopStore.currentSunRadius}px`,
  '--hp-bar-w': `${barWidth.value}px`,
  // Der dritte Wert weicht, wo der Balken zu schmal für ihn ist — über die
  // Variable der Leiste, nicht über `:deep()` auf ihren Klassennamen.
  '--vb-regen-display': barWidth.value >= SUN_ORBIT_HP_REGEN_MIN_WIDTH_PX ? 'inline' : 'none',
}))

/** Die Schadenszahlen gehören der Bühne, nicht der Leiste — sie steigen über der
 *  Sonne auf, nicht über dem Balken. Das Aufräumen bleibt deshalb hier. */
let pruneInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  pruneInterval = setInterval(() => playerStore.pruneFloats(), 500)
})

onUnmounted(() => {
  if (pruneInterval) clearInterval(pruneInterval)
})
</script>

<style scoped>
/* ── Container – kein Background, kein Border ── */
.hp-bar-container {
  position: fixed;
  top: calc(50% - calc(var(--sun-r) * 1.75));
  left: 50%;
  transform: translate(-50%, -100%);
  z-index: 20;
  pointer-events: none;
  /* Gerechnet im Script, siehe `barWidth` — das `clamp()` stand hier einmal
     ein zweites Mal. */
  width: var(--hp-bar-w, 240px);
  transition:
    top 1.5s ease,
    width 1.5s ease;

  /* Maße der Leiste.

     Sie war einmal 10 px hoch, mit der Zahl DARÜBER und ohne Dauerglanz — beides
     mit ihrer Höhe begründet: eine Welle über 18 % von 10 px liest sich nicht als
     Welle, und die Zahl hatte darin keinen Platz. Genau diese Höhe ist jetzt da.
     Die Leiste trägt ihre Zahlen selbst (zwei an der Füllkante gegeneinander
     geschnittene Textebenen) und zeigt damit dasselbe Bild wie im Kopf des
     Profils, wo derselbe Wert derselben Sonne steht.

     Die Position bleibt davon unberührt: der Container hängt an
     `translate(-50%, -100%)` und wächst nach OBEN, weg von der Scheibe. Deren
     Gradient wird bei 86 % ihres Radius transparent (`PhaseSunDisc.vue`) — die
     Scheibe misst 4 · r, das sind 1,72 · r, und genau dort endet dieser
     Container (1,75 · r).

     `--vb-h` ist der einzige Maßgeber: Innenabstand, Emblem, Kerbentiefe und
     Eckradius leitet die Leiste per `calc()` daraus ab, die Staffel unten führt
     deshalb je Stufe nur eine Zahl. Nur die beiden Schriftgrade bekommen einen
     Pixelboden — ihre Anteile (0,5 bzw. 0,36) fallen auf der Basisstufe unter
     das, was auf Full HD noch zu lesen ist. */
  --vb-h: 26px;
  --vb-label-size: max(14px, calc(var(--vb-h) * 0.5));
  --vb-label-sub-size: max(12px, calc(var(--vb-h) * 0.36));
  /* Die Messmuster (`width-probes`) geben die Spaltenbreite vor; eine
     zusätzliche Reserve rückte den Wert nur von seinem Schrägstrich weg. */
  --vb-cur-reserve: 0;
}

/* ── Auflösungsstufen ──────────────────────────────────────────────────────
   Dieselben Schwellen wie im Profilkopf (`ProfileVitalsCluster.vue`), damit die
   beiden Anzeigen desselben Werts zusammen wachsen. Flacher gestaffelt als dort:
   hier wächst die BREITE bereits mit dem Sonnenradius mit.

   Nach CSS-Breite, nicht nach Monitorklasse — ein Full-HD-Schirm unter
   Windows-Skalierung 125 % liefert dem Browser 1536 CSS-Pixel, nicht 1920. */
@media (min-width: 1536px) {
  .hp-bar-container {
    --vb-h: 30px;
  }
}

@media (min-width: 1920px) {
  .hp-bar-container {
    --vb-h: 34px;
  }
}

@media (min-width: 2300px) {
  .hp-bar-container {
    --vb-h: 40px;
  }
}

@media (min-width: 3400px) {
  .hp-bar-container {
    --vb-h: 48px;
  }
}

/* ── Vignette ── */
.hp-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  background: radial-gradient(
    ellipse at center,
    transparent 42%,
    rgba(165, 18, 0, 0.16) 70%,
    rgba(140, 8, 0, 0.33) 100%
  );
  animation: vignette-pulse 1.4s ease-in-out infinite alternate;
}

@keyframes vignette-pulse {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

/* ── Damage Floats ── */
.dmg-float-layer {
  position: fixed;
  top: calc(50% - calc(var(--sun-r) * 1.75));
  left: 50%;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 30;
  width: 0;
  height: 0;
  transition: top 1.5s ease;
}

.dmg-float {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.1rem;
  font-weight: 700;
  color: #f83820;
  text-shadow:
    0 0 8px rgba(255, 40, 10, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  animation: dmg-float-up 1.4s ease-out forwards;
  pointer-events: none;
}

@keyframes dmg-float-up {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-38px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hp-vignette {
    animation: none;
  }
  .dmg-float {
    animation: none;
  }
}
</style>
