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
  /** Von Suche oder Zweigfokus zurückgenommen. */
  dimmed: boolean
}>()

defineEmits<{
  select: [id: string]
  hover: [id: string | null]
}>()

/**
 * Die Kostenpille hängt nur an Knoten, die gerade zählen. Alle dreissig
 * gleichzeitig überlappten den nächsten Rang — und die Kosten stehen ohnehin
 * gross im Detail-Blatt.
 */
const showCost = computed(
  () => !props.dimmed && (props.state === 'buyable' || props.selected),
)

/** Radial nach aussen, damit die Pille nie über der eigenen Bahn liegt. */
const costOffset = computed(() => {
  const rad = (props.angleDeg * Math.PI) / 180
  return {
    left: `${Math.cos(rad) * SKILL_TREE_COST_PILL_RADIUS}px`,
    top: `${Math.sin(rad) * SKILL_TREE_COST_PILL_RADIUS}px`,
  }
})

const opacity = computed(() =>
  props.dimmed ? SKILL_TREE_NODE_OPACITY.dimmed : SKILL_TREE_NODE_OPACITY[props.state],
)

const title = computed(() =>
  props.state === 'blocked'
    ? `${props.node.name} — sealed: the other path was taken`
    : `${props.node.name} — ${props.node.effect}`,
)
</script>

<template>
  <div
    class="msn-root"
    :class="[`msn-root--${state}`, { 'msn-root--selected': selected }]"
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
   das Abzeichen nie hinter einem anderen Kreis verschwindet. */
.msn-root:has(.msn-notify) {
  z-index: 40;
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
</style>
