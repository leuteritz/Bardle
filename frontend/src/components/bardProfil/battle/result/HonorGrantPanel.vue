<template>
  <div class="honor-panel">
    <!-- Header -->
    <div class="honor-head">
      <div class="honor-head-left">
        <Icon icon="game-icons:medal" width="20" height="20" style="color: #e8c040" />
        <span class="honor-title">GRANT HONOR</span>
        <span class="honor-pips">
          <span
            v-for="p in HONOR_MAX_SELECTIONS"
            :key="p"
            class="pip"
            :class="{ 'pip--filled': p <= battleStore.honoredChampions.length }"
          />
        </span>
      </div>
      <span class="honor-hint">
        {{ battleStore.honoredChampions.length }} / {{ HONOR_MAX_SELECTIONS }} selected · click a card to honor
      </span>
    </div>

    <!-- Column header -->
    <div class="table-head">
      <span class="col-champ">CHAMPION</span>
      <span class="col-kda">KDA</span>
      <span class="col-cs">CS</span>
      <span class="col-gold">GOLD</span>
      <span class="col-dmg">DMG</span>
      <span class="col-honor">HONOR</span>
    </div>

    <div class="table-scroll">
      <!-- Your team -->
      <div class="section-label section-label--team">YOUR TEAM</div>
      <div class="rows">
        <button
          v-for="champ in ownTeam"
          :key="champ.name"
          class="row"
          :class="rowClass(champ, 1)"
          :disabled="champ.name === 'Bard'"
          @click="battleStore.honorChampion(champ.name)"
        >
          <span class="col-champ cell-champ">
            <span class="portrait-wrap">
              <img :src="battleStore.getChampionImage(champ.name)" :alt="champ.name" class="portrait" />
              <span class="level-badge">{{ champ.level }}</span>
            </span>
            <span class="champ-names">
              <span class="champ-name" :class="{ 'champ-name--mvp': champ.name === mvpName, 'champ-name--bard': champ.name === 'Bard' }">
                {{ champ.name }}
                <em v-if="champ.name === mvpName" class="mvp-tag">MVP</em>
                <em v-if="champ.name === 'Bard'" class="you-tag">YOU</em>
              </span>
              <span class="champ-role">{{ champ.role.toUpperCase() }}</span>
            </span>
          </span>
          <span class="col-kda cell-kda">
            <span class="kda-k">{{ champ.kills }}</span><span class="kda-sep">/</span><span class="kda-d">{{ champ.deaths }}</span><span class="kda-sep">/</span><span class="kda-a">{{ champ.assists }}</span>
          </span>
          <span class="col-cs cell-plain">{{ champ.cs }}</span>
          <span class="col-gold cell-gold">{{ shortNum(champ.gold) }}</span>
          <span class="col-dmg cell-plain">{{ shortNum(champ.damage) }}</span>
          <span class="col-honor cell-honor">
            <span v-if="champ.name === 'Bard'" class="self-tag">— self —</span>
            <span v-else class="honor-circle" :class="{ 'honor-circle--on': isHonored(champ.name) }">
              <template v-if="isHonored(champ.name)">✓</template>
            </span>
          </span>
        </button>
      </div>

      <!-- Enemies -->
      <div class="section-label section-label--enemy">ENEMIES</div>
      <div class="rows">
        <button
          v-for="champ in enemyTeam"
          :key="champ.name"
          class="row row--enemy"
          :class="rowClass(champ, 2)"
          @click="battleStore.honorChampion(champ.name)"
        >
          <span class="col-champ cell-champ">
            <span class="portrait-wrap">
              <img :src="battleStore.getChampionImage(champ.name)" :alt="champ.name" class="portrait portrait--enemy" />
              <span class="level-badge level-badge--enemy">{{ champ.level }}</span>
            </span>
            <span class="champ-names">
              <span class="champ-name champ-name--enemy" :class="{ 'champ-name--mvp': champ.name === mvpName }">
                {{ champ.name }}
                <em v-if="champ.name === mvpName" class="mvp-tag">MVP</em>
              </span>
              <span class="champ-role">{{ champ.role.toUpperCase() }}</span>
            </span>
          </span>
          <span class="col-kda cell-kda">
            <span class="kda-k">{{ champ.kills }}</span><span class="kda-sep">/</span><span class="kda-d">{{ champ.deaths }}</span><span class="kda-sep">/</span><span class="kda-a">{{ champ.assists }}</span>
          </span>
          <span class="col-cs cell-plain">{{ champ.cs }}</span>
          <span class="col-gold cell-gold">{{ shortNum(champ.gold) }}</span>
          <span class="col-dmg cell-plain">{{ shortNum(champ.damage) }}</span>
          <span class="col-honor cell-honor">
            <span class="honor-circle" :class="{ 'honor-circle--on': isHonored(champ.name) }">
              <template v-if="isHonored(champ.name)">✓</template>
            </span>
          </span>
        </button>
      </div>
    </div>

    <!-- Continue button -->
    <button class="continue-btn" @click="battleStore.confirmHonorAndContinue()">
      HONOR &amp; CONTINUE →
      <span class="continue-count">({{ battleStore.resultCountdown }}s)</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { HONOR_MAX_SELECTIONS } from '@/config/constants'
