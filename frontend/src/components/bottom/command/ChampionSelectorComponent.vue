<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { useRoleAbilityStates } from '@/composables/useRoleAbilityStates'
import { championInForeground } from '@/utils/foregroundGate'
import { ROLES, ROLE_HOVER_COLORS } from '@/config/constants'
import type { ChampionRole } from '@/types'

const battleStore = useBattleStore()
const uiStore = useUiStore()
const { headerSlots } = storeToRefs(battleStore)
const { roleAbilities } = useRoleAbilityStates()

function openPicker(slotIndex: number, subSlot: number = -1) {
  uiStore.requestOpenRolesTab(slotIndex, subSlot)
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function onSlotEnter(i: number) {
  uiStore.setHoveredChampionSlotIndex(i)
  if (headerSlots.value[i] !== null) {
    uiStore.setHoveredChampionRole(ROLES[i].key as ChampionRole)
  }
}

function onSlotLeave() {
  uiStore.setHoveredChampionSlotIndex(null)
  uiStore.setHoveredChampionRole(null)
}
</script>

<template>
  <div class="champ-cards">
    <button
      v-for="(slot, i) in headerSlots"
      :key="i"
      class="champ-card"
      :class="{
        'champ-card--filled': slot !== null,
        'champ-card--first': i === 0,
        'champ-card--last': i === headerSlots.length - 1,
        'champ-card--flash': roleAbilities[i].isFlashing,
        'champ-card--cd': roleAbilities[i].onCooldown && slot !== null,
        'champ-card--eclipsed': slot !== null && !championInForeground(slot),
      }"
      :style="{
        '--role-color': ROLES[i].orbit.color,
        '--hover-role-color': ROLE_HOVER_COLORS[ROLES[i].key],
      }"
      :title="
        slot
          ? `${slot} (${ROLES[i].label}) – click to change`
          : `${ROLES[i].label} – Select Champion`
      "
      @click="openPicker(i)"
      @mouseenter="onSlotEnter(i)"
      @mouseleave="onSlotLeave()"
    >
      <!-- role-colored header bar -->
      <div class="champ-card-bar" />

      <!-- portrait body -->
      <div class="champ-card-body">
        <img
          v-if="slot"
          :src="battleStore.getChampionImage(slot)"
          :alt="slot"
          class="champ-card-portrait"
          @error="onImgError"
        />
        <img
          v-else
          :src="ROLES[i].image"
          :alt="ROLES[i].short"
          class="champ-card-portrait champ-card-portrait--placeholder"
          aria-hidden="true"
        />
        <div class="champ-card-hover-glow" aria-hidden="true" />

        <!-- ability state (role ability tracking, was in the old bottom stats) -->
        <template v-if="slot !== null">
          <span
            v-if="roleAbilities[i].onCooldown && roleAbilities[i].timer"
            class="champ-card-cd-pill"
          >
            {{ roleAbilities[i].timer }}
          </span>
          <span v-else class="champ-card-ready-dot" aria-hidden="true" />

          <!-- Eclipse: Champion fliegt gerade hinter der Sonne — Fähigkeiten
               warten, kein Angriff möglich. Großes Medaillon mittig im
               Porträt, klar getrennt von Ability-Pill (oben rechts) und
               Rollen-Label (unten). -->
          <Transition name="champ-eclipse">
            <div
              v-if="!championInForeground(slot)"
              class="champ-card-eclipse-medal"
              title="Behind the Sun — combat paused"
            >
              <Icon icon="game-icons:eclipse-flare" width="30" height="30" />
            </div>
          </Transition>
        </template>

        <!-- role label -->
        <div class="champ-card-label">{{ ROLES[i].short }}</div>
      </div>
    </button>
  </div>
</template>

<style scoped>
.champ-cards {
  display: flex;
  gap: 9px;
  flex: 1;
  min-height: 0;
  align-items: stretch;
  width: 100%;
  height: 100%;
}

/* ── Card ── */
.champ-card {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.15s ease;
}
.champ-card:hover {
  transform: translateY(-1px);
}
.champ-card:active {
  transform: translateY(0) scale(0.98);
}

