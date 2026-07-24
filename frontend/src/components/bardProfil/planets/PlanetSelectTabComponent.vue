<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/uiStore'
import {
  usePlanetShopStore,
  PLANET_ROLES_LIST,
  PLANET_ROLES,
  planetLevelBonusMultiplier,
  computePlanetMaxHp,
} from '@/stores/planetShopStore'
import type { PlanetRole, PlanetRoleType, PlanetSlot } from '@/stores/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import BattleReturnButton from '@/components/bardProfil/BattleReturnButton.vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'
import { MATERIALS } from '@/config/materials'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  PLANET_TAB_SUN_MIN_DIAMETER,
  PLANET_TAB_SUN_MAX_DIAMETER,
  PLANET_TAB_PLANET_DIAMETER,
  SUN_PHASE_DISPLAY_OFFSET,
  HP_BAR_SEGMENTS,
  HP_COLOR_THRESHOLD_HIGH,
  HP_COLOR_THRESHOLD_LOW,
} from '@/config/constants'
import { useActionToast } from '@/composables/useActionToast'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'

const CPS_BUILDINGS = [
  { id: 'glockenturm', name: 'Bell Tower', icon: '/img/Glockenturm.png' },
  { id: 'klanggenerator', name: 'Sound Generator', icon: '/img/KlangGenerator.png' },
  { id: 'harmoniewerk', name: 'Harmony Works', icon: '/img/HarmonieWerk.png' },
  { id: 'sphaerenMusik', name: 'Sphere Music', icon: '/img/SphaerenMusik.png' },
  { id: 'zeitEcho', name: 'Time Echo', icon: '/img/ZeitEcho.png' },
]

const uiStore = useUiStore()
const store = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()

// Display numbering counts the comet as phase 1 (sun phases render as index + 2).
function displaySunPhase(phaseIndex: number): number {
  return phaseIndex + SUN_PHASE_DISPLAY_OFFSET
}
const currentDisplayPhase = computed(() =>
  solarStore.isCometState ? 1 : solarStore.starPhase + SUN_PHASE_DISPLAY_OFFSET,
)
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

// Each slot enters the stage at its own point of the orbit (a stable per-slot
// phase offset via negative animation-delay), so switching planets never shows
// them all at the same position — like a real system, every orbit is desynced.
const ORBIT_PERIOD_SEC = 26
const orbitPhaseStyle = computed(() => {
  const idx = Math.max(0, activeSlotIndex.value)
  const count = Math.max(1, store.slots.length)
  return { '--orbit-delay': `-${((idx * ORBIT_PERIOD_SEC) / count).toFixed(2)}s` }
})

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

// Current Sun-Phase colors for the stage backdrop sun (mirrors SunComponent vars).
const sunPhaseStyle = computed(() => {
  if (solarStore.isCometState) {
    return {
      '--phase-core': COMET_PHASE_DATA.core,
      '--phase-mid': COMET_PHASE_DATA.mid,
      '--phase-edge': COMET_PHASE_DATA.edge,
      '--phase-primary': COMET_PHASE_DATA.accent,
      '--phase-glow': COMET_PHASE_DATA.glow,
      '--pulse-speed': COMET_PHASE_DATA.pulseSpeed,
      '--ps-sun-d': `${PLANET_TAB_SUN_MIN_DIAMETER}px`,
      '--ps-planet-d': `${PLANET_TAB_PLANET_DIAMETER}px`,
    }
  }
  const phase = STAR_PHASE_DATA[store.currentSunStage] ?? STAR_PHASE_DATA[0]
  // Scale the stage sun proportionally to the real Sun-Phase radius (the same
  // value SunComponent uses), normalized over the data's own min/max so it adapts
  // if phases change, then mapped into a safe diameter band that keeps the fixed
  // orbit framed by the sun.
  const radii = STAR_PHASE_DATA.map((p) => p.radius)
  const minR = Math.min(...radii)
  const maxR = Math.max(...radii)
  const t = maxR === minR ? 0 : (phase.radius - minR) / (maxR - minR)
  const sunD =
    PLANET_TAB_SUN_MIN_DIAMETER + t * (PLANET_TAB_SUN_MAX_DIAMETER - PLANET_TAB_SUN_MIN_DIAMETER)
  return {
    '--phase-core': phase.core,
    '--phase-mid': phase.mid,
    '--phase-edge': phase.edge,
    '--phase-primary': phase.phasePrimary,
    '--phase-glow': phase.phaseGlow,
    '--pulse-speed': phase.pulseSpeed,
    '--ps-sun-d': `${Math.round(sunD)}px`,
    '--ps-planet-d': `${PLANET_TAB_PLANET_DIAMETER}px`,
  }
})

const hpPercent = computed(() => {
  if (!activeSlot.value || activeSlot.value.maxHp === 0) return 100
  return Math.max(0, Math.min(100, (activeSlot.value.currentHp / activeSlot.value.maxHp) * 100))
})

// Health-state color tier — shared by the rail slots and the stage bar. Reuses
// the game-wide HP color thresholds so the green → gold → red language matches
// the rest of the UI (CommandPanel etc.).
function hpTier(current: number, max: number): 'high' | 'mid' | 'low' {
  const frac = max > 0 ? current / max : 1
  if (frac > HP_COLOR_THRESHOLD_HIGH) return 'high'
  if (frac > HP_COLOR_THRESHOLD_LOW) return 'mid'
  return 'low'
}

// Rounded HP percent for a rail slot (0–100).
function hpPctOf(slot: PlanetSlot): number {
  if (!slot || slot.maxHp === 0) return 100
  return Math.round(Math.max(0, Math.min(100, (slot.currentHp / slot.maxHp) * 100)))
}

// How many levels this rail slot can afford right now (0 when locked / no role /
// blocked by phase or chimes). Drives the per-slot notify badge.
function slotUpgradeCount(slot: PlanetSlot): number {
  if (!slot.purchased || !slot.role) return 0
  return store.getMaxAffordableLevelCount(slot.id)
}

const activeHpTier = computed(() =>
  activeSlot.value ? hpTier(activeSlot.value.currentHp, activeSlot.value.maxHp) : 'high',
)

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

// Per-slot remaining seconds — used by the sidebar, where the buffed planet
// is usually NOT the currently selected slot.
function buffSecsLeft(slot: PlanetSlot): number {
  const jb = slot.jungleBuff
  if (!jb?.active) return 0
  return Math.max(0, Math.ceil((jb.activeUntil - now.value) / 1000))
}

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

// ── Per-planet leveling ────────────────────────────────────────────────────
const levelUpCost = computed(() =>
  activeSlot.value ? store.getPlanetLevelUpCost(activeSlot.value.id) : 0,
)
const levelUpReqPhase = computed(() =>
  activeSlot.value ? store.getPlanetLevelRequiredPhase(activeSlot.value.id) : 0,
)
const levelUpReason = computed(() =>
  activeSlot.value ? store.planetLevelUpBlockReason(activeSlot.value.id) : null,
)

const activeSlotBonusText = computed(() => {
  const role = activeSlot.value?.role
  if (!role) return ''
  return bonusText(PLANET_ROLES[role], activeSlot.value!.level)
})

// ── Max attune (the only buy action) ───────────────────────────────────────
const maxAffordableCount = computed(() =>
  activeSlot.value ? store.getMaxAffordableLevelCount(activeSlot.value.id) : 0,
)
const maxCost = computed(() =>
  activeSlot.value ? store.getBulkLevelUpCost(activeSlot.value.id, maxAffordableCount.value) : 0,
)

