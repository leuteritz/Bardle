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
      <!-- Full-bleed portrait: the image IS the card background, no inner frame -->
      <img
        v-if="champ.name"
        :src="battleStore.getChampionImage(champ.name)"
        :alt="champ.name"
        class="portrait"
        :class="{ 'portrait--dead': champ.respawnState === 'walking-back' }"
      />
      <div v-else class="portrait portrait--empty" />

      <!-- Team-tinted scrim keeps name/KDA readable over any splash art -->
      <div class="scrim" />

      <span v-if="champ.respawnState === 'walking-back'" class="respawn-tag">⟳</span>

      <!-- Bottom row: name/KDA on the team side, level medallion on the opposite side -->
      <div class="info" :class="{ 'info--right': side === 'red' }">
        <div class="info-text">
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
        <span v-if="champ.name" class="level-badge">{{ champ.level }}</span>
      </div>

      <!-- HP bar sits flush on the card's bottom edge -->
      <div class="hp-track">
        <div
          class="hp-fill"
          :class="hpClass(champ.hpPercent)"
          :style="{ width: (champ.respawnState === 'walking-back' ? 100 : champ.hpPercent) + '%', marginLeft: side === 'red' ? 'auto' : '0' }"
        />
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
  /* floating spectator cards over the map — width shared with the drake-badge
     offsets via --hud-w on .rift-board, sizes fluid via cq units */
  width: var(--hud-w, 192px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.9cqh, 7px);
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 transparent;
  /* team accent as CSS vars so every sub-element derives from one hue */
  --team-rgb: 96, 165, 250;
  --team-scrim: 7, 14, 30;
}
.team-col--red {
  --team-rgb: 248, 113, 113;
  --team-scrim: 30, 8, 10;
}

.col-title {
  font-size: clamp(10px, 1.6cqh, 11px);
  font-weight: 700;
  letter-spacing: 2px;
  padding: 3px 8px;
  flex-shrink: 0;
  color: rgba(var(--team-rgb), 0.9);
  background: linear-gradient(
    to var(--title-dir, right),
    rgba(var(--team-rgb), 0.18),
    transparent 80%
  );
  border-radius: 4px;
}
.col-title--red {
  --title-dir: left;
  text-align: right;
}

.champ-card {
  position: relative;
  height: clamp(46px, 8.8cqh, 66px);
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--team-scrim), 0.85);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
}
/* team edge marks the side without framing the portrait */
.champ-card--blue::after,
.champ-card--red::after,
.champ-card--bard::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(var(--team-rgb), 0.9);
  pointer-events: none;
}
.champ-card--blue::after { left: 0; }
.champ-card--red::after { right: 0; }
.champ-card--bard { --team-rgb: 232, 192, 64; }

.portrait {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* square champ icons: keep the face band visible in the wide card crop */
  object-position: center 30%;
  transition: filter 0.3s;
}
.portrait--dead {
  filter: grayscale(0.9) brightness(0.45);
}
.portrait--empty {
  background: #141410;
  border: 1px dashed #3e200a;
  border-radius: 8px;
}

.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(var(--team-scrim), 0.92) 0%,
    rgba(var(--team-scrim), 0.55) 42%,
    rgba(var(--team-scrim), 0.08) 75%,
    transparent 100%
  );
  pointer-events: none;
}

/* Level medallion: opposite end of the bottom row from the champ name */
.level-badge {
  flex-shrink: 0;
  width: clamp(20px, 3.8cqh, 27px);
  height: clamp(20px, 3.8cqh, 27px);
  border-radius: 50%;
  background: rgba(var(--team-scrim), 0.9);
  border: 1.5px solid rgba(var(--team-rgb), 0.95);
  box-shadow: 0 0 6px rgba(var(--team-rgb), 0.45), 0 1px 3px rgba(0, 0, 0, 0.7);
  font-size: clamp(11px, 2cqh, 14px);
  font-weight: 800;
  color: #f4f6fb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.respawn-tag {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: clamp(12px, 2cqh, 14px);
  color: #e8c040;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  animation: respawn-spin 1.4s linear infinite;
}
.team-col--red .respawn-tag {
  right: auto;
  left: 6px;
}

.info {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 7px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
}
.info--right {
  flex-direction: row-reverse;
  text-align: right;
}

.info-text {
  min-width: 0;
}

.champ-name {
  font-size: clamp(11px, 1.8cqh, 13px);
  font-weight: 700;
  color: #f4f6fb;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.champ-card--bard .champ-name { color: #ffe9a0; }

.you-tag {
  font-size: 9px;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 1px;
}
.mvp-tag {
  font-size: 9px;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 1px;
}

.kda {
  font-size: clamp(10px, 1.6cqh, 12px);
  display: flex;
  align-items: baseline;
  gap: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}
.info--right .kda { justify-content: flex-end; }
.kda-k { color: #6ee7b7; }
.kda-d { color: #fca5a5; }
.kda-a { color: #93c5fd; }
.kda-sep { color: #8890a0; }

.cs-tag {
  margin-left: 6px;
  font-size: clamp(9px, 1.4cqh, 11px);
  color: #c8bda4;
}

.hp-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.55);
}
.hp-fill {
  height: 100%;
  transition: width 0.6s ease;
}
.hp--high { background: #37d14a; }
.hp--mid { background: #c9d137; }
.hp--low { background: #d15a37; }

@keyframes respawn-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .respawn-tag { animation: none; }
}
</style>
