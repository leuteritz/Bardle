<script setup lang="ts">
/**
 * Eine Karte im Pause-Overlay: der Drifter-Buff, der gerade wegläuft.
 *
 * Der Drifter selbst kommt in der Pause nicht vor — neue erscheinen nicht
 * (`DrifterLayer` sperrt den Spawn, sobald der Idle-Layer verdeckt ist), und
 * anklicken lässt sich durch das Overlay ohnehin keiner. Was WEITERLÄUFT, ist
 * sein Lohn: `drifterStore.tick()` lässt die Buffs ablaufen, auch pausiert.
 * Genau das gehört hierher — es ist das einzige, was die Pause den Spieler
 * beim Drifter kostet.
 *
 * Der Bogen LEERT sich wie bei der Stern-Karte: hier verstreicht etwas Gutes.
 * Beim Void füllt derselbe Bogen sich, dort rückt etwas Schlechtes heran — und
 * daran sind die drei Kartentypen in einer Reihe auseinanderzuhalten.
 *
 * EINE Karte für alle laufenden Buffs, nicht eine je Buff: gezeigt wird der,
 * dessen Uhr zuerst abläuft, daneben stehen die übrigen als Punkte.
 */
import { computed, ref, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import {
  PAUSE_STAR_CARD_HEIGHT,
  PAUSE_STAR_CARD_PAD_X,
  PAUSE_STAR_DIAL_PX,
  PAUSE_STAR_DIAL_GAP_PX,
  PAUSE_STAR_RING_RADIUS,
  PAUSE_STAR_RING_STROKE,
  PAUSE_STAR_RING_CIRCUMFERENCE,
  PAUSE_STAR_URGENT_SECS,
  PAUSE_DRIFTER_CARD_WIDTH,
  PAUSE_DRIFTER_PIPS_MAX,
} from '@/config/constants'
import { gameNow } from '@/utils/game/gameClock'

const props = defineProps<{
  /** Restsekunden des ablaufenden Buffs — die Zahl im Ring. */
  secs: number
  /** ABSOLUTER Zeitpunkt seines Endes (Wanduhr, ms). */
  endsAt: number
  /** Gesamte Laufzeit desselben Buffs in ms — der Nenner des Bogens. */
  durationMs: number
  /** Name des Drifters, der ihn hinterlassen hat. */
  name: string
  /** Sein Glyph. */
  icon: string
  /** Seine Eigenfarbe. */
  color: string
  /** Farbe seiner Seltenheitsstufe — trägt den linken Rand. */
  rankColor: string
  /** Welche Achse er anhebt. */
  axis: string
  /** Um wie viel — der stärkste Faktor des Buffs. */
  multiplier: number
  /** Wie viele Buffs insgesamt laufen. */
  count: number
}>()

const isUrgent = computed(() => props.secs <= PAUSE_STAR_URGENT_SECS)
const gainPct = computed(() => Math.round((props.multiplier - 1) * 100))

const pips = computed(() => Math.min(props.count, PAUSE_DRIFTER_PIPS_MAX))
const overflow = computed(() => Math.max(0, props.count - PAUSE_DRIFTER_PIPS_MAX))

// ── Zeitbogen ───────────────────────────────────────────────────────────────
// Gleiche Mechanik wie Stern- und Void-Karte: die Animation hängt am absoluten
// Endzeitpunkt und damit an der Uhr des Browsers statt am Abtasttakt des
// Overlays.

const arcEl = ref<SVGCircleElement | null>(null)

function armDial(): void {
  const el = arcEl.value
  if (!el) return
  const total = Math.max(1, props.durationMs)
  const elapsed = Math.min(total, Math.max(0, total - (props.endsAt - gameNow())))
  // Ohne Zurücksetzen samt erzwungenem Reflow übernimmt der Browser die
  // laufende Animation gleichen Namens mitsamt ihrer alten Phase.
  el.style.animationName = 'none'
  void el.getBoundingClientRect()
  el.style.animationDuration = `${total}ms`
  el.style.animationDelay = `${-elapsed}ms`
  // Leeren statt setzen: der Name steht in der Klasse, und Vue hängt scoped
  // Keyframes einen Scope-Suffix an — ein hier geschriebener Name träfe sie
  // nicht mehr.
  el.style.animationName = ''
}

onMounted(armDial)
// Nur wenn sich die UHR ändert (ein anderer Buff läuft zuerst ab).
watch([() => props.endsAt, () => props.durationMs], armDial)

/** Statischer Rückfall für `prefers-reduced-motion`, siehe PauseStarCard. */
const dashOffset = computed(() => {
  void props.secs
  const total = Math.max(1, props.durationMs)
  const left = Math.min(1, Math.max(0, (props.endsAt - gameNow()) / total))
  return PAUSE_STAR_RING_CIRCUMFERENCE * (1 - left)
})
</script>

<template>
  <div
    class="pdc"
    :class="{ 'pdc--urgent': isUrgent }"
    :style="{
      '--pdc-color': color,
      '--pdc-rank': rankColor,
      '--pdc-w': `${PAUSE_DRIFTER_CARD_WIDTH}px`,
      '--pdc-h': `${PAUSE_STAR_CARD_HEIGHT}px`,
      '--pdc-pad': `${PAUSE_STAR_CARD_PAD_X}px`,
      '--pdc-dial': `${PAUSE_STAR_DIAL_PX}px`,
      '--pdc-gap': `${PAUSE_STAR_DIAL_GAP_PX}px`,
      '--pdc-circ': PAUSE_STAR_RING_CIRCUMFERENCE,
    }"
    :title="`${name} — ${axis.toLowerCase()} buff, ${secs}s left`"
  >
    <!-- Zifferblatt -->
    <div class="pdc-dial" aria-hidden="true">
      <svg class="pdc-dial__svg" viewBox="0 0 100 100">
        <circle
          class="pdc-dial__track"
          cx="50"
          cy="50"
          :r="PAUSE_STAR_RING_RADIUS"
          :stroke-width="PAUSE_STAR_RING_STROKE"
        />
        <circle
          ref="arcEl"
          class="pdc-dial__arc"
          cx="50"
          cy="50"
          :r="PAUSE_STAR_RING_RADIUS"
          :stroke-width="PAUSE_STAR_RING_STROKE"
          :stroke-dasharray="PAUSE_STAR_RING_CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
      <span class="pdc-dial__secs">{{ secs }}</span>
    </div>

    <div class="pdc-body">
      <!-- Das Glyph liegt HINTER dem Text und läuft nach links ins Dunkel aus —
           dieselbe Ebenenordnung wie das Bewohnerbild der Void-Karte. Als eigene
           Spalte daneben blieben von 208 px zu wenige für den Namen. -->
      <div class="pdc-art" aria-hidden="true">
        <Icon :icon="icon" class="pdc-art__glyph" width="72" height="72" />
        <span class="pdc-art__veil"></span>
      </div>

      <span class="pdc-name">{{ name }}</span>

      <!-- Was er anhebt und um wie viel. Der Zugewinn steht in Prozent und nicht
           als Faktor: dieselbe Sprache, die die Buff-Leiste draußen spricht. -->
      <span class="pdc-effect">
        <span class="pdc-effect__gain">+{{ gainPct }}%</span>
        <span class="pdc-effect__axis">{{ axis }}</span>
      </span>

      <!-- Wie viele Buffs insgesamt laufen. Der erste Punkt ist der, dessen Uhr
           die Karte zeigt, deshalb hebt er sich ab. -->
      <span class="pdc-pips" :aria-label="`${count} running`">
        <span
          v-for="i in pips"
          :key="i"
          class="pdc-pip"
          :class="{ 'pdc-pip--lead': i === 1 }"
        ></span>
        <span v-if="overflow > 0" class="pdc-pips__more">+{{ overflow }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.pdc {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--pdc-gap);
  width: var(--pdc-w);
  height: var(--pdc-h);
  padding: 0 var(--pdc-pad);
  background: #0e1410;
  border: 1px solid color-mix(in srgb, var(--pdc-color) 40%, #1c2a20);
  border-left: 3px solid var(--pdc-rank);
  border-radius: 5px;
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  /* Einmaliger Umschlag, keine Dauerschleife — Farbe und Rahmen dürfen deshalb
     eine Transition tragen (Performance-Regel 2). */
  transition:
    border-color 0.3s ease,
    background 0.3s ease;
}

.pdc--urgent {
  background: #1a1206;
  border-color: #c89040;
}

/* ── Zifferblatt ── */
.pdc-dial {
  position: relative;
  flex-shrink: 0;
  width: var(--pdc-dial);
  height: var(--pdc-dial);
}

.pdc-dial__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  overflow: visible;
}

