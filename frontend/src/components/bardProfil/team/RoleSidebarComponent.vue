<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { ROLES as ROLE_DEFS, ROLE_BY_KEY } from '@/config/constants'
import { CHAMPION_ROLES } from '@/config/championRoles'
import type { ChampionRole } from '@/types'

const ROLES = ROLE_DEFS.map((r) => r.label)
const ROLE_MAP = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.key])) as Record<string, ChampionRole>
const ROLE_COLORS = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.color]))

const battleStore = useBattleStore()
const uiStore = useUiStore()
const inventoryStore = useInventoryStore()
const { headerSlots, ownedChampions, recruitableChampions } = storeToRefs(battleStore)
const { rolesActiveSlot: activeSlotIndex } = storeToRefs(uiStore)

// Pro Rolle: Gesamtzahl, freigeschaltete und kaufbare Champions
const roleStats = computed(() =>
  ROLE_DEFS.map((r) => {
    const roleKey = r.key
    const total = Object.values(CHAMPION_ROLES).filter((v) => v === roleKey).length
    const owned = ownedChampions.value.filter((n) => CHAMPION_ROLES[n] === roleKey).length
    const affordableCount = recruitableChampions.value.filter(
      (c) => CHAMPION_ROLES[c.name] === roleKey && inventoryStore.hasMaterials(c.materialCost),
    ).length
    return { total, owned, affordableCount, canBuy: affordableCount > 0, complete: owned >= total && total > 0 }
  }),
)

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="role-sidebar">
    <div class="sidebar-section sidebar-section--roles">
      <div class="role-list">
        <button
          v-for="(role, i) in ROLES"
          :key="i"
          class="role-btn"
          :class="{
            'role-btn--active': activeSlotIndex === i,
            'role-btn--filled': headerSlots[i] !== null,
          }"
          :style="{ '--rc': ROLE_COLORS[role] }"
          @click="uiStore.setRolesActiveSlot(i)"
        >
          <img
            v-if="headerSlots[i]"
            :src="battleStore.getChampionImage(headerSlots[i]!)"
            :alt="headerSlots[i]!"
            class="role-btn-img"
            @error="onImgError"
          />
          <img
            v-else
            :src="ROLE_BY_KEY[ROLE_MAP[role]].image"
            :alt="role"
            class="role-btn-img role-btn-img--placeholder"
            @error="onImgError"
          />
          <div class="role-btn-gradient" />

          <!-- Grüner Glow wenn ein Champion dieser Rolle kaufbar ist -->
          <div v-if="roleStats[i].canBuy" class="role-affordable-glow" />

          <!-- Anzahl kaufbarer Champions dieser Rolle -->
          <div v-if="roleStats[i].affordableCount > 0" class="role-shop-count">
            +{{ roleStats[i].affordableCount }}
          </div>

          <span class="role-btn-label">{{ role }}</span>

          <!-- Fortschritts-Badge oben rechts: XX / YY oder ✓ wenn komplett -->
          <div
            class="role-progress-badge"
            :class="{ 'role-progress-badge--complete': roleStats[i].complete }"
          >
            <span v-if="roleStats[i].complete">✓</span>
            <span v-else>{{ roleStats[i].owned }} / {{ roleStats[i].total }}</span>
          </div>

          <div v-if="activeSlotIndex === i" class="role-btn-active-bar" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.role-sidebar {
  --r: 5px;
  display: flex;
  flex-direction: column;
  background: #0e0b05;
  overflow: hidden;
}
.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 8px 6px;
}
.sidebar-section--roles {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.role-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.role-btn {
  position: relative;
  padding: 0;
  border-radius: var(--r);
  overflow: hidden;
  cursor: pointer;
  background: #0a0804;
  border: 1px solid rgba(92, 51, 16, 0.35);
  flex: 1;
  min-height: 0;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.role-btn:hover {
  border-color: var(--rc);
  box-shadow: 0 0 10px color-mix(in srgb, var(--rc) 30%, transparent);
}
.role-btn--active {
  border-color: var(--rc) !important;
  box-shadow: 0 0 14px color-mix(in srgb, var(--rc) 45%, transparent) !important;
}
.role-btn-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  transition: transform 0.25s ease;
}
.role-btn:hover .role-btn-img {
  transform: scale(1.07);
}
.role-btn-img--placeholder {
  opacity: 0.18;
  filter: grayscale(55%);
}
.role-btn:hover .role-btn-img--placeholder {
  opacity: 0.38;
  filter: grayscale(30%);
}
.role-btn-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 65%;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.92) 0%,
    rgba(0, 0, 0, 0.5) 45%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 1;
}
.role-btn-label {
  position: absolute;
  bottom: 6px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rc);
  line-height: 1;
  z-index: 3;
  text-shadow:
    0 0 12px color-mix(in srgb, var(--rc) 70%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.95);
  pointer-events: none;
}
.role-btn-active-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--rc);
  box-shadow: 0 0 8px var(--rc);
  z-index: 4;
}

/* Fortschritts-Badge oben rechts */
.role-progress-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 4;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #c8a060;
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}
.role-progress-badge--complete {
  color: #e8c040;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 10px rgba(200, 144, 64, 0.6);
}

/* Anzahl kaufbarer Champions (top-left) */
.role-shop-count {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 4;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #6ec040;
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 10px rgba(82, 184, 48, 0.5);
  pointer-events: none;
}

/* Kaufbarer-Champion-Glow */
@keyframes affordable-pulse {
  0%, 100% { opacity: 0.55; }
  50%       { opacity: 1; }
}
.role-affordable-glow {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  background: radial-gradient(ellipse at 50% 40%, rgba(82, 184, 48, 0.28) 0%, transparent 70%);
  box-shadow: inset 0 0 14px rgba(82, 184, 48, 0.35);
  animation: affordable-pulse 2s ease-in-out infinite;
  pointer-events: none;
}
</style>
