<template>
  <div class="announce-layer">
    <!-- out-in: the leaving banner is fully gone before the next enters, so a
         replacement can never sit beside it in the flex row and shove it sideways -->
    <Transition name="announce" mode="out-in">
      <div
        v-if="current"
        :key="current.id"
        class="banner"
        :class="[teamClass, kindClass]"
      >
        <div class="banner-goldline banner-goldline--top" />
        <div class="banner-sweep" />

        <!-- Portrait -->
        <div class="banner-portrait-wrap">
          <Icon
            v-if="isStructureKind"
            icon="game-icons:watchtower"
            class="banner-structure-icon"
            :class="current.team === 1 ? 'structure-icon--blue' : 'structure-icon--red'"
          />
          <img v-else :src="portraitSrc" :alt="current.name" class="banner-portrait" :class="portraitClass" />
        </div>

        <!-- Text -->
        <div class="banner-text">
          <div class="banner-headline" :class="headlineClass">{{ headline }}</div>
          <div v-if="subline" class="banner-sub">{{ subline }}</div>
        </div>

        <div class="banner-goldline banner-goldline--bottom" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { multikillLabel } from '@/utils/battleMovement'
import {
  ANNOUNCE_DISPLAY_MS,
  ANNOUNCE_QUEUE_MAX,
  ANNOUNCE_FRESHNESS_GAME_SECONDS,
} from '@/config/constants'

interface Announcement {
  id: number
  kind: 'multikill' | 'firstblood' | 'drake' | 'baron' | 'turret' | 'inhibitor'
  tier?: 2 | 3 | 4 | 5
  name: string
  team: 1 | 2
  lane?: 'top' | 'mid' | 'bot'
}

const battleStore = useBattleStore()

const queue = ref<Announcement[]>([])
const current = ref<Announcement | null>(null)
let idCounter = 0
let displayTimer: ReturnType<typeof setTimeout> | null = null

function canAnnounce(): boolean {
  return battleStore.battlePhase === 'playing' && document.visibilityState === 'visible'
}

function enqueue(a: Omit<Announcement, 'id'>) {
  if (!canAnnounce()) return
  if (queue.value.length >= ANNOUNCE_QUEUE_MAX) queue.value.shift()
  queue.value.push({ ...a, id: ++idCounter })
  // A fresh event preempts the banner on screen: drop it immediately so the
  // new one can spawn centered instead of queueing behind a stale message.
  if (current.value) {
    if (displayTimer) {
      clearTimeout(displayTimer)
      displayTimer = null
    }
    current.value = null
  }
  pump()
}

function pump() {
  if (current.value || queue.value.length === 0) return
  current.value = queue.value.shift() ?? null
  if (!current.value) return
  displayTimer = setTimeout(() => {
    current.value = null
    displayTimer = null
    pump()
  }, ANNOUNCE_DISPLAY_MS)
}

// ── Multikill / First Blood from the kill feed ──
// Several feed entries can arrive batched in one sim tick; scan everything new
// and announce only the highest multikill tier of the batch (PENTA beats the
// DOUBLE/TRIPLE/QUADRA steps that led up to it).
let lastSeenFeedTime = -1
watch(
  () => battleStore.killFeed.length + (battleStore.killFeed.at(-1)?.t ?? 0),
  () => {
    const fresh = battleStore.killFeed.filter(
      (e) => e.t > lastSeenFeedTime && e.t >= battleStore.battleTime - ANNOUNCE_FRESHNESS_GAME_SECONDS,
    )
    if (battleStore.killFeed.length > 0) {
      lastSeenFeedTime = Math.max(lastSeenFeedTime, battleStore.killFeed.at(-1)!.t)
    }
    if (fresh.length === 0) return

    const firstBlood = fresh.find((e) => e.firstBlood)
    if (firstBlood) {
      enqueue({ kind: 'firstblood', name: firstBlood.killerName, team: firstBlood.killerTeam })
    }
    let best: (typeof fresh)[number] | null = null
    for (const e of fresh) {
      if (e.multikillTier && e.multikillTier >= 2 && (!best || e.multikillTier > (best.multikillTier ?? 0))) {
        best = e
      }
    }
    if (best) {
      enqueue({ kind: 'multikill', tier: best.multikillTier, name: best.killerName, team: best.killerTeam })
    }
  },
)

