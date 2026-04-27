<!-- frontend/src/components/idle/planet/PlanetRoleModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="role-modal">
      <div
        v-if="activeSlot !== null"
        class="role-modal-backdrop"
        @click.self="store.closeRoleModal()"
      >
        <div class="role-modal-card">
          <div class="role-modal-goldline" />

          <div class="role-modal-header">
            <span class="role-modal-title">🪐 Planeten-Rolle wählen</span>
            <span class="role-modal-slot-label">Orbit {{ slotNumber }}</span>
            <button class="role-modal-close" @click="store.closeRoleModal()">✕</button>
          </div>

          <div v-if="activeSlot.role" class="role-modal-current">
            <span class="role-modal-current-label">Aktuelle Rolle:</span>
            <span class="role-modal-current-name" :style="{ color: currentRole!.color }">
              {{ currentRole!.icon }} {{ currentRole!.name }}
            </span>
          </div>

          <!-- Rollen-Grid -->
          <div class="role-modal-grid">
            <button
              v-for="role in roles"
              :key="role.id"
              class="role-card"
              :class="{ 'role-card--active': activeSlot.role === role.id }"
              @click="store.assignRole(activeSlot.id, role.id)"
            >
              <div class="role-card-header">
                <span class="role-card-dot" :style="{ background: role.color }" />
                <span class="role-card-icon">{{ role.icon }}</span>
                <span class="role-card-name">{{ role.name }}</span>
              </div>
              <div class="role-card-flavor">{{ role.flavorText }}</div>
              <div class="role-card-bonus">
                <span class="role-card-bonus-icon">{{ role.icon }}</span>
                <span class="role-card-bonus-text">{{ bonusText(role) }}</span>
              </div>
            </button>
          </div>

          <!-- Config-Step: harvest_node → Material wählen -->
          <div v-if="activeSlot.role === 'harvest_node'" class="role-config-section">
            <div class="role-config-header">🌾 Material wählen</div>
            <div class="role-config-grid">
              <button
                v-for="mat in MATERIALS"
                :key="mat.id"
                class="config-btn"
                :class="{ 'config-btn--active': activeSlot.slotConfig?.materialId === mat.id }"
                @click="store.setSlotConfig(activeSlot.id, { materialId: mat.id })"
              >
                <img v-if="mat.image" :src="mat.image" class="config-btn-img" alt="" />
                <span class="config-btn-label">{{ mat.name }}</span>
              </button>
            </div>
            <button
              v-if="activeSlot.slotConfig?.materialId"
              class="config-skip-btn"
              @click="store.closeRoleModal()"
            >
              Schließen
            </button>
          </div>

          <!-- Config-Step: resonance_tower → Gebäude wählen -->
          <div v-if="activeSlot.role === 'resonance_tower'" class="role-config-section">
            <div class="role-config-header">🏗️ Gebäude wählen</div>
            <div class="role-config-grid">
              <button
                v-for="bld in CPS_BUILDINGS"
                :key="bld.id"
                class="config-btn"
                :class="{ 'config-btn--active': activeSlot.slotConfig?.buildingId === bld.id }"
                @click="store.setSlotConfig(activeSlot.id, { buildingId: bld.id })"
              >
                <img v-if="bld.icon" :src="bld.icon" class="config-btn-img" alt="" />
                <span class="config-btn-label">{{ bld.name }}</span>
              </button>
            </div>
            <button
              v-if="activeSlot.slotConfig?.buildingId"
              class="config-skip-btn"
              @click="store.closeRoleModal()"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { usePlanetShopStore, PLANET_ROLES_LIST } from '../../../stores/planetShopStore'
import type { PlanetRole } from '../../../stores/planetShopStore'
import { MATERIALS } from '../../../config/materials'

const CPS_BUILDINGS = [
  { id: 'glockenturm', name: 'Glockenturm', icon: '/img/Glockenturm.png' },
  { id: 'klanggenerator', name: 'Klang Generator', icon: '/img/KlangGenerator.png' },
  { id: 'harmoniewerk', name: 'Harmonie Werk', icon: '/img/HarmonieWerk.png' },
  { id: 'sphaerenMusik', name: 'Sphären Musik', icon: '/img/SphaerenMusik.png' },
  { id: 'zeitEcho', name: 'Zeit Echo', icon: '/img/ZeitEcho.png' },
]

