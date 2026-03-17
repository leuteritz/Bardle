<template>
  <div class="flex flex-col w-full h-full p-4 space-y-4">
    <!-- ─── Bard Leader Card ─── -->
    <div
      class="group relative overflow-hidden rounded-2xl border backdrop-blur-md bg-gradient-to-br from-blue-900/30 via-violet-900/20 to-blue-900/10 border-blue-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
    >
      <div
        class="absolute inset-0 border pointer-events-none rounded-2xl border-blue-400/30 animate-pulse"
      />
      <div class="flex items-center gap-4 p-4">
        <!-- Bard Icon -->
        <div
          class="relative flex items-center justify-center flex-shrink-0 w-16 h-16 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-white/15"
        >
          <div
            class="absolute inset-0 rounded-xl blur-md opacity-60 bg-gradient-to-br from-blue-400/40 to-violet-400/20"
          />
          <img
            src="/img/BardAbilities/Bard.png"
            alt="Bard"
            class="relative z-10 object-cover w-10 h-10 rounded-lg drop-shadow-lg"
          />
          <!-- Crown -->
          <span class="absolute text-sm -translate-x-1/2 -top-3 left-1/2 drop-shadow-lg">👑</span>
        </div>

        <div class="flex-1 min-w-0">
          <h3
            class="mb-1 text-sm font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
          >
            Bard
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-black rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 tracking-wider"
            >
              👑 Team Leader
            </span>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-black rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 tracking-wider"
            >
              Permanent
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Team Slots ─── -->
    <div
      class="p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-bold tracking-widest uppercase text-white/50"
          >Team-Aufstellung</span
        >
        <span
          class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
        >
          {{ battleStore.selectedChampions.length }}/4
        </span>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <!-- Filled Slots -->
        <div
          v-for="(champion, index) in battleStore.selectedChampions"
          :key="champion"
          class="relative group/slot"
        >
          <div
            class="relative overflow-hidden rounded-xl border transition-all duration-300 bg-gradient-to-br from-emerald-900/30 via-green-900/20 to-teal-900/10 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
          >
            <div
              class="absolute inset-0 border pointer-events-none rounded-xl border-emerald-400/30 animate-pulse"
            />
            <div class="flex flex-col items-center gap-1 p-2">
              <span
                class="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200"
              >
                #{{ index + 1 }}
              </span>
              <span
                class="text-[11px] font-black text-center bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent leading-tight"
              >
                {{ truncate(champion, 7) }}
              </span>
              <button
                @click="removeChampion(champion)"
                class="w-full px-1 py-0.5 text-[10px] font-black rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/40 transition-colors duration-200"
              >
                ✕ Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Empty Slots -->
        <div
          v-for="n in 4 - battleStore.selectedChampions.length"
          :key="'empty-' + n"
          class="relative"
        >
          <div
            class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 border-dashed bg-white/[0.02] border-white/10 min-h-[80px] opacity-50"
          >
            <span class="text-xl text-white/20">+</span>
            <span class="text-[10px] text-white/20 font-bold"
              >#{{ battleStore.selectedChampions.length + n }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Available Champions ─── -->
    <div
      class="flex items-center justify-between px-3 py-2 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <span class="text-xs font-bold tracking-widest uppercase text-white/50">Verfügbar</span>
      <span
        class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
      >
        {{ selectableChampions.length }} Champions
      </span>
    </div>

    <div class="flex-1 min-h-0 space-y-3 overflow-y-auto">
      <!-- No Champions State -->
      <div
        v-if="selectableChampions.length === 0"
        class="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
      >
        <span class="text-3xl">🛒</span>
        <h4
          class="text-sm font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
        >
          Keine Champions verfügbar
        </h4>
        <p class="text-xs text-blue-400">Besuche den Shop, um mehr Champions zu kaufen!</p>
      </div>

      <!-- Champion Cards -->
      <div
        v-for="champion in selectableChampions"
        :key="champion"
        @click="addChampion(champion)"
        class="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 border backdrop-blur-md hover:scale-[1.015] hover:-translate-y-0.5"
        :class="
          battleStore.selectedChampions.length < 4
            ? 'bg-gradient-to-br from-emerald-900/30 via-green-900/20 to-teal-900/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_35px_rgba(16,185,129,0.3)]'
            : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 opacity-55 grayscale cursor-not-allowed'
        "
      >
        <!-- Shimmer Sweep -->
        <div
          v-if="battleStore.selectedChampions.length < 4"
          class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
        />
        <!-- Glow Pulse -->
        <div
          v-if="battleStore.selectedChampions.length < 4"
          class="absolute inset-0 border pointer-events-none rounded-2xl border-emerald-400/40 animate-pulse"
        />

        <div class="flex items-center gap-4 p-4 pr-3">
          <!-- Icon -->
          <div
            class="relative flex items-center justify-center flex-shrink-0 w-16 h-16 transition-transform duration-300 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-white/15 group-hover:scale-110"
          >
            <div
              v-if="battleStore.selectedChampions.length < 4"
              class="absolute inset-0 rounded-xl blur-md opacity-60 bg-gradient-to-br from-emerald-400/40 to-teal-400/20"
            />
            <span class="relative z-10 text-2xl drop-shadow-lg">⚔️</span>
          </div>

          <!-- Name & Info -->
          <div class="flex-1 min-w-0">
            <h3
              class="mb-1.5 text-sm font-black leading-tight tracking-wide bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent"
            >
              {{ champion }}
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
              >
                <span class="text-emerald-400">⚔️</span>
                Bereit
              </span>
            </div>
          </div>

          <!-- Add Button -->
          <div class="flex-shrink-0 w-20 ml-1">
            <button
              class="group/btn relative w-full px-2 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 overflow-hidden border"
              :class="
                battleStore.selectedChampions.length < 4
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400/50 text-white shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/50 hover:from-emerald-400 active:scale-95'
                  : 'bg-gray-800/50 border-gray-600/20 text-gray-500 cursor-not-allowed'
              "
              :disabled="battleStore.selectedChampions.length >= 4"
            >
              <div
                v-if="battleStore.selectedChampions.length < 4"
                class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"
              />
              <span class="relative font-black tracking-tight">+ Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'
import { truncate } from '../../../config/numberFormat'

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

    return { battleStore, selectableChampions, addChampion, removeChampion, truncate }
  },
})
</script>
