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
        <div class="orbit-ability-card">
          <div class="ability-icon-frame">
            <img
              :src="roleImage"
              :alt="roleKey"
              class="ability-role-img"
              @error="onImgError"
            />
          </div>
          <span class="orbit-role-desc">{{ abilityCompact }}</span>
        </div>
        <div class="orbit-ability-tooltip">
          <div
            v-for="item in abilityDetails"
            :key="item.name"
            class="tooltip-row"
          >
            <span class="tooltip-key">{{ item.name }}</span>
            <span class="tooltip-sep">:</span>
            <span class="tooltip-val">{{ item.value ?? item.desc }}</span>
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
  --badge-icon-size: 18px;
  --badge-pad-v: 2px;
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
  padding: var(--badge-pad-v) 7px;
  pointer-events: none;
}
.origin-badge-icon {
  width: var(--badge-icon-size);
  height: var(--badge-icon-size);
  flex-shrink: 0;
  color: var(--oc, #e8c040);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}
.trait-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: var(--badge-pad-v) 7px;
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
  width: var(--badge-icon-size);
  height: var(--badge-icon-size);
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
.orbit-ability-trigger {
  position: relative;
  border-radius: var(--bp-radius);
  padding: 2px 0;
  transition: background 0.15s;
  cursor: default;
}
.orbit-ability-trigger:hover {
  background: rgba(200, 144, 64, 0.06);
}
.orbit-ability-card {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ability-icon-frame {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border: 2px solid #7a4e20;
  box-shadow: inset 0 0 0 1px #3e200a, 0 0 10px rgba(200, 144, 64, 0.35);
  border-radius: var(--bp-radius);
  flex-shrink: 0;
}
.ability-role-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  opacity: 0.9;
  filter: drop-shadow(0 0 6px rgba(200, 144, 64, 0.55));
}
.orbit-role-desc {
  font-size: 13px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.9);
  letter-spacing: 0.04em;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.orbit-ability-tooltip {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  width: max-content;
  min-width: 200px;
  max-width: 290px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: var(--bp-radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  padding: 8px 12px;
  z-index: 20;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s ease,
    visibility 0.2s,
    transform 0.2s ease;
  pointer-events: none;
}
.orbit-ability-trigger:hover .orbit-ability-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
.tooltip-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(92, 51, 16, 0.25);
}
.tooltip-row:last-child {
  border-bottom: none;
}
.tooltip-key {
  font-size: 11px;
  font-weight: 800;
  color: rgba(232, 192, 64, 0.9);
  white-space: nowrap;
  min-width: 72px;
  flex-shrink: 0;
}
.tooltip-sep {
  font-size: 11px;
  color: rgba(200, 144, 64, 0.35);
  flex-shrink: 0;
}
.tooltip-val {
  font-size: 12px;
  font-weight: 700;
  color: #e8c040;
  line-height: 1.4;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.35);
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
</style>
