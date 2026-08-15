<script setup lang="ts">
/**
 * Die Orbit-Bühne des Meep Skill Trees.
 *
 * Ein `<svg>` trägt die fünf Bahnellipsen und alle Kanten, darüber liegen
 * Startkreis, dreissig Knoten und die fünf Zweignamen als absolut
 * positionierte Elemente. Die Bühne ist so breit wie ihr Design-Kasten und so
 * hoch, wie der Tab-Root sie macht — hier steht deshalb keine einzige
 * Bildschirmgrösse, nur eine Design-Höhe als Prop.
 *
 * **Die Kanten werden nur beim Resize neu gebaut**, nie in einem Frame: ihre
 * Geometrie hängt allein an dieser Höhe (`utils/ui/skillTreeLayout`, gecacht),
 * ihr Aussehen an zwei Attributen, die Vue an der bestehenden `<line>` patcht.
 * Ein Meep-Zuwachs, der reihenweise `nodeState()` kippen lässt, kostet damit
 * keinen Neuaufbau der SVG-Struktur.
 */
import { computed } from 'vue'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MEEP_TREE_BRANCHES } from '@/config/progression/meepTree'
import { skillTreeLayout } from '@/utils/ui/skillTreeLayout'
import {
  SKILL_TREE_EDGE_ALPHA,
  SKILL_TREE_EDGE_WIDTH_BOUGHT,
  SKILL_TREE_EDGE_WIDTH_BUYABLE,
  SKILL_TREE_EDGE_WIDTH_LOCKED,
  SKILL_TREE_STAGE_WIDTH,
} from '@/config/constants'
import MeepSkillNode from './MeepSkillNode.vue'
import MeepStartNode from './MeepStartNode.vue'

const props = defineProps<{
  /** Design-Höhe der Bühne — sie bestimmt Mitte und y-Stauchung der Bahnen. */
  height: number
  selectedId: string | null
  focusBranch: string | null
}>()

const emit = defineEmits<{
  /** `null` hebt die Auswahl auf — Toggle auf demselben Knoten oder freie Bühne. */
  select: [id: string | null]
  focus: [branchId: string | null]
}>()

const meepTree = useMeepTreeStore()

/** Knoten, Kanten, Zweignamen und Bahnen — alles aus der einen Bühnenhöhe. */
const layout = computed(() => skillTreeLayout(props.height))

/* ── Zustand ──────────────────────────────────────────────────────────────
 * Ein primitiver Schlüssel über alle Knotenzustände. Beide Listen unten
 * hängen daran statt einzeln an `nodeState()` — sonst rechnete jeder
 * Meep-Zuwachs dreissig Getter neu, obwohl sich meist nichts kippt.
 */
const stateKey = computed(() =>
  layout.value.placements.map((p) => meepTree.nodeState(p.id)).join(','),
)

const states = computed<Record<string, string>>(() => {
  const list = stateKey.value.split(',')
  const out: Record<string, string> = {}
  layout.value.placements.forEach((p, i) => (out[p.id] = list[i]))
  return out
})

/* ── Zweigfokus ────────────────────────────────────────────────────────────
 * Ein Klick auf einen Zweignamen hebt seinen Arm hervor. Was nicht dazugehört,
 * wird nur zurückgenommen, nie ausgeblendet — ein verschwundener Knoten liesse
 * den Arm zerrissen aussehen.
 */
function isDimmed(branchId: string): boolean {
  return props.focusBranch !== null && props.focusBranch !== branchId
}

/* ── Knoten ──────────────────────────────────────────────────────────────── */

const nodes = computed(() =>
  layout.value.placements.map((p) => ({
    placement: p,
    state: states.value[p.id] as ReturnType<typeof meepTree.nodeState>,
    dimmed: isDimmed(p.branch.id),
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
  for (const e of layout.value.edges) {
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
  layout.value.edges.map((e) => {
    const color = MEEP_TREE_BRANCHES[e.branchIndex].color
    const targetState = states.value[e.toId]
    const sourceDone = e.fromId === null || states.value[e.fromId] === 'bought'
    const bought = targetState === 'bought'
    const open = sourceDone && (targetState === 'buyable' || targetState === 'reachable')
    const onRoute = routeEdgeIds.value.has(e.id)
    const dimmed = isDimmed(MEEP_TREE_BRANCHES[e.branchIndex].id)

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

/**
 * Ein Klick auf den bereits gewählten Knoten wählt ihn wieder ab — dasselbe
 * Umschalten wie `onArm` beim Zweigfokus. Der Toggle sitzt hier und NICHT im
 * Tab-Root: die Detailspalte emittiert `select` auch aus ihren Sprungzeilen,
 * und dort darf ein Klick nie abwählen.
 */
function onSelect(id: string): void {
  emit('select', props.selectedId === id ? null : id)
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
  <!-- `.self`: Bahnen und Startknoten sind `pointer-events: none`, ihre Klicks
       landen also hier — Knoten und Zweignamen dagegen nie, die behalten ihre
       Auswahl. Deshalb braucht kein Kind ein `@click.stop`. -->
  <div
    class="mos-stage"
    :style="{ width: `${SKILL_TREE_STAGE_WIDTH}px` }"
    @click.self="emit('select', null)"
  >
    <svg
      class="mos-web"
      :viewBox="`0 0 ${SKILL_TREE_STAGE_WIDTH} ${height}`"
      aria-hidden="true"
    >
      <ellipse
        v-for="o in layout.orbits"
        :key="o.key"
        class="mos-orbit"
        :cx="layout.center.x"
        :cy="layout.center.y"
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

    <MeepStartNode :x="layout.center.x" :y="layout.center.y" />

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
      v-for="tag in layout.armTags"
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
/* Die Breite kommt inline aus `SKILL_TREE_STAGE_WIDTH`, die Höhe vom
   Design-Kasten — die Bühne füllt ihn ganz aus, damit die Bahnen dieselbe
   Fläche haben, gegen die `skillTreeLayout` gerechnet hat. */
.mos-stage {
  position: relative;
  flex-shrink: 0;
  height: 100%;
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
