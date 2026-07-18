<template>
  <div ref="panelEl" class="tree-panel" :style="stageStyle" @wheel.prevent="onWheel">
    <!-- shared cosmic backdrop (same starfield as Team / Planets / Skill Tree) -->
    <CosmicStageBackground />

    <!-- Phase dock — current sun phase, progress & evolve -->
    <div class="phase-dock" :class="{ 'phase-dock--ready': solarStore.canUpgradeStar }">
      <Icon
        :icon="solarStore.isCometState ? 'game-icons:asteroid' : 'game-icons:sunbeams'"
        width="26"
        height="26"
        class="dock-icon"
      />
      <div class="dock-body">
        <div class="dock-title-row">
          <span
            class="dock-phase-name"
            :style="{ color: solarStore.isCometState ? COMET_PHASE_DATA.accent : currentStage.phasePrimary }"
          >
            {{ solarStore.isCometState ? COMET_PHASE_DATA.name : currentStage.name }}
          </span>
          <span class="dock-phase-count">
            {{
              solarStore.isCometState
                ? `Phase 1 / ${SUN_PHASE_DISPLAY_TOTAL}`
                : `Phase ${solarStore.starPhase + SUN_PHASE_DISPLAY_OFFSET} / ${SUN_PHASE_DISPLAY_TOTAL}`
            }}
          </span>
          <span class="dock-pips">
            <span
              v-for="(phase, i) in STAR_PHASE_DATA"
              :key="phase.name"
              class="dock-pip"
              :class="{ 'dock-pip--done': !solarStore.isCometState && i <= solarStore.starPhase }"
              :style="!solarStore.isCometState && i <= solarStore.starPhase ? { background: phase.phasePrimary, boxShadow: `0 0 4px ${phase.phaseGlow}` } : {}"
              :title="phase.name"
            />
          </span>
        </div>
        <div class="dock-hint">
          <template v-if="solarStore.isCometState && solarStore.canUpgradeStar">
            Ignite the comet into <b class="dock-hint-next">Spark</b> — your first star.
          </template>
          <template v-else-if="solarStore.isCometState && !solarStore.branchesReadyForEvolve">
            Grow all five core rays to Lv 1 —
            <b class="dock-hint-next">{{ solarStore.cometStage }} / 5 kindled</b>
          </template>
          <template v-else-if="solarStore.isCometState">
            The comet must drift a while longer — ready in
            <b class="dock-hint-next">{{ formatDuration(solarStore.phaseDwellRemainingMs) }}</b>
          </template>
          <template v-else-if="solarStore.starPhase >= STAR_PHASE_DATA.length - 1">
            The sun has reached its <b class="dock-hint-next">Finale</b> — the tree is fully grown.
          </template>
          <template v-else-if="solarStore.canUpgradeStar">
            Evolve to <b class="dock-hint-next">{{ nextStage.name }}</b> —
            <b class="dock-hint-unlock">{{ nextPhaseUnlockText }}</b>
          </template>
          <template v-else-if="!solarStore.branchesReadyForEvolve">
            Grow all five core rays to Lv {{ solarStore.starPhase + 1 }} to ready the next evolution.
          </template>
          <template v-else>
            The sun must dwell in this phase — ready in
            <b class="dock-hint-next">{{ formatDuration(solarStore.phaseDwellRemainingMs) }}</b>
          </template>
        </div>
      </div>
      <button
        v-if="solarStore.canUpgradeStar || solarStore.isUpgrading"
        class="dock-evolve-btn"
        :disabled="solarStore.isUpgrading"
        @click="handleEvolve"
      >
        {{
          solarStore.isUpgrading
            ? solarStore.isCometState ? 'Igniting…' : 'Evolving…'
            : solarStore.isCometState ? '✦ Ignite' : '✦ Evolve'
        }}
      </button>
      <span
        v-else-if="!solarStore.isCometState && solarStore.starPhase >= STAR_PHASE_DATA.length - 1"
        class="dock-complete"
      >✦ COMPLETE</span>
    </div>

    <!-- Zoom control -->
    <div class="tree-zoom">
      <button class="zoom-btn" aria-label="Zoom out" @click="zoomBy(-1)">−</button>
      <div class="zoom-track">
        <div class="zoom-knob" :style="{ left: zoomKnobLeft }" />
      </div>
      <button class="zoom-btn" aria-label="Zoom in" @click="zoomBy(1)">＋</button>
    </div>

    <!-- Scaled tree stage -->
    <div
      class="tree-stage"
      :style="{
        transform: `translate(-50%, -50%) scale(${totalScale})`,
        '--inv-scale': (1 / totalScale).toFixed(4),
      }"
    >
      <svg
        class="tree-svg"
        :viewBox="`0 0 ${FORGE_STAGE_SIZE} ${FORGE_STAGE_SIZE}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Phase-band rings -->
        <circle :cx="C" :cy="C" :r="FORGE_RING_ROOT_R" fill="none" stroke="#3a2a12" stroke-width="1.5" />
        <circle
          :cx="C" :cy="C" :r="FORGE_RING_BRANCH_R" fill="none"
          :stroke="branchesUnlocked ? '#4a6a2a' : '#2a1a08'"
          stroke-width="1.5" stroke-dasharray="5 5" :opacity="branchesUnlocked ? 0.6 : 0.9"
        />
        <circle
          :cx="C" :cy="C" :r="FORGE_RING_LEAF_R" fill="none"
          :stroke="leavesUnlocked ? '#4a6a2a' : '#2a1a08'"
          stroke-width="1.5" stroke-dasharray="4 7" :opacity="leavesUnlocked ? 0.6 : 0.9"
        />

        <!-- Limbs: sun → root, root → branch, branch → leaf (dim base) -->
        <g stroke="#4a3418" stroke-width="4" stroke-linecap="round" fill="none">
          <line
            v-for="limb in limbs" :key="limb.key + '-base'"
            :x1="limb.x1" :y1="limb.y1" :x2="limb.x2" :y2="limb.y2"
          />
        </g>
        <!-- Active limbs (target node has levels) -->
        <g stroke-width="2.5" stroke-linecap="round" fill="none">
          <line
            v-for="limb in activeLimbs" :key="limb.key + '-lit'"
            :x1="limb.x1" :y1="limb.y1" :x2="limb.x2" :y2="limb.y2"
            :stroke="limb.color" opacity="0.55"
          />
        </g>
      </svg>

      <!-- Ring labels -->
      <div class="ring-label ring-label--root" :style="ringLabelStyle(FORGE_RING_ROOT_R)">
        Phase 1–2
      </div>
      <div
        class="ring-label" :class="branchesUnlocked ? 'ring-label--now' : 'ring-label--locked'"
        :style="ringLabelStyle(FORGE_RING_BRANCH_R)"
      >
        {{ branchRingLabel }}
      </div>
      <div
        class="ring-label" :class="leavesUnlocked ? 'ring-label--now' : 'ring-label--locked'"
        :style="ringLabelStyle(FORGE_RING_LEAF_R)"
      >
        {{ leafRingLabel }}
      </div>

      <!-- Sun -->
      <div class="sun-wrapper" :class="{ 'sun-flash': purchaseFlash }">
        <CometDisc v-if="solarStore.isCometState" :diameter="SHOP_SUN_MIN_DIAMETER" />
        <div v-else class="tree-stage-sun" />
        <div
          v-if="solarStore.canUpgradeStar || solarStore.isUpgrading"
          class="next-phase-preview"
          :style="nextPhasePreviewStyle"
        />
        <div class="sun-hp-text">
          <span class="hp-label">HP</span>
          <span class="hp-value" :class="{ 'hp-value--low': playerStore.isLow }">
            {{ Math.ceil(playerStore.currentHP) }}
          </span>
          <span class="hp-max">/ {{ playerStore.maxHP }}</span>
        </div>
      </div>

      <!-- Nodes -->
      <div
        v-for="node in allNodes"
        :key="node.id"
        class="tree-node"
        :style="nodePos(node)"
      >
        <div
          class="node-circle"
          :class="[`node-circle--${node.sizeClass}`, `node-circle--${nodeState(node)}`]"
          :style="{ '--node-color': node.color }"
          @click="handleNodeClick(node)"
          @mouseenter="hoveredId = node.id"
          @mouseleave="hoveredId = null"
        >
          <Icon :icon="node.icon" :width="node.iconSize" :height="node.iconSize" :style="{ color: node.color }" />
          <span v-if="nodeLevelOf(node) > 0 || nodeState(node) !== 'locked'" class="node-level">
            {{ nodeLevelOf(node) }}/{{ nodeMaxOf(node) }}
          </span>
        </div>

        <!-- Tooltip -->
        <div
          v-if="hoveredId === node.id"
          class="node-tooltip"
          :class="isTooltipBelow(node.angleDeg) ? 'node-tooltip--below' : 'node-tooltip--above'"
        >
          <div class="tt-head">
            <span class="tt-name" :style="{ color: node.color }">{{ node.name }}</span>
            <span class="tt-tier">{{ tierLabel(node) }}</span>
          </div>
          <div class="tt-desc">{{ nodeDesc(node) }}</div>
          <template v-if="nodeState(node) === 'locked'">
            <div class="tt-lock">{{ lockReason(node) }}</div>
          </template>
          <template v-else-if="nodeLevelOf(node) >= nodeMaxOf(node)">
            <div class="tt-maxed">✦ MAXED</div>
          </template>
          <template v-else>
            <div v-if="nodeNextLine(node)" class="tt-next">
              <span class="tt-arrow">→</span> {{ nodeNextLine(node) }}
            </div>
            <div class="tt-cost-row">
              <span class="tt-cost" :class="{ 'tt-cost--cant': !canBuy(node) }">
                {{ formatNumber(nodeGoldOf(node)) }} G
              </span>
              <span
                v-for="(qty, matId) in nodeMaterialsOf(node)"
                :key="matId"
                class="tt-mat"
                :class="{ 'tt-mat--missing': (inventoryStore.collectedMaterials[matId] ?? 0) < qty }"
              >
                <img v-if="materialImage(matId)" :src="materialImage(matId)" class="tt-mat-img" :alt="materialName(matId)" />
                ×{{ qty }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { useSolarUpgradeStore, type SolarBranchId } from '@/stores/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/starForgeStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { FORGE_NODES } from '@/config/starForge'
import { MATERIALS } from '@/config/materials'
import { formatNumber } from '@/config/numberFormat'
import { useActionToast } from '@/composables/useActionToast'
import type { ForgeNodeDef } from '@/types'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import {
  SOLAR_MAX_LEVELS,
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  SHOP_SUN_MIN_DIAMETER,
  SHOP_SUN_MAX_DIAMETER,
  FORGE_STAGE_SIZE,
  FORGE_RING_ROOT_R,
  FORGE_RING_BRANCH_R,
  FORGE_RING_LEAF_R,
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  FORGE_TREE_ZOOM_MIN,
  FORGE_TREE_ZOOM_MAX,
  FORGE_TREE_ZOOM_STEP,
  FORGE_TREE_ZOOM_DEFAULT,
  SUN_PHASE_DISPLAY_OFFSET,
  SUN_PHASE_DISPLAY_TOTAL,
} from '@/config/constants'

const solarStore = useSolarUpgradeStore()
const forgeStore = useStarForgeStore()
const playerStore = usePlayerStore()
const inventoryStore = useInventoryStore()
const { showToast } = useActionToast()

const C = FORGE_STAGE_SIZE / 2

// ── Node model — roots (solar) + branches/leaves (forge) in one render list ──
interface TreeNode {
  id: string
  name: string
  icon: string
  color: string
  angleDeg: number
  dist: number
  tier: 'root' | 'branch' | 'leaf'
  sizeClass: 'root' | 'branch' | 'leaf'
  iconSize: number
  parentId: string | null
  def?: ForgeNodeDef
}

interface RootDef {
  id: SolarBranchId
  name: string
  icon: string
  angleDeg: number
  color: string
  statLabel: string
}

const ROOTS: RootDef[] = [
  { id: 'flightSpeed',     name: 'Flight Speed',   icon: 'game-icons:feathered-wing',  angleDeg: 270, color: '#e8c040', statLabel: 'CpS Mult.' },
  { id: 'maxHp',           name: 'Max HP',         icon: 'game-icons:health-increase', angleDeg: 342, color: '#e05050', statLabel: 'HP Bonus'  },
  { id: 'chimesPerClick',  name: 'Chimes / Click', icon: 'game-icons:gold-nuggets',    angleDeg: 54,  color: '#52b830', statLabel: 'CpC Bonus' },
  { id: 'chimesPerSecond', name: 'Chimes / Sec',   icon: 'game-icons:metronome',       angleDeg: 126, color: '#e89840', statLabel: 'CpS Bonus' },
  { id: 'dmgPerClick',     name: 'DMG / Click',    icon: 'game-icons:fist',            angleDeg: 198, color: '#c060a0', statLabel: 'Dmg Mult.' },
]

const allNodes = computed<TreeNode[]>(() => {
  const roots: TreeNode[] = ROOTS.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    angleDeg: r.angleDeg,
    dist: FORGE_RING_ROOT_R,
    tier: 'root',
    sizeClass: 'root',
    iconSize: 28,
    parentId: null,
  }))
  const forge: TreeNode[] = FORGE_NODES.map((def) => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    color: def.color,
    angleDeg: def.angleDeg,
    dist: def.tier === 'branch' ? FORGE_RING_BRANCH_R : FORGE_RING_LEAF_R,
    tier: def.tier,
    sizeClass: def.tier,
    iconSize: def.tier === 'branch' ? 22 : 18,
    parentId: def.parentId,
    def,
  }))
  return [...roots, ...forge]
})

