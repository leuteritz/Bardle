<template>
  <!--
    Die Vitalitätsleiste der Spieler-Sonne. EIN Bauteil für vier Stellen: den
    Orbit über der Sonne, die Star-Fight-Arena, das Pause-Overlay und den Kopf
    des Bard-Profils.

    Sie waren einmal vier handgebaute Leisten für denselben Wert, und sie lasen
    sich wie vier verschiedene Anzeigen: dieselbe Sonne bei 60 % war im Profil
    grün und im Orbit rot, die Zahl stand einmal als „5000" und dreimal als
    „5K", zwei Leisten animierten `width` und zwei einen `box-shadow` — beides
    Arbeit pro Frame, die hier nicht anfallen darf.

    ── Die Arbeitsteilung mit dem Aufrufer ────────────────────────────────────
    Custom Properties vererben durch die Scope-Grenze, Selektoren nicht. Der
    Aufrufer besitzt deshalb Position, Maße, Media-Query-Staffeln und Teleports
    und reicht sie ausschliesslich als `--vb-*` herein; dieses Bauteil besitzt
    den Ebenenstapel, die Choreografie, die Farbstufen und das Zahlenformat.
    `:deep()` wird an keiner Stelle gebraucht — auch nicht für den einen Fall,
    in dem ein Aufrufer etwas ausblenden will (`--vb-regen-display`).
  -->
  <div class="vb" :class="rootClass" :role="ariaRole" :aria-label="ariaLabel">
    <div class="vb-track">
      <!-- Geisterspur UNTER der Füllung: sie trägt denselben Anteil, folgt ihm
           aber verzögert. Sichtbar wird sie deshalb nur beim Einschlag — der
           Streifen, den die zurückschnellende Füllung freigibt, ist genau der
           Schaden dieses Treffers. -->
      <span class="vb-ghost" :style="ghostStyle" aria-hidden="true" />

      <!-- Füllung als `scaleX` am Balken SELBST, nicht als Breite und nicht als
           Variable am Container (Performance-Regel 3). -->
      <span class="vb-fill" :style="fillStyle" aria-hidden="true">
        <!-- Der Glanz läuft INNERHALB der Füllung: sie ist der einzige
             Container, der ohne zweite Maske exakt am Füllstand endet. Er wird
             mit ihrem scaleX schmaler — bei wenig HP bliebe sonst ein
             hektisches Zucken statt einer breiten Welle. -->
        <span v-if="spark" class="vb-spark" />
      </span>

      <!-- Vollbreite Ebene, nach links geschoben: ihr rechter Rand IST die
           Kante. Als `border-right` an der Füllung wüchse der Strich mit
           1/scaleX auf, je leerer der Balken wird. -->
      <span class="vb-edge" :style="edgeStyle" aria-hidden="true" />

      <span class="vb-ticks" aria-hidden="true" />

      <!-- Treffer-Schlag auf EIGENER Ebene: der Schein steht statisch im CSS,
           animiert wird allein die Deckkraft (Performance-Regel 2/11). Ein
           pulsender box-shadow am Track hätte ihn samt Schatten pro Frame neu
           gerastert. -->
      <span
        v-if="hitFlash"
        class="vb-hit"
        :class="{ 'vb-hit--on': wasHit }"
        :style="hitDurationStyle"
        aria-hidden="true"
      />

      <span v-if="critPulse" class="vb-pulse" aria-hidden="true" />

      <!-- Fassung ÜBER allen Ebenen: der eingelassene Rand bleibt sichtbar,
           auch wenn die Füllung bis an die Kante läuft. -->
      <span class="vb-frame" aria-hidden="true" />
    </div>

    <!--
      Die Beschriftung steht als GESCHWISTER des Tracks, nicht in ihm — dadurch
      trägt die Datei das Zahlen-Markup genau einmal und die drei Anordnungen
      sind eine reine CSS-Frage.

      Bei `inside` liegen ZWEI deckungsgleiche Ebenen übereinander. Der Grund
      ist die wandernde Füllkante: links steht der Text auf leuchtender Füllung,
      rechts auf fast schwarzem Track. EINE Textfarbe ist dort zwangsläufig
      irgendwann falsch, und eine Umschaltschwelle liesse die Zahl mitten im
      Absinken umspringen. Stattdessen werden beide an der Füllkante
      gegeneinander abgeschnitten — bei halb überlaufener Ziffer trägt jede
      Zeichenhälfte die Farbe, die auf IHREM Untergrund lesbar ist.
    -->
    <div v-if="labelPlacement !== 'none'" class="vb-labels">
      <div
        v-for="ink in inkLayers"
        :key="ink"
        class="vb-label"
        :class="`vb-label--on-${ink}`"
        :style="clipStyle(ink)"
        :aria-hidden="ink === 'fill' ? 'true' : undefined"
      >
        <slot name="lead">
          <Icon
            v-if="leadIcon"
            :icon="leadIcon"
            class="vb-icon"
            width="24"
            height="24"
            aria-hidden="true"
          />
        </slot>
        <!-- Ein-Zellen-Raster: Messmuster und Live-Wert liegen übereinander, die
             Spalte nimmt die breiteste Darstellung. Damit steht der Schrägstrich
             fest, ohne dass irgendwo eine Zeichenbreite geschätzt werden müsste
             — der Browser misst die echten Glyphen der Schrift. -->
        <!-- `v-ink-center.y` an jeder sichtbaren Zahl: MedievalSharp setzt Ziffern
             fast vollständig über die Baseline, und `align-items: center` oben
             zentriert die ZEILENBOX, nicht die Tinte darin. Weil Wert und
             Maximum verschiedene Grade tragen, fällt ihr Versatz verschieden
             aus — sie driften sichtbar auseinander. Nur die senkrechte Achse:
             die waagerechte setzte jedes Stück einzeln auf seine eigene
             Tintenmitte und zerrisse die Abstände der Zeile.
             Die Messmuster bleiben ohne: sie sind unsichtbar und zählen nur
             als Breite. -->
        <span class="vb-cur">
          <span v-for="(probe, i) in probes" :key="i" class="vb-probe" aria-hidden="true">{{
            probe
          }}</span>
          <span v-ink-center.y class="vb-now">{{ formatNumber(Math.ceil(current)) }}</span>
        </span>
        <span v-ink-center.y class="vb-sep">/</span>
        <span v-ink-center.y class="vb-max">{{ formatNumber(max) }}</span>
        <span v-if="regenPerSec > 0" v-ink-center.y class="vb-regen"
          >+{{ formatNumber(regenPerSec) }}/s</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { formatNumber } from '@/config/ui/numberFormat'
