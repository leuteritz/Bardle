<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useBattleStore } from '@/stores/battleStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { MATERIALS, pickMaterial } from '@/config/materials'
import { useNebulaTrigger } from '@/composables/useNebulaTrigger'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const planetBossStore = usePlanetBossStore()
const starGroupStore = useStarGroupStore()
const inventoryStore = useInventoryStore()
const galaxyStore = useGalaxyStore()
const { triggerNow: triggerNebula } = useNebulaTrigger()

// suppress unused warning – imported for fillAllMaterials
void inventoryStore

const editingKey = ref<string | null>(null)
const editingValue = ref<string>('')

const quickFields = [
  { key: 'chimes', label: 'Chimes' },
  { key: 'meeps', label: 'Meeps' },
  { key: 'level', label: 'Level' },
  { key: 'skillPoints', label: 'Skill Points' },
] as const

type QuickKey = (typeof quickFields)[number]['key']

function getValue(key: QuickKey): number {
  if (key === 'chimes') return gameStore.chimes
  if (key === 'meeps') return gameStore.meeps
  if (key === 'level') return gameStore.level
  return gameStore.skillPoints
}

function setValue(key: QuickKey, raw: string) {
  const num = parseFloat(raw)
  const int = parseInt(raw)
  if (key === 'chimes' && !isNaN(num)) gameStore.chimes = num
  else if (key === 'meeps' && !isNaN(int)) gameStore.meeps = int
  else if (key === 'level' && !isNaN(int)) gameStore.level = int
  else if (key === 'skillPoints' && !isNaN(int)) gameStore.skillPoints = int
}

function startEditing(key: QuickKey) {
  editingKey.value = `qa_${key}`
  editingValue.value = String(getValue(key))
}

function commitEdit(key: QuickKey) {
  setValue(key, editingValue.value)
  editingKey.value = null
}

// ── Star Spawn ────────────────────────────────────────────────────────────────

function spawnStar() {
  starGroupStore.spawnResourceStar()
}

function spawnPlanetWithMaterial() {
  // Force a resource star — after spawn, override last boss with material
  starGroupStore.spawnResourceStar()
  const lastBoss = planetBossStore.activeBosses[planetBossStore.activeBosses.length - 1]
  if (lastBoss) {
    lastBoss.potentialMaterialId = pickMaterial().id
    lastBoss.assignedDropChance = 1.0
  }
}

function spawnPlanetWithChampion() {
  starGroupStore.spawnChampionStar()
}

function spawnGalaxyBoss() {
  galaxyStore.pendingGalaxyBoss = true
  starGroupStore.spawnGalaxyBossStar()
}

function forceCompleteGalaxy() {
  galaxyStore.starsRescued = galaxyStore.starsRequired
  galaxyStore.galaxyBossDefeated = true
  galaxyStore.pendingGalaxyBoss = false
}

function forcePrestige() {
  gameStore.prestigeAvailable = true
}

function fillAllMaterials() {
  MATERIALS.forEach((m) => {
    inventoryStore.collectedMaterials[m.id] = 9999
  })
}

function teleportNearPlanet() {
  if (galaxyStore.championTravelState !== 'traveling') return
  galaxyStore.championTravelStartTime = Date.now() - (galaxyStore.championTravelDurationMs - 5000)
}
</script>

