<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useBattleStore } from '../stores/battleStore'
import { useShopStore } from '../stores/shopStore'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const shopStore = useShopStore()

const isOpen = ref(false)
const search = ref('')
const editingKey = ref<string | null>(null)
const editingValue = ref<string>('')

function toggle() {
  isOpen.value = !isOpen.value
}

function onKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault()
    toggle()
  }
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))


const abilityNames = ['Q (CPS)', 'W (Power)', 'E (Meep Cost)', 'R (CPC)']

// All fields grouped by section for search filtering
const sections = computed(() => [
  {
    id: 'core',
    label: 'Core Resources',
    fields: [
      { key: 'chimes', label: 'Chimes', type: 'number', min: 0 },
      { key: 'meeps', label: 'Meeps', type: 'number', min: 0 },
      { key: 'level', label: 'Level', type: 'number', min: 1 },
      { key: 'skillPoints', label: 'Skill Points', type: 'number', min: 0 },
    ],
  },
  {
    id: 'battle',
    label: 'Battle & Rank',
    fields: [
      { key: 'mmr', label: 'MMR', type: 'number', min: 0 },
      { key: 'rankTier', label: 'Rank Tier', type: 'select', options: battleStore.tierOrder },
      { key: 'rankDivision', label: 'Division', type: 'select', options: battleStore.rankOrder },
      { key: 'rankLp', label: 'LP', type: 'number', min: 0 },
    ],
  },
  {
    id: 'abilities',
    label: 'Abilities',
    fields: abilityNames.map((name, i) => ({
      key: `ability_${i}`,
      label: name,
      type: 'range',
      min: 0,
      max: 5,
    })),
  },
  {
    id: 'buildings',
    label: 'Buildings',
    fields: shopStore.shopUpgrades.map((u, i) => ({
      key: `building_${i}`,
      label: u.name,
      type: 'number',
      min: 0,
    })),
  },
  {
    id: 'advanced',
    label: 'Advanced',
    fields: [
      { key: 'currentUniverse', label: 'Universe', type: 'number', min: 1, max: 10 },
      { key: 'chimesForNextUniverse', label: 'Chimes for Next Universe', type: 'number', min: 0 },
      { key: 'gameSpeed', label: 'Game Speed (ms)', type: 'number', min: 100 },
      { key: 'autoBattle', label: 'Auto Battle', type: 'checkbox' },
      { key: 'prestige', label: 'Prestige Available', type: 'checkbox' },
    ],
  },
])

const filteredSections = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return sections.value
  return sections.value
    .map((s) => ({
      ...s,
      fields: s.fields.filter((f) => f.label.toLowerCase().includes(q)),
    }))
    .filter((s) => s.fields.length > 0)
})

function getValue(key: string): number | string | boolean {
  if (key === 'chimes') return gameStore.chimes
  if (key === 'meeps') return gameStore.meeps
  if (key === 'level') return gameStore.level
  if (key === 'skillPoints') return gameStore.skillPoints
  if (key === 'mmr') return battleStore.mmr
  if (key === 'rankTier') return battleStore.currentRank.tier
  if (key === 'rankDivision') return battleStore.currentRank.division
  if (key === 'rankLp') return battleStore.currentRank.lp
  if (key.startsWith('ability_')) return gameStore.abilityLevels[parseInt(key.split('_')[1])]
  if (key.startsWith('building_')) return shopStore.shopUpgrades[parseInt(key.split('_')[1])].level
  if (key === 'currentUniverse') return gameStore.currentUniverse
  if (key === 'chimesForNextUniverse') return gameStore.chimesForNextUniverse
  if (key === 'gameSpeed') return gameStore.gameSpeed
  if (key === 'autoBattle') return battleStore.autoBattleEnabled
  if (key === 'prestige') return gameStore.prestigeAvailable
  return 0
}

