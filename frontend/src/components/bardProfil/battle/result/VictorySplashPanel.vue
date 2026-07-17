<template>
  <div class="splash" :class="won ? 'splash--win' : 'splash--loss'">
    <div class="splash-rays" :class="won ? 'rays--win' : 'rays--loss'" />

    <div class="crest-wrap" :class="won ? 'crest--win' : 'crest--loss'">
      <div class="crest-dashes" />
      <img src="/img/menu/BATTLE.png" alt="Battle" class="crest-img" />
    </div>

    <div class="verdict" :class="won ? 'verdict--win' : 'verdict--loss'">
      {{ won ? 'VICTORY' : 'DEFEAT' }}
    </div>

    <div class="lp-block">
      <div class="lp-change" :class="won ? 'lp--win' : 'lp--loss'">
        {{ lpChange >= 0 ? '+' : '' }}{{ lpChange }}
      </div>
      <div class="lp-sub">LEAGUE POINTS</div>
    </div>

    <div class="lp-progress">
      <div class="lp-progress-head">
        <span>{{ rankLabel }}</span>
        <span>{{ battleStore.currentRank.lp }} / {{ promotionCap }} LP</span>
      </div>
      <div class="lp-track">
        <div class="lp-fill" :style="{ width: lpPercent + '%' }" />
      </div>
      <div v-if="promoHint" class="promo-hint">▲ {{ promoHint }}</div>
    </div>

    <div
      v-if="honorTribute > 0"
      class="honor-tribute"
      :style="{ '--ceremony-delay': ceremonyDelay }"
    >
      <div class="tribute-row">
        <img src="/img/BardAbilities/BardChime.png" alt="" class="tribute-chime-img" />
        <span class="tribute-amount">+{{ formatNumber(honorTribute) }}</span>
      </div>
      <div class="tribute-sub">CHIMES · HONOR TRIBUTE</div>
    </div>

    <div v-if="baronBounty > 0" class="baron-bounty">
      <img src="/img/baron.png" alt="Baron" class="bounty-img" />
      <span class="bounty-text">HAND OF BARON · +{{ baronBounty.toLocaleString('en-US') }} CHIMES</span>
    </div>

    <div class="meta-row">
      <div class="meta-item">
        <div class="meta-value">{{ durationStr }}</div>
        <div class="meta-label">DURATION</div>
      </div>
      <div class="meta-item">
        <div class="meta-value meta-value--kills">{{ teamKills }} – {{ enemyKills }}</div>
        <div class="meta-label">TEAM KILLS</div>
      </div>
      <div class="meta-item">
        <div class="meta-value meta-value--mvp">{{ mvpName || '—' }}</div>
        <div class="meta-label">MVP</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { formatNumber } from '@/config/numberFormat'
import {
  LP_NORMAL_PROMOTION_THRESHOLD,
  LP_MASTER_PROMOTION_THRESHOLD,
  LP_GRANDMASTER_PROMOTION_THRESHOLD,
} from '@/config/constants'

const battleStore = useBattleStore()

const won = computed(() => battleStore.lastAutoBattleResult?.won ?? false)
const lpChange = computed(() => battleStore.lastAutoBattleResult?.lpChange ?? battleStore.lastLpChange)
const teamKills = computed(() => battleStore.lastAutoBattleResult?.teamKills ?? battleStore.team1Kills)
const enemyKills = computed(() => battleStore.lastAutoBattleResult?.enemyKills ?? battleStore.team2Kills)
const mvpName = computed(() => battleStore.lastAutoBattleResult?.mvpName ?? '')
const baronBounty = computed(() => battleStore.lastAutoBattleResult?.baronBounty ?? 0)
const honorTribute = computed(() => battleStore.lastAutoBattleResult?.honorTribute ?? 0)

/** The tribute reveals right after the last medal has been stamped in the honor panel. */
const ceremonyDelay = computed(
  () => `${(0.5 + battleStore.honoredChampions.length * 0.55 + 0.2).toFixed(2)}s`,
)

const durationStr = computed(() => {
  const d = battleStore.lastAutoBattleResult?.duration ?? battleStore.battleTime
  return battleStore.formatTime(d)
})

const isHighTier = computed(() =>
  ['Master', 'Grandmaster', 'Challenger'].includes(battleStore.currentRank.tier),
)
const rankLabel = computed(() =>
  isHighTier.value
    ? battleStore.currentRank.tier.toUpperCase()
    : `${battleStore.currentRank.tier.toUpperCase()} ${battleStore.currentRank.division}`,
)

const promotionCap = computed(() => {
  const tier = battleStore.currentRank.tier
  if (tier === 'Master') return LP_MASTER_PROMOTION_THRESHOLD
  if (tier === 'Grandmaster') return LP_GRANDMASTER_PROMOTION_THRESHOLD
  return LP_NORMAL_PROMOTION_THRESHOLD
})

const lpPercent = computed(() =>
  Math.min(100, Math.max(0, (battleStore.currentRank.lp / promotionCap.value) * 100)),
)

const promoHint = computed(() => {
  if (battleStore.currentRank.tier === 'Challenger') return ''
  if (lpPercent.value >= 80) return 'Promotion within reach'
  return ''
})
</script>

