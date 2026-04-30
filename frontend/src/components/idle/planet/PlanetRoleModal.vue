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
          <!-- Goldene Zierleiste oben -->
          <div class="role-modal-goldline" />

          <!-- Header -->
          <div class="role-modal-header">
            <div class="role-modal-header-left">
              <span class="role-modal-planet-icon">🪐</span>
              <div class="role-modal-header-text">
                <span class="role-modal-title">Planeten-Rolle wählen</span>
                <span class="role-modal-slot-label">Orbit {{ slotNumber }}</span>
              </div>
            </div>
            <button class="role-modal-close" @click="store.closeRoleModal()">✕</button>
          </div>

          <!-- Rollen-Grid -->

          <div class="role-modal-grid">
            <button
              v-for="role in roles"
              :key="role.id"
              class="role-card"
              :class="{ 'role-card--active': activeSlot.role === role.id }"
              :style="{ '--role-color': role.color }"
              @click="store.assignRole(activeSlot.id, role.id)"
            >
              <div class="role-card-glow-ring" />
              <div class="role-card-icon">{{ role.icon }}</div>
              <div class="role-card-name">{{ role.name }}</div>
              <div class="role-card-divider" />
              <div class="role-card-effect">{{ bonusText(role) }}</div>
              <div v-if="activeSlot.role === role.id" class="role-card-active-badge">✓ Aktiv</div>
            </button>
          </div>

          <!-- Config: harvest_node → Material wählen -->
          <Transition name="config-slide">
            <div v-if="activeSlot.role === 'harvest_node'" class="role-config-section">
              <div class="role-config-header">
                <span class="role-config-header-icon">🌾</span>
                <span>Material auswählen</span>
                <span class="role-config-header-hint">Wähle das zu erntende Material</span>
              </div>
              <div class="role-config-grid">
                <button
                  v-for="mat in MATERIALS"
                  :key="mat.id"
                  class="config-btn"
                  :class="{ 'config-btn--active': activeSlot.slotConfig?.materialId === mat.id }"
                  @click="store.setSlotConfig(activeSlot.id, { materialId: mat.id })"
                >
                  <div class="config-btn-img-wrap">
                    <img v-if="mat.image" :src="mat.image" class="config-btn-img" alt="" />
                    <div v-else class="config-btn-img-placeholder">?</div>
                  </div>
                  <span class="config-btn-label">{{ mat.name }}</span>
                  <div v-if="activeSlot.slotConfig?.materialId === mat.id" class="config-btn-check">
                    ✓
                  </div>
                </button>
              </div>
              <button
                v-if="activeSlot.slotConfig?.materialId"
                class="config-confirm-btn"
                @click="store.closeRoleModal()"
              >
                <span>✔</span> Bestätigen & Schließen
              </button>
            </div>
          </Transition>

          <!-- Config: resonance_tower → Gebäude wählen -->
          <Transition name="config-slide">
            <div v-if="activeSlot.role === 'resonance_tower'" class="role-config-section">
              <div class="role-config-header">
                <span class="role-config-header-icon">🏗️</span>
                <span>Gebäude auswählen</span>
                <span class="role-config-header-hint">Welches Gebäude soll verstärkt werden?</span>
              </div>
              <div class="role-config-grid">
                <button
                  v-for="bld in CPS_BUILDINGS"
                  :key="bld.id"
                  class="config-btn"
                  :class="{ 'config-btn--active': activeSlot.slotConfig?.buildingId === bld.id }"
                  @click="store.setSlotConfig(activeSlot.id, { buildingId: bld.id })"
                >
                  <div class="config-btn-img-wrap">
                    <img v-if="bld.icon" :src="bld.icon" class="config-btn-img" alt="" />
                    <div v-else class="config-btn-img-placeholder">🏗</div>
                  </div>
                  <span class="config-btn-label">{{ bld.name }}</span>
                  <div v-if="activeSlot.slotConfig?.buildingId === bld.id" class="config-btn-check">
                    ✓
                  </div>
                </button>
              </div>
              <button
                v-if="activeSlot.slotConfig?.buildingId"
                class="config-confirm-btn"
                @click="store.closeRoleModal()"
              >
                <span>✔</span> Bestätigen & Schließen
              </button>
            </div>
          </Transition>

          <!-- Goldene Zierleiste unten -->
          <div class="role-modal-goldline role-modal-goldline--bottom" />
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
        case 'auto_attack_dps':
          return `+${role.bonusPerSlot} DPS/s auf Boss`
        case 'material_harvest_rate':
          return `1 Material alle 30s`
        case 'expedition_reward_multiplier':
          return `+${Math.round(role.bonusPerSlot * 100)}% Expeditions-Belohnung`
        case 'boss_damage_reduction':
          return `-${Math.round(role.bonusPerSlot * 100)}% Boss-Orbit-Schaden`
        case 'offline_boost':
          return `+${Math.round(role.bonusPerSlot * 100)}% Offline-Ertrag`
        case 'building_cps_multiplier':
          return `+${Math.round(role.bonusPerSlot * 100)}% Gebäude-CPS`
      }
    }

    return {
      store,
      activeSlot,
      slotNumber,
      currentRole,
      roles,
      bonusText,
      MATERIALS,
      CPS_BUILDINGS,
    }
  },
})
</script>