// ── Upgrade preview ────────────────────────────────────────────────────────
// The single "Max" buy attunes as many levels as affordable, so the preview
// shows the state AFTER that buy. With nothing affordable it falls back to a
// +1 preview so the player still sees what the next attunement would bring.
const previewLevelGain = computed(() => Math.max(1, maxAffordableCount.value))
const nextBonusText = computed(() => {
  const role = activeSlot.value?.role
  if (!role) return ''
  return bonusText(PLANET_ROLES[role], (activeSlot.value!.level ?? 1) + previewLevelGain.value)
})
const currentMaxHp = computed(() => computePlanetMaxHp(activeSlot.value?.level ?? 1))
const nextMaxHp = computed(() =>
  computePlanetMaxHp((activeSlot.value?.level ?? 1) + previewLevelGain.value),
)

function attune(count: number) {
  if (!activeSlot.value) return
  const before = activeSlot.value.level
  const gained = store.levelUpPlanetTimes(activeSlot.value.id, count)
  if (gained > 0) {
    showToast(
      gained === 1
        ? `Planet reached Lvl ${activeSlot.value.level}!`
        : `+${gained} Levels → Lvl ${activeSlot.value.level} (was ${before})`,
    )
  }
}

// ── Config picker (Harvester material / Resonator building) ────────────────
const configPickerOpen = ref(false)

// Reset picker when switching slots.
watch(selectedSlotId, () => {
  configPickerOpen.value = false
})

const isConfigurableRole = computed(
  () => activeSlot.value?.role === 'harvest_node' || activeSlot.value?.role === 'resonance_tower',
)

const selectedMaterial = computed(() =>
  MATERIALS.find((m) => m.id === activeSlot.value?.slotConfig?.materialId) ?? null,
)
const selectedBuilding = computed(() =>
  CPS_BUILDINGS.find((b) => b.id === activeSlot.value?.slotConfig?.buildingId) ?? null,
)

// Chip label + icon for the configurable-role target.
const configChip = computed(() => {
  if (activeSlot.value?.role === 'harvest_node') {
    return {
      verb: 'Harvesting',
      name: selectedMaterial.value?.name ?? 'Choose…',
      icon: selectedMaterial.value?.image ?? null,
    }
  }
  if (activeSlot.value?.role === 'resonance_tower') {
    return {
      verb: 'Boosting',
      name: selectedBuilding.value?.name ?? 'Choose…',
      icon: selectedBuilding.value?.icon ?? null,
    }
  }
  return null
})

function chooseMaterial(materialId: string) {
  if (!activeSlot.value) return
  store.setSlotConfig(activeSlot.value.id, { materialId })
  configPickerOpen.value = false
}
function chooseBuilding(buildingId: string) {
  if (!activeSlot.value) return
  store.setSlotConfig(activeSlot.value.id, { buildingId })
  configPickerOpen.value = false
}
</script>

