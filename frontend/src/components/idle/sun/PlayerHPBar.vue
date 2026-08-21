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
     Welle, und die Zahl hatte darin keinen Platz. Genau diese Höhe ist jetzt da,
     die Leiste trägt ihre Zahlen selbst.

     In der ANORDNUNG folgt sie dem Profilkopf, und der ihr: der Satz steht
     mittig im Balken, der Regen-Wert als dritter an der rechten Kante. Hier
     trägt die Mitte sich von selbst — die Leiste hängt breit und frei über der
     Sonne, und die ist die optische Achse des ganzen Bildes. Eine linksbündige
     Fassung stand einmal daneben; sie war auf schmale Leisten gerechnet, wie der
     Profilkopf sie hatte, bevor der Balken dort die volle Kopfhöhe bekam. Beide
     Anzeigen desselben Werts stehen jetzt gleich, und `label-placement="inside"`
     bringt das mit — eine Angabe zur Ausrichtung gibt es nicht mehr.
     Ein Herz-Emblem stand einmal davor; es sagte nichts, was die eingefärbte
     Füllung und die Zahl nicht schon doppelt sagen, und im Profilkopf ist es aus
     demselben Grund gefallen.

     Die Position bleibt von alledem unberührt: der Container hängt an
     `translate(-50%, -100%)` und wächst nach OBEN, weg von der Scheibe. Deren
     Gradient wird bei 86 % ihres Radius transparent (`PhaseSunDisc.vue`) — die
     Scheibe misst 4 · r, das sind 1,72 · r, und genau dort endet dieser
     Container (1,75 · r).

     `--vb-h` ist der einzige Maßgeber: Innenabstand, Kerbentiefe und Eckradius
     leitet die Leiste per `calc()` daraus ab, die Staffel unten führt deshalb je
     Stufe nur eine Zahl. Vier ihrer Vorgaben passen hier allerdings nicht, weil
     sie auf einen HOHEN Balken gerechnet sind:

     Die drei Schriftgrade (0,5 / 0,3 / 0,25) liessen die Zahlen mit der Höhe
     mitschrumpfen, bis von der Aussage nichts mehr übrig ist. Sie tragen deshalb
     grössere Anteile und behalten damit auf jeder Stufe ihre Hierarchie — der
     Hauptwert bleibt rund das 1,4-fache des Maximums; mit den Vorgaben wäre er
     auf 20 px nur noch das 1,17-fache, und der Unterschied zwischen „wie viel
     habe ich" und „wovon" wäre verschwunden. Jeder Grad hat einen Pixelboden für
     die unteren Stufen, auf denen der Anteil allein zu klein würde.

     Die Kerbentiefe (0,28) belegte auf einem 18-px-Balken mit ihren drei Marken
     über zwei Drittel der Höhe — die Skala frässe den Balken auf, statt ihn zu
     gliedern. */
  --vb-h: 18px;
  --vb-label-size: max(13px, calc(var(--vb-h) * 0.64));
  --vb-label-sub-size: max(10px, calc(var(--vb-h) * 0.44));
  --vb-regen-size: max(9px, calc(var(--vb-h) * 0.34));
  --vb-tick-inset: max(2px, calc(var(--vb-h) * 0.2));
  /* WEDER Messmuster (`width-probes`) NOCH Reserve — beide halten die Spalte auf
     der Breite des längsten je auftretenden Werts, und genau das verträgt sich
     nicht mit einem mittigen Satz: der laufende Wert hat fast immer weniger
     Stellen als das Maximum, klebt per `justify-items: end` am Schrägstrich, und
     die reservierte Lücke bleibt links davon stehen. Gemessen stand „41/100" so
     3 px rechts der Achse, obwohl seine Box exakt mittig sass.

     Was die Reserve verhindern sollte — ein wandernder Satz —, verhindert hier
     schon `font-variant-numeric: tabular-nums`: alle Ziffern sind gleich breit,
     die Breite ändert sich also nur beim Wechsel der STELLENZAHL, nicht bei
     jedem Tick. Dafür lohnt sich ein dauerhafter Versatz nicht.

     Im Pause-Overlay bleiben die Muster: dort steht die Zahl neben dem Balken
     und der Wert soll seine Kante halten, nicht eine Mitte treffen. Der
     Profilkopf dagegen setzt die Reserve aus genau demselben Grund wie hier auf
     null — er trägt seinen Satz seit demselben Umbau mittig. */
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
    --vb-h: 19px;
  }
}

@media (min-width: 1920px) {
  .hp-bar-container {
    --vb-h: 20px;
  }
}

@media (min-width: 2300px) {
  .hp-bar-container {
    --vb-h: 22px;
  }
}

@media (min-width: 3400px) {
  .hp-bar-container {
    --vb-h: 25px;
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
