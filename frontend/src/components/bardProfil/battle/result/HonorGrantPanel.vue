<template>
  <div class="honor-panel">
    <!-- Header -->
    <div class="honor-head">
      <div class="head-icon-ring">
        <Icon icon="game-icons:medal" width="24" height="24" style="color: #e8c040" />
      </div>
      <div class="head-titles">
        <span class="honor-title">HONOR CEREMONY</span>
        <span class="honor-sub">The rift honors {{ HONOR_MAX_SELECTIONS }} champions for their performance</span>
      </div>
      <div class="honor-pips">
        <span
          v-for="p in HONOR_MAX_SELECTIONS"
          :key="p"
          class="pip"
          :class="{ 'pip--filled': p <= battleStore.honoredChampions.length }"
        />
      </div>
    </div>

    <div class="teams-wrap">
      <template v-for="side in sides" :key="side.key">
        <div class="section-label" :class="`section-label--${side.key}`">
          {{ side.label }}
        </div>
        <div class="rows">
          <div
            v-for="champ in side.champs"
            :key="champ.name"
            class="row"
            :class="{
              'row--enemy': side.key === 'enemy',
              'row--honored': isHonored(champ.name),
              'row--mvp': champ.name === mvpName,
            }"
            :style="honorDelayStyle(champ.name)"
          >
            <span class="cell-champ">
              <span class="portrait-wrap">
                <img :src="battleStore.getChampionImage(champ.name)" :alt="champ.name" class="portrait" />
                <span class="level-badge">{{ champ.level }}</span>
              </span>
              <span class="champ-names">
                <span class="champ-name">
                  {{ champ.name }}
                  <em v-if="champ.name === mvpName" class="mvp-tag">
                    <Icon icon="game-icons:laurels-trophy" width="11" height="11" />
                    MVP
                  </em>
                </span>
                <span class="champ-role">{{ champ.role.toUpperCase() }}</span>
              </span>
            </span>

            <span class="cell-kda">
              <span class="kda-k">{{ champ.kills }}</span><span class="kda-sep">/</span><span class="kda-d">{{ champ.deaths }}</span><span class="kda-sep">/</span><span class="kda-a">{{ champ.assists }}</span>
            </span>
            <span class="cell-stat"><em>{{ shortNum(champ.damage) }}</em>DMG</span>
            <span class="cell-stat cell-stat--gold"><em>{{ shortNum(champ.gold) }}</em>GOLD</span>

            <span class="cell-honor">
              <span
                v-if="isHonored(champ.name) && battleStore.honorTributeFor(champ.name) > 0"
                class="tribute-chip"
              >
                <img src="/img/BardAbilities/BardChime.png" alt="" class="chime-img" />
                +{{ formatTribute(battleStore.honorTributeFor(champ.name)) }}
              </span>
              <span class="medal-stamp" :class="{ 'medal-stamp--on': isHonored(champ.name) }">
                <Icon icon="game-icons:medal" width="20" height="20" />
              </span>
            </span>
          </div>
        </div>
      </template>
    </div>

    <!-- Footer: continue -->
    <div class="honor-foot">
      <button class="continue-btn" @click="battleStore.confirmHonorAndContinue()">
        <span class="continue-label">CONTINUE</span>
        <span class="continue-count">{{ battleStore.resultCountdown }}s</span>
        <span class="continue-progress" :style="{ width: countdownPercent + '%' }" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { HONOR_MAX_SELECTIONS, BATTLE_RESULT_COUNTDOWN_SECONDS } from '@/config/constants'

const battleStore = useBattleStore()

const sides = computed(() => [
  { key: 'team', label: 'YOUR TEAM', champs: battleStore.team1.filter((c) => c.name) },
  { key: 'enemy', label: 'ENEMY TEAM', champs: battleStore.team2.filter((c) => c.name) },
])
const mvpName = computed(() => battleStore.lastAutoBattleResult?.mvpName ?? '')

function isHonored(name: string): boolean {
  return battleStore.honoredChampions.includes(name)
}

/** Staggers the medal reveals in ceremony order (1st, 2nd, 3rd honor). */
function honorDelayStyle(name: string): Record<string, string> {
  const idx = battleStore.honoredChampions.indexOf(name)
  if (idx < 0) return {}
  return { '--honor-delay': `${0.5 + idx * 0.55}s` }
}

const countdownPercent = computed(() =>
  Math.max(0, Math.min(100, (battleStore.resultCountdown / BATTLE_RESULT_COUNTDOWN_SECONDS) * 100)),
)

function shortNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function formatTribute(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 10_000) return Math.round(n / 1000) + 'k'
  return n.toLocaleString('en-US')
}
</script>

