<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useBattleStore } from '@/stores/battleStore'
import { ROLES } from '@/config/constants'
import { CHAMPION_DATA } from '@/config/championData'
import { getChampionRoles } from '@/config/championRoles'
import {
  getChampionStarLevel,
  getChampionTier,
  isChampionTierUnlocked,
  perChampionSpawnPercents,
} from '@/config/championTiers'
import type { ChampionRole } from '@/types'

const galaxyStore = useGalaxyStore()
const battleStore = useBattleStore()

type RoleDef = { key: ChampionRole; label: string; short: string; image: string; color: string }
type AvailableChampion = {
  name: string
  star: number
  tierColor: string
  tierIcon: string
  image: string
  spawnPercent: number | null // this champion's own spawn chance within the role pool (null when not spawning)
}

const displayedRoles = ref<RoleDef[]>([])
const selectedKey = ref<ChampionRole | null>(null)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
// Hovering any role card also reveals the header search, so players discover it.
const rolesHovered = ref(false)

function clearSearch() {
  searchQuery.value = ''
}

// Tap/click the morphing header → focus the (hidden) input. On touch devices
// without :hover this is what expands the label into the search field.
function focusSearch() {
  searchInputRef.value?.focus()
}

// Escape clears the query first; a second Escape (already empty) blurs the input
// so the header morphs back to the title.
function onEscape() {
  if (searchQuery.value) clearSearch()
  else searchInputRef.value?.blur()
}

watch(
  () => galaxyStore.pendingRoleSelection,
  (pending) => {
    if (pending) {
      selectedKey.value = null
      searchQuery.value = ''
      const shuffled = [...(ROLES as unknown as RoleDef[])].sort(() => Math.random() - 0.5)
      displayedRoles.value = shuffled.slice(0, 3)
    }
  },
  { immediate: true },
)

// Star levels the player has already met (owns or has discovered as recruitable),
// mirroring the Shop's discoveredTierStars — so the unlock gate stays consistent.
const discoveredStars = computed(() => {
  const stars = new Set<number>()
  for (const name of battleStore.ownedChampions) {
    if (name === 'Bard') continue
    stars.add(getChampionStarLevel(name))
  }
  for (const r of battleStore.recruitableChampions) {
    stars.add(getChampionStarLevel(r.name))
  }
  return stars
})

// Champions still obtainable per role at the player's currently unlocked Champion
// Tiers (same galaxy gate as the Shop). A champion already unlocked in the Shop
// (recruitable, after a star kill) or already recruited (owned) was obtained by an
// earlier action, so it is excluded — the modal answers "what can I still get for
// this role?". Sorted by tier ascending then name.
const availableByRole = computed(() => {
  const map: Record<ChampionRole, AvailableChampion[]> = {
    top: [], jungle: [], mid: [], adc: [], support: [],
  }
  for (const name of Object.keys(CHAMPION_DATA)) {
    if (name === 'Bard') continue
    const star = getChampionStarLevel(name)
    if (
      !isChampionTierUnlocked(
        star,
        galaxyStore.currentGalaxy,
        galaxyStore.requiredStarLevel,
        discoveredStars.value,
      )
    )
      continue
    // Hide champions the player has already obtained (Shop-unlocked or owned).
    const owned = battleStore.ownedChampions.includes(name)
    const recruitable = battleStore.recruitableChampions.some((r) => r.name === name)
    if (owned || recruitable) continue
    const tier = getChampionTier(name)
    const entry: AvailableChampion = {
      name,
      star,
      tierColor: tier.color,
      tierIcon: tier.icon,
      image: battleStore.getChampionImage(name),
      spawnPercent: null, // filled below once the role's full pool is known
    }
    for (const role of getChampionRoles(name)) {
      map[role]?.push(entry)
    }
  }
  // Per-champion odds mirror the actual spawn pick (planetBossStore): tier chosen
  // by renormalized weight over this role's pool, then uniform within the tier —
  // so each role's percentages sum to 100.
  for (const role of Object.keys(map) as ChampionRole[]) {
    const tierCounts = new Map<number, number>()
    for (const c of map[role]) tierCounts.set(c.star, (tierCounts.get(c.star) ?? 0) + 1)
    const perChampion = perChampionSpawnPercents(tierCounts, galaxyStore.currentGalaxy)
    map[role] = map[role].map((c) => ({ ...c, spawnPercent: perChampion.get(c.star) ?? null }))
    map[role].sort((a, b) => a.star - b.star || a.name.localeCompare(b.name))
  }
  return map
})