<style scoped>
/* ── Backdrop ──────────────────────────────────────────────────────────────── */
.role-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(3px);
}

/* ── Card ──────────────────────────────────────────────────────────────────── */
.role-modal-card {
  width: clamp(380px, 92vw, 760px);
  max-height: 92vh;
  overflow-y: auto;
  background: #0d0c07;
  border: 3px solid #7a4e20;
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 0 60px rgba(120, 80, 20, 0.06),
    0 0 0 1px #2a1505,
    0 12px 60px rgba(0, 0, 0, 0.95),
    0 0 80px rgba(180, 120, 20, 0.08);
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* Dezentes Sterne-Muster */
.role-modal-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(1px 1px at 15% 25%, rgba(255, 255, 255, 0.07) 0%, transparent 100%),
    radial-gradient(1px 1px at 72% 18%, rgba(255, 255, 255, 0.05) 0%, transparent 100%),
    radial-gradient(1px 1px at 45% 80%, rgba(255, 255, 255, 0.06) 0%, transparent 100%),
    radial-gradient(1px 1px at 88% 65%, rgba(255, 255, 255, 0.04) 0%, transparent 100%);
  border-radius: 6px;
}

/* ── Goldline ──────────────────────────────────────────────────────────────── */
.role-modal-goldline {
  height: 3px;
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
  flex-shrink: 0;
}