import type { ChampionState } from '@/types'

const battleStore = useBattleStore()

const ownTeam = computed(() => battleStore.team1.filter((c) => c.name))
const enemyTeam = computed(() => battleStore.team2.filter((c) => c.name))
const mvpName = computed(() => battleStore.lastAutoBattleResult?.mvpName ?? '')

function isHonored(name: string): boolean {
  return battleStore.honoredChampions.includes(name)
}

function rowClass(champ: ChampionState, team: 1 | 2): Record<string, boolean> {
  return {
    'row--honored': isHonored(champ.name),
    'row--mvp': champ.name === mvpName.value,
    'row--bard': team === 1 && champ.name === 'Bard',
  }
}

function shortNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>

<style scoped>
.honor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-left: 1px solid rgba(232, 192, 64, 0.16);
  min-width: 0;
  min-height: 0;
}

/* ── Header ── */
.honor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  flex-shrink: 0;
}
.honor-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.honor-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #e8c040;
}
.honor-pips {
  display: flex;
  gap: 5px;
}
.pip {
  width: 9px;
  height: 9px;
  transform: rotate(45deg);
  background: #1c1c18;
  border: 1px solid #5c3310;
}
.pip--filled {
  background: #e8c040;
  border-color: #e8c040;
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.7);
}
.honor-hint {
  font-size: 11px;
  color: #6a5820;
}

/* ── Table ── */
.table-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 10px 5px;
  font-size: 9px;
  letter-spacing: 1px;
  color: #6a5820;
  flex-shrink: 0;
}

.col-champ { width: 190px; flex-shrink: 0; }
.col-kda { width: 76px; text-align: center; flex-shrink: 0; }
.col-cs { width: 46px; text-align: center; flex-shrink: 0; }
.col-gold { width: 56px; text-align: center; flex-shrink: 0; }
.col-dmg { width: 56px; text-align: center; flex-shrink: 0; }
.col-honor { flex: 1; text-align: right; }

.table-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.section-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 4px 0;
}
.section-label--team { color: #52b830; }
.section-label--enemy { color: #cc6050; margin-top: 10px; }

.rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.row:hover:not(:disabled) {
  border-color: rgba(232, 192, 64, 0.55);
}
.row:disabled {
  cursor: default;
}
.row--enemy {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(248, 113, 113, 0.18);
}
.row--bard {
  background: rgba(232, 192, 64, 0.05);
  border-color: rgba(212, 160, 32, 0.3);
}
.row--mvp {
  background: rgba(232, 192, 64, 0.09);
  border-color: rgba(232, 192, 64, 0.5);
}
.row--honored {
  border-color: #e8c040 !important;
  box-shadow: 0 0 12px rgba(232, 192, 64, 0.35);
  background: rgba(232, 192, 64, 0.09);
}

/* ── Cells ── */
.cell-champ {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

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
  display: block;
}
.portrait--enemy { border-color: #f87171; }
.row--bard .portrait,
.row--mvp .portrait { border-color: #e8c040; }

.level-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #0d1830;
  border: 1px solid #60a5fa;
  font-size: 7px;
  font-weight: 700;
  color: #cfe0ff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.level-badge--enemy {
  background: #300d0d;
  border-color: #f87171;
  color: #ffd0d0;
}

.champ-names {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.champ-name {
  font-size: 12px;
  color: #dbeafe;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.champ-name--enemy { color: #fee2e2; }
.champ-name--bard { color: #e8c040; }
.champ-name--mvp { color: #e8c040; }
.mvp-tag {
  font-size: 8px;
  font-style: normal;
  color: #8a7040;
  letter-spacing: 1px;
}
.you-tag {
  font-size: 8px;
  font-style: normal;
  color: #6a5820;
}
.champ-role {
  font-size: 8px;
  letter-spacing: 1px;
  color: #6a5820;
}

.cell-kda {
  font-size: 12px;
}
.kda-k { color: #6ee7b7; }
.kda-d { color: #fca5a5; }
.kda-a { color: #93c5fd; }
.kda-sep { color: #555566; }

.cell-plain {
  font-size: 12px;
  color: #e8e2d0;
}
.cell-gold {
  font-size: 12px;
  color: #e8c040;
}

.cell-honor {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.self-tag {
  font-size: 9px;
  color: #6a5820;
}
.honor-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(232, 192, 64, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #e8c040;
  transition: all 0.15s;
}
.honor-circle--on {
  background: rgba(232, 192, 64, 0.15);
  border-color: #e8c040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.5);
}

/* ── Continue ── */
.continue-btn {
  margin-top: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border: 2px solid #4a8a28;
  border-radius: 5px;
  color: #8ee060;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(74, 138, 40, 0.3);
  transition: all 0.15s;
}
.continue-btn:hover {
  background: linear-gradient(to bottom, #28401a, #1a2a10);
  border-color: #6ec040;
}
.continue-count {
  font-size: 11px;
  opacity: 0.6;
}
</style>
