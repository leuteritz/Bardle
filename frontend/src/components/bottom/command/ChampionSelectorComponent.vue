<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { ROLES } from '@/config/constants'

const battleStore = useBattleStore()
const uiStore = useUiStore()
const { headerSlots, secondarySlots } = storeToRefs(battleStore)

function openPicker(slotIndex: number, subSlot: number = -1) {
  uiStore.requestOpenRolesTab(slotIndex, subSlot)
}

function clearSlot(slotIndex: number, event: Event) {
  event.stopPropagation()
  battleStore.clearHeaderSlot(slotIndex)
}

function clearSecondary(slotIndex: number, subIndex: number, event: Event) {
  event.stopPropagation()
  battleStore.clearSecondarySlot(slotIndex, subIndex)
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<template>
  <div class="champ-selector">
    <!-- ── 5 Slots ── -->
    <div class="panel-slots">
      <button
        v-for="(slot, i) in headerSlots"
        :key="i"
        class="slot-tile"
        :class="{
          'slot-tile--filled': slot !== null,
          [`slot-tile--role-${ROLES[i].key}`]: true,
          'slot-tile--first': i === 0,
        }"
        :style="{ '--role-color': ROLES[i].orbit.color }"
        :title="
          slot ? `${slot} (${ROLES[i].label}) – klicken zum Ändern` : `${ROLES[i].label} – Champion wählen`
        "
        @click="openPicker(i)"
      >
        <span class="slot-corner slot-corner--tl" aria-hidden="true" />
        <span class="slot-corner slot-corner--br" aria-hidden="true" />

        <div class="slot-portrait-wrap">
          <img
            v-if="slot"
            :src="battleStore.getChampionImage(slot)"
            :alt="slot"
            class="slot-portrait"
            @error="onImgError"
          />
          <span v-else class="slot-add-icon" aria-hidden="true">＋</span>
          <div class="slot-hover-glow" aria-hidden="true" />
        </div>

        <div class="slot-name-badge">
          <span class="slot-name-text">{{ ROLES[i].label }}</span>
        </div>

        <!-- Mini secondary avatars -->
        <div class="slot-secs">
          <button
            v-for="s in [0, 1]"
            :key="s"
            class="slot-sec"
            :class="{ 'slot-sec--filled': secondarySlots[i][s] !== null }"
            :title="
              secondarySlots[i][s]
                ? `${secondarySlots[i][s]} (${ROLES[i].label} S${s + 1}) – klicken zum Ändern`
                : `${ROLES[i].label} – Sekundär ${s + 1} hinzufügen`
            "
            @click.stop="openPicker(i, s)"
          >
            <img
              v-if="secondarySlots[i][s]"
              :src="battleStore.getChampionImage(secondarySlots[i][s]!)"
              :alt="secondarySlots[i][s]!"
              class="slot-sec-img"
              @error="onImgError"
            />
            <span v-else class="slot-sec-plus">＋</span>
            <button
              v-if="secondarySlots[i][s]"
              class="slot-sec-clear"
              title="Entfernen"
              @click.stop="clearSecondary(i, s, $event)"
            >
              ✕
            </button>
          </button>
        </div>

        <button v-if="slot" class="slot-clear" title="Entfernen" @click.stop="clearSlot(i, $event)">
          ✕
        </button>
      </button>
    </div>

  </div>
</template>

<style scoped>
/* ════════════════════════════════════════════════
   WRAPPER
   ════════════════════════════════════════════════ */
.champ-selector {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 4px;
}

/* ════════════════════════════════════════════════
   SLOT-LEISTE
   ════════════════════════════════════════════════ */
.panel-slots {
  display: flex;
  gap: 4px;
  flex: 1;
  align-items: stretch;
  height: 100%;
  padding: 4px 0;
}