export default defineComponent({
  name: 'PlanetRoleModal',
  setup() {
    const store = usePlanetShopStore()

    const activeSlot = computed(() => {
      if (!store.activeRoleModalSlotId) return null
      return store.slots.find((s) => s.id === store.activeRoleModalSlotId) ?? null
    })

    const slotNumber = computed(() => {
      if (!activeSlot.value) return ''
      return activeSlot.value.id.replace('slot_', '')
    })

    const currentRole = computed(() => {
      if (!activeSlot.value?.role) return null
      return PLANET_ROLES_LIST.find((r) => r.id === activeSlot.value!.role) ?? null
    })

    const roles = PLANET_ROLES_LIST

    function bonusText(role: PlanetRole): string {
      switch (role.bonusType) {
        case 'chimes_per_second':
          return `+${role.bonusPerSlot} CPS pro Slot`
        case 'chimes_per_click':
          return `+${role.bonusPerSlot} CPC pro Slot`
        case 'meep_cost_reduction':
          return `-${Math.round(role.bonusPerSlot * 100)}% Meep-Kosten pro Slot`
        case 'cps_multiplier':
          return `+${Math.round(role.bonusPerSlot * 100)}% CPS-Multiplikator`
        case 'offline_boost':
          return `+${Math.round(role.bonusPerSlot * 100)}% Offline-Ertrag`
        case 'periodic_chimes':
          return `${Math.round(role.bonusPerSlot * 100)}% Schub-Chance/s`
        case 'auto_attack_dps':
          return `+${role.bonusPerSlot} DPS/s auf Boss`
        case 'material_harvest_rate':
          return `1 Material alle 30s`
        case 'expedition_reward_multiplier':
          return `+${Math.round(role.bonusPerSlot * 100)}% Expeditions-Belohnung`
        case 'boss_damage_reduction':
          return `-${Math.round(role.bonusPerSlot * 100)}% Boss-Orbit-Schaden`
        case 'meep_power_multiplier':
          return `+${Math.round(role.bonusPerSlot * 100)}% Meep-Stärke`
        case 'champion_damage_multiplier':
          return `+${Math.round(role.bonusPerSlot * 100)}% Champion-Power`
        case 'drop_chance_bonus':
          return `+${Math.round(role.bonusPerSlot * 100)}% Material-Drop`
        case 'building_cps_multiplier':
          return `+${Math.round(role.bonusPerSlot * 100)}% Gebäude-CPS`
      }
    }

    return { store, activeSlot, slotNumber, currentRole, roles, bonusText, MATERIALS, CPS_BUILDINGS }
  },
})
</script>

<style scoped>
/* ── Backdrop ──────────────────────────────────────────────────────────────── */
.role-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Card ──────────────────────────────────────────────────────────────────── */
.role-modal-card {
  width: clamp(340px, 90vw, 620px);
  max-height: 90vh;
  overflow-y: auto;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 8px 40px rgba(0, 0, 0, 0.9);
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.role-modal-goldline {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  flex-shrink: 0;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.role-modal-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.9rem;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.role-modal-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.04em;
  flex: 1;
}

.role-modal-slot-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
}

.role-modal-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0 0.2rem;
  line-height: 1;
  transition: color 0.15s;
}

.role-modal-close:hover {
  color: #e8c040;
}

/* ── Current role info ─────────────────────────────────────────────────────── */
.role-modal-current {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  background: #16140e;
  border-bottom: 1px solid #2a1a08;
  font-size: 0.72rem;
}

.role-modal-current-label {
  color: rgba(255, 255, 255, 0.4);
}

.role-modal-current-name {
  font-weight: 700;
}

/* ── Grid ──────────────────────────────────────────────────────────────────── */
.role-modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  padding: 0.75rem;
}

/* ── Role Card ─────────────────────────────────────────────────────────────── */
.role-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.6rem 0.7rem;
  background: #1c1c18;
  border: 1px solid #3a2a10;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s;
  color: inherit;
}

.role-card:hover {
  background: #222018;
  border-color: #7a4e20;
}

.role-card--active {
  background: #1a2a14;
  border: 1px solid #6ec040;
  box-shadow: 0 0 6px rgba(110, 192, 64, 0.3);
}

.role-card-header {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.role-card-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.role-card-icon {
  font-size: 0.85rem;
  line-height: 1;
}

.role-card-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #f0e8d0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-card--active .role-card-name {
  color: #a8e060;
}

.role-card-flavor {
  font-size: 0.64rem;
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.role-card-bonus {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.1rem;
}

.role-card-bonus-icon {
  font-size: 0.7rem;
  line-height: 1;
}

.role-card-bonus-text {
  font-size: 0.68rem;
  font-weight: 600;
  color: #e8c040;
}

.role-card--active .role-card-bonus-text {
  color: #a8e060;
}

/* ── Config Section ────────────────────────────────────────────────────────── */
.role-config-section {
  padding: 0.75rem;
  border-top: 2px solid #3a2a10;
  background: #14120a;
}

.role-config-header {
  font-size: 0.8rem;
  font-weight: 700;
  color: #e8c040;
  margin-bottom: 0.5rem;
  letter-spacing: 0.03em;
}

.role-config-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.config-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.45rem 0.3rem;
  background: #1c1c18;
  border: 1px solid #3a2a10;
  border-radius: 4px;
  cursor: pointer;
  color: inherit;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.config-btn:hover {
  background: #222018;
  border-color: #7a4e20;
}

.config-btn--active {
  background: #1a2a14;
  border: 1px solid #6ec040;
  box-shadow: 0 0 4px rgba(110, 192, 64, 0.25);
}

.config-btn-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.config-btn-label {
  font-size: 0.62rem;
  font-weight: 600;
  color: #c8c0a0;
  text-align: center;
  line-height: 1.2;
}

.config-btn--active .config-btn-label {
  color: #a8e060;
}

.config-skip-btn {
  width: 100%;
  padding: 0.35rem 0.5rem;
  background: #1c1c18;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.68rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.config-skip-btn:hover {
  border-color: #7a4e20;
  color: rgba(255, 255, 255, 0.75);
}

/* ── Transition ────────────────────────────────────────────────────────────── */
.role-modal-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.role-modal-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.role-modal-enter-from,
.role-modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
