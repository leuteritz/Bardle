<script setup lang="ts">
/**
 * Die Orbit-Bühne des Meep Skill Trees.
 *
 * Ein `<svg>` trägt die fünf Bahnellipsen und alle Kanten, darüber liegen
 * Startkreis, dreissig Knoten und die fünf Zweignamen als absolut
 * positionierte Elemente. Alles rechnet in einem festen Design-Kasten
 * (`SKILL_TREE_STAGE_SIZE`), den der Tab-Root als Ganzes skaliert — hier steht
 * deshalb keine einzige Bildschirmgrösse.
 *
 * **Die Kanten werden nie neu gebaut.** Ihre Geometrie ist statisch
 * (`utils/ui/skillTreeLayout`), und ihr Aussehen hängt an zwei Attributen, die
 * Vue an der bestehenden `<line>` patcht. Ein Meep-Zuwachs, der reihenweise
 * `nodeState()` kippen lässt, kostet damit keinen Neuaufbau der SVG-Struktur.
 */
import { computed } from 'vue'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MEEP_TREE_BRANCHES } from '@/config/progression/meepTree'
import {
  SKILL_TREE_ARM_TAGS,
  SKILL_TREE_EDGES,
  SKILL_TREE_PLACEMENTS,
} from '@/utils/ui/skillTreeLayout'
import {
  SKILL_TREE_CENTER,
  SKILL_TREE_EDGE_ALPHA,
  SKILL_TREE_EDGE_WIDTH_BOUGHT,
  SKILL_TREE_EDGE_WIDTH_BUYABLE,
  SKILL_TREE_EDGE_WIDTH_LOCKED,
  SKILL_TREE_STAGE_SIZE,
  SKILL_TREE_TIER_RADIUS,
  SKILL_TREE_Y_SQUASH,
} from '@/config/constants'
import MeepSkillNode from './MeepSkillNode.vue'
import MeepStartNode from './MeepStartNode.vue'

const props = defineProps<{
  selectedId: string | null
  focusBranch: string | null
  query: string
}>()

const emit = defineEmits<{
  select: [id: string]
  focus: [branchId: string | null]
}>()

const meepTree = useMeepTreeStore()

/* ── Zustand ──────────────────────────────────────────────────────────────
 * Ein primitiver Schlüssel über alle Knotenzustände. Beide Listen unten
 * hängen daran statt einzeln an `nodeState()` — sonst rechnete jeder
 * Meep-Zuwachs dreissig Getter neu, obwohl sich meist nichts kippt.
 */
const stateKey = computed(() => SKILL_TREE_PLACEMENTS.map((p) => meepTree.nodeState(p.id)).join(','))

const states = computed<Record<string, string>>(() => {
  const list = stateKey.value.split(',')
  const out: Record<string, string> = {}
  SKILL_TREE_PLACEMENTS.forEach((p, i) => (out[p.id] = list[i]))
  return out
})

/* ── Suche und Zweigfokus ──────────────────────────────────────────────────
 * Beide nehmen dieselbe Antwort: welcher Knoten steht gerade im Vordergrund.
 * Was nicht dazugehört, wird nur zurückgenommen, nie ausgeblendet — ein
 * verschwundener Knoten liesse den Arm zerrissen aussehen.
 */
const needle = computed(() => props.query.trim().toLowerCase())

function matchesQuery(id: string): boolean {
  if (!needle.value) return true
  const p = SKILL_TREE_PLACEMENTS.find((n) => n.id === id)
  if (!p) return false
  return (
    p.node.name.toLowerCase().includes(needle.value) ||
    p.node.effect.toLowerCase().includes(needle.value) ||
    p.branch.name.toLowerCase().includes(needle.value)
  )
}

function isDimmed(id: string, branchId: string): boolean {
  if (props.focusBranch && props.focusBranch !== branchId) return true
  return !matchesQuery(id)
}

/* ── Knoten ──────────────────────────────────────────────────────────────── */

const nodes = computed(() =>
  SKILL_TREE_PLACEMENTS.map((p) => ({
    placement: p,
    state: states.value[p.id] as ReturnType<typeof meepTree.nodeState>,
    dimmed: isDimmed(p.id, p.branch.id),
    notifying: meepTree.notifyingNodeIds.includes(p.id),
  })),
)

/* ── Kanten ──────────────────────────────────────────────────────────────── */

/**
 * Die Kette, die zum ausgewählten Knoten führt — als Menge von Kanten-Ids.
 * Sie hängt an der AUSWAHL, nicht am Hover: das Detail-Blatt daneben zeigt
 * denselben Knoten, und ein Band, das unter dem Mauszeiger wegspringt, sagt
 * weniger als eines, das stehen bleibt, solange man liest.
 */
const routeEdgeIds = computed(() => {
  const ids = new Set<string>()
  if (!props.selectedId) return ids
  const chain = meepTree.pathTo(props.selectedId)
  if (!chain) return ids
  // Jeder Kettenknoten samt seiner bereits gelernten Voraussetzung.
  const onPath = new Set([...meepTree.bought, ...chain])
  for (const e of SKILL_TREE_EDGES) {
    if (!onPath.has(e.toId)) continue
    if (e.fromId !== null && !onPath.has(e.fromId)) continue
    if (chain.includes(e.toId) || chain.includes(e.fromId ?? '')) ids.add(e.id)
  }
  return ids
})

