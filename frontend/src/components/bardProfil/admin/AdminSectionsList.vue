<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useBattleStore } from '@/stores/battleStore'
import { useShopStore } from '@/stores/shopStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { MATERIALS } from '@/config/materials'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const shopStore = useShopStore()
const inventoryStore = useInventoryStore()

const search = ref('')
const editingKey = ref<string | null>(null)
const editingValue = ref<string>('')

// ── Sections ──────────────────────────────────────────────────────────────────

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

// ── Section accent colors ─────────────────────────────────────────────────────

const sectionColors: Record<string, { header: string; label: string; reset: string }> = {
  core: { header: 'section-header--core', label: 'section-label--core', reset: 'section-reset--core' },
  battle: { header: 'section-header--battle', label: 'section-label--battle', reset: 'section-reset--battle' },
  materials: { header: 'section-header--materials', label: 'section-label--materials', reset: 'section-reset--materials' },
  buildings: { header: 'section-header--buildings', label: 'section-label--buildings', reset: 'section-reset--buildings' },
  advanced: { header: 'section-header--advanced', label: 'section-label--advanced', reset: 'section-reset--advanced' },
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
    shopStore.setBuildingLevel(parseInt(key.split('_')[1]), int)
  } else if (key === 'currentUniverse' && !isNaN(int)) gameStore.currentUniverse = int
  else if (key === 'chimesForNextUniverse' && !isNaN(num)) gameStore.chimesForNextUniverse = num
  else if (key === 'gameSpeed' && !isNaN(int)) gameStore.gameSpeed = int
  else if (key === 'autoBattle' && typeof raw === 'boolean') battleStore.autoBattleEnabled = raw
}

// ── Editing ───────────────────────────────────────────────────────────────────

function startEditing(key: string) {
  editingKey.value = key
  editingValue.value = String(getValue(key))
}

function commitEdit(key: string) {
  setValue(key, editingValue.value)
  editingKey.value = null
}

// ── Reset ─────────────────────────────────────────────────────────────────────

