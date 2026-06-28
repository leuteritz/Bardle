<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useBattleStore } from '@/stores/battleStore'
import { ROLES } from '@/config/constants'
import { CHAMPION_DATA } from '@/config/championData'
import { getChampionRoles } from '@/config/championRoles'
import {
  getChampionStarLevel,
  getChampionTier,
  isChampionTierUnlocked,
  championTierSpawnPercent,
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
  spawnPercent: number | null // this tier's live spawn chance (null when not spawning)
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
      spawnPercent: championTierSpawnPercent(star, galaxyStore.currentGalaxy),
    }
    for (const role of getChampionRoles(name)) {
      map[role]?.push(entry)
    }
  }
  for (const role of Object.keys(map) as ChampionRole[]) {
    map[role].sort((a, b) => a.star - b.star || a.name.localeCompare(b.name))
  }
  return map
})

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
      <div class="relative w-full max-w-4xl mx-4 overflow-hidden role-frame">
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
            <!-- Resting face: the heading -->
            <h2 class="role-title role-morph-face">✦ CHOOSE YOUR NEXT CHAMPION ROLE ✦</h2>

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
          class="flex flex-col sm:flex-row gap-4 p-6"
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

              <!-- Subtle hover affordance (text only) -->
              <span class="role-hint">Roster</span>

              <!-- Role-colored bottom border accent -->
              <div class="role-bottom-bar"></div>

              <!-- Roster reveal — slides up over the art on hover/focus -->
              <div class="role-roster">
                <div class="role-roster-header">
                  <span class="role-roster-role">{{ role.label }}</span>
                  <span class="role-roster-caption">
                    {{
                      obtainableCount(role.key) > 0
                        ? `Available · ${obtainableCount(role.key)} to unlock`
                        : 'All champions unlocked ✓'
                    }}
                  </span>
                </div>

                <ul v-if="availableFor(role.key).length" class="role-roster-list">
                  <li
                    v-for="champ in availableFor(role.key)"
                    :key="champ.name"
                    class="role-roster-row"
                  >
                    <img :src="champ.image" :alt="champ.name" class="role-roster-portrait" />
                    <span class="role-roster-name">{{ champ.name }}</span>
                    <span class="role-tier-chip" :style="{ '--tier-c': champ.tierColor }">
                      <Icon :icon="champ.tierIcon" class="role-tier-icon" />
                      <span class="role-tier-star">★{{ champ.star }}</span>
                      <span v-if="champ.spawnPercent != null" class="role-tier-pct"
                        >· {{ champ.spawnPercent }}%</span
                      >
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
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310;
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
  padding: 18px 24px 16px;
  text-align: center;
}

.role-title {
  font-size: 26px;
  font-weight: 900;
  color: #e8c040;
  text-shadow: 0 0 18px rgba(232, 192, 64, 0.55);
  letter-spacing: 0.06em;
}

/* ── Morphing header: title ⇄ search ─────────────────────────────────────
   Title and search input share one grid cell, so swapping faces never shifts
   layout. The search is revealed on hover, focus, or while a query is active
   (so it stays open after blur as long as there's text). */
.role-search-morph {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 56px;
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
  height: 290px;
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
  font-size: 32px;
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
}

.role-count-badge--complete {
  color: #d6f4c6;
  background: #18260e;
  border-color: #6ec040;
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.45);
}

/* ── Hover hint (text only — no icon/number) ─────────────────────────── */
.role-hint {
  position: absolute;
  bottom: 12px;
  right: 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #cdb98a;
  opacity: 0.62;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  transition: opacity 0.16s ease;
}

.role-card:hover .role-hint,
.role-card:focus-within .role-hint {
  opacity: 0;
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

/* While searching, every card's roster is open — hide the "Roster" hint. */
.role-card--searching .role-hint {
  opacity: 0;
}

.role-roster-header {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 14px 10px;
  background: rgba(30, 16, 6, 0.78);
  border-bottom: 1px solid #5c3310;
}

.role-roster-role {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--role-color);
  text-shadow: 0 0 14px color-mix(in srgb, var(--role-color) 55%, transparent);
}

.role-roster-caption {
  font-size: 11px;
  letter-spacing: 0.06em;
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

.role-roster-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 4px;
}

.role-roster-row:hover {
  background: #1c1c18;
}

.role-roster-portrait {
  width: 32px;
  height: 32px;
  flex: none;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #5c3310;
  background: #141410;
}

.role-roster-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-tier-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
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

/* Star count (★N) — mirrors the Shop's tier header. */
.role-tier-star {
  flex: none;
  font-weight: 800;
  color: var(--tier-c);
}

/* Live spawn chance appended to the tier chip (e.g. "★3 · 30%"). */
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
    width: 28px;
    height: 28px;
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
}
</style>
