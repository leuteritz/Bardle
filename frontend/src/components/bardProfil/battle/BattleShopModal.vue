<template>
  <Transition name="shop-slide">
    <div class="shop-panel">
      <!-- Gold top line -->
      <div class="gold-line" />

      <!-- Header -->
      <div class="shop-header">
        <span class="shop-title">⚔ BATTLE SHOP</span>
        <div class="coin-display">
          <span class="coin-icon">🪙</span>
          <span class="coin-amount">{{ battleStore.battleCoins }}</span>
        </div>
      </div>

      <!-- Active Shop: Items + Footer -->
      <template v-if="battleStore.shopPhaseActive">
        <!-- Item Grid -->
        <div class="items-grid">
          <div
            v-for="item in battleStore.activeShopItems"
            :key="item.id"
            class="item-card"
            :class="[`rarity-${item.rarity}`, { 'item-unaffordable': battleStore.battleCoins < item.cost }]"
          >
            <div class="item-rarity-badge" :class="`badge-${item.rarity}`">
              {{ item.rarity.toUpperCase() }}
            </div>
            <div class="item-name">{{ item.name }}</div>
            <div class="item-description">{{ item.description }}</div>
            <div class="item-category-badge">{{ categoryLabel(item.category) }}</div>
            <button
              class="buy-btn"
              :class="{ 'buy-btn-disabled': battleStore.battleCoins < item.cost }"
              :disabled="battleStore.battleCoins < item.cost"
              @click="purchase(item.id)"
            >
              <span class="coin-icon-small">🪙</span>
              {{ item.cost }}
            </button>
          </div>

          <!-- Placeholder cards if fewer than 3 items available -->
          <div
            v-for="n in Math.max(0, 3 - battleStore.activeShopItems.length)"
            :key="`empty-${n}`"
            class="item-card item-card-empty"
          >
            <span class="empty-label">SOLD OUT</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="shop-footer">
          <button class="reroll-btn" :disabled="!canReroll" @click="reroll">
            <span v-if="battleStore.freeRerollAvailable">🔄 REROLL (FREE)</span>
            <span v-else>🔄 REROLL (<span class="coin-icon-small">🪙</span>{{ rerollCost }})</span>
          </button>
          <button class="skip-btn" @click="skip">SKIP →</button>
        </div>
      </template>

      <!-- Battle in progress: locked state -->
      <template v-else>
        <div class="items-grid">
          <div v-for="n in 3" :key="`locked-${n}`" class="item-card item-card-locked">
            <div class="locked-icon">🔒</div>
          </div>
        </div>
        <div class="battle-status">⚔ KAMPF LÄUFT – Shop öffnet danach</div>
      </template>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'
import { REROLL_COST } from '../../../config/battleShop'

const battleStore = useBattleStore()

const rerollCost = REROLL_COST

const canReroll = computed(() => {
  return battleStore.freeRerollAvailable || battleStore.battleCoins >= REROLL_COST
})

function categoryLabel(category: string): string {
  switch (category) {
    case 'temp_buff': return '1-Battle Buff'
    case 'team_upgrade': return '3-Battle Upgrade'
    case 'permanent': return 'Permanent'
    default: return category
  }
}

function purchase(itemId: string) {
  battleStore.purchaseShopItem(itemId)
}

function reroll() {
  battleStore.rerollShop()
}

function skip() {
  battleStore.skipShop()
}
</script>

<style scoped>
/* Inline panel — no overlay, no fixed positioning */
.shop-panel {
  width: 100%;
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310;
  border-radius: 4px;
  overflow: hidden;
}

.gold-line {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

.shop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}

.shop-title {
  font-size: 13px;
  color: #e8c040;
  letter-spacing: 2px;
}

.coin-display {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #141410;
  border: 1px solid #5c3310;
  border-radius: 4px;
  padding: 3px 8px;
}

.coin-icon {
  font-size: 13px;
}

.coin-amount {
  font-size: 13px;
  color: #e8c040;
  min-width: 24px;
  text-align: right;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 8px;
}

.item-card {
  background: #1a1008;
  border: 2px solid #5c3310;
  border-radius: 4px;
  padding: 8px 7px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: border-color 0.15s;
}

.item-card.rarity-rare {
  border-color: #3b82f6;
}

.item-card.rarity-epic {
  border-color: #9333ea;
}

.item-card.item-unaffordable {
  opacity: 0.5;
  filter: grayscale(40%);
}

.item-card-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  opacity: 0.3;
}

.empty-label {
  color: #5c3310;
  font-size: 10px;
  letter-spacing: 1px;
}

.item-rarity-badge {
  font-size: 8px;
  letter-spacing: 1px;
  padding: 1px 4px;
  border-radius: 3px;
  align-self: flex-start;
  background: #141410;
  color: #5c3310;
  border: 1px solid #3e200a;
}

.badge-rare {
  color: #60a5fa;
  border-color: #3b82f6;
}

.badge-epic {
  color: #c084fc;
  border-color: #9333ea;
}

.item-name {
  font-size: 11px;
  color: #e8c040;
  line-height: 1.2;
}

.item-description {
  font-size: 10px;
  color: #a89060;
  line-height: 1.3;
  flex: 1;
}

.item-category-badge {
  font-size: 8px;
  color: #7a6030;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.buy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px 6px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #e8f8e0;
  font-size: 11px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: opacity 0.1s;
}

.buy-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.buy-btn-disabled {
  background: #2a2a1e;
  border-color: #444430;
  color: #555540;
  cursor: not-allowed;
}

.coin-icon-small {
  font-size: 11px;
}

.shop-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: #1e1006;
  border-top: 3px solid #5c3310;
  gap: 8px;
}

.reroll-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: #1c1c18;
  border: 2px solid #5c3310;
  border-radius: 4px;
  color: #c89040;
  font-size: 10px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: border-color 0.15s, opacity 0.1s;
}

.reroll-btn:hover:not(:disabled) {
  border-color: #c89040;
}

.reroll-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.skip-btn {
  padding: 5px 14px;
  background: #1c1c18;
  border: 2px solid #7a4e20;
  border-radius: 4px;
  color: #e8c040;
  font-size: 11px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: border-color 0.15s;
}

.skip-btn:hover {
  border-color: #e8c040;
}

.item-card-locked {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  opacity: 0.25;
  filter: grayscale(60%);
}

.locked-icon {
  font-size: 18px;
}

.battle-status {
  padding: 8px 12px;
  background: #1e1006;
  border-top: 3px solid #5c3310;
  text-align: center;
  font-size: 10px;
  color: #7a6030;
  letter-spacing: 1px;
}

/* Slide-up transition */
.shop-slide-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.shop-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.shop-slide-enter-from {
  opacity: 0;
  transform: translateY(100%);
}
.shop-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
