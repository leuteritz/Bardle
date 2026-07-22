<script setup lang="ts">
import { computed, markRaw, onMounted, nextTick } from 'vue'
import {
  VueFlow,
  useVueFlow,
  type Node,
  type Edge,
  type NodeTypesObject,
} from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import { Icon } from '@iconify/vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import { useMeepTreeStore } from '@/stores/meepTreeStore'
import { MEEP_TREE_BRANCHES } from '@/config/meepTree'
import MeepSkillNode from './MeepSkillNode.vue'
import MeepStartNode from './MeepStartNode.vue'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const meepTree = useMeepTreeStore()
const { fitView } = useVueFlow()

onMounted(async () => {
  await nextTick()
  // Wie in klassischen Skill-Webs: lesbar starten (Zoom-Clamp), Rest per Pan/Zoom.
  // Ohne duration → sofortiger Snap; die Zoomanimation direkt beim Mount
  // kollidierte mit den Mount-Kosten und drückte die FPS.
  setTimeout(() => fitView({ padding: 0.06, minZoom: 0.62, maxZoom: 0.9 }), 100)
})

// ── Radiales Netz-Layout ───────────────────────────────────
// Ein Startknoten in der Mitte, fünf Pfade strahlen in alle
// Richtungen aus; leichter Zickzack pro Stufe für den organischen
// "Netz"-Look. Die y-Achse ist leicht gestaucht (Breitbild), die
// Radien sind so gewählt, dass sich Kreise und Labels nie überlappen.
const BASE_ANGLES = [-90, -18, 54, 126, 198] // Grad, gleichmäßig über 360°
const TIER_JITTER = [0, 10, -9, 10, -8] // Zickzack pro Stufe
const TIER_RADIUS = [200, 355, 510, 665, 820]
const Y_SQUASH = 0.85

// Kreis-Mittelpunkt-Offsets innerhalb der Node-Wrapper (müssen zum CSS passen)
const SKILL_CENTER = { x: 78, y: 40 }
const START_CENTER = { x: 80, y: 48 }

function nodeCenter(branchIdx: number, tierIdx: number): { x: number; y: number } {
  const angleDeg = BASE_ANGLES[branchIdx] + TIER_JITTER[tierIdx]
  const rad = (angleDeg * Math.PI) / 180
  const r = TIER_RADIUS[tierIdx]
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r * Y_SQUASH }
}

const nodes = computed<Node[]>(() => {
  const result: Node[] = [
    {
      id: 'start',
      type: 'start',
      position: { x: -START_CENTER.x, y: -START_CENTER.y },
      draggable: false,
      data: {},
    },
  ]

  MEEP_TREE_BRANCHES.forEach((branch, i) => {
    branch.nodes.forEach((node, idx) => {
      const c = nodeCenter(i, idx)
      result.push({
        id: node.id,
        type: 'skill',
        position: { x: c.x - SKILL_CENTER.x, y: c.y - SKILL_CENTER.y },
        draggable: false,
        data: { node, color: branch.color, tier: idx + 1 },
      })
    })
  })

  return result
})

// Primitiver Key → Edges werden nur neu gebaut, wenn ein Node-Status wirklich
// kippt, nicht bei jeder Meep-Änderung (die nodeState reaktiv triggert).
const allNodeIds = MEEP_TREE_BRANCHES.flatMap((branch) => branch.nodes.map((n) => n.id))
const edgeStateKey = computed(() => allNodeIds.map((id) => meepTree.nodeState(id)).join(','))

const edges = computed<Edge[]>(() => {
  const states = edgeStateKey.value.split(',')
  const result: Edge[] = []
  let flatIdx = 0

  MEEP_TREE_BRANCHES.forEach((branch) => {
    branch.nodes.forEach((node, idx) => {
      const state = states[flatIdx++]
      const bought = state === 'bought'
      const buyable = state === 'buyable'
      // Immer die Zweigfarbe — gesperrt schwach, kaufbar kräftig, gekauft voll.
      // Alpha als Hex-Suffix (Branch-Farben sind 6-stellige Hex-Werte).
      const stroke = bought ? branch.color : buyable ? `${branch.color}e0` : `${branch.color}55`
      result.push({
        id: `e-${node.id}`,
        source: idx === 0 ? 'start' : branch.nodes[idx - 1].id,
        target: node.id,
        type: 'straight',
        style: {
          stroke,
          strokeWidth: bought ? 3.5 : buyable ? 2.75 : 2.25,
          // Ketten-Optik wie im klassischen Skill-Web: offene Pfade gestrichelt
          strokeDasharray: bought ? undefined : '7 5',
        },
      })
    })
  })

  return result
})

