<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { useChampionLevelStore } from '@/stores/championLevelStore'
import { getChampionTier } from '@/config/championTiers'
import { regaliaStageFor, regaliaStageIndexFor } from '@/config/championLevels'
import { facetClipPath, studRingGradient } from '@/utils/geometry'
import { allySlotLabel } from '@/utils/format'
import ChampionLevelBadge from '../ChampionLevelBadge.vue'
import {
  ROLES,
  SIGIL_NODE_SIZE,
  SIGIL_ALLY_SIZE,
  SIGIL_SWORN_SIZE,
  SIGIL_NODE_BADGE_INSET,
  SIGIL_NODE_NAME_OFFSET,
  SIGIL_NODE_NAME_MAX_WIDTH,
  SIGIL_PENTAGON_ANGLE_STEP,
  SIGIL_PENTAGON_START_ANGLE,
  SWORN_ALLY_COUNT,
  SIGIL_SWORN_FACETS,
  SIGIL_SWORN_FACET_TURN,
  SIGIL_SWORN_RIM_PX,
  SIGIL_SWORN_GLOW_PX,
  ALLIES_PER_ROLE,
  SIGIL_ALLY_HOVER_SCALE,
  SIGIL_ALLY_HOVER_DIM_OPACITY,
  SIGIL_ALLY_HOVER_PING_MS,
  SIGIL_XP_RING_RADIUS,
  SIGIL_XP_RING_CIRCUMFERENCE,
  SIGIL_XP_RING_INSET,
  CHAMPION_REGALIA_SIZE_NODE,
  CHAMPION_REGALIA_SIZE_ALLY,
  SIGIL_FRAME_RIM_BASE,
  SIGIL_FRAME_RIM_STEP,
  SIGIL_FRAME_RIM_ALPHA_BASE,
  SIGIL_FRAME_RIM_ALPHA_STEP,
  SIGIL_FRAME_GLOW_FACTOR,
  SIGIL_FRAME_PLATE_MS,
  SIGIL_FRAME_PLATE2_OFFSET,
  SIGIL_FRAME_STUD_ARC_DEG,
  SIGIL_FRAME_SWEEP_MS,
  SIGIL_FRAME_HALO_MS,
  SIGIL_XP_STROKE_BASE,
  SIGIL_XP_STROKE_STEP,
} from '@/config/constants'
import type { SigilPoint } from '@/composables/useTeamSigil'
import type { ChampionArtSize } from '@/types'

const props = defineProps<{
  roleIndex: number
  point: SigilPoint
  allyPoints: SigilPoint[]
  selected: boolean
  full: boolean
  /** Die Satelliten kommen einen Frame nach dem Knoten — siehe
   *  TEAM_TAB_MOUNT_STAGE_*. Fünf Rollen × fünf Satelliten in einem Frame zu
   *  mounten ist der teuerste Einzelposten beim Öffnen des Tabs. */
  showAllies: boolean
  /** Regalia-Ornamente (Platten, Sweep, Nieten, Halo, Corona) — sie kommen als
   *  letzte Aufbaustufe, siehe TEAM_TAB_MOUNT_STAGE_ORNAMENTS. */
  showOrnaments: boolean
  /** Kunststufe für Knoten und Satelliten, vom Board aus dessen tatsächlichem
   *  Kameramaßstab bestimmt (championArtSizeFor). */
  nodeArtSize: ChampionArtSize
  allyArtSize: ChampionArtSize
  /** Champions spotlighted by the synergies search — hits pulse gold, the rest dims. */
  searchHighlights?: string[]
  /** Sub-slot hovered in the details panel — that satellite gets a spotlight, siblings dim. */
  hoveredAlly?: number | null
}>()

const emit = defineEmits<{
  select: []
  'select-ally': [subSlot: number]
  /** Hovered ally satellite — mirrored as a row highlight in the details panel. */
  'hover-ally': [subSlot: number | null]
}>()

const battleStore = useBattleStore()
// Pointing at a role node also marks that role in the command panel — same
// channel the battle tab's roster and the panel itself write to.
const uiStore = useUiStore()
const levelStore = useChampionLevelStore()
const { headerSlots, secondarySlots } = storeToRefs(battleStore)

const roleDef = computed(() => ROLES[props.roleIndex])
const main = computed(() => headerSlots.value[props.roleIndex])
const mainImage = computed(() =>
  // Die Stufe kommt vom Board, das als Einziges den Kameramaßstab kennt: auf
  // Full HD ist der Knoten ~60 px groß, auf 4K über 200 px.
  main.value ? battleStore.getChampionImage(main.value, { size: props.nodeArtSize }) : '',
)
const tier = computed(() => (main.value ? getChampionTier(main.value) : null))
const allies = computed(
  () => secondarySlots.value[props.roleIndex] ?? Array<string | null>(ALLIES_PER_ROLE).fill(null),
)

function allyImage(ally: string | null): string {
  return ally ? battleStore.getChampionImage(ally, { size: props.allyArtSize }) : ''
}

// ── Sworn allies ─────────────────────────────────────────────────────────────
// The first SWORN_ALLY_COUNT sub-slots lend the main a share of their own stats,
// so they ride an inner orbit, are drawn larger and are tied to the node by a
// bond line. Everything below is derived from the sub-slot index, so the split
// moves with the constant instead of being spelled out twice.
function isSworn(sub: number): boolean {
  return sub < SWORN_ALLY_COUNT
}
function allySize(sub: number): number {
  return isSworn(sub) ? SIGIL_SWORN_SIZE : SIGIL_ALLY_SIZE
}
/** Seat name — shared with the details header and the picker, see allySlotLabel. */
function allyLabel(sub: number): string {
  return allySlotLabel(sub)
}