/* role-colored top bar with glow */
.champ-card-bar {
  height: 5px;
  flex-shrink: 0;
  border-radius: 3px 3px 0 0;
  background: var(--role-color, #c89040);
  box-shadow: 0 0 8px color-mix(in srgb, var(--role-color, #c89040) 60%, transparent);
}
/* first card: the flat 5px bar can't bend around the 44px shell arc (CSS clamps
   the radius to the bar height) — the color is drawn as the body's top border
   instead, which follows the curve natively */
.champ-card--first .champ-card-bar {
  display: none;
}

/* portrait body */
.champ-card-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 2px solid var(--role-color, #c89040);
  border-top: none;
  border-radius: 0 0 5px 5px;
  background: #0e0c08;
  box-shadow: 0 0 10px color-mix(in srgb, var(--role-color, #c89040) 30%, transparent);
  transition: box-shadow 0.2s ease;
}
/* top-left corner follows the panel silhouette arc (frame geometry — exception
   to the 4-5px radius rule): shell arc 60px minus 20px panel gap = 40px, so the
   card corner runs concentric to the frame curve; the right panel edge sits
   flush with the screen edge, so the last card stays square up top */
.champ-card--first .champ-card-body {
  border-top: 5px solid var(--role-color, #c89040);
  border-bottom-left-radius: 5px;
  border-top-left-radius: 40px;
}
.champ-card:hover .champ-card-body {
  box-shadow:
    0 0 14px color-mix(in srgb, var(--role-color, #c89040) 55%, transparent),
    0 2px 8px rgba(0, 0, 0, 0.5);
}

.champ-card-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition:
    transform 0.25s ease,
    filter 0.3s ease;
}
/* ability on cooldown → portrait reads "not ready" at a glance */
.champ-card--cd .champ-card-portrait {
  filter: grayscale(60%) brightness(0.65);
}
.champ-card:hover .champ-card-portrait {
  transform: scale(1.06);
}

.champ-card-portrait--placeholder {
  opacity: 0.18;
  filter: grayscale(50%);
  object-fit: contain;
  object-position: center;
  transition:
    opacity 0.2s ease,
    filter 0.2s ease;
}
.champ-card:hover .champ-card-portrait--placeholder {
  opacity: 0.38;
  filter: grayscale(25%);
  transform: none;
}

/* hover glow inside the portrait */
.champ-card-hover-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 35%,
    color-mix(in srgb, var(--hover-role-color, #c89040) 22%, transparent),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.champ-card:hover .champ-card-hover-glow {
  opacity: 1;
}
.champ-card--filled:hover .champ-card-hover-glow {
  animation: champ-role-pulse 1.4s ease-in-out infinite;
}

@keyframes champ-role-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

/* ── Ability indicators ── */
.champ-card-ready-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--role-color, #c89040);
  border: 1px solid rgba(255, 235, 200, 0.7);
  box-shadow: 0 0 7px var(--role-color, #c89040);
  z-index: 4;
  pointer-events: none;
}

.champ-card-cd-pill {
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 0 10px;
  height: 29px;
  border-radius: 5px;
  background: rgba(10, 7, 3, 0.85);
  border: 2px solid var(--role-color, #c89040);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  font-size: 18px;
  letter-spacing: 0.03em;
  line-height: 1;
  color: #efe4c8;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  z-index: 4;
  pointer-events: none;
}

/* ── Eclipse: Champion hinter der Sonne ──
   Porträt taucht in kühlen Schatten, Rollen-Glow erlischt, goldener
   ✦-Chip atmet oben links — synchron zum Idle-Orbit & StarFightModal. */
.champ-card--eclipsed .champ-card-portrait {
  filter: grayscale(70%) brightness(0.45) saturate(0.6);
}
.champ-card--eclipsed .champ-card-body {
  border-color: color-mix(in srgb, var(--role-color, #c89040) 32%, #241c10);
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.65);
}
.champ-card--eclipsed .champ-card-bar {
  opacity: 0.35;
  box-shadow: none;
}
.champ-card--eclipsed .champ-card-ready-dot {
  opacity: 0.35;
  box-shadow: none;
}
.champ-card--eclipsed .champ-card-label {
  color: rgba(200, 188, 160, 0.5);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.champ-card-eclipse-medal {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 35% 30%, rgba(38, 26, 8, 0.95), rgba(10, 7, 3, 0.95));
  border: 2px solid #5c3310;
  box-shadow:
    0 0 0 1px rgba(200, 144, 64, 0.35),
    0 0 14px rgba(232, 192, 64, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.7);
  color: #e8c040;
  z-index: 4;
  pointer-events: none;
  animation: champ-eclipse-breathe 1.6s ease-in-out infinite alternate;
}
.champ-card-eclipse-medal :deep(svg) {
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.55));
}

@keyframes champ-eclipse-breathe {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

.champ-eclipse-enter-active,
.champ-eclipse-leave-active {
  transition: opacity 0.3s ease;
}
.champ-eclipse-enter-from,
.champ-eclipse-leave-to {
  opacity: 0;
}

/* ability just triggered → card flash */
.champ-card--flash .champ-card-body {
  animation: champ-card-flash 0.45s ease-out;
  box-shadow:
    0 0 16px var(--role-color, #c89040),
    0 0 30px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
}
.champ-card--flash .champ-card-ready-dot {
  animation: champ-dot-flash 0.45s ease-out;
}

@keyframes champ-card-flash {
  0% {
    box-shadow:
      0 0 26px var(--role-color, #c89040),
      0 0 50px color-mix(in srgb, var(--role-color, #c89040) 60%, transparent);
  }
  100% {
    box-shadow:
      0 0 16px var(--role-color, #c89040),
      0 0 30px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
  }
}

@keyframes champ-dot-flash {
  0% {
    transform: scale(1.6);
  }
  100% {
    transform: scale(1);
  }
}

/* ── Role label at the bottom ──
   Banner über die volle Kartenbreite: großzügiger Scrim, kräftige
   Versal-Typo in der Rollenfarbe — füllt die untere Kartenzone. */
.champ-card-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
  padding: 26px 0 8px;
  text-align: center;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-indent: 0.16em; /* gleicht das letter-spacing des letzten Zeichens aus */
  color: color-mix(in srgb, var(--role-color, #c89040) 55%, #f0e6d0);
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.55) 45%, rgba(0, 0, 0, 0.94));
  line-height: 1;
  pointer-events: none;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 12px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
  transition: color 0.2s ease, text-shadow 0.2s ease;
}
.champ-card:not(.champ-card--filled) .champ-card-label {
  color: color-mix(in srgb, var(--role-color, #c89040) 40%, rgba(200, 180, 140, 0.55));
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.champ-card:hover .champ-card-label {
  color: color-mix(in srgb, var(--role-color, #c89040) 40%, #fff);
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 16px color-mix(in srgb, var(--role-color, #c89040) 70%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .champ-card--filled:hover .champ-card-hover-glow,
  .champ-card--flash .champ-card-body,
  .champ-card--flash .champ-card-ready-dot,
  .champ-card-eclipse-medal {
    animation: none;
  }
}
</style>
