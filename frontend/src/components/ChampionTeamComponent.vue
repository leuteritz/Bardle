<template>
  <div
    class="relative h-full p-3 overflow-hidden border team-container bg-gradient-to-br from-white/5 to-purple-500/10 rounded-xl border-purple-400/30 backdrop-blur-sm"
  >
    <!-- Header -->
    <div class="mb-3 text-center">
      <h2
        class="mb-2 text-xl font-extrabold text-transparent team-title bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
      >
        ⚔️ Dein Team
      </h2>
      <div
        class="w-20 h-0.5 mx-auto rounded-full bg-gradient-to-r from-purple-400 to-pink-500"
      ></div>
    </div>

    <!-- Team Display -->
    <div class="flex flex-col items-center gap-3 mb-3 team-display lg:flex-row lg:justify-center">
      <!-- Bard (Leader) -->
      <div class="flex flex-col items-center bard-container">
        <div class="relative">
          <div
            class="relative flex items-center justify-center w-16 h-16 overflow-hidden border rounded-full shadow-xl bard-avatar bg-gradient-to-br from-purple-400/30 to-pink-500/30 border-purple-400/50"
          >
            <img src="/img/BardAbilities/Bard.png" alt="Bard" class="w-16 h-16 rounded-full" />
            <div
              class="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/30"
            ></div>
            <div class="absolute inset-0 border border-purple-400 rounded-full animate-pulse"></div>
          </div>
          <div
            class="absolute text-sm transform -translate-x-1/2 leader-crown -top-2 left-1/2 animate-bounce"
          >
            👑
          </div>
        </div>
        <span
          class="mt-1 text-sm font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
          >Bard</span
        >
        <span class="text-xs font-semibold text-purple-400">Leader</span>
      </div>

      <!-- Plus Sign -->
      <div class="text-2xl font-bold text-purple-400 plus-sign animate-pulse">+</div>

      <!-- Team Members -->
      <div class="flex flex-wrap justify-center gap-2 team-members">
        <!-- Selected Champions -->
        <div
          v-for="(champion, index) in battleStore.selectedChampions"
          :key="champion"
          class="relative team-slot selected-slot"
        >
          <div
            class="relative flex items-center justify-center w-12 h-12 transition-all duration-300 border-2 border-blue-400 rounded-full shadow-lg slot-container bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:scale-110 backdrop-blur-sm"
          >
            <span class="px-1 text-xs font-bold text-center text-blue-300">
              {{ champion.length > 6 ? champion.slice(0, 6) + '...' : champion }}
            </span>
            <div
              class="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/20"
            ></div>
          </div>
          <button
            class="absolute w-5 h-5 text-xs font-bold text-white transition-all duration-300 rounded-full shadow-lg remove-btn -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 hover:scale-110 hover:shadow-red-400/50"
            @click="removeChampion(champion)"
          >
            ×
          </button>
          <div
            class="absolute flex items-center justify-center w-4 h-4 text-xs font-bold text-white transform -translate-x-1/2 bg-purple-400 rounded-full slot-number -bottom-1 left-1/2"
          >
            {{ index + 1 }}
          </div>
        </div>

        <!-- Empty Slots -->
        <div
          v-for="n in 4 - battleStore.selectedChampions.length"
          :key="'empty-' + n"
          class="relative team-slot empty-slot"
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-all duration-300 border-2 border-gray-500 border-dashed rounded-full shadow-inner slot-container bg-gradient-to-br from-gray-700/20 to-gray-800/20 opacity-60 hover:opacity-80 backdrop-blur-sm"
          >
            <span class="text-lg text-gray-400">+</span>
          </div>
          <div
            class="absolute flex items-center justify-center w-4 h-4 text-xs font-bold text-gray-400 transform -translate-x-1/2 bg-gray-600 rounded-full slot-number -bottom-1 left-1/2"
          >
            {{ battleStore.selectedChampions.length + n }}
          </div>
        </div>
      </div>
    </div>

    <!-- Team Instructions -->
    <div
      class="p-2 mb-3 text-center border rounded-lg instructions bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 backdrop-blur-sm"
    >
      <h3 class="mb-1 text-sm font-bold text-purple-300">📋 Team-Aufstellung</h3>
      <p class="text-xs text-purple-400">
        Wähle bis zu <strong>4 Champions</strong> für dein Team aus. Bard ist automatisch dein Team
        Leader!
      </p>
      <div class="mt-1 text-xs text-purple-500">
        <span class="font-semibold">{{ battleStore.selectedChampions.length }}/4</span> Champions
        ausgewählt
      </div>
    </div>

    <!-- Available Champions -->
    <div class="available-champions">
      <h3 class="mb-2 text-sm font-bold text-center text-purple-300">Verfügbare Champions:</h3>
      <div class="champions-list h-[calc(100%-16rem)] overflow-y-auto pr-2 custom-scrollbar">
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="champion in selectableChampions"
            :key="champion"
            class="px-3 py-1 text-xs font-bold text-white transition-all duration-300 rounded-lg shadow-lg champion-btn hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              battleStore.selectedChampions.length >= 4
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-green-400/50'
            "
            @click="addChampion(champion)"
            :disabled="battleStore.selectedChampions.length >= 4"
          >
            <span class="flex items-center gap-1">
              <span class="text-xs">⚔️</span>
              <span>{{ champion }}</span>
            </span>
          </button>
        </div>

        <!-- No Champions Available Message -->
        <div v-if="selectableChampions.length === 0" class="py-6 text-center no-champions">
          <div class="mb-3 text-3xl">🛒</div>
          <h4 class="mb-2 text-lg font-bold text-purple-300">Keine Champions verfügbar</h4>
          <p class="text-sm text-purple-400">Besuche den Shop, um mehr Champions zu kaufen!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useBattleStore } from '../stores/battleStore'

