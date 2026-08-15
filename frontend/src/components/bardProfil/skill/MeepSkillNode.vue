<script setup lang="ts">
/**
 * Ein Knoten auf der Orbit-Bühne.
 *
 * Der Klick KAUFT nicht — er wählt aus. Gekauft wird ausschliesslich in der
 * Fusszeile des Detail-Blatts, wo neben dem Preis auch steht, was der Knoten
 * am Spiel ändert. Vorher lag beides auf derselben Geste: der Spieler klickte
 * einen Kreis und wusste hinterher nicht, was sich geändert hatte.
 *
 * Die Position kommt fertig gerechnet von aussen (`utils/ui/skillTreeLayout`).
 * Diese Komponente kennt weder Winkel noch Radien — nur ihren Zustand.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { MEEP_TREE_BADGE_ICON, type MeepTreeNodeDef } from '@/config/progression/meepTree'
import type { MeepTreeNodeState } from '@/stores/progression/meepTreeStore'
import {
  MEEP_BEST_BUY_LABEL,
  MEEP_SPOTLIGHT_DIM_OPACITY,
  MEEP_SPOTLIGHT_NODE_SCALE,
  MEEP_SPOTLIGHT_PING_MS,
  SKILL_TREE_COST_PILL_RADIUS,
  SKILL_TREE_NODE_ICON_SIZE,
  SKILL_TREE_NODE_OPACITY,
  SKILL_TREE_NODE_SIZE,
} from '@/config/constants'

const props = defineProps<{
  node: MeepTreeNodeDef
  color: string
  x: number
  y: number
  /** Richtung vom Bühnenzentrum weg — die Kostenpille weicht dorthin aus. */
  angleDeg: number
  state: MeepTreeNodeState
  selected: boolean
  notifying: boolean
  /** Vom ZWEIGFOKUS zurückgenommen — einer Absicht, die stehen bleibt. */
  dimmed: boolean
  /** Der Zeiger meint genau diesen Knoten — hier oder auf seiner Karte drüben. */
  spot: boolean
  /**
   * Ein Spotlight liegt, aber weder auf diesem Knoten noch auf seiner Kette.
   * Getrennt von `dimmed`, weil es etwas anderes sagt und weicher zugreift:
   * „ich zeige gerade woandershin" gegen „das habe ich beiseitegeschoben".
   */
  spotAway: boolean
  /**
   * Der günstigste gerade bezahlbare Knoten — derselbe, den das Panel rechts
   * gross zeigt. Ohne die Marke hier fände der Spieler die Empfehlung unter
   * dreissig Kreisen nicht wieder.
   */
  bestBuy: boolean
}>()

defineEmits<{
  select: [id: string]
  hover: [id: string | null]
}>()

/** Zurückgenommen, gleich aus welchem der beiden Gründe. */
const receded = computed(() => props.dimmed || props.spotAway)

/**
 * Die Kostenpille hängt nur an Knoten, die gerade zählen. Alle dreissig
 * gleichzeitig überlappten den nächsten Rang — und die Kosten stehen ohnehin
 * gross im Detail-Blatt.
 *
 * `spot` gehört dazu: wer auf eine Karte drüben zeigt, fragt als Erstes nach dem
 * Preis, und der Knoten ist gerade das Einzige, was noch hell steht.
 */
const showCost = computed(
  () => !receded.value && (props.state === 'buyable' || props.selected || props.spot),
)

/**
 * Radial nach aussen, weg vom Kern. Die Länge ist knapp bemessen
 * (`SKILL_TREE_COST_PILL_RADIUS`): innen liegen nur 33 px zwischen zwei Rängen,
 * und im engsten Punkt zwischen zwei Armen wäre eine längere Pille im Knoten
 * des NACHBARARMS gelandet.
 */
const costOffset = computed(() => {
  const rad = (props.angleDeg * Math.PI) / 180
  /* `calc(50% + …)`, nicht der blosse Versatz: ein Inline-`left` ERSETZT das
     `left: 50%` der Regel, es addiert sich nicht dazu. Ohne die halbe Kante
     kreiste die Pille um die obere linke ECKE des Knotens statt um seine Mitte
     und sass gemessen 20px zu weit links und oben — auf den weiten Bahnen von
     früher fiel das nicht auf, zwischen zwei Spiralarmen schon. */
  return {
    left: `calc(50% + ${Math.cos(rad) * SKILL_TREE_COST_PILL_RADIUS}px)`,
    top: `calc(50% + ${Math.sin(rad) * SKILL_TREE_COST_PILL_RADIUS}px)`,
  }
})

