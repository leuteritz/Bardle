<template>
  <div class="ec-panel">

    <!-- ── Header ───────────────────────────────────────────── -->
    <div class="ec-header">
      <div class="ec-header-top">
        <!-- Big Timer (center, dominant) -->
        <div class="ec-header-timer-wrap">
          <div v-if="expeditionStore.availableExpeditions.length >= EXPEDITION_MAX_AVAILABLE" class="ec-header-timer">FULL</div>
          <div v-else class="ec-header-timer">{{ formatCountdown(timeUntilNextSpawn) }}</div>
          <div class="ec-header-timer-label">
            <span v-if="expeditionStore.availableExpeditions.length >= EXPEDITION_MAX_AVAILABLE">
              All slots filled · {{ expeditionStore.availableExpeditions.length }}/{{ EXPEDITION_MAX_AVAILABLE }}
            </span>
            <span v-else-if="expeditionStore.availableExpeditions.length === 0">next expedition</span>
            <span v-else>next slot · {{ expeditionStore.availableExpeditions.length }}/{{ EXPEDITION_MAX_AVAILABLE }}</span>
          </div>
        </div>

        <!-- Close button -->
        <button class="modal-close-btn" @click.stop="closePanel" aria-label="Close expeditions">✕</button>
      </div>

      <!-- Action bar: Send All | Admin+Active | Collect All -->
      <div class="ec-action-bar">
        <!-- Send All -->
        <div class="ec-bulk-slot ec-bulk-slot--left">
          <button
            class="ec-bulk-btn ec-bulk-btn--send"
            :class="{ 'ec-bulk-btn--muted': !canSendAll }"
            :disabled="!canSendAll"
            @click.stop="sendAll"
            aria-label="Send all available expeditions"
          >
            <Icon icon="game-icons:camping-tent" width="14" height="14" />
            Send All
          </button>
        </div>

        <!-- Center: Admin Spawn (DEV only) -->
        <div class="ec-bulk-slot ec-bulk-slot--center">
          <button
            v-if="isDev"
            class="ec-admin-btn"
            @click.stop="expeditionStore.forceSpawn()"
            aria-label="Force spawn expedition (dev)"
          >
            <Icon icon="game-icons:lightning-bolt" width="11" height="11" />
            Spawn
          </button>
        </div>

        <!-- Collect All -->
        <div
          class="ec-bulk-slot ec-bulk-slot--right"
          @mouseenter="activeCount > 0 && (cancelCollectHide(), showCollectDropdown = true)"
          @mouseleave="scheduleCollectHide"
        >
          <button
            class="ec-bulk-btn ec-bulk-btn--collect"
            :class="{
              'is-ready': readyCount > 0,
              'is-flashing': collectFlashing,
              'is-monitoring': activeCount > 0 && readyCount === 0,
              'ec-bulk-btn--muted': activeCount === 0,
            }"
            :disabled="readyCount === 0"
            @click.stop="collectAll"
            aria-label="Collect all completed expeditions"
          >
            <Icon icon="game-icons:chest" width="14" height="14" />
            Collect All
            <span v-if="activeCount > 0" class="ec-collect-count" :class="{ 'ec-collect-count--ready': readyCount > 0 }">{{ activeCount }}</span>
          </button>

          <!-- Hover tooltip: running + ready -->
          <div
            v-show="showCollectDropdown && activeCount > 0"
            class="ec-collect-dropdown"
            role="list"
            @mouseenter="cancelCollectHide"
            @mouseleave="scheduleCollectHide"
          >
            <!-- Running -->
            <template v-if="runningExpeditions.length > 0">
              <div class="ec-tooltip-section">Running</div>
              <div
                v-for="exp in runningExpeditions"
                :key="exp.id"
                class="ec-hover-row"
                role="listitem"
              >
                <Icon :icon="exp.icon || 'game-icons:rolled-cloth'" width="12" height="12" class="ec-hover-icon" />
                <span class="ec-hover-name">{{ exp.name }}</span>
                <span class="ec-hover-time">{{ getTimeRemaining(exp) }}</span>
              </div>
            </template>

            <!-- Ready -->
            <template v-if="doneExpeditions.length > 0">
              <div class="ec-tooltip-section" :class="{ 'ec-tooltip-section--mt': runningExpeditions.length > 0 }">Ready</div>
              <div
                v-for="exp in doneExpeditions"
                :key="exp.id"
                class="ec-hover-row"
                role="listitem"
              >
                <Icon :icon="exp.icon || 'game-icons:rolled-cloth'" width="12" height="12" class="ec-hover-icon ec-hover-icon--ready" />
                <span class="ec-hover-name">{{ exp.name }}</span>
                <span class="ec-hover-ready-badge">✓</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Max-limit warning ─────────────────────────────────── -->
    <div v-if="!expeditionStore.canStartExpedition" class="ec-warning">
      <Icon icon="game-icons:hazard-sign" width="14" height="14" style="color: #e8c040; vertical-align: middle; margin-right: 4px" />Maximum reached ({{ MAX_ACTIVE_EXPEDITIONS }}) — collect active expeditions first
    </div>

    <!-- ── Empty State (no available expeditions) ────────────── -->
    <div v-if="expeditionStore.availableExpeditions.length === 0" class="ec-empty">
      <div class="ec-empty-icon">✦</div>
      <div>No expeditions available</div>
      <div class="ec-empty-sub">Next in {{ formatCountdown(timeUntilNextSpawn) }}</div>
    </div>

    <!-- ── Cards Grid ─────────────────────────────────────────── -->
    <div v-else class="ec-grid">
      <div
        v-for="slot in expeditionStore.availableExpeditions"
        :key="slot.id"
        class="ec-card"
        :class="[
          canQuickstart(slot) ? 'ec-card--available' : 'ec-card--locked',
          isExpiringSoon(slot) ? 'ec-card--expiring' : ''
        ]"
        :style="cardStyle(slot)"
        @click.stop="toggleCardTooltip(slot.id)"
      >
        <!-- Accent bar -->
        <div class="ec-card-accent"></div>

        <!-- Tier badge (only for rare/epic) -->
        <div v-if="slot.tier !== 'common'" class="ec-tier-badge" :class="`ec-tier-badge--${slot.tier}`">
          {{ slot.tier === 'epic' ? 'EPIC' : 'RARE' }}
        </div>

        <!-- Card body -->
        <div class="ec-card-body">
          <div class="ec-card-icon-wrap">
            <Icon :icon="slot.icon" width="36" height="36" :style="{ color: getColor(slot.colorKey).primary }" />
          </div>

          <div class="ec-card-info">
            <div class="ec-card-name">{{ slot.name }}</div>

            <div class="ec-card-meta">
              <div class="ec-card-reward">
                <img src="/img/BardAbilities/BardChime.png" class="ec-chime-img" alt="" aria-hidden="true" />
                <span class="ec-reward-amount">{{ $formatNumber(slot.baseReward) }}</span>
                <span class="ec-reward-label">Chimes</span>
              </div>
              <span class="ec-meta-sep">·</span>
              <div class="ec-card-duration">
                <Icon icon="game-icons:empty-hourglass" width="13" height="13" style="color: rgba(200,144,64,0.55); flex-shrink: 0" />
                <span>{{ formatDuration(slot.durationSeconds) }}</span>
              </div>
            </div>

            <div class="ec-avail-timer" :class="{ 'ec-avail-timer--expiring': isExpiringSoon(slot) }">
              <span>{{ isExpiringSoon(slot) ? '⚠' : '⏱' }}</span>
              <span>{{ formatCountdown(slot.availableUntil - now) }} left</span>
            </div>
          </div>
        </div>

        <!-- Quickstart button -->
        <div class="ec-qs-wrap" :title="getTooltipText(slot)">
          <button
            class="ec-qs-btn"
            :class="canQuickstart(slot) ? 'ec-qs-btn--active' : 'ec-qs-btn--disabled'"
            :disabled="!canQuickstart(slot)"
            @click.stop="quickstartExpedition(slot)"
          >
            <Icon icon="game-icons:plasma-bolt" width="16" height="16" style="color: #e8c040; flex-shrink: 0" />
            Quickstart
          </button>
        </div>

        <!-- Champion Preview Tooltip -->
        <div
          class="ec-preview-tooltip"
          :class="{ 'ec-preview-tooltip--visible': activeTooltipId === slot.id }"
        >
          <div class="ec-preview-header">Assigned Champions</div>
          <div v-for="p in getQuickstartPreview(slot)" :key="p.role" class="ec-preview-row">
            <img :src="ROLE_IMG[p.role]" class="ec-preview-role-img" :alt="p.role" />
            <span class="ec-preview-champ" :class="{ 'ec-preview-champ--missing': !p.champion }">
              {{ p.champion ?? '— no champion —' }}
            </span>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { useBattleStore } from '@/stores/battleStore'
