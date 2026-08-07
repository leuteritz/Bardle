<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { getChampionTier } from '@/config/champions/championTiers'
import { regaliaStageFor, regaliaStageIndexFor } from '@/config/champions/championLevels'
import { facetClipPath, studRingGradient } from '@/utils/orbit/geometry'
import { allySlotLabel } from '@/utils/ui/format'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import ChampionLevelBadge from '../ChampionLevelBadge.vue'
import {
  ROLES,
  MAX_STAR_LEVEL,
  SIGIL_NODE_SIZE,
  SIGIL_ALLY_SIZE,
  SIGIL_SWORN_SIZE,
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
  SIGIL_NODE_LEVEL_TAB_WIDTH,
  SIGIL_NODE_POWER_TAB_WIDTH,
  SIGIL_TIER_CROWN_MIN_STAR,
  SIGIL_TIER_AUREOLE_MIN_STAR,
  SIGIL_TIER_AUREOLE_MS,
} from '@/config/constants'
import type { SigilPoint } from '@/composables/ui/useTeamSigil'
import type { ChampionArtSize } from '@/types'

const props = defineProps<{
  roleIndex: number
  point: SigilPoint
  allyPoints: SigilPoint[]
  selected: boolean
  full: boolean
  /** What this role contributes to the team power printed in the sigil's core. */
  power: number
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
/** The glyph carries no text — the tier's name and headroom live in its tooltip. */
const tierLabel = computed(() =>
  tier.value ? `Tier ${tier.value.starLevel}/${MAX_STAR_LEVEL} — ${tier.value.name}` : '',
)

// ── Champion tier ────────────────────────────────────────────────────────────
// The tier lives on the PORTRAIT, as its own glyph across the foot; the name
// plate's tab carries the level instead. Three things climb with the star level and
// they climb on the plate, never on the champion's face: the tab's metal is
// always the tier's own colour, from ★4 the plate takes that colour as a tint
// and an outline, from ★5 it glows, and the apex tab carries a slow sheen.
const tierStars = computed(() => tier.value?.starLevel ?? 0)
const tierCrown = computed(() => tierStars.value >= SIGIL_TIER_CROWN_MIN_STAR)
const tierAureole = computed(() => tierStars.value >= SIGIL_TIER_AUREOLE_MIN_STAR)
const tierApex = computed(() => tierStars.value >= MAX_STAR_LEVEL)
/** Plate colours mix against the tier where one exists, the role otherwise. */
const tierVars = computed<Record<string, string>>(() => ({
  '--tier-color': tier.value?.color ?? roleDef.value.color,
}))

const levelTabWidth = `${SIGIL_NODE_LEVEL_TAB_WIDTH}px`
const powerTabWidth = `${SIGIL_NODE_POWER_TAB_WIDTH}px`
const tierSheenMs = `${SIGIL_TIER_AUREOLE_MS}ms`

// ── Role power ───────────────────────────────────────────────────────────────
// The figure this whole cluster — main plus every ally under it — adds to the
// number in the sigil's core. It rides the plate's RIGHT edge, mirroring the
// level tab on the left, so the plate reads left to right as rank, identity,
// contribution. Compact form: a role tops out at 1350, which is four characters
// there and five in the default format ("1.35K").
const powerLabel = computed(() => formatNumberCompact(props.power))
const powerTitle = computed(() => `${props.power} team power from this role`)
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
 * rides it inward — the one half that can never hold a satellite, whatever angle
 * the pentagon hands this role.
 */
const inward = computed(() => {
  const deg = SIGIL_PENTAGON_START_ANGLE + props.roleIndex * SIGIL_PENTAGON_ANGLE_STEP + 180
  const rad = (deg * Math.PI) / 180
  return { x: Math.cos(rad), y: Math.sin(rad) }
})
const decorVars = computed<Record<string, string>>(() => ({
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
// Every node wears its level: the main gets an XP arc tracing its rim plus the
// big numeral seated across the portrait's foot, allies get a compact medallion.
// Everything on a node carries that champion's single colour — its role colour —
// so a slot reads as one identity instead of a patchwork of role, rank and tier
// hues.
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
/** The tab shows the bare figure — the word belongs in the tooltip. */
const levelLabel = computed(() => `Level ${mainLevel.value}`)
const mainStage = computed(() => regaliaStageFor(mainLevel.value))
const mainStageIndex = computed(() => (main.value ? regaliaStageIndexFor(mainLevel.value) : 0))

const frameVars = computed<Record<string, string>>(() => {
  const stage = mainStage.value
  return {
    '--node-rim': `${SIGIL_FRAME_RIM_BASE + stage.rim * SIGIL_FRAME_RIM_STEP}px`,
    // an empty slot keeps the old faint ring; every stage above it firms up
    '--node-rim-a': `${Math.min(100, SIGIL_FRAME_RIM_ALPHA_BASE + mainStageIndex.value * SIGIL_FRAME_RIM_ALPHA_STEP)}%`,
    '--node-heat': `${Math.round(stage.heat * 100)}%`,
    // The level numeral runs cooler than the rim: it is type, not metal, and it
    // still has to read as a number at every stage. Resolved here rather than as
    // a calc() inside color-mix — see the same split in ChampionLevelBadge.
    '--node-heat-ink': `${Math.round(26 + stage.heat * 52)}%`,
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

      <!-- the portrait carries the champion and nothing else. The level is on
           the name plate's tab; the tier speaks through the plate around it
           (tint from ★4, glow from ★5, apex sheen) and through the regalia frame
           the portrait already wears. Nothing is printed across the face.
           -->
    </span>

    <!-- name plate — two lines on one plate: who sits here, and what the XP arc
         around the portrait is currently drawing. One plate rather than two
         anchors, see SIGIL_NODE_NAME_OFFSET. Static markup, no per-frame work. -->
    <span
      class="sigil-node-name"
      :class="{
        'sigil-node-name--tiered': !!main && !!tier,
        'sigil-node-name--crown': tierCrown,
        'sigil-node-name--aureole': tierAureole,
        'sigil-node-name--apex': tierApex,
      }"
      :style="tierVars"
      :title="tierLabel"
    >
      <!-- level tab — struck into the plate's left edge in the role's own metal.
           A number wants a straight-edged plate and dark ink on lit metal, and
           it wants to sit beside the XP figure it belongs to rather than across
           the champion's face. -->
      <span
        v-if="main"
        class="sigil-node-rank"
        :class="{ 'is-attention': mainAttention }"
        :title="levelLabel"
        :aria-label="levelLabel"
      >
        <span v-ink-center class="sigil-node-rank-num">{{ mainLevel }}</span>
        <i v-if="mainAttention" class="sigil-node-rank-pulse" aria-hidden="true" />
        <i v-if="tierApex" class="sigil-node-rank-sheen" aria-hidden="true" />
      </span>
      <span class="sigil-node-name-body">
        <span class="sigil-node-name-text" :class="{ 'sigil-node-name-text--role': !main }">{{
          main ?? roleDef.label
        }}</span>
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
      <!-- power tab — what this role sends to the core. Struck into the plate's
           right edge on a dark ground, the inverse of the lit metal on the left:
           two lit tabs would read as two ranks, and only one of these is one. -->
      <span
        v-if="power > 0"
        class="sigil-node-pwr"
        :title="powerTitle"
        :aria-label="powerTitle"
      >
        <span class="sigil-node-pwr-num">{{ powerLabel }}</span>
        <span class="sigil-node-pwr-unit">PWR</span>
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
   but the type keeps the dark ground it needs.

   Since the tier moved off the portrait the plate carries THREE things about the
   slot — who sits here, how far the XP arc has come, and what tier the champion
   is. The third one rides the plate's left edge as a struck tab (.sigil-node-rank)
   rather than as a third row: the plate keeps its two-line height, and the tab is
   the one part that may take a colour of its own. */
.sigil-node-name {
  position: absolute;
  left: calc(50% + var(--name-x, 0px));
  top: calc(50% + var(--name-y, 80px));
  transform: translate(-50%, -50%);
  display: flex;
  align-items: stretch;
  max-width: var(--name-max, 158px);
  border-radius: 4px;
  /* the rank tab is flush with the plate's rounded corners */
  overflow: hidden;
  /* near-opaque: the rune ring and the connector lines run right underneath */
  background: #0c0805;
  border: 1px solid color-mix(in srgb, var(--role-color) 72%, #0c0805);
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}
.sigil-node-name-body {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: 2px 9px 3px;
}

/* ── rank tab ─────────────────────────────────────────────────────────────────
   The champion tier, struck into the plate's left edge in that tier's own metal:
   a small ★ over the star level itself. A DIGIT, not a count of marks — ★2
   (#4e96e0) and ★3 (#5e86d4) are near-identical blues, so the colour can carry
   the mood of a rank but never the rank itself, and six marks in a row is what
   made the two earlier portrait versions too wide to sit anywhere quiet.

   Dark ink on lit metal, the inverse of everything else on the plate. The
   argument that keeps the CAPTION on a dark ground (it renders ~7px when the
   details panel squeezes the board) does not reach the tab: its numeral is 15px
   and a single glyph, which survives the same squeeze at any contrast.

   The TIER has no readout of its own any more — nothing is printed across the
   champion's face, and the plate carries the whole of it:
     ★1-3  plate untouched
     ★4+   plate tinted, tier hairline around it
     ★5+   plate glows in the tier's colour
     ★6    a sheen crosses the tab (transform only, one layer, apex only)
   The exact tier stays one hover away — the plate's tooltip names it. */
.sigil-node-rank {
  position: relative;
  flex: 0 0 auto;
  width: v-bind(levelTabWidth);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(
    158deg,
    color-mix(in srgb, #fff 46%, var(--role-color)),
    var(--role-color) 52%,
    color-mix(in srgb, var(--role-color) 68%, #0a0704)
  );
  box-shadow: inset -1px 0 0 rgba(6, 4, 2, 0.65);
}
/* The figure stands alone — no "LV" beside it. The word cost the numeral the
   height it needed at the size this tab actually renders (~7 px on an unfocused
   board), and nothing else on the plate is a bare number it could be confused
   with. What sets it apart from the tier glyph across the portrait is the
   inversion: dark ink on lit metal here, a lit glyph on a dark ground there. */
.sigil-node-rank-num {
  font-size: 15px;
  line-height: 0.8;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #0b0704;
}
/* Banked XP or an unspent perk — the metal goes bright and a rail breathes along
   the tab's foot, in step with the XP arc. Opacity only, one layer. */
.sigil-node-rank.is-attention {
  background: linear-gradient(
    158deg,
    color-mix(in srgb, #fff 68%, var(--role-color)),
    color-mix(in srgb, #fff 22%, var(--role-color)) 52%,
    var(--role-color)
  );
}
.sigil-node-rank-pulse {
  position: absolute;
  left: 2px;
  right: 2px;
  bottom: 2px;
  height: 2px;
  border-radius: 1px;
  background: #0b0704;
  animation: sigil-xp-breathe 1.9s ease-in-out infinite;
}
/* ★6 only — a highlight travels down the tab, clipped by its own overflow. The
   tab is the plate's edge and the PLATE is the tier's surface (tint from ★4,
   glow from ★5), so the apex flourish belongs here even though the figure on it
   is the level. Transform alone, one layer, apex slots only. */
.sigil-node-rank-sheen {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 55%;
  background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.5), transparent);
  animation: sigil-rank-sheen v-bind(tierSheenMs) linear infinite;
}
@keyframes sigil-rank-sheen {
  0% {
    transform: translateY(-120%);
  }
  55%,
  100% {
    transform: translateY(240%);
  }
}

/* ── power tab ────────────────────────────────────────────────────────────────
   The role's share of the number in the sigil's core, on the plate's far edge.
   Deliberately NOT a second metal plate: the level tab is dark ink on lit metal,
   this is lit ink on a dark ground, so the eye reads one rank and one quantity
   rather than two ranks. A hairline of the role's colour separates it from the
   caption, which is all the edge it needs — a full border would box a 36px
   column into something that looks pressable.

   Two lines, because the unit has to be said: a bare "1.2K" beside a name and an
   XP figure is one more number on a plate that already has two, and the whole
   point of this tab is that it is a DIFFERENT quantity. The word is small enough
   to stay a label and never compete with the figure above it. */
.sigil-node-pwr {
  position: relative;
  flex: 0 0 auto;
  width: v-bind(powerTabWidth);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 0 2px;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--role-color) 10%, #0c0805),
    color-mix(in srgb, var(--role-color) 22%, #0c0805)
  );
  box-shadow: inset 1px 0 0 color-mix(in srgb, var(--role-color) 55%, transparent);
}
.sigil-node-pwr-num {
  font-size: 12.5px;
  line-height: 0.9;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, #fff 50%, var(--role-color));
}
.sigil-node-pwr-unit {
  font-size: 8.5px;
  line-height: 1;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--role-color) 70%, #8b8172);
}
/* selected: the same one-off brightening the rest of the plate takes */
.sigil-node--selected .sigil-node-pwr {
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--role-color) 18%, #0c0805),
    color-mix(in srgb, var(--role-color) 34%, #0c0805)
  );
}
.sigil-node--selected .sigil-node-pwr-num {
  color: color-mix(in srgb, #fff 68%, var(--role-color));
}
.sigil-node--selected .sigil-node-pwr-unit {
  color: color-mix(in srgb, #fff 22%, var(--role-color));
}

/* ★4+ — the plate itself takes the tier: a tint bleeding out of the tab and a
   hairline of the same metal around the whole thing. Static, one repaint. */
.sigil-node-name--crown {
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--tier-color) 22%, #0c0805),
    #0c0805 62%
  );
  border-color: color-mix(in srgb, var(--tier-color) 60%, #0c0805);
}
/* ★5+ — and it glows. A static box-shadow, never animated. */
.sigil-node-name--aureole {
  box-shadow: 0 0 12px color-mix(in srgb, var(--tier-color) 42%, transparent);
}
.sigil-node-name--apex {
  border-color: color-mix(in srgb, #fff 26%, var(--tier-color));
  box-shadow: 0 0 16px color-mix(in srgb, var(--tier-color) 58%, transparent);
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
/* empty seat — the plate names the role instead of a champion. ADC is an
   acronym and sets itself in capitals; the other four would otherwise read as
   a different kind of word on the same board. All five go in caps, with the
   wider tracking a run of capitals needs to stay legible at 12px. */
.sigil-node-name-text--role {
  text-transform: uppercase;
  letter-spacing: 0.12em;
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
/* The rail rides the BODY, not the plate: the plate now clips to its rounded
   corners (the rank tab sits flush in them), and a rail across the tab would
   read as a lid on the tier's metal rather than as a lit edge on the caption. */
.sigil-node--selected .sigil-node-name-body::before {
  content: '';
  position: absolute;
  left: 7px;
  right: 7px;
  top: 0;
  height: 2px;
  border-radius: 0 0 2px 2px;
  background: color-mix(in srgb, #fff 38%, var(--role-color));
}
/* Selection and tier are two different things about the same slot, so selecting
   a high-tier plate must not cost it its tier — the tinted ground and the glow
   survive, brightened, alongside the role-coloured selection glow. */
.sigil-node--selected .sigil-node-name--crown {
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--tier-color) 32%, #0c0805),
    color-mix(in srgb, var(--role-color) 13%, #0c0805) 62%
  );
}
.sigil-node--selected .sigil-node-name--aureole {
  box-shadow:
    0 0 14px color-mix(in srgb, var(--role-color) 42%, transparent),
    0 0 18px color-mix(in srgb, var(--tier-color) 48%, transparent);
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
/* Doubled up on purpose: `.sigil-ally:hover` carries the same weight and would
   otherwise hold this satellite at its plain hover scale (1.15). The spotlight
   now looks the same whichever surface the cursor is on — pointing straight at
   the satellite and pointing at its card in the details roster are one gesture,
   so they cannot be allowed to produce two different sizes. */
.sigil-ally.sigil-ally--spotlight {
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
  .sigil-node-rank-sheen,
  .sigil-node--spin .sigil-node-plate,
  .sigil-node-sweep,
  .sigil-node-halo,
  .sigil-node-xp--attention .sigil-node-xp-fill,
  .sigil-node-rank-pulse {
    animation: none !important;
  }
}
</style>
