<template>
  <button
    ref="tileEl"
    type="button"
    class="ab-tile"
    :class="{ 'ab-tile--locked': locked }"
    :style="{ '--ab-color': def.color }"
    :disabled="locked"
    :aria-label="ariaLabel"
    @click="$emit('cast')"
    @mouseenter="$emit('hover', true)"
    @mouseleave="$emit('hover', false)"
    @focus="$emit('hover', true)"
    @blur="$emit('hover', false)"
  >
    <img class="ab-art" :src="def.image" :alt="def.name" draggable="false" @dragstart.prevent />

    <!--
      Bereitschaftsschein. Eigene Ebene, damit der Schein selbst statisch im
      CSS steht und nur seine Deckkraft atmet — ein pulsender box-shadow am
      Rahmen würde die Box samt Schatten pro Frame neu rastern, und hier
      stehen bis zu vier davon nebeneinander (Performance-Regel 11).
      Die `ready`-Klasse setzt der Frame-Lauf der Leiste direkt am Element.
    -->
    <span class="ab-ready-glow" aria-hidden="true"></span>

    <!--
      Abklingzeit. Der Schleier deckt die Kachel und weicht von unten nach
      oben zurück; geschrieben wird ausschließlich `transform: scaleY` — auch
      das direkt aus dem Frame-Lauf, nicht über Vue.
    -->
    <span ref="sweepEl" class="ab-sweep" aria-hidden="true"></span>
    <span ref="clockEl" class="ab-clock" aria-hidden="true"></span>

    <!-- Gesperrt: das Schloss steht über dem Schleier, die Stufe darunter. -->
    <span v-if="locked" class="ab-lock">
      <Icon icon="lucide:lock" width="22" height="22" aria-hidden="true" />
      <span class="ab-lock-level">LV {{ def.unlockLevel }}</span>
    </span>

    <!-- Die Taste selbst. Sie bleibt auch im Schloss lesbar: der Spieler soll
         sehen, welche Taste ihn hier später erwartet. -->
    <span class="ab-key">{{ def.key }}</span>

    <!-- Rang als Kerbenreihe am Fuß — fünf Stufen, gefüllt in der Leitfarbe. -->
    <span v-if="!locked" class="ab-rank" aria-hidden="true">
      <span
        v-for="pip in ABILITY_MAX_RANK"
        :key="pip"
        class="ab-pip"
        :class="{ 'ab-pip--on': pip <= rank }"
      ></span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ABILITY_MAX_RANK } from '@/config/constants'
import type { BardAbilityDef } from '@/types'

const props = defineProps<{
  def: BardAbilityDef
  rank: number
  locked: boolean
}>()

defineEmits<{ cast: []; hover: [boolean] }>()

/**
 * Die drei Elemente, die der Frame-Lauf der Leiste beschreibt. Sie werden nach
 * oben gereicht statt hier selbst getrieben: ein rAF je Kachel wären vier
 * Schleifen für eine einzige Zeile (Performance-Regel 3).
 */
const tileEl = ref<HTMLElement | null>(null)
const sweepEl = ref<HTMLElement | null>(null)
const clockEl = ref<HTMLElement | null>(null)

defineExpose({ tileEl, sweepEl, clockEl })

const ariaLabel = computed(() =>
  props.locked
    ? `${props.def.name} — unlocks at level ${props.def.unlockLevel}`
    : `${props.def.name} (${props.def.key}), rank ${props.rank}`,
)
</script>

<style scoped>
/* ── Die Kachel ───────────────────────────────────────────────────────────
   Holzrahmen wie jeder Container im Spiel, aber mit der Leitfarbe der
   Fähigkeit als innerster Linie — vier Kacheln nebeneinander sind sonst vier
   gleiche braune Quadrate, und im Kampf muss der Blick sie am Rand
   auseinanderhalten, nicht am Motiv. */
.ab-tile {
  position: relative;
  width: var(--ab-size, 84px);
  height: var(--ab-size, 84px);
  flex: 0 0 auto;
  padding: 0;
  overflow: hidden;
  background: #111008;
  border: 3px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 6px 18px rgba(0, 0, 0, 0.8);
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ab-tile:hover:not(:disabled) {
  transform: translateY(-3px);
}
.ab-tile:active:not(:disabled) {
  transform: translateY(-1px) scale(0.97);
}

.ab-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Merklich verkleinert (512 → 84–128 px): Qualität geht hier vor
     Rasterkosten, das Motiv steht dauerhaft im Bild. */
  image-rendering: high-quality;
}

