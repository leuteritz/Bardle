<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { AUGMENTS } from '../config/augments'
import type { AugmentDefinition } from '../types'

const gameStore = useGameStore()
const scrollEl = ref<HTMLElement | null>(null)
const isScrollable = ref(false)
const atBottom = ref(false)

const activeAugmentDefs = computed<AugmentDefinition[]>(() =>
  gameStore.activeAugments
    .map((id) => AUGMENTS.find((a) => a.id === id))
    .filter((a): a is AugmentDefinition => !!a),
)

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  isScrollable.value = el.scrollHeight > el.clientHeight
  atBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 4
}

function checkScrollable(el: HTMLElement) {
  isScrollable.value = el.scrollHeight > el.clientHeight
  atBottom.value = false
}

const rarityGlow: Record<string, string> = {
  common: 'glow-common',
  rare: 'glow-rare',
  epic: 'glow-epic',
  legendary: 'glow-legendary',
}

const rarityBorder: Record<string, string> = {
  common: 'border-common',
  rare: 'border-rare',
  epic: 'border-epic',
  legendary: 'border-legendary',
}

const rarityAccent: Record<string, string> = {
  common: 'accent-common',
  rare: 'accent-rare',
  epic: 'accent-epic',
  legendary: 'accent-legendary',
}

function getDisplayLine(aug: AugmentDefinition): string {
  return aug.effectLine
}
</script>

<template>
  <Transition name="augment-panel">
    <div
      v-if="activeAugmentDefs.length > 0"
      class="fixed left-10 top-[200px] z-[60] flex flex-col gap-1.5 max-w-[148px]"
    >
      <!-- Section header -->
      <div class="flex items-center gap-1.5 px-1 mb-0.5">
        <div class="aug-header-line flex-1 h-px" />
        <span class="aug-header-label text-[13px] font-bold tracking-[0.15em] uppercase"
          >Augments</span
        >
        <div class="aug-header-line flex-1 h-px" />
      </div>

      <div class="relative">
        <div
          ref="scrollEl"
          class="rpg-scrollbar flex flex-col gap-1.5 mt-2 overflow-x-hidden pr-0.5"
          :class="activeAugmentDefs.length > 1 ? 'overflow-y-auto' : 'overflow-y-hidden'"
          style="max-height: calc(100vh - 240px)"
          @scroll="onScroll"
          @vue:mounted="(vnode: any) => checkScrollable(vnode.el)"
          @vue:updated="(vnode: any) => checkScrollable(vnode.el)"
        >
          <TransitionGroup name="aug-card" tag="div" class="flex flex-col gap-1.5">
            <div v-for="aug in activeAugmentDefs" :key="aug.id" class="relative">
              <div
                class="aug-item relative flex items-center gap-2 px-2.5 py-2 cursor-default overflow-hidden"
                :class="[rarityBorder[aug.rarity], rarityGlow[aug.rarity]]"
              >
                <!-- Rarity gradient overlay -->
                <div
                  class="absolute inset-0 pointer-events-none opacity-60"
                  :class="rarityAccent[aug.rarity]"
                />

                <!-- Effect line -->
                <div class="relative z-10 flex flex-col gap-0.5 flex-1">
                  <div class="flex items-center gap-1 text-[11px]">
                    <span class="aug-arrow flex-shrink-0 text-[8px]">▲</span>
                    <span class="aug-text leading-tight">{{ getDisplayLine(aug) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <Transition name="fade">
          <div
            v-if="isScrollable && !atBottom"
            class="aug-fade-bottom absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
          />
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.augment-panel-enter-active,
.augment-panel-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.augment-panel-enter-from,
.augment-panel-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.aug-card-enter-active,
.aug-card-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.aug-card-enter-from,
.aug-card-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
.aug-card-move {
  transition: transform 0.25s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.aug-header-line {
  background: rgba(92, 51, 16, 0.4);
}

.aug-header-label {
  color: rgba(232, 192, 64, 0.35);
}

.aug-item {
  background: var(--rpg-bg-deep);
  border-radius: 4px;
  transition: all 0.3s;
}

.aug-arrow {
  color: var(--rpg-green-top);
}

.aug-text {
  color: var(--rpg-text-muted);
}

.aug-fade-bottom {
  background: linear-gradient(to top, var(--rpg-bg-deep), transparent);
  border-radius: 0 0 4px 4px;
}

/* Rarity borders */
.border-common { border: 1px solid #5b8dd9; }
.border-rare { border: 1px solid #a87ed8; }
.border-epic { border: 1px solid #d9a03e; }
.border-legendary { border: 1px solid #e8c040; }

/* Rarity glows */
.glow-common { box-shadow: 0 0 10px rgba(91, 141, 217, 0.3); }
.glow-common:hover { box-shadow: 0 0 18px rgba(91, 141, 217, 0.5); }
.glow-rare { box-shadow: 0 0 10px rgba(168, 126, 216, 0.3); }
.glow-rare:hover { box-shadow: 0 0 18px rgba(168, 126, 216, 0.5); }
.glow-epic { box-shadow: 0 0 10px rgba(217, 160, 62, 0.35); }
.glow-epic:hover { box-shadow: 0 0 18px rgba(217, 160, 62, 0.55); }
.glow-legendary {
  box-shadow: 0 0 14px rgba(232, 192, 64, 0.45);
  animation: legendary-pulse 2s ease-in-out infinite;
}
.glow-legendary:hover { box-shadow: 0 0 24px rgba(232, 192, 64, 0.65); }

/* Rarity accent overlays */
.accent-common { background: linear-gradient(to right, rgba(91, 141, 217, 0.2), transparent); }
.accent-rare { background: linear-gradient(to right, rgba(168, 126, 216, 0.2), transparent); }
.accent-epic { background: linear-gradient(to right, rgba(217, 160, 62, 0.25), transparent); }
.accent-legendary { background: linear-gradient(to right, rgba(232, 192, 64, 0.3), transparent); }

@keyframes legendary-pulse {
  0%, 100% { box-shadow: 0 0 12px rgba(232, 192, 64, 0.35); }
  50% { box-shadow: 0 0 22px rgba(232, 192, 64, 0.6); }
}
</style>