// Gacha-style adaptive precision: whole numbers when coarse, decimals when the
// odds get thin, and a floor ("<0.1%") instead of a misleading rounded 0%.
function formatSpawnPercent(p: number): string {
  if (p >= 10) return `${Math.round(p)}%`
  if (p >= 1) return `${(Math.round(p * 10) / 10).toFixed(1)}%`
  if (p >= 0.1) return `${(Math.round(p * 100) / 100).toFixed(2)}%`
  return '<0.1%'
}

// "1 in N" reading for the tooltip — the odds format players sanity-check with.
function spawnOddsTitle(champ: AvailableChampion): string {
  if (champ.spawnPercent == null || champ.spawnPercent <= 0) return ''
  const oneIn = Math.round(100 / champ.spawnPercent)
  return oneIn <= 1
    ? 'Guaranteed next champion for this role'
    : `≈ 1 in ${oneIn} chance to be the next champion for this role`
}

const searchActive = computed(() => searchQuery.value.trim().length > 0)

// Total champions still obtainable for a role (independent of the search box) —
// drives the at-rest "N left" card badge and the roster-header count.
function obtainableCount(roleKey: ChampionRole): number {
  return availableByRole.value[roleKey]?.length ?? 0
}

function availableFor(roleKey: ChampionRole): AvailableChampion[] {
  const list = availableByRole.value[roleKey] ?? []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((c) => c.name.toLowerCase().includes(q))
}

function choose(role: RoleDef) {
  if (selectedKey.value) return
  selectedKey.value = role.key
  setTimeout(() => {
    galaxyStore.confirmRoleSelection(role.key)
  }, 260)
}
</script>

<template>
  <Transition name="role-fade">
    <div
      v-if="galaxyStore.pendingRoleSelection"
      class="fixed inset-0 z-[210] flex items-center justify-center role-overlay"
    >
      <div class="relative w-full mx-4 overflow-hidden role-frame">
        <RpgFrame />
        <!-- Gold accent bar -->
        <div class="role-accent-bar"></div>

        <!-- Header — the title morphs into a champion search on hover/focus -->
        <div class="role-header">
          <div
            class="role-search-morph"
            :class="{
              'role-search-morph--active': searchActive,
              'role-search-morph--reveal': rolesHovered,
            }"
            @click="focusSearch"
          >
            <!-- Resting face: one-line crest heading (same motif as the bottom-bar crest) -->
            <div class="role-title role-morph-face">
              <span class="role-crest-rule role-crest-rule--left" />
              <h2 class="role-crest-title">Choose a Role</h2>
              <span class="role-crest-rule role-crest-rule--right" />
            </div>

            <!-- Active face: the search input (filters every roster live) -->
            <div
              class="rpg-search-wrap role-search-wrap role-morph-face"
              @click.stop
              @mousedown.stop
            >
              <Icon
                icon="game-icons:magnifying-glass"
                width="14"
                height="14"
                class="rpg-search-icon"
              />
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                placeholder="Search champion… e.g. Ashe"
                class="rpg-search w-full pl-9 pr-9 py-2"
                aria-label="Search champions across all role rosters"
                @keydown.escape.prevent="onEscape"
              />
              <button
                class="search-clear-btn"
                :class="{ 'search-clear-btn--visible': searchQuery.length > 0 }"
                aria-label="Clear search"
                @click="clearSearch"
                @keydown.enter.prevent="clearSearch"
                @keydown.space.prevent="clearSearch"
              >✕</button>
            </div>
          </div>
        </div>

        <!-- Role panels -->
        <div
          class="flex flex-col sm:flex-row gap-3 sm:gap-4 p-5"
          @mouseenter="rolesHovered = true"
          @mouseleave="rolesHovered = false"
        >
          <button
            v-for="role in displayedRoles"
            :key="role.key"
            class="role-card flex-1"
            :class="[
              selectedKey === role.key ? 'role-card--selected' : '',
              selectedKey && selectedKey !== role.key ? 'role-card--faded' : '',
              searchActive ? 'role-card--searching' : '',
            ]"
            :style="{ '--role-color': role.color }"
            @click="choose(role)"
          >
            <!-- Clipped artwork layer (keeps the zoom + roster reveal rounded) -->
            <div class="role-artwork-clip">
              <img :src="role.image" :alt="role.label" class="role-artwork" />

              <!-- At-rest obtainable counter (hidden behind the hover roster) -->
              <div
                class="role-count-badge"
                :class="{ 'role-count-badge--complete': obtainableCount(role.key) === 0 }"
              >
                <template v-if="obtainableCount(role.key) > 0">
                  {{ obtainableCount(role.key) }} left
                </template>
                <template v-else>✓ Complete</template>
              </div>

              <!-- Vignette + text overlay -->
              <div class="role-overlay-layer">
                <h3 class="role-name">{{ role.label }}</h3>
              </div>

              <!-- Role-colored bottom border accent -->
              <div class="role-bottom-bar"></div>

              <!-- Roster reveal — slides up over the art on hover/focus -->
              <div class="role-roster">
                <div class="role-roster-header">
                  <img :src="role.image" alt="" class="role-roster-emblem" />
                  <span class="role-roster-role">{{ role.label }}</span>
                  <!-- dice + count: "N random possibilities" without a word of copy;
                       while searching it counts the matches instead -->
                  <span
                    class="role-roster-odds"
                    :title="
                      searchActive
                        ? `${availableFor(role.key).length} matching champions`
                        : obtainableCount(role.key) > 0
                          ? `${obtainableCount(role.key)} possible picks for this role`
                          : 'All champions unlocked'
                    "
                  >
                    <template v-if="!searchActive && obtainableCount(role.key) === 0">✓</template>
                    <template v-else>
                      <Icon icon="game-icons:rolling-dices" class="role-roster-odds-icon" />
                      {{ availableFor(role.key).length }}
                    </template>
                  </span>
                </div>

                <ul v-if="availableFor(role.key).length" class="role-roster-list">
                  <li
                    v-for="champ in availableFor(role.key)"
                    :key="champ.name"
                    class="role-roster-row"
                  >
                    <img :src="champ.image" :alt="champ.name" class="role-roster-portrait" />
                    <span
                      class="role-roster-name"
                      :class="{
                        'role-roster-name--long': champ.name.length > 9,
                        'role-roster-name--xlong': champ.name.length > 12,
                      }"
                    >
                      {{ champ.name }}
                    </span>
                    <span
                      class="role-tier-chip"
                      :style="{ '--tier-c': champ.tierColor }"
                      :title="spawnOddsTitle(champ)"
                    >
                      <Icon :icon="champ.tierIcon" class="role-tier-icon" />
                      <span v-if="champ.spawnPercent != null" class="role-tier-pct">
                        {{ formatSpawnPercent(champ.spawnPercent) }}
                      </span>
                    </span>
                  </li>
                </ul>

                <div v-else class="role-roster-empty">
                  {{ searchActive ? 'No champions match your search' : 'All champions unlocked ✓' }}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