// ── Geometry ──────────────────────────────────────────────────────────────────
function rad(deg: number): number {
  return (deg * Math.PI) / 180
}

function pt(angleDeg: number, dist: number): { x: number; y: number } {
  return { x: C + Math.cos(rad(angleDeg)) * dist, y: C + Math.sin(rad(angleDeg)) * dist }
}

function nodePos(node: TreeNode): Record<string, string> {
  const x = Math.cos(rad(node.angleDeg)) * node.dist
  const y = Math.sin(rad(node.angleDeg)) * node.dist
  return {
    left: `calc(50% + ${Math.round(x)}px)`,
    top: `calc(50% + ${Math.round(y)}px)`,
  }
}

interface Limb {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  targetId: string
}

const limbs = computed<Limb[]>(() => {
  const result: Limb[] = []
  const nodeById = new Map(allNodes.value.map((n) => [n.id, n]))
  for (const node of allNodes.value) {
    let from: { x: number; y: number }
    if (node.tier === 'root') {
      from = pt(node.angleDeg, 110) // sun edge
    } else {
      const parent = nodeById.get(node.parentId ?? '')
      if (!parent) continue
      from = pt(parent.angleDeg, parent.dist)
    }
    const to = pt(node.angleDeg, node.dist)
    result.push({
      key: node.id,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      color: node.color,
      targetId: node.id,
    })
  }
  return result
})