/**
 * The sworn silhouette. Constant for every sworn slot on the board, so the
 * polygon is built once when the module loads rather than per node — and it goes
 * into the CSS as a value, not into the template as an element: the distinction
 * costs zero DOM, and the clip is applied at paint time on layers that never
 * animate.
 */
const swornFacets = facetClipPath(SIGIL_SWORN_FACETS, SIGIL_SWORN_FACET_TURN)
const swornRim = `${SIGIL_SWORN_RIM_PX}px`
const swornGlow = `${SIGIL_SWORN_GLOW_PX}px`

/**
 * Unit vector pointing from this role node at the sigil's core. The name plate
 * rides it inward — the half that can never hold a satellite — and the medallion
 * rides it outward, into the gap the sworn pair leaves open on the radial itself.
 */
const inward = computed(() => {
  const deg = SIGIL_PENTAGON_START_ANGLE + props.roleIndex * SIGIL_PENTAGON_ANGLE_STEP + 180
  const rad = (deg * Math.PI) / 180
  return { x: Math.cos(rad), y: Math.sin(rad) }
})
const decorVars = computed<Record<string, string>>(() => ({
  // One axis, two ends: the name plate rides the inward radial, the medallion the
  // outward one. Whatever angle the pentagon gives a role, plate and badge stay
  // exactly opposite each other across the portrait — see SIGIL_NODE_BADGE_INSET.
  '--badge-x': `${(-inward.value.x * SIGIL_NODE_BADGE_INSET).toFixed(1)}px`,
  '--badge-y': `${(-inward.value.y * SIGIL_NODE_BADGE_INSET).toFixed(1)}px`,
  '--name-x': `${(inward.value.x * SIGIL_NODE_NAME_OFFSET).toFixed(1)}px`,
  '--name-y': `${(inward.value.y * SIGIL_NODE_NAME_OFFSET).toFixed(1)}px`,
  '--name-max': `${SIGIL_NODE_NAME_MAX_WIDTH}px`,
}))

// ── Search spotlight ─────────────────────────────────────────────────────────
const searchActive = computed(() => (props.searchHighlights?.length ?? 0) > 0)
const searchSet = computed(() => new Set(props.searchHighlights ?? []))
const mainHit = computed(() => main.value !== null && searchSet.value.has(main.value))

function allyHit(ally: string | null): boolean {
  return ally !== null && searchSet.value.has(ally)
}

// ── Ally-hover spotlight (details panel row → board satellite) ──────────────
const hoverActive = computed(() => props.hoveredAlly !== null && props.hoveredAlly !== undefined)
const hoverScale = String(SIGIL_ALLY_HOVER_SCALE)
const hoverDimOpacity = String(SIGIL_ALLY_HOVER_DIM_OPACITY)
const hoverPingMs = `${SIGIL_ALLY_HOVER_PING_MS}ms`

// The XP ring is inset negatively so it clears the portrait's own 3px halo.
const xpRingInsetPct = `${SIGIL_XP_RING_INSET}%`
const xpRingSizePct = `${100 - SIGIL_XP_RING_INSET * 2}%`

function nodeStyle(point: SigilPoint, size: number): Record<string, string> {
  return {
    left: `${point.x}px`,
    top: `${point.y}px`,
    width: `${size}px`,
    height: `${size}px`,
  }
}

// ── Champion levels ──────────────────────────────────────────────────────────
// Every node wears its level: the main gets an XP arc tracing its rim plus a
// large numeral, allies get a compact one. Everything on a node carries that
// champion's single colour — its role colour — so a slot reads as one identity
// instead of a patchwork of role, rank and tier hues.
function levelOf(name: string): number {
  return levelStore.levelOf(name)
}
/** Length of the drawn XP arc along the ring, in SVG user units. */
function xpDashOf(name: string): number {
  return levelStore.xpBarOf(name).pct * SIGIL_XP_RING_CIRCUMFERENCE
}
function needsAttentionOf(name: string): boolean {
  return levelStore.needsAttention(name)
}
/**
 * The arc's number, spelled out. Read once per node instead of per template
 * expression — every one of these getters is a function getter, so Pinia hands
 * back an uncached closure and each call walks the champion's progress again.
 */
const mainXp = computed(() => (main.value ? levelStore.xpBarOf(main.value) : null))
const mainAttention = computed(() => (main.value ? needsAttentionOf(main.value) : false))
/** Enough banked for the next level — the chip switches to the buyable green. */
const mainXpReady = computed(() => !!mainXp.value && !mainXp.value.capped && mainXp.value.pct >= 1)

