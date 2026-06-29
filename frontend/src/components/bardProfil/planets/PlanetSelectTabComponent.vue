<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/uiStore'
import {
  usePlanetShopStore,
  PLANET_ROLES_LIST,
  PLANET_ROLES,
  planetLevelBonusMultiplier,
  planetMilestoneCount,
  planetRankTier,
  computePlanetMaxHp,
} from '@/stores/planetShopStore'
import type { PlanetRole, PlanetRoleType } from '@/stores/planetShopStore'
import { MATERIALS } from '@/config/materials'
import { PLANET_MILESTONE_INTERVAL, PLANET_MILESTONE_BONUS, PLANET_BULK_LEVEL_STEP } from '@/config/constants'
import { useActionToast } from '@/composables/useActionToast'

const CPS_BUILDINGS = [
  { id: 'glockenturm', name: 'Bell Tower', icon: '/img/Glockenturm.png' },
  { id: 'klanggenerator', name: 'Sound Generator', icon: '/img/KlangGenerator.png' },
  { id: 'harmoniewerk', name: 'Harmony Works', icon: '/img/HarmonieWerk.png' },
  { id: 'sphaerenMusik', name: 'Sphere Music', icon: '/img/SphaerenMusik.png' },
  { id: 'zeitEcho', name: 'Time Echo', icon: '/img/ZeitEcho.png' },
]

const uiStore = useUiStore()
const store = usePlanetShopStore()
const { showToast } = useActionToast()

const selectedSlotId = ref<string | null>(null)

function initSlot() {
  selectedSlotId.value =
    uiStore.planetActiveSlotId ??
    store.slots.find((s) => s.purchased)?.id ??
    store.slots[0]?.id ??
    null
}

onMounted(initSlot)

watch(
  () => uiStore.planetActiveSlotId,
  (id) => {
    if (id) selectedSlotId.value = id
  },
)

function selectSlot(id: string) {
  selectedSlotId.value = id
}

const activeSlot = computed(() => {
  if (!selectedSlotId.value) return null
  return store.slots.find((s) => s.id === selectedSlotId.value) ?? null
})

const activeSlotIndex = computed(() =>
  store.slots.findIndex((s) => s.id === selectedSlotId.value),
)

// Permanent planet choice: clicking a role arms a confirm step before it locks.
const pendingRoleId = ref<PlanetRoleType | null>(null)

function pickRole(roleId: PlanetRoleType) {
  pendingRoleId.value = pendingRoleId.value === roleId ? null : roleId
}
function cancelRole() {
  pendingRoleId.value = null
}
function confirmRole() {
  if (!activeSlot.value || !pendingRoleId.value) return
  const roleId = pendingRoleId.value
  store.assignRole(activeSlot.value.id, roleId)
  pendingRoleId.value = null
  const roleName = PLANET_ROLES[roleId]?.name ?? roleId
  showToast(`${roleName} locked in — this choice is permanent!`)
}

const pendingRole = computed(() =>
  pendingRoleId.value ? PLANET_ROLES[pendingRoleId.value] : null,
)

// Reset any armed role selection when switching slots.
watch(selectedSlotId, () => {
  pendingRoleId.value = null
})

function buySlot(slotId: string) {
  store.buySlot(slotId)
  showToast('Planet orbit slot unlocked!')
}

const activeImage = computed(() => {
  const role = activeSlot.value?.role
  return role ? PLANET_ROLES[role].image : '/img/planets/planet1.png'
})

const activeRoleName = computed(() => {
  const role = activeSlot.value?.role
  return role ? PLANET_ROLES[role].name : '—'
})

const activeRoleColor = computed(() => {
  const role = activeSlot.value?.role
  return role ? PLANET_ROLES[role].color : '#aaaaaa'
})

const hpPercent = computed(() => {
  if (!activeSlot.value || activeSlot.value.maxHp === 0) return 100
  return Math.max(0, Math.min(100, (activeSlot.value.currentHp / activeSlot.value.maxHp) * 100))
})

const now = ref(Date.now())
let nowInterval = 0
onMounted(() => {
  nowInterval = window.setInterval(() => {
    now.value = Date.now()
  }, 500)
})
onUnmounted(() => {
  window.clearInterval(nowInterval)
})

const jungleBuffSecsLeft = computed(() => {
  const jb = activeSlot.value?.jungleBuff
  if (!jb?.active) return 0
  return Math.max(0, Math.ceil((jb.activeUntil - now.value) / 1000))
})

// Hero-Planet + Rollen-Grid: alle 6 Rollen in einem einheitlichen, scanbaren
// Grid statt 3-links/3-rechts-Split (bessere Scannbarkeit, geringere kognitive Last).
const roles = PLANET_ROLES_LIST

