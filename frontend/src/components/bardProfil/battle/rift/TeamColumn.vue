<template>
  <div class="team-col" :class="side === 'blue' ? 'team-col--blue' : 'team-col--red'">
    <div class="col-title" :class="side === 'blue' ? 'col-title--blue' : 'col-title--red'">
      {{ side === 'blue' ? 'BLUE TEAM' : 'RED TEAM' }}
    </div>

    <div
      v-for="(champ, idx) in team"
      :key="champ.name || idx"
      class="champ-card"
      :class="[
        side === 'blue' ? 'champ-card--blue' : 'champ-card--red',
        {
          'champ-card--bard': champ.name === 'Bard',
          'champ-card--mvp': champ.name && champ.name === mvpLiveName,
          'champ-card--buff-blue': hasBuff(idx, 'blue'),
          'champ-card--buff-red': hasBuff(idx, 'red'),
          'champ-card--clickable': !!champ.name,
          'champ-card--focused': isFocused(idx),
          'champ-card--muted': !!champ.name && hasFocus && !isFocused(idx),
        },
      ]"
      @click="champ.name && battleStore.toggleFocusedChampion(side === 'blue' ? 1 : 2, idx)"
    >
      <!-- Full-bleed portrait: the image IS the card background, no inner frame -->
      <img
        v-if="champ.name"
        :src="battleStore.getChampionImage(champ.name)"
        :alt="champ.name"
        class="portrait"
        :class="{ 'portrait--dead': champ.respawnState === 'walking-back' }"
      />
      <div v-else class="portrait portrait--empty" />

      <!-- Team-tinted scrim keeps name/KDA readable over any splash art -->
      <div class="scrim" />

      <!-- Death timer while respawning / walking back (Cloud-buff aware) -->
      <div v-if="champ.respawnState === 'walking-back'" class="death-timer">
        <span class="death-timer-ring" :style="{ '--p': respawnPct(idx) + '%' }" />
        <span class="death-timer-num">{{ respawnSecs(idx) }}</span>
      </div>

      <!-- Live-MVP chip: gold banner in the card's top corner (mirrored per side) -->
      <span v-if="champ.name && champ.name === mvpLiveName" class="mvp-chip">♛ MVP</span>

      <!-- Bottom row: name/KDA on the team side, buff pills + level medallion
           grouped on the inner side (flex — nothing can overlap) -->
      <div class="info" :class="{ 'info--right': side === 'red' }">
        <div class="info-text">
          <div class="champ-name">
            {{ champ.name || '—' }}
            <span v-if="champ.name === 'Bard'" class="you-tag">YOU</span>
          </div>
          <div class="kda">
            <span class="kda-k">{{ champ.kills }}</span><span class="kda-sep">/</span><span class="kda-d">{{ champ.deaths }}</span><span class="kda-sep">/</span><span class="kda-a">{{ champ.assists }}</span>
            <span class="cs-tag">{{ champ.cs }} cs</span>
          </div>
        </div>
        <div class="info-side">
          <span v-if="champBuffs(idx).length" class="card-buffs">
            <span
              v-for="b in champBuffs(idx)"
              :key="b.type"
              class="card-buff-badge"
              :class="`card-buff-badge--${b.type}`"
              :title="b.type === 'blue' ? 'Blue Buff' : 'Red Buff'"
            >
              <span
                class="card-buff-ring"
                :style="{ '--p': (b.remaining / JUNGLE_BUFF_CARRY_DURATION_T) * 100 + '%' }"
              >
                <span class="card-buff-orb" :class="`card-buff-orb--${b.type}`" />
              </span>
              <span class="card-buff-time">{{ battleStore.formatTime(Math.ceil(b.remaining / 60) * 60) }}</span>
            </span>
          </span>
          <span v-if="champ.name" class="level-badge">{{ champ.level }}</span>
        </div>
      </div>

      <!-- HP bar sits flush on the card's bottom edge -->
      <div class="hp-track">
        <div
          class="hp-fill"
          :class="hpClass(champ.hpPercent)"
          :style="{ width: (champ.respawnState === 'walking-back' ? 100 : champ.hpPercent) + '%', marginLeft: side === 'red' ? 'auto' : '0' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { mvpScore } from '@/utils/battleTimeline'
import { JUNGLE_BUFF_CARRY_DURATION_T } from '@/config/constants'

const props = defineProps<{ side: 'blue' | 'red' }>()

const battleStore = useBattleStore()
const team = computed(() => (props.side === 'blue' ? battleStore.team1 : battleStore.team2))