// Vue Flow erwartet NodeProps-kompatible Komponenten — unsere Nodes nutzen nur `data`,
// daher der Cast (gleiche Struktur wie in den Vue-Flow-Beispielen üblich).
const nodeTypes = {
  skill: markRaw(MeepSkillNode),
  start: markRaw(MeepStartNode),
} as unknown as NodeTypesObject
</script>

<template>
  <div class="st-canvas">
    <CosmicStageBackground />

    <!-- Admin toolbar: unlock / reset the whole tree at once -->
    <div class="st-admin">
      <span class="st-admin-tag">Admin</span>
      <button
        class="st-admin-btn st-admin-btn--unlock"
        title="Learn every skill for free"
        @click="meepTree.adminUnlockAll()"
      >
        <Icon icon="game-icons:padlock-open" width="18" height="18" />
        Unlock All
      </button>
      <button
        class="st-admin-btn st-admin-btn--reset"
        title="Unlearn every skill"
        @click="meepTree.adminResetAll()"
      >
        <Icon icon="game-icons:broom" width="18" height="18" />
        Reset All
      </button>
    </div>

    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="false"
      :select-nodes-on-drag="false"
      :min-zoom="0.25"
      :max-zoom="2"
      :fit-view-on-init="false"
      class="st-flow !bg-transparent"
    >
      <Controls position="bottom-right" />
    </VueFlow>
  </div>
</template>

<style scoped>
/* ── Canvas füllt den ganzen Tab ─────────────────────────── */
.st-canvas {
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
  background: var(--rpg-bg-deep);
}

/* Skill web floats above the shared cosmic backdrop */
.st-flow {
  position: relative;
  z-index: 1;
}

/* ── Admin toolbar (top-left overlay) ────────────────────── */
.st-admin {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--rpg-bg-icon);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
}

.st-admin-tag {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  padding-right: 4px;
  border-right: 1px solid var(--rpg-border-row);
}

.st-admin-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  font-family: 'MedievalSharp', cursive;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: var(--bp-radius);
  border: 1px solid var(--rpg-wood-mid);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.st-admin-btn--unlock {
  color: #7ad84a;
  border-color: #2e5a1a;
}
.st-admin-btn--unlock:hover {
  background: #13220c;
  border-color: #52b830;
  color: #9cf06a;
}

.st-admin-btn--reset {
  color: #cc6050;
  border-color: #5a221a;
}
.st-admin-btn--reset:hover {
  background: #220f0c;
  border-color: #cc6050;
  color: #e88070;
}

/* A node whose skill just became learnable lifts its WHOLE wrapper above the
   neighbouring nodes, so its notify badge is never hidden behind another
   node's effect label. Vue Flow writes z-index inline → override with
   !important. Reverts automatically once the badge (v-if) is gone. */
:deep(.vue-flow__node:has(.msn-notify)) {
  z-index: 50 !important;
}

/* ── Vue-Flow Controls → RPG-Holzrahmen-Stil ─────────────── */
:deep(.vue-flow__controls) {
  background: var(--rpg-bg-icon);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
  gap: 0;
}

:deep(.vue-flow__controls-button) {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--rpg-border-row);
  color: var(--rpg-text-dim);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;
}

:deep(.vue-flow__controls-button:last-child) {
  border-bottom: none;
}

:deep(.vue-flow__controls-button:hover) {
  background: var(--rpg-bg-hover);
  color: var(--rpg-gold);
}

:deep(.vue-flow__controls-button svg) {
  fill: currentColor;
  width: 11px;
  height: 11px;
}
</style>