// Format a raw bonus value: integers stay clean, otherwise one decimal.
function fmtBonus(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

// Role grid shows the base (level 1) bonus; the level block passes the slot
// level so the active planet's actual current bonus is reflected.
function bonusText(role: PlanetRole, level = 1): string {
  const v = role.bonusPerSlot * planetLevelBonusMultiplier(level)
  switch (role.bonusType) {
    case 'auto_attack_dps':
      return `+${fmtBonus(v)} DPS/s on Boss`
    case 'material_harvest_rate':
      return `1 Material every 30s`
    case 'expedition_reward_multiplier':
      return `+${Math.round(v * 100)}% Exp. Reward`
    case 'boss_damage_reduction':
      return `-${Math.round(v * 100)}% Boss Damage`
    case 'offline_boost':
      return `+${Math.round(v * 100)}% Offline Yield`
    case 'building_cps_multiplier':
      return `+${Math.round(v * 100)}% Building CPS`
  }
}

// ── Attunement (per-planet leveling) ──────────────────────────────────────
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
function attunementLabel(level: number): string {
  return level <= ROMAN.length ? ROMAN[level - 1] : String(level)
}

const levelUpCost = computed(() =>
  activeSlot.value ? store.getPlanetLevelUpCost(activeSlot.value.id) : 0,
)
const levelUpReqPhase = computed(() =>
  activeSlot.value ? store.getPlanetLevelRequiredPhase(activeSlot.value.id) : 0,
)
const levelUpReason = computed(() =>
  activeSlot.value ? store.planetLevelUpBlockReason(activeSlot.value.id) : null,
)
const canLevelUp = computed(() => levelUpReason.value === null)

const activeSlotBonusText = computed(() => {
  const role = activeSlot.value?.role
  if (!role) return ''
  return bonusText(PLANET_ROLES[role], activeSlot.value!.level)
})

// ── Rank tier ──────────────────────────────────────────────────────────────
const rankTier = computed(() => planetRankTier(activeSlot.value?.level ?? 1))

// ── Next-level preview ─────────────────────────────────────────────────────
const nextBonusText = computed(() => {
  const role = activeSlot.value?.role
  if (!role) return ''
  return bonusText(PLANET_ROLES[role], (activeSlot.value!.level ?? 1) + 1)
})
const currentMaxHp = computed(() => computePlanetMaxHp(activeSlot.value?.level ?? 1))
const nextMaxHp = computed(() => computePlanetMaxHp((activeSlot.value?.level ?? 1) + 1))

// ── Milestone tracker ──────────────────────────────────────────────────────
const milestoneInterval = PLANET_MILESTONE_INTERVAL
const milestoneBonusPct = Math.round(PLANET_MILESTONE_BONUS * 100)
const levelsToNextMilestone = computed(() => {
  const lvl = activeSlot.value?.level ?? 1
  return milestoneInterval - (lvl % milestoneInterval)
})
const nextMilestoneLevel = computed(() => (activeSlot.value?.level ?? 1) + levelsToNextMilestone.value)
const milestonesReached = computed(() => planetMilestoneCount(activeSlot.value?.level ?? 1))
// Progress (0–100%) through the current milestone band.
const milestoneProgressPct = computed(() => {
  const lvl = activeSlot.value?.level ?? 1
  return ((lvl % milestoneInterval) / milestoneInterval) * 100
})

// ── Bulk attune ────────────────────────────────────────────────────────────
const maxAffordableCount = computed(() =>
  activeSlot.value ? store.getMaxAffordableLevelCount(activeSlot.value.id) : 0,
)
const bulkStep = PLANET_BULK_LEVEL_STEP
const bulkStepCost = computed(() =>
  activeSlot.value ? store.getBulkLevelUpCost(activeSlot.value.id, bulkStep) : 0,
)
const maxCost = computed(() =>
  activeSlot.value ? store.getBulkLevelUpCost(activeSlot.value.id, maxAffordableCount.value) : 0,
)

function attune(count: number) {
  if (!activeSlot.value) return
  const before = activeSlot.value.level
  const gained = store.levelUpPlanetTimes(activeSlot.value.id, count)
  if (gained > 0) {
    showToast(
      gained === 1
        ? `Planet attuned to Attunement ${attunementLabel(activeSlot.value.level)}!`
        : `Attuned +${gained} → Attunement ${attunementLabel(activeSlot.value.level)} (was ${attunementLabel(before)})`,
    )
  }
}
</script>

<template>
  <div class="ps-tab">
    <!-- Full-height split: left rail (6 slots) + right detail panel.
         No in-tab header — Chimes/CPS live permanently in the global app header. -->
    <div class="ps-split">
      <!-- LEFT RAIL ───────────────────────────────────────────────── -->
      <div class="ps-rail">
        <button
          v-for="(slot, slotIndex) in store.slots"
          :key="slot.id"
          class="ps-slot-btn"
          :class="{
            'ps-slot-btn--active': selectedSlotId === slot.id,
            'ps-slot-btn--affordable': !slot.purchased && store.canUnlockPlanetSlot(slotIndex),
            'ps-slot-btn--cant-afford': !slot.purchased && !store.canUnlockPlanetSlot(slotIndex),
          }"
          :style="slot.role ? { '--rc': PLANET_ROLES[slot.role].color } : {}"
          @click="selectSlot(slot.id)"
        >
          <div class="ps-slot-icon">
            <template v-if="!slot.purchased">
              <span class="ps-slot-btn-lock">
                <img src="/img/lock.png" alt="Locked" class="lock-icon" />
              </span>
            </template>
            <template v-else>
              <img
                v-if="slot.role"
                :src="PLANET_ROLES[slot.role].image"
                class="ps-slot-btn-img"
                alt=""
              />
              <span v-else class="ps-slot-btn-placeholder">＋</span>
            </template>
          </div>

          <div class="ps-slot-info">
            <span class="ps-slot-btn-label">Orbit {{ slot.id.replace('slot_', '') }}</span>
            <template v-if="!slot.purchased">
              <span class="ps-slot-phase-badge">
                <Icon icon="game-icons:sun" width="9" height="9" />
                Phase {{ store.getSlotRequiredPhase(slotIndex) }}
              </span>
            </template>
            <template v-else>
              <span
                class="ps-slot-sub"
                :style="slot.role ? { color: PLANET_ROLES[slot.role].color } : {}"
              >
                {{ slot.role ? PLANET_ROLES[slot.role].name : 'No role' }}
                <span class="ps-slot-sub-att">· Att {{ attunementLabel(slot.level) }}</span>
              </span>
              <div v-if="slot.maxHp > 0" class="ps-slot-btn-hp-track">
                <div
                  class="ps-slot-btn-hp-fill"
                  :style="{ width: Math.max(0, Math.min(100, (slot.currentHp / slot.maxHp) * 100)) + '%' }"
                />
              </div>
            </template>
          </div>
        </button>

        <!-- Sun Phase indicator (phase gates unlocking + attuning; not shown globally) -->
        <div class="ps-rail-phase">
          <Icon icon="game-icons:sun" width="18" height="18" class="ps-rail-phase-icon" />
          <span class="ps-rail-phase-text">Sun Phase {{ store.currentSunStage }}</span>
        </div>
      </div>

      <!-- RIGHT DETAIL ─────────────────────────────────────────────── -->
      <div class="ps-detail">
        <!-- Locked slot -->
        <div v-if="activeSlot && !activeSlot.purchased" class="ps-locked-panel">
          <span class="ps-locked-panel-icon">
            <img src="/img/lock.png" alt="Locked" class="lock-icon" />
          </span>
          <span class="ps-locked-panel-title">
            Orbit {{ activeSlot.id.replace('slot_', '') }} · Locked
          </span>
          <div class="ps-locked-panel-cost-row">
            <img src="/img/BardAbilities/BardChime.png" class="ps-locked-panel-chime" alt="" />
            <span class="ps-locked-panel-cost">{{ $formatNumber(store.getSlotCost(activeSlot.id)) }}</span>
          </div>
          <span class="ps-locked-panel-cost-label">C H I M E S</span>
          <div class="ps-locked-panel-divider" />
          <div
            class="ps-locked-panel-sun-req"
            :class="{ 'ps-locked-panel-sun-req--met': store.currentSunStage >= store.getSlotRequiredPhase(activeSlotIndex) }"
          >
            <Icon icon="game-icons:sun" width="16" height="16" class="ps-sun-req-icon" />
            <span class="ps-sun-req-label">Phase {{ store.getSlotRequiredPhase(activeSlotIndex) }}</span>
            <span class="ps-sun-req-sep">·</span>
            <span class="ps-sun-req-current">Current {{ store.currentSunStage }}</span>
          </div>
          <button
            v-if="store.canUnlockPlanetSlot(activeSlotIndex)"
            class="ps-locked-panel-buy-btn"
            @click="buySlot(activeSlot.id)"
          >
            ✦ Unlock
          </button>
          <span v-else-if="store.currentSunStage < store.getSlotRequiredPhase(activeSlotIndex)" class="ps-locked-panel-hint">
            Reach Sun Phase {{ store.getSlotRequiredPhase(activeSlotIndex) }} to unlock
          </span>
          <span v-else class="ps-locked-panel-hint">Not enough Chimes yet</span>
        </div>

        <!-- Purchased, no role yet: one-time permanent planet choice -->
        <div v-else-if="activeSlot && activeSlot.purchased && !activeSlot.role" class="ps-choose">
          <div class="ps-choose-head">
            <span class="ps-choose-title">Choose this planet's calling</span>
            <span class="ps-choose-warn">Permanent — this cannot be changed later</span>
          </div>
          <div class="ps-role-grid ps-role-grid--choose">
            <button
              v-for="role in roles"
              :key="role.id"
              class="ps-role-option"
              :class="{ 'ps-role-option--selected': pendingRoleId === role.id }"
              :style="{ '--rc': role.color }"
              @click="pickRole(role.id)"
            >
              <img v-if="role.icon.startsWith('/')" class="ps-role-icon" :src="role.icon" :alt="role.name" />
              <Icon v-else-if="role.icon.includes(':')" :icon="role.icon" class="ps-role-icon ps-role-icon--gi" />
              <span v-else class="ps-role-icon">{{ role.icon }}</span>
              <span class="ps-role-name">{{ role.name }}</span>
              <div class="ps-role-divider" />
              <span class="ps-role-effect">{{ bonusText(role) }}</span>
              <div v-if="pendingRoleId === role.id" class="ps-role-badge">Selected</div>
            </button>
          </div>
          <Transition name="ps-config-slide">
            <div v-if="pendingRole" class="ps-confirm-bar" :style="{ '--rc': pendingRole.color }">
              <span class="ps-confirm-text">
                Lock in <b :style="{ color: pendingRole.color }">{{ pendingRole.name }}</b> for this orbit?
                This choice is <b>permanent</b>.
              </span>
              <div class="ps-confirm-actions">
                <button class="ps-confirm-cancel" @click="cancelRole">Cancel</button>
                <button class="ps-confirm-ok" @click="confirmRole">✦ Lock In</button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Purchased + role locked: Attunement panel -->
        <template v-else-if="activeSlot && activeSlot.purchased && activeSlot.role">
          <div class="ps-body">
            <!-- Hero: Planet showcase -->
            <div class="ps-hero">
              <div v-if="activeSlot.maxHp > 0" class="ps-planet-hp">
                <div class="ps-planet-hp-text">
                  <Icon icon="game-icons:heart-bottle" width="18" height="18" class="ps-hp-heart" style="color: #cc6050" />
                  <span class="ps-hp-values">{{ activeSlot.currentHp }} / {{ activeSlot.maxHp }}</span>
                </div>
                <div class="ps-hp-bar-track">
                  <div class="ps-hp-bar-fill" :style="{ width: hpPercent + '%' }" />
                </div>
              </div>

              <div class="ps-planet-preview-wrap">
                <Transition name="ps-planet-swap" mode="out-in">
                  <img
                    :key="activeImage"
                    :src="activeImage"
                    class="ps-planet-preview-img"
                    alt="Planet"
                  />
                </Transition>
              </div>

              <div class="ps-planet-role-label" :style="{ color: activeRoleColor }">
                {{ activeRoleName }}
              </div>

              <Transition name="ps-config-slide">
                <div v-if="activeSlot.jungleBuff?.active" class="ps-jungle-buff-panel">
                  <div class="ps-jungle-buff-header">
                    <img class="ps-jungle-buff-leaf" src="/img/roles/jungle.png" alt="Jungle" />
                    <span class="ps-jungle-buff-title">Jungle Buff</span>
                    <span class="ps-jungle-buff-timer">{{ jungleBuffSecsLeft }}s</span>
                  </div>
                  <div class="ps-jungle-buff-row">
                    <span class="ps-jungle-buff-name">{{ activeSlot.jungleBuff.buffType }}</span>
                  </div>
                  <div class="ps-jungle-buff-row">
                    <span class="ps-jungle-buff-label">Multiplier</span>
                    <span class="ps-jungle-buff-value">×{{ activeSlot.jungleBuff.multiplier }}</span>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Attunement panel: rank, preview, milestone, bulk attune -->
            <div class="ps-level-block" :style="{ '--rc': activeRoleColor }">
              <div class="ps-level-info">
                <span class="ps-level-title">Attunement {{ attunementLabel(activeSlot.level) }}</span>
                <span
                  class="ps-rank-badge"
                  :style="{ color: rankTier.color, borderColor: rankTier.color }"
                >
                  {{ rankTier.name }}
                </span>
              </div>

              <!-- Next-level preview -->
              <div class="ps-preview">
                <div class="ps-preview-row">
                  <span class="ps-preview-label">Effect</span>
                  <span class="ps-preview-now">{{ activeSlotBonusText }}</span>
                  <span class="ps-preview-arrow">→</span>
                  <span class="ps-preview-next">{{ nextBonusText }}</span>
                </div>
                <div class="ps-preview-row">
                  <span class="ps-preview-label">Max HP</span>
                  <span class="ps-preview-now">{{ currentMaxHp }}</span>
                  <span class="ps-preview-arrow">→</span>
                  <span class="ps-preview-next">{{ nextMaxHp }}</span>
                </div>
              </div>

              <!-- Milestone tracker -->
              <div class="ps-milestone">
                <div class="ps-milestone-head">
                  <span class="ps-milestone-count">★ {{ milestonesReached }} milestone<span v-if="milestonesReached !== 1">s</span></span>
                  <span class="ps-milestone-next">
                    Next at {{ attunementLabel(nextMilestoneLevel) }} · +{{ milestoneBonusPct }}% power
                  </span>
                </div>
                <div class="ps-milestone-track">
                  <div class="ps-milestone-fill" :style="{ width: milestoneProgressPct + '%' }" />
                </div>
              </div>

              <!-- Bulk attune buttons -->
              <div class="ps-attune-row">
                <button
                  class="ps-level-btn"
                  :class="{ 'ps-level-btn--locked': !canLevelUp }"
                  :disabled="!canLevelUp"
                  :title="canLevelUp ? 'Attune once' : (levelUpReason === 'phase' ? `Requires Sun Phase ${levelUpReqPhase}` : 'Not enough Chimes')"
                  @click="attune(1)"
                >
                  <span class="ps-level-btn-main">✦ Attune</span>
                  <span class="ps-level-btn-cost">
                    <img src="/img/BardAbilities/BardChime.png" class="ps-level-chime" alt="" />
                    {{ $formatNumber(levelUpCost) }}
                  </span>
                </button>
                <button
                  class="ps-level-btn ps-level-btn--alt"
                  :class="{ 'ps-level-btn--locked': !canLevelUp }"
                  :disabled="!canLevelUp"
                  title="Attune up to ten times"
                  @click="attune(bulkStep)"
                >
                  <span class="ps-level-btn-main">×{{ bulkStep }}</span>
                  <span class="ps-level-btn-cost">
                    <img src="/img/BardAbilities/BardChime.png" class="ps-level-chime" alt="" />
                    {{ $formatNumber(bulkStepCost) }}
                  </span>
                </button>
                <button
                  class="ps-level-btn ps-level-btn--alt"
                  :class="{ 'ps-level-btn--locked': maxAffordableCount === 0 }"
                  :disabled="maxAffordableCount === 0"
                  title="Attune as much as you can afford"
                  @click="attune(maxAffordableCount)"
                >
                  <span class="ps-level-btn-main">Max +{{ maxAffordableCount }}</span>
                  <span class="ps-level-btn-cost">
                    <img src="/img/BardAbilities/BardChime.png" class="ps-level-chime" alt="" />
                    {{ $formatNumber(maxCost) }}
                  </span>
                </button>
              </div>

              <!-- Phase gate + block hint -->
              <div class="ps-level-gate">
                <Icon icon="game-icons:sun" width="12" height="12" />
                Next tier needs Sun Phase {{ levelUpReqPhase }} · current {{ store.currentSunStage }}
              </div>
              <span v-if="levelUpReason === 'chimes'" class="ps-level-hint">Not enough Chimes</span>
              <span v-else-if="levelUpReason === 'phase'" class="ps-level-hint">
                Reach Sun Phase {{ levelUpReqPhase }} to keep attuning
              </span>
            </div>
          </div>

          <!-- Config: harvest_node -->
          <Transition name="ps-config-slide">
            <div v-if="activeSlot.role === 'harvest_node'" class="ps-config-section">
              <div class="ps-config-header">
                <Icon icon="game-icons:wheat" class="ps-config-header-icon ps-config-header-icon--gi" />
                <span>Select Material</span>
                <span class="ps-config-header-hint">Choose the material to harvest</span>
              </div>
              <div class="ps-config-grid">
                <button
                  v-for="mat in MATERIALS"
                  :key="mat.id"
                  class="ps-config-btn"
                  :class="{ 'ps-config-btn--active': activeSlot.slotConfig?.materialId === mat.id }"
                  @click="store.setSlotConfig(activeSlot.id, { materialId: mat.id })"
                >
                  <div class="ps-config-btn-img-wrap">
                    <img v-if="mat.image" :src="mat.image" class="ps-config-btn-img" alt="" />
                    <div v-else class="ps-config-btn-img-placeholder">?</div>
                  </div>
                  <span class="ps-config-btn-label">{{ mat.name }}</span>
                  <div v-if="activeSlot.slotConfig?.materialId === mat.id" class="ps-config-btn-check">✓</div>
                </button>
              </div>
            </div>
          </Transition>

          <!-- Config: resonance_tower -->
          <Transition name="ps-config-slide">
            <div v-if="activeSlot.role === 'resonance_tower'" class="ps-config-section">
              <div class="ps-config-header">
                <Icon icon="game-icons:brick-wall" width="20" height="20" class="ps-config-header-icon" style="color: #e8c040" />
                <span>Select Building</span>
                <span class="ps-config-header-hint">Which building should be boosted?</span>
              </div>
              <div class="ps-config-grid">
                <button
                  v-for="bld in CPS_BUILDINGS"
                  :key="bld.id"
                  class="ps-config-btn"
                  :class="{ 'ps-config-btn--active': activeSlot.slotConfig?.buildingId === bld.id }"
                  @click="store.setSlotConfig(activeSlot.id, { buildingId: bld.id })"
                >
                  <div class="ps-config-btn-img-wrap">
                    <img v-if="bld.icon" :src="bld.icon" class="ps-config-btn-img" alt="" />
                    <Icon v-else icon="game-icons:brick-wall" width="24" height="24" class="ps-config-btn-img-placeholder" style="color: #7a4e20" />
                  </div>
                  <span class="ps-config-btn-label">{{ bld.name }}</span>
                  <div v-if="activeSlot.slotConfig?.buildingId === bld.id" class="ps-config-btn-check">✓</div>
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────────── */
.ps-tab {
  height: 100%;
  overflow: hidden;
  background: #111008;
  display: flex;
  flex-direction: column;
}

