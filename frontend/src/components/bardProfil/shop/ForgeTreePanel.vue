<template>
  <div class="tree-panel" :style="stageStyle">
    <!-- shared cosmic backdrop (same starfield as Team / Planets / Skill Tree) -->
    <CosmicStageBackground />

    <!-- Alles Skalierte lebt im Viewport, der Ertrags-Sockel darunter NICHT.
         Die Bühne ragt bei Standardzoom weit über ihre Zelle hinaus; eine
         schwebende Sockelkarte läge damit über anklickbaren Knoten. -->
    <div
      ref="viewportEl"
      class="tree-viewport"
      @wheel.prevent="onWheel"
      @mouseleave="setTreeHover(null)"
    >
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
        '--forge-stage-size': `${FORGE_STAGE_SIZE}px`,
      }"
    >
      <!-- DAS TIEFENFELD. Wo bis hierher fünf gestrichelte Kreise lagen, liegt
           jetzt EIN statischer Verlauf: jeder Ringradius ist ein weicher Kamm in
           der Leitfarbe seiner Ebene, der nach beiden Seiten ausläuft. Fünf
           konzentrische Umrisse lasen sich als Zifferblatt und behaupteten eine
           Grenze, die es nicht gibt — was eine Ebene ausmacht, ist ihr ABSTAND
           zur Sonne. Dieselbe Auflösung wie im Meep-Baum, dem die Rang-Ellipsen
           aus dem gleichen Grund abgenommen wurden (`constants/forge.ts`).

           Steht VOR dem `<svg>` und liegt damit darunter: bei gleichem Rang
           (z-index 0 gegen `auto`) entscheidet die Dokumentordnung. -->
      <div class="depth-field" :style="depthFieldStyle" aria-hidden="true" />

      <svg
        class="tree-svg"
        :viewBox="`0 0 ${FORGE_STAGE_SIZE} ${FORGE_STAGE_SIZE}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Limbs: sun → root, root → branch, branch → leaf (dim base). -->
        <g stroke="#4a3418" stroke-width="4" stroke-linecap="round" fill="none">
          <line
            v-for="limb in limbs" :key="limb.key + '-base'"
            :x1="limb.x1" :y1="limb.y1" :x2="limb.x2" :y2="limb.y2"
          />
        </g>
        <!-- Active limbs (target node has levels). Die Grunddeckkraft steht als
             KLASSE und nicht als `opacity`-Attribut — ein Präsentationsattribut
             wäre von keiner Regel mehr zu überschreiben. -->
        <g stroke-width="2.5" stroke-linecap="round" fill="none">
          <line
            v-for="limb in activeLimbs" :key="limb.key + '-lit'"
            :x1="limb.x1" :y1="limb.y1" :x2="limb.x2" :y2="limb.y2"
            :stroke="limb.color"
            class="limb--lit"
          />
        </g>

        <!-- Spotlight chain: star edge → … → the node being pointed at. Exists
             only while something is hovered, three lines at most. -->
        <g
          v-if="spotlightLimbs.length > 0"
          class="spot-limbs"
          stroke-width="4" stroke-linecap="round" fill="none"
        >
          <line
            v-for="limb in spotlightLimbs" :key="limb.key + '-spot'"
            :x1="limb.x1" :y1="limb.y1" :x2="limb.x2" :y2="limb.y2"
            :stroke="spotlightColor"
          />
        </g>
      </svg>

      <!-- Die Bühne ist WORTLOS. Hier standen fünf Pillen, je eine über einer
           Ebene („Phase 1–2", „Swell · open" …). Was sie sagten, sagen inzwischen
           die Zeichen selbst: das Schloss am Motiv, DASS ein Knoten zu ist, und
           Tooltip wie Detailspalte, WELCHE Phase ihn aufschliesst. -->

      <!-- Sun -->
      <div class="sun-wrapper" :class="{ 'sun-flash': purchaseFlash }">
        <CometDisc v-if="solarStore.isCometState" :diameter="bodyDiameter" />
        <BlackHoleDisc v-else-if="isCollapsed" :diameter="bodyDiameter" />
        <div v-else class="tree-stage-sun" />
        <div class="sun-flash-veil" :style="sunFlashVeilStyle" />
        <div
          v-if="solarStore.canUpgradeStar || solarStore.isUpgrading"
          class="next-phase-preview"
          :style="nextPhasePreviewStyle"
        />
      </div>

      <!-- Nodes -->
      <div
        v-for="node in allNodes"
        :key="node.id"
        class="tree-node"
        :class="{ 'tree-node--spot': spotlightId === node.id }"
        :style="nodePos(node)"
      >
        <div
          class="node-circle"
          :class="[
            `node-circle--${node.sizeClass}`,
            `node-circle--${entryOf(node).state}`,
            {
              'node-circle--fresh': freshIds.has(node.id),
              'node-circle--spot': spotlightId === node.id,
              'node-circle--dim': spotlightId !== null && spotlightId !== node.id,
            },
          ]"
          :style="{ '--node-color': node.color }"
          @click="handleNodeClick(node)"
          @mouseenter="setTreeHover(node.id)"
          @mouseleave="setTreeHover(null)"
        >
          <span class="node-glow" aria-hidden="true" />
          <!-- Eine Ebene je Spotlight, nicht eine je Knoten: so existiert genau
               EINE statt fünfundzwanzig, und der Ping fängt bei jedem neuen
               Ziel von vorn an, weil das Element selbst neu ist. -->
          <span v-if="spotlightId === node.id" class="node-spot" aria-hidden="true" />
          <Icon
            :icon="node.icon"
            :width="node.iconSize"
            :height="node.iconSize"
            class="node-glyph"
            :style="{ color: node.color }"
          />
          <span v-if="entryOf(node).level > 0 || entryOf(node).state !== 'locked'" class="node-level">
            {{ levelChip(entryOf(node)) }}
          </span>
          <!-- Das Schloss steht genau dort, wo der Stufen-Chip NICHT steht: die
               Bedingung darüber schliesst den gesperrten Knoten aus, und bis
               hierher war das eine Leerstelle. Dieselbe Marke trägt die Zeile in
               der Liste (`.fc-lock-badge` in rpg-theme.css) — daran erkennt man
               beide als dasselbe Upgrade wieder.
               `capped` bekommt keins: ein Deckel ist keine Sperre. -->
          <span
            v-if="entryOf(node).state === 'locked'"
            class="fc-lock-badge"
            aria-hidden="true"
          >
            <Icon :icon="FORGE_LOCK_ICON" width="100%" height="100%" />
          </span>
        </div>

        <!-- Die BEST-BUY-Marke. Genau EINE im ganzen Bild, und sie animiert nur
             Deckkraft auf einer Ebene mit statischem Schein (Performance-Regel
             2/11). „Günstigster kaufbarer" und nicht „stärkster": die Wirkungen
             des Baums stehen in Prozent, HP, Sekunden und Chimes nebeneinander
             und sind nicht vergleichbar — der Preis ist die einzige Zahl, die
             alle teilen. -->
        <div v-if="bestBuyId === node.id" class="best-buy" aria-hidden="true">
          <span class="best-buy-ring" />
          <span class="best-buy-label">{{ FORGE_BEST_BUY_LABEL }}</span>
        </div>

        <!-- Tooltip — hängt am Hover DIESER Spalte, nicht am Spotlight: ein
             Zeiger auf der Karte rechts darf hier keinen zweiten Abzug
             derselben Zahlen aufklappen. -->
        <div
          v-if="treeHoverId === node.id"
          class="node-tooltip"
          :class="isTooltipBelow(node.angleDeg) ? 'node-tooltip--below' : 'node-tooltip--above'"
        >
          <div class="tt-head">
            <span class="tt-name" :style="{ color: node.color }">{{ node.name }}</span>
            <span class="tt-tier">{{ entryOf(node).tierLabel }}</span>
          </div>
          <div class="tt-desc">{{ entryOf(node).desc }}</div>
          <template v-if="entryOf(node).state === 'locked' || entryOf(node).state === 'capped'">
            <div class="tt-lock">{{ entryOf(node).lockReason }}</div>
          </template>
          <template v-else-if="entryOf(node).state === 'maxed'">
            <div class="tt-maxed">✦ MAXED</div>
          </template>
          <template v-else>
            <div class="tt-next"><span class="tt-arrow">→</span> {{ entryOf(node).nextDesc }}</div>
            <div class="tt-cost-row">
              <span class="tt-cost" :class="{ 'tt-cost--cant': !entryOf(node).canBuy }">
                {{ formatNumber(entryOf(node).goldCost) }} G
              </span>
              <span
                v-for="mat in entryOf(node).materials"
                :key="mat.id"
                class="tt-mat"
                :class="{ 'tt-mat--missing': !mat.ok }"
              >
                <img v-if="mat.image" :src="mat.image" class="tt-mat-img" :alt="mat.name" />
                ×{{ mat.need }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
    </div>

    <ForgeYieldPlinth />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { useSolarUpgradeStore, type SolarBranchId } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { FORGE_NODES } from '@/config/progression/starForge'
import { formatNumber } from '@/config/ui/numberFormat'
import {
  useForgeUpgrades,
  FORGE_EMPTY_UPGRADE_ENTRY,
} from '@/composables/ui/useForgeUpgrades'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import type { ForgeNodeDef, ForgeNodeTier, ForgeUpgradeEntry, ForgeUpgradeTier } from '@/types'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import BlackHoleDisc from '@/components/idle/sun/BlackHoleDisc.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import ForgeYieldPlinth from './ForgeYieldPlinth.vue'
import {
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  COMET_PHASE_DATA,
  SHOP_SUN_MIN_DIAMETER,
  SHOP_SUN_MAX_DIAMETER,
  FORGE_STAGE_SIZE,
  FORGE_RING_ROOT_R,
  FORGE_RING_BRANCH_R,
  FORGE_RING_LEAF_R,
  FORGE_RING_WARD_R,
  FORGE_RING_PACT_R,
  FORGE_RING_CROWN_R,
  FORGE_RING_BOUGH_R,
  FORGE_DEPTH_CREST_SPREAD,
  FORGE_DEPTH_CREST_ALPHA,
  FORGE_DEPTH_CREST_LOCKED,
  FORGE_TREE_ZOOM_MIN,
  FORGE_TREE_ZOOM_MAX,
  FORGE_TREE_ZOOM_STEP,
  FORGE_TREE_ZOOM_DEFAULT,
  FORGE_ROOT_ANGLES_DEG,
  SOLAR_BRANCHES,
  FORGE_ICON_SIZE_ROOT,
  FORGE_ICON_SIZE_BRANCH,
  FORGE_ICON_SIZE_LEAF,
  FORGE_ICON_SIZE_WARD,
  FORGE_ICON_SIZE_PACT,
  FORGE_ICON_SIZE_CROWN,
  FORGE_ICON_SIZE_BOUGH,
  FORGE_LOCK_ICON,
  FORGE_ENDLESS_SYMBOL,
  FORGE_TREE_FIT_PADDING_PX,
  FORGE_BODY_EDGE_FRACTION,
  FORGE_SUN_EDGE_GAP,
  FORGE_SUN_FLASH_MS,
  FORGE_SPOTLIGHT_NODE_SCALE,
  FORGE_SPOTLIGHT_DIM_OPACITY,
  FORGE_SPOTLIGHT_PING_MS,
  FORGE_SPOTLIGHT_MAX_LIMBS,
  FORGE_BEST_BUY_LABEL,
  FORGE_UPGRADE_GROUPS,
} from '@/config/constants'

const solarStore = useSolarUpgradeStore()
const forgeStore = useStarForgeStore()
const { entryById, bestBuyId, freshIds, buyUpgrade } = useForgeUpgrades()
const { spotlightId, treeHoverId, setTreeHover, resetForgeSpotlight } = useForgeSpotlight()

const C = FORGE_STAGE_SIZE / 2

/** Endphase: der Stern ist kollabiert — der Baum ist ausgewachsen, im Zentrum
 *  steht statt der Plasmascheibe das Schwarze Loch. */
const isCollapsed = computed(
  () => !solarStore.isCometState && solarStore.starPhase >= STAR_PHASE_FINAL_INDEX,
)

// ── Der Körper in der Mitte — seine Größe ist zugleich Geometrie ──────────────
/* Steht VOR dem Knotenmodell, weil die Wurzel-Äste an seinem Rand ansetzen:
   Durchmesser und Phasenfarben kommen aus derselben Rechnung, damit die Striche
   nicht an einer zweiten, danebenliegenden Zahl hängen. */
const currentStage = computed(() => STAR_PHASE_DATA[solarStore.starPhase])
/** While still a comet, the next evolution target is Spark (phase 0). */
const nextStage = computed(() =>
  solarStore.isCometState
    ? STAR_PHASE_DATA[0]
    : STAR_PHASE_DATA[Math.min(solarStore.starPhase + 1, STAR_PHASE_DATA.length - 1)],
)

const PHASE_RADIUS_MIN = Math.min(...STAR_PHASE_DATA.map((p) => p.radius))
const PHASE_RADIUS_MAX = Math.max(...STAR_PHASE_DATA.map((p) => p.radius))

/** Kantenlänge der Scheibe, die gerade gerendert wird — Komet, Plasma oder
 *  Schwarzes Loch. Eine Quelle für `--shop-sun-d`, den Kaufblitz und den
 *  Ansatzpunkt der Wurzel-Äste. */
const bodyDiameter = computed(() => {
  if (solarStore.isCometState) return SHOP_SUN_MIN_DIAMETER
  if (isCollapsed.value) return SHOP_SUN_MAX_DIAMETER
  const s = currentStage.value
  const t = (s.radius - PHASE_RADIUS_MIN) / (PHASE_RADIUS_MAX - PHASE_RADIUS_MIN || 1)
  return Math.round(SHOP_SUN_MIN_DIAMETER + t * (SHOP_SUN_MAX_DIAMETER - SHOP_SUN_MIN_DIAMETER))
})

/**
 * Radius, an dem eine Wurzel-Verbindung ansetzt: der SICHTBARE Rand des
 * aktuellen Körpers plus einen Finger Luft. Der Komet füllt seinen Kasten nur
 * zu 76 %, Plasmascheibe und Schwarzes Loch bis zur Kante — deshalb der Anteil
 * je Körper statt einer Zahl für alle.
 */
const sunEdgeR = computed(() => {
  const fraction = solarStore.isCometState
    ? FORGE_BODY_EDGE_FRACTION.comet
    : isCollapsed.value
      ? FORGE_BODY_EDGE_FRACTION.blackHole
      : FORGE_BODY_EDGE_FRACTION.star
  return (bodyDiameter.value / 2) * fraction + FORGE_SUN_EDGE_GAP
})

// ── Node model — roots (solar) + branches/leaves (forge) in one render list ──
interface TreeNode {
  id: string
  name: string
  icon: string
  color: string
  angleDeg: number
  dist: number
  tier: ForgeUpgradeTier
  sizeClass: ForgeUpgradeTier
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

/* Ring und Knotengrösse hängen am `tier` und an nichts sonst. Als Tabelle statt
   als Kette von Ternären: bei sieben Ringen wäre die Kette eine Stelle, an der
   ein neuer Ring stillschweigend auf dem falschen Radius landet. Ein
   `Record<ForgeNodeTier, …>` ohne `Partial` erzwingt beim nächsten Ring einen
   Typfehler statt eines stummen Fehlverhaltens — genau das ist hier der Zweck. */
const RING_RADIUS: Record<ForgeNodeTier, number> = {
  branch: FORGE_RING_BRANCH_R,
  leaf: FORGE_RING_LEAF_R,
  ward: FORGE_RING_WARD_R,
  pact: FORGE_RING_PACT_R,
  crown: FORGE_RING_CROWN_R,
  bough: FORGE_RING_BOUGH_R,
}
const RING_ICON_SIZE: Record<ForgeNodeTier, number> = {
  branch: FORGE_ICON_SIZE_BRANCH,
  leaf: FORGE_ICON_SIZE_LEAF,
  ward: FORGE_ICON_SIZE_WARD,
  pact: FORGE_ICON_SIZE_PACT,
  crown: FORGE_ICON_SIZE_CROWN,
  bough: FORGE_ICON_SIZE_BOUGH,
}

/* Name, Glyph und Farbe der fünf Strahlen stehen als SOLAR_BRANCHES in
   constants/sun.ts — der Sternen-Tooltip im Header listet dieselben fünf als
   Bedingung fürs nächste Evolve. Nur der Winkel ist Layout DIESES Baums und
   kommt deshalb weiterhin aus FORGE_ROOT_ANGLES_DEG. */
const ROOTS: RootDef[] = SOLAR_BRANCHES.map((b) => ({
  id: b.id,
  name: b.name,
  icon: b.icon,
  color: b.color,
  statLabel: b.statLabel,
  angleDeg: FORGE_ROOT_ANGLES_DEG[b.id],
}))

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
    iconSize: FORGE_ICON_SIZE_ROOT,
    parentId: null,
  }))
  const forge: TreeNode[] = FORGE_NODES.map((def) => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    color: def.color,
    angleDeg: def.angleDeg,
    dist: RING_RADIUS[def.tier],
    tier: def.tier,
    sizeClass: def.tier,
    iconSize: RING_ICON_SIZE[def.tier],
    parentId: def.parentId,
    def,
  }))
  return [...roots, ...forge]
})

