<template>
  <!-- ZWEI Spuren in EINER Flex-Achse: oben die Zeremonie, darunter der
       Quittungsstapel. Dass die beiden sich nie überlappen, ist deshalb keine
       Rechnung, sondern Layout — ohne Zeremonie nimmt die obere Zeile keine
       Höhe ein und der Stapel rückt hoch. -->
  <div class="herald-layer">
    <div class="herald-ceremony" aria-hidden="true">
      <!-- out-in: the leaving banner is fully gone before the next enters, so a
           preempting replacement can never sit beside it and shove it sideways -->
      <Transition name="herald" mode="out-in">
        <!-- Die Form steckt in HeraldBanner und wird mit den Quittungen geteilt;
             hier bleibt nur, WANN sie erscheint. Einzeln gebunden statt
             `v-bind="current"`: `kind` und `id` sind Ablauf-Felder und hätten
             als Fallthrough-Attribute nichts am Wurzelelement zu suchen. -->
        <HeraldBanner
          v-if="current"
          :key="current.id"
          size="ceremony"
          :accent="current.accent"
          :eyebrow="current.eyebrow"
          :headline="current.headline"
          :subline="current.subline"
          :image-src="current.imageSrc"
          :icon="current.icon"
          :round="current.round"
        />
      </Transition>
    </div>

    <HeraldReceiptStack />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useHerald } from '@/composables/ui/useHerald'
import { useBadgeHeralds } from '@/composables/ui/useBadgeHeralds'
import HeraldBanner from './HeraldBanner.vue'
import HeraldReceiptStack from './HeraldReceiptStack.vue'
import { hexToRgbTriple } from '@/utils/ui/format'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import {
  RANK_TIERS,
  RANK_DIVISIONS,
  RANK_EMBLEM_IMAGES,
  RANK_TIER_COLORS,
  HERALD_ACCENT_WARP,
  HERALD_ACCENT_CHAMPION,
  HERALD_ARM_DELAY_MS,
} from '@/config/constants'

const { current, announce, reset } = useHerald()
const galaxyStore = useGalaxyStore()
const battleStore = useBattleStore()

// Die Notify-Marken melden sich über die kompakte `ready`-Fassung. Eigene Datei,
// aber derselbe Ort der Anmeldung wie die Meilensteine unten.
useBadgeHeralds()

// ── Arming ──
// loadGame() replays the whole save into the stores right after mount, jumping
// galaxy/rank/champions to their loaded values. Those are not real milestones,
// so heralds stay disarmed for a grace period; the champion set is seeded so
// already-unlocked champions never announce retroactively.
let armed = false
let armTimer: ReturnType<typeof setTimeout> | null = null
const seenChampions = new Set<string>()
// Champions unlocked (home-planet boss defeated) but not yet heralded — held
// until the next champion-star approach flight departs, see below.
const pendingChampions: string[] = []
// A completed warp waiting to be heralded — likewise deferred to the first
// champion-star approach of the new galaxy (after its role selection).
let pendingWarp: { headline: string; subline: string } | null = null

function canAnnounce(): boolean {
  return armed && document.visibilityState === 'visible'
}

onMounted(() => {
  armTimer = setTimeout(() => {
    for (const name of battleStore.newlyUnlockedChampions) seenChampions.add(name)
    // Anything buffered before arming came from loadGame(), not a real event.
    pendingChampions.length = 0
    pendingWarp = null
    armed = true
    armTimer = null
  }, HERALD_ARM_DELAY_MS)
})

onBeforeUnmount(() => {
  if (armTimer) clearTimeout(armTimer)
  reset()
})

// ── Warp / new galaxy ──
// Buffer the warp; the new galaxy's first champion-star approach reveals it, so
// the banner lands after the player has picked the role for that first star —
// same beat as the champion herald. The theme + galaxy number are already set
// by commitAdvance() at this point, so capture them now.
watch(
  () => galaxyStore.currentGalaxy,
  (now, prev) => {
    if (now <= (prev ?? now)) return
    const theme = GALAXY_THEMES[galaxyStore.currentThemeIndex]
    pendingWarp = {
      headline: theme?.name ?? 'Unknown Reaches',
      subline: `Galaxy ${now} reached`,
    }
  },
)