/**
 * Der Zweigfokus gewinnt über das Spotlight — er greift härter zu (0,2 gegen
 * 0,3), und er ist die dauerhafte Aussage. Ein Knoten, den schon der Fokus
 * gedämpft hat, wird vom Spotlight nicht ein zweites Mal gedämpft.
 */
const opacity = computed(() =>
  props.dimmed
    ? SKILL_TREE_NODE_OPACITY.dimmed
    : props.spotAway
      ? MEEP_SPOTLIGHT_DIM_OPACITY
      : SKILL_TREE_NODE_OPACITY[props.state],
)

/* Beide gehen als Zeichenkette ins CSS — der Wert steht in den Konstanten, der
   KEYFRAME-Name bleibt in der Klasse (Performance-Regel 10). */
const spotScale = `${MEEP_SPOTLIGHT_NODE_SCALE}`
const spotPingMs = `${MEEP_SPOTLIGHT_PING_MS}ms`

const title = computed(() =>
  props.state === 'blocked'
    ? `${props.node.name} — sealed: the other path was taken`
    : `${props.node.name} — ${props.node.effect}`,
)

/** Was der Ring bedeutet, für alle, die den Farbcode nicht lesen. */
const bestBuyTitle = `${MEEP_BEST_BUY_LABEL} — cheapest you can afford`
</script>

<template>
  <div
    class="msn-root"
    :class="[
      `msn-root--${state}`,
      { 'msn-root--selected': selected, 'msn-root--spot': spot, 'msn-root--away': spotAway },
    ]"
    :style="{
      '--branch-color': color,
      left: `${x}px`,
      top: `${y}px`,
      width: `${SKILL_TREE_NODE_SIZE}px`,
      height: `${SKILL_TREE_NODE_SIZE}px`,
      margin: `${-SKILL_TREE_NODE_SIZE / 2}px 0 0 ${-SKILL_TREE_NODE_SIZE / 2}px`,
      opacity,
    }"
    @mouseenter="$emit('hover', node.id)"
    @mouseleave="$emit('hover', null)"
  >
    <!-- Die Marke der Empfehlung. Eigene Ebene mit STATISCHEM Schein, animiert
         wird nur ihre Deckkraft — dasselbe Rezept wie der Puls des kaufbaren
         Kreises darunter.

         Ein Schriftzug wie im Sternbaum steht hier NICHT: dort liegen die
         Knoten auf vier weiten Ringen, hier auf einem Spiralarm mit 33 bis 68px
         radialem Abstand zwischen den Rängen, der in y-Richtung noch weiter
         zusammenschrumpft. Die Kostenpille beansprucht diesen Raum bereits und
         hängt genau deshalb nur an kaufbaren Knoten. Der Ring ist die einzige
         grüne Marke auf der Bühne, und der Name steht gross im Panel daneben. -->
    <span v-if="bestBuy && !receded" class="msn-best-ring" :title="bestBuyTitle" />

    <!-- Die Marke des Spotlights. Genau EINE Ebene je Spotlight, nicht eine je
         Knoten — und weil `v-if` sie bei jedem neuen Ziel neu erzeugt, fängt ihr
         einmaliger Ping von selbst wieder von vorn an, ohne dass irgendwo eine
         Animation zurückgesetzt werden müsste. Muster `.node-spot` im
         Sternbaum des Shops. -->
    <span v-if="spot" class="msn-spot" aria-hidden="true" />

    <button class="msn-circle" :title="title" @click="$emit('select', node.id)">
      <Icon
        :icon="node.icon"
        :width="SKILL_TREE_NODE_ICON_SIZE"
        :height="SKILL_TREE_NODE_ICON_SIZE"
        class="msn-icon"
      />

      <!-- Dieser Skill ist lernbar und noch nicht angesehen -->
      <Transition name="msn-notify">
        <span v-if="notifying" class="msn-notify" aria-label="Ready to learn">!</span>
      </Transition>

      <span v-if="state === 'bought'" class="msn-check">✓</span>
    </button>

    <Transition name="msn-cost">
      <span v-if="showCost" class="msn-cost" :style="costOffset">
        <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="msn-cost__icon" />
        <span v-ink-center class="msn-cost__num">{{ node.cost }}</span>
      </span>
    </Transition>
  </div>
