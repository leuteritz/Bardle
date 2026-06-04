<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useBattleStore } from '@/stores/battleStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { MATERIALS } from '@/config/materials'
import { useNebulaTrigger } from '@/composables/useNebulaTrigger'
import { CHAMPION_ROLES } from '@/config/championRoles'
import { usePlanetShopStore } from '@/stores/planetShopStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { useItemStore } from '@/stores/itemStore'
import { STAR_PHASE_DATA } from '@/config/constants'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import type { ChampionRole } from '@/types'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const planetShopStore = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()
const starGroupStore = useStarGroupStore()
const inventoryStore = useInventoryStore()
const galaxyStore = useGalaxyStore()
const { triggerNow: triggerNebula } = useNebulaTrigger()
const roleBehaviorStore = useRoleBehaviorStore()
const itemStore = useItemStore()

const editingKey = ref<string | null>(null)
const editingValue = ref<string>('')
const flashKey = ref<string | null>(null)

const quickFields = [
  { key: 'chimes', label: 'Chimes', icon: 'game-icons:bells', defaultStep: 100, min: 0, float: true },
  { key: 'meeps', label: 'Meeps', icon: 'game-icons:alien-egg', defaultStep: 1, min: 0, float: false },
  { key: 'level', label: 'Level', icon: 'game-icons:star-medal', defaultStep: 1, min: 1, float: false },
  { key: 'skillPoints', label: 'Skill Points', icon: 'game-icons:star-cycle', defaultStep: 1, min: 0, float: false },
] as const

type QuickKey = (typeof quickFields)[number]['key']

// Konfigurierbare Schrittweiten – pro Feld individuell
const steps = reactive<Record<QuickKey, number>>({
  chimes: 100,
  meeps: 1,
  level: 1,
  skillPoints: 1,
})

function getFieldMeta(key: QuickKey) {
  return quickFields.find((f) => f.key === key)!
}

function getValue(key: QuickKey): number {
  if (key === 'chimes') return gameStore.chimes
  if (key === 'meeps') return gameStore.meeps
  if (key === 'level') return gameStore.level
  return gameStore.skillPoints
}

function setValue(key: QuickKey, raw: string | number) {
  const meta = getFieldMeta(key)
  const parsed = meta.float ? parseFloat(String(raw)) : parseInt(String(raw))
  if (isNaN(parsed)) return
  const clamped = Math.max(meta.min, parsed)
  if (key === 'chimes') gameStore.chimes = clamped
  else if (key === 'meeps') gameStore.meeps = clamped
  else if (key === 'level') gameStore.level = clamped
  else if (key === 'skillPoints') gameStore.skillPoints = clamped
}

function startEditing(key: QuickKey) {
  editingKey.value = `qa_${key}`
  editingValue.value = String(getValue(key))
}

function commitEdit(key: QuickKey) {
  setValue(key, editingValue.value)
  editingKey.value = null
  triggerFlash(key)
}

function cancelEdit() {
  editingKey.value = null
}

function onKeydown(e: KeyboardEvent, key: QuickKey) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitEdit(key)
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}

function stepValue(key: QuickKey, direction: 1 | -1) {
  const meta = getFieldMeta(key)
  const current = getValue(key)
  const next = Math.max(meta.min, current + direction * steps[key])
  setValue(key, next)
  triggerFlash(key)
}

function onStepInput(key: QuickKey, raw: string) {
  const parsed = parseFloat(raw)
  if (!isNaN(parsed) && parsed > 0) steps[key] = parsed
}

function triggerFlash(key: string) {
  flashKey.value = key
  setTimeout(() => {
    flashKey.value = null
  }, 280)
}

// ── Star Spawn ────────────────────────────────────────────────────────────────

