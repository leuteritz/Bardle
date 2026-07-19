<template>
  <div class="ticker-root" @mouseleave="onRootLeave">
    <!-- Expanded history overlay — floats above the minimap, flex layout untouched -->
    <Transition name="panel">
      <div v-if="expanded" class="feed-panel">
        <div class="feed-panel-goldline"></div>
        <TransitionGroup name="feed" tag="div" class="feed-list">
          <div
            v-for="row in feedEntries"
            :key="row.key"
            class="feed-row"
            :class="[rowAccentClass(row), multikillEventClass(row)]"
            @mouseenter="onRowEnter(row, $event)"
            @mouseleave="onRowLeave"
          >
            <span class="feed-time">{{ formatFeedTime(row.t) }}</span>

            <template v-if="row.type === 'kill'">
              <div class="feed-item">
                <span class="feed-name" :class="row.kill.killerTeam === 1 ? 'feed-name--blue' : 'feed-name--red'">{{ row.kill.killerName }}</span>
                <img :src="battleStore.getChampionImage(row.kill.killerName)" :alt="row.kill.killerName" class="feed-img" :class="row.kill.killerTeam === 1 ? 'feed-img--blue' : 'feed-img--red'" />
                <Icon icon="game-icons:saber-slash" width="16" height="16" class="feed-star" />
                <template v-if="row.kill.multikillTier">
                  <img
                    v-for="k in multikillChain(row.kill)"
                    :key="`${k.t}-${k.victimName}`"
                    :src="battleStore.getChampionImage(k.victimName)"
                    :alt="k.victimName"
                    class="feed-img feed-img--dead feed-img--chain"
                    :class="row.kill.killerTeam === 1 ? 'feed-img--red' : 'feed-img--blue'"
                  />
                </template>
                <img v-else :src="battleStore.getChampionImage(row.kill.victimName)" :alt="row.kill.victimName" class="feed-img feed-img--dead" :class="row.kill.killerTeam === 1 ? 'feed-img--red' : 'feed-img--blue'" />
                <span class="feed-name feed-name--dead">{{ row.kill.victimName }}</span>
                <span v-if="row.kill.firstBlood" class="feed-fb">FIRST BLOOD</span>
                <span v-if="row.kill.multikillTier" class="feed-mk">{{ multikillLabel(row.kill.multikillTier) }}</span>
              </div>
            </template>
            <template v-else-if="row.type === 'structure'">
              <div class="feed-item feed-item--structure">
                <Icon
                  :icon="row.structure.tier === 'inhibitor' ? 'game-icons:floating-crystal' : 'game-icons:watchtower'"
                  width="18"
                  height="18"
                  class="feed-structure-icon"
                  :class="row.structure.team === 1 ? 'feed-structure-icon--blue' : 'feed-structure-icon--red'"
                />
                <span class="feed-structure-label">{{ structureLabel(row.structure) }}</span>
              </div>
            </template>
            <template v-else>
              <div class="feed-item">
                <span class="feed-name" :class="row.buff.team === 1 ? 'feed-name--blue' : 'feed-name--red'">{{ row.buff.junglerName }}</span>
                <img :src="battleStore.getChampionImage(row.buff.junglerName)" :alt="row.buff.junglerName" class="feed-img" :class="row.buff.team === 1 ? 'feed-img--blue' : 'feed-img--red'" />
                <span class="buff-orb" :class="`buff-orb--${row.buff.buffType}`" />
                <span class="feed-buff-label" :class="`feed-buff-label--${row.buff.buffType}`">{{ buffLabel(row.buff) }}</span>
              </div>
            </template>
          </div>
        </TransitionGroup>
      </div>
    </Transition>

    <!-- Collapsed single-row bar -->
    <div class="ticker-bar">
      <TransitionGroup name="tick" tag="div" class="bar-items">
        <div
          v-for="row in barEntries"
          :key="row.key"
          class="bar-event"
          :class="multikillEventClass(row)"
          @mouseenter="onRowEnter(row, $event)"
          @mouseleave="onRowLeave"
        >
          <span class="bar-time">{{ formatFeedTime(row.t) }}</span>
          <div v-if="row.type === 'kill'" class="feed-item">
            <img :src="battleStore.getChampionImage(row.kill.killerName)" :alt="row.kill.killerName" class="feed-img" :class="row.kill.killerTeam === 1 ? 'feed-img--blue' : 'feed-img--red'" />
            <Icon icon="game-icons:saber-slash" width="20" height="20" class="feed-star" />
            <template v-if="row.kill.multikillTier">
              <img
                v-for="k in multikillChain(row.kill)"
                :key="`${k.t}-${k.victimName}`"
                :src="battleStore.getChampionImage(k.victimName)"
                :alt="k.victimName"
                class="feed-img feed-img--dead feed-img--chain"
                :class="row.kill.killerTeam === 1 ? 'feed-img--red' : 'feed-img--blue'"
              />
            </template>
            <img v-else :src="battleStore.getChampionImage(row.kill.victimName)" :alt="row.kill.victimName" class="feed-img feed-img--dead" :class="row.kill.killerTeam === 1 ? 'feed-img--red' : 'feed-img--blue'" />
            <span v-if="row.kill.multikillTier" class="feed-mk">{{ multikillLabel(row.kill.multikillTier) }}</span>
          </div>
          <div v-else-if="row.type === 'structure'" class="feed-item feed-item--structure">
            <Icon
              :icon="row.structure.tier === 'inhibitor' ? 'game-icons:floating-crystal' : 'game-icons:watchtower'"
              width="22"
              height="22"
              class="feed-structure-icon"
              :class="row.structure.team === 1 ? 'feed-structure-icon--blue' : 'feed-structure-icon--red'"
            />
            <span class="feed-structure-label">{{ structureLabel(row.structure) }}</span>
          </div>
          <div v-else class="feed-item">
            <img :src="battleStore.getChampionImage(row.buff.junglerName)" :alt="row.buff.junglerName" class="feed-img" :class="row.buff.team === 1 ? 'feed-img--blue' : 'feed-img--red'" />
            <span class="buff-orb" :class="`buff-orb--${row.buff.buffType}`" />
            <span class="feed-buff-label" :class="`feed-buff-label--${row.buff.buffType}`">{{ buffLabel(row.buff) }}</span>
          </div>
        </div>
      </TransitionGroup>

      <!-- Expand trigger: only hovering THIS zone opens the history panel -->
      <button
        class="ticker-expand"
        :class="{ 'ticker-expand--open': expanded }"
        type="button"
        title="Kill History"
        @mouseenter="expanded = true"
        @click="expanded = !expanded"
      >
        <Icon icon="game-icons:scroll-unfurled" class="ticker-expand-scroll" />
        <span class="ticker-expand-label">History</span>
        <span class="ticker-expand-chevron">▲</span>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="hoveredRow" class="feed-tooltip" :style="{ left: tipPos.x + 'px', top: tipPos.y + 'px' }">
        <template v-if="hoveredRow.type === 'kill'">
          <div
            class="tip-headline"
            :class="{
              'tip-headline--fb': hoveredRow.kill.firstBlood,
              'tip-headline--mk': !hoveredRow.kill.firstBlood && hoveredRow.kill.multikillTier,
            }"
          >
            {{ killHeadline(hoveredRow.kill) }}
          </div>
          <template v-if="hoveredRow.kill.multikillTier">
            <div class="tip-line">
              <span :class="hoveredRow.kill.killerTeam === 1 ? 'tip-name--blue' : 'tip-name--red'">{{ hoveredRow.kill.killerName }}</span>
              <span class="tip-verb"> eliminated:</span>
            </div>
            <div v-for="(k, i) in multikillChain(hoveredRow.kill)" :key="`${k.t}-${k.victimName}`" class="tip-victim">
              <span class="tip-victim-idx">{{ i + 1 }}</span>
              <img :src="battleStore.getChampionImage(k.victimName)" :alt="k.victimName" class="tip-victim-img" />
              <span :class="hoveredRow.kill.killerTeam === 1 ? 'tip-name--red' : 'tip-name--blue'">{{ k.victimName }}</span>
            </div>
          </template>
          <div v-else class="tip-line">
            <span :class="hoveredRow.kill.killerTeam === 1 ? 'tip-name--blue' : 'tip-name--red'">{{ hoveredRow.kill.killerName }}</span>
            <span class="tip-verb"> slew </span>
            <span :class="hoveredRow.kill.killerTeam === 1 ? 'tip-name--red' : 'tip-name--blue'">{{ hoveredRow.kill.victimName }}</span>
          </div>
          <div v-if="hoveredRow.kill.soloKill" class="tip-detail tip-detail--solo">Solo Kill — no assistance</div>
          <div v-else-if="hoveredRow.kill.assistNames?.length" class="tip-detail">
            Assisted by: {{ hoveredRow.kill.assistNames.join(', ') }}
          </div>
          <div class="tip-time">{{ formatFeedTime(hoveredRow.t) }} · {{ hoveredRow.kill.killerTeam === 1 ? 'Blue Team' : 'Red Team' }} kill</div>
        </template>
        <template v-else-if="hoveredRow.type === 'structure'">
          <div class="tip-headline">STRUCTURE DESTROYED</div>
          <div class="tip-line">
            <span :class="hoveredRow.structure.team === 1 ? 'tip-name--blue' : 'tip-name--red'">{{ hoveredRow.structure.team === 1 ? 'Blue Team' : 'Red Team' }}</span>
            <span class="tip-verb"> destroyed </span>
            <span class="tip-structure">{{ structureLabel(hoveredRow.structure) }}</span>
          </div>
          <div class="tip-time">{{ formatFeedTime(hoveredRow.t) }}</div>
        </template>
        <template v-else>
          <div class="tip-headline">BUFF SECURED</div>
          <div class="tip-line">
            <span :class="hoveredRow.buff.team === 1 ? 'tip-name--blue' : 'tip-name--red'">{{ hoveredRow.buff.junglerName }}</span>
            <span class="tip-verb"> claimed the </span>
            <span :class="`feed-buff-label--${hoveredRow.buff.buffType}`">{{ buffLabel(hoveredRow.buff) }}</span>
          </div>
          <div class="tip-time">{{ formatFeedTime(hoveredRow.t) }} · {{ hoveredRow.buff.team === 1 ? 'Blue Team' : 'Red Team' }} jungle</div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { multikillLabel } from '@/utils/battleMovement'
