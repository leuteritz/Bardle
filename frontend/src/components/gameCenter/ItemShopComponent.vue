<template>
  <div class="flex flex-col gap-4">
    <!-- Aktiver Set-Bonus -->
    <div v-if="itemStore.activeSetBonuses.length > 0" class="flex flex-col gap-2">
      <div
        v-for="bonus in itemStore.activeSetBonuses"
        :key="bonus.setId"
        class="set-bonus-row flex items-center gap-3 px-3 py-2.5"
      >
        <span class="flex-shrink-0 text-xl">{{ bonus.icon }}</span>
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="text-sm font-bold truncate set-bonus-name">{{ bonus.setName }}</span>
          <span class="text-xs set-bonus-desc">{{ bonus.description }}</span>
        </div>
        <span class="flex-shrink-0 px-2 py-1 ml-auto text-xs font-bold set-bonus-badge">
          AKTIV
        </span>
      </div>
    </div>

    <!-- Kategorie-Tabs -->
    <div class="flex gap-1.5">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="rpg-tab px-3 py-1.5 text-sm font-bold tracking-wide"
        :class="{ 'rpg-tab--active': activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        {{ cat.icon }} {{ cat.label }}
      </button>
    </div>

    <!-- Item Grid – 2 Spalten -->
    <div class="grid grid-cols-2 gap-2.5">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="relative flex flex-col gap-2 p-3 overflow-hidden item-card group"
        :class="[
          rarityCardClass(item.rarity),
          canAfford(item) ? 'item-card--affordable' : 'item-card--locked',
        ]"
        @click="buyItem(item)"
      >
        <!-- Rarity Glow -->
        <div
          class="absolute inset-0 pointer-events-none item-glow"
          :class="rarityGlowClass(item.rarity)"
        />

        <!-- Icon + Badges -->
        <div class="relative z-10 flex items-start justify-between gap-1">
          <div
            class="flex items-center justify-center flex-shrink-0 w-12 h-12 item-icon-box"
            :class="rarityIconBg(item.rarity)"
          >
            <img
              v-if="item.icon.startsWith('/')"
              :src="item.icon"
              class="object-contain w-10 h-10 rpg-img"
            />
            <span v-else class="text-2xl">{{ item.icon }}</span>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span
              v-if="(itemStore.ownedItems[item.id] ?? 0) > 0"
              class="owned-badge text-xs font-bold px-1.5 py-0.5"
            >
              ×{{ itemStore.ownedItems[item.id] }}
            </span>
            <span
              v-if="item.setId"
              class="set-tag text-[10px] font-bold px-1.5 py-0.5"
              :class="setTagClass(item.setId)"
            >
              SET
            </span>
          </div>
        </div>

        <!-- Name -->
        <span class="relative z-10 text-sm font-bold leading-tight truncate item-name">
          {{ item.name }}
        </span>

        <!-- Effekt -->
        <span class="relative z-10 text-xs leading-snug item-effect">
          {{ item.description }}
        </span>

        <!-- Kosten -->
        <div class="item-cost-divider relative z-10 flex flex-col gap-1.5 mt-auto pt-2">
          <!-- Chime-Kosten -->
          <div class="flex items-center gap-1.5">
            <img src="/img/BardAbilities/BardChime.png" class="flex-shrink-0 w-4 h-4 rpg-img" />
            <span
              class="text-sm font-bold"
              :class="gameStore.chimes >= item.price ? 'price-afford' : 'price-cant'"
            >
              {{ formatNumber(item.price) }}
            </span>
          </div>
          <!-- Material-Kosten -->
          <div v-if="item.materialCost" class="flex flex-wrap gap-1.5">
            <div
              v-for="(qty, matId) in item.materialCost"
              :key="matId"
              class="flex items-center gap-1"
            >
              <img :src="getMaterialImage(String(matId))" class="flex-shrink-0 w-4 h-4 rpg-img" />
              <span
                class="text-xs font-bold"
                :class="hasMaterial(String(matId), qty) ? 'mat-have' : 'price-cant'"
              >
                {{ qty }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useItemStore } from '../../stores/itemStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { SHOP_ITEMS } from '../../config/items'
