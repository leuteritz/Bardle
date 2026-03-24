<template>
  <div class="flex flex-col gap-2.5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <span class="text-sm">🛍️</span>
        <span class="text-xs font-bold tracking-widest uppercase text-white/35">Item Shop</span>
      </div>
      <div
        class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-400/20"
      >
        <img src="/img/BardAbilities/BardChime.png" class="w-6 h-6" />
        <span class="text-xs font-bold text-yellow-300/60">{{
          formatNumber(gameStore.chimes)
        }}</span>
      </div>
    </div>

    <!-- Aktiver Set-Bonus -->
    <div
      v-if="itemStore.activeSetBonuses.length > 0"
      class="flex flex-col gap-1"
    >
      <div
        v-for="bonus in itemStore.activeSetBonuses"
        :key="bonus.setId"
        class="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-yellow-400/30 bg-yellow-500/[0.06]"
      >
        <span class="text-base flex-shrink-0">{{ bonus.icon }}</span>
        <div class="flex flex-col leading-tight min-w-0">
          <span class="text-xs font-bold text-yellow-300/80 truncate">{{ bonus.setName }}</span>
          <span class="text-[11px] text-yellow-200/50">{{ bonus.description }}</span>
        </div>
        <span class="ml-auto text-[10px] font-bold text-yellow-400/60 bg-yellow-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">AKTIV</span>
      </div>
    </div>

    <!-- Kategorie-Tabs -->
    <div class="flex gap-1">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="px-2 py-0.5 rounded-md text-xs font-bold tracking-wide transition-all duration-200"
        :class="
          activeCategory === cat.id
            ? 'bg-white/10 text-white/70 border border-white/15'
            : 'text-white/25 hover:text-white/40 border border-transparent'
        "
        @click="activeCategory = cat.id"
      >
        {{ cat.icon }} {{ cat.label }}
      </button>
    </div>

    <!-- Item Grid – 2 Spalten -->
    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="relative group rounded-lg border p-2 flex flex-col gap-1.5 transition-all duration-200 overflow-hidden"
        :class="[
          rarityCardClass(item.rarity),
          canAfford(item) ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-not-allowed opacity-55',
        ]"
        @click="buyItem(item)"
      >
        <!-- Rarity Glow -->
        <div
          class="absolute inset-0 transition-opacity duration-300 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100"
          :class="rarityGlowClass(item.rarity)"
        />

        <!-- Icon + Owned Count -->
        <div class="relative z-10 flex items-center justify-between">
          <div
            class="flex items-center justify-center flex-shrink-0 text-base rounded-md w-8 h-8"
            :class="rarityIconBg(item.rarity)"
          >
            {{ item.icon }}
          </div>
          <span
            v-if="(itemStore.ownedItems[item.id] ?? 0) > 0"
            class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
          >
            x{{ itemStore.ownedItems[item.id] }}
          </span>
          <span
            v-if="item.setId"
            class="text-[9px] font-bold px-1 py-0.5 rounded-full"
            :class="setTagClass(item.setId)"
          >
            SET
          </span>
        </div>

        <!-- Name -->
        <span class="relative z-10 text-xs font-bold leading-tight text-white/70 truncate">
          {{ item.name }}
        </span>

        <!-- Effekte -->
        <span class="relative z-10 text-[11px] text-emerald-400/80 leading-tight">
          {{ item.description }}
        </span>

        <!-- Kosten -->
        <div class="relative z-10 flex flex-col gap-1 mt-auto border-t border-white/[0.05] pt-1.5">
          <!-- Chime-Kosten -->
          <div class="flex items-center gap-1">
            <img src="/img/BardAbilities/BardChime.png" class="w-4 h-4 flex-shrink-0" />
            <span
              class="text-xs font-bold"
              :class="gameStore.chimes >= item.price ? 'text-yellow-300/70' : 'text-red-400/50'"
            >
              {{ formatNumber(item.price) }}
            </span>
          </div>
          <!-- Material-Kosten -->
          <div v-if="item.materialCost" class="flex flex-wrap gap-1">
            <div
              v-for="(qty, matId) in item.materialCost"
              :key="matId"
              class="flex items-center gap-0.5"
            >
              <img
                :src="getMaterialImage(String(matId))"
                class="w-4 h-4 flex-shrink-0 rounded-sm"
              />
              <span
                class="text-[10px] font-bold"
                :class="hasMaterial(String(matId), qty) ? 'text-white/60' : 'text-red-400/50'"
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
    const activeCategory = ref('all')

    const categories = [
      { id: 'all', icon: '✦', label: 'Alle' },
      { id: 'weapon', icon: '⚔️', label: 'Waffen' },
      { id: 'armor', icon: '🛡️', label: 'Rüstung' },
      { id: 'misc', icon: '📿', label: 'Misc' },
    ]

    const filteredItems = computed(() =>
      activeCategory.value === 'all'
        ? SHOP_ITEMS
        : SHOP_ITEMS.filter((i) => i.category === activeCategory.value),
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
