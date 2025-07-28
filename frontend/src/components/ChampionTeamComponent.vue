<template>
  <div
    class="team-container relative p-8 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-3xl border-4 border-amber-300 shadow-2xl max-w-4xl mx-auto min-h-[400px]"
  >
    <!-- Header -->
    <div class="mb-8 text-center">
      <h2 class="mb-4 text-5xl font-extrabold team-title text-amber-800 drop-shadow-lg">
        ⚔️ Dein Team
      </h2>
      <div
        class="w-32 h-1 mx-auto rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
      ></div>
    </div>

    <!-- Team Display -->
    <div class="flex flex-col items-center justify-center gap-8 mb-8 team-display lg:flex-row">
      <!-- Bard (Leader) -->
      <div class="flex flex-col items-center bard-container">
        <div class="relative">
          <div
            class="relative flex items-center justify-center w-24 h-24 overflow-hidden border-4 rounded-full shadow-xl bard-avatar bg-gradient-to-br from-amber-200 to-yellow-300 border-amber-500"
          >
            <img src="/img/BardAbilities/Bard.png" alt="Bard" class="w-20 h-20 rounded-full" />
            <div
              class="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/30"
            ></div>
            <div
              class="absolute inset-0 border-2 rounded-full border-amber-400 animate-pulse"
            ></div>
          </div>
          <div
            class="absolute text-2xl transform -translate-x-1/2 leader-crown -top-3 left-1/2 animate-bounce"
          >
            👑
          </div>
        </div>
        <span class="mt-3 text-xl font-bold text-amber-800 drop-shadow-sm">Bard</span>
        <span class="text-sm font-semibold text-amber-600">Team Leader</span>
      </div>

      <!-- Plus Sign -->
      <div class="text-4xl font-bold plus-sign text-amber-700 animate-pulse">+</div>

      <!-- Team Members -->
      <div class="flex flex-wrap justify-center gap-4 team-members">
        <!-- Selected Champions -->
        <div
          v-for="(champion, index) in battleStore.selectedChampions"
          :key="champion"
          class="relative team-slot selected-slot"
        >
          <div
            class="relative flex items-center justify-center w-20 h-20 transition-all duration-300 border-4 border-blue-400 rounded-full shadow-lg slot-container bg-gradient-to-br from-blue-100 to-blue-200 hover:scale-110"
          >
            <span class="px-1 text-sm font-bold text-center text-blue-800">{{
              champion.length > 8 ? champion.slice(0, 8) + '...' : champion
            }}</span>
            <div
              class="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/30"
            ></div>
          </div>
          <button
            class="absolute text-sm font-bold text-white transition-all duration-300 rounded-full shadow-lg remove-btn -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-red-500 to-red-600 hover:scale-110 hover:shadow-red-400/50"
            @click="removeChampion(champion)"
          >
            ×
          </button>
          <div
            class="absolute flex items-center justify-center w-5 h-5 text-xs font-bold transform -translate-x-1/2 rounded-full slot-number -bottom-2 left-1/2 bg-amber-400 text-amber-900"
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
            class="flex items-center justify-center w-20 h-20 transition-all duration-300 border-4 border-gray-300 border-dashed rounded-full shadow-inner slot-container bg-gradient-to-br from-gray-100 to-gray-200 opacity-60 hover:opacity-80"
          >
            <span class="text-2xl text-gray-400">+</span>
          </div>
          <div
            class="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-gray-600 transform -translate-x-1/2 bg-gray-300 rounded-full slot-number -bottom-2 left-1/2"
          >
            {{ battleStore.selectedChampions.length + n }}
          </div>
        </div>
      </div>
    </div>

    <!-- Team Instructions -->
    <div
      class="p-4 mb-6 text-center border-2 instructions bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl border-amber-200"
    >
      <h3 class="mb-2 text-lg font-bold text-amber-800">📋 Team-Aufstellung</h3>
      <p class="text-amber-700">
        Wähle bis zu <strong>4 Champions</strong> für dein Team aus. Bard ist automatisch dein Team
        Leader!
      </p>
      <div class="mt-2 text-sm text-amber-600">
        <span class="font-semibold">{{ battleStore.selectedChampions.length }}/4</span> Champions
        ausgewählt
      </div>
    </div>

    <!-- Available Champions -->
    <div class="available-champions">
      <h3 class="mb-4 text-xl font-bold text-center text-amber-800">Verfügbare Champions:</h3>
      <div class="champions-list max-h-[200px] overflow-y-auto pr-2">
        <div class="flex flex-wrap justify-center gap-3">
          <button
            v-for="champion in selectableChampions"
            :key="champion"
            class="px-4 py-2 font-bold text-white transition-all duration-300 shadow-lg champion-btn rounded-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              battleStore.selectedChampions.length >= 4
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-400/50'
            "
            @click="addChampion(champion)"
            :disabled="battleStore.selectedChampions.length >= 4"
          >
            <span class="flex items-center gap-2">
              <span>⚔️</span>
              <span>{{ champion }}</span>
            </span>
          </button>
        </div>

        <!-- No Champions Available Message -->
        <div v-if="selectableChampions.length === 0" class="py-8 text-center no-champions">
          <div class="mb-4 text-4xl">🛒</div>
          <h4 class="mb-2 text-xl font-bold text-amber-800">Keine Champions verfügbar</h4>
          <p class="text-amber-700">Besuche den Shop, um mehr Champions zu kaufen!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useBattleStore } from '../stores/battleStore'

export default defineComponent({
  name: 'ChampionTeamComponent',
  setup() {
    const battleStore = useBattleStore()

    // Champions, die gewählt werden können (ohne Bard)
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
.team-container {
  animation: teamSlideIn 0.8s ease-out;
  position: relative;
  overflow: hidden;
}

.team-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(251, 191, 36, 0.1), transparent);
  animation: shimmer 6s linear infinite;
  pointer-events: none;
}

@keyframes teamSlideIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

.team-title {
  animation: titlePulse 3s ease-in-out infinite;
}

@keyframes titlePulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.bard-avatar {
  animation: bardGlow 2s ease-in-out infinite;
}

@keyframes bardGlow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
  }
  50% {
    box-shadow: 0 0 30px rgba(251, 191, 36, 0.8);
  }
}

.leader-crown {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.plus-sign {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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
    transform: translateY(-5px);
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

.champions-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.5) transparent;
}

.champions-list::-webkit-scrollbar {
  width: 8px;
}

.champions-list::-webkit-scrollbar-track {
  background: rgba(251, 191, 36, 0.1);
  border-radius: 10px;
}

.champions-list::-webkit-scrollbar-thumb {
  background: rgba(251, 191, 36, 0.5);
  border-radius: 10px;
}

.instructions {
  animation: instructionsBounce 1s ease-out;
}

@keyframes instructionsBounce {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.no-champions {
  animation: noChampionsFade 1s ease-out;
}

@keyframes noChampionsFade {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
