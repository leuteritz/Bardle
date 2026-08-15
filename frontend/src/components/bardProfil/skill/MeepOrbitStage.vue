<script setup lang="ts">
/**
 * Die Orbit-Bühne des Meep Skill Trees — eine Spiralgalaxie von oben.
 *
 * Ein `<svg>` trägt den Kernschein, die fünf Nebelbänder und alle Kanten,
 * darüber liegen Startkreis, dreissig Knoten und die fünf Zweignamen als
 * absolut positionierte Elemente. Die Bühne ist so breit wie ihr Design-Kasten
 * und so hoch, wie der Tab-Root sie macht — hier steht deshalb keine einzige
 * Bildschirmgrösse, nur eine Design-Höhe als Prop.
 *
 * **Gezeichnete Rang-Bahnen gibt es nicht mehr.** Fünf konzentrische Ellipsen
 * ordneten die Ränge, lasen sich aber als Zifferblatt. Was ordnet, sind jetzt
 * der Radius selbst und die Bänder, die den Armen folgen.
 *
 * **Die Kanten werden nur beim Resize neu gebaut**, nie in einem Frame: ihre
 * Geometrie hängt allein an dieser Höhe (`utils/ui/skillTreeLayout`, gecacht),
 * ihr Aussehen an zwei Attributen, die Vue an dem bestehenden `<path>` patcht.
 * Ein Meep-Zuwachs, der reihenweise `nodeState()` kippen lässt, kostet damit
 * keinen Neuaufbau der SVG-Struktur.
 */
