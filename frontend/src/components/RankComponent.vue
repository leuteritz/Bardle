<template>
  <div class="flex items-center gap-2">
    <img :src="rankIcon" alt="Rank Icon" class="object-contain w-24 h-24 drop-shadow-lg" />
    <div class="flex flex-col">
      <span class="text-2xl font-bold text-amber-100">{{ tier }} {{ division }}</span>
      <span class="text-sm font-normal text-amber-200">{{ lp }} LP</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'RankComponent',
  props: {
    tier: String,
    division: String,
    lp: Number,
  },
  setup(props) {
    const rankIcon = computed(() => {
      switch (props.tier) {
        case 'Iron':
          return '/img/RankBorder/RankIron.png'
        case 'Bronze':
          return '/img/RankBorder/RankBronze.png'
        case 'Silver':
          return '/img/RankBorder/RankSilver.png'
        case 'Gold':
          return '/img/RankBorder/RankGold.png'
        case 'Platinum':
          return '/img/RankBorder/RankPlatin.png'
        case 'Emerald':
          return '/img/RankBorder/RankEmerald.png'
        case 'Diamond':
          return '/img/RankBorder/RankDiamand.png'
        case 'Master':
          return '/img/RankBorder/RankMaster.png'
        case 'Grandmaster':
          return '/img/RankBorder/RankGrandMaster.png'
        case 'Challenger':
          return '/img/RankBorder/RankChallenger.png'
        default:
          return '/img/iron.png'
      }
    })
    return { rankIcon }
  },
})
</script>