:root {
  --role-top:     #c0392b;
  --role-jungle:  #27ae60;
  --role-mid:     #2980b9;
  --role-adc:     #d4a020;
  --role-support: #16a085;
}

.role-fade-enter-active,
.role-fade-leave-active {
  transition: opacity 0.3s ease;
}
.role-fade-enter-from,
.role-fade-leave-to {
  opacity: 0;
}

/* ── Overlay ─────────────────────────────────────────────────────────── */
.role-overlay {
  background: rgba(5, 4, 2, 0.92);
}

.role-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(200, 150, 40, 0.05) 0%, transparent 70%);
  pointer-events: none;
}

/* ── Frame ───────────────────────────────────────────────────────────── */
.role-frame {
  /* fluid: compact on 1280-1512 laptops, roomy on 1920+, capped at 1000px */
  max-width: min(clamp(600px, 48vw + 60px, 1000px), calc(100vw - 32px));
  background: #111008;
  /* Rahmen kommt als SVG-Overlay (RpgFrame) — kein CSS-Border mehr */
  border-radius: 4px;
}

/* ── Gold accent bar ─────────────────────────────────────────────────── */
.role-accent-bar {
  height: 3px;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
}

/* ── Header ──────────────────────────────────────────────────────────── */
.role-header {
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  padding: clamp(12px, 1.5vh, 18px) 24px clamp(10px, 1.3vh, 16px);
  text-align: center;
}