<style scoped>
.honor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.6cqh, 18px);
  padding: clamp(16px, 3cqh, 34px) clamp(18px, 2.4cqw, 44px) clamp(14px, 2.4cqh, 28px);
  background: linear-gradient(160deg, rgba(20, 18, 10, 0.72), rgba(8, 8, 6, 0.55));
  border-left: 1px solid rgba(232, 192, 64, 0.22);
  min-width: 0;
  min-height: 0;
}

/* ── Header ── */
.honor-head {
  display: flex;
  align-items: center;
  gap: 13px;
  flex-shrink: 0;
}
.head-icon-ring {
  width: clamp(42px, 7cqh, 66px);
  height: clamp(42px, 7cqh, 66px);
  border-radius: 50%;
  border: 2px solid rgba(232, 192, 64, 0.55);
  background: radial-gradient(circle, rgba(232, 192, 64, 0.16), transparent 72%);
  box-shadow: 0 0 18px rgba(232, 192, 64, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.head-icon-ring :deep(svg) {
  width: 52%;
  height: 52%;
}
.head-titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.honor-title {
  font-size: clamp(19px, 3.4cqh, 34px);
  font-weight: 700;
  letter-spacing: 3.5px;
  line-height: 1;
  color: #e8c040;
  text-shadow: 0 0 20px rgba(232, 192, 64, 0.4);
}
.honor-sub {
  font-size: clamp(11px, 1.9cqh, 17px);
  color: #9a854e;
  letter-spacing: 0.4px;
}
.honor-pips {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.pip {
  width: clamp(12px, 2cqh, 18px);
  height: clamp(12px, 2cqh, 18px);
  transform: rotate(45deg);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(232, 192, 64, 0.35);
  transition: all 0.25s;
}
.pip--filled {
  background: #e8c040;
  border-color: #ffe28a;
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.8);
}

/* ── Team sections ──
   No scrolling: the two .rows blocks share the free height and every row
   flexes, so all 10 champions are always fully visible inside the stage. */
.teams-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.section-label {
  font-size: clamp(10px, 1.8cqh, 15px);
  font-weight: 700;
  letter-spacing: 2.5px;
  flex-shrink: 0;
}
.section-label--team { color: #6ec86e; }
.section-label--enemy { color: #d87868; margin-top: 5px; }

.rows {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 3px 12px;
  background: linear-gradient(150deg, rgba(96, 165, 250, 0.06), rgba(10, 14, 24, 0.4));
  border: 1px solid rgba(96, 165, 250, 0.22);
  border-radius: 9px;
  min-width: 0;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.row--enemy {
  background: linear-gradient(150deg, rgba(239, 68, 68, 0.05), rgba(24, 10, 10, 0.4));
  border-color: rgba(248, 113, 113, 0.2);
}
.row--mvp {
  border-color: rgba(232, 192, 64, 0.45);
}
.row--honored {
  border-color: #e8c040;
  background: linear-gradient(150deg, rgba(232, 192, 64, 0.13), rgba(24, 19, 6, 0.55));
  box-shadow: 0 0 16px rgba(232, 192, 64, 0.28), inset 0 0 24px rgba(232, 192, 64, 0.05);
  animation: row-glow-in 0.4s ease-out var(--honor-delay, 0s) backwards;
}
@keyframes row-glow-in {
  0% { box-shadow: none; border-color: rgba(96, 165, 250, 0.22); background: rgba(10, 14, 24, 0.4); }
}

/* ── Champion cell ── */
.cell-champ {
  display: flex;
  align-items: center;
  gap: 11px;
  width: clamp(200px, 24cqw, 340px);
  flex-shrink: 0;
  min-width: 0;
}
.portrait-wrap {
  position: relative;
  flex-shrink: 0;
}
.portrait {
  width: clamp(30px, 5.4cqh, 54px);
  height: clamp(30px, 5.4cqh, 54px);
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid rgba(96, 165, 250, 0.55);
  display: block;
  transition: border-color 0.2s;
}
.row--enemy .portrait { border-color: rgba(248, 113, 113, 0.55); }
.row--mvp .portrait,
.row--honored .portrait { border-color: #e8c040; }

.level-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: clamp(14px, 2.4cqh, 22px);
  height: clamp(14px, 2.4cqh, 22px);
  border-radius: 50%;
  background: #0d1830;
  border: 1px solid #60a5fa;
  font-size: clamp(8px, 1.4cqh, 12px);
  font-weight: 700;
  color: #cfe0ff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.row--enemy .level-badge {
  background: #300d0d;
  border-color: #f87171;
  color: #ffd0d0;
}

.champ-names {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.champ-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: clamp(14px, 2.4cqh, 22px);
  font-weight: 700;
  color: #f2ead2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
}
.row--honored .champ-name { color: #ffe28a; }
.mvp-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: clamp(9px, 1.5cqh, 13px);
  font-style: normal;
  font-weight: 700;
  letter-spacing: 1px;
  color: #1a1206;
  background: linear-gradient(to right, #d4a020, #ffe28a);
  border-radius: 4px;
  padding: 1px 6px;
}
.champ-role {
  font-size: clamp(9px, 1.5cqh, 13px);
  letter-spacing: 2px;
  color: #8a7238;
}

/* ── Stat cells ── */
.cell-kda {
  width: clamp(84px, 9cqw, 130px);
  flex-shrink: 0;
  text-align: center;
  font-size: clamp(13px, 2.2cqh, 20px);
  font-weight: 700;
}
.kda-k { color: #6ee7b7; }
.kda-d { color: #fca5a5; }
.kda-a { color: #93c5fd; }
.kda-sep { color: #55566a; font-weight: 400; padding: 0 2px; }

.cell-stat {
  width: clamp(60px, 7cqw, 104px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  font-size: clamp(8px, 1.3cqh, 11px);
  letter-spacing: 1.5px;
  color: #8a7238;
}
.cell-stat em {
  font-style: normal;
  font-size: clamp(12px, 2.1cqh, 19px);
  font-weight: 700;
  color: #e8e2d0;
  letter-spacing: 0;
}
.cell-stat--gold em { color: #e8c040; }

/* ── Honor cell ── */
.cell-honor {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  min-width: 0;
}
.tribute-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: clamp(11px, 1.9cqh, 17px);
  font-weight: 700;
  white-space: nowrap;
  color: #ffe28a;
  background: rgba(232, 192, 64, 0.13);
  border: 1px solid rgba(232, 192, 64, 0.55);
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.5);
  animation: chip-in 0.35s ease-out calc(var(--honor-delay, 0s) + 0.15s) backwards;
}
@keyframes chip-in {
  0% { opacity: 0; transform: translateX(8px); }
  100% { opacity: 1; transform: translateX(0); }
}
.chime-img {
  width: clamp(13px, 2.2cqh, 20px);
  height: clamp(13px, 2.2cqh, 20px);
  object-fit: contain;
}

.medal-stamp {
  width: clamp(28px, 4.8cqh, 46px);
  height: clamp(28px, 4.8cqh, 46px);
  border-radius: 50%;
  border: 1px solid rgba(232, 192, 64, 0.22);
  color: rgba(232, 192, 64, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.medal-stamp :deep(svg) {
  width: 62%;
  height: 62%;
}
.medal-stamp--on {
  color: #ffe28a;
  border-color: #e8c040;
  background: radial-gradient(circle, rgba(232, 192, 64, 0.25), transparent 75%);
  box-shadow: 0 0 14px rgba(232, 192, 64, 0.6);
  animation: medal-stamp-in 0.35s cubic-bezier(0.2, 1.6, 0.4, 1) var(--honor-delay, 0s) backwards;
}
@keyframes medal-stamp-in {
  0% { transform: scale(1.8) rotate(-14deg); opacity: 0; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

/* ── Footer ── */
.honor-foot {
  display: flex;
  align-items: stretch;
  gap: 13px;
  flex-shrink: 0;
}
.continue-btn {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: clamp(11px, 2.2cqh, 20px);
  font-family: inherit;
  font-size: clamp(15px, 2.6cqh, 23px);
  font-weight: 700;
  letter-spacing: 3px;
  background: linear-gradient(to bottom, #233615, #14200d);
  border: 2px solid #4a8a28;
  border-radius: 10px;
  color: #9ef070;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(74, 138, 40, 0.3);
  transition: all 0.15s;
}
.continue-btn:hover {
  background: linear-gradient(to bottom, #2c4419, #1a2a10);
  border-color: #6ec040;
  box-shadow: 0 0 26px rgba(110, 192, 64, 0.45);
}
.continue-label {
  position: relative;
  z-index: 1;
}
.continue-count {
  position: relative;
  z-index: 1;
  font-size: clamp(12px, 2cqh, 17px);
  opacity: 0.65;
  min-width: 24px;
  text-align: left;
}
.continue-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 4px;
  background: linear-gradient(to right, #4a8a28, #9ef070);
  box-shadow: 0 0 8px rgba(110, 192, 64, 0.7);
  transition: width 1s linear;
}

@media (prefers-reduced-motion: reduce) {
  .medal-stamp--on,
  .tribute-chip,
  .row--honored {
    animation: none;
  }
}
</style>
