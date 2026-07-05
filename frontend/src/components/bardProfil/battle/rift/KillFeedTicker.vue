<template>
  <div class="ticker-root" @mouseenter="expanded = true" @mouseleave="onRootLeave">
    <!-- Expanded history overlay — floats above the minimap, flex layout untouched -->
    <Transition name="panel">
      <div v-if="expanded" class="feed-panel">
        <div class="feed-panel-goldline"></div>
        <TransitionGroup name="feed" tag="div" class="feed-list">
          <div
            v-for="row in feedEntries"
            :key="row.key"
            class="feed-row"
            :class="rowAccentClass(row)"
            @mouseenter="onRowEnter(row, $event)"
            @mouseleave="onRowLeave"
          >
            <span class="feed-time">{{ formatFeedTime(row.t) }}</span>

            <template v-if="row.type === 'kill'">
              <div class="feed-item" :class="{ 'feed-item--multikill': row.kill.multikillTier }">
                <span class="feed-name" :class="row.kill.killerTeam === 1 ? 'feed-name--blue' : 'feed-name--red'">{{ row.kill.killerName }}</span>
                <img :src="battleStore.getChampionImage(row.kill.killerName)" :alt="row.kill.killerName" class="feed-img" :class="row.kill.killerTeam === 1 ? 'feed-img--blue' : 'feed-img--red'" />
                <span class="feed-star">★</span>
                <img :src="battleStore.getChampionImage(row.kill.victimName)" :alt="row.kill.victimName" class="feed-img feed-img--dead" :class="row.kill.killerTeam === 1 ? 'feed-img--red' : 'feed-img--blue'" />
                <span class="feed-name feed-name--dead">{{ row.kill.victimName }}</span>
                <span v-if="row.kill.firstBlood" class="feed-fb">FIRST BLOOD</span>
                <span v-if="row.kill.multikillTier" class="feed-mk">{{ multikillLabel(row.kill.multikillTier) }}</span>
              </div>
            </template>
            <template v-else>
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
          </div>
        </TransitionGroup>
      </div>
    </Transition>

    <!-- Collapsed single-row bar -->
    <div class="ticker-bar">
      <TransitionGroup name="tick" tag="div" class="bar-items">
        <div v-for="row in barEntries" :key="row.key" class="bar-event">
          <span class="bar-time">{{ formatFeedTime(row.t) }}</span>
          <div
            v-if="row.type === 'kill'"
            class="feed-item"
            :class="{ 'feed-item--multikill': row.kill.multikillTier }"
          >
            <img :src="battleStore.getChampionImage(row.kill.killerName)" :alt="row.kill.killerName" class="feed-img" :class="row.kill.killerTeam === 1 ? 'feed-img--blue' : 'feed-img--red'" />
            <span class="feed-star">★</span>
            <img :src="battleStore.getChampionImage(row.kill.victimName)" :alt="row.kill.victimName" class="feed-img feed-img--dead" :class="row.kill.killerTeam === 1 ? 'feed-img--red' : 'feed-img--blue'" />
            <span v-if="row.kill.multikillTier" class="feed-mk">{{ multikillLabel(row.kill.multikillTier) }}</span>
          </div>
          <div v-else class="feed-item feed-item--structure">
            <Icon
              :icon="row.structure.tier === 'inhibitor' ? 'game-icons:floating-crystal' : 'game-icons:watchtower'"
              width="18"
              height="18"
              class="feed-structure-icon"
              :class="row.structure.team === 1 ? 'feed-structure-icon--blue' : 'feed-structure-icon--red'"
            />
            <span class="feed-structure-label">{{ structureLabel(row.structure) }}</span>
          </div>
        </div>
      </TransitionGroup>

      <span class="ticker-chevron" :class="{ 'ticker-chevron--open': expanded }">▲</span>
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
          <div class="tip-line">
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
        <template v-else>
          <div class="tip-headline">STRUCTURE DESTROYED</div>
          <div class="tip-line">
            <span :class="hoveredRow.structure.team === 1 ? 'tip-name--blue' : 'tip-name--red'">{{ hoveredRow.structure.team === 1 ? 'Blue Team' : 'Red Team' }}</span>
            <span class="tip-verb"> destroyed </span>
            <span class="tip-structure">{{ structureLabel(hoveredRow.structure) }}</span>
          </div>
          <div class="tip-time">{{ formatFeedTime(hoveredRow.t) }}</div>
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
import type { KillFeedEntry, StructureFeedEntry, StructureTier } from '@/types'

const battleStore = useBattleStore()

type FeedRow =
  | { type: 'kill'; t: number; key: string; kill: KillFeedEntry }
  | { type: 'structure'; t: number; key: string; structure: StructureFeedEntry }

const feedEntries = computed<FeedRow[]>(() => {
  const rows: FeedRow[] = [
    ...battleStore.killFeed.map(
      (e): FeedRow => ({ type: 'kill', t: e.t, key: `${e.t}-${e.killerName}-${e.victimName}`, kill: e }),
    ),
    ...battleStore.structureFeed.map(
      (e): FeedRow => ({ type: 'structure', t: e.t, key: e.id, structure: e }),
    ),
  ]
  return rows.sort((a, b) => a.t - b.t).reverse()
})

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
  return row.kill.killerTeam === 1 ? 'feed-row--blue' : 'feed-row--red'
}

function killHeadline(kill: KillFeedEntry): string {
  if (kill.firstBlood) return 'FIRST BLOOD'
  if (kill.multikillTier) return `${multikillLabel(kill.multikillTier)} KILL`
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
}

/* ── Collapsed single-row bar ── */
.ticker-bar {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  border-top: 2px solid #3e200a;
  background: #0d0c08;
  overflow: hidden;
}
.ticker-root:hover .ticker-bar {
  background: #12100a;
}

.ticker-chevron {
  font-size: 8px;
  color: #6a5820;
  flex-shrink: 0;
  margin-left: auto;
  transition: transform 0.18s ease, color 0.18s ease;
}
.ticker-chevron--open {
  transform: rotate(180deg);
  color: #e8c040;
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
  font-size: 11px;
  letter-spacing: 1px;
  color: #6a5820;
  flex-shrink: 0;
}

/* ── Expanded history overlay ── */
.feed-panel {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  height: 248px;
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
.feed-item--multikill {
  padding: 2px 7px;
  background: rgba(240, 104, 32, 0.12);
  border: 1px solid rgba(240, 104, 32, 0.45);
  border-radius: 4px;
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

.feed-star {
  font-size: 15px;
  color: #e8c040;
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
