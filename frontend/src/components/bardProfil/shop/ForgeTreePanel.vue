<template>
  <div class="tree-panel" :style="stageStyle">
    <!-- shared cosmic backdrop (same starfield as Team / Planets / Skill Tree) -->
    <CosmicStageBackground />

    <!-- Alles Skalierte lebt im Viewport, der Ertrags-Sockel darunter NICHT.
         Die Bühne ragt bei Standardzoom weit über ihre Zelle hinaus; eine
         schwebende Sockelkarte läge damit über anklickbaren Knoten. -->
    <!-- Die Buehne ist groesser als ihr Fenster, also wird gezogen. Muster und
         Reihenfolge wie im Sigil-Board: `setPointerCapture` erst NACH der
         Schwelle, `@click.capture` verschluckt den Klick nach echtem Zug. -->
    <div
      ref="viewportEl"
      class="tree-viewport"
      :class="{ 'tree-viewport--dragging': isDragging }"
      @wheel.prevent="onWheel"
      @mouseleave="setTreeHover(null)"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @dragstart.prevent
      @click.capture="onClickCapture"
      @click="onBackgroundClick"
    >
    <!-- Zoom control -->
    <!-- `.stop`, damit ein Zoomschritt die Anheftung nicht abräumt: die
         Zoom-Leiste liegt im Viewport, und genau beim Anheften will der Spieler
         herauszoomen, um seine Voraussetzungen ins Bild zu holen. -->
    <div class="tree-zoom" @click.stop>
      <button class="zoom-btn" aria-label="Zoom out" @click="zoomBy(-1)">−</button>
      <div class="zoom-track">
        <div class="zoom-knob" :style="{ left: zoomKnobLeft }" />
      </div>
      <button class="zoom-btn" aria-label="Zoom in" @click="zoomBy(1)">＋</button>
    </div>

    <!-- DER RAND-KOMPASS. Zeigt an der Viewport-Kante in die Richtung des
         gemeinten Knotens, solange er ausserhalb liegt, und verschwindet in dem
         Moment, in dem die Fahrt ihn hereinholt.

         Er hängt im VIEWPORT und NICHT in der Bühne. In der Bühne trüge er
         deren `scale()` und wäre am unteren Zoomanschlag ein Drittel gross —
         ausgerechnet dann, wenn man die Übersicht sucht.

         Zwei Ebenen, und das mit Absicht: die äussere trägt die Lage (ein
         `transform`, inline, weil es sich mit `pan` ändert), die innere nur
         ihre Deckkraft. Ein einziges Element könnte nicht beides tragen — die
         Einblendung überschriebe die Lage. -->
    <div v-if="compassAt" class="tree-compass" :style="compassStyle" aria-hidden="true">
      <span class="tree-compass-arrow">
        <Icon
          :icon="FORGE_SPOTLIGHT_COMPASS_ICON"
          :width="compassIconPx"
          :height="compassIconPx"
        />
      </span>
    </div>

    <!-- Scaled tree stage -->
    <div
      class="tree-stage"
      :class="{ 'tree-stage--dragging': isDragging }"
      :style="{
        transform: stageTransform,
        '--inv-scale': (1 / totalScale).toFixed(4),
        '--forge-stage-size': `${FORGE_STAGE_SIZE}px`,
      }"
    >
      <!-- DER ZONENSCHLEIER. Hier lagen sieben KAEMME auf den Ringradien — ein
           Kamm um den Mittelpunkt ist ein Ring, nur unscharf, und sieben davon
           waren ein Zifferblatt mit weichen Zeigern. Jetzt liegt je Cluster ein
           weicher Fleck in der Farbe seiner Phase, alle auf DERSELBEN einen
           Ebene und in EINEM statischen `background`. Ein Kamm sagte „all das
           hier ist gleich weit weg"; ein Fleck sagt „all das hier gehoert
           zusammen".

           Steht VOR dem `<svg>` und liegt damit darunter: bei gleichem Rang
           (z-index 0 gegen `auto`) entscheidet die Dokumentordnung. -->
      <div class="zone-haze" :style="zoneHazeStyle" aria-hidden="true" />

      <svg
        class="tree-svg"
        :viewBox="`0 0 ${FORGE_STAGE_SIZE} ${FORGE_STAGE_SIZE}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Die WEGE zwischen zwei Zonen. Sie schalten nichts frei und liegen
             deshalb ganz unten und am blassesten: sie halten das Bild zusammen,
             ohne etwas zu behaupten. -->
        <g
          class="bridge-limbs"
          stroke="#3a2c16"
          stroke-linecap="round" stroke-linejoin="round" fill="none"
        >
          <path
            v-for="limb in bridgeLimbs" :key="limb.key + '-bridge'"
            :d="limb.d" :stroke-width="limb.width"
          />
        </g>
        <!-- Die STRUKTUR: woran ein Knoten haengt. Rechtwinklig gefuehrt und je
             Ebene duenner — die Strichstaerke sitzt deshalb am Pfad und nicht
             an der Gruppe. Der Weg selbst kommt aus `forgeEdgeRoute.ts`: nur
             achsparallele Segmente, jeder Knick 90 Grad, und keiner laeuft
             durch einen fremden Knoten. -->
        <g stroke="#4a3418" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path
            v-for="limb in structureLimbs" :key="limb.key + '-base'"
            :d="limb.d" :stroke-width="limb.width"
          />
        </g>
        <!-- Active limbs (target node has levels). Die Grunddeckkraft steht als
             KLASSE und nicht als `opacity`-Attribut — ein Präsentationsattribut
             wäre von keiner Regel mehr zu überschreiben. -->
        <g stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path
            v-for="limb in activeLimbs" :key="limb.key + '-lit'"
            :d="limb.d" :stroke-width="limb.width * FORGE_LIMB_LIT_FACTOR"
            :stroke="limb.color"
            class="limb--lit"
          />
        </g>

        <!-- Die BEDINGUNGEN des GEZEIGTEN Knotens, gestrichelt und in der Farbe
             des Zustands. Sie lagen einmal an jedem gesperrten Ziel und damit
             im frischen Spielstand fast ueberall — rund fuenfzig Linien, die
             niemand erfragt hatte. Jetzt haengen sie am Zeiger.
             Sie sind KEINE Rueckkehr der alten Spannfaeden: die zeigten aus dem
             Bild heraus, weil eine Krone auf r = 438 stand und ihr Zweig auf
             r = 221. Im Netz ist jede dieser Kanten hoechstens
             `FORGE_EDGE_MAX_PX` lang — beide Enden stehen im selben Bild. -->
        <g class="req-limbs" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path
            v-for="limb in requireLimbs" :key="limb.key + '-req'"
            :d="limb.d" :stroke-width="limb.width"
            :stroke-dasharray="FORGE_EDGE_REQ_DASH"
          />
        </g>

        <!-- Spotlight chain: star edge → … → the node being pointed at. Exists
             only while something is hovered, seven links at most. -->
        <g
          v-if="spotlightLimbs.length > 0"
          class="spot-limbs"
          stroke-linecap="round" stroke-linejoin="round" fill="none"
        >
          <path
            v-for="limb in spotlightLimbs" :key="limb.key + '-spot'"
            :d="limb.d" :stroke-width="limb.width + 1"
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
              'node-circle--pinned': pinnedId === node.id,
              // Was Voraussetzung IST, dämpft nicht — dieselbe Vorfahrt wie
              // `onChain()` im Meep-Baum. Eine Antwort, die auf gedimmten
              // Kreisen steht, sieht nach einem Fehler aus.
              'node-circle--req': spotReqs.has(node.id),
              'node-circle--dim':
                spotlightId !== null && spotlightId !== node.id && !spotReqs.has(node.id),
            },
          ]"
          :style="{ '--node-color': node.color }"
          @click.stop="handleNodeClick(node)"
          @mouseenter="setTreeHover(node.id)"
          @mouseleave="setTreeHover(null)"
        >
          <span class="node-glow" aria-hidden="true" />
          <!-- Eine Ebene je Spotlight, nicht eine je Knoten: so existiert genau
               EINE statt fünfundzwanzig, und der Ping fängt bei jedem neuen
               Ziel von vorn an, weil das Element selbst neu ist.

               Der Schlüssel setzt genau dieses Rezept fort. Kommt der Knoten
               durch eine KAMERAFAHRT ins Bild, hat der Spotlight längst
               gewechselt — das Element stünde da und hätte seinen Ping
               ausserhalb des Bildes verpulvert. Ein neuer Schlüssel lässt es
               neu entstehen, und der Ping fällt mit der Ankunft zusammen. -->
          <span
            v-if="spotlightId === node.id"
            :key="`spot-${node.id}-${arrivalTick}`"
            class="node-spot"
            aria-hidden="true"
          />
          <!-- Der VORAUSSETZUNGS-RING. Grün steht, rot fehlt — dieselben zwei
               Töne wie die Punkte des Kranzes und die Häkchen im Tooltip. Eigene
               Ebene neben `.node-spot`, aber nie gleichzeitig mit ihr: ein
               Knoten kann nicht seine eigene Voraussetzung sein. -->
          <span
            v-if="spotReqs.has(node.id)"
            class="node-req"
            :class="spotReqs.get(node.id) ? 'node-req--met' : 'node-req--open'"
            aria-hidden="true"
          />
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

          <!-- DER BEDINGUNGS-KRANZ. Er steht auf dem OBEREN Bogen, weil das
               Schloss immer unten rechts sitzt (Sektor 105°…165°) und der
               Fächer bei ±39° endet — die beiden Marken können sich bei keiner
               Knotenrichtung treffen, weil beide am Kreis kleben und nicht an
               der Bühne. -->
          <span v-if="reqWreaths.has(node.id)" class="node-wreath" aria-hidden="true">
            <i
              v-for="dot in reqWreaths.get(node.id)"
              :key="dot.key"
              class="wreath-dot"
              :class="dot.met ? 'wreath-dot--met' : 'wreath-dot--open'"
              :style="dot.style"
            />
          </span>

          <!-- Die ANHEFTUNG. Unten LINKS, also genau gegenüber dem Schloss: ein
               angehefteter Knoten ist immer auch ein gesperrter, beide Marken
               stehen damit gleichzeitig im Bild, ohne sich zu berühren. -->
          <span v-if="pinnedId === node.id" class="node-pin-badge" aria-hidden="true">
            <Icon :icon="FORGE_PIN_ICON" width="100%" height="100%" />
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

        <!-- Die Karte am Knoten. Sie hängt am Hover DIESER Spalte, nicht am
             Spotlight: ein Zeiger auf der Karte rechts darf hier keinen zweiten
             Abzug derselben Zahlen aufklappen.

             Durchgereicht wird nur die Aufklapprichtung — alles andere steht
             im Eintrag, und der ist für Baum und Liste derselbe. -->
        <ForgeNodeTooltip
          v-if="treeHoverId === node.id"
          :entry="entryOf(node)"
          :side="isTooltipBelow(node) ? 'below' : 'above'"
        />
      </div>
    </div>
    </div>

    <ForgeYieldPlinth />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { useSolarUpgradeStore, type SolarBranchId } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { FORGE_NODES } from '@/config/progression/starForge'