<template>
  <div class="ps-tab" :style="{ '--hp-seg': HP_BAR_SEGMENTS }">
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
            'ps-slot-btn--buffed': slot.jungleBuff?.active,
          }"
          :style="slot.role ? { '--rc': PLANET_ROLES[slot.role].color } : {}"
          @click="selectSlot(slot.id)"
        >
          <!-- Jungle buff aura + modern RPG buff medallion — pinned top-LEFT so it
               never collides with the notify badge (top-right). Overlay only → no
               layout shift. -->
          <span v-if="slot.jungleBuff?.active" class="ps-slot-buff-ring" aria-hidden="true" />
          <span v-if="slot.jungleBuff?.active" class="ps-slot-buff-badge">
            <span class="ps-slot-buff-emblem">
              <img class="ps-slot-buff-leaf" src="/img/roles/jungle.png" alt="Jungle buff" />
            </span>
            <span class="ps-slot-buff-mult">×{{ slot.jungleBuff.multiplier }}</span>
            <span class="ps-slot-buff-timer">{{ buffSecsLeft(slot) }}s</span>
          </span>

          <!-- Affordable-upgrade notify badge — pinned top-RIGHT so it never
               collides with the jungle-buff medallion (top-left); shows the count
               of levels this slot can afford right now. -->
          <span
            v-if="slotUpgradeCount(slot) > 0"
            class="ps-slot-notify"
            :aria-label="`${slotUpgradeCount(slot)} upgrade(s) affordable`"
          >{{ slotUpgradeCount(slot) }}</span>

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
            <div class="ps-slot-info-head">
              <span class="ps-slot-btn-label">Orbit {{ slot.id.replace('slot_', '') }}</span>
              <span v-if="slot.purchased && slot.role" class="ps-slot-lvl-badge">
                Lv {{ slot.level }}
              </span>
            </div>
            <template v-if="!slot.purchased">
              <span class="ps-slot-phase-badge">
                <Icon icon="game-icons:sun" width="16" height="16" />
                Phase {{ displaySunPhase(store.getSlotRequiredPhase(slotIndex)) }}
              </span>
            </template>
            <template v-else>
              <span
                class="ps-slot-sub"
                :style="slot.role ? { color: PLANET_ROLES[slot.role].color } : {}"
              >
                {{ slot.role ? PLANET_ROLES[slot.role].name : 'No role yet' }}
              </span>
              <div
                v-if="slot.maxHp > 0"
                class="ps-slot-hp"
                :class="`ps-slot-hp--${hpTier(slot.currentHp, slot.maxHp)}`"
              >
                <div class="ps-slot-hp-track">
                  <div class="ps-slot-hp-fill" :style="{ width: hpPctOf(slot) + '%' }" />
                </div>
                <span class="ps-slot-hp-val">{{ hpPctOf(slot) }}%</span>
              </div>
            </template>
          </div>
        </button>
      </div>

      <!-- RIGHT DETAIL ─────────────────────────────────────────────── -->
      <!-- sunPhaseStyle on the wrapper: the shared backdrop's near stars
           inherit the phase tint in EVERY detail state, not just the stage -->
      <div class="ps-detail" :style="sunPhaseStyle">
        <!-- shared cosmic backdrop (same starfield as Shop / Team / Skill Tree) -->
        <CosmicStageBackground />

        <!-- Jungle-buff takeover: while the selected slot is buffed the whole
             detail panel is rimmed with an animated emerald veil and a bold,
             centered banner reads out the active buff + remaining duration. -->
        <Transition name="ps-buff-veil">
          <div
            v-if="activeSlot?.jungleBuff?.active"
            class="ps-buff-overlay"
            aria-hidden="true"
          >
            <span class="ps-buff-veil-edge" />
            <div class="ps-buff-banner">
              <span class="ps-buff-banner-emblem">
                <img class="ps-buff-banner-leaf" src="/img/roles/jungle.png" alt="" />
              </span>
              <div class="ps-buff-banner-text">
                <span class="ps-buff-banner-kicker">Jungle Buff</span>
                <span class="ps-buff-banner-name">{{ activeSlot.jungleBuff.buffType }}</span>
                <span class="ps-buff-banner-mult">×{{ activeSlot.jungleBuff.multiplier }} power</span>
              </div>
              <div class="ps-buff-banner-timer">
                <span class="ps-buff-banner-secs">{{ jungleBuffSecsLeft }}</span>
                <span class="ps-buff-banner-unit">sec left</span>
              </div>
            </div>
          </div>
        </Transition>
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
            :class="{ 'ps-locked-panel-sun-req--met': !solarStore.isCometState && store.currentSunStage >= store.getSlotRequiredPhase(activeSlotIndex) }"
          >
            <Icon icon="game-icons:sun" width="16" height="16" class="ps-sun-req-icon" />
            <span class="ps-sun-req-label">Phase {{ displaySunPhase(store.getSlotRequiredPhase(activeSlotIndex)) }}</span>
            <span class="ps-sun-req-sep">·</span>
            <span class="ps-sun-req-current">Current {{ currentDisplayPhase }}</span>
          </div>
          <button
            v-if="store.canUnlockPlanetSlot(activeSlotIndex)"
            class="ps-locked-panel-buy-btn"
            @click="buySlot(activeSlot.id)"
          >
            ✦ Unlock
          </button>
          <span v-else-if="solarStore.isCometState" class="ps-locked-panel-hint">
            Your comet has no planetary system yet — ignite it into a star in the Star Forge.
          </span>
          <span v-else-if="store.currentSunStage < store.getSlotRequiredPhase(activeSlotIndex)" class="ps-locked-panel-hint">
            Reach Sun Phase {{ displaySunPhase(store.getSlotRequiredPhase(activeSlotIndex)) }} to unlock
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

        <!-- Purchased + role locked: cosmic stage + frameless fixed upgrade menu -->
        <template v-else-if="activeSlot && activeSlot.purchased && activeSlot.role">
          <!-- Centered cosmic stage: sun + orbiting planet fill the full width;
               name → HP → Level-Up form the bottom-center hero. The side panel is
               dissolved — every numeric readout is a floating HUD chip in a corner
               (clear of the top-center jungle-buff banner). -->
          <div class="ps-stage" :style="[{ '--rc': activeRoleColor }, sunPhaseStyle]">
            <!-- Central body (comet rock or phase sun) + orbiting planet -->
            <div class="ps-system" :class="{ 'ps-system--comet': solarStore.isCometState }">
              <CometDisc v-if="solarStore.isCometState" :diameter="200" />
              <div v-else class="ps-stage-sun" />
              <!-- The whole orbit wrapper is keyed per slot: the old planet fades
                   out at ITS orbit position, the new one fades in at its own — no
                   visible position jump. type="transition" required (infinite
                   orbit keyframe would otherwise deadlock mode="out-in"). -->
              <Transition name="ps-planet-swap" mode="out-in" type="transition">
                <div :key="activeSlot.id" class="ps-planet-preview-wrap" :style="orbitPhaseStyle">
                  <img
                    :src="activeImage"
                    class="ps-planet-preview-img"
                    :class="{ 'ps-planet-preview-img--buffed': activeSlot.jungleBuff?.active }"
                    alt="Planet"
                  />
                </div>
              </Transition>
            </div>

            <!-- Bottom-center hero: big Level-Up sits BETWEEN the sun and the
                 name/HP unit (name still reads as the HP bar's title). -->
            <div class="ps-planet-readout" :style="{ '--rc': activeRoleColor }">
              <div class="ps-dock-buy ps-hero-buy">
                <button
                  class="ps-level-btn"
                  :class="{ 'ps-level-btn--locked': maxAffordableCount === 0 }"
                  :disabled="maxAffordableCount === 0"
                  :title="maxAffordableCount > 0 ? 'Level up as much as you can afford' : (levelUpReason === 'phase' ? `Requires Sun Phase ${levelUpReqPhase}` : 'Not enough Chimes')"
                  @click="attune(maxAffordableCount)"
                >
                  <span class="ps-level-btn-main">
                    ✦ Level Up<template v-if="maxAffordableCount > 0"> +{{ maxAffordableCount }}</template>
                  </span>
                  <span
                    class="ps-level-btn-cost"
                    :class="{ 'ps-level-btn-cost--req': levelUpReason === 'phase' }"
                  >
                    <template v-if="levelUpReason === 'phase'">
                      <Icon icon="game-icons:sun" width="16" height="16" class="ps-level-req-icon" />
                      Requires Phase {{ levelUpReqPhase }}
                    </template>
                    <template v-else>
                      <img src="/img/BardAbilities/BardChime.png" class="ps-level-chime" alt="" />
                      {{ $formatNumber(maxAffordableCount > 0 ? maxCost : levelUpCost) }}
                    </template>
                  </span>
                </button>
                <span v-if="maxAffordableCount > 0" class="ps-buy-badge" aria-hidden="true">{{ maxAffordableCount }}</span>
              </div>

              <div class="ps-planet-role-label">{{ activeRoleName }}</div>
              <div
                v-if="activeSlot.maxHp > 0"
                class="ps-planet-hp"
                :class="`ps-planet-hp--${activeHpTier}`"
              >
                <div class="ps-planet-hp-text">
                  <span class="ps-hp-values">{{ activeSlot.currentHp }} / {{ activeSlot.maxHp }}</span>
                  <span class="ps-hp-pct">{{ Math.round(hpPercent) }}%</span>
                </div>
                <div class="ps-hp-bar-track">
                  <div class="ps-hp-bar-fill" :style="{ width: hpPercent + '%' }">
                    <span class="ps-hp-bar-shine" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Distributed HUD · top-left: level medallion + config chip -->
          <div class="ps-hud ps-hud--tl" :style="{ '--rc': activeRoleColor }">
            <div class="ps-level-chip">
              <span class="ps-level-chip-label">Level</span>
              <span class="ps-level-chip-value">{{ activeSlot.level }}</span>
            </div>
            <button
              v-if="isConfigurableRole && configChip"
              class="ps-config-chip"
              @click="configPickerOpen = !configPickerOpen"
            >
              <span class="ps-config-chip-verb">{{ configChip.verb }}:</span>
              <img v-if="configChip.icon" :src="configChip.icon" class="ps-config-chip-icon" alt="" />
              <span class="ps-config-chip-name">{{ configChip.name }}</span>
              <span class="ps-config-chip-caret">▾</span>
            </button>
          </div>

          <!-- Distributed HUD · top-right: effect + Max-HP stat cards -->
          <div class="ps-hud ps-hud--tr" :style="{ '--rc': activeRoleColor }">
            <div class="ps-stat-card">
              <span class="ps-stat-label">Effect</span>
              <span class="ps-stat-vals">
                <span class="ps-stat-now">{{ activeSlotBonusText }}</span>
                <span class="ps-stat-arrow">→</span>
                <span class="ps-stat-next">{{ nextBonusText }}</span>
              </span>
              <span v-if="maxAffordableCount > 0" class="ps-stat-gain">after +{{ maxAffordableCount }}</span>
            </div>
            <div class="ps-stat-card">
              <span class="ps-stat-label">Max HP</span>
              <span class="ps-stat-vals">
                <span class="ps-stat-now">{{ currentMaxHp }}</span>
                <span class="ps-stat-arrow">→</span>
                <span class="ps-stat-next">{{ nextMaxHp }}</span>
              </span>
            </div>
          </div>

          <!-- Config picker popover overlay -->
          <Transition name="ps-pop">
            <div v-if="configPickerOpen" class="ps-pop-scrim" @click.self="configPickerOpen = false">
              <div class="ps-pop">
                <RpgFrame />
                <div class="ps-pop-head">
                  <span class="ps-pop-title">
                    {{ activeSlot.role === 'harvest_node' ? 'Select Material' : 'Select Building' }}
                  </span>
                  <button class="ps-pop-close" @click="configPickerOpen = false">✕</button>
                </div>
                <div class="ps-config-grid">
                  <template v-if="activeSlot.role === 'harvest_node'">
                    <button
                      v-for="mat in MATERIALS"
                      :key="mat.id"
                      class="ps-config-btn"
                      :class="{ 'ps-config-btn--active': activeSlot.slotConfig?.materialId === mat.id }"
                      @click="chooseMaterial(mat.id)"
                    >
                      <div class="ps-config-btn-img-wrap">
                        <img v-if="mat.image" :src="mat.image" class="ps-config-btn-img" alt="" />
                        <div v-else class="ps-config-btn-img-placeholder">?</div>
                      </div>
                      <span class="ps-config-btn-label">{{ mat.name }}</span>
                      <div v-if="activeSlot.slotConfig?.materialId === mat.id" class="ps-config-btn-check">✓</div>
                    </button>
                  </template>
                  <template v-else>
                    <button
                      v-for="bld in CPS_BUILDINGS"
                      :key="bld.id"
                      class="ps-config-btn"
                      :class="{ 'ps-config-btn--active': activeSlot.slotConfig?.buildingId === bld.id }"
                      @click="chooseBuilding(bld.id)"
                    >
                      <div class="ps-config-btn-img-wrap">
                        <img v-if="bld.icon" :src="bld.icon" class="ps-config-btn-img" alt="" />
                        <Icon v-else icon="game-icons:brick-wall" width="24" height="24" class="ps-config-btn-img-placeholder" style="color: #7a4e20" />
                      </div>
                      <span class="ps-config-btn-label">{{ bld.name }}</span>
                      <div v-if="activeSlot.slotConfig?.buildingId === bld.id" class="ps-config-btn-check">✓</div>
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </Transition>
        </template>

        <!-- Return-to-Star-Fight CTA — floats bottom-right, available in every
             slot state; only visible while the jumped-from star fight is live. -->
        <BattleReturnButton />
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
  width: clamp(210px, 16vw, 320px);
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.8vh, 12px);
  padding: clamp(8px, 1vh, 14px);
  background: #16120a;
  border-right: 3px solid #5c3310;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* Right detail panel — column layout: stage (flexible, dominates) on top +
   compact horizontal upgrade dock pinned to the bottom. The sun system gets
   the full remaining width AND height, so it stays the visual hero. */