function setValue(key: string, raw: string | boolean) {
  const num = typeof raw === 'string' ? parseFloat(raw) : NaN
  const int = typeof raw === 'string' ? parseInt(raw) : NaN

  if (key === 'chimes' && !isNaN(num)) gameStore.chimes = num
  else if (key === 'meeps' && !isNaN(int)) gameStore.meeps = int
  else if (key === 'level' && !isNaN(int)) gameStore.level = int
  else if (key === 'skillPoints' && !isNaN(int)) gameStore.skillPoints = int
  else if (key === 'mmr' && !isNaN(num)) battleStore.mmr = num
  else if (key === 'rankTier' && typeof raw === 'string') battleStore.currentRank.tier = raw
  else if (key === 'rankDivision' && typeof raw === 'string') battleStore.currentRank.division = raw
  else if (key === 'rankLp' && !isNaN(int)) battleStore.currentRank.lp = int
  else if (key.startsWith('ability_') && !isNaN(int)) {
    const i = parseInt(key.split('_')[1])
    gameStore.setAbilityLevel(i, int)
  } else if (key.startsWith('building_') && !isNaN(int)) {
    const i = parseInt(key.split('_')[1])
    shopStore.setBuildingLevel(i, int)
  } else if (key === 'currentUniverse' && !isNaN(int)) gameStore.currentUniverse = int
  else if (key === 'chimesForNextUniverse' && !isNaN(num)) gameStore.chimesForNextUniverse = num
  else if (key === 'gameSpeed' && !isNaN(int)) gameStore.gameSpeed = int
  else if (key === 'autoBattle' && typeof raw === 'boolean') battleStore.autoBattleEnabled = raw
  else if (key === 'prestige' && typeof raw === 'boolean') gameStore.prestigeAvailable = raw
}

const defaultValues: Record<string, number | string | boolean> = {
  chimes: 0, meeps: 0, level: 1, skillPoints: 0,
  mmr: 1000, rankTier: 'Iron', rankDivision: 'IV', rankLp: 0,
  ability_0: 0, ability_1: 0, ability_2: 0, ability_3: 0,
  building_0: 0, building_1: 0, building_2: 0, building_3: 0, building_4: 0, building_5: 0,
  currentUniverse: 1, chimesForNextUniverse: 0, gameSpeed: 1000, autoBattle: false, prestige: false,
}

function resetSection(sectionId: string) {
  const section = sections.value.find((s) => s.id === sectionId)
  if (!section) return
  section.fields.forEach((f) => {
    if (f.key in defaultValues) {
      setValue(f.key, defaultValues[f.key] as string | boolean)
    }
  })
}
</script>