import {
  useForgeUpgrades,
  forgeUpgradeMayTravel,
  FORGE_EMPTY_UPGRADE_ENTRY,
} from '@/composables/ui/useForgeUpgrades'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { forgeClusterSpots, forgeEdges, forgeTreePlacements } from '@/utils/ui/forgeTreeLayout'
import { forgeRouteKey, forgeRoutes, forgeSunRoute } from '@/utils/ui/forgeEdgeRoute'
import {
  forgeCompassAt,
  forgeNodeInView,
  forgeNodeScreenPoint,
  type ForgeCamera,
} from '@/utils/ui/forgeSpotlightView'
import {
  forgeClampPan,
  forgeContentCenter,
  forgeFitScale,
  forgeNodeScreenRadius,
} from '@/utils/ui/forgeCameraBounds'
import type {
  ForgeNodeDef,
  ForgeNodeTier,
  ForgeUpgradeEntry,
  ForgeUpgradeTier,
} from '@/types'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import BlackHoleDisc from '@/components/idle/sun/BlackHoleDisc.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import ForgeNodeTooltip from './ForgeNodeTooltip.vue'
import ForgeYieldPlinth from './ForgeYieldPlinth.vue'
import {
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  COMET_PHASE_DATA,
  SHOP_SUN_MIN_DIAMETER,
  SHOP_SUN_MAX_DIAMETER,
  FORGE_STAGE_SIZE,
  FORGE_CROWN_UNLOCK_PHASE,
  FORGE_ZONE_HAZE_SCALE,
  FORGE_ZONE_HAZE_ALPHA,
  FORGE_ZONE_HAZE_LOCKED,
  FORGE_TREE_ZOOM_FLOOR,
  FORGE_TREE_DRAG_THRESHOLD_PX,
  FORGE_ICON_SIZE_GLIMMER,
  FORGE_EDGE_REQ_DASH,
  FORGE_NODE_DIAMETER,
  FORGE_LIMB_LIT_FACTOR,
  FORGE_REQ_DOT_SIZE,
  FORGE_REQ_DOT_PITCH_DEG,
  FORGE_TREE_ZOOM_MAX,
  FORGE_TREE_ZOOM_STEP,
  FORGE_TREE_ZOOM_DEFAULT,
  SOLAR_BRANCHES,
  FORGE_ICON_SIZE_ROOT,
  FORGE_ICON_SIZE_BRANCH,
  FORGE_ICON_SIZE_LEAF,
  FORGE_ICON_SIZE_WARD,
  FORGE_ICON_SIZE_PACT,
  FORGE_ICON_SIZE_CROWN,
  FORGE_ICON_SIZE_BOUGH,
  FORGE_LOCK_ICON,
  FORGE_PIN_ICON,
  FORGE_ENDLESS_SYMBOL,
  FORGE_BODY_EDGE_FRACTION,
  FORGE_SUN_EDGE_GAP,
  FORGE_SUN_FLASH_MS,
  FORGE_SPOTLIGHT_NODE_SCALE,
  FORGE_SPOTLIGHT_DIM_OPACITY,
  FORGE_SPOTLIGHT_PING_MS,
  FORGE_SPOTLIGHT_MAX_LIMBS,
  FORGE_SPOTLIGHT_PAN_DELAY_MS,
  FORGE_SPOTLIGHT_RING_INSET_PX,
  FORGE_SPOTLIGHT_COMPASS_ICON,
  FORGE_SPOTLIGHT_COMPASS_ICON_PX,
  FORGE_SPOTLIGHT_COMPASS_SIZE_PX,
  FORGE_TREE_PAN_MS,
  FORGE_BEST_BUY_LABEL,
} from '@/config/constants'

const solarStore = useSolarUpgradeStore()
const forgeStore = useStarForgeStore()
const { entryById, bestBuyId, freshIds, buyUpgrade } = useForgeUpgrades()
const {
  spotlightId,
  treeHoverId,
  listHoverId,
  pinnedId,
  setTreeHover,
  togglePin,
  clearPin,
  resetForgeSpotlight,
} = useForgeSpotlight()

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
  /** Platz auf der Bühne, in Bühnen-Pixeln — kartesisch, nicht mehr polar. */
  x: number
  y: number
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
  color: string
  statLabel: string
}

/* Der KREIS eines Knotens, als px-Zeichenkette fürs scoped CSS darunter.

   Die Durchmesser standen dort als Literale, bis die Streuung sie brauchte:
   `forgeTreeLayout.ts` entscheidet damit, ob sich zwei Knoten berühren, und
   zwei Quellen für dieselbe Grösse liefen beim ersten geänderten Ring
   auseinander. Gesetzt wird EINMAL beim Mount — kein Wert, den je ein Frame
   neu schriebe. */
const nodePx = Object.fromEntries(
  Object.entries(FORGE_NODE_DIAMETER).map(([tier, d]) => [tier, `${d}px`]),
) as Record<ForgeUpgradeTier, string>

/* Der RADIUS desselben Kreises, negativ. Der Kranz schiebt seine Punkte damit
   aus der Mitte auf den Rand hinaus: `translateY` zeigt nach oben, die Drehung
   davor setzt jeden an seinen Platz.

   Aus DERSELBEN Tabelle wie `nodePx` und nicht als eigene Zahlenreihe — zwei
   Quellen für einen Kreis liefen beim ersten geänderten Ring auseinander, und
   genau dagegen steht `nodePx` selbst schon da. */
