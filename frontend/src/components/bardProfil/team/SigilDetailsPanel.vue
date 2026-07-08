<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { useItemStore } from '@/stores/itemStore'
import { ROLES, ALLIES_PER_ROLE, TEAM_SIGIL_DETAILS_PANEL_WIDTH } from '@/config/constants'
import { getChampionTier } from '@/config/championTiers'
import { getChampionOrigin, getOriginColor, ORIGIN_SYNERGIES } from '@/config/championOrigins'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/championTraits'
import { SHOP_ITEMS } from '@/config/items'
import type { ItemCategory, ShopItem } from '@/types'

const props = defineProps<{
  roleIndex: number
}>()

const emit = defineEmits<{
  close: []
  swap: []
  'pick-ally': [subSlot: number]
  'clear-ally': [subSlot: number]
  'pick-equipment': [category: ItemCategory]
}>()

const panelWidthPx = `${TEAM_SIGIL_DETAILS_PANEL_WIDTH}px`

const battleStore = useBattleStore()
const itemStore = useItemStore()

const { headerSlots, secondarySlots } = storeToRefs(battleStore)

const roleDef = computed(() => ROLES[props.roleIndex])
const main = computed(() => headerSlots.value[props.roleIndex])
const mainImage = computed(() =>
  main.value ? battleStore.getChampionImage(main.value) : '',
)
const tier = computed(() => (main.value ? getChampionTier(main.value) : null))
const allies = computed(
  () => secondarySlots.value[props.roleIndex] ?? Array<string | null>(ALLIES_PER_ROLE).fill(null),
)
const equipment = computed(() => itemStore.slotEquipment[props.roleIndex])

const origin = computed(() => (main.value ? getChampionOrigin(main.value) : null))
const originColor = computed(() => getOriginColor(main.value))
const originIcon = computed(() =>
  origin.value
    ? ((ORIGIN_SYNERGIES as Record<string, { icon: string } | undefined>)[origin.value]?.icon ??
      '')
    : '',
)
const traits = computed(() =>
  (CHAMPION_TRAITS[main.value ?? ''] ?? []).map((id) => TRAIT_BY_ID[id]),
)

const CAT_LABELS: Record<ItemCategory, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  artefact: 'Artefact',
}
const CATEGORIES: ItemCategory[] = ['weapon', 'armor', 'artefact']

function equippedItem(cat: ItemCategory): ShopItem | null {
  const id = equipment.value[cat]
  if (!id) return null
  return SHOP_ITEMS.find((i) => i.id === id) ?? null
}

function allyImage(ally: string | null): string {
  return ally ? battleStore.getChampionImage(ally) : ''
}

function allyOrigin(name: string) {
  return getChampionOrigin(name)
}

function allyOriginIcon(name: string): string {
  const allyOriginName = getChampionOrigin(name)
  return allyOriginName
    ? ((ORIGIN_SYNERGIES as Record<string, { icon: string } | undefined>)[allyOriginName]?.icon ??
        '')
    : ''
}

function allyTraits(name: string) {
  return (CHAMPION_TRAITS[name] ?? []).map((id) => TRAIT_BY_ID[id])
}

const equippedCount = computed(() => CATEGORIES.filter((cat) => equipment.value[cat]).length)
const filledAllyCount = computed(() => allies.value.filter((ally) => ally !== null).length)
</script>

