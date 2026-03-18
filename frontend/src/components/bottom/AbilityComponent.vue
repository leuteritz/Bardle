<template>
  <div class="relative group">
    <!-- Kompakter Ability Container -->
    <div
      class="relative p-1.5 transition-all duration-300 border-2 shadow-md cursor-pointer bg-gradient-to-br from-white/10 to-white/5 rounded-xl border-violet-400/40 hover:shadow-xl hover:scale-105 backdrop-blur-sm"
      :class="{ 'ring-2 ring-violet-400 ring-opacity-50 shadow-violet-500/20': canUpgrade }"
    >
      <!-- Kompakte Level Indicators -->
      <div class="flex justify-center mb-2 space-x-0.5">
        <div
          v-for="n in 5"
          :key="n"
          class="w-1.5 h-1.5 transition-all duration-300 border rounded-full"
          :class="
            n <= abilityLevel
              ? 'bg-gradient-to-br from-violet-400 to-purple-500 border-violet-400 shadow-sm'
              : 'bg-gray-700/50 border-gray-500/50'
          "
        ></div>
      </div>

      <!-- Kompaktes Ability Icon -->
      <div class="relative flex justify-center mb-2">
        <div
          class="overflow-hidden border rounded-lg shadow-inner w-9 h-9 bg-gradient-to-br from-white/20 to-white/5 border-white/30"
        >
          <img
            :src="icon"
            class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        <!-- Kompakter Ability Key Badge -->
        <div
          class="absolute flex items-center justify-center w-5 h-5 border rounded-full shadow-md -top-1 -right-1 bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300/50"
        >
          <span class="text-xs font-bold text-white">{{ ability }}</span>
        </div>

        <!-- Max Level Indicator -->
        <div
          v-if="abilityLevel === 5"
          class="absolute flex items-center justify-center w-4 h-4 border rounded-full border-green-300/50 -bottom-1 -right-1 bg-gradient-to-br from-green-500 to-green-600"
        >
          <span class="text-xs text-white">✓</span>
        </div>
      </div>

      <!-- Kompakter Ability Level -->
      <div class="mb-2 text-center">
        <div
          class="text-sm font-black text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
        >
          Lv.{{ abilityLevel }}
        </div>
      </div>

      <!-- Kompakte Upgrade Buttons -->
      <div class="flex justify-center">
        <button
          v-if="canUpgrade"
          @click.stop="$emit('upgrade')"
          class="relative px-2 py-1 text-xs font-bold text-white transition-all duration-200 border rounded-full shadow-md group bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 hover:shadow-lg hover:scale-105 active:scale-95 border-violet-400/50"
        >
          <span class="relative z-10 flex items-center">
            <span class="mr-1 text-xs">⬆️</span>
            <span class="text-xs">Up</span>
          </span>
          <div
            class="absolute inset-0 transition-opacity duration-200 rounded-full opacity-0 bg-gradient-to-r from-violet-600 to-purple-700 group-hover:opacity-100"
          ></div>
        </button>

        <div
          v-else-if="abilityLevel === 5"
          class="px-2 py-1 text-xs font-bold text-green-300 border rounded-full border-green-400/30 bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-sm"
        >
          <span class="flex items-center">
            <span class="mr-1 text-xs">✨</span>
            <span class="text-xs">Max</span>
          </span>
        </div>

        <div
          v-else
          class="px-2 py-1 text-xs font-bold text-gray-400 border rounded-full border-gray-500/30 bg-gradient-to-r from-gray-700/20 to-gray-600/20 backdrop-blur-sm"
        >
          <span class="flex items-center">
            <span class="mr-1 text-xs">🔒</span>
            <span class="text-xs">Lock</span>
          </span>
        </div>
      </div>

      <!-- Kompakter Upgrade Available Indicator -->
      <div
        v-if="canUpgrade"
        class="absolute w-3 h-3 rounded-full shadow-lg bg-gradient-to-r from-violet-400 to-purple-500 -top-1 -right-1 animate-bounce"
      >
        <div class="absolute inset-0 bg-violet-400 rounded-full animate-ping"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../../stores/gameStore'

export default defineComponent({
  name: 'AbilityComponent',
  props: {
    icon: {
      type: String,
      required: true,
    },
    ability: {
      type: String,
      required: true,
    },
    abilityLevel: {
      type: Number,
      required: true,
    },
    canUpgrade: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['upgrade'],
  setup() {
    const gameStore = useGameStore()
    return { gameStore }
  },
})
</script>
