<template>
  <div class="ec-panel">

    <!-- ── Header ───────────────────────────────────────────── -->
    <div class="ec-header">
      <div class="ec-header-top">
        <!-- Search -->
        <div class="rpg-search-wrap">
          <Icon icon="game-icons:magnifying-glass" width="14" height="14" class="rpg-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search expeditions…"
            class="rpg-search w-full pl-9 pr-8 py-2.5"
          />
          <button v-if="searchQuery" class="ec-search-clear" @click.stop="searchQuery = ''">✕</button>
        </div>

        <!-- Admin spawn button (DEV only) -->
        <button
          v-if="isDev"
          class="ec-admin-btn"
          @click.stop="expeditionStore.forceSpawn()"
          title="[DEV] Force spawn expedition"
        >
          <Icon icon="game-icons:lightning-bolt" width="11" height="11" />
          <span>+</span>
        </button>

        <!-- Active expeditions badge button -->
        <div class="ec-active-wrap" @mouseenter="cancelHide(); showHoverTooltip = true" @mouseleave="scheduleHide">
          <button
            class="ec-active-btn"
            :class="{ 'ec-active-btn--ready': readyCount > 0 }"
            @click.stop="showActiveModal = !showActiveModal"
            title="Active Expeditions"
          >
            <Icon icon="game-icons:campfire" width="16" height="16" />
            <span class="ec-active-label">Active</span>
            <span v-if="activeCount > 0" class="ec-active-badge" :class="{ 'ec-active-badge--pulse': readyCount > 0 }">
              {{ activeCount }}
            </span>
          </button>

          <!-- Hover tooltip -->
          <div
            v-show="showHoverTooltip"
            class="ec-hover-tooltip"
            @mouseenter="cancelHide"
            @mouseleave="scheduleHide"
          >
            <template v-if="activeCount > 0">
              <div class="ec-hover-title">Active Expeditions</div>
              <div
                v-for="exp in expeditionStore.activeExpeditions"
                :key="exp.id"
                class="ec-hover-row"
              >
                <Icon :icon="exp.icon || 'game-icons:rolled-cloth'" width="12" height="12" class="ec-hover-icon" />
                <span class="ec-hover-name">{{ exp.name }}</span>
                <span v-if="exp.status === 'active'" class="ec-hover-status">{{ getTimeRemaining(exp) }}</span>
                <button
                  v-else
                  class="ec-hover-collect"
                  @click.stop="collectExpedition(exp.id)"
                >
                  Collect
                </button>
              </div>
            </template>
            <div v-else class="ec-hover-empty">No active expeditions</div>
          </div>
        </div>

        <!-- Close button -->
        <button class="modal-close-btn" @click.stop="closePanel">✕</button>
      </div>

      <!-- Spawn subheader -->
      <div class="ec-spawn-bar">
        <span class="ec-spawn-dot">○</span>
        <span v-if="expeditionStore.availableExpeditions.length >= EXPEDITION_MAX_AVAILABLE" class="ec-spawn-text">
          All slots filled ({{ expeditionStore.availableExpeditions.length }}/{{ EXPEDITION_MAX_AVAILABLE }})
        </span>
        <span v-else-if="expeditionStore.availableExpeditions.length === 0" class="ec-spawn-text">
          Next expedition in {{ formatCountdown(timeUntilNextSpawn) }}
        </span>
        <span v-else class="ec-spawn-text">
          Next slot in {{ formatCountdown(timeUntilNextSpawn) }} · {{ expeditionStore.availableExpeditions.length }}/{{ EXPEDITION_MAX_AVAILABLE }}
        </span>
      </div>
    </div>

    <!-- ── Max-limit warning ─────────────────────────────────── -->
    <div v-if="!expeditionStore.canStartExpedition" class="ec-warning">
      <Icon icon="game-icons:hazard-sign" width="14" height="14" style="color: #e8c040; vertical-align: middle; margin-right: 4px" />Maximum reached ({{ MAX_ACTIVE_EXPEDITIONS }}) — collect active expeditions first
    </div>

    <!-- ── Search empty state ────────────────────────────────── -->
    <div v-if="searchQuery && filteredExpeditions.length === 0 && expeditionStore.availableExpeditions.length > 0" class="ec-empty">
      <div class="ec-empty-icon">✦</div>
      <div>No expeditions match "{{ searchQuery }}"</div>
    </div>

    <!-- ── Empty State (no available expeditions) ────────────── -->
    <div v-else-if="expeditionStore.availableExpeditions.length === 0" class="ec-empty">
      <div class="ec-empty-icon">✦</div>
      <div>No expeditions available</div>
      <div class="ec-empty-sub">Next in {{ formatCountdown(timeUntilNextSpawn) }}</div>
    </div>

    <!-- ── Cards Grid ─────────────────────────────────────────── -->
    <div v-else class="ec-grid">
      <div
        v-for="slot in filteredExpeditions"
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

    <!-- ── Active Expeditions Modal ───────────────────────────── -->
    <div v-if="showActiveModal" class="ec-modal-backdrop" @click.self="showActiveModal = false">
      <div class="ec-modal">
        <div class="ec-modal-gold-line"></div>
        <div class="ec-modal-header">
          <div class="ec-modal-title">
            <Icon icon="game-icons:campfire" width="16" height="16" style="color: #e8c040" />
            Active Expeditions
          </div>
          <button class="ec-modal-close" @click.stop="showActiveModal = false">✕</button>
        </div>

        <div class="ec-modal-body">
          <!-- Empty state -->
          <div v-if="expeditionStore.activeExpeditions.length === 0" class="ec-modal-empty">
            No active expeditions
          </div>

          <!-- Ready to Collect -->
          <template v-if="doneExpeditions.length > 0">
            <div class="ec-section-header">
              <Icon icon="game-icons:open-chest" width="14" height="14" style="color: #e8c040" />
              Ready to Collect
            </div>
            <div
              v-for="expedition in doneExpeditions"
              :key="expedition.id"
              class="ec-mission-card"
              :class="{
                'ec-mission-card--success': expedition.status === 'success',
                'ec-mission-card--failure': expedition.status === 'failure',
              }"
            >
              <div
                class="ec-mission-accent"
                :class="{
                  'ec-mission-accent--success': expedition.status === 'success',
                  'ec-mission-accent--failure': expedition.status === 'failure',
                }"
              ></div>
              <div class="ec-mission-body">
                <div class="ec-mission-top">
                  <div class="ec-mission-name-row">
                    <Icon :icon="expedition.icon || 'game-icons:rolled-cloth'" width="18" height="18" style="color: #c89040" />
                    <span class="ec-mission-name">{{ expedition.name }}</span>
                  </div>
                  <span
                    class="ec-status-badge"
                    :class="{
                      'ec-status-badge--success': expedition.status === 'success',
                      'ec-status-badge--failure': expedition.status === 'failure',
                    }"
                  >
                    {{ expedition.status === 'success' ? 'Success' : 'Failed' }}
                  </span>
                </div>

                <div class="ec-mission-champs">
                  <span
                    v-for="champ in expedition.assignedChampions"
                    :key="champ.name"
                    class="ec-champ-tag"
                  >
                    <img :src="getChampionImage(champ.name)" :alt="champ.name" class="ec-champ-img" />
                    {{ champ.name }}
                  </span>
                </div>

                <div class="ec-mission-bottom">
                  <div class="ec-mission-reward">
                    Reward:
                    <span :class="expedition.status === 'success' ? 'ec-reward-success' : 'ec-reward-fail'">
                      {{ $formatNumber(expedition.reward) }} Chimes
                    </span>
                  </div>
                  <button
                    class="ec-collect-btn"
                    :class="expedition.status === 'success' ? 'ec-collect-btn--success' : 'ec-collect-btn--disabled'"
                    @click.stop="collectExpedition(expedition.id)"
                  >
                    Collect
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- Running -->
          <template v-if="runningExpeditions.length > 0">
            <div class="ec-section-header" :class="{ 'ec-section-header--mt': doneExpeditions.length > 0 }">
              Running
            </div>
            <div
              v-for="expedition in runningExpeditions"
              :key="expedition.id"
              class="ec-mission-card ec-mission-card--active"
              :style="activeCardStyle(expedition)"
            >
              <div class="ec-mission-accent-active"></div>
              <div class="ec-mission-body">
                <div class="ec-mission-top">
                  <div class="ec-mission-name-row">
                    <Icon :icon="expedition.icon || 'game-icons:rolled-cloth'" width="18" height="18" :style="{ color: getExpeditionColor(expedition).dim }" />
                    <span class="ec-mission-name">{{ expedition.name }}</span>
                  </div>
                  <span class="ec-mission-timer">{{ getTimeRemaining(expedition) }}</span>
                </div>

                <div class="ec-mission-champs">
                  <span v-for="champ in expedition.assignedChampions" :key="champ.name" class="ec-champ-tag">
                    <img :src="getChampionImage(champ.name)" :alt="champ.name" class="ec-champ-img" />
                    {{ champ.name }}
                  </span>
                </div>

                <div class="ec-progress-wrap">
                  <div class="ec-progress-track">
                    <div class="ec-progress-fill" :style="{ width: getProgress(expedition) + '%' }"></div>
                  </div>
                  <div class="ec-progress-labels">
                    <span>{{ Math.round(getProgress(expedition)) }}%</span>
                    <span>{{ Math.round(expedition.successChance * 100) }}% Chance</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
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
    const searchQuery = ref('')
    const showActiveModal = ref(false)
    const showHoverTooltip = ref(false)
    const activeTooltipId = ref<string | null>(null)

    function closePanel() { emit('close') }

    let timer: ReturnType<typeof setInterval> | null = null
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    function scheduleHide() {
      hideTimer = setTimeout(() => { showHoverTooltip.value = false }, 150)
    }
    function cancelHide() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
    }

    onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
    onUnmounted(() => {
      if (timer) clearInterval(timer)
      if (hideTimer) clearTimeout(hideTimer)
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
    const filteredExpeditions = computed(() => {
      const q = searchQuery.value.trim().toLowerCase()
      if (!q) return expeditionStore.availableExpeditions
      return expeditionStore.availableExpeditions.filter((slot) =>
        slot.name.toLowerCase().includes(q) ||
        slot.tier.toLowerCase().includes(q) ||
        slot.requiredRoles.join(' ').toLowerCase().includes(q) ||
        formatDuration(slot.durationSeconds).toLowerCase().includes(q),
      )
    })

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
      searchQuery,
      showActiveModal,
      showHoverTooltip,
      closePanel,
      scheduleHide,
      cancelHide,
      activeTooltipId,
      timeUntilNextSpawn,
      activeCount,
      readyCount,
      doneExpeditions,
      runningExpeditions,
      filteredExpeditions,
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
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 8px 10px;
}

/* ── Search ───────────────────────────────────────────────── */
.ec-search-clear {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--rpg-text-dim);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.12s;
}
.ec-search-clear:hover {
  color: var(--rpg-gold);
}

