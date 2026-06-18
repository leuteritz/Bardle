<template>
  <Transition name="kill-banner">
    <div
      v-if="banner"
      class="kill-banner"
      :style="{ '--banner-glow': banner.glowColor, '--team-color': banner.teamColor }"
      aria-live="assertive"
      aria-atomic="true"
    >
      <!-- Gold top accent line -->
      <div class="kill-banner-topline" />

      <div class="kill-banner-body">
        <!-- Icon column -->
        <div class="kill-banner-icon-wrap">
          <div class="kill-banner-icon-ring" />
          <img :src="banner.icon" :alt="banner.title" class="kill-banner-icon-img" />
        </div>

        <!-- Vertical separator -->
        <div class="kill-banner-sep" />

        <!-- Text column -->
        <div class="kill-banner-text">
          <span class="kill-banner-title">{{ banner.title }}</span>
          <span class="kill-banner-subtitle">
            <span class="kill-banner-verb">Slain by</span>
            <span class="kill-banner-team">{{ banner.teamName }}</span>
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, ref, onUnmounted, watch } from 'vue'
import { useBattleStore } from '../../../stores/battleStore'
import { KILL_BANNER_DISPLAY_MS } from '../../../config/constants'

interface BannerState {
  title: string
  icon: string
  glowColor: string
  teamName: string
  teamColor: string
}

const BARON_GLOW = '#a855f7'
const DRAKE_GLOW = '#22c55e'
const BLUE_TEAM_COLOR = '#93c5fd'
const RED_TEAM_COLOR = '#fca5a5'

export default defineComponent({
  name: 'BattleKillBannerComponent',

  setup() {
    const battleStore = useBattleStore()
    const banner = ref<BannerState | null>(null)
    let dismissTimer: ReturnType<typeof setTimeout> | null = null

    function showBanner(state: BannerState) {
      if (dismissTimer) clearTimeout(dismissTimer)
      banner.value = state
      dismissTimer = setTimeout(() => {
        banner.value = null
      }, KILL_BANNER_DISPLAY_MS)
    }

    watch(
      () => battleStore.drakeKilledByTeam,
      (team) => {
        if (!team) return
        showBanner({
          title: 'THE DRAGON',
          icon: '/img/dragon.png',
          glowColor: DRAKE_GLOW,
          teamName: team === 1 ? 'Blue Team' : 'Red Team',
          teamColor: team === 1 ? BLUE_TEAM_COLOR : RED_TEAM_COLOR,
        })
      },
    )

    watch(
      () => battleStore.baronKilledByTeam,
      (team) => {
        if (!team) return
        showBanner({
          title: 'BARON NASHOR',
          icon: '/img/baron.png',
          glowColor: BARON_GLOW,
          teamName: team === 1 ? 'Blue Team' : 'Red Team',
          teamColor: team === 1 ? BLUE_TEAM_COLOR : RED_TEAM_COLOR,
        })
      },
    )

    onUnmounted(() => {
      if (dismissTimer) clearTimeout(dismissTimer)
    })

    return { banner }
  },
})
</script>

<style scoped>
.kill-banner {
  position: absolute;
  top: 8%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 55;
  width: clamp(300px, 75%, 520px);
  pointer-events: none;
  background: rgba(0, 0, 0, 0.82);
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 0 32px color-mix(in srgb, var(--banner-glow) 35%, transparent),
    0 12px 40px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

.kill-banner-topline {
  height: 3px;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
}

.kill-banner-body {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 14px 18px;
}

/* ── Icon ── */
.kill-banner-icon-wrap {
  position: relative;
  flex-shrink: 0;
  width: 72px;
  height: 72px;
}

.kill-banner-icon-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid var(--banner-glow);
  box-shadow:
    0 0 12px var(--banner-glow),
    0 0 28px color-mix(in srgb, var(--banner-glow) 40%, transparent);
  animation: banner-ring-pulse 1.8s ease-in-out infinite;
}

.kill-banner-icon-img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  border: 2px solid var(--banner-glow);
  box-shadow: 0 0 16px color-mix(in srgb, var(--banner-glow) 60%, transparent);
}

@keyframes banner-ring-pulse {
  0%, 100% { opacity: 0.9; transform: scale(1); }
  50%       { opacity: 0.25; transform: scale(1.12); }
}

/* ── Separator ── */
.kill-banner-sep {
  align-self: stretch;
  width: 1px;
  margin: 0 18px;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--banner-glow) 20%,
    var(--banner-glow) 80%,
    transparent
  );
  box-shadow: 0 0 6px var(--banner-glow);
  flex-shrink: 0;
}

/* ── Text ── */
.kill-banner-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.kill-banner-title {
  display: block;
  font-size: clamp(1.8rem, 3.2vw, 3rem);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e8c040;
  text-shadow:
    0 0 16px rgba(232, 192, 64, 0.7),
    0 0 32px rgba(232, 192, 64, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.9);
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kill-banner-subtitle {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.kill-banner-verb {
  font-size: clamp(1rem, 1.8vw, 1.5rem);
  font-weight: 500;
  color: rgba(200, 185, 140, 0.75);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}

.kill-banner-team {
  font-size: clamp(1rem, 1.8vw, 1.5rem);
  font-weight: 700;
  color: var(--team-color);
  text-shadow:
    0 0 10px color-mix(in srgb, var(--team-color) 50%, transparent),
    0 1px 4px rgba(0, 0, 0, 0.8);
}

/* ── Transition ── */
.kill-banner-enter-active {
  transition:
    opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.kill-banner-leave-active {
  transition: opacity 0.3s ease;
}
.kill-banner-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
.kill-banner-leave-to {
  opacity: 0;
  transform: translateX(-50%);
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .kill-banner-enter-active,
  .kill-banner-leave-active {
    transition: opacity 0.25s ease;
  }
  .kill-banner-enter-from,
  .kill-banner-leave-to {
    transform: translateX(-50%);
  }
  .kill-banner-icon-ring {
    animation: none;
  }
}
</style>