import type { BuffFeedEntry, KillFeedEntry, StructureFeedEntry, StructureTier } from '@/types'

const battleStore = useBattleStore()

type FeedRow =
  | { type: 'kill'; t: number; key: string; kill: KillFeedEntry }
  | { type: 'structure'; t: number; key: string; structure: StructureFeedEntry }
  | { type: 'buff'; t: number; key: string; buff: BuffFeedEntry }

const feedEntries = computed<FeedRow[]>(() => {
  const rows: FeedRow[] = [
    ...battleStore.killFeed.map(
      (e): FeedRow => ({ type: 'kill', t: e.t, key: `${e.t}-${e.killerName}-${e.victimName}`, kill: e }),
    ),
    ...battleStore.structureFeed.map(
      (e): FeedRow => ({ type: 'structure', t: e.t, key: e.id, structure: e }),
    ),
    ...battleStore.buffFeed.map(
      (e): FeedRow => ({ type: 'buff', t: e.t, key: `buff-${e.team}-${e.buffType}-${e.t}`, buff: e }),
    ),
  ]
  return rows.sort((a, b) => a.t - b.t).reverse()
})

function buffLabel(buff: BuffFeedEntry): string {
  return buff.buffType === 'blue' ? 'Blue Buff' : 'Red Buff'
}

