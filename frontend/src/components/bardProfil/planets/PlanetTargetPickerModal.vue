<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import type { PlanetSlot } from '@/stores/world/planetShopStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { MATERIALS } from '@/config/economy/materials'
import { MATERIAL_RARITY_COLOR } from '@/config/constants'

const props = defineProps<{ planet: PlanetSlot }>()
const emit = defineEmits<{ close: [] }>()

const store = usePlanetShopStore()
const shopStore = useShopStore()

function rarityColorOf(rarity: string): string {
  return MATERIAL_RARITY_COLOR[rarity] ?? MATERIAL_RARITY_COLOR.common
}

// Selecting keeps the modal open so the player can compare options and read every
// description; a "Done" button / scrim / ✕ closes it.
function chooseMaterial(materialId: string) {
  store.setSlotConfig(props.planet.id, { materialId })
}
function chooseBuilding(buildingId: string) {
  store.setSlotConfig(props.planet.id, { buildingId })
}
</script>

<template>
  <!-- Target picker — wood-framed modal. Rich selectable cards with icon,
       name, rarity and a one-line description; selecting applies instantly
       and keeps the modal open so options can be compared. -->
  <div class="ps-modal-scrim" @click.self="emit('close')">
    <div class="ps-modal">
      <span class="ps-modal-goldline" aria-hidden="true" />
      <div class="ps-modal-head">
        <span class="ps-modal-head-icon">
          <Icon
            :icon="planet.role === 'harvest_node' ? 'game-icons:wheat' : 'game-icons:radio-tower'"
            width="28"
            height="28"
          />
        </span>
        <div class="ps-modal-head-text">
          <span class="ps-modal-title">
            {{ planet.role === 'harvest_node' ? 'Harvest Target' : 'Resonance Target' }}
          </span>
          <span class="ps-modal-subtitle">
            {{
              planet.role === 'harvest_node'
                ? 'This planet harvests one material every 30s — choose which one flows into your inventory.'
                : 'This planet amplifies one building — choose which one gets the Chimes boost.'
            }}
          </span>
        </div>
        <button class="ps-modal-close" aria-label="Close" @click="emit('close')">✕</button>
      </div>

      <div class="ps-modal-body">
        <template v-if="planet.role === 'harvest_node'">
          <button
            v-for="mat in MATERIALS"
            :key="mat.id"
            class="ps-pick"
            :class="{ 'ps-pick--active': planet.slotConfig?.materialId === mat.id }"
            :style="{ '--tc': rarityColorOf(mat.rarity) }"
            @click="chooseMaterial(mat.id)"
          >
            <span class="ps-pick-medal">
              <img v-if="mat.image" :src="mat.image" class="ps-pick-icon" alt="" />
              <span v-else class="ps-pick-icon-missing">?</span>
            </span>
            <span class="ps-pick-body">
              <span class="ps-pick-name">{{ mat.name }}</span>
              <span class="ps-pick-rarity">{{ mat.rarity }}</span>
              <span class="ps-pick-desc">{{ mat.description }}</span>
            </span>
            <span
              v-if="planet.slotConfig?.materialId === mat.id"
              class="ps-pick-check"
              aria-hidden="true"
              >✓</span
            >
          </button>
        </template>
        <template v-else>
          <button
            v-for="bld in shopStore.cpsBuildings"
            :key="bld.id"
            class="ps-pick ps-pick--building"
            :class="{ 'ps-pick--active': planet.slotConfig?.buildingId === bld.id }"
            :style="{ '--tc': '#e8c040' }"
            @click="chooseBuilding(bld.id)"
          >
            <span class="ps-pick-medal">
              <img v-if="bld.icon" :src="bld.icon" class="ps-pick-icon" alt="" />
            </span>
            <span class="ps-pick-body">
              <span class="ps-pick-name">{{ bld.name }}</span>
              <span class="ps-pick-desc">Amplifies this building's Chimes production.</span>
            </span>
            <span
              v-if="planet.slotConfig?.buildingId === bld.id"
              class="ps-pick-check"
              aria-hidden="true"
              >✓</span
            >
          </button>
        </template>
      </div>

      <div class="ps-modal-foot">
        <button class="ps-modal-done" @click="emit('close')">✓ Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Target picker modal (harvest material / resonance building) ────────────── */
.ps-modal-scrim {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 3vh, 2rem);
  background: rgba(0, 0, 0, 0.74);
}

/* Wood-framed panel per the design system */
.ps-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: 84%;
  overflow: hidden;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 16px 48px rgba(0, 0, 0, 0.85);
}

/* Gold line pinned to the very top of the modal */
.ps-modal-goldline {
  flex-shrink: 0;
  height: 3px;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
}

.ps-modal-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(10px, 1vw, 15px);
  padding: clamp(11px, 1.4vh, 17px) clamp(13px, 1.2vw, 19px);
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.ps-modal-head-icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(42px, 5vh, 54px);
  height: clamp(42px, 5vh, 54px);
  background: radial-gradient(circle at 50% 38%, #2a1a08 0%, #120b04 100%);
  border: 1px solid #7a4e20;
  border-radius: 6px;
  color: #e8c040;
  box-shadow: inset 0 0 10px rgba(232, 192, 64, 0.18);
}

