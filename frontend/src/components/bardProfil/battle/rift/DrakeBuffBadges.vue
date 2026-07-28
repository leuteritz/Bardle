<template>
  <!-- Secured drake / baron trophies, docked to the owning team's own board
       corner (blue top-left, red top-right) in the same column the team HUD
       uses. Resting tile shows artwork + name; hovering slides a full effect
       card out sideways into the map gutter. -->
  <div
    v-for="rail in rails"
    :key="rail.side"
    class="buff-rail"
    :class="`buff-rail--${rail.side}`"
  >
    <TransitionGroup name="tile">
      <div
        v-for="d in rail.badges"
        :key="rail.side + d.id"
        class="buff-tile"
        :class="`buff-tile--${rail.side}`"
        :style="{ '--dk-color': d.color, '--dk-dark': d.colorDark, '--dk-glow': d.glow }"
      >
        <!-- Face is its own size container: artwork and label scale with the
             tile height, which the rail compresses when a full trophy stack
             would outgrow the space above the team column. -->
        <span class="tile-face">
          <span class="tile-edge" aria-hidden="true" />
          <!-- Emblem, not a photo: the trophy art is used as a mask and filled
               in the buff's own color, so every tile is told apart by shape AND
               hue and stays readable down to the compressed stack size. -->
          <span
            class="tile-art"
            role="img"
            :aria-label="d.label"
            :style="{ '--art': `url('${d.img}')` }"
          >
            <span class="tile-img" />
          </span>
          <span class="tile-label">{{ d.label }}</span>
          <span class="tile-sheen" aria-hidden="true" />
        </span>

        <div class="buff-card" :class="`buff-card--${rail.side}`">
          <span class="card-topline" aria-hidden="true" />
          <div class="card-head">
            <span class="card-crest" aria-hidden="true">
              <span class="card-img" :style="{ '--art': `url('${d.img}')` }" />
            </span>
            <span class="card-heading">
              <span class="card-name">{{ d.label }}</span>
              <span class="card-team">Secured by {{ rail.teamLabel }}</span>
            </span>
          </div>
          <p class="card-effect">
            <template v-for="(s, i) in d.segments" :key="i">
              <span v-if="s.num" class="card-num">{{ s.text }}</span>
              <template v-else>{{ s.text }}</template>
            </template>
          </p>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { DRAKE_TYPES, BARON_BUFF, type DrakeTypeDef } from '@/config/drakes'
import { BUFF_RAIL_IMAGES, BUFF_RAIL_TEAM_LABELS } from '@/config/constants'

interface EffectSegment {
  text: string
  /** numeric value (e.g. "+40%", "x2") — rendered highlighted in the drake color */
  num: boolean
}

interface Badge {
  id: string
  label: string
  color: string
  colorDark: string
  glow: string
  img: string
  segments: EffectSegment[]
}

interface Rail {
  side: 'own' | 'enemy'
  teamLabel: string
  badges: Badge[]
}

const battleStore = useBattleStore()

/** Split effect copy so numbers/multipliers can be tinted in the drake color. */
function toSegments(effect: string): EffectSegment[] {
  return effect
    .split(/([+\-x×]?\d+(?:[.,]\d+)?%?)/g)
    .filter((s) => s !== '')
    .map((text) => ({ text, num: /\d/.test(text) }))
}

/** Both sides show the buff the killer team walked away with — same short copy as the modal. */
function drakeBadge(d: DrakeTypeDef): Badge {
  const effect = d.effectText || `+${Math.round(d.winDelta * 100)}% win chance`
  return { ...d, img: BUFF_RAIL_IMAGES.drake, segments: toSegments(effect) }
}

function baronBadge(): Badge {
  return {
    ...BARON_BUFF,
    img: BUFF_RAIL_IMAGES.baron,
    segments: toSegments(BARON_BUFF.effectText),
  }
}

const ownBadges = computed<Badge[]>(() => [
  ...battleStore.drakeBuffs.map((id) => drakeBadge(DRAKE_TYPES[id])),
  ...(battleStore.baronKilledByTeam === 1 ? [baronBadge()] : []),
])
const enemyBadges = computed<Badge[]>(() => [
  ...battleStore.drakeBuffsT2.map((id) => drakeBadge(DRAKE_TYPES[id])),
  ...(battleStore.baronKilledByTeam === 2 ? [baronBadge()] : []),
])

/** Both corners rendered from one markup block — side drives the mirroring. */
const rails = computed<Rail[]>(() => [
  { side: 'own', teamLabel: BUFF_RAIL_TEAM_LABELS.own, badges: ownBadges.value },
  { side: 'enemy', teamLabel: BUFF_RAIL_TEAM_LABELS.enemy, badges: enemyBadges.value },
])
</script>

<style scoped>
/* ── Rail ────────────────────────────────────────────────────────────────
   Sits in the team HUD's own column (same 8px inset, same --hud-w width),
   anchored to the board's top corner so the trophies read as that team's
   banner. The team column below is vertically centered, so the rail is
   capped at the free space above it: half the board minus half the column
   (mirrors TeamColumn's own sizing — 5 cards + 5 gaps + title strip) minus
   the top offset and a breathing gap. Tiles shrink together (flex-shrink)
   once a full 5-trophy stack would outgrow that space, so the rail can
   never reach the team cards on any desktop resolution. */
