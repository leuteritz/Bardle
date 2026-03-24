<template>
  <div class="flex flex-col gap-4">
    <!-- Aktiver Set-Bonus -->
    <div v-if="itemStore.activeSetBonuses.length > 0" class="flex flex-col gap-2">
      <div
        v-for="bonus in itemStore.activeSetBonuses"
        :key="bonus.setId"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-yellow-400/30 bg-yellow-500/10"
      >
        <span class="flex-shrink-0 text-xl">{{ bonus.icon }}</span>
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="text-sm font-bold truncate text-yellow-300/90">{{ bonus.setName }}</span>
          <span class="text-xs text-yellow-200/60">{{ bonus.description }}</span>
        </div>
        <span
          class="flex-shrink-0 px-2 py-1 ml-auto text-xs font-bold border rounded-lg text-yellow-400/80 bg-yellow-500/15 border-yellow-400/20"
        >
          AKTIV
        </span>
      </div>
    </div>

    <!-- Kategorie-Tabs -->
    <div class="flex gap-1.5">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="px-3 py-1.5 rounded-lg text-sm font-bold tracking-wide transition-all duration-200"
        :class="
          activeCategory === cat.id
            ? 'bg-white/15 text-white/80 border border-white/20'
            : 'text-white/35 hover:text-white/55 border border-transparent hover:bg-white/5'
        "
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
        class="relative flex flex-col gap-2 p-3 overflow-hidden transition-all duration-200 border group rounded-xl"
        :class="[
          rarityCardClass(item.rarity),
          canAfford(item)
            ? 'cursor-pointer hover:scale-[1.02] hover:brightness-110'
            : 'cursor-not-allowed opacity-50',
        ]"
        @click="buyItem(item)"
      >
        <!-- Rarity Glow -->
        <div
          class="absolute inset-0 transition-opacity duration-300 opacity-0 pointer-events-none rounded-xl group-hover:opacity-100"
          :class="rarityGlowClass(item.rarity)"
        />

        <!-- Icon + Badges -->
        <div class="relative z-10 flex items-start justify-between gap-1">
          <div
            class="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-lg"
            :class="rarityIconBg(item.rarity)"
          >
            <img v-if="item.icon.startsWith('/')" :src="item.icon" class="w-10 h-10 object-contain" />
            <span v-else class="text-2xl">{{ item.icon }}</span>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span
              v-if="(itemStore.ownedItems[item.id] ?? 0) > 0"
              class="text-xs font-bold px-1.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
            >
              ×{{ itemStore.ownedItems[item.id] }}
            </span>
            <span
              v-if="item.setId"
              class="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              :class="setTagClass(item.setId)"
            >
              SET
            </span>
          </div>
        </div>

        <!-- Name -->
        <span class="relative z-10 text-sm font-bold leading-tight truncate text-white/85">
          {{ item.name }}
        </span>

        <!-- Effekt -->
        <span class="relative z-10 text-xs leading-snug text-emerald-400/90">
          {{ item.description }}
        </span>

        <!-- Kosten -->
        <div class="relative z-10 flex flex-col gap-1.5 mt-auto border-t border-white/[0.06] pt-2">
          <!-- Chime-Kosten -->
          <div class="flex items-center gap-1.5">
            <img src="/img/BardAbilities/BardChime.png" class="flex-shrink-0 w-4 h-4" />
            <span
              class="text-sm font-bold"
              :class="gameStore.chimes >= item.price ? 'text-yellow-300/80' : 'text-red-400/60'"
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
              <img :src="getMaterialImage(String(matId))" class="flex-shrink-0 w-4 h-4 rounded" />
              <span
                class="text-xs font-bold"
                :class="hasMaterial(String(matId), qty) ? 'text-white/70' : 'text-red-400/60'"
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
