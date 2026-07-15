<template>
  <div class="mk-strip">
    <div class="mk-seg">
      <span class="mk-value mk-value--double">{{ $formatNumber(multikills.double) }}</span>
      <span class="mk-label mk-label--double">DOUBLE</span>
    </div>
    <div class="mk-sep" />
    <div class="mk-seg">
      <span class="mk-value mk-value--triple">{{ $formatNumber(multikills.triple) }}</span>
      <span class="mk-label mk-label--triple">TRIPLE</span>
    </div>
    <div class="mk-sep" />
    <div class="mk-seg">
      <span class="mk-value mk-value--quadra">{{ $formatNumber(multikills.quadra) }}</span>
      <span class="mk-label mk-label--quadra">QUADRA</span>
    </div>
    <div class="mk-sep" />
    <div class="mk-seg">
      <span class="mk-value mk-value--penta">{{ $formatNumber(multikills.penta) }}</span>
      <span class="mk-label mk-label--penta">PENTA</span>
    </div>
    <div class="mk-sep" />
    <div class="mk-seg">
      <Icon icon="game-icons:laurels-trophy" width="15" height="15" class="mk-mvp-icon" />
      <span class="mk-value mk-value--mvp">{{ $formatNumber(allTime.mvpAwards) }}</span>
      <span class="mk-label mk-label--mvp">MVP AWARDS</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'

const battleStore = useBattleStore()
const { allTime } = storeToRefs(battleStore)

// Career multikills plus the running battle's (live delta zeroes on finalize)
const multikills = computed(() => ({
  double: allTime.value.multikills.double + battleStore.liveBattleStats.multikills.double,
  triple: allTime.value.multikills.triple + battleStore.liveBattleStats.multikills.triple,
  quadra: allTime.value.multikills.quadra + battleStore.liveBattleStats.multikills.quadra,
  penta: allTime.value.multikills.penta + battleStore.liveBattleStats.multikills.penta,
}))
</script>

<style scoped>
.mk-strip {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: clamp(8px, 1vw, 18px);
  flex-shrink: 0;
  padding: clamp(5px, 0.8vh, 8px) clamp(10px, 1vw, 18px);
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(212, 160, 32, 0.12);
  border-radius: 5px;
}

.mk-seg {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.mk-sep {
  align-self: stretch;
  width: 1px;
  margin: 2px 0;
  background: rgba(212, 160, 32, 0.12);
  flex-shrink: 0;
}

.mk-value {
  font-size: clamp(14px, 1.9vh, 18px);
  font-weight: 700;
  line-height: 1;
}
.mk-value--double { color: #93c5fd; }
.mk-value--triple { color: #7ce0a0; }
.mk-value--quadra { color: #e8c040; }
.mk-value--penta {
  color: #ff9a40;
  text-shadow: 0 0 12px rgba(240, 104, 32, 0.6);
}
.mk-value--mvp { color: #e8c040; }

.mk-label {
  font-size: clamp(8px, 1vh, 10px);
  letter-spacing: 1px;
  white-space: nowrap;
}
.mk-label--double { color: #6a7fb0; }
.mk-label--triple { color: #6aa080; }
.mk-label--quadra { color: #8a7040; }
.mk-label--penta { color: #c88040; }
.mk-label--mvp { color: #8a7040; }

.mk-mvp-icon {
  color: #e8c040;
  align-self: center;
  flex-shrink: 0;
}
</style>