/**
 * Eine Kante trägt die Farbe ihres Zweigs; ihre Deckkraft sagt, wie weit der
 * Spieler auf ihr ist. Gestrichelt bleibt alles, was noch offen ist — dieselbe
 * Ketten-Optik wie zuvor, nur jetzt selbst gezeichnet.
 */
const edges = computed(() =>
  SKILL_TREE_EDGES.map((e) => {
    const color = MEEP_TREE_BRANCHES[e.branchIndex].color
    const targetState = states.value[e.toId]
    const sourceDone = e.fromId === null || states.value[e.fromId] === 'bought'
    const bought = targetState === 'bought'
    const open = sourceDone && (targetState === 'buyable' || targetState === 'reachable')
    const onRoute = routeEdgeIds.value.has(e.id)
    const dimmed = isDimmed(e.toId, MEEP_TREE_BRANCHES[e.branchIndex].id)

    const alpha = dimmed
      ? SKILL_TREE_EDGE_ALPHA.dimmed
      : bought
        ? SKILL_TREE_EDGE_ALPHA.bought
        : onRoute
          ? SKILL_TREE_EDGE_ALPHA.path
          : open
            ? SKILL_TREE_EDGE_ALPHA.buyable
            : SKILL_TREE_EDGE_ALPHA.idle

    return {
      ...e,
      stroke: `${color}${alpha}`,
      width:
        bought || onRoute
          ? SKILL_TREE_EDGE_WIDTH_BOUGHT
          : open
            ? SKILL_TREE_EDGE_WIDTH_BUYABLE
            : SKILL_TREE_EDGE_WIDTH_LOCKED,
      dash: bought ? undefined : '7 5',
    }
  }),
)

/** Die fünf Bahnen als Ellipsen — sie machen die Ränge lesbar, ohne zu ziehen. */
const orbits = SKILL_TREE_TIER_RADIUS.map((r, i) => ({
  key: `orbit-${i}`,
  rx: r,
  ry: r * SKILL_TREE_Y_SQUASH,
}))

function onSelect(id: string): void {
  emit('select', id)
}

/**
 * Ein überfahrener Knoten gilt als angesehen — dasselbe wie bisher, damit der
 * pinke Zähler im Header nicht stehen bleibt, während der Spieler die Bühne
 * abtastet. Das Auswählen quittiert zusätzlich (im Tab-Root).
 */
function onHover(id: string | null): void {
  if (id) meepTree.acknowledgeNode(id)
}

/** Ein Klick auf den Zweignamen schaltet den Fokus an oder wieder aus. */
function onArm(branchId: string): void {
  emit('focus', props.focusBranch === branchId ? null : branchId)
}
</script>

<template>
  <div
    class="mos-stage"
    :style="{ width: `${SKILL_TREE_STAGE_SIZE.w}px`, height: `${SKILL_TREE_STAGE_SIZE.h}px` }"
  >
    <svg
      class="mos-web"
      :viewBox="`0 0 ${SKILL_TREE_STAGE_SIZE.w} ${SKILL_TREE_STAGE_SIZE.h}`"
      aria-hidden="true"
    >
      <ellipse
        v-for="o in orbits"
        :key="o.key"
        class="mos-orbit"
        :cx="SKILL_TREE_CENTER.x"
        :cy="SKILL_TREE_CENTER.y"
        :rx="o.rx"
        :ry="o.ry"
      />
      <line
        v-for="e in edges"
        :id="e.id"
        :key="e.id"
        :x1="e.x1"
        :y1="e.y1"
        :x2="e.x2"
        :y2="e.y2"
        :stroke="e.stroke"
        :stroke-width="e.width"
        :stroke-dasharray="e.dash"
        stroke-linecap="round"
      />
    </svg>

    <MeepStartNode :x="SKILL_TREE_CENTER.x" :y="SKILL_TREE_CENTER.y" />

    <MeepSkillNode
      v-for="n in nodes"
      :key="n.placement.id"
      :node="n.placement.node"
      :color="n.placement.branch.color"
      :x="n.placement.x"
      :y="n.placement.y"
      :angle-deg="n.placement.angleDeg"
      :state="n.state"
      :selected="selectedId === n.placement.id"
      :notifying="n.notifying"
      :dimmed="n.dimmed"
      @select="onSelect"
      @hover="onHover"
    />

    <button
      v-for="tag in SKILL_TREE_ARM_TAGS"
      :key="tag.id"
      class="mos-arm"
      :class="{ 'mos-arm--active': focusBranch === tag.id }"
      :style="{ left: `${tag.x}px`, top: `${tag.y}px`, '--branch-color': tag.color }"
      :title="`Focus the ${tag.name} branch`"
      @click="onArm(tag.id)"
    >
      {{ tag.name }}
    </button>
  </div>
</template>

<style scoped>
.mos-stage {
  position: relative;
  flex-shrink: 0;
}

.mos-web {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Die Bahnen liegen weit hinten — sie ordnen, sie zeigen nichts an. */
.mos-orbit {
  fill: none;
  stroke: #2a2620;
  stroke-width: 1;
}

/* ── Zweignamen am Rand ───────────────────────────────────── */
.mos-arm {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 3px 11px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--branch-color) 45%, var(--rpg-border-row));
  background: var(--rpg-bg-deep);
  color: color-mix(in srgb, var(--branch-color) 75%, var(--rpg-text-dim));
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}

.mos-arm:hover,
.mos-arm--active {
  border-color: var(--branch-color);
  background: color-mix(in srgb, var(--branch-color) 14%, var(--rpg-bg-deep));
  color: color-mix(in srgb, var(--branch-color) 85%, #fff);
}
</style>