const barEntries = computed<FeedRow[]>(() => feedEntries.value)

const expanded = ref(false)
const hoveredRow = ref<FeedRow | null>(null)
const tipPos = ref({ x: 0, y: 0 })

function onRootLeave() {
  expanded.value = false
  hoveredRow.value = null
}

function onRowEnter(row: FeedRow, event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tipPos.value = { x: rect.left + 24, y: rect.top - 8 }
  hoveredRow.value = row
}

function onRowLeave() {
  hoveredRow.value = null
}

/** Events become visible once the game clock (whole-minute steps) passes them — round up to that minute. */
function formatFeedTime(t: number): string {
  return battleStore.formatTime(Math.ceil(t / 60) * 60)
}

function rowAccentClass(row: FeedRow): string {
  if (row.type === 'structure') return 'feed-row--gold'
  if (row.type === 'buff') return row.buff.team === 1 ? 'feed-row--blue' : 'feed-row--red'
  return row.kill.killerTeam === 1 ? 'feed-row--blue' : 'feed-row--red'
}

/** Tier-escalated highlight for the whole event (incl. timestamp) — t2 subtle … t5 penta. */
function multikillEventClass(row: FeedRow): string {
  if (row.type !== 'kill' || !row.kill.multikillTier) return ''
  return `mk-event mk-event--t${Math.min(row.kill.multikillTier, 5)}`
}

