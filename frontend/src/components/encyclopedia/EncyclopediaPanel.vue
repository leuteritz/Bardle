<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { encyclopediaData } from '../../config/encyclopediaData'

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
        class="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
        @click="closePanel"
      />
    </Transition>

    <!-- Panel -->
    <Transition name="slide">
      <div
        v-if="gameStore.isEncyclopediaOpen"
        class="fixed right-0 top-0 h-full w-[420px] z-[70] flex flex-col overflow-hidden shadow-2xl border-l border-purple-400/30 bg-gradient-to-bl from-slate-900 via-purple-950 to-slate-900 font-['MedievalSharp']"
      >
        <!-- Animated background particles -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            class="absolute w-40 h-40 rounded-full -top-10 -left-10 bg-purple-600/10 blur-3xl animate-blob"
          />
          <div
            class="absolute w-32 h-32 rounded-full -bottom-10 -right-10 bg-pink-600/10 blur-3xl animate-blob animation-delay-2000"
          />
          <div
            class="absolute w-24 h-24 rounded-full top-1/2 left-1/4 bg-blue-600/8 blur-2xl animate-blob animation-delay-4000"
          />
        </div>

        <!-- Header -->
        <div
          class="relative z-10 flex items-center justify-between px-5 py-4 border-b shrink-0 border-purple-400/20 bg-gradient-to-r from-purple-900/40 to-pink-900/20 backdrop-blur-lg"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">📖</span>
            <h2
              class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300"
            >
              Bardle Enzyklopaedie
            </h2>
          </div>
          <button
            class="flex items-center justify-center w-8 h-8 transition-all duration-200 border rounded-lg bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-110"
            @click="closePanel"
          >
            <span class="text-sm text-purple-300">✕</span>
          </button>
        </div>

        <!-- Search -->
        <div class="relative z-10 px-5 py-3 border-b shrink-0 border-purple-400/10">
          <div class="relative">
            <span class="absolute text-sm -translate-y-1/2 left-3 top-1/2 text-purple-400/60"
              >🔍</span
            >
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Suche..."
              class="w-full py-2 pl-9 pr-3 text-sm text-purple-100 transition-all duration-200 border rounded-lg bg-white/5 border-purple-400/20 placeholder-purple-400/40 focus:outline-none focus:border-purple-400/50 focus:bg-white/8"
            />
          </div>
        </div>

        <!-- Scrollable content -->
        <div class="relative z-10 flex-1 px-4 py-3 overflow-y-auto custom-scrollbar">
          <div
            v-for="category in filteredData"
            :key="category.id"
            class="mb-2"
          >
            <!-- Category header -->
            <button
              class="flex items-center w-full gap-2 px-3 py-2.5 text-left transition-all duration-200 border rounded-xl bg-white/10 border-white/15 hover:bg-white/15 hover:border-white/25 group"
              :class="{ 'bg-white/8 border-purple-400/30': expandedCategories.has(category.id) }"
              @click="toggleCategory(category.id)"
            >
              <span class="text-lg">{{ category.icon }}</span>
              <span
                class="flex-1 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200"
              >
                {{ category.title }}
              </span>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-400/20 text-purple-300 font-mono"
              >
                {{ category.entries.length }}
              </span>
              <span
                class="text-xs transition-transform duration-200 text-purple-400/60"
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
                class="p-3 transition-all duration-200 border rounded-xl bg-white/8 border-white/10 hover:bg-white/12 hover:border-purple-400/30"
              >
                <div class="flex items-start gap-3">
                  <!-- Icon -->
                  <img
                    :src="entry.icon"
                    :alt="entry.name"
                    class="object-contain w-10 h-10 rounded-lg shrink-0 bg-black/20 ring-1 ring-white/10"
                    loading="lazy"
                  />
                  <div class="flex-1 min-w-0">
                    <!-- Name -->
                    <h4
                      class="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300"
                    >
                      {{ entry.name }}
                    </h4>
                    <!-- Description -->
                    <p class="mt-1 text-xs leading-relaxed text-purple-200/80">
                      {{ entry.description }}
                    </p>
                    <!-- Formula -->
                    <p
                      v-if="entry.formula"
                      class="px-2 py-1 mt-1.5 text-[11px] font-mono rounded-md bg-purple-900/40 text-amber-300/80 border border-purple-400/10"
                    >
                      {{ entry.formula }}
                    </p>
                    <!-- Lore -->
                    <p class="mt-1.5 text-[11px] italic leading-relaxed text-purple-400/60">
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
            class="flex flex-col items-center justify-center py-12 text-purple-400/40"
          >
            <span class="text-4xl">🔮</span>
            <p class="mt-2 text-sm">Keine Eintraege gefunden</p>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="relative z-10 px-5 py-2.5 text-center border-t shrink-0 border-purple-400/10 bg-purple-950/50"
        >
          <p class="text-[10px] text-purple-400/40 italic">
            {{ encyclopediaData.reduce((sum, c) => sum + c.entries.length, 0) }} Eintraege in
            {{ encyclopediaData.length }} Kategorien
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
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

</style>
