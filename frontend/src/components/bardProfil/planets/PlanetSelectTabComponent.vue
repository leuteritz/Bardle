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
  isPlanetDown,
} from '@/stores/planetShopStore'
import type { PlanetRole, PlanetRoleType, PlanetSlot } from '@/stores/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import BattleReturnButton from '@/components/bardProfil/BattleReturnButton.vue'
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
  MATERIAL_RARITY_COLOR,
  PLANET_TAB_ORBIT_PERIOD_SEC,
  PLANET_RESPAWN_MS,
} from '@/config/constants'
import {
  initialOrbitAngle,
  orbitEclipsePhase,
  orbitTierForSlotIndex,
  planetOrbitPhases,
} from '@/utils/planetOrbitPhase'
import { playerSlotInForeground } from '@/utils/foregroundGate'
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
  // Auch die abgeleitete Erst-Auswahl wandert in den Store: das Command Panel
  // markiert dieselbe Kachel und darf dafür nicht auf den ersten Klick warten.
  if (selectedSlotId.value) uiStore.setPlanetActiveSlot(selectedSlotId.value)
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
  uiStore.setPlanetActiveSlot(id)
}

const activeSlot = computed(() => {
  if (!selectedSlotId.value) return null
  return store.slots.find((s) => s.id === selectedSlotId.value) ?? null
})

const activeSlotIndex = computed(() =>
  store.slots.findIndex((s) => s.id === selectedSlotId.value),
)

// ── Orbit-Phase — gespiegelt aus dem Idle-Orbit ────────────────────────────
// Der Idle-Layer zeichnet zwar nicht, während dieser Tab offen ist, simuliert
// aber weiter (useRenderingPaused → isIdleSimulationPaused). Er ist damit die
// EINZIGE Quelle der Bahnwinkel; dieser Tab liest sie nur und übersetzt sie in
// den Fortschritt der Keyframe-Animation. Selbst weiterdrehen dürfte er nicht —
// beide Loops zusammen würden den Orbit doppelt so schnell laufen lassen.
// Reihenfolge und Filter müssen exakt PlanetOrbit.vue entsprechen: der Index in
// dieser Liste bestimmt, auf welchem Orbit-Tier (und damit welcher Ellipse) der
// Slot läuft.
const orbitSlots = computed(() => store.purchasedSlots.filter((s) => s.role !== null))

const planetOrbitEl = ref<HTMLElement | null>(null)
/** Aktiver Planet steht gerade hinter der Sonne — treibt die Eclipse-Darstellung. */
const orbitBehind = ref(false)

/**
 * Alle Slots, die gerade hinter der Sonne stehen — treibt die Sidebar-Kacheln.
 * Gefüllt aus derselben rAF-Schleife wie `orbitBehind` und aus derselben
 * Positions-Map wie das Command Panel, damit alle drei Anzeigen im selben Frame
 * umschalten. Ein reaktives Set statt eines Computeds: die Positions-Map ist
 * bewusst nicht reaktiv, und ein Re-Render soll nur beim Zustandswechsel
 * ausgelöst werden, nicht 60-mal pro Sekunde.
 */
const eclipsedSlotIds = ref<ReadonlySet<string>>(new Set())

function syncEclipsedSlots() {
  const cur = eclipsedSlotIds.value
  const next = new Set<string>()
  for (const slot of store.slots) {
    if (slot.purchased && slot.role && !playerSlotInForeground(slot.id)) next.add(slot.id)
  }
  if (next.size !== cur.size || [...next].some((id) => !cur.has(id))) {
    eclipsedSlotIds.value = next
  }
}

/**
 * Zerstört schlägt Eclipse: Ein Wrack ist gar nicht mehr im Orbit, "hinter der
 * Sonne" wäre die falsche Aussage — dieselbe Rangfolge wie auf der Bühne und im
 * Command Panel.
 */
function isSlotEclipsed(slot: PlanetSlot): boolean {
  return eclipsedSlotIds.value.has(slot.id) && !isPlanetDown(slot)
}

function orbitDelayFor(progress: number): string {
  return `-${(progress * PLANET_TAB_ORBIT_PERIOD_SEC).toFixed(3)}s`
}

function orbitProgressOf(slotId: string | null): number {
  const slots = orbitSlots.value
  const idx = slotId ? slots.findIndex((s) => s.id === slotId) : -1
  if (idx < 0) return 0
  const { ratio, tiltRad } = orbitTierForSlotIndex(idx)
  const angle = planetOrbitPhases.get(slots[idx].id)?.angle ?? initialOrbitAngle(idx, slots.length)
  return orbitEclipsePhase(angle, slots[idx].direction, ratio, tiltRad)
}

// Wird nur bei Slot-Wechsel neu ausgewertet (die Phasen-Map ist bewusst nicht
// reaktiv) und gibt dem frisch eingeblendeten Planeten sofort die richtige
// Bahnposition, bevor der Frame-Loop übernimmt.
const orbitPhaseStyle = computed(() => ({
  '--orbit-delay': orbitDelayFor(orbitProgressOf(selectedSlotId.value)),
}))

let orbitFrame = 0

function tickOrbit() {
  const slotId = selectedSlotId.value
  // Direkt aufs Element statt über einen ref: 60 Re-Renders pro Sekunde dieser
  // großen Komponente nur für eine CSS-Variable wären Verschwendung.
  planetOrbitEl.value?.style.setProperty('--orbit-delay', orbitDelayFor(orbitProgressOf(slotId)))

  // Das Medaillon hängt an EXAKT derselben Quelle wie das im Command Panel —
  // dieselbe Positions-Map, im selben rAF-Takt gelesen. Ein eigener Nachbau der
  // Schwelle würde unweigerlich wieder auseinanderlaufen.
  const behind = slotId !== null && !playerSlotInForeground(slotId)
  if (orbitBehind.value !== behind) orbitBehind.value = behind

  // Im gleichen Frame wie die Bühne — sonst hinkte die Sidebar hinterher.
  syncEclipsedSlots()

  orbitFrame = requestAnimationFrame(tickOrbit)
}