function spawnStar() {
  starGroupStore.forceSpawnResourceStar()
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

function fillTeamWithRandomChampions() {
  battleStore.unlockAllChampions()
  const roles: ChampionRole[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const used = new Set<string>()
  const pool = [...battleStore.ownedChampions]
    .filter((c) => c !== 'Bard')
    .sort(() => Math.random() - 0.5)

  battleStore.headerSlots.splice(0, 5, null, null, null, null, null)
  for (let r = 0; r < 5; r++) {
    battleStore.secondarySlots[r][0] = null
    battleStore.secondarySlots[r][1] = null
  }
  battleStore.syncTeam1ToSlots()

  roles.forEach((role, slotIndex) => {
    const roleMatch = pool.filter(
      (name) => !used.has(name) && (CHAMPION_ROLES[name] ?? []).includes(role),
    )
    const fallback = pool.filter((name) => !used.has(name))
    const pick =
      roleMatch.length > 0 ? roleMatch[Math.floor(Math.random() * roleMatch.length)] : fallback[0]
    if (!pick) return
    used.add(pick)
    battleStore.setHeaderSlot(slotIndex, pick)

    const secondaryPool = pool.filter(
      (name) => !used.has(name) && (CHAMPION_ROLES[name] ?? []).includes(role),
    )
    for (let subIndex = 0; subIndex < 2; subIndex++) {
      if (secondaryPool.length === 0) break
      const idx = Math.floor(Math.random() * secondaryPool.length)
      const secondary = secondaryPool.splice(idx, 1)[0]
      used.add(secondary)
      battleStore.setSecondarySlot(slotIndex, subIndex, secondary)
    }
  })

  planetShopStore.adminFillRandomRoles()
  itemStore.adminUnlockAllItems()
  itemStore.adminFillRandomEquipment()
}

function teleportNearPlanet() {
  if (galaxyStore.championTravelState !== 'traveling') return
  galaxyStore.championTravelStartTime = Date.now() - (galaxyStore.championTravelDurationMs - 5000)
}

function resetAllCooldowns() {
  roleBehaviorStore.supportHealCooldownMs = 0
  roleBehaviorStore.supportPlanetHealCooldownMs = 0
  roleBehaviorStore.tankShieldBrokenMs = 0
  roleBehaviorStore.midCurseCooldownMs = 0
  roleBehaviorStore.adcBurstCooldownMs = 0
  roleBehaviorStore.jungleBuffCooldownMs = 0
}

// ── Sun Phase Override (Debug) ─────────────────────────────────────────────────

function setStarPhase(phase: number) {
  const elapsed = Math.floor((Date.now() - solarStore.phaseEnteredAt) / 1000)
  solarStore.totalPhaseSeconds += elapsed
  solarStore.phaseTimeHistory[solarStore.starPhase] = (solarStore.phaseTimeHistory[solarStore.starPhase] ?? 0) + elapsed
  solarStore.starPhase = Math.max(0, Math.min(6, phase))
  solarStore.phaseEnteredAt = Date.now()
}
</script>

<template>
  <div class="px-5 py-3 admin-quick-actions">
    <div class="mb-2 admin-section-label">Quick Actions</div>

    <!-- Inline Editable Values + Stepper -->
    <div class="grid grid-cols-2 gap-x-3 gap-y-3 mb-3 sm:grid-cols-4">
      <div
        v-for="qf in quickFields"
        :key="qf.key"
        class="admin-field-col"
        :class="{ 'admin-field-col--flash': flashKey === qf.key }"
      >
        <!-- Label -->
        <label class="admin-field-label">
          <Icon v-if="qf.icon.includes(':')" :icon="qf.icon" class="admin-field-icon" />
          <span v-else>{{ qf.icon }}</span> {{ qf.label }}
        </label>

        <!-- Value Stepper -->
        <div class="admin-stepper">
          <button
            class="admin-stepper-btn"
            :disabled="getValue(qf.key) <= qf.min"
            tabindex="-1"
            @click="stepValue(qf.key, -1)"
          >
            −
          </button>
          <input
            type="number"
            :min="qf.min"
            :value="editingKey === `qa_${qf.key}` ? editingValue : getValue(qf.key)"
            class="admin-stepper-input"
            @focus="startEditing(qf.key)"
            @input="editingValue = ($event.target as HTMLInputElement).value"
            @blur="commitEdit(qf.key)"
            @keydown="onKeydown($event, qf.key)"
          />
          <button class="admin-stepper-btn" tabindex="-1" @click="stepValue(qf.key, 1)">+</button>
        </div>

        <!-- Step Size Config -->
        <div class="admin-step-config">
          <span class="admin-step-label">±</span>
          <input
            type="number"
            :min="qf.float ? 0.01 : 1"
            :step="qf.float ? 0.01 : 1"
            :value="steps[qf.key]"
            class="admin-step-input"
            @change="onStepInput(qf.key, ($event.target as HTMLInputElement).value)"
            @blur="onStepInput(qf.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <!-- Spawn / Action Buttons -->
    <div class="flex flex-wrap gap-2">
      <button
        class="admin-spawn-btn admin-spawn-btn--neutral flex items-center gap-1.5 px-3 py-1.5"
        @click="spawnStar"
      >
        <img src="/img/star.png" alt="★" class="star-icon"> Spawn Star
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--material flex items-center gap-1.5 px-3 py-1.5"
        @click="fillAllMaterials"
      >
        <Icon icon="game-icons:diamond-hard" class="admin-btn-icon" /> +9999 all Materials
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--galaxy-boss flex items-center gap-1.5 px-3 py-1.5"
        @click="spawnGalaxyBoss"
      >
        <Icon icon="game-icons:alien-bug" class="admin-btn-icon" /> Spawn Galaxy Boss
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--galaxy flex items-center gap-1.5 px-3 py-1.5"
        @click="forceCompleteGalaxy"
      >
        <Icon icon="game-icons:galaxy" class="admin-btn-icon" /> Complete Galaxy
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--prestige flex items-center gap-1.5 px-3 py-1.5"
        @click="forcePrestige"
      >
        <img src="/img/star.png" alt="★" class="star-icon"> Force Prestige
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--champion flex items-center gap-1.5 px-3 py-1.5"
        @click="battleStore.unlockAllChampions()"
      >
        <Icon icon="game-icons:laurel-crown" class="admin-btn-icon" /> Unlock All Champions
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--nebula flex items-center gap-1.5 px-3 py-1.5"
        @click="triggerNebula()"
      >
        <Icon icon="game-icons:nebula" class="admin-btn-icon" /> Trigger Nebula
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--team-fill flex items-center gap-1.5 px-3 py-1.5"
        @click="fillTeamWithRandomChampions"
      >
        <Icon icon="game-icons:dice-six-faces-random" class="admin-btn-icon" /> Random Team Fill
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--travel flex items-center gap-1.5 px-3 py-1.5"
        :disabled="galaxyStore.championTravelState !== 'traveling'"
        @click="teleportNearPlanet"
      >
        <Icon icon="game-icons:lightning-bolt" class="admin-btn-icon" /> Skip to -5s
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--cooldown flex items-center gap-1.5 px-3 py-1.5"
        @click="resetAllCooldowns"
      >
        <Icon icon="game-icons:time-trap" class="admin-btn-icon" /> Reset Cooldowns
      </button>
    </div>

    <!-- Star Phase Override -->
    <div class="sun-sim mt-3">
      <div class="admin-section-label mb-2">
        ✦ Star Phase Override
        <span class="sun-sim-current-phase">
          (Current: Phase {{ solarStore.starPhase }} — {{ STAR_PHASE_DATA[solarStore.starPhase].name }})
        </span>
      </div>
      <div class="star-phase-btns">
        <button
          v-for="(phase, idx) in STAR_PHASE_DATA"
          :key="idx"
          class="star-phase-btn"
          :class="{ 'star-phase-btn--active': solarStore.starPhase === idx }"
          :style="{ '--phase-color': phase.phasePrimary }"
          @click="setStarPhase(idx)"
        >
          <span class="phase-btn-num">{{ idx }}</span>
          <span class="phase-btn-name">{{ phase.name }}</span>
        </button>
      </div>
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

/* ── Field Column ─────────────────────────────────────────────────────────────── */

.admin-field-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: opacity 0.15s;
}

@keyframes admin-flash {
  0% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
.admin-field-col--flash {
  animation: admin-flash 0.28s ease-out forwards;
}

/* ── Label ───────────────────────────────────────────────────────────────────── */

.admin-field-icon {
  width: 0.75rem;
  height: 0.75rem;
  color: #c89040;
}
.admin-btn-icon {
  width: 1rem;
  height: 1rem;
  color: #c89040;
}
.admin-field-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--rpg-font-mono);
  font-size: 0.625rem;
  color: var(--rpg-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  user-select: none;
}

/* ── Value Stepper ───────────────────────────────────────────────────────────── */

.admin-stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  overflow: hidden;
}

