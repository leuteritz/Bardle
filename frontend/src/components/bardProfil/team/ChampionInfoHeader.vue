<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { ChampionRole, RoleAbilityDetail, RoleStat, TraitDefinition } from '@/types'
import { ORIGIN_SYNERGIES } from '@/config/championOrigins'

interface Props {
  championName: string
  origin: string | null
  originColor: string
  championTraits: TraitDefinition[]
  roleKey: ChampionRole
  roleImage: string
  roleLabel: string
  abilityCompact: string
  abilityDetails: RoleAbilityDetail[]
  roleStats: RoleStat[]
}

defineProps<Props>()

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}

function getOriginIcon(o: string | null): string {
  if (!o) return ''
  return (ORIGIN_SYNERGIES as Record<string, { icon: string } | undefined>)[o]?.icon ?? ''
}
</script>

<template>
  <div class="splash-info-box">
    <div class="splash-name-in-box">{{ championName }}</div>
    <div class="badges-row">
      <div
        v-if="origin"
        class="splash-origin-badge"
        :style="{ '--oc': originColor }"
      >
        <Icon
          v-if="getOriginIcon(origin).includes(':')"
          :icon="getOriginIcon(origin)"
          class="origin-badge-icon"
        />
        {{ origin }}
      </div>
      <div
        v-for="trait in championTraits"
        :key="trait.id"
        class="trait-chip"
        :style="{ '--tc': trait.color }"
      >
        <Icon :icon="trait.icon" class="trait-chip-icon" />
        <span class="trait-chip-name">{{ trait.name }}</span>
      </div>
    </div>
    <div class="splash-role-orbit-list">
      <div class="orbit-ability-trigger">
        <div class="orbit-role-row">
          <img
            :src="roleImage"
            :alt="roleKey"
            class="orbit-role-img"
            @error="onImgError"
          />
          <span class="orbit-role-name">{{ roleLabel }}</span>
          <span class="orbit-role-desc">{{ abilityCompact }}</span>
        </div>
        <div class="orbit-ability-detail">
          <div
            v-for="item in abilityDetails"
            :key="item.name"
            class="ability-detail-row"
          >
            <span class="ability-detail-name">{{ item.name }}</span>
            <span class="ability-detail-sep">–</span>
            <span class="ability-detail-desc">{{ item.desc }}</span>
            <span v-if="item.value" class="ability-detail-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="splash-role-fx-in-box">
      <div
        v-for="stat in roleStats.filter((s) => /\d/.test(s.value))"
        :key="stat.key"
        class="role-fx-row"
      >
        <span class="role-fx-label">{{ stat.label }}</span>
        <span class="role-fx-value">{{ stat.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.splash-info-box {
  position: absolute;
  top: 44px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 7;
  background: rgba(8, 5, 2, 0.88);
  border: 1px solid rgba(122, 78, 32, 0.75);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 10px 24px 13px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}
.splash-name-in-box {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #f0d870;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    0 2px 14px rgba(0, 0, 0, 0.95),
    0 0 32px rgba(200, 144, 64, 0.45);
}
.badges-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.splash-origin-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--oc, #e8c040);
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid var(--oc, #5c3310);
  border-radius: 3px;
  padding: 1px 7px;
  pointer-events: none;
}
.origin-badge-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--oc, #e8c040);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}
.trait-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid var(--tc, #7a4e20);
  border-radius: 3px;
  color: var(--tc, #e8c040);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
.trait-chip-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.9);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
}
.trait-chip-name {
  line-height: 1;
}
.splash-role-orbit-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.4);
}
.orbit-role-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.orbit-role-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  opacity: 0.85;
  flex-shrink: 0;
  filter: drop-shadow(0 0 4px rgba(200, 144, 64, 0.55));
}
.orbit-role-name {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.9);
  white-space: nowrap;
  flex-shrink: 0;
  padding: 1px 5px;
  background: rgba(200, 144, 64, 0.08);
  border: 1px solid rgba(200, 144, 64, 0.2);
  border-radius: 3px;
}
.orbit-role-desc {
  font-size: 11px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.75);
  letter-spacing: 0.04em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.splash-role-fx-in-box {
  display: none;
}
.role-fx-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.role-fx-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
  flex: 1;
}
.role-fx-value {
  font-size: 14px;
  font-weight: 900;
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.5);
  letter-spacing: 0.03em;
  text-align: right;
  white-space: nowrap;
}
.orbit-ability-trigger {
  position: relative;
  border-radius: 4px;
  padding: 2px 0;
  transition: background 0.15s;
  cursor: default;
}
.orbit-ability-trigger:hover {
  background: rgba(200, 144, 64, 0.06);
}
.orbit-ability-detail {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  padding: 0 4px;
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
}
.orbit-ability-trigger:hover .orbit-ability-detail {
  max-height: 400px;
  opacity: 1;
}
.ability-detail-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(92, 51, 16, 0.2);
}
.ability-detail-row:last-child {
  border-bottom: none;
}
.ability-detail-name {
  font-size: 10px;
  font-weight: 800;
  color: rgba(232, 192, 64, 0.9);
  white-space: nowrap;
  min-width: 72px;
  flex-shrink: 0;
}
.ability-detail-sep {
  font-size: 10px;
  color: rgba(200, 144, 64, 0.3);
  flex-shrink: 0;
}
.ability-detail-desc {
  font-size: 10px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.6);
  flex: 1;
  line-height: 1.4;
}
.ability-detail-value {
  font-size: 11px;
  font-weight: 900;
  color: #e8c040;
  white-space: nowrap;
  flex-shrink: 0;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.45);
}
</style>
