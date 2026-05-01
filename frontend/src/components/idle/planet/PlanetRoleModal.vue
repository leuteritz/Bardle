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
          <!-- Goldlinie oben -->
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

          <!-- Haupt-Body: 3 Spalten -->
          <div class="role-modal-body">
            <!-- Linke Säule: Rollen 1–3 -->
            <div class="role-col">
              <button
                v-for="role in rolesLeft"
                :key="role.id"
                class="role-option"
                :class="{ 'role-option--selected': previewRole === role.id }"
                :style="{ '--rc': role.color }"
                @click="selectPreview(role.id)"
              >
                <span class="role-option-icon">{{ role.icon }}</span>
                <span class="role-option-name">{{ role.name }}</span>
                <div class="role-option-divider" />
                <span class="role-option-effect">{{ bonusText(role) }}</span>
                <div v-if="activeSlot.role === role.id" class="role-option-badge">✓ Aktiv</div>
              </button>
            </div>

            <!-- Mittlere Säule: HP + Planetenbild + Rollenname -->
            <div class="role-col role-col--center">
              <!-- HP-Anzeige -->
              <div class="planet-hp">
                <div class="planet-hp-text">
                  <span class="hp-heart">❤</span>
                  <span class="hp-values">{{ activeSlot.currentHp }} / {{ activeSlot.maxHp }}</span>
                </div>
                <div class="hp-bar-track">
                  <div class="hp-bar-fill" :style="{ width: hpPercent + '%' }" />
                </div>
              </div>

              <!-- Planetenbild mit Transition -->
              <div class="planet-preview-wrap">
                <Transition name="planet-swap" mode="out-in">
                  <img
                    :key="previewImage"
                    :src="previewImage"
                    class="planet-preview-img"
                    alt="Planet"
                  />
                </Transition>
              </div>

              <!-- Rollenname unter dem Bild -->
              <div class="planet-role-label" :style="{ color: previewRoleColor }">
                {{ previewRoleName }}
              </div>
            </div>

            <!-- Rechte Säule: Rollen 4–6 -->
            <div class="role-col">
              <button
                v-for="role in rolesRight"
                :key="role.id"
                class="role-option"
                :class="{ 'role-option--selected': previewRole === role.id }"
                :style="{ '--rc': role.color }"
                @click="selectPreview(role.id)"
              >
                <span class="role-option-icon">{{ role.icon }}</span>
                <span class="role-option-name">{{ role.name }}</span>
                <div class="role-option-divider" />
                <span class="role-option-effect">{{ bonusText(role) }}</span>
                <div v-if="activeSlot.role === role.id" class="role-option-badge">✓ Aktiv</div>
              </button>
            </div>
          </div>

          <!-- Config-Sektion: harvest_node → Material wählen -->
          <Transition name="config-slide">
            <div v-if="showConfig && activeSlot.role === 'harvest_node'" class="role-config-section">
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
                  <div v-if="activeSlot.slotConfig?.materialId === mat.id" class="config-btn-check">✓</div>
                </button>
              </div>
            </div>
          </Transition>

          <!-- Config-Sektion: resonance_tower → Gebäude wählen -->
          <Transition name="config-slide">
            <div v-if="showConfig && activeSlot.role === 'resonance_tower'" class="role-config-section">
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
                  <div v-if="activeSlot.slotConfig?.buildingId === bld.id" class="config-btn-check">✓</div>
                </button>
              </div>
            </div>
          </Transition>

          <!-- Footer: Bestätigen-Button -->
          <div v-if="!showConfig" class="role-modal-footer">
            <button
              class="confirm-btn"
              :disabled="previewRole === null || previewRole === activeSlot.role"
              @click="confirmRole()"
            >
              ✔ Auswählen
            </button>
          </div>

          <!-- Goldlinie unten -->
          <div class="role-modal-goldline role-modal-goldline--bottom" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import {
  usePlanetShopStore,
  PLANET_ROLES_LIST,
  PLANET_ROLES,
} from '../../../stores/planetShopStore'
import type { PlanetRole, PlanetRoleType } from '../../../stores/planetShopStore'
import { MATERIALS } from '../../../config/materials'

