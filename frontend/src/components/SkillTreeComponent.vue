<script setup lang="ts">
import { computed, markRaw, onMounted, nextTick } from 'vue'
import { VueFlow, MarkerType, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useGameStore } from '../stores/gameStore'
import SkillNode from './SkillNode.vue'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const gameStore = useGameStore()
const { fitView } = useVueFlow()

onMounted(async () => {
  await nextTick()
  setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 100)
})

const SKILL_MEEP_COSTS = [3, 8, 20, 45] as const

const skills = [
  {
    key: 'Q',
    icon: '/img/BardAbilities/BardQ.png',
    effect: '+75% CPS',
    description: '1.75× Chimes/s',
  },
  {
    key: 'W',
    icon: '/img/BardAbilities/BardW.png',
    effect: '+1500 Power',
    description: '+1500 Kampfkraft',
  },
  {
    key: 'E',
    icon: '/img/BardAbilities/BardE.png',
    effect: '−50% Meep-Kosten',
    description: 'Halbierte Kosten',
  },
  {
    key: 'R',
    icon: '/img/BardAbilities/BardR.png',
    effect: '+125% CPC',
    description: '2.25× Chimes/Click',
  },
]

const positions = [
  { x: 60, y: 60 },
  { x: 320, y: 200 },
  { x: 100, y: 380 },
  { x: 520, y: 360 },
]

function skillState(idx: number): 'bought' | 'buyable' | 'locked' {
  if (gameStore.abilityLevels[idx] > 0) return 'bought'
  if (
    (idx === 0 || gameStore.abilityLevels[idx - 1] > 0) &&
    gameStore.meeps >= SKILL_MEEP_COSTS[idx]
  )
    return 'buyable'
  return 'locked'
}

const nodes = computed(() =>
  skills.map((skill, idx) => ({
    id: skill.key,
    type: 'skill',
    position: positions[idx],
    style: { background: 'transparent', border: 'none', padding: 0 },
    data: { skill, index: idx, cost: SKILL_MEEP_COSTS[idx] },
  })),
)

const edgeDefs = [
  { source: 'Q', target: 'W', targetIdx: 1 },
  { source: 'W', target: 'E', targetIdx: 2 },
  { source: 'E', target: 'R', targetIdx: 3 },
]

const edges = computed(() =>
  edgeDefs.map(({ source, target, targetIdx }) => {
    const s = skillState(targetIdx)
    const color =
      s === 'bought' ? '#f59e0b' : s === 'buyable' ? '#a78bfa' : 'rgba(255,255,255,0.09)'
    return {
      id: `${source}-${target}`,
      source,
      target,
      type: 'smoothstep',
      animated: s === 'buyable',
      label: `${SKILL_MEEP_COSTS[targetIdx]} Meeps`,
      labelStyle: {
        fill: s === 'bought' ? '#fcd34d' : s === 'buyable' ? '#ddd6fe' : 'rgba(255,255,255,0.18)',
        fontWeight: '600',
        fontSize: '10px',
        fontFamily: 'inherit',
      },
      labelBgStyle: { fill: 'rgba(8,4,26,0.88)', rx: 6, ry: 6 },
      labelBgPadding: [6, 4] as [number, number],
      style: { stroke: color, strokeWidth: s === 'bought' ? 2.5 : 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    }
  }),
)

const nodeTypes = { skill: markRaw(SkillNode) }
</script>

<template>
  <div class="st-wrapper">
    <!-- Minimaler Header -->
    <div class="st-header">
      <span class="st-title">Fähigkeiten</span>
    </div>

    <!-- Canvas -->
    <div class="st-canvas">
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :node-types="nodeTypes"
        :nodes-draggable="false"
        :nodes-connectable="false"
        :elements-selectable="false"
        :select-nodes-on-drag="false"
        :min-zoom="0.3"
        :max-zoom="2.5"
        :fit-view-on-init="false"
        class="!bg-transparent"
      >
        <Background variant="dots" :gap="24" pattern-color="rgba(255,255,255,0.05)" :size="1" />
        <Controls position="bottom-right" />
      </VueFlow>
    </div>
  </div>
</template>

<style scoped>
/* ── Wrapper ─────────────────────────────────────────── */
.st-wrapper {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(155deg, rgba(15, 8, 42, 0.94) 0%, rgba(8, 4, 26, 0.97) 100%);
  box-shadow:
    0 0 0 1px rgba(139, 92, 246, 0.07),
    0 8px 40px rgba(0, 0, 0, 0.55);
}

/* ── Header ──────────────────────────────────────────── */
.st-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(139, 92, 246, 0.05);
}

.st-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(196, 181, 253, 0.65);
}

/* ── Canvas ──────────────────────────────────────────── */
.st-canvas {
  width: 100%;
  height: 420px;
  position: relative;
}

/* ── Controls ────────────────────────────────────────── */
:deep(.vue-flow__controls) {
  background: rgba(8, 4, 26, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  gap: 0;
}

:deep(.vue-flow__controls-button) {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
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
  background: rgba(139, 92, 246, 0.14);
  color: rgba(196, 181, 253, 0.9);
}

:deep(.vue-flow__controls-button svg) {
  fill: currentColor;
  width: 11px;
  height: 11px;
}
</style>
