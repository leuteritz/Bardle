<!-- frontend/src/components/bardProfil/planet/PlanetShopSection.vue -->
<template>
  <section class="planet-shop-section">
    <div class="planet-shop-header">
      <span class="planet-shop-title">🪐 Orbit-Slots</span>
      <span class="planet-shop-subtitle"
        >{{ store.purchasedSlots.length }}/{{ store.slots.length }} gekauft</span
      >
    </div>

    <div class="planet-slot-list">
      <div
        v-for="(slot, idx) in store.slots"
        :key="slot.id"
        class="planet-slot-row"
        :class="{
          'planet-slot-row--purchased': slot.purchased,
          'planet-slot-row--locked': !slot.purchased && !store.canAffordSlot(slot.id),
        }"
      >
        <!-- Orbit indicator -->
        <div class="slot-orbit-icon">
          <div
            class="slot-orbit-dot"
            :style="{ background: slot.purchased && slot.role ? roleColor(slot.role) : '#444' }"
          />
          <span class="slot-orbit-num">{{ idx + 1 }}</span>
        </div>

        <!-- Info -->
        <div class="slot-info">
          <template v-if="!slot.purchased">
            <div class="slot-name">Orbit-Slot {{ idx + 1 }}</div>
            <div class="slot-desc">Neue Umlaufbahn freischalten</div>
          </template>
          <template v-else-if="!slot.role">
            <div class="slot-name slot-name--bought">Slot {{ idx + 1 }} – Bereit</div>
            <div class="slot-desc slot-desc--warn">Keine Rolle zugewiesen</div>
          </template>
          <template v-else>
            <div class="slot-name" :style="{ color: roleColor(slot.role) }">
              {{ roleIcon(slot.role) }} {{ roleName(slot.role) }}
            </div>
            <div class="slot-desc slot-desc--bonus">{{ roleBonusShort(slot.role) }}</div>
          </template>
        </div>

        <!-- Action button -->
        <div class="slot-action">
          <template v-if="!slot.purchased">
            <button
              class="slot-btn slot-btn--buy"
              :disabled="!store.canAffordSlot(slot.id)"
              @click="store.buySlot(slot.id)"
            >
              <span class="slot-btn-cost">🔔 {{ formatNumber(store.getSlotCost(slot.id)) }}</span>
              <span class="slot-btn-label">Kaufen</span>
            </button>
          </template>
          <template v-else-if="!slot.role">
            <button class="slot-btn slot-btn--assign" @click="store.openRoleModal(slot.id)">
              <span class="slot-btn-label">Rolle wählen</span>
            </button>
          </template>
          <template v-else>
            <button class="slot-btn slot-btn--reprogram" @click="store.openRoleModal(slot.id)">
              <span class="slot-btn-label">Umprogr.</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { usePlanetShopStore, PLANET_ROLES } from '../../../stores/planetShopStore'
import type { PlanetRoleType } from '../../../stores/planetShopStore'

export default defineComponent({
  name: 'PlanetShopSection',
  setup() {
    const store = usePlanetShopStore()

    function roleColor(role: PlanetRoleType): string {
      return PLANET_ROLES[role].color
    }

    function roleIcon(role: PlanetRoleType): string {
      return PLANET_ROLES[role].icon
    }

    function roleName(role: PlanetRoleType): string {
      return PLANET_ROLES[role].name
    }

    function formatNumber(n: number): string {
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
      if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
      return n.toString()
    }

    function roleBonusShort(role: PlanetRoleType): string {
      const r = PLANET_ROLES[role]
      switch (r.bonusType) {
        case 'auto_attack_dps':
          return `+${r.bonusPerSlot} DPS/s`
        case 'material_harvest_rate':
          return `Ernte alle 30s`
        case 'expedition_reward_multiplier':
          return `+${Math.round(r.bonusPerSlot * 100)}% Exped.`
        case 'boss_damage_reduction':
          return `-${Math.round(r.bonusPerSlot * 100)}% Orbit-Dmg`
        case 'offline_boost':
          return `+${Math.round(r.bonusPerSlot * 100)}% Offline`
        case 'building_cps_multiplier':
          return `+${Math.round(r.bonusPerSlot * 100)}% Gebäude-CPS`
      }
    }

    return { store, formatNumber, roleColor, roleIcon, roleName, roleBonusShort }
  },
})
</script>

<style scoped>
.planet-shop-section {
  padding: 0;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.planet-shop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.75rem;
  background: #1e1006;
  border-bottom: 2px solid #5c3310;
}

.planet-shop-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.04em;
}

.planet-shop-subtitle {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.35);
}

/* ── Slot list ─────────────────────────────────────────────────────────────── */
.planet-slot-list {
  display: flex;
  flex-direction: column;
}

.planet-slot-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  background: #1a1008;
  border-bottom: 1px solid #2a1a08;
  transition: background 0.15s;
}

.planet-slot-row:last-child {
  border-bottom: none;
}

.planet-slot-row--purchased {
  background: #1c1a10;
}

.planet-slot-row--locked {
  opacity: 0.5;
}

/* ── Orbit icon ────────────────────────────────────────────────────────────── */
.slot-orbit-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.slot-orbit-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #5c3310;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.slot-orbit-num {
  font-size: 0.58rem;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1;
}

/* ── Slot info ─────────────────────────────────────────────────────────────── */
.slot-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.slot-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: #c8c0a0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-name--bought {
  color: #a8e060;
}

.slot-desc {
  font-size: 0.64rem;
  color: rgba(255, 255, 255, 0.35);
}

.slot-desc--warn {
  color: #c89040;
}

.slot-desc--bonus {
  color: #e8c040;
  font-weight: 600;
}

/* ── Buttons ───────────────────────────────────────────────────────────────── */
.slot-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 0.3rem 0.45rem;
  border-radius: 4px;
  border: 1px solid #5c3310;
  cursor: pointer;
  min-width: 62px;
  transition:
    background 0.15s,
    border-color 0.15s,
    opacity 0.15s;
  color: inherit;
}

.slot-btn--buy {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border-color: #6ec040;
}

.slot-btn--buy:hover:not(:disabled) {
  background: linear-gradient(to bottom, #60cc38, #3a9020);
}

.slot-btn--buy:disabled {
  background: #1a1a14;
  border-color: #3a2a10;
  opacity: 0.45;
  cursor: not-allowed;
}

.slot-btn--assign {
  background: linear-gradient(to bottom, #4a7ec0, #2a4e90);
  border-color: #5a8ee0;
}

.slot-btn--assign:hover {
  background: linear-gradient(to bottom, #5a8ed0, #3a5ea0);
}

.slot-btn--reprogram {
  background: #1c1c18;
  border-color: #5c3310;
}

.slot-btn--reprogram:hover {
  background: #282418;
  border-color: #7a4e20;
}

.slot-btn-cost {
  font-size: 0.68rem;
  font-weight: 700;
  color: #e8c040;
  white-space: nowrap;
}

.slot-btn-label {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}
</style>
