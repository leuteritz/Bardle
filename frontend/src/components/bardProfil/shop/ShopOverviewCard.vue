<script setup lang="ts">
/**
 * What stands in the detail column while nothing is picked.
 *
 * The column is permanent now, so "nothing selected" is a state the player will
 * see every time the shop opens — an empty panel that wide would read as a bug.
 * It answers the question the shop itself cannot: how far along the collection
 * is, what the next gate is, and which of the cards below can be paid for right
 * now. The picks are the point: three names the player can act on beats a wall
 * of cards where affordability is a per-card discovery.
 */
import { Icon } from '@iconify/vue'
import type { ShopOverviewPick, ShopOverviewSet, ShopOverviewTier } from '@/types'

const props = defineProps<{
  domain: 'champions' | 'items'
  owned: number
  total: number
  galaxy: number
  nextTier: ShopOverviewTier | null
  picks: ShopOverviewPick[]
  sets: ShopOverviewSet[]
  /** Why `picks` is empty — the shop knows, this card only prints it. */
  emptyHint: string
}>()

const emit = defineEmits<{ pick: [kind: 'champion' | 'item', id: string] }>()

const pct = () => (props.total > 0 ? Math.round((props.owned / props.total) * 100) : 0)
</script>

<template>
  <div class="cs-overview">
    <div class="cs-ov-head">
      <Icon
        :icon="domain === 'items' ? 'ph:backpack-fill' : 'ph:users-three-fill'"
        width="20"
        height="20"
        class="cs-ov-head-icon"
      />
      <span class="cs-ov-head-title">{{ domain === 'items' ? 'Armoury' : 'Roster' }}</span>
    </div>

    <div class="cs-ov-progress">
      <div class="cs-ov-progress-row">
        <span class="cs-ov-progress-num">{{ owned }}</span>
        <span class="cs-ov-progress-of">/ {{ total }}</span>
        <span class="cs-ov-progress-label">
          {{ domain === 'items' ? 'items owned' : 'recruited' }}
        </span>
        <span class="cs-ov-progress-pct">{{ pct() }}%</span>
      </div>
      <div class="cs-ov-bar">
        <div class="cs-ov-bar-fill" :style="{ transform: `scaleX(${pct() / 100})` }"></div>
      </div>
    </div>

    <!-- ══ Champions ══ -->
    <template v-if="domain === 'champions'">
      <div class="cs-ov-section">
        <div class="cs-ov-section-title">Reach</div>
        <div class="cs-ov-gate">
          <div class="cs-ov-gate-now">
            <Icon icon="game-icons:galaxy" width="17" height="17" />
            <span>Galaxy {{ galaxy }}</span>
          </div>
          <template v-if="nextTier">
            <span class="cs-ov-gate-arrow">→</span>
            <div class="cs-ov-gate-next" :style="{ '--tier-c': nextTier.color }">
              <Icon :icon="nextTier.icon" width="17" height="17" />
              <span class="cs-ov-gate-next-name">★{{ nextTier.starLevel }} {{ nextTier.name }}</span>
              <span class="cs-ov-gate-next-req">Galaxy {{ nextTier.requiredGalaxy }}</span>
            </div>
          </template>
          <span v-else class="cs-ov-gate-done">Every tier reachable</span>
        </div>
      </div>
    </template>

    <!-- ══ Items ══ -->
    <template v-else>
      <div v-if="sets.length" class="cs-ov-section">
        <div class="cs-ov-section-title">Set Bonuses</div>
        <div
          v-for="set in sets"
          :key="set.id"
          class="cs-ov-set"
          :class="{ 'cs-ov-set--active': set.active }"
        >
          <img v-if="set.image" :src="set.image" :alt="set.name" class="cs-ov-set-img" />
          <Icon v-else-if="set.icon" :icon="set.icon" width="19" height="19" class="cs-ov-set-icon" />
          <div class="cs-ov-set-text">
            <span class="cs-ov-set-name">{{ set.name }}</span>
            <span class="cs-ov-set-desc">{{ set.description }}</span>
          </div>
          <span class="cs-ov-set-count">{{ set.ownedParts }}/{{ set.totalParts }}</span>
        </div>
      </div>
    </template>

    <!-- Affordable picks — the whole reason this panel is worth its space. -->
    <div class="cs-ov-section cs-ov-section--grow">
      <div class="cs-ov-section-title">Within reach</div>
      <div v-if="picks.length === 0" class="cs-ov-empty">
        <Icon icon="game-icons:coins" width="26" height="26" />
        <span>{{ emptyHint }}</span>
      </div>
      <button
        v-for="pick in picks"
        :key="pick.id"
        class="cs-ov-pick"
        :style="{ '--pick-c': pick.color }"
        :title="`Open ${pick.name}`"
        @click="emit('pick', pick.kind, pick.id)"
      >
        <img v-if="pick.image" :src="pick.image" :alt="pick.name" class="cs-ov-pick-img" />
        <Icon v-else-if="pick.icon" :icon="pick.icon" width="24" height="24" class="cs-ov-pick-glyph" />
        <div class="cs-ov-pick-text">
          <span class="cs-ov-pick-name">{{ pick.name }}</span>
          <span class="cs-ov-pick-sub">{{ pick.sub }}</span>
        </div>
        <span class="cs-ov-pick-arrow">→</span>
      </button>
    </div>

    <p class="cs-ov-hint">Pick a card to open its page here.</p>
  </div>
