<script setup lang="ts">
/**
 * The shop's left column — the domain, then every facet of it, standing open.
 *
 * The filters used to live in a drawer above the grid: opening it pushed the
 * cards down, so narrowing a list moved the list. Across the full tab there is
 * room to just leave them out, and a facet you can see is one you remember you
 * set.
 *
 * The Champions/Items switch sits at the TOP of this column rather than in the
 * command bar: it is the first filter decision, and every group below it means
 * something different depending on it. The bar above is the search, and nothing
 * else.
 *
 * Chips are ROWS here, not pills. Wrapped pills would break "Void Sovereign"
 * across two lines and turn a facet list into a shape puzzle. A row has a fixed
 * anchor for the icon, the name and the count, so the eye runs down one edge —
 * and the count is what makes the facet honest: it says what picking it would
 * leave over.
 *
 * The rail knows nothing about champions or items. It renders the groups it is
 * handed and reports back which chip was hit; what a facet MEANS stays with the
 * shop, which is the only place that can resolve it against the catalog.
 */
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { highlightSegments } from '@/utils/ui/searchHighlight'
import type { ShopFacetGroup } from '@/types'

type ShopDomain = 'champions' | 'items'

const props = defineProps<{
  groups: ShopFacetGroup[]
  folded: boolean
  /** Shown above every group — the one cut that applies to both domains. */
  affordableOnly: boolean
  affordableCount: number
  domain: ShopDomain
  /** Cards each half is holding right now — the split has to stay honest. */
  domainCounts: Record<ShopDomain, number>
  /** Already lowercased and trimmed; only used to mark matched label parts. */
  query: string
}>()

const emit = defineEmits<{
  toggle: [groupId: string, chipId: string]
  fold: [folded: boolean]
  'update:affordableOnly': [value: boolean]
  'update:domain': [domain: ShopDomain]
}>()

const DOMAINS: Array<{ id: ShopDomain; label: string; icon: string; tip: (n: number) => string }> = [
  {
    id: 'champions',
    label: 'Champions',
    icon: 'ph:users-three-fill',
    tip: (n) =>
      `${n} champion(s) you can find and recruit right now — the rest belong to tiers that unlock in later galaxies`,
  },
  {
    id: 'items',
    label: 'Items',
    icon: 'ph:backpack-fill',
    tip: (n) => `${n} item(s) on offer under the current filters`,
  },
]

/* Fold state of the groups. Pure rail UI, so it lives here — and the two
   domains never share a group id, which is why the domain switch needs no
   reset. */
const collapsedGroups = ref(new Set<string>())
function toggleGroup(id: string): void {
  const next = new Set(collapsedGroups.value)
  if (!next.delete(id)) next.add(id)
  collapsedGroups.value = next
}

const setCounts = computed<Record<string, number>>(() =>
  Object.fromEntries(props.groups.map((g) => [g.id, g.chips.filter((c) => c.active).length])),
)
const activeTotal = computed(
  () => Object.values(setCounts.value).reduce((a, b) => a + b, 0) + (props.affordableOnly ? 1 : 0),
)
</script>

