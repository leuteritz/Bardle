<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { ROLES as ROLE_DEFS, ROLE_BY_KEY } from '@/config/constants'
import { CHAMPION_ROLES } from '@/config/championRoles'
import type { ChampionRole } from '@/types'

const ROLES = ROLE_DEFS.map((r) => r.label)
const ROLE_MAP = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.key])) as Record<
  string,
  ChampionRole
>
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
    const roleRecruitables = recruitableChampions.value.filter(
      (c) => CHAMPION_ROLES[c.name] === roleKey,
    )
    const recruitableCount = roleRecruitables.length
    const affordableCount = roleRecruitables.filter((c) =>
      inventoryStore.hasMaterials(c.materialCost),
    ).length
    return {
      total,
      owned,
      recruitableCount,
      affordableCount,
      canBuy: recruitableCount > 0,
      complete: owned >= total && total > 0,
    }
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
            'role-btn--complete': roleStats[i].complete,
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

          <!-- Anzahl freigeschalten Champions dieser Rolle -->
          <div v-if="roleStats[i].recruitableCount > 0" class="role-shop-count">
            +{{ roleStats[i].recruitableCount }}
          </div>

          <span class="role-btn-label">{{ role }}</span>

          <!-- Fortschritts-Badge oben rechts: immer Icon + XX/YY -->
          <div
            class="role-progress-badge"
            :class="{ 'role-progress-badge--complete': roleStats[i].complete }"
          >
            <Icon icon="game-icons:barbute" width="15" height="15" class="badge-icon" />
            <span class="badge-count">{{ roleStats[i].owned }}/{{ roleStats[i].total }}</span>
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
  top: 10px;
  right: 10px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 5px 2px 4px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #c8a060;
  line-height: 1;
  pointer-events: none;
}
.badge-icon {
  display: block;
  flex-shrink: 0;
  opacity: 0.85;
  color: currentColor;
}
.badge-count {
  line-height: 1;
}
.role-progress-badge--complete {
  color: #e8c040;
  background: rgba(0, 0, 0, 0.55);
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.35);
}
.role-btn--complete {
  border-color: rgba(200, 160, 48, 0.55);
  box-shadow:
    0 0 10px rgba(200, 160, 48, 0.22),
    inset 0 0 8px rgba(200, 160, 48, 0.06);
}

/* Anzahl freigeschalteter Champions (top-left) */
.role-shop-count {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 4;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  pointer-events: none;
  color: #c080e8;
  text-shadow:
    0 1px 4px rgba(0, 0, 0, 0.95),
    0 0 10px rgba(192, 128, 232, 0.45);
}

/* Kaufbarer-Champion-Glow */
@keyframes affordable-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
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