<template>
  <div class="sdp-panel" :style="{ '--rc': roleDef.color }">
    <!-- ── splash header ── -->
    <div class="sdp-splash">
      <template v-if="main">
        <img :src="mainImage" :alt="main" class="sdp-splash-img" />
        <div class="sdp-splash-fade" />
      </template>
      <div v-else class="sdp-splash-empty">
        <img :src="roleDef.image" :alt="roleDef.label" class="sdp-splash-empty-img" />
      </div>

      <div class="sdp-role-badge">
        <img :src="roleDef.image" :alt="''" class="sdp-role-badge-img" />
        <span>{{ roleDef.label }}</span>
      </div>
      <div v-if="tier" class="sdp-tier-badge" :style="{ borderColor: tier.color }">
        <span class="sdp-tier-star" :style="{ color: tier.color }">★{{ tier.starLevel }}</span>
        <span class="sdp-tier-name">{{ tier.name }}</span>
      </div>
      <button class="sdp-close" aria-label="Close details" @click="emit('close')">✕</button>

      <div class="sdp-splash-bottom">
        <div class="sdp-name">{{ main ?? 'No Champion' }}</div>
        <button class="sdp-swap-btn" @click="emit('swap')">
          <Icon icon="game-icons:cycle" width="15" height="15" />
          {{ main ? 'Swap' : 'Select' }}
        </button>
      </div>
    </div>

    <!-- ── scrollable body ── -->
    <div class="sdp-body">
      <!-- origin + trait chips -->
      <div v-if="main" class="sdp-chips">
        <span
          v-if="origin"
          class="sdp-chip"
          :style="{ borderColor: originColor, color: originColor }"
        >
          <Icon
            v-if="originIcon.includes(':')"
            :icon="originIcon"
            width="16"
            height="16"
            class="sdp-chip-icon"
          />
          {{ origin }}
        </span>
        <span
          v-for="trait in traits"
          :key="trait.id"
          class="sdp-chip"
          :style="{ borderColor: trait.color, color: trait.color }"
        >
          <Icon :icon="trait.icon" width="16" height="16" class="sdp-chip-icon" />
          {{ trait.name }}
        </span>
      </div>

      <!-- role ability — part of the main champion block -->
      <div class="sdp-ability">
        <div class="sdp-ability-icon">
          <img :src="roleDef.image" :alt="roleDef.label" class="sdp-ability-img" />
        </div>
        <div class="sdp-ability-text">
          <div class="sdp-section-label">Role Ability</div>
          <div class="sdp-ability-desc">{{ roleDef.abilityCompact }}</div>
        </div>
      </div>

      <!-- equipment — the main champion's loadout, right below the splash -->
      <div>
        <div class="sdp-section-head">
          <span class="sdp-section-accent">✦</span>
          <span class="sdp-section-title">Equipment</span>
          <div class="sdp-section-rule" />
          <span class="sdp-section-count">{{ equippedCount }}/{{ CATEGORIES.length }}</span>
        </div>
        <div class="sdp-equips">
          <button
            v-for="cat in CATEGORIES"
            :key="cat"
            class="sdp-equip"
            :class="{ 'sdp-equip--filled': !!equippedItem(cat) }"
            :title="equippedItem(cat)?.name ?? CAT_LABELS[cat]"
            @click="emit('pick-equipment', cat)"
          >
            <template v-if="equippedItem(cat)">
              <img
                v-if="equippedItem(cat)!.icon.startsWith('/')"
                :src="equippedItem(cat)!.icon"
                :alt="equippedItem(cat)!.name"
                class="sdp-equip-img"
              />
              <span v-else class="sdp-equip-emoji">{{ equippedItem(cat)!.icon }}</span>
              <span class="sdp-equip-name">{{ equippedItem(cat)!.name }}</span>
            </template>
            <img
              v-else
              :src="`/img/itemShop/${cat}.png`"
              :alt="CAT_LABELS[cat]"
              class="sdp-equip-img sdp-equip-img--ghost"
            />
            <span class="sdp-equip-cat">{{ CAT_LABELS[cat] }}</span>
          </button>
        </div>
      </div>

      <!-- allies -->
      <div>
        <div class="sdp-section-head">
          <span class="sdp-section-accent">✦</span>
          <span class="sdp-section-title">Allies</span>
          <div class="sdp-section-rule" />
          <span class="sdp-section-count">{{ filledAllyCount }}/{{ allies.length }}</span>
        </div>
        <div class="sdp-ally-rows">
          <button
            v-for="(ally, sub) in allies"
            :key="sub"
            class="sdp-ally-row"
            :class="{ 'sdp-ally-row--filled': !!ally }"
            @click="emit('pick-ally', sub)"
          >
            <template v-if="ally">
              <img :src="allyImage(ally)" :alt="ally" class="sdp-ally-row-img" />
              <div class="sdp-ally-row-fade" />
              <span class="sdp-ally-row-main">
                <span class="sdp-ally-row-name">{{ ally }}</span>
                <span class="sdp-ally-row-chips">
                  <span
                    v-if="allyOrigin(ally)"
                    class="sdp-mini-chip"
                    :style="{ borderColor: getOriginColor(ally), color: getOriginColor(ally) }"
                  >
                    <Icon
                      v-if="allyOriginIcon(ally).includes(':')"
                      :icon="allyOriginIcon(ally)"
                      width="13"
                      height="13"
                      class="sdp-mini-chip-icon"
                    />
                    {{ allyOrigin(ally) }}
                  </span>
                  <span
                    v-for="trait in allyTraits(ally)"
                    :key="trait.id"
                    class="sdp-mini-chip"
                    :style="{ borderColor: trait.color, color: trait.color }"
                  >
                    <Icon :icon="trait.icon" width="13" height="13" class="sdp-mini-chip-icon" />
                    {{ trait.name }}
                  </span>
                </span>
              </span>
              <span
                class="sdp-ally-clear"
                role="button"
                title="Remove"
                @click.stop="emit('clear-ally', sub)"
              >
                ✕
              </span>
            </template>
            <template v-else>
              <span class="sdp-ally-row-plus">＋</span>
              <span class="sdp-ally-row-main">
                <span class="sdp-ally-row-empty-label">Ally {{ sub + 1 }}</span>
                <span class="sdp-ally-row-hint">Tap to assign</span>
              </span>
            </template>
          </button>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
