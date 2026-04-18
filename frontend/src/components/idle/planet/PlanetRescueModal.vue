<template>
  <Transition name="boss-entrance">
    <div
      v-if="bossStore.bossModalOpen"
      class="battle-backdrop"
      :class="{ 'battle-backdrop--shaking': isShaking }"
      aria-modal="true"
      role="dialog"
      @click.self="bossStore.closeBossModal()"
    >
      <div class="atmosphere" :class="{ 'atmosphere--galaxy': isGalaxyBoss }">
        <span v-for="i in 24" :key="i" class="ember" :style="emberStyle(i)" />
      </div>

      <div class="battle-modal" :class="{ 'battle-modal--galaxy': isGalaxyBoss }">
        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />

        <!-- ── Boss Name Banner ──────────────────────────────────────────── -->
        <div class="name-banner" :class="{ 'name-banner--galaxy': isGalaxyBoss }">
          <div v-if="isGalaxyBoss" class="boss-type-badge boss-type-badge--galaxy">
            ✦ GALAXIE-BOSS ✦
          </div>
          <h2 class="boss-name" :class="{ 'boss-name--galaxy': isGalaxyBoss }">
            {{ bossStore.activeBoss?.bossName ?? 'Planet Boss' }}
          </h2>
        </div>

        <!-- ── Rewards ───────────────────────────────────────────────────── -->
        <BossRewardSection
          :is-galaxy-boss="isGalaxyBoss"
          :reward-slots="rewardSlots"
          :home-planet-champion="homePlanetChampion"
          :home-planet-champion-image="homePlanetChampionImage"
        />

        <!-- ── Battle Arena ──────────────────────────────────────────────── -->
        <BossArenaSection
          :is-galaxy-boss="isGalaxyBoss"
          :boss-h-p-percent="bossStore.bossHPPercent"
          :seconds-remaining="secondsRemaining"
          :enrage-percent="enragePercent"
          :team-champions="teamChampions"
          :get-champion-image="battleStore.getChampionImage"
          :active-boss="bossStore.activeBoss"
          @shake="handleShake"
        />

        <!-- ── HP Bar ────────────────────────────────────────────────────── -->
        <div class="hp-section">
          <!-- ... unveränderter HP-Bar-Block ... -->
        </div>

        <div class="scanlines" aria-hidden="true" />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useBattleStore } from '@/stores/battleStore'
import { formatNumber } from '@/config/numberFormat'
import BossArenaSection from '@/components/idle/planet/BossArenaSection.vue'
import BossRewardSection from '@/components/idle/planet/BossRewardSection.vue' // ← NEU
import type { PlanetBossRewardSlot } from '@/types'

const bossStore = usePlanetBossStore()
const battleStore = useBattleStore()

const teamChampions = computed<string[]>(() => battleStore.selectedChampions.slice(0, 4))
const isShaking = ref(false)
const now = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 200)
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

const secondsRemaining = computed(() => {
  const boss = bossStore.activeBoss
  if (!boss || !bossStore.isBossActive) return 0
  return Math.max(0, Math.ceil((boss.enrageTimerMs - (now.value - boss.startTime)) / 1000))
})

const enragePercent = computed(() => {
  const boss = bossStore.activeBoss
  if (!boss || !bossStore.isBossActive) return 0
  const remaining = Math.max(0, boss.enrageTimerMs - (now.value - boss.startTime))
  return (remaining / boss.enrageTimerMs) * 100
})

const isGalaxyBoss = computed(() => bossStore.activeBoss?.isGalaxyBoss ?? false)
const rewardSlots = computed(() => bossStore.activeBoss?.rewardSlots ?? [])

const homePlanetChampion = computed(() => bossStore.activeBoss?.homePlanetChampion ?? null)
const homePlanetChampionImage = computed(() => {
  const name = homePlanetChampion.value
  if (!name) return null
  return name === 'Bard' ? '/img/BardAbilities/Bard.png' : `/img/champion/${name}.jpg`
})

function emberStyle(i: number): Record<string, string> {
  const duration = 1.8 + (i % 6) * 0.7
  const delay = (i % 11) * -0.35
  const left = (i * 4.17) % 100
  const size = 1.5 + (i % 3)
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    opacity: `${0.4 + (i % 4) * 0.15}`,
  }
}

watch(
  () => bossStore.isBossActive,
  (active) => {
    if (!active) bossStore.closeBossModal()
  },
)

function handleShake(ms: number) {
  isShaking.value = true
  setTimeout(() => {
    isShaking.value = false
  }, ms)
}
</script>

<!-- styles bleiben identisch, nur reward-preview/slots/champion-Klassen können entfernt werden -->