// ── Portrait frame ───────────────────────────────────────────────────────────
// The frame climbs the same regalia ladder as the medallion — one stage every
// five levels, i.e. every ascension star — so a champion's rank is readable from
// the shape of its slot alone, without ever leaving its role colour. Each stage
// adds one element on top of the numbers that keep climbing: plate (5), studs
// (10), sweep (15), star plate (20), polished bevel (30), halo (35), and at the
// apex the plates turn. An empty slot wears the first stage, exactly the frame
// it had before.
//
// Cost: every added layer is a single composited element. Only sweep, halo and
// the apex spin animate, all transform/opacity — up to the starting cap that is
// one animated layer per node, five on a full board.
const mainLevel = computed(() => (main.value ? levelStore.levelOf(main.value) : 1))
const mainStage = computed(() => regaliaStageFor(mainLevel.value))
const mainStageIndex = computed(() => (main.value ? regaliaStageIndexFor(mainLevel.value) : 0))

const frameVars = computed<Record<string, string>>(() => {
  const stage = mainStage.value
  return {
    '--node-rim': `${SIGIL_FRAME_RIM_BASE + stage.rim * SIGIL_FRAME_RIM_STEP}px`,
    // an empty slot keeps the old faint ring; every stage above it firms up
    '--node-rim-a': `${Math.min(100, SIGIL_FRAME_RIM_ALPHA_BASE + mainStageIndex.value * SIGIL_FRAME_RIM_ALPHA_STEP)}%`,
    '--node-heat': `${Math.round(stage.heat * 100)}%`,
    '--node-glow': `${Math.round(stage.glow * SIGIL_FRAME_GLOW_FACTOR)}px`,
    '--node-glow-a': `${Math.round(stage.glowAlpha * 100)}%`,
    '--node-facets': facetClipPath(stage.facets),
    // half a corner off the first plate — two hexagons become a twelve-point star
    '--node-facets-2': facetClipPath(stage.facets, SIGIL_FRAME_PLATE2_OFFSET),
    '--node-studs': studRingGradient(stage.studs, SIGIL_FRAME_STUD_ARC_DEG),
    '--node-plate-ms': `${SIGIL_FRAME_PLATE_MS}ms`,
    '--node-sweep-ms': `${SIGIL_FRAME_SWEEP_MS}ms`,
    '--node-halo-ms': `${SIGIL_FRAME_HALO_MS}ms`,
    '--xp-w': String(SIGIL_XP_STROKE_BASE + mainStageIndex.value * SIGIL_XP_STROKE_STEP),
  }
})
</script>

