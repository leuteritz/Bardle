<template>
  <div
    class="h-full overflow-y-auto rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 p-3 space-y-3"
  >
    <!-- Blue Team -->
    <div>
      <span
        class="inline-block mb-1.5 px-2 py-0.5 text-[10px] font-black rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 tracking-wider"
      >
        BLUE TEAM
      </span>
      <div class="space-y-1">
        <div
          v-for="(champ, i) in battleStore.team1"
          :key="'t1-' + i"
          class="flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-400/15"
        >
          <img
            :src="battleStore.getChampionImage(champ.name)"
            :alt="champ.name"
            class="w-6 h-6 rounded-full object-cover border border-blue-400/40 flex-shrink-0"
          />
          <span class="text-[10px] font-bold text-blue-200 truncate flex-1">
            {{ champ.name }}
          </span>
          <div class="flex items-center gap-0.5 text-[9px] flex-shrink-0">
            <span class="font-bold text-emerald-300">{{ champ.kills }}</span>
            <span class="text-white/30">/</span>
            <span class="font-bold text-red-300">{{ champ.deaths }}</span>
            <span class="text-white/30">/</span>
            <span class="font-bold text-blue-300">{{ champ.assists }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Red Team -->
    <div>
      <span
        class="inline-block mb-1.5 px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500/20 border border-red-400/30 text-red-200 tracking-wider"
      >
        RED TEAM
      </span>
      <div class="space-y-1">
        <div
          v-for="(champ, i) in battleStore.team2"
          :key="'t2-' + i"
          class="flex items-center gap-2 px-2 py-1 rounded-lg bg-red-500/10 border border-red-400/15"
        >
          <img
            :src="battleStore.getChampionImage(champ.name)"
            :alt="champ.name"
            class="w-6 h-6 rounded-full object-cover border border-red-400/40 flex-shrink-0"
          />
          <span class="text-[10px] font-bold text-red-200 truncate flex-1">
            {{ champ.name }}
          </span>
          <div class="flex items-center gap-0.5 text-[9px] flex-shrink-0">
            <span class="font-bold text-emerald-300">{{ champ.kills }}</span>
            <span class="text-white/30">/</span>
            <span class="font-bold text-red-300">{{ champ.deaths }}</span>
            <span class="text-white/30">/</span>
            <span class="font-bold text-blue-300">{{ champ.assists }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'

export default defineComponent({
  name: 'ScoreboardComponent',
  setup() {
    const battleStore = useBattleStore()
    return { battleStore }
  },
})
</script>