const nodeRadiusPx = Object.fromEntries(
  Object.entries(FORGE_NODE_DIAMETER).map(([tier, d]) => [tier, `${-d / 2}px`]),
) as Record<ForgeUpgradeTier, string>

const reqDotPx = `${FORGE_REQ_DOT_SIZE}px`
const reqDotInsetPx = `${-FORGE_REQ_DOT_SIZE / 2}px`

/* Das GLYPH im Knoten hängt am `tier` und an nichts sonst. Als Tabelle statt
   als Kette von Ternären: bei sieben Ringen wäre die Kette eine Stelle, an der
   ein neuer Ring stillschweigend die falsche Grösse bekommt. Ein
   `Record<ForgeNodeTier, …>` ohne `Partial` erzwingt beim nächsten Ring einen
   Typfehler statt eines stummen Fehlverhaltens — genau das ist hier der Zweck.

   Der RADIUS stand hier einmal daneben; er ist mit der Streuung nach
   `FORGE_RING_RADIUS` gewandert, weil `utils/ui/forgeTreeLayout.ts` und seine
   Spec dieselbe Zuordnung brauchen. */
const RING_ICON_SIZE: Record<ForgeNodeTier, number> = {
  branch: FORGE_ICON_SIZE_BRANCH,
  leaf: FORGE_ICON_SIZE_LEAF,
  ward: FORGE_ICON_SIZE_WARD,
  pact: FORGE_ICON_SIZE_PACT,
  crown: FORGE_ICON_SIZE_CROWN,
  bough: FORGE_ICON_SIZE_BOUGH,
  glimmer: FORGE_ICON_SIZE_GLIMMER,
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
}))

/**
 * WO die Knoten stehen, entscheidet diese Komponente nicht.
 *
 * `forgeTreePlacements()` legt die Cluster der Karte
 * (`config/progression/starForgeNet.ts`) aus, entspannt sie gegeneinander und
 * liefert je Id einen Punkt in Bühnen-Pixeln — deterministisch aus der Id,
 * einmal gerechnet, danach gecacht. Der Baum stand vorher auf fünfzehn
 * Speichen im 24°-Raster und las sich als Zielscheibe; die Herleitung steht am
 * Kopf von `utils/ui/forgeTreeLayout.ts` und im Block „das NETZ" in
 * `constants/forge.ts`.
 *
 * Alles Nachgelagerte — `nodePos()`, die Tooltip-Seite, die Kanten, die
 * Scheinwerferkette — liest `x` und `y` von HIER und braucht von der Karte
 * nichts zu wissen.
 */
const allNodes = computed<TreeNode[]>(() => {
  const places = forgeTreePlacements()
  const fallback = { x: C, y: C }
  const roots: TreeNode[] = ROOTS.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    ...(places.get(r.id) ?? fallback),
    tier: 'root' as const,
    sizeClass: 'root' as const,
    iconSize: FORGE_ICON_SIZE_ROOT,
    parentId: null,
  }))
  const forge: TreeNode[] = FORGE_NODES.map((def) => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    color: def.color,
    ...(places.get(def.id) ?? fallback),
    tier: def.tier,
    sizeClass: def.tier,
    iconSize: RING_ICON_SIZE[def.tier],
    parentId: def.parentId,
    def,
  }))
  return [...roots, ...forge]
})

// ── Geometry ─────────────────────────────────────────────────────
function nodePos(node: TreeNode): Record<string, string> {
  return { left: `${Math.round(node.x)}px`, top: `${Math.round(node.y)}px` }
}

interface Limb {
  key: string
  /** Ein rechtwinkliger Streckenzug mit verrundeten Ecken — gerechnet in
   *  `forgeEdgeRoute.ts`, nicht hier. */
  d: string
  /** Grundstärke; innen kräftig, aussen fein (`FORGE_LIMB_WIDTH`). */
  width: number
  color: string
  targetId: string
  kind: 'parent' | 'require' | 'bridge'
}

const nodeById = computed(() => new Map(allNodes.value.map((n) => [n.id, n])))

/**
 * Jede Verbindung des Netzes — Struktur, Bedingung und Weg.
 *
 * Die Wege selbst kommen fertig aus `forgeRoutes()`: rechtwinklig, an jedem
 * Knick um 90° und an keiner Stelle durch einen fremden Knoten. Sie hängen
 * ausschliesslich an der Platzierung, sind also modulweit gecacht — dieses
 * `computed` setzt nur noch Farbe und Art dazu, und die ändern sich mit dem
 * Spielstand.
 *
 * Die Bedingungslinie ist keine Rückkehr der alten Spannfäden: die scheiterten
 * daran, dass ihre beiden Enden bei Standardzoom gar nicht gleichzeitig ins Bild
 * passten (eine Krone auf r = 438, ihr Zweig auf r = 221, sichtbar rund 484
 * Bühnen-px). Im Netz ist jede Bedingungskante höchstens `FORGE_EDGE_MAX_PX`
 * lang, und eine Spec rechnet das nach.
 */
const limbs = computed<Limb[]>(() => {
  const result: Limb[] = []
  const nodes = nodeById.value
  const routes = forgeRoutes()
  for (const edge of forgeEdges()) {
    const to = nodes.get(edge.to)
    if (!to) continue
    if (!nodes.has(edge.from)) continue
    const key = forgeRouteKey(edge.from, edge.to)
    const route = routes.get(key)
    if (!route) continue
    result.push({
      key,
      d: route.d,
      width: route.width,
      color: to.color,
      targetId: to.id,
      kind: edge.kind,
    })
  }
  // Die fünf Stummel von der Sonne zu ihren Strahlen. Sie stehen in keiner
  // Kantenliste, weil die Sonne kein Knoten ist — und sie werden hier gerechnet
  // statt gecacht, weil ihr Ansatz am Körperrand mit der Sonnenphase wandert.
  for (const root of allNodes.value) {
    if (root.tier !== 'root') continue
    const route = forgeSunRoute({ x: C, y: C }, sunEdgeR.value, root.id, { x: root.x, y: root.y })
    result.push({
      key: `sun>${root.id}`,
      d: route.d,
      width: route.width,
      color: root.color,
      targetId: root.id,
      kind: 'parent',
    })
  }
  return result
})

/** Nur die Struktur — sie trägt den Grundstrich. Bedingungen und Wege haben
 *  ihre eigene Ebene, weil sie etwas anderes sagen. */
const structureLimbs = computed(() => limbs.value.filter((l) => l.kind === 'parent'))
const bridgeLimbs = computed(() => limbs.value.filter((l) => l.kind === 'bridge'))
/**
 * Die Bedingungskanten — und zwar nur die des GEZEIGTEN Knotens.
 *
 * Hier stand `state === 'locked'`, und das war im frischen Spielstand fast
 * jeder Knoten: rund fünfzig gestrichelte Linien lagen dauerhaft über der
 * Bühne und beantworteten eine Frage, die niemand gestellt hatte. Die Auskunft
 * ist deshalb nicht gestrichen, sondern an den Zeiger gebunden — wie die
 * Scheinwerferkette darüber.
 *
 * Was im Ruhezustand bleibt, ist der Bedingungs-KRANZ am Knoten selbst
 * (`reqWreaths`): dieselbe Aussage, ohne eine einzige Linie.
 *
 * `spotlightId` deckt das Anheften mit ab — es ist `pinnedId ?? listHoverId ??
 * treeHoverId`, also genau das, worauf der Spieler gerade zeigt.
 */
const requireLimbs = computed(() =>
  limbs.value
    .filter((l) => l.kind === 'require' && l.targetId === spotlightId.value)
    // Eine Spur dünner als der Ast, an dem sie hängt: die Bedingung ist die
    // Auskunft, nicht das Gerüst.
    .map((l) => ({ ...l, width: Math.max(2, l.width - 1) })),
)

/** Der gefärbte Strich über dem Grundstrich: das Ziel ist gewachsen. Nur über
 *  STRUKTUR-Kanten — eine leuchtende Brücke behauptete einen Fortschritt, den
 *  sie nicht vermittelt. */
const activeLimbs = computed(() =>
  structureLimbs.value.filter((limb) => (entryById.value.get(limb.targetId)?.level ?? 0) > 0),
)