import { sunVitalStage } from '@/utils/ui/format'
import {
  HP_WIDTH_PROBES,
  PLAYER_HP_HIT_FLASH_MS,
  VITALITY_GHOST_FALL_DELAY_MS,
  VITALITY_GHOST_FALL_MS,
} from '@/config/constants'

const props = withDefaults(
  defineProps<{
    /** Roher aktueller Wert; wird aufgerundet und über `formatNumber` gesetzt. */
    current: number
    max: number
    /**
     * Wo die Zahlen stehen.
     * `inside` — zwei geclippte Ebenen IM Balken, Satz mittig (braucht Höhe)
     * `above`  — mittig darüber, optional mit Emblem (schmale Leisten)
     * `right`  — rechts daneben in fester Spaltenbreite
     */
    labelPlacement?: 'inside' | 'above' | 'right' | 'none'
    /** > 0 hängt „+x/s" an — nur bei `inside`, sonst fehlt der Platz. */
    regenPerSec?: number
    /** Unsichtbare Messmuster hinter dem Wert; die Spalte nimmt die breiteste
     *  je auftretende Darstellung und die Balkenkante wandert nicht mehr. */
    widthProbes?: boolean
    /** Iconify-Name vor den Zahlen. Der Slot `#lead` schlägt ihn. */
    leadIcon?: string
    /** Dauerläufer-Glanz durch die Füllung. */
    spark?: boolean
    /** Alarmebene, die auf der roten Stufe pulst. */
    critPulse?: boolean
    /** Aufblitzen bei fallendem Wert. */
    hitFlash?: boolean
    ariaLabel?: string
    /** `status` meldet Änderungen aktiv — nur dort, wo die Leiste die einzige
     *  Meldung eines sonst unsichtbaren Vorgangs ist. */
    ariaRole?: 'img' | 'status'
  }>(),
  {
    labelPlacement: 'none',
    regenPerSec: 0,
    widthProbes: false,
    leadIcon: undefined,
    spark: false,
    critPulse: true,
    hitFlash: true,
    ariaLabel: undefined,
    ariaRole: 'img',
  },
)

