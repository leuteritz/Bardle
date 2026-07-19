<script setup lang="ts">
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useUiStore } from '@/stores/uiStore'
import { CHAMPION_ROLES } from '@/config/championRoles'
import { CHAMP_TOOLTIP_MAX_VISIBLE, ROLE_BY_KEY } from '@/config/constants'
import type { ChampionRole } from '@/types'

/* Tooltip body for every "new champions" notify badge: lists the newly
   unlocked champions; clicking one deep-links into the Champion Shop. */
const emit = defineEmits<{ picked: [] }>()

const battleStore = useBattleStore()
const uiStore = useUiStore()

const list = computed(() => battleStore.newlyUnlockedChampions.slice(0, CHAMP_TOOLTIP_MAX_VISIBLE))
const extra = computed(() =>
  Math.max(0, battleStore.newlyUnlockedChampions.length - CHAMP_TOOLTIP_MAX_VISIBLE),
)

/* Game-wide role palette (ROLE_BY_KEY) — same colors as orbit, shop & roster. */
function roleOf(name: string) {
  return ROLE_BY_KEY[(CHAMPION_ROLES[name] ?? 'mid') as ChampionRole]
}

function pick(name: string) {
  uiStore.requestOpenTeamTabWithSearch(name)
  emit('picked')
}
</script>

<template>
  <div class="nc-tt">
    <div class="nc-tt__title">New Champions</div>
    <ul class="nc-tt__list">
      <li v-for="name in list" :key="name" class="nc-tt__item" @click.stop="pick(name)">
        <img :src="battleStore.getChampionImage(name)" class="nc-tt__img" :alt="name" />
        <span class="nc-tt__name" :style="{ color: roleOf(name).color }">{{ name }}</span>
        <span
          class="nc-tt__role"
          :style="{
            color: roleOf(name).color,
            borderColor: roleOf(name).color,
          }"
        >{{ roleOf(name).short }}</span>
      </li>
      <li v-if="extra > 0" class="nc-tt__item nc-tt__item--more">
        <span class="nc-tt__more-dots">…</span>
        <span class="nc-tt__more-count">+{{ extra }} more</span>
      </li>
    </ul>
    <div class="nc-tt__hint">Click a champion to open the shop</div>
  </div>
</template>

<style scoped>
.nc-tt {
  padding: 8px 0 7px;
  min-width: 240px;
}

.nc-tt__title {
  padding: 0 12px 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  border-bottom: 1px solid #3e200a;
}

.nc-tt__list {
  list-style: none;
  margin: 0;
  padding: 4px 0 2px;
}

.nc-tt__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.12s;
}

.nc-tt__item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.nc-tt__img {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  object-position: top;
  flex-shrink: 0;
  display: block;
}

.nc-tt__name {
  font-size: 1rem;
  font-weight: 700;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nc-tt__role {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  padding: 3px 5px;
  border: 1px solid;
  border-radius: 3px;
  opacity: 0.85;
}

.nc-tt__item--more {
  cursor: default;
  gap: 6px;
  padding: 5px 12px 6px;
  border-top: 1px solid #3e200a;
}

.nc-tt__item--more:hover {
  background: none;
}

.nc-tt__more-dots {
  font-size: 0.875rem;
  color: rgba(200, 200, 220, 0.35);
  font-style: italic;
}

.nc-tt__more-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(200, 200, 220, 0.45);
  letter-spacing: 0.03em;
}

.nc-tt__hint {
  padding: 5px 12px 0;
  border-top: 1px solid #3e200a;
  font-size: 0.72rem;
  color: rgba(200, 200, 220, 0.45);
  letter-spacing: 0.03em;
}
</style>
