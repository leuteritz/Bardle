<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { usePlanetShopStore, PLANET_ROLES_LIST, PLANET_ROLES } from '@/stores/planetShopStore'
import type { PlanetRole, PlanetRoleType } from '@/stores/planetShopStore'
import { MATERIALS } from '@/config/materials'

const CPS_BUILDINGS = [
  { id: 'glockenturm', name: 'Glockenturm', icon: '/img/Glockenturm.png' },
  { id: 'klanggenerator', name: 'Klang Generator', icon: '/img/KlangGenerator.png' },
  { id: 'harmoniewerk', name: 'Harmonie Werk', icon: '/img/HarmonieWerk.png' },
  { id: 'sphaerenMusik', name: 'Sphären Musik', icon: '/img/SphaerenMusik.png' },
  { id: 'zeitEcho', name: 'Zeit Echo', icon: '/img/ZeitEcho.png' },
]

const uiStore = useUiStore()
const store = usePlanetShopStore()

const purchasedSlots = computed(() => store.slots.filter((s) => s.purchased))

const selectedSlotId = ref<string | null>(null)

function initSlot() {
  selectedSlotId.value =
    uiStore.planetActiveSlotId ?? store.slots.find((s) => s.purchased)?.id ?? null
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

function assignRole(roleId: PlanetRoleType) {
  if (!activeSlot.value) return
  if (activeSlot.value.role === roleId) return
  store.assignRole(activeSlot.value.id, roleId)
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
</script>

<template>
  <div class="ps-tab">
    <!-- Slot-Leiste: IMMER alle 6 Slots rendern, ganz oben -->
    <div class="ps-slot-bar" style="--cols: 6">
      <button
        v-for="slot in store.slots"
        :key="slot.id"
        class="ps-slot-btn"
        :class="{
          'ps-slot-btn--active': selectedSlotId === slot.id,
          'ps-slot-btn--locked': !slot.purchased,
        }"
        :style="slot.role ? { '--rc': PLANET_ROLES[slot.role].color } : {}"
        :disabled="!slot.purchased"
        @click="slot.purchased && selectSlot(slot.id)"
      >
        <span v-if="!slot.purchased" class="ps-slot-btn-lock">🔒</span>
        <template v-else>
          <img
            v-if="slot.role"
            :src="PLANET_ROLES[slot.role].image"
            class="ps-slot-btn-img"
            alt=""
          />
          <span v-else class="ps-slot-btn-placeholder">＋</span>
          <template v-if="slot.maxHp > 0">
            <span class="ps-slot-btn-hp-text">❤ {{ slot.currentHp }} / {{ slot.maxHp }}</span>
            <div class="ps-slot-btn-hp-track">
              <div
                class="ps-slot-btn-hp-fill"
                :style="{ width: Math.max(0, Math.min(100, (slot.currentHp / slot.maxHp) * 100)) + '%' }"
              />
            </div>
          </template>
        </template>
        <span class="ps-slot-btn-label">Orbit {{ slot.id.replace('slot_', '') }}</span>
      </button>
    </div>

    <!-- Goldlinie – Trennlinie unter Slots -->
    <div class="ps-goldline" />

    <!-- Hinweistext: mittig im verbleibenden Raum, nur wenn noch nichts gekauft -->
    <div v-if="purchasedSlots.length === 0" class="ps-empty ps-empty--hint">
      <span class="ps-empty-icon">🪐</span>
      <span class="ps-empty-text">Kaufe deinen ersten Planeten-Slot im Command Panel.</span>
    </div>

    <!-- Kein Slot ausgewählt -->
    <div v-if="purchasedSlots.length > 0 && !activeSlot" class="ps-empty ps-empty--small">
      <span class="ps-empty-text">Wähle einen Slot oben aus.</span>
    </div>

    <template v-if="activeSlot">
        <!-- 3-Spalten-Body -->
        <div class="ps-body">
          <!-- Linke Rollenspalte -->
          <div class="ps-role-col">
            <button
              v-for="role in rolesLeft"
              :key="role.id"
              class="ps-role-option"
              :class="{ 'ps-role-option--selected': activeSlot.role === role.id }"
              :style="{ '--rc': role.color }"
              @click="assignRole(role.id)"
            >
              <span class="ps-role-icon">{{ role.icon }}</span>
              <span class="ps-role-name">{{ role.name }}</span>
              <div class="ps-role-divider" />
              <span class="ps-role-effect">{{ bonusText(role) }}</span>
              <div v-if="activeSlot.role === role.id" class="ps-role-badge">✓ Aktiv</div>
            </button>
          </div>

          <!-- Mittlere Spalte: Planet -->
          <div class="ps-center-col">
            <!-- HP -->
            <div class="ps-planet-hp">
              <div class="ps-planet-hp-text">
                <span class="ps-hp-heart">❤</span>
                <span class="ps-hp-values"
                  >{{ activeSlot.currentHp }} / {{ activeSlot.maxHp }}</span
                >
              </div>
              <div class="ps-hp-bar-track">
                <div class="ps-hp-bar-fill" :style="{ width: hpPercent + '%' }" />
              </div>
            </div>

            <!-- Planetenbild -->
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

            <!-- Rollenname -->
            <div class="ps-planet-role-label" :style="{ color: activeRoleColor }">
              {{ activeRoleName }}
            </div>

            <!-- Jungle-Buff -->
            <Transition name="ps-config-slide">
              <div v-if="activeSlot.jungleBuff?.active" class="ps-jungle-buff-panel">
                <div class="ps-jungle-buff-header">
                  <span class="ps-jungle-buff-leaf">🌿</span>
                  <span class="ps-jungle-buff-title">Jungle Buff</span>
                  <span class="ps-jungle-buff-timer">{{ jungleBuffSecsLeft }}s</span>
                </div>
                <div class="ps-jungle-buff-row">
                  <span class="ps-jungle-buff-name">{{ activeSlot.jungleBuff.buffType }}</span>
                </div>
                <div class="ps-jungle-buff-row">
                  <span class="ps-jungle-buff-label">Multiplikator</span>
                  <span class="ps-jungle-buff-value">×{{ activeSlot.jungleBuff.multiplier }}</span>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Rechte Rollenspalte -->
          <div class="ps-role-col">
            <button
              v-for="role in rolesRight"
              :key="role.id"
              class="ps-role-option"
              :class="{ 'ps-role-option--selected': activeSlot.role === role.id }"
              :style="{ '--rc': role.color }"
              @click="assignRole(role.id)"
            >
              <span class="ps-role-icon">{{ role.icon }}</span>
              <span class="ps-role-name">{{ role.name }}</span>
              <div class="ps-role-divider" />
              <span class="ps-role-effect">{{ bonusText(role) }}</span>
              <div v-if="activeSlot.role === role.id" class="ps-role-badge">✓ Aktiv</div>
            </button>
          </div>
        </div>

        <!-- Config: harvest_node -->
        <Transition name="ps-config-slide">
          <div v-if="activeSlot.role === 'harvest_node'" class="ps-config-section">
            <div class="ps-config-header">
              <span class="ps-config-header-icon">🌾</span>
              <span>Material auswählen</span>
              <span class="ps-config-header-hint">Wähle das zu erntende Material</span>
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
                <div
                  v-if="activeSlot.slotConfig?.materialId === mat.id"
                  class="ps-config-btn-check"
                >
                  ✓
                </div>
              </button>
            </div>
          </div>
        </Transition>

        <!-- Config: resonance_tower -->
        <Transition name="ps-config-slide">
          <div v-if="activeSlot.role === 'resonance_tower'" class="ps-config-section">
            <div class="ps-config-header">
              <span class="ps-config-header-icon">🏗️</span>
              <span>Gebäude auswählen</span>
              <span class="ps-config-header-hint">Welches Gebäude soll verstärkt werden?</span>
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
                  <div v-else class="ps-config-btn-img-placeholder">🏗</div>
                </div>
                <span class="ps-config-btn-label">{{ bld.name }}</span>
                <div
                  v-if="activeSlot.slotConfig?.buildingId === bld.id"
                  class="ps-config-btn-check"
                >
                  ✓
                </div>
              </button>
            </div>
          </div>
        </Transition>

        <!-- Goldlinie unten -->
        <div class="ps-goldline ps-goldline--bottom" />
      </template>
  </div>
</template>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────────── */
.ps-tab {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
  background: #111008;
  display: flex;
  flex-direction: column;
}

.ps-tab::-webkit-scrollbar {
  width: 6px;
}
.ps-tab::-webkit-scrollbar-track {
  background: #111;
}
.ps-tab::-webkit-scrollbar-thumb {
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

/* ── Slot-Leiste ───────────────────────────────────────────────────────────── */
.ps-slot-bar {
  display: grid;
  grid-template-columns: repeat(var(--cols, 1), 1fr);
  gap: 6px;
  padding: 8px 1rem;
  border-bottom: 2px solid #2a1a08;
  background: #16120a;
  flex-shrink: 0;
}

.ps-slot-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 8px;
  min-width: 0;
  background: #131210;
  border: 1px solid #2e1e0a;
  border-radius: 4px;
  cursor: pointer;
  color: inherit;
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}

.ps-slot-btn:hover {
  background: #1a1812;
  border-color: #5c3310;
}

.ps-slot-btn--active {
  background: #1a2010;
  border: 2px solid var(--rc, #52b830);
  box-shadow: 0 0 10px color-mix(in oklch, var(--rc, #52b830) 30%, transparent);
}

.ps-slot-btn-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 3px;
}

.ps-slot-btn-placeholder {
  font-size: 1.2rem;
  color: rgba(90, 142, 224, 0.35);
  line-height: 1;
  height: 36px;
  display: flex;
  align-items: center;
}

.ps-slot-btn-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.6);
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
  height: 3px;
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

/* ── 3-Spalten-Body ────────────────────────────────────────────────────────── */
.ps-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px) minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.85rem 0.85rem 0.5rem;
  /* Nimmt den verbleibenden Platz ein */
  flex: 1;
  /* Alle 3 Spalten gleich hoch strecken */
  align-items: stretch;
}