<template>
  <!-- ally satellites (behind the role node) -->
  <button
    v-for="(ally, sub) in showAllies ? allies : []"
    :key="`ally-${roleIndex}-${sub}`"
    class="sigil-ally"
    :class="{
      'sigil-ally--sworn': isSworn(sub),
      'sigil-ally--filled': !!ally,
      'sigil-ally--highlight': selected,
      'sigil-ally--search-hit': allyHit(ally),
      'sigil-ally--search-miss': searchActive && !allyHit(ally),
      'sigil-ally--spotlight': hoveredAlly === sub,
      'sigil-ally--dimmed': hoverActive && hoveredAlly !== sub,
    }"
    :style="[
      nodeStyle(allyPoints[sub], allySize(sub)),
      { '--role-color': roleDef.color, '--sub': String(sub) },
    ]"
    :title="ally ?? `${roleDef.label} — ${allyLabel(sub)}`"
    :aria-label="
      ally ? `${ally} (${allyLabel(sub)})` : `Assign ${allyLabel(sub)} for ${roleDef.label}`
    "
    @click.stop="emit('select-ally', sub)"
    @mouseenter="emit('hover-ally', sub)"
    @mouseleave="emit('hover-ally', null)"
  >
    <!-- decoding="async": ein Portrait darf das Zeichnen des Frames nie
         aufhalten — es erscheint lieber einen Frame später als dass der ganze
         Tab darauf wartet -->
    <img
      v-if="ally"
      :src="allyImage(ally)"
      :alt="ally"
      class="sigil-ally-img"
      decoding="async"
    />
    <span v-else class="sigil-ally-plus">＋</span>
    <!-- No bond mark: a sworn satellite is told apart by its SHAPE (see the
         cut-plate block in the styles), which needs no element of its own. -->
    <!-- ally level — the same medallion as the role node, minus the ornaments
         it has no room for (see CHAMPION_REGALIA_ORNAMENT_MIN_SIZE) -->
    <span v-if="ally" class="sigil-ally-level">
      <ChampionLevelBadge
        :level="levelOf(ally)"
        :color="roleDef.color"
        :size="CHAMPION_REGALIA_SIZE_ALLY"
        :attention="needsAttentionOf(ally)"
      />
    </span>
  </button>

  <!-- role node -->
  <button
    class="sigil-node"
    :class="{
      'sigil-node--selected': selected,
      'sigil-node--full': full,
      'sigil-node--search-hit': mainHit,
      'sigil-node--search-miss': searchActive && !mainHit,
      'sigil-node--bevel': !!main && mainStage.bevel,
      'sigil-node--spin': !!main && mainStage.spin,
    }"
    :style="[
      nodeStyle(point, SIGIL_NODE_SIZE),
      { '--role-color': roleDef.color },
      frameVars,
      decorVars,
    ]"
    :aria-label="main ? `${main} (${roleDef.label})` : `Assign a champion for ${roleDef.label}`"
    @click.stop="emit('select')"
    @mouseenter="uiStore.setHoveredChampionSlotIndex(roleIndex)"
    @mouseleave="uiStore.setHoveredChampionSlotIndex(null)"
    @focus="uiStore.setHoveredChampionSlotIndex(roleIndex)"
    @blur="uiStore.setHoveredChampionSlotIndex(null)"
  >
    <!-- ── regalia frame ── back to front: corona, the cut metal plates, the
         sweeping highlight, then the studs riding on top of it. Everything here
         sits behind the XP arc, the aura and the portrait. -->
    <template v-if="showOrnaments">
      <span v-if="main && mainStage.halo" class="sigil-node-halo" aria-hidden="true" />
      <span
        v-if="main && mainStage.plate2"
        class="sigil-node-plate sigil-node-plate--star"
        aria-hidden="true"
      />
      <span v-if="main && mainStage.facets > 0" class="sigil-node-plate" aria-hidden="true" />
      <span v-if="main && mainStage.sweep" class="sigil-node-sweep" aria-hidden="true" />
      <span v-if="main && mainStage.studs > 0" class="sigil-node-studs" aria-hidden="true" />

      <span v-if="full" class="sigil-node-aura" aria-hidden="true" />
      <span v-if="full" class="sigil-node-conic" aria-hidden="true" />
    </template>

    <!-- XP arc — traces the node's rim in the champion's ascension rank color,
         so progress toward the next level reads at a glance across the board -->
    <svg
      v-if="main"
      class="sigil-node-xp"
      :class="{ 'sigil-node-xp--attention': mainAttention }"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle class="sigil-node-xp-track" cx="50" cy="50" :r="SIGIL_XP_RING_RADIUS" />
      <circle
        class="sigil-node-xp-fill"
        cx="50"
        cy="50"
        :r="SIGIL_XP_RING_RADIUS"
        :stroke="roleDef.color"
        :stroke-dasharray="`${xpDashOf(main)} ${SIGIL_XP_RING_CIRCUMFERENCE}`"
      />
    </svg>

    <span class="sigil-node-circle">
      <img v-if="main" :src="mainImage" :alt="main" class="sigil-node-img" decoding="async" />
      <span v-else class="sigil-node-empty">
        <img :src="roleDef.image" :alt="roleDef.label" class="sigil-node-role-ghost" />
      </span>
      <span v-if="main && tier" class="sigil-node-star">★{{ tier.starLevel }}</span>
    </span>

    <!-- level medallion — the headline number, seated on the node's outward rim,
         directly across the portrait from the name plate -->
    <span v-if="main" class="sigil-node-level">
      <ChampionLevelBadge
        :level="levelOf(main)"
        :color="roleDef.color"
        :size="CHAMPION_REGALIA_SIZE_NODE"
        :attention="mainAttention"
      />
    </span>

    <!-- name plate — two lines on one plate: who sits here, and what the XP arc
         around the portrait is currently drawing. One plate rather than two
         anchors, see SIGIL_NODE_NAME_OFFSET. Static markup, no per-frame work. -->
    <span class="sigil-node-name">
      <span class="sigil-node-name-text">{{ main ?? roleDef.label }}</span>
      <span v-if="mainXp" class="sigil-node-xp-num" :class="{ 'is-ready': mainXpReady }">
        <template v-if="mainXp.capped">
          <span class="sigil-node-xp-cur">{{ $formatNumber(mainXp.current) }}</span>
          <span class="sigil-node-xp-unit">banked</span>
        </template>
        <template v-else>
          <span class="sigil-node-xp-cur">{{ $formatNumber(mainXp.current) }}</span>
          <span class="sigil-node-xp-sep">/</span>
          <span class="sigil-node-xp-max">{{ $formatNumber(mainXp.needed) }}</span>
          <span class="sigil-node-xp-unit">XP</span>
        </template>
      </span>
    </span>
  </button>
</template>

<style scoped>
/* ── ally satellites ── */
.sigil-ally {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0;
  border: none;
  border-radius: 50%;
  /* NOT overflow:hidden — the level badge overhangs the rim by design. The
     portrait does its own round cropping instead. */
  cursor: pointer;
  background: rgba(10, 7, 4, 0.75);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--role-color) 40%, transparent);
  z-index: 1;
  transition:
    transform 0.15s,
    box-shadow 0.2s,
    opacity 0.25s,
    filter 0.25s;
  /* constellation feel: each satellite reacts with a slight cascade */
  transition-delay: calc(var(--sub, 0) * 25ms);
}
.sigil-ally--filled {
  background: #0a0704;
  box-shadow:
    0 0 0 2px var(--role-color),
    0 0 12px color-mix(in srgb, var(--role-color) 50%, transparent);
}
/* Sworn satellites keep the closer orbit and the larger size; everything that
   makes them read as cut plates rather than discs lives in its own block below
   ("sworn: cut plate"), placed after the state rules it has to override. */

/* selected role: its ally constellation lights up with it (cascade via --sub delay) */
.sigil-ally--highlight {
  transform: translate(-50%, -50%) scale(1.12);
  background: #0a0704;
  box-shadow:
    0 0 0 2px var(--role-color),
    0 0 16px color-mix(in srgb, var(--role-color) 65%, transparent);
  z-index: 2;
}
.sigil-ally--highlight .sigil-ally-plus {
  opacity: 1;
}
.sigil-ally:hover {
  transform: translate(-50%, -50%) scale(1.15);
}
.sigil-ally-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
  border-radius: 50%;
}
.sigil-ally-plus {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  color: var(--role-color);
  opacity: 0.85;
}

/* ally medallion — bottom-right of the satellite, overlapping its rim. The
   wrapper only places it; size, metal and motion belong to the badge. */