// ── New champion available in the shop ──
// Don't herald at unlock time (home-planet boss defeat). Buffer the champion and
// let the champion-star approach flight below reveal it, so the banner lands on
// the visible departure moment right after the player has picked the next role.
watch(
  () => battleStore.newlyUnlockedChampions.length,
  () => {
    for (const name of battleStore.newlyUnlockedChampions) {
      if (seenChampions.has(name)) continue
      seenChampions.add(name)
      pendingChampions.push(name)
    }
  },
)

// The approach flight starts (championTravelState → 'traveling'). Flush the
// buffered warp + champions as the ship departs for the next champion star — but
// never on a flight to the galaxy-boss core (no champion is waiting there).
// Warp first ("welcome to the new galaxy"), then the champions it carried over.
watch(
  () => galaxyStore.championTravelState,
  (now, prev) => {
    if (now !== 'traveling' || prev === 'traveling') return
    if (galaxyStore.travelingToGalaxyBoss) return
    if (!canAnnounce()) return
    if (!pendingWarp && pendingChampions.length === 0) return
    if (pendingWarp) {
      announce({
        kind: 'warp',
        eyebrow: 'WARP COMPLETE',
        headline: pendingWarp.headline,
        subline: pendingWarp.subline,
        icon: 'game-icons:spiral-thrust',
        accent: HERALD_ACCENT_WARP,
      })
      pendingWarp = null
    }
    for (const name of pendingChampions) {
      announce({
        kind: 'champion',
        eyebrow: 'NEW CHAMPION',
        headline: name,
        subline: 'Now available in the Shop',
        imageSrc: battleStore.getChampionImage(name, { size: 'md' }),
        accent: HERALD_ACCENT_CHAMPION,
        round: true,
      })
    }
    pendingChampions.length = 0
  },
)

// ── Rank promotion in the auto-battle ──
// A single monotonic ordinal across tiers + divisions; Master+ carry no
// division so they clamp to the top division slot and still increase per tier.
const rankOrdinal = computed(() => {
  const t = RANK_TIERS.indexOf(battleStore.currentRank.tier as (typeof RANK_TIERS)[number])
  const d = RANK_DIVISIONS.indexOf(
    battleStore.currentRank.division as (typeof RANK_DIVISIONS)[number],
  )
  return t * RANK_DIVISIONS.length + (d < 0 ? RANK_DIVISIONS.length - 1 : d)
})

const TIERS_WITHOUT_DIVISION = ['Master', 'Grandmaster', 'Challenger']

watch(rankOrdinal, (now, prev) => {
  if (!canAnnounce() || now <= prev) return
  const tier = battleStore.currentRank.tier
  const division = battleStore.currentRank.division
  const showDivision = !TIERS_WITHOUT_DIVISION.includes(tier)
  announce({
    kind: 'rankup',
    eyebrow: 'PROMOTED',
    headline: showDivision ? `${tier} ${division}` : tier,
    subline: 'Ranked up',
    imageSrc: RANK_EMBLEM_IMAGES[tier],
    accent: hexToRgbTriple(RANK_TIER_COLORS[tier] ?? '#e8c040'),
    round: false,
  })
})
</script>

<style scoped>
/* Fixed, viewport-centered so warp/champion (idle board) and rank-ups (during
   an auto-battle, any tab) all land in the same upper-middle spot. Never blocks
   input — purely celebratory.
 *
 * Die Achse trägt BEIDE Spuren: Zeremonie oben, Quittungsstapel darunter. Der
 * Anker sitzt bei 22 % statt wie früher bei 32 %, weil unter ihm jetzt bis zu
 * drei Karten Platz brauchen.
 *
 * z-index 9700, nicht 9500: die Supernova-Überblendung liegt auf 9600, und
 * genau während sie läuft, meldet sich der Sternkollaps als Quittung — auf 9500
 * läge sie darunter. Weiterhin UNTER Pause-Overlay (9998) und Bottom-Bar
 * (10000): der Herold darf das Chrome nicht überdecken. */
.herald-layer {
  position: fixed;
  top: 22%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(10px, 1.2vh, 18px);
  pointer-events: none;
  z-index: 9700;
}

/* ── Enter / leave: spawn in place, pure fade + scale ── */
.herald-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.3s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.herald-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.herald-enter-from {
  opacity: 0;
  transform: scale(1.08);
}
.herald-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

</style>
