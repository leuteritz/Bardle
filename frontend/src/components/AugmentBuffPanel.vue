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
  common: 'shadow-[0_0_14px_rgba(96,165,250,0.35)] hover:shadow-[0_0_22px_rgba(96,165,250,0.55)]',
  rare: 'shadow-[0_0_14px_rgba(168,85,247,0.35)] hover:shadow-[0_0_22px_rgba(168,85,247,0.55)]',
  epic: 'shadow-[0_0_14px_rgba(251,191,36,0.40)] hover:shadow-[0_0_22px_rgba(251,191,36,0.65)]',
  legendary: 'shadow-[0_0_18px_rgba(251,191,36,0.55)] hover:shadow-[0_0_28px_rgba(251,191,36,0.75)] legendary-glow',
}

const rarityBorder: Record<string, string> = {
  common: 'border-blue-400/50',
  rare: 'border-purple-400/50',
  epic: 'border-amber-400/60',
  legendary: 'border-yellow-400/70',
}

const rarityAccent: Record<string, string> = {
  common: 'from-blue-500/30 to-blue-600/10',
  rare: 'from-purple-500/30 to-purple-600/10',
  epic: 'from-amber-500/35 to-amber-600/10',
  legendary: 'from-yellow-500/40 to-amber-600/15',
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
        <div class="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
        <span class="text-[13px] font-bold tracking-[0.15em] text-white/30 uppercase"
          >Augments</span
        >
        <div class="flex-1 h-px bg-gradient-to-l from-white/20 to-transparent" />
      </div>

      <div class="relative">
        <div
          ref="scrollEl"
          class="custom-scrollbar flex flex-col gap-1.5 mt-2 overflow-x-hidden pr-0.5"
          :class="activeAugmentDefs.length > 1 ? 'overflow-y-auto' : 'overflow-y-hidden'"
          style="max-height: calc(100vh - 240px)"
          @scroll="onScroll"
          @vue:mounted="(vnode: any) => checkScrollable(vnode.el)"
          @vue:updated="(vnode: any) => checkScrollable(vnode.el)"
        >
          <TransitionGroup name="aug-card" tag="div" class="flex flex-col gap-1.5">
            <div v-for="aug in activeAugmentDefs" :key="aug.id" class="relative">
              <div
                class="relative flex items-center gap-2 px-2.5 py-2 rounded-xl border bg-slate-950/80 backdrop-blur-sm cursor-default transition-all duration-300 overflow-hidden"
                :class="[rarityBorder[aug.rarity], rarityGlow[aug.rarity]]"
              >
                <!-- Rarity gradient overlay -->
                <div
                  class="absolute inset-0 pointer-events-none bg-gradient-to-r opacity-60"
                  :class="rarityAccent[aug.rarity]"
                />

                <!-- Effect line -->
                <div class="relative z-10 flex flex-col gap-0.5 flex-1">
                  <div class="flex items-center gap-1 text-[11px]">
                    <span class="text-emerald-400 flex-shrink-0 text-[8px]">▲</span>
                    <span class="leading-tight text-blue-100/85">{{ getDisplayLine(aug) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <Transition name="fade">
          <div
            v-if="isScrollable && !atBottom"
            class="absolute bottom-0 left-0 right-0 h-10 rounded-b-lg pointer-events-none bg-gradient-to-t from-slate-950/80 to-transparent"
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

@keyframes legendary-pulse {
  0%, 100% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.4); }
  50% { box-shadow: 0 0 25px rgba(251, 191, 36, 0.65); }
}
.legendary-glow {
  animation: legendary-pulse 2s ease-in-out infinite;
}
</style>
