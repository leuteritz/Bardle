<script setup lang="ts">
import { computed, markRaw, onMounted, nextTick } from 'vue'
import { VueFlow, MarkerType, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useGameStore } from '@/stores/gameStore'
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
    // ── Farben im RPG-Wood-Schema ──────────────────────────
    const color =
      s === 'bought'
        ? '#e8c040' // --rpg-gold
        : s === 'buyable'
          ? '#6ec040' // --rpg-green-border
          : 'rgba(92, 51, 16, 0.45)' // --rpg-wood-mid gedimmt
    return {
      id: `${source}-${target}`,
      source,
      target,
      type: 'smoothstep',
      animated: s === 'buyable',
      label: `${SKILL_MEEP_COSTS[targetIdx]} Meeps`,
      labelStyle: {
        fill: s === 'bought' ? '#e8c040' : s === 'buyable' ? '#6ec040' : 'rgba(136, 88, 40, 0.7)',
        fontWeight: '700',
        fontSize: '16px',
      },
      labelBgStyle: { fill: 'rgba(17, 16, 8, 0.92)', rx: 4, ry: 4 },
      labelBgPadding: [6, 4] as [number, number],
      style: { stroke: color, strokeWidth: s === 'bought' ? 2.5 : 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    }
  }),
)

const nodeTypes = { skill: markRaw(SkillNode) }
</script>

<template>
  <div class="st-wrapper rpg-frame">
    <div class="rpg-accent-bar" />
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
        <Background variant="dots" :gap="24" pattern-color="#2a2a2a" :size="1" />
        <Controls position="bottom-right" />
      </VueFlow>
    </div>
  </div>
</template>

<style scoped>
/* ── Wrapper: nutzt .rpg-frame aus globalem Theme ──────── */
.st-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* rpg-frame liefert: bg-deep, wood-border, inset-shadows */
}

/* ── Canvas ──────────────────────────────────────────────── */
.st-canvas {
  width: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  background: var(--rpg-bg-deep);
}

/* ── Vue-Flow Controls → RPG-Holzrahmen-Stil ─────────────── */
:deep(.vue-flow__controls) {
  background: var(--rpg-bg-icon);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
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