/** Cosmetic buff auras a champion of this column currently carries. */
function champBuffs(idx: number) {
  return battleStore.championBuffs(props.side === 'blue' ? 1 : 2, idx)
}

function hasBuff(idx: number, type: 'blue' | 'red'): boolean {
  return champBuffs(idx).some((b) => b.type === type)
}

/** This card is the currently spotlighted champion. */
function isFocused(idx: number): boolean {
  return battleStore.focusedChampionId === `${props.side === 'blue' ? 1 : 2}-${idx}`
}

/** Any champion (either team) is currently spotlighted. */
const hasFocus = computed(() => battleStore.focusedChampionId !== '')

/** Death-timer readouts for a respawning champion of this column. */
function respawnSecs(idx: number): number {
  return battleStore.respawnSecondsLeft(props.side === 'blue' ? 1 : 2, idx)
}
function respawnPct(idx: number): number {
  return battleStore.respawnFraction(props.side === 'blue' ? 1 : 2, idx) * 100
}

/** Live MVP across both teams (updates as the battle progresses). */
const mvpLiveName = computed(() => {
  let best = -Infinity
  let name = ''
  for (const c of [...battleStore.team1, ...battleStore.team2]) {
    if (!c.name) continue
    const s = mvpScore(c)
    if (s > best) {
      best = s
      name = c.name
    }
  }
  return name
})

function hpClass(hp: number): string {
  if (hp > 60) return 'hp--high'
  if (hp > 35) return 'hp--mid'
  return 'hp--low'
}
</script>

<style scoped>
.team-col {
  /* floating spectator cards over the map — width shared with the drake-badge
     offsets via --hud-w on .rift-board, sizes fluid via cq units */
  width: var(--hud-w, 192px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.9cqh, 7px);
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 transparent;
  /* team accent as CSS vars so every sub-element derives from one hue */
  --team-rgb: 96, 165, 250;
  --team-scrim: 7, 14, 30;
}
.team-col--red {
  --team-rgb: 248, 113, 113;
  --team-scrim: 30, 8, 10;
}

.col-title {
  font-size: clamp(10px, 1.6cqh, 11px);
  font-weight: 700;
  letter-spacing: 2px;
  padding: 3px 8px;
  flex-shrink: 0;
  color: rgba(var(--team-rgb), 0.9);
  background: linear-gradient(
    to var(--title-dir, right),
    rgba(var(--team-rgb), 0.18),
    transparent 80%
  );
  border-radius: 4px;
}
.col-title--red {
  --title-dir: left;
  text-align: right;
}

.champ-card {
  position: relative;
  height: clamp(46px, 8.8cqh, 66px);
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--team-scrim), 0.85);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
}
/* team edge marks the side without framing the portrait */
.champ-card--blue::after,
.champ-card--red::after,
.champ-card--bard::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(var(--team-rgb), 0.9);
  pointer-events: none;
}
.champ-card--blue::after { left: 0; }
.champ-card--red::after { right: 0; }
.champ-card--bard { --team-rgb: 232, 192, 64; }

/* ── Clickable / focused card ──
   Clicking a card spotlights that champion's dot on the map. Hover hints it,
   the selected card carries a crisp bright ring (drawn via ::before so it never
   fights the buff/MVP box-shadows). */
.champ-card--clickable {
  cursor: pointer;
}
.champ-card--clickable:hover::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.45);
  pointer-events: none;
  z-index: 2;
}
/* Selected card pops hard: thick bright ring + inner glow + a gold-white
   corner sheen; the portrait brightens and the rest of the column recedes. */
.champ-card--focused {
  z-index: 3;
}
.champ-card--focused::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 3px #ffffff,
    inset 0 0 26px rgba(255, 255, 255, 0.6);
  pointer-events: none;
  z-index: 2;
}
.champ-card--focused .portrait {
  filter: brightness(1.18) saturate(1.12) contrast(1.04);
}
.champ-card--focused .champ-name {
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.55), 0 1px 3px rgba(0, 0, 0, 0.9);
}

/* Non-selected cards recede while one is spotlighted */
.champ-card--muted {
  opacity: 0.42;
  filter: saturate(0.7) brightness(0.85);
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.portrait {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* square champ icons: keep the face band visible in the wide card crop */
  object-position: center 30%;
  transition: filter 0.3s;
}
.portrait--dead {
  filter: grayscale(0.9) brightness(0.45);
}
.portrait--empty {
  background: #141410;
  border: 1px dashed #3e200a;
  border-radius: 8px;
}

.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(var(--team-scrim), 0.92) 0%,
    rgba(var(--team-scrim), 0.55) 42%,
    rgba(var(--team-scrim), 0.08) 75%,
    transparent 100%
  );
  pointer-events: none;
}