/* ── Einzelner Slot ── */
.slot-tile {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 0;
  background: linear-gradient(170deg, #1a1408 0%, #120e04 100%);
  border: 2px solid rgba(122, 78, 32, 0.45);
  border-radius: 5px;
  cursor: pointer;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 200, 80, 0.05);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

/* ── Erster Slot (TOP): große Rundung oben links passend zum Panel-Arc ── */
.slot-tile--first {
  border-top-left-radius: 48px;
}

.slot-tile:hover {
  background: linear-gradient(170deg, #261c08 0%, #1a1206 100%);
  border-color: rgba(200, 144, 64, 0.75);
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.1),
    0 0 12px rgba(200, 144, 64, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.5);
  transform: translateY(-1px);
}
.slot-tile:active {
  transform: translateY(0px) scale(0.97);
}

.slot-tile--filled {
  background: linear-gradient(170deg, #1e1208 0%, #150f04 100%);
  border-color: rgba(160, 100, 20, 0.6);
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}
.slot-tile--filled:hover {
  border-color: #c89040;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.14),
    0 0 14px rgba(200, 144, 64, 0.22),
    0 2px 10px rgba(0, 0, 0, 0.55);
}

/* ── Eck-Ornamente ── */
.slot-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: rgba(200, 144, 64, 0.35);
  border-style: solid;
  pointer-events: none;
  z-index: 3;
  transition: border-color 0.2s ease;
}
.slot-tile:hover .slot-corner,
.slot-tile--filled .slot-corner {
  border-color: rgba(200, 144, 64, 0.65);
}
.slot-corner--tl {
  top: 3px;
  left: 3px;
  border-width: 1px 0 0 1px;
}
.slot-corner--br {
  bottom: 3px;
  right: 3px;
  border-width: 0 1px 1px 0;
}

/* Beim ersten Slot: TL-Ornament weiter einrücken wegen großer Rundung */
.slot-tile--first .slot-corner--tl {
  top: 18px;
  left: 10px;
}

/* ── Portrait füllt den gesamten Slot ── */
.slot-portrait-wrap {
  position: absolute;
  inset: 0;
  background: #0e0c08;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.slot-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s ease;
}
.slot-tile:hover .slot-portrait {
  transform: scale(1.06);
}

/* ── Plus-Icon für leere Slots ── */
.slot-add-icon {
  font-size: 20px;
  color: rgba(200, 144, 64, 0.2);
  line-height: 1;
  z-index: 1;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}
.slot-tile:hover .slot-add-icon {
  color: rgba(200, 144, 64, 0.55);
  transform: scale(1.2);
}

/* ── Hover-Glow innen ── */
.slot-hover-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, rgba(200, 144, 64, 0.12), transparent 70%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.slot-tile:hover .slot-hover-glow {
  opacity: 1;
}

/* ── Name-Badge als Overlay am unteren Rand ── */
.slot-name-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 4px 4px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0) 100%);
}
.slot-name-text {
  font-size: 11px;
  font-weight: 800;
  color: rgba(180, 130, 50, 0.6);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  line-height: 1;
  transition: color 0.2s ease;
}
.slot-tile--filled .slot-name-text {
  color: rgba(220, 170, 60, 0.95);
}
.slot-tile:hover .slot-name-text {
  color: #e8c040;
}

/* ── Clear-Button ── */
.slot-clear {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  font-size: 7px;
  color: #cc6050;
  background: rgba(20, 10, 6, 0.85);
  border: 1px solid rgba(180, 60, 40, 0.4);
  border-radius: 2px;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  z-index: 10;
  transition:
    opacity 0.15s ease,
    background 0.15s ease;
}
.slot-tile:hover .slot-clear {
  opacity: 1;
}
.slot-clear:hover {
  background: rgba(160, 40, 20, 0.7) !important;
  border-color: #cc6050;
}

/* ════════════════════════════════════════════════
   ROLLEN-AKZENTFARBEN — dickere, leuchtendere Rahmen
   ════════════════════════════════════════════════ */

/* Leere Slots: klar sichtbarer Rollenrahmen */
.slot-tile--role-top {
  border: 3px solid rgba(224, 80, 80, 0.65);
}
.slot-tile--role-jungle {
  border: 3px solid rgba(80, 192, 96, 0.65);
}
.slot-tile--role-mid {
  border: 3px solid rgba(80, 144, 232, 0.65);
}
.slot-tile--role-adc {
  border: 3px solid rgba(232, 152, 64, 0.65);
}
.slot-tile--role-support {
  border: 3px solid rgba(184, 200, 216, 0.65);
}

