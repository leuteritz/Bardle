<template>
  <div class="tree-panel" :style="stageStyle">
    <!-- shared cosmic backdrop (same starfield as Team / Planets / Skill Tree) -->
    <CosmicStageBackground />

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
    <!-- DIE ZOOM-LEISTE unten rechts. Ihre Sperrfläche steht als
         `FORGE_VIEWPORT_KEEPOUTS.bottomRight` und ist aus ihrem Mass abgeleitet.

         `.stop` liegt am Dock und nicht an der Leiste: es räumt sonst die
         Anheftung ab, und genau beim Anheften will der Spieler herauszoomen
         oder zurückfahren, um die Voraussetzungen ins Bild zu holen. -->
    <div class="tree-camera-dock" @click.stop>
      <div class="tree-zoom">
        <button class="zoom-btn" aria-label="Zoom out" @click="zoomBy(-1)">−</button>
        <div class="zoom-track">
          <div class="zoom-knob" :style="{ left: zoomKnobLeft }" />
        </div>
        <button class="zoom-btn" aria-label="Zoom in" @click="zoomBy(1)">＋</button>
      </div>
    </div>

    <!-- DIE KÜRZEL-ZEILE unten links, dieselbe Darstellung wie die Leiste über
         dem Command Panel. Sie leuchtet, solange die Kamera nicht mittig steht —
         das ist die Auskunft, für die hier einmal ein Zifferblatt stand.

         Als Zeile angelegt, damit ein zweites Kürzel danebenpasst; `.stop` aus
         demselben Grund wie am Dock. -->
    <div
      class="tree-key-hints"
      :class="{ 'tree-key-hints--lit': !recenterAtRest }"
      @click.stop
    >
      <KeybindChip id="forgeRecenter" :lit="!recenterAtRest" />
    </div>

    <!-- DIE SUCHLEISTE oben rechts, die dritte belegte Ecke
         (`FORGE_VIEWPORT_KEEPOUTS.topRight`). -->
    <ForgeSearchDock />

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
        transitionDuration: `${stageTransitionMs}ms`,
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
        :class="{ 'tree-svg--focus': spotlightId !== null }"
        :viewBox="`0 0 ${FORGE_STAGE_SIZE} ${FORGE_STAGE_SIZE}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- DAS KANTENFELD. Alles, was die Bühne dauerhaft trägt, liegt in
             EINER Gruppe — damit das Zurücktreten beim Zeigen ein einziger
             `opacity`-Wert auf einer Ebene ist und nicht eine Umschaltung je
             Pfad. Bedingung und Scheinwerferkette stehen bewusst DARAUSSEN: sie
             sind die Antwort auf das Zeigen und dürfen nie mitgedimmt werden. -->
        <g class="limb-field">
          <!-- Gezeichnet wird nur, was OFFEN ist. Die Breite sagt die Ebene,
               die Farbe das Ziel. -->
          <g class="limb-open" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <path
              v-for="limb in openLimbs" :key="limb.key + '-o'"
              :d="limb.d" :stroke-width="limbWidth(limb)" :stroke="limb.tint"
            />
          </g>
        </g>

        <!-- Die BEDINGUNGEN des GEZEIGTEN Knotens, gestrichelt und in der Farbe
             des Zustands. Sie lagen einmal an jedem gesperrten Ziel und damit
             im frischen Spielstand fast ueberall — rund fuenfzig Linien, die
             niemand erfragt hatte. Jetzt haengen sie am Zeiger.
             Sie sind KEINE Rueckkehr der alten Spannfaeden: die zeigten aus dem
             Bild heraus, weil eine Krone auf r = 438 stand und ihr Zweig auf
             r = 221. Im Netz ist jede dieser Kanten hoechstens
             `FORGE_EDGE_MAX_PX` lang — beide Enden stehen im selben Bild. -->
        <g
          class="req-limbs"
          stroke-linecap="round" stroke-linejoin="round" fill="none"
          :stroke-dasharray="FORGE_EDGE_REQ_DASH"
        >
          <path
            v-for="limb in requireLimbs" :key="limb.key + '-req'"
            :d="limb.d" :stroke-width="limb.width"
            :class="limb.met ? 'req-limb--met' : 'req-limb--open'"
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

      <!-- DIE SONNE, und in ihrem Kern die Leitzahl.

           `SunChimeBoost` steht NEBEN den drei Körpern und nicht in ihnen: der
           Komet taumelt, die Plasmascheibe atmet, und eine Zahl, die mitdreht
           oder mitpulst, ist keine Anzeige mehr. Alle vier sind absolut in der
           Mitte des Wrappers verankert und tragen ihre Größe selbst. -->
      <div class="sun-wrapper">
        <CometDisc v-if="solarStore.isCometState" :diameter="bodyDiameter" />
        <PhaseSunDisc v-else :diameter="bodyDiameter" />
        <div
          v-if="solarStore.canUpgradeStar || solarStore.isUpgrading"
          class="next-phase-preview"
          :style="nextPhasePreviewStyle"
        />
        <SunChimeBoost :diameter="bodyDiameter" :scale="totalScale" />
      </div>

      <!-- Nodes -->
      <div
        v-for="node in allNodes"
        :key="node.id"
        class="tree-node"
        :class="{ 'tree-node--spot': isSpot(node.id) }"
        :style="nodePos(node)"
      >
        <div
          class="node-circle"
          :class="[
            `node-circle--${node.sizeClass}`,
            `node-circle--${entryOf(node).state}`,
            {
              // Die zwei Klassen, die den Baum beim Öffnen lesbar machen:
              // kaufbar leuchtet, offen-aber-zu-teuer tritt zurück. Sie hängen
              // an `canBuy` und NICHT an `state === 'affordable'` — dieselbe
              // Wahl wie in `ForgeUpgradeTile.vue`, damit Baum und Liste
              // dieselbe Frage gleich beantworten.
              'node-circle--ready': entryOf(node).canBuy,
              'node-circle--short': isShort(node),
              'node-circle--spot': isSpot(node.id),
              'node-circle--pinned': pinnedId === node.id,
              // Was Voraussetzung IST, dämpft nicht — dieselbe Vorfahrt wie
              // `onChain()` im Meep-Baum. Eine Antwort, die auf gedimmten
              // Kreisen steht, sieht nach einem Fehler aus.
              'node-circle--req': spotReqs.has(node.id),
              // Und was auf dem WEG dorthin liegt, ebenso wenig.
              'node-circle--trail': spotTrail.has(node.id),
              'node-circle--dim': isDimmed(node.id),
              'node-circle--hit': isSearchHit(node.id),
            },
          ]"
          :style="{ '--node-color': node.color }"
          @click.stop="handleNodeClick(node)"
          @mouseenter="setTreeHover(node.id)"
          @mouseleave="setTreeHover(null)"
        >
          <span class="node-glow" aria-hidden="true" />
          <!-- Der SUCHRING. Eigene, statische Ebene mit eigenem Ton — Gold ist
               „kaufbar", Grün/Rot sind die Voraussetzung. -->
          <span v-if="isSearchHit(node.id)" class="node-hit" aria-hidden="true" />
          <!-- Eine Ebene je Spotlight, nicht eine je Knoten: so existiert genau
               EINE statt fünfundzwanzig, und der Ping fängt bei jedem neuen
               Ziel von vorn an, weil das Element selbst neu ist.

               Der Schlüssel setzt genau dieses Rezept fort. Kommt der Knoten
               durch eine KAMERAFAHRT ins Bild, hat der Spotlight längst
               gewechselt — das Element stünde da und hätte seinen Ping
               ausserhalb des Bildes verpulvert. Ein neuer Schlüssel lässt es
               neu entstehen, und der Ping fällt mit der Ankunft zusammen. -->
          <span
            v-if="isSpot(node.id)"
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
          <!-- Der WEG-RING. Dritte Rolle neben Ziel und Voraussetzung, und die
               leiseste: enger, dünner, in der Farbe des ZIELS — er gehört zur
               Kante unter ihm, nicht zum Kreis, auf dem er sitzt.

               Der Schlüssel hängt am Spotlight, nicht am Knoten: dasselbe Rezept
               wie beim Ping darüber, damit die Welle bei jedem Fokuswechsel von
               vorn anläuft statt einmal pro Sitzung. -->
          <span
            v-if="spotTrail.has(node.id)"
            :key="`trail-${node.id}-${spotlightId}`"
            class="node-trail"
            :style="spotTrailStyles.get(node.id)"
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


          <!-- Hier stand DAS GEGENSTÜCK ZUM SCHLOSS: ein grüner Kreis mit
               Blitz, „kaufbar", oben rechts. Er ist gefallen, weil die Ecke
               inzwischen der NEU-Marke gehört und die beiden sich zwangsläufig
               trafen — frisch heisst immer auch kaufbar. Ein Zeichen, das nur
               dann sichtbar ist, wenn das andere gerade nicht steht, meldet
               nichts; es blinkt beim Hover einmal auf und ist sonst Grundrauschen.

               Was „kaufbar" jetzt trägt: der Kreis selbst — volle Leitfarbe,
               heller Rand, statischer Schein (`--ready`) — und drüben in der
               Liste der grüne Knopf mit dem Preis darauf. -->

          <!-- NEU SEIT DEM LETZTEN BLICK — und zwar STATT des Blitzes darüber,
               nicht neben ihm.

               Dieselbe Marke wie an der Zeile, am Profil-Reiter und an der
               Ecktaste im Header (`ShopReadyBadge`) — die einzige Bewohnerin
               dieser Ecke, seit der Blitz gefallen ist.

               Ihre Zahl ist die des Stapelkaufs: wie viele Stufen dieser Knoten
               jetzt auf einmal hergäbe. Hier ist sie die EINZIGE Quelle dafür —
               der Baum hat keinen Stapelknopf, der es sonst sagen würde. -->
          <ShopReadyBadge
            v-if="freshIds.has(node.id) && showCornerBadge(node)"
            class="node-fresh-badge"
            :style="{ '--sbadge-d': freshBadgePx[node.sizeClass] }"
            :count="freshCountOf(node)"
            :title="FORGE_FRESH_TITLE"
            :label="FORGE_FRESH_TITLE"
          />

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
import { useForgeSearch } from '@/composables/ui/useForgeSearch'
import { useForgeDetailsPane } from '@/composables/ui/useForgeDetailsPane'
import {
  forgeClusterSpots,
  forgeEdges,
  type ForgeEdgeKind,
  forgeTreePlacements,
  type Point,
} from '@/utils/ui/forgeTreeLayout'
import { forgeClusterOf } from '@/config/progression/starForgeNet'
import { forgeRouteKey, forgeRoutes, forgeSunRoute } from '@/utils/ui/forgeEdgeRoute'
import { MEEP_TREE_NODES, MEEP_TREE_NODE_INDEX } from '@/config/progression/meepTree'
import {
  forgeCompassAt,
  forgeComfortPan,
  forgeNodeInView,
  forgeNodeScreenPoint,
  type ForgeCamera,
} from '@/utils/ui/forgeSpotlightView'
import {
  forgeClampPan,
  forgeCameraHome,
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
import PhaseSunDisc from '@/components/idle/sun/PhaseSunDisc.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import ShopReadyBadge from '@/components/ui/ShopReadyBadge.vue'
import ForgeNodeTooltip from './ForgeNodeTooltip.vue'
import ForgeSearchDock from './ForgeSearchDock.vue'
import SunChimeBoost from './SunChimeBoost.vue'
import KeybindChip from '@/components/keybinds/KeybindChip.vue'
import {
  STAR_PHASE_DATA,
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
  FORGE_FRESH_BADGE_NODE_PCT,
  FORGE_FRESH_TITLE,
  FORGE_LIMB_STROKE_FACTOR,
  FORGE_LIMB_MIN_WIDTH,
  FORGE_LIMB_DIM_OPACITY,
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
  FORGE_ICON_SIZE_MEEP,
  FORGE_ICON_SIZE_CONFLUENCE,
  FORGE_LOCK_ICON,
  FORGE_PIN_ICON,
  FORGE_CORNER_BADGE_MIN_DIAMETER,
  FORGE_ENDLESS_SYMBOL,
  FORGE_BODY_EDGE_FRACTION,
  FORGE_SUN_EDGE_GAP,
  FORGE_SPOTLIGHT_NODE_SCALE,
  FORGE_SPOTLIGHT_DIM_OPACITY,
  FORGE_SPOTLIGHT_PING_MS,
  FORGE_SPOTLIGHT_MAX_LIMBS,
  FORGE_SPOTLIGHT_PAN_DELAY_MS,
  FORGE_SPOTLIGHT_RING_INSET_PX,
  FORGE_TRAIL_RING_INSET_PX,
  FORGE_TRAIL_DIM_OPACITY,
  FORGE_TRAIL_WAVE_MS,
  FORGE_TRAIL_WAVE_STEP_MS,
  FORGE_SPOTLIGHT_COMPASS_ICON,
  FORGE_SPOTLIGHT_COMPASS_ICON_PX,
  FORGE_SPOTLIGHT_COMPASS_SIZE_PX,
  FORGE_TREE_PAN_MS,
  FORGE_CAMERA_PAN_MIN_MS,
  FORGE_CAMERA_PAN_MAX_MS,
  FORGE_CAMERA_PAN_SPEED_PX_PER_MS,
  FORGE_VIEWPORT_INSET_PX,
  FORGE_ZOOM_BAR,
  FORGE_RECENTER_AT_REST_PX,
} from '@/config/constants'

const solarStore = useSolarUpgradeStore()
const forgeStore = useStarForgeStore()
const { entryById, freshIds, buyUpgrade, affordableLevels } = useForgeUpgrades()
const {
  spotlightId,
  hoverId,
  treeHoverId,
  listHoverId,
  pinnedId,
  focusTick,
  readableTick,
  setTreeHover,
  setPin,
  refocus,
  clearPin,
  clearPursuit,
  resetForgeSpotlight,
} = useForgeSpotlight()
const { searchActive, matchIds } = useForgeSearch()
const { detailsOpen, openDetails, closeDetails } = useForgeDetailsPane()

const C = FORGE_STAGE_SIZE / 2

/** Endphase: der Stern ist kollabiert — der Baum ist ausgewachsen, im Zentrum
 *  steht statt der Plasmascheibe das Schwarze Loch. Nur noch für die GEOMETRIE
 *  gelesen; welchen Körper man sieht, entscheidet `PhaseSunDisc` selbst. */
const isCollapsed = computed(() => solarStore.isCollapsedStar)

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

/* Das MASS der NEU-Marke, je Rang — aus derselben Tabelle wie `nodePx`, aus
   demselben Grund: zwei Zahlenreihen für einen Kreis liefen beim ersten
   geänderten Rang auseinander. Der Anteil steht in
   `FORGE_FRESH_BADGE_NODE_PCT`; gerundet wird auf Hundertstel, damit aus 46 px
   glatte 18,4 werden statt 18,400000000000002. */
const freshBadgePx = Object.fromEntries(
  Object.entries(FORGE_NODE_DIAMETER).map(([tier, d]) => [
    tier,
    `${Math.round(d * FORGE_FRESH_BADGE_NODE_PCT) / 100}px`,
  ]),
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
  confluence: FORGE_ICON_SIZE_CONFLUENCE,
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
  const road: TreeNode[] = MEEP_TREE_NODES.map((def) => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    color: MEEP_TREE_NODE_INDEX[def.id]?.branch.color ?? '#e8c040',
    ...(places.get(def.id) ?? fallback),
    tier: 'meep' as const,
    sizeClass: 'meep' as const,
    iconSize: FORGE_ICON_SIZE_MEEP,
    parentId: null,
  }))
  return [...roots, ...forge, ...road]
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
  /** Woher die Kante kommt. Bei einer Bedingung ist das der VORGÄNGER — und
   *  damit der Knoten, dessen Erfüllt-Stand sie einfärbt. */
  sourceId: string
  targetId: string
  kind: ForgeEdgeKind
}

