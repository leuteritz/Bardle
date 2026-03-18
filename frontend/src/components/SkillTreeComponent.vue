<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()

const SKILL_MEEP_COSTS = [3, 8, 20, 45] as const

const skills = [
  {
    key: 'Q',
    icon: '/img/BardAbilities/BardQ.png',
    effect: '+75% CPS',
    description: '1.75× Chimes/s',
  },
  {
    key: 'W',
    icon: '/img/BardAbilities/BardW.png',
    effect: '+1500 Power',
    description: '+1500 Kampfkraft',
  },
  {
    key: 'E',
    icon: '/img/BardAbilities/BardE.png',
    effect: '−50% Meep-Kosten',
    description: 'Halbierte Kosten',
  },
  {
    key: 'R',
    icon: '/img/BardAbilities/BardR.png',
    effect: '+125% CPC',
    description: '2.25× Chimes/Click',
  },
]

// Arrow costs = cost of the skill to the right
const arrowCosts = [SKILL_MEEP_COSTS[1], SKILL_MEEP_COSTS[2], SKILL_MEEP_COSTS[3]]

function skillState(index: number): 'bought' | 'buyable' | 'locked' {
  if (gameStore.abilityLevels[index] > 0) return 'bought'
  if (
    (index === 0 || gameStore.abilityLevels[index - 1] > 0) &&
    gameStore.meeps >= SKILL_MEEP_COSTS[index]
  )
    return 'buyable'
  return 'locked'
}

function arrowState(arrowIndex: number): 'bought' | 'buyable' | 'locked' {
  // Arrow arrowIndex connects skill[arrowIndex] → skill[arrowIndex+1]
  const rightSkillIndex = arrowIndex + 1
  return skillState(rightSkillIndex)
}

function handleBuy(index: number) {
  if (skillState(index) === 'buyable') {
    gameStore.unlockSkillWithMeeps(index)
  }
}
</script>

<template>
  <div class="flex items-center w-full px-4 py-8 gap-0">
    <template v-for="(skill, idx) in skills" :key="skill.key">
      <!-- Skill Node -->
      <div
        class="relative flex flex-col items-center gap-2 flex-shrink-0 w-28"
        :class="skillState(idx) === 'locked' ? 'opacity-50' : ''"
      >
        <!-- Key Badge -->
        <div
          class="absolute -top-2 -left-2 z-10 w-6 h-6 flex items-center justify-center rounded-full text-xs font-black border"
          :class="{
            'bg-yellow-500/80 border-yellow-300/80 text-yellow-900': skillState(idx) === 'bought',
            'bg-violet-600/80 border-violet-400/80 text-white': skillState(idx) === 'buyable',
            'bg-white/10 border-white/20 text-white/50': skillState(idx) === 'locked',
          }"
        >
          {{ skill.key }}
        </div>

        <!-- Box -->
        <button
          class="relative w-20 h-20 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 overflow-hidden"
          :class="{
            'border-yellow-400/80 bg-gradient-to-br from-yellow-900/40 to-amber-900/30 shadow-[0_0_20px_rgba(234,179,8,0.3)] ring-2 ring-yellow-400/50':
              skillState(idx) === 'bought',
            'border-violet-400/60 bg-gradient-to-br from-violet-900/30 to-purple-900/20 hover:shadow-[0_0_16px_rgba(124,58,237,0.3)] cursor-pointer hover:border-violet-300/80':
              skillState(idx) === 'buyable',
            'border-white/10 bg-white/5 cursor-not-allowed': skillState(idx) === 'locked',
          }"
          :disabled="skillState(idx) !== 'buyable'"
          @click="handleBuy(idx)"
        >
          <!-- Gold shimmer for bought -->
          <div
            v-if="skillState(idx) === 'bought'"
            class="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent"
          />
          <img :src="skill.icon" :alt="skill.key" class="w-12 h-12 object-contain relative z-10" />
        </button>

        <!-- Effect label -->
        <div class="text-center">
          <div
            class="text-xs font-bold leading-tight"
            :class="{
              'text-yellow-300': skillState(idx) === 'bought',
              'text-violet-300': skillState(idx) === 'buyable',
              'text-white/30': skillState(idx) === 'locked',
            }"
          >
            {{ skill.effect }}
          </div>
          <div class="text-[10px] text-white/40 leading-tight mt-0.5">
            {{ skill.description }}
          </div>
        </div>

        <!-- Cost / Unlocked badge -->
        <div
          v-if="skillState(idx) !== 'bought'"
          class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
          :class="{
            'bg-violet-900/50 border-violet-400/40 text-violet-200': skillState(idx) === 'buyable',
            'bg-white/5 border-white/10 text-white/30': skillState(idx) === 'locked',
          }"
        >
          {{ SKILL_MEEP_COSTS[idx] }} Meeps
        </div>
        <div
          v-else
          class="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-yellow-900/40 border-yellow-400/40 text-yellow-300"
        >
          Freigeschaltet
        </div>
      </div>

      <!-- Arrow between nodes -->
      <div
        v-if="idx < 3"
        class="relative flex items-center flex-shrink-0"
        :style="{ flexGrow: arrowCosts[idx] }"
      >
        <!-- Arrow line -->
        <div
          class="w-full h-1 rounded-full relative"
          :class="{
            'bg-gradient-to-r from-yellow-500 to-amber-400 shadow-[0_0_8px_rgba(234,179,8,0.6)]':
              arrowState(idx) === 'bought',
            'bg-gradient-to-r from-violet-500/50 to-purple-400/50': arrowState(idx) === 'buyable',
            'bg-white/10': arrowState(idx) === 'locked',
          }"
        >
          <!-- Cost label above arrow -->
          <div
            class="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold whitespace-nowrap"
            :class="{
              'text-yellow-400/80': arrowState(idx) === 'bought',
              'text-violet-300/70': arrowState(idx) === 'buyable',
              'text-white/20': arrowState(idx) === 'locked',
            }"
          >
            {{ arrowCosts[idx] }} Meeps
          </div>

          <!-- Arrowhead -->
          <div
            class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full text-xs leading-none"
            :class="{
              'text-amber-400': arrowState(idx) === 'bought',
              'text-purple-400/60': arrowState(idx) === 'buyable',
              'text-white/15': arrowState(idx) === 'locked',
            }"
          >
            ▶
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
