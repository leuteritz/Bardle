<template>
  <div class="team-col" :class="side === 'blue' ? 'team-col--blue' : 'team-col--red'">
    <div class="col-title" :class="side === 'blue' ? 'col-title--blue' : 'col-title--red'">
      {{ side === 'blue' ? 'BLUE TEAM' : 'RED TEAM' }}
    </div>

    <div
      v-for="(champ, idx) in team"
      :key="champ.name || idx"
      class="champ-card"
      :class="[
        side === 'blue' ? 'champ-card--blue' : 'champ-card--red',
        { 'champ-card--bard': champ.name === 'Bard' },
      ]"
    >
      <div class="card-top" :class="{ 'card-top--reverse': side === 'red' }">
        <div class="portrait-wrap">
          <img
            v-if="champ.name"
            :src="battleStore.getChampionImage(champ.name)"
            :alt="champ.name"
            class="portrait"
            :class="{ 'portrait--dead': champ.respawnState === 'walking-back' }"
          />
          <div v-else class="portrait portrait--empty" />
          <span class="level-badge">{{ champ.level }}</span>
        </div>
        <div class="name-block" :class="{ 'name-block--right': side === 'red' }">
          <div class="champ-name">
            {{ champ.name || '—' }}
            <span v-if="champ.name === 'Bard'" class="you-tag">YOU</span>
            <span v-if="champ.name && champ.name === mvpLiveName" class="mvp-tag">MVP</span>
          </div>
          <div class="kda">
            <span class="kda-k">{{ champ.kills }}</span><span class="kda-sep">/</span><span class="kda-d">{{ champ.deaths }}</span><span class="kda-sep">/</span><span class="kda-a">{{ champ.assists }}</span>
            <span class="cs-tag">{{ champ.cs }} cs</span>
          </div>
        </div>
        <span v-if="champ.respawnState === 'walking-back'" class="respawn-tag">⟳</span>
      </div>

      <div class="card-bottom" :class="{ 'card-bottom--reverse': side === 'red' }">
        <div class="hp-track">
          <div
            class="hp-fill"
            :class="hpClass(champ.hpPercent)"
            :style="{ width: (champ.respawnState === 'walking-back' ? 100 : champ.hpPercent) + '%', float: side === 'red' ? 'right' : 'none' }"
          />
        </div>
        <div class="item-pips">
          <span v-for="p in 6" :key="p" class="item-pip" :class="{ 'item-pip--filled': p <= champ.items }" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { mvpScore } from '@/utils/battleTimeline'

const props = defineProps<{ side: 'blue' | 'red' }>()

const battleStore = useBattleStore()
const team = computed(() => (props.side === 'blue' ? battleStore.team1 : battleStore.team2))

/** Live MVP across both teams (updates as the battle progresses). */
const mvpLiveName = computed(() => {
  let best = -Infinity
  let name = ''
  for (const c of [...battleStore.team1, ...battleStore.team2]) {
    if (!c.name) continue
    const s = mvpScore(c)
    if (s > best) {
      best = s
      name = c.name
    }
  }
  return name
})

function hpClass(hp: number): string {
  if (hp > 60) return 'hp--high'
  if (hp > 35) return 'hp--mid'
  return 'hp--low'
}
</script>

<style scoped>
.team-col {
  width: 218px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 8px;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.team-col--blue {
  border-right: 1px solid #3e200a;
  background: rgba(59, 130, 246, 0.04);
}
.team-col--red {
  border-left: 1px solid #3e200a;
  background: rgba(239, 68, 68, 0.04);
}

.col-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  padding: 0 2px 2px;
  flex-shrink: 0;
}
.col-title--blue { color: #6a7fb0; }
.col-title--red { color: #c08080; text-align: right; }

.champ-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 5px;
  min-height: 56px;
}
.champ-card--blue {
  background: rgba(59, 130, 246, 0.07);
  border: 1px solid rgba(96, 165, 250, 0.22);
}
.champ-card--red {
  background: rgba(239, 68, 68, 0.07);
  border: 1px solid rgba(248, 113, 113, 0.22);
}
.champ-card--bard {
  background: rgba(232, 192, 64, 0.08);
  border: 1px solid rgba(232, 192, 64, 0.4);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-top--reverse { flex-direction: row-reverse; }

.portrait-wrap {
  position: relative;
  flex-shrink: 0;
}

.portrait {
  width: 32px;
  height: 32px;
  border-radius: 5px;
  object-fit: cover;
  border: 1px solid #60a5fa;
  transition: filter 0.3s;
}
.champ-card--red .portrait { border-color: #f87171; }
.champ-card--bard .portrait { border-color: #e8c040; }
.portrait--dead { filter: grayscale(0.9) brightness(0.6); }
.portrait--empty {
  background: #141410;
  border: 1px dashed #3e200a;
}

.level-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #0d1830;
  border: 1px solid #60a5fa;
  font-size: 8px;
  font-weight: 700;
  color: #cfe0ff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.champ-card--red .level-badge {
  background: #300d0d;
  border-color: #f87171;
  color: #ffd0d0;
}
.champ-card--bard .level-badge {
  background: #2a1e05;
  border-color: #e8c040;
  color: #ffe9a0;
}

.name-block {
  flex: 1;
  min-width: 0;
}
.name-block--right { text-align: right; }

.champ-name {
  font-size: 12px;
  color: #dbeafe;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.champ-card--red .champ-name { color: #fee2e2; }
.champ-card--bard .champ-name { color: #e8c040; }

.you-tag {
  font-size: 8px;
  color: #6a5820;
  letter-spacing: 1px;
}
.mvp-tag {
  font-size: 8px;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 1px;
}

.kda {
  font-size: 11px;
  display: flex;
  align-items: baseline;
  gap: 1px;
}
.name-block--right .kda { justify-content: flex-end; }
.kda-k { color: #6ee7b7; }
.kda-d { color: #fca5a5; }
.kda-a { color: #93c5fd; }
.kda-sep { color: #555566; }

.cs-tag {
  margin-left: 6px;
  font-size: 9px;
  color: #8a8070;
}

.respawn-tag {
  flex-shrink: 0;
  font-size: 12px;
  color: #e8c040;
  animation: respawn-spin 1.4s linear infinite;
}

.card-bottom {
  display: flex;
  align-items: center;
  gap: 5px;
}
.card-bottom--reverse { flex-direction: row-reverse; }

.hp-track {
  flex: 1;
  height: 5px;
  background: #3a1010;
  border-radius: 2px;
  overflow: hidden;
}
.hp-fill {
  height: 100%;
  transition: width 0.6s ease;
}
.hp--high { background: #37d14a; }
.hp--mid { background: #c9d137; }
.hp--low { background: #d15a37; }

.item-pips {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.item-pip {
  width: 9px;
  height: 9px;
  background: #241a0c;
  border: 1px solid #5c3310;
  border-radius: 2px;
}
.item-pip--filled {
  background: #5c3310;
  border-color: #c89040;
  box-shadow: inset 0 0 3px rgba(232, 192, 64, 0.6);
}

@keyframes respawn-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .respawn-tag { animation: none; }
}
</style>
