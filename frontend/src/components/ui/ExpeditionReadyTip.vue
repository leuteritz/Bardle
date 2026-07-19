<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/expeditionStore'

/* Tooltip body for every expedition notify badge: lists the resolved
   expeditions (success/failure) that are waiting to be collected. */
const expeditionStore = useExpeditionStore()

const readyExpeditions = computed(() =>
  expeditionStore.activeExpeditions.filter((e) => e.status !== 'active'),
)
</script>

<template>
  <div class="ex-tt">
    <div class="ex-tt__title">Expeditions Ready</div>
    <ul class="ex-tt__list">
      <li v-for="exp in readyExpeditions" :key="exp.id" class="ex-tt__item">
        <Icon
          :icon="exp.icon || 'game-icons:rolled-cloth'"
          width="24"
          height="24"
          class="ex-tt__ico"
        />
        <span class="ex-tt__name">{{ exp.name }}</span>
        <span
          class="ex-tt__status"
          :class="exp.status === 'success' ? 'ex-tt__status--ok' : 'ex-tt__status--fail'"
        >
          {{ exp.status === 'success' ? 'Success' : 'Failed' }}
        </span>
      </li>
    </ul>
    <div class="ex-tt__hint">Collect rewards in Team → Expeditions</div>
  </div>
</template>

<style scoped>
.ex-tt {
  padding: 8px 0 7px;
}

.ex-tt__title {
  padding: 0 12px 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  border-bottom: 1px solid #3e200a;
}

.ex-tt__list {
  list-style: none;
  margin: 0;
  padding: 4px 0 2px;
}

.ex-tt__item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 12px;
}

.ex-tt__ico {
  flex-shrink: 0;
  color: #c9a0ff;
}

.ex-tt__name {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #e8e0cc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ex-tt__status {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
}

.ex-tt__status--ok {
  color: #6ec040;
  background: rgba(82, 184, 48, 0.12);
  border: 1px solid rgba(110, 192, 64, 0.4);
}

.ex-tt__status--fail {
  color: #cc6050;
  background: rgba(204, 96, 80, 0.1);
  border: 1px solid rgba(204, 96, 80, 0.4);
}

.ex-tt__hint {
  padding: 5px 12px 0;
  border-top: 1px solid #3e200a;
  font-size: 0.72rem;
  color: rgba(200, 200, 220, 0.45);
  letter-spacing: 0.03em;
}
</style>