/** Kein eigener Ticker: `current` ändert sich im Sekundentakt des Spiels und
 *  ist reaktiv — Vue rendert die Zeile von selbst. */
const hpRatio = computed(() => {
  if (!(props.max > 0)) return 0
  return Math.min(1, Math.max(0, props.current / props.max))
})

const stage = computed(() => sunVitalStage(hpRatio.value * 100))

const rootClass = computed(() => [
  `vb--${stage.value}`,
  `vb--label-${props.labelPlacement}`,
  { 'vb--crit': stage.value === 'red' },
])

/** Leer, solange keine Messmuster bestellt sind — so bleibt das `v-for` im
 *  Template ohne begleitendes `v-if` am selben Element. */
const probes = computed(() =>
  props.widthProbes ? HP_WIDTH_PROBES.map((f) => formatNumber(Math.round(props.max * f))) : [],
)

const fillStyle = computed(() => ({ transform: `scaleX(${hpRatio.value})` }))

/**
 * Die Kante wird VERSCHOBEN, nicht skaliert. Bei leerem Balken bliebe sonst ein
 * heller Strich an der linken Kante stehen — ein Glanz auf einer Füllung, die
 * es nicht gibt.
 */
const edgeStyle = computed(() => ({
  transform: `translateX(${(hpRatio.value - 1) * 100}%)`,
  opacity: hpRatio.value > 0.004 ? 1 : 0,
}))

/**
 * Die Geisterspur läuft NUR beim Absinken nach. Steigt der Wert — und das tut er
 * durch die Regeneration jede Sekunde —, springt sie ohne Übergang mit: sonst
 * liefe pausenlos eine Transition auf einer Ebene, die in dieser Richtung
 * ohnehin von der Füllung verdeckt ist.
 */
const hpRising = ref(true)

const ghostStyle = computed(() => ({
  transform: `scaleX(${hpRatio.value})`,
  transitionDuration: hpRising.value ? '0s' : `${VITALITY_GHOST_FALL_MS}ms`,
  transitionDelay: hpRising.value ? '0s' : `${VITALITY_GHOST_FALL_DELAY_MS}ms`,
}))

/**
 * Die beiden Textebenen schneiden sich GEGENSEITIG an der Füllkante — jede gibt
 * frei, was die andere trägt. Nur die dunkle zu beschneiden genügt nicht: bei
 * schwerem Schnitt schaut deren schwarzer Schein unter jeder hellen Glyphe
 * hervor, und die Zahl liest sich wie doppelt gedruckt.
 *
 * Die Füllung liegt auf `inset: 0`, der Schnitt braucht also keinen Ausgleich
 * für einen abweichenden Füllungsbeginn.
 */
function clipStyle(ink: string) {
  if (props.labelPlacement !== 'inside') return undefined
  return ink === 'fill'
    ? { clipPath: `inset(0 ${(1 - hpRatio.value) * 100}% 0 0)` }
    : { clipPath: `inset(0 0 0 ${hpRatio.value * 100}%)` }
}

const inkLayers = computed(() => (props.labelPlacement === 'inside' ? ['track', 'fill'] : ['track']))

// ── Treffer-Schlag ──────────────────────────────────────────────────────────
// Rein visuell, deshalb `setTimeout` und nicht `gameTimeout()`: der Rückruf
// ändert keinen Spielzustand, er räumt nur eine Klasse ab.
const wasHit = ref(false)
let hitTimer: ReturnType<typeof setTimeout> | null = null

/** Die Dauer steht EINMAL in der Konstante und wird an das Element geschrieben;
 *  der Keyframe-NAME bleibt in der CSS-Klasse (Performance-Regel 10 — Vue hängt
 *  scoped Keyframes einen Suffix an, den ein aus JS gesetzter Name verfehlt). */