/**
 * Der BEDINGUNGS-KRANZ — ein Punkt am Rand je Bedingung, gefüllt für erfüllt.
 *
 * Er tritt an die Stelle der Spannfäden, und der Tausch ist keine Kosmetik: ein
 * Faden beantwortete „woher kommt das“ mit einer Linie durch das halbe Bild, die
 * bei Standardzoom gar nicht ganz hineinpasste (eine Krone steht auf r = 438,
 * ihr Zweig auf r = 221, sichtbar sind rund 484 Bühnen-px). Die Frage am
 * gesperrten Knoten ist aber „wie viel fehlt noch“ — und die beantwortet eine
 * ZAHL am Knoten selbst, ohne Zeigen und ohne Klick.
 *
 * EINE Rechnung über alle Einträge statt einer Funktion je Knoten im Template:
 * `entryById` ändert sich nur bei einem Kauf oder Phasenwechsel, nie pro Frame.
 */
interface ReqDot {
  key: string
  met: boolean
  style: Record<string, string>
}

const reqWreaths = computed<Map<string, ReqDot[]>>(() => {
  const out = new Map<string, ReqDot[]>()
  for (const entry of entryById.value.values()) {
    if (entry.state !== 'locked') continue
    // Dieselbe Weiche wie im Tooltip: gegen eine Phasen- oder Prestige-Sperre
    // hilft kein Vorgänger, und beim Prestige-Tor stünde der Kranz sogar
    // vollständig GEFÜLLT an einem Knoten, der trotzdem zu ist.
    if (entry.lockKind === 'phase' || entry.lockKind === 'prestige') continue
    // Ab ZWEI: einen Ein-Punkt-Kranz trüge sonst jeder der siebzig übrigen
    // gesperrten Knoten, und ein einzelner Punkt sagt nichts, was das Schloss
    // daneben nicht schon sagt.
    if (entry.reqs.length < 2) continue
    const count = entry.reqs.length
    out.set(
      entry.id,
      entry.reqs.map((req, i) => ({
        key: req.id,
        met: req.met,
        style: {
          '--wa': `${((i - (count - 1) / 2) * FORGE_REQ_DOT_PITCH_DEG).toFixed(1)}deg`,
        },
      })),
    )
  }
  return out
})

/**
 * Die Voraussetzungen des GEZEIGTEN Knotens — Id → erfüllt. Höchstens vier.
 *
 * Das Forge-Gegenstück zu `onChain()` im Meep-Baum („was auf der Kette liegt,
 * dämpft nichts“), aber ohne dessen Breitensuche: dort hat Rang 5 zwei eingehende
 * Kanten, hier steht die vollständige Antwort in einer Liste. `entry.reqs` führt
 * den Elternknoten als ERSTEN Eintrag — `parentId` braucht deshalb keinen zweiten
 * Weg neben den `requires`, und Bild und Tooltip nennen endlich dieselben Dinge.
 *
 * Ohne diese Menge dämpfte `--dim` ausgerechnet die Knoten mit weg, um die es
 * geht. Genau daran ist die gestrichelte Fassung gescheitert: die Linie leuchtete
 * rot und endete auf einem Kreis bei Deckkraft 0,3.
 */
const spotReqs = computed<Map<string, boolean>>(() => {
  const out = new Map<string, boolean>()
  const id = spotlightId.value
  if (id === null) return out
  const entry = entryById.value.get(id)
  if (!entry || entry.state !== 'locked') return out
  if (entry.lockKind === 'phase' || entry.lockKind === 'prestige') return out
  for (const req of entry.reqs) {
    // Der Katalog darf auf einen Strahl zeigen, der nicht als Baumknoten auf der
    // Bühne steht; ohne diese Prüfung stünde ein Ring an keinem Kreis.
    if (nodeById.value.has(req.id)) out.set(req.id, req.met)
  }
  return out
})

/** Nur die STRUKTUR-Kante je Ziel. Ein Knoten kann mehrere eingehende Kanten
 *  haben (Bedingungen, Brücken) — die Scheinwerferkette läuft aber am Baum
 *  entlang, und der Baum ist `parentId`. */
const limbByTarget = computed(
  () => new Map(structureLimbs.value.map((limb) => [limb.targetId, limb])),
)

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

// ── Zonen-Freischaltung ───────────────────────────────────────────────────────
/**
 * Der Kronen-Cluster trägt als einziger ein ZWEITES Tor (der Aufbruch). Der
 * Store beantwortet es, damit der Prestige-Zähler nicht an zwei Stellen gelesen
 * wird; die Phase daneben ist dieselbe Bedingung wie bei jeder anderen Zone.
 *
 * Was hier stand, war eine Tabelle `Ring → Freischaltphase`. Sie ist mit den
 * Ringen gefallen: eine Zone NENNT ihre Phase in der Karte, es gibt nichts mehr
 * aus den Knoten zu erschliessen.
 */
const crownsUnlocked = computed(
  () => solarStore.starPhase >= FORGE_CROWN_UNLOCK_PHASE && forgeStore.crownsUnlocked,
)

// ── Der Zonenschleier ────────────────────────────────────────────
/* Hier lagen sieben KAEMME auf den Ringradien. Ein Kamm um den Mittelpunkt ist
   ein Ring, nur unscharf — sieben davon waren ein Zifferblatt mit weichen
   Zeigern. An ihre Stelle treten FLECKEN: je Cluster ein weicher Schein in der
   Farbe seiner Phase, gesetzt auf DERSELBEN einen Ebene und mit demselben
   statischen `background`. Kein Wert pro Frame, keine Animation (Regel 2).

   Ein Kamm sagte „all das hier ist gleich weit weg". Ein Fleck sagt „all das
   hier gehört zusammen" — und das ist die Aussage, die ein Netz braucht. */
/** Steht die Sonne weit genug für diese Zone? */
function zoneOpen(phase: number): boolean {
  // Der Kronen-Cluster trägt als einziger ein ZWEITES Tor (der Aufbruch); der
  // Store beantwortet es, damit der Prestige-Zähler nicht an zwei Stellen
  // gelesen wird.
  if (phase >= FORGE_CROWN_UNLOCK_PHASE) return crownsUnlocked.value
  return solarStore.starPhase >= phase
}

/** Die Leitfarbe mit Deckkraft — als `color-mix`, damit die Farbe selbst nur an
 *  EINER Stelle steht (die Karte) und hier bloss ihr Anteil. */
