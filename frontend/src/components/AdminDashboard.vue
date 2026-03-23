<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useBattleStore } from '../stores/battleStore'
import { useShopStore } from '../stores/shopStore'
import { usePlanetEventStore } from '../stores/planetEventStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { MATERIALS, pickMaterial } from '../config/materials'
import { CHAMPION_HOME_PLANETS } from '../config/championHomePlanets'

const props = withDefaults(defineProps<{ inline?: boolean }>(), { inline: false })

const gameStore = useGameStore()
const battleStore = useBattleStore()
const shopStore = useShopStore()
const planetEventStore = usePlanetEventStore()
const inventoryStore = useInventoryStore()

const isOpen = ref(false)
const search = ref('')
const editingKey = ref<string | null>(null)
const editingValue = ref<string>('')

function toggle() {
  isOpen.value = !isOpen.value
}

function onKeydown(e: KeyboardEvent) {
  if (props.inline) return
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

// ── Planet Spawn ─────────────────────────────────────────────────────────────

function spawnPlanet() {
  planetEventStore.pendingRescue = true
}

async function spawnPlanetWithMaterial() {
  planetEventStore.pendingRescue = true
  await nextTick()
  if (planetEventStore.activePlanetEvent) {
    planetEventStore.activePlanetEvent.potentialMaterialId = pickMaterial().id
    planetEventStore.activePlanetEvent.assignedDropChance = 1.0
  }
}

async function spawnPlanetWithChampion() {
  const candidates = CHAMPION_HOME_PLANETS.filter(
    (c) =>
      !battleStore.ownedChampions.includes(c.championName) &&
      !battleStore.recruitableChampions.some((r) => r.name === c.championName),
  )
  if (candidates.length === 0) return
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  planetEventStore.pendingRescue = true
  await nextTick()
  if (planetEventStore.activePlanetEvent) {
    planetEventStore.activePlanetEvent.homePlanetChampion = pick.championName
  }
}

// ── Sections ─────────────────────────────────────────────────────────────────

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
    id: 'materials',
    label: 'Materials',
    fields: MATERIALS.map((m) => ({
      key: `mat_${m.id}`,
      label: m.name,
      type: 'number',
      min: 0,
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

// Section header accent colors
const sectionColors: Record<string, { header: string; label: string; reset: string }> = {
  core:      { header: 'bg-violet-900/20 border-violet-400/15', label: 'text-violet-300', reset: 'text-violet-500/60 hover:text-violet-300 border-violet-500/20 hover:border-violet-400/40' },
  battle:    { header: 'bg-blue-900/20 border-blue-400/15',     label: 'text-blue-300',   reset: 'text-blue-500/60 hover:text-blue-300 border-blue-500/20 hover:border-blue-400/40' },
  materials: { header: 'bg-teal-900/20 border-teal-400/15',     label: 'text-teal-300',   reset: 'text-teal-500/60 hover:text-teal-300 border-teal-500/20 hover:border-teal-400/40' },
  buildings: { header: 'bg-orange-900/20 border-orange-400/15', label: 'text-orange-300', reset: 'text-orange-500/60 hover:text-orange-300 border-orange-500/20 hover:border-orange-400/40' },
  advanced:  { header: 'bg-rose-900/20 border-rose-400/15',     label: 'text-rose-300',   reset: 'text-rose-500/60 hover:text-rose-300 border-rose-500/20 hover:border-rose-400/40' },
}

function getSectionColor(id: string) {
  return sectionColors[id] ?? sectionColors['core']
}

// ── getValue / setValue ───────────────────────────────────────────────────────

function getValue(key: string): number | string | boolean {
  if (key === 'chimes') return gameStore.chimes
  if (key === 'meeps') return gameStore.meeps
  if (key === 'level') return gameStore.level
  if (key === 'skillPoints') return gameStore.skillPoints
  if (key === 'mmr') return battleStore.mmr
  if (key === 'rankTier') return battleStore.currentRank.tier
  if (key === 'rankDivision') return battleStore.currentRank.division
  if (key === 'rankLp') return battleStore.currentRank.lp
  if (key.startsWith('mat_')) return inventoryStore.collectedMaterials[key.slice(4)] ?? 0
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
  else if (key.startsWith('mat_') && !isNaN(int)) inventoryStore.collectedMaterials[key.slice(4)] = int
  else if (key.startsWith('building_') && !isNaN(int)) {
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
  mat_stardust: 0, mat_moon_crystal: 0, mat_nebula_quartz: 0,
  mat_solar_essence: 0, mat_void_shard: 0, mat_dark_matter: 0,
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
  <!-- ── STANDALONE MODE ─────────────────────────────────────────── -->
  <template v-if="!inline">
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
        class="fixed z-[120] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(780px,95vw)] max-h-[88vh] flex flex-col rounded-2xl border border-blue-400/30 bg-gradient-to-br from-[#0a0620]/97 via-[#110b3d]/97 to-[#0a0620]/97 backdrop-blur-xl shadow-2xl shadow-blue-900/40"
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

        <!-- Quick Actions -->
        <div class="px-5 py-3 border-b border-blue-400/20 bg-[#050215]/70" style="box-shadow: 0 2px 16px 0 rgba(99,102,241,0.10) inset;">
          <div class="text-[10px] font-mono font-bold text-indigo-400/70 tracking-widest uppercase mb-2">Quick Actions</div>
          <!-- Inline Editable Values -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div v-for="qf in [
              { key: 'chimes', label: 'Chimes' },
              { key: 'meeps', label: 'Meeps' },
              { key: 'level', label: 'Level' },
              { key: 'skillPoints', label: 'Skill Points' },
            ]" :key="qf.key" class="flex flex-col gap-0.5">
              <label class="text-[10px] font-mono text-blue-400/60 uppercase tracking-wider">{{ qf.label }}</label>
              <input
                type="number"
                :min="qf.key === 'level' ? 1 : 0"
                :value="editingKey === `qa_${qf.key}` ? editingValue : getValue(qf.key)"
                class="bg-[#0a0620]/80 border border-indigo-400/30 rounded-lg px-2.5 py-1.5 text-sm font-mono text-blue-100 focus:outline-none focus:border-indigo-400/70 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.18)] transition-all text-right"
                @focus="editingKey = `qa_${qf.key}`; editingValue = String(getValue(qf.key))"
                @input="editingValue = ($event.target as HTMLInputElement).value"
                @change="setValue(qf.key, editingValue); editingKey = null"
                @blur="setValue(qf.key, editingValue); editingKey = null"
              />
            </div>
          </div>
          <!-- Planet Spawn Buttons -->
          <div class="flex flex-wrap gap-2">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-slate-500/50 text-slate-300 hover:bg-slate-700/30 hover:border-slate-400/70 hover:text-slate-100 transition-all"
              @click="spawnPlanet"
            >
              <span>🌍</span> Spawn Planet
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-blue-500/50 text-blue-300 hover:bg-blue-700/25 hover:border-blue-400/70 hover:text-blue-100 transition-all"
              @click="spawnPlanetWithMaterial"
            >
              <span>💎</span> Spawn + Material
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-yellow-500/50 text-yellow-300 hover:bg-yellow-700/20 hover:border-yellow-400/70 hover:text-yellow-100 transition-all"
              @click="spawnPlanetWithChampion"
            >
              <span>🏆</span> Spawn + Champion
            </button>
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
        <div class="overflow-y-auto flex-1 px-5 py-3 space-y-3 custom-scrollbar">
          <div
            v-for="section in filteredSections"
            :key="section.id"
            class="rounded-xl border border-blue-400/10 overflow-hidden"
          >
            <div
              class="flex items-center justify-between px-4 py-2 border-b border-blue-400/10"
              :class="getSectionColor(section.id).header"
            >
              <span class="text-xs font-mono font-bold tracking-wider uppercase" :class="getSectionColor(section.id).label">{{ section.label }}</span>
              <button
                class="text-[10px] font-mono transition-colors px-2 py-0.5 rounded border"
                :class="getSectionColor(section.id).reset"
                @click="resetSection(section.id)"
              >reset</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-blue-400/5 p-0">
              <div
                v-for="field in section.fields"
                :key="field.key"
                class="flex items-center justify-between gap-3 px-4 py-2 bg-[#0a0620]/60 hover:bg-blue-950/40 transition-colors"
              >
                <label class="text-xs font-mono text-blue-300/80 whitespace-nowrap min-w-[90px]">{{ field.label }}</label>
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
                <select
                  v-else-if="field.type === 'select'"
                  :value="getValue(field.key)"
                  class="w-full max-w-[140px] bg-blue-950/60 border border-blue-400/20 rounded px-2 py-0.5 text-xs font-mono text-blue-100 focus:outline-none focus:border-violet-400/60 transition-all"
                  @change="setValue(field.key, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="opt in (field as any).options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
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

  <!-- ── INLINE MODE (inside App.vue modal) ─────────────────────── -->
  <template v-else>
    <!-- Quick Actions -->
    <div class="px-5 py-3 border-b border-cyan-400/15 bg-[#050215]/60" style="box-shadow: 0 2px 12px 0 rgba(99,102,241,0.08) inset;">
      <div class="text-[10px] font-mono font-bold text-indigo-400/70 tracking-widest uppercase mb-2">Quick Actions</div>
      <!-- Inline Editable Values -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div v-for="qf in [
          { key: 'chimes', label: 'Chimes' },
          { key: 'meeps', label: 'Meeps' },
          { key: 'level', label: 'Level' },
          { key: 'skillPoints', label: 'Skill Points' },
        ]" :key="qf.key" class="flex flex-col gap-0.5">
          <label class="text-[10px] font-mono text-blue-400/60 uppercase tracking-wider">{{ qf.label }}</label>
          <input
            type="number"
            :min="qf.key === 'level' ? 1 : 0"
            :value="editingKey === `qa_${qf.key}` ? editingValue : getValue(qf.key)"
            class="bg-[#0a0620]/80 border border-indigo-400/30 rounded-lg px-2.5 py-1.5 text-sm font-mono text-blue-100 focus:outline-none focus:border-indigo-400/70 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.18)] transition-all text-right"
            @focus="editingKey = `qa_${qf.key}`; editingValue = String(getValue(qf.key))"
            @input="editingValue = ($event.target as HTMLInputElement).value"
            @change="setValue(qf.key, editingValue); editingKey = null"
            @blur="setValue(qf.key, editingValue); editingKey = null"
          />
        </div>
      </div>
      <!-- Planet Spawn Buttons -->
      <div class="flex flex-wrap gap-2">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-slate-500/50 text-slate-300 hover:bg-slate-700/30 hover:border-slate-400/70 hover:text-slate-100 transition-all"
          @click="spawnPlanet"
        >
          <span>🌍</span> Spawn Planet
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-blue-500/50 text-blue-300 hover:bg-blue-700/25 hover:border-blue-400/70 hover:text-blue-100 transition-all"
          @click="spawnPlanetWithMaterial"
        >
          <span>💎</span> Spawn + Material
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-yellow-500/50 text-yellow-300 hover:bg-yellow-700/20 hover:border-yellow-400/70 hover:text-yellow-100 transition-all"
          @click="spawnPlanetWithChampion"
        >
          <span>🏆</span> Spawn + Champion
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="px-5 py-2.5 border-b border-cyan-400/10">
      <input
        v-model="search"
        type="text"
        placeholder="Search fields..."
        class="w-full bg-[#050310]/60 border border-cyan-400/20 rounded-lg px-3 py-1.5 text-sm font-mono text-blue-100 placeholder-blue-500/40 focus:outline-none focus:border-cyan-400/60 focus:bg-[#050310]/80 transition-all"
      />
    </div>

    <!-- Sections -->
    <div class="px-5 py-3 space-y-3 scrollbar-thin">
      <div
        v-for="section in filteredSections"
        :key="section.id"
        class="rounded-xl border border-blue-400/10 overflow-hidden"
      >
        <div
          class="flex items-center justify-between px-4 py-2 border-b border-blue-400/10"
          :class="getSectionColor(section.id).header"
        >
          <span class="text-xs font-mono font-bold tracking-wider uppercase" :class="getSectionColor(section.id).label">{{ section.label }}</span>
          <button
            class="text-[10px] font-mono transition-colors px-2 py-0.5 rounded border"
            :class="getSectionColor(section.id).reset"
            @click="resetSection(section.id)"
          >reset</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-blue-400/5 p-0">
          <div
            v-for="field in section.fields"
            :key="field.key"
            class="flex items-center justify-between gap-3 px-4 py-2 bg-[#0a0620]/60 hover:bg-blue-950/40 transition-colors"
          >
            <label class="text-xs font-mono text-blue-300/80 whitespace-nowrap min-w-[90px]">{{ field.label }}</label>
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
            <select
              v-else-if="field.type === 'select'"
              :value="getValue(field.key)"
              class="w-full max-w-[140px] bg-blue-950/60 border border-blue-400/20 rounded px-2 py-0.5 text-xs font-mono text-blue-100 focus:outline-none focus:border-violet-400/60 transition-all"
              @change="setValue(field.key, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in (field as any).options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
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
  </template>
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
</style>