/* ── Crest heading: context and action on one line ───────────────────── */
.role-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.role-crest-rule {
  flex: none;
  height: 1px;
  width: clamp(22px, 3.5vw, 52px);
}
.role-crest-rule--left {
  background: linear-gradient(90deg, transparent, #c89040);
}
.role-crest-rule--right {
  background: linear-gradient(90deg, #c89040, transparent);
}

.role-crest-title {
  font-size: clamp(15px, 1.3vw, 21px);
  font-weight: 900;
  letter-spacing: 0.22em;
  padding-left: 0.22em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #e8c040;
  text-shadow:
    0 0 8px rgba(255, 224, 96, 0.5),
    0 0 20px rgba(232, 192, 64, 0.45);
}

/* ── Morphing header: title ⇄ search ─────────────────────────────────────
   Title and search input share one grid cell, so swapping faces never shifts
   layout. The search is revealed on hover, focus, or while a query is active
   (so it stays open after blur as long as there's text). */
.role-search-morph {
  position: relative;
  display: grid;
  place-items: center;
  min-height: clamp(44px, 4.5vh, 56px);
  cursor: text;
}

.role-morph-face {
  grid-area: 1 / 1;
  width: 100%;
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
}

/* Resting: title shown, search hidden (still Tab-focusable — no visibility:hidden). */
.role-title.role-morph-face {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.role-search-wrap.role-morph-face {
  justify-self: center;
  max-width: 420px;
  margin: 0 auto;
  opacity: 0;
  transform: translateY(6px) scale(0.98);
  pointer-events: none;
  /* Soft gold glow so the field feels "inside" the role-selection UI. */
  border-radius: 4px;
  box-shadow: 0 0 0 transparent;
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out,
    box-shadow 0.2s ease-out;
}

/* Open: fade the title out, settle the search in.
   --reveal = a role card is hovered, so the search advertises itself too. */
.role-search-morph:hover .role-title.role-morph-face,
.role-search-morph:focus-within .role-title.role-morph-face,
.role-search-morph--active .role-title.role-morph-face,
.role-search-morph--reveal .role-title.role-morph-face {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  pointer-events: none;
}

.role-search-morph:hover .role-search-wrap.role-morph-face,
.role-search-morph:focus-within .role-search-wrap.role-morph-face,
.role-search-morph--active .role-search-wrap.role-morph-face,
.role-search-morph--reveal .role-search-wrap.role-morph-face {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.role-search-morph:focus-within .role-search-wrap.role-morph-face {
  box-shadow: 0 0 16px rgba(232, 192, 64, 0.35);
}

/* Touch / no-hover: hint that the title is tappable to open the search. */
@media (hover: none) {
  .role-title.role-morph-face {
    text-decoration: underline dotted rgba(232, 192, 64, 0.5);
    text-underline-offset: 6px;
  }
}

/* ── Cards ───────────────────────────────────────────────────────────── */
.role-card {
  position: relative;
  height: clamp(210px, 24vh + 40px, 300px);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.55);
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.role-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 0 42px color-mix(in srgb, var(--role-color) 55%, transparent),
    0 20px 52px rgba(0, 0, 0, 0.7),
    0 6px 16px rgba(0, 0, 0, 0.5);
}

.role-card--selected {
  animation: role-pulse 0.26s ease forwards;
  box-shadow:
    0 0 44px color-mix(in srgb, var(--role-color) 80%, transparent),
    0 0 88px color-mix(in srgb, var(--role-color) 32%, transparent);
}

.role-card--faded {
  opacity: 0.3;
  pointer-events: none;
}

@keyframes role-pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.07); }
  100% { transform: scale(1.04); }
}

/* ── Artwork clip ────────────────────────────────────────────────────── */
.role-artwork-clip {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 4px;
}

/* ── Artwork ─────────────────────────────────────────────────────────── */
.role-artwork {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
  transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1);
}

.role-card:hover .role-artwork {
  transform: scale(1.05);
}

/* ── Text overlay ────────────────────────────────────────────────────── */
.role-overlay-layer {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 14px 16px 24px;
  background: linear-gradient(
    to bottom,
    transparent 28%,
    rgba(5, 4, 2, 0.55) 58%,
    rgba(5, 4, 2, 0.88) 100%
  );
  pointer-events: none;
}

.role-name {
  font-size: clamp(23px, 2.1vw, 32px);
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--role-color);
  text-shadow:
    0 0 20px color-mix(in srgb, var(--role-color) 70%, transparent),
    0 2px 8px rgba(0, 0, 0, 0.9);
  line-height: 1;
}

/* ── Bottom color bar ────────────────────────────────────────────────── */
.role-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--role-color);
  opacity: 0.9;
  pointer-events: none;
}

/* ── Obtainable counter (top-right, at rest) ─────────────────────────────
   Shown before hover so roles can be compared at a glance; the hover roster
   slides over and covers it. */
