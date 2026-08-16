<template>
  <div class="tree-panel" :style="stageStyle">
    <!-- shared cosmic backdrop (same starfield as Team / Planets / Skill Tree) -->
    <CosmicStageBackground />

    <!-- Suche, Ringfilter und Sammelkauf — IM FLUSS über dem Viewport, nicht
         schwebend darauf. Ein Knoten unter einer schwebenden Leiste liefe
         weiter, wäre aber nicht mehr anklickbar; derselbe Grund, aus dem der
         Ertrags-Sockel unten im Fluss steht. `fitScale` misst den Viewport und
         zieht deshalb ohne Zutun mit. -->
    <ForgeToolbar />

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
      <svg
        class="tree-svg"
        :viewBox="`0 0 ${FORGE_STAGE_SIZE} ${FORGE_STAGE_SIZE}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Phase-band rings. Ein gewählter Chip färbt SEIN Band in der Chipfarbe
             und schickt die drei anderen zurück — damit trägt die Ebene ihre
             Auswahl als Ganzes, nicht nur Knoten für Knoten. Ein bloßes Suchwort
             tut das nicht (`ringSifted`): es sagt nichts über Ringe aus. -->
        <circle
          :cx="C" :cy="C" :r="FORGE_RING_ROOT_R" fill="none" stroke-width="1.5"
          :stroke="ringStroke('root', true, '#3a2a12')"
          :opacity="ringOpacity('root', true)"
        />
        <circle
          :cx="C" :cy="C" :r="FORGE_RING_BRANCH_R" fill="none"
          :stroke="ringStroke('branch', branchesUnlocked, '#4a6a2a')"
          stroke-width="1.5" stroke-dasharray="5 5"
          :opacity="ringOpacity('branch', branchesUnlocked)"
        />
        <circle
          :cx="C" :cy="C" :r="FORGE_RING_LEAF_R" fill="none"
          :stroke="ringStroke('leaf', leavesUnlocked, '#4a6a2a')"
          stroke-width="1.5" stroke-dasharray="4 7"
          :opacity="ringOpacity('leaf', leavesUnlocked)"
        />
        <!-- Ring 4 trägt Violett statt Grün: er ist der einzige ohne Ende, und
             Violett steht im Projekt für „episch". -->
        <circle
          :cx="C" :cy="C" :r="FORGE_RING_BOUGH_R" fill="none"
          :stroke="ringStroke('bough', boughsUnlocked, '#5a3a7a')"
          stroke-width="1.5" stroke-dasharray="3 9"
          :opacity="ringOpacity('bough', boughsUnlocked)"
        />
        <!-- Ring 5 schliesst den Kreis zurück zum Gold des Kerns — und trägt
             als einziger eine DURCHGEZOGENE Linie. Die Strichelung wurde nach
             aussen hin immer lückenhafter (5-5 · 4-7 · 3-9); die Krone kehrt das
             um, weil sie kein „noch mehr davon" ist, sondern ein Abschluss. -->
        <circle
          :cx="C" :cy="C" :r="FORGE_RING_CROWN_R" fill="none"
          :stroke="ringStroke('crown', crownsUnlocked, '#6a5020')"
          stroke-width="1.5"
          :opacity="ringOpacity('crown', crownsUnlocked)"
        />

        <!-- Limbs: sun → root, root → branch, branch → leaf (dim base).
             Ein Ast, der zu einem ausgefilterten Knoten führt, tritt mit ihm
             zurück — sonst bliebe ein helles Astgerüst um dunkle Kreise stehen
             und zeichnete weiter genau die Form, die gerade nicht gemeint ist. -->
        <g stroke="#4a3418" stroke-width="4" stroke-linecap="round" fill="none">
          <line
            v-for="limb in limbs" :key="limb.key + '-base'"
            :x1="limb.x1" :y1="limb.y1" :x2="limb.x2" :y2="limb.y2"
            :class="{ 'limb--sifted': siftedIds.has(limb.targetId) }"
          />
        </g>
        <!-- Active limbs (target node has levels). Die Grunddeckkraft steht als
             KLASSE und nicht mehr als `opacity`-Attribut: nur so kann
             `.limb--sifted` sie überschreiben, ohne sich darauf zu verlassen,
             dass CSS ein Präsentationsattribut schlägt. -->
        <g stroke-width="2.5" stroke-linecap="round" fill="none">
          <line
            v-for="limb in activeLimbs" :key="limb.key + '-lit'"
            :x1="limb.x1" :y1="limb.y1" :x2="limb.x2" :y2="limb.y2"
            :stroke="limb.color"
            class="limb--lit"
            :class="{ 'limb--sifted': siftedIds.has(limb.targetId) }"
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

      <!-- Ring labels — sie tragen die Auswahl mit: die Beschriftung einer nicht
           gewählten Ebene ist genauso wenig gemeint wie ihr Band. -->
      <div
        class="ring-label ring-label--root"
        :class="{ 'ring-label--sifted': ringSifted('root') }"
        :style="ringLabelStyle(FORGE_RING_ROOT_R)"
      >
        Phase 1–2
      </div>
      <div
        class="ring-label"
        :class="[
          branchesUnlocked ? 'ring-label--now' : 'ring-label--locked',
          { 'ring-label--sifted': ringSifted('branch') },
        ]"
        :style="ringLabelStyle(FORGE_RING_BRANCH_R)"
      >
        {{ branchRingLabel }}
      </div>
      <div
        class="ring-label"
        :class="[
          leavesUnlocked ? 'ring-label--now' : 'ring-label--locked',
          { 'ring-label--sifted': ringSifted('leaf') },
        ]"
        :style="ringLabelStyle(FORGE_RING_LEAF_R)"
      >
        {{ leafRingLabel }}
      </div>
      <div
        class="ring-label"
        :class="[
          boughsUnlocked ? 'ring-label--endless' : 'ring-label--locked',
          { 'ring-label--sifted': ringSifted('bough') },
        ]"
        :style="ringLabelStyle(FORGE_RING_BOUGH_R)"
      >
        {{ boughRingLabel }}
      </div>
      <div
        class="ring-label"
        :class="[
          crownsUnlocked ? 'ring-label--crown' : 'ring-label--locked',
          { 'ring-label--sifted': ringSifted('crown') },
        ]"
        :style="ringLabelStyle(FORGE_RING_CROWN_R)"
      >
        {{ crownRingLabel }}
      </div>

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
        :class="{ 'tree-node--spot': spotlightId === node.id }"
        :style="nodePos(node)"
      >
        <!-- `--sifted` greift ausdrücklich NICHT, solange der Zeiger auf dem
             Knoten steht. Das ist der ganze Mechanismus hinter „dunkel, aber
             bedienbar": ein Hover setzt `treeHoverId` und damit `spotlightId`,
             die Klasse fällt im selben Frame weg, und der bestehende
             Spotlight-Pfad hebt den Knoten heraus. Kein zweiter Hover-Fall,
             keine zweite Zahl für „wie hell beim Zeigen", keine
             Spezifitätskette gegen `.node-circle.node-circle--spot`. -->
        <div
          class="node-circle"
          :class="[
            `node-circle--${node.sizeClass}`,
            `node-circle--${entryOf(node).state}`,
            {
              'node-circle--spot': spotlightId === node.id,
              'node-circle--dim': spotlightId !== null && spotlightId !== node.id,
              'node-circle--sifted': siftedIds.has(node.id) && spotlightId !== node.id,
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
          <Icon :icon="node.icon" :width="node.iconSize" :height="node.iconSize" :style="{ color: node.color }" />
          <span v-if="entryOf(node).level > 0 || entryOf(node).state !== 'locked'" class="node-level">
            {{ levelChip(entryOf(node)) }}
          </span>
        </div>

        <!-- Die BEST-BUY-Marke. Genau EINE im ganzen Bild, und sie animiert nur
             Deckkraft auf einer Ebene mit statischem Schein (Performance-Regel
             2/11). „Günstigster kaufbarer" und nicht „stärkster": die Wirkungen
             des Baums stehen in Prozent, HP, Sekunden und Chimes nebeneinander
             und sind nicht vergleichbar — der Preis ist die einzige Zahl, die
             alle teilen.

             Ist ihr Knoten weggefiltert, verschwindet sie mit ihm: eine grün
             atmende Marke an einem fast unsichtbaren Kreis wäre der lauteste
             Punkt im Bild und zeigte auf genau das, was der Spieler gerade
             beiseitegeschoben hat. -->
        <div
          v-if="bestBuyId === node.id && !siftedIds.has(node.id)"
          class="best-buy"
          aria-hidden="true"
        >
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
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { FORGE_NODES } from '@/config/progression/starForge'
import { formatNumber } from '@/config/ui/numberFormat'
import {
  useForgeUpgrades,
  FORGE_EMPTY_UPGRADE_ENTRY,
} from '@/composables/ui/useForgeUpgrades'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { useForgeFilter } from '@/composables/ui/useForgeFilter'
import type { ForgeNodeDef, ForgeNodeTier, ForgeUpgradeEntry, ForgeUpgradeTier } from '@/types'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import BlackHoleDisc from '@/components/idle/sun/BlackHoleDisc.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import ForgeYieldPlinth from './ForgeYieldPlinth.vue'
import ForgeToolbar from './ForgeToolbar.vue'
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
  FORGE_RING_BOUGH_R,
  FORGE_RING_CROWN_R,
  FORGE_TREE_ZOOM_MIN,
  FORGE_TREE_ZOOM_MAX,
  FORGE_TREE_ZOOM_STEP,
  FORGE_TREE_ZOOM_DEFAULT,
  FORGE_ROOT_ANGLES_DEG,
  SOLAR_BRANCHES,
  FORGE_ICON_SIZE_ROOT,
  FORGE_ICON_SIZE_BRANCH,
  FORGE_ICON_SIZE_LEAF,
  FORGE_ICON_SIZE_BOUGH,
  FORGE_ICON_SIZE_CROWN,
  FORGE_CROWN_RING_LABEL_LOCKED,
  FORGE_CROWN_RING_LABEL_OPEN,
  FORGE_ENDLESS_SYMBOL,
  SUN_PHASE_DISPLAY_OFFSET,
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
  FORGE_SIFT_DIM_OPACITY,
  FORGE_SIFT_SATURATE,
  FORGE_SIFT_LIMB_OPACITY,
  FORGE_SIFT_RING_OPACITY,
} from '@/config/constants'