function tinted(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`
}

/**
 * EIN Fleck je Cluster, alle in EINER Ebene.
 *
 * Gerechnet in Bühnen-Pixeln, nicht in Prozent: die Cluster stehen in Pixeln in
 * der Karte, und eine zweite Einheit dazwischen liefe beim ersten verschobenen
 * Cluster auseinander. Ausserhalb der Flecken bleibt alles durchsichtig —
 * deshalb entsteht nirgends eine Kante, und der Fehler der alten Vignette (die
 * quadratische Ebene wurde als Rechteck sichtbar) wiederholt sich nicht.
 *
 * Ort und Grösse kommen aus `forgeClusterSpots()`, also aus den TATSÄCHLICHEN
 * Positionen der Mitglieder. Hier standen einmal `cluster.angleDeg`,
 * `cluster.dist` und `cluster.radius` — der Kartenpunkt und eine Handzahl. Das
 * ging, solange die Mitglieder als Knäuel um genau diesen Punkt lagen; seit sie
 * ihren Ringabschnitt füllen, wäre der Fleck eine zweite Behauptung über
 * denselben Ort, und zwar die falsche von beiden.
 */
const zoneHazeStyle = computed(() => {
  const layers = forgeClusterSpots().map((spot) => {
    const r = Math.round(spot.r * FORGE_ZONE_HAZE_SCALE)
    const color = zoneOpen(spot.phase)
      ? tinted(spot.accent, FORGE_ZONE_HAZE_ALPHA)
      : FORGE_ZONE_HAZE_LOCKED
    return `radial-gradient(circle ${r}px at ${spot.x}px ${spot.y}px, ${color} 0%, transparent 100%)`
  })
  return { background: layers.join(', ') }
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

function isTooltipBelow(node: TreeNode): boolean {
  // Zur Bühnenmitte hin öffnen: was oben liegt, klappt nach unten auf, und
  // umgekehrt — so schneidet keine Karte die Panelkante, bei keinem Zoom.
  // Früher entschied das der Polarwinkel; im Netz gibt es keinen mehr, und die
  // y-Lage sagt dasselbe direkter.
  return node.y >= C
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
 * Zwei Gesten auf einer Taste, und sie überschneiden sich nicht: was KAUFBAR ist,
 * wird gekauft; was GESPERRT ist, wird angeheftet.
 *
 * Der Klick auf einen gesperrten Knoten hatte bis hierher überhaupt keine
 * Wirkung — `buyUpgrade` gab `false` zurück, und der Zeiger blieb die einzige
 * Auskunft. Wer drei Voraussetzungen quer über den Baum ablesen will, musste die
 * Maus stillhalten; die Anheftung gibt sie frei.
 *
 * `capped` und `maxed` bleiben aussen vor: ein Deckel ist keine Sperre, dort gibt
 * es keine Voraussetzungsliste zu zeigen.
 *
 * Der Kauf LÖST die Anheftung mit — er ändert genau die Bedingungen, deren Bild
 * gerade festgehalten wird.
 *
 * Kauf und Meldung liegen im Composable, damit Baum und Upgrade-Liste denselben
 * Weg nehmen. Hier bleibt nur, was der Baum eigenes tut.
 */
function handleNodeClick(node: TreeNode): void {
  if (entryOf(node).state === 'locked') {
    togglePin(node.id)
    return
  }
  clearPin()
  if (buyUpgrade(node.id)) flashSun()
}

// ── Ausschnitt: Zoom, Pan und der Boden dazwischen ───────────────────────
/*
 * **`fitScale` ist nicht mehr der Skalierer, sondern der BODEN.**
 *
 * Bis zum Umbau war `totalScale = fitScale × zoom`, und `fitScale` passte die
 * ganze Bühne in die Spalte. Das hatte eine Folge, die den Baum jahrelang klein
 * gehalten hat: jeder zusätzliche Bühnenpixel verkleinerte JEDEN Knoten
 * (gemessen — Blattglyph 16,8 → 14,8 px bei Bühne 1180). Eine grössere Bühne war
 * damit nicht bezahlbar, und deshalb standen sieben Ringe auf 1040 px.
 *
 * Jetzt ist ein Bühnenpixel bei Standardzoom ein Bildschirmpixel, man sieht
 * einen AUSSCHNITT, und `fitScale` beantwortet nur noch eine Frage: ab welchem
 * Zoom passt alles ins Bild? Das ist der untere Anschlag — „ganz
 * herausgezoomt" zeigt damit garantiert den ganzen Baum, auf jedem Fenster.
 */
const viewportEl = ref<HTMLElement | null>(null)
const zoom = ref(FORGE_TREE_ZOOM_DEFAULT)
/** Der Zoom, bei dem die Bühne gerade noch ganz in den Viewport passt. */
const fitScale = ref(FORGE_TREE_ZOOM_FLOOR)
const viewportSize = ref({ w: 0, h: 0 })

/**
 * Der Bildmittelpunkt, in Bühnen-Koordinaten.
 *
 * Bühnen-Pixel und NICHT Bildschirm-Pixel — das ist der Unterschied zum
 * Sigil-Board, und er ist bewusst: beim Zoomwechsel bleibt der betrachtete
 * Punkt dadurch von selbst stehen. In Bildschirm-Pixeln müsste jeder
 * Zoomschritt den Versatz umrechnen, und es gäbe zwei Zahlen für dieselbe
 * Stelle.
 *
 * Er startet auf der Mitte des NETZES, nicht der Bühne. Die beiden liegen
 * 32 px auseinander, und das ist gemessen: um die Bühnenmitte geklemmt bliebe
 * am oberen Anschlag ein leeres Band, das unten fehlt.
 */
const pan = ref(forgeContentCenter())

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!viewportEl.value) return
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    viewportSize.value = { w: rect.width, h: rect.height }
    // Gemessen wird der VIEWPORT, nicht das Panel: der Ertrags-Sockel darunter
    // gehört nicht zur Fläche, in der der Baum liegt.
    fitScale.value = forgeFitScale(viewportSize.value)
    zoom.value = clampZoom(zoom.value)
    clampPan()
  })
  resizeObserver.observe(viewportEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  // Der Spotlight lebt auf Modulebene und überlebte diese Komponente sonst.
  //
  // Beim TABWECHSEL greift das hier allerdings nicht: der Shop-Tab bleibt nach
  // dem ersten Öffnen gemountet (`BardProfileMenu` rendert ihn als
  // `v-if="mountedTabs.has('shop')"` plus `v-show`), dieser Haken feuert also nur
  // beim echten Abriss. Den Wechselfall räumt `ShopComponent` an der
  // Sichtbarkeit ab — dort hängt aus demselben Grund auch der Escape-Handler.
  resetForgeSpotlight()
  // Der Tabwechsel läuft schon über den `null`-Zweig des Kamerawächters
  // (`ShopComponent` ruft `resetForgeSpotlight()` an der Sichtbarkeit); dies
  // hier ist der echte Abriss.
  clearTravel()
})

const totalScale = computed(() => zoom.value)
/** Der tatsächliche untere Anschlag: nie über dem Fit, nie unter dem festen
 *  Boden — auf einem winzigen Fenster wäre der Fit sonst unlesbar klein. */
const zoomFloor = computed(() => Math.max(FORGE_TREE_ZOOM_FLOOR, Math.min(1, fitScale.value)))

function clampZoom(value: number): number {
  return Math.min(FORGE_TREE_ZOOM_MAX, Math.max(zoomFloor.value, value))
}

/**
 * Die Klemmung — HART, kein Gummiband.
 *
 * Das ist die zweite bewusste Abweichung vom Sigil-Board. Dort ist die Bühne
 * kleiner als der Viewport, das Gummiband ist die richtige Antwort auf „da ist
 * nichts mehr". Hier ist sie grösser, es gibt echten Inhalt zu erreichen, und
 * eine Sättigung machte ausgerechnet die äussersten Knoten schwammig.
 *
 * WOGEGEN geklemmt wird, steht in `utils/ui/forgeCameraBounds.ts` und nicht
 * mehr hier: gegen die gemessene Hülle der Knoten statt gegen die Bühnenkante,
 * und zusätzlich radial gegen ihre Scheibe. Ausgelagert, weil es die einzige
 * Rechnung dieser Komponente ist, die man prüfen können muss — und für eine
 * `.vue` gibt es in diesem Projekt keine Tests.
 */
function clampPan(): void {
  pan.value = forgeClampPan(pan.value, viewportSize.value, totalScale.value)
}

/**
 * Pan und Zoom in EINEM `transform`.
 *
 * Die Reihenfolge ist der ganze Trick: die Verschiebung steht VOR `scale`, also
 * in Bildschirm-Pixeln — stünde sie dahinter, würde sie mitskaliert und der
 * Zug an der Maus liefe bei jedem Zoom anders schnell.
 */
const stageTransform = computed(() => {
  const s = totalScale.value
  const dx = (FORGE_STAGE_SIZE / 2 - pan.value.x) * s
  const dy = (FORGE_STAGE_SIZE / 2 - pan.value.y) * s
  return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) translate(-50%, -50%) scale(${s})`
})

const zoomKnobLeft = computed(() => {
  const span = FORGE_TREE_ZOOM_MAX - zoomFloor.value || 1
  const t = (zoom.value - zoomFloor.value) / span
  return `${Math.round(Math.min(1, Math.max(0, t)) * 100)}%`
})

/** Ein Schritt an den Knöpfen oder an der Leiste — Fixpunkt ist die Bildmitte,
 *  dort ändert sich `pan` nicht. */
function zoomBy(direction: number): void {
  zoom.value = clampZoom(zoom.value + direction * FORGE_TREE_ZOOM_STEP)
  clampPan()
}

/**
 * Das Rad zoomt auf den Punkt UNTER dem Zeiger, nicht auf die Bildmitte.
 *
 * Bei einer Bühne von 2000 px ist das keine Feinheit: ohne den Fixpunkt
 * wanderte der betrachtete Bereich bei jedem Radschritt sichtbar weg, und man
 * müsste nach jedem Zoom neu suchen.
 *
 * Die KLEMMUNG kommt zuletzt. Umgekehrt zöge sie den Fixpunkt weg, und das Bild
 * verschöbe sich doppelt.
 */