/** All kills of a multikill chain (oldest first) — the entry with tier N is the Nth kill by that killer. */
function multikillChain(kill: KillFeedEntry): KillFeedEntry[] {
  if (!kill.multikillTier) return []
  return battleStore.killFeed
    .filter((e) => e.killerName === kill.killerName && e.t <= kill.t)
    .sort((a, b) => a.t - b.t)
    .slice(-kill.multikillTier)
}

function killHeadline(kill: KillFeedEntry): string {
  if (kill.firstBlood) return 'FIRST BLOOD'
  if (kill.multikillTier) return multikillLabel(kill.multikillTier)
  return 'CHAMPION SLAIN'
}

const STRUCTURE_TIER_LABELS: Record<StructureTier, string> = {
  outer: 'Outer Turret',
  inner: 'Inner Turret',
  inhibTurret: 'Inhib Turret',
  inhibitor: 'Inhibitor',
  nexusTurret: 'Nexus Turret',
}

function structureLabel(e: StructureFeedEntry): string {
  const label = STRUCTURE_TIER_LABELS[e.tier]
  return e.lane ? `${e.lane.toUpperCase()} · ${label}` : label
}

</script>

<style scoped>
.ticker-root {
  position: relative;
  flex-shrink: 0;
  /* fluid bar height shared between the bar and the docked history panel */
  --bar-h: clamp(28px, 4.8cqh, 36px);
  /* layout reservation stays below the bar height so the minimap keeps its
     size — the visible bar grows upward as an overlay */
  height: clamp(22px, 3.8cqh, 28px);
  /* above .objective-overlay (40), below .announce-layer (45) — the HUD footer
     must stay fully visible over the modal backdrop */
  z-index: 41;
}

/* ── Collapsed single-row bar ── */
.ticker-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--bar-h);
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.2cqw, 14px);
  padding: 0 0 0 clamp(10px, 1.4cqw, 16px);
  border-top: 2px solid #3e200a;
  background: #0d0c08;
  overflow: hidden;
}

/* ── Expand trigger (right edge) — the ONLY hover zone that opens the panel ── */
.ticker-expand {
  align-self: stretch;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 0 clamp(8px, 1.1cqw, 14px);
  flex-shrink: 0;
  border: none;
  border-left: 1px solid #3e200a;
  background: #12100a;
  color: #6a5820;
  font: inherit;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}
.ticker-expand:hover,
.ticker-expand--open {
  background: #1e1a10;
  color: #e8c040;
}
.ticker-expand:hover .ticker-expand-scroll,
.ticker-expand--open .ticker-expand-scroll {
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.6));
}

.ticker-expand-scroll {
  width: clamp(14px, 2.4cqh, 18px);
  height: clamp(14px, 2.4cqh, 18px);
  flex-shrink: 0;
  transition: filter 0.18s ease;
}

.ticker-expand-label {
  font-size: clamp(9px, 1.5cqh, 11px);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  white-space: nowrap;
}

.ticker-expand-chevron {
  font-size: 9px;
  transition: transform 0.18s ease;
}
.ticker-expand--open .ticker-expand-chevron {
  transform: rotate(180deg);
}

.bar-items {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  mask-image: linear-gradient(to right, black calc(100% - 48px), transparent);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 48px), transparent);
}

.bar-event {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.bar-event + .bar-event {
  border-left: 1px solid #3e200a;
  padding-left: 14px;
}

.bar-time {
  font-size: clamp(11px, 1.7cqh, 13px);
  letter-spacing: 1px;
  color: #6a5820;
  flex-shrink: 0;
}

/* Bar-only readability bumps — the expanded panel keeps its compact sizing */
.ticker-bar .feed-img {
  width: clamp(18px, 3.2cqh, 24px);
  height: clamp(18px, 3.2cqh, 24px);
}
.ticker-bar .feed-mk {
  font-size: clamp(10px, 1.6cqh, 12px);
}
.ticker-bar .feed-structure-label {
  font-size: clamp(11px, 1.7cqh, 13px);
}
.ticker-bar .feed-star {
  width: clamp(15px, 2.6cqh, 18px);
  height: clamp(15px, 2.6cqh, 18px);
}
.ticker-bar .feed-structure-icon {
  width: clamp(16px, 2.8cqh, 20px);
  height: clamp(16px, 2.8cqh, 20px);
}

/* ── Expanded history overlay ── */
.feed-panel {
  position: absolute;
  bottom: var(--bar-h); /* docks onto the top edge of the overlay-grown bar */
  left: 0;
  right: 0;
  height: min(248px, 42cqh);
  z-index: 8;
  display: flex;
  flex-direction: column;
  background: #0d0c08;
  border-top: 2px solid #3e200a;
  box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.75);
}