const hitDurationStyle = computed(() => ({ animationDuration: `${PLAYER_HP_HIT_FLASH_MS}ms` }))

watch(
  () => props.current,
  (now, before) => {
    // Vor dem `return`: die Richtung steuert die Geisterspur und muss auch dann
    // stimmen, wenn kein Treffer vorliegt. Der Rückruf läuft als `pre`-Watcher
    // vor dem Rendern, die Dauer greift also im selben Bild wie der neue Anteil.
    hpRising.value = now >= before
    if (now >= before || !props.hitFlash) return
    wasHit.value = false
    if (hitTimer) clearTimeout(hitTimer)
    // Ein Frame Pause, damit ein zweiter Treffer in Folge die Animation wirklich
    // neu anstösst statt sie stehen zu lassen.
    requestAnimationFrame(() => {
      wasHit.value = true
      hitTimer = setTimeout(() => {
        wasHit.value = false
        hitTimer = null
      }, PLAYER_HP_HIT_FLASH_MS)
    })
  },
)

onUnmounted(() => {
  if (hitTimer) clearTimeout(hitTimer)
})
</script>

<style scoped>
/* ── Die Wurzel ───────────────────────────────────────────────────────────
   `margin: 0` und `line-height: 1` sind kein Zierrat: das Pause-Overlay passt
   sein Panel per `transform: scale()` in die Höhe ein, und dort geht jeder
   zusätzliche Pixel des Streifens in den Fit-Scale des GANZEN Overlays ein. */
.vb {
  /* Interne Aliase: sie lösen EINMAL auf, was der Aufrufer gesetzt hat oder was
     der Default vorgibt. Ohne sie stünde jeder Fallback in jeder Regel erneut —
     und die Skala unten bräuchte ihn allein neunmal. */
  --vb-hh: var(--vb-h, 28px);
  --vb-tick-a: var(--vb-tick-inset, max(2px, calc(var(--vb-hh) * 0.28)));
  --vb-tick-b: calc(var(--vb-tick-a) * 1.25);

  margin: 0;
  min-width: 0;
  line-height: 1;
}

.vb--label-inside {
  position: relative;
  display: block;
}

/* Die Zahlen stehen im DOM nach dem Track und werden durch die Umkehr darüber
   gezeichnet — das erspart einen zweiten Markup-Zweig im Template. */
.vb--label-above {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: var(--vb-label-gap, calc(var(--vb-hh) * 0.32));
}

/* `width: 100%` ist hier kein Zierrat, sondern die Bedingung dafür, dass die
   Anordnung überhaupt funktioniert: der Track lebt von `flex: 1 1 0`, also von
   dem, was neben der Zahl übrig bleibt. Steht die Leiste selbst als Flex-Item in
   einem Flex-Container — so im Pause-Overlay —, schrumpft sie ohne diese Zeile
   auf ihre Inhaltsbreite, und der Track bekommt exakt null Pixel. */
.vb--label-right {
  display: flex;
  align-items: center;
  width: 100%;
  gap: var(--vb-label-gap, calc(var(--vb-hh) * 0.32));
}

/* ── Der Track ────────────────────────────────────────────────────────────
   Der leere Teil ist nicht einfach schwarz: eine feine Schraffur liegt darin,
   damit die Fehlmenge als beschädigter Rumpf liest statt als Loch. Rein
   statisch. */
.vb-track {
  position: relative;
  width: var(--vb-w, 100%);
  height: var(--vb-hh);
  min-width: 0;
  overflow: hidden;
  border-radius: var(--vb-radius, 4px);
  /* Eine einzelne Ecke darf abweichen — im Profilkopf folgt sie der Rundung des
     Modals, an dessen Kante die Leiste sitzt. */
  border-top-left-radius: var(--vb-radius-tl, var(--vb-radius, 4px));
  background:
    repeating-linear-gradient(135deg, rgba(255, 224, 170, 0.028) 0 5px, transparent 5px 11px),
    #0b0906;
  /* Der dritte Schatten ist ein ÄUSSERER Schein in der Zustandsfarbe — er gibt
     der Leiste ihre Präsenz auf der dunklen Bühne und wechselt mit der Stufe
     mit. Statisch, also regelkonform: animiert wird er nie, nur der einmalige
     Umschlag beim Stufenwechsel läuft als Transition. */
  box-shadow:
    inset 0 0 0 1px rgba(122, 78, 32, 0.8),
    inset 0 2px 8px rgba(0, 0, 0, 0.9),
    0 0 18px color-mix(in srgb, var(--vb-hi) 16%, transparent);
  transition: box-shadow 320ms ease;
}

