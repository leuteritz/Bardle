<template>
  <div class="ec-panel">

    <!-- ── Global Timer Header ───────────────────────────────── -->
    <div class="ec-spawn-header">
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
      <!-- Admin spawn button — dev mode only -->
      <button
        v-if="isDev"
        class="ec-admin-btn"
        @click.stop="expeditionStore.forceSpawn()"
        title="[DEV] Force spawn expedition"
      >
        <Icon icon="game-icons:lightning-bolt" width="11" height="11" />
        <span>+</span>
      </button>
    </div>

    <!-- ── Max-limit warning ──────────────────────────────────── -->
    <div v-if="!expeditionStore.canStartExpedition" class="ec-warning">
      <Icon icon="game-icons:hazard-sign" width="14" height="14" style="color: #e8c040; vertical-align: middle; margin-right: 4px" />Maximum reached ({{ MAX_ACTIVE_EXPEDITIONS }}) — collect active expeditions first
    </div>

    <!-- ── Empty State ───────────────────────────────────────── -->
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
          <!-- Icon -->
          <div class="ec-card-icon-wrap">
            <Icon
              :icon="slot.icon"
              width="36"
              height="36"
              :style="{ color: getColor(slot.colorKey).dim }"
            />
          </div>

          <!-- Info -->
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

            <!-- Availability timer -->
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
          <div
            v-for="p in getQuickstartPreview(slot)"
            :key="p.role"
            class="ec-preview-row"
          >
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
import type { ChampionRole, AvailableExpeditionSlot } from '@/types'

const ROLE_IMG: Record<string, string> = {
  top:     '/img/roles/top.png',
  jungle:  '/img/roles/jungle.png',
  mid:     '/img/roles/mid.png',
  adc:     '/img/roles/adc.png',
  support: '/img/roles/supp.png',
}

export default defineComponent({
  name: 'ExpeditionCreateComponent',
  components: { Icon },
  setup() {
    const expeditionStore = useExpeditionStore()
    const battleStore = useBattleStore()
    const { showToast } = useActionToast()
    const activeTooltipId = ref<string | null>(null)
    const now = ref(Date.now())
    const isDev = import.meta.env.DEV
    let timer: ReturnType<typeof setInterval> | null = null

    onMounted(() => {
      timer = setInterval(() => { now.value = Date.now() }, 1000)
    })
    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    const timeUntilNextSpawn = computed(() =>
      Math.max(0, expeditionStore.nextSpawnAt - now.value),
    )

    function getColor(key: string): ExpeditionColorDef {
      return EXPEDITION_COLORS.find((c) => c.key === key) ?? EXPEDITION_COLORS[0]
    }

    function cardStyle(slot: AvailableExpeditionSlot) {
      const c = getColor(slot.colorKey)
      return { '--exp-p': c.primary, '--exp-d': c.dim, '--exp-glow': c.glowRgb }
    }

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

    function toggleCardTooltip(id: string) {
      activeTooltipId.value = activeTooltipId.value === id ? null : id
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

    return {
      expeditionStore,
      now,
      isDev,
      timeUntilNextSpawn,
      getColor,
      cardStyle,
      isExpiringSoon,
      canQuickstart,
      getTooltipText,
      quickstartExpedition,
      formatDuration,
      formatCountdown,
      MAX_ACTIVE_EXPEDITIONS,
      EXPEDITION_MAX_AVAILABLE,
      activeTooltipId,
      toggleCardTooltip,
      getQuickstartPreview,
      ROLE_IMG,
    }
  },
})
</script>

<style scoped>
/* ── Panel ────────────────────────────────────────────────── */
.ec-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

/* ── Spawn Header ─────────────────────────────────────────── */
.ec-spawn-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 8px;
  border-bottom: 1px solid #3e2010;
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
  flex: 1;
}

/* ── Admin Button ─────────────────────────────────────────── */
.ec-admin-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
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
.ec-admin-btn:active {
  transform: scale(0.95);
}

/* ── Warning / Empty ──────────────────────────────────────── */
.ec-warning {
  background: #1a0a08;
  border: 1px solid #cc6050;
  border-radius: var(--bp-radius);
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
  background: #1a1008;
  border: 2px solid #7a4e20;
  border-radius: var(--bp-radius);
  box-shadow: inset 0 0 0 1px #3e200a;
  overflow: visible;
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.ec-card--available:hover {
  border-color: var(--exp-d, #c89040);
  box-shadow: inset 0 0 0 1px #3e200a, 0 0 10px rgba(var(--exp-glow, 232,192,64), 0.15);
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

/* Colored accent line top */
.ec-card-accent {
  height: 2px;
  background: linear-gradient(to right, transparent, var(--exp-p, #e8c040), transparent);
  flex-shrink: 0;
  border-radius: 2px 2px 0 0;
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
  background: rgba(0, 0, 0, 0.4);
}
.ec-tier-badge--epic {
  box-shadow: 0 0 6px rgba(var(--exp-glow, 232,192,64), 0.35);
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
  background: #141410;
  border: 1px solid var(--exp-d, #3e200a);
  border-radius: var(--bp-radius);
  flex-shrink: 0;
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

/* ── Meta row ─────────────────────────────────────────────── */
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

/* ── Availability timer ───────────────────────────────────── */
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
.ec-qs-btn--active {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  color: #fff;
}
.ec-qs-btn--active:hover {
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.55), 0 0 4px rgba(82, 184, 48, 0.3);
}
.ec-qs-btn--active:active {
  transform: scale(0.97);
}
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
