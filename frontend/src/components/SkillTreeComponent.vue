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
const { fitView } = useVueFlow() // ← neu

// fitView manuell nach dem Mount auslösen
onMounted(async () => {
  // ← neu
  await nextTick()
  setTimeout(() => fitView({ padding: 0.25, duration: 300 }), 100)
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

// 2D-Positionen – frei im Raum verteilt (nach Belieben anpassen)
const positions = [
  { x: 60, y: 60 }, // Q – oben links
  { x: 320, y: 200 }, // W – Mitte
  { x: 100, y: 380 }, // E – unten links
  { x: 520, y: 360 }, // R – unten rechts
]

// ---------- Hilfsfunktion (spiegelt gameStore-Logik) ----------
function skillState(idx: number): 'bought' | 'buyable' | 'locked' {
  if (gameStore.abilityLevels[idx] > 0) return 'bought'
  if (
    (idx === 0 || gameStore.abilityLevels[idx - 1] > 0) &&
    gameStore.meeps >= SKILL_MEEP_COSTS[idx]
  )
    return 'buyable'
  return 'locked'
}

// ---------- Nodes ----------
const nodes = computed(() =>
  skills.map((skill, idx) => ({
    id: skill.key,
    type: 'skill',
    position: positions[idx],
    // Verhindert, dass VueFlow einen eigenen Wrapper-Border zeichnet
    style: { background: 'transparent', border: 'none', padding: 0 },
    data: { skill, index: idx, cost: SKILL_MEEP_COSTS[idx] },
  })),
)

// ---------- Edges  Q→W  W→E  E→R ----------
const edgeDefs = [
  { source: 'Q', target: 'W', targetIdx: 1 },
  { source: 'W', target: 'E', targetIdx: 2 },
  { source: 'E', target: 'R', targetIdx: 3 },
]

const edges = computed(() =>
  edgeDefs.map(({ source, target, targetIdx }) => {
    const s = skillState(targetIdx)
    const color =
      s === 'bought' ? '#f59e0b' : s === 'buyable' ? '#8b5cf6' : 'rgba(255,255,255,0.12)'
    return {
      id: `${source}-${target}`,
      source,
      target,
      type: 'smoothstep',
      animated: s === 'buyable',
      label: `${SKILL_MEEP_COSTS[targetIdx]} Meeps`,
      labelStyle: {
        fill: s === 'bought' ? '#fcd34d' : s === 'buyable' ? '#c4b5fd' : 'rgba(255,255,255,0.2)',
        fontWeight: '700',
        fontSize: '10px',
      },
      labelBgStyle: { fill: 'rgba(10,5,30,0.75)', rx: 4 },
      style: { stroke: color, strokeWidth: s === 'bought' ? 3 : 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    }
  }),
)

const nodeTypes = { skill: markRaw(SkillNode) }
</script>

<template>
  <div style="width: 100%; height: 460px; position: relative">
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
      <Background variant="dots" :gap="28" pattern-color="rgba(255,255,255,0.04)" :size="1.2" />
      <Controls position="bottom-left" />
      <!-- MiniMap entfernt -->
    </VueFlow>
  </div>
</template>