onMounted(() => {
  orbitFrame = requestAnimationFrame(tickOrbit)
})
onUnmounted(() => {
  cancelAnimationFrame(orbitFrame)
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

// ── Zerstörter Planet: Ausfallzeit bis zur Rückkehr ────────────────────────
function downSecsLeftOf(slot: PlanetSlot): number {
  return Math.max(0, Math.ceil((slot.downUntilMs - now.value) / 1000))
}

/** Anteil der bereits abgelaufenen Ausfallzeit (0 … 1) — füllt den Respawn-Balken. */
function downProgressOf(slot: PlanetSlot): number {
  if (!isPlanetDown(slot)) return 0
  const remaining = Math.max(0, slot.downUntilMs - now.value)
  return Math.max(0, Math.min(1, 1 - remaining / PLANET_RESPAWN_MS))
}

const activeDown = computed(() => (activeSlot.value ? isPlanetDown(activeSlot.value) : false))
const activeDownSecsLeft = computed(() =>
  activeSlot.value ? downSecsLeftOf(activeSlot.value) : 0,
)
const activeDownProgress = computed(() =>
  activeSlot.value ? downProgressOf(activeSlot.value) : 0,
)

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

// ── HP-bar hover preview ────────────────────────────────────────────────────
// Hovering the upgrade button previews the post-level-up state: the effect chip
// pops up and the HP bar extends. On level-up the store grows currentHp by the
// exact Max-HP delta (see planetShopStore levelUpPlanetTimes), so the gained HP
// is always nextMaxHp − currentMaxHp. We render it as a bright "ghost" segment
// appended to the current fill, both scaled to the NEW max so the bar visibly
// lengthens even at full health.
const previewHover = ref(false)

// Hinter der Sonne oder zerstört: Level-Up gesperrt.
const levelUpBlocked = computed(() => orbitBehind.value || activeDown.value)

// Bei gesperrtem Level-Up wäre eine Vorschau auf den Zugewinn irreführend, also
// bleiben Effekt und HP-Bar auf den Ist-Werten.
const previewActive = computed(() => previewHover.value && !levelUpBlocked.value)

const hpGainAmount = computed(() => Math.max(0, nextMaxHp.value - currentMaxHp.value))

const hpPreviewCurrent = computed(() =>
  activeSlot.value ? activeSlot.value.currentHp + hpGainAmount.value : 0,
)

// Solid part of the preview fill (existing current HP), scaled to the new max.
const hpSolidPreviewPct = computed(() => {
  if (!activeSlot.value || nextMaxHp.value === 0) return 0
  return Math.max(0, Math.min(100, (activeSlot.value.currentHp / nextMaxHp.value) * 100))
})

// Ghost extension (the HP gained), sitting right after the solid part.
const hpGhostPreviewPct = computed(() => {
  if (nextMaxHp.value === 0) return 0
  const raw = (hpGainAmount.value / nextMaxHp.value) * 100
  return Math.max(0, Math.min(100 - hpSolidPreviewPct.value, raw))
})

const hpPreviewPct = computed(() =>
  Math.round(Math.min(100, (hpPreviewCurrent.value / (nextMaxHp.value || 1)) * 100)),
)

function attune(count: number) {
  // Hinter der Sonne oder zerstört ist der Planet außer Reichweite — der Button
  // ist dann deaktiviert, dieser Guard fängt Tastatur-/Programmauslösung mit ab.
  if (!activeSlot.value || levelUpBlocked.value) return
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

function rarityColorOf(rarity: string): string {
  return MATERIAL_RARITY_COLOR[rarity] ?? MATERIAL_RARITY_COLOR.common
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

// Descriptor for the target chip inside the effect line: what this planet
// currently harvests/boosts, plus the accent color (material → rarity tier,
// building → gold). The name has to stay short — it sits inline in a sentence,
// the longer `sub` only shows up in the chip's tooltip.
const configTarget = computed(() => {
  const role = activeSlot.value?.role
  if (role === 'harvest_node') {
    const m = selectedMaterial.value
    return {
      kicker: 'Harvesting',
      name: m?.name ?? 'Pick a material',
      sub: m ? `${capitalize(m.rarity)} material` : 'No material set yet',
      icon: m?.image ?? null,
      color: m ? rarityColorOf(m.rarity) : '#8a7a50',
      chosen: !!m,
    }
  }
  if (role === 'resonance_tower') {
    const b = selectedBuilding.value
    return {
      kicker: 'Boosting',
      name: b?.name ?? 'Pick a building',
      sub: b ? 'CPS booster building' : 'No building set yet',
      icon: b?.icon ?? null,
      color: b ? '#e8c040' : '#8a7a50',
      chosen: !!b,
    }
  }
  return null
})

// Selecting keeps the modal open so the player can compare options and read every
// description; a "Done" button / scrim / ✕ closes it.
function chooseMaterial(materialId: string) {
  if (!activeSlot.value) return
  store.setSlotConfig(activeSlot.value.id, { materialId })
}
function chooseBuilding(buildingId: string) {
  if (!activeSlot.value) return
  store.setSlotConfig(activeSlot.value.id, { buildingId })
}
</script>

<template>
  <div class="ps-tab" :style="[{ '--hp-seg': HP_BAR_SEGMENTS }, sunPhaseStyle]">
    <!-- ONE shared cosmic backdrop for the whole tab — rail and detail panel sit
         on the same continuous starfield instead of two separate surfaces. The
         phase vars live on this root, so the near stars carry the sun's tint
         across both columns. -->
    <CosmicStageBackground />

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
            'ps-slot-btn--down': isPlanetDown(slot),
            'ps-slot-btn--eclipsed': isSlotEclipsed(slot),
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

          <!-- Selection caret — a role-colored gem on the rail's inner edge that
               points at the detail panel, so "which orbit am I looking at" reads
               at a glance without a heavy 2px border swap (which would shift the
               card's inner layout by a pixel). -->
          <span v-if="selectedSlotId === slot.id" class="ps-slot-caret" aria-hidden="true" />

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
              <!-- Zerstört: Wrack-Emblem legt sich über das Planetenbild -->
              <span v-if="isPlanetDown(slot)" class="ps-slot-down-emblem" aria-hidden="true">
                <Icon icon="game-icons:fragmented-meteor" width="30" height="30" />
              </span>
              <!-- Hinter der Sonne: dasselbe Medaillon wie auf der Bühne und im
                   Command Panel, aus derselben Positions-Map im selben Frame —
                   bewusst ohne Transition, damit es exakt mit den anderen
                   beiden umschaltet. -->
              <span
                v-else-if="isSlotEclipsed(slot)"
                class="ps-slot-eclipse-emblem"
                title="Behind the Sun — out of reach"
              >
                <Icon icon="game-icons:eclipse-flare" width="32" height="32" />
              </span>
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
              <!-- Zerstört: Der Respawn-Balken ersetzt die HP-Leiste — eine
                   0-%-HP-Anzeige würde nur wie ein Sonderfall aussehen, statt
                   die eigentliche Information zu zeigen: wann er zurückkommt. -->
              <div v-if="isPlanetDown(slot)" class="ps-slot-down">
                <div class="ps-slot-down-track">
                  <div
                    class="ps-slot-down-fill"
                    :style="{ width: downProgressOf(slot) * 100 + '%' }"
                  />
                </div>
                <span class="ps-slot-down-val">{{ downSecsLeftOf(slot) }}s</span>
              </div>
              <div
                v-else-if="slot.maxHp > 0"
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

      <!-- Gold seam — the only hard edge between rail and stage; replaces the old
           opaque wooden border so the starfield reads as one surface behind it. -->
      <span class="ps-rail-seam" aria-hidden="true" />

      <!-- RIGHT DETAIL ─────────────────────────────────────────────── -->
      <!-- sunPhaseStyle stays on the wrapper too: the stage's own children read
           --ps-sun-d / --phase-* from here. -->
      <div class="ps-detail" :style="sunPhaseStyle">
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

        <!-- Purchased + role locked: cosmic stage with LEVEL crown above the sun,
             name + HP directly beneath it, and a bundled action dock at the bottom.
             The corners are intentionally empty — every readout the player acts on
             lives right next to the Level-Up button now. -->
        <template v-else-if="activeSlot && activeSlot.purchased && activeSlot.role">
          <div class="ps-stage" :style="[{ '--rc': activeRoleColor }, sunPhaseStyle]">
            <!-- LEVEL crown — big + modern, sits directly above the sun (bottom of
                 the top balancing band). While a jungle buff is live the top-center
                 banner claims this spot, so the crown fades out and returns after. -->
            <div class="ps-crown-band">
              <Transition name="ps-crown-fade">
                <div v-if="!activeSlot.jungleBuff?.active" class="ps-crown">
                  <span class="ps-crown-rule ps-crown-rule--l" aria-hidden="true" />
                  <div class="ps-crown-core">
                    <span class="ps-crown-label">Level</span>
                    <span class="ps-crown-value">{{ activeSlot.level }}</span>
                  </div>
                  <span class="ps-crown-rule ps-crown-rule--r" aria-hidden="true" />
                </div>
              </Transition>
            </div>

            <!-- Central body (comet rock or phase sun) + orbiting planet — the exact
                 vertical center: crown band above and readout band below carry equal
                 flex weight, so the sun is always dead-centered. -->
            <div class="ps-system" :class="{ 'ps-system--comet': solarStore.isCometState }">
              <CometDisc v-if="solarStore.isCometState" :diameter="200" />
              <div v-else class="ps-stage-sun" />
              <!-- The whole orbit wrapper is keyed per slot: the old planet fades
                   out at ITS orbit position, the new one fades in at its own — no
                   visible position jump. type="transition" required (the orbit
                   keyframe would otherwise deadlock mode="out-in").
                   The keyframe is scrubbed by tickOrbit via --orbit-delay, so the
                   planet passes behind the sun in lockstep with the idle orbit. -->
              <Transition name="ps-planet-swap" mode="out-in" type="transition">
                <div
                  v-if="!activeDown"
                  :key="activeSlot.id"
                  ref="planetOrbitEl"
                  class="ps-planet-preview-wrap"
                  :style="orbitPhaseStyle"
                >
                  <img
                    :src="activeImage"
                    class="ps-planet-preview-img"
                    :class="{ 'ps-planet-preview-img--buffed': activeSlot.jungleBuff?.active }"
                    alt="Planet"
                  />
                </div>
              </Transition>

              <!-- Zerstört: Der Planet ist aus der Bahn — an seiner Stelle steht
                   ein Wrack-Emblem auf der Sonne, umlegt von einem Ring, der die
                   Ausfallzeit abfährt. Größter Blickfang der Stage, weil es die
                   einzige Information ist, auf die der Spieler warten kann. -->
              <div v-if="activeDown" class="ps-down-core" aria-live="polite">
                <svg class="ps-down-ring" viewBox="0 0 100 100" aria-hidden="true">
                  <circle class="ps-down-ring-track" cx="50" cy="50" r="46" />
                  <circle
                    class="ps-down-ring-fill"
                    cx="50"
                    cy="50"
                    r="46"
                    :style="{ '--ring-progress': activeDownProgress }"
                  />
                </svg>
                <Icon
                  icon="game-icons:fragmented-meteor"
                  width="96"
                  height="96"
                  class="ps-down-icon"
                />
                <span class="ps-down-secs">{{ activeDownSecsLeft }}<i>s</i></span>
              </div>

              <!-- Eclipse medallion — same emblem and same source of truth as the
                   Command Panel's, sitting on the sun's face because the planet
                   itself is occluded while this shows. Deliberately without a
                   transition: the Command Panel switches its medallion instantly,
                   and a fade here would make this one linger behind it.
                   A destroyed planet suppresses it: it isn't in orbit at all,
                   so "behind the sun" would be the wrong story. -->
              <span
                v-if="orbitBehind && !activeDown"
                class="ps-eclipse-medal"
                title="Behind the Sun — out of reach"
              >
                <Icon icon="game-icons:eclipse-flare" width="104" height="104" />
              </span>
            </div>

            <!-- Name + HP unit — directly under the sun (top of the bottom balancing
                 band). Hovering the upgrade button extends the HP bar with a bright
                 ghost segment showing the HP the next level-up would grant. -->
            <div class="ps-readout-band">
              <div
                class="ps-planet-readout"
                :class="{
                  'ps-planet-readout--eclipsed': orbitBehind && !activeDown,
                  'ps-planet-readout--down': activeDown,
                }"
                :style="{ '--rc': activeRoleColor }"
              >
                <div class="ps-planet-role-label">{{ activeRoleName }}</div>

                <!-- Permanent planet effect — always visible, label-free: the value
                     alone carries the line. It flips to the post-upgrade value (in
                     confirm-green) while the upgrade button is hovered. -->
                <div
                  class="ps-planet-effect"
                  :class="{
                    'ps-planet-effect--preview': previewActive,
                    'ps-planet-effect--targeted': isConfigurableRole && !!configTarget,
                  }"
                >
                  <span class="ps-planet-effect-value">{{ previewActive ? nextBonusText : activeSlotBonusText }}</span>

                  <!-- Configurable roles (Harvester / Resonator) carry their target
                       INSIDE the effect line instead of in a separate dock card:
                       "1 Material every 30s › Ashen Ore" reads as one sentence, and
                       the target sits where the player already looks for what this
                       planet does. Clicking the chip opens the picker. -->
                  <template v-if="isConfigurableRole && configTarget">
                    <span class="ps-effect-arrow" aria-hidden="true">›</span>
                    <button
                      class="ps-effect-target"
                      :class="{ 'ps-effect-target--empty': !configTarget.chosen }"
                      :style="{ '--tc': configTarget.color }"
                      :title="`${configTarget.kicker}: ${configTarget.name} — ${configTarget.sub}. Click to change.`"
                      @click="configPickerOpen = true"
                    >
                      <span class="ps-effect-target-medal">
                        <img
                          v-if="configTarget.icon"
                          :src="configTarget.icon"
                          class="ps-effect-target-icon"
                          alt=""
                        />
                        <span v-else class="ps-effect-target-icon-missing">?</span>
                      </span>
                      <span class="ps-effect-target-name">{{ configTarget.name }}</span>
                      <span class="ps-effect-target-swap" aria-hidden="true">⟳</span>
                    </button>
                  </template>
                </div>

                <div
                  v-if="activeSlot.maxHp > 0"
                  class="ps-planet-hp"
                  :class="[`ps-planet-hp--${activeHpTier}`, { 'ps-planet-hp--preview': previewActive }]"
                >
                  <div class="ps-planet-hp-text">
                    <span class="ps-hp-values">{{ previewActive ? hpPreviewCurrent : activeSlot.currentHp }} / {{ previewActive ? nextMaxHp : activeSlot.maxHp }}</span>
                    <span class="ps-hp-pct">{{ previewActive ? hpPreviewPct : Math.round(hpPercent) }}%</span>
                  </div>
                  <div class="ps-hp-bar-track">
                    <div
                      class="ps-hp-bar-fill"
                      :style="{ width: (previewActive ? hpSolidPreviewPct : hpPercent) + '%' }"
                    >
                      <span class="ps-hp-bar-shine" aria-hidden="true" />
                    </div>
                    <div
                      v-if="previewActive && hpGhostPreviewPct > 0"
                      class="ps-hp-bar-ghost"
                      :style="{ left: hpSolidPreviewPct + '%', width: hpGhostPreviewPct + '%' }"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              <!-- Status banner — states why the readout is dimmed and the
                   Level-Up button is locked. Lives in the free space between the
                   readout and the action dock, so nothing above it shifts.
                   Destruction outranks the eclipse: it is the harder state and
                   the one with a timer attached. -->
              <div v-if="activeDown" class="ps-eclipse-banner ps-eclipse-banner--down">
                <span class="ps-eclipse-banner-line" aria-hidden="true" />
                <div class="ps-eclipse-banner-core">
                  <span class="ps-eclipse-banner-title">✦ Planet Destroyed ✦</span>
                  <span class="ps-eclipse-banner-sub">
                    Rebuilding — returns at full HP in {{ activeDownSecsLeft }}s
                  </span>
                </div>
                <span class="ps-eclipse-banner-line ps-eclipse-banner-line--right" aria-hidden="true" />
              </div>
              <Transition v-else name="ps-eclipse-fade">
                <div v-if="orbitBehind" class="ps-eclipse-banner">
                  <span class="ps-eclipse-banner-line" aria-hidden="true" />
                  <div class="ps-eclipse-banner-core">
                    <span class="ps-eclipse-banner-title">✦ Behind the Sun ✦</span>
                    <span class="ps-eclipse-banner-sub">Out of reach until it comes back around</span>
                  </div>
                  <span class="ps-eclipse-banner-line ps-eclipse-banner-line--right" aria-hidden="true" />
                </div>
              </Transition>
            </div>

            <!-- Action dock — pinned to the stage bottom so the sun stays centered.
                 Hovering the button previews the upgrade directly on the two
                 permanent readouts above (effect value + HP bar) — no popover. -->
            <div class="ps-action-dock">
              <!-- Only the Level-Up CTA lives here now — the harvest/resonance
                   target moved up into the effect line, where the player already
                   reads what this planet does. -->
              <div
                class="ps-dock-buy ps-hero-buy"
                @mouseenter="previewHover = true"
                @mouseleave="previewHover = false"
              >
                <button
                  class="ps-level-btn"
                  :class="{ 'ps-level-btn--locked': maxAffordableCount === 0 || levelUpBlocked }"
                  :disabled="maxAffordableCount === 0 || levelUpBlocked"
                  :title="activeDown ? `Destroyed — rebuilding, back in ${activeDownSecsLeft}s` : (orbitBehind ? 'Behind the Sun — level-up paused until the planet returns' : (maxAffordableCount > 0 ? 'Level up as much as you can afford' : (levelUpReason === 'phase' ? `Requires Sun Phase ${levelUpReqPhase}` : 'Not enough Chimes')))"
                  @click="attune(maxAffordableCount)"
                >
                  <span class="ps-level-btn-main">
                    <template v-if="activeDown">
                      <Icon icon="game-icons:fragmented-meteor" width="18" height="18" class="ps-level-req-icon" />
                      Destroyed
                    </template>
                    <template v-else-if="orbitBehind">
                      <Icon icon="game-icons:eclipse-flare" width="18" height="18" class="ps-level-req-icon" />
                      Behind the Sun
                    </template>
                    <template v-else>
                      ✦ Level Up<template v-if="maxAffordableCount > 0"> +{{ maxAffordableCount }}</template>
                    </template>
                  </span>
                  <span
                    class="ps-level-btn-cost"
                    :class="{ 'ps-level-btn-cost--req': levelUpReason === 'phase' || levelUpBlocked }"
                  >
                    <template v-if="activeDown">Back in {{ activeDownSecsLeft }}s</template>
                    <template v-else-if="orbitBehind">Out of reach</template>
                    <template v-else-if="levelUpReason === 'phase'">
                      <Icon icon="game-icons:sun" width="16" height="16" class="ps-level-req-icon" />
                      Requires Phase {{ levelUpReqPhase }}
                    </template>
                    <template v-else>
                      <img src="/img/BardAbilities/BardChime.png" class="ps-level-chime" alt="" />
                      {{ $formatNumber(maxAffordableCount > 0 ? maxCost : levelUpCost) }}
                    </template>
                  </span>
                </button>
                <span v-if="maxAffordableCount > 0 && !levelUpBlocked" class="ps-buy-badge" aria-hidden="true">{{ maxAffordableCount }}</span>
              </div>
            </div>
          </div>

          <!-- Target picker — wood-framed modal. Rich selectable cards with icon,
               name, rarity and a one-line description; selecting applies instantly
               and keeps the modal open so options can be compared. -->
          <Transition name="ps-pop">
            <div v-if="configPickerOpen" class="ps-modal-scrim" @click.self="configPickerOpen = false">
              <div class="ps-modal">
                <span class="ps-modal-goldline" aria-hidden="true" />
                <div class="ps-modal-head">
                  <span class="ps-modal-head-icon">
                    <Icon
                      :icon="activeSlot.role === 'harvest_node' ? 'game-icons:wheat' : 'game-icons:tower'"
                      width="28"
                      height="28"
                    />
                  </span>
                  <div class="ps-modal-head-text">
                    <span class="ps-modal-title">
                      {{ activeSlot.role === 'harvest_node' ? 'Harvest Target' : 'Resonance Target' }}
                    </span>
                    <span class="ps-modal-subtitle">
                      {{
                        activeSlot.role === 'harvest_node'
                          ? 'This planet harvests one material every 30s — choose which one flows into your inventory.'
                          : 'This planet amplifies one building — choose which one gets the Chimes boost.'
                      }}
                    </span>
                  </div>
                  <button class="ps-modal-close" aria-label="Close" @click="configPickerOpen = false">✕</button>
                </div>

                <div class="ps-modal-body">
                  <template v-if="activeSlot.role === 'harvest_node'">
                    <button
                      v-for="mat in MATERIALS"
                      :key="mat.id"
                      class="ps-pick"
                      :class="{ 'ps-pick--active': activeSlot.slotConfig?.materialId === mat.id }"
                      :style="{ '--tc': rarityColorOf(mat.rarity) }"
                      @click="chooseMaterial(mat.id)"
                    >
                      <span class="ps-pick-medal">
                        <img v-if="mat.image" :src="mat.image" class="ps-pick-icon" alt="" />
                        <span v-else class="ps-pick-icon-missing">?</span>
                      </span>
                      <span class="ps-pick-body">
                        <span class="ps-pick-name">{{ mat.name }}</span>
                        <span class="ps-pick-rarity">{{ mat.rarity }}</span>
                        <span class="ps-pick-desc">{{ mat.description }}</span>
                      </span>
                      <span
                        v-if="activeSlot.slotConfig?.materialId === mat.id"
                        class="ps-pick-check"
                        aria-hidden="true"
                        >✓</span
                      >
                    </button>
                  </template>
                  <template v-else>
                    <button
                      v-for="bld in CPS_BUILDINGS"
                      :key="bld.id"
                      class="ps-pick ps-pick--building"
                      :class="{ 'ps-pick--active': activeSlot.slotConfig?.buildingId === bld.id }"
                      :style="{ '--tc': '#e8c040' }"
                      @click="chooseBuilding(bld.id)"
                    >
                      <span class="ps-pick-medal">
                        <img v-if="bld.icon" :src="bld.icon" class="ps-pick-icon" alt="" />
                      </span>
                      <span class="ps-pick-body">
                        <span class="ps-pick-name">{{ bld.name }}</span>
                        <span class="ps-pick-desc">Amplifies this building's Chimes production.</span>
                      </span>
                      <span
                        v-if="activeSlot.slotConfig?.buildingId === bld.id"
                        class="ps-pick-check"
                        aria-hidden="true"
                        >✓</span
                      >
                    </button>
                  </template>
                </div>

                <div class="ps-modal-foot">
                  <button class="ps-modal-done" @click="configPickerOpen = false">✓ Done</button>
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
  position: relative;
  height: 100%;
  overflow: hidden;
  /* Deep-space base for the shared starfield — one surface for the WHOLE tab,
     rail included. Everything above it is layered with z-index. */
  background: #0b0a06;
  display: flex;
  flex-direction: column;
}

/* Depth wash over the shared starfield: a warm bloom bleeding out of the sun's
   side and a cold counter-tone in the far corner. Flat radial tints only — no
   blur, no texture. */
.ps-tab::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(
      110% 90% at 62% 42%,
      color-mix(in srgb, var(--phase-glow, #ff8c42) 12%, transparent) 0%,
      transparent 62%
    ),
    radial-gradient(80% 70% at 0% 100%, rgba(46, 34, 96, 0.22) 0%, transparent 64%),
    radial-gradient(70% 60% at 4% 0%, rgba(92, 51, 16, 0.2) 0%, transparent 60%);
}

/* ── Split layout (full height, no header) ─────────────────────────────────── */
.ps-split {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Left rail: 6 slots filling the full column height. No opaque panel any more —
   only a vertical scrim that damps the shared starfield just enough to keep the
   labels readable, so rail and stage read as ONE space. Width is unchanged. */
.ps-rail {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: clamp(210px, 16vw, 320px);
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.8vh, 12px);
  padding: clamp(8px, 1vh, 14px);
  background: linear-gradient(
    to right,
    rgba(9, 8, 5, 0.92) 0%,
    rgba(13, 11, 7, 0.82) 55%,
    rgba(9, 8, 5, 0.7) 100%
  );
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* Vertical gold seam — same language as the modal goldline, turned 90°. Sits as
   its own flex item so the rail can scroll without dragging it along. */
.ps-rail-seam {
  position: relative;
  z-index: 2;
  flex: 0 0 3px;
  align-self: stretch;
  background: linear-gradient(
    to bottom,
    #5c3310,
    #c89040 16%,
    #e8c060 50%,
    #c89040 84%,
    #5c3310
  );
  box-shadow:
    0 0 14px rgba(200, 144, 64, 0.35),
    0 0 3px rgba(232, 192, 96, 0.6);
}

/* Right detail panel — column layout: stage (flexible, dominates) on top +
   compact horizontal upgrade dock pinned to the bottom. The sun system gets
   the full remaining width AND height, so it stays the visual hero. */
.ps-detail {
  position: relative;
  z-index: 1;
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

/* ── Level crown — big, modern level readout centered above the sun ─────────── */
/* Top balancing band — equal flex weight to the readout band below the sun, so
   the sun sits dead-center between them. The crown is pinned to the BOTTOM of this
   band (justify-content: flex-end) so the level reads as sitting right above the
   sun, with a small gap. */
.ps-crown-band {
  position: relative;
  z-index: 2;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: clamp(8px, 1.4vh, 18px);
}

.ps-crown {
  display: inline-flex;
  align-items: center;
  gap: clamp(10px, 1.4vw, 22px);
}

/* Flanking accent rules in the role color — echo the name label's framed look */
.ps-crown-rule {
  width: clamp(28px, 6vw, 74px);
  height: 2px;
  border-radius: 2px;
  box-shadow: 0 0 8px color-mix(in srgb, var(--rc, #e8c040) 50%, transparent);
}

.ps-crown-rule--l {
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--rc, #e8c040) 85%, transparent)
  );
}

.ps-crown-rule--r {
  background: linear-gradient(
    to left,
    transparent,
    color-mix(in srgb, var(--rc, #e8c040) 85%, transparent)
  );
}

.ps-crown-core {
  display: inline-flex;
  align-items: baseline;
  gap: clamp(8px, 0.8vw, 14px);
}

.ps-crown-label {
  font-size: clamp(0.72rem, 1.2vh, 0.95rem);
  font-weight: 800;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.ps-crown-value {
  font-size: clamp(2.4rem, 5.4vh, 4rem);
  font-weight: 900;
  line-height: 0.85;
  color: var(--rc, #e8c040);
  text-shadow:
    0 0 22px color-mix(in srgb, var(--rc, #e8c040) 55%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.7);
  font-variant-numeric: tabular-nums;
}

/* Crown fade — plays when the jungle-buff banner claims the top-center spot */
.ps-crown-fade-enter-active,
.ps-crown-fade-leave-active {
  transition:
    opacity 240ms ease,
    transform 240ms ease;
}

.ps-crown-fade-enter-from,
.ps-crown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

/* ── Action dock — Level-Up CTA pinned to the stage bottom ──────────────────── */
/* Absolutely positioned so it never affects the flex centering above it: the sun
   stays dead-center while the button floats at the bottom. Hovering the button
   previews the upgrade on the two permanent readouts (effect value + HP bar). */
.ps-action-dock {
  position: absolute;
  left: 50%;
  bottom: clamp(14px, 2.2vh, 30px);
  transform: translateX(-50%);
  z-index: 4;
  width: 100%;
  max-width: 440px;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(7px, 1vh, 12px);
}

/* Level-Up CTA — enlarged, fills the dock width. (Reuses .ps-dock-buy for the
   badge + hover-fade behaviour.) The descendant selector beats .ps-dock-buy's
   `margin-left: auto`, so the button centers instead of sticking right. */
.ps-action-dock .ps-hero-buy {
  position: relative;
  margin: 0 auto;
  min-width: 0;
  width: 100%;
  max-width: 440px;
}

.ps-hero-buy .ps-level-btn {
  padding: clamp(0.55rem, 1vh, 0.9rem) 0.9rem clamp(0.5rem, 0.9vh, 0.8rem);
}

.ps-hero-buy .ps-level-btn-main {
  font-size: clamp(1.15rem, 1.9vh, 1.6rem);
}

.ps-hero-buy .ps-level-btn-cost {
  font-size: clamp(1rem, 1.5vh, 1.22rem);
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
  padding-left: clamp(15px, 1vw, 24px);
  min-width: 0;
  text-align: left;
  /* Translucent card — the shared starfield keeps showing through, so the rail
     never reads as a pasted-on panel. */
  background: linear-gradient(150deg, rgba(32, 27, 17, 0.82) 0%, rgba(13, 11, 7, 0.88) 100%);
  border: 1px solid #2e2416;
  border-radius: var(--bp-radius);
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(232, 192, 64, 0.06);
  cursor: pointer;
  color: inherit;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

/* Left accent rail — always present in the planet's role color (dim), so every
   card carries its identity at rest and only intensifies on hover/active. */
.ps-slot-btn::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--rc, #3a2c12);
  border-radius: var(--bp-radius) 0 0 var(--bp-radius);
  opacity: 0.4;
  transition:
    opacity 180ms ease,
    box-shadow 180ms ease;
  pointer-events: none;
}

.ps-slot-btn:hover::before {
  opacity: 0.8;
}

.ps-slot-btn--active::before {
  opacity: 1;
  box-shadow: 0 0 12px var(--rc, #e8c040);
}

/* Selection caret — role-colored gem straddling the card's inner edge */
.ps-slot-caret {
  position: absolute;
  z-index: 3;
  top: 50%;
  right: -1px;
  width: 13px;
  height: 13px;
  transform: translate(50%, -50%) rotate(45deg);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--rc, #52b830) 88%, white) 0%,
    var(--rc, #52b830) 100%
  );
  border-radius: 3px;
  box-shadow: 0 0 12px color-mix(in srgb, var(--rc, #52b830) 60%, transparent);
  pointer-events: none;
}

.ps-slot-icon {
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

/* Role-colored halo behind the planet — gives the bare sprite a light source and
   ties the card to its role without another frame. Slots without a role resolve
   --rc to transparent, so the halo simply doesn't exist there. */
.ps-slot-icon::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 155%;
  height: 155%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--rc, transparent) 34%, transparent) 0%,
    transparent 68%
  );
  opacity: 0.65;
  pointer-events: none;
  transition: opacity 180ms ease;
}

.ps-slot-btn:hover .ps-slot-icon::before,
.ps-slot-btn--active .ps-slot-icon::before {
  opacity: 1;
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
  font-size: clamp(0.95rem, 1.25vh, 1.3rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgba(212, 174, 96, 0.9);
  /* readable over the starfield showing through the translucent card */
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
}

.ps-slot-btn:hover {
  background: linear-gradient(150deg, rgba(44, 37, 23, 0.86) 0%, rgba(18, 15, 9, 0.9) 100%);
  border-color: #5c3310;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(232, 192, 64, 0.12);
  transform: translateY(-1px);
}

.ps-slot-btn:focus-visible {
  outline: none;
  border-color: #e8c040;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.85),
    0 0 12px rgba(232, 192, 64, 0.4);
}

/* Active: the border stays 1px (a 2px swap would shift the whole card's inner
   layout by a pixel on every selection) — the "selected" weight comes from a
   role-tinted wash, a ring shadow and the caret on the inner edge. */
.ps-slot-btn--active {
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--rc, #52b830) 16%, rgba(20, 17, 11, 0.9)) 0%,
    rgba(12, 11, 7, 0.92) 72%
  );
  border-color: var(--rc, #52b830);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rc, #52b830) 45%, transparent),
    0 0 20px color-mix(in srgb, var(--rc, #52b830) 30%, transparent),
    inset 0 0 24px color-mix(in srgb, var(--rc, #52b830) 12%, transparent);
}

.ps-slot-btn--active:hover {
  transform: translateY(-1px);
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
  background: linear-gradient(150deg, rgba(20, 40, 18, 0.86) 0%, rgba(10, 20, 10, 0.9) 100%);
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
  position: relative;
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
  font-size: clamp(0.88rem, 1.15vh, 1.2rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(206, 168, 92, 0.85);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
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
  gap: 0;
  /* Extra bottom padding reserves the band the absolute action dock floats in, so
     the flex-centered crown + sun + readout never overlap the Level-Up button. */
  padding: 0.9rem 1rem clamp(96px, 15vh, 150px);
  overflow: hidden;
}

/* Sun + orbiting planet share one centered system. Fills whatever height the
   stage has left; a container query lets the sun scale to the real free space
   instead of fixed pixels, so nothing ever overflows. */
.ps-system {
  position: relative;
  z-index: 1;
  width: 100%;
  /* Sized to the sun itself (no empty slack below it), so the equal-flex spacer
     above and hero band below can center it in the stage AND put the button at
     the exact midpoint between the sun and the name/HP unit. */
  flex: 0 0 auto;
  height: min(var(--ps-sun-d, 380px), 56vh);
  min-height: 160px;
  container-type: size;
  /* Sits between the crown band (above) and readout band (below), which carry
     equal flex weight — so the sun is always exactly vertically centered. */
}

/* Bottom balancing band — equal flex weight to the crown band above the sun, so
   the sun sits dead-center between them. The name/HP readout is pinned to the TOP
   of this band (justify-content: flex-start) so it reads as sitting right beneath
   the sun. The empty lower part is the "some space" before the action dock. */
.ps-readout-band {
  position: relative;
  z-index: 2;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: clamp(8px, 1.4vh, 18px);
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
  /* The keyframe is never played — it is scrubbed. tickOrbit writes the negative
     --orbit-delay that corresponds to the planet's real orbit angle, so the
     position (and the z-swap behind the sun) always matches the idle orbit.
     26s must stay in sync with PLANET_TAB_ORBIT_PERIOD_SEC in constants.ts. */
  animation: ps-planet-orbit 26s linear infinite;
  animation-delay: var(--orbit-delay, 0s);
  animation-play-state: paused;
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
  .ps-stage-sun {
    animation: none;
  }
  /* .ps-planet-preview-wrap keeps its (paused) keyframe on purpose: it is what
     positions the planet on its orbit. tickOrbit stops advancing the angle under
     reduced motion — same as the idle orbit — so the planet simply holds still
     at its correct spot instead of snapping onto the sun's center. */
}

/* ── Planet hinter der Sonne — Sidebar-Kachel ──────────────────────────────── */
/* Weicher als der Zerstört-Zustand: der Planet ist nur vorübergehend außer
   Reichweite. Die Kachel kühlt ab (Rollenfarbe weicht kaltem Blau), das
   Planetenbild fällt in den Schatten, das goldene Eclipse-Medaillon trägt die
   Aussage — gleiche Bildsprache wie Bühne und Command Panel. */
.ps-slot-btn--eclipsed {
  border-color: #39405a;
  background: linear-gradient(150deg, rgba(18, 20, 32, 0.82) 0%, rgba(9, 10, 16, 0.88) 100%);
}

.ps-slot-btn--eclipsed::before {
  background: #46527a;
  opacity: 0.55;
  box-shadow: none;
}

.ps-slot-btn--eclipsed .ps-slot-btn-img {
  filter: grayscale(65%) brightness(0.5) saturate(0.6);
  transition: filter 0.4s ease;
}

.ps-slot-btn--eclipsed .ps-slot-icon::before {
  background: radial-gradient(circle, rgba(90, 110, 170, 0.22) 0%, transparent 68%);
  opacity: 1;
}

/* Medaillon mittig auf dem Planeten — Größe folgt dem Kachel-Container wie das
   Planetenbild, damit es auf 4K nicht schrumpft und auf Full HD nicht überdeckt. */
.ps-slot-eclipse-emblem {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  width: clamp(30px, min(40cqh, 24cqw), 58px);
  height: clamp(30px, min(40cqh, 24cqw), 58px);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(38, 26, 8, 0.95), rgba(8, 8, 12, 0.95));
  border: 2px solid #5c3310;
  box-shadow:
    0 0 0 1px rgba(200, 144, 64, 0.35),
    0 0 14px rgba(232, 192, 64, 0.32),
    0 2px 6px rgba(0, 0, 0, 0.7);
  color: #e8c040;
  pointer-events: none;
  animation: ps-eclipse-breathe 1.6s ease-in-out infinite alternate;
}

.ps-slot-eclipse-emblem :deep(svg) {
  width: 62%;
  height: 62%;
  filter: drop-shadow(0 0 4px rgba(232, 192, 64, 0.55));
}

@media (prefers-reduced-motion: reduce) {
  .ps-slot-eclipse-emblem {
    animation: none;
  }
}

/* Ausgewählt + verfinstert: die Auswahl bleibt führend (Gem + Rahmen), die
   Kachel kühlt aber trotzdem ab — beide Aussagen dürfen nebeneinander stehen. */
.ps-slot-btn--eclipsed.ps-slot-btn--active {
  border-color: var(--rc, #52b830);
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--rc, #52b830) 10%, rgba(18, 20, 32, 0.88)) 0%,
    rgba(9, 10, 16, 0.9) 72%
  );
}

/* ── Zerstörter Planet — Sidebar-Kachel ────────────────────────────────────── */
/* Härter als jeder andere Slot-Zustand: Der Planet ist raus, nicht nur passiv.
   Rotstichiger Rahmen, ausgelöschtes Planetenbild, Wrack-Emblem darüber. */
.ps-slot-btn--down {
  border-color: #7a3a2c;
  background: linear-gradient(150deg, rgba(38, 18, 13, 0.88) 0%, rgba(18, 10, 8, 0.9) 100%);
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.5),
    inset 0 0 20px rgba(168, 64, 44, 0.1);
}

/* The accent rail goes red too — a destroyed planet must not still read in its
   role color, that is the state the card is no longer in. */
.ps-slot-btn--down::before {
  background: #a8402c;
  opacity: 0.9;
}

.ps-slot-btn--down .ps-slot-icon::before {
  background: radial-gradient(circle, rgba(204, 96, 80, 0.28) 0%, transparent 68%);
  opacity: 1;
}

.ps-slot-btn--down .ps-slot-btn-img {
  filter: grayscale(100%) brightness(0.3) contrast(0.85);
}

.ps-slot-down-emblem {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  color: #e08070;
  filter: drop-shadow(0 0 8px rgba(204, 96, 80, 0.75));
  pointer-events: none;
  animation: ps-down-pulse 1.5s ease-in-out infinite alternate;
}

/* Respawn-Leiste — ersetzt die HP-Leiste, gleiche Geometrie, andere Aussage */
.ps-slot-down {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}

.ps-slot-down-track {
  position: relative;
  flex: 1;
  height: 6px;
  background: #14100e;
  border: 1px solid #3a2018;
  border-radius: 4px;
  overflow: hidden;
}

.ps-slot-down-fill {
  height: 100%;
  background: linear-gradient(to bottom, #e08070, #a8402c);
  box-shadow: 0 0 8px rgba(224, 128, 112, 0.5);
  transition: width 0.5s linear;
}

.ps-slot-down-val {
  min-width: 30px;
  text-align: right;
  font-size: 0.72rem;
  font-weight: 800;
  color: #f0b0a0;
  font-variant-numeric: tabular-nums;
}

/* ── Zerstörter Planet — Bühne im Detailbereich ────────────────────────────── */
/* Ersetzt den orbitierenden Planeten mittig auf der Sonne: Wrack-Emblem im
   Countdown-Ring, darunter die Restzeit in großer Ziffer. Bewusst der größte
   Blickfang der Bühne — es ist die einzige Information, auf die man wartet. */
.ps-down-core {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  transform: translate(-50%, -50%);
  width: min(220px, 66cqmin);
  height: min(220px, 66cqmin);
  display: grid;
  place-items: center;
  pointer-events: none;
}

.ps-down-core > * {
  grid-area: 1 / 1;
}

.ps-down-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ps-down-ring-track {
  fill: rgba(10, 6, 5, 0.82);
  stroke: #4a2418;
  stroke-width: 5;
}

/* stroke-dasharray über den Umfang (2πr ≈ 289) — --ring-progress füllt ihn */
.ps-down-ring-fill {
  fill: none;
  stroke: #e08070;
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 289;
  stroke-dashoffset: calc(289 - 289 * var(--ring-progress, 0));
  filter: drop-shadow(0 0 6px rgba(224, 128, 112, 0.7));
  transition: stroke-dashoffset 0.5s linear;
}

.ps-down-icon {
  align-self: center;
  justify-self: center;
  width: min(96px, 30cqmin);
  height: min(96px, 30cqmin);
  color: #e08070;
  filter: drop-shadow(0 0 16px rgba(204, 96, 80, 0.8));
  transform: translateY(-11%);
  animation: ps-down-pulse 1.5s ease-in-out infinite alternate;
}

.ps-down-secs {
  align-self: end;
  justify-self: center;
  margin-bottom: 12%;
  font-size: clamp(1.5rem, 3.4vh, 2.4rem);
  font-weight: 900;
  line-height: 1;
  color: #ffd0c0;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 18px rgba(224, 128, 112, 0.7),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

.ps-down-secs i {
  font-style: normal;
  font-size: 0.5em;
  opacity: 0.75;
  margin-left: 1px;
}

/* Readout während der Ausfallzeit — stärker zurückgenommen als bei der Eclipse:
   die Werte gelten gerade nicht, der Planet trägt nichts bei. */
.ps-planet-readout--down {
  opacity: 0.45;
  filter: grayscale(70%);
}

/* Banner in Rot statt Gold — Verlust, nicht bloß Pause */
.ps-eclipse-banner--down .ps-eclipse-banner-line {
  background: linear-gradient(to right, transparent, rgba(224, 128, 112, 0.7));
  box-shadow: 0 0 8px rgba(204, 96, 80, 0.4);
}

.ps-eclipse-banner--down .ps-eclipse-banner-line--right {
  background: linear-gradient(to left, transparent, rgba(224, 128, 112, 0.7));
}

.ps-eclipse-banner--down .ps-eclipse-banner-title {
  color: #ffd0c0;
  text-shadow:
    0 0 16px rgba(224, 128, 112, 0.8),
    0 0 36px rgba(168, 64, 44, 0.45),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

.ps-eclipse-banner--down .ps-eclipse-banner-sub {
  color: rgba(240, 176, 160, 0.75);
}

@keyframes ps-down-pulse {
  from {
    opacity: 0.6;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1.05);
  }
}

/* Das Bühnen-Emblem trägt bereits ein translateY — Puls darf es nicht wegwerfen */
@keyframes ps-down-icon-pulse {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

.ps-down-icon {
  animation-name: ps-down-icon-pulse;
}

@media (prefers-reduced-motion: reduce) {
  .ps-slot-down-emblem,
  .ps-down-icon {
    animation: none;
  }
}

/* ── Eclipse — planet passing behind the sun, in sync with the idle orbit ───── */
/* Medallion sits on the sun's face: the planet itself is fully occluded while
   this shows. Same emblem and framing as rsq-eclipse / tbh-eclipse / sf-eclipse-medal. */
.ps-eclipse-medal {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 4;
  transform: translate(-50%, -50%);
  /* Deutlich auf der Sonnenscheibe: gut halb so breit wie der Sonnenkern, damit
     das Medaillon auf Full HD wie auf 4K sofort ins Auge fällt. */
  width: min(168px, 52cqmin);
  height: min(168px, 52cqmin);
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(38, 26, 8, 0.96), rgba(10, 7, 3, 0.96));
  border: 4px solid #5c3310;
  box-shadow:
    0 0 0 3px rgba(200, 144, 64, 0.4),
    0 0 44px rgba(232, 192, 64, 0.45),
    0 6px 20px rgba(0, 0, 0, 0.75);
  color: #e8c040;
  pointer-events: none;
  animation: ps-eclipse-breathe 1.6s ease-in-out infinite alternate;
}

.ps-eclipse-medal :deep(svg) {
  width: min(104px, 32cqmin);
  height: min(104px, 32cqmin);
  filter: drop-shadow(0 0 14px rgba(232, 192, 64, 0.65));
}

/* Readout recedes while the planet is out of reach — dimmed, never unreadable,
   so the player can still compare values during the eclipse. */
.ps-planet-readout--eclipsed {
  opacity: 0.62;
  filter: saturate(70%);
  transition:
    opacity 320ms ease,
    filter 320ms ease;
}

/* Banner in the free space between readout and action dock — states why the
   readout is dimmed and the button is locked. Same language as the Star Fight. */
.ps-eclipse-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(520px, 92%);
  margin-top: clamp(8px, 1.6vh, 20px);
}

.ps-eclipse-banner-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.65));
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.35);
}

.ps-eclipse-banner-line--right {
  background: linear-gradient(to left, transparent, rgba(232, 192, 64, 0.65));
}

.ps-eclipse-banner-core {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.ps-eclipse-banner-title {
  font-size: clamp(0.95rem, 1.7vh, 1.25rem);
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #ffe9b0;
  text-shadow:
    0 0 16px rgba(255, 210, 90, 0.75),
    0 0 36px rgba(232, 150, 30, 0.4),
    0 2px 3px rgba(0, 0, 0, 0.95);
  animation: ps-eclipse-breathe 1.6s ease-in-out infinite alternate;
}

.ps-eclipse-banner-sub {
  font-size: clamp(0.6rem, 1vh, 0.72rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(232, 192, 64, 0.62);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

@keyframes ps-eclipse-breathe {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

/* Nur das Erscheinen darf weich sein. Beim Verlassen der Sonne muss das Banner
   im selben Frame gehen wie das Medaillon (das gar keine Transition hat) —
   ein Fade-Out ließe es hinter dem wieder auftauchenden Planeten zurückhängen. */
.ps-eclipse-fade-enter-active {
  transition: opacity 0.28s ease;
}

.ps-eclipse-fade-enter-from {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ps-eclipse-medal,
  .ps-eclipse-banner-title {
    animation: none;
  }
}

/* Name + HP form one tight unit — the type name reads as the HP bar's title */
.ps-planet-readout {
  --rc: #e8c040;
  width: 100%;
  /* No margin-top:auto — the flex spacer/band above own the free space now;
     an auto margin here would starve them and collapse the centering. */
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
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

/* ── HP-bar hover preview (extends toward the post-level-up value) ──────────── */
/* Ghost extension: a bright, striped, pulsing slice appended right after the
   current fill, representing the HP the next level-up would grant — so the bar
   visibly grows on hover even at full health. Both fill + ghost are scaled to the
   NEW max, and the fill's width transition makes the growth animate smoothly. */
.ps-hp-bar-ghost {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 0 3px 3px 0;
  background: repeating-linear-gradient(
    -45deg,
    rgba(150, 255, 170, 0.55) 0,
    rgba(150, 255, 170, 0.55) 5px,
    rgba(110, 224, 74, 0.4) 5px,
    rgba(110, 224, 74, 0.4) 10px
  );
  box-shadow:
    inset 0 0 0 1px rgba(180, 255, 190, 0.5),
    0 0 12px rgba(120, 240, 120, 0.6);
  animation: ps-hp-ghost-pulse 1.1s ease-in-out infinite;
  pointer-events: none;
}

@keyframes ps-hp-ghost-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* Values + percent flip to confirm-green while previewing → "this is what you'll
   have after the upgrade". */
.ps-planet-hp--preview .ps-hp-values,
.ps-planet-hp--preview .ps-hp-pct {
  color: #7cf089;
  text-shadow: 0 0 10px rgba(92, 230, 106, 0.5);
}

@media (prefers-reduced-motion: reduce) {
  .ps-hp-bar-ghost {
    animation: none;
  }
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

/* ── Permanent planet effect (between name and HP bar) ──────────────────────── */
/* Label-free: the effect text alone fills the pill, so it can run big without
   competing with the role title above. Always in the role color; on button hover
   value + frame flip to confirm-green (mirrors the HP bar's preview language). */
.ps-planet-effect {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  margin: clamp(6px, 1.1vh, 12px) 0 clamp(5px, 0.9vh, 10px);
  padding: clamp(5px, 0.8vh, 10px) clamp(14px, 1.4vw, 22px);
  background: rgba(20, 17, 10, 0.72);
  border: 1px solid color-mix(in srgb, var(--rc, #e8c040) 40%, #3a2a10);
  border-radius: 5px;
  transition:
    border-color 180ms ease,
    background 180ms ease;
}

.ps-planet-effect-value {
  font-size: clamp(1.15rem, 2.1vh, 1.65rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.15;
  text-align: center;
  text-wrap: balance;
  color: var(--rc, #e8c040);
  text-shadow: 0 0 10px color-mix(in srgb, var(--rc, #e8c040) 45%, transparent);
  font-variant-numeric: tabular-nums;
  transition:
    color 180ms ease,
    text-shadow 180ms ease;
}

/* Preview: value + frame flip to confirm-green while the upgrade button is held */
.ps-planet-effect--preview {
  border-color: #5ce66a;
  background: rgba(12, 26, 14, 0.72);
}

.ps-planet-effect--preview .ps-planet-effect-value {
  color: #7cf089;
  text-shadow: 0 0 10px rgba(92, 230, 106, 0.55);
}

/* ── Harvest / Resonance target — inline inside the effect line ─────────────── */
/* The target used to be a separate card wedged between the HP bar and the buy
   button. It belongs to the SENTENCE, not to the dock: "1 Material every 30s ›
   Ashen Ore" says what the planet does and what it does it to, in one read. */
.ps-planet-effect--targeted {
  flex-wrap: wrap;
  gap: clamp(6px, 0.7vw, 12px);
  padding-right: clamp(8px, 0.9vw, 14px);
}

/* Connector — carries the eye from the effect into its target */
.ps-effect-arrow {
  flex-shrink: 0;
  font-size: clamp(1.1rem, 2vh, 1.5rem);
  font-weight: 700;
  line-height: 1;
  color: color-mix(in srgb, var(--rc, #e8c040) 55%, transparent);
  transition: color 180ms ease;
}

.ps-effect-target {
  --tc: #e8c040;
  display: inline-flex;
  align-items: center;
  gap: clamp(5px, 0.5vw, 9px);
  min-width: 0;
  max-width: min(240px, 45%);
  padding: clamp(3px, 0.4vh, 5px) clamp(7px, 0.7vw, 11px) clamp(3px, 0.4vh, 5px)
    clamp(4px, 0.4vw, 6px);
  background: rgba(10, 9, 5, 0.7);
  border: 1px solid color-mix(in srgb, var(--tc) 45%, #3a2a10);
  border-radius: 5px;
  cursor: pointer;
  color: inherit;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    opacity 180ms ease;
}

.ps-effect-target:hover {
  border-color: var(--tc);
  background: color-mix(in srgb, var(--tc) 14%, rgba(10, 9, 5, 0.8));
  box-shadow: 0 0 14px color-mix(in srgb, var(--tc) 30%, transparent);
}

.ps-effect-target:focus-visible {
  outline: none;
  border-color: var(--tc);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tc) 70%, transparent);
}

/* Nothing picked yet — a Harvester without a material produces nothing, so the
   empty chip has to nag: dashed frame plus a slow amber breath. */
.ps-effect-target--empty {
  border-style: dashed;
  animation: ps-target-nag 2.2s ease-in-out infinite;
}

@keyframes ps-target-nag {
  0%,
  100% {
    border-color: color-mix(in srgb, var(--tc) 40%, #3a2a10);
    box-shadow: none;
  }
  50% {
    border-color: var(--tc);
    box-shadow: 0 0 14px color-mix(in srgb, var(--tc) 35%, transparent);
  }
}

.ps-effect-target-medal {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(26px, 3.4vh, 38px);
  height: clamp(26px, 3.4vh, 38px);
  background: radial-gradient(circle at 50% 38%, #1a1710 0%, #0b0906 100%);
  border: 1px solid color-mix(in srgb, var(--tc) 55%, #3a2a10);
  border-radius: 4px;
  box-shadow: inset 0 0 8px color-mix(in srgb, var(--tc) 18%, transparent);
}

.ps-effect-target-icon {
  width: 80%;
  height: 80%;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--tc) 55%, transparent));
}

.ps-effect-target-icon-missing {
  font-size: clamp(0.95rem, 1.6vh, 1.25rem);
  font-weight: 900;
  color: color-mix(in srgb, var(--tc) 70%, #6a5a30);
}

.ps-effect-target-name {
  font-size: clamp(0.95rem, 1.7vh, 1.35rem);
  font-weight: 800;
  line-height: 1.15;
  color: var(--tc);
  text-shadow: 0 0 9px color-mix(in srgb, var(--tc) 35%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* Swap affordance — quiet at rest, turns on hover so the chip reads as clickable
   without a permanent "Change" label eating the line. */
.ps-effect-target-swap {
  flex-shrink: 0;
  font-size: clamp(0.85rem, 1.5vh, 1.15rem);
  line-height: 1;
  color: color-mix(in srgb, var(--tc) 60%, transparent);
  transition:
    transform 300ms ease,
    color 180ms ease;
}

.ps-effect-target:hover .ps-effect-target-swap {
  color: color-mix(in srgb, var(--tc) 90%, white);
  transform: rotate(180deg);
}

/* While the upgrade preview runs, the changed VALUE is the story — the target
   stays visible but steps back so the green number carries the line. */
.ps-planet-effect--preview .ps-effect-arrow {
  color: rgba(124, 240, 137, 0.5);
}

.ps-planet-effect--preview .ps-effect-target {
  opacity: 0.45;
}

@media (prefers-reduced-motion: reduce) {
  .ps-effect-target--empty {
    animation: none;
  }
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

/* ── Target picker modal (harvest material / resonance building) ────────────── */
.ps-modal-scrim {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 3vh, 2rem);
  background: rgba(0, 0, 0, 0.74);
}

/* Wood-framed panel per the design system */
.ps-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: 84%;
  overflow: hidden;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 16px 48px rgba(0, 0, 0, 0.85);
}

/* Gold line pinned to the very top of the modal */
.ps-modal-goldline {
  flex-shrink: 0;
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

.ps-modal-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(10px, 1vw, 15px);
  padding: clamp(11px, 1.4vh, 17px) clamp(13px, 1.2vw, 19px);
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.ps-modal-head-icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(42px, 5vh, 54px);
  height: clamp(42px, 5vh, 54px);
  background: radial-gradient(circle at 50% 38%, #2a1a08 0%, #120b04 100%);
  border: 1px solid #7a4e20;
  border-radius: 6px;
  color: #e8c040;
  box-shadow: inset 0 0 10px rgba(232, 192, 64, 0.18);
}

.ps-modal-head-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.ps-modal-title {
  font-size: clamp(1rem, 1.8vh, 1.3rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #f0d060;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.3);
}

.ps-modal-subtitle {
  font-size: clamp(0.7rem, 1.15vh, 0.85rem);
  font-weight: 600;
  line-height: 1.35;
  color: rgba(210, 195, 155, 0.75);
}

.ps-modal-close {
  flex-shrink: 0;
  align-self: flex-start;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1c1c18;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #cc6050;
  font-size: 0.95rem;
  font-weight: 900;
  cursor: pointer;
  transition: filter 150ms ease;
}

.ps-modal-close:hover {
  filter: brightness(1.35);
}

/* Popover/modal transition (name="ps-pop") */
.ps-pop-enter-active,
.ps-pop-leave-active {
  transition: opacity 0.2s ease;
}
.ps-pop-enter-active .ps-modal,
.ps-pop-leave-active .ps-modal {
  transition: transform 0.2s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.ps-pop-enter-from,
.ps-pop-leave-to {
  opacity: 0;
}
.ps-pop-enter-from .ps-modal,
.ps-pop-leave-to .ps-modal {
  transform: scale(0.94) translateY(10px);
}

/* Scrollable card list */
.ps-modal-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: clamp(8px, 1vh, 12px);
  padding: clamp(12px, 1.6vh, 18px);
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
  background: #1a1008;
}

.ps-modal-body::-webkit-scrollbar {
  width: 8px;
}
.ps-modal-body::-webkit-scrollbar-track {
  background: #111;
}
.ps-modal-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 4px;
}

/* Rich selectable card — icon medallion + name + rarity + description */
.ps-pick {
  --tc: #c8c8c8;
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(9px, 0.9vw, 13px);
  padding: clamp(9px, 1.1vh, 13px) clamp(11px, 1vw, 15px);
  padding-left: clamp(14px, 1.1vw, 18px);
  background: linear-gradient(120deg, #1c1a12 0%, #141109 100%);
  border: 1px solid #2e1e0a;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  overflow: hidden;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

/* Left rarity/gold accent stripe */
.ps-pick::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--tc);
  opacity: 0.85;
}

.ps-pick:hover {
  border-color: color-mix(in srgb, var(--tc) 70%, transparent);
  transform: translateY(-1px);
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.5),
    0 0 12px color-mix(in srgb, var(--tc) 22%, transparent);
}

.ps-pick:focus-visible {
  outline: none;
  border-color: var(--tc);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tc) 65%, transparent);
}

.ps-pick--active {
  background: linear-gradient(120deg, #14200e 0%, #101408 100%);
  border-color: var(--tc);
  box-shadow:
    0 0 16px color-mix(in srgb, var(--tc) 30%, transparent),
    inset 0 0 18px color-mix(in srgb, var(--tc) 8%, transparent);
}

.ps-pick-medal {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(46px, 5.4vh, 58px);
  height: clamp(46px, 5.4vh, 58px);
  background: radial-gradient(circle at 50% 36%, #161208 0%, #0a0805 100%);
  border: 1px solid color-mix(in srgb, var(--tc) 55%, #3a2a10);
  border-radius: 6px;
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--tc) 16%, transparent);
}

.ps-pick-icon {
  width: 78%;
  height: 78%;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--tc) 50%, transparent));
  transition: transform 0.15s ease;
}

.ps-pick:hover .ps-pick-icon {
  transform: scale(1.08);
}

.ps-pick-icon-missing {
  font-size: 1.7rem;
  font-weight: 900;
  color: color-mix(in srgb, var(--tc) 65%, #6a5a30);
}

.ps-pick-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.ps-pick-name {
  font-size: clamp(0.9rem, 1.5vh, 1.12rem);
  font-weight: 800;
  line-height: 1.15;
  color: var(--tc);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tc) 30%, transparent);
}

.ps-pick-rarity {
  font-size: clamp(0.56rem, 0.9vh, 0.7rem);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--tc) 80%, #fff);
  opacity: 0.85;
}

.ps-pick-desc {
  margin-top: 1px;
  font-size: clamp(0.66rem, 1vh, 0.8rem);
  font-weight: 500;
  line-height: 1.3;
  color: rgba(200, 190, 160, 0.62);
}

.ps-pick-check {
  position: absolute;
  top: 7px;
  right: 9px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 0.82rem;
  font-weight: 900;
  color: #06301f;
  background: linear-gradient(135deg, #34d399, #059669);
  border: 1.5px solid #6ee7b7;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
}

/* Footer with the Done button */
.ps-modal-foot {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding: clamp(10px, 1.2vh, 14px) clamp(13px, 1.2vw, 19px);
  background: #16120a;
  border-top: 2px solid #5c3310;
}

.ps-modal-done {
  padding: clamp(8px, 1vh, 11px) clamp(22px, 2.5vw, 34px);
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 5px;
  color: #fff;
  font-size: clamp(0.82rem, 1.3vh, 0.98rem);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    filter 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.ps-modal-done:hover {
  filter: brightness(1.14);
  transform: translateY(-1px);
  box-shadow: 0 0 12px rgba(80, 200, 40, 0.5);
}

.ps-modal-done:active {
  transform: translateY(0) scale(0.97);
}

.ps-modal-done:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.9),
    0 0 14px rgba(232, 192, 64, 0.5);
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
  background: linear-gradient(150deg, rgba(16, 34, 12, 0.84) 0%, rgba(10, 20, 10, 0.88) 100%);
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
  background: linear-gradient(150deg, rgba(22, 44, 16, 0.88) 0%, rgba(13, 26, 10, 0.9) 100%);
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
  opacity: 0.5;
  filter: grayscale(55%);
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

/* ── Compact height (Full HD ~950px viewport) ───────────────────────────────── */
/* Shrink the sun cap, crown and dock so crown + sun + name/HP + dock all fit the
   flattest desktop viewport without overflow. 2K/4K keep the roomy defaults. */
@media (max-height: 1100px) {
  .ps-system {
    height: min(var(--ps-sun-d, 340px), 46vh);
  }

  .ps-crown-value {
    font-size: clamp(2rem, 4.6vh, 3rem);
  }

  /* Reserve a little less for the dock and tighten it on flat viewports. */
  .ps-stage {
    padding-bottom: clamp(84px, 13vh, 128px);
  }

  .ps-action-dock {
    gap: 7px;
    bottom: clamp(10px, 1.8vh, 22px);
  }
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