.feed-panel-goldline {
  height: 2px;
  flex-shrink: 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

.feed-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 8px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.feed-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 8px;
  border-left: 3px solid transparent;
  border-bottom: 1px solid #1f1a10;
  cursor: default;
}
.feed-row:last-child {
  border-bottom: none;
}
.feed-row:nth-child(even) {
  background: #12100a;
}
.feed-row--blue { border-left-color: #60a5fa; }
.feed-row--red { border-left-color: #f87171; }
.feed-row--gold { border-left-color: #e8c040; }
.feed-row:hover {
  background: #1c1c18;
}

.feed-time {
  font-size: 11px;
  letter-spacing: 1px;
  color: #6a5820;
  width: 38px;
  flex-shrink: 0;
  text-align: right;
}

/* ── Shared event markup ── */
.feed-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-shrink: 0;
}
/* ── Multikill event highlight — covers the WHOLE event incl. timestamp.
     Escalating ramp in the feed's warm multikill hue family (team blue/red stays unambiguous):
     t2 DOUBLE subtle amber → t3 TRIPLE orange → t4 QUADRA hot orange-red → t5 PENTA gold on fire ── */
.bar-event.mk-event {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid transparent;
}
.feed-row.mk-event {
  border-radius: 4px;
}

/* t2 — DOUBLE: frequent, so kept calm but clearly recognizable */
.bar-event.mk-event--t2,
.feed-row.mk-event--t2 { background: rgba(240, 104, 32, 0.08); }
.bar-event.mk-event--t2 { border-color: rgba(240, 104, 32, 0.3); }
.feed-row.mk-event--t2 { box-shadow: inset 0 0 0 1px rgba(240, 104, 32, 0.3); }
.mk-event--t2 .bar-time,
.mk-event--t2 .feed-time { color: #ffc46a; }
.mk-event--t2 .feed-mk { color: #ffc46a; text-shadow: none; }

/* t3 — TRIPLE */
.bar-event.mk-event--t3,
.feed-row.mk-event--t3 { background: rgba(240, 104, 32, 0.14); }
.bar-event.mk-event--t3 { border-color: rgba(240, 104, 32, 0.5); }
.feed-row.mk-event--t3 { box-shadow: inset 0 0 0 1px rgba(240, 104, 32, 0.5); }
.mk-event--t3 .bar-time,
.mk-event--t3 .feed-time { color: #ff9a40; }
.mk-event--t3 .feed-mk { color: #ff9a40; text-shadow: 0 0 8px rgba(240, 104, 32, 0.6); }

/* t4 — QUADRA */
.bar-event.mk-event--t4,
.feed-row.mk-event--t4 { background: rgba(240, 104, 32, 0.2); }
.bar-event.mk-event--t4 {
  border-color: rgba(255, 112, 56, 0.7);
  box-shadow: 0 0 10px rgba(255, 90, 40, 0.3);
}
.feed-row.mk-event--t4 {
  box-shadow: inset 0 0 0 1px rgba(255, 112, 56, 0.7), 0 0 10px rgba(255, 90, 40, 0.25);
}
.mk-event--t4 .bar-time,
.mk-event--t4 .feed-time { color: #ff7038; }
.mk-event--t4 .feed-mk { color: #ff7038; text-shadow: 0 0 10px rgba(255, 90, 40, 0.75); }

/* t5 — PENTA: gold on fiery gradient, pulsing glow */
.bar-event.mk-event--t5,
.feed-row.mk-event--t5 {
  background: linear-gradient(to bottom, rgba(240, 104, 32, 0.3), rgba(160, 40, 10, 0.25));
}
.bar-event.mk-event--t5 {
  border-color: #ff9a40;
  animation: mk-penta-pulse 1s ease-in-out infinite;
}
.feed-row.mk-event--t5 {
  animation: mk-penta-pulse-row 1s ease-in-out infinite;
}
.mk-event--t5 .bar-time,
.mk-event--t5 .feed-time { color: #ffd24a; }
.mk-event--t5 .feed-mk { color: #ffd24a; text-shadow: 0 0 12px rgba(240, 104, 32, 0.9); }

@keyframes mk-penta-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(240, 104, 32, 0.35); }
  50% { box-shadow: 0 0 16px rgba(240, 104, 32, 0.8); }
}
/* row variant keeps its inset ring while the outer glow breathes */
@keyframes mk-penta-pulse-row {
  0%, 100% { box-shadow: inset 0 0 0 1px #ff9a40, 0 0 6px rgba(240, 104, 32, 0.35); }
  50% { box-shadow: inset 0 0 0 1px #ff9a40, 0 0 16px rgba(240, 104, 32, 0.8); }
}

@media (prefers-reduced-motion: reduce) {
  .bar-event.mk-event--t5,
  .feed-row.mk-event--t5 {
    animation: none;
  }
  .feed-row.mk-event--t5 {
    box-shadow: inset 0 0 0 1px #ff9a40;
  }
}

.feed-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
}
.feed-name--blue { color: #60a5fa; }
.feed-name--red { color: #f87171; }
.feed-name--dead { color: #8a8578; }

.feed-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.feed-img--blue { border: 1px solid #60a5fa; }
.feed-img--red { border: 1px solid #f87171; }
.feed-img--dead { filter: grayscale(0.6) brightness(0.75); }
.feed-img--chain + .feed-img--chain { margin-left: -8px; }

.feed-star {
  color: #e8c040;
  flex-shrink: 0;
}

.feed-fb {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #cc6050;
  text-shadow: 0 0 8px rgba(204, 96, 80, 0.6);
  white-space: nowrap;
}

.feed-mk {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #ff9a40;
  text-shadow: 0 0 8px rgba(240, 104, 32, 0.6);
  white-space: nowrap;
}

.feed-structure-icon--blue { color: #60a5fa; }
.feed-structure-icon--red { color: #f87171; }
.feed-structure-label {
  font-size: 12px;
  letter-spacing: 1px;
  color: #e8c040;
  white-space: nowrap;
}

/* ── Jungle buff rows ── */
.buff-orb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.buff-orb--blue {
  background: radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1d4ed8);
  box-shadow: 0 0 7px rgba(59, 130, 246, 0.9);
}
.buff-orb--red {
  background: radial-gradient(circle at 35% 30%, #fecaca, #ef4444 55%, #b91c1c);
  box-shadow: 0 0 7px rgba(239, 68, 68, 0.9);
}
.feed-buff-label {
  font-size: 12px;
  letter-spacing: 1px;
  white-space: nowrap;
}
.feed-buff-label--blue { color: #93c5fd; }
.feed-buff-label--red { color: #fca5a5; }

/* ── Transitions ── */
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.feed-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.feed-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.feed-leave-active {
  display: none;
}
.feed-move {
  transition: transform 0.3s ease;
}

.tick-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.tick-enter-from {
  opacity: 0;
  transform: translateX(-14px);
}
.tick-leave-active {
  display: none;
}
.tick-move {
  transition: transform 0.3s ease;
}
</style>

<style>
/* Teleported to <body> — cannot be scoped */
.feed-tooltip {
  position: fixed;
  transform: translateY(-100%);
  z-index: 90;
  pointer-events: none;
  min-width: 200px;
  max-width: 320px;
  padding: 8px 12px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
}

.feed-tooltip .tip-headline {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #e8c040;
  margin-bottom: 4px;
}
.feed-tooltip .tip-headline--fb { color: #cc6050; }
.feed-tooltip .tip-headline--mk { color: #ff9a40; }

.feed-tooltip .tip-line {
  font-size: 12px;
  color: #c8c0a8;
}
.feed-tooltip .tip-name--blue { color: #60a5fa; }
.feed-tooltip .tip-name--red { color: #f87171; }
.feed-tooltip .tip-verb { color: #8a8578; }
.feed-tooltip .tip-structure { color: #e8c040; }

.feed-tooltip .tip-victim {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 12px;
}
.feed-tooltip .tip-victim-idx {
  font-size: 10px;
  color: #6a5820;
  width: 12px;
  text-align: right;
  flex-shrink: 0;
}
.feed-tooltip .tip-victim-img {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.feed-tooltip .tip-detail {
  margin-top: 3px;
  font-size: 10px;
  color: #8a8578;
}
.feed-tooltip .tip-detail--solo { color: #ff9a40; }

.feed-tooltip .tip-time {
  margin-top: 5px;
  padding-top: 4px;
  border-top: 1px solid #3e200a;
  font-size: 10px;
  letter-spacing: 1px;
  color: #6a5820;
}
</style>
