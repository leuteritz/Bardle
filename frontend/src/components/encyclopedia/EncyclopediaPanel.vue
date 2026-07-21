<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '../../stores/gameStore'
import { encyclopediaData } from '../../config/encyclopedia'
import type { EncyclopediaEntry } from '../../config/encyclopedia'
import {
  BOTTOM_BAR_HEIGHT,
  BOTTOM_BAR_SIDE_W,
  HUD_PANEL_ARC_R,
  ENCYCLOPEDIA_BOOKMARKS_STORAGE_KEY,
  ENCYCLOPEDIA_COPY_FEEDBACK_MS,
  ENCYCLOPEDIA_FLASH_MS,
} from '../../config/constants'

const gameStore = useGameStore()

const searchQuery = ref('')
const activeCategory = ref<string | null>(null)
const openFormulas = ref<Set<string>>(new Set())
const bookmarks = ref<Set<string>>(loadBookmarks())
const copiedId = ref<string | null>(null)
const flashId = ref<string | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)

let copyTimer: ReturnType<typeof setTimeout> | null = null
let flashTimer: ReturnType<typeof setTimeout> | null = null

const SAVED_FILTER_ID = 'saved'

/* ── Data helpers ── */

const allEntries = computed(() =>
  encyclopediaData.flatMap((c) => c.entries.map((e) => ({ entry: e, categoryId: c.id }))),
)
const totalEntryCount = computed(() => allEntries.value.length)

const entryById = computed(() => {
  const map = new Map<string, EncyclopediaEntry>()
  for (const { entry } of allEntries.value) map.set(entry.id, entry)
  return map
})

function matchesQuery(entry: EncyclopediaEntry, query: string): boolean {
  if (!query) return true
  const haystack = `${entry.name} ${entry.description} ${entry.formula ?? ''} ${entry.lore}`
  return haystack.toLowerCase().includes(query)
}

const normalizedQuery = computed(() => searchQuery.value.toLowerCase().trim())

/** Category chips with live counts for the current query. */
const chips = computed(() => {
  const query = normalizedQuery.value
  const counts = new Map<string, number>()
  let total = 0
  for (const { entry, categoryId } of allEntries.value) {
    if (!matchesQuery(entry, query)) continue
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1)
    total++
  }
  const list = [
    { id: null as string | null, label: 'All', icon: 'game-icons:stack', count: total },
  ]
  if (bookmarks.value.size > 0) {
    const savedCount = allEntries.value.filter(
      ({ entry }) => bookmarks.value.has(entry.id) && matchesQuery(entry, query),
    ).length
    list.push({
      id: SAVED_FILTER_ID,
      label: 'Saved',
      icon: 'game-icons:bookmarklet',
      count: savedCount,
    })
  }
  for (const category of encyclopediaData) {
    list.push({
      id: category.id,
      label: category.title,
      icon: category.icon,
      count: counts.get(category.id) ?? 0,
    })
  }
  return list
})

/** Categories filtered by query + active chip, empty groups dropped. */
const visibleGroups = computed(() => {
  const query = normalizedQuery.value
  return encyclopediaData
    .map((category) => ({
      ...category,
      entries: category.entries.filter((entry) => {
        if (!matchesQuery(entry, query)) return false
        if (activeCategory.value === SAVED_FILTER_ID) return bookmarks.value.has(entry.id)
        if (activeCategory.value) return category.id === activeCategory.value
        return true
      }),
    }))
    .filter((category) => category.entries.length > 0)
})

const visibleCount = computed(() =>
  visibleGroups.value.reduce((sum, c) => sum + c.entries.length, 0),
)

/* ── Search highlighting ── */

interface TextSegment {
  text: string
  hit: boolean
}