.admin-stepper:focus-within {
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 0 2px #332810;
}

.admin-stepper-btn {
  flex: 0 0 1.625rem;
  height: 1.875rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--rpg-font-mono);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--rpg-text-muted);
  line-height: 1;
  transition:
    background 0.12s,
    color 0.12s;
  user-select: none;
}
.admin-stepper-btn:first-child {
  border-right: 1px solid var(--rpg-wood-mid);
}
.admin-stepper-btn:last-child {
  border-left: 1px solid var(--rpg-wood-mid);
}
.admin-stepper-btn:hover:not(:disabled) {
  background: #1e1a0e;
  color: var(--rpg-gold);
}
.admin-stepper-btn:active:not(:disabled) {
  background: #2a2410;
}
.admin-stepper-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.admin-stepper-input {
  flex: 1;
  min-width: 0;
  height: 1.875rem;
  background: var(--rpg-bg-deep);
  border: none;
  outline: none;
  padding: 0 0.25rem;
  font-family: var(--rpg-font-mono);
  font-size: 0.875rem;
  color: var(--rpg-text);
  text-align: center;
}
.admin-stepper-input::-webkit-inner-spin-button,
.admin-stepper-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.admin-stepper-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* ── Step Size Config ────────────────────────────────────────────────────────── */

