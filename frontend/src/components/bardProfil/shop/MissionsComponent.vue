<template>
  <div class="missions-wrapper">
    <!-- ── Mission List ── -->
    <div class="mission-list">
      <div
        v-for="item in missionItems"
        :key="item.id"
        class="mission-row"
        :class="{
          'mission-row--claimed': item.claimed,
          'mission-row--ready': item.isCompleted && !item.claimed,
        }"
      >
        <!-- Icon -->
        <div class="mission-icon-box">
          <span class="mission-icon-emoji">{{ item.icon }}</span>
          <span v-if="item.claimed" class="mission-check-badge">✓</span>
        </div>

        <!-- Info -->
        <div class="mission-info">
          <div class="mission-name-row">
            <span class="mission-name">{{ item.name }}</span>
            <span class="mission-reward-hint">
              → {{ item.rewardUpgrade.icon }} {{ item.rewardUpgrade.name }}
            </span>
          </div>
          <div class="mission-desc">{{ item.description }}</div>

          <!-- Progress Bar -->
          <div v-if="!item.claimed" class="mission-progress-track">
            <div
              class="mission-progress-fill"
              :class="{ 'mission-progress-fill--done': item.isCompleted }"
              :style="{ width: Math.floor(item.progress * 100) + '%' }"
            />
            <span class="mission-progress-label">
              {{ formatNumber(item.currentValue) }} /
              {{ formatNumber(item.condition.target) }}
            </span>
          </div>
        </div>

        <!-- Claim Button / Done Badge -->
        <button
          v-if="!item.claimed"
          class="mission-claim-btn"
          :class="item.isCompleted ? 'mission-claim-btn--ready' : 'mission-claim-btn--locked'"
          :style="!item.isCompleted ? { '--prog': Math.floor(item.progress * 100) + '%' } : {}"
          :disabled="!item.isCompleted"
          @click="missionStore.claimReward(item.id)"
        >
          <span v-if="item.isCompleted" class="claim-label">🎁 Claim!</span>
          <span v-else class="claim-pct">{{ Math.floor(item.progress * 100) }}%</span>
        </button>

        <div v-else class="mission-done-badge">✓ Fertig</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useMissionStore } from '@/stores/missionStore'
import { useGameStore } from '@/stores/gameStore'
import { useShopStore } from '@/stores/shopStore'
import { formatNumber } from '@/config/numberFormat'
import type { Mission } from '@/types'

export default defineComponent({
  name: 'MissionsComponent',
  setup() {
    const missionStore = useMissionStore()
    const gameStore = useGameStore()
    const shopStore = useShopStore()

    const getCurrentValue = (mission: Mission): number => {
      const { type, buildingId } = mission.condition
      switch (type) {
        case 'totalChimes':
          return gameStore.totalChimesEarned ?? gameStore.chimes
        case 'totalClicks':
          return gameStore.totalClicks ?? 0
        case 'singleBuildingLevel':
          if (buildingId) {
            return shopStore.shopUpgrades.find((u) => u.id === buildingId)?.level ?? 0
          }
          // Kein buildingId → höchste Einzelstufe irgendeines Gebäudes
          return Math.max(0, ...shopStore.shopUpgrades.map((u) => u.level))
        case 'totalBuildingLevels':
          return shopStore.shopUpgrades.reduce((s, u) => s + u.level, 0)
        case 'ownedBuildingTypes':
          return shopStore.shopUpgrades.filter((u) => u.level > 0).length
        case 'permanentUpgradeCount':
          return shopStore.permanentUpgrades.filter((u) => u.purchased).length
        default:
          return 0
      }
    }

    const missionItems = computed(() =>
      missionStore.missions.map((m) => {
        const currentValue = getCurrentValue(m)
        const progress = Math.min(currentValue / m.condition.target, 1)
        return { ...m, currentValue, progress, isCompleted: progress >= 1 }
      }),
    )

    const claimedCount = computed(() => missionItems.value.filter((m) => m.claimed).length)

    return { missionStore, missionItems, claimedCount, formatNumber }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   MISSIONS WRAPPER
   ═══════════════════════════════════════════ */
.missions-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #111008;
}

/* ── Header ── */
.missions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #1e1006;
  border-bottom: 2px solid #5c3310;
  flex-shrink: 0;
}

.missions-title {
  font-size: 12px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.8px;
  text-shadow: 0 0 6px rgba(230, 190, 40, 0.35);
}

.missions-count {
  font-size: 11px;
  font-weight: 700;
  color: #666;
}

/* ── List ── */
.mission-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.mission-list::-webkit-scrollbar {
  width: 6px;
}
.mission-list::-webkit-scrollbar-track {
  background: #111;
}
.mission-list::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 3px;
}