.pdc-dial__track {
  fill: none;
  stroke: #1c2a20;
}

/* Der Bogen LEERT sich — beim Void füllt derselbe Bogen sich. Dauer und
   (negative) Verzögerung schreibt `armDial` inline, der NAME steht hier, damit
   Vues Scope-Suffix an den Keyframes greift. Kein `transition` auf
   stroke-dashoffset — die Animation führt den Wert selbst. */
.pdc-dial__arc {
  fill: none;
  stroke: var(--pdc-color);
  stroke-linecap: round;
  animation-name: drifter-dial;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  transition: stroke 300ms ease;
}

.pdc--urgent .pdc-dial__arc {
  stroke: #e8c040;
}

@keyframes drifter-dial {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: var(--pdc-circ);
  }
}

/* Ohne Animation (reduced motion) trägt das `stroke-dashoffset`-Attribut aus
   dem Template den Stand — die Regel oben darf ihn dann nicht überschreiben. */
@media (prefers-reduced-motion: reduce) {
  .pdc-dial__arc {
    animation-name: none;
  }
}

.pdc-dial__secs {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}

.pdc--urgent .pdc-dial__secs {
  color: #f0d060;
}

/* ── Körper ── */
.pdc-body {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  flex: 1;
  align-self: stretch;
  padding: 6px 0;
}