.admin-step-config {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.admin-step-label {
  font-family: var(--rpg-font-mono);
  font-size: 0.625rem;
  color: var(--rpg-text-muted);
  user-select: none;
  flex-shrink: 0;
}

.admin-step-input {
  flex: 1;
  min-width: 0;
  height: 1.375rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--rpg-wood-mid) 60%, transparent);
  border-radius: 3px;
  outline: none;
  padding: 0 0.3rem;
  font-family: var(--rpg-font-mono);
  font-size: 0.6875rem;
  color: var(--rpg-text-muted);
  text-align: right;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.admin-step-input:focus {
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-text);
}
.admin-step-input::-webkit-inner-spin-button,
.admin-step-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.admin-step-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* ── Spawn Buttons ───────────────────────────────────────────────────────────── */

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
.admin-spawn-btn--team-fill {
  color: #60d8a0;
  border-color: #0a3020;
  background: linear-gradient(to bottom, #0a1e16, #061410);
}
.admin-spawn-btn--team-fill:hover {
  background: linear-gradient(to bottom, #102e22, #0a1c18);
  border-color: #20a870;
  color: #80f0c0;
}
.admin-spawn-btn--travel:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.admin-spawn-btn--cooldown {
  color: #60c8e8;
  border-color: #1a4a5a;
}
.admin-spawn-btn--cooldown:hover {
  background: #0d2a35;
  border-color: #60c8e8;
  color: #a0e8f8;
}

/* ── Sun Simulator ───────────────────────────────────────────────────────────── */

.sun-sim {
  border: 1px solid #5c3310;
  border-radius: 4px;
  background: #1a1208;
  padding: 0.5rem 0.75rem;
}

.sun-sim-current-phase {
  color: var(--rpg-text-dim);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  margin-left: 4px;
}

.star-phase-btns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 4px;
}

.star-phase-btn {
  padding: 10px 6px 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
  border: 2px solid #3e200a;
  background: #111008;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.15s;
}

.phase-btn-num {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  color: inherit;
}

.phase-btn-name {
  font-size: 8px;
  font-weight: 700;
  opacity: 0.75;
  text-align: center;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: inherit;
}

.star-phase-btn:hover {
  border-color: var(--phase-color);
  color: var(--phase-color);
  box-shadow: 0 0 8px color-mix(in srgb, var(--phase-color) 40%, transparent);
}

.star-phase-btn--active {
  background: color-mix(in srgb, var(--phase-color) 14%, #111008);
  border-color: var(--phase-color);
  color: var(--phase-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--phase-color) 55%, transparent);
}
</style>
