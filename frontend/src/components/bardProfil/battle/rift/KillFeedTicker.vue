<template>
  <div class="ticker">
    <span class="ticker-label">KILL FEED</span>

    <TransitionGroup name="feed" tag="div" class="feed-items">
      <div
        v-for="entry in feedEntries"
        :key="`${entry.t}-${entry.killerName}-${entry.victimName}`"
        class="feed-item"
        :class="{ 'feed-item--multikill': entry.multikillTier }"
      >
        <img :src="battleStore.getChampionImage(entry.killerName)" :alt="entry.killerName" class="feed-img" :class="entry.killerTeam === 1 ? 'feed-img--blue' : 'feed-img--red'" />
        <span class="feed-star">★</span>
        <img :src="battleStore.getChampionImage(entry.victimName)" :alt="entry.victimName" class="feed-img feed-img--dead" :class="entry.killerTeam === 1 ? 'feed-img--red' : 'feed-img--blue'" />
        <span v-if="entry.multikillTier" class="feed-mk">{{ multikillLabel(entry.multikillTier) }}</span>
      </div>
    </TransitionGroup>

    <div class="ticker-right">
      <span class="obj-status" :class="battleStore.drakeAlive && battleStore.drakeEventTime > 0 ? 'obj-status--live' : ''">
        <img src="/img/dragon.png" alt="Drake" class="obj-img" />
        {{ drakeStatus }}
      </span>
      <span class="obj-status obj-status--baron" :class="battleStore.baronAlive && battleStore.baronEventTime > 0 ? 'obj-status--live' : ''">
        <img src="/img/baron.png" alt="Baron" class="obj-img" />
        {{ baronStatus }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { multikillLabel } from '@/utils/battleMovement'

const battleStore = useBattleStore()

const feedEntries = computed(() => battleStore.killFeed.slice(-4).reverse())

const drakeStatus = computed(() => {
  if (battleStore.drakeKilledByTeam !== null)
    return battleStore.drakeKilledByTeam === 1 ? 'Drake secured' : 'Drake lost'
  if (battleStore.drakeEventTime > 0 && battleStore.battleTime >= battleStore.drakeEventTime)
    return 'Drake up · contested'
  if (battleStore.drakeEventTime > 0)
    return `Drake ${battleStore.formatTime(Math.max(0, battleStore.drakeEventTime - battleStore.battleTime))}`
  return 'Drake —'
})

const baronStatus = computed(() => {
  if (battleStore.baronKilledByTeam !== null)
    return battleStore.baronKilledByTeam === 1 ? 'Baron secured' : 'Baron lost'
  if (battleStore.baronEventTime > 0 && battleStore.battleTime >= battleStore.baronEventTime)
    return 'Baron up!'
  if (battleStore.baronEventTime > 0)
    return `Baron ${battleStore.formatTime(Math.max(0, battleStore.baronEventTime - battleStore.battleTime))}`
  return 'Baron —'
})
</script>

<style scoped>
.ticker {
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  border-top: 2px solid #3e200a;
  background: #0d0c08;
  overflow: hidden;
}

.ticker-label {
  font-size: 10px;
  letter-spacing: 2px;
  color: #6a5820;
  flex-shrink: 0;
}

.feed-items {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.feed-item {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.feed-item--multikill {
  padding: 2px 7px;
  background: rgba(240, 104, 32, 0.12);
  border: 1px solid rgba(240, 104, 32, 0.45);
  border-radius: 4px;
}

.feed-img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}
.feed-img--blue { border: 1px solid #60a5fa; }
.feed-img--red { border: 1px solid #f87171; }
.feed-img--dead { filter: grayscale(0.6) brightness(0.75); }

.feed-star {
  font-size: 12px;
  color: #e8c040;
}

.feed-mk {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #ff9a40;
  text-shadow: 0 0 8px rgba(240, 104, 32, 0.6);
}

.ticker-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.obj-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #6ee0a0;
  white-space: nowrap;
}
.obj-status--baron { color: #c9a0f5; }
.obj-status--live {
  text-shadow: 0 0 8px currentColor;
}

.obj-img {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
}

.feed-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.feed-enter-from {
  opacity: 0;
  transform: translateX(14px);
}
.feed-leave-active {
  display: none;
}
</style>