<template>
  <div class="px-5 py-3 admin-quick-actions">
    <div class="mb-2 admin-section-label">Quick Actions</div>

    <!-- Inline Editable Values -->
    <div class="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
      <div v-for="qf in quickFields" :key="qf.key" class="flex flex-col gap-0.5">
        <label class="admin-field-label">{{ qf.label }}</label>
        <input
          type="number"
          :min="qf.key === 'level' ? 1 : 0"
          :value="editingKey === `qa_${qf.key}` ? editingValue : getValue(qf.key)"
          class="text-right admin-input"
          @focus="startEditing(qf.key)"
          @input="editingValue = ($event.target as HTMLInputElement).value"
          @change="commitEdit(qf.key)"
          @blur="commitEdit(qf.key)"
        />
      </div>
    </div>

    <!-- Spawn / Action Buttons -->
    <div class="flex flex-wrap gap-2">
      <button
        class="admin-spawn-btn admin-spawn-btn--neutral flex items-center gap-1.5 px-3 py-1.5"
        @click="spawnStar"
      >
        <span>⭐</span> Spawn Star
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--material flex items-center gap-1.5 px-3 py-1.5"
        @click="spawnPlanetWithMaterial"
      >
        <span>💎</span> Spawn + Material
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--champion flex items-center gap-1.5 px-3 py-1.5"
        @click="spawnPlanetWithChampion"
      >
        <span>🏆</span> Spawn + Champion
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--material flex items-center gap-1.5 px-3 py-1.5"
        @click="fillAllMaterials"
      >
        <span>💎</span> +9999 all Materials
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--galaxy-boss flex items-center gap-1.5 px-3 py-1.5"
        @click="spawnGalaxyBoss"
      >
        <span>👾</span> Spawn Galaxy Boss
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--galaxy flex items-center gap-1.5 px-3 py-1.5"
        @click="forceCompleteGalaxy"
      >
        <span>🌌</span> Complete Galaxy
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--prestige flex items-center gap-1.5 px-3 py-1.5"
        @click="forcePrestige"
      >
        <span>⭐</span> Force Prestige
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--champion flex items-center gap-1.5 px-3 py-1.5"
        @click="battleStore.unlockAllChampions()"
      >
        <span>🏆</span> Unlock All Champions
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--nebula flex items-center gap-1.5 px-3 py-1.5"
        @click="triggerNebula()"
      >
        <span>🌌</span> Trigger Nebula
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--travel flex items-center gap-1.5 px-3 py-1.5"
        :disabled="galaxyStore.championTravelState !== 'traveling'"
        @click="teleportNearPlanet"
      >
        <span>⚡</span> Skip to -5s
      </button>
    </div>
  </div>
</template>

<style scoped>
.admin-quick-actions {
  background: var(--rpg-bg-dark);
  border-bottom: 1px solid var(--rpg-wood-mid);
}

.admin-section-label {
  font-family: var(--rpg-font-mono);
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--rpg-text-muted);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.admin-field-label {
  font-family: var(--rpg-font-mono);
  font-size: 0.625rem;
  color: var(--rpg-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

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

.admin-spawn-btn {
  font-family: var(--rpg-font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid var(--rpg-wood-mid);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.admin-spawn-btn--neutral {
  color: var(--rpg-text-muted);
  border-color: var(--rpg-btn-disabled-border);
}
.admin-spawn-btn--neutral:hover {
  background: #1e1c16;
  border-color: var(--rpg-text-muted);
  color: var(--rpg-text);
}
.admin-spawn-btn--material {
  color: var(--rpg-gold-dim);
  border-color: var(--rpg-wood-mid);
}
.admin-spawn-btn--material:hover {
  background: #1c1810;
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold);
}
.admin-spawn-btn--champion {
  color: var(--rpg-gold);
  border-color: var(--rpg-wood-mid);
}
.admin-spawn-btn--champion:hover {
  background: #1e1a10;
  border-color: var(--rpg-gold);
  color: var(--rpg-gold-bright);
}
.admin-spawn-btn--galaxy {
  color: #80c0e8;
  border-color: #1a2a3c;
}
.admin-spawn-btn--galaxy:hover {
  background: #101828;
  border-color: #4080b0;
  color: #a8d8f8;
}
.admin-spawn-btn--galaxy-boss {
  color: #d080ff;
  border-color: #3a1060;
}
.admin-spawn-btn--galaxy-boss:hover {
  background: #1a0830;
  border-color: #a040e0;
  color: #e8a0ff;
}
.admin-spawn-btn--prestige {
  background: linear-gradient(to bottom, #9060d0, #5030a0);
  border: 1px solid #b080e8;
  color: #e8d0ff;
}
.admin-spawn-btn--prestige:hover {
  background: linear-gradient(to bottom, #a070e0, #6040b0);
  border-color: #c898f0;
}
.admin-spawn-btn--nebula {
  color: #cc88ff;
  border-color: #3d1060;
  background: linear-gradient(to bottom, #1a0830, #0f0518);
}
.admin-spawn-btn--nebula:hover {
  background: linear-gradient(to bottom, #2a1048, #180828);
  border-color: #9944dd;
  color: #ee99ff;
}
.admin-spawn-btn--travel {
  color: #40d8c0;
  border-color: #0a3028;
  background: linear-gradient(to bottom, #0a1e1a, #061410);
}
.admin-spawn-btn--travel:hover:not(:disabled) {
  background: linear-gradient(to bottom, #102e28, #0a1c18);
  border-color: #20a888;
  color: #60f0d8;
}
.admin-spawn-btn--travel:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