<template>
  <!-- Toggle Button -->
  <button
    class="fixed z-[100] bottom-4 left-4 w-9 h-9 flex items-center justify-center rounded-lg border border-blue-400/40 bg-gradient-to-br from-blue-900/80 to-violet-900/80 backdrop-blur-sm text-blue-300 hover:border-blue-400/70 hover:text-blue-100 transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
    title="Admin Dashboard (Ctrl+Shift+A)"
    @click="toggle"
  >
    <span class="text-base leading-none">⚙</span>
  </button>

  <!-- Backdrop -->
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
      @click.self="isOpen = false"
    />
  </Transition>

  <!-- Modal -->
  <Transition name="slide-up">
    <div
      v-if="isOpen"
      class="fixed z-[120] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(760px,95vw)] max-h-[85vh] flex flex-col rounded-2xl border border-blue-400/30 bg-gradient-to-br from-[#0a0620]/95 via-[#110b3d]/95 to-[#0a0620]/95 backdrop-blur-xl shadow-2xl shadow-blue-900/40"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-blue-400/20">
        <div class="flex items-center gap-2">
          <span class="text-violet-400 text-lg">⚙</span>
          <span class="font-mono text-sm font-bold text-blue-200 tracking-widest uppercase">Admin Dashboard</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-blue-500/60 font-mono">Ctrl+Shift+A</span>
          <button
            class="w-6 h-6 flex items-center justify-center rounded text-blue-400/60 hover:text-blue-200 hover:bg-blue-500/20 transition-colors"
            @click="isOpen = false"
          >✕</button>
        </div>
      </div>

      <!-- Search -->
      <div class="px-5 py-2.5 border-b border-blue-400/10">
        <input
          v-model="search"
          type="text"
          placeholder="Search fields..."
          class="w-full bg-blue-950/40 border border-blue-400/20 rounded-lg px-3 py-1.5 text-sm font-mono text-blue-100 placeholder-blue-500/40 focus:outline-none focus:border-blue-400/60 focus:bg-blue-950/60 transition-all"
        />
      </div>

      <!-- Sections -->
      <div class="overflow-y-auto flex-1 px-5 py-3 space-y-4 scrollbar-thin">
        <div
          v-for="section in filteredSections"
          :key="section.id"
          class="rounded-xl border border-blue-400/15 bg-blue-950/20 overflow-hidden"
        >
          <!-- Section header -->
          <div class="flex items-center justify-between px-4 py-2 bg-blue-900/20 border-b border-blue-400/10">
            <span class="text-xs font-mono font-bold text-violet-300 tracking-wider uppercase">{{ section.label }}</span>
            <button
              class="text-[10px] font-mono text-blue-500/60 hover:text-blue-300 transition-colors px-2 py-0.5 rounded border border-blue-500/20 hover:border-blue-400/40"
              @click="resetSection(section.id)"
            >reset</button>
          </div>

          <!-- Fields grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-blue-400/5 p-0">
            <div
              v-for="field in section.fields"
              :key="field.key"
              class="flex items-center justify-between gap-3 px-4 py-2 bg-[#0a0620]/60 hover:bg-blue-950/40 transition-colors"
            >
              <label class="text-xs font-mono text-blue-300/80 whitespace-nowrap min-w-[90px]">{{ field.label }}</label>

              <!-- Number input -->
              <input
                v-if="field.type === 'number'"
                type="number"
                :min="field.min"
                :max="(field as any).max"
                :value="editingKey === field.key ? editingValue : getValue(field.key)"
                class="w-full max-w-[140px] bg-blue-950/60 border border-blue-400/20 rounded px-2 py-0.5 text-xs font-mono text-blue-100 focus:outline-none focus:border-violet-400/60 focus:shadow-[0_0_0_1px_rgba(139,92,246,0.3)] transition-all text-right"
                @focus="editingKey = field.key; editingValue = String(getValue(field.key))"
                @input="editingValue = ($event.target as HTMLInputElement).value"
                @change="setValue(field.key, editingValue); editingKey = null"
                @blur="setValue(field.key, editingValue); editingKey = null"
              />

              <!-- Range slider -->
              <div v-else-if="field.type === 'range'" class="flex items-center gap-2 flex-1">
                <input
                  type="range"
                  :min="field.min"
                  :max="(field as any).max"
                  :value="getValue(field.key)"
                  class="flex-1 accent-violet-500 cursor-pointer h-1.5"
                  @input="setValue(field.key, ($event.target as HTMLInputElement).value)"
                />
                <span class="text-xs font-mono text-violet-300 w-4 text-right">{{ getValue(field.key) }}</span>
              </div>

              <!-- Select -->
              <select
                v-else-if="field.type === 'select'"
                :value="getValue(field.key)"
                class="w-full max-w-[140px] bg-blue-950/60 border border-blue-400/20 rounded px-2 py-0.5 text-xs font-mono text-blue-100 focus:outline-none focus:border-violet-400/60 transition-all"
                @change="setValue(field.key, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="opt in (field as any).options" :key="opt" :value="opt">{{ opt }}</option>
              </select>

              <!-- Checkbox -->
              <div v-else-if="field.type === 'checkbox'" class="flex items-center">
                <input
                  type="checkbox"
                  :checked="getValue(field.key) as boolean"
                  class="w-4 h-4 accent-violet-500 cursor-pointer"
                  @change="setValue(field.key, ($event.target as HTMLInputElement).checked)"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredSections.length === 0" class="text-center py-8 text-blue-500/40 font-mono text-sm">
          No fields match "{{ search }}"
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, -48%);
}

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 2px;
}
</style>