// ── Turret / inhibitor falls from the structure feed ──
// Freshness-gated like the kill feed so background catch-up after a tab
// return replays silently instead of spamming banners.
let lastSeenStructureTime = -1
watch(
  () => battleStore.structureFeed.length + (battleStore.structureFeed.at(-1)?.t ?? 0),
  () => {
    const fresh = battleStore.structureFeed.filter(
      (e) => e.t > lastSeenStructureTime && e.t >= battleStore.battleTime - ANNOUNCE_FRESHNESS_GAME_SECONDS,
    )
    if (battleStore.structureFeed.length > 0) {
      lastSeenStructureTime = Math.max(lastSeenStructureTime, battleStore.structureFeed.at(-1)!.t)
    }
    for (const e of fresh) {
      enqueue({
        kind: e.tier === 'inhibitor' ? 'inhibitor' : 'turret',
        name: '',
        team: e.team,
        lane: e.lane,
      })
    }
  },
)

// ── Drake / Baron kills from the team counters ──
watch(
  () => battleStore.team1Drakes + battleStore.team2Drakes,
  (now, prev) => {
    if (now > (prev ?? 0) && battleStore.drakeKilledByTeam !== null) {
      enqueue({ kind: 'drake', name: '', team: battleStore.drakeKilledByTeam })
    }
  },
)
watch(
  () => battleStore.team1Barons + battleStore.team2Barons,
  (now, prev) => {
    if (now > (prev ?? 0) && battleStore.baronKilledByTeam !== null) {
      enqueue({ kind: 'baron', name: '', team: battleStore.baronKilledByTeam })
    }
  },
)

// Reset on new battle so stale banners never leak across matches
watch(
  () => battleStore.currentBattleId,
  () => {
    queue.value = []
    current.value = null
    lastSeenFeedTime = -1
    lastSeenStructureTime = -1
    if (displayTimer) {
      clearTimeout(displayTimer)
      displayTimer = null
    }
  },
)

onBeforeUnmount(() => {
  if (displayTimer) clearTimeout(displayTimer)
})

// ── Presentation ──
const teamClass = computed(() =>
  current.value?.team === 1 ? 'banner--blue' : 'banner--red',
)
const kindClass = computed(() => `banner--${current.value?.kind ?? 'multikill'}`)

const portraitSrc = computed(() => {
  const a = current.value
  if (!a) return ''
  if (a.kind === 'drake') return '/img/dragon.png'
  if (a.kind === 'baron') return '/img/baron.png'
  return battleStore.getChampionImage(a.name)
})

const portraitClass = computed(() => {
  const a = current.value
  if (!a) return ''
  if (a.kind === 'drake') return 'portrait--drake'
  if (a.kind === 'baron') return 'portrait--baron'
  return a.team === 1 ? 'portrait--blue' : 'portrait--red'
})

const isStructureKind = computed(
  () => current.value?.kind === 'turret' || current.value?.kind === 'inhibitor',
)

const headline = computed(() => {
  const a = current.value
  if (!a) return ''
  switch (a.kind) {
    case 'firstblood':
      return 'FIRST BLOOD!'
    case 'drake':
      return 'DRAKE SLAIN'
    case 'baron':
      return 'BARON SLAIN'
    case 'turret':
      return 'TURRET DESTROYED'
    case 'inhibitor':
      return 'INHIBITOR DESTROYED'
    default:
      return `${multikillLabel(a.tier ?? 2)}!`
  }
})

const headlineClass = computed(() => {
  const a = current.value
  if (!a) return ''
  if (a.kind === 'firstblood') return 'headline--firstblood'
  if (a.kind === 'drake') return 'headline--drake'
  if (a.kind === 'baron') return 'headline--baron'
  if (a.kind === 'turret') return 'headline--turret'
  if (a.kind === 'inhibitor') return 'headline--inhibitor'
  return `headline--tier${a.tier ?? 2}`
})

const subline = computed(() => {
  const a = current.value
  if (!a) return ''
  // No team names — keep the sub line short and punchy.
  if (a.kind === 'drake' || a.kind === 'baron') return 'SECURED'
  if (a.kind === 'turret' || a.kind === 'inhibitor') {
    return a.lane ? `${a.lane.toUpperCase()} LANE` : 'NEXUS SIEGE'
  }
  return a.name
})
</script>

<style scoped>
.announce-layer {
  position: absolute;
  top: 27%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 45;
}

/* ── Banner shell ──
   Sizes in cq units so the banner scales with the board on every desktop
   resolution; the event's accent hue drives hairlines and glow via --ac. */
.banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(12px, 1.9cqh, 22px);
  min-width: clamp(300px, 32cqw, 480px);
  max-width: min(640px, 60cqw);
  padding: clamp(9px, 1.5cqh, 18px) clamp(24px, 2.8cqw, 46px);
  background: linear-gradient(to right, rgba(17, 16, 8, 0), rgba(14, 13, 8, 0.94) 16%, rgba(14, 13, 8, 0.94) 84%, rgba(17, 16, 8, 0));
  overflow: hidden;
  --ac: 232, 192, 64;
  box-shadow: -64px 0 72px -38px rgba(var(--ac), 0.6), 64px 0 72px -38px rgba(var(--ac), 0.6);
}
.banner--blue { --ac: 59, 130, 246; }
.banner--red { --ac: 239, 68, 68; }
.banner--drake { --ac: 34, 197, 94; }
.banner--baron { --ac: 168, 85, 247; }
.banner--inhibitor { --ac: 216, 100, 200; }