const defaultValues: Record<string, number | string | boolean> = {
  chimes: 0,
  meeps: 0,
  level: 1,
  skillPoints: 0,
  mmr: 1000,
  rankTier: 'Iron',
  rankDivision: 'IV',
  rankLp: 0,
  mat_stardust: 0,
  mat_moon_crystal: 0,
  mat_nebula_quartz: 0,
  mat_solar_essence: 0,
  mat_void_shard: 0,
  mat_dark_matter: 0,
  building_0: 0,
  building_1: 0,
  building_2: 0,
  building_3: 0,
  building_4: 0,
  building_5: 0,
  currentUniverse: 1,
  chimesForNextUniverse: 0,
  gameSpeed: 1000,
  autoBattle: false,
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
  <!-- Search -->
  <div class="px-5 py-2.5 admin-search-bar">
    <input
      v-model="search"
      type="text"
      placeholder="Search fields..."
      class="w-full admin-search-input"
    />
  </div>

  <!-- Sections -->
  <div class="flex-1 px-5 py-3 space-y-3 overflow-y-auto rpg-scrollbar">
    <div
      v-for="section in filteredSections"
      :key="section.id"
      class="overflow-hidden admin-section"
    >
      <div
        class="flex items-center justify-between px-4 py-2 admin-section-header"
        :class="getSectionColor(section.id).header"
      >
        <span class="admin-section-title" :class="getSectionColor(section.id).label">{{
          section.label
        }}</span>
        <div class="flex items-center gap-1">
          <button
            class="admin-action-btn"
            :class="getSectionColor(section.id).reset"
            @click="resetSection(section.id)"
          >
            reset
          </button>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-px p-0 sm:grid-cols-2 admin-fields-grid">
        <div
          v-for="field in section.fields"
          :key="field.key"
          class="flex items-center justify-between gap-3 px-4 py-2 admin-field-row"
        >
          <label class="admin-field-name whitespace-nowrap min-w-[90px]">{{ field.label }}</label>
          <input
            v-if="field.type === 'number'"
            type="number"
            :min="field.min"
            :max="(field as any).max"
            :value="editingKey === field.key ? editingValue : getValue(field.key)"
            class="w-full max-w-[140px] admin-input admin-input--sm text-right"
            @focus="startEditing(field.key)"
            @input="editingValue = ($event.target as HTMLInputElement).value"
            @change="commitEdit(field.key)"
            @blur="commitEdit(field.key)"
          />
          <div v-else-if="field.type === 'range'" class="flex items-center flex-1 gap-2">
            <input
              type="range"
              :min="field.min"
              :max="(field as any).max"
              :value="getValue(field.key)"
              class="flex-1 admin-range cursor-pointer h-1.5"
              @input="setValue(field.key, ($event.target as HTMLInputElement).value)"
            />
            <span class="w-4 text-right admin-range-value">{{ getValue(field.key) }}</span>
          </div>
          <select
            v-else-if="field.type === 'select'"
            :value="getValue(field.key)"
            class="w-full max-w-[140px] admin-select"
            @change="setValue(field.key, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in (field as any).options" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
          <div v-else-if="field.type === 'checkbox'" class="flex items-center">
            <input
              type="checkbox"
              :checked="getValue(field.key) as boolean"
              class="w-4 h-4 cursor-pointer admin-checkbox"
              @change="setValue(field.key, ($event.target as HTMLInputElement).checked)"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-if="filteredSections.length === 0" class="py-8 text-sm text-center admin-empty-msg">
      No fields match "{{ search }}"
    </div>
  </div>
</template>

<style scoped>
/* ── Search bar ── */
.admin-search-bar {
  border-bottom: 1px solid var(--rpg-wood-mid);
}
.admin-search-input {
  background: var(--rpg-bg-deep);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  padding: 0.375rem 0.75rem;
  font-family: var(--rpg-font-mono);
  font-size: 0.875rem;
  color: var(--rpg-text);
  outline: none;
  transition: border-color 0.15s;
}
.admin-search-input::placeholder {
  color: var(--rpg-text-dim);
}
.admin-search-input:focus {
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 0 2px #2e2210;
}

/* ── Section containers ── */
.admin-section {
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
}

/* ── Section header ── */
.admin-section-header {
  border-bottom: 1px solid var(--rpg-wood-mid);
}
.admin-section-title {
  font-family: var(--rpg-font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── Section header accent colors ── */
.section-header--core { background: #1a1228; }
.section-header--battle { background: #121828; }
.section-header--materials { background: #0e1e1a; }
.section-header--buildings { background: #201810; }
.section-header--advanced { background: #201014; }

.section-label--core { color: #c4a0e8; }
.section-label--battle { color: #80b0e8; }
.section-label--materials { color: #60d0b0; }
.section-label--buildings { color: var(--rpg-gold-dim); }
.section-label--advanced { color: #e08070; }

/* ── Action buttons (reset) ── */
.admin-action-btn {
  font-family: var(--rpg-font-mono);
  font-size: 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--rpg-wood-mid);
  background: transparent;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
  color: var(--rpg-text-dim);
}
.admin-action-btn:hover {
  color: var(--rpg-text);
  border-color: var(--rpg-text-muted);
}

.section-reset--core { color: #a070d0; border-color: #30183c; }
.section-reset--core:hover { color: #c4a0e8; border-color: #5c3870; }
.section-reset--battle { color: #5080c0; border-color: #141e3c; }
.section-reset--battle:hover { color: #80b0e8; border-color: #304870; }
.section-reset--materials { color: #30a080; border-color: #10302a; }
.section-reset--materials:hover { color: #60d0b0; border-color: #285848; }
.section-reset--buildings { color: var(--rpg-wood-mid); border-color: #241608; }
.section-reset--buildings:hover { color: var(--rpg-gold-dim); border-color: #3c2810; }
.section-reset--advanced { color: #c05040; border-color: #381414; }
.section-reset--advanced:hover { color: #e08070; border-color: #5c2820; }

/* ── Field rows ── */
.admin-fields-grid {
  background: var(--rpg-border-row);
}
.admin-field-row {
  background: var(--rpg-bg-deep);
  transition: background 0.1s;
}
.admin-field-row:hover {
  background: var(--rpg-bg-row);
}
.admin-field-name {
  font-family: var(--rpg-font-mono);
  font-size: 0.75rem;
  color: var(--rpg-text-muted);
}

/* ── Inputs ── */
.admin-input {
  background: var(--rpg-bg-deep);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  padding: 0.375rem 0.625rem;
  font-family: var(--rpg-font-mono);
  font-size: 0.875rem;
  color: var(--rpg-text);
  outline: none;
  transition: border-color 0.15s;
}
.admin-input:focus {
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 0 2px #332810;
}
.admin-input--sm {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
}

/* ── Select ── */
.admin-select {
  background: var(--rpg-bg-deep);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  padding: 0.125rem 0.5rem;
  font-family: var(--rpg-font-mono);
  font-size: 0.75rem;
  color: var(--rpg-text);
  outline: none;
  transition: border-color 0.15s;
}
.admin-select:focus {
  border-color: var(--rpg-gold-dim);
}

/* ── Range ── */
.admin-range {
  accent-color: var(--rpg-gold);
}
.admin-range-value {
  font-family: var(--rpg-font-mono);
  font-size: 0.75rem;
  color: var(--rpg-gold);
}

/* ── Checkbox ── */
.admin-checkbox {
  accent-color: var(--rpg-gold);
}

/* ── Empty state ── */
.admin-empty-msg {
  font-family: var(--rpg-font-mono);
  color: var(--rpg-text-dim);
}
</style>
