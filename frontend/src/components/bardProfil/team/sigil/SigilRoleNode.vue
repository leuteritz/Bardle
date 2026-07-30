<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { useChampionLevelStore } from '@/stores/championLevelStore'
import { getChampionTier } from '@/config/championTiers'
import { regaliaStageFor, regaliaStageIndexFor } from '@/config/championLevels'
import { facetClipPath, studRingGradient } from '@/utils/geometry'
import ChampionLevelBadge from '../ChampionLevelBadge.vue'
import {
  ROLES,
  SIGIL_NODE_SIZE,
  SIGIL_ALLY_SIZE,
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

const props = defineProps<{
  roleIndex: number
  point: SigilPoint
  allyPoints: SigilPoint[]
  selected: boolean
  full: boolean
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
  // the sigil node grows with the escalation stage (up to ~200px) — full source
  main.value ? battleStore.getChampionImage(main.value) : '',
)
const tier = computed(() => (main.value ? getChampionTier(main.value) : null))
const allies = computed(
  () => secondarySlots.value[props.roleIndex] ?? Array<string | null>(ALLIES_PER_ROLE).fill(null),
)

function allyImage(ally: string | null): string {
  return ally ? battleStore.getChampionImage(ally, { size: 'md' }) : ''
}

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
    v-for="(ally, sub) in allies"
    :key="`ally-${roleIndex}-${sub}`"
    class="sigil-ally"
    :class="{
      'sigil-ally--filled': !!ally,
      'sigil-ally--highlight': selected,
      'sigil-ally--search-hit': allyHit(ally),
      'sigil-ally--search-miss': searchActive && !allyHit(ally),
      'sigil-ally--spotlight': hoveredAlly === sub,
      'sigil-ally--dimmed': hoverActive && hoveredAlly !== sub,
    }"
    :style="[
      nodeStyle(allyPoints[sub], SIGIL_ALLY_SIZE),
      { '--role-color': roleDef.color, '--sub': String(sub) },
    ]"
    :title="ally ?? `${roleDef.label} — Ally ${sub + 1}`"
    :aria-label="ally ? `${ally} (Ally ${sub + 1})` : `Assign Ally ${sub + 1} for ${roleDef.label}`"
    @click.stop="emit('select-ally', sub)"
    @mouseenter="emit('hover-ally', sub)"
    @mouseleave="emit('hover-ally', null)"
  >
    <img v-if="ally" :src="allyImage(ally)" :alt="ally" class="sigil-ally-img" />
    <span v-else class="sigil-ally-plus">＋</span>
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
    :style="[nodeStyle(point, SIGIL_NODE_SIZE), { '--role-color': roleDef.color }, frameVars]"
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

    <!-- XP arc — traces the node's rim in the champion's ascension rank color,
         so progress toward the next level reads at a glance across the board -->
    <svg
      v-if="main"
      class="sigil-node-xp"
      :class="{ 'sigil-node-xp--attention': needsAttentionOf(main) }"
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
      <img v-if="main" :src="mainImage" :alt="main" class="sigil-node-img" />
      <span v-else class="sigil-node-empty">
        <img :src="roleDef.image" :alt="roleDef.label" class="sigil-node-role-ghost" />
      </span>
      <span v-if="main && tier" class="sigil-node-star">★{{ tier.starLevel }}</span>
    </span>

    <!-- level medallion — the headline number, sitting on the node's shoulder -->
    <span v-if="main" class="sigil-node-level">
      <ChampionLevelBadge
        :level="levelOf(main)"
        :color="roleDef.color"
        :size="CHAMPION_REGALIA_SIZE_NODE"
        :attention="needsAttentionOf(main)"
      />
    </span>

    <span class="sigil-node-name">{{ main ?? roleDef.label }}</span>
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
  background: conic-gradient(
    from 0deg,
    transparent,
    color-mix(in srgb, var(--role-color) 80%, transparent),
    transparent 62%
  );
  filter: blur(1px);
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

/* level medallion — the wrapper only places it on the node's shoulder;
   everything the badge looks like lives in ChampionLevelBadge */
.sigil-node-level {
  position: absolute;
  left: -6px;
  top: -6px;
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
.sigil-node-name {
  position: absolute;
  left: 50%;
  top: calc(100% + 6px);
  transform: translateX(-50%);
  padding: 2px 10px;
  border-radius: 4px;
  background: rgba(10, 7, 4, 0.88);
  border: 1px solid var(--role-color);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--role-color);
  white-space: nowrap;
}
.sigil-node--selected .sigil-node-name {
  background: var(--role-color);
  color: #0a0806;
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
@keyframes sigil-frame-halo {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.94);
    opacity: 0.45;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.06);
    opacity: 0.9;
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
  .sigil-ally--search-hit {
    animation: none !important;
    box-shadow:
      0 0 0 3px #e8c040,
      0 0 14px rgba(232, 192, 64, 0.55);
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