.ps-detail {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
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

/* ── Panel-less layout: centered stage + distributed HUD chips ──────────────── */
/* Corner HUD clusters float over the cosmic stage. The container ignores pointer
   events so it never blocks the stage; only its interactive children opt back in.
   Semi-transparent flat fills (no blur) let the starfield read through. */
.ps-hud {
  position: absolute;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.9vh, 11px);
  pointer-events: none;
}

.ps-hud > * {
  pointer-events: auto;
}

.ps-hud--tl {
  top: clamp(12px, 2vh, 24px);
  left: clamp(12px, 1vw, 24px);
  align-items: flex-start;
}

.ps-hud--tr {
  top: clamp(12px, 2vh, 24px);
  right: clamp(12px, 1vw, 24px);
  align-items: flex-end;
}

/* Level medallion — compact gold-accented chip */
.ps-level-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  padding: clamp(5px, 0.7vh, 9px) clamp(10px, 0.8vw, 15px);
  background: rgba(20, 17, 10, 0.82);
  border: 1px solid #5c3310;
  border-radius: 5px;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(232, 192, 64, 0.12);
}

.ps-level-chip-label {
  font-size: clamp(0.6rem, 1vh, 0.76rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.ps-level-chip-value {
  font-size: clamp(1.4rem, 2.4vh, 2rem);
  font-weight: 800;
  line-height: 0.9;
  color: #e8c040;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.4);
  font-variant-numeric: tabular-nums;
}

/* Floating stat cards (Effect / Max HP) — right-aligned readouts */
.ps-stat-card {
  --rc: #e8c040;
  min-width: clamp(150px, 15vw, 210px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: clamp(6px, 0.8vh, 10px) clamp(10px, 0.8vw, 14px);
  background: rgba(20, 17, 10, 0.82);
  border: 1px solid #3a2a10;
  border-radius: 5px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  text-align: right;
}

.ps-stat-label {
  font-size: clamp(0.6rem, 0.95vh, 0.74rem);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.ps-stat-vals {
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 6px;
  font-size: clamp(0.95rem, 1.6vh, 1.25rem);
  font-weight: 800;
  line-height: 1.1;
  flex-wrap: wrap;
}

.ps-stat-now {
  color: #e2d6ab;
}

.ps-stat-arrow {
  color: var(--rc, #e8c040);
  font-weight: 900;
}

.ps-stat-next {
  color: var(--rc, #e8c040);
  text-shadow: 0 0 8px color-mix(in srgb, var(--rc, #e8c040) 45%, transparent);
}

.ps-stat-gain {
  font-size: clamp(0.6rem, 0.9vh, 0.74rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

/* Level-Up hero wrapper — sits between the sun and the name/HP unit, centered.
   Enlarged CTA. (Reuses .ps-dock-buy for the badge + hover-fade behaviour.) */
.ps-hero-buy {
  position: relative;
  margin: 0 0 clamp(0.5rem, 1.1vh, 0.9rem);
  min-width: 0;
  width: clamp(260px, 30vw, 400px);
  align-self: center;
}

.ps-hero-buy .ps-level-btn {
  padding: clamp(0.6rem, 1.1vh, 0.95rem) 0.9rem clamp(0.55rem, 1vh, 0.85rem);
}

.ps-hero-buy .ps-level-btn-main {
  font-size: clamp(1.2rem, 2vh, 1.65rem);
}

.ps-hero-buy .ps-level-btn-cost {
  font-size: clamp(1rem, 1.55vh, 1.25rem);
}

.ps-hero-buy .ps-level-chime {
  width: clamp(19px, 2.5vh, 25px);
  height: clamp(19px, 2.5vh, 25px);
}

/* ── Leerstate ─────────────────────────────────────────────────────────────── */
.ps-empty {
  position: relative; /* paints above the ps-detail cosmic backdrop */
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
/* container-type: size lets the card's own content scale with its height/width
   (cqh/cqw) so every slot uses its full box on Full HD → 4K alike. */
.ps-slot-btn {
  position: relative;
  container-type: size;
  display: flex;
  flex: 1 1 0;
  min-height: clamp(64px, 9vh, 140px);
  flex-direction: row;
  align-items: center;
  gap: clamp(10px, 0.8vw, 18px);
  padding: clamp(8px, 1.2vh, 18px) clamp(10px, 0.8vw, 18px);
  min-width: 0;
  text-align: left;
  background: linear-gradient(160deg, #17140d 0%, #100e08 100%);
  border: 1px solid #2e1e0a;
  border-radius: var(--bp-radius);
  cursor: pointer;
  color: inherit;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

/* Left color accent — lights up in the planet's role color on hover/active */
.ps-slot-btn::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--rc, transparent);
  border-radius: var(--bp-radius) 0 0 var(--bp-radius);
  opacity: 0;
  transition: opacity 180ms ease;
  pointer-events: none;
}

.ps-slot-btn:hover::before,
.ps-slot-btn--active::before {
  opacity: 0.95;
  box-shadow: 0 0 10px var(--rc, transparent);
}

.ps-slot-icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.ps-slot-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(4px, 0.6vh, 9px);
  min-width: 0;
  flex: 1;
}

/* Header row: orbit label on the left, level badge pushed right */
.ps-slot-info-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.ps-slot-lvl-badge {
  flex-shrink: 0;
  padding: 2px clamp(6px, 0.5vw, 11px);
  font-size: clamp(0.66rem, 0.95vh, 0.86rem);
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 1.35;
  color: #ffe9a8;
  background: linear-gradient(to bottom, #3a2a10, #241806);
  border: 1px solid #5c3310;
  border-radius: 4px;
  white-space: nowrap;
}

.ps-slot-btn--active .ps-slot-lvl-badge {
  color: #fff2c8;
  border-color: var(--rc, #6ec040);
  box-shadow: 0 0 8px color-mix(in srgb, var(--rc, #6ec040) 40%, transparent);
}

.ps-slot-sub {
  font-size: clamp(0.9rem, 1.2vh, 1.25rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgba(200, 160, 80, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
}

.ps-slot-btn:hover {
  background: linear-gradient(160deg, #1d1911 0%, #14110a 100%);
  border-color: #5c3310;
  transform: translateY(-1px);
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

/* ── Per-slot affordable-upgrade notify badge (top-right, clear of buff) ─────── */
.ps-slot-notify {
  position: absolute;
  top: -7px;
  right: -7px;
  z-index: 3;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  color: #06301f;
  background: linear-gradient(135deg, #34d399, #059669);
  border: 1.5px solid #6ee7b7;
  border-radius: 9px;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.65);
  pointer-events: none;
  animation: ps-buy-badge-pulse 1.6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ps-slot-notify {
    animation: none;
  }
}

/* ── Sidebar jungle-buff highlight — prominent, overlay-only (no layout shift) ── */
.ps-slot-btn--buffed {
  background: #0f1a0c;
  border-color: #5ce66a;
  animation: ps-buff-pulse 1.8s ease-in-out infinite;
}

/* Buff overrides the active border colour but keeps the buff language */
.ps-slot-btn--buffed.ps-slot-btn--active {
  border-color: #5ce66a;
}

/* Animated aura ring drawn over the button edge */
.ps-slot-buff-ring {
  position: absolute;
  inset: 0;
  border: 2px solid #5ce66a;
  border-radius: var(--bp-radius);
  pointer-events: none;
  box-shadow:
    0 0 14px #5ce66a55,
    inset 0 0 10px #5ce66a22;
  animation: ps-slot-buff-ring 1.8s ease-in-out infinite;
}

@keyframes ps-slot-buff-ring {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

/* Modern RPG buff medallion — pinned to the slot's top-LEFT, overlapping the
   edge (opposite corner from the notify badge → never collide). Flat dark green
   pill with a framed leaf emblem, glowing multiplier and a segmented timer. */
.ps-slot-buff-badge {
  position: absolute;
  top: -9px;
  left: -8px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px 2px 2px;
  background: linear-gradient(135deg, #16281a 0%, #0a130c 100%);
  border: 1px solid #4aa050;
  border-radius: 5px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.55),
    0 0 10px #5ce66a44,
    inset 0 1px 0 #5ce66a33;
  pointer-events: none;
}

/* Framed leaf emblem — a compact medallion inside the pill */
.ps-slot-buff-emblem {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  background: radial-gradient(circle at 50% 38%, #1c3a20 0%, #0a150c 100%);
  border: 1px solid #3a8040;
  border-radius: 4px;
  box-shadow: inset 0 0 6px #5ce66a33;
}

.ps-slot-buff-leaf {
  width: 18px;
  height: 18px;
  object-fit: contain;
  image-rendering: auto;
  filter: drop-shadow(0 0 3px #5ce66aaa);
}

.ps-slot-buff-mult {
  font-size: 0.92rem;
  font-weight: 900;
  color: #7cf089;
  text-shadow: 0 0 6px #5ce66a66;
  line-height: 1;
}

.ps-slot-buff-timer {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #bdf0a8;
  background: #0a150c;
  border: 1px solid #2a5a2e;
  border-radius: 3px;
  padding: 1px 4px;
  line-height: 1.4;
}

/* Planet image — bare planet, no frame/token; scales with the card box (height
   & width), capped so it never crowds the text on a narrow rail nor balloons. */
.ps-slot-btn-img {
  width: clamp(48px, min(62cqh, 36cqw), 108px);
  height: clamp(48px, min(62cqh, 36cqw), 108px);
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55));
}

.ps-slot-btn--active .ps-slot-btn-img {
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--rc, #52b830) 45%, transparent));
}

.ps-slot-btn-placeholder {
  width: clamp(40px, min(52cqh, 30cqw), 92px);
  height: clamp(40px, min(52cqh, 30cqw), 92px);
  display: grid;
  place-items: center;
  font-size: clamp(1.6rem, 6cqh, 2.6rem);
  line-height: 1;
  color: rgba(90, 142, 224, 0.4);
  border-radius: 50%;
  border: 1px dashed rgba(90, 142, 224, 0.3);
  background: radial-gradient(circle at 50% 38%, #14140e 0%, #0c0a06 100%);
}

.ps-slot-btn-label {
  font-size: clamp(0.85rem, 1.1vh, 1.15rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.ps-slot-btn--active .ps-slot-btn-label {
  color: var(--rc, #52b830);
}

/* ── Rail slot HP — modern segmented bar with health-state color ───────────── */
.ps-slot-hp {
  --hp-a: #2f9a24;
  --hp-b: #6ee04a;
  --hp-glow: #5ce66a;
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  margin-top: 1px;
}

.ps-slot-hp--high {
  --hp-a: #2f9a24;
  --hp-b: #6ee04a;
  --hp-glow: #5ce66a;
}
.ps-slot-hp--mid {
  --hp-a: #b8860f;
  --hp-b: #f0c840;
  --hp-glow: #e8c040;
}
.ps-slot-hp--low {
  --hp-a: #b32626;
  --hp-b: #e85040;
  --hp-glow: #e84040;
}

.ps-slot-hp-track {
  position: relative;
  flex: 1;
  min-width: 0;
  height: clamp(13px, 1.5vh, 22px);
  background: #241512;
  border: 1px solid #12100c;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.65);
}

/* Segment ticks (count driven by HP_BAR_SEGMENTS via --hp-seg on the root) */
.ps-slot-hp-track::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(100% / var(--hp-seg, 8) - 1px),
    rgba(0, 0, 0, 0.45) calc(100% / var(--hp-seg, 8) - 1px),
    rgba(0, 0, 0, 0.45) calc(100% / var(--hp-seg, 8))
  );
}

.ps-slot-hp-fill {
  position: relative;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--hp-b), var(--hp-a));
  box-shadow: 0 0 6px color-mix(in srgb, var(--hp-glow) 45%, transparent);
  transition:
    width 0.35s ease,
    background 0.35s ease;
}

/* Glossy top highlight */
.ps-slot-hp-fill::before {
  content: '';
  position: absolute;
  inset: 0 0 55% 0;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.42), transparent);
  border-radius: 2px 2px 0 0;
}

.ps-slot-hp-val {
  flex-shrink: 0;
  font-size: clamp(0.74rem, 1vh, 1rem);
  font-weight: 800;
  color: var(--hp-glow);
  text-shadow: 0 0 6px color-mix(in srgb, var(--hp-glow) 40%, transparent);
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;
}

/* Low HP → gentle pulse to draw the eye (shared keyframe with the stage bar) */
.ps-slot-hp--low .ps-slot-hp-fill {
  animation: ps-hp-low-pulse 1.3s ease-in-out infinite;
}

@keyframes ps-hp-low-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.45);
  }
}

/* ── Hero-Body (Planet oben, Rollen-Grid unten) ────────────────────────────── */
/* ── Stage: centered planet over a cosmic backdrop ─────────────────────────── */
.ps-stage {
  --rc: #e8c040;
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  overflow: hidden;
}

/* Sun + orbiting planet share one centered system. Fills whatever height the
   stage has left; a container query lets the sun scale to the real free space
   instead of fixed pixels, so nothing ever overflows. */
.ps-system {
  position: relative;
  z-index: 1;
  width: 100%;
  flex: 1;
  min-height: 160px;
  container-type: size;
}

/* Big sun rendered in the CURRENT phase's colors (mirrors SunComponent palette) */
.ps-stage-sun {
  position: absolute;
  top: 50%;
  left: 50%;
  /* Diameter scales with the current Sun-Phase (see sunPhaseStyle), capped by
     the system container's smaller edge so it always fits the free space.
     Smooth transition so phase changes grow/shrink the sun. */
  width: min(var(--ps-sun-d, 380px), 96cqmin);
  height: min(var(--ps-sun-d, 380px), 96cqmin);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  transition: width 1.2s ease, height 1.2s ease;
  background:
    radial-gradient(
      circle at 42% 38%,
      color-mix(in srgb, white 92%, var(--phase-core, #fff)) 0%,
      transparent 22%
    ),
    /* opaque inner disk (out to ~52%) so the planet is hidden when behind it */
    radial-gradient(
      circle at 50% 50%,
      var(--phase-core, #fff0e0) 0%,
      var(--phase-mid, #ffd4a3) 34%,
      var(--phase-edge, #cc5500) 52%,
      color-mix(in srgb, var(--phase-edge, #cc5500) 45%, transparent) 70%,
      transparent 86%
    );
  box-shadow:
    0 0 90px color-mix(in srgb, var(--phase-glow, #ff8c42) 55%, transparent),
    0 0 180px color-mix(in srgb, var(--phase-glow, #ff8c42) 28%, transparent);
  /* z above the planet's "far" half so the planet can pass behind the sun */
  z-index: 1;
  animation: ps-sun-pulse var(--pulse-speed, 5s) ease-in-out infinite;
}

/* ── Comet mode: the origin rock replaces the sun as the central body ──────── */
/* Responsive size override (the component's diameter prop is static px);
   z-index 1 so the planet's far arc (z 0) passes BEHIND the rock. */
.ps-system--comet :deep(.comet-root) {
  width: min(200px, 62cqmin);
  height: min(200px, 62cqmin);
  z-index: 1;
}

/* The comet is far smaller than a sun — tighten the orbit and shrink the
   planet so the path visually belongs to the rock it circles. */
.ps-system--comet .ps-planet-preview-wrap {
  --orb-x: min(122px, 40cqmin);
  --orb-y: min(34px, 11cqmin);
}

.ps-system--comet .ps-planet-preview-img {
  width: min(64px, 17cqmin);
  height: min(64px, 17cqmin);
}

/* Planet revolves around the sun on a tilted ellipse, with depth (near = larger
   & in front, far = smaller & behind the sun) so it reads as a real orbit. */
.ps-planet-preview-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  /* Orbit radii shrink with the container (like the sun) so the far-arc z-swap
     always happens at the sun's rim, never outside it. */
  --orb-x: min(150px, 46cqmin);
  --orb-y: min(40px, 12.5cqmin);
  transform: translate(-50%, -50%);
  /* 26s must match ORBIT_PERIOD_SEC in the script (per-slot phase offset). */
  animation: ps-planet-orbit 26s linear infinite;
  animation-delay: var(--orbit-delay, 0s);
}

@keyframes ps-sun-pulse {
  0%, 100% { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
}

/* Tilted ellipse (rx = --orb-x, ry = --orb-y). Front/lower arc (in front of sun)
   takes ~70% of the loop → slow & large; back/upper arc (behind the sun) ~30% →
   fast, small, fully occluded by the opaque sun core, vanishing one side &
   reappearing the other. 0.707 ≈ cos/sin 45° on the ellipse. */
@keyframes ps-planet-orbit {
  0% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -1), 0) scale(1);
    z-index: 3;
  }
  17.5% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -0.707), calc(var(--orb-y) * 0.707)) scale(1.08);
    z-index: 3;
  }
  35% {
    transform: translate(-50%, -50%) translate(0, var(--orb-y)) scale(1.15);
    z-index: 3;
  }
  52.5% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * 0.707), calc(var(--orb-y) * 0.707)) scale(1.08);
    z-index: 3;
  }
  70% {
    transform: translate(-50%, -50%) translate(var(--orb-x), 0) scale(1);
    z-index: 3;
  }
  71% {
    transform: translate(-50%, -50%) translate(var(--orb-x), -1px) scale(0.98);
    z-index: 0;
  }
  82% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * 0.707), calc(var(--orb-y) * -0.707)) scale(0.78);
    z-index: 0;
  }
  90% {
    transform: translate(-50%, -50%) translate(0, calc(var(--orb-y) * -1)) scale(0.55);
    z-index: 0;
  }
  95% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -0.707), calc(var(--orb-y) * -0.707)) scale(0.72);
    z-index: 0;
  }
  99% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -1), -1px) scale(0.98);
    z-index: 0;
  }
  100% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -1), 0) scale(1);
    z-index: 3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ps-stage-sun,
  .ps-planet-preview-wrap {
    animation: none;
  }
}

/* Readout (name + chip + hp) sits above the backdrop, below the system */
.ps-stage > .ps-planet-readout {
  position: relative;
  z-index: 1;
}

/* Name + HP form one tight unit — the type name reads as the HP bar's title */
.ps-planet-readout {
  --rc: #e8c040;
  width: 100%;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
}

/* ── Config target chip ────────────────────────────────────────────────────── */
.ps-config-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.4rem 0.8rem;
  background: #16140e;
  border: 1px solid color-mix(in oklch, var(--rc) 55%, #3a2a10);
  border-radius: 4px;
  color: #d4c89a;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    transform 180ms ease;
}

.ps-config-chip:hover {
  background: #1c1a12;
  border-color: var(--rc);
  transform: translateY(-1px);
}

.ps-config-chip-verb {
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.7rem;
}

.ps-config-chip-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  image-rendering: pixelated;
}

.ps-config-chip-name {
  color: var(--rc);
  font-weight: 800;
}

.ps-config-chip-caret {
  color: var(--rc);
  font-size: 0.7rem;
}

/* ── Attunement upgrade dock (slim bar under the stage) ─────────────────────── */
/* One row: status | effect preview | buy. Frameless — integrated via a gold
   separator on top, so the stage above keeps nearly all the vertical space.
   flex-wrap + the effect zone's flex-basis make it reflow on narrow panels
   without any breakpoints. */
.ps-dock {
  --rc: #e8c040;
  position: relative; /* paints above the ps-detail cosmic backdrop */
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  padding: 0.5rem 1rem;
  background: #131009;
  border-top: 3px solid transparent;
  border-image: linear-gradient(
      to right,
      transparent,
      #5c3310 10%,
      #c89040 30%,
      #f0d060 50%,
      #c89040 70%,
      #5c3310 90%,
      transparent
    )
    1;
}

/* Zone 1: level + rank, stacked tight */
.ps-dock-status {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.1rem;
}

/* Zone 2: effect + HP preview — takes the flexible middle, wraps below when
   the panel gets too narrow for one row */
.ps-dock-effect {
  flex: 1 1 240px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.3rem;
}

/* Zone 3: Max button — vertically centered in the footer band */
.ps-dock-buy {
  position: relative;
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 0.25rem;
  min-width: 190px;
}

/* Footer notify badge — pulses over the Level-Up button while an upgrade is
   affordable, and steps aside (fades) the moment the button is hovered. */
.ps-buy-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 5;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  color: #06301f;
  background: linear-gradient(135deg, #34d399, #059669);
  border: 1.5px solid #6ee7b7;
  border-radius: 10px;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.7);
  pointer-events: none;
  animation: ps-buy-badge-pulse 1.6s ease-in-out infinite;
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.ps-dock-buy:hover .ps-buy-badge {
  opacity: 0;
  animation: none;
}

@keyframes ps-buy-badge-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 5px rgba(52, 211, 153, 0.5);
  }
  50% {
    transform: scale(1.18);
    box-shadow:
      0 0 12px rgba(52, 211, 153, 0.95),
      0 0 20px rgba(5, 150, 105, 0.5);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ps-buy-badge {
    animation: none;
  }
}

/* Star-fight return CTA floats in the bottom-right corner (footer is gone), clear
   of the bottom-center hero. Overrides the component's default centered anchor. */
.ps-detail :deep(.brb) {
  left: auto;
  right: clamp(14px, 1.5vw, 28px);
  bottom: clamp(14px, 1.6vh, 26px);
  transform: none;
}

.ps-detail :deep(.brb:hover) {
  transform: translateY(-1px);
}

.ps-detail :deep(.brb:active) {
  transform: scale(0.97);
}

.ps-detail :deep(.brb-slide-enter-from),
.ps-detail :deep(.brb-slide-leave-to) {
  transform: translateY(12px);
}

/* Target value + its "after +N" tag stay glued together when the row wraps */
.ps-preview-next-wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  white-space: nowrap;
}

/* Marks the preview target as the post-Max state ("after +N") */
.ps-preview-gain {
  font-size: clamp(0.68rem, 1vh, 0.82rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
}

/* Back-compat alias retained for shared inner rules */
.ps-level-block {
  --rc: #e8c040;
}

/* Modern level readout: small muted caps label over a big bold number */
.ps-level-label {
  font-size: clamp(0.72rem, 1vh, 0.9rem);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}

.ps-level-value {
  font-size: clamp(2rem, 2.8vh, 2.7rem);
  font-weight: 800;
  line-height: 0.9;
  color: #e8c040;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.4);
  font-variant-numeric: tabular-nums;
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
  gap: 2px;
  padding: 0.4rem 0.5rem 0.36rem;
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
  font-size: clamp(1.02rem, 1.5vh, 1.28rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.1;
}

.ps-level-btn-cost {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(0.9rem, 1.3vh, 1.08rem);
  font-weight: 700;
  opacity: 0.95;
}

.ps-level-chime {
  width: clamp(17px, 2.2vh, 22px);
  height: clamp(17px, 2.2vh, 22px);
  image-rendering: pixelated;
}

.ps-level-cost-sep {
  opacity: 0.5;
  margin: 0 1px;
}

/* Phase-lock requirement shown inline on the button's second line (keeps the
   footer height fixed — no free-flowing hint that grows the layout). */
.ps-level-btn-cost--req {
  gap: 4px;
  white-space: nowrap;
}

.ps-level-req-icon {
  color: #ffd76a;
}

/* ── Effect preview rows ───────────────────────────────────────────────────── */
.ps-preview-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: clamp(0.95rem, 1.5vh, 1.2rem);
  font-weight: 700;
  min-width: 0;
  line-height: 1.15;
  flex-wrap: wrap;
}

.ps-preview-label {
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: clamp(0.72rem, 1.1vh, 0.9rem);
  font-weight: 800;
  padding: 0.1rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.ps-preview-now {
  color: #e2d6ab;
}

.ps-preview-arrow {
  color: var(--rc, #e8c040);
  font-weight: 900;
  font-size: 1.15em;
}

.ps-preview-next {
  color: var(--rc, #e8c040);
  font-weight: 800;
  text-shadow: 0 0 8px color-mix(in oklch, var(--rc, #e8c040) 45%, transparent);
}

/* ── Permanent role choice ─────────────────────────────────────────────────── */
.ps-choose {
  position: relative; /* paints above the ps-detail cosmic backdrop */
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.8rem;
  padding: 1rem 1.2rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
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
  --hp-a: #2f9a24;
  --hp-b: #6ee04a;
  --hp-glow: #5ce66a;
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
}

.ps-planet-hp--high {
  --hp-a: #2f9a24;
  --hp-b: #6ee04a;
  --hp-glow: #5ce66a;
}
.ps-planet-hp--mid {
  --hp-a: #b8860f;
  --hp-b: #f0c840;
  --hp-glow: #e8c040;
}
.ps-planet-hp--low {
  --hp-a: #b32626;
  --hp-b: #e85040;
  --hp-glow: #e84040;
}

.ps-planet-hp-text {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ps-hp-values {
  font-size: 1.25rem;
  font-weight: 800;
  color: #f0e6c8;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}

.ps-hp-pct {
  margin-left: auto;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--hp-glow);
  text-shadow: 0 0 10px color-mix(in srgb, var(--hp-glow) 45%, transparent);
  font-variant-numeric: tabular-nums;
}

.ps-hp-bar-track {
  position: relative;
  width: 100%;
  height: 30px;
  background: #241512;
  border: 2px solid #0e0c08;
  border-radius: 5px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.7),
    0 1px 0 rgba(255, 255, 255, 0.04);
}

/* Segment ticks (count driven by HP_BAR_SEGMENTS via --hp-seg on the root) */
.ps-hp-bar-track::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(100% / var(--hp-seg, 8) - 1.5px),
    rgba(0, 0, 0, 0.5) calc(100% / var(--hp-seg, 8) - 1.5px),
    rgba(0, 0, 0, 0.5) calc(100% / var(--hp-seg, 8))
  );
}

.ps-hp-bar-fill {
  position: relative;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(to bottom, var(--hp-b), var(--hp-a));
  box-shadow: 0 0 10px color-mix(in srgb, var(--hp-glow) 55%, transparent);
  transition:
    width 0.35s ease,
    background 0.35s ease;
}

/* Glossy top shine over the fill */
.ps-hp-bar-shine {
  position: absolute;
  inset: 0;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.45),
    rgba(255, 255, 255, 0.05) 45%,
    transparent 60%
  );
  pointer-events: none;
}

.ps-planet-hp--low .ps-hp-bar-fill {
  animation: ps-hp-low-pulse 1.2s ease-in-out infinite;
}

/* ── Planetenbild ──────────────────────────────────────────────────────────── */
/* (positioning handled by the .ps-planet-preview-wrap rule in the stage section) */
.ps-planet-preview-img {
  /* Deliberately small so the sun clearly dominates; capped alongside the sun
     so it shrinks with the free space. Orbit depth-scaling then yields a larger
     near pass and a smaller far pass. */
  width: min(var(--ps-planet-d, 96px), 24cqmin);
  height: min(var(--ps-planet-d, 96px), 24cqmin);
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.55));
}

/* ── Rollenname (planet-type title above the HP bar) ───────────────────────── */
.ps-planet-role-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  font-size: clamp(1.5rem, 2.4vw, 2.1rem);
  font-weight: 800;
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;
  line-height: 1;
  color: var(--rc, #e8c040);
  text-shadow:
    0 0 18px color-mix(in srgb, var(--rc, #e8c040) 55%, transparent),
    0 2px 4px rgba(0, 0, 0, 0.6);
}

/* Flanking accent rules on either side of the name → framed, modern title */
.ps-planet-role-label::before,
.ps-planet-role-label::after {
  content: '';
  width: clamp(24px, 5vw, 60px);
  height: 2px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--rc, #e8c040) 80%, transparent)
  );
  box-shadow: 0 0 8px color-mix(in srgb, var(--rc, #e8c040) 45%, transparent);
}

/* Right rule mirrors the gradient direction */
.ps-planet-role-label::after {
  background: linear-gradient(
    to left,
    transparent,
    color-mix(in srgb, var(--rc, #e8c040) 80%, transparent)
  );
}

/* ── Jungle Buff — full-panel takeover (edge veil + centered banner) ─────────── */
/* Overlay fills the whole detail panel but never eats clicks: pointer-events are
   off, so the upgrade dock underneath stays fully usable. */
.ps-buff-overlay {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

/* Emerald rim veil — dense at the border, fully transparent through the middle
   so the sun + orbiting planet read cleanly. A pulsing inset glow + a soft edge
   wash sell the "charged" state. */
.ps-buff-veil-edge {
  position: absolute;
  inset: 0;
  border: 2px solid #5ce66a;
  background: radial-gradient(
    118% 92% at 50% 50%,
    transparent 52%,
    rgba(92, 230, 106, 0.06) 74%,
    rgba(92, 230, 106, 0.16) 90%,
    rgba(92, 230, 106, 0.28) 100%
  );
  box-shadow:
    inset 0 0 6px 1px rgba(92, 230, 106, 0.4),
    inset 0 0 55px 8px rgba(92, 230, 106, 0.16),
    inset 0 0 120px 26px rgba(92, 230, 106, 0.1);
  animation: ps-buff-veil-pulse 2.2s ease-in-out infinite;
}

@keyframes ps-buff-veil-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* Centered top banner — bold, high-contrast, readable across every desktop res. */
.ps-buff-banner {
  position: absolute;
  top: clamp(12px, 2.4vh, 26px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: clamp(10px, 1vw, 16px);
  padding: clamp(7px, 0.9vh, 12px) clamp(14px, 1.1vw, 22px) clamp(7px, 0.9vh, 12px)
    clamp(9px, 0.8vw, 14px);
  background: linear-gradient(135deg, #163d20 0%, #0a1a0e 100%);
  border: 2px solid #5ce66a;
  border-radius: 5px;
  box-shadow:
    0 6px 22px rgba(0, 0, 0, 0.6),
    0 0 22px rgba(92, 230, 106, 0.4),
    inset 0 1px 0 rgba(160, 240, 128, 0.35);
  white-space: nowrap;
}

/* Framed leaf emblem */
.ps-buff-banner-emblem {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(38px, 4.4vh, 56px);
  height: clamp(38px, 4.4vh, 56px);
  background: radial-gradient(circle at 50% 36%, #1e4425 0%, #0a180d 100%);
  border: 1px solid #5ce66a;
  border-radius: 5px;
  box-shadow: inset 0 0 10px rgba(92, 230, 106, 0.35);
}

.ps-buff-banner-leaf {
  width: 78%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 0 5px rgba(92, 230, 106, 0.8));
}

.ps-buff-banner-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.1;
}

.ps-buff-banner-kicker {
  font-size: clamp(0.6rem, 1.1vh, 0.78rem);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7fdc8f;
}

.ps-buff-banner-name {
  font-size: clamp(1.05rem, 2vh, 1.55rem);
  font-weight: 900;
  letter-spacing: 0.01em;
  color: #eafff0;
  text-shadow: 0 0 10px rgba(92, 230, 106, 0.55);
}

.ps-buff-banner-mult {
  font-size: clamp(0.72rem, 1.25vh, 0.92rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #5ce66a;
}

/* Big countdown block — the "how long is left" the request calls out. */
.ps-buff-banner-timer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: clamp(52px, 5vw, 76px);
  margin-left: clamp(2px, 0.4vw, 8px);
  padding: clamp(3px, 0.5vh, 7px) clamp(8px, 0.7vw, 12px);
  background: rgba(6, 20, 10, 0.72);
  border: 1px solid #3a8040;
  border-radius: 5px;
}

.ps-buff-banner-secs {
  font-size: clamp(1.35rem, 2.9vh, 2.1rem);
  font-weight: 900;
  line-height: 1;
  color: #6ee7b7;
  text-shadow: 0 0 12px rgba(92, 230, 106, 0.6);
  font-variant-numeric: tabular-nums;
}

.ps-buff-banner-unit {
  margin-top: 2px;
  font-size: clamp(0.56rem, 1vh, 0.72rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8fd8a0;
}

/* Veil + banner enter/leave */
.ps-buff-veil-enter-active,
.ps-buff-veil-leave-active {
  transition: opacity 260ms ease;
}

.ps-buff-veil-enter-active .ps-buff-banner,
.ps-buff-veil-leave-active .ps-buff-banner {
  transition:
    opacity 260ms ease,
    transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ps-buff-veil-enter-from,
.ps-buff-veil-leave-to {
  opacity: 0;
}

.ps-buff-veil-enter-from .ps-buff-banner,
.ps-buff-veil-leave-to .ps-buff-banner {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .ps-buff-veil-edge {
    animation: none;
  }
}

/* Pulsing green glow on the orbiting planet itself — follows it on its path. */
.ps-planet-preview-img--buffed {
  animation: ps-planet-buff-glow 1.8s ease-in-out infinite;
}

@keyframes ps-planet-buff-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 8px #5ce66a66);
  }
  50% {
    filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 20px #5ce66acc);
  }
}

/* Shared buff pulse (stage chip + sidebar aura) — subtle, idle-friendly. */
@keyframes ps-buff-pulse {
  0%,
  100% {
    box-shadow:
      0 0 8px #5ce66a33,
      inset 0 0 6px #5ce66a14;
  }
  50% {
    box-shadow:
      0 0 16px #5ce66a77,
      inset 0 0 8px #5ce66a22;
  }
}

/* Stage chip enter/leave */
/* ── Config-Sektion ────────────────────────────────────────────────────────── */
/* ── Config picker popover ─────────────────────────────────────────────────── */
.ps-pop-scrim {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.72);
}

.ps-pop {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 460px;
  max-height: 80%;
  /* Rahmen kommt als SVG-Overlay (RpgFrame) — Scroll liegt jetzt im Grid,
     damit der Rahmen beim Scrollen stehen bleibt */
  overflow: hidden;
  background: #16140e;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.85);
  border-radius: 5px;
  padding: 1rem 1.1rem 1.2rem;
}

.ps-pop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
  padding-bottom: 0.55rem;
  border-bottom: 2px solid #5c3310;
}

.ps-pop-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #f0d060;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ps-pop-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1c1c18;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #cc6050;
  font-size: 0.9rem;
  font-weight: 900;
  cursor: pointer;
  transition: filter 150ms ease;
}

.ps-pop-close:hover {
  filter: brightness(1.3);
}

/* Popover transition */
.ps-pop-enter-active,
.ps-pop-leave-active {
  transition: opacity 0.18s ease;
}
.ps-pop-enter-from,
.ps-pop-leave-to {
  opacity: 0;
}

.ps-config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.55rem;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
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

/* ── Planet-Orbit-Wrapper Transition (per-slot swap) ───────────────────────── */
/* Opacity lives on the wrapper (its transform is owned by the orbit keyframes,
   so it must never be transitioned there); the scale pop targets the inner img. */
.ps-planet-swap-enter-active {
  transition: opacity 0.2s ease;
}
.ps-planet-swap-leave-active {
  transition: opacity 0.15s ease;
}
.ps-planet-swap-enter-active .ps-planet-preview-img {
  transition: transform 0.2s ease;
}
.ps-planet-swap-enter-from {
  opacity: 0;
}
.ps-planet-swap-enter-from .ps-planet-preview-img {
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
  display: grid;
  place-items: center;
  opacity: 0.75;
}
.ps-slot-btn-lock .lock-icon {
  width: clamp(30px, min(40cqh, 24cqw), 60px);
  height: clamp(30px, min(40cqh, 24cqw), 60px);
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
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(0.75rem, 1vh, 0.95rem);
  font-weight: 800;
  color: rgba(200, 160, 60, 0.6);
  letter-spacing: 0.03em;
  line-height: 1.1;
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
  position: relative; /* paints above the ps-detail cosmic backdrop */
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
  width: 48px;
  height: 48px;
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
  width: 40px;
  height: 40px;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 10px rgba(232, 192, 64, 0.7));
  animation: ps-chime-bob 2s ease-in-out infinite;
}

.ps-locked-panel-cost {
  font-size: clamp(28px, 4.5vh, 40px);
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

/* ── Narrow-window fallback ─────────────────────────────────────────────────── */
/* Below common desktop widths the three dock zones would squeeze each other —
   stack them and let the detail column scroll while the stage keeps a sane
   minimum height. */
@media (max-width: 950px) {
  .ps-detail {
    overflow-y: auto;
  }

  .ps-stage {
    flex: none;
  }

  .ps-system {
    flex: none;
    height: clamp(240px, 42vh, 400px);
  }

  .ps-role-grid--choose {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