/* Belegte Slots: volle Sättigung + Glow */
.slot-tile--role-top.slot-tile--filled {
  border: 3px solid rgba(224, 80, 80, 0.92);
  box-shadow:
    0 0 10px -1px rgba(224, 80, 80, 0.45),
    inset 0 1px 0 rgba(224, 80, 80, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}
.slot-tile--role-jungle.slot-tile--filled {
  border: 3px solid rgba(80, 192, 96, 0.92);
  box-shadow:
    0 0 10px -1px rgba(80, 192, 96, 0.45),
    inset 0 1px 0 rgba(80, 192, 96, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}
.slot-tile--role-mid.slot-tile--filled {
  border: 3px solid rgba(80, 144, 232, 0.92);
  box-shadow:
    0 0 10px -1px rgba(80, 144, 232, 0.45),
    inset 0 1px 0 rgba(80, 144, 232, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}
.slot-tile--role-adc.slot-tile--filled {
  border: 3px solid rgba(232, 152, 64, 0.92);
  box-shadow:
    0 0 10px -1px rgba(232, 152, 64, 0.45),
    inset 0 1px 0 rgba(232, 152, 64, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}
.slot-tile--role-support.slot-tile--filled {
  border: 3px solid rgba(184, 200, 216, 0.92);
  box-shadow:
    0 0 10px -1px rgba(184, 200, 216, 0.45),
    inset 0 1px 0 rgba(184, 200, 216, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

/* Hover: stärkerer Glow in Rollenfarbe */
.slot-tile--role-top:hover {
  border-color: #e05050;
  box-shadow:
    0 0 14px -1px rgba(224, 80, 80, 0.65),
    inset 0 1px 0 rgba(224, 80, 80, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}
.slot-tile--role-jungle:hover {
  border-color: #50c060;
  box-shadow:
    0 0 14px -1px rgba(80, 192, 96, 0.65),
    inset 0 1px 0 rgba(80, 192, 96, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}
.slot-tile--role-mid:hover {
  border-color: #5090e8;
  box-shadow:
    0 0 14px -1px rgba(80, 144, 232, 0.65),
    inset 0 1px 0 rgba(80, 144, 232, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}
.slot-tile--role-adc:hover {
  border-color: #e89840;
  box-shadow:
    0 0 14px -1px rgba(232, 152, 64, 0.65),
    inset 0 1px 0 rgba(232, 152, 64, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}
.slot-tile--role-support:hover {
  border-color: #b8c8d8;
  box-shadow:
    0 0 14px -1px rgba(184, 200, 216, 0.65),
    inset 0 1px 0 rgba(184, 200, 216, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.5);
}

/* ══════════════════════════════
   SECONDARY MINI AVATARS (per slot tile)
   ══════════════════════════════ */
.slot-secs {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.slot-tile--first .slot-secs {
  top: 20px;
  right: 6px;
}

.slot-sec {
  position: relative;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--role-color, #c89040) 55%, transparent);
  background: rgba(10, 8, 4, 0.88);
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.12s;
}
.slot-sec:hover {
  transform: scale(1.15);
  border-color: var(--role-color, #c89040);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--role-color, #c89040) 55%, transparent),
    0 1px 3px rgba(0, 0, 0, 0.85);
}
.slot-sec--filled {
  border-color: var(--role-color, #c89040);
  box-shadow:
    0 0 6px color-mix(in srgb, var(--role-color, #c89040) 40%, transparent),
    0 1px 3px rgba(0, 0, 0, 0.85);
}

.slot-sec-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  border-radius: 50%;
}

.slot-sec-plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 11px;
  color: rgba(200, 144, 64, 0.3);
}

.slot-sec-clear {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 12px;
  height: 12px;
  font-size: 7px;
  color: #cc6050;
  background: rgba(20, 10, 6, 0.95);
  border: 1px solid rgba(180, 60, 40, 0.55);
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  z-index: 2;
  transition:
    opacity 0.15s ease,
    background 0.15s ease;
}
.slot-sec:hover .slot-sec-clear {
  opacity: 1;
}
.slot-sec-clear:hover {
  background: rgba(160, 40, 20, 0.85);
  border-color: #cc6050;
}
</style>