/* ── Bildnis ── */
.pdc-art {
  position: absolute;
  top: -1px;
  right: calc(-1 * var(--pdc-pad));
  bottom: -1px;
  width: 72%;
  overflow: hidden;
  pointer-events: none;
}

.pdc-art__glyph {
  position: absolute;
  top: 50%;
  right: 6%;
  transform: translateY(-50%) rotate(-8deg);
  color: var(--pdc-color);
  opacity: 0.55;
}

/* Der Verlauf nach links ist der Grund, warum der Text lesbar bleibt: er ist
   dort dicht, wo Schrift steht, und gibt das Glyph erst rechts frei. */
.pdc-art__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    #0e1410 0%,
    rgba(14, 20, 16, 0.92) 34%,
    rgba(14, 20, 16, 0.45) 74%,
    rgba(14, 20, 16, 0.28) 100%
  );
}

.pdc-name,
.pdc-effect,
.pdc-pips {
  position: relative;
  z-index: 1;
}

.pdc-name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.1;
  color: #f0e4c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Der Name steht über dem Glyph — ohne diesen Schatten verlöre er sich. */
  text-shadow: 0 1px 4px rgba(3, 8, 5, 0.95);
}

/* ── Wirkung ── */
.pdc-effect {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
}

.pdc-effect__gain {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  color: #9ae86a;
  font-variant-numeric: tabular-nums;
}

.pdc-effect__axis {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: rgba(216, 200, 160, 0.62);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Zählwerk ── */
.pdc-pips {
  display: flex;
  align-items: center;
  gap: 3px;
}

.pdc-pip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pdc-rank) 55%, #1c2a20);
}

.pdc-pip--lead {
  width: 7px;
  height: 7px;
  background: var(--pdc-rank);
}

.pdc-pips__more {
  margin-left: 2px;
  font-size: 9.5px;
  font-weight: 800;
  color: #b8a878;
  font-variant-numeric: tabular-nums;
}
</style>