</template>

<style scoped>
/* Das Element sitzt mit seinem MITTELPUNKT auf (x, y) — die Bühne rechnet in
   Kreiszentren, nicht in Kastenecken. Grösse und der Versatz um ihre Hälfte
   kommen inline aus `SKILL_TREE_NODE_SIZE`; hier stünde sonst eine zweite
   Zahl, die beim Verstellen der Konstante still danebenläge. */
.msn-root {
  position: absolute;
  transition: opacity 0.2s;
}

.msn-root--selected {
  z-index: 30;
}

/* Ein Knoten mit Notify hebt seinen ganzen Wrapper über die Nachbarn, damit
   das Abzeichen nie hinter einem anderen Kreis verschwindet. Dasselbe gilt für
   die Empfehlungsmarke: ihr Ring ragt 6px über den Kreis hinaus und läge auf
   den dichten inneren Rängen sonst unter dem Nachbarrang. */
.msn-root:has(.msn-notify),
.msn-root:has(.msn-best-ring) {
  z-index: 40;
}

/* Der hervorgehobene Knoten liegt über allem anderen — er ist auf den inneren
   Rängen sonst der Einzige, dessen Ring unter dem Nachbarrang verschwände,
   gerade weil sein Kreis dabei wächst. */
.msn-root--spot {
  z-index: 50;
}

/* ── Der Kreis ────────────────────────────────────────────── */
.msn-circle {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--rpg-border-row);
  background: radial-gradient(circle at 35% 30%, #232018, var(--rpg-bg-icon) 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  outline: none;
  cursor: pointer;
  /* Nur der einmalige Umschlag trägt eine Transition — kein Dauerläufer. */
  transition:
    border-color 0.18s,
    box-shadow 0.18s,
    transform 0.14s;
}

.msn-circle:hover {
  transform: scale(1.14);
}

/* Auf den Knoten zeigen und auf seine Karte drüben zeigen sind EINE Geste — sie
   dürfen nicht zwei Grössen ergeben. Der Wert liegt deshalb über dem
   Zeige-Sprung darüber und steht bei gleicher Spezifität (0,2,0) NACH ihm; der
   Klick-Rückstoss unten gewinnt aus demselben Grund über beide. */
.msn-root--spot .msn-circle {
  transform: scale(v-bind(spotScale));
  transition-duration: 0.12s;
}

.msn-circle:active {
  transform: scale(0.94);
}

/* Gekauft → volle Zweigfarbe, statischer Schein */
.msn-root--bought .msn-circle {
  border-color: var(--branch-color);
  background: radial-gradient(
    circle at 35% 30%,
    color-mix(in srgb, var(--branch-color) 24%, var(--rpg-bg-dark)),
    var(--rpg-bg-dark) 75%
  );
  box-shadow:
    0 0 12px color-mix(in srgb, var(--branch-color) 42%, transparent),
    inset 0 0 8px color-mix(in srgb, var(--branch-color) 18%, transparent);
}

/* Kaufbar → aufgehellte Zweigfarbe. Der Puls liegt in einer EIGENEN Ebene mit
   statischem box-shadow; animiert wird nur deren opacity — ein animierter
   Schatten rastert die Box jeden Frame neu. */
.msn-root--buyable .msn-circle {
  border-color: color-mix(in srgb, var(--branch-color) 85%, #fff);
  background: radial-gradient(
    circle at 35% 30%,
    color-mix(in srgb, var(--branch-color) 18%, var(--rpg-bg-dark)),
    var(--rpg-bg-dark) 75%
  );
}

.msn-root--buyable .msn-circle::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  box-shadow: 0 0 16px color-mix(in srgb, var(--branch-color) 62%, transparent);
  opacity: 0;
  pointer-events: none;
  animation: msn-pulse 2s ease-in-out infinite;
}