/* Level medallion: opposite end of the bottom row from the champ name */
.level-badge {
  flex-shrink: 0;
  width: clamp(20px, 3.8cqh, 27px);
  height: clamp(20px, 3.8cqh, 27px);
  border-radius: 50%;
  background: rgba(var(--team-scrim), 0.9);
  border: 1.5px solid rgba(var(--team-rgb), 0.95);
  box-shadow: 0 0 6px rgba(var(--team-rgb), 0.45), 0 1px 3px rgba(0, 0, 0, 0.7);
  font-size: clamp(11px, 2cqh, 14px);
  font-weight: 800;
  color: #f4f6fb;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Death timer: a draining gold ring with the remaining respawn seconds,
   centered on the greyed-out portrait — the card center is the only zone no
   other badge (MVP, buffs, level, name) uses. */
.death-timer {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: clamp(26px, 5cqh, 36px);
  height: clamp(26px, 5cqh, 36px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.death-timer-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(#e8c040 var(--p, 100%), rgba(0, 0, 0, 0.55) 0);
  -webkit-mask: radial-gradient(circle, transparent 58%, #000 60%);
  mask: radial-gradient(circle, transparent 58%, #000 60%);
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.6));
}
.death-timer-num {
  font-size: clamp(12px, 2.4cqh, 16px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #ffe9a0;
  text-shadow: 0 0 6px #000, 0 1px 2px #000;
}

.info {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 7px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
}
.info--right {
  flex-direction: row-reverse;
  text-align: right;
}

.info-text {
  min-width: 0;
}

.champ-name {
  font-size: clamp(11px, 1.8cqh, 13px);
  font-weight: 700;
  color: #f4f6fb;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.champ-card--bard .champ-name { color: #ffe9a0; }

.you-tag {
  font-size: 9px;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 1px;
}
/* ── Buff aura on the whole card ────────────────────────────────────────
   Subtle inset glow in the carried buff's color; with both buffs the blue
   aura breathes in from the left edge, the red one from the right.
   Declared BEFORE the MVP highlight so the gold MVP ring always wins. */
.champ-card--buff-blue {
  box-shadow:
    inset 0 0 0 2px rgba(96, 165, 250, 0.95),
    inset 0 0 26px rgba(59, 130, 246, 0.55),
    0 4px 12px rgba(0, 0, 0, 0.45);
}
.champ-card--buff-red {
  box-shadow:
    inset 0 0 0 2px rgba(248, 113, 113, 0.95),
    inset 0 0 26px rgba(239, 68, 68, 0.55),
    0 4px 12px rgba(0, 0, 0, 0.45);
}
.champ-card--buff-blue.champ-card--buff-red {
  box-shadow:
    inset 16px 0 26px -6px rgba(59, 130, 246, 0.8),
    inset -16px 0 26px -6px rgba(239, 68, 68, 0.8),
    0 4px 12px rgba(0, 0, 0, 0.45);
}

/* ── Live-MVP highlight ─────────────────────────────────────────────────
   The MVP card gets a breathing gold ring + halo and a crown chip, so the
   current best performer reads at a glance across both columns. */
.champ-card--mvp {
  /* inset ring — the column is a scroll container, outer shadows would clip */
  box-shadow:
    inset 0 0 0 2.5px #e8c040,
    inset 0 0 24px rgba(232, 192, 64, 0.6),
    0 4px 12px rgba(0, 0, 0, 0.45);
  animation: mvp-ring-pulse 2.2s ease-in-out infinite;
}
/* the gold MVP ring beats any buff aura, whatever the combination */
.champ-card--mvp.champ-card--buff-blue,
.champ-card--mvp.champ-card--buff-red,
.champ-card--mvp.champ-card--buff-blue.champ-card--buff-red {
  box-shadow:
    inset 0 0 0 2.5px #e8c040,
    inset 0 0 24px rgba(232, 192, 64, 0.6),
    0 4px 12px rgba(0, 0, 0, 0.45);
}

/* the team edge line turns gold on the MVP card */
.champ-card--mvp::after {
  background: #e8c040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.9);
}
/* warm gold wash over the scrim so the whole card reads "golden" */
.champ-card--mvp .scrim {
  background:
    linear-gradient(to top, rgba(120, 88, 12, 0.38), transparent 60%),
    linear-gradient(
      to top,
      rgba(var(--team-scrim), 0.92) 0%,
      rgba(var(--team-scrim), 0.55) 42%,
      rgba(var(--team-scrim), 0.08) 75%,
      transparent 100%
    );
}
.champ-card--mvp .champ-name {
  color: #ffe9a0;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.9),
    0 0 10px rgba(232, 192, 64, 0.6);
}

.mvp-chip {
  position: absolute;
  top: 4px;
  left: 6px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px 1px;
  font-size: clamp(9px, 1.5cqh, 11px);
  font-weight: 800;
  letter-spacing: 1.5px;
  line-height: 1.2;
  color: #1e1006;
  background: linear-gradient(to bottom, #ffe9a0, #e8c060 45%, #c89040);
  border: 1px solid #8a5c18;
  border-radius: 4px;
  box-shadow:
    0 0 10px rgba(232, 192, 64, 0.7),
    0 2px 4px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  text-shadow: 0 1px 0 rgba(255, 240, 190, 0.6);
}
.team-col--red .mvp-chip {
  left: auto;
  right: 6px;
}

@keyframes mvp-ring-pulse {
  50% {
    box-shadow:
      inset 0 0 0 3px #ffe9a0,
      inset 0 0 34px rgba(232, 192, 64, 0.95),
      0 4px 12px rgba(0, 0, 0, 0.45);
  }
}

/* ── Jungle-buff auras ──
   Glowing pills grouped with the level medallion in the bottom row's inner
   cluster — part of the flex layout, so nothing can ever overlap; the champ
   name simply truncates when space runs out. */
/* pills stack ABOVE the level medallion, flush with the card's inner edge */
.info-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 3px;
  flex-shrink: 0;
}
.info--right .info-side {
  align-items: flex-start;
}
.card-buffs {
  display: flex;
  flex-direction: column;
  align-items: inherit;
  gap: 2px;
}
/* Buff token: dark badge holding an orb wrapped in a radial cooldown ring
   (conic gradient drains with the remaining duration) + minute countdown.
   Game-HUD language — reads instantly over any splash art. */
.card-buff-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 5px 2px 2px;
  border-radius: 9px;
  border: 1px solid;
  background: rgba(10, 8, 6, 0.85);
}
.card-buff-badge--blue {
  border-color: rgba(96, 165, 250, 0.55);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
  --ring-c: #60a5fa;
}
.card-buff-badge--red {
  border-color: rgba(248, 113, 113, 0.55);
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
  --ring-c: #f87171;
}

/* cooldown ring: buff color for the remaining fraction, dark track for the rest */
.card-buff-ring {
  width: clamp(13px, 2.4cqh, 16px);
  height: clamp(13px, 2.4cqh, 16px);
  border-radius: 50%;
  padding: 2px;
  background: conic-gradient(var(--ring-c) var(--p, 100%), rgba(255, 255, 255, 0.14) 0);
  flex-shrink: 0;
  display: flex;
}
.card-buff-orb {
  flex: 1;
  border-radius: 50%;
}
.card-buff-orb--blue {
  background: radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1d4ed8);
}
.card-buff-orb--red {
  background: radial-gradient(circle at 35% 30%, #fecaca, #ef4444 55%, #b91c1c);
}

.card-buff-time {
  font-size: clamp(9px, 1.6cqh, 11px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  line-height: 1;
}
.card-buff-badge--blue .card-buff-time { color: #9ecbff; }
.card-buff-badge--red .card-buff-time { color: #ffa294; }

.kda {
  font-size: clamp(10px, 1.6cqh, 12px);
  display: flex;
  align-items: baseline;
  gap: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}
.info--right .kda { justify-content: flex-end; }
.kda-k { color: #6ee7b7; }
.kda-d { color: #fca5a5; }
.kda-a { color: #93c5fd; }
.kda-sep { color: #8890a0; }

.cs-tag {
  margin-left: 6px;
  font-size: clamp(9px, 1.4cqh, 11px);
  color: #c8bda4;
}

.hp-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.55);
}
.hp-fill {
  height: 100%;
  transition: width 0.6s ease;
}
.hp--high { background: #37d14a; }
.hp--mid { background: #c9d137; }
.hp--low { background: #d15a37; }

@media (prefers-reduced-motion: reduce) {
  .champ-card--mvp { animation: none; }
}
</style>
