<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/expeditionStore'
import { useActionToast } from '@/composables/useActionToast'

/* Tooltip body for every expedition notify badge: lists the resolved
   expeditions (success/failure) waiting to be collected and lets the player
   collect them all right from the tooltip (same store logic as the modal's
   "Collect All" button). */
const emit = defineEmits<{ collected: [] }>()

const expeditionStore = useExpeditionStore()
const { showToast } = useActionToast()

const readyExpeditions = computed(() =>
  expeditionStore.activeExpeditions.filter((e) => e.status !== 'active'),
)

function collectAll() {
  const ready = [...readyExpeditions.value]
  if (ready.length === 0) return
  for (const exp of ready) expeditionStore.collectExpedition(exp.id)
  showToast('Expedition rewards collected!')
  emit('collected')
}
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
    <button class="ex-tt__collect" @click.stop="collectAll">
      Collect
      <span class="ex-tt__collect-count">{{ readyExpeditions.length }}</span>
    </button>
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

.ex-tt__collect {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: calc(100% - 24px);
  margin: 6px 12px 3px;
  padding: 6px 10px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition:
    filter 0.12s,
    transform 0.12s;
}

.ex-tt__collect:hover {
  filter: brightness(1.12);
}

.ex-tt__collect:active {
  transform: scale(0.97);
}

.ex-tt__collect-count {
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 0.68rem;
  font-weight: 900;
  line-height: 1;
}
</style>