.buff-rail {
  position: absolute;
  top: var(--rail-top);
  width: var(--hud-w, 192px);
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 0.7cqh, 5px);
  /* above the stop-battle FAB (9) so the hover card is never half-hidden by it,
     below the objective-fight overlay (40) which owns the board while it runs */
  z-index: 11;
  /* Rail itself stays transparent to clicks; each tile re-enables hover */
  pointer-events: none;

  --rail-top: clamp(4px, 0.9cqh, 10px);
  --col-h: calc(5 * clamp(46px, 8.8cqh, 66px) + 5 * clamp(4px, 0.9cqh, 7px) + 21px);
  max-height: calc(50% - var(--col-h) / 2 - var(--rail-top) - 10px);
}
.buff-rail--own {
  left: 8px;
}
.buff-rail--enemy {
  right: 8px;
}

/* ── Trophy tile ─────────────────────────────────────────────────────────
   Full column width so the stack lines up with the team cards underneath.
   The drake's own color washes in from the outer edge and fades into the
   dark plate, which keeps the label readable over the map behind it. */
.buff-tile {
  position: relative;
  flex: 0 1 auto;
  height: clamp(30px, 5.4cqh, 44px);
  min-height: 20px;
  background:
    linear-gradient(to right, var(--dk-glow), transparent 72%),
    linear-gradient(to right, rgba(6, 5, 3, 0.92), rgba(6, 5, 3, 0.7));
  border: 1px solid var(--dk-dark);
  border-left: none;
  border-radius: 0 5px 5px 0;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 3px 10px rgba(0, 0, 0, 0.55);
  pointer-events: auto;
  cursor: default;
  /* no overflow:hidden — the hover card lives outside the tile box; the sheen
     carries the tile's own radius instead so it can't spill past the corners */
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
}
.buff-tile--enemy {
  background:
    linear-gradient(to left, var(--dk-glow), transparent 72%),
    linear-gradient(to left, rgba(6, 5, 3, 0.92), rgba(6, 5, 3, 0.7));
  border: 1px solid var(--dk-dark);
  border-right: none;
  border-radius: 5px 0 0 5px;
}

/* Own size container — everything inside sizes off the tile's own height */
.tile-face {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  display: flex;
  align-items: center;
  /* the face's own cq units still resolve against the board — a container
     never queries itself; only its children see the tile-sized container */
  gap: clamp(5px, 1cqh, 9px);
  padding: 0 9px 0 12px;
  container-type: size;
}
.buff-tile--enemy .tile-face {
  flex-direction: row-reverse;
  padding: 0 12px 0 9px;
}

/* Team spine on the outer edge — the tiles stack into a dashed banner rail
   in the owning team's color, mirroring the team card's edge line. */
.tile-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--team-c);
  box-shadow: 0 0 8px var(--team-glow);
}
.buff-tile--own {
  --team-c: #60a5fa;
  --team-glow: rgba(59, 130, 246, 0.75);
}
.buff-tile--enemy {
  --team-c: #f87171;
  --team-glow: rgba(239, 68, 68, 0.75);
}
.buff-tile--own .tile-edge {
  left: 0;
}
.buff-tile--enemy .tile-edge {
  right: 0;
}

/* Artwork coin: the trophy art on a radial plate in its own color, ringed so
   it reads as an earned emblem rather than a loose sprite. Sized off the tile
   height so it shrinks with the stack instead of overflowing. */
.tile-art {
  position: relative;
  flex-shrink: 0;
  height: 82%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, var(--dk-glow), rgba(0, 0, 0, 0.55) 74%);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--dk-color) 55%, transparent),
    0 0 10px var(--dk-glow);
}
/* Masked emblem: the plate's fill shows through the artwork's alpha, lit from
   the top so it reads as struck metal instead of a flat cut-out. */
.tile-img {
  width: 88%;
  height: 88%;
  background: linear-gradient(
    to bottom,
    #fff5df,
    color-mix(in srgb, var(--dk-color) 88%, #fff) 45%,
    var(--dk-dark)
  );
  -webkit-mask: var(--art) center / contain no-repeat;
  mask: var(--art) center / contain no-repeat;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
}

.tile-label {
  min-width: 0;
  /* cqh = the tile's own height (see .tile-face): a compressed stack keeps the
     name proportional to its plate instead of swallowing it */
  font-size: clamp(10px, 32cqh, 14px);
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--dk-color);
  text-shadow:
    0 0 8px var(--dk-glow),
    0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.buff-tile--enemy .tile-label {
  text-align: right;
}

/* Light sweep that runs across the plate on hover — the "it's alive" cue */
.tile-sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    100deg,
    transparent 35%,
    rgba(255, 255, 255, 0.16) 50%,
    transparent 65%
  );
  background-size: 260% 100%;
  background-position: 130% 0;
  opacity: 0;
  pointer-events: none;
}