.sigil-ally-level {
  position: absolute;
  right: -3px;
  bottom: -3px;
  display: flex;
  pointer-events: none;
  z-index: 3;
}

/* ── role node ── */
.sigil-node {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 2;
  transition:
    transform 0.18s,
    opacity 0.25s,
    filter 0.25s;
}
.sigil-node--selected {
  transform: translate(-50%, -50%) scale(1.12);
  z-index: 3;
}
.sigil-node:hover {
  transform: translate(-50%, -50%) scale(1.08);
}
.sigil-node--selected:hover {
  transform: translate(-50%, -50%) scale(1.12);
}

/* full-role escalation: pulsing ring + spinning conic glow */
.sigil-node-aura {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120%;
  height: 120%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid var(--role-color);
  pointer-events: none;
  animation: sigil-aura 2.3s ease-in-out infinite;
}
.sigil-node--selected .sigil-node-aura {
  animation-duration: 1.5s;
}
.sigil-node-conic {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 132%;
  height: 132%;
  border-radius: 50%;
  /* Der Verlauf blendet an beiden Enden ohnehin nach transparent aus — ein
     zusätzlicher blur(1px) hätte hier nichts weich gemacht, was nicht schon
     weich war, aber jede Umdrehung einen Filterdurchlauf gekostet, fünfmal
     gleichzeitig und ohne Unterlass. */
  background: conic-gradient(
    from 0deg,
    transparent,
    color-mix(in srgb, var(--role-color) 80%, transparent),
    transparent 62%
  );
  opacity: 0.7;
  pointer-events: none;
  animation: sigil-conic 9s linear infinite;
}
.sigil-node--selected .sigil-node-conic {
  animation-duration: 6s;
}

/* XP arc — a ring just outside the portrait, drawn clockwise from 12 o'clock */
.sigil-node-xp {
  position: absolute;
  left: v-bind(xpRingInsetPct);
  top: v-bind(xpRingInsetPct);
  width: v-bind(xpRingSizePct);
  height: v-bind(xpRingSizePct);
  transform: rotate(-90deg);
  pointer-events: none;
  overflow: visible;
}
.sigil-node-xp-track {
  fill: none;
  stroke: rgba(10, 7, 4, 0.85);
  stroke-width: var(--xp-w, 3.2);
}
.sigil-node-xp-fill {
  fill: none;
  /* the arc thickens by one regalia stage at a time, in step with the frame */
  stroke-width: var(--xp-w, 3.2);
  stroke-linecap: round;
  transition: stroke-dasharray 0.35s ease-out;
  filter: drop-shadow(0 0 3px currentColor);
}
/* enough XP banked — the arc breathes until it is spent (same colour, more life) */
.sigil-node-xp--attention .sigil-node-xp-fill {
  stroke-width: calc(var(--xp-w, 3.2) + 1);
  animation: sigil-xp-breathe 1.9s ease-in-out infinite;
}

/* level medallion — the wrapper only places it; everything the badge looks like
   lives in ChampionLevelBadge. Medallion and name plate share ONE axis and sit at
   its two ends — see SIGIL_NODE_BADGE_INSET */
.sigil-node-level {
  position: absolute;
  left: calc(50% + var(--badge-x, 0px));
  top: calc(50% + var(--badge-y, 0px));
  transform: translate(-50%, -50%);
  display: flex;
  z-index: 4;
  pointer-events: none;
}

/* ── regalia frame ────────────────────────────────────────────────────────────
   All five layers share the node's centre and the same 134% footprint, so the
   frame grows in detail without ever growing past the ally satellites. Only the
   sweep, the halo and the apex spin animate, and all three animate transform or
   opacity only — no layout, no paint, no filter per frame. */