.vb--label-right .vb-track {
  flex: 1 1 0;
}

.vb-ghost,
.vb-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
}

.vb-ghost {
  z-index: 0;
  background: rgba(255, 186, 160, 0.32);
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  /* Dauer und Verzögerung stehen inline — sie hängen an der Richtung. */
}

/* Der Verlauf läuft SENKRECHT. Waagerecht würde ihn das `scaleX` mitstauchen:
   bei 20 % HP läge die komplette Rampe in einem Fünftel der Breite, und die
   Farbe hinge am FÜLLSTAND statt am ZUSTAND — also an der falschen Aussage. */
.vb-fill {
  z-index: 1;
  overflow: hidden;
  background:
    linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.34),
      rgba(255, 255, 255, 0.05) 44%,
      transparent 54%
    ),
    linear-gradient(to bottom, var(--vb-hi), var(--vb-lo));
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Energiepuls durch die verbliebene Vitalität — der einzige Dauerlauf im
   Balken und reines transform/opacity. Er wird nur dort bestellt, wo die
   Leiste hoch genug ist, dass man ihn als Welle liest. */
.vb-spark {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 18%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.5) 50%, transparent);
  animation: vb-spark-sweep 3.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  pointer-events: none;
}

@keyframes vb-spark-sweep {
  0% {
    transform: translateX(-110%);
    opacity: 0;
  }
  14% {
    opacity: 1;
  }
  62% {
    opacity: 1;
  }
  74%,
  100% {
    transform: translateX(560%);
    opacity: 0;
  }
}

/* Helle Kante am Füllstand, plus Glut dahinter: der Übergang von Füllung zu
   Leere ist damit kein harter Schnitt mehr, sondern eine glühende Bruchstelle.
   Der Keil liegt INNERHALB der Kantenebene und wandert mit ihr — kein zweiter
   gebundener Wert. */
.vb-edge {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-right: 2px solid rgba(255, 255, 255, 0.85);
  transition:
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s linear;
  pointer-events: none;
}

.vb-edge::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: var(--vb-edge-flare-w, max(12px, calc(var(--vb-hh) * 1.07)));
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--vb-hi) 60%, transparent)
  );
  pointer-events: none;
}

/* ── Zustandsfarben ───────────────────────────────────────────────────────
   Sie liegen an der Wurzel, nicht an der Füllung: Füllung, Glutkeil und
   Zahlenwert ziehen dieselben drei Werte. */
/* Der Verlauf ist wortgleich der der Level-Badge im Header-Bogen
   (`.arc-level-badge` in `AppHeaderComponent.vue`) — beide sagen „alles in
   Ordnung", und zwei Grüntöne dafür standen im selben Bild nebeneinander.
   `--vb-txt` bleibt dagegen hell: die Zahl steht in Orbit, Arena und Pause auf
   der schwarzen Bühne, nicht auf der Füllung. Die Badge trägt aus demselben
   Grund weisse Schrift und kein Grün. */
.vb--green {
  --vb-hi: #4a8a28;
  --vb-lo: #2e6018;
  --vb-txt: #9ae86a;
}
.vb--yellow {
  --vb-hi: #f5d84a;
  --vb-lo: #a8760e;
  --vb-txt: #f0d060;
}
.vb--red {
  --vb-hi: #ff7a6a;
  --vb-lo: #8e2a20;
  --vb-txt: #ff8a7a;
}