function onWheel(event: WheelEvent): void {
  const el = viewportEl.value
  if (!el) return
  const before = clampZoom(zoom.value)
  const after = clampZoom(before + (event.deltaY < 0 ? 1 : -1) * FORGE_TREE_ZOOM_STEP)
  if (after === before) return
  const rect = el.getBoundingClientRect()
  const offX = event.clientX - rect.left - rect.width / 2
  const offY = event.clientY - rect.top - rect.height / 2
  // Der Bühnenpunkt unter dem Zeiger — vor und nach dem Schritt derselbe.
  const stageX = pan.value.x + offX / before
  const stageY = pan.value.y + offY / before
  zoom.value = after
  pan.value = { x: stageX - offX / after, y: stageY - offY / after }
  clampPan()
}

// ── Ziehen ─────────────────────────────────────────────────────
/*
 * Muster: `SigilBoardComponent.vue`. PointerEvents, und `setPointerCapture`
 * ERST nach der Schwelle — wer beim `pointerdown` captured, leitet den
 * folgenden Klick um, und der Knotenkauf stirbt. Die Zahl ist dieselbe wie dort
 * (`FORGE_TREE_DRAG_THRESHOLD_PX`), weil es dieselbe Geste ist.
 */
const isDragging = ref(false)
let didDrag = false
let dragPointerId: number | null = null
let dragStart = { x: 0, y: 0 }
let dragStartPan = { x: 0, y: 0 }

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  dragPointerId = event.pointerId
  didDrag = false
  dragStart = { x: event.clientX, y: event.clientY }
  dragStartPan = { ...pan.value }
}

function onPointerMove(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId) return
  const dx = event.clientX - dragStart.x
  const dy = event.clientY - dragStart.y
  if (!isDragging.value) {
    if (Math.hypot(dx, dy) < FORGE_TREE_DRAG_THRESHOLD_PX) return
    isDragging.value = true
    didDrag = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  const s = totalScale.value || 1
  pan.value = { x: dragStartPan.x - dx / s, y: dragStartPan.y - dy / s }
  clampPan()
}

function onPointerEnd(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId) return
  dragPointerId = null
  isDragging.value = false
  clampPan()
}

/** Nach einem echten Zug wird der Klick verschluckt — sonst könnte man einen
 *  Knoten kaufen, indem man über ihn hinwegzieht. */
function onClickCapture(event: MouseEvent): void {
  if (!didDrag) return
  event.stopPropagation()
  event.preventDefault()
  didDrag = false
}

/** Klick auf den freien Grund löst die Anheftung — aber nur, wenn es wirklich
 *  ein Klick war. */
function onBackgroundClick(): void {
  if (didDrag) return
  clearPin()
}

/**
 * Die Kamera folgt der Anheftung.
 *
 * Der Baum ist zu gross, um ihn mit einer Liste von 155 Zeilen daneben ohne
 * diese Brücke zu bedienen: wer rechts eine Zeile anheftet, will sie links
 * SEHEN. Einmalig gesetzt, die vorhandene Transition auf `.tree-stage` trägt
 * die Bewegung — keine Frame-Schleife, kein `requestAnimationFrame`.
 */
watch(pinnedId, (id) => {
  if (!id) return
  const node = nodeById.value.get(id)
  if (!node) return
  pan.value = { x: node.x, y: node.y }
  clampPan()
})

// ── Die Kamera folgt auch dem Zeiger DRÜBEN ──────────────────────────────────
/*
 * Die Anheftung war bisher der einzige Weg, einen Knoten ins Bild zu holen — und
 * sie kostet einen Klick auf einen Knoten, den man dafür erst finden muss. Der
 * Zeiger auf der Upgrade-Liste kann dasselbe leisten, und zwar für JEDE der
 * hundertfünfundfünfzig Zeilen: er sagt schon heute, welcher Knoten gemeint ist
 * (`listHoverId` → `spotlightId` → der Kreis leuchtet). Was fehlte, war der
 * Fall, dass der leuchtende Kreis gar nicht im Bild steht — bei einer Bühne von
 * 2000 px und einem Fenster von rund 700 ist das der Regelfall, und dann sieht
 * der Spieler von der ganzen Hervorhebung nichts.
 *
 * Warum die Rechnung HIER steht und nicht in `useForgeSpotlight`: sie braucht
 * `pan`, `zoom` und `viewportSize`, und die gibt es nur in dieser Komponente.
 * Das Composable hält bewusst reinen Anzeige-Zustand; ein Kamerastand gehörte
 * dort so wenig hin wie eine Scrollposition. Die Liste rechts könnte mit der
 * Antwort ohnehin nichts anfangen — sie kann links nichts bewegen. Der Baum ist
 * der Einzige, der beides hat: die Frage und die Handlung.
 */

/** Wohin gefahren werden soll, solange die Kamera noch nicht dort ist. Nur
 *  während dieses Fensters zeigt der Rand-Kompass auf das Ziel. */
const travelId = ref<string | null>(null)
/**
 * Zählt vollendete Fahrten.
 *
 * Einziger Zweck: den Ping am Zielknoten neu zu zünden. Die Ebene, die ihn
 * trägt (`.node-spot`), entsteht sonst nur beim WECHSEL des Spotlights — und
 * der hat hier längst stattgefunden, bevor die Bühne losfährt.
 */
const arrivalTick = ref(0)

let panTimer: ReturnType<typeof setTimeout> | null = null
let arrivalTimer: ReturnType<typeof setTimeout> | null = null

function clearTravel(): void {
  if (panTimer !== null) {
    clearTimeout(panTimer)
    panTimer = null
  }
  if (arrivalTimer !== null) {
    clearTimeout(arrivalTimer)
    arrivalTimer = null
  }
  travelId.value = null
}

/**
 * Der halbe Durchmesser des Knotens auf dem SCHIRM.
 *
 * Drei Faktoren, und alle drei sind nötig: seine Grössenklasse (ein Glimmer
 * misst 34, eine Wurzel 64), der Spotlight-Sprung (der gemeinte Knoten wächst um
 * 1,22 — genau er soll ja ganz zu sehen sein) und der Ringüberstand.
 */
function nodeRadiusOnScreen(node: TreeNode): number {
  return forgeNodeScreenRadius(node.sizeClass, totalScale.value)
}

function camera(): ForgeCamera {
  return { panX: pan.value.x, panY: pan.value.y, scale: totalScale.value }
}

watch(listHoverId, (id) => {
  clearTravel()
  if (id === null) return
  // Gesperrt: leuchten ja, fahren nein. Derselbe Filter wie drüben in der
  // Liste, dieselbe Funktion — und wieder im Wächter statt am Setter, weil
  // `setListHover` auch Hervorhebung, Kranz und Bedingungskette trägt.
  if (!forgeUpgradeMayTravel(entryById.value.get(id))) return
  // Eine Anheftung hält die Ansicht fest; das ist ihre ganze Aufgabe. Führe die
  // Kamera dabei mit, hübe sie genau das auf — und liefe ausserdem von dem
  // Knoten weg, der gerade leuchtet (der Pin schlägt den Zeiger im Spotlight).
  if (pinnedId.value !== null) return
  const node = nodeById.value.get(id)
  if (!node) return
  // Steht er schon im Bild, bleibt die Bühne stehen. Das Gegenstück zu
  // `block: 'nearest'` drüben — und der Grund, dass ein Schwenk über die Liste
  // nicht das halbe Panel in Bewegung setzt.
  if (forgeNodeInView(node, nodeRadiusOnScreen(node), camera(), viewportSize.value)) return

  travelId.value = id
  panTimer = setTimeout(() => {
    panTimer = null
    // Der Zeiger ist weitergezogen, während wir gewartet haben.
    if (listHoverId.value !== id) return
    pan.value = { x: node.x, y: node.y }
    clampPan()
    travelId.value = null
    // Der Ping erst NACH der Fahrt: gezündet man ihn sofort, platzte er noch
    // ausserhalb des Bildes, und von der Ankunft bliebe nichts zu sehen.
    arrivalTimer = setTimeout(() => {
      arrivalTimer = null
      if (listHoverId.value === id) arrivalTick.value += 1
    }, FORGE_TREE_PAN_MS)
  }, FORGE_SPOTLIGHT_PAN_DELAY_MS)
})

