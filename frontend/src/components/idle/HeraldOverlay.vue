<template>
  <div class="herald-layer" aria-hidden="true">
    <!-- out-in: the leaving banner is fully gone before the next enters, so a
         preempting replacement can never sit beside it and shove it sideways -->
    <Transition name="herald" mode="out-in">
      <div
        v-if="current"
        :key="current.id"
        class="herald"
        :class="`herald--${current.kind}`"
        :style="{ '--ac': current.accent }"
      >
        <div class="herald-goldline herald-goldline--top" />
        <div class="herald-sweep" />

        <!-- Visual: image (champion portrait / rank emblem) or icon medallion -->
        <div class="herald-visual">
          <img
            v-if="current.imageSrc"
            :src="current.imageSrc"
            alt=""
            class="herald-img"
            :class="current.round ? 'herald-img--round' : 'herald-img--emblem'"
          />
          <span v-else-if="current.icon" class="herald-medallion">
            <Icon :icon="current.icon" width="40" height="40" class="herald-icon" />
          </span>
        </div>

        <!-- Text -->
        <div class="herald-text">
          <div class="herald-eyebrow">{{ current.eyebrow }}</div>
          <div class="herald-headline">{{ current.headline }}</div>
          <div v-if="current.subline" class="herald-sub">{{ current.subline }}</div>
        </div>

        <div class="herald-goldline herald-goldline--bottom" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useHerald } from '@/composables/useHerald'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useBattleStore } from '@/stores/battleStore'
import { GALAXY_THEMES } from '@/config/galaxyThemes'
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

function canAnnounce(): boolean {
  return armed && document.visibilityState === 'visible'
}

onMounted(() => {
  armTimer = setTimeout(() => {
    for (const name of battleStore.newlyUnlockedChampions) seenChampions.add(name)
    // Anything buffered before arming came from loadGame(), not a real unlock.
    pendingChampions.length = 0
    armed = true
    armTimer = null
  }, HERALD_ARM_DELAY_MS)
})

onBeforeUnmount(() => {
  if (armTimer) clearTimeout(armTimer)
  reset()
})

