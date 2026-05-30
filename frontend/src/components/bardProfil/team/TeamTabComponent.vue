<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { getChampionRoles } from '@/config/championRoles'
import { ROLES as ROLE_DEFS, ROLE_BY_KEY } from '@/config/constants'
import { getChampionOrigin, getOriginColor } from '@/config/championOrigins'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/championTraits'
import type { ChampionRole, RoleStat } from '@/types'
import ChampionSplashPanel from './ChampionSplashPanel.vue'
import RoleSidebarComponent from './RoleSidebarComponent.vue'
import { useExpeditionStore } from '@/stores/expedetionStore'

const ROLES = ROLE_DEFS.map((r) => r.label)
const ROLE_MAP = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.key])) as Record<string, ChampionRole>
const ROLE_INDEX = Object.fromEntries(ROLE_DEFS.map((r, i) => [r.key, i])) as Partial<Record<ChampionRole, number>>
const ROLE_COLORS = Object.fromEntries(ROLE_DEFS.map((r) => [r.label, r.color]))

const battleStore = useBattleStore()
const itemStore = useItemStore()
const uiStore = useUiStore()
const expeditionStore = useExpeditionStore()

const doneExpeditionCount = computed(
  () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
)

const { headerSlots, secondarySlots } = storeToRefs(battleStore)
const availableChampions = computed(() => battleStore.ownedChampions.filter((c) => c !== 'Bard'))

const activeSlotIndex = ref(uiStore.rolesActiveSlot)

// Trigger tokens for ChampionSplashPanel external open/close
const openPickerToken  = ref(0)
const openPickerSubSlot = ref(-1)
const closeToken       = ref(0)

watch(
  () => uiStore.rolesActiveSlot,
  (val) => {
    activeSlotIndex.value = val
    closeToken.value++
  },
)

watch(
  () => uiStore.rolesOpenToken,
  () => {
    activeSlotIndex.value = uiStore.rolesActiveSlot
    if (uiStore.rolesActiveSubSlot >= 0) {
      openPickerSubSlot.value = uiStore.rolesActiveSubSlot
      openPickerToken.value++
    } else {
      closeToken.value++
    }
  },
)

const activeRole = computed(() => ROLES[activeSlotIndex.value])
const activeRoleKey = computed(() => ROLE_MAP[activeRole.value])
const activeRoleDef = computed(() => ROLE_BY_KEY[activeRoleKey.value])
const currentEquipment = computed(() => itemStore.slotEquipment[activeSlotIndex.value])
const activeChampion = computed(() => headerSlots.value[activeSlotIndex.value])
const activeSecondaries = computed(
  () => secondarySlots.value[activeSlotIndex.value] ?? [null, null],
)

const roleFilteredChampions = computed(() => {
  const internalRole = ROLE_MAP[activeRole.value]
  if (!internalRole) return availableChampions.value
  return availableChampions.value.filter((c) => getChampionRoles(c).includes(internalRole))
})

const splashImageUrl = computed(() =>
  activeChampion.value ? battleStore.getChampionImage(activeChampion.value) : '',
)
const championTraits = computed(() =>
  (CHAMPION_TRAITS[activeChampion.value ?? ''] ?? []).map((id) => TRAIT_BY_ID[id]),
)
const originComputed = computed(() => getChampionOrigin(activeChampion.value ?? '') ?? null)
const originColorComputed = computed(() => getOriginColor(activeChampion.value ?? ''))
const abilityCompact = computed(() => activeRoleDef.value?.abilityCompact ?? '')
const abilityDetails = computed(() => activeRoleDef.value?.abilityDetails ?? [])

const activeRoleStats = computed<RoleStat[]>(() => {
  return activeRoleKey.value ? ((ROLE_BY_KEY[activeRoleKey.value]?.stats as RoleStat[]) ?? []) : []
})

function selectSlot(index: number) {
  closeToken.value++
  activeSlotIndex.value = index
}

function handleSelect(champion: string, subSlot: number) {
  if (subSlot === -1) {
    battleStore.setHeaderSlot(activeSlotIndex.value, champion)
  } else {
    battleStore.setSecondarySlot(activeSlotIndex.value, subSlot, champion)
  }
}

function clearSecondary(roleIndex: number, subIndex: number, _event: Event) {
  battleStore.clearSecondarySlot(roleIndex, subIndex)
}

function handleShopRoleChange(role: ChampionRole | 'all') {
  if (role !== 'all') {
    const idx = ROLE_INDEX[role]
    if (idx !== undefined) activeSlotIndex.value = idx
  }
}
</script>

<template>
  <div class="roles-tab">
    <div class="main-layout">
      <!-- ══ LEFT — Splash Area ══ -->
      <ChampionSplashPanel
        :active-champion="activeChampion"
        :splash-image-url="splashImageUrl"
        :active-role="activeRole"
        :role-key="activeRoleKey"
        :role-color="ROLE_COLORS[activeRole]"
        :role-image="activeRoleDef?.image ?? ''"
        :ability-compact="abilityCompact"
        :ability-details="abilityDetails"
        :role-stats="activeRoleStats"
        :champion-traits="championTraits"
        :origin="originComputed"
        :origin-color="originColorComputed"
        :active-secondaries="activeSecondaries"
        :active-slot-index="activeSlotIndex"
        :current-equipment="currentEquipment"
        :header-slots="headerSlots"
        :secondary-slots="secondarySlots"
        :role-filtered-champions="roleFilteredChampions"
        :done-expedition-count="doneExpeditionCount"
        :open-picker-token="openPickerToken"
        :open-picker-sub-slot="openPickerSubSlot"
        :close-token="closeToken"
        @select-champion="handleSelect"
        @clear-secondary="clearSecondary"
        @shop-role-change="handleShopRoleChange"
      />

      <!-- ══ RIGHT — Sidebar ══ -->
      <RoleSidebarComponent
        :active-slot-index="activeSlotIndex"
        @select-slot="selectSlot"
      />
    </div>
  </div>
</template>

<style scoped>
.roles-tab {
  --gold: #c89040;
  --gold-bright: #e8c060;
  --gold-dim: rgba(200, 144, 64, 0.32);
  --gold-glow: rgba(200, 144, 64, 0.2);
  --bg: #0d0a03;
  --bg-card: #181208;
  --border: rgba(92, 51, 16, 0.45);
  --r: 5px;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  overflow: hidden;
}
.main-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 65fr 35fr;
  gap: 0;
}
</style>