.banner-goldline {
  position: absolute;
  left: 8%;
  right: 8%;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(var(--ac), 0.9), transparent);
}
.banner-goldline--top { top: 0; }
.banner-goldline--bottom { bottom: 0; }

/* one-shot shine on entry — no idle looping */
.banner-sweep {
  position: absolute;
  top: 0;
  left: 0;
  width: 34%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 240, 200, 0.13), transparent);
  animation: banner-sweep 0.9s ease-out 0.15s both;
  pointer-events: none;
}

/* ── Portrait ── */
.banner-portrait-wrap {
  flex-shrink: 0;
  animation: portrait-punch 0.45s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.banner-portrait {
  width: clamp(44px, 7.4cqh, 68px);
  height: clamp(44px, 7.4cqh, 68px);
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid;
  display: block;
}
.portrait--blue {
  border-color: #60a5fa;
  box-shadow: 0 0 14px rgba(59, 130, 246, 0.8);
}
.portrait--red {
  border-color: #f87171;
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.7);
}
.portrait--drake {
  border-color: #22c55e;
  box-shadow: 0 0 14px rgba(34, 197, 94, 0.8);
}
.portrait--baron {
  border-color: #a855f7;
  box-shadow: 0 0 14px rgba(168, 85, 247, 0.8);
}
.banner-structure-icon {
  display: block;
  width: clamp(42px, 7cqh, 64px);
  height: clamp(42px, 7cqh, 64px);
  filter: drop-shadow(0 0 12px rgba(var(--ac), 0.7));
}
.structure-icon--blue {
  color: #60a5fa;
}
.structure-icon--red {
  color: #f87171;
}

/* ── Text ── */
.banner-text {
  min-width: 0;
}
.banner-headline {
  font-size: clamp(19px, 3.6cqh, 32px);
  font-weight: 700;
  letter-spacing: 3.5px;
  line-height: 1.1;
  white-space: nowrap;
  animation: headline-punch 0.45s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.headline--tier2 {
  color: #93c5fd;
  text-shadow: 0 0 16px rgba(96, 165, 250, 0.7);
}
.headline--tier3 {
  color: #7ce0a0;
  text-shadow: 0 0 16px rgba(110, 224, 160, 0.7);
}
.headline--tier4 {
  color: #e8c040;
  text-shadow: 0 0 18px rgba(232, 192, 64, 0.8);
}
.headline--tier5 {
  color: #ff9a40;
  text-shadow: 0 0 22px rgba(240, 104, 32, 0.9);
  animation: headline-punch 0.45s cubic-bezier(0.2, 1.6, 0.4, 1), penta-pulse 0.9s ease-in-out 0.45s infinite;
}
.headline--firstblood {
  color: #ff5a4a;
  text-shadow: 0 0 18px rgba(255, 60, 40, 0.8);
}
.headline--drake {
  color: #6ee0a0;
  text-shadow: 0 0 18px rgba(34, 197, 94, 0.8);
}
.headline--baron {
  color: #c9a0f5;
  text-shadow: 0 0 18px rgba(168, 85, 247, 0.8);
}
.headline--turret {
  color: #e8c040;
  text-shadow: 0 0 18px rgba(232, 192, 64, 0.8);
}
.headline--inhibitor {
  color: #e884d8;
  text-shadow: 0 0 18px rgba(216, 100, 200, 0.8);
}

.banner-sub {
  font-size: clamp(11px, 2cqh, 16px);
  letter-spacing: 2px;
  color: rgba(232, 226, 208, 0.6);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Enter / leave ──
   Spawns in place at the center: pure fade + scale, no directional travel. */
.announce-enter-active {
  transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.2, 1.4, 0.4, 1);
}
/* fast exit keeps the out-in gap short when a new event preempts */
.announce-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.announce-enter-from {
  opacity: 0;
  transform: scale(1.08);
}
.announce-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* ── Keyframes ── */
@keyframes banner-sweep {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(400%); }
}
@keyframes headline-punch {
  0% { transform: scale(1.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes portrait-punch {
  0% { transform: scale(0.4); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes penta-pulse {
  0%, 100% { text-shadow: 0 0 14px rgba(240, 104, 32, 0.5); }
  50% { text-shadow: 0 0 30px rgba(240, 104, 32, 1); }
}

@media (prefers-reduced-motion: reduce) {
  .banner-sweep,
  .banner-headline,
  .banner-portrait-wrap,
  .headline--tier5 {
    animation: none;
  }
}
</style>