/* cut metal plate behind the portrait — the frame's own regalia stage */
.sigil-node-plate {
  position: absolute;
  left: 50%;
  top: 50%;
  /* wide enough that its edges clear the XP arc rather than crossing it */
  width: 134%;
  height: 134%;
  transform: translate(-50%, -50%);
  clip-path: var(--node-facets, none);
  background: color-mix(in srgb, var(--role-color) 52%, #0a0704);
  pointer-events: none;
}
.sigil-node-plate::after {
  content: '';
  position: absolute;
  inset: 2px;
  clip-path: var(--node-facets, none);
  background: linear-gradient(
    155deg,
    color-mix(in srgb, var(--role-color) 20%, #0a0704),
    #0a0704 62%,
    color-mix(in srgb, var(--role-color) 12%, #0a0704)
  );
}
/* Second plate, offset by half a corner and seated a little wider *behind* the
   first: only its points clear the front plate's flat edges, so the slot reads
   as a spiked star rather than as one more polygon. Wider is the whole point —
   140% still leaves the ally satellites their clearance. */
.sigil-node-plate--star {
  width: 140%;
  height: 140%;
  clip-path: var(--node-facets-2, none);
  background: linear-gradient(
    155deg,
    color-mix(in srgb, #fff 30%, var(--role-color)),
    var(--role-color) 46%,
    color-mix(in srgb, var(--role-color) 55%, #0a0704)
  );
}
/* the front plate carries the inner face; the spikes stay solid metal */
.sigil-node-plate--star::after {
  content: none;
}
/* Ascendant+ — the cast metal is polished: a lit top edge and a dark underside.
   Pure background swap on layers that already exist, so it costs nothing. */
.sigil-node--bevel .sigil-node-plate {
  background: linear-gradient(
    158deg,
    color-mix(in srgb, #fff 42%, var(--role-color)),
    var(--role-color) 40%,
    color-mix(in srgb, var(--role-color) 32%, #0a0704)
  );
}
.sigil-node--bevel .sigil-node-plate::after {
  background: linear-gradient(
    158deg,
    color-mix(in srgb, var(--role-color) 34%, #0a0704),
    #0a0704 58%,
    color-mix(in srgb, var(--role-color) 18%, #0a0704)
  );
}
/* apex only — the plates turn against each other, slowly enough to read as a
   mounted medal rather than as a spinner */
.sigil-node--spin .sigil-node-plate {
  animation: sigil-plate-turn var(--node-plate-ms, 34000ms) linear infinite;
}
.sigil-node--spin .sigil-node-plate--star {
  animation-direction: reverse;
}

/* highlight sweeping around the frame ring — the first motion a frame earns.
   Masked to the band between the XP arc and the plate corners, so it glints
   across the studs instead of washing over the portrait. */
.sigil-node-sweep {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 134%;
  height: 134%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    color-mix(in srgb, #fff 55%, var(--role-color)) 18deg,
    transparent 48deg,
    transparent 192deg,
    color-mix(in srgb, var(--role-color) 75%, transparent) 212deg,
    transparent 248deg
  );
  -webkit-mask-image: radial-gradient(
    closest-side,
    transparent 85%,
    #000 88%,
    #000 99%,
    transparent 100%
  );
  mask-image: radial-gradient(closest-side, transparent 85%, #000 88%, #000 99%, transparent 100%);
  opacity: 0.75;
  pointer-events: none;
  animation: sigil-frame-sweep var(--node-sweep-ms, 5600ms) linear infinite;
}

/* stud ring — one bolt per plate corner (same count, same start angle), seated
   on the plate tips. Static: a gradient masked to a band, painted once. */
.sigil-node-studs {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 134%;
  height: 134%;
  transform: translate(-50%, -50%);
  --stud-c: color-mix(in srgb, #fff 34%, var(--role-color));
  background: var(--node-studs, none);
  -webkit-mask-image: radial-gradient(
    closest-side,
    transparent 88%,
    #000 90%,
    #000 98.5%,
    transparent 100%
  );
  mask-image: radial-gradient(
    closest-side,
    transparent 88%,
    #000 90%,
    #000 98.5%,
    transparent 100%
  );
  pointer-events: none;
}

/* breathing corona behind the whole frame (Exalted+) — scale/opacity only.
   Kept on the same 134% footprint as everything else: it glows out through the
   gaps between the star plate's points instead of past the ally satellites. */
.sigil-node-halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 134%;
  height: 134%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--role-color) 30%, transparent) 40%,
    transparent 72%
  );
  pointer-events: none;
  animation: sigil-frame-halo var(--node-halo-ms, 3800ms) ease-in-out infinite;
}

.sigil-node-circle {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: #0a0704;
  /* ring width, colour heat and glow all climb with the champion's level */
  box-shadow:
    0 0 0 var(--node-rim, 3px)
      color-mix(
        in srgb,
        color-mix(in srgb, #fff var(--node-heat, 0%), var(--role-color)) var(--node-rim-a, 60%),
        transparent
      ),
    0 0 var(--node-glow, 12px) color-mix(in srgb, var(--role-color) var(--node-glow-a, 30%), transparent),
    0 4px 10px rgba(0, 0, 0, 0.55);
  transition:
    box-shadow 0.25s,
    filter 0.25s;
}
.sigil-node--selected .sigil-node-circle {
  box-shadow:
    0 0 0 calc(var(--node-rim, 3px) + 1px) color-mix(in srgb, #fff var(--node-heat, 0%), var(--role-color)),
    0 0 calc(var(--node-glow, 12px) * 2) color-mix(in srgb, var(--role-color) 80%, transparent),
    0 4px 12px rgba(0, 0, 0, 0.6);
}
.sigil-node-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
}
.sigil-node-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sigil-node-role-ghost {
  width: 64%;
  height: 64%;
  object-fit: contain;
  opacity: 0.55;
}
.sigil-node-star {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2px 0;
  text-align: center;
  background: rgba(0, 0, 0, 0.72);
  color: var(--role-color);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.1;
}
/* ── name plate ───────────────────────────────────────────────────────────────
   Two rows on one plate: the name, and beneath it the number the XP arc draws.
   The second row is the quieter one — the arc around the portrait is the
   headline, this only spells out how far along it is — but "quieter" is told
   through SIZE and WEIGHT, never through alpha. A 9px glyph faded to 50% on a
   near-black ground is not subtle, it is gone; every part of both rows therefore
   keeps a solid, fully opaque colour and only differs in lightness.

   The plate never inverts to a solid role-colour fill. Selecting a role opens
   the details panel, which squeezes the board into a narrow column — the caption
   renders around 7px there, and dark ink on a mid-saturation fill at that size
   is unreadable. Selection is told instead by a lit rail along the top edge, a
   brighter border and a role-coloured glow: still entirely the role's colour,
   but the type keeps the dark ground it needs. */
.sigil-node-name {
  position: absolute;
  left: calc(50% + var(--name-x, 0px));
  top: calc(50% + var(--name-y, 80px));
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: var(--name-max, 158px);
  padding: 2px 10px 3px;
  border-radius: 4px;
  /* near-opaque: the rune ring and the connector lines run right underneath */
  background: #0c0805;
  border: 1px solid color-mix(in srgb, var(--role-color) 72%, #0c0805);
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}
.sigil-node-name-text {
  max-width: 100%;
  font-size: 12px;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, #fff 16%, var(--role-color));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* XP row — hierarchy by size and weight, contrast held for all of it */
.sigil-node-xp-num {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 11px;
  line-height: 1.05;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sigil-node-xp-cur {
  font-weight: 800;
  color: color-mix(in srgb, #fff 42%, var(--role-color));
}
.sigil-node-xp-sep {
  color: color-mix(in srgb, var(--role-color) 60%, #8b8172);
}
.sigil-node-xp-max {
  color: var(--role-color);
}
.sigil-node-xp-unit {
  font-size: 8.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--role-color) 62%, #8b8172);
}
/* enough banked for the next level — the row goes to full brightness, the same
   moment the arc starts breathing and the medallion pings. No second colour. */
.sigil-node-xp-num.is-ready .sigil-node-xp-cur {
  color: color-mix(in srgb, #fff 62%, var(--role-color));
}
.sigil-node-xp-num.is-ready .sigil-node-xp-sep,
.sigil-node-xp-num.is-ready .sigil-node-xp-max,
.sigil-node-xp-num.is-ready .sigil-node-xp-unit {
  color: color-mix(in srgb, #fff 20%, var(--role-color));
}

/* selected: rail, brighter frame, role-coloured glow — the ground stays dark.
   All three are a one-off state swap with a transition, nothing per frame. */
.sigil-node--selected .sigil-node-name {
  background: color-mix(in srgb, var(--role-color) 13%, #0c0805);
  border-color: color-mix(in srgb, #fff 28%, var(--role-color));
  box-shadow: 0 0 14px color-mix(in srgb, var(--role-color) 42%, transparent);
}
.sigil-node--selected .sigil-node-name::before {
  content: '';
  position: absolute;
  left: 7px;
  right: 7px;
  top: -1px;
  height: 2px;
  border-radius: 0 0 2px 2px;
  background: color-mix(in srgb, #fff 38%, var(--role-color));
}
.sigil-node--selected .sigil-node-name-text {
  color: color-mix(in srgb, #fff 40%, var(--role-color));
}
.sigil-node--selected .sigil-node-xp-cur {
  color: color-mix(in srgb, #fff 60%, var(--role-color));
}
.sigil-node--selected .sigil-node-xp-sep,
.sigil-node--selected .sigil-node-xp-max,
.sigil-node--selected .sigil-node-xp-unit {
  color: color-mix(in srgb, #fff 18%, var(--role-color));
}

/* ── search spotlight: hits pulse gold, the rest recedes ── */
.sigil-node--search-miss,
.sigil-ally--search-miss {
  opacity: 0.35;
  filter: grayscale(45%);
}
.sigil-node--search-hit {
  z-index: 3;
}
.sigil-node--search-hit .sigil-node-circle {
  animation: sigil-search-pulse 1.6s ease-in-out infinite;
}
.sigil-ally--search-hit {
  z-index: 2;
  animation: sigil-search-pulse 1.6s ease-in-out infinite;
}
@keyframes sigil-search-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 3px #e8c040,
      0 0 14px rgba(232, 192, 64, 0.55);
  }
  50% {
    box-shadow:
      0 0 0 4px #e8c060,
      0 0 26px rgba(232, 192, 64, 0.85);
  }
}

/* ── ally-hover spotlight: hovering a panel row lights its board satellite ── */
.sigil-ally--spotlight {
  transform: translate(-50%, -50%) scale(v-bind(hoverScale));
  background: #0a0704;
  box-shadow:
    0 0 0 2px var(--role-color),
    0 0 18px color-mix(in srgb, var(--role-color) 85%, transparent);
  z-index: 4;
  transition-duration: 0.12s;
  transition-delay: 0ms;
  animation: sigil-ally-ping v-bind(hoverPingMs) ease-out 1;
}
.sigil-ally--spotlight .sigil-ally-plus {
  opacity: 1;
}
.sigil-ally--dimmed {
  opacity: v-bind(hoverDimOpacity);
  filter: saturate(0.6);
  transition-duration: 0.12s;
  transition-delay: 0ms;
}
@keyframes sigil-ally-ping {
  0% {
    box-shadow:
      0 0 0 2px var(--role-color),
      0 0 18px color-mix(in srgb, var(--role-color) 85%, transparent),
      0 0 0 0 color-mix(in srgb, var(--role-color) 60%, transparent);
  }
  100% {
    box-shadow:
      0 0 0 2px var(--role-color),
      0 0 18px color-mix(in srgb, var(--role-color) 85%, transparent),
      0 0 0 16px transparent;
  }
}

/* ── sworn: cut plate ─────────────────────────────────────────────────────────
   The two allies that lend the main their stats are not marked, they are SHAPED:
   their portrait is a cut hexagonal plate where every bench satellite stays a
   disc. Silhouette survives what a badge does not — it still reads when the
   camera pulls all the way out, it cannot collide with the level medallion, and
   it needs no second colour to say "this one is different".

   Cost: two pseudo-elements on a button that already exists, so the whole
   distinction is DOM-free — it replaced a badge element AND an Iconify component
   per sworn slot, ten of each on a full board, all built in the same frame the
   team tab opens in. Neither layer animates: the plate is painted once, the aura
   only ever changes its own opacity, and clip-path on a static layer costs
   nothing per frame.

   Layer order back to front: aura (::after, z 0) → plate (::before, z 1) →
   portrait (z 2) → level medallion (z 3, unchanged and deliberately overhanging). */
.sigil-ally--sworn,
.sigil-ally--sworn.sigil-ally--filled,
.sigil-ally--sworn.sigil-ally--highlight,
.sigil-ally--sworn.sigil-ally--spotlight,
.sigil-ally--sworn.sigil-ally--search-hit {
  /* the disc's own rim and glow would ring a hexagon in a circle — the plate
     and the aura below take over both jobs, in the right shape */
  background: transparent;
  box-shadow: none;
  animation: none;
}
.sigil-ally--sworn {
  --sworn-c: var(--role-color);
  /* an empty sworn slot wears the plate in cold metal — the shape is the rank,
     it does not wait for a champion to sit down */
  --sworn-metal: color-mix(in srgb, var(--sworn-c) 45%, #14100a);
  --sworn-glow-o: 0;
  z-index: 2;
}
.sigil-ally--sworn.sigil-ally--filled {
  --sworn-metal: var(--sworn-c);
  --sworn-glow-o: 0.5;
}
/* every state that used to swell the ring now swells the aura instead */
.sigil-ally--sworn.sigil-ally--highlight {
  --sworn-glow-o: 0.78;
}
.sigil-ally--sworn:hover,
.sigil-ally--sworn.sigil-ally--spotlight {
  --sworn-glow-o: 1;
}
.sigil-ally--sworn.sigil-ally--search-hit {
  --sworn-c: #e8c040;
  --sworn-metal: #e8c040;
}

/* the plate: cast metal, lit from the upper left, sitting one rim behind the
   portrait so exactly SIGIL_SWORN_RIM_PX of it shows all the way around */
.sigil-ally--sworn::before {
  content: '';
  position: absolute;
  inset: calc(-1 * v-bind(swornRim));
  clip-path: v-bind(swornFacets);
  background: linear-gradient(
    152deg,
    color-mix(in srgb, #fff 30%, var(--sworn-metal)),
    var(--sworn-metal) 46%,
    color-mix(in srgb, var(--sworn-metal) 52%, #0a0704)
  );
  pointer-events: none;
  z-index: 1;
}
/* the aura: a radial fade clipped to a wider copy of the same polygon. It fades
   out before the clip edge, so nothing betrays the cut — and being a plain
   gradient it needs neither a blur filter nor a box-shadow. */
.sigil-ally--sworn::after {
  content: '';
  position: absolute;
  inset: calc(-1 * v-bind(swornGlow));
  clip-path: v-bind(swornFacets);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--sworn-c) 60%, transparent) 46%,
    transparent 76%
  );
  opacity: var(--sworn-glow-o, 0);
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.2s;
}
/* portrait and empty-slot face take the same cut, one rim inside the plate */
.sigil-ally--sworn .sigil-ally-img,
.sigil-ally--sworn .sigil-ally-plus {
  position: relative;
  z-index: 2;
  border-radius: 0;
  clip-path: v-bind(swornFacets);
}
.sigil-ally--sworn .sigil-ally-plus {
  background: #0a0704;
  color: var(--sworn-c);
}
/* search hit: the aura breathes where the disc's ring used to pulse */
.sigil-ally--sworn.sigil-ally--search-hit::after {
  animation: sigil-sworn-pulse 1.6s ease-in-out infinite;
}
@keyframes sigil-sworn-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@keyframes sigil-plate-turn {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
/* both frame animations carry the centring translate so they never fight the
   layer's own positioning transform */
@keyframes sigil-frame-sweep {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
/* opacity only — a scaling gradient of this size makes the compositor re-raster
   the layer every frame, and the breath reads just as well without it */
@keyframes sigil-frame-halo {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.95;
  }
}
@keyframes sigil-xp-breathe {
  0%,
  100% {
    opacity: 0.72;
  }
  50% {
    opacity: 1;
  }
}

@keyframes sigil-aura {
  0%,
  100% {
    opacity: 0.4;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.85;
    transform: translate(-50%, -50%) scale(1.09);
  }
}
@keyframes sigil-conic {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
.sigil-node-conic {
  transform: translate(-50%, -50%);
}
@media (prefers-reduced-motion: reduce) {
  .sigil-node-aura,
  .sigil-node-conic {
    animation: none !important;
  }
  .sigil-node--search-hit .sigil-node-circle,
  .sigil-ally--search-hit:not(.sigil-ally--sworn) {
    animation: none !important;
    box-shadow:
      0 0 0 3px #e8c040,
      0 0 14px rgba(232, 192, 64, 0.55);
  }
  /* a sworn hit keeps its gold plate; only the breathing stops */
  .sigil-ally--sworn.sigil-ally--search-hit::after {
    animation: none !important;
    opacity: 1;
  }
  .sigil-ally--spotlight,
  .sigil-node--spin .sigil-node-plate,
  .sigil-node-sweep,
  .sigil-node-halo,
  .sigil-node-xp--attention .sigil-node-xp-fill {
    animation: none !important;
  }
}
</style>
