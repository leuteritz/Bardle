<template>
  <div class="relative group">
    <!-- Kompakter Ability Container -->
    <div
      class="relative p-2 transition-all duration-300 border-2 shadow-md cursor-pointer bg-gradient-to-br from-amber-100/90 to-yellow-100/90 rounded-xl border-amber-300 hover:shadow-lg hover:scale-105"
      :class="{ 'ring-2 ring-amber-400 ring-opacity-50': canUpgrade }"
    >
      <!-- Kompakte Level Indicators -->
      <div class="flex justify-center mb-2 space-x-0.5">
        <div
          v-for="n in 5"
          :key="n"
          class="w-2 h-2 transition-all duration-300 border rounded-full"
          :class="
            n <= abilityLevel
              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 border-amber-500'
              : 'bg-amber-50 border-amber-300'
          "
        ></div>
      </div>

      <!-- Kompaktes Ability Icon -->
      <div class="relative flex justify-center mb-2">
        <div class="w-12 h-12 overflow-hidden border rounded-lg shadow-inner">
          <img
            :src="icon"
            class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        <!-- Kompakter Ability Key Badge -->
        <div
          class="absolute flex items-center justify-center w-5 h-5 border rounded-full shadow-md -top-1 -right-1 bg-gradient-to-br from-amber-500 to-amber-600 border-amber-200"
        >
          <span class="text-xs font-bold text-white">{{ ability }}</span>
        </div>

        <!-- Max Level Indicator -->
        <div
          v-if="abilityLevel === 5"
          class="absolute flex items-center justify-center w-4 h-4 border border-green-200 rounded-full -bottom-1 -right-1 bg-gradient-to-br from-green-500 to-green-600"
        >
          <span class="text-xs text-white">✓</span>
        </div>
      </div>

      <!-- Kompakter Ability Level -->
      <div class="mb-2 text-center">
        <div class="text-sm font-black text-amber-800">Lv.{{ abilityLevel }}</div>
      </div>

      <!-- Kompakte Upgrade Buttons -->
      <div class="flex justify-center">
        <button
          v-if="canUpgrade"
          @click.stop="$emit('upgrade')"
          class="relative px-2 py-1 text-xs font-bold text-white transition-all duration-200 border rounded-full shadow-md group bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 hover:shadow-lg hover:scale-105 active:scale-95 border-amber-400"
        >
          <span class="relative z-10 flex items-center">
            <span class="mr-1 text-xs">⬆️</span>
            <span class="text-xs">Up</span>
          </span>
          <div
            class="absolute inset-0 transition-opacity duration-200 rounded-full opacity-0 bg-gradient-to-r from-amber-600 to-yellow-600 group-hover:opacity-100"
          ></div>
        </button>

        <div
          v-else-if="abilityLevel === 5"
          class="px-2 py-1 text-xs font-bold text-green-700 border border-green-300 rounded-full bg-gradient-to-r from-green-100 to-green-200"
        >
          <span class="flex items-center">
            <span class="mr-1 text-xs">✨</span>
            <span class="text-xs">Max</span>
          </span>
        </div>

        <div
          v-else
          class="px-2 py-1 text-xs font-bold text-gray-500 border border-gray-300 rounded-full bg-gradient-to-r from-gray-100 to-gray-200"
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
        class="absolute w-3 h-3 bg-red-500 rounded-full -top-1 -right-1 animate-bounce"
      >
        <div class="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AbilityComponent',
  props: {
    icon: String,
    ability: String,
    abilityLevel: Number,
    canUpgrade: Boolean,
  },
  emits: ['upgrade'],
})
</script>