import { getChampionRoles } from '@/config/championRoles'
import {
  MAX_ACTIVE_EXPEDITIONS,
  EXPEDITION_MAX_AVAILABLE,
  EXPEDITION_EXPIRY_WARNING_MS,
  EXPEDITION_COLORS,
  type ExpeditionColorDef,
} from '@/config/constants'
import { useActionToast } from '@/composables/useActionToast'
import type { ChampionRole, AvailableExpeditionSlot, ExpeditionMission } from '@/types'

const ROLE_IMG: Record<string, string> = {
  top:     '/img/roles/top.png',
  jungle:  '/img/roles/jungle.png',
  mid:     '/img/roles/mid.png',
  adc:     '/img/roles/adc.png',
  support: '/img/roles/supp.png',
}

export default defineComponent({
  name: 'ExpeditionComponent',
  components: { Icon },
  emits: ['close'],
  setup(_, { emit }) {
    const expeditionStore = useExpeditionStore()
    const battleStore = useBattleStore()
    const { showToast } = useActionToast()

    const now = ref(Date.now())
    const isDev = import.meta.env.DEV
    const showCollectDropdown = ref(false)
    const collectFlashing = ref(false)
    const activeTooltipId = ref<string | null>(null)

    function closePanel() { emit('close') }

    let timer: ReturnType<typeof setInterval> | null = null
    let collectHideTimer: ReturnType<typeof setTimeout> | null = null

    function scheduleCollectHide() {
      collectHideTimer = setTimeout(() => { showCollectDropdown.value = false }, 150)
    }
    function cancelCollectHide() {
      if (collectHideTimer) { clearTimeout(collectHideTimer); collectHideTimer = null }
    }

    onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
    onUnmounted(() => {
      if (timer) clearInterval(timer)
      if (collectHideTimer) clearTimeout(collectHideTimer)
    })

    // ── Computed ──────────────────────────────────────────────
    const timeUntilNextSpawn = computed(() =>
      Math.max(0, expeditionStore.nextSpawnAt - now.value),
    )
    const activeCount = computed(() => expeditionStore.activeExpeditions.length)
    const readyCount = computed(() =>
      expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
    )
    const doneExpeditions = computed(() =>
      expeditionStore.activeExpeditions.filter((e) => e.status !== 'active'),
    )
    const runningExpeditions = computed(() =>
      expeditionStore.activeExpeditions.filter((e) => e.status === 'active'),
    )

    // ── Color helpers ─────────────────────────────────────────
    function getColor(key: string): ExpeditionColorDef {
      return EXPEDITION_COLORS.find((c) => c.key === key) ?? EXPEDITION_COLORS[0]
    }
    function cardStyle(slot: AvailableExpeditionSlot) {
      const c = getColor(slot.colorKey)
      return { '--exp-p': c.primary, '--exp-d': c.dim, '--exp-glow': c.glowRgb }
    }
    function getExpeditionColor(expedition: ExpeditionMission): ExpeditionColorDef {
      const key = expedition.colorKey ?? 'gold'
      return EXPEDITION_COLORS.find((x) => x.key === key) ?? EXPEDITION_COLORS[0]
    }
    function activeCardStyle(expedition: ExpeditionMission) {
      const c = getExpeditionColor(expedition)
      return { '--exp-p': c.primary, '--exp-d': c.dim, '--exp-glow': c.glowRgb }
    }

    // ── Availability helpers ──────────────────────────────────
    function isExpiringSoon(slot: AvailableExpeditionSlot): boolean {
      return slot.availableUntil - now.value < EXPEDITION_EXPIRY_WARNING_MS
    }
    function getAvailableForRole(role: ChampionRole, usedChamps: string[]): string[] {
      const onExpedition = expeditionStore.championsOnExpedition
      return battleStore.ownedChampions.filter(
        (c) =>
          c !== 'Bard' &&
          !onExpedition.includes(c) &&
          !usedChamps.includes(c) &&
          getChampionRoles(c).includes(role),
      )
    }
    function canQuickstart(slot: AvailableExpeditionSlot): boolean {
      if (!expeditionStore.canStartExpedition) return false
      const used: string[] = []
      for (const role of slot.requiredRoles) {
        const avail = getAvailableForRole(role, used)
        if (!avail.length) return false
        used.push(avail[0])
      }
      return true
    }
    function getTooltipText(slot: AvailableExpeditionSlot): string {
      if (!expeditionStore.canStartExpedition)
        return `Maximum of ${MAX_ACTIVE_EXPEDITIONS} active expeditions reached`
      const used: string[] = []
      for (const role of slot.requiredRoles) {
        const avail = getAvailableForRole(role, used)
        if (!avail.length) return `No ${role} champion available`
        used.push(avail[0])
      }
      return ''
    }
    function quickstartExpedition(slot: AvailableExpeditionSlot) {
      if (!canQuickstart(slot)) return
      const used: string[] = []
      const assigned = slot.requiredRoles.map((role) => {
        const avail = getAvailableForRole(role, used)
        const name = avail[0]
        used.push(name)
        return { name, role }
      })
      if (expeditionStore.startExpedition(slot.id, assigned)) {
        showToast(`${slot.name} started!`)
      }
    }
    function getQuickstartPreview(slot: AvailableExpeditionSlot): Array<{ role: ChampionRole; champion: string | null }> {
      const used: string[] = []
      return slot.requiredRoles.map((role) => {
        const avail = getAvailableForRole(role, used)
        const champion = avail[0] ?? null
        if (champion) used.push(champion)
        return { role, champion }
      })
    }
    function toggleCardTooltip(id: string) {
      activeTooltipId.value = activeTooltipId.value === id ? null : id
    }

    // ── Bulk Actions ──────────────────────────────────────────
    const canSendAll = computed(
      () =>
        expeditionStore.canStartExpedition &&
        expeditionStore.availableExpeditions.some((slot) => canQuickstart(slot)),
    )

    function acceptAll() {
      const toCollect = [...doneExpeditions.value]
      for (const exp of toCollect) {
        collectExpedition(exp.id)
      }
    }

    function collectAll() {
      if (readyCount.value === 0) return
      acceptAll()
      showCollectDropdown.value = false
      collectFlashing.value = true
      setTimeout(() => { collectFlashing.value = false }, 600)
    }

    function sendAll() {
      const slots = [...expeditionStore.availableExpeditions]
      for (const slot of slots) {
        if (!expeditionStore.canStartExpedition) break
        if (canQuickstart(slot)) {
          quickstartExpedition(slot)
        }
      }
    }

    // ── Active expedition helpers ─────────────────────────────
    function getProgress(expedition: ExpeditionMission): number {
      return Math.min(
        100,
        ((now.value - expedition.startTime) / (expedition.durationSeconds * 1000)) * 100,
      )
    }
    function getTimeRemaining(expedition: ExpeditionMission): string {
      const remaining = Math.max(
        0,
        expedition.durationSeconds * 1000 - (now.value - expedition.startTime),
      )
      const secs = Math.ceil(remaining / 1000)
      return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
    }
    function getChampionImage(name: string): string {
      return battleStore.getChampionImage(name)
    }
    function collectExpedition(id: string) {
      const expedition = expeditionStore.activeExpeditions.find((e) => e.id === id)
      const status = expedition?.status
      expeditionStore.collectExpedition(id)
      showToast(status === 'success' ? 'Expedition rewards collected!' : 'Expedition completed.')
    }

    // ── Format helpers ────────────────────────────────────────
    function formatDuration(seconds: number): string {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      if (min === 0) return `${sec}s`
      if (sec === 0) return `${min}m`
      return `${min}m ${sec}s`
    }
    function formatCountdown(ms: number): string {
      const secs = Math.ceil(Math.max(0, ms) / 1000)
      const m = Math.floor(secs / 60)
      const s = secs % 60
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    return {
      expeditionStore,
      now,
      isDev,
      showCollectDropdown,
      collectFlashing,
      closePanel,
      scheduleCollectHide,
      cancelCollectHide,
      activeTooltipId,
      timeUntilNextSpawn,
      activeCount,
      readyCount,
      doneExpeditions,
      runningExpeditions,
      getColor,
      cardStyle,
      getExpeditionColor,
      activeCardStyle,
      isExpiringSoon,
      canQuickstart,
      getTooltipText,
      quickstartExpedition,
      getQuickstartPreview,
      toggleCardTooltip,
      getProgress,
      getTimeRemaining,
      getChampionImage,
      collectExpedition,
      formatDuration,
      formatCountdown,
      MAX_ACTIVE_EXPEDITIONS,
      EXPEDITION_MAX_AVAILABLE,
      ROLE_IMG,
      canSendAll,
      collectAll,
      sendAll,
    }
  },
})
</script>

<style scoped>
/* ── Panel ────────────────────────────────────────────────── */
.ec-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  height: 100%;
}