/* ── Skala ────────────────────────────────────────────────────────────────
   Drei Marken statt eines durchlaufenden Rasters. Zehn gleichrangige Striche
   ergaben im transform-skalierten Pause-Panel (useFitScale, ~0,64 auf Full HD)
   gebrochene Pixelpositionen: jeder Strich landete anders im Rastergitter und
   die Reihe las sich unregelmässig, obwohl sie exakt gleich verteilt war. Ein
   `repeating-linear-gradient` hat dasselbe Problem — die Regel gilt deshalb für
   alle vier Aufrufer, auch für die, die nicht skaliert werden.

   Viertel als kurze Kerben von Ober- und Unterkante, die Hälfte zusätzlich mit
   durchgehender Linie. Jede Marke ist eine eigene Hintergrundebene mit fester
   Pixelbreite und prozentualer Position — nichts wiederholt sich, also kann
   sich auch nichts aufschaukeln. Die Kerbentiefe hängt an der Höhe: feste 8px
   gingen auf einer 10px hohen Leiste nicht auf. */
.vb-ticks {
  position: absolute;
  inset: 0;
  z-index: 3;
  background-image:
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.55) 0 var(--vb-tick-a),
      transparent var(--vb-tick-a) calc(100% - var(--vb-tick-a)),
      rgba(0, 0, 0, 0.55) calc(100% - var(--vb-tick-a)) 100%
    ),
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.62) 0 var(--vb-tick-b),
      rgba(255, 228, 176, 0.1) var(--vb-tick-b) calc(100% - var(--vb-tick-b)),
      rgba(0, 0, 0, 0.62) calc(100% - var(--vb-tick-b)) 100%
    ),
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.55) 0 var(--vb-tick-a),
      transparent var(--vb-tick-a) calc(100% - var(--vb-tick-a)),
      rgba(0, 0, 0, 0.55) calc(100% - var(--vb-tick-a)) 100%
    );
  background-size: 2px 100%;
  background-position:
    25% 0,
    50% 0,
    75% 0;
  background-repeat: no-repeat;
  pointer-events: none;
}

/* ── Treffer ──────────────────────────────────────────────────────────────
   Liegt UNTER der Beschriftung — der Text bleibt im Schlag lesbar. */
.vb-hit {
  position: absolute;
  inset: 0;
  z-index: 4;
  opacity: 0;
  background: rgba(255, 90, 45, 0.85);
  pointer-events: none;
}

.vb-hit--on {
  animation-name: vb-hit-flash;
  animation-timing-function: ease-out;
}

@keyframes vb-hit-flash {
  from {
    opacity: 0.9;
  }
  to {
    opacity: 0;
  }
}

/* Kritisch: eine rote Ebene pulst über dem Balken — animiert wird allein die
   Opazität, nicht Farbe oder Schatten. */
.vb-pulse {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgba(255, 95, 95, 0.32);
  opacity: 0;
  pointer-events: none;
}

.vb--crit .vb-pulse {
  animation: vb-crit-pulse 1.1s ease-in-out infinite;
}

@keyframes vb-crit-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

.vb-frame {
  position: absolute;
  inset: 0;
  z-index: 8;
  border-radius: inherit;
  box-shadow:
    inset 0 1px 0 rgba(255, 224, 170, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.65),
    inset 0 0 0 1px rgba(122, 78, 32, 0.55);
  pointer-events: none;
}

/* ── Die Beschriftung ─────────────────────────────────────────────────────
   Alles, was die Ebenen gemeinsam haben, steht hier EINMAL — läuft der Satz
   auseinander, sieht man an der Füllkante einen Doppelrand statt eines sauberen
   Farbwechsels. */
.vb-labels {
  min-width: 0;
}

.vb--label-inside .vb-labels {
  position: absolute;
  inset: 0;
}

.vb--label-right .vb-labels {
  flex-shrink: 0;
}

.vb-label {
  display: flex;
  align-items: center;
  gap: var(--vb-num-gap, calc(var(--vb-hh) * 0.07));
  white-space: nowrap;
  pointer-events: none;
}