// ── Der RAND-KOMPASS ─────────────────────────────────────────────────────────
/**
 * Auf welchen Knoten der Kompass zeigt — oder auf keinen.
 *
 * ZWEI Anlässe, ein Zeiger. Der erste ist das Fahrtziel: in den 260 ms vor dem
 * Schwenk sagt er, wohin es gleich geht, und nimmt der Bewegung damit das
 * Ruckartige. Der zweite ist der ANGEHEFTETE Knoten, solange man ihn aus dem
 * Bild gezogen oder herausgezoomt hat — und der ist der eigentliche Grund, dass
 * es den Kompass gibt: eine Anheftung, die man aus den Augen verliert, war bis
 * hierher nur durch Suchen wiederzufinden.
 *
 * `null`, sobald der Knoten im Bild liegt. Der Kompass beantwortet genau eine
 * Frage, und sie stellt sich dann nicht mehr.
 */
const compassAt = computed(() => {
  const id = travelId.value ?? pinnedId.value
  if (id === null) return null
  const node = nodeById.value.get(id)
  if (!node) return null
  const cam = camera()
  const view = viewportSize.value
  if (forgeNodeInView(node, nodeRadiusOnScreen(node), cam, view)) return null
  const mark = forgeCompassAt(forgeNodeScreenPoint(node, cam, view), view)
  if (!mark) return null
  return { ...mark, color: node.color }
})

/**
 * Lage UND Drehung in EINEM `transform`, inline am Element.
 *
 * Nicht als Custom Property an den Viewport: die vererbte Variable liesse den
 * ganzen Knotenteppich darunter neu rechnen (Performance-Regel 3), und der hat
 * bei Vollausbau hundertfünfundfünfzig Kinder. Das `+ 90` dreht das nach oben
 * zeigende Glyph in die mathematische Winkelzählung.
 */
const compassStyle = computed(() => {
  const at = compassAt.value
  if (!at) return undefined
  return {
    transform:
      `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0)` +
      ` translate(-50%, -50%) rotate(${(at.angleDeg + 90).toFixed(1)}deg)`,
    '--node-color': at.color,
  }
})

/** Die Fahrtdauer und der Ringüberstand gehen per `v-bind` ins scoped CSS
 *  zurück — dort standen sie einmal als Literale, und JavaScript braucht sie
 *  jetzt beide. */
const panMs = `${FORGE_TREE_PAN_MS}ms`
const ringInset = `${-FORGE_SPOTLIGHT_RING_INSET_PX}px`
const compassIconPx = FORGE_SPOTLIGHT_COMPASS_ICON_PX
const compassSize = `${FORGE_SPOTLIGHT_COMPASS_SIZE_PX}px`

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
  /* Die Bühne ist grösser als ihr Fenster — die Hand sagt, dass man sie ziehen
     kann, bevor man es versucht. */
  cursor: grab;
  touch-action: none;
}

.tree-viewport--dragging {
  cursor: grabbing;
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
  /* Die Transition trägt Zoomschritte, die Kamerafahrt zur Anheftung UND die
     zum Zeiger auf der Upgrade-Liste. Die Dauer steht in einer Konstante, weil
     JavaScript sie kennen muss: der Ping am Ziel zündet erst, wenn sie
     abgelaufen ist. */
  transition: transform v-bind(panMs) ease;
  z-index: 1;
}

/* Beim Ziehen MUSS sie aus sein — sonst hängt der Baum der Maus um 200 ms
   hinterher, und das fühlt sich an wie ein Fehler. `will-change` steht nur
   hier und nicht dauerhaft: es gehört an Elemente, deren `transform`
   WIRKLICH gerade pro Frame geschrieben wird (Performance-Regel 12). */
.tree-stage--dragging {
  transition: none;
  will-change: transform;
}

.tree-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Die Wege zwischen zwei Zonen — am blassesten von allen. Sie schalten nichts
   frei; sie sagen nur, dass es weitergeht. */
.bridge-limbs {
  opacity: 0.5;
}

/* Die Bedingung eines gesperrten Knotens: rot, gestrichelt, und nur solange
   sie fehlt. Rot ist im Projekt durchgehend „fehlt" (`FORGE_REQ_OPEN_COLOR`) —
   dieselbe Farbe tragen die hohlen Punkte des Kranzes am Knoten selbst. */
.req-limbs {
  stroke: #cc6050;
  opacity: 0.62;
}

/* ══════════════════════════════════════════════════
   ZONENSCHLEIER — die Zonen ohne eine einzige Kreiskante
══════════════════════════════════════════════════ */
/* EINE Ebene trägt fünfundzwanzig Flecken — vorher waren es sieben Kämme auf
   den Ringradien. Der `background` ist STATISCH und wird nur bei einem
   Phasenwechsel neu gesetzt: kein Wert pro Frame, keine Animation auf
   `background` (Performance-Regel 2). `z-index: 0` gegen das `auto` des
   `<svg>`: bei gleichem Rang gewinnt die Dokumentordnung, und sie steht im
   Template davor. */
.zone-haze {
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
  /* Sie ist Deko und kein Ziel — durchlässig für den Zeiger, damit man die
     Bühne auch dort greifen kann, wo sie liegt. Gemessen: ein Zug, der in der
     Bühnenmitte begann, bewegte nichts, weil die Scheibe den `pointerdown`
     abfing. */
  pointer-events: none;
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
  width: v-bind("nodePx.root");
  height: v-bind("nodePx.root");
  border: 3px solid #2a1a08;
}

.node-circle--branch {
  width: v-bind("nodePx.branch");
  height: v-bind("nodePx.branch");
  border: 2px solid #2a1a08;
}

.node-circle--leaf {
  width: v-bind("nodePx.leaf");
  height: v-bind("nodePx.leaf");
  border: 2px solid #2a1a08;
}

/* Die zwei mittleren Ringe stehen mit 40 px eine Spur ÜBER dem Blatt und unter
   dem Zweig — sie tragen eigene Achsen, sind aber keine Hauptäste. Der farbige
   Rand ist das einzige, was sie optisch trennt: dieselben Töne wie ihr Kamm im
   Tiefenfeld und ihr Chip in der Leiste (Türkis, Blauviolett). */
.node-circle--ward {
  width: v-bind("nodePx.ward");
  height: v-bind("nodePx.ward");
  border: 2px solid #1e5a50;
}

.node-circle--pact {
  width: v-bind("nodePx.pact");
  height: v-bind("nodePx.pact");
  border: 2px solid #3a4a80;
}

/* Ring 7 ist der äusserste: der endlose. Der violette Rand ist dieselbe Farbe
   wie sein Kamm und sein Listenabschnitt — und im Projekt der Ton für
   „episch/selten" (`FORGE_RELIC_RARITY_COLOR.epic`). */
.node-circle--bough {
  width: v-bind("nodePx.bough");
  height: v-bind("nodePx.bough");
  border: 2px solid #4a2a6a;
}

/* Der GLIMMER ist der kleinste Kreis des Netzes — ein Weg, kein Ziel.
   Sein Rand ist blasser als jeder andere: eine Kette aus fünf davon soll als
   Linie lesen und nicht als Reihe von Zielen. */
.node-circle--glimmer {
  width: v-bind("nodePx.glimmer");
  height: v-bind("nodePx.glimmer");
  border: 2px solid #3a4048;
}

/* Ring 6 ist der GRÖSSTE nach dem Kern — grösser als ein Zweig, kleiner als ein
   Strahl. Fünf Knoten weit aussen, jeder nur einmal zu haben: in Bough-Grösse
   verschwänden sie am Rand einer Bühne, die `useFitScale` auf Full HD auf rund
   60 % zieht. Der goldene Rand ist derselbe Ton wie sein Kamm und sein
   Listenabschnitt. */
.node-circle--crown {
  width: v-bind("nodePx.crown");
  height: v-bind("nodePx.crown");
  border: 3px solid #6a5020;
}

.node-level {
  font-size: 8px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1;
  pointer-events: none;
}

/* ══════════════════════════════════════════════════
   BEDINGUNGS-KRANZ — was dem gesperrten Knoten noch fehlt
══════════════════════════════════════════════════ */
/* Punkte AUF dem Rand, nicht davor. Die Herleitung steht an `FORGE_REQ_DOT_SIZE`:
   `.node-circle--spot` skaliert den Kreis samt Kindern auf 1,22, der Tooltip bei
   `calc(100% + 10px)` skaliert NICHT mit — weiter aussen schlüge der Kranz beim
   Zeigen gegen seine eigene Karte.

   KEIN `--inv-scale`. Der Kranz ist Randgeometrie und skaliert mit dem Kreis, wie
   das Schloss (in %) und der Stufen-Chip. Gegengerechnet wird im Projekt nur, was
   frei SCHWEBT (Tooltip, Best-Buy-Beschriftung); ein gegenskalierter Punkt behielte
   seinen Bahnradius in Bühnen-px und liefe bei kleinem Zoom über den Rand hinaus.

   Beide Zustände sind STATISCH — hier läuft nie ein Keyframe. */
