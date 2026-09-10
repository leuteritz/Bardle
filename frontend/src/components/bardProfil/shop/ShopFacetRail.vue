<script setup lang="ts">
/** Permanent filter rail for the shop atlas. */
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { highlightSegments } from '@/utils/ui/searchHighlight'
import type { ShopFacetGroup } from '@/types'

type ShopDomain = 'champions' | 'items'

const props = defineProps<{
  groups: ShopFacetGroup[]
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
  'update:affordableOnly': [value: boolean]
  'update:domain': [domain: ShopDomain]
}>()

const DOMAINS: Array<{ id: ShopDomain; label: string; icon: string; tip: (n: number) => string }> =
  [
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
  <aside class="cs-facets">
    <div class="cs-facets-grip" role="heading" aria-level="2">
      <Icon icon="lucide:sliders-horizontal" width="20" height="20" />
      <span class="cs-facets-grip-label">Filters</span>
      <span v-if="activeTotal" class="cs-facets-grip-count">{{ activeTotal }}</span>
    </div>

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
      <section class="cs-facet-panel cs-facet-panel--afford">
        <button
          class="cs-facet-row cs-facet-row--afford"
          :class="{ 'cs-facet-row--active': affordableOnly }"
          v-tip="`${affordableCount} affordable right now`"
          @click="emit('update:affordableOnly', !affordableOnly)"
        >
          <span class="cs-facet-crest" aria-hidden="true">
            <Icon icon="game-icons:coins" width="22" height="22" class="cs-facet-icon" />
          </span>
          <span class="cs-facet-copy">
            <small>Availability</small>
            <span class="cs-facet-label">Affordable</span>
          </span>
          <span class="cs-facet-count">{{ affordableCount }}</span>
        </button>
      </section>

      <section
        v-for="group in groups"
        :key="group.id"
        class="cs-facet-panel"
        :class="[
          `cs-facet-panel--${group.id}`,
          { 'cs-facet-panel--active': setCounts[group.id] > 0 },
        ]"
      >
        <button
          class="cs-facet-panel-head"
          :class="{ 'cs-facet-panel-head--closed': collapsedGroups.has(group.id) }"
          :aria-expanded="!collapsedGroups.has(group.id)"
          @click="toggleGroup(group.id)"
        >
          <span class="cs-facet-panel-crest" aria-hidden="true">
            <Icon :icon="group.icon" width="19" height="19" />
          </span>
          <span class="cs-facet-panel-copy">
            <small>Filter group</small>
            <strong>{{ group.label }}</strong>
          </span>
          <span v-if="setCounts[group.id]" class="cs-facet-panel-count">
            {{ setCounts[group.id] }}
          </span>
          <Icon icon="lucide:chevron-down" width="16" height="16" class="cs-facet-chev" />
        </button>

        <div v-if="!collapsedGroups.has(group.id)" class="cs-facet-panel-body">
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
            <span class="cs-facet-crest" aria-hidden="true">
              <img v-if="chip.image" :src="chip.image" :alt="chip.label" class="cs-facet-img" />
              <Icon
                v-else-if="chip.icon"
                :icon="chip.icon"
                width="21"
                height="21"
                class="cs-facet-icon"
              />
            </span>
            <span class="cs-facet-copy">
              <span class="cs-facet-label">
                <template v-for="(seg, i) in highlightSegments(chip.label, query)" :key="i">
                  <mark v-if="seg.hit" class="cs-facet-mark">{{ seg.text }}</mark>
                  <template v-else>{{ seg.text }}</template>
                </template>
              </span>
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
        </div>
      </section>
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
  gap: 10px;
  flex-shrink: 0;
  height: 50px;
  padding: 0 14px;
  background: #1e1006;
  border: none;
  border-bottom: 2px solid #5c3310;
  color: #c89040;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.cs-facets-grip-label {
  flex: 1;
  text-align: left;
}
.cs-facets-grip-count {
  min-width: 24px;
  padding: 3px 6px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid #7a4e20;
  color: #e8c040;
  font-size: 11px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

/* ── Domain ──
   Two rows, not a segmented pair: they read as the first two entries of the
   column and set what everything under them means. */
.cs-doms {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  padding: 12px 12px 13px;
  border-bottom: 1px solid #3e200a;
}
.cs-dom {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 11px;
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
  padding: 10px 11px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cs-facet-panel {
  --facet-group-color: #c89040;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 6px;
  background: #111008;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--facet-group-color);
  border-radius: 4px;
}
.cs-facet-panel--active {
  border-left-color: var(--facet-group-color);
}
.cs-facet-panel--afford {
  --facet-group-color: #52b830;
}
.cs-facet-panel--role {
  --facet-group-color: #5090e8;
}
.cs-facet-panel--tier {
  --facet-group-color: #e8c040;
}
.cs-facet-panel--trait {
  --facet-group-color: #b060e0;
}
.cs-facet-panel--origin {
  --facet-group-color: #c07c30;
}

/* ── Group head ──
   Not `.filter-divider`: that one is global and still carries the swap grid. */
.cs-facet-panel-head {
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 5px 7px;
  border: 1px solid #3e200a;
  border-left: 4px solid var(--facet-group-color);
  border-radius: 4px;
  background: #1a1008;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.cs-facet-panel-head:hover,
.cs-facet-panel-head:focus-visible {
  background: #1c1c18;
  border-color: var(--facet-group-color);
  border-left-color: var(--facet-group-color);
}
.cs-facet-panel-head:focus-visible {
  outline: 2px solid var(--facet-group-color);
  outline-offset: 2px;
}
.cs-facet-panel-head--closed .cs-facet-chev {
  transform: rotate(-90deg);
}
.cs-facet-panel-crest,
.cs-facet-crest {
  display: grid;
  place-items: center;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: var(--facet-group-color, #c89040);
  color: #fff;
}
.cs-facet-panel-crest {
  width: 30px;
  height: 32px;
}
.cs-facet-panel-copy,
.cs-facet-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.cs-facet-panel-copy small,
.cs-facet-copy small {
  overflow: hidden;
  color: #a59675;
  font-size: 9px;
  letter-spacing: 0.12em;
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}
.cs-facet-panel-copy small {
  color: color-mix(in srgb, var(--facet-group-color) 72%, #a59675);
  font-weight: 800;
}
.cs-facet-panel-copy strong {
  overflow: hidden;
  color: var(--facet-group-color);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-facet-chev {
  flex-shrink: 0;
  opacity: 0.7;
  transition: transform 0.15s;
}
.cs-facet-panel-count {
  flex-shrink: 0;
  min-width: 22px;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(10, 8, 4, 0.7);
  border: 1px solid color-mix(in srgb, var(--facet-group-color) 60%, #3e200a);
  color: var(--facet-group-color);
  font-size: 10.5px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.cs-facet-panel-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 1px 0 0;
}

/* One row, three anchors: mark, name, number. The left border is where the
   facet's own colour lives — a full tinted fill on every row would make the
   column louder than the cards it filters. */
.cs-facet-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 5px 8px;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--chip-color, #c89040);
  border-radius: 4px;
  background: #141410;
  color: #b09a74;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
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
  border-color: var(--chip-color, #c89040);
  border-left-color: var(--chip-color, #c89040);
}
.cs-facet-row--active {
  background: #1c1c18;
  border-color: var(--chip-color, #e8c040);
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
.cs-facet-crest {
  width: 28px;
  height: 30px;
  background: var(--chip-color, #c89040);
}
.cs-facet-icon {
  color: #fff;
}
.cs-facet-img {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  object-fit: contain;
}
.cs-facet-label {
  display: block;
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
  border-color: var(--chip-color, #7a4e20);
  color: #e8c040;
}
.cs-facet-lock {
  flex-shrink: 0;
  color: #7a4e20;
}
</style>
