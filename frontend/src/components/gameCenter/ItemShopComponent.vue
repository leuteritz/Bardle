<template>
  <!-- Kein eigener Card-Wrapper – liegt bereits im rechten Panel -->
  <div class="flex flex-col gap-2">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <span class="text-sm">🛍️</span>
        <span class="text-xs font-bold tracking-widest uppercase text-white/35">Item Shop</span>
      </div>
      <div
        class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-400/20"
      >
        <img src="/img/BardAbilities/BardChime.png" class="w-7 h-7" />
        <span class="text-xs font-bold text-yellow-300/60">{{
          formatNumber(gameStore.chimes)
        }}</span>
      </div>
    </div>

    <!-- Kategorie-Tabs -->
    <div class="flex gap-1">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide transition-all duration-200"
        :class="
          activeCategory === cat.id
            ? 'bg-white/10 text-white/60 border border-white/15'
            : 'text-white/20 hover:text-white/35 border border-transparent'
        "
        @click="activeCategory = cat.id"
      >
        {{ cat.icon }} {{ cat.label }}
      </button>
    </div>

    <!-- Item Grid – 3 Spalten, kompakte Karten -->
    <div class="grid grid-cols-3 gap-1.5">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="relative group rounded-lg border p-1.5 flex flex-col gap-1 transition-all duration-200 overflow-hidden"
        :class="[
          rarityCardClass(item.rarity),
          canAfford(item) ? 'cursor-pointer hover:scale-[1.03]' : 'cursor-not-allowed opacity-60',
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
            class="flex items-center justify-center flex-shrink-0 text-sm rounded-md w-7 h-7"
            :class="rarityIconBg(item.rarity)"
          >
            {{ item.icon }}
          </div>
          <span
            v-if="(itemStore.ownedItems[item.id] ?? 0) > 0"
            class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
          >
            x{{ itemStore.ownedItems[item.id] }}
          </span>
          <span
            v-else
            class="w-1.5 h-1.5 rounded-full flex-shrink-0"
            :class="rarityDotClass(item.rarity)"
          />
        </div>

        <!-- Name -->
        <span class="relative z-10 text-[10px] font-bold leading-tight text-white/65 truncate">
          {{ item.name }}
        </span>

        <!-- Preis -->
        <div
          class="relative z-10 flex items-center gap-0.5 mt-auto border-t border-white/[0.05] pt-1"
        >
          <img src="/img/BardAbilities/BardChime.png" class="w-5 h-5" />
          <span
            class="text-[10px] font-bold"
            :class="canAfford(item) ? 'text-yellow-300/70' : 'text-red-400/50'"
          >
            {{ item.price }}
          </span>
        </div>
      </div>
    </div>

    <!-- Coming Soon -->
    <div
      class="flex items-center justify-center py-1 rounded-lg border border-dashed border-white/[0.05]"
    >
      <span class="text-[9px] font-medium tracking-wide text-white/12">Weitere Items folgen</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useItemStore } from '../../stores/itemStore'
import { SHOP_ITEMS } from '../../config/items'
import { formatNumber } from '../../config/numberFormat'
import type { ItemRarity, ShopItem } from '../../types'

export default defineComponent({
  name: 'ItemShopComponent',
  setup() {
    const gameStore = useGameStore()
    const itemStore = useItemStore()
    const activeCategory = ref('all')

    const categories = [
      { id: 'all', icon: '✦', label: 'Alle' },
      { id: 'weapon', icon: '⚔️', label: 'Waffen' },
      { id: 'armor', icon: '🛡️', label: 'Ruestung' },
      { id: 'misc', icon: '📿', label: 'Misc' },
    ]

    const filteredItems = computed(() =>
      activeCategory.value === 'all'
        ? SHOP_ITEMS
        : SHOP_ITEMS.filter((i) => i.category === activeCategory.value),
    )

    function canAfford(item: ShopItem): boolean {
      return gameStore.chimes >= item.price
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

    const rarityDotClass = (r: ItemRarity) =>
      ({
        common: 'bg-white/20',
        rare: 'bg-blue-400/60',
        epic: 'bg-purple-400/70',
        legendary: 'bg-yellow-400/80',
      })[r]

    return {
      gameStore,
      itemStore,
      activeCategory,
      categories,
      filteredItems,
      formatNumber,
      canAfford,
      buyItem,
      rarityCardClass,
      rarityGlowClass,
      rarityIconBg,
      rarityDotClass,
    }
  },
})
</script>