// ── Warp / new galaxy ──
watch(
  () => galaxyStore.currentGalaxy,
  (now, prev) => {
    if (!canAnnounce() || now <= (prev ?? now)) return
    const theme = GALAXY_THEMES[galaxyStore.currentThemeIndex]
    announce({
      kind: 'warp',
      eyebrow: 'WARP COMPLETE',
      headline: theme?.name ?? 'Unknown Reaches',
      subline: `Galaxy ${now} reached`,
      icon: 'game-icons:spiral-thrust',
      accent: HERALD_ACCENT_WARP,
    })
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
// buffered champions as the ship departs for the next champion star — but never
// on a flight to the galaxy-boss core (no champion is waiting there).
watch(
  () => galaxyStore.championTravelState,
  (now, prev) => {
    if (now !== 'traveling' || prev === 'traveling') return
    if (galaxyStore.travelingToGalaxyBoss) return
    if (!canAnnounce() || pendingChampions.length === 0) return
    for (const name of pendingChampions) {
      announce({
        kind: 'champion',
        eyebrow: 'NEW CHAMPION',
        headline: name,
        subline: 'Now available in the Shop',
        imageSrc: battleStore.getChampionImage(name),
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

// "#e8c040" → "232, 192, 64" for the rgba() accent driver
function hexToRgbTriple(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}
</script>

<style scoped>
/* Fixed, viewport-centered so warp/champion (idle board) and rank-ups (during
   an auto-battle, any tab) all land in the same upper-middle spot. Never blocks
   input — purely celebratory. Sits below the bottom bar (z-10000) but above the
   idle scene and profile modals. */
.herald-layer {
  position: fixed;
  top: 32%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 9500;
}

/* ── Banner shell ── */
.herald {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(14px, 1.6vw, 26px);
  min-width: clamp(320px, 30vw, 560px);
  max-width: min(680px, 46vw);
  padding: clamp(12px, 1.4vh, 22px) clamp(28px, 2.4vw, 52px);
  background: linear-gradient(
    to right,
    rgba(17, 16, 8, 0),
    rgba(14, 13, 8, 0.95) 16%,
    rgba(14, 13, 8, 0.95) 84%,
    rgba(17, 16, 8, 0)
  );
  overflow: hidden;
  box-shadow:
    -72px 0 82px -40px rgba(var(--ac), 0.6),
    72px 0 82px -40px rgba(var(--ac), 0.6);
}

.herald-goldline {
  position: absolute;
  left: 8%;
  right: 8%;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(var(--ac), 0.9), transparent);
}
.herald-goldline--top {
  top: 0;
}
.herald-goldline--bottom {
  bottom: 0;
}

/* one-shot shine on entry — no idle looping */
.herald-sweep {
  position: absolute;
  top: 0;
  left: 0;
  width: 34%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 240, 200, 0.13), transparent);
  animation: herald-sweep 0.9s ease-out 0.15s both;
  pointer-events: none;
}

/* ── Visual ── */
.herald-visual {
  flex-shrink: 0;
  animation: herald-visual-punch 0.45s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.herald-img {
  display: block;
  width: clamp(52px, 4.6vw, 78px);
  height: clamp(52px, 4.6vw, 78px);
}
.herald-img--round {
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(var(--ac), 0.9);
  box-shadow: 0 0 16px rgba(var(--ac), 0.7);
}
.herald-img--emblem {
  object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(var(--ac), 0.75));
}
.herald-medallion {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(52px, 4.6vw, 78px);
  height: clamp(52px, 4.6vw, 78px);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 42%, rgba(var(--ac), 0.28), rgba(10, 9, 6, 0.6) 72%);
  border: 2px solid rgba(var(--ac), 0.85);
  box-shadow:
    0 0 18px rgba(var(--ac), 0.6),
    inset 0 0 14px rgba(var(--ac), 0.35);
}
.herald-icon {
  color: rgb(var(--ac));
  filter: drop-shadow(0 0 6px rgba(var(--ac), 0.8));
}

/* ── Text ── */
.herald-text {
  min-width: 0;
}
.herald-eyebrow {
  font-size: clamp(10px, 0.85vw, 14px);
  letter-spacing: 4px;
  color: rgba(var(--ac), 0.92);
  text-shadow: 0 0 10px rgba(var(--ac), 0.5);
  margin-bottom: 3px;
}
.herald-headline {
  font-size: clamp(24px, 2.6vw, 42px);
  font-weight: 700;
  letter-spacing: 2px;
  line-height: 1.08;
  white-space: nowrap;
  color: #f4ecd4;
  text-shadow:
    0 0 20px rgba(var(--ac), 0.55),
    0 2px 6px rgba(0, 0, 0, 0.85);
  animation: herald-headline-punch 0.45s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.herald-sub {
  font-size: clamp(12px, 1.05vw, 17px);
  letter-spacing: 2px;
  color: rgba(232, 226, 208, 0.62);
  margin-top: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* ── Keyframes ── */
@keyframes herald-sweep {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(400%);
  }
}
@keyframes herald-headline-punch {
  0% {
    transform: scale(1.4);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes herald-visual-punch {
  0% {
    transform: scale(0.4);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Full HD / WUXGA (flattest viewports): trim ~16% so the banner never crowds
   the board. 2K/4K keep the larger default sizes above. */
@media (max-height: 1100px) {
  .herald {
    gap: clamp(10px, 1.2vw, 18px);
    min-width: clamp(260px, 24vw, 420px);
    max-width: min(520px, 40vw);
    padding: clamp(9px, 1.1vh, 15px) clamp(20px, 1.9vw, 38px);
  }
  .herald-img,
  .herald-medallion {
    width: clamp(44px, 3.6vw, 60px);
    height: clamp(44px, 3.6vw, 60px);
  }
  .herald-headline {
    font-size: clamp(20px, 2vw, 32px);
    letter-spacing: 1.5px;
  }
  .herald-sub {
    font-size: clamp(11px, 0.85vw, 14px);
  }
  .herald-eyebrow {
    font-size: clamp(9px, 0.7vw, 12px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .herald-sweep,
  .herald-headline,
  .herald-visual {
    animation: none;
  }
}
</style>