import { computed, getCurrentInstance } from 'vue'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useMeepSkills } from '@/composables/ui/useMeepSkills'
import { useMeepSpotlight } from '@/composables/ui/useMeepSpotlight'
import { MEEP_TREE_BRANCHES, MEEP_TREE_NODE_INDEX } from '@/config/progression/meepTree'
import { skillTreeLayout, type SkillTreeEdge } from '@/utils/ui/skillTreeLayout'
import {
  SKILL_TREE_EDGE_ALPHA,
  SKILL_TREE_EDGE_WIDTH_BOUGHT,
  SKILL_TREE_EDGE_WIDTH_BUYABLE,
  SKILL_TREE_EDGE_WIDTH_LOCKED,
  SKILL_TREE_CORE_STOPS,
  SKILL_TREE_NEBULA_FADE_MS,
  SKILL_TREE_NEBULA_OPACITY,
  SKILL_TREE_NEBULA_OPACITY_FOCUS,
  SKILL_TREE_NEBULA_WIDTH,
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
const { bestBuyId } = useMeepSkills()
const { spotlightId, setOrbitHover } = useMeepSpotlight()

/** Knoten, Kanten, Zweignamen, Bänder und Kern — alles aus der einen Bühnenhöhe. */
const layout = computed(() => skillTreeLayout(props.height))

/**
 * Eindeutiges Präfix für die SVG-Verlaufs-Ids. `<style scoped>` scoped `id`s
 * NICHT — Vue schreibt nur Selektoren um, `url(#…)` löst dokumentweit auf. Bei
 * einer Kollision gäbe es keinen Fehler, sondern still den ersten Treffer in
 * Dokumentreihenfolge: ein Falschfarben-Fehler, der nur auf einer Route
 * auftritt. Muster `components/idle/sun/OrbitPath.vue`.
 */
const uid = `mos-${getCurrentInstance()!.uid}`

/* Beide gehen als Zeichenkette ins CSS — die Werte stehen in den Konstanten. */
const nebulaWidth = `${SKILL_TREE_NEBULA_WIDTH}`
const nebulaFade = `${SKILL_TREE_NEBULA_FADE_MS}ms`

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

/* ── Spotlight ─────────────────────────────────────────────────────────────
 * Zeigt der Spieler in der Liste rechts auf eine Karte, geht ihr Knoten hier
 * auf, die KETTE vom Zentrum bis zu ihm leuchtet, und die übrigen treten
 * zurück — sonst sucht das Auge den Kreis zur Karte unter dreissig gleich
 * hellen selbst, und ohne die Kette bliebe offen, was vorher zu lernen ist.
 */

/**
 * Eingehende Kanten je Ziel. Hängt allein am Layout und wird deshalb NICHT in
 * `spotChain` gebaut — das läuft bei jedem Hover-Wechsel, diese Tabelle nur beim
 * Resize.
 */
const incomingEdges = computed(() => {
  const map = new Map<string, SkillTreeEdge[]>()
  for (const e of layout.value.edges) {
    const list = map.get(e.toId)
    if (list) list.push(e)
    else map.set(e.toId, [e])
  }
  return map
})

/**
 * Der hervorgehobene Knoten samt seiner Ahnenkette bis zum Zentrum, als Mengen
 * von Knoten- und Kanten-Ids.
 *
 * Eine BREITENSUCHE, kein linearer Aufstieg wie in `ForgeTreePanel`: Rang 5 hat
 * zwei eingehende Kanten, eine je Gabelseite (`skillTreeLayout`), und beide
 * Wege führen wirklich dorthin — genau die Zusage, die die Gabel erträglich
 * macht. Der Besuchsschutz ist zugleich die Abbruchbremse.
 *
 * NICHT über `meepTree.pathTo()`: das liefert nur den noch ungekauften Rest und
 * wäre bei einem gelernten Knoten leer. Gemeint ist hier die volle Kette,
 * unabhängig davon, was schon bezahlt ist.
 *
 * Versiegelte Ahnen fallen heraus — ist eine Gabelseite genommen, leuchtet nur
 * noch die genommene.
 */
const spotChain = computed(() => {
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()
  const target = spotlightId.value
  if (target === null) return { nodeIds, edgeIds }

  nodeIds.add(target)
  const queue = [target]
  while (queue.length > 0) {
    const cursor = queue.shift() as string
    for (const e of incomingEdges.value.get(cursor) ?? []) {
      if (e.fromId !== null && states.value[e.fromId] === 'blocked') continue
      edgeIds.add(e.id)
      if (e.fromId === null || nodeIds.has(e.fromId)) continue
      nodeIds.add(e.fromId)
      queue.push(e.fromId)
    }
  }
  return { nodeIds, edgeIds }
})

/** Zu welchem der fünf Arme der hervorgehobene Knoten gehört. */
const spotBranchId = computed(() =>
  spotlightId.value === null
    ? null
    : (MEEP_TREE_NODE_INDEX[spotlightId.value]?.branch.id ?? null),
)

/* ── Nebelbänder ───────────────────────────────────────────────────────────
 * Das Band des gemeinten Arms tritt hervor — bei einem Zweigfokus wie bei
 * einem Spotlight, denn beide beantworten dieselbe Frage: welcher Arm ist
 * gerade gemeint. Umgeschaltet wird AUSSCHLIESSLICH die Deckkraft; Farbe,
 * Breite und Verlauf bleiben, was sie im CSS sind (Performance-Regel 2).
 */
const nebulaArms = computed(() =>
  layout.value.nebulaArms.map((arm) => ({
    ...arm,
    opacity:
      props.focusBranch === arm.id || spotBranchId.value === arm.id
        ? SKILL_TREE_NEBULA_OPACITY_FOCUS
        : SKILL_TREE_NEBULA_OPACITY,
  })),
)

/**
 * Die EINE Regel, nach der beide Dämpfungen aufgelöst werden: **was auf der
 * Kette liegt, dämpft nichts** — weder der Zweigfokus noch das Spotlight.
 *
 * Der Fokus ist die dauerhafte Aussage und greift sonst härter (0,2 gegen 0,3),
 * aber er ist auch die ÄLTERE: die Kette beantwortet eine Geste, die der Spieler
 * gerade macht. Ohne diese Vorfahrt liefe eine leuchtende Route über gedimmte
 * Kreise oder endete an ihnen, und beides sieht nach einem Fehler aus.
 */
function onChain(id: string): boolean {
  return spotChain.value.nodeIds.has(id)
}

/* ── Knoten ──────────────────────────────────────────────────────────────── */

const nodes = computed(() =>
  layout.value.placements.map((p) => ({
    placement: p,
    state: states.value[p.id] as ReturnType<typeof meepTree.nodeState>,
    dimmed: isDimmed(p.branch.id) && !onChain(p.id),
    spot: spotlightId.value === p.id,
    spotAway: spotlightId.value !== null && !onChain(p.id),
    notifying: meepTree.notifyingNodeIds.includes(p.id),
    /* Dieselbe Empfehlung, die das Panel rechts gross zeigt — ohne die Marke
       hier fände der Spieler sie unter dreissig Kreisen nicht wieder. */
    bestBuy: bestBuyId.value === p.id,
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
 *
 * Die Spotlight-Kette steht VOR allen anderen Fällen und schlägt auch den
 * Zweigfokus (siehe `onChain`). Was sie NICHT anfasst, ist die Strichelung: sie
 * hängt weiter allein am Kaufzustand — eine durchgezogene Kette sagt „bezahlt",
 * und das wäre gelogen, solange der Weg offen ist.
 */
const edges = computed(() =>
  layout.value.edges.map((e) => {
    const color = MEEP_TREE_BRANCHES[e.branchIndex].color
    const targetState = states.value[e.toId]
    const sourceDone = e.fromId === null || states.value[e.fromId] === 'bought'
    const bought = targetState === 'bought'
    const open = sourceDone && (targetState === 'buyable' || targetState === 'reachable')
    const onRoute = routeEdgeIds.value.has(e.id)
    const onSpot = spotChain.value.edgeIds.has(e.id)
    const spotAway = spotlightId.value !== null && !onSpot
    const dimmed = isDimmed(MEEP_TREE_BRANCHES[e.branchIndex].id) && !onSpot

    const alpha = onSpot
      ? SKILL_TREE_EDGE_ALPHA.spot
      : spotAway
        ? SKILL_TREE_EDGE_ALPHA.spotDimmed
        : dimmed
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
        bought || onRoute || onSpot
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
 *
 * Derselbe Zeiger meldet sich am Spotlight: die Liste rechts hebt die
 * zugehörige Karte hervor und rollt sie ins Bild, falls sie ausserhalb steht.
 */
function onHover(id: string | null): void {
  if (id) meepTree.acknowledgeNode(id)
  setOrbitHover(id)
}

/** Ein Klick auf den Zweignamen schaltet den Fokus an oder wieder aus. */
function onArm(branchId: string): void {
  emit('focus', props.focusBranch === branchId ? null : branchId)
}
</script>

<template>
  <!-- `.self`: Kern, Bänder, Kanten und Startknoten sind `pointer-events: none`
       (die ersten drei über das ganze `<svg>`), ihre Klicks landen also hier —
       Knoten und Zweignamen dagegen nie, die behalten ihre Auswahl. Deshalb
       braucht kein Kind ein `@click.stop`. -->
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
      <defs>
        <!-- Der Kern füllt eine Ellipse, seine Bezugs-Box ist also wohldefiniert
             — hier reicht das voreingestellte `objectBoundingBox`. -->
        <radialGradient :id="`${uid}-core`">
          <stop
            v-for="(s, i) in SKILL_TREE_CORE_STOPS"
            :key="i"
            class="mos-core-stop"
            :offset="s.offset"
            :stop-opacity="s.opacity"
          />
        </radialGradient>

        <!-- Die Bänder dagegen haben `fill: none`; ihre Fill-Box wäre
             entartet und der Verlauf kollabierte. Deshalb `userSpaceOnUse`
             und ein Radius im viewBox-Raum, den das Layout mitrechnet.
             Dieselbe Begründung trägt `SigilSvgLayers`. -->
        <radialGradient
          v-for="arm in nebulaArms"
          :id="`${uid}-arm-${arm.id}`"
          :key="arm.id"
          gradientUnits="userSpaceOnUse"
          :cx="layout.center.x"
          :cy="layout.center.y"
          :r="layout.nebula.radius"
          :gradientTransform="layout.nebula.squashTransform"
        >
          <stop
            v-for="(s, i) in layout.nebula.stops"
            :key="i"
            :offset="s.offset"
            :stop-color="arm.color"
            :stop-opacity="s.opacity"
          />
        </radialGradient>
      </defs>

      <!-- Der Kernschein zieht den Blick dorthin, wo alle fünf Arme
           entspringen — die Aufgabe, die vorher die dichten inneren Ringe
           nebenbei erledigt haben. -->
      <ellipse
        class="mos-core"
        :cx="layout.core.x"
        :cy="layout.core.y"
        :rx="layout.core.rx"
        :ry="layout.core.ry"
        :fill="`url(#${uid}-core)`"
      />

      <g class="mos-nebula">
        <path
          v-for="arm in nebulaArms"
          :key="arm.id"
          class="mos-arm-band"
          :d="arm.d"
          :stroke="`url(#${uid}-arm-${arm.id})`"
          :style="{ opacity: arm.opacity }"
        />
      </g>

      <path
        v-for="e in edges"
        :key="e.id"
        class="mos-edge"
        :d="e.d"
        :stroke="e.stroke"
        :stroke-width="e.width"
        :stroke-dasharray="e.dash"
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
      :spot="n.spot"
      :spot-away="n.spotAway"
      :best-buy="n.bestBuy"
      @select="onSelect"
      @hover="onHover"
    />

    <button
      v-for="tag in layout.armTags"
      :key="tag.id"
      class="mos-arm"
      :class="{
        'mos-arm--active': focusBranch === tag.id,
        'mos-arm--spot': spotBranchId === tag.id,
      }"
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
   Design-Kasten — die Bühne füllt ihn ganz aus, damit die Arme dieselbe
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

/* ── Kern und Nebelbänder ─────────────────────────────────
   Was an die Stelle der fünf Rang-Ellipsen getreten ist. Beide sind STATISCH:
   kein `filter`, kein `feGaussianBlur`. Die Weichheit kommt aus den
   Verlaufs-Stops, der niedrigen Deckkraft und dem runden Strichende — ein
   Filter über fünf breite Bänder in demselben SVG, in dem 35 Kanten bei jedem
   Hover ihre Attribute wechseln, rasterte die Region bei jedem Zug neu. */
.mos-core-stop {
  stop-color: var(--rpg-gold);
}

.mos-arm-band {
  fill: none;
  stroke-width: v-bind(nebulaWidth);
  stroke-linecap: round;
  /* Der einmalige Umschlag zwischen Ruhe und Fokus — nur die Deckkraft. */
  transition: opacity v-bind(nebulaFade) ease;
}

/* Die Kanten folgen der Spirale, statt sie abzukürzen. `fill: none` ist hier
   PFLICHT und war es als `<line>` nie: ein `<path>` füllt per Voreinstellung
   schwarz, und die Fläche unter dem Bogen deckte die halbe Bühne zu. */
.mos-edge {
  fill: none;
  stroke-linecap: round;
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

/* Der Zeiger auf einer Karte drüben zieht denselben Namen mit: die fünf Arme
   sind sonst nur an ihrer Farbe zu unterscheiden, und ein Blick soll sagen
   „das gehört zu Vigil". Dieselbe Optik wie Hover und Fokus, weil es dieselbe
   Aussage ist — welcher Arm gerade gemeint ist. */
.mos-arm:hover,
.mos-arm--active,
.mos-arm--spot {
  border-color: var(--branch-color);
  background: color-mix(in srgb, var(--branch-color) 14%, var(--rpg-bg-deep));
  color: color-mix(in srgb, var(--branch-color) 85%, #fff);
}
</style>
