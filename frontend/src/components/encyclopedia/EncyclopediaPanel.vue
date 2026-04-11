<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { encyclopediaData } from '../../config/encyclopedia'

const gameStore = useGameStore()
const searchQuery = ref('')
const expandedCategories = ref<Set<string>>(new Set())

function toggleCategory(id: string) {
  if (expandedCategories.value.has(id)) {
    expandedCategories.value.delete(id)
  } else {
    expandedCategories.value.add(id)
  }
}

function closePanel() {
  gameStore.isEncyclopediaOpen = false
}

const filteredData = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return encyclopediaData

  return encyclopediaData
    .map((category) => ({
      ...category,
      entries: category.entries.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) ||
          entry.description.toLowerCase().includes(query) ||
          entry.lore.toLowerCase().includes(query),
      ),
    }))
    .filter((category) => category.entries.length > 0)
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="gameStore.isEncyclopediaOpen"
        class="rpg-overlay fixed inset-0 z-[60]"
        @click="closePanel"
      />
    </Transition>

    <!-- Panel -->
    <Transition name="slide">
      <div
        v-if="gameStore.isEncyclopediaOpen"
        class="enc-panel fixed right-0 top-0 h-full w-[420px] z-[70] flex flex-col overflow-hidden"
      >
        <!-- Gold accent bar -->
        <div class="rpg-accent-bar"></div>

        <!-- Header -->
        <div class="enc-header relative z-10 flex items-center justify-between px-5 py-4 shrink-0">
          <div class="flex items-center gap-3">
            <span class="text-2xl">📖</span>
            <h2 class="enc-title text-xl font-bold">
              Bardle Enzyklopaedie
            </h2>
          </div>
          <button
            class="rpg-close-btn flex items-center justify-center w-8 h-8"
            @click="closePanel"
          >
            <span class="text-sm">✕</span>
          </button>
        </div>

        <!-- Search -->
        <div class="enc-search-wrap relative z-10 px-5 py-3 shrink-0">
          <div class="relative">
            <span class="enc-search-icon absolute text-sm -translate-y-1/2 left-3 top-1/2">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Suche..."
              class="enc-search-input w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <!-- Scrollable content -->
        <div class="rpg-scrollbar relative z-10 flex-1 px-4 py-3 overflow-y-auto">
          <div
            v-for="category in filteredData"
            :key="category.id"
            class="mb-2"
          >
            <!-- Category header -->
            <button
              class="enc-category-btn flex items-center w-full gap-2 px-3 py-2.5 text-left"
              :class="{ 'enc-category-btn--active': expandedCategories.has(category.id) }"
              @click="toggleCategory(category.id)"
            >
              <span class="text-lg">{{ category.icon }}</span>
              <span class="enc-category-title flex-1 text-sm font-bold">
                {{ category.title }}
              </span>
              <span class="enc-badge text-[10px] px-1.5 py-0.5 font-mono">
                {{ category.entries.length }}
              </span>
              <span
                class="enc-arrow text-xs"
                :class="{ 'rotate-90': expandedCategories.has(category.id) }"
              >
                ▶
              </span>
            </button>

            <!-- Entries -->
            <div
              v-show="expandedCategories.has(category.id)"
              class="mt-1 ml-2 space-y-1.5"
            >
              <div
                v-for="entry in category.entries"
                :key="entry.id"
                class="enc-entry p-3"
              >
                <div class="flex items-start gap-3">
                  <!-- Icon -->
                  <img
                    :src="entry.icon"
                    :alt="entry.name"
                    class="rpg-icon-box object-contain w-10 h-10 shrink-0"
                    loading="lazy"
                  />
                  <div class="flex-1 min-w-0">
                    <!-- Name -->
                    <h4 class="enc-entry-name text-sm font-bold">
                      {{ entry.name }}
                    </h4>
                    <!-- Description -->
                    <p class="enc-entry-desc mt-1 text-xs leading-relaxed">
                      {{ entry.description }}
                    </p>
                    <!-- Formula -->
                    <p
                      v-if="entry.formula"
                      class="enc-formula px-2 py-1 mt-1.5 text-[11px] font-mono"
                    >
                      {{ entry.formula }}
                    </p>
                    <!-- Lore -->
                    <p class="enc-lore mt-1.5 text-[11px] italic leading-relaxed">
                      {{ entry.lore }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="filteredData.length === 0"
            class="enc-empty flex flex-col items-center justify-center py-12"
          >
            <span class="text-4xl">🔮</span>
            <p class="mt-2 text-sm">Keine Eintraege gefunden</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="enc-footer relative z-10 px-5 py-2.5 text-center shrink-0">
          <p class="text-[10px] italic">
            {{ encyclopediaData.reduce((sum, c) => sum + c.entries.length, 0) }} Eintraege in
            {{ encyclopediaData.length }} Kategorien
          </p>
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

/* ── Panel ── */
.enc-panel {
  background: var(--rpg-bg-deep);
  border-left: 4px solid var(--rpg-wood);
  box-shadow: inset 0 0 0 2px var(--rpg-wood-inner), inset 0 0 0 4px var(--rpg-wood-mid),
    -8px 0 24px rgba(0, 0, 0, 0.7);
}

/* ── Header ── */
.enc-header {
  background: var(--rpg-bg-header);
  border-bottom: 3px solid var(--rpg-wood-mid);
}
.enc-title {
  color: var(--rpg-gold);
}

/* ── Search ── */
.enc-search-wrap {
  border-bottom: 1px solid var(--rpg-wood-inner);
}
.enc-search-icon {
  color: var(--rpg-text-dim);
}
.enc-search-input {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  color: var(--rpg-text);
  outline: none;
}
.enc-search-input::placeholder {
  color: var(--rpg-text-dim);
}
.enc-search-input:focus {
  border-color: var(--rpg-gold-dim);
  background: var(--rpg-bg-row);
}

/* ── Category button ── */
.enc-category-btn {
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-wood-inner);
  border-radius: 4px;
  transition: background 0.2s, border-color 0.2s;
}
.enc-category-btn:hover {
  background: var(--rpg-bg-header);
  border-color: var(--rpg-wood-mid);
}
.enc-category-btn--active {
  background: var(--rpg-bg-header);
  border-color: var(--rpg-wood);
}
.enc-category-title {
  color: var(--rpg-gold);
}
.enc-badge {
  background: var(--rpg-wood-inner);
  color: var(--rpg-gold-dim);
  border-radius: 4px;
}
.enc-arrow {
  color: var(--rpg-gold-dim);
  transition: transform 0.2s;
}

/* ── Entry card ── */
.enc-entry {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-inner);
  border-radius: 4px;
  transition: background 0.2s, border-color 0.2s;
}
.enc-entry:hover {
  background: var(--rpg-bg-row);
  border-color: var(--rpg-wood-mid);
}
.enc-entry-name {
  color: var(--rpg-gold);
}
.enc-entry-desc {
  color: var(--rpg-text-muted);
}

/* ── Formula box ── */
.enc-formula {
  background: var(--rpg-bg-icon);
  color: var(--rpg-gold-bright);
  border: 1px solid var(--rpg-wood-inner);
  border-radius: 4px;
}

/* ── Lore text ── */
.enc-lore {
  color: var(--rpg-text-dim);
}

/* ── Empty state ── */
.enc-empty {
  color: var(--rpg-text-dim);
}

/* ── Footer ── */
.enc-footer {
  background: var(--rpg-bg-header);
  border-top: 1px solid var(--rpg-wood-mid);
  color: var(--rpg-text-dim);
}
</style>