/* ── Rollen-Spalten ────────────────────────────────────────────────────────── */
.ps-role-col {
  display: flex;
  flex-direction: column;
  /* Karten verteilen sich gleichmäßig über die volle Höhe */
  justify-content: space-between;
  gap: 0.5rem;
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
  /* Jede Karte wächst gleich */
  flex: 1;
  /* Inhalt vertikal zentriert innerhalb der Karte */
  justify-content: center;
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
  font-size: 2rem;
  line-height: 1;
  filter: drop-shadow(0 0 6px color-mix(in oklch, var(--rc) 55%, transparent));
  transition:
    transform 0.15s,
    filter 0.15s;
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

/* ── Mittlere Planet-Spalte ────────────────────────────────────────────────── */
.ps-center-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Planet-Inhalt vertikal zentriert in der vollen Spalthöhe */
  justify-content: center;
  gap: 0.7rem;
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
  width: 260px;
  height: 260px;
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
  border-radius: 4px;
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
  font-size: 0.9rem;
  line-height: 1;
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
  border-radius: 4px;
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

/* ── Locked Slot ───────────────────────────────────────────────────────────── */
.ps-slot-btn--locked {
  opacity: 0.4;
  filter: grayscale(60%);
  cursor: not-allowed;
  pointer-events: none;
}

.ps-slot-btn-lock {
  font-size: 1.4rem;
  line-height: 1;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

/* Leerstate mittig im verbleibenden Raum */
.ps-empty--hint {
  flex: 1;
  min-height: 200px;
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
</style>