const solarStore = useSolarUpgradeStore()
const forgeStore = useStarForgeStore()
const playerStore = usePlayerStore()
const { entryById, bestBuyId, buyUpgrade } = useForgeUpgrades()
const { spotlightId, treeHoverId, setTreeHover, resetForgeSpotlight } = useForgeSpotlight()
const { activeTier, hasFilter, matchesForgeFilter, resetForgeFilter } = useForgeFilter()

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
   als Kette von Ternären: mit vier Ringen wäre die Kette eine Stelle, an der
   ein neuer Ring stillschweigend auf dem falschen Radius landet. */
const RING_RADIUS: Record<ForgeNodeTier, number> = {
  branch: FORGE_RING_BRANCH_R,
  leaf: FORGE_RING_LEAF_R,
  bough: FORGE_RING_BOUGH_R,
  crown: FORGE_RING_CROWN_R,
}
const RING_ICON_SIZE: Record<ForgeNodeTier, number> = {
  branch: FORGE_ICON_SIZE_BRANCH,
  leaf: FORGE_ICON_SIZE_LEAF,
  bough: FORGE_ICON_SIZE_BOUGH,
  crown: FORGE_ICON_SIZE_CROWN,
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

// ── Was der Ringfilter durchlässt ────────────────────────────────────────────
/**
 * Baum und Liste zeigen denselben Bestand — dann muss die Leiste über dem Baum
 * auch den Baum sieben und nicht nur die Spalte daneben. Ein Klick auf „Leaves"
 * hat hier bislang nichts bewirkt, obwohl der Ring, den der Chip meint, direkt
 * darunter liegt.
 *
 * Ein SET und nicht ein Aufruf je Knoten im Template: Knoten, Äste, Ringbänder
 * und die Best-Buy-Marke fragen alle dieselbe Frage, und `matchesForgeFilter`
 * ginge sonst gut hundertmal je Render über denselben Eintrag. Im `computed`
 * gelesen sind `activeTier` und `searchQuery` voll reaktiv, obwohl die Funktion
 * selbst kein Ref ist.
 */
const siftedIds = computed<Set<string>>(() => {
  if (!hasFilter.value) return new Set()
  return new Set(
    allNodes.value.filter((node) => !matchesForgeFilter(entryOf(node))).map((node) => node.id),
  )
})

/**
 * Ein RING ist gewählt — nicht bloß irgendein Filter. Ein Suchwort sagt nichts
 * über Ebenen aus und darf die Bänder deshalb nicht umfärben; nur die Chips
 * tun das.
 */
function ringSifted(tier: ForgeUpgradeTier): boolean {
  return activeTier.value !== 'all' && activeTier.value !== tier
}

/**
 * Die Leitfarbe des gewählten Rings kommt aus derselben Tabelle, aus der
 * `ForgeToolbar` seine Chips färbt — sonst stünde die Ebene oben in einem Ton
 * und unten in einem zweiten. Die gedeckten Ruhefarben bleiben die des Baums:
 * sie sagen „offen / gesperrt", nicht „gewählt".
 */
const RING_ACCENT: Record<ForgeUpgradeTier, string> = Object.fromEntries(
  FORGE_UPGRADE_GROUPS.map((group) => [group.tier, group.accent]),
) as Record<ForgeUpgradeTier, string>

function ringStroke(tier: ForgeUpgradeTier, unlocked: boolean, restColor: string): string {
  if (activeTier.value === tier) return RING_ACCENT[tier]
  return unlocked ? restColor : '#2a1a08'
}

/**
 * Ausgerechnet und nicht per CSS-Klasse überschrieben: ein `opacity` am
 * `<circle>` ist ein PRÄSENTATIONSATTRIBUT, und dass CSS es schlägt, ist zwar
 * richtig, aber nichts, worauf der nächste Leser von selbst kommt. Ein Wert,
 * eine Stelle.
 *
 * Der gewählte Ring geht auf VOLL — 0,6 ist die Ruhelage eines offenen Rings,
 * und die reichte nicht, um ihn neben drei zurückgetretenen als „gewählt" zu
 * lesen.
 */
function ringOpacity(tier: ForgeUpgradeTier, unlocked: boolean): number {
  if (activeTier.value === tier) return 1
  if (ringSifted(tier)) return FORGE_SIFT_RING_OPACITY
  // Der Wurzelring ist immer offen und stand deshalb noch nie gedämpft da.
  if (tier === 'root') return 1
  return unlocked ? 0.6 : 0.9
}

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
const siftDimOpacity = String(FORGE_SIFT_DIM_OPACITY)
const siftSaturate = String(FORGE_SIFT_SATURATE)
const siftLimbOpacity = String(FORGE_SIFT_LIMB_OPACITY)
const siftRingOpacity = String(FORGE_SIFT_RING_OPACITY)

function ringLabelStyle(r: number): Record<string, string> {
  return {
    left: `${C}px`,
    top: `${C}px`,
    transform: `translate(-50%, ${-(r + 3)}px)`,
  }
}

// ── Ring unlock state ─────────────────────────────────────────────────────────
/**
 * Die Beschriftung eines Rings kommt aus den KNOTEN, die auf ihm liegen, nicht
 * aus einer festen Zahl. Seit der dritte Zweig je Wurzel eine Phase später
 * aufgeht, trägt Ring 2 zwei Freischaltphasen — ein hartes „Phase 3+ · open"
 * wäre schlicht falsch, sobald die Hälfte des Rings noch zu ist.
 *
 * Der Ring gilt als offen, sobald sein ERSTER Knoten kaufbar wird; solange noch
 * ein späterer aussteht, nennt das Label auch dessen Phase.
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

/**
 * Der NAME der Phase, nicht ihre Nummer. Die Karten in der Liste sagen „Unlocks
 * at Zenith" (`lockedFor` in useForgeUpgrades), und hier stand bislang eine
 * Nummer, die um eins danebenlag: gerechnet wurde `phase + 1`, während der Rest
 * des Spiels `SUN_PHASE_DISPLAY_OFFSET` (2) verwendet — der Komet zählt als
 * Anzeigephase 1. Mit dem Namen kann die Rechnung gar nicht erst auseinander-
 * laufen, und Ring und Karte sprechen dieselbe Sprache.
 */
function phaseName(phase: number): string {
  return STAR_PHASE_DATA[phase]?.name ?? `Phase ${phase + SUN_PHASE_DISPLAY_OFFSET}`
}

function ringLabelFor(tier: ForgeNodeTier): string {
  const span = ringPhases.value[tier]
  if (!span) return ''
  if (solarStore.starPhase < span.min) return `${phaseName(span.min)} → locked`
  if (solarStore.starPhase < span.max) {
    return `${phaseName(span.min)} · ${phaseName(span.max)} → locked`
  }
  return `${phaseName(span.max)} · open`
}

const branchesUnlocked = computed(
  () => solarStore.starPhase >= (ringPhases.value.branch?.min ?? Infinity),
)
const leavesUnlocked = computed(
  () => solarStore.starPhase >= (ringPhases.value.leaf?.min ?? Infinity),
)
const boughsUnlocked = computed(
  () => solarStore.starPhase >= (ringPhases.value.bough?.min ?? Infinity),
)
/**
 * Ring 5 hängt als einziger NICHT an der Sonne, sondern am Aufbruch — die
 * Sonnenrampe endet mit Ring 4. Der Store beantwortet das, damit der
 * Prestige-Zähler nicht an zwei Stellen gelesen wird.
 */
const crownsUnlocked = computed(() => forgeStore.crownsUnlocked)

const branchRingLabel = computed(() => ringLabelFor('branch'))
const leafRingLabel = computed(() => ringLabelFor('leaf'))
const boughRingLabel = computed(() => ringLabelFor('bough'))
/**
 * Die Beschriftung von Ring 5 nennt seine eigene Bedingung, nicht eine
 * Sonnenphase. `ringLabelFor` liest `ringPhases` — für die Krone stünde dort
 * dieselbe Phase wie für die Boughs, und das Etikett behauptete, der Ring sei
 * offen, während er es nicht ist.
 */
const crownRingLabel = computed(() =>
  crownsUnlocked.value ? FORGE_CROWN_RING_LABEL_OPEN : FORGE_CROWN_RING_LABEL_LOCKED,
)

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
  // Spotlight und Filter leben auf Modulebene und überlebten diese Komponente
  // sonst — ein Suchwort von letzter Sitzung zeigte beim nächsten Öffnen eine
  // fast leere Liste, ohne dass ersichtlich wäre, warum.
  resetForgeSpotlight()
  resetForgeFilter()
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
      '--sun-edge': COMET_PHASE_DATA.edge,
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
    // --sun-edge färbt ausschließlich die HP-Zahl auf der Sonne. Bei den
    // Plasmaphasen ist der dunkle Saum darauf gut lesbar — auf dem schwarzen
    // Ereignishorizont der Endphase verschwände er, dort trägt der helle
    // Scheibenton.
    '--sun-edge': isCollapsed.value ? s.phasePrimary : s.edge,
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

.ring-label--endless {
  color: rgba(201, 160, 255, 0.8);
  background: #150c1a;
}

/* Ring 5 kehrt zum Gold des Kerns zurück — der äusserste Ring ist das, was aus
   dem innersten geworden ist. Statischer Zustand, keine laufende Animation. */
.ring-label--crown {
  color: rgba(255, 215, 106, 0.85);
  background: #1a1408;
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

/* Kaufblitz: ein heller Schleier, der nur seine Deckkraft ändert. Ein
   `filter: brightness()` auf dem Wrapper hätte für seine 0,45 s Sonne,
   Phasenvorschau und HP-Zahl gemeinsam auf eine eigene Rendering-Surface
   gezwungen — dieselbe Aufhellung leistet die Ebene ohne Neurasterung
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

/* Ring 4 sitzt zwischen Zweig und Blatt: er ist kein Beiwerk wie ein Blatt,
   aber auch kein Hauptast. Der violette Rand ist das einzige, was ihn optisch
   vom Rest trennt — dieselbe Farbe wie sein Ring und sein Listenabschnitt. */
.node-circle--bough {
  width: 42px;
  height: 42px;
  border: 2px solid #4a2a6a;
}

/* Ring 5 ist der GRÖSSTE nach dem Kern — grösser als ein Zweig, kleiner als ein
   Strahl. Fünf Knoten auf dem weitesten Ring, jeder nur einmal zu haben: in
   Bough-Grösse verschwänden sie am Rand einer Bühne, die `useFitScale` auf
   Full HD auf rund 60 % zieht. Der goldene Rand ist derselbe Ton wie sein Ring
   und sein Listenabschnitt. */
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
/* Steht NACH `--dim` und gewinnt damit über die Quellreihenfolge, wenn beides
   zutrifft: „weggefiltert" wiegt schwerer als „ich zeige woandershin". Der
   Abstand der beiden Zahlen (0,14 gegen 0,3) trägt genau diesen Unterschied und
   ist an der Konstante hergeleitet.

   `saturate()` ist ein STATISCHER Zustand und steht bewusst nicht in der
   Transition von `.node-circle` — ein `filter` über Zeit rasterte bis zu
   fünfundvierzig Kreise samt Schatten in jedem Frame neu (Performance-Regel 2).
   Es springt daher hart, während die Deckkraft weich läuft; sichtbar ist davon
   nichts, weil bei 0,14 ohnehin kaum Farbe übrig ist. */
.node-circle--sifted {
  opacity: v-bind(siftDimOpacity);
  filter: saturate(v-bind(siftSaturate));
  transition-duration: 0.12s;
}

/* Der Schein geht ganz aus, nicht nur zurück. Bei gewähltem Ring stehen damit
   im ganzen Knotenfeld nur noch die Kreise DIESES Rings mit einer laufenden
   Animation da — derselbe Nebengewinn wie beim Spotlight-Dim, nur für weit
   mehr Knoten. */
.node-circle--sifted .node-glow {
  animation: none;
  opacity: 0;
}

/* Äste. Die Grunddeckkraft der gewachsenen Verbindungen lag bis hierher als
   `opacity`-Attribut am `<line>`; als Klasse kann `--sifted` sie überschreiben,
   ohne auf „CSS schlägt Präsentationsattribut" zu bauen. */
.limb--lit {
  opacity: 0.55;
}

.limb--sifted {
  opacity: v-bind(siftLimbOpacity);
}

.ring-label--sifted {
  opacity: v-bind(siftRingOpacity);
}

/* Die Treffer-Marke zu diesem Sieb steht in `ForgeToolbar` — im FLUSS über dem
   Viewport und nicht darin: hier sind beide freien Ecken vergeben (Zoomkasten
   rechts, Dev-Knopf links), und eine dritte schwebende Karte machte den Knoten
   unter sich unklickbar. */

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