function highlightSegments(text: string, query: string): TextSegment[] {
  if (!query) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const segments: TextSegment[] = []
  let index = 0
  while (index < text.length) {
    const found = lower.indexOf(query, index)
    if (found < 0) {
      segments.push({ text: text.slice(index), hit: false })
      break
    }
    if (found > index) segments.push({ text: text.slice(index, found), hit: false })
    segments.push({ text: text.slice(found, found + query.length), hit: true })
    index = found + query.length
  }
  return segments
}

/* ── Actions ── */

function closePanel() {
  gameStore.isEncyclopediaOpen = false
}

function selectChip(id: string | null) {
  activeCategory.value = activeCategory.value === id ? null : id
}

function toggleFormula(id: string) {
  const next = new Set(openFormulas.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openFormulas.value = next
}

function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(ENCYCLOPEDIA_BOOKMARKS_STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    /* corrupt or unavailable storage — start empty */
  }
  return new Set()
}

function toggleBookmark(id: string) {
  const next = new Set(bookmarks.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  bookmarks.value = next
  if (next.size === 0 && activeCategory.value === SAVED_FILTER_ID) activeCategory.value = null
  try {
    localStorage.setItem(ENCYCLOPEDIA_BOOKMARKS_STORAGE_KEY, JSON.stringify([...next]))
  } catch {
    /* storage full/unavailable — bookmark stays session-only */
  }
}

function copyFormula(entry: EncyclopediaEntry) {
  if (!entry.formula) return
  try {
    navigator.clipboard?.writeText(entry.formula)
  } catch {
    /* clipboard unavailable — feedback still shows */
  }
  copiedId.value = entry.id
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copiedId.value = null
  }, ENCYCLOPEDIA_COPY_FEEDBACK_MS)
}

function relatedName(id: string): string {
  return entryById.value.get(id)?.name ?? id
}