/**
 * Die Leitfarbe einer Ebene — sie färbt den Ruhekamm der Ebene im Tiefenfeld
 * und den Ring-Chip an der Zeile drüben aus derselben Tabelle. Zwei eigene Töne
 * für dieselbe Ebene liefen beim nächsten Ring auseinander.
 */
const RING_ACCENT: Record<ForgeUpgradeTier, string> = Object.fromEntries(
  FORGE_UPGRADE_GROUPS.map((group) => [group.tier, group.accent]),
) as Record<ForgeUpgradeTier, string>

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

const nodeById = computed(() => new Map(allNodes.value.map((n) => [n.id, n])))

const limbs = computed<Limb[]>(() => {
  const result: Limb[] = []
  for (const node of allNodes.value) {
    let from: { x: number; y: number }
    if (node.tier === 'root') {
      from = pt(node.angleDeg, sunEdgeR.value)
    } else {
      const parent = nodeById.value.get(node.parentId ?? '')
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
  limbs.value.filter((limb) => (entryById.value.get(limb.targetId)?.level ?? 0) > 0),
)

const limbByTarget = computed(() => new Map(limbs.value.map((limb) => [limb.targetId, limb])))

/**
 * Der Weg vom Sternenrand bis zum gezeigten Knoten, Glied für Glied: ein Blatt
 * hängt an seinem Zweig, der Zweig an seiner Wurzel, die Wurzel am Rand des
 * Körpers (`sunEdgeR`). Die Kette läuft über `parentId` nach innen und
 * ist damit höchstens `FORGE_SPOTLIGHT_MAX_LIMBS` lang.
 *
 * Sie zeigt, was die Liste rechts nicht sagen kann: WO im Baum das Upgrade
 * unter dem Zeiger hängt.
 */
const spotlightLimbs = computed<Limb[]>(() => {
  const id = spotlightId.value
  if (id === null) return []
  const chain: Limb[] = []
  let cursor: string | null = id
  while (cursor !== null && chain.length < FORGE_SPOTLIGHT_MAX_LIMBS) {
    const limb = limbByTarget.value.get(cursor)
    if (!limb) break
    chain.push(limb)
    cursor = nodeById.value.get(cursor)?.parentId ?? null
  }
  return chain
})

/** EINE Farbe für die ganze Kette — die des gezeigten Knotens. Gliedweise
 *  eigene Farben ließen den Strahl als drei Striche lesen, nicht als einen. */
const spotlightColor = computed(
  () => (spotlightId.value ? nodeById.value.get(spotlightId.value)?.color : null) ?? '#e8c040',
)

// Für das scoped CSS unten — Muster `SigilRoleNode.vue`: die Zahl steht in den
// Konstanten, den Keyframe-Namen trägt die CSS-Klasse.
const spotScale = String(FORGE_SPOTLIGHT_NODE_SCALE)
const spotDimOpacity = String(FORGE_SPOTLIGHT_DIM_OPACITY)
const spotPingMs = `${FORGE_SPOTLIGHT_PING_MS}ms`

// ── Ring unlock state ─────────────────────────────────────────────────────────
/**
 * Ab welcher Sonnenphase eine Ebene aufgeht, steht in den KNOTEN, die auf ihr
 * liegen, und nicht in einer festen Zahl daneben. Seit die Ringe eine Leiter
 * bilden, trägt jeder Ring genau EINE Freischaltphase — `min` und `max` sind
 * gleich. Das Paar bleibt trotzdem stehen: es ist die Stelle, an der eine
 * spätere Ausnahme sichtbar würde, statt sich zu verstecken.
 *
 * Der Ring gilt als offen, sobald sein ERSTER Knoten kaufbar wird — das färbt
 * seinen Kamm im Tiefenfeld.
 */
const ringPhases = computed(() => {
  const out = {} as Record<ForgeNodeTier, { min: number; max: number }>
  for (const def of FORGE_NODES) {
    const seen = out[def.tier]
    if (!seen) out[def.tier] = { min: def.phase, max: def.phase }
    else {
      seen.min = Math.min(seen.min, def.phase)
      seen.max = Math.max(seen.max, def.phase)
    }
  }
  return out
})

/** Steht die Sonne weit genug für diese Ebene? */
function ringOpenAt(tier: ForgeNodeTier): boolean {
  return solarStore.starPhase >= (ringPhases.value[tier]?.min ?? Infinity)
}

/**
 * Der Kronen-Ring trägt als einziger ein ZWEITES Tor (der Aufbruch). Der Store
 * beantwortet es, damit der Prestige-Zähler nicht an zwei Stellen gelesen wird;
 * die Phase daneben ist dieselbe Bedingung wie bei jedem anderen Ring.
 */
const crownsUnlocked = computed(() => ringOpenAt('crown') && forgeStore.crownsUnlocked)

// ── Das Tiefenfeld — die Ebenen als weiche Bänder ─────────────────────────────
/* Steht NACH den Freischalt-Flags, weil jeder Kamm seine Farbe von ihnen
   bekommt: eine offene Ebene trägt ihre Leitfarbe, eine gesperrte den kalten
   Rest. Die Ordnung im Feld ist die des Baums, von innen nach aussen — und
   damit zugleich die der Sonnenphasen. */
const depthBands = computed(() => [
  { tier: 'root' as ForgeUpgradeTier, r: FORGE_RING_ROOT_R, unlocked: true },
  { tier: 'branch' as ForgeUpgradeTier, r: FORGE_RING_BRANCH_R, unlocked: ringOpenAt('branch') },
  { tier: 'leaf' as ForgeUpgradeTier, r: FORGE_RING_LEAF_R, unlocked: ringOpenAt('leaf') },
  { tier: 'ward' as ForgeUpgradeTier, r: FORGE_RING_WARD_R, unlocked: ringOpenAt('ward') },
  { tier: 'pact' as ForgeUpgradeTier, r: FORGE_RING_PACT_R, unlocked: ringOpenAt('pact') },
  { tier: 'crown' as ForgeUpgradeTier, r: FORGE_RING_CROWN_R, unlocked: crownsUnlocked.value },
  { tier: 'bough' as ForgeUpgradeTier, r: FORGE_RING_BOUGH_R, unlocked: ringOpenAt('bough') },
])

/** Die Leitfarbe mit Deckkraft — als `color-mix`, damit die Farbe selbst nur an
 *  EINER Stelle steht (`FORGE_UPGRADE_GROUPS`) und hier bloß ihr Anteil. */
function tinted(tier: ForgeUpgradeTier, alpha: number): string {
  return `color-mix(in srgb, ${RING_ACCENT[tier]} ${alpha * 100}%, transparent)`
}

/**
 * EIN Kamm: transparent → Farbe genau auf dem Ringradius → transparent.
 *
 * Gerechnet in Prozent des BÜHNENRADIUS, denn `circle closest-side` macht ihn
 * bei einer quadratischen Bühne zur 100 %-Marke. Damit hängen Kamm und Knoten
 * an derselben Zahl (`FORGE_RING_*_R`) — eine zweite Prozentangabe im CSS liefe
 * beim nächsten Ring auseinander.
 */
function crestStops(r: number, color: string, spread: number): string {
  const p = (r / C) * 100
  const s = spread * 100
  return [
    `transparent ${(p - s).toFixed(2)}%`,
    `${color} ${p.toFixed(2)}%`,
    `transparent ${(p + s).toFixed(2)}%`,
  ].join(', ')
}

/**
 * Das ruhende Feld: fünf Kämme in EINEM Verlauf. Einmal beim Rendern gesetzt und
 * nur bei einem Phasenwechsel neu — kein Wert pro Frame, keine Animation auf
 * `background` (Performance-Regel 2).
 *
 * Bewusst OHNE zweite Verlaufsschicht: eine Vignette darüber machte die
 * quadratische Ebene selbst sichtbar (Herleitung in `constants/forge.ts`).
 */
const depthFieldStyle = computed(() => {
  const crests = depthBands.value
    .map((band) =>
      crestStops(
        band.r,
        band.unlocked
          ? tinted(band.tier, FORGE_DEPTH_CREST_ALPHA)
          : FORGE_DEPTH_CREST_LOCKED,
        FORGE_DEPTH_CREST_SPREAD,
      ),
    )
    .join(', ')
  return { background: `radial-gradient(circle closest-side at 50% 50%, ${crests})` }
})

/**
 * Stufe, Kosten, Wirkung und Sperrgrund eines Knotens kommen aus
 * `useForgeUpgrades()` — dieselbe Quelle, aus der die Upgrade-Liste in der
 * rechten Spalte liest. Hier bleibt nur, was Geometrie ist.
 *
 * Ein fehlender Eintrag kann nicht vorkommen (beide Seiten laufen über
 * denselben Katalog), der Rückfall hält lediglich das Rendern am Leben.
 */
function entryOf(node: TreeNode): ForgeUpgradeEntry {
  return entryById.value.get(node.id) ?? FORGE_EMPTY_UPGRADE_ENTRY
}

/** „3/6" für alles Gedeckelte, „3 ∞" für einen Bough — ein gerendertes
 *  `Infinity` wäre der rohe JavaScript-Wert. */
function levelChip(entry: ForgeUpgradeEntry): string {
  return Number.isFinite(entry.maxLevel)
    ? `${entry.level}/${entry.maxLevel}`
    : `${entry.level} ${FORGE_ENDLESS_SYMBOL}`
}

function isTooltipBelow(angleDeg: number): boolean {
  // Open tooltips toward the stage center: top-half nodes open downward,
  // bottom-half nodes upward — so they never clip the panel edge or the
  // phase dock, even at high zoom.
  const n = ((angleDeg % 360) + 360) % 360
  return n >= 180
}

// ── Interaction ───────────────────────────────────────────────────────────────
const purchaseFlash = ref(false)

function flashSun(): void {
  purchaseFlash.value = true
  // Rein visuell — kein Spielzustand hängt daran, also reale Zeit.
  setTimeout(() => {
    purchaseFlash.value = false
  }, FORGE_SUN_FLASH_MS)
}

/**
 * Kauf und Meldung liegen im Composable, damit der Baum und die Upgrade-Liste
 * denselben Weg nehmen. Hier bleibt nur, was der Baum eigenes tut.
 *
 * Der Klick heftete den Knoten früher zusätzlich im Detailkopf an — das war der
 * einzige Weg zu erfahren, WARUM ein gesperrter Knoten nicht reagiert. Diese
 * Auskunft gibt inzwischen der Tooltip direkt am Kreis; der Kopf zeigt seither
 * die Empfehlung und nicht mehr, worauf man zeigt.
 */
function handleNodeClick(node: TreeNode): void {
  if (buyUpgrade(node.id)) flashSun()
}

// ── Zoom (buttons + wheel) with container fit ─────────────────────────────────
const viewportEl = ref<HTMLElement | null>(null)
const zoom = ref(FORGE_TREE_ZOOM_DEFAULT)
const fitScale = ref(1)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!viewportEl.value) return
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    // Gemessen wird der VIEWPORT, nicht das Panel: der Ertrags-Sockel darunter
    // gehört nicht zur Fläche, in die der Baum passen muss.
    // The phase dock moved into the forge sidebar, so the air it needed at the
    // top now sits on all four sides instead — same fit as before, centred.
    fitScale.value = Math.max(
      0.3,
      (Math.min(rect.width, rect.height) - FORGE_TREE_FIT_PADDING_PX * 2) / FORGE_STAGE_SIZE,
    )
  })
  resizeObserver.observe(viewportEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  // Der Spotlight lebt auf Modulebene und überlebte diese Komponente sonst — ein
  // Knoten aus der letzten Sitzung stünde beim nächsten Öffnen hell da, ohne
  // dass der Zeiger irgendwo läge.
  resetForgeSpotlight()
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
const stageStyle = computed(() => {
  if (solarStore.isCometState) {
    return {
      '--phase-core': COMET_PHASE_DATA.core,
      '--phase-mid': COMET_PHASE_DATA.mid,
      '--phase-edge': COMET_PHASE_DATA.edge,
      '--phase-primary': COMET_PHASE_DATA.accent,
      '--phase-glow': COMET_PHASE_DATA.glow,
      '--pulse-speed': COMET_PHASE_DATA.pulseSpeed,
      '--shop-sun-d': `${bodyDiameter.value}px`,
    }
  }
  const s = currentStage.value
  return {
    '--phase-core': s.core,
    '--phase-mid': s.mid,
    '--phase-edge': s.edge,
    '--phase-primary': s.phasePrimary,
    '--phase-glow': s.phaseGlow,
    '--pulse-speed': s.pulseSpeed,
    '--shop-sun-d': `${bodyDiameter.value}px`,
  }
})

/**
 * Der Kaufblitz deckt die Scheibe, die gerade steht — Komet, Plasma oder
 * Schwarzes Loch, alle drei tragen jetzt denselben `bodyDiameter`.
 * Die Dauer steht als Variable am Element, damit CSS und `flashSun()` dieselbe
 * Zahl lesen — sie wechselt nie, ist also kein Wert pro Frame.
 */
const sunFlashVeilStyle = computed(() => {
  const d = `${bodyDiameter.value}px`
  return { width: d, height: d, '--sun-flash-ms': `${FORGE_SUN_FLASH_MS}ms` }
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
/* Spalte statt Fläche: oben der Viewport mit der skalierten Bühne, darunter der
   Ertrags-Sockel im Fluss. Der Sockel liegt damit garantiert neben und nie über
   einem Knoten — bei jedem Zoom. */
.tree-panel {
  position: relative;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-viewport {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow: hidden;
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
  background: #16110a;
  border: 1px solid #4a3010;
  border-radius: 4px;
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
/* Kantenlänge kommt aus `FORGE_STAGE_SIZE` und steht hier NICHT ein zweites Mal
   als Literal: `fitScale` teilt durch dieselbe Konstante, und zwei Zahlen für
   eine Bühne laufen beim nächsten Ring auseinander. Einmal beim Rendern
   gesetzt, kein Wert pro Frame. */
.tree-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--forge-stage-size);
  height: var(--forge-stage-size);
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

/* ══════════════════════════════════════════════════
   TIEFENFELD — die Ebenen ohne Kreiskante
══════════════════════════════════════════════════ */
/* EINE Ebene ersetzt fünf SVG-Kreise. Sie trägt einen STATISCHEN Verlauf, der
   nur bei einem Phasenwechsel neu gesetzt wird — kein Wert pro Frame, keine
   Animation auf `background` (Performance-Regel 2). `z-index: 0` gegen das
   `auto` des `<svg>`: bei gleichem Rang gewinnt die Dokumentordnung, und sie
   steht im Template davor.

   Eine zweite Ebene lag hier einmal darüber und hob den Ring hervor, dessen
   Filterchip gewählt war; sie ist mit der Kopfleiste gestrichen. */
.depth-field {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

/* Ring-Pillen gibt es NICHT MEHR — hier standen fünf Klassen für die
   Beschriftung je Ebene. Die Bühne ist wortlos; welche Phase eine Ebene
   aufschliesst, steht im Tooltip am Knoten und in der Detailspalte. */

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

/* Kaufblitz: ein heller Schleier, der nur seine Deckkraft ändert. Ein
   `filter: brightness()` auf dem Wrapper hätte für seine 0,45 s Sonne und
   Phasenvorschau gemeinsam auf eine eigene Rendering-Surface gezwungen —
   dieselbe Aufhellung leistet die Ebene ohne Neurasterung
   (Muster: ChampionOrbit.vue). */
.sun-flash-veil {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(255, 245, 220, 0.34);
  opacity: 0;
  pointer-events: none;
  z-index: 5;
}

.sun-wrapper.sun-flash .sun-flash-veil {
  animation: sun-flash-veil var(--sun-flash-ms, 450ms) ease-out;
}

@keyframes sun-flash-veil {
  0%   { opacity: 0; }
  35%  { opacity: 1; }
  100% { opacity: 0; }
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

/* Die zwei mittleren Ringe stehen mit 40 px eine Spur ÜBER dem Blatt und unter
   dem Zweig — sie tragen eigene Achsen, sind aber keine Hauptäste. Der farbige
   Rand ist das einzige, was sie optisch trennt: dieselben Töne wie ihr Kamm im
   Tiefenfeld und ihr Chip in der Leiste (Türkis, Blauviolett). */
.node-circle--ward {
  width: 40px;
  height: 40px;
  border: 2px solid #1e5a50;
}

.node-circle--pact {
  width: 40px;
  height: 40px;
  border: 2px solid #3a4a80;
}

/* Ring 7 ist der äusserste: der endlose. Der violette Rand ist dieselbe Farbe
   wie sein Kamm und sein Listenabschnitt — und im Projekt der Ton für
   „episch/selten" (`FORGE_RELIC_RARITY_COLOR.epic`). */
.node-circle--bough {
  width: 42px;
  height: 42px;
  border: 2px solid #4a2a6a;
}

/* Ring 6 ist der GRÖSSTE nach dem Kern — grösser als ein Zweig, kleiner als ein
   Strahl. Fünf Knoten weit aussen, jeder nur einmal zu haben: in Bough-Grösse
   verschwänden sie am Rand einer Bühne, die `useFitScale` auf Full HD auf rund
   60 % zieht. Der goldene Rand ist derselbe Ton wie sein Kamm und sein
   Listenabschnitt. */
.node-circle--crown {
  width: 50px;
  height: 50px;
  border: 3px solid #6a5020;
}

.node-level {
  font-size: 8px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1;
  pointer-events: none;
}

/* States */
/* Gesperrt: es tritt das MOTIV zurück, nicht der ganze Kreis. Eine `opacity` am
   Kreis vererbt sich multiplikativ auf jedes Kind — das Schloss an seiner Kante
   stünde dann bei 0,5, und ein halb sichtbares Schloss sagt nichts. Rand, Grund
   und Abzeichen bleiben deshalb klar; zurück tritt genau das, was noch nicht
   gilt. Die Spotlight-Dämpfung (`--dim`) bleibt am Kreis: sie meint den ganzen
   Knoten. */
.node-circle--locked {
  border-color: #4a3010;
  cursor: not-allowed;
}

.node-circle--locked .node-glyph {
  opacity: 0.42;
  filter: grayscale(60%);
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

/* Bereit zum Kauf: der Schein atmet, nicht der Kreis. Im Vollausbau stehen bis
   zu 25 kaufbare Knoten gleichzeitig — eine Animation auf `box-shadow` und
   `border-color` rasterte dort jeden einzelnen in jedem Frame samt Schatten neu.
   Der Schein ist deshalb eine eigene Ebene mit STATISCHEM Schatten; animiert
   wird ausschließlich ihre Deckkraft. */
.node-glow {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  z-index: -1;
}

.node-circle--affordable {
  border-color: #c89040;
}

.node-circle--affordable .node-glow {
  box-shadow: 0 0 22px rgba(232, 200, 80, 0.85);
  animation: node-glow-breathe 2s ease-in-out infinite alternate;
}

@keyframes node-glow-breathe {
  from { opacity: 0.45; }
  to   { opacity: 1; }
}

.node-circle--affordable:hover {
  transform: scale(1.12);
  border-color: #e8c060;
}

/* Beim Zeigen steht der Schein still und voll — `animation-play-state: paused`
   käme hier zu spät, der laufende Keyframe schriebe die Deckkraft weiter. */
.node-circle--affordable:hover .node-glow {
  animation: none;
  opacity: 1;
}

/* ── NEU SEIT DEM LETZTEN BLICK ──────────────────────────────────
   Frisch ist immer auch kaufbar — die atmende Ebene steht also schon. Sie wird
   deshalb UMGEFÄRBT statt eine zweite darüberzulegen: der Baum zeichnet bis zu
   49 Knoten, und eine zweite Keyframe je Knoten wäre der teuerste Weg zur
   gleichen Aussage. Der Ring selbst bleibt statisch azurn.

   Steht NACH `--affordable`, damit die spätere Regel bei gleicher Spezifität
   gewinnt. */
.node-circle--fresh {
  border-color: #60a5fa;
}

.node-circle--fresh .node-glow {
  box-shadow: 0 0 22px rgba(96, 165, 250, 0.9);
}

.node-circle--fresh:hover {
  border-color: #bae6fd;
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

/* ══════════════════════════════════════════════════
   BEST BUY
   Genau EINE Marke im ganzen Bild — deshalb darf sie auffällig sein. Der Ring
   ist eine eigene Ebene mit STATISCHEM Schein, animiert wird nur seine
   Deckkraft (Performance-Regel 2/11); die Beschriftung rechnet den Zoom heraus,
   damit sie bei jedem Maßstab dieselbe Größe hat wie der Tooltip daneben.
══════════════════════════════════════════════════ */
.best-buy {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.best-buy-ring {
  position: absolute;
  inset: -7px;
  border-radius: 50%;
  border: 2px solid #52b830;
  box-shadow: 0 0 16px rgba(82, 184, 48, 0.8);
  animation: best-buy-breathe 1.8s ease-in-out infinite alternate;
}

@keyframes best-buy-breathe {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}

.best-buy-label {
  position: absolute;
  left: 50%;
  top: calc(100% + 12px);
  transform: translateX(-50%) scale(var(--inv-scale, 1));
  transform-origin: top center;
  white-space: nowrap;
  padding: 3px 8px;
  border-radius: 3px;
  background: #1e2e12;
  border: 1px solid #4a8a28;
  color: #9fe062;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

/* ══════════════════════════════════════════════════
   HOVER-SPOTLIGHT
══════════════════════════════════════════════════ */
/* Der Knoten unter dem Zeiger — gleich ob hier oder in der Liste rechts —
   wächst, atmet in seiner Leitfarbe und bekommt einen einmaligen Ping; die
   übrigen vierundzwanzig treten zurück.

   Der Ring ist eine EIGENE Ebene mit STATISCHEM Schein, animiert werden nur
   `opacity` und `transform` (Performance-Regel 11). Ein pulsender `box-shadow`
   am Kreis rasterte ihn samt Schatten in jedem Frame neu. Und er kann NICHT auf
   `.node-glow` liegen: dort läuft bei kaufbaren Knoten schon
   `node-glow-breathe`, zwei Keyframes auf einer Ebene überlagern sich nicht. */
.node-spot {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--node-color, #c89040);
  box-shadow: 0 0 18px color-mix(in srgb, var(--node-color, #c89040) 80%, transparent);
  pointer-events: none;
  z-index: -1;
  animation: node-spot-breathe 1.6s ease-in-out infinite alternate;
}

@keyframes node-spot-breathe {
  from { opacity: 0.55; transform: scale(1); }
  to   { opacity: 1; transform: scale(1.06); }
}

/* Der einmalige Ping auf derselben Marke: ein Ring, der aufgeht und vergeht. */
.node-spot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 2px solid var(--node-color, #c89040);
  animation: node-spot-ping v-bind(spotPingMs) ease-out 1 forwards;
}

@keyframes node-spot-ping {
  from { opacity: 0.7; transform: scale(1); }
  to   { opacity: 0; transform: scale(1.9); }
}

/* Doppelt geschrieben, mit Absicht: `.node-circle--affordable:hover` wiegt
   0,2,0 und hielte den Knoten sonst auf seinen 1,12 fest. Auf den Knoten zeigen
   und auf seine Karte zeigen sind EINE Geste — sie dürfen nicht zwei Größen
   ergeben. */
.node-circle.node-circle--spot {
  transform: scale(v-bind(spotScale));
  transition-duration: 0.12s;
}

/* Beim Spotlight steht der Kaufbar-Schein still und voll — sonst schwebten zwei
   atmende Ringe mit verschiedenem Takt übereinander. Dieselbe Auflösung wie in
   `.node-circle--affordable:hover .node-glow`, nur greift sie jetzt auch, wenn
   der Zeiger drüben auf der Karte steht. */
.node-circle--spot .node-glow {
  animation: none;
  opacity: 1;
}

/* Zurücktreten. Klasse je Knoten, NICHT als geerbte Variable am Container
   (Performance-Regel 3). Steht nach `--locked` (0,5) und `--capped` (0,6) und
   gewinnt damit bei gleicher Spezifität über die Quellreihenfolge. */
.node-circle--dim {
  opacity: v-bind(spotDimOpacity);
  transition-duration: 0.12s;
}

/* Und ihr Schein hört auf zu atmen. Das ist der eigentliche Gewinn: statt bis
   zu fünfundzwanzig laufender `node-glow-breathe` läuft während eines
   Spotlights genau eine Animation im Knotenfeld. */
.node-circle--dim .node-glow {
  animation: none;
  opacity: 0.25;
}

/* ══════════════════════════════════════════════════
   RINGFILTER — was der Chip oben nicht durchlässt
══════════════════════════════════════════════════ */
/* Äste. Die Grunddeckkraft der gewachsenen Verbindungen steht als KLASSE und
   nicht als `opacity`-Attribut am `<line>` — ein Präsentationsattribut wäre von
   keiner Regel mehr zu überschreiben. */
.limb--lit {
  opacity: 0.55;
}

/* `scale()` am Kreis öffnet einen Stapelkontext INNERHALB des Wrappers — ohne
   dieses Anheben läge der vergrößerte Knoten im gedrängten Blattring unter
   seinem nächsten Geschwister. */
.tree-node--spot {
  z-index: 6;
}

/* Der Lichtlauf auf der Astkette. `stroke-dashoffset` ist der von
   Performance-Regel 11 ausdrücklich erlaubte Weg; der Offset ist Strich plus
   Lücke, damit die Schleife nahtlos schließt. Höchstens drei Linien. */
.spot-limbs line {
  opacity: 0.95;
  stroke-dasharray: 14 10;
  animation: forge-spot-flow 0.9s linear infinite;
}

@keyframes forge-spot-flow {
  to { stroke-dashoffset: -24; }
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
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
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
  /* Der Schein bleibt stehen — ohne die Deckkraft mitzusetzen bliebe er
     unsichtbar, und der Knoten verlöre sein „bereit"-Zeichen. */
  .node-circle--affordable .node-glow {
    animation: none;
    opacity: 1;
  }

  .sun-wrapper.sun-flash .sun-flash-veil {
    animation: none;
  }

  /* Dieselbe Falle wie oben, schärfer: der Ping trägt `forwards` und endete bei
     Deckkraft 0 — ohne das Zurücksetzen verschwände der ganze Spotlight-Ring. */
  .node-spot,
  .node-spot::after,
  .spot-limbs line {
    animation: none;
  }

  /* Dieselbe Falle wie beim Kaufbar-Schein: ohne die Deckkraft mitzusetzen
     bliebe die Marke bei 0,45 stehen statt voll zu leuchten. */
  .best-buy-ring {
    animation: none;
    opacity: 1;
  }

  .node-spot {
    opacity: 1;
  }

}
</style>