const activeLimbs = computed(() =>
  limbs.value.filter((limb) => {
    const node = allNodes.value.find((n) => n.id === limb.targetId)
    return node && nodeLevelOf(node) > 0
  }),
)

function ringLabelStyle(r: number): Record<string, string> {
  return {
    left: `${C}px`,
    top: `${C}px`,
    transform: `translate(-50%, ${-(r + 3)}px)`,
  }
}

// ── Ring unlock state ─────────────────────────────────────────────────────────
const branchesUnlocked = computed(() => solarStore.starPhase >= FORGE_BRANCH_UNLOCK_PHASE)
const leavesUnlocked = computed(() => solarStore.starPhase >= FORGE_LEAF_UNLOCK_PHASE)

const branchRingLabel = computed(() =>
  branchesUnlocked.value
    ? `Phase ${FORGE_BRANCH_UNLOCK_PHASE + 1}+ · open`
    : `Phase ${FORGE_BRANCH_UNLOCK_PHASE + 1} → locked`,
)
const leafRingLabel = computed(() =>
  leavesUnlocked.value
    ? `Phase ${FORGE_LEAF_UNLOCK_PHASE + 1}+ · open`
    : `Phase ${FORGE_LEAF_UNLOCK_PHASE + 1} → locked`,
)

// ── Node state helpers ────────────────────────────────────────────────────────
function nodeLevelOf(node: TreeNode): number {
  if (node.tier === 'root') return solarStore.branchLevel(node.id as SolarBranchId)
  return forgeStore.nodeLevel(node.id)
}