.sdp-panel {
  width: v-bind(panelWidthPx);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #1a1008, #0d0905);
  border-left: 2px solid #5c3310;
}

/* ── splash header ── */
.sdp-splash {
  position: relative;
  height: 212px;
  flex-shrink: 0;
  overflow: hidden;
  background: #0a0704;
}
.sdp-splash-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 16%;
}
.sdp-splash-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 34%, rgba(13, 9, 5, 0.98));
}
.sdp-splash-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sdp-splash-empty-img {
  width: 88px;
  height: 88px;
  opacity: 0.4;
  object-fit: contain;
}
.sdp-role-badge {
  position: absolute;
  top: 12px;
  left: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid var(--rc);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rc);
}
.sdp-role-badge-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
.sdp-tier-badge {
  position: absolute;
  top: 12px;
  right: 52px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid;
}
.sdp-tier-star {
  font-size: 12px;
  font-weight: 800;
}
.sdp-tier-name {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(230, 220, 196, 0.55);
}
.sdp-close {
  position: absolute;
  top: 12px;
  right: 13px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1;
  background: rgba(30, 16, 16, 0.7);
  border: 1px solid rgba(180, 70, 50, 0.4);
  color: #d8a090;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.sdp-close:hover {
  background: rgba(120, 30, 20, 0.6);
  color: #fff;
}
.sdp-splash-bottom {
  position: absolute;
  left: 15px;
  right: 15px;
  bottom: 11px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.sdp-name {
  flex: 1;
  min-width: 0;
  font-size: 30px;
  color: #f4e6bc;
  line-height: 1;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sdp-swap-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  cursor: pointer;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
  font-size: 13px;
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: filter 0.15s;
}
.sdp-swap-btn:hover {
  filter: brightness(1.12);
}

/* ── body ── */
.sdp-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.sdp-body::-webkit-scrollbar {
  width: 4px;
}
.sdp-body::-webkit-scrollbar-track {
  background: #111;
}
.sdp-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.sdp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sdp-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid;
  font-size: 13px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
.sdp-chip-icon {
  color: #fff;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85));
}

.sdp-ability {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 11px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(200, 164, 90, 0.12);
  border-left: 3px solid var(--rc);
}
.sdp-ability-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #141410;
  border: 1px solid rgba(220, 180, 90, 0.3);
}
.sdp-ability-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
.sdp-section-label {
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 164, 90, 0.6);
}
.sdp-ability-desc {
  font-size: 13.5px;
  font-weight: 500;
  color: #dcc99a;
  line-height: 1.35;
  margin-top: 3px;
}