@keyframes msn-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

/* ── Was während eines Spotlights stillsteht ──────────────────
   Das ist nicht Kosmetik, sondern der eigentliche Gewinn der Sache: ohne diese
   zwei Regeln liefen während eines Spotlights weiter bis zu fünf Kaufbar-Pulse
   im Feld, davon vier an Kreisen, die gerade auf 0,3 zurückgetreten sind und
   deren Schein niemand mehr liest. Mit ihnen läuft im Knotenfeld genau eine
   Animation. Dieselbe Auflösung wie `.node-circle--dim .node-glow` im Shop.

   Am Spot-Knoten selbst steht der Puls voll und still — sonst schwebten dort
   zwei atmende Ringe mit verschiedenem Takt übereinander. */
.msn-root--away .msn-circle::after {
  animation: none;
}

/* Das Notify-ABZEICHEN bleibt stehen — es trägt eine Information, keine Zierde,
   und tritt mit seinem Knoten ohnehin auf 0,3 zurück. Nur sein Schein hört auf
   zu atmen. Gemessen macht das den Unterschied zwischen fünf und einer
   laufenden Animation im Knotenfeld. */
.msn-root--away .msn-notify::after {
  animation: none;
}

.msn-root--spot .msn-circle::after {
  animation: none;
  opacity: 1;
}

.msn-root--reachable .msn-circle {
  border-color: color-mix(in srgb, var(--branch-color) 50%, var(--rpg-border-row));
}

.msn-root--locked .msn-circle {
  border-color: color-mix(in srgb, var(--branch-color) 30%, var(--rpg-border-row));
}

/* Versiegelt: die Spur einer Entscheidung, kein Ziel mehr. Gestrichelter Rand
   statt durchgezogenem — auch ohne Farbe erkennbar. */
.msn-root--blocked .msn-circle {
  border-style: dashed;
  border-color: var(--rpg-text-muted);
  cursor: default;
}

/* Ausgewählt → Goldring. Statischer Schatten, der Wechsel läuft über die
   Transition oben. */
.msn-root--selected .msn-circle {
  border-color: var(--rpg-gold);
  box-shadow:
    0 0 0 3px var(--rpg-bg-deep),
    0 0 0 5px var(--rpg-gold-dim),
    0 0 18px rgba(232, 192, 64, 0.5);
}

/* ── Marke der Empfehlung ─────────────────────────────────────
   Dieselben Farben wie das Abzeichen im Panel (#52b830 / #4a8a28 / #9fe062) und
   wie die BEST-BUY-Marke im Sternbaum des Shops — die drei Stellen zeigen
   dasselbe Ding. Der Schein ist statisch, animiert wird nur die Deckkraft. */
.msn-best-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid #52b830;
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.75);
  pointer-events: none;
  animation: msn-best-breathe 1.8s ease-in-out infinite alternate;
}

@keyframes msn-best-breathe {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}

/* ── Marke des Spotlights ─────────────────────────────────────
   Sie trägt die ZWEIGFARBE, nicht Gold und nicht Grün: die drei Marken auf der
   Bühne dürfen sich nicht verwechseln lassen — Gold heisst „ausgewählt", Grün
   heisst „Empfehlung", und diese hier heisst nur „darauf zeige ich gerade".

   Sie liegt weiter aussen als die Empfehlungsmarke (-7 gegen -6), damit beide
   an demselben Knoten als zwei Ringe lesbar bleiben statt als ein dicker. Der
   Schein ist STATISCH, animiert werden ausschliesslich `opacity` und
   `transform` (Performance-Regel 2/11). */
.msn-spot {
  position: absolute;
  inset: -7px;
  border-radius: 50%;
  border: 2px solid var(--branch-color);
  box-shadow: 0 0 18px color-mix(in srgb, var(--branch-color) 70%, transparent);
  pointer-events: none;
  animation: msn-spot-breathe 1.6s ease-in-out infinite alternate;
}

@keyframes msn-spot-breathe {
  from {
    opacity: 0.55;
    transform: scale(1);
  }
  to {
    opacity: 1;
    transform: scale(1.06);
  }
}