/** Eine Brücke kennt zusätzlich die ZONE, in die sie führt. */
interface BridgeLimb extends Limb {
  /** Die Leitfarbe des Ziel-Clusters. Sie lag bisher nur im Zonenschleier — und
   *  eine Farbe, die ein Gebiet benennt, gehört auch an den Weg dorthin. */
  accent: string
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
      sourceId: edge.from,
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
      sourceId: 'sun',
      targetId: root.id,
      kind: 'parent',
    })
  }
  return result
})

/** Nur die Struktur. Bedingungen hängen am Zeiger und haben ihre eigene Ebene. */
const structureLimbs = computed(() => limbs.value.filter((l) => l.kind === 'parent'))

/** Die Kette von The Wandering. Eigene Liste, weil sie ein ODER ist und kein
 *  UND — und weil sie in der Farbe ihrer Spur läuft, nicht in der ihres Ziels. */
const pathLimbs = computed(() => limbs.value.filter((l) => l.kind === 'path'))

/** Die Wege zwischen zwei Zonen. Sie tragen die Leitfarbe ihres Ziels. */
const bridgeLimbs = computed<BridgeLimb[]>(() =>
  limbs.value
    .filter((l) => l.kind === 'bridge')
    .map((l) => ({ ...l, accent: forgeClusterOf(l.targetId)?.accent ?? l.color })),
)

/**
 * Die Kanten, die die Bühne trägt — und das sind nur die OFFENEN.
 *
 * Hier standen zwei Töpfe: der geschlossene Weg lag als dunkler Strich mit auf
 * der Bühne und hielt die Form des Netzes. Im frischen Spielstand waren das
 * rund zweihundert Linien um fünf begehbare herum — ein volles Netz als Antwort
 * auf eine Frage, die niemand gestellt hatte. Davor standen fünf Töpfe plus
 * eine sechste Auswahl für „kaufbar", elf Ebenen und eine Legende; eine
 * Bildsprache, die eine Legende braucht, hat zu viele Wörter.
 *
 * Eine Kante existiert jetzt genau dann, wenn ihr ZIEL freigeschaltet ist. Kein
 * Ausblick nach vorn: die Linie kommt mit dem Knoten, den sie erschliesst. Was
 * die Struktur trotzdem beantwortet, hängt am Zeiger — Scheinwerferkette und
 * Bedingungslinien liegen ausserhalb dieser Ebene und zeigen auch Wege zu
 * gesperrten Zielen.
 *
 * Die Brücken hingen einmal an der SONNENPHASE (`zoneOpen`) statt am
 * Knotenzustand und standen deshalb farbig da, während ihr Ziel noch zu war.
 * Sie lesen dieselbe Frage wie jede andere Kante.
 *
 * Kaufbarkeit ist bewusst KEIN Zustand: sie hängt an den tickenden Chimes und
 * hätte die Pfade sekündlich umsortiert. Sie steht am Knoten — Rand, Grund und
 * Ready-Badge sagen sie längst.
 */
interface DrawnLimb extends Limb {
  tint: string
}

const openLimbs = computed<DrawnLimb[]>(() => {
  const entries = entryById.value
  const isOpen = (id: string): boolean => {
    const entry = entries.get(id)
    return entry !== undefined && entry.state !== 'locked'
  }
  const out: DrawnLimb[] = []
  for (const limb of structureLimbs.value) {
    if (isOpen(limb.targetId)) out.push({ ...limb, tint: limb.color })
  }
  for (const bridge of bridgeLimbs.value) {
    if (isOpen(bridge.targetId)) out.push({ ...bridge, tint: bridge.accent })
  }
  // Die Strasse steht immer. Sie ist der Weg selbst — was auf ihm schon
  // gegangen ist, sagt der Knoten, nicht die Linie.
  for (const path of pathLimbs.value) out.push({ ...path, tint: path.color })
  return out
})