function nodeMaxOf(node: TreeNode): number {
  if (node.tier === 'root') return SOLAR_MAX_LEVELS
  return forgeStore.nodeMaxLevel(node.id)
}

function nodeGoldOf(node: TreeNode): number {
  if (node.tier === 'root') return solarStore.branchCost(node.id as SolarBranchId)
  return forgeStore.nodeGoldCost(node.id)
}

function nodeMaterialsOf(node: TreeNode): Record<string, number> {
  if (node.tier === 'root') return {}
  return forgeStore.nodeMaterialCost(node.id)
}

function canBuy(node: TreeNode): boolean {
  if (node.tier === 'root') return solarStore.canAfford(node.id as SolarBranchId)
  return forgeStore.canAffordNode(node.id)
}

type NodeState = 'locked' | 'empty' | 'partial' | 'affordable' | 'capped' | 'maxed'

function nodeState(node: TreeNode): NodeState {
  const level = nodeLevelOf(node)
  if (node.tier === 'root') {
    if (level >= SOLAR_MAX_LEVELS) return 'maxed'
    if (level >= solarStore.maxAllowedLevel) return 'capped'
    if (solarStore.canAfford(node.id as SolarBranchId)) return 'affordable'
    if (level > 0) return 'partial'
    return 'empty'
  }
  if (!forgeStore.nodeUnlocked(node.id)) return 'locked'
  if (level >= nodeMaxOf(node)) return 'maxed'
  if (forgeStore.canAffordNode(node.id)) return 'affordable'
  if (level > 0) return 'partial'
  return 'empty'
}

