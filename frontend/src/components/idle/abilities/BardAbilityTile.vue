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
      Ein Verlauf oben und unten statt zweier Platten. Er fasst das Motiv ein
      und trägt gleichzeitig die Lesbarkeit von Taste und Rangkerben — dafür
      standen vorher ein Kasten mit Goldrahmen und eine Balkenreihe über die
      volle Breite im Bild.
    -->
    <span class="ab-veil" aria-hidden="true"></span>

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
   Holzrahmen wie überall im Spiel, aber auf eine dunkle Haarlinie
   zurückgenommen: vier helle 3px-Rahmen nebeneinander waren im HUD lauter als
   die Motive, die sie einfassen. Auseinandergehalten werden die Kacheln jetzt
   über die Leitfarbe an Rangkerbe und Bereitschaftsschein — dort, wo sie etwas
   bedeutet, statt rundherum. */
.ab-tile {
  position: relative;
  width: var(--ab-size, 84px);
  height: var(--ab-size, 84px);
  flex: 0 0 auto;
  padding: 0;
  overflow: hidden;
  background: #111008;
  border: 2px solid #4a2a0e;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.55),
    0 3px 10px rgba(0, 0, 0, 0.6);
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition:
    transform 140ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 160ms ease;
}

/* Der Rahmen hellt beim Überfahren auf — ein einmaliger Umschlag, kein
   Dauerläufer (Performance-Regel 2). */
.ab-tile:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #6b431a;
}
.ab-tile:active:not(:disabled) {
  transform: translateY(0) scale(0.975);
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

/* Der Einfass-Verlauf. Zwei Bahnen in einem Element — oben für die Taste,
   unten für die Kerbenreihe; die Mitte bleibt unberührt, damit das Motiv
   nichts von seiner Farbe verliert. */
.ab-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to bottom, rgba(4, 3, 1, 0.6), rgba(4, 3, 1, 0) 36%),
    linear-gradient(to top, rgba(4, 3, 1, 0.7), rgba(4, 3, 1, 0) 32%);
}

/* ── Bereit ───────────────────────────────────────────────────────────────
   Der Schein liegt statisch im CSS; animiert wird nur seine Deckkraft. Die
   Klasse setzt der Frame-Lauf, sobald die Abklingzeit durch ist.

   Zurückgenommen auf eine Innenlinie und einen Hauch Innenschein: der äußere
   Schein legte um jede bereite Kachel einen Hof, und bereit sind meistens alle
   vier gleichzeitig. */
.ab-ready-glow {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  pointer-events: none;
  opacity: 0;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--ab-color, #e8c040) 72%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--ab-color, #e8c040) 20%, transparent);
}

.ab-tile--ready .ab-ready-glow {
  animation: ab-breathe 3.4s ease-in-out infinite;
}

.ab-tile--ready:hover:not(:disabled) .ab-ready-glow {
  animation-duration: 1.8s;
}

@keyframes ab-breathe {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.68;
  }
}

/* Frisch gewirkt: ein einzelner heller Schlag. Nur Deckkraft, deshalb auch
   dann unbedenklich, wenn alle vier gleichzeitig zünden. */
.ab-tile--cast .ab-ready-glow {
  animation: ab-cast-flash 420ms ease-out;
}

@keyframes ab-cast-flash {
  0% {
    opacity: 0.85;
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
  background: rgba(6, 5, 2, 0.7);
  pointer-events: none;
}

.ab-clock {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  /* Kleiner als zuvor: die Zahl soll sagen, wie lange es noch dauert, und
     nicht die Kachel füllen. */
  font-size: calc(var(--ab-size, 84px) * 0.28);
  font-weight: 800;
  line-height: 1;
  color: #e6dcbe;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
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
  opacity: 0.42;
  filter: grayscale(70%);
}

.ab-lock {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: rgba(6, 5, 2, 0.5);
  color: #6f6244;
  pointer-events: none;
}

.ab-lock-level {
  font-size: calc(var(--ab-size, 84px) * 0.13);
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #8d7f5c;
}

/* ── Keycap ───────────────────────────────────────────────────────────────
   Der Buchstabe steht frei in der oberen Ecke — der Verlauf darunter trägt
   seine Lesbarkeit, dafür braucht er keine eigene Platte mit Rahmen mehr. Er
   ruht in gedämpftem Elfenbein und nimmt erst beim Überfahren die Leitfarbe
   der Fähigkeit an. */
.ab-key {
  position: absolute;
  top: calc(var(--ab-size, 84px) * 0.05);
  left: calc(var(--ab-size, 84px) * 0.09);
  font-size: calc(var(--ab-size, 84px) * 0.2);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.03em;
  color: #ded0a6;
  opacity: 0.78;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  transition:
    color 160ms ease,
    opacity 160ms ease;
}

.ab-tile:hover:not(:disabled) .ab-key {
  color: var(--ab-color, #e8c040);
  opacity: 1;
}

.ab-tile--locked .ab-key {
  color: #7a6d4c;
  opacity: 0.7;
}

/* ── Rangkerben ───────────────────────────────────────────────────────────
   Fünf Segmente als Haarlinie am Fuß, eingerückt statt von Kante zu Kante:
   die Reihe sagt weiterhin auf einen Blick, wie weit die Fähigkeit gewachsen
   ist, liest sich aber als Teil des Bildes und nicht als Balken davor. */
.ab-rank {
  position: absolute;
  right: calc(var(--ab-size, 84px) * 0.11);
  bottom: calc(var(--ab-size, 84px) * 0.075);
  left: calc(var(--ab-size, 84px) * 0.11);
  display: flex;
  gap: 2px;
  height: max(2px, calc(var(--ab-size, 84px) * 0.028));
  pointer-events: none;
}

.ab-pip {
  flex: 1;
  border-radius: 1px;
  background: rgba(232, 224, 196, 0.15);
}

.ab-pip--on {
  background: var(--ab-color, #e8c040);
  opacity: 0.82;
}

@media (prefers-reduced-motion: reduce) {
  .ab-tile--ready .ab-ready-glow {
    animation: none;
    opacity: 0.55;
  }
  .ab-tile--cast .ab-ready-glow {
    animation: none;
  }
  .ab-tile:hover:not(:disabled) {
    transform: none;
  }
}
</style>