<template>
  <aside class="cs-facets" :class="{ 'cs-facets--folded': folded }">
    <button
      class="cs-facets-grip"
      v-tip="folded ? 'Show filters' : 'Hide filters'"
      :aria-label="folded ? 'Show filters' : 'Hide filters'"
      :aria-expanded="!folded"
      @click="emit('fold', !folded)"
    >
      <Icon icon="lucide:sliders-horizontal" width="17" height="17" />
      <span v-if="!folded" class="cs-facets-grip-label">Filters</span>
      <span v-if="!folded && activeTotal" class="cs-facets-grip-count">{{ activeTotal }}</span>
      <span class="cs-facets-grip-arrow">{{ folded ? '›' : '‹' }}</span>
    </button>

    <!-- The domain sits above the divider, not inside a group: every facet
         below it is read against it. -->
    <div class="cs-doms" role="tablist" aria-label="Shop domain">
      <button
        v-for="d in DOMAINS"
        :key="d.id"
        class="cs-dom"
        :class="{ 'cs-dom--on': domain === d.id }"
        role="tab"
        :aria-selected="domain === d.id"
        v-tip="d.tip(domainCounts[d.id])"
        @click="emit('update:domain', d.id)"
      >
        <Icon :icon="d.icon" width="22" height="22" class="cs-dom-icon" />
        <span class="cs-dom-label">{{ d.label }}</span>
        <span class="cs-dom-count">{{ domainCounts[d.id] }}</span>
      </button>
    </div>

    <div class="cs-facets-scroll rpg-scrollbar">
      <!-- Affordable — above the groups because it cuts across all of them:
           what the player can pay for right now is a different question from
           what kind of thing it is. -->
      <button
        class="cs-facet-row cs-facet-row--afford"
        :class="{ 'cs-facet-row--active': affordableOnly }"
        v-tip="`${affordableCount} affordable right now`"
        @click="emit('update:affordableOnly', !affordableOnly)"
      >
        <Icon icon="game-icons:coins" width="20" height="20" class="cs-facet-icon" />
        <span class="cs-facet-label">Affordable</span>
        <span class="cs-facet-count">{{ affordableCount }}</span>
      </button>

      <div v-for="group in groups" :key="group.id" class="cs-facet-group">
        <!-- Traits and Origins carry ~25 rows between them and push the short
             groups out of sight; the head folds its own. The count stays on a
             closed head, so a filter can never hide its own cause. -->
        <button
          class="cs-facet-head"
          :class="{ 'cs-facet-head--closed': collapsedGroups.has(group.id) }"
          :aria-expanded="!collapsedGroups.has(group.id)"
          @click="toggleGroup(group.id)"
        >
          <Icon icon="lucide:chevron-down" width="14" height="14" class="cs-facet-chev" />
          <span class="cs-facet-head-label">{{ group.label }}</span>
          <span v-if="setCounts[group.id]" class="cs-facet-head-count">
            {{ setCounts[group.id] }}
          </span>
        </button>

        <template v-if="!collapsedGroups.has(group.id)">
          <p v-if="group.chips.length === 0" class="trait-empty-state">Nothing here yet</p>
          <button
            v-for="chip in group.chips"
            :key="chip.id"
            class="cs-facet-row"
            :class="{
              'cs-facet-row--active': chip.active,
              'cs-facet-row--disabled': chip.disabled,
            }"
            :style="{ '--chip-color': chip.color ?? '#c89040' }"
            :disabled="chip.disabled"
            v-tip="chip.title ?? chip.label"
            @click="emit('toggle', group.id, chip.id)"
          >
            <img v-if="chip.image" :src="chip.image" :alt="chip.label" class="cs-facet-img" />
            <Icon
              v-else-if="chip.icon"
              :icon="chip.icon"
              width="20"
              height="20"
              class="cs-facet-icon"
            />
            <span class="cs-facet-label">
              <template v-for="(seg, i) in highlightSegments(chip.label, query)" :key="i">
                <mark v-if="seg.hit" class="cs-facet-mark">{{ seg.text }}</mark>
                <template v-else>{{ seg.text }}</template>
              </template>
            </span>
            <Icon
              v-if="chip.locked"
              icon="lucide:lock"
              width="14"
              height="14"
              class="cs-facet-lock"
            />
            <span v-else-if="chip.count != null" class="cs-facet-count">{{ chip.count }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Folded: the domain stays switchable and the group icons still say WHICH
         facets the column holds. Clicking a group is the fastest way back. -->
    <div class="cs-facets-stubs">
      <button
        v-for="d in DOMAINS"
        :key="'dom-' + d.id"
        class="cs-facet-stub cs-facet-stub--dom"
        :class="{ 'cs-facet-stub--on': domain === d.id }"
        v-tip="d.tip(domainCounts[d.id])"
        :aria-label="`Show ${d.label}`"
        @click="emit('update:domain', d.id)"
      >
        <Icon :icon="d.icon" width="21" height="21" />
        <span class="cs-stub-count">{{ domainCounts[d.id] }}</span>
      </button>
      <span class="cs-stub-sep" />
      <button
        v-for="group in groups"
        :key="'stub-' + group.id"
        class="cs-facet-stub"
        :class="{ 'cs-facet-stub--set': setCounts[group.id] > 0 }"
        v-tip="group.label"
        :aria-label="`Show ${group.label} filters`"
        @click="emit('fold', false)"
      >
        <Icon :icon="group.icon" width="20" height="20" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.cs-facets {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgba(18, 16, 10, var(--cs-veil, 1));
  border-right: 2px solid #5c3310;
}
.cs-facets-grip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  height: 44px;
  padding: 0 11px;
  background: #1e1006;
  border: none;
  border-bottom: 1px solid #5c3310;
  color: #c89040;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s;
}
.cs-facets-grip:hover {
  color: #e8c040;
}
.cs-facets-grip-label {
  flex: 1;
  text-align: left;
}
.cs-facets-grip-count {
  min-width: 20px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid #7a4e20;
  color: #e8c040;
  font-size: 10.5px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.cs-facets-grip-arrow {
  font-size: 14px;
  opacity: 0.75;
}
.cs-facets--folded .cs-facets-grip {
  justify-content: center;
  padding: 0;
}
.cs-facets--folded .cs-facets-grip-arrow {
  display: none;
}
.cs-facets--folded .cs-facets-grip svg {
  width: 15px;
  height: 15px;
}

/* ── Domain ──
   Two rows, not a segmented pair: they read as the first two entries of the
   column and set what everything under them means. */
.cs-doms {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
  padding: 10px 10px 11px;
  border-bottom: 1px solid #3e200a;
}
.cs-facets--folded .cs-doms {
  display: none;
}
.cs-dom {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 38px;
  padding: 0 9px;
  border: 1px solid #3e200a;
  border-left: 3px solid #3e200a;
  border-radius: 4px;
  background: #1c1c18;
  color: #8a6030;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}
.cs-dom:hover {
  background: #201a10;
  color: #c89040;
  border-left-color: #7a4e20;
}
.cs-dom--on {
  background: #2a1c0c;
  color: #e8c040;
  border-color: #7a4e20;
  border-left-color: #e8c040;
}
.cs-dom-icon {
  flex-shrink: 0;
}
.cs-dom-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* The count is what keeps the split honest — it says how many cards the OTHER
   half is holding, so a search can never quietly land out of sight. */
.cs-dom-count {
  flex-shrink: 0;
  min-width: 24px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid #3e200a;
  font-size: 10.5px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.cs-dom--on .cs-dom-count {
  border-color: #7a4e20;
  color: #e8c060;
}

.cs-facets-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 9px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cs-facets--folded .cs-facets-scroll {
  display: none;
}

.cs-facet-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* ── Group head ──
   Not `.filter-divider`: that one is global and still carries the swap grid. */
.cs-facet-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin-top: 9px;
  padding: 3px 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #8a6030;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  text-align: left;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}
.cs-facet-head:hover {
  color: #c89040;
  background: #1c1a12;
}
.cs-facet-chev {
  flex-shrink: 0;
  opacity: 0.7;
  transition: transform 0.15s;
}
.cs-facet-head--closed .cs-facet-chev {
  transform: rotate(-90deg);
}
.cs-facet-head-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* A folded group must still admit that it holds a filter — otherwise an empty
   grid has no visible cause. */
.cs-facet-head-count {
  flex-shrink: 0;
  min-width: 20px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid #7a4e20;
  color: #e8c040;
  font-size: 10px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

/* One row, three anchors: mark, name, number. The left border is where the
   facet's own colour lives — a full tinted fill on every row would make the
   column louder than the cards it filters. */
.cs-facet-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 9px;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #b09a74;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.13s,
    color 0.13s,
    border-color 0.13s;
}
.cs-facet-row:hover:not(:disabled) {
  background: #1c1a12;
  color: #e8dcc0;
  border-left-color: var(--chip-color, #c89040);
}
.cs-facet-row--active {
  background: color-mix(in srgb, var(--chip-color, #e8c040) 26%, rgba(18, 16, 10, var(--cs-veil, 1)));
  border-color: color-mix(in srgb, var(--chip-color, #e8c040) 50%, transparent);
  border-left-color: var(--chip-color, #e8c040);
  color: #fff4dc;
}
.cs-facet-row--disabled {
  opacity: 0.34;
  cursor: not-allowed;
}
.cs-facet-row--afford {
  --chip-color: #52b830;
}
.cs-facet-icon {
  flex-shrink: 0;
  color: var(--chip-color, #c89040);
}
.cs-facet-row--active .cs-facet-icon {
  color: #fff;
}
.cs-facet-img {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: contain;
}
.cs-facet-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-facet-mark {
  background: rgba(232, 192, 64, 0.28);
  color: #fff2c8;
  border-radius: 2px;
  padding: 0 1px;
}
.cs-facet-count {
  flex-shrink: 0;
  min-width: 24px;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid #3e200a;
  font-size: 10.5px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: #7a6848;
}
.cs-facet-row--active .cs-facet-count {
  border-color: #7a4e20;
  color: #e8c040;
}
.cs-facet-lock {
  flex-shrink: 0;
  color: #7a4e20;
}

/* ── Folded stubs ── */
.cs-facets-stubs {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 0;
}
.cs-facets--folded .cs-facets-stubs {
  display: flex;
}
.cs-facet-stub {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 30px;
  border: 1px solid #3e200a;
  border-radius: 4px;
  background: #16140e;
  color: #8a6030;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}
.cs-facet-stub:hover {
  color: #e8c040;
  border-color: #5c3310;
}
.cs-facet-stub--dom.cs-facet-stub--on {
  background: #2a1c0c;
  color: #e8c040;
  border-color: #7a4e20;
}
/* Folded, this number is the only thing left saying what the other half holds. */
.cs-stub-count {
  position: absolute;
  right: -4px;
  bottom: -4px;
  min-width: 16px;
  padding: 0 3px;
  border-radius: 4px;
  background: #14100a;
  border: 1px solid #5c3310;
  color: #c89040;
  font-size: 9px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 13px;
  text-align: center;
}
.cs-facet-stub--on .cs-stub-count {
  border-color: #7a4e20;
  color: #e8c060;
}
.cs-stub-sep {
  width: 22px;
  height: 2px;
  margin: 3px 0;
  background: #3e200a;
}
/* A folded rail must still admit that a filter is set — otherwise an empty grid
   has no visible cause. */
.cs-facet-stub--set {
  color: #e8c040;
  border-color: #c89040;
}
</style>