.role-modal-goldline--bottom {
  margin-top: 0.25rem;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.role-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.1rem;
  background: linear-gradient(180deg, #1e1208 0%, #14100a 100%);
  border-bottom: 2px solid #3a200a;
}

.role-modal-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.role-modal-planet-icon {
  font-size: 2rem;
  filter: drop-shadow(0 0 10px rgba(200, 140, 60, 0.6));
  line-height: 1;
}

.role-modal-header-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.role-modal-title {
  font-size: 1rem;
  font-weight: 800;
  color: #f0d060;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-shadow: 0 0 16px rgba(240, 200, 80, 0.4);
}

.role-modal-slot-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.role-modal-close {
  background: #1a1408;
  border: 1px solid #3a2a10;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0.3rem 0.55rem;
  border-radius: 4px;
  line-height: 1;
  transition: all 0.15s;
}

.role-modal-close:hover {
  color: #f0d060;
  border-color: #7a4e20;
  background: #221a0c;
}

/* ── Current Role ──────────────────────────────────────────────────────────── */
.role-modal-current {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1.1rem;
  background: #0f0e09;
  border-bottom: 1px solid #2a1a08;
}

.role-modal-current-label {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.role-modal-current-name {
  font-size: 0.82rem;
  font-weight: 700;
}

/* ── Section Label ─────────────────────────────────────────────────────────── */
.role-modal-section-label {
  padding: 0.65rem 1.1rem 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: rgba(232, 192, 64, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* ── Grid ──────────────────────────────────────────────────────────────────── */
.role-modal-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 0.5rem 1rem 1rem;
}

/* ── Role Card ─────────────────────────────────────────────────────────────── */
.role-card {
  --role-color: #aaaaaa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  padding: 1.25rem 0.75rem 1rem;
  background: #131210;
  border: 1px solid #2e1e0a;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.18s,
    background 0.18s,
    box-shadow 0.18s,
    transform 0.12s;
  color: inherit;
  position: relative;
  overflow: hidden;
  min-height: 140px;
}

.role-card-glow-ring {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% -10%,
    color-mix(in oklch, var(--role-color) 15%, transparent) 0%,
    transparent 65%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.22s;
}

.role-card:hover {
  background: #1a1812;
  border-color: color-mix(in oklch, var(--role-color) 70%, transparent);
  box-shadow:
    0 0 14px color-mix(in oklch, var(--role-color) 22%, transparent),
    0 2px 8px rgba(0, 0, 0, 0.6);
  transform: translateY(-2px);
}

.role-card:hover .role-card-glow-ring {
  opacity: 1;
}

.role-card--active {
  background: #141812;
  border: 2px solid var(--role-color);
  box-shadow:
    0 0 18px color-mix(in oklch, var(--role-color) 38%, transparent),
    inset 0 0 24px color-mix(in oklch, var(--role-color) 7%, transparent);
  transform: translateY(-1px);
}

.role-card--active .role-card-glow-ring {
  opacity: 1;
}

/* ── Icon ──────────────────────────────────────────────────────────────────── */
.role-card-icon {
  font-size: 2.4rem;
  line-height: 1;
  filter: drop-shadow(0 0 8px color-mix(in oklch, var(--role-color) 60%, transparent));
  transition:
    filter 0.18s,
    transform 0.18s;
}

.role-card:hover .role-card-icon {
  transform: scale(1.1);
  filter: drop-shadow(0 0 12px color-mix(in oklch, var(--role-color) 85%, transparent));
}

.role-card--active .role-card-icon {
  filter: drop-shadow(0 0 14px color-mix(in oklch, var(--role-color) 95%, transparent));
}

/* ── Name ──────────────────────────────────────────────────────────────────── */
.role-card-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #d4c89a;
  letter-spacing: 0.04em;
  line-height: 1.2;
}

.role-card--active .role-card-name {
  color: var(--role-color);
}

/* ── Divider ───────────────────────────────────────────────────────────────── */
.role-card-divider {
  width: 60%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in oklch, var(--role-color) 30%, transparent),
    transparent
  );
  margin: 0.1rem 0;
}

/* ── Effect ────────────────────────────────────────────────────────────────── */
.role-card-effect {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--role-color);
  line-height: 1.3;
  text-shadow: 0 0 8px color-mix(in oklch, var(--role-color) 45%, transparent);
  letter-spacing: 0.01em;
  padding: 0 0.25rem;
}

.role-card--active .role-card-effect {
  font-size: 0.82rem;
  text-shadow: 0 0 14px color-mix(in oklch, var(--role-color) 65%, transparent);
}