/* ── Split layout (full height, no header) ─────────────────────────────────── */
.ps-split {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Left rail: 6 slots filling the full column height */
.ps-rail {
  flex-shrink: 0;
  width: 210px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: #16120a;
  border-right: 3px solid #5c3310;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* Sun Phase chip pinned to rail bottom */
.ps-rail-phase {
  flex-shrink: 0;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: #141008;
  border: 1px solid #3a2a10;
  border-radius: 4px;
  color: #e0a040;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.ps-rail-phase-icon {
  filter: drop-shadow(0 0 5px rgba(224, 160, 64, 0.6));
}

/* Right detail panel */
.ps-detail {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.ps-rail::-webkit-scrollbar,
.ps-detail::-webkit-scrollbar {
  width: 6px;
}
.ps-rail::-webkit-scrollbar-track,
.ps-detail::-webkit-scrollbar-track {
  background: #111;
}
.ps-rail::-webkit-scrollbar-thumb,
.ps-detail::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 3px;
}

/* ── Leerstate ─────────────────────────────────────────────────────────────── */
.ps-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex: 1;
  min-height: 300px;
}

.ps-empty--small {
  min-height: 80px;
  padding: 1rem;
  flex: unset;
}

.ps-empty-icon {
  font-size: 3rem;
  opacity: 0.3;
  filter: grayscale(55%);
}

.ps-empty-text {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
  max-width: 280px;
}

/* ── Goldlinie ─────────────────────────────────────────────────────────────── */
.ps-goldline {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(
    to right,
    transparent,
    #5c3310 8%,
    #c89040 25%,
    #f0d060 50%,
    #c89040 75%,
    #5c3310 92%,
    transparent
  );
}

.ps-goldline--bottom {
  margin-top: auto;
  padding-top: 0.25rem;
}

/* ── Slot rail buttons (horizontal cards, fill full height) ─────────────────── */
.ps-slot-btn {
  position: relative;
  display: flex;
  flex: 1 1 0;
  min-height: 64px;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  min-width: 0;
  text-align: left;
  background: #131210;
  border: 1px solid #2e1e0a;
  border-radius: var(--bp-radius);
  cursor: pointer;
  color: inherit;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.ps-slot-icon {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ps-slot-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1;
}

.ps-slot-sub {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgba(200, 160, 80, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ps-slot-sub-att {
  color: #e8c040;
}

.ps-slot-btn:hover {
  background: #1a1812;
  border-color: #5c3310;
}

.ps-slot-btn:focus-visible {
  outline: none;
  border-color: #e8c040;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.85),
    0 0 12px rgba(232, 192, 64, 0.4);
}

.ps-slot-btn--active {
  background: #1a2010;
  border: 2px solid var(--rc, #52b830);
  box-shadow: 0 0 10px color-mix(in oklch, var(--rc, #52b830) 30%, transparent);
}

.ps-slot-btn-img {
  width: 50px;
  height: 50px;
  object-fit: contain;
  border-radius: 3px;
}

.ps-slot-btn-placeholder {
  font-size: 1.8rem;
  color: rgba(90, 142, 224, 0.35);
  line-height: 1;
  height: 50px;
  display: flex;
  align-items: center;
}

.ps-slot-btn-label {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.75);
  white-space: nowrap;
}

.ps-slot-btn--active .ps-slot-btn-label {
  color: var(--rc, #52b830);
}

.ps-slot-btn-hp-text {
  font-size: 0.55rem;
  color: #c05050;
  line-height: 1.2;
  white-space: nowrap;
  width: 100%;
  text-align: center;
}

.ps-slot-btn-hp-track {
  width: 100%;
  height: 5px;
  background: #2a1a1a;
  border-radius: 2px;
  overflow: hidden;
}

.ps-slot-btn-hp-fill {
  height: 100%;
  background: linear-gradient(to right, #cc3030, #e84040);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* ── Hero-Body (Planet oben, Rollen-Grid unten) ────────────────────────────── */
.ps-body {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1.4rem 1.4rem 0.75rem;
  /* Nimmt den verbleibenden Platz ein */
  flex: 1;
  justify-content: center;
}

/* ── Hero: Planet-Showcase ─────────────────────────────────────────────────── */
.ps-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

/* ── Attunement (level-up) block ───────────────────────────────────────────── */
.ps-level-block {
  --rc: #e8c040;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.6rem;
  padding: 1rem 1.1rem;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: var(--bp-radius);
  box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.4);
}

.ps-level-info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
  width: 100%;
}

.ps-level-title {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #e8c040;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.3);
  white-space: nowrap;
}

.ps-level-bonus {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--rc);
  text-align: right;
  text-shadow: 0 0 6px color-mix(in oklch, var(--rc) 40%, transparent);
}

.ps-level-bonus--muted {
  color: rgba(255, 255, 255, 0.35);
  font-weight: 600;
  text-shadow: none;
}

.ps-level-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 0.5rem 0.5rem 0.45rem;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: var(--bp-radius);
  color: #fff;
  cursor: pointer;
  transition:
    filter 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.ps-level-btn:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
  box-shadow: 0 0 10px rgba(80, 200, 40, 0.5);
}

.ps-level-btn:active {
  transform: translateY(0) scale(0.97);
}

.ps-level-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.9),
    0 0 14px rgba(232, 192, 64, 0.5);
}

.ps-level-btn--locked {
  background: #1c1c18;
  border-color: #3a2a10;
  color: rgba(255, 255, 255, 0.4);
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

.ps-level-btn--locked:hover {
  filter: grayscale(55%);
  transform: none;
  box-shadow: none;
}

.ps-level-btn-main {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ps-level-btn-cost {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  opacity: 0.95;
}

.ps-level-chime {
  width: 13px;
  height: 13px;
  image-rendering: pixelated;
}

.ps-level-cost-sep {
  opacity: 0.5;
  margin: 0 1px;
}

.ps-level-hint {
  font-size: 0.66rem;
  font-weight: 700;
  color: #cc6050;
  letter-spacing: 0.03em;
  text-align: center;
}

/* ── Rank badge ────────────────────────────────────────────────────────────── */
.ps-rank-badge {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.12rem 0.5rem;
  border: 1px solid;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
  text-shadow: 0 0 8px currentColor;
  white-space: nowrap;
}

/* ── Next-level preview ────────────────────────────────────────────────────── */
.ps-preview {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.5rem 0.6rem;
  background: #100f0a;
  border: 1px solid #2e1e0a;
  border-radius: 4px;
}

.ps-preview-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
}

.ps-preview-label {
  flex: 0 0 4.2rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.6rem;
}

.ps-preview-now {
  color: #d4c89a;
}

.ps-preview-arrow {
  color: var(--rc, #e8c040);
  font-weight: 900;
}

.ps-preview-next {
  color: var(--rc, #e8c040);
  font-weight: 800;
  text-shadow: 0 0 6px color-mix(in oklch, var(--rc, #e8c040) 40%, transparent);
}

/* ── Milestone tracker ─────────────────────────────────────────────────────── */
.ps-milestone {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ps-milestone-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.ps-milestone-count {
  font-size: 0.7rem;
  font-weight: 800;
  color: #e8c040;
  letter-spacing: 0.03em;
}

.ps-milestone-next {
  font-size: 0.62rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
}

.ps-milestone-track {
  width: 100%;
  height: 7px;
  background: #1c1c18;
  border: 1px solid #3a2a10;
  border-radius: 4px;
  overflow: hidden;
}

.ps-milestone-fill {
  height: 100%;
  background: linear-gradient(to right, #c89040, #f0d060);
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* ── Bulk attune buttons ───────────────────────────────────────────────────── */
.ps-attune-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1.4fr;
  gap: 0.5rem;
}

.ps-level-btn--alt {
  background: linear-gradient(to bottom, #3a8a48, #236014);
}

.ps-level-gate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.62rem;
  font-weight: 700;
  color: rgba(224, 160, 64, 0.7);
  letter-spacing: 0.02em;
}

/* ── Permanent role choice ─────────────────────────────────────────────────── */
.ps-choose {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.4rem 1.4rem 1rem;
}

.ps-choose-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  text-align: center;
}

.ps-choose-title {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #e8c040;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.35);
}

.ps-choose-warn {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #cc6050;
  padding: 0.2rem 0.6rem;
  border: 1px solid #5c2a20;
  border-radius: 4px;
  background: rgba(60, 16, 12, 0.5);
}

.ps-role-grid--choose {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem;
}

/* ── Permanence confirm bar ────────────────────────────────────────────────── */
.ps-confirm-bar {
  --rc: #e8c040;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.8rem 1rem;
  background: #16140e;
  border: 2px solid var(--rc);
  border-radius: var(--bp-radius);
  box-shadow: 0 0 18px color-mix(in oklch, var(--rc) 25%, transparent);
}

.ps-confirm-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: #d4c89a;
  flex: 1;
  min-width: 200px;
}

.ps-confirm-actions {
  display: flex;
  gap: 0.6rem;
  flex-shrink: 0;
}

.ps-confirm-cancel,
.ps-confirm-ok {
  padding: 0.5rem 1.1rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  border-radius: var(--bp-radius);
  cursor: pointer;
  transition:
    filter 180ms ease,
    transform 180ms ease;
}

.ps-confirm-cancel {
  background: #1c1c18;
  border: 1px solid #5c3310;
  color: #c0b890;
}

.ps-confirm-ok {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}

.ps-confirm-cancel:hover,
.ps-confirm-ok:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

/* ── Rollen-Grid ───────────────────────────────────────────────────────────── */
.ps-role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.6rem;
  align-items: stretch;
}

.ps-role-option {
  --rc: #aaaaaa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.85rem 0.5rem 0.75rem;
  background: #131210;
  border: 1px solid #2e1e0a;
  border-radius: var(--bp-radius);
  cursor: pointer;
  text-align: center;
  color: inherit;
  position: relative;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
  width: 100%;
  /* Inhalt vertikal zentriert innerhalb der Karte */
  justify-content: center;
}

.ps-role-option:focus-visible {
  outline: none;
  border-color: #e8c040;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.85),
    0 0 12px rgba(232, 192, 64, 0.4);
}

.ps-role-option:hover {
  background: #1a1812;
  border-color: color-mix(in oklch, var(--rc) 70%, transparent);
  box-shadow: 0 0 10px color-mix(in oklch, var(--rc) 20%, transparent);
  transform: translateY(-1px);
}

.ps-role-option--selected {
  background: #141812;
  border: 2px solid var(--rc);
  box-shadow:
    0 0 18px color-mix(in oklch, var(--rc) 35%, transparent),
    inset 0 0 20px color-mix(in oklch, var(--rc) 6%, transparent);
  transform: translateY(-2px);
}

.ps-role-icon {
  filter: drop-shadow(0 0 6px color-mix(in oklch, var(--rc) 55%, transparent));
  transition:
    transform 0.15s,
    filter 0.15s;
}

span.ps-role-icon {
  font-size: 2rem;
  line-height: 1;
}

img.ps-role-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  image-rendering: pixelated;
}
.ps-role-icon--gi {
  width: 32px;
  height: 32px;
  color: var(--rc, #c89040);
}

.ps-role-option:hover .ps-role-icon,
.ps-role-option--selected .ps-role-icon {
  transform: scale(1.12);
  filter: drop-shadow(0 0 10px color-mix(in oklch, var(--rc) 85%, transparent));
}

.ps-role-name {
  font-size: 0.73rem;
  font-weight: 700;
  color: #d4c89a;
  letter-spacing: 0.03em;
  line-height: 1.2;
}

.ps-role-option--selected .ps-role-name {
  color: var(--rc);
}

.ps-role-divider {
  width: 55%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in oklch, var(--rc) 30%, transparent),
    transparent
  );
}

.ps-role-effect {
  font-size: 0.67rem;
  font-weight: 800;
  color: var(--rc);
  line-height: 1.3;
  text-shadow: 0 0 6px color-mix(in oklch, var(--rc) 40%, transparent);
}

.ps-role-badge {
  position: absolute;
  top: 4px;
  right: 5px;
  background: color-mix(in oklch, var(--rc) 18%, #0d0c07);
  border: 1px solid color-mix(in oklch, var(--rc) 55%, transparent);
  color: var(--rc);
  font-size: 0.5rem;
  font-weight: 800;
  padding: 0.12rem 0.3rem;
  border-radius: 3px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ── HP ────────────────────────────────────────────────────────────────────── */
.ps-planet-hp {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ps-planet-hp-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.ps-hp-heart {
  font-size: 0.85rem;
  color: #e84040;
  filter: drop-shadow(0 0 4px rgba(232, 64, 64, 0.5));
}

.ps-hp-values {
  font-size: 0.78rem;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.03em;
}

.ps-hp-bar-track {
  width: 100%;
  height: 6px;
  background: #1c1c18;
  border: 1px solid #3a2a10;
  border-radius: 3px;
  overflow: hidden;
}

.ps-hp-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #cc3030, #e84040);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* ── Planetenbild ──────────────────────────────────────────────────────────── */
.ps-planet-preview-wrap {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ps-planet-preview-img {
  width: clamp(220px, 44vh, 320px);
  height: clamp(220px, 44vh, 320px);
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 40px rgba(180, 140, 60, 0.5));
}

/* ── Rollenname ────────────────────────────────────────────────────────────── */
.ps-planet-role-label {
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 0 12px currentColor;
  min-height: 1.2em;
  width: 100%;
}

/* ── Jungle Buff Panel ─────────────────────────────────────────────────────── */
.ps-jungle-buff-panel {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: #0c1209;
  border: 1px solid #3a8040;
  border-radius: var(--bp-radius);
  box-shadow:
    0 0 12px #5ce66a22,
    inset 0 0 8px #5ce66a0a;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ps-jungle-buff-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-bottom: 1px solid #2a5030;
  padding-bottom: 0.3rem;
  margin-bottom: 0.1rem;
}

.ps-jungle-buff-leaf {
  width: 14px;
  height: 14px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 4px #5ce66a88);
}

.ps-jungle-buff-title {
  font-size: 0.65rem;
  font-weight: 800;
  color: #5ce66a;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  flex: 1;
}

.ps-jungle-buff-timer {
  font-size: 0.65rem;
  font-weight: 700;
  color: #5ce66a;
  background: #162a1a;
  border: 1px solid #3a8040;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 16px;
}

.ps-jungle-buff-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: #a0e880;
  text-align: center;
  width: 100%;
  display: block;
}

.ps-jungle-buff-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.ps-jungle-buff-label {
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ps-jungle-buff-value {
  font-size: 0.8rem;
  font-weight: 800;
  color: #5ce66a;
  text-shadow: 0 0 8px #5ce66a66;
}

/* ── Config-Sektion ────────────────────────────────────────────────────────── */
.ps-config-section {
  margin: 0 0.85rem 0.75rem;
  padding: 1rem;
  border: 1px solid #3a2a10;
  border-radius: var(--bp-radius);
  background: linear-gradient(180deg, #100f0a 0%, #0c0b07 100%);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.ps-config-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #2a1a08;
}

.ps-config-header-icon {
  font-size: 1.1rem;
}

.ps-config-header > span:nth-child(2) {
  font-size: 0.85rem;
  font-weight: 800;
  color: #f0d060;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex: 1;
}

.ps-config-header-hint {
  font-size: 0.64rem !important;
  color: rgba(255, 255, 255, 0.3) !important;
  font-weight: 400 !important;
  text-transform: none !important;
  letter-spacing: 0.01em !important;
  white-space: nowrap;
}

.ps-config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.55rem;
}

.ps-config-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 0.4rem 0.6rem;
  background: #161410;
  border: 1px solid #2e1e0a;
  border-radius: var(--bp-radius);
  cursor: pointer;
  color: inherit;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
  position: relative;
}

.ps-config-btn:focus-visible {
  outline: none;
  border-color: #e8c040;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.85),
    0 0 12px rgba(232, 192, 64, 0.4);
}

.ps-config-btn:hover {
  background: #1e1a10;
  border-color: #6a3e18;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
}

.ps-config-btn--active {
  background: #121a0e;
  border: 1px solid #70c040;
  box-shadow:
    0 0 10px rgba(112, 192, 64, 0.25),
    inset 0 0 10px rgba(112, 192, 64, 0.05);
}

.ps-config-btn-img-wrap {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.ps-config-btn-img {
  width: 38px;
  height: 38px;
  object-fit: contain;
  transition: transform 0.15s;
}

.ps-config-btn:hover .ps-config-btn-img {
  transform: scale(1.1);
}

.ps-config-btn--active .ps-config-btn-img {
  filter: drop-shadow(0 0 6px rgba(112, 192, 64, 0.5));
}

.ps-config-btn-img-placeholder {
  font-size: 1.4rem;
  opacity: 0.4;
}

.ps-config-btn-label {
  font-size: 0.66rem;
  font-weight: 600;
  color: #c0b890;
  text-align: center;
  line-height: 1.25;
}

.ps-config-btn--active .ps-config-btn-label {
  color: #90e050;
  font-weight: 700;
}

.ps-config-btn-check {
  position: absolute;
  top: 4px;
  right: 5px;
  font-size: 0.6rem;
  color: #70c040;
  font-weight: 900;
}

/* ── Planet Placeholder ────────────────────────────────────────────────────── */
.ps-planet-no-role {
  width: clamp(180px, 38vh, 240px);
  height: clamp(180px, 38vh, 240px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  color: rgba(90, 142, 224, 0.25);
  border: 2px dashed rgba(90, 142, 224, 0.15);
  border-radius: 50%;
}

/* ── Planet-Bild Transition ────────────────────────────────────────────────── */
.ps-planet-swap-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.ps-planet-swap-leave-active {
  transition: opacity 0.15s ease;
}
.ps-planet-swap-enter-from {
  opacity: 0;
  transform: scale(0.82);
}
.ps-planet-swap-leave-to {
  opacity: 0;
}

/* ── Locked Slots ──────────────────────────────────────────────────────────── */

/* Affordable: pulsing green glow, dark green bg tint, sweep-shine on hover */
.ps-slot-btn--affordable {
  opacity: 1;
  filter: none;
  cursor: pointer;
  background: linear-gradient(180deg, #0d1a0a 0%, #0a140a 100%);
  border-color: rgba(82, 184, 48, 0.55);
  box-shadow:
    0 0 10px rgba(82, 184, 48, 0.25),
    inset 0 0 14px rgba(82, 184, 48, 0.05);
  overflow: hidden;
  animation: ps-afford-pulse 2.2s ease-in-out infinite;
}

.ps-slot-btn--affordable::after {
  content: '';
  position: absolute;
  top: 0;
  left: -80%;
  width: 45%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(180, 255, 120, 0.18) 50%,
    transparent 100%
  );
  transform: skewX(-18deg);
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

.ps-slot-btn--affordable:hover {
  background: linear-gradient(180deg, #101f0c 0%, #0d1a0a 100%);
  border-color: #6de030;
  box-shadow:
    0 0 20px rgba(82, 184, 48, 0.65),
    0 0 40px rgba(82, 184, 48, 0.2),
    inset 0 0 16px rgba(82, 184, 48, 0.1);
  transform: translateY(-2px) scale(1.04);
  animation: none;
}

.ps-slot-btn--affordable:hover::after {
  animation: ps-afford-shine 0.55s ease-out forwards;
}

.ps-slot-btn--affordable .ps-slot-btn-lock {
  filter: sepia(1) saturate(4) hue-rotate(80deg) brightness(1.2);
  animation: ps-lock-bob 1.8s ease-in-out infinite;
}

/* Can't afford */
.ps-slot-btn--cant-afford {
  opacity: 0.4;
  filter: grayscale(60%);
  cursor: pointer;
}

/* Lock icon */
.ps-slot-btn-lock {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}
.ps-slot-btn-lock .lock-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  image-rendering: auto;
}


/* ── Keyframes ──────────────────────────────────────────────────────────────── */
@keyframes ps-afford-pulse {
  0%, 100% {
    border-color: rgba(82, 184, 48, 0.45);
    box-shadow:
      0 0 8px rgba(82, 184, 48, 0.2),
      inset 0 0 12px rgba(82, 184, 48, 0.04);
  }
  50% {
    border-color: rgba(110, 210, 64, 0.9);
    box-shadow:
      0 0 20px rgba(82, 184, 48, 0.6),
      0 0 36px rgba(82, 184, 48, 0.18),
      inset 0 0 14px rgba(82, 184, 48, 0.1);
  }
}

@keyframes ps-afford-shine {
  0%   { left: -80%; opacity: 0; }
  15%  { opacity: 1; }
  100% { left: 130%; opacity: 0; }
}

@keyframes ps-lock-bob {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50%       { transform: translateY(-3px) rotate(4deg); }
}

/* Leerstate mittig im verbleibenden Raum */
.ps-empty--hint {
  flex: 1;
  min-height: 200px;
}

/* ── Slot phase badge ──────────────────────────────────────────────────────── */
.ps-slot-phase-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.55rem;
  font-weight: 800;
  color: rgba(200, 160, 60, 0.5);
  letter-spacing: 0.03em;
  line-height: 1;
}

.ps-slot-btn--affordable .ps-slot-phase-badge {
  color: #90e050;
}

/* ── Sun requirement row in locked panel ───────────────────────────────────── */
.ps-locked-panel-sun-req {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(40, 10, 10, 0.6);
  border: 1px solid rgba(180, 50, 50, 0.4);
  border-radius: var(--bp-radius);
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(220, 100, 80, 0.8);
  transition: border-color 0.25s, background 0.25s, color 0.25s;
}

.ps-locked-panel-sun-req--met {
  background: rgba(10, 40, 10, 0.6);
  border-color: rgba(80, 200, 60, 0.45);
  color: #80e050;
}

.ps-sun-req-icon {
  flex-shrink: 0;
  color: inherit;
}

.ps-sun-req-label {
  font-weight: 800;
}

.ps-sun-req-sep {
  opacity: 0.4;
}

.ps-sun-req-current {
  font-size: 0.66rem;
  opacity: 0.6;
  font-weight: 600;
}

/* ── Config Slide Transition ───────────────────────────────────────────────── */
.ps-config-slide-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    max-height 0.25s ease;
  max-height: 500px;
  overflow: hidden;
}
.ps-config-slide-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    max-height 0.2s ease;
  max-height: 500px;
  overflow: hidden;
}
.ps-config-slide-enter-from,
.ps-config-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

/* ── Locked Slot Panel ─────────────────────────────────────────────────────── */
.ps-locked-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px 16px;
}

.ps-locked-panel-icon {
  display: flex;
  filter: drop-shadow(0 0 12px rgba(200, 144, 64, 0.35));
  animation: ps-lock-bob 3s ease-in-out infinite;
}
.ps-locked-panel-icon .lock-icon {
  width: 64px;
  height: 64px;
  object-fit: contain;
  image-rendering: auto;
}

.ps-locked-panel-title {
  font-size: 12px;
  font-weight: 800;
  color: rgba(200, 160, 60, 0.5);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
}

.ps-locked-panel-cost-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.ps-locked-panel-chime {
  width: 52px;
  height: 52px;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 10px rgba(232, 192, 64, 0.7));
  animation: ps-chime-bob 2s ease-in-out infinite;
}

.ps-locked-panel-cost {
  font-size: 48px;
  font-weight: 800;
  color: #e8c040;
  letter-spacing: 0.02em;
  text-shadow:
    0 0 12px rgba(232, 192, 64, 0.8),
    0 0 28px rgba(232, 192, 64, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.9);
  line-height: 1;
}

.ps-locked-panel-cost-label {
  font-size: 11px;
  font-weight: 800;
  color: rgba(200, 160, 60, 0.45);
  letter-spacing: 0.14em;
  margin-top: -4px;
}

.ps-locked-panel-divider {
  width: 80px;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(200, 144, 64, 0.4), transparent);
  margin: 4px 0;
}

.ps-locked-panel-buy-btn {
  padding: 10px 36px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: var(--bp-radius);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition:
    filter 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.ps-locked-panel-buy-btn:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.ps-locked-panel-buy-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.9),
    0 0 14px rgba(232, 192, 64, 0.5);
}

.ps-locked-panel-buy-btn:active {
  transform: translateY(0) scale(0.97);
}

.ps-locked-panel-hint {
  font-size: 12px;
  color: rgba(180, 130, 50, 0.5);
  letter-spacing: 0.05em;
}
</style>