</template>

<style scoped>
.cs-overview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  padding: 14px 14px 12px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.cs-ov-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.cs-ov-head-icon {
  color: #e8c040;
}
.cs-ov-head-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #e8c040;
}

/* ── Progress ── */
.cs-ov-progress {
  flex-shrink: 0;
  padding: 10px 11px;
  background: rgba(26, 16, 8, var(--cs-block, 1));
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.cs-ov-progress-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
}
.cs-ov-progress-num {
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.cs-ov-progress-of {
  font-size: 13px;
  color: #8a6030;
  font-variant-numeric: tabular-nums;
}
.cs-ov-progress-label {
  flex: 1;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a6030;
}
.cs-ov-progress-pct {
  font-size: 12px;
  font-weight: 800;
  color: #c89040;
  font-variant-numeric: tabular-nums;
}
.cs-ov-bar {
  margin-top: 7px;
  height: 6px;
  border-radius: 3px;
  background: #0d0b06;
  border: 1px solid #2a1808;
  overflow: hidden;
}
.cs-ov-bar-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #c89040, #e8c060);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ── Sections ── */
.cs-ov-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
}
.cs-ov-section--grow {
  flex: 1;
  min-height: 0;
}
.cs-ov-section-title {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a6030;
}

/* ── Reach ── */
.cs-ov-gate {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  background: rgba(22, 20, 14, var(--cs-block, 1));
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.cs-ov-gate-now {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: #c8b088;
}
.cs-ov-gate-arrow {
  color: #5c3310;
}
.cs-ov-gate-next {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--tier-c, #e8c040);
}
.cs-ov-gate-next-req {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid color-mix(in srgb, var(--tier-c, #e8c040) 45%, transparent);
  font-size: 10px;
  letter-spacing: 0.06em;
}
.cs-ov-gate-done {
  font-size: 11.5px;
  font-style: italic;
  color: #6e5c3c;
}

/* ── Sets ── */
.cs-ov-set {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  background: rgba(22, 20, 14, var(--cs-block, 1));
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.cs-ov-set--active {
  border-color: #52b830;
  background: rgba(18, 24, 14, var(--cs-block, 1));
}
.cs-ov-set-icon {
  flex-shrink: 0;
  color: #b87ed8;
}
.cs-ov-set-img {
  width: 19px;
  height: 19px;
  flex-shrink: 0;
  object-fit: contain;
}
.cs-ov-set--active .cs-ov-set-icon {
  color: #6ec040;
}
.cs-ov-set-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.cs-ov-set-name {
  font-size: 12px;
  font-weight: 700;
  color: #e8dcc0;
}
.cs-ov-set-desc {
  font-size: 10.5px;
  color: #8a7a58;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-ov-set-count {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  color: #c89040;
  font-variant-numeric: tabular-nums;
}

/* ── Picks ── */
.cs-ov-pick {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 9px 6px 6px;
  background: rgba(26, 24, 16, var(--cs-block, 1));
  border: 1px solid #3e200a;
  border-left: 3px solid var(--pick-c, #c89040);
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.14s,
    border-color 0.14s;
}
.cs-ov-pick:hover {
  background: #241f14;
  border-color: var(--pick-c, #e8c040);
}
.cs-ov-pick-img {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 4px;
  object-fit: cover;
}
.cs-ov-pick-glyph {
  width: 34px;
  flex-shrink: 0;
  color: var(--pick-c, #c89040);
}
.cs-ov-pick-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.cs-ov-pick-name {
  font-size: 12.5px;
  font-weight: 700;
  color: #e8dcc0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-ov-pick-sub {
  font-size: 10.5px;
  color: #8a7a58;
}
.cs-ov-pick-arrow {
  flex-shrink: 0;
  color: #5c3310;
  font-size: 13px;
}
.cs-ov-pick:hover .cs-ov-pick-arrow {
  color: var(--pick-c, #e8c040);
}

.cs-ov-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 18px 10px;
  color: #5c4a30;
  font-size: 11.5px;
  text-align: center;
}
.cs-ov-hint {
  flex-shrink: 0;
  padding-top: 2px;
  font-size: 10.5px;
  font-style: italic;
  color: #5c4a30;
  text-align: center;
}
</style>