.node-wreath {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.wreath-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: v-bind(reqDotPx);
  height: v-bind(reqDotPx);
  margin: v-bind(reqDotInsetPx) 0 0 v-bind(reqDotInsetPx);
  border-radius: 50%;
  /* Erst drehen, dann auf den Radius hinausschieben. Ein Kreis ist
     drehsymmetrisch — die Drehung des Punktes selbst kostet nichts. */
  transform: rotate(var(--wa)) translateY(var(--wr, -21px));
}

/* Der Bahnradius kommt aus der EBENE, nicht aus einer Variablen am Knoten: eine
   geerbte Custom Property an fünfundneunzig Containern wäre genau das, wogegen
   Performance-Regel 3 steht. Sie ändert sich ausserdem nie — anders als ein
   Frame-Wert ist sie einmal gesetzt und dann Geometrie.

   Heute tragen nur Kronen und Boughs `requires`; die übrigen fünf Regeln stehen
   für den nächsten Ring, der welche bekommt, und kosten nichts. */
.node-circle--root .wreath-dot {
  --wr: v-bind("nodeRadiusPx.root");
}
.node-circle--branch .wreath-dot {
  --wr: v-bind("nodeRadiusPx.branch");
}
.node-circle--leaf .wreath-dot {
  --wr: v-bind("nodeRadiusPx.leaf");
}
.node-circle--ward .wreath-dot {
  --wr: v-bind("nodeRadiusPx.ward");
}
.node-circle--pact .wreath-dot {
  --wr: v-bind("nodeRadiusPx.pact");
}
.node-circle--crown .wreath-dot {
  --wr: v-bind("nodeRadiusPx.crown");
}
.node-circle--bough .wreath-dot {
  --wr: v-bind("nodeRadiusPx.bough");
}

/* Gefüllt = erfüllt. Der dunkle Rand hält den Punkt bei kleinem Zoom vom
   Kreisrand getrennt — statisch, also erlaubt. */
.wreath-dot--met {
  background: #52b830;
  border: 1px solid #0d0b05;
}

/* Hohl = offen. Dunkel gefüllt statt durchsichtig: auf dem Rand eines gesperrten
   Knotens (#4a3010) verschwände ein transparenter Punkt, und genau dort steht er
   immer. */
.wreath-dot--open {
  background: #241708;
  border: 1.5px solid #cc6050;
}

/* Die ANHEFTUNGS-Marke. Gespiegelte `.fc-lock-badge` (rpg-theme.css) — dieselben
   Maße, andere Seite, und die Leitfarbe der Forge statt des matten Schlossgolds.
   Unten links, weil das Schloss unten rechts steht und beide gleichzeitig
   sichtbar sein müssen. */
.node-pin-badge {
  position: absolute;
  left: -3%;
  bottom: -3%;
  width: 44%;
  height: 44%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #16110a;
  border: 1.5px solid #5c3310;
  color: #e8c040;
  pointer-events: none;
}

.node-pin-badge svg {
  width: 66%;
  height: 66%;
  display: block;
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

/* Der Schein eines kaufbaren Knotens steht STILL.
 *
 * Er hat einmal geatmet, und bei 95 Knoten ging das noch. Im Netz sind es 155,
 * im Spaetspiel sind davon bis zu 90 gleichzeitig kaufbar — und 90 laufende
 * Keyframes waren im Orbit schon einmal die gemessene Ursache eines Rucklers
 * (`docs/performance.md`, Regel: „und wenn es viele sind?").
 *
 * Der Verzicht kostet nichts, er gewinnt sogar: was ueberall blinkt, hebt
 * nichts hervor. Es atmen nur noch die zwei Zeichen, die WIRKLICH etwas
 * auszeichnen — der frisch aufgegangene Knoten und der eine Best-Buy-Ring. */
.node-circle--affordable .node-glow {
  box-shadow: 0 0 22px rgba(232, 200, 80, 0.85);
  opacity: 0.72;
}

/* Frisch aufgegangen: DAS atmet, und es sind nie viele. */
.node-circle--fresh .node-glow {
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
  inset: v-bind(ringInset);
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

/* Der VORAUSSETZUNGS-RING. Gleiche Ebene und gleicher `inset` wie `.node-spot` —
   beide sagen „dieser Kreis ist gerade gemeint", nur in verschiedener Rolle.

   Er ATMET NICHT, und das ist kein Sparen: atmeten Ziel und Voraussetzungen im
   selben Takt, wäre nicht mehr erkennbar, WORAUF der Spieler zeigt — die einzige
   Aufgabe des Spotlights. „Eines bewegt sich, drei stehen" ist die stärkste
   verfügbare Rangordnung und kostet nichts. Auch kein Ping: der heisst „hier bist
   du gerade angekommen", und vier gleichzeitige hiessen gar nichts.

   Der Schein ist statisch und damit von Regel 2 ausdrücklich gedeckt. */
.node-req {
  position: absolute;
  inset: v-bind(ringInset);
  border-radius: 50%;
  border: 2px solid #cc6050;
  pointer-events: none;
  z-index: -1;
}

/* ══ DER RAND-KOMPASS ══════════════════════════════════════════════════════
   Er liegt über der Bühne (z-index 1) und unter der Zoom-Leiste (20): die
   Leiste ist bedienbar, der Kompass nur Auskunft, und ausweichen tut er ihr
   schon in der Rechnung.

   Sein Schein ist STATISCH und damit von Regel 2 gedeckt — animiert wird
   allein die Deckkraft der inneren Ebene, und die genau einmal. Ein
   Dauerläufer wäre hier falsch: der Zeiger steht selten und kurz im Bild, und
   was blinkt, während man ohnehin schon hinsieht, ist nur noch Lärm. */
.tree-compass {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  /* `border-box`, damit die Konstante die ÄUSSERE Kante meint — die Rechnung,
     die ihn von der Zoom-Leiste wegschiebt, misst genau die. */
  box-sizing: border-box;
  width: v-bind(compassSize);
  height: v-bind(compassSize);
  border-radius: 4px;
  background: #16110a;
  border: 1px solid #4a3010;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.7);
  color: var(--node-color, #e8c040);
  pointer-events: none;
}

.tree-compass-arrow {
  display: flex;
  opacity: 0;
  animation: tree-compass-in 180ms ease-out 1 forwards;
}

@keyframes tree-compass-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.node-req--met {
  border-color: #52b830;
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.55);
}

.node-req--open {
  border-color: #cc6050;
  box-shadow: 0 0 14px rgba(204, 96, 80, 0.5);
}

/* Und ihr Schein hört trotzdem auf zu atmen — genau wie bei `--dim`.
   Ein Voraussetzungsknoten ist MEISTENS kaufbar (das ist ja der Punkt), und ohne
   diese Regel liefe für jeden von ihnen wieder `node-glow-breathe`. Bis zu vier
   zusätzliche Dauerläufer, ohne dass ein einziger Ring animiert wäre — die
   Zusage über `.node-circle--dim .node-glow` bliebe nur noch auf dem Papier. */
.node-circle--req .node-glow {
  animation: none;
  opacity: 1;
}

/* ANGEHEFTET heisst: die Ansicht steht still — und der Ring auch. Im
   angehefteten Zustand läuft im ganzen Knotenfeld keine einzige Animation. */
.node-circle--pinned .node-spot {
  animation: none;
  opacity: 1;
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
.spot-limbs path {
  opacity: 0.95;
  stroke-dasharray: 14 10;
  animation: forge-spot-flow 0.9s linear infinite;
}

@keyframes forge-spot-flow {
  to { stroke-dashoffset: -24; }
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
  .spot-limbs path {
    animation: none;
  }

  /* Und dieselbe Falle beim Kompass: seine Einblendung startet bei Deckkraft 0
     und trägt `forwards` — bliebe sie nur abgeschaltet, wäre der Zeiger
     unsichtbar statt ruhig. */
  .tree-compass-arrow {
    animation: none;
    opacity: 1;
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