function tierLabel(node: TreeNode): string {
  if (node.tier === 'root') return 'ROOT'
  if (node.tier === 'branch') return 'BRANCH'
  return 'LEAF'
}

function nodeDesc(node: TreeNode): string {
  if (node.tier === 'root') {
    const root = ROOTS.find((r) => r.id === node.id)
    const val = solarStore.statDisplay(node.id as SolarBranchId, nodeLevelOf(node))
    return `${root?.statLabel ?? ''}: ${val}`
  }
  const def = node.def
  if (!def) return ''
  if (def.tier === 'leaf') {
    const parent = FORGE_NODES.find((n) => n.id === def.parentId)
    const pct = nodeLevelOf(node) * 25
    return def.desc.replace('{p}', parent?.name ?? 'its branch').replace('{v}', String(pct))
  }
  const value = forgeStore.branchEffect(node.id)
  return def.desc.replace('{v}', trimNumber(value))
}

function nodeNextLine(node: TreeNode): string {
  if (node.tier === 'root') {
    return solarStore.statDisplay(node.id as SolarBranchId, nodeLevelOf(node) + 1)
  }
  const def = node.def
  if (!def) return ''
  if (def.tier === 'leaf') {
    const pct = (nodeLevelOf(node) + 1) * 25
    return `Amplify +${pct}%`
  }
  // Next-level branch effect keeps the current leaf amplifier
  const leaf = forgeStore.leafOfBranch(node.id)
  const leafLevel = leaf ? forgeStore.nodeLevel(leaf.id) : 0
  const amp = 1 + leafLevel * 0.25
  const next = (nodeLevelOf(node) + 1) * def.effectPerLevel * amp
  return def.desc.replace('{v}', trimNumber(next))
}

function trimNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function lockReason(node: TreeNode): string {
  const def = node.def
  if (!def) return ''
  if (solarStore.starPhase < def.phase) {
    const phaseName = STAR_PHASE_DATA[def.phase]?.name ?? `Phase ${def.phase + SUN_PHASE_DISPLAY_OFFSET}`
    return `Unlocks at ${phaseName}`
  }
  const parent = allNodes.value.find((n) => n.id === def.parentId)
  const required = def.tier === 'branch' ? 1 : 2
  return `Requires ${parent?.name ?? 'parent'} Lv ${required}`
}

function isTooltipBelow(angleDeg: number): boolean {
  // Open tooltips toward the stage center: top-half nodes open downward,
  // bottom-half nodes upward — so they never clip the panel edge or the
  // phase dock, even at high zoom.
  const n = ((angleDeg % 360) + 360) % 360
  return n >= 180
}

function materialImage(matId: string): string | undefined {
  return MATERIALS.find((m) => m.id === matId)?.image
}

function materialName(matId: string): string {
  return MATERIALS.find((m) => m.id === matId)?.name ?? matId
}

// ── Interaction ───────────────────────────────────────────────────────────────
const hoveredId = ref<string | null>(null)
const purchaseFlash = ref(false)

function flashSun(): void {
  purchaseFlash.value = true
  setTimeout(() => {
    purchaseFlash.value = false
  }, 500)
}

// ── Phase dock (evolve & status) ──────────────────────────────────────────────
const nextPhaseUnlockText = computed(() => {
  const nextPhase = solarStore.starPhase + 1
  if (nextPhase === FORGE_BRANCH_UNLOCK_PHASE) return '10 new branches open on the tree'
  if (nextPhase === FORGE_LEAF_UNLOCK_PHASE) return '10 leaves open on the tree'
  return 'branches gain +1 max level'
})

