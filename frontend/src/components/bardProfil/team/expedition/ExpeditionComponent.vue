<template>
  <div class="ec-panel">

    <!-- ── Header strip ─────────────────────────────────────── -->
    <div class="ec-header">
      <div class="ec-accent-bar"></div>
      <div class="ec-header-row">
        <span class="ec-title">Expeditions</span>

        <div class="ec-header-meta">
          <!-- Next spawn / FULL -->
          <span
            class="ec-meta-chip"
            :class="{ 'ec-meta-chip--full': slotsFull }"
          >
            <Icon icon="game-icons:empty-hourglass" width="12" height="12" class="ec-meta-ico" />
            <span v-if="slotsFull">FULL</span>
            <span v-else>{{ formatCountdown(timeUntilNextSpawn) }}</span>
          </span>

          <!-- Active count -->
          <span
            class="ec-meta-chip"
            :class="{ 'ec-meta-chip--active': activeCount > 0 }"
          >
            <Icon icon="game-icons:campfire" width="12" height="12" class="ec-meta-ico" />
            {{ activeCount }}/{{ MAX_ACTIVE_EXPEDITIONS }}
          </span>

          <!-- Available slots -->
          <span class="ec-meta-chip">
            <Icon icon="game-icons:rolled-cloth" width="12" height="12" class="ec-meta-ico" />
            {{ expeditionStore.availableExpeditions.length }}/{{ EXPEDITION_MAX_AVAILABLE }}
          </span>
        </div>

        <button class="modal-close-btn ec-close" @click.stop="closePanel" aria-label="Close expeditions">✕</button>
      </div>
    </div>

    <!-- ── Scrolling body ───────────────────────────────────── -->
    <div class="ec-body">

      <!-- Max-limit warning -->
      <div v-if="!expeditionStore.canStartExpedition" class="ec-warning">
        <Icon icon="game-icons:hazard-sign" width="14" height="14" class="ec-warning-ico" />
        Maximum reached ({{ MAX_ACTIVE_EXPEDITIONS }}) — collect active expeditions first
      </div>

      <!-- ══ ACTIVE MISSIONS ══════════════════════════════════ -->
      <section v-if="activeCount > 0" class="ec-section">
        <div class="ec-section-head">
          <span class="ec-section-title">Active Missions</span>
          <span class="ec-section-count">{{ activeCount }}/{{ MAX_ACTIVE_EXPEDITIONS }}</span>

          <button
            class="ec-bulk-btn ec-bulk-btn--collect"
            :class="{
              'is-ready': readyCount > 0,
              'is-flashing': collectFlashing,
              'ec-bulk-btn--muted': readyCount === 0,
            }"
            :disabled="readyCount === 0"
            @click.stop="collectAll"
            aria-label="Collect all completed expeditions"
          >
            <Icon icon="game-icons:chest" width="14" height="14" />
            Collect All
            <RpgNotifyBadge :count="readyCount" label="Expedition rewards ready" />
          </button>
        </div>

        <TransitionGroup name="ec-card-fly" tag="div" class="ec-active-list">
          <!-- Ready to collect -->
          <div
            v-for="exp in doneExpeditions"
            :key="exp.id"
            class="ec-active-card"
            :class="exp.status === 'success' ? 'ec-active-card--success' : 'ec-active-card--failure'"
          >
            <div
              class="ec-active-accent"
              :class="exp.status === 'success' ? 'ec-active-accent--success' : 'ec-active-accent--failure'"
            ></div>
            <div class="ec-active-body">
              <div class="ec-active-top">
                <div class="ec-active-name-wrap">
                  <Icon :icon="exp.icon || 'game-icons:rolled-cloth'" width="18" height="18" class="ec-active-ico" />
                  <span class="ec-active-name">{{ exp.name }}</span>
                </div>
                <span
                  class="ec-status-badge"
                  :class="exp.status === 'success' ? 'ec-status-badge--success' : 'ec-status-badge--failure'"
                >
                  {{ exp.status === 'success' ? '✓ Success' : '✕ Failed' }}
                </span>
              </div>

              <div class="ec-champ-tags">
                <span v-for="champ in exp.assignedChampions" :key="champ.name" class="ec-champ-tag">
                  <img :src="getChampionImage(champ.name)" :alt="champ.name" class="ec-champ-img" />
                  {{ champ.name }}
                </span>
              </div>

              <div class="ec-active-foot">
                <div class="ec-active-reward">
                  <img src="/img/BardAbilities/BardChime.png" class="ec-chime-img" alt="" aria-hidden="true" />
                  <span
                    class="ec-active-reward-amount"
                    :class="{ 'ec-active-reward-amount--fail': exp.status !== 'success' }"
                  >+{{ $formatNumber(exp.reward) }}</span>
                  <span class="ec-active-reward-label">Chimes</span>
                </div>
                <button
                  class="ec-collect-btn"
                  :class="exp.status === 'success' ? 'rpg-btn-green' : 'ec-collect-btn--fail'"
                  @click.stop="collectExpedition(exp.id)"
                >
                  Collect
                </button>
              </div>
            </div>
          </div>

          <!-- Running -->
          <div
            v-for="exp in runningExpeditions"
            :key="exp.id"
            class="ec-active-card ec-active-card--running"
            :style="activeCardStyle(exp)"
          >
            <div class="ec-active-accent ec-active-accent--running"></div>
            <div class="ec-active-body">
              <div class="ec-active-top">
                <div class="ec-active-name-wrap">
                  <Icon
                    :icon="exp.icon || 'game-icons:rolled-cloth'"
                    width="18"
                    height="18"
                    class="ec-active-ico"
                    :style="{ color: getExpeditionColor(exp).dim }"
                  />
                  <span class="ec-active-name">{{ exp.name }}</span>
                </div>
                <span class="ec-active-time">
                  <Icon icon="game-icons:empty-hourglass" width="11" height="11" class="ec-active-time-ico" />
                  {{ getTimeRemaining(exp) }}
                </span>
              </div>

              <div class="ec-champ-tags">
                <span v-for="champ in exp.assignedChampions" :key="champ.name" class="ec-champ-tag">
                  <img :src="getChampionImage(champ.name)" :alt="champ.name" class="ec-champ-img" />
                  {{ champ.name }}
                </span>
              </div>

              <div class="ec-progress">
                <div class="ec-progress-track">
                  <div class="ec-progress-fill" :style="{ width: getProgress(exp) + '%' }"></div>
                </div>
                <div class="ec-progress-meta">
                  <span>{{ Math.round(getProgress(exp)) }}%</span>
                  <span>{{ Math.round(exp.successChance * 100) }}% chance</span>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </section>

      <!-- ══ AVAILABLE ════════════════════════════════════════ -->
      <section class="ec-section">
        <div class="ec-section-head">
          <span class="ec-section-title">Available</span>
          <span class="ec-section-count">{{ expeditionStore.availableExpeditions.length }}/{{ EXPEDITION_MAX_AVAILABLE }}</span>

          <button
            v-if="isDev"
            class="ec-admin-btn"
            @click.stop="expeditionStore.forceSpawn()"
            aria-label="Force spawn expedition (dev)"
          >
            <Icon icon="game-icons:lightning-bolt" width="11" height="11" />
            Spawn
          </button>

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

        <!-- Empty state -->
        <div v-if="expeditionStore.availableExpeditions.length === 0" class="ec-empty">
          <div class="ec-empty-icon">✦</div>
          <div>No expeditions available</div>
          <div class="ec-empty-sub">Next in {{ formatCountdown(timeUntilNextSpawn) }}</div>
        </div>

        <!-- Cards grid -->
        <TransitionGroup v-else name="ec-card-fly" tag="div" class="ec-grid">
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
            <div class="ec-card-accent"></div>

            <div v-if="slot.tier !== 'common'" class="ec-tier-badge" :class="`ec-tier-badge--${slot.tier}`">
              {{ slot.tier === 'epic' ? 'EPIC' : 'RARE' }}
            </div>

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
                    <Icon icon="game-icons:empty-hourglass" width="13" height="13" class="ec-dur-ico" />
                    <span>{{ formatDuration(slot.durationSeconds) }}</span>
                  </div>
                </div>

                <div class="ec-avail-timer" :class="{ 'ec-avail-timer--expiring': isExpiringSoon(slot) }">
                  <span>{{ isExpiringSoon(slot) ? '⚠' : '⏱' }}</span>
                  <span>{{ formatCountdown(slot.availableUntil - now) }} left</span>
                </div>
              </div>
            </div>

            <div class="ec-qs-wrap" :title="getTooltipText(slot)">
              <button
                class="ec-qs-btn"
                :class="canQuickstart(slot) ? 'ec-qs-btn--active' : 'ec-qs-btn--disabled'"
                :disabled="!canQuickstart(slot)"
                @click.stop="quickstartExpedition(slot)"
              >
                <Icon icon="game-icons:plasma-bolt" width="16" height="16" class="ec-qs-ico" />
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
        </TransitionGroup>
      </section>
    </div>

    <!-- ── Floating chime-collect feedback ──────────────────── -->
    <div class="ec-chime-pops" aria-hidden="true">
      <span
        v-for="pop in chimePops"
        :key="pop.id"
        class="ec-chime-pop"
        :style="{ '--pop-dx': pop.dx + 'px' }"
      >
        +{{ $formatNumber(pop.amount) }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/expeditionStore'
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
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'

const ROLE_IMG: Record<string, string> = {
  top:     '/img/roles/top.png',
  jungle:  '/img/roles/jungle.png',
  mid:     '/img/roles/mid.png',
  adc:     '/img/roles/adc.png',
  support: '/img/roles/supp.png',
}

export default defineComponent({
  name: 'ExpeditionComponent',
  components: { Icon, RpgNotifyBadge },
  emits: ['close'],
  setup(_, { emit }) {
    const expeditionStore = useExpeditionStore()
    const battleStore = useBattleStore()
    const { showToast } = useActionToast()

    const now = ref(Date.now())
    const isDev = import.meta.env.DEV
    const collectFlashing = ref(false)
    const activeTooltipId = ref<string | null>(null)

    function closePanel() { emit('close') }

    let timer: ReturnType<typeof setInterval> | null = null

    onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
    onUnmounted(() => { if (timer) clearInterval(timer) })

    // ── Computed ──────────────────────────────────────────────
    const timeUntilNextSpawn = computed(() =>
      Math.max(0, expeditionStore.nextSpawnAt - now.value),
    )
    const slotsFull = computed(
      () => expeditionStore.availableExpeditions.length >= EXPEDITION_MAX_AVAILABLE,
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

    function collectAll() {
      if (readyCount.value === 0) return
      for (const exp of [...doneExpeditions.value]) {
        collectExpedition(exp.id, false)
      }
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

    // ── Animated collect feedback ─────────────────────────────
    const chimePops = ref<Array<{ id: number; amount: number; dx: number }>>([])
    let popSeq = 0
    function spawnChimePop(amount: number) {
      if (amount <= 0) return
      const id = ++popSeq
      const dx = Math.round((Math.random() - 0.5) * 80)
      chimePops.value.push({ id, amount, dx })
      setTimeout(() => {
        chimePops.value = chimePops.value.filter((p) => p.id !== id)
      }, 850)
    }

    function collectExpedition(id: string, toast = true) {
      const expedition = expeditionStore.activeExpeditions.find((e) => e.id === id)
      const status = expedition?.status
      const reward = expedition?.reward ?? 0
      expeditionStore.collectExpedition(id)
      if (reward > 0) spawnChimePop(reward)
      if (toast) {
        showToast(status === 'success' ? 'Expedition rewards collected!' : 'Expedition completed.')
      }
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
      collectFlashing,
      closePanel,
      activeTooltipId,
      timeUntilNextSpawn,
      slotsFull,
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
      chimePops,
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
  width: 100%;
  min-height: 100%;
}

/* ── Header strip ─────────────────────────────────────────── */
.ec-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}
.ec-accent-bar {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}
.ec-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
}
.ec-title {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.35);
  flex-shrink: 0;
}
.ec-header-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.ec-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: rgba(200, 144, 64, 0.7);
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid #3e200a;
  border-radius: var(--bp-radius);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ec-meta-ico { color: rgba(200, 144, 64, 0.5); flex-shrink: 0; }
.ec-meta-chip--full {
  color: #e8c040;
  border-color: #5c3310;
  background: rgba(200, 144, 64, 0.12);
}
.ec-meta-chip--active {
  color: #a0f0d0;
  border-color: rgba(100, 220, 180, 0.35);
  background: rgba(100, 220, 180, 0.08);
}
.ec-meta-chip--active .ec-meta-ico { color: rgba(100, 220, 180, 0.6); }
.ec-close { position: static; transform: none; flex-shrink: 0; }

/* ── Body ─────────────────────────────────────────────────── */
.ec-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 2px 4px;
}

/* ── Section ──────────────────────────────────────────────── */
.ec-section { display: flex; flex-direction: column; gap: 9px; }
.ec-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ec-section-title {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.6);
}
.ec-section-count {
  font-size: 10px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.35);
  font-variant-numeric: tabular-nums;
  margin-right: auto;
}

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
  padding: 5px 11px;
  border-radius: var(--bp-radius);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  overflow: visible;
  transition: box-shadow 0.15s, opacity 0.15s;
  white-space: nowrap;
}
.ec-bulk-btn--muted { opacity: 0.38; cursor: not-allowed; }
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
.ec-bulk-btn--collect.is-ready:hover { box-shadow: 0 0 16px rgba(100, 220, 180, 0.5); }
.ec-bulk-btn--collect.is-ready:active { transform: scale(0.95); }
.ec-bulk-btn--collect.is-flashing { animation: collect-flash 0.55s ease forwards; }
@keyframes collect-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(100, 220, 180, 0); }
  50%       { box-shadow: 0 0 10px 2px rgba(100, 220, 180, 0.4); }
}
@keyframes collect-flash {
  0%   { background: linear-gradient(to bottom, #2e7a4e, #1e5433); }
  30%  { background: linear-gradient(to bottom, #52c890, #2e8a5a); box-shadow: 0 0 20px rgba(100, 220, 180, 0.7); }
  100% { background: linear-gradient(to bottom, #2e7a4e, #1e5433); box-shadow: none; }
}
.ec-bulk-btn--collect :deep(.rpg-notify-badge) { top: -6px; right: -6px; }

/* ── Active Mission Cards ─────────────────────────────────── */
.ec-active-list { display: flex; flex-direction: column; gap: 8px; }
.ec-active-card {
  position: relative;
  overflow: hidden;
  border: 1px solid;
  border-radius: var(--bp-radius);
}
.ec-active-card--success { background: #0e1a0e; border-color: rgba(82, 184, 48, 0.3); }
.ec-active-card--failure { background: #1a0e0e; border-color: rgba(204, 96, 80, 0.3); }
.ec-active-card--running { background: #1a1008; border-color: rgba(92, 51, 16, 0.5); }

.ec-active-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
}
.ec-active-accent--success { background: linear-gradient(to right, #2e7a1a, #52b830, #2e7a1a); }
.ec-active-accent--failure { background: linear-gradient(to right, #a04030, #cc6050, #a04030); }
.ec-active-accent--running { background: linear-gradient(to right, transparent, var(--exp-p, #e8c040), transparent); }

.ec-active-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 11px 9px;
}
.ec-active-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ec-active-name-wrap { display: flex; align-items: center; gap: 7px; min-width: 0; }
.ec-active-ico { color: #c89040; flex-shrink: 0; }
.ec-active-name {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-active-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.6);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.ec-active-time-ico { color: rgba(200, 144, 64, 0.45); }

/* Status badge */
.ec-status-badge {
  flex-shrink: 0;
  padding: 2px 9px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid;
  border-radius: var(--bp-radius);
}
.ec-status-badge--success { background: rgba(82, 184, 48, 0.12); border-color: rgba(82, 184, 48, 0.35); color: #52b830; }
.ec-status-badge--failure { background: rgba(204, 96, 80, 0.12); border-color: rgba(204, 96, 80, 0.35); color: #cc6050; }

/* Champion tags */
.ec-champ-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.ec-champ-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px 2px 3px;
  font-size: 11px;
  font-weight: 700;
  background: #1c1c18;
  border: 1px solid rgba(92, 51, 16, 0.4);
  border-radius: var(--bp-radius);
  color: rgba(255, 255, 255, 0.6);
}
.ec-champ-img {
  width: 16px;
  height: 16px;
  object-fit: cover;
  border-radius: 50%;
  image-rendering: auto;
  flex-shrink: 0;
}

/* Reward + collect footer */
.ec-active-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ec-active-reward { display: flex; align-items: center; gap: 5px; }
.ec-active-reward-amount {
  font-size: 14px;
  font-weight: 900;
  color: #ffd060;
  font-variant-numeric: tabular-nums;
}
.ec-active-reward-amount--fail { color: #cc6050; }
.ec-active-reward-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(200, 144, 64, 0.5);
}
.ec-collect-btn {
  padding: 5px 16px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.05em;
  border-radius: var(--bp-radius);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.15s;
  flex-shrink: 0;
}
.ec-collect-btn:active { transform: scale(0.95); }
.ec-collect-btn--fail {
  background: #2a1410;
  border: 1px solid rgba(204, 96, 80, 0.4);
  color: #cc6050;
}
.ec-collect-btn--fail:hover { box-shadow: 0 0 10px rgba(204, 96, 80, 0.3); }

/* Progress */
.ec-progress { display: flex; flex-direction: column; gap: 5px; }
.ec-progress-track {
  width: 100%;
  height: 6px;
  background: #111008;
  border: 1px solid rgba(92, 51, 16, 0.4);
  border-radius: var(--bp-radius);
  overflow: hidden;
}
.ec-progress-fill {
  height: 100%;
  background: linear-gradient(to right, var(--exp-d, #c89040), var(--exp-p, #e8c040));
  transition: width 1s linear;
  box-shadow: 0 0 8px rgba(var(--exp-glow, 200, 144, 64), 0.5);
}
.ec-progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}

/* ── Warning / Empty ──────────────────────────────────────── */
.ec-warning {
  display: flex;
  align-items: center;
  background: #1a0a08;
  border: 1px solid #cc6050;
  border-radius: var(--bp-radius);
  color: #cc6050;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.ec-warning-ico { color: #e8c040; margin-right: 5px; flex-shrink: 0; }
.ec-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 0 24px;
  color: rgba(200, 144, 64, 0.3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
}
.ec-empty-icon { font-size: 22px; opacity: 0.3; margin-bottom: 4px; }
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

/* ── Available Card ───────────────────────────────────────── */
.ec-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(var(--exp-glow, 200,144,64), 0.07) 0%, #1a1008 38%);
  border: 2px solid var(--exp-d, #7a4e20);
  border-radius: var(--bp-radius);
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
.ec-card--expiring { animation: pulse-border 1.4s ease-in-out infinite; }
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

/* Tier badge */
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
.ec-tier-badge--epic { box-shadow: 0 0 8px rgba(var(--exp-glow, 232,192,64), 0.5); }

/* Card body */
.ec-card-body { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px 8px; flex: 1; }
.ec-card-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #141410 55%, rgba(var(--exp-glow, 200,144,64), 0.13) 100%);
  border: 1px solid var(--exp-d, #3e200a);
  border-radius: var(--bp-radius);
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(var(--exp-glow, 200,144,64), 0.08);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ec-card-info { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
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
.ec-card-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ec-meta-sep { color: rgba(200, 144, 64, 0.25); font-size: 11px; line-height: 1; }
.ec-card-reward { display: flex; align-items: center; gap: 4px; }
.ec-chime-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.ec-reward-amount { font-size: 14px; font-weight: 900; color: #ffd060; letter-spacing: 0.02em; }
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
.ec-dur-ico { color: rgba(200, 144, 64, 0.55); flex-shrink: 0; }
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
.ec-avail-timer--expiring { color: #cc6050; opacity: 1; font-weight: 900; }

/* Quickstart button */
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
  border-radius: var(--bp-radius);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: box-shadow 0.18s, background 0.18s;
}
.ec-qs-ico { color: #e8c040; flex-shrink: 0; }
.ec-qs-btn--active {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}
.ec-qs-btn--active:hover { box-shadow: 0 0 14px rgba(82, 184, 48, 0.55), 0 0 4px rgba(82, 184, 48, 0.3); }
.ec-qs-btn--active:active { transform: scale(0.97); }
.ec-qs-btn--disabled {
  background: #1c1408;
  border: 1px solid #3e200a;
  color: rgba(200, 144, 64, 0.22);
  cursor: not-allowed;
}

/* Champion Preview Tooltip */
.ec-preview-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: var(--bp-radius);
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
.ec-preview-row { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
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
.ec-preview-champ--missing { color: rgba(204, 96, 80, 0.65); font-style: italic; }

/* ── Card transitions (send / collect closure) ───────────── */
.ec-card-fly-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.ec-card-fly-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.ec-card-fly-enter-from { opacity: 0; transform: translateY(8px) scale(0.96); }
.ec-card-fly-leave-to { opacity: 0; transform: translateY(-8px) scale(0.9); }

/* ── Floating chime-collect pops ──────────────────────────── */
.ec-chime-pops {
  position: absolute;
  top: 46px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  pointer-events: none;
}
.ec-chime-pop {
  position: absolute;
  left: 50%;
  bottom: 0;
  font-size: 18px;
  font-weight: 900;
  color: #e8c040;
  white-space: nowrap;
  -webkit-text-stroke: 1.5px #3e200a;
  text-shadow: 0 0 6px #e8c040, 0 0 14px #c89040, 0 0 28px rgba(232, 192, 64, 0.5);
  animation: ec-chime-float 0.85s ease-out forwards;
}
@keyframes ec-chime-float {
  0%   { opacity: 0; transform: translateX(calc(-50% + var(--pop-dx, 0px))) translateY(0) scale(0.8); }
  15%  { opacity: 1; transform: translateX(calc(-50% + var(--pop-dx, 0px))) translateY(-12px) scale(1.12); }
  100% { opacity: 0; transform: translateX(calc(-50% + var(--pop-dx, 0px))) translateY(-58px) scale(0.9); }
}
</style>
