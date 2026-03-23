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
        <span class="text-[10px]">🪙</span>
        <span class="text-xs font-bold text-yellow-300/60">—</span>
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
        class="relative group rounded-lg border p-1.5 flex flex-col gap-1 transition-all duration-200 cursor-not-allowed overflow-hidden"
        :class="rarityCardClass(item.rarity)"
      >
        <!-- Rarity Glow -->
        <div
          class="absolute inset-0 transition-opacity duration-300 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100"
          :class="rarityGlowClass(item.rarity)"
        />

        <!-- Icon + Rarity-Dot -->
        <div class="relative z-10 flex items-center justify-between">
          <div
            class="flex items-center justify-center flex-shrink-0 text-sm rounded-md w-7 h-7"
            :class="rarityIconBg(item.rarity)"
          >
            {{ item.icon }}
          </div>
          <span
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
          <span class="text-[9px]">🪙</span>
          <span class="text-[10px] font-bold text-yellow-300/45">{{ item.price }}</span>
        </div>
      </div>
    </div>

    <!-- Coming Soon -->
    <div
      class="flex items-center justify-center py-1 rounded-lg border border-dashed border-white/[0.05]"
    >
      <span class="text-[9px] font-medium tracking-wide text-white/12"
        >✦ Weitere Items folgen ✦</span
      >
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'

type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

interface ShopItem {
  id: string
  name: string
  description: string
  icon: string
  price: number
  rarity: Rarity
  category: string
}

const ITEMS: ShopItem[] = [
  {
    id: 'sword',
    name: 'Kurzschwert',
    description: '+ATK',
    icon: '⚔️',
    price: 120,
    rarity: 'common',
    category: 'weapon',
  },
  {
    id: 'shield',
    name: 'Holzschild',
    description: '+DEF',
    icon: '🛡️',
    price: 100,
    rarity: 'common',
    category: 'armor',
  },
  {
    id: 'staff',
    name: 'Zauberstab',
    description: '+AP',
    icon: '🪄',
    price: 350,
    rarity: 'rare',
    category: 'weapon',
  },
  {
    id: 'potion',
    name: 'Heiltrank',
    description: '+HP Regen',
    icon: '🧪',
    price: 80,
    rarity: 'common',
    category: 'misc',
  },
  {
    id: 'cloak',
    name: 'Schattenmantel',
    description: '+Ausweichen',
    icon: '🧥',
    price: 500,
    rarity: 'rare',
    category: 'armor',
  },
  {
    id: 'amulet',
    name: 'Drachenamulett',
    description: '+Alle Stats',
    icon: '📿',
    price: 1200,
    rarity: 'epic',
    category: 'misc',
  },
  {
    id: 'bow',
    name: 'Elfenbogen',
    description: '+CRIT',
    icon: '🏹',
    price: 750,
    rarity: 'rare',
    category: 'weapon',
  },
  {
    id: 'crown',
    name: 'Götterkrone',
    description: 'Legendär',
    icon: '👑',
    price: 9999,
    rarity: 'legendary',
    category: 'misc',
  },
]

export default defineComponent({
  name: 'ItemShopComponent',
  setup() {
    const activeCategory = ref('all')

    const categories = [
      { id: 'all', icon: '✦', label: 'Alle' },
      { id: 'weapon', icon: '⚔️', label: 'Waffen' },
      { id: 'armor', icon: '🛡️', label: 'Rüstung' },
      { id: 'misc', icon: '📿', label: 'Misc' },
    ]

    const filteredItems = computed(() =>
      activeCategory.value === 'all'
        ? ITEMS
        : ITEMS.filter((i) => i.category === activeCategory.value),
    )

    const rarityCardClass = (r: Rarity) =>
      ({
        common: 'border-white/[0.08]   bg-white/[0.02]',
        rare: 'border-blue-400/20    bg-blue-500/[0.04]',
        epic: 'border-purple-400/25  bg-purple-500/[0.05]',
        legendary: 'border-yellow-400/30  bg-yellow-500/[0.06]',
      })[r]

    const rarityGlowClass = (r: Rarity) =>
      ({
        common: '',
        rare: 'bg-blue-500/[0.05]',
        epic: 'bg-purple-500/[0.07]',
        legendary: 'bg-yellow-500/[0.09]',
      })[r]

    const rarityIconBg = (r: Rarity) =>
      ({
        common: 'bg-white/[0.05]',
        rare: 'bg-blue-500/10',
        epic: 'bg-purple-500/10',
        legendary: 'bg-yellow-500/10',
      })[r]

    // Kompakter Dot statt Rarity-Badge-Text
    const rarityDotClass = (r: Rarity) =>
      ({
        common: 'bg-white/20',
        rare: 'bg-blue-400/60',
        epic: 'bg-purple-400/70',
        legendary: 'bg-yellow-400/80',
      })[r]

    return {
      activeCategory,
      categories,
      filteredItems,
      rarityCardClass,
      rarityGlowClass,
      rarityIconBg,
      rarityDotClass,
    }
  },
})
</script>