/* Der einmalige Ping auf derselben Marke: ein Ring, der aufgeht und vergeht.
   Er läuft genau einmal je Ziel — das Element ist bei jedem Wechsel neu. */
.msn-spot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 2px solid var(--branch-color);
  animation: msn-spot-ping v-bind(spotPingMs) ease-out 1 forwards;
}

@keyframes msn-spot-ping {
  from {
    opacity: 0.7;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.9);
  }
}

/* ── Glyph ────────────────────────────────────────────────── */
.msn-icon {
  flex-shrink: 0;
  color: color-mix(in srgb, var(--branch-color) 38%, var(--rpg-text-dim));
  transition: color 0.18s;
}

.msn-root--reachable .msn-icon {
  color: color-mix(in srgb, var(--branch-color) 62%, var(--rpg-text-dim));
}

.msn-root--buyable .msn-icon {
  color: color-mix(in srgb, var(--branch-color) 80%, #fff);
}

.msn-root--bought .msn-icon {
  color: var(--branch-color);
}

.msn-root--blocked .msn-icon {
  color: var(--rpg-text-muted);
}

/* ── Häkchen am gekauften Knoten ──────────────────────────── */
.msn-check {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-bg-deep);
  background: var(--branch-color);
  border: 1.5px solid var(--rpg-bg-deep);
  pointer-events: none;
}

/* ── Notify ───────────────────────────────────────────────── */
/* Dieselbe Sprache wie die übrigen RPG-Notifys (Shop, Expedition, Forge):
   kleiner pulsierender Kreis, hier in Skill-Tree-Magenta. Der Schein liegt
   auch hier in einer eigenen Ebene, animiert wird nur deren opacity. */
.msn-notify {
  position: absolute;
  top: -7px;
  right: -7px;
  z-index: 5;
  min-width: 17px;
  height: 17px;
  padding: 0 3px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, #ec4899, #be185d);
  border: 2px solid #f9a8d4;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  box-shadow:
    0 0 8px rgba(236, 72, 153, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.msn-notify::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 999px;
  box-shadow: 0 0 14px rgba(236, 72, 153, 0.9);
  opacity: 0;
  animation: msn-pulse 1.8s ease-in-out infinite;
}

.msn-notify-enter-active,
.msn-notify-leave-active {
  transition:
    transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.18s ease;
}
.msn-notify-enter-from,
.msn-notify-leave-to {
  transform: scale(0);
  opacity: 0;
}

/* ── Kostenpille ──────────────────────────────────────────── */
/* Sitzt radial ausserhalb des Kreises; `left`/`top` kommen als Inline-Offset
   vom Winkel, die Zentrierung besorgt das Transform. */
.msn-cost {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--branch-color) 60%, var(--rpg-border-row));
  background: var(--rpg-bg-deep);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, -50%);
  color: color-mix(in srgb, var(--branch-color) 70%, var(--rpg-text-dim));
}

.msn-root--buyable .msn-cost {
  border-color: color-mix(in srgb, var(--branch-color) 85%, var(--rpg-border-row));
  background: color-mix(in srgb, var(--branch-color) 16%, var(--rpg-bg-deep));
  color: color-mix(in srgb, var(--branch-color) 85%, #fff);
}

.msn-cost__icon {
  height: 14px;
  width: auto;
  flex-shrink: 0;
}

.msn-cost__num {
  line-height: 1;
}

.msn-cost-enter-active,
.msn-cost-leave-active {
  transition: opacity 0.15s ease;
}
.msn-cost-enter-from,
.msn-cost-leave-to {
  opacity: 0;
}

/* Beide Dauerläufer stehen still — sie sagen ihre Aussage auch als Zustand:
   der kaufbare Kreis über seine Randfarbe, die Empfehlung über ihren Ring. */
@media (prefers-reduced-motion: reduce) {
  .msn-root--buyable .msn-circle::after {
    animation: none;
    opacity: 0.7;
  }

  .msn-best-ring {
    animation: none;
    opacity: 1;
  }

  /* Der Ring bleibt, sein Atem und sein Ping gehen — er sagt seine Aussage auch
     als Zustand. */
  .msn-spot {
    animation: none;
    opacity: 1;
  }

  .msn-spot::after {
    animation: none;
    opacity: 0;
  }
}
</style>