/* ── Admin Button ─────────────────────────────────────────── */
.ec-admin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 9px;
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

/* ── Close Button (global .modal-close-btn override for flex row) ── */
.ec-header-top .modal-close-btn {
  position: static;
  flex-shrink: 0;
  transform: none;
  width: auto;
  height: auto;
  padding: 0 12px;
  font-size: 16px;
}

/* ── Active Expeditions Button ────────────────────────────── */
.ec-active-wrap {
  position: relative;
  flex-shrink: 0;
  display: flex;
}
.ec-active-wrap::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  height: 8px;
}
.ec-active-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  background: rgba(96, 128, 204, 0.06);
  border: 1px solid rgba(96, 128, 204, 0.4);
  border-radius: 4px;
  color: #6080cc;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, box-shadow 0.15s, background 0.15s;
}
.ec-active-btn:hover {
  border-color: #6080cc;
  color: #8090e0;
  background: rgba(96, 128, 204, 0.12);
  box-shadow: 0 0 10px rgba(96, 128, 204, 0.28);
}
.ec-active-btn--ready {
  border-color: #c89040;
  color: #e8c040;
  animation: btn-pulse-ready 1.8s ease-in-out infinite;
}
@keyframes btn-pulse-ready {
  0%, 100% { box-shadow: 0 0 4px rgba(232, 192, 64, 0.15); }
  50%       { box-shadow: 0 0 14px rgba(232, 192, 64, 0.5); }
}
.ec-active-label {
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.ec-active-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: rgba(96, 128, 204, 0.15);
  border: 1px solid rgba(96, 128, 204, 0.5);
  border-radius: 8px;
  font-size: 10px;
  font-weight: 900;
  color: #6080cc;
}
.ec-active-badge--pulse {
  background: rgba(232, 192, 64, 0.18);
  border-color: #e8c040;
  color: #e8c040;
  animation: badge-pulse 1.4s ease-in-out infinite;
}
@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232, 192, 64, 0.3); }
  50%       { box-shadow: 0 0 0 4px rgba(232, 192, 64, 0); }
}

