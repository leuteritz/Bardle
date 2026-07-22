<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useMeepTreeStore } from '@/stores/meepTreeStore'
import { useActionToast } from '@/composables/useActionToast'
import {
  MEEP_TREE_BADGE_ICON,
  MEEP_TREE_PLACEHOLDER_ICON,
  type MeepTreeNodeDef,
} from '@/config/meepTree'

const props = defineProps<{
  data: {
    node: MeepTreeNodeDef
    color: string
    tier: number
  }
}>()

const meepTree = useMeepTreeStore()
const { showToast } = useActionToast()

const state = computed(() => meepTree.nodeState(props.data.node.id))
/** Vorgänger gekauft, aber noch nicht genug Meeps → weniger stark gedimmt */
const reachable = computed(() => state.value === 'locked' && meepTree.isUnlocked(props.data.node.id))

/** Learnable + noch nicht angesehen → Notify-Badge über dem Node zeigen. */
const notifying = computed(() => meepTree.notifyingNodeIds.includes(props.data.node.id))

const tooltip = computed(
  () => `${props.data.node.name} — ${props.data.node.effect}\n${props.data.node.desc}`,
)

/** Hover über den Node quittiert die Notify — Badge weg, Header-Zahl sinkt. */
function acknowledge() {
  meepTree.acknowledgeNode(props.data.node.id)
}

function handleBuy() {
  if (state.value !== 'buyable') return
  if (meepTree.buyNode(props.data.node.id)) {
    showToast(`${props.data.node.name} learned!`)
  }
}
</script>