/* Hover: the tile leans into the map, its edge and plate light up */
.buff-tile:hover {
  z-index: 2;
  border-color: var(--dk-color);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.7),
    0 0 16px var(--dk-glow);
}
.buff-tile--own:hover {
  transform: translateX(4px);
}
.buff-tile--enemy:hover {
  transform: translateX(-4px);
}
.buff-tile:hover .tile-sheen {
  opacity: 1;
  animation: tile-sheen-sweep 0.75s ease-out;
}

/* ── Hover card ──────────────────────────────────────────────────────────
   Slides out sideways into the map gutter, never downward, so it can't cover
   the trophies stacked below it. Sized in cq units so it stays readable on
   every desktop resolution. */
.buff-card {
  position: absolute;
  top: -2px;
  /* grows to fit its one-line effect — capping the width would clip the longer
     drake copy, and the board is wide enough for the card at every desktop size */
  width: max-content;
  background: #0e0c07;
  border: 1px solid var(--dk-dark);
  border-radius: 5px;
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.8),
    0 0 16px var(--dk-glow);
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    visibility 0.15s ease;
  pointer-events: none;
  z-index: 3;
}
.buff-card--own {
  left: calc(100% + 10px);
  transform: translateX(-6px);
}
.buff-card--enemy {
  right: calc(100% + 10px);
  transform: translateX(6px);
}
.buff-tile:hover .buff-card {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

/* Colored signature line across the card top, in the drake's color */
.card-topline {
  display: block;
  height: 3px;
  background: linear-gradient(to right, transparent, var(--dk-color), transparent);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px 6px;
}

/* Same struck-metal emblem as the tile, one size up on its own plate — the
   card is the detail view, so the crest reads as the bigger sibling rather
   than a second style. */
.card-crest {
  width: clamp(38px, 5.2cqh, 52px);
  height: clamp(38px, 5.2cqh, 52px);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, var(--dk-glow), rgba(0, 0, 0, 0.55) 74%);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--dk-color) 55%, transparent),
    0 0 12px var(--dk-glow);
}
.card-img {
  width: 84%;
  height: 84%;
  background: linear-gradient(
    to bottom,
    #fff5df,
    color-mix(in srgb, var(--dk-color) 88%, #fff) 45%,
    var(--dk-dark)
  );
  -webkit-mask: var(--art) center / contain no-repeat;
  mask: var(--art) center / contain no-repeat;
  filter:
    drop-shadow(0 1px 2px rgba(0, 0, 0, 0.85))
    drop-shadow(0 0 6px var(--dk-glow));
}

.card-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.card-name {
  font-size: clamp(13px, 2.1cqh, 17px);
  font-weight: 800;
  letter-spacing: 0.05em;
  line-height: 1.15;
  text-transform: uppercase;
  color: var(--dk-color);
  text-shadow: 0 0 8px var(--dk-glow);
  white-space: nowrap;
}

.card-team {
  font-size: clamp(10px, 1.5cqh, 12px);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--team-c);
  white-space: nowrap;
}

/* Effect always on one single line — the card grows to fit instead of wrapping */
.card-effect {
  margin: 0;
  padding: 0 14px 11px;
  font-size: clamp(12px, 1.9cqh, 15px);
  line-height: 1.5;
  color: #e2d9c4;
  text-align: left;
  white-space: nowrap;
}
.card-effect::first-letter {
  text-transform: uppercase;
}

/* Numbers pop in the drake color so the payoff is scannable at a glance */
.card-num {
  color: var(--dk-color);
  font-weight: 800;
  text-shadow: 0 0 6px var(--dk-glow);
}

/* ── Entrance ────────────────────────────────────────────────────────────
   New trophies slide in from their own board edge with a short glow flare,
   then rest — no idle looping. */
.tile-enter-active {
  animation: tile-claim 0.55s cubic-bezier(0.2, 1.2, 0.35, 1);
}
.tile-leave-active {
  transition: opacity 0.2s ease;
}
.tile-leave-to {
  opacity: 0;
}
.buff-rail--enemy .tile-enter-active {
  animation-name: tile-claim-enemy;
}

@keyframes tile-claim {
  0% {
    opacity: 0;
    transform: translateX(-28px);
    filter: brightness(1.8) drop-shadow(0 0 16px var(--dk-glow));
  }
  65% {
    opacity: 1;
    filter: brightness(1.3) drop-shadow(0 0 10px var(--dk-glow));
  }
  100% {
    transform: translateX(0);
    filter: none;
  }
}
@keyframes tile-claim-enemy {
  0% {
    opacity: 0;
    transform: translateX(28px);
    filter: brightness(1.8) drop-shadow(0 0 16px var(--dk-glow));
  }
  65% {
    opacity: 1;
    filter: brightness(1.3) drop-shadow(0 0 10px var(--dk-glow));
  }
  100% {
    transform: translateX(0);
    filter: none;
  }
}

@keyframes tile-sheen-sweep {
  from {
    background-position: 130% 0;
  }
  to {
    background-position: -130% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile-enter-active {
    animation: none !important;
  }
  .tile-sheen {
    animation: none !important;
    opacity: 0 !important;
  }
  .buff-tile,
  .buff-card {
    transition: none;
  }
}
</style>