.ps-modal-head-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.ps-modal-title {
  font-size: clamp(1rem, 1.8vh, 1.3rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #f0d060;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.3);
}

.ps-modal-subtitle {
  font-size: clamp(0.7rem, 1.15vh, 0.85rem);
  font-weight: 600;
  line-height: 1.35;
  color: rgba(210, 195, 155, 0.75);
}

.ps-modal-close {
  flex-shrink: 0;
  align-self: flex-start;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1c1c18;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #cc6050;
  font-size: 0.95rem;
  font-weight: 900;
  cursor: pointer;
  transition: filter 150ms ease;
}

.ps-modal-close:hover {
  filter: brightness(1.35);
}

/* Popover/modal transition (name="ps-pop") */
.ps-pop-enter-active,
.ps-pop-leave-active {
  transition: opacity 0.2s ease;
}

.ps-pop-enter-active .ps-modal,
.ps-pop-leave-active .ps-modal {
  transition: transform 0.2s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.ps-pop-enter-from,
.ps-pop-leave-to {
  opacity: 0;
}

.ps-pop-enter-from .ps-modal,
.ps-pop-leave-to .ps-modal {
  transform: scale(0.94) translateY(10px);
}

/* Scrollable card list */
.ps-modal-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: clamp(8px, 1vh, 12px);
  padding: clamp(12px, 1.6vh, 18px);
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
  background: #1a1008;
}

.ps-modal-body::-webkit-scrollbar {
  width: 8px;
}

.ps-modal-body::-webkit-scrollbar-track {
  background: #111;
}

.ps-modal-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 4px;
}

/* Rich selectable card — icon medallion + name + rarity + description */
.ps-pick {
  --tc: #c8c8c8;
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(9px, 0.9vw, 13px);
  padding: clamp(9px, 1.1vh, 13px) clamp(11px, 1vw, 15px);
  padding-left: clamp(14px, 1.1vw, 18px);
  background: linear-gradient(120deg, #1c1a12 0%, #141109 100%);
  border: 1px solid #2e1e0a;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  overflow: hidden;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

/* Left rarity/gold accent stripe */
.ps-pick::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--tc);
  opacity: 0.85;
}

.ps-pick:hover {
  border-color: color-mix(in srgb, var(--tc) 70%, transparent);
  transform: translateY(-1px);
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.5),
    0 0 12px color-mix(in srgb, var(--tc) 22%, transparent);
}

.ps-pick:focus-visible {
  outline: none;
  border-color: var(--tc);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tc) 65%, transparent);
}

.ps-pick--active {
  background: linear-gradient(120deg, #14200e 0%, #101408 100%);
  border-color: var(--tc);
  box-shadow:
    0 0 16px color-mix(in srgb, var(--tc) 30%, transparent),
    inset 0 0 18px color-mix(in srgb, var(--tc) 8%, transparent);
}

.ps-pick-medal {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(46px, 5.4vh, 58px);
  height: clamp(46px, 5.4vh, 58px);
  background: radial-gradient(circle at 50% 36%, #161208 0%, #0a0805 100%);
  border: 1px solid color-mix(in srgb, var(--tc) 55%, #3a2a10);
  border-radius: 6px;
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--tc) 16%, transparent);
}

.ps-pick-icon {
  width: 78%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--tc) 50%, transparent));
  transition: transform 0.15s ease;
}

.ps-pick:hover .ps-pick-icon {
  transform: scale(1.08);
}

.ps-pick-icon-missing {
  font-size: 1.7rem;
  font-weight: 900;
  color: color-mix(in srgb, var(--tc) 65%, #6a5a30);
}

.ps-pick-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.ps-pick-name {
  font-size: clamp(0.9rem, 1.5vh, 1.12rem);
  font-weight: 800;
  line-height: 1.15;
  color: var(--tc);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tc) 30%, transparent);
}

.ps-pick-rarity {
  font-size: clamp(0.56rem, 0.9vh, 0.7rem);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--tc) 80%, #fff);
  opacity: 0.85;
}

.ps-pick-desc {
  margin-top: 1px;
  font-size: clamp(0.66rem, 1vh, 0.8rem);
  font-weight: 500;
  line-height: 1.3;
  color: rgba(200, 190, 160, 0.62);
}

.ps-pick-check {
  position: absolute;
  top: 7px;
  right: 9px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 0.82rem;
  font-weight: 900;
  color: #06301f;
  background: linear-gradient(135deg, #34d399, #059669);
  border: 1.5px solid #6ee7b7;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
}

/* Footer with the Done button */
.ps-modal-foot {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding: clamp(10px, 1.2vh, 14px) clamp(13px, 1.2vw, 19px);
  background: #16120a;
  border-top: 2px solid #5c3310;
}

.ps-modal-done {
  padding: clamp(8px, 1vh, 11px) clamp(22px, 2.5vw, 34px);
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 5px;
  color: #fff;
  font-size: clamp(0.82rem, 1.3vh, 0.98rem);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    filter 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.ps-modal-done:hover {
  filter: brightness(1.14);
  transform: translateY(-1px);
  box-shadow: 0 0 12px rgba(80, 200, 40, 0.5);
}

.ps-modal-done:active {
  transform: translateY(0) scale(0.97);
}

.ps-modal-done:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.9),
    0 0 14px rgba(232, 192, 64, 0.5);
}
</style>
