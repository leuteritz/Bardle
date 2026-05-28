<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { ROLES as ROLE_DEFS, ROLE_BY_KEY } from '@/config/constants'
import type { ChampionRole } from '@/types'

const ROLES = ROLE_DEFS.map((r) => r.label)
const ROLE_MAP = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.key])) as Record<string, ChampionRole>
const ROLE_COLORS = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.color]))

const battleStore = useBattleStore()
const { headerSlots } = storeToRefs(battleStore)

defineProps<{
  activeSlotIndex: number
}>()

const emit = defineEmits<{
  selectSlot: [index: number]
}>()

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
          @click="emit('selectSlot', i)"
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
          <span class="role-btn-label">{{ role }}</span>
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
  z-index: 2;
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
  z-index: 3;
}
</style>