function handleEvolve(): void {
  if (!solarStore.canUpgradeStar) return
  const wasComet = solarStore.isCometState
  const targetName = nextStage.value.name
  solarStore.upgradeStar()
  showToast(wasComet ? `The comet ignites into ${targetName}…` : `Star evolving to ${targetName}…`)
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function handleNodeClick(node: TreeNode): void {
  if (node.tier === 'root') {
    const before = solarStore.branchLevel(node.id as SolarBranchId)
    solarStore.buyBranch(node.id as SolarBranchId)
    if (solarStore.branchLevel(node.id as SolarBranchId) > before) {
      flashSun()
      showToast(`${node.name} upgraded!`)
    }
    return
  }
  if (forgeStore.buyNode(node.id)) {
    flashSun()
    showToast(`${node.name} grown to Lv ${forgeStore.nodeLevel(node.id)}!`)
  }
}

// ── Zoom (buttons + wheel) with container fit ─────────────────────────────────
/** Vertical space (px) reserved for the floating phase dock at the top. */
const PHASE_DOCK_HEADROOM = 96

const panelEl = ref<HTMLElement | null>(null)
const zoom = ref(FORGE_TREE_ZOOM_DEFAULT)
const fitScale = ref(1)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!panelEl.value) return
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    // Leave headroom for the floating phase dock so top nodes stay visible.
    fitScale.value = Math.max(
      0.3,
      Math.min(rect.width - 16, rect.height - PHASE_DOCK_HEADROOM) / FORGE_STAGE_SIZE,
    )
  })
  resizeObserver.observe(panelEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

const totalScale = computed(() => fitScale.value * zoom.value)

const zoomKnobLeft = computed(() => {
  const t = (zoom.value - FORGE_TREE_ZOOM_MIN) / (FORGE_TREE_ZOOM_MAX - FORGE_TREE_ZOOM_MIN)
  return `${Math.round(t * 100)}%`
})

function zoomBy(direction: number): void {
  zoom.value = Math.min(
    FORGE_TREE_ZOOM_MAX,
    Math.max(FORGE_TREE_ZOOM_MIN, zoom.value + direction * FORGE_TREE_ZOOM_STEP),
  )
}

function onWheel(event: WheelEvent): void {
  zoomBy(event.deltaY < 0 ? 1 : -1)
}

// ── Phase-colored stage vars (mirrors PlanetSelectTabComponent sunPhaseStyle) ─
const currentStage = computed(() => STAR_PHASE_DATA[solarStore.starPhase])
/** While still a comet, the next evolution target is Spark (phase 0). */
const nextStage = computed(() =>
  solarStore.isCometState
    ? STAR_PHASE_DATA[0]
    : STAR_PHASE_DATA[Math.min(solarStore.starPhase + 1, STAR_PHASE_DATA.length - 1)],
)

const PHASE_RADIUS_MIN = Math.min(...STAR_PHASE_DATA.map((p) => p.radius))
const PHASE_RADIUS_MAX = Math.max(...STAR_PHASE_DATA.map((p) => p.radius))

const stageStyle = computed(() => {
  if (solarStore.isCometState) {
    return {
      '--phase-core': COMET_PHASE_DATA.core,
      '--phase-mid': COMET_PHASE_DATA.mid,
      '--phase-edge': COMET_PHASE_DATA.edge,
      '--phase-primary': COMET_PHASE_DATA.accent,
      '--phase-glow': COMET_PHASE_DATA.glow,
      '--pulse-speed': COMET_PHASE_DATA.pulseSpeed,
      '--shop-sun-d': `${SHOP_SUN_MIN_DIAMETER}px`,
      '--sun-edge': COMET_PHASE_DATA.edge,
    }
  }
  const s = currentStage.value
  const t = (s.radius - PHASE_RADIUS_MIN) / (PHASE_RADIUS_MAX - PHASE_RADIUS_MIN || 1)
  const sunD = SHOP_SUN_MIN_DIAMETER + t * (SHOP_SUN_MAX_DIAMETER - SHOP_SUN_MIN_DIAMETER)
  return {
    '--phase-core': s.core,
    '--phase-mid': s.mid,
    '--phase-edge': s.edge,
    '--phase-primary': s.phasePrimary,
    '--phase-glow': s.phaseGlow,
    '--pulse-speed': s.pulseSpeed,
    '--shop-sun-d': `${Math.round(sunD)}px`,
    '--sun-edge': s.edge,
  }
})

const nextPhasePreviewStyle = computed(() => ({
  background: `radial-gradient(circle at 38% 35%, ${nextStage.value.core} 0%, ${nextStage.value.mid} 45%, ${nextStage.value.edge} 100%)`,
  boxShadow: `0 0 40px 16px ${nextStage.value.glow1}88, 0 0 80px 30px ${nextStage.value.glow2}55`,
}))
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   PANEL
══════════════════════════════════════════════════ */
.tree-panel {
  position: relative;
  overflow: hidden;
  height: 100%;
}

/* ══════════════════════════════════════════════════
   PHASE DOCK
══════════════════════════════════════════════════ */
.phase-dock {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(560px, calc(100% - 24px));
  padding: 10px 14px;
  background: rgba(18, 14, 8, 0.82);
  border: 1px solid rgba(200, 144, 64, 0.35);
  border-radius: 10px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55);
  transition: border-color 0.3s ease;
}

.phase-dock--ready {
  border-color: rgba(110, 192, 64, 0.55);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.55),
    inset 0 0 26px rgba(82, 184, 48, 0.08);
}

.dock-icon {
  color: #c89040;
  flex-shrink: 0;
}

.phase-dock--ready .dock-icon {
  color: #8fe060;
}