async function jumpToEntry(id: string) {
  if (!entryById.value.has(id)) return
  searchQuery.value = ''
  activeCategory.value = null
  await nextTick()
  const el = scrollRef.value?.querySelector<HTMLElement>(`[data-entry-id="${id}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  flashId.value = id
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashId.value = null
  }, ENCYCLOPEDIA_FLASH_MS)
}

/* ── Keyboard: Ctrl/Cmd+K focuses search, Escape closes ── */

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    if (!gameStore.isEncyclopediaOpen) return
    event.preventDefault()
    searchInputRef.value?.focus()
    return
  }
  if (event.key === 'Escape' && gameStore.isEncyclopediaOpen) {
    closePanel()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (copyTimer) clearTimeout(copyTimer)
  if (flashTimer) clearTimeout(flashTimer)
})

/* ── Layout: same width as the command panel, sitting flush on top of it.
   The bottom-left corner mirrors the command panel's rounded top-left arc,
   so the two panels form a waist where they meet and the command panel's
   rounding stays visible. ── */

const panelFrameStyle = {
  bottom: `calc(${BOTTOM_BAR_HEIGHT}px * var(--hud-scale, 0.75))`,
  width: `calc(${BOTTOM_BAR_SIDE_W}px * var(--hud-scale, 0.75))`,
  borderBottomLeftRadius: `calc(${HUD_PANEL_ARC_R}px * var(--hud-scale, 0.75))`,
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="gameStore.isEncyclopediaOpen"
        class="enc-backdrop fixed inset-0 z-[121]"
        @click="closePanel"
      />
    </Transition>

    <!-- Panel -->
    <Transition name="slide">
      <div
        v-if="gameStore.isEncyclopediaOpen"
        class="enc-panel fixed right-0 top-0 z-[130] flex flex-col overflow-hidden"
        :style="panelFrameStyle"
      >
        <!-- Gold accent line -->
        <div class="enc-accent shrink-0"></div>

        <!-- Header -->
        <div class="enc-header flex items-center gap-3 shrink-0">
          <Icon icon="game-icons:wax-tablet" width="28" height="28" class="enc-header-icon" />
          <div class="flex-1 min-w-0">
            <h2 class="enc-title">Bardle Codex</h2>
            <p class="enc-subtitle">Knowledge of the cosmic wanderer</p>
          </div>
          <button class="enc-close" aria-label="Close encyclopedia" @click="closePanel">✕</button>
        </div>

        <!-- Search -->
        <div class="enc-search-wrap shrink-0">
          <div class="relative flex items-center">
            <Icon
              icon="game-icons:magnifying-glass"
              width="18"
              height="18"
              class="enc-search-icon absolute pointer-events-none"
            />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              :placeholder="`Search ${totalEntryCount} entries…`"
              class="enc-search-input w-full"
            />
            <span class="enc-kbd-wrap absolute flex items-center gap-1 pointer-events-none">
              <kbd class="enc-kbd">Ctrl</kbd>
              <kbd class="enc-kbd">K</kbd>
            </span>
          </div>
        </div>

        <!-- Category chips -->
        <div class="enc-chips enc-scroll flex gap-2 overflow-x-auto shrink-0">
          <button
            v-for="chip in chips"
            :key="chip.id ?? 'all'"
            class="enc-chip flex items-center gap-1.5 whitespace-nowrap shrink-0"
            :class="{ 'enc-chip--active': activeCategory === chip.id }"
            :title="chip.label"
            @click="selectChip(chip.id)"
          >
            <Icon :icon="chip.icon" width="15" height="15" />
            <span>{{ chip.label }}</span>
            <span class="enc-chip-count">{{ chip.count }}</span>
          </button>
        </div>

        <!-- Entries -->
        <div ref="scrollRef" class="enc-content enc-scroll flex-1 min-h-0 overflow-y-auto">
          <div v-for="group in visibleGroups" :key="group.id" class="enc-group">
            <div class="enc-group-header flex items-center gap-2 sticky top-0 z-[2]">
              <Icon :icon="group.icon" width="17" height="17" class="enc-group-icon" />
              <span class="enc-group-title">{{ group.title }}</span>
              <span class="enc-group-rule flex-1"></span>
              <span class="enc-group-count">{{ group.entries.length }}</span>
            </div>

            <div class="flex flex-col gap-2 mt-1">
              <div
                v-for="entry in group.entries"
                :key="entry.id"
                class="enc-entry"
                :class="{ 'enc-entry--flash': flashId === entry.id }"
                :data-entry-id="entry.id"
              >
                <div class="flex items-start gap-3">
                  <!-- Icon box -->
                  <div class="enc-entry-iconbox flex items-center justify-center shrink-0">
                    <img
                      v-if="!entry.icon.includes(':')"
                      :src="entry.icon"
                      :alt="entry.name"
                      class="enc-entry-img"
                      loading="lazy"
                    />
                    <Icon v-else :icon="entry.icon" width="26" height="26" class="enc-entry-gi" />
                  </div>

                  <div class="flex-1 min-w-0">
                    <!-- Name + bookmark -->
                    <div class="flex items-center gap-2">
                      <h4 class="enc-entry-name flex-1">
                        <template
                          v-for="(seg, i) in highlightSegments(entry.name, normalizedQuery)"
                          :key="i"
                        >
                          <mark v-if="seg.hit" class="enc-mark">{{ seg.text }}</mark>
                          <template v-else>{{ seg.text }}</template>
                        </template>
                      </h4>
                      <button
                        class="enc-bookmark"
                        :class="{ 'enc-bookmark--on': bookmarks.has(entry.id) }"
                        :aria-label="bookmarks.has(entry.id) ? 'Remove bookmark' : 'Bookmark entry'"
                        @click="toggleBookmark(entry.id)"
                      >
                        <Icon
                          :icon="
                            bookmarks.has(entry.id)
                              ? 'game-icons:bookmarklet'
                              : 'game-icons:bookmark'
                          "
                          width="17"
                          height="17"
                        />
                      </button>
                    </div>

                    <!-- Description -->
                    <p class="enc-entry-desc">
                      <template
                        v-for="(seg, i) in highlightSegments(entry.description, normalizedQuery)"
                        :key="i"
                      >
                        <mark v-if="seg.hit" class="enc-mark">{{ seg.text }}</mark>
                        <template v-else>{{ seg.text }}</template>
                      </template>
                    </p>

                    <!-- Formula toggle + related jumps -->
                    <div
                      v-if="entry.formula || entry.related?.length"
                      class="flex flex-wrap items-center gap-1.5 mt-2"
                    >
                      <button
                        v-if="entry.formula"
                        class="enc-formula-btn flex items-center gap-1.5"
                        :class="{ 'enc-formula-btn--open': openFormulas.has(entry.id) }"
                        @click="toggleFormula(entry.id)"
                      >
                        <Icon icon="game-icons:abacus" width="13" height="13" />
                        {{ openFormulas.has(entry.id) ? 'Hide formula' : 'Show formula' }}
                      </button>
                      <button
                        v-for="rel in entry.related ?? []"
                        :key="rel"
                        class="enc-related"
                        @click="jumpToEntry(rel)"
                      >
                        ↗ {{ relatedName(rel) }}
                      </button>
                    </div>

                    <!-- Formula box -->
                    <div v-if="entry.formula && openFormulas.has(entry.id)" class="enc-formula">
                      <div class="enc-formula-text">{{ entry.formula }}</div>
                      <button
                        class="enc-copy"
                        :class="{ 'enc-copy--done': copiedId === entry.id }"
                        @click="copyFormula(entry)"
                      >
                        {{ copiedId === entry.id ? 'Copied ✓' : 'Copy' }}
                      </button>
                    </div>

                    <!-- Lore -->
                    <p class="enc-lore">“{{ entry.lore }}”</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="visibleGroups.length === 0"
            class="enc-empty flex flex-col items-center justify-center text-center"
          >
            <Icon icon="game-icons:tied-scroll" width="46" height="46" class="enc-empty-icon" />
            <p class="enc-empty-title">Nothing found for “{{ searchQuery }}”</p>
            <p class="enc-empty-hint">Try a shorter term or another category.</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="enc-footer flex items-center justify-between shrink-0">
          <span class="enc-footer-count">{{ visibleCount }} / {{ totalEntryCount }} entries</span>
          <span class="enc-footer-note">{{ encyclopediaData.length }} categories · © Leuteritz</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Transitions ── */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Backdrop ── */
.enc-backdrop {
  background: rgba(0, 0, 0, 0.45);
}

/* ── Panel shell ── */
/* Width, bottom offset and bottom-left radius come from the inline style
   (command-panel geometry × --hud-scale). Fonts/paddings use clamp() so the
   narrow Full-HD panel stays readable and 4K doesn't look lost. */
.enc-panel {
  --enc-pad: clamp(10px, 0.85vw, 18px);
  background: #111008;
  border-left: 4px solid #7a4e20;
  border-bottom: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    -10px 0 30px rgba(0, 0, 0, 0.6);
}
.enc-accent {
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

/* ── Header ── */
.enc-header {
  padding: clamp(10px, 0.8vw, 15px) var(--enc-pad) clamp(9px, 0.7vw, 13px);
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}
.enc-header-icon {
  color: #e8c040;
  width: clamp(22px, 1.5vw, 28px);
  height: clamp(22px, 1.5vw, 28px);
}
.enc-title {
  font-size: clamp(15px, 1.1vw, 21px);
  line-height: 1;
  color: #e8c040;
}
.enc-subtitle {
  margin-top: 3px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(9px, 0.58vw, 11px);
  letter-spacing: 0.04em;
  color: #8a8172;
}
.enc-close {
  width: clamp(26px, 1.7vw, 32px);
  height: clamp(26px, 1.7vw, 32px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(12px, 0.8vw, 15px);
  color: #cc6050;
  background: #3a1a18;
  border: 1px solid #cc6050;
  border-radius: 5px;
  cursor: pointer;
}
.enc-close:hover {
  background: #4a2220;
}

/* ── Search ── */
.enc-search-wrap {
  padding: clamp(8px, 0.7vw, 13px) var(--enc-pad) clamp(7px, 0.6vw, 11px);
}
.enc-search-icon {
  left: 10px;
  color: #c89040;
}
.enc-search-input {
  padding: clamp(8px, 0.6vw, 11px) clamp(52px, 4vw, 74px) clamp(8px, 0.6vw, 11px)
    clamp(32px, 2.2vw, 40px);
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(11.5px, 0.75vw, 14px);
  font-weight: 500;
  color: #efe7d6;
  background: #1a1008;
  border: 1px solid #5c3310;
  border-radius: 5px;
  outline: none;
}
.enc-search-input::placeholder {
  color: #8a8172;
}
.enc-search-input:focus {
  border-color: #c89040;
}
.enc-kbd-wrap {
  right: 12px;
}
.enc-kbd {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  font-weight: 600;
  color: #8a8172;
  background: #0d0a05;
  border: 1px solid #3e200a;
  border-radius: 3px;
  padding: 2px 5px;
}

/* ── Category chips ── */
.enc-chips {
  padding: 0 var(--enc-pad) clamp(8px, 0.65vw, 12px);
  border-bottom: 1px solid #3e200a;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 transparent;
}
.enc-chip {
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(10px, 0.62vw, 11.5px);
  font-weight: 700;
  padding: clamp(4px, 0.35vw, 6px) clamp(8px, 0.6vw, 11px);
  border-radius: 20px;
  cursor: pointer;
  color: #c89040;
  background: transparent;
  border: 1px solid #5c3310;
}
.enc-chip:hover {
  border-color: #c89040;
}
.enc-chip--active {
  color: #1a1206;
  background: linear-gradient(180deg, #e8c040, #c89040);
  border-color: #e8c040;
}
.enc-chip-count {
  opacity: 0.65;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
}

/* ── Content / groups ── */
.enc-content {
  padding: 4px var(--enc-pad) var(--enc-pad);
}
.enc-group {
  margin-top: clamp(8px, 0.65vw, 12px);
}
.enc-group-header {
  padding: clamp(5px, 0.4vw, 7px) 2px;
  background: linear-gradient(180deg, #111008 72%, transparent);
}
.enc-group-icon {
  color: #c89040;
}
.enc-group-title {
  font-size: clamp(13px, 0.85vw, 16px);
  letter-spacing: 0.02em;
  color: #e8c040;
}
.enc-group-rule {
  height: 1px;
  background: linear-gradient(to right, #5c3310, transparent);
}
.enc-group-count {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  font-weight: 700;
  color: #c89040;
}

/* ── Entry card ── */
.enc-entry {
  background: #1a1008;
  border: 1px solid #3e200a;
  border-radius: 5px;
  padding: clamp(9px, 0.65vw, 12px) clamp(10px, 0.75vw, 14px);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.enc-entry:hover {
  border-color: #5c3310;
}
.enc-entry--flash {
  border-color: #e8c040;
  box-shadow: 0 0 0 1px #e8c040;
}
.enc-entry-iconbox {
  width: clamp(34px, 2.3vw, 42px);
  height: clamp(34px, 2.3vw, 42px);
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 5px;
}
.enc-entry-gi {
  color: #c89040;
  width: clamp(20px, 1.45vw, 26px);
  height: clamp(20px, 1.45vw, 26px);
}
.enc-entry-img {
  width: clamp(24px, 1.65vw, 30px);
  height: clamp(24px, 1.65vw, 30px);
  object-fit: contain;
}
.enc-entry-name {
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(12.5px, 0.8vw, 14.5px);
  font-weight: 700;
  color: #e8c060;
}
.enc-entry-desc {
  margin-top: 6px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(11.5px, 0.72vw, 13.5px);
  line-height: 1.6;
  color: #b4ab96;
}
.enc-mark {
  background: rgba(232, 192, 64, 0.3);
  color: #fff2c8;
  border-radius: 2px;
  padding: 0 1px;
}

/* ── Bookmark ── */
.enc-bookmark {
  flex: none;
  display: flex;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #5a4e34;
}
.enc-bookmark:hover {
  color: #c89040;
}
.enc-bookmark--on {
  color: #e8c040;
}

/* ── Formula ── */
.enc-formula-btn {
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(9.5px, 0.6vw, 11px);
  font-weight: 600;
  color: #c89040;
  background: transparent;
  border: 1px solid #5c3310;
  border-radius: 20px;
  padding: clamp(3px, 0.25vw, 4px) clamp(7px, 0.55vw, 10px);
  cursor: pointer;
}
.enc-formula-btn--open {
  color: #e8c040;
  background: rgba(232, 192, 64, 0.12);
}
.enc-formula {
  position: relative;
  margin-top: 9px;
  background: #0c0a05;
  border: 1px solid #3e200a;
  border-radius: 5px;
  padding: 10px 12px;
}
.enc-formula-text {
  white-space: pre-wrap;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: clamp(10.5px, 0.65vw, 12px);
  line-height: 1.7;
  font-weight: 500;
  color: #e8c060;
}
.enc-copy {
  position: absolute;
  top: 7px;
  right: 7px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  font-weight: 700;
  color: #c89040;
  background: #1a1408;
  border: 1px solid #5c3310;
  border-radius: 3px;
  padding: 3px 7px;
  cursor: pointer;
}
.enc-copy--done {
  color: #52b830;
}

/* ── Related jump chips ── */
.enc-related {
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(9.5px, 0.58vw, 10.5px);
  font-weight: 600;
  color: #c89040;
  background: transparent;
  border: 1px dashed #5c3310;
  border-radius: 20px;
  padding: 3px clamp(6px, 0.5vw, 9px);
  cursor: pointer;
}
.enc-related:hover {
  border-color: #c89040;
  color: #e8c040;
}

/* ── Lore ── */
.enc-lore {
  margin-top: clamp(6px, 0.5vw, 9px);
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-style: italic;
  font-size: clamp(10.5px, 0.64vw, 12px);
  line-height: 1.55;
  color: #8a8172;
}

/* ── Empty state ── */
.enc-empty {
  padding: 64px 20px;
  color: #8a8172;
}
.enc-empty-icon {
  color: #5c3310;
}
.enc-empty-title {
  margin-top: 12px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(12px, 0.72vw, 13.5px);
  font-weight: 600;
}
.enc-empty-hint {
  margin-top: 4px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(10.5px, 0.64vw, 12px);
  color: #6b6558;
}

/* ── Footer ── */
.enc-footer {
  padding: clamp(6px, 0.5vw, 9px) var(--enc-pad);
  background: #1e1006;
  border-top: 1px solid #5c3310;
}
.enc-footer-count {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: clamp(9.5px, 0.58vw, 11px);
  font-weight: 600;
  color: #c89040;
}
.enc-footer-note {
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-style: italic;
  font-size: clamp(9px, 0.55vw, 10.5px);
  color: #8a8172;
}

/* ── Scrollbars ── */
.enc-scroll {
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* ── Compact layout on flat viewports (Full HD, ~950px height) ── */
@media (max-height: 1100px) {
  .enc-header {
    padding-top: 8px;
    padding-bottom: 7px;
  }
  .enc-search-wrap {
    padding-top: 6px;
    padding-bottom: 5px;
  }
  .enc-chips {
    padding-bottom: 6px;
  }
  .enc-group {
    margin-top: 7px;
  }
  .enc-entry {
    padding-top: 8px;
    padding-bottom: 8px;
  }
}
</style>