import { MATERIALS } from '../../config/materials'
import { formatNumber } from '../../config/numberFormat'
import type { ItemRarity, ShopItem } from '../../types'

export default defineComponent({
  name: 'ItemShopComponent',
  setup() {
    const gameStore = useGameStore()
    const itemStore = useItemStore()
    const inventoryStore = useInventoryStore()
    const activeCategory = ref('weapon')

    const categories = [
      { id: 'weapon', icon: '⚔️', label: 'Waffen' },
      { id: 'armor', icon: '🛡️', label: 'Rüstung' },
      { id: 'misc', icon: '📿', label: 'Misc' },
    ]

    const filteredItems = computed(() =>
      SHOP_ITEMS.filter((i) => i.category === activeCategory.value),
    )

    const materialMap = Object.fromEntries(MATERIALS.map((m) => [m.id, m]))

    function getMaterialImage(matId: string): string {
      return materialMap[matId]?.image ?? ''
    }

    function hasMaterial(matId: string, qty: number): boolean {
      return (inventoryStore.collectedMaterials[matId] ?? 0) >= qty
    }

    function canAfford(item: ShopItem): boolean {
      if (gameStore.chimes < item.price) return false
      if (item.materialCost && !inventoryStore.hasMaterials(item.materialCost)) return false
      return true
    }

    function buyItem(item: ShopItem) {
      if (!canAfford(item)) return
      itemStore.buyItem(item.id)
    }

    const rarityCardClass = (r: ItemRarity) =>
      ({
        common: 'border-white/[0.08]   bg-white/[0.02]',
        rare: 'border-blue-400/20    bg-blue-500/[0.04]',
        epic: 'border-purple-400/25  bg-purple-500/[0.05]',
        legendary: 'border-yellow-400/30  bg-yellow-500/[0.06]',
      })[r]

    const rarityGlowClass = (r: ItemRarity) =>
      ({
        common: '',
        rare: 'bg-blue-500/[0.05]',
        epic: 'bg-purple-500/[0.07]',
        legendary: 'bg-yellow-500/[0.09]',
      })[r]

    const rarityIconBg = (r: ItemRarity) =>
      ({
        common: 'bg-white/[0.05]',
        rare: 'bg-blue-500/10',
        epic: 'bg-purple-500/10',
        legendary: 'bg-yellow-500/10',
      })[r]

    const setTagClass = (setId: string) =>
      ({
        arcane: 'bg-purple-500/20 text-purple-300/70',
        cosmic: 'bg-blue-500/20 text-blue-300/70',
        stellar: 'bg-yellow-500/20 text-yellow-300/70',
      })[setId] ?? 'bg-white/10 text-white/40'

    return {
      gameStore,
      itemStore,
      inventoryStore,
      activeCategory,
      categories,
      filteredItems,
      formatNumber,
      canAfford,
      buyItem,
      getMaterialImage,
      hasMaterial,
      rarityCardClass,
      rarityGlowClass,
      rarityIconBg,
      setTagClass,
    }
  },
})
</script>

<style scoped>
/* ── Set Bonus Row ── */
.set-bonus-row {
  background: var(--rpg-bg-selected);
  border: 1px solid var(--rpg-gold-dim);
  border-radius: 4px;
}
.set-bonus-name {
  color: var(--rpg-gold);
}
.set-bonus-desc {
  color: var(--rpg-text-dim);
}
.set-bonus-badge {
  color: var(--rpg-gold);
  background: rgba(232, 192, 64, 0.15);
  border: 1px solid rgba(232, 192, 64, 0.3);
  border-radius: 4px;
}