/* ── Hover Tooltip ────────────────────────────────────────── */
.ec-hover-tooltip {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 40;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  padding: 8px 10px;
  min-width: 190px;
  white-space: nowrap;
}
.ec-hover-title {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c89040;
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
  color: rgba(200, 144, 64, 0.5);
  flex-shrink: 0;
}
.ec-hover-name {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-hover-status {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: rgba(200, 144, 64, 0.55);
  font-variant-numeric: tabular-nums;
}
.ec-hover-status--ready {
  color: #52b830;
}
.ec-hover-collect {
  padding: 2px 8px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: box-shadow 0.15s;
}
.ec-hover-collect:hover {
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.5);
}
.ec-hover-collect:active { transform: scale(0.95); }
.ec-hover-empty {
  font-size: 11px;
  color: rgba(200, 144, 64, 0.35);
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* ── Spawn Bar ────────────────────────────────────────────── */
.ec-spawn-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 6px;
  background: #161410;
  border-top: 1px solid #2a1a08;
}
.ec-spawn-dot {
  color: rgba(200, 144, 64, 0.35);
  font-size: 10px;
  flex-shrink: 0;
}
.ec-spawn-text {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.45);
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

/* ── Active Expeditions Modal ─────────────────────────────── */
.ec-modal-backdrop {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: stretch;
  padding: 4px;
}
.ec-modal {
  width: 100%;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ec-modal-gold-line {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  flex-shrink: 0;
}
.ec-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 8px 10px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  flex-shrink: 0;
}
.ec-modal-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
}
.ec-modal-close {
  background: transparent;
  border: none;
  color: rgba(200, 144, 64, 0.45);
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
  transition: color 0.12s;
}
.ec-modal-close:hover { color: #e8c040; }

.ec-modal-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 380px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.ec-modal-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(200, 144, 64, 0.3);
  text-transform: uppercase;
}

