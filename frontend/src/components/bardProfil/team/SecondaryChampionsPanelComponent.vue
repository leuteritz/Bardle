<script setup lang="ts">
import { useBattleStore } from '@/stores/battleStore'

const props = defineProps<{
  secondaries: (string | null)[]
  activeSlotIndex: number
  collapsed: boolean
  roleColor: string
  hoveredSyn: { involvedChampions: string[]; color: string } | null
}>()

const emit = defineEmits<{
  'open-champion-picker': [subSlot: number]
  'clear-secondary': [roleIndex: number, subIndex: number, event: Event]
}>()

const battleStore = useBattleStore()

function isHighlighted(champion: string | null | undefined): boolean {
  if (!champion || !props.hoveredSyn) return false
  return props.hoveredSyn.involvedChampions.includes(champion)
}

function highlightStyle(champion: string | null | undefined): Record<string, string> {
  if (!isHighlighted(champion)) return {}
  return { '--hl-color': props.hoveredSyn!.color }
}

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div
    class="splash-sec-panel"
    :class="{ 'splash-sec-panel--collapsed': collapsed }"
    :style="{ '--rc': roleColor }"
    @click.stop
  >
    <div class="sec-panel-label">Allies</div>
    <button
      v-for="(slotIdx, i) in [0, 1]"
      :key="i"
      class="sec-slot"
      :class="{
        'sec-slot--filled': !!secondaries[slotIdx],
        'sec-slot--syn-glow': isHighlighted(secondaries[slotIdx]),
      }"
      :style="highlightStyle(secondaries[slotIdx])"
      @click.stop="emit('open-champion-picker', slotIdx)"
    >
      <span class="sec-slot-num">{{ i + 1 }}</span>
      <template v-if="secondaries[slotIdx]">
        <div class="sec-slot-portrait">
          <img
            :src="battleStore.getChampionImage(secondaries[slotIdx]!)"
            :alt="secondaries[slotIdx]!"
            class="sec-slot-img"
            @error="onImgError"
          />
          <div class="sec-slot-img-overlay" />
        </div>
        <div class="sec-slot-footer">
          <span class="sec-slot-name">{{ secondaries[slotIdx] }}</span>
        </div>
        <button
          class="sec-slot-remove"
          title="Remove"
          @click.stop="emit('clear-secondary', activeSlotIndex, slotIdx, $event)"
        >
          ✕
        </button>
      </template>
      <template v-else>
        <div class="sec-slot-empty-body">
          <span class="sec-slot-empty-icon">＋</span>
          <span class="sec-slot-empty-hint">Add Ally</span>
        </div>
      </template>
    </button>
  </div>
</template>

<style scoped>
.splash-sec-panel {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  pointer-events: auto;
  width: 100px;
  transition: transform 0.3s ease, opacity 0.25s ease;
}
.splash-sec-panel--collapsed {
  transform: translateY(-50%) translateX(-115%);
  opacity: 0;
  pointer-events: none;
}

.sec-panel-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--rc, #c89040) 70%, transparent);
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--rc, #c89040) 22%, transparent);
}

.sec-slot {
  position: relative;
  width: 100px;
  height: 128px;
  border-radius: var(--bp-radius);
  border: 1px solid color-mix(in srgb, var(--rc, #c89040) 30%, transparent);
  background: rgba(6, 4, 1, 0.82);
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s ease;
}
.sec-slot:hover {
  border-color: color-mix(in srgb, var(--rc, #c89040) 80%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rc, #c89040) 25%, transparent),
    0 8px 24px rgba(0, 0, 0, 0.6);
  transform: translateY(-3px) scale(1.02);
}
.sec-slot:active {
  transform: translateY(-1px) scale(1.01);
}
.sec-slot--filled {
  border-color: color-mix(in srgb, var(--rc, #c89040) 55%, transparent);
}
.sec-slot--filled:hover {
  border-color: var(--rc, #c89040);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rc, #c89040) 35%, transparent),
    0 0 20px color-mix(in srgb, var(--rc, #c89040) 30%, transparent),
    0 10px 28px rgba(0, 0, 0, 0.7);
}
.sec-slot--syn-glow {
  border-color: var(--hl-color, var(--rc)) !important;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--hl-color, #e8c040) 40%, transparent),
    0 0 28px color-mix(in srgb, var(--hl-color, #e8c040) 55%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--hl-color, #e8c040) 15%, transparent) !important;
  filter: brightness(1.25) saturate(1.15);
}

.sec-slot-num {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 4;
  width: 18px;
  height: 18px;
  font-size: 10px;
  font-weight: 900;
  line-height: 18px;
  text-align: center;
  color: var(--rc, #c89040);
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid color-mix(in srgb, var(--rc, #c89040) 45%, transparent);
  border-radius: 3px;
  pointer-events: none;
}

.sec-slot-portrait {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.sec-slot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  transition: transform 0.25s ease;
}
.sec-slot:hover .sec-slot-img {
  transform: scale(1.07);
}
.sec-slot-img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 45%,
    rgba(0, 0, 0, 0.55) 75%,
    rgba(0, 0, 0, 0.85) 100%
  );
  pointer-events: none;
}

.sec-slot-footer {
  flex-shrink: 0;
  padding: 5px 7px;
  background: rgba(0, 0, 0, 0.78);
  border-top: 1px solid color-mix(in srgb, var(--rc, #c89040) 20%, transparent);
}
.sec-slot-name {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--rc, #c89040);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.sec-slot-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 5;
  width: 18px;
  height: 18px;
  font-size: 9px;
  line-height: 1;
  color: rgba(220, 80, 60, 0.9);
  background: rgba(10, 5, 2, 0.9);
  border: 1px solid rgba(180, 50, 30, 0.5);
  border-radius: var(--bp-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  cursor: pointer;
  padding: 0;
  transition:
    opacity 0.15s,
    background 0.15s,
    border-color 0.15s,
    transform 0.12s;
}
.sec-slot:hover .sec-slot-remove {
  opacity: 1;
}
.sec-slot-remove:hover {
  background: rgba(160, 30, 15, 0.88);
  border-color: rgba(220, 70, 50, 0.9);
  transform: scale(1.1);
}

.sec-slot-empty-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.sec-slot-empty-icon {
  font-size: 26px;
  line-height: 1;
  color: color-mix(in srgb, var(--rc, #c89040) 22%, transparent);
  transition:
    color 0.2s,
    transform 0.2s;
}
.sec-slot:hover .sec-slot-empty-icon {
  color: color-mix(in srgb, var(--rc, #c89040) 60%, transparent);
  transform: scale(1.15);
}
.sec-slot-empty-hint {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--rc, #c89040) 28%, transparent);
  transition: color 0.2s;
}
.sec-slot:hover .sec-slot-empty-hint {
  color: color-mix(in srgb, var(--rc, #c89040) 55%, transparent);
}
</style>