.role-count-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #e8c040;
  background: #16140e;
  border: 1px solid #c89040;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
  pointer-events: none;
  transition: opacity 0.16s ease;
}

/* the hover roster slides over this corner — fade the badge out so the two
   never read as overlapping text */
.role-card:hover .role-count-badge,
.role-card:focus-within .role-count-badge,
.role-card--searching .role-count-badge {
  opacity: 0;
}

.role-count-badge--complete {
  color: #d6f4c6;
  background: #18260e;
  border-color: #6ec040;
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.45);
}

/* ── Roster reveal ───────────────────────────────────────────────────── */
.role-roster {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  text-align: left;
  background: linear-gradient(
    to bottom,
    rgba(5, 4, 2, 0.86) 0%,
    rgba(5, 4, 2, 0.93) 100%
  );
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    visibility 0.16s ease;
  pointer-events: none;
}

.role-card:hover .role-roster,
.role-card:focus-within .role-roster,
.role-card--searching .role-roster {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}

.role-roster-header {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  /* faint wash of the role color bleeding in from the left */
  background: linear-gradient(
    105deg,
    color-mix(in srgb, var(--role-color) 17%, rgba(30, 16, 6, 0.82)) 0%,
    rgba(30, 16, 6, 0.78) 60%
  );
  border-bottom: 1px solid #5c3310;
}

/* role-colored rule that draws in from the left as the roster opens */
.role-roster-header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: linear-gradient(90deg, var(--role-color) 0%, transparent 85%);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.08s;
}

.role-card:hover .role-roster-header::after,
.role-card:focus-within .role-roster-header::after,
.role-card--searching .role-roster-header::after {
  transform: scaleX(1);
}

/* the role's own crest artwork, shrunk to a seal beside its name */
.role-roster-emblem {
  flex: none;
  width: 27px;
  height: 27px;
  object-fit: contain;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.7));
}

.role-roster-role {
  flex: none;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--role-color);
  text-shadow: 0 0 14px color-mix(in srgb, var(--role-color) 55%, transparent);
}

.role-roster-odds {
  flex: none;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: #cdb98a;
}

.role-roster-odds-icon {
  width: 16px;
  height: 16px;
  color: #9c8a68;
}

.role-roster-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.role-roster-list::-webkit-scrollbar {
  width: 8px;
}
.role-roster-list::-webkit-scrollbar-track {
  background: #111;
}
.role-roster-list::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 4px;
}

/* rows are read-only info (the click picks the role, never a champion) —
   no per-row hover highlight that would suggest champion selection */
.role-roster-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 4px;
}

.role-roster-portrait {
  width: 38px;
  height: 38px;
  flex: none;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

/* exactly one line per champion, full name always: long names step down in
   size instead of wrapping or truncating */
.role-roster-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
  color: #e8dcc0;
}
/* doubled class: must also beat the mobile media-query base rule below */
.role-roster-name.role-roster-name--long {
  font-size: 12px;
}
.role-roster-name.role-roster-name--xlong {
  font-size: 10.5px;
  letter-spacing: -0.01em;
}

.role-tier-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #d8ccb4;
  background: #16140e;
  border: 1px solid var(--tier-c);
  border-radius: 4px;
}

/* Shop-style tier glyph: the tier's game-icon, tier-colored. */
.role-tier-icon {
  width: 14px;
  height: 14px;
  flex: none;
  color: var(--tier-c);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--tier-c) 60%, transparent));
}

/* Live spawn chance next to the tier glyph (e.g. "30%"). */
.role-tier-pct {
  flex: none;
  font-weight: 800;
  color: var(--tier-c);
}

.role-roster-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  font-size: 13px;
  color: #9c8a68;
  text-align: center;
}

/* ── Mobile ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .role-card {
    height: 200px;
  }

  .role-roster-role {
    font-size: 16px;
  }

  .role-roster-name {
    font-size: 13px;
  }

  .role-roster-portrait {
    width: 32px;
    height: 32px;
  }
}

/* ── Reduced motion ──────────────────────────────────────────────────────
   Drop the morph slide/scale (faces still cross-fade via instant opacity). */
@media (prefers-reduced-motion: reduce) {
  .role-morph-face,
  .role-search-wrap.role-morph-face {
    transition: opacity 0.2s ease-out;
    transform: none !important;
  }

  .role-roster-header::after {
    transition: none;
  }
}
</style>