.vb--label-inside .vb-label {
  position: absolute;
  inset: 0;
  z-index: 5;
  padding: 0 var(--vb-label-pad, calc(var(--vb-hh) * 0.22));
  /* Der Satz steht auf der MITTE des Balkens. Beide Stellen, die ihn `inside`
     tragen, haben eine optische Achse, an der er sich ausrichten kann: im Orbit
     die Sonnenscheibe darunter, im Profilkopf die Leiste selbst, die dort die
     volle Kopfhöhe einnimmt. Eine linksbündige Fassung stand hier einmal
     daneben — sie war auf schmale Leisten gerechnet, die es nicht mehr gibt.
     Wer sie wieder braucht, braucht auch `--vb-cur-reserve` zurück: die beiden
     hängen zusammen (siehe `.vb-cur`). */
  justify-content: center;
  /* Synchron mit der Füllung: der Farbwechsel läuft mit der Kante, nicht hinter
     ihr her. Der einzige Wert dieser Datei, der nicht `transform` ist — auf
     zwei Elementen, höchstens einmal je Spielsekunde. */
  transition: clip-path 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.vb--label-inside .vb-label--on-fill {
  z-index: 6;
}

/* Der laufende Wert bekommt eine Breitenreserve: ohne sie rückt der Trenner
   dahinter jedes Mal seitwärts, wenn aus „12.4K" ein „9.8K" wird. Bei bestellten
   Messmustern übernimmt deren Rasterzelle diese Aufgabe genauer.

   Die Zelle klebt ihren Inhalt RECHTS an, die Reserve bleibt also links davon
   stehen. Für die Anordnungen neben und über dem Balken ist das genau richtig —
   der Wert hält seine Kante zum Schrägstrich. Ein mittiger Satz verträgt sie
   dagegen NICHT: die leere Reserve zählt zur Breite des Satzes, seine Box sitzt
   mittig, die sichtbaren Zeichen darin stehen aber rechts der Achse. Beide
   `inside`-Aufrufer setzen sie deshalb auf `0` und verlassen sich stattdessen
   auf `tabular-nums` unten — gleich breite Ziffern, der Satz wandert nur beim
   Wechsel der STELLENZAHL. Gemessen wurde das an der Orbit-Leiste; die
   Herleitung steht in `PlayerHPBar.vue`. */
.vb-cur {
  display: grid;
  grid-template-areas: 'hp';
  justify-items: end;
  min-width: var(--vb-cur-reserve, 4.8ch);
}

.vb-cur > * {
  grid-area: hp;
}

/* Der dritte Wert klebt an der rechten Kante. Sein auto-Margin weiter unten
   genügt dafür nur bei linksbündigem Satz; bei mittigem NICHT — er absorbiert
   den freien Raum und zöge die Zahlen wieder nach links, die Zentrierung liefe
   ins Leere. Absolut positioniert nimmt er gar keinen Platz im Fluss ein, und
   die Mitte ist die echte Mitte des Balkens statt der Mitte des Rests. */
.vb--label-inside .vb-regen {
  position: absolute;
  right: var(--vb-label-pad, calc(var(--vb-hh) * 0.22));
  top: 50%;
  transform: translateY(-50%);
  margin-left: 0;
}

/* Nur zur Breitenmessung da: nimmt Platz ein, wird aber nicht gezeichnet. */
.vb-probe {
  visibility: hidden;
  pointer-events: none;
}

/* Muster und Live-Wert MÜSSEN dieselbe Schrift tragen: sie liegen in derselben
   Rasterzelle, und ein Muster ist nur dann ein gültiges Maß für die Spalte, wenn
   es in genau der Schrift gesetzt ist, in der auch der Wert erscheint. Erbte es
   stattdessen die Dokumentschrift — und das tat es, es stand hier keine Angabe —,
   wäre die Spalte je nach Aufrufer zu breit oder zu schmal. Bei mittigem Satz
   stünde die Zahl dadurch sichtbar neben der Achse, obwohl ihre Box mittig sitzt:
   `justify-items: end` klebt sie an den rechten Rand der Zelle, und die
   Überbreite bleibt links leer stehen. */
.vb-probe,
.vb-now {
  font-size: var(--vb-label-size, calc(var(--vb-hh) * 0.5));
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.vb-now {
  color: var(--vb-txt);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.vb-sep,
.vb-max {
  font-size: var(--vb-label-sub-size, calc(var(--vb-hh) * 0.3));
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.vb-sep {
  color: rgba(255, 246, 226, 0.42);
}

.vb-max {
  font-weight: 800;
  color: rgba(255, 246, 226, 0.6);
}

/* Der Regen-Wert ist der DRITTE Wert und weicht als erster: was er sagt, steht
   im Hover-Kasten, die beiden Zahlen und der Balken sind das, was die Leiste
   tragen MUSS. Über eine Variable statt über `:deep()` — sonst hinge der
   Aufrufer an einem internen Klassennamen dieses Bauteils. */
.vb-regen {
  display: var(--vb-regen-display, inline);
  margin-left: auto;
  font-size: var(--vb-regen-size, calc(var(--vb-hh) * 0.25));
  color: #9fd07a;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.vb-icon {
  flex-shrink: 0;
  width: var(--vb-icon-size, calc(var(--vb-hh) * 0.54));
  height: var(--vb-icon-size, calc(var(--vb-hh) * 0.54));
  color: var(--vb-txt);
}

/* Steht die Beschriftung neben oder über dem Balken, liegt sie auf der Bühne
   statt auf einer Füllung — dort trägt sie den Schein ihrer Zustandsfarbe. */
.vb--label-above .vb-now,
.vb--label-right .vb-now {
  text-shadow:
    0 0 16px color-mix(in srgb, var(--vb-txt) 45%, transparent),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

/* ── Die dunkle Zwillingsebene ────────────────────────────────────────────
   Sie liegt auf der Füllung — dunkle Tinte auf leuchtendem Grund.

   Die Regel dahinter gilt je Stufe und nicht pauschal: **eine Füllung, deren
   Mitte selbst dunkel ist, kehrt auf helle Schrift zurück.** Gemessen als
   WCAG-Kontrast gegen die Mitte des jeweiligen Verlaufs:

     gelb  #cfa72c   dunkle Tinte 8,0:1   → sie bleibt
     grün  #3c751e   dunkle Tinte 3,3:1   → helle Tinte 5,2:1
     rot   #c65245   dunkle Tinte unlesbar → helle Tinte 4,2:1

   Grün stand einmal auf der hellen Fassung #74d448 und trug die Tinte mit
   6,0:1 mühelos; mit dem Umzug auf den Verlauf der Level-Badge fiel es unter
   die Schwelle. Der dunkle Textschatten gehört zwingend dazu — über die
   Balkenhöhe schwankt der Kontrast (oben 3,9:1, unten 7,0:1), und er hebt die
   Glyphen gegen die helle obere Kante ab. */
.vb-label--on-fill .vb-now,
.vb-label--on-fill .vb-sep,
.vb-label--on-fill .vb-max,
.vb-label--on-fill .vb-regen,
.vb-label--on-fill .vb-icon {
  color: #241202;
  text-shadow: 0 1px 0 rgba(255, 240, 180, 0.45);
}

.vb--red .vb-label--on-fill .vb-now,
.vb--red .vb-label--on-fill .vb-max,
.vb--green .vb-label--on-fill .vb-now,
.vb--green .vb-label--on-fill .vb-max {
  color: #fff6e2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}

.vb--red .vb-label--on-fill .vb-sep,
.vb--green .vb-label--on-fill .vb-sep {
  color: rgba(255, 246, 226, 0.55);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}

/* Der Regen-Wert steht ganz rechts im Balken und liegt deshalb GENAU DANN auf
   der Füllung, wenn die Sonne gesund ist — bei Rot ist der Balken kurz und er
   fällt auf den leeren Track, weshalb die dunkle Tinte dort nie störte. Er
   bleibt grün statt cremeweiss zu werden: auf dem Track ist er es auch, und die
   Farbe ist das, was ihn als Regeneration und nicht als zweite HP-Zahl liest. */
.vb--green .vb-label--on-fill .vb-regen {
  color: #d6f0b8;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}

@media (prefers-reduced-motion: reduce) {
  .vb-track,
  .vb-fill,
  .vb-ghost,
  .vb-edge,
  .vb-label {
    transition: none;
  }
  .vb-hit--on,
  .vb--crit .vb-pulse,
  .vb-spark {
    animation: none;
  }
}
</style>