/** Der Boden verhindert, dass die feinste Kante beim Herauszoomen verschwindet. */
function limbWidth(limb: Limb): number {
  return Math.max(FORGE_LIMB_MIN_WIDTH, limb.width * FORGE_LIMB_STROKE_FACTOR)
}

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
    //
    // `met` kommt aus derselben Menge, aus der auch der Ring am Kreis liest.
    // Die Linien waren einmal ALLE rot — daneben stand ein grüner Ring an
    // einem erfüllten Vorgänger, und die Kante dazwischen behauptete das
    // Gegenteil. Grün steht, rot fehlt, überall.
    .map((l) => ({
      ...l,
      width: Math.max(FORGE_LIMB_MIN_WIDTH, l.width - 1),
      met: spotReqs.value.get(l.sourceId) ?? false,
    })),
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

/**
 * Der Kreis, den der Spieler MEINT — sein Zeiger ODER sein Fokus.
 *
 * Zwei Quellen, kein Vorrang, und das ist der Unterschied zu `spotlightId`.
 * Seit ein Klick immer fokussiert, steht der Fokus dauerhaft; ginge die
 * Hervorhebung weiter allein über `spotlightId`, schluckte er jede Rückmeldung
 * auf den Knoten, über die der Zeiger als Nächstes fährt — man sähe beim
 * Schwenk über den Baum gar nichts mehr.
 *
 * Beide gleichzeitig hervorzuheben ist kein Widerspruch: der fokussierte Kreis
 * trägt zusätzlich seine Pin-Marke, der überfahrene nicht.
 */
function isSpot(id: string): boolean {
  return hoverId.value === id || pinnedId.value === id
}

/**
 * Zurücktreten tut ein Knoten, sobald überhaupt einer gezeigt wird — und er
 * weder gemeint noch Voraussetzung des Gemeinten ist.
 *
 * Hier hängt es weiterhin an `spotlightId` und nicht am blossen Zeiger: im Baum
 * TRÄGT die Dämpfung Auskunft, weil Voraussetzungs- und Wegknoten hell durch
 * sie hindurchstehen. In der Liste drüben ist das anders — dort dämpft nur der
 * Zeiger, sonst läge sie unter einem stehenden Fokus dauerhaft grau.
 */
function isDimmed(id: string): boolean {
  if (searchActive.value && !matchIds.value.has(id)) return true
  return (
    spotlightId.value !== null &&
    !isSpot(id) &&
    !spotReqs.value.has(id) &&
    !spotTrail.value.has(id)
  )
}

/** Nur bei laufender Suche — ohne sie trägt jeder Knoten den Ring. */
function isSearchHit(id: string): boolean {
  return searchActive.value && matchIds.value.has(id)
}

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

/**
 * Die Knoten, über die der Weg LÄUFT — Id → Platz in der Welle.
 *
 * Abgeleitet aus `spotlightLimbs`, nicht aus einem zweiten Gang durch den Baum:
 * Kante und Kreis müssen dieselbe Kette meinen, sonst leuchtet ein Strahl über
 * Knoten, die er selbst ausblendet — genau der Widerspruch, den `spotReqs`
 * für die Voraussetzungen schon einmal aufgelöst hat.
 *
 * Rückwärts gezählt, weil das letzte Glied am Sternenrand hängt: der Index IST
 * damit die Leserichtung der Welle, Sonne zuerst.
 */
const spotTrail = computed<Map<string, number>>(() => {
  const out = new Map<string, number>()
  const chain = spotlightLimbs.value
  for (let i = chain.length - 1; i >= 0; i--) {
    const id = chain[i].sourceId
    // 'sun' ist Quelle der Wurzelkanten, aber kein Knoten auf der Bühne.
    if (!nodeById.value.has(id)) continue
    if (id === spotlightId.value) continue
    // Grün steht, rot fehlt — das trägt mehr als „liegt auf dem Weg“.
    if (spotReqs.value.has(id)) continue
    if (!out.has(id)) out.set(id, out.size)
  }
  return out
})

/**
 * EINE Rechnung über die ganze Kette statt einer Funktion je Knoten im Template
 * — dasselbe Muster wie `reqWreaths`.
 *
 * Die Farbe ist die des ZIELS, nicht die des Wegknotens: gliedweise eigene
 * Farben liessen die Kette als drei Striche lesen, nicht als einen. Der Ring
 * trägt damit genau den Ton der Kante, die unter ihm durchläuft.
 */
const spotTrailStyles = computed<Map<string, Record<string, string>>>(() => {
  const out = new Map<string, Record<string, string>>()
  for (const [id, step] of spotTrail.value) {
    out.set(id, {
      '--trail-color': spotlightColor.value,
      '--trail-delay': `${step * FORGE_TRAIL_WAVE_STEP_MS}ms`,
    })
  }
  return out
})

// Für das scoped CSS unten — Muster `SigilRoleNode.vue`: die Zahl steht in den
// Konstanten, den Keyframe-Namen trägt die CSS-Klasse.
const spotScale = String(FORGE_SPOTLIGHT_NODE_SCALE)
const spotDimOpacity = String(FORGE_SPOTLIGHT_DIM_OPACITY)
const spotPingMs = `${FORGE_SPOTLIGHT_PING_MS}ms`
const limbDimOpacity = String(FORGE_LIMB_DIM_OPACITY)

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

/**
 * Offen, aber der Vorrat reicht nicht — die Gegenseite zu `canBuy`.
 *
 * Warum das nicht schlicht `!canBuy` ist: gesperrt, gedeckelt und ausgewachsen
 * tragen ihre EIGENE Aussage am Kreis (Schloss, matter Rand, Goldring). Würden
 * sie hier mitgedämpft, läge über ihnen eine zweite Aussage, die etwas anderes
 * behauptet — „dir fehlen Chimes" steht an einem MAX-Knoten schlicht falsch.
 *
 * Bis auf einen Term dasselbe wie `short` in `ForgeUpgradeTile.vue`, und die
 * Ausnahme ist gewollt: die Liste bekommt gar keinen gesperrten Eintrag mehr zu
 * sehen und braucht den `'locked'`-Term deshalb nicht. Der Baum bekommt sie
 * alle — er ist seit dem Umbau der EINZIGE Ort, an dem Gesperrtes steht.
 */
function isShort(node: TreeNode): boolean {
  const entry = entryOf(node)
  return (
    entry.state !== 'locked' &&
    entry.state !== 'capped' &&
    entry.state !== 'maxed' &&
    !entry.canBuy
  )
}

/** Trägt dieser Kreis überhaupt ein Eck-Abzeichen? Herleitung der Schwelle steht
 *  an `FORGE_CORNER_BADGE_MIN_DIAMETER`. */
function showCornerBadge(node: TreeNode): boolean {
  return FORGE_NODE_DIAMETER[node.sizeClass] >= FORGE_CORNER_BADGE_MIN_DIAMETER
}

/**
 * Wie viele Stufen an einem FRISCHEN Knoten gerade auf einmal gingen — die Zahl
 * in seiner NEU-Marke.
 *
 * Über `freshIds` gerechnet und nicht über `allNodes`: `affordableLevels()`
 * läuft je Eintrag eine Schleife über bis zu `FORGE_BULK_BUY_CAP` Stufen, und
 * das Netz hat hundertfünfundfünfzig Knoten, von denen im Spätspiel bis zu
 * neunzig gleichzeitig kaufbar sind. Frisch sind nie viele — das ist der ganze
 * Sinn der Marke —, und die Karte wird bei jedem Chime-Tick neu gebaut.
 *
 * Die Untergrenze ist eine Eins, aus demselben Grund wie an der Zeile: bei
 * `count === 0` erschiene die Marke gar nicht, und frisch heisst immer kaufbar.
 */
const freshBulk = computed<Map<string, number>>(() => {
  const out = new Map<string, number>()
  for (const id of freshIds.value) out.set(id, Math.max(1, affordableLevels(id)))
  return out
})