/* ── Mission Row ── */
.mission-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #222;
  min-height: 68px;
  background: #141410;
  transition: background 0.1s;
}

.mission-row--ready {
  background: #181a10;
  animation: row-pulse 2.5s ease-in-out infinite;
}

@keyframes row-pulse {
  0%,
  100% {
    background: #181a10;
  }
  50% {
    background: #1e2214;
  }
}

.mission-row--claimed {
  background: #111108;
  opacity: 0.55;
}

/* ── Icon Box ── */
.mission-icon-box {
  width: 60px;
  min-width: 60px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border-right: 1px solid #2a2a2a;
  flex-shrink: 0;
  position: relative;
}

.mission-icon-emoji {
  font-size: 28px;
}

.mission-check-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 10px;
  font-weight: 900;
  color: #52b830;
  background: #0e1a0a;
  border: 1px solid #52b830;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Info ── */
.mission-info {
  flex: 1;
  padding: 7px 10px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mission-name-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.mission-name {
  font-size: 13px;
  font-weight: 900;
  color: #e0d0a0;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.mission-reward-hint {
  font-size: 10px;
  font-weight: 700;
  color: #6a6a50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mission-desc {
  font-size: 10px;
  color: #666;
  line-height: 1.35;
}

/* ── Progress Track ── */
.mission-progress-track {
  position: relative;
  height: 12px;
  background: #1a1a18;
  border: 1px solid #333;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
}

.mission-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(to right, #7a1610, #b02018 70%, #cc2820);
  transition: width 0.4s ease;
}

.mission-progress-fill--done {
  background: linear-gradient(to right, #2d6018, #52b830);
}

.mission-progress-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

/* ── Claim Button ── */
.mission-claim-btn {
  flex-shrink: 0;
  width: 80px;
  min-height: 48px;
  margin: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  padding: 5px 4px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.15s ease;
}

.mission-claim-btn--ready {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #70d040;
  color: #fff;
  box-shadow:
    0 3px 8px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 0 14px rgba(80, 200, 40, 0.4);
  animation: claim-glow 1.8s ease-in-out infinite;
}

@keyframes claim-glow {
  0%,
  100% {
    box-shadow:
      0 3px 8px rgba(0, 0, 0, 0.5),
      0 0 8px rgba(80, 200, 40, 0.3);
  }
  50% {
    box-shadow:
      0 3px 8px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(80, 200, 40, 0.65);
  }
}

.mission-claim-btn--ready:hover {
  background: linear-gradient(to bottom, #60d038, #388e22);
}

.mission-claim-btn--ready:active {
  transform: scale(0.95);
}

.mission-claim-btn--locked {
  background-color: #1a1008;
  background-image: linear-gradient(to right, #4a2808 0%, #7a4010 70%, #8a5018 100%);
  background-size: var(--prog, 0%) 100%;
  background-repeat: no-repeat;
  background-position: left center;
  border: 1px solid #3a2008;
  color: #886644;
  cursor: not-allowed;
}

.claim-label {
  font-size: 12px;
  font-weight: 900;
  text-align: center;
  line-height: 1.3;
}

.claim-pct {
  font-size: 14px;
  font-weight: 900;
}

/* ── Done Badge ── */
.mission-done-badge {
  flex-shrink: 0;
  width: 80px;
  margin: 8px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  color: #52b830;
  border: 1px solid #1e4012;
  border-radius: 5px;
  background: #0e1a0a;
  letter-spacing: 0.5px;
}
</style>