const CONFIGURABLE_ROLES: PlanetRoleType[] = ['harvest_node', 'resonance_tower']

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

    // Lokaler Preview-State – erst beim Bestätigen wird assignRole aufgerufen
    const previewRole = ref<PlanetRoleType | null>(null)
    // Ob config-Sektion sichtbar ist (nach Bestätigen einer konfigurierbaren Rolle)
    const showConfig = ref(false)

    // Reset wenn Modal für neuen Slot öffnet
    watch(
      () => store.activeRoleModalSlotId,
      () => {
        previewRole.value = activeSlot.value?.role ?? null
        showConfig.value = activeSlot.value?.role !== null &&
          CONFIGURABLE_ROLES.includes(activeSlot.value!.role!)
      },
    )

    function selectPreview(roleId: PlanetRoleType) {
      previewRole.value = roleId
      showConfig.value = false
    }

    function confirmRole() {
      if (!activeSlot.value || previewRole.value === null) return
      store.assignRole(activeSlot.value.id, previewRole.value)
      if (CONFIGURABLE_ROLES.includes(previewRole.value)) {
        showConfig.value = true
      } else {
        store.closeRoleModal()
      }
    }

    // Berechnete Werte für das Planetenbild im Zentrum
    const previewImage = computed(() => {
      const role = previewRole.value ?? activeSlot.value?.role
      return role ? PLANET_ROLES[role].image : '/img/planets/planet1.png'
    })

    const previewRoleName = computed(() => {
      const role = previewRole.value ?? activeSlot.value?.role
      return role ? PLANET_ROLES[role].name : '—'
    })

    const previewRoleColor = computed(() => {
      const role = previewRole.value ?? activeSlot.value?.role
      return role ? PLANET_ROLES[role].color : '#aaaaaa'
    })

    const hpPercent = computed(() => {
      if (!activeSlot.value || activeSlot.value.maxHp === 0) return 100
      return Math.max(0, Math.min(100, (activeSlot.value.currentHp / activeSlot.value.maxHp) * 100))
    })

    const rolesLeft = PLANET_ROLES_LIST.slice(0, 3)
    const rolesRight = PLANET_ROLES_LIST.slice(3, 6)

    function bonusText(role: PlanetRole): string {
      switch (role.bonusType) {
        case 'auto_attack_dps':
          return `+${role.bonusPerSlot} DPS/s auf Boss`
        case 'material_harvest_rate':
          return `1 Material alle 30s`
        case 'expedition_reward_multiplier':
          return `+${Math.round(role.bonusPerSlot * 100)}% Exp.-Belohnung`
        case 'boss_damage_reduction':
          return `-${Math.round(role.bonusPerSlot * 100)}% Boss-Schaden`
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
      previewRole,
      previewImage,
      previewRoleName,
      previewRoleColor,
      hpPercent,
      rolesLeft,
      rolesRight,
      showConfig,
      selectPreview,
      confirmRole,
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
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Card ──────────────────────────────────────────────────────────────────── */
.role-modal-card {
  width: clamp(520px, 92vw, 860px);
  max-height: 92vh;
  overflow-y: auto;
  background: #0d0c07;
  border: 3px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 12px 60px rgba(0, 0, 0, 0.95),
    0 0 80px rgba(180, 120, 20, 0.08);
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
  position: relative;
}

/* ── Goldlinie ─────────────────────────────────────────────────────────────── */
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

/* ── 3-Spalten-Body ────────────────────────────────────────────────────────── */
.role-modal-body {
  display: grid;
  grid-template-columns: 1fr 190px 1fr;
  gap: 0.75rem;
  padding: 1rem 1rem 0.5rem;
  align-items: start;
}

/* ── Rollen-Spalten (links & rechts) ───────────────────────────────────────── */
.role-col {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

/* ── Kompakte Rollen-Karte ─────────────────────────────────────────────────── */
.role-option {
  --rc: #aaaaaa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.8rem 0.5rem 0.7rem;
  background: #131210;
  border: 1px solid #2e1e0a;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  color: inherit;
  position: relative;
  transition:
    border-color 0.18s,
    background 0.18s,
    box-shadow 0.18s,
    transform 0.12s;
  width: 100%;
}

.role-option:hover {
  background: #1a1812;
  border-color: color-mix(in oklch, var(--rc) 70%, transparent);
  box-shadow: 0 0 10px color-mix(in oklch, var(--rc) 20%, transparent);
  transform: translateY(-1px);
}

.role-option--selected {
  background: #141812;
  border: 2px solid var(--rc);
  box-shadow:
    0 0 18px color-mix(in oklch, var(--rc) 35%, transparent),
    inset 0 0 20px color-mix(in oklch, var(--rc) 6%, transparent);
  transform: translateY(-2px);
}

.role-option-icon {
  font-size: 1.8rem;
  line-height: 1;
  filter: drop-shadow(0 0 6px color-mix(in oklch, var(--rc) 55%, transparent));
  transition: transform 0.15s, filter 0.15s;
}

.role-option:hover .role-option-icon,
.role-option--selected .role-option-icon {
  transform: scale(1.12);
  filter: drop-shadow(0 0 10px color-mix(in oklch, var(--rc) 85%, transparent));
}

.role-option-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: #d4c89a;
  letter-spacing: 0.03em;
  line-height: 1.2;
}

.role-option--selected .role-option-name {
  color: var(--rc);
}

.role-option-divider {
  width: 55%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in oklch, var(--rc) 30%, transparent),
    transparent
  );
}