<template>
  <div
    :class="['msn-root', `msn-root--${state}`, { 'msn-root--reachable': reachable }]"
    :style="{ '--branch-color': data.color }"
    :title="tooltip"
    @mouseenter="acknowledge"
  >
    <!-- Unsichtbare Handles im Kreiszentrum → Kanten laufen exakt auf die Mitte zu -->
    <Handle type="target" :position="Position.Top" class="msn-handle" />
    <Handle type="source" :position="Position.Bottom" class="msn-handle" />

    <button
      class="msn-circle"
      style="pointer-events: all"
      :disabled="state !== 'buyable'"
      @click.stop="handleBuy"
    >
      <img :src="MEEP_TREE_PLACEHOLDER_ICON" :alt="data.node.name" class="msn-icon" />

      <!-- Notify-Badge: dieser Skill ist gerade lernbar und noch nicht angesehen -->
      <Transition name="msn-notify">
        <span v-if="notifying" class="msn-notify" aria-label="Ready to learn">!</span>
      </Transition>

      <!-- Kosten- / Aktiv-Badge mittig unter dem Kreis -->
      <span v-if="state === 'bought'" class="msn-badge msn-badge--bought">✓</span>
      <span v-else class="msn-badge" :class="`msn-badge--${state}`">
        <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="msn-badge__icon" />
        <span class="msn-badge__num">{{ data.node.cost }}</span>
      </span>
    </button>

    <div class="msn-label">
      <span class="msn-name">{{ data.node.name }}</span>
      <span class="msn-effect">{{ data.node.effect }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ── Root ─────────────────────────────────────────────────── */
.msn-root {
  position: relative;
  width: 156px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: opacity 0.2s;
}

/* Grayscale nur aufs kleine Icon statt auf den ganzen Node-Subtree —
   Filter auf großen Flächen machen Pan/Zoom im Vue-Flow-Canvas teuer. */
.msn-root--locked {
  opacity: 0.5;
}

.msn-root--locked .msn-icon {
  filter: grayscale(55%);
}

.msn-root--reachable {
  opacity: 0.82;
}

.msn-root--reachable .msn-icon {
  filter: grayscale(15%);
}

/* Handles unsichtbar im Kreiszentrum stapeln */
.msn-handle {
  opacity: 0;
  width: 2px;
  height: 2px;
  min-width: 0;
  min-height: 0;
  border: none;
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* ── Kreis-Knoten ─────────────────────────────────────────── */
.msn-circle {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid var(--rpg-border-row);
  background: radial-gradient(circle at 35% 30%, #232018, var(--rpg-bg-icon) 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s;
}

/* Gekauft → Zweigfarbe + Glow */
.msn-root--bought .msn-circle {
  border-color: var(--branch-color);
  background: radial-gradient(
    circle at 35% 30%,
    color-mix(in srgb, var(--branch-color) 22%, var(--rpg-bg-dark)),
    var(--rpg-bg-dark) 75%
  );
  box-shadow:
    0 0 16px color-mix(in srgb, var(--branch-color) 45%, transparent),
    inset 0 0 10px color-mix(in srgb, var(--branch-color) 20%, transparent);
  cursor: default;
}

/* Kaufbar → kräftige Zweigfarbe, pulsierend. Der Glow liegt in einem
   Pseudo-Element mit statischem box-shadow; animiert wird nur dessen opacity
   (GPU-kompositiert) — eine box-shadow-Animation würde jeden Frame einen
   Repaint erzwingen. */
.msn-root--buyable .msn-circle {
  border-color: color-mix(in srgb, var(--branch-color) 85%, #fff);
  background: radial-gradient(
    circle at 35% 30%,
    color-mix(in srgb, var(--branch-color) 16%, var(--rpg-bg-dark)),
    var(--rpg-bg-dark) 75%
  );
  cursor: pointer;
}

.msn-root--buyable .msn-circle::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  box-shadow: 0 0 18px color-mix(in srgb, var(--branch-color) 60%, transparent);
  opacity: 0;
  pointer-events: none;
  animation: msn-pulse 2s ease-in-out infinite;
}

.msn-root--buyable .msn-circle:hover {
  transform: scale(1.08);
  box-shadow: 0 0 22px color-mix(in srgb, var(--branch-color) 65%, transparent);
}

.msn-root--buyable .msn-circle:active {
  transform: scale(0.95);
}

/* Zweig-Identität vor dem Kauf: Border schon leicht in der Zweigfarbe getönt,
   ab "reachable" etwas kräftiger — voll gefärbt erst nach dem Kauf. */
.msn-root--locked .msn-circle {
  cursor: not-allowed;
  border-color: color-mix(in srgb, var(--branch-color) 32%, var(--rpg-border-row));
}

.msn-root--reachable .msn-circle {
  border-color: color-mix(in srgb, var(--branch-color) 50%, var(--rpg-border-row));
}

@keyframes msn-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

/* Kein image-rendering: crisp-edges — Nearest-Neighbor-Downscaling macht die
   Icons matschig; glattes Bicubic-Scaling der 128px-Quelle bleibt scharf. */
.msn-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

/* ── Notify-Badge über dem Kreis ──────────────────────────── */
/* Gleiche Sprache wie die RPG-Notifys (Shop/Expedition/Forge): kleiner,
   pulsierender Kreis — hier in Skill-Tree-Magenta, oben rechts am Node. */
.msn-notify {
  position: absolute;
  top: -9px;
  right: -9px;
  z-index: 5;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, #ec4899, #be185d);
  border: 2px solid #f9a8d4;
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  box-shadow:
    0 0 8px rgba(236, 72, 153, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  animation: msn-notify-glow 1.8s ease-in-out infinite;
}

@keyframes msn-notify-glow {
  0%,
  100% {
    box-shadow:
      0 0 6px rgba(236, 72, 153, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
  50% {
    box-shadow:
      0 0 14px rgba(236, 72, 153, 0.9),
      0 0 24px rgba(190, 24, 93, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
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

/* ── Badge am Kreisrand ───────────────────────────────────── */
/* Meep-Kosten als gerahmter Pill-Badge (Icon + Zahl) komplett unterhalb des
   Kreises, horizontal zentriert — überlappt den Kreisrand nicht. */
.msn-badge {
  position: absolute;
  top: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 3px 12px;
  border-radius: 999px;
  border: 1px solid var(--rpg-border-row);
  background: var(--rpg-bg-deep);
  font-size: 17px;
  font-weight: 800;
  color: var(--rpg-text-dim);
  white-space: nowrap;
}

.msn-badge__icon {
  height: 20px;
  width: auto;
  flex-shrink: 0;
}

/* line-height: 1 hält die Ziffern in der Flex-Mitte — Icon und Zahl sitzen
   dadurch als Paar zentriert im Pill. */
.msn-badge__num {
  line-height: 1;
}

/* Kosten-Badge in der Zweigfarbe — gesperrt dezent getönt, kaufbar kräftig
   aufgehellt; "kaufbar" signalisiert zusätzlich der Puls-Glow am Kreis. */
.msn-badge--locked {
  border-color: color-mix(in srgb, var(--branch-color) 35%, var(--rpg-border-row));
  color: color-mix(in srgb, var(--branch-color) 55%, var(--rpg-text-dim));
}

.msn-badge--buyable {
  border-color: color-mix(in srgb, var(--branch-color) 80%, var(--rpg-border-row));
  background: color-mix(in srgb, var(--branch-color) 14%, var(--rpg-bg-deep));
  color: color-mix(in srgb, var(--branch-color) 85%, #fff);
}

.msn-badge--bought {
  border-color: color-mix(in srgb, var(--branch-color) 65%, var(--rpg-border-row));
  background: var(--rpg-bg-deep);
  color: var(--branch-color);
  font-size: 17px;
  padding: 3px 12px;
}

/* ── Label unter dem Kreis ────────────────────────────────── */
/* Genug Abstand, damit der Badge (endet ~31px unter dem Kreis) nicht mit dem
   Node-Namen kollidiert. */
.msn-label {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  text-align: center;
}

.msn-name {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--rpg-text);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.msn-effect {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--branch-color);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

/* Effekt-Text bleibt in jeder Phase in der Zweigfarbe — der grüne Kosten-Badge
   ist das alleinige "kaufbar"-Signal. */
</style>