.sdp-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.sdp-section-accent {
  font-size: 12px;
  color: var(--rc);
}
.sdp-section-title {
  font-size: 14px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #c8a860;
}
.sdp-section-rule {
  flex: 1;
  height: 1px;
  background: rgba(200, 164, 90, 0.16);
}
.sdp-section-count {
  font-size: 11px;
  color: rgba(230, 220, 196, 0.4);
}
/* allies — one info row per ally (portrait + name + origin/trait chips) */
.sdp-ally-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sdp-ally-row {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 78px;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  background: #1c1c18;
  border: 1px solid rgba(200, 164, 90, 0.14);
  border-left: 3px solid rgba(200, 164, 90, 0.2);
  transition:
    transform 0.15s,
    border-color 0.15s;
}
.sdp-ally-row--filled {
  border-left-color: var(--rc);
}
.sdp-ally-row:hover {
  transform: translateY(-1px);
  border-color: var(--rc);
}
/* splash image fills the whole row; the fade keeps the left text readable */
.sdp-ally-row-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
}
.sdp-ally-row-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(10, 7, 4, 0.94) 0%,
    rgba(10, 7, 4, 0.82) 42%,
    rgba(10, 7, 4, 0.25) 100%
  );
}
.sdp-ally-row-main {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sdp-ally-row-name {
  font-size: 16px;
  font-weight: 700;
  color: #e8dcc0;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sdp-ally-row-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.sdp-mini-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}
.sdp-mini-chip-icon {
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
  flex-shrink: 0;
}
.sdp-ally-clear {
  position: relative;
  z-index: 1;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(10, 5, 5, 0.85);
  border: 1px solid rgba(180, 60, 45, 0.5);
  color: #d88;
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s;
}
.sdp-ally-clear:hover {
  background: rgba(120, 30, 20, 0.8);
}
.sdp-ally-row-plus {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
  color: var(--rc);
  border-radius: 4px;
  background: #141410;
  border: 1px solid rgba(200, 164, 90, 0.18);
}
.sdp-ally-row-empty-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 164, 90, 0.55);
}
.sdp-ally-row-hint {
  font-size: 11.5px;
  color: rgba(230, 220, 196, 0.35);
}

/* equipment */
.sdp-equips {
  display: flex;
  gap: 9px;
}
.sdp-equip {
  position: relative;
  flex: 1;
  height: 100px;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  border-radius: 4px;
  background: radial-gradient(circle at 50% 34%, #1a140c, #0a0808);
  border: 1px solid rgba(200, 164, 90, 0.14);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition:
    transform 0.15s,
    border-color 0.15s;
}
.sdp-equip--filled {
  border-color: rgba(220, 180, 90, 0.55);
  box-shadow: inset 0 0 14px rgba(200, 144, 64, 0.12);
}
.sdp-equip:hover {
  transform: translateY(-2px);
  border-color: #c89040;
}
.sdp-equip-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 0 7px rgba(200, 144, 64, 0.5));
}
.sdp-equip-img--ghost {
  width: 34px;
  height: 34px;
  opacity: 0.28;
  filter: none;
}
.sdp-equip-emoji {
  font-size: 38px;
  line-height: 1;
}
.sdp-equip-name {
  max-width: 100%;
  padding: 0 6px;
  font-size: 11px;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sdp-equip-cat {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(200, 164, 90, 0.55);
  text-transform: uppercase;
}

</style>