.dock-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dock-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dock-phase-name {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.3px;
}

.dock-phase-count {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
}

.dock-pips {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dock-pip {
  width: 14px;
  height: 4px;
  border-radius: 2px;
  background: #2a1a08;
  border: 1px solid #3e200a;
}

.dock-pip--done {
  border: none;
}

.dock-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
}

.dock-hint-next {
  color: #ffb347;
}

.dock-hint-unlock {
  color: #8fe060;
}

.dock-evolve-btn {
  padding: 8px 16px;
  border: 1px solid #6ec040;
  border-radius: 7px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  animation: node-ready 2s ease-in-out infinite;
}

.dock-evolve-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  animation: none;
}

.dock-complete {
  font-size: 10px;
  font-weight: 900;
  color: #a0ffa0;
  background: rgba(82, 184, 48, 0.15);
  border: 1px solid rgba(82, 184, 48, 0.4);
  border-radius: 6px;
  padding: 4px 9px;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   ZOOM
══════════════════════════════════════════════════ */
.tree-zoom {
  position: absolute;
  bottom: 14px;
  right: 14px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(18, 14, 8, 0.82);
  border: 1px solid rgba(200, 144, 64, 0.25);
  border-radius: 8px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.zoom-btn {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 3px;
  background: #2a1a08;
  color: #e8c040;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.zoom-btn:hover {
  background: #3e200a;
}

.zoom-track {
  width: 56px;
  height: 4px;
  background: #2a1a08;
  border-radius: 2px;
  position: relative;
}

.zoom-knob {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e8c040;
  box-shadow: 0 0 6px #e8c040;
  transition: left 0.15s ease;
}

/* ══════════════════════════════════════════════════
   STAGE
══════════════════════════════════════════════════ */
.tree-stage {
  position: absolute;
  /* Centered in the area below the floating phase dock (headroom / 2). */
  top: calc(50% + 48px);
  left: 50%;
  width: 820px;
  height: 820px;
  transition: transform 0.2s ease;
  z-index: 1;
}

.tree-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ring-label {
  position: absolute;
  z-index: 2;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 1px 7px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
}

.ring-label--root {
  color: rgba(232, 192, 64, 0.55);
  background: #12100a;
}

.ring-label--now {
  color: rgba(139, 224, 96, 0.8);
  background: #12160c;
}

.ring-label--locked {
  color: rgba(255, 255, 255, 0.35);
  background: #12100a;
}

/* ══════════════════════════════════════════════════
   SUN — mirror of PlanetSelectTabComponent .ps-stage-sun
══════════════════════════════════════════════════ */
.sun-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 210px;
  height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.tree-stage-sun {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shop-sun-d, 200px);
  height: var(--shop-sun-d, 200px);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  transition: width 1.2s ease, height 1.2s ease;
  background:
    radial-gradient(
      circle at 42% 38%,
      color-mix(in srgb, white 92%, var(--phase-core, #fff)) 0%,
      transparent 22%
    ),
    radial-gradient(
      circle at 50% 50%,
      var(--phase-core, #fff0e0) 0%,
      var(--phase-mid, #ffd4a3) 34%,
      var(--phase-edge, #cc5500) 52%,
      color-mix(in srgb, var(--phase-edge, #cc5500) 45%, transparent) 70%,
      transparent 86%
    );
  box-shadow:
    0 0 90px color-mix(in srgb, var(--phase-glow, #ff8c42) 55%, transparent),
    0 0 180px color-mix(in srgb, var(--phase-glow, #ff8c42) 28%, transparent);
  z-index: 1;
  animation: tree-sun-pulse var(--pulse-speed, 5s) ease-in-out infinite;
}

@keyframes tree-sun-pulse {
  0%, 100% { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
}

.sun-wrapper.sun-flash {
  animation: tree-sun-flash 0.45s ease-out;
}

@keyframes tree-sun-flash {
  0%   { filter: brightness(1) saturate(1); }
  35%  { filter: brightness(1.8) saturate(1.5); }
  100% { filter: brightness(1) saturate(1); }
}

.next-phase-preview {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0;
  animation: tree-phase-preview-pulse 1.8s ease-in-out infinite;
  pointer-events: none;
  z-index: 6;
}

@keyframes tree-phase-preview-pulse {
  0%, 100% { opacity: 0.12; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(1.06); }
}

.sun-hp-text {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 4px;
  pointer-events: none;
}

.hp-label {
  font-size: 10px;
  font-weight: 900;
  color: color-mix(in srgb, var(--sun-edge) 70%, transparent);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.hp-value {
  font-size: 28px;
  font-weight: 900;
  color: var(--sun-edge);
  line-height: 1;
  text-shadow: 0 0 8px color-mix(in srgb, var(--sun-edge) 35%, transparent);
}

.hp-value--low {
  color: #990000;
  text-shadow: none;
}

.hp-max {
  font-size: 11px;
  font-weight: 700;
  color: color-mix(in srgb, var(--sun-edge) 50%, transparent);
}

/* ══════════════════════════════════════════════════
   NODES
══════════════════════════════════════════════════ */
.tree-node {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.node-circle {
  border-radius: 50%;
  background: #111008;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  gap: 1px;
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    border-color 0.15s,
    opacity 0.15s;
  flex-shrink: 0;
}

.node-circle--root {
  width: 56px;
  height: 56px;
  border: 3px solid #2a1a08;
}

.node-circle--branch {
  width: 46px;
  height: 46px;
  border: 2px solid #2a1a08;
}

.node-circle--leaf {
  width: 38px;
  height: 38px;
  border: 2px solid #2a1a08;
}

.node-level {
  font-size: 8px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1;
  pointer-events: none;
}

/* States */
.node-circle--locked {
  border-color: #4a3010;
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

.node-circle--empty {
  border-color: #7bb8ff;
  box-shadow: 0 0 9px rgba(123, 184, 255, 0.45);
  opacity: 0.85;
}

.node-circle--empty:hover {
  transform: scale(1.1);
}

.node-circle--partial {
  border-color: #7a4e20;
  box-shadow: 0 0 6px rgba(200, 144, 64, 0.3);
}

.node-circle--partial:hover {
  transform: scale(1.1);
  border-color: #c89040;
}

.node-circle--affordable {
  border-color: #c89040;
  animation: node-ready 2s ease-in-out infinite;
}

.node-circle--affordable:hover {
  transform: scale(1.12);
  animation-play-state: paused;
  border-color: #e8c060;
  box-shadow: 0 0 22px rgba(232, 200, 80, 0.85);
}

.node-circle--capped {
  border-color: #4a3010;
  opacity: 0.6;
  cursor: not-allowed;
}

.node-circle--maxed {
  border-color: #c89040;
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.5), 0 0 20px rgba(232, 192, 64, 0.2);
  cursor: default;
}

@keyframes node-ready {
  0%, 100% { box-shadow: 0 0 10px rgba(200, 144, 64, 0.5); border-color: #c89040; }
  50% { box-shadow: 0 0 22px rgba(232, 200, 80, 0.85); border-color: #e8c060; }
}

/* ══════════════════════════════════════════════════
   TOOLTIP
══════════════════════════════════════════════════ */
.node-tooltip {
  position: absolute;
  left: 50%;
  /* Counter-scale against the stage zoom so the tooltip always renders at a
     constant, readable screen size — regardless of zoom level or resolution. */
  transform: translateX(-50%) scale(var(--inv-scale, 1));
  width: 230px;
  background: rgba(20, 16, 9, 0.94);
  border: 1px solid rgba(200, 144, 64, 0.45);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 10px 12px 11px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 30;
  pointer-events: none;
}

.node-tooltip--below {
  top: calc(100% + 10px);
  transform-origin: top center;
}

.node-tooltip--above {
  bottom: calc(100% + 10px);
  transform-origin: bottom center;
}

.tt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.tt-name {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.3px;
}

.tt-tier {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.35);
}

.tt-desc {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.68);
}

.tt-lock {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 200, 80, 0.65);
}

.tt-maxed {
  font-size: 12px;
  font-weight: 900;
  color: #e8c040;
  text-align: center;
  letter-spacing: 1px;
}

.tt-next {
  font-size: 12px;
  font-weight: 900;
  color: #6ecc44;
}

.tt-arrow {
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
}

.tt-cost-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.tt-cost {
  font-size: 12px;
  font-weight: 900;
  color: #a0ffa0;
  background: rgba(82, 184, 48, 0.15);
  border: 1px solid rgba(82, 184, 48, 0.3);
  border-radius: 3px;
  padding: 1px 5px;
}

.tt-cost--cant {
  color: #cc6050;
  background: rgba(180, 40, 40, 0.12);
  border-color: rgba(140, 40, 40, 0.3);
}

.tt-mat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 900;
  color: #e8d8b0;
}

.tt-mat--missing {
  color: #cc6050;
}

.tt-mat-img {
  height: 15px;
  width: auto;
  object-fit: contain;
}

/* ══════════════════════════════════════════════════
   REDUCED MOTION
══════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .node-circle--affordable,
  .sun-wrapper.sun-flash,
  .dock-evolve-btn {
    animation: none;
  }
}
</style>
