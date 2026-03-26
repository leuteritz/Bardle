<template>
  <div
    class="h-full overflow-y-auto rpg-scrollbar p-3 space-y-3 scoreboard-panel"
  >
    <!-- Blue Team -->
    <div>
      <span
        class="inline-block mb-1.5 px-2 py-0.5 text-[10px] font-black tracking-wider team-badge team-badge--blue"
      >
        BLUE TEAM
      </span>
      <div class="space-y-1">
        <div
          v-for="(champ, i) in battleStore.team1"
          :key="'t1-' + i"
          class="flex items-center gap-2 px-2 py-1 champ-row champ-row--blue"
        >
          <img
            :src="battleStore.getChampionImage(champ.name)"
            :alt="champ.name"
            class="w-6 h-6 rounded-full object-cover flex-shrink-0 champ-img--blue"
          />
          <span class="text-xs font-bold text-blue-200 flex-1">
            {{ champ.name }}
          </span>
          <div class="flex items-center gap-0.5 text-[10px] flex-shrink-0">
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
        class="inline-block mb-1.5 px-2 py-0.5 text-[10px] font-black tracking-wider team-badge team-badge--red"
      >
        RED TEAM
      </span>
      <div class="space-y-1">
        <div
          v-for="(champ, i) in battleStore.team2"
          :key="'t2-' + i"
          class="flex items-center gap-2 px-2 py-1 champ-row champ-row--red"
        >
          <img
            :src="battleStore.getChampionImage(champ.name)"
            :alt="champ.name"
            class="w-6 h-6 rounded-full object-cover flex-shrink-0 champ-img--red"
          />
          <span class="text-xs font-bold text-red-200 flex-1">
            {{ champ.name }}
          </span>
          <div class="flex items-center gap-0.5 text-[10px] flex-shrink-0">
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

<style scoped>
.scoreboard-panel {
  background: var(--rpg-bg-deep);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
}

.team-badge {
  border-radius: 4px;
  border: 1px solid;
}
.team-badge--blue {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}
.team-badge--red {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.champ-row {
  border-radius: 4px;
  border: 1px solid;
}
.champ-row--blue {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.15);
}
.champ-row--red {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.15);
}

.champ-img--blue { border: 1px solid rgba(59, 130, 246, 0.4); }
.champ-img--red { border: 1px solid rgba(239, 68, 68, 0.4); }
</style>
