<script setup lang="ts">
import { computed } from 'vue'
import { useMeepTreeStore } from '@/stores/meepTreeStore'
import { useGameStore } from '@/stores/gameStore'

/* Tooltip body for the Skill-Tree notify badge: shown while at least one
   meep tree node is affordable (prerequisite met + enough Meeps). */
const meepTree = useMeepTreeStore()
const gameStore = useGameStore()

const count = computed(() => meepTree.buyableNodeCount)
</script>

<template>
  <div class="sk-tt">
    <div class="sk-tt__title">Skill Ready</div>
    <div class="sk-tt__body">
      <img src="/img/BardAbilities/BardMeep-64.png" class="sk-tt__icon" alt="" aria-hidden="true" />
      <div class="sk-tt__lines">
        <span class="sk-tt__next">
          <strong>{{ count }}</strong> skill{{ count === 1 ? '' : 's' }} ready to learn
        </span>
        <span class="sk-tt__meeps">{{ $formatNumber(gameStore.meeps) }} Meeps available</span>
      </div>
    </div>
    <div class="sk-tt__hint">Open the Skill Tree to learn</div>
  </div>
</template>

<style scoped>
.sk-tt {
  padding: 8px 0 7px;
}

.sk-tt__title {
  padding: 0 12px 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ec4899;
  border-bottom: 1px solid #3e200a;
}

.sk-tt__body {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}

.sk-tt__icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 0 6px rgba(236, 72, 153, 0.55));
}

.sk-tt__lines {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sk-tt__next {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e8e0cc;
}

.sk-tt__next strong {
  color: #f9a8d4;
}

.sk-tt__meeps {
  font-size: 0.75rem;
  font-weight: 600;
  color: #e8c040;
}

.sk-tt__hint {
  padding: 5px 12px 0;
  border-top: 1px solid #3e200a;
  font-size: 0.72rem;
  color: rgba(200, 200, 220, 0.45);
  letter-spacing: 0.03em;
}
</style>