export default defineComponent({
  name: 'ChampionTeamComponent',
  setup() {
    const battleStore = useBattleStore()

    const selectableChampions = computed(() =>
      battleStore.ownedChampions.filter(
        (c) => c !== 'Bard' && !battleStore.selectedChampions.includes(c),
      ),
    )

    function addChampion(champion: string) {
      if (
        battleStore.selectedChampions.length < 4 &&
        !battleStore.selectedChampions.includes(champion)
      ) {
        battleStore.selectedChampions.push(champion)
      }
    }

    function removeChampion(champion: string) {
      battleStore.selectedChampions = battleStore.selectedChampions.filter((c) => c !== champion)
    }

    return {
      battleStore,
      selectableChampions,
      addChampion,
      removeChampion,
    }
  },
})
</script>

<style scoped>
.bard-avatar {
  animation: bardGlow 2s ease-in-out infinite;
}

@keyframes bardGlow {
  0%,
  100% {
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
  }
  50% {
    box-shadow: 0 0 25px rgba(168, 85, 247, 0.8);
  }
}

.leader-crown {
  filter: drop-shadow(0 2px 4px rgba(168, 85, 247, 0.6));
}

.team-slot {
  animation: slotFloat 4s ease-in-out infinite;
}

.team-slot:nth-child(odd) {
  animation-delay: -2s;
}

@keyframes slotFloat {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-3px);
  }
}

.remove-btn {
  animation: removeButtonPulse 2s ease-in-out infinite;
}

@keyframes removeButtonPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.champion-btn {
  position: relative;
  overflow: hidden;
}

.champion-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.champion-btn:hover::before {
  left: 100%;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 27, 75, 0.3);
  border-radius: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(168, 85, 247, 0.8) 0%, rgba(236, 72, 153, 0.8) 100%);
  border-radius: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(168, 85, 247, 1) 0%, rgba(236, 72, 153, 1) 100%);
}
</style>