/* ── Active Badge ──────────────────────────────────────────────────────────── */
.role-card-active-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: color-mix(in oklch, var(--role-color) 20%, #0d0c07);
  border: 1px solid color-mix(in oklch, var(--role-color) 60%, transparent);
  color: var(--role-color);
  font-size: 0.55rem;
  font-weight: 800;
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ── Config Section ────────────────────────────────────────────────────────── */
.role-config-section {
  margin: 0 0.75rem 0.9rem;
  padding: 1rem;
  border: 1px solid #3a2a10;
  border-radius: 8px;
  background: linear-gradient(180deg, #100f0a 0%, #0c0b07 100%);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.4);
}

.role-config-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #2a1a08;
}

.role-config-header-icon {
  font-size: 1.1rem;
}

.role-config-header > span:nth-child(2) {
  font-size: 0.85rem;
  font-weight: 800;
  color: #f0d060;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex: 1;
}

.role-config-header-hint {
  font-size: 0.64rem !important;
  color: rgba(255, 255, 255, 0.3) !important;
  font-weight: 400 !important;
  text-transform: none !important;
  letter-spacing: 0.01em !important;
  white-space: nowrap;
}

/* ── Config Grid ───────────────────────────────────────────────────────────── */
.role-config-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.55rem;
  margin-bottom: 0.75rem;
}

/* ── Config Button ─────────────────────────────────────────────────────────── */
.config-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 0.4rem 0.6rem;
  background: #161410;
  border: 1px solid #2e1e0a;
  border-radius: 6px;
  cursor: pointer;
  color: inherit;
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s,
    transform 0.1s;
  position: relative;
}

.config-btn:hover {
  background: #1e1a10;
  border-color: #6a3e18;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
}

.config-btn--active {
  background: #121a0e;
  border: 1px solid #70c040;
  box-shadow:
    0 0 10px rgba(112, 192, 64, 0.25),
    inset 0 0 10px rgba(112, 192, 64, 0.05);
}

/* ── Config Img Wrapper ────────────────────────────────────────────────────── */
.config-btn-img-wrap {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.config-btn-img {
  width: 38px;
  height: 38px;
  object-fit: contain;
  transition: transform 0.15s;
}

.config-btn:hover .config-btn-img {
  transform: scale(1.1);
}

.config-btn--active .config-btn-img {
  filter: drop-shadow(0 0 6px rgba(112, 192, 64, 0.5));
}

.config-btn-img-placeholder {
  font-size: 1.4rem;
  opacity: 0.4;
}

/* ── Config Label ──────────────────────────────────────────────────────────── */
.config-btn-label {
  font-size: 0.66rem;
  font-weight: 600;
  color: #c0b890;
  text-align: center;
  line-height: 1.25;
}

.config-btn--active .config-btn-label {
  color: #90e050;
  font-weight: 700;
}

/* ── Config Check ──────────────────────────────────────────────────────────── */
.config-btn-check {
  position: absolute;
  top: 4px;
  right: 5px;
  font-size: 0.6rem;
  color: #70c040;
  font-weight: 900;
}

/* ── Confirm Button ────────────────────────────────────────────────────────── */
.config-confirm-btn {
  width: 100%;
  padding: 0.6rem 1rem;
  background: linear-gradient(180deg, #1c2a10 0%, #141e0c 100%);
  border: 1px solid #5a9030;
  border-radius: 5px;
  color: #90e050;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  box-shadow: 0 0 8px rgba(90, 144, 48, 0.15);
}

.config-confirm-btn:hover {
  border-color: #70c040;
  background: linear-gradient(180deg, #243414 0%, #1a2810 100%);
  box-shadow: 0 0 16px rgba(112, 192, 64, 0.25);
  color: #a8f060;
}

/* ── Config Slide Transition ───────────────────────────────────────────────── */
.config-slide-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    max-height 0.25s ease;
  max-height: 400px;
  overflow: hidden;
}

.config-slide-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    max-height 0.2s ease;
  max-height: 400px;
  overflow: hidden;
}

.config-slide-enter-from,
.config-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

/* ── Modal Transition ──────────────────────────────────────────────────────── */
.role-modal-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.role-modal-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.role-modal-enter-from,
.role-modal-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}
</style>