/* ── Header ───────────────────────────────────────────────── */
.ec-header {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  padding-bottom: 0;
}
.ec-header-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px;
}

/* ── Big Timer ────────────────────────────────────────────── */
.ec-header-timer-wrap {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
}
.ec-header-timer {
  font-size: clamp(1.5rem, 4vw, 2.2rem);
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.12em;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.5), 0 0 28px rgba(232, 192, 64, 0.2);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.ec-header-timer-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.45);
}

/* ── Close Button ─────────────────────────────────────────── */
.ec-header-top .modal-close-btn {
  position: static;
  transform: none;
  flex-shrink: 0;
}

/* ── Action Bar ───────────────────────────────────────────── */
.ec-action-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 5px 10px 7px;
  background: #1e1006;
}
.ec-bulk-slot {
  display: flex;
  align-items: center;
}
.ec-bulk-slot--left   { justify-content: flex-start; }
.ec-bulk-slot--center { justify-content: center; gap: 6px; }
.ec-bulk-slot--right  { justify-content: flex-end; position: relative; }

/* ── Admin Button ─────────────────────────────────────────── */
.ec-admin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px 9px;
  background: #1c1008;
  border: 1px solid #5c3310;
  border-radius: 3px;
  color: rgba(200, 144, 64, 0.55);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.12s, border-color 0.12s, box-shadow 0.12s;
}
.ec-admin-btn:hover {
  color: #e8c040;
  border-color: #c89040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.2);
}
.ec-admin-btn:active { transform: scale(0.95); }