.role-option-effect {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--rc);
  line-height: 1.3;
  text-shadow: 0 0 6px color-mix(in oklch, var(--rc) 40%, transparent);
}

.role-option-badge {
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

/* ── Mittlere Spalte ───────────────────────────────────────────────────────── */
.role-col--center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  padding-top: 0.25rem;
}

/* ── HP-Anzeige ────────────────────────────────────────────────────────────── */
.planet-hp {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.planet-hp-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.hp-heart {
  font-size: 0.85rem;
  color: #e84040;
  filter: drop-shadow(0 0 4px rgba(232, 64, 64, 0.5));
}

.hp-values {
  font-size: 0.78rem;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.03em;
}

.hp-bar-track {
  width: 100%;
  height: 6px;
  background: #1c1c18;
  border: 1px solid #3a2a10;
  border-radius: 3px;
  overflow: hidden;
}

.hp-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #cc3030, #e84040);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* ── Planetenbild ──────────────────────────────────────────────────────────── */
.planet-preview-wrap {
  position: relative;
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.planet-preview-img {
  width: 140px;
  height: 140px;
  object-fit: contain;
  filter: drop-shadow(0 0 24px rgba(180, 140, 60, 0.35));
}

.planet-role-label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 0 10px currentColor;
  min-height: 1.2em;
}

/* ── Planet-Bild Transition ────────────────────────────────────────────────── */
.planet-swap-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.planet-swap-leave-active {
  transition: opacity 0.15s ease;
}

.planet-swap-enter-from {
  opacity: 0;
  transform: scale(0.82);
}

.planet-swap-leave-to {
  opacity: 0;
}

/* ── Footer: Bestätigen ────────────────────────────────────────────────────── */
.role-modal-footer {
  display: flex;
  justify-content: center;
  padding: 0.6rem 1rem 0.75rem;
}

.confirm-btn {
  padding: 0.6rem 2.5rem;
  background: linear-gradient(180deg, #52b830 0%, #2e7a1a 100%);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #e8ffe0;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.1s;
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.2);
}

.confirm-btn:hover:not(:disabled) {
  background: linear-gradient(180deg, #64d840 0%, #3a9020 100%);
  border-color: #80e040;
  box-shadow: 0 0 18px rgba(100, 216, 64, 0.35);
  transform: translateY(-1px);
}

.confirm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(55%);
}

/* ── Config-Sektion ────────────────────────────────────────────────────────── */
.role-config-section {
  margin: 0 0.75rem 0.75rem;
  padding: 1rem;
  border: 1px solid #3a2a10;
  border-radius: 4px;
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

.role-config-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.55rem;
  margin-bottom: 0.5rem;
}

.config-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 0.4rem 0.6rem;
  background: #161410;
  border: 1px solid #2e1e0a;
  border-radius: 4px;
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

.config-btn-img-wrap {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
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

.config-btn-check {
  position: absolute;
  top: 4px;
  right: 5px;
  font-size: 0.6rem;
  color: #70c040;
  font-weight: 900;
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