<style scoped>
.splash {
  width: 380px;
  flex-shrink: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 30px;
  overflow: hidden;
  animation: victory-in 0.5s ease-out;
}

.splash-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 620px;
  height: 620px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: ray-spin 24s linear infinite;
}
.rays--win {
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(82, 184, 48, 0.13) 12deg,
    transparent 24deg,
    transparent 60deg,
    rgba(232, 192, 64, 0.08) 72deg,
    transparent 84deg
  );
}
.rays--loss {
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(204, 96, 80, 0.1) 12deg,
    transparent 24deg,
    transparent 60deg,
    rgba(120, 60, 60, 0.08) 72deg,
    transparent 84deg
  );
}

/* ── Crest ── */
.crest-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.crest--win {
  background: radial-gradient(circle, rgba(82, 184, 48, 0.3), transparent 70%);
  border: 2px solid #52b830;
  box-shadow: 0 0 30px rgba(82, 184, 48, 0.5);
}
.crest--loss {
  background: radial-gradient(circle, rgba(204, 96, 80, 0.25), transparent 70%);
  border: 2px solid #cc6050;
  box-shadow: 0 0 30px rgba(204, 96, 80, 0.4);
}

.crest-dashes {
  position: absolute;
  inset: -7px;
  border-radius: 50%;
  border: 1px dashed rgba(232, 192, 64, 0.4);
  animation: ray-spin 18s linear infinite;
}

.crest-img {
  width: 52px;
  height: 52px;
  object-fit: contain;
}
.crest--win .crest-img {
  filter: drop-shadow(0 0 10px rgba(82, 184, 48, 0.6));
}
.crest--loss .crest-img {
  filter: drop-shadow(0 0 10px rgba(204, 96, 80, 0.5)) grayscale(0.3);
}

/* ── Verdict ── */
.verdict {
  font-size: 44px;
  font-weight: 700;
  letter-spacing: 6px;
  line-height: 1;
}
.verdict--win {
  color: #6ee060;
  text-shadow: 0 0 28px rgba(82, 184, 48, 0.6);
}
.verdict--loss {
  color: #e07060;
  text-shadow: 0 0 28px rgba(204, 96, 80, 0.55);
}

/* ── LP ── */
.lp-block {
  text-align: center;
}
.lp-change {
  font-size: 52px;
  font-weight: 700;
  line-height: 1;
}
.lp--win {
  color: #52b830;
  text-shadow: 0 0 24px rgba(82, 184, 48, 0.55);
}
.lp--loss {
  color: #cc6050;
  text-shadow: 0 0 24px rgba(204, 96, 80, 0.5);
}
.lp-sub {
  font-size: 12px;
  letter-spacing: 3px;
  color: #6a8a50;
  margin-top: 4px;
}
.splash--loss .lp-sub { color: #8a5a50; }

/* ── LP progress ── */
.lp-progress {
  width: 82%;
}
.lp-progress-head {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #6a5820;
  margin-bottom: 5px;
}
.lp-track {
  height: 9px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}
.lp-fill {
  height: 100%;
  background: linear-gradient(to right, #2a7a50, #3cbc78);
  box-shadow: 0 0 10px #3cbc78;
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.promo-hint {
  font-size: 12px;
  color: #3cbc78;
  margin-top: 7px;
  text-align: center;
}

/* ── Honor tribute (chimes earned by the ceremony) ── */
.honor-tribute {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 26px;
  background: rgba(232, 192, 64, 0.07);
  border: 1px solid rgba(232, 192, 64, 0.4);
  border-radius: 10px;
  box-shadow: 0 0 18px rgba(232, 192, 64, 0.18);
  animation: tribute-reveal 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) var(--ceremony-delay, 0s) backwards;
}
.tribute-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tribute-chime-img {
  width: 34px;
  height: 34px;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(232, 192, 64, 0.6));
}
.tribute-amount {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  color: #ffe28a;
  text-shadow: 0 0 22px rgba(232, 192, 64, 0.55);
}
.tribute-sub {
  font-size: 11px;
  letter-spacing: 2.5px;
  color: #9a854e;
}
@keyframes tribute-reveal {
  0% { opacity: 0; transform: scale(0.7); }
  100% { opacity: 1; transform: scale(1); }
}

/* ── Hand of Baron bounty ── */
.baron-bounty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid #5c2a90;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.35);
}
.bounty-img {
  width: 26px;
  height: auto;
  display: block;
  filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.6));
}
.bounty-text {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #c9a0f5;
  text-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
  white-space: nowrap;
}

/* ── Meta row ── */
.meta-row {
  display: flex;
  gap: 22px;
  margin-top: 4px;
}
.meta-item {
  text-align: center;
}
.meta-value {
  font-size: 18px;
  font-weight: 700;
  color: #e8e2d0;
}
.meta-value--kills { color: #93c5fd; }
.meta-value--mvp { color: #e8c040; }
.meta-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: #6a5820;
  margin-top: 2px;
}

@keyframes victory-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes ray-spin {
  0% { transform: translate(-50%, -50%) rotate(0); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

.crest-dashes {
  animation-name: dash-spin;
}
@keyframes dash-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .splash-rays, .crest-dashes, .honor-tribute { animation: none; }
}
</style>