function freshCountOf(node: TreeNode): number {
  return freshBulk.value.get(node.id) ?? 1
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
/*
 * Der Kaufblitz stand hier einmal als `flashSun()` samt eigenem Schleier. Er
 * gehört jetzt der Sonne selbst (`PhaseSunDisc`, `.sig-pulse`): hier blitzte
 * nur die Baum-Sonne im Skill-Tree-Reiter, und dieselbe Sonne im Idle-Orbit blieb
 * stumm. Ausgelöst wird er in `solarUpgradeStore.markSignaturePulse()`, also
 * an den Kaufwegen selbst — auch die, die nie durch dieses Panel laufen.
 */

/**
 * EINE Geste, EINE Bedeutung: **ein Klick fokussiert.** Gekauft wird erst mit
 * dem zweiten Klick auf denselben, bereits fokussierten Knoten.
 *
 * Hier standen einmal zwei Gesten auf einer Taste — was kaufbar war, wurde
 * gekauft, was gesperrt war, angeheftet. Das las sich als saubere Trennung und
 * war in Wahrheit die schlechteste Eigenschaft der Fläche: dieselbe Bewegung
 * gab je nach Zustand des Ziels entweder Chimes aus oder zeigte nur etwas an,
 * und welcher der beiden Fälle vorlag, musste man am Kreis ablesen, BEVOR man
 * klickte. Ein Fokus entstand ausserdem nur im Sonderfall, wanderte also nie
 * von Knoten zu Knoten — und die Detailspalte konnte gar nicht fokussieren.
 *
 * Jetzt gilt in beiden Spalten dasselbe: der erste Klick wählt, der zweite
 * bestätigt. Kaufen ist damit ein bewusster zweiter Schritt vor einer sichtbaren
 * Rechnung — Preis, Stufe und Wirkungssprung stehen zu diesem Zeitpunkt drüben
 * in der Zeile, die der erste Klick herangerollt hat.
 *
 * Was davon UNBERÜHRT bleibt: solange die Detailspalte zu ist, kauft der Baum
 * überhaupt nicht. Ein Klick klappt auf und fokussiert; ohne das gäbe er Chimes
 * für etwas aus, dessen Preis gerade hinter der Kante steht.
 *
 * Ein GESPERRTER Knoten hat keinen zweiten Schritt — dort gibt es nichts zu
 * kaufen. Sein zweiter Klick holt ihn stattdessen zurück ins Bild; der
 * Sperrgrund samt vollständiger Bedingungsliste steht in der Zeile drüben, und
 * der Fokus hält den Kranz still, während der Zeiger die Voraussetzungen abfährt.
 *
 * Kauf und Meldung liegen im Composable, damit Baum und Upgrade-Liste denselben
 * Weg nehmen. Hier bleibt nur, was der Baum eigenes tut.
 */
function handleNodeClick(node: TreeNode): void {
  // Spalte zu: aufklappen und fokussieren. Gekauft wird hier nicht — der Baum
  // zeigt einen Ring, keine Rechnung.
  if (!detailsOpen.value) {
    openDetails()
    setPin(node.id)
    return
  }

  // Ein ANDERER Knoten: der Fokus wandert, und das ist alles. Bis hierher kaufte
  // dieser Zweig sofort, und ein Fokus entstand nur bei gesperrten Knoten — eine
  // Geste, die je nach Zustand des Ziels zeigte oder Chimes ausgab.
  if (pinnedId.value !== node.id) {
    setPin(node.id)
    return
  }

  // Derselbe, schon fokussierte Knoten. Gesperrt gibt es nichts zu kaufen; dann
  // holt der Klick ihn nur zurück ins Bild, statt wirkungslos zu verpuffen.
  if (entryOf(node).state === 'locked') {
    refocus()
    return
  }

  // Gelöst wird erst NACH dem geglückten Kauf: ein Kauf, der an fehlenden Chimes
  // oder leerem Lager scheitert, ist keiner und darf den Fokus nicht mitnehmen.
  if (buyUpgrade(node.id)) {
    clearPin()
  }
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
 * Er startet auf der Bühnenmitte — dort sitzt die Sonne, und damit steht sie
 * mittig im Bild. Warum nicht auf der Mitte des Netzes: `forgeCameraBounds.ts`.
 */
const pan = ref(forgeCameraHome())

let resizeObserver: ResizeObserver | null = null

/* ── Der Breitensprung der Detailspalte ────────────────────────────────────
 *
 * Klappt die Spalte rechts ein oder aus, wechselt die Breite dieses Viewports
 * in EINEM Frame — so gebaut, damit hier nicht pro Frame `fitScale` neu
 * gerechnet wird (siehe `.shop-forge-col` in `ShopComponent`).
 *
 * Nur: `.tree-stage` hängt an `top/left: 50 %`, und das ist LAYOUT. Der
 * Bühnenanker springt mit der halben Breitendifferenz mit — auf Full HD rund
 * 230 px — und die `transition: transform` der Bühne fängt davon nichts auf,
 * weil sie den Anker gar nicht sieht. Ohne Ausgleich rutscht der ganze Baum
 * seitwärts, obwohl der Spieler nur eine Spalte zugezogen hat.
 *
 * Ausgeglichen wird deshalb im `pan`, im SELBEN Frame und ohne Transition:
 * `screenX(P) = W/2 + (P.x − pan.x) · s`, also hält `pan.x + Δ/(2s)` jeden
 * Punkt an seiner Bildschirmstelle. Auf dem Schirm bewegt sich nichts, es wird
 * nur mehr Fläche sichtbar — und das ist genau, was das Zuklappen verspricht.
 */
let lastViewportW = 0
/** Steht ein Spaltenwechsel an? Ein echtes Fensterresize klemmt weiterhin
 *  schlicht neu — dort IST das Nachrücken die richtige Antwort. */
let paneShift = false
/** Ein einziger Frame ohne Transition: der Ausgleich darf nicht selbst fahren. */
const panInstant = ref(false)
let settleFrame = 0

/**
 * Wie lange die NÄCHSTE Bewegung der Bühne dauert.
 *
 * Stand als feste Zahl im `v-bind` der Transition. Seit die Kamerafahrt zum
 * Fokus ihre Dauer aus der Strecke bezieht, wechselt sie — und dann gehört sie
 * ans ELEMENT, nicht als Custom Property an den Komponentenrahmen: eine dort
 * geänderte Variable zieht einen Style-Recalc über den ganzen Teilbaum, und
 * darin liegen hundertfünfundfünfzig Knoten (Performance-Regel 3).
 *
 * Jede Bewegung, die nicht der Fokus ist — Zoomschritte, der Ausgleich des
 * Spaltensprungs —, behält `FORGE_TREE_PAN_MS`; `movePan()` setzt den Wert und
 * ist die einzige Stelle, die ihn ändert.
 */
const panDurationMs = ref(FORGE_TREE_PAN_MS)

/**
 * Was am Element steht — und damit die EINZIGE Antwort auf „fährt sie gerade".
 *
 * Zwei Zustände setzen sie auf null: der Zug an der Maus (sonst hängt der Baum
 * dem Zeiger um eine Fahrtdauer hinterher, und das fühlt sich an wie ein
 * Fehler) und der eine Frame, in dem der Breitensprung der Detailspalte
 * ausgeglichen wird (sonst führe die Bühne die Kompensation als sichtbare Fahrt
 * aus, und der Sprung wäre durch ein Schwenken ersetzt statt aufgehoben).
 *
 * Beides stand als `transition: none` in zwei Klassen — und genau das ginge
 * jetzt nicht mehr: eine INLINE gesetzte `transition-duration` schlägt jede
 * Regel aus dem Stylesheet, die Klassen wären wirkungslos geworden. Die Fälle
 * gehören deshalb hierher, in die Zahl selbst.
 */
const stageTransitionMs = computed(() =>
  isDragging.value || panInstant.value ? 0 : panDurationMs.value,
)

watch(detailsOpen, () => {
  paneShift = true
})

onMounted(() => {
  if (!viewportEl.value) return
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    const prevW = lastViewportW
    lastViewportW = rect.width
    viewportSize.value = { w: rect.width, h: rect.height }
    // Gemessen wird der VIEWPORT und nicht das Panel. Beide sind seit dem Fall
    // des Ertrags-Kopfs gleich hoch — aber die Fläche, in der der Baum liegt,
    // IST der Viewport, und daran soll die Rechnung hängen.
    fitScale.value = forgeFitScale(viewportSize.value)

    if (!paneShift || prevW === 0) {
      zoom.value = clampZoom(zoom.value)
      movePan(pan.value)
      return
    }
    const narrower = rect.width < prevW
    paneShift = false
    // VOR dem Ausgleich gefragt, sonst ist die Antwort immer „nein".
    const home = forgeCameraHome()
    const wasHome =
      Math.hypot(pan.value.x - home.x, pan.value.y - home.y) < FORGE_RECENTER_AT_REST_PX

    panInstant.value = true
    pan.value = {
      x: pan.value.x + (rect.width - prevW) / 2 / (totalScale.value || 1),
      y: pan.value.y,
    }

    /* Erst im NÄCHSTEN Frame Transition zurück und klemmen. Was `forgePanLimit`
       und `zoomFloor` danach noch verschieben — bei breiterem Bild zieht der
       Anschlag zur Bühnenmitte, bei schmalerem hebt sich ggf. der Zoomboden —
       gleitet dann über die vorhandene Transition der Bühne. */
    settleFrame = requestAnimationFrame(() => {
      panInstant.value = false
      zoom.value = clampZoom(zoom.value)
      movePan(pan.value)
      /* Und erst JETZT den Fokus nachführen.

         Das ist der Fall, den man beim ersten Klick jedes Besuchs sieht: der
         Klick im Baum fährt die Detailspalte aus, der Viewport verliert dabei
         rund 450 px Breite — und der eben gewählte Knoten steht hinter der
         Spalte. Der Kamerawächter hat da längst entschieden, und zwar gegen den
         ALTEN, breiteren Viewport.

         Nur beim SCHMALER-Werden. Klappt die Spalte zu, wird Fläche frei; was
         vorher bequem stand, steht danach erst recht bequem, und eine Fahrt
         wäre reine Bewegung ohne Anlass. */
      if (narrower) {
        comfortToFocus(pinnedId.value)
        return
      }
      /* Und beim BREITER-Werden zurück nach Hause — aber nur für den, der gar
         nicht geschwenkt hat. Der Ausgleich oben hält das Bild still und lässt
         die Sonne dabei um die halbe Spaltenbreite aus der neuen Mitte laufen;
         wer selbst am Rand des Netzes steht, will genau das. Wer nicht, bekommt
         seine mittige Sonne zurück — als Fahrt über die vorhandene Transition,
         nicht als Sprung, denn der Anker hängt am Layout und kann nicht fahren. */
      if (wasHome) movePan(home, panDurationFor(pan.value, home))
    })
  })
  resizeObserver.observe(viewportEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(settleFrame)
  // Der Spotlight lebt auf Modulebene und überlebte diese Komponente sonst.
  //
  // Beim TABWECHSEL greift das hier allerdings nicht: der Skill-Tree-Reiter bleibt nach
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
 * Die EINE Tür, durch die jede Bewegung der Bühne geht.
 *
 * Vorher schrieb jeder Weg `pan` selbst und rief `clampPan()` hinterher — vier
 * Stellen, die dasselbe Paar bilden. Seit die Dauer nicht mehr feststeht, wäre
 * das ein fünftes Feld an jeder dieser Stellen, und genau so laufen zwei Werte
 * für eine Bewegung auseinander: eine Fahrt von 430 ms, danach ein Zoomschritt,
 * der ihre Dauer geerbt hat.
 *
 * Ohne zweites Argument gilt `FORGE_TREE_PAN_MS` — die Dauer für alles, was
 * nicht der Fokus ist. Der Zug an der Maus geht ebenfalls hier durch: er
 * schreibt denselben Wert jeden Frame, und identische Zuweisungen an eine Ref
 * lösen in Vue nichts aus.
 */
function movePan(next: Point, ms: number = FORGE_TREE_PAN_MS): void {
  panDurationMs.value = ms
  pan.value = next
  clampPan()
}

/**
 * Die Dauer einer Kamerafahrt aus ihrer STRECKE.
 *
 * Eine Nachführung um vierzig Pixel und ein Schwenk quer über den Baum sind
 * nicht dieselbe Bewegung: mit einer festen Zahl wirkt die kurze träge und die
 * lange gehetzt. Gerechnet auf dem SCHIRM, weil das Tempo dort wahrgenommen
 * wird — bei halbem Zoom dauert derselbe Bühnenweg deshalb halb so lang.
 */
function panDurationFor(from: Point, to: Point): number {
  const px = Math.hypot(to.x - from.x, to.y - from.y) * (totalScale.value || 1)
  return Math.min(
    FORGE_CAMERA_PAN_MAX_MS,
    Math.max(FORGE_CAMERA_PAN_MIN_MS, px / FORGE_CAMERA_PAN_SPEED_PX_PER_MS),
  )
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
  // Durch `movePan` und nicht durch `clampPan`: der Zoomschritt verschiebt am
  // Anschlag sehr wohl den Bildmittelpunkt, und er soll dabei die Standarddauer
  // tragen und nicht die der letzten Kamerafahrt.
  movePan(pan.value)
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
  movePan({ x: stageX - offX / after, y: stageY - offY / after })
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
  movePan({ x: dragStartPan.x - dx / s, y: dragStartPan.y - dy / s })
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

/** Klick auf den freien Grund löst Anheftung, Verfolgung und Detailspalte —
 *  aber nur, wenn es wirklich ein Klick war. */
function onBackgroundClick(): void {
  if (didDrag) return
  clearPin()
  clearPursuit()
  closeDetails()
}

/**
 * Die Kamera folgt dem Fokus.
 *
 * Der Baum ist zu gross, um ihn mit einer Liste von 155 Zeilen daneben ohne
 * diese Brücke zu bedienen: wer rechts eine Zeile anklickt, will sie links
 * SEHEN. Einmalig gesetzt, die vorhandene Transition auf `.tree-stage` trägt
 * die Bewegung — keine Frame-Schleife, kein `requestAnimationFrame`.
 *
 * Diese Fassung fährt in die MITTE und ist damit die ausdrückliche Antwort auf
 * `refocus()`. Der gewöhnliche Fokuswechsel geht über `comfortToFocus()`.
 */
function panToFocus(): void {
  const id = pinnedId.value
  if (id === null) return
  const node = nodeById.value.get(id)
  if (!node) return
  const target = { x: node.x, y: node.y }
  movePan(target, panDurationFor(pan.value, target))
  pingOnArrival(id)
}

/**
 * Der Weg zurück — Kamera UND Zoom auf den Ausgangsstand.
 *
 * Bisher gab es ihn nur als Nebenwirkung: ganz herauszoomen macht
 * `forgePanLimit()` zu null, und `clampPan()` zieht die Kamera dann zwangsweise
 * auf `forgeCameraHome()`. Neun Klicks auf „−" sind aber keine Geste.
 *
 * Der Zoom wird ZUERST gesetzt: `clampPan()` klemmt gegen `forgePanLimit(view,
 * scale)`, und in umgekehrter Reihenfolge klemmte die Fahrt noch gegen die
 * alte, engere Grenze.
 *
 * Die Anheftung bleibt stehen — sie zu lösen ist Escapes Aufgabe, und zwei
 * Zustände in einem Tastendruck wären ein Zufallsergebnis.
 */
function recenterCamera(): void {
  const target = forgeCameraHome()
  zoom.value = clampZoom(FORGE_TREE_ZOOM_DEFAULT)
  movePan(target, panDurationFor(pan.value, target))
}

defineExpose({ recenterCamera })

/** Steht die Kamera zu Hause? Speist das Leuchten der Kürzel-Zeile — sie zeigt
 *  das Kürzel erst dann hervorgehoben, wenn es etwas zu tun gibt. */
const recenterAtRest = computed(() => {
  const home = forgeCameraHome()
  const off = Math.hypot(pan.value.x - home.x, pan.value.y - home.y)
  return off < FORGE_RECENTER_AT_REST_PX && zoom.value === clampZoom(FORGE_TREE_ZOOM_DEFAULT)
})

const viewportInset = `${FORGE_VIEWPORT_INSET_PX}px`
const zoomBarW = `${FORGE_ZOOM_BAR.w}px`

/**
 * Die NACHFÜHRUNG — so weit wie nötig, nicht so weit wie möglich.
 *
 * Sie ersetzt das alte Paar aus „steht im Bild → gar nichts" und „steht nicht
 * im Bild → in die Mitte". Beides war derselbe Sprung an einer Kante: ein
 * Knoten 25 px vor dem Rand bewegte nichts, zwei Pixel weiter draussen riss er
 * die ganze Bühne quer über den Schirm.
 *
 * `forgeComfortPan()` beantwortet stattdessen, wie weit die Bühne gleiten muss,
 * damit der Knoten die Kante der Komfortzone berührt — und `null`, wenn er
 * ohnehin bequem dasteht. Dann bleibt alles stehen: kein `pan`-Schreiben, keine
 * neu angestossene Transition, kein Ping.
 */
function comfortToFocus(id: string | null): void {
  if (id === null) return
  const node = nodeById.value.get(id)
  if (!node) return
  const target = forgeComfortPan(
    node,
    nodeRadiusOnScreen(node),
    camera(),
    viewportSize.value,
  )
  if (!target) return
  movePan(target, panDurationFor(pan.value, target))
  pingOnArrival(id)
}

/**
 * Beim WECHSEL des Fokus führt sie nach.
 *
 * Bedingungsloses Zentrieren war richtig, solange Anheften die seltene Geste
 * war. Seit jeder Klick fokussiert, wäre es eine Bühne, die bei jedem Klick
 * unter dem Zeiger wegzieht — auch dann, wenn der getroffene Kreis längst
 * mitten im Bild steht. Dieselbe Zurückhaltung wie `block: 'nearest'` drüben in
 * der Liste, nur ohne deren Alles-oder-Nichts.
 */
watch(pinnedId, (id) => {
  comfortToFocus(id)
})

/**
 * Der Impuls dagegen fährt IMMER.
 *
 * `refocus()` ist die ausdrückliche Bitte — ein zweiter Klick auf dieselbe
 * Zeile oder denselben Knoten. Wer sie ausspricht, hat den Knoten gerade
 * nicht vor Augen, und „steht doch schon im Bild" wäre auf sie die falsche
 * Antwort: gemeint ist die MITTE, nicht der Rand — und deshalb auch nicht die
 * Komfortzone, die ihn nur bis an ihre Kante holte.
 */
watch(focusTick, () => {
  panToFocus()
})

/**
 * Der Sprung von aussen — als einziger hebt er den Zoom.
 *
 * Taste K fuehrt auf The Wandering, und die liegt jenseits der Sonnenleiter:
 * am Zoomboden misst ein Knoten dort gemessene 6,5 px. Hinfahren allein ist
 * dann keine Antwort, und `FORGE_TREE_ZOOM_DEFAULT` ist die richtige — es ist
 * die Stufe, in der sich der Baum beim Oeffnen selbst zeigt.
 *
 * Er hebt NUR, er senkt nie: wer naeher herangefahren ist, hat das absichtlich
 * getan. Und der Zoom steht VOR der Fahrt, dieselbe Reihenfolge und derselbe
 * Grund wie in `recenterCamera()` — umgekehrt klemmte die Fahrt noch gegen die
 * engere Grenze des alten Zooms.
 */
watch(readableTick, () => {
  const wanted = clampZoom(FORGE_TREE_ZOOM_DEFAULT)
  if (zoom.value < wanted) zoom.value = wanted
  panToFocus()
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
 * „Hier ist er" — der Ping am Ziel, sobald die Bühne steht.
 *
 * Er hing bisher allein am Zeiger auf der Liste. Seit der Klick nicht mehr
 * entweder gar nicht oder quer über den Schirm fährt, braucht er ihn genauso:
 * eine Nachführung um sechzig Pixel ist eine so kleine Bewegung, dass man ohne
 * diesen Schlag am Kreis nicht sicher weiss, welcher der fünfundzwanzig
 * Nachbarn nun gemeint ist.
 *
 * Gewartet wird die TATSÄCHLICHE Dauer der Fahrt (`panDurationMs`) und nicht
 * mehr die feste Zahl — seit sie mit der Strecke wächst, wäre eine zweite
 * Zahl daneben genau der Fehler, den `FORGE_TREE_PAN_MS` einmal vermeiden
 * sollte. Reine Anzeige, deshalb `setTimeout` und nicht `gameTimeout()`.
 */
function pingOnArrival(id: string): void {
  if (arrivalTimer !== null) clearTimeout(arrivalTimer)
  arrivalTimer = setTimeout(() => {
    arrivalTimer = null
    // Gilt der Knoten noch? Ein Klick weiter, und der Schlag gehörte einem
    // anderen Kreis.
    if (spotlightId.value === id) arrivalTick.value += 1
  }, panDurationMs.value)
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
    // Über dieselbe Komfortzone wie der Klick. Zwei Kamerasprachen in einem
    // Baum wären die schlimmere Fassung: dieselbe Zeile, einmal überfahren und
    // einmal angeklickt, führte sonst zu zwei verschiedenen Bildern.
    const target = forgeComfortPan(
      node,
      nodeRadiusOnScreen(node),
      camera(),
      viewportSize.value,
    )
    travelId.value = null
    if (!target) return
    movePan(target, panDurationFor(pan.value, target))
    // Der Ping erst NACH der Fahrt: gezündet man ihn sofort, platzte er noch
    // ausserhalb des Bildes, und von der Ankunft bliebe nichts zu sehen.
    pingOnArrival(id)
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

/** Der Ringüberstand geht per `v-bind` ins scoped CSS zurück — dort stand er
 *  einmal als Literal, und JavaScript braucht ihn jetzt auch.
 *
 *  Die Fahrtdauer stand hier ebenfalls und ist gefallen: sie wechselt seit der
 *  Komfortzone mit jeder Fahrt und hängt deshalb inline am Bühnenelement
 *  (`panDurationMs`), nicht als Custom Property am Komponentenrahmen. */
const ringInset = `${-FORGE_SPOTLIGHT_RING_INSET_PX}px`
const trailInset = `${-FORGE_TRAIL_RING_INSET_PX}px`
const trailOpacity = String(FORGE_TRAIL_DIM_OPACITY)
const trailWaveMs = `${FORGE_TRAIL_WAVE_MS}ms`
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

const nextPhasePreviewStyle = computed(() => ({
  background: `radial-gradient(circle at 38% 35%, ${nextStage.value.core} 0%, ${nextStage.value.mid} 45%, ${nextStage.value.edge} 100%)`,
  boxShadow: `0 0 40px 16px ${nextStage.value.glow1}88, 0 0 80px 30px ${nextStage.value.glow2}55`,
}))
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   PANEL
══════════════════════════════════════════════════ */
/* Hier stand einmal ein Ertrags-Kopf im Fluss über dem Viewport, und die Spalte
   war für ihn da. Er ist weg: die Leitzahl, um derentwillen er existierte, steht
   jetzt im Kern der Sonne (`SunChimeBoost`), also mitten in dem, was sie ergibt.
   Der Viewport bekommt seine hundert Pixel damit zurück — und `fitScale` nimmt
   `min(width, height)`, jeder davon ist also auch Zoom. */
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
   DIE BEIDEN UNTEREN ECKEN
══════════════════════════════════════════════════ */
/* Kantenabstand und Breite kommen aus den Konstanten und stehen hier nicht ein
   zweites Mal als Literal — die Sperrflächen rechnen mit denselben Zahlen. */
.tree-camera-dock {
  position: absolute;
  bottom: v-bind(viewportInset);
  right: v-bind(viewportInset);
  z-index: 20;
  width: v-bind(zoomBarW);
}

/* Dieselbe Zurückhaltung wie die Kürzel-Leiste über dem Command Panel: kein
   Kasten, kein Rahmen. Gedimmt, solange die Kamera zu Hause steht — beim
   Überfahren und bei verschobener Kamera voll da. */
.tree-key-hints {
  position: absolute;
  bottom: v-bind(viewportInset);
  left: v-bind(viewportInset);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0.7;
  transition: opacity 0.18s ease;
}

.tree-key-hints:hover,
.tree-key-hints--lit {
  opacity: 1;
}

.tree-zoom {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  flex: 1;
  min-width: 56px;
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
     zum Zeiger auf der Upgrade-Liste. Die DAUER steht inline am Element: sie
     wechselt mit der Strecke, und eine Custom Property am Komponentenrahmen
     zöge dafür jedes Mal einen Style-Recalc über hundertfünfundfünfzig Knoten
     (Performance-Regel 3). JavaScript kennt sie ohnehin — der Ping am Ziel
     zündet erst, wenn sie abgelaufen ist.

     Die KURVE dagegen gehört ins CSS und ist eine Ausklang-Kurve, kein `ease`:
     eine Kamera soll zügig anfahren und weich ankommen. `ease` bremst zu Beginn
     genauso wie am Ende und liess damit jede Nachführung um wenige Pixel
     zäh wirken. Weiterhin wird ausschliesslich `transform` animiert. */
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  z-index: 1;
}

/* Beim Ziehen MUSS die Fahrt aus sein — sonst hängt der Baum der Maus um eine
   Fahrtdauer hinterher, und das fühlt sich an wie ein Fehler. Das ABSCHALTEN
   steht nicht mehr hier, sondern in `stageTransitionMs`: die Dauer hängt inline
   am Element und schlüge jedes `transition: none` aus dem Stylesheet. Diese
   Klasse trägt nur noch das, was sie allein kann.

   `will-change` steht nur hier und nicht dauerhaft: es gehört an Elemente,
   deren `transform` WIRKLICH gerade pro Frame geschrieben wird
   (Performance-Regel 12). */
.tree-stage--dragging {
  will-change: transform;
}

.tree-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ══════════════════════════════════════════════════
   DIE KANTENSPRACHE — ein Strich, ein Zustand
   ══════════════════════════════════════════════════

   Sie lag global in `rpg-theme.css`, solange die Legende dieselben Klassen an
   ihre Proben hängte. Ohne Legende gibt es nur noch diesen einen Verwender.

   Alles hier ist STATISCH: kein `filter`, keine Animation, keine Custom
   Property. Im Spätspiel stehen dreistellig viele Pfade dauerhaft im DOM, und
   jede dieser drei Sachen wäre dort eine Rechnung pro Frame
   (Performance-Regeln 2, 3 und 11). */

/* `stroke` kommt als Attribut vom Pfad: die Farbe des Ziels, dieselbe, die
   dessen Rahmen und Grund tragen. Nicht volle Deckkraft — im Spätspiel sind das
   rund neunzig gefärbte Linien, und die Kreise darauf sollen lauter bleiben als
   die Fäden dazwischen. */
.limb-open {
  opacity: 0.75;
}

/* Das Kantenfeld tritt zurück, sobald auf einen Knoten gezeigt wird — EIN Wert
   auf EINER Ebene, also Compositor-Arbeit (Regel 1). Vorher dimmten nur die
   Kreise, und das volle Liniennetz darüber las sich nicht als Antwort, sondern
   als Gitter. Kette und Bedingung liegen ausserhalb dieser Gruppe. */
.limb-field {
  transition: opacity 160ms ease;
}

.tree-svg--focus .limb-field {
  opacity: v-bind(limbDimOpacity);
}

/* Die Bedingung eines gesperrten Knotens, gestrichelt und nur solange auf ihn
   gezeigt wird. Grün steht, rot fehlt — dieselben zwei Töne wie die Punkte des
   Kranzes und die Häkchen im Tooltip. Sie waren hier einmal ALLE rot, und
   damit widersprach die Linie dem grünen Ring, auf dem sie endete. */
.req-limbs {
  opacity: 0.62;
}

.req-limb--met {
  stroke: #52b830;
}

.req-limb--open {
  stroke: #cc6050;
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
  /* Er misst, was er hält. Hier stand `210px` als Literal, und das war schon vor
     dem Wachstum der Sonne kleiner als sie selbst — folgenlos für Komet, Plasma
     und Schwarzes Loch, die alle absolut zentriert sitzen, aber NICHT für
     `.next-phase-preview`: die nimmt `inset: 0` und stand damit als zu kleiner
     Kreis mitten in der Scheibe. Mit `--shop-sun-d` stimmt sie von selbst. */
  width: var(--shop-sun-d, 200px);
  height: var(--shop-sun-d, 200px);
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

/* Die Korona wächst MIT dem Körper. Fest gesetzte 90/180px lasen sich bei 320px
   Scheibe hart abgeschnitten — der Schein ist das, was eine Sonne zur Sonne
   macht, und er muss im Verhältnis bleiben. Beides bleibt ein STATISCHER
   Schatten; animiert ist an der Scheibe nur `transform`/`opacity` (Regel 2). */
:deep(.phase-sun-root) {
  z-index: 1;
  --sun-corona-a: calc(var(--shop-sun-d, 200px) * 0.38);
  --sun-corona-b: calc(var(--shop-sun-d, 200px) * 0.75);
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
   frei SCHWEBT (der Tooltip); ein gegenskalierter Punkt behielte
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

/* ── DIE NEU-MARKE, oben rechts am Kreis ─────────────────────
   Die Ecke ist gemessen und nicht gewählt, und die Herleitung stammt vom
   Blitz-Abzeichen, das hier bis zum Umbau sass: unten in der Mitte sitzt
   `.node-level` als Flex-Kind, und eine Marke in der Ecke des Schlosses schnitt
   dessen rechtes Ende. Unten links sitzt die Anheftung, unten rechts das
   Schloss, in der Mitte Glyph und Stufe — oben rechts ist die einzige Ecke, die
   an einem kaufbaren Knoten nie belegt ist. Der Bedingungskranz steht zwar auf
   dem oberen Bogen, aber nur an GESPERRTEN Knoten, und die tragen nie eine
   NEU-Marke. Ausserhalb des Kreises lag einmal der Best-Buy-Ring (`inset: -7px`);
   er ist gefallen, und damit ist die Ecke ganz frei.

   Der SITZ ist prozentual: `.node-circle--spot` skaliert den Kreis samt Kindern
   auf 1,22, und eine Pixelzahl liefe dabei aus der Geometrie. Das MASS dagegen
   MUSS eine Pixelzahl sein — `ShopReadyBadge` rechnet daraus Rundung und
   Schriftgrad, und ein Prozentwert wäre in `border-radius` und `font-size`
   jedes Mal etwas anderes. Es kommt deshalb inline vom Element
   (`freshBadgePx`, aus derselben Tabelle wie `nodePx`) und skaliert über den
   Kreis mit, nicht über sich selbst.

   `pointer-events: none` überschreibt das `auto` der Komponente: der Kreis ist
   die Klickfläche, und ein totes Loch in seiner Ecke wäre der teuerste
   Fehlklick des Baums. Doppelter Selektor, weil die Komponente ihr `auto` mit
   gleicher Spezifität setzt. */
.node-fresh-badge.node-fresh-badge {
  --sbadge-top: -3%;
  --sbadge-right: -3%;
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

/* Freigeschaltet, nie gekauft. Hier stand ein azurner Rand mit Schein bei
   Deckkraft 0,85 — und das war der eigentliche Grund, warum der Baum beim
   Öffnen nicht zu lesen war: im frischen Spielstand ist `empty` die MEHRHEIT
   der Knoten, und die Mehrheit leuchtete lauter als das, was man kaufen kann.
   Hervorheben trägt nicht, solange die Gegenseite gleich laut bleibt.

   Azur ist ausserdem die Farbe der NEU-Marke in der Ecke und darf nicht zweimal
   etwas bedeuten. Was ein leerer Knoten von einem angefangenen unterscheidet,
   sagt weiterhin der Stufen-Chip: `0/6` gegen `3/6`. */
.node-circle--empty {
  border-color: #5c4520;
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

/* ── OFFEN, ABER ES REICHT NICHT ──────────────────────────────────
   Die Gegenseite, und der Grund, warum die Unterscheidung überhaupt trägt.
   Dieselbe Aussage wie `.fut-row--short` an der Zeile drüben.

   KEIN `opacity` am Kreis, und das ist hier kein Feinschliff: sie vererbt sich
   multiplikativ auf jedes Kind (siehe `--locked` weiter oben), UND `--dim`
   setzt beim Spotlight bereits eine am selben Element. Beide zusammen stünden
   bei 0,45 × 0,3 — der Knoten wäre praktisch weg, statt nur zurückgetreten.

   Zurück tritt deshalb genau das, was keine Auskunft trägt: das Glyph als
   grösstes Element des Kreises, der Stufen-Chip eine Spur, und der Schein ganz.
   Der RAND bleibt sichtbar — er ist die Form des Netzes, und die soll man beim
   Planen weiter ablesen können. `filter: grayscale()` ist ein statischer
   Zustand, keine laufende Animation (Performance-Regel 2). */
.node-circle--short {
  border-color: #3e3020;
}

.node-circle--short .node-glyph {
  opacity: 0.38;
  filter: grayscale(70%);
}

.node-circle--short .node-level {
  opacity: 0.45;
}

.node-circle--short .node-glow {
  opacity: 0;
}

/* ── BEREIT ───────────────────────────────────────────────────────
   Grün, nicht mehr Gold. Zwei Gründe: „Kaufbar / Aktiv → Grün" ist die
   Hausfarbe, und die Liste rechts sagt es seit jeher so (`.fut-row--ready`) —
   im Skill-Tree-Reiter stehen beide gleichzeitig im Bild. Gold gehört damit allein
   `--maxed`, was den Baum ein zweites Mal entzerrt: bis dahin hiess dieselbe
   Farbe „kannst du kaufen" und „ist fertig". */
/* Und der GRUND wechselt mit. Hier lag `#111008` wie unter jedem anderen
   Zustand auch — kaufbar und zu teuer unterschieden sich allein am Rand, das
   Innere war bei beiden dasselbe dunkle Loch. Ein Kreis, der bereitsteht, sah
   aus wie ein umrandetes Nichts.

   ZWEI Ebenen in EINEM statischen `background`, und die Reihenfolge trägt die
   Aussage: unten der grüne Verlauf — dieselbe Farbe, mit der `.fut-row--ready`
   drüben in der Liste „kaufbar" sagt —, darüber ein Schimmer in der EIGENEN
   Farbe des Upgrades. Die Gruppe hebt sich als Ganzes ab, und der einzelne
   Knoten sieht trotzdem nach sich selbst aus.

   Warum der Schimmer bei 30 %/24 % sitzt und bei 68 % ausgelaufen ist, und
   nicht flächig liegt: das Glyph in der Mitte trägt DIESELBE Farbe
   (`:style="{ color: node.color }"`), und die Knotenfarben sind hell und
   gesättigt — `#e8c040`, `#7bb8ff`, `#ff9a5c`. Ein flächiger Ton schluckte das
   Motiv. Der versetzte Mittelpunkt löst das über die GEOMETRIE statt über eine
   dünnere Farbe: wo das Glyph steht, ist der Grund wieder dunkelgrün.

   Die Innenkante gibt dem Kreis Körper — der obere Lichtsaum als Bogen, der
   Ring als Abschluss. Beides statisch; `.node-circle` hat bereits eine
   Transition auf `box-shadow`, die den einmaligen Umschlag trägt.
   `background` steht ABSICHTLICH nicht in dieser Transition: ein überblendeter
   Verlauf rasterte jeden Frame neu (Performance-Regel 2). */
/* EIN KÖRPER, EINE FARBE. Der Rahmen stand auf Grün, der Grund schimmerte in
   der Farbe des Upgrades — zwei Farben an einem Kreis, die nichts miteinander
   zu tun hatten. Jetzt tragen Rand, Grund, Schein und die hineinführende Kante
   alle `--node-color`; der Grund ist buchstäblich derselbe Ton wie der Rahmen,
   nur bis nahe an Schwarz heruntergemischt.

   Was dadurch VERSCHWINDET, ist Grün als Aussage am Kreis — und das ist kein
   Verlust, sondern der eigentliche Gewinn: der Unterschied zwischen kaufbar und
   zu teuer liegt nicht mehr im Farbton (grün gegen braun), sondern in der
   SÄTTIGUNG. Lebendig gegen ausgeblichen trägt über alle fünfzehn Knotenfarben
   hinweg, ein einzelner Farbton tut das nie.

   „Kaufbar" bleibt trotzdem eindeutig: die Sättigung trägt es über alle
   fünfzehn Knotenfarben. Drei Zeichen standen hier einmal daneben und sind
   gefallen — das grüne Blitz-Abzeichen, der azurne Rand der frischen Knoten und
   zuletzt der grüne Best-Buy-Ring. Die ersten beiden besetzten die Ecke, die
   jetzt der NEU-Marke gehört, und der Rand übermalte obendrein die Farbe, an
   der man den Knoten überhaupt erkennt.

   Die Anteile — 38 % im Schimmer, 16 % und 7 % im Grund — sind gemessen, nicht
   geschätzt: das Glyph in der Mitte trägt DIESELBE Farbe bei voller Sättigung.
   Der Schimmer sitzt deshalb weiter oben links und läuft bei 70 % aus; wo das
   Motiv steht, ist der Grund fast schwarz. */
.node-circle--ready {
  border-color: var(--node-color, #6ec040);
  background:
    radial-gradient(
      circle at 30% 24%,
      color-mix(in srgb, var(--node-color, #6ec040) 38%, transparent) 0%,
      transparent 70%
    ),
    linear-gradient(
      158deg,
      color-mix(in srgb, var(--node-color, #6ec040) 16%, #14120a) 0%,
      color-mix(in srgb, var(--node-color, #6ec040) 7%, #100e07) 74%
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 0 0 1px color-mix(in srgb, var(--node-color, #6ec040) 30%, transparent);
}

/* Der Schein eines kaufbaren Knotens steht STILL.
 *
 * Er hat einmal geatmet, und bei 95 Knoten ging das noch. Im Netz sind es 155,
 * im Spaetspiel sind davon bis zu 90 gleichzeitig kaufbar — und 90 laufende
 * Keyframes waren im Orbit schon einmal die gemessene Ursache eines Rucklers
 * (`docs/performance.md`, Regel: „und wenn es viele sind?").
 *
 * Der Verzicht kostet nichts, er gewinnt sogar: was ueberall blinkt, hebt
 * nichts hervor. Im Knotenfeld atmet seitdem nur noch der Spotlight-Ring — der
 * Best-Buy-Ring stand einmal daneben und ist ersatzlos gefallen. */
.node-circle--ready .node-glow {
  box-shadow: 0 0 22px color-mix(in srgb, var(--node-color, #6ec040) 78%, transparent);
  opacity: 0.72;
}

/* Hier atmete zuletzt der FRISCH aufgegangene Knoten, in Azur. Beides ist
   gefallen — die Atmung und die Farbe —, weil ein frischer Knoten kein eigenes
   Aussehen mehr hat: er sieht aus wie ein kaufbarer, und was ihn auszeichnet,
   steht als Marke in seiner Ecke (`ShopReadyBadge`).
   Der Grund stand im Bild: das Motiv eines Knotens ist seine Farbe — pink,
   bernstein, grün —, und ein azurner Rand darum überschrieb genau die eine
   Auskunft, an der man ihn im Netz wiedererkennt. Eine Zustandsmeldung darf
   nicht die Identität übermalen.

   Im Knotenfeld läuft damit gar kein `node-glow` mehr; die Ebene trägt nur noch
   den statischen Ready-Schein darüber. Die einzige atmende Ebene des Baums ist
   der Spotlight-Ring (`node-spot-breathe`) — eine, nie mehr. */

/* Beim Zeigen hebt der ganze Kreis an, nicht nur sein Rand: derselbe Aufbau,
   eine Stufe heller. Der Schimmer darf hier weiter aufdrehen (42 statt 30) —
   unter dem Zeiger steht immer nur EIN Knoten, und der Tooltip daneben nennt
   das Motiv ohnehin im Klartext. */
/* Unter dem Zeiger steht immer nur EIN Knoten — der darf weiter aufdrehen.
   Der Rand wird zu Weiss hin aufgehellt statt in eine andere Farbe zu kippen:
   heller ist dieselbe Farbe, ein anderer Ton wäre eine andere Aussage. */
.node-circle--ready:hover {
  transform: scale(1.12);
  border-color: color-mix(in srgb, var(--node-color, #6ec040) 72%, #ffffff);
  background:
    radial-gradient(
      circle at 30% 24%,
      color-mix(in srgb, var(--node-color, #6ec040) 50%, transparent) 0%,
      transparent 72%
    ),
    linear-gradient(
      158deg,
      color-mix(in srgb, var(--node-color, #6ec040) 24%, #17150c) 0%,
      color-mix(in srgb, var(--node-color, #6ec040) 11%, #131108) 74%
    );
}

/* Beim Zeigen steht der Schein voll. (Hier stand zusätzlich `animation: none` —
   gegen den Atem der frischen Knoten, den es nicht mehr gibt.) */
.node-circle--ready:hover .node-glow {
  opacity: 1;
}

/* Gedeckelt — wartet auf seine vier Geschwister, ist also nicht gesperrt und
   trägt kein Schloss. Er tritt zurück wie ein `--short`, und aus demselben
   Grund an den KINDERN: hier stand `opacity: 0.6` am Kreis, und die traf beim
   Spotlight ein zweites Mal auf `--dim` (0,3). Zusammen 0,18 — ein gedeckelter
   Kernstrahl war praktisch weg, sobald der Zeiger irgendwo im Baum stand.
   `--dim` ist jetzt die einzige Deckkraft am Kreis. */
.node-circle--capped {
  border-color: #4a3010;
  cursor: not-allowed;
}

.node-circle--capped .node-glyph {
  opacity: 0.42;
  filter: grayscale(60%);
}

.node-circle--capped .node-level {
  opacity: 0.5;
}

.node-circle--maxed {
  border-color: #c89040;
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.5), 0 0 20px rgba(232, 192, 64, 0.2);
  cursor: default;
}

/* ══════════════════════════════════════════════════
   HOVER-SPOTLIGHT
══════════════════════════════════════════════════ */
/* Der Knoten unter dem Zeiger — gleich ob hier oder in der Liste rechts —
   wächst, atmet in seiner Leitfarbe und bekommt einen einmaligen Ping; die
   übrigen vierundzwanzig treten zurück.

   Der Ring ist eine EIGENE Ebene mit STATISCHEM Schein, animiert werden nur
   `opacity` und `transform` (Performance-Regel 11). Ein pulsender `box-shadow`
   am Kreis rasterte ihn samt Schatten in jedem Frame neu. Eine eigene Ebene
   bleibt er auch, seit auf `.node-glow` nichts mehr läuft: dort hängt die
   Ruhe-Deckkraft des Kaufbar-Scheins, und ein Keyframe darauf schriebe sie in
   jedem Frame neu — die Zustände `--spot`, `--req` und `--dim` könnten sie dann
   nicht mehr setzen. */
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

/* Der WEG — die dritte und leiseste Rolle im Spotlight.

   KEINE Ringlinie, und das ist die eine Entscheidung, die hier trägt: eine
   Linie am Kreis heisst im Baum entweder „das ist gemeint“ (`.node-spot`,
   Eigenfarbe, atmet) oder „das ist Voraussetzung“ (`.node-req`, grün oder
   rot). Ein dritter Ring in der Zielfarbe stand daneben — und bei einem grünen
   Ziel behauptete er „erfüllt“ an einem Knoten, der damit nichts zu tun hat.
   Der Weg ist deshalb LICHT: derselbe Ton wie die Kante, die durch ihn
   hindurchläuft, nur als Nimbus.

   Die Welle läuft GENAU EINMAL je Fokus, von der Sonne nach aussen: höchstens
   sieben Ebenen (`FORGE_SPOTLIGHT_MAX_LIMBS`), animiert werden nur `opacity` und
   `transform`, die Scheine sind statisch (Performance-Regel 2 und 11). Ein
   Dauerläufer bräche die Zusage, dass im Knotenfeld nur der Spotlight-Ring
   atmet. */
.node-trail {
  position: absolute;
  inset: v-bind(trailInset);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--trail-color, #e8c040) 30%, transparent) 0%,
    transparent 70%
  );
  box-shadow:
    0 0 6px color-mix(in srgb, var(--trail-color, #e8c040) 70%, transparent),
    0 0 18px color-mix(in srgb, var(--trail-color, #e8c040) 40%, transparent);
  pointer-events: none;
  z-index: -1;
  opacity: 0;
  animation: node-trail-wave v-bind(trailWaveMs) ease-out var(--trail-delay, 0ms) 1 forwards;
}

@keyframes node-trail-wave {
  from { opacity: 0; transform: scale(0.72); }
  55%  { opacity: 1; transform: scale(1.14); }
  to   { opacity: 0.85; transform: scale(1); }
}

/* Zwischen `--dim` (0,3) und voll: der Weg ist beteiligt, aber nicht gemeint.
   Steht vor `--dim` und trifft nie mit ihm zusammen — `isDimmed()` schliesst
   die Kette aus. */
.node-circle--trail {
  opacity: v-bind(trailOpacity);
  transition-duration: 0.12s;
}

.node-circle--trail .node-glow {
  opacity: 0.55;
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

/* Und ihr Schein steht voll — genau wie bei `--spot`. Ein Voraussetzungsknoten
   ist MEISTENS kaufbar (das ist ja der Punkt) und soll dabei nicht auf den
   0,72 des Ruhezustands hängenbleiben. */
.node-circle--req .node-glow {
  opacity: 1;
}

/* ANGEHEFTET heisst: die Ansicht steht still — und der Ring auch. Im
   angehefteten Zustand läuft im ganzen Knotenfeld keine einzige Animation. */
.node-circle--pinned .node-spot {
  animation: none;
  opacity: 1;
}

/* Doppelt geschrieben, mit Absicht: `.node-circle--ready:hover` wiegt
   0,2,0 und hielte den Knoten sonst auf seinen 1,12 fest. Auf den Knoten zeigen
   und auf seine Karte zeigen sind EINE Geste — sie dürfen nicht zwei Größen
   ergeben. */
.node-circle.node-circle--spot {
  transform: scale(v-bind(spotScale));
  transition-duration: 0.12s;
}

/* Beim Spotlight steht der Kaufbar-Schein voll. Dieselbe Auflösung wie in
   `.node-circle--ready:hover .node-glow`, nur greift sie auch, wenn der Zeiger
   drüben auf der Karte steht. */
.node-circle--spot .node-glow {
  opacity: 1;
}

/* Ein Treffer steht voll da, auch wenn er gesperrt oder gedeckelt ist — sonst
   suchte man etwas und bekäme es bei 0,5 Deckkraft zurück. Steht VOR `--dim`:
   ein stehender Spotlight schlägt die Suche, sonst dämpfte er nichts mehr. */
.node-circle--hit {
  opacity: 1;
}

/* Zurücktreten. Klasse je Knoten, NICHT als geerbte Variable am Container
   (Performance-Regel 3). Steht nach `--locked` (0,5) und `--capped` (0,6) und
   gewinnt damit bei gleicher Spezifität über die Quellreihenfolge. */
.node-circle--dim {
  opacity: v-bind(spotDimOpacity);
  transition-duration: 0.12s;
}

/* Und ihr Schein tritt mit zurück. Er ATMETE hier einmal, und diese Regel war
   die Bremse dagegen; seit im Knotenfeld überhaupt kein Schein mehr atmet, ist
   sie nur noch das, was ihr Name sagt — Dämpfung. */
.node-circle--dim .node-glow {
  opacity: 0.25;
}

/* Der SUCHTREFFER. Eigener Ton, weil die drei belegten schon Bedeutung tragen:
   Gold heisst kaufbar, Grün erfüllt, Rot offen. Statischer Schein, keine
   Animation — bei einer Suche stehen leicht drei Dutzend Ringe gleichzeitig
   (Performance-Regel 2). */
.node-hit {
  position: absolute;
  inset: v-bind(ringInset);
  border-radius: 50%;
  border: 2px solid #40c8e0;
  box-shadow:
    0 0 12px rgba(64, 200, 224, 0.5),
    inset 0 0 6px rgba(64, 200, 224, 0.25);
  pointer-events: none;
  z-index: -1;
}


/* ══════════════════════════════════════════════════
   RINGFILTER — was der Chip oben nicht durchlässt
══════════════════════════════════════════════════ */
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
  .node-circle--ready .node-glow {
    animation: none;
    opacity: 1;
  }

  /* Dieselbe Falle wie oben, schärfer: der Ping trägt `forwards` und endete bei
     Deckkraft 0 — ohne das Zurücksetzen verschwände der ganze Spotlight-Ring. */
  .node-spot,
  .node-spot::after,
  .spot-limbs path {
    animation: none;
  }

  /* Dieselbe Falle beim Weg-Ring: seine Welle startet bei Deckkraft 0 und
     trägt `forwards`. */
  .node-trail {
    animation: none;
    opacity: 0.85;
  }

  /* Das Kantenfeld tritt weiter zurück, nur ohne Überblendung — der Zustand
     ist die Auskunft, die Bewegung dorthin war nur die Höflichkeit. */
  .limb-field {
    transition: none;
  }

  /* Die Kamerafahrt ist die grösste Bewegung dieser Fläche — der ganze Baum
     wandert. Sie findet weiterhin statt, nur eben sofort: das Ziel ist die
     Auskunft, die Fahrt dorthin war die Höflichkeit.

     `!important` und sonst nichts: die Dauer steht INLINE am Element (sie
     wechselt mit der Strecke), und nur so kommt eine Regel aus dem Stylesheet
     dagegen an. Die einzige Stelle im Baum, an der das nötig ist. */
  .tree-stage {
    transition-duration: 0s !important;
  }

  /* Und dieselbe Falle beim Kompass: seine Einblendung startet bei Deckkraft 0
     und trägt `forwards` — bliebe sie nur abgeschaltet, wäre der Zeiger
     unsichtbar statt ruhig. */
  .tree-compass-arrow {
    animation: none;
    opacity: 1;
  }

  .node-spot {
    opacity: 1;
  }
}
</style>
