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

const tooltip = computed(
  () => `${props.data.node.name} — ${props.data.node.effect}\n${props.data.node.desc}`,
)

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

      <!-- Kosten- / Aktiv-Badge mittig unter dem Kreis -->
      <span v-if="state === 'bought'" class="msn-badge msn-badge--bought">✓</span>
      <span v-else class="msn-badge" :class="`msn-badge--${state}`">
        <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="msn-badge__icon" />
        {{ data.node.cost }}
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

/* ── Badge am Kreisrand ───────────────────────────────────── */
/* Meep-Kosten als gerahmter Pill-Badge (Icon + Zahl) komplett unterhalb des
   Kreises, horizontal zentriert — überlappt den Kreisrand nicht. */
.msn-badge {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 9px;
  border-radius: 999px;
  border: 1px solid var(--rpg-border-row);
  background: var(--rpg-bg-deep);
  font-size: 12.5px;
  font-weight: 800;
  line-height: 1.5;
  color: var(--rpg-text-dim);
  white-space: nowrap;
}

.msn-badge__icon {
  height: 14px;
  width: auto;
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
  font-size: 13px;
  padding: 1px 9px;
}

/* ── Label unter dem Kreis ────────────────────────────────── */
/* Genug Abstand, damit der Badge (endet ~27px unter dem Kreis) nicht mit dem
   Node-Namen kollidiert. */
.msn-label {
  margin-top: 34px;
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