/* ── Bereit ───────────────────────────────────────────────────────────────
   Der Schein liegt statisch im CSS; animiert wird nur seine Deckkraft. Die
   Klasse setzt der Frame-Lauf, sobald die Abklingzeit durch ist. */
.ab-ready-glow {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  pointer-events: none;
  opacity: 0;
  box-shadow:
    inset 0 0 0 2px var(--ab-color, #e8c040),
    inset 0 0 16px color-mix(in srgb, var(--ab-color, #e8c040) 45%, transparent),
    0 0 18px color-mix(in srgb, var(--ab-color, #e8c040) 40%, transparent);
}

.ab-tile--ready .ab-ready-glow {
  animation: ab-breathe 2.2s ease-in-out infinite;
}

@keyframes ab-breathe {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

/* Frisch gewirkt: ein einzelner heller Schlag. Nur Deckkraft, deshalb auch
   dann unbedenklich, wenn alle vier gleichzeitig zünden. */
.ab-tile--cast .ab-ready-glow {
  animation: ab-cast-flash 420ms ease-out;
}

@keyframes ab-cast-flash {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ── Abklingzeit ──────────────────────────────────────────────────────────
   Der Schleier hängt an der Oberkante und schrumpft nach oben weg, gibt die
   Kachel also von unten frei — dieselbe Leserichtung wie eine Fortschritts-
   leiste. `scaleY` wird pro Frame direkt am Element gesetzt. */
.ab-sweep {
  position: absolute;
  inset: 0;
  transform-origin: top center;
  transform: scaleY(0);
  background: rgba(6, 5, 2, 0.78);
  pointer-events: none;
}

.ab-clock {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--ab-size, 84px) * 0.36);
  font-weight: 900;
  line-height: 1;
  color: #f2ead2;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
  pointer-events: none;
}

.ab-tile--cooling .ab-clock {
  display: flex;
}

/* Nur solange der Schleier wirklich pro Frame beschrieben wird. Ohne die
   Promotion rastert der Browser die Kachel bei jeder Änderung neu; dauerhaft
   gesetzt wäre sie dagegen eine eigene Ebene je Kachel, für die 99 % der Zeit,
   in denen nichts kühlt (Performance-Regel 12). */
.ab-tile--cooling .ab-sweep {
  will-change: transform;
}

/* ── Gesperrt ─────────────────────────────────────────────────────────────
   Grauschleier und Schloss stehen still — hier ist nichts zu tun, also auch
   nichts zu betonen. */
.ab-tile--locked {
  cursor: not-allowed;
}
.ab-tile--locked .ab-art {
  opacity: 0.5;
  filter: grayscale(55%);
}

.ab-lock {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: rgba(6, 5, 2, 0.62);
  color: #8a7a52;
  pointer-events: none;
}

.ab-lock-level {
  font-size: calc(var(--ab-size, 84px) * 0.15);
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #b8a878;
}

/* ── Keycap ───────────────────────────────────────────────────────────────
   Oben links, auf einer eigenen dunklen Platte: über dem Motiv allein wäre
   der Buchstabe je nach Bild mal lesbar und mal nicht. */
.ab-key {
  position: absolute;
  top: 0;
  left: 0;
  min-width: calc(var(--ab-size, 84px) * 0.3);
  padding: 1px 5px 2px;
  background: #1e1006;
  border-right: 2px solid #5c3310;
  border-bottom: 2px solid #5c3310;
  border-radius: 2px 0 4px 0;
  font-size: calc(var(--ab-size, 84px) * 0.24);
  font-weight: 900;
  line-height: 1.1;
  color: #e8c040;
  text-align: center;
  pointer-events: none;
}

.ab-tile--locked .ab-key {
  color: #8a7a52;
}

/* ── Rangkerben ───────────────────────────────────────────────────────────
   Fünf Segmente über die volle Breite am Fuß. Sie sagen auf einen Blick, wie
   weit die Fähigkeit gewachsen ist, ohne eine Zahl zu belegen. */
.ab-rank {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  gap: 1px;
  height: calc(var(--ab-size, 84px) * 0.07);
  padding: 0 1px 1px;
  pointer-events: none;
}

.ab-pip {
  flex: 1;
  background: rgba(0, 0, 0, 0.65);
  box-shadow: inset 0 0 0 1px rgba(122, 78, 32, 0.5);
}

.ab-pip--on {
  background: var(--ab-color, #e8c040);
}

@media (prefers-reduced-motion: reduce) {
  .ab-tile--ready .ab-ready-glow {
    animation: none;
    opacity: 0.8;
  }
  .ab-tile--cast .ab-ready-glow {
    animation: none;
  }
  .ab-tile:hover:not(:disabled) {
    transform: none;
  }
}
</style>