/* ── Item Card Base ── */
.item-card {
  background: var(--rpg-bg-row);
  border-radius: 4px;
  border: 1px solid var(--rpg-border-row);
  transition: all 0.15s;
}
.item-card--affordable {
  cursor: pointer;
}
.item-card--affordable:hover {
  background: var(--rpg-bg-hover);
  border-color: var(--rpg-wood-mid);
}
.item-card--locked {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

/* ── Item Glow (hover overlay) ── */
.item-glow {
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}
.group:hover .item-glow {
  opacity: 1;
}

/* ── Icon Box ── */
.item-icon-box {
  background: var(--rpg-bg-icon);
  border-radius: 4px;
}

/* ── Owned Badge ── */
.owned-badge {
  background: var(--rpg-bg-green-subtle);
  border: 1px solid var(--rpg-green-border);
  color: var(--rpg-green-top);
  border-radius: 4px;
}

/* ── Set Tag Base ── */
.set-tag {
  border-radius: 4px;
}

/* ── Item Name ── */
.item-name {
  color: var(--rpg-text);
}

/* ── Item Effect ── */
.item-effect {
  color: var(--rpg-green-light);
}

/* ── Cost Divider ── */
.item-cost-divider {
  border-top: 1px solid var(--rpg-border-row);
}

/* ── Price Colors ── */
.price-afford {
  color: var(--rpg-gold);
}
.price-cant {
  color: var(--rpg-red);
}
.mat-have {
  color: var(--rpg-text-muted);
}

/* ══════════════════════════════════════════════
   Override computed Tailwind classes from script
   (rarityCardClass, rarityGlowClass, rarityIconBg, setTagClass)

   The script returns Tailwind class names that we cannot change.
   We override each individual class here with RPG styling.
   ══════════════════════════════════════════════ */

/* ── rarityCardClass: border classes ── */
.border-white\/\[0\.08\] {
  border-color: var(--rpg-rarity-common) !important;
}
.border-blue-400\/20 {
  border-color: var(--rpg-rarity-rare) !important;
}
.border-purple-400\/25 {
  border-color: var(--rpg-rarity-epic) !important;
}
.border-yellow-400\/30 {
  border-color: var(--rpg-rarity-legendary) !important;
}

/* ── rarityCardClass: background classes ── */
.bg-white\/\[0\.02\] {
  background: rgba(91, 141, 217, 0.06) !important;
}
.bg-blue-500\/\[0\.04\] {
  background: rgba(168, 126, 216, 0.06) !important;
}
.bg-purple-500\/\[0\.05\] {
  background: rgba(217, 160, 62, 0.06) !important;
}
.bg-yellow-500\/\[0\.06\] {
  background: rgba(232, 192, 64, 0.08) !important;
}

/* ── rarityGlowClass overrides ── */
.bg-blue-500\/\[0\.05\] {
  background: transparent !important;
  box-shadow: inset 0 0 20px rgba(168, 126, 216, 0.1);
}
.bg-purple-500\/\[0\.07\] {
  background: transparent !important;
  box-shadow: inset 0 0 20px rgba(217, 160, 62, 0.12);
}
.bg-yellow-500\/\[0\.09\] {
  background: transparent !important;
  box-shadow: inset 0 0 20px rgba(232, 192, 64, 0.15);
}

/* ── rarityIconBg overrides ── */
.bg-white\/\[0\.05\] {
  background: var(--rpg-bg-icon) !important;
}
.bg-blue-500\/10 {
  background: rgba(168, 126, 216, 0.12) !important;
}
.bg-purple-500\/10 {
  background: rgba(217, 160, 62, 0.12) !important;
}
.bg-yellow-500\/10 {
  background: rgba(232, 192, 64, 0.12) !important;
}

/* ── setTagClass overrides ── */
.bg-purple-500\/20 {
  background: rgba(168, 126, 216, 0.15) !important;
}
.text-purple-300\/70 {
  color: var(--rpg-rarity-rare) !important;
}
.bg-blue-500\/20 {
  background: rgba(91, 141, 217, 0.15) !important;
}
.text-blue-300\/70 {
  color: var(--rpg-rarity-common) !important;
}
.bg-yellow-500\/20 {
  background: rgba(232, 192, 64, 0.15) !important;
}
.text-yellow-300\/70 {
  color: var(--rpg-rarity-legendary) !important;
}
.bg-white\/10 {
  background: rgba(255, 255, 255, 0.08) !important;
}
.text-white\/40 {
  color: var(--rpg-text-dim) !important;
}
</style>