/* ── Bulk Action Buttons ──────────────────────────────────── */
.ec-bulk-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  flex-shrink: 0;
  transition: box-shadow 0.15s, opacity 0.15s;
  white-space: nowrap;
}
.ec-bulk-btn--muted {
  opacity: 0.38;
  cursor: not-allowed;
}
.ec-bulk-btn--send {
  background: linear-gradient(to bottom, #7a5c20, #5c3e10);
  border: 1px solid #c9a84c;
  color: #e8c040;
}
.ec-bulk-btn--send:not(.ec-bulk-btn--muted):hover {
  box-shadow: 0 0 12px rgba(201, 168, 76, 0.4);
}
.ec-bulk-btn--send:not(.ec-bulk-btn--muted):active { transform: scale(0.95); }

/* Collect All */
.ec-bulk-btn--collect {
  background: linear-gradient(to bottom, #2a5c3a, #1a3c24);
  border: 1px solid rgba(100, 220, 180, 0.3);
  color: rgba(100, 220, 180, 0.6);
}
.ec-bulk-btn--collect.is-ready {
  background: linear-gradient(to bottom, #2e7a4e, #1e5433);
  border-color: #64dcb4;
  color: #a0f0d0;
  animation: collect-pulse 2s ease-in-out infinite;
}
.ec-bulk-btn--collect.is-ready:hover {
  box-shadow: 0 0 16px rgba(100, 220, 180, 0.5);
}
.ec-bulk-btn--collect.is-ready:active { transform: scale(0.95); }
.ec-bulk-btn--collect.is-flashing {
  animation: collect-flash 0.55s ease forwards;
}
.ec-bulk-btn--collect.is-monitoring {
  background: linear-gradient(to bottom, #1e3a28, #121e18);
  border: 1px solid rgba(100, 220, 180, 0.45);
  color: rgba(100, 220, 180, 0.65);
  cursor: pointer;
  animation: monitoring-pulse 3s ease-in-out infinite;
}
.ec-bulk-btn--collect.is-monitoring:hover {
  border-color: rgba(100, 220, 180, 0.75);
  box-shadow: 0 0 8px rgba(100, 220, 180, 0.2);
}
@keyframes monitoring-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(100, 220, 180, 0); }
  50%       { box-shadow: 0 0 6px 1px rgba(100, 220, 180, 0.18); }
}
@keyframes collect-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(100, 220, 180, 0); }
  50%       { box-shadow: 0 0 10px 2px rgba(100, 220, 180, 0.4); }
}
@keyframes collect-flash {
  0%   { background: linear-gradient(to bottom, #2e7a4e, #1e5433); }
  30%  { background: linear-gradient(to bottom, #52c890, #2e8a5a); box-shadow: 0 0 20px rgba(100, 220, 180, 0.7); }
  100% { background: linear-gradient(to bottom, #2e7a4e, #1e5433); box-shadow: none; }
}

/* Collect count badge */
.ec-collect-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: rgba(100, 220, 180, 0.12);
  border: 1px solid rgba(100, 220, 180, 0.3);
  border-radius: 8px;
  font-size: 9px;
  font-weight: 900;
  color: rgba(100, 220, 180, 0.6);
}
.ec-collect-count--ready {
  background: rgba(100, 220, 180, 0.22);
  border-color: rgba(100, 220, 180, 0.6);
  color: #a0f0d0;
}

/* ── Collect Dropdown ─────────────────────────────────────── */
.ec-collect-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 210px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.9);
  padding: 8px 10px;
  z-index: 40;
  white-space: nowrap;
}

/* ── Shared hover-row styles (dropdown rows) ──────────────── */
.ec-hover-title {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64dcb4;
  margin-bottom: 6px;
  border-bottom: 1px solid #3e200a;
  padding-bottom: 4px;
}
.ec-hover-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
}
.ec-hover-icon {
  color: rgba(100, 220, 180, 0.5);
  flex-shrink: 0;
}
.ec-hover-name {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-hover-reward {
  font-size: 10px;
  font-weight: 900;
  color: #ffd060;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
/* Tooltip section labels */
.ec-tooltip-section {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.4);
  padding-bottom: 3px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.5);
  margin-bottom: 2px;
}
.ec-tooltip-section--mt { margin-top: 6px; }

/* Countdown in tooltip */
.ec-hover-time {
  font-size: 10px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.55);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* Ready icon tint */
.ec-hover-icon--ready { color: rgba(100, 220, 180, 0.6); }

/* Ready checkmark badge */
.ec-hover-ready-badge {
  font-size: 11px;
  font-weight: 900;
  color: #52b830;
  flex-shrink: 0;
}

/* ── Warning / Empty ──────────────────────────────────────── */
.ec-warning {
  background: #1a0a08;
  border: 1px solid #cc6050;
  border-radius: 4px;
  color: #cc6050;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.ec-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 0 24px;
  color: rgba(200, 144, 64, 0.3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
}
.ec-empty-icon {
  font-size: 22px;
  opacity: 0.3;
  margin-bottom: 4px;
}
.ec-empty-sub {
  font-size: 12px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.5);
  letter-spacing: 0.04em;
  text-transform: none;
}

/* ── Grid ─────────────────────────────────────────────────── */
.ec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* ── Card ─────────────────────────────────────────────────── */
.ec-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(var(--exp-glow, 200,144,64), 0.07) 0%, #1a1008 38%);
  border: 2px solid var(--exp-d, #7a4e20);
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px #3e200a, 0 0 10px rgba(var(--exp-glow, 200,144,64), 0.1);
  overflow: visible;
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.ec-card--available:hover {
  border-color: var(--exp-p, #e8c040);
  box-shadow: inset 0 0 0 1px #3e200a, 0 0 20px rgba(var(--exp-glow, 232,192,64), 0.3);
}
.ec-card--available:hover .ec-card-icon-wrap {
  border-color: var(--exp-p, #e8c040);
  box-shadow: 0 0 14px rgba(var(--exp-glow, 200,144,64), 0.3), inset 0 0 8px rgba(var(--exp-glow, 200,144,64), 0.08);
}
.ec-card--locked {
  opacity: 0.52;
  filter: grayscale(35%);
  border-color: #5c2a10;
}
.ec-card--expiring {
  animation: pulse-border 1.4s ease-in-out infinite;
}
@keyframes pulse-border {
  0%, 100% { box-shadow: inset 0 0 0 1px #3e200a, 0 0 6px rgba(204, 96, 80, 0.2); }
  50%       { box-shadow: inset 0 0 0 1px #3e200a, 0 0 14px rgba(204, 96, 80, 0.5); }
}
.ec-card-accent {
  height: 3px;
  background: linear-gradient(to right, transparent, var(--exp-p, #e8c040) 30%, var(--exp-p, #e8c040) 70%, transparent);
  flex-shrink: 0;
  border-radius: 2px 2px 0 0;
  box-shadow: 0 1px 6px rgba(var(--exp-glow, 200,144,64), 0.4);
}

/* ── Tier Badge ───────────────────────────────────────────── */
.ec-tier-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 6px;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
  border-radius: 3px;
  border: 1px solid;
  color: var(--exp-p, #e8c040);
  border-color: var(--exp-d, #c89040);
  background: rgba(var(--exp-glow, 200,144,64), 0.15);
}
.ec-tier-badge--epic {
  box-shadow: 0 0 8px rgba(var(--exp-glow, 232,192,64), 0.5);
}

/* ── Card body ────────────────────────────────────────────── */
.ec-card-body {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px 8px;
  flex: 1;
}
.ec-card-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #141410 55%, rgba(var(--exp-glow, 200,144,64), 0.13) 100%);
  border: 1px solid var(--exp-d, #3e200a);
  border-radius: 4px;
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(var(--exp-glow, 200,144,64), 0.08);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ec-card-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
}
.ec-card-name {
  font-size: 12px;
  font-weight: 900;
  color: var(--exp-p, #e8c040);
  letter-spacing: 0.04em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ec-meta-sep {
  color: rgba(200, 144, 64, 0.25);
  font-size: 11px;
  line-height: 1;
}
.ec-card-reward {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ec-chime-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.ec-reward-amount {
  font-size: 14px;
  font-weight: 900;
  color: #ffd060;
  letter-spacing: 0.02em;
}
.ec-reward-label {
  font-size: 9px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.5);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ec-card-duration {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.65);
  letter-spacing: 0.03em;
}
.ec-avail-timer {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--exp-p, #e8c040);
  letter-spacing: 0.04em;
  opacity: 0.75;
}
.ec-avail-timer--expiring {
  color: #cc6050;
  opacity: 1;
  font-weight: 900;
}

/* ── Quickstart Button ────────────────────────────────────── */
.ec-qs-wrap {
  padding: 0 10px 10px;
  margin-top: 4px;
  border-top: 1px solid rgba(var(--exp-glow, 200,144,64), 0.15);
}
.ec-qs-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  padding: 7px 0;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: box-shadow 0.18s, background 0.18s;
}
.ec-qs-btn--active {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}
.ec-qs-btn--active:hover {
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.55), 0 0 4px rgba(82, 184, 48, 0.3);
}
.ec-qs-btn--active:active { transform: scale(0.97); }
.ec-qs-btn--disabled {
  background: #1c1408;
  border: 1px solid #3e200a;
  color: rgba(200, 144, 64, 0.22);
  cursor: not-allowed;
}

/* ── Champion Preview Tooltip ─────────────────────────────── */
.ec-preview-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  padding: 8px 10px;
  z-index: 20;
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 0.15s, visibility 0.15s, transform 0.15s;
  pointer-events: none;
}
.ec-card--available:hover .ec-preview-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.ec-preview-tooltip--visible {
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateY(0) !important;
}
.ec-preview-header {
  font-size: 10px;
  font-weight: 900;
  color: #c89040;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 6px;
  border-bottom: 1px solid #3e200a;
  padding-bottom: 4px;
}
.ec-preview-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}
.ec-preview-role-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.ec-preview-champ {
  font-size: 11px;
  font-weight: 700;
  color: #e8c040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-preview-champ--missing {
  color: rgba(204, 96, 80, 0.65);
  font-style: italic;
}

</style>
