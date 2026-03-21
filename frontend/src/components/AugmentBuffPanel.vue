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
}

const rarityBorder: Record<string, string> = {
  common: 'border-blue-400/50',
  rare: 'border-purple-400/50',
  epic: 'border-amber-400/60',
}

const rarityAccent: Record<string, string> = {
  common: 'from-blue-500/30 to-blue-600/10',
  rare: 'from-purple-500/30 to-purple-600/10',
  epic: 'from-amber-500/35 to-amber-600/10',
}

const rarityIconRing: Record<string, string> = {
  common: 'ring-blue-400/50',
  rare: 'ring-purple-400/50',
  epic: 'ring-amber-400/60',
}

const rarityBadge: Record<string, string> = {
  common: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
  rare: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
  epic: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
}

const rarityLabel: Record<string, string> = {
  common: 'Gewöhnlich',
  rare: 'Selten',
  epic: 'Episch',
}

function formatEffect(key: string, val: number): string {
  switch (key) {
    case 'cpsMultiplier':
      return `+${Math.round((val - 1) * 100)}% CPS`
    case 'cpcMultiplier':
      return `+${Math.round((val - 1) * 100)}% CPC`
    case 'buildingCostMultiplier':
      return `-${Math.round((1 - val) * 100)}% Gebäudekosten`
    case 'meepCostMultiplier':
      return `-${Math.round((1 - val) * 100)}% Meep-Kosten`
    case 'meepPowerMultiplier':
      return `+${Math.round((val - 1) * 100)}% Meep-Power`
    case 'expeditionRewardMultiplier':
      return `+${Math.round((val - 1) * 100)}% Expeditions-Belohnung`
    case 'abilityPowerPerLevel':
      return `+${val} Power pro Fähigkeitsstufe`
    default:
      return `${key}: ${val}`
  }
}

function getEffectLines(aug: AugmentDefinition): string[] {
  return Object.entries(aug.effects).map(([k, v]) => formatEffect(k, v as number))
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

      <!-- ✅ Scrollbarer Wrapper mit max-height -->
      <div class="relative">
        <div
          ref="scrollEl"
          class="augment-scroll flex flex-col gap-1.5 mt-2 overflow-y-auto overflow-x-hidden pr-0.5"
          style="max-height: calc(100vh - 240px)"
          @scroll="onScroll"
          @vue:mounted="(vnode: any) => checkScrollable(vnode.el)"
          @vue:updated="(vnode: any) => checkScrollable(vnode.el)"
        >
          <TransitionGroup name="aug-card" tag="div" class="flex flex-col gap-1.5">
            <div v-for="aug in activeAugmentDefs" :key="aug.id" class="relative group">
              <!-- Card -->
              <div
                class="relative flex items-center gap-2 px-2.5 py-2 rounded-xl border bg-slate-950/80 backdrop-blur-sm cursor-default transition-all duration-300 overflow-hidden"
                :class="[rarityBorder[aug.rarity], rarityGlow[aug.rarity]]"
              >
                <!-- Rarity gradient overlay -->
                <div
                  class="absolute inset-0 pointer-events-none bg-gradient-to-r opacity-60"
                  :class="rarityAccent[aug.rarity]"
                />

                <!-- Shimmer sweep on hover -->
                <div
                  class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.06] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[600ms]"
                />

                <!-- Icon -->
                <div
                  class="relative z-10 flex items-center justify-center flex-shrink-0 w-8 h-8 text-lg transition-transform duration-200 rounded-lg bg-black/40 ring-1 group-hover:scale-110"
                  :class="rarityIconRing[aug.rarity]"
                >
                  {{ aug.icon }}
                </div>

                <!-- Name -->
                <span
                  class="relative z-10 text-[11px] font-bold text-white/90 leading-tight line-clamp-2 flex-1"
                >
                  {{ aug.name }}
                </span>
              </div>

              <!-- Tooltip -->
              <div
                class="absolute left-[calc(100%+10px)] top-0 hidden group-hover:flex flex-col min-w-[210px] max-w-[250px] p-3.5 rounded-2xl border bg-slate-950/97 border-white/15 shadow-2xl backdrop-blur-md z-[70] pointer-events-none"
                :class="rarityBorder[aug.rarity]"
              >
                <!-- Top accent line -->
                <div
                  class="absolute top-0 h-px left-4 right-4 bg-gradient-to-r from-transparent to-transparent"
                  :class="{
                    'via-blue-400/60': aug.rarity === 'common',
                    'via-purple-400/60': aug.rarity === 'rare',
                    'via-amber-400/70': aug.rarity === 'epic',
                  }"
                />

                <!-- Header -->
                <div class="flex items-center gap-2.5 mb-2">
                  <div
                    class="flex items-center justify-center flex-shrink-0 text-xl w-9 h-9 rounded-xl bg-black/50 ring-1"
                    :class="rarityIconRing[aug.rarity]"
                  >
                    {{ aug.icon }}
                  </div>
                  <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="text-sm font-bold leading-tight text-white">{{ aug.name }}</span>
                    <span
                      class="text-[10px] px-1.5 py-px rounded-full border self-start font-semibold"
                      :class="rarityBadge[aug.rarity]"
                    >
                      {{ rarityLabel[aug.rarity] }}
                    </span>
                  </div>
                </div>

                <!-- Divider -->
                <div class="h-px mb-2 bg-white/10" />

                <!-- Description -->
                <p class="text-[11px] text-blue-200/60 mb-2.5 leading-relaxed">
                  {{ aug.description }}
                </p>

                <!-- Effects -->
                <div class="space-y-1 p-2.5 rounded-xl bg-black/40 border border-white/[0.08]">
                  <div
                    v-for="(line, i) in getEffectLines(aug)"
                    :key="i"
                    class="flex items-center gap-1.5 text-[11px]"
                  >
                    <span class="text-emerald-400 flex-shrink-0 text-[9px]">▲</span>
                    <span class="text-blue-100/85">{{ line }}</span>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- ✅ Fade-Overlay unten: zeigt an, dass weitere Items vorhanden sind -->
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
/* Dezente Scrollbar */
.augment-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}
.augment-scroll::-webkit-scrollbar {
  width: 3px;
}
.augment-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.augment-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 99px;
}
.augment-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

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
</style>