/* ── Section Header ───────────────────────────────────────── */
.ec-section-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.45);
  padding-bottom: 5px;
  border-bottom: 1px solid #3e2010;
}
.ec-section-header--mt {
  margin-top: 4px;
}

/* ── Mission Card ─────────────────────────────────────────── */
.ec-mission-card {
  position: relative;
  border-radius: 4px;
  border: 1px solid;
  overflow: hidden;
}
.ec-mission-card--active {
  background: linear-gradient(180deg, rgba(var(--exp-glow, 200,144,64), 0.07) 0%, #1a1008 35%);
  border-color: var(--exp-d, rgba(92,51,16,0.4));
  box-shadow: 0 0 8px rgba(var(--exp-glow, 200,144,64), 0.1);
}
.ec-mission-card--success {
  background: #0e1a0e;
  border-color: rgba(82, 184, 48, 0.3);
}
.ec-mission-card--failure {
  background: #1a0e0e;
  border-color: rgba(204, 96, 80, 0.3);
}
.ec-mission-accent {
  height: 2px;
}
.ec-mission-accent--success {
  background: linear-gradient(to right, #2e7a1a, #52b830);
}
.ec-mission-accent--failure {
  background: linear-gradient(to right, #cc6050, #a04030);
}
.ec-mission-accent-active {
  height: 2px;
  background: linear-gradient(to right, transparent, var(--exp-p, #e8c040), transparent);
}
.ec-mission-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ec-mission-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ec-mission-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.ec-mission-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.85);
}
.ec-mission-timer {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}

/* ── Status Badge ─────────────────────────────────────────── */
.ec-status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.ec-status-badge--success {
  background: rgba(82, 184, 48, 0.12);
  border-color: rgba(82, 184, 48, 0.3);
  color: #52b830;
}
.ec-status-badge--failure {
  background: rgba(204, 96, 80, 0.12);
  border-color: rgba(204, 96, 80, 0.3);
  color: #cc6050;
}

/* ── Champion Tags ────────────────────────────────────────── */
.ec-mission-champs {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.ec-champ-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  background: #1c1c18;
  border: 1px solid rgba(92, 51, 16, 0.35);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
}
.ec-champ-img {
  width: 14px;
  height: 14px;
  object-fit: cover;
  border-radius: 50%;
  image-rendering: pixelated;
}

/* ── Mission Bottom Row ───────────────────────────────────── */
.ec-mission-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ec-mission-reward {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
}
.ec-reward-success {
  color: #ffd060;
  font-weight: 900;
}
.ec-reward-fail {
  color: #cc6050;
  font-weight: 900;
}

/* ── Collect Button ───────────────────────────────────────── */
.ec-collect-btn {
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: box-shadow 0.18s;
}
.ec-collect-btn--success {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}
.ec-collect-btn--success:hover {
  box-shadow: 0 0 12px rgba(82, 184, 48, 0.5);
}
.ec-collect-btn--success:active { transform: scale(0.97); }
.ec-collect-btn--disabled {
  background: #1c1408;
  border: 1px solid #3e200a;
  color: rgba(200, 144, 64, 0.22);
  cursor: not-allowed;
}

/* ── Progress ─────────────────────────────────────────────── */
.ec-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ec-progress-track {
  width: 100%;
  height: 6px;
  background: #111008;
  border: 1px solid rgba(92, 51, 16, 0.3);
  border-radius: 4px;
  overflow: hidden;
}
.ec-progress-fill {
  height: 100%;
  background: linear-gradient(to right, var(--exp-d, #c89040), var(--exp-p, #e8c040));
  transition: width 1s linear;
}
.ec-progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
}
</style>
