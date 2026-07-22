<template>
  <div class="ec-panel">

    <!-- ── Status strip ─────────────────────────────────────── -->
    <div class="ec-status-strip">
      <div class="ec-stat" :class="{ 'ec-stat--full': slotsFull }">
        <Icon icon="game-icons:empty-hourglass" width="22" height="22" class="ec-stat-ico" />
        <div class="ec-stat-text">
          <span class="ec-stat-value">{{ slotsFull ? 'FULL' : formatCountdown(timeUntilNextSpawn) }}</span>
          <span class="ec-stat-label">Next Offer</span>
        </div>
      </div>

      <div class="ec-stat" :class="{ 'ec-stat--live': activeCount > 0 }">
        <Icon icon="game-icons:campfire" width="22" height="22" class="ec-stat-ico" />
        <div class="ec-stat-text">
          <span class="ec-stat-value">{{ activeCount }}/{{ MAX_ACTIVE_EXPEDITIONS }}</span>
          <span class="ec-stat-label">Active</span>
        </div>
      </div>

      <div class="ec-stat">
        <Icon icon="game-icons:rolled-cloth" width="22" height="22" class="ec-stat-ico" />
        <div class="ec-stat-text">
          <span class="ec-stat-value">{{ expeditionStore.availableExpeditions.length }}/{{ EXPEDITION_MAX_AVAILABLE }}</span>
          <span class="ec-stat-label">Offers</span>
        </div>
      </div>

      <button
        v-if="isDev"
        class="ec-admin-btn"
        @click.stop="expeditionStore.forceSpawn()"
        aria-label="Force spawn expedition (dev)"
      >
        <Icon icon="game-icons:lightning-bolt" width="12" height="12" />
        Spawn
      </button>
    </div>

    <!-- ── Scrolling body ───────────────────────────────────── -->
    <div class="ec-body">

      <!-- Max-limit warning -->
      <div v-if="!expeditionStore.canStartExpedition" class="ec-warning">
        <Icon icon="game-icons:hazard-sign" width="18" height="18" class="ec-warning-ico" />
        Maximum reached ({{ MAX_ACTIVE_EXPEDITIONS }}) — collect active expeditions first
      </div>

      <!-- ══ ACTIVE EXPEDITIONS ═══════════════════════════════ -->
      <section v-if="activeCount > 0" class="ec-section">
        <div
          class="ec-section-banner ec-section-banner--active"
          role="button"
          tabindex="0"
          :aria-expanded="!activeCollapsed"
          @click="activeCollapsed = !activeCollapsed"
          @keydown.enter.prevent="activeCollapsed = !activeCollapsed"
          @keydown.space.prevent="activeCollapsed = !activeCollapsed"
        >
          <span class="ec-banner-chevron" :class="{ 'ec-banner-chevron--collapsed': activeCollapsed }">▾</span>
          <Icon icon="game-icons:campfire" width="24" height="24" class="ec-banner-ico" />
          <span class="ec-banner-title">Active Expeditions</span>
          <span class="ec-banner-count">{{ activeCount }}/{{ MAX_ACTIVE_EXPEDITIONS }}</span>
          <span class="ec-banner-spacer"></span>

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
            <Icon icon="game-icons:chest" width="16" height="16" />
            Collect All
            <RpgBadgeTooltip>
              <RpgNotifyBadge :count="readyCount" label="Expedition rewards ready" hoverable />
              <template #tip="{ close }">
                <RpgBadgeTooltipBody kind="expedition" :close="close" />
              </template>
            </RpgBadgeTooltip>
          </button>
        </div>

        <TransitionGroup v-show="!activeCollapsed" name="ec-card-fly" tag="div" class="ec-active-list">
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
                  <Icon :icon="exp.icon || 'game-icons:rolled-cloth'" width="24" height="24" class="ec-active-ico" />
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
                <span
                  v-for="champ in exp.assignedChampions"
                  :key="champ.name"
                  class="ec-champ-tag"
                  :style="{ color: getRoleColor(champ.role) }"
                >
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
                    width="24"
                    height="24"
                    class="ec-active-ico"
                    :style="{ color: getExpeditionColor(exp).dim }"
                  />
                  <span class="ec-active-name">{{ exp.name }}</span>
                </div>
                <span class="ec-active-time">
                  <Icon icon="game-icons:empty-hourglass" width="14" height="14" class="ec-active-time-ico" />
                  {{ getTimeRemaining(exp) }}
                </span>
              </div>

              <div class="ec-champ-tags">
                <span
                  v-for="champ in exp.assignedChampions"
                  :key="champ.name"
                  class="ec-champ-tag"
                  :style="{ color: getRoleColor(champ.role) }"
                >
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
                  <span>{{ Math.round(exp.successChance * 100) }}% success chance</span>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </section>

      <!-- ══ AVAILABLE ════════════════════════════════════════ -->
      <section class="ec-section">
        <div
          class="ec-section-banner ec-section-banner--offers"
          role="button"
          tabindex="0"
          :aria-expanded="!availableCollapsed"
          @click="availableCollapsed = !availableCollapsed"
          @keydown.enter.prevent="availableCollapsed = !availableCollapsed"
          @keydown.space.prevent="availableCollapsed = !availableCollapsed"
        >
          <span class="ec-banner-chevron" :class="{ 'ec-banner-chevron--collapsed': availableCollapsed }">▾</span>
          <Icon icon="game-icons:rolled-cloth" width="24" height="24" class="ec-banner-ico" />
          <span class="ec-banner-title">Available</span>
          <span class="ec-banner-count">{{ expeditionStore.availableExpeditions.length }}/{{ EXPEDITION_MAX_AVAILABLE }}</span>
          <span class="ec-banner-spacer"></span>

          <button
            class="ec-bulk-btn ec-bulk-btn--send"
            :class="{ 'ec-bulk-btn--muted': !canSendAll }"
            :disabled="!canSendAll"
            @click.stop="sendAll"
            aria-label="Send all available expeditions"
          >
            <Icon icon="game-icons:camping-tent" width="16" height="16" />
            Send All
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="!availableCollapsed && expeditionStore.availableExpeditions.length === 0" class="ec-empty">
          <div class="ec-empty-icon">✦</div>
          <div>No expeditions available</div>
          <div class="ec-empty-sub">Next in {{ formatCountdown(timeUntilNextSpawn) }}</div>
        </div>

        <!-- Offer rows -->
        <TransitionGroup
          v-if="expeditionStore.availableExpeditions.length > 0"
          v-show="!availableCollapsed"
          name="ec-card-fly"
          tag="div"
          class="ec-offer-list"
        >
          <div
            v-for="slot in expeditionStore.availableExpeditions"
            :key="slot.id"
            class="ec-card"
            :class="[
              canQuickstart(slot) ? 'ec-card--available' : 'ec-card--locked',
              isExpiringSoon(slot) ? 'ec-card--expiring' : ''
            ]"
            :style="cardStyle(slot)"
          >
            <div class="ec-card-accent"></div>

            <div class="ec-card-body">
              <div class="ec-card-icon-wrap">
                <Icon :icon="slot.icon" width="48" height="48" class="ec-card-ico" :style="{ color: getColor(slot.colorKey).primary }" />
              </div>

              <div class="ec-card-info">
                <div class="ec-card-top">
                  <span class="ec-card-name">{{ slot.name }}</span>
                  <span v-if="slot.tier !== 'common'" class="ec-tier-badge" :class="`ec-tier-badge--${slot.tier}`">
                    {{ slot.tier === 'epic' ? 'EPIC' : 'RARE' }}
                  </span>
                </div>

                <div class="ec-card-meta">
                  <div class="ec-card-reward">
                    <img src="/img/BardAbilities/BardChime.png" class="ec-chime-img" alt="" aria-hidden="true" />
                    <span class="ec-reward-amount">{{ $formatNumber(slot.baseReward) }}</span>
                    <span class="ec-reward-label">Chimes</span>
                  </div>
                  <span class="ec-meta-sep">·</span>
                  <div class="ec-card-duration">
                    <Icon icon="game-icons:empty-hourglass" width="15" height="15" class="ec-dur-ico" />
                    <span>{{ formatDuration(slot.durationSeconds) }}</span>
                  </div>
                  <span class="ec-meta-sep">·</span>
                  <div class="ec-card-roles">
                    <img
                      v-for="(role, i) in slot.requiredRoles"
                      :key="`${role}-${i}`"
                      :src="ROLE_IMG[role]"
                      :alt="role"
                      :title="role"
                      class="ec-role-img"
                    />
                  </div>
                </div>

                <!-- Auto-selected crew: who quickstart sends + their chance share -->
                <div class="ec-card-crew">
                  <span
                    v-for="(p, ci) in getQuickstartPreview(slot)"
                    :key="p.role"
                    class="ec-crew-chip"
                  >
                    <img
                      v-if="p.champion"
                      :src="getChampionImage(p.champion)"
                      :alt="p.champion"
                      class="ec-crew-img"
                    />
                    <img v-else :src="ROLE_IMG[p.role]" :alt="p.role" class="ec-crew-img ec-crew-img--role" />
                    <span
                      class="ec-crew-name"
                      :class="{ 'ec-crew-name--missing': !p.champion }"
                      :style="p.champion ? { color: getRoleColor(p.role) } : undefined"
                    >
                      {{ p.champion ?? 'no champion' }}
                    </span>
                    <span v-if="p.champion && getCrewShares(slot)" class="ec-crew-share">
                      +{{ getCrewShares(slot)![ci] }}%
                    </span>
                  </span>
                </div>

                <div class="ec-avail-timer" :class="{ 'ec-avail-timer--expiring': isExpiringSoon(slot) }">
                  <span>{{ isExpiringSoon(slot) ? '⚠' : '⏱' }}</span>
                  <span>{{ formatCountdown(slot.availableUntil - now) }} left</span>
                </div>
              </div>

              <div class="ec-card-side" :title="getTooltipText(slot)">
                <div
                  v-if="getQuickstartChance(slot) !== null"
                  class="ec-qs-chance"
                  :class="chanceTone(getQuickstartChance(slot)!)"
                  title="Success chance with the quickstart lineup"
                >
                  {{ Math.round(getQuickstartChance(slot)! * 100) }}% success
                </div>
                <button
                  class="ec-qs-btn"
                  :class="canQuickstart(slot) ? 'ec-qs-btn--active' : 'ec-qs-btn--disabled'"
                  :disabled="!canQuickstart(slot)"
                  @click.stop="quickstartExpedition(slot)"
                >
                  <Icon icon="game-icons:plasma-bolt" width="18" height="18" class="ec-qs-ico" />
                  Quickstart
                </button>
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
  ROLE_BY_KEY,
  type ExpeditionColorDef,
} from '@/config/constants'
import { useActionToast } from '@/composables/useActionToast'
import type { ChampionRole, AvailableExpeditionSlot, ExpeditionMission } from '@/types'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import RpgBadgeTooltipBody from '@/components/ui/RpgBadgeTooltipBody.vue'

const ROLE_IMG: Record<string, string> = {
  top:     '/img/roles/top.png',
  jungle:  '/img/roles/jungle.png',
  mid:     '/img/roles/mid.png',
  adc:     '/img/roles/adc.png',
  support: '/img/roles/supp.png',
}

export default defineComponent({
  name: 'ExpeditionComponent',
  components: { Icon, RpgNotifyBadge, RpgBadgeTooltip, RpgBadgeTooltipBody },
  setup() {
    const expeditionStore = useExpeditionStore()
    const battleStore = useBattleStore()
    const { showToast } = useActionToast()

    const now = ref(Date.now())
    const isDev = import.meta.env.DEV
    const collectFlashing = ref(false)
    // Collapsible sections — both expanded by default
    const activeCollapsed = ref(false)
    const availableCollapsed = ref(false)

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
    /** Success chance of the quickstart lineup, or null if a role can't be filled. */
    function getQuickstartChance(slot: AvailableExpeditionSlot): number | null {
      const preview = getQuickstartPreview(slot)
      if (preview.some((p) => !p.champion)) return null
      const assigned = preview.map((p) => ({ name: p.champion!, role: p.role }))
      return expeditionStore.calculateSuccessChance(
        assigned,
        slot.requiredRoles,
        slot.minPowerThreshold,
      )
    }
    function chanceTone(chance: number): string {
      if (chance >= 0.7) return 'ec-qs-chance--good'
      if (chance >= 0.45) return 'ec-qs-chance--mid'
      return 'ec-qs-chance--bad'
    }

    /** Per-champion share of the total chance (largest-remainder rounding so the
     *  shares sum exactly to the rounded total shown at the quickstart button). */
    function getCrewShares(slot: AvailableExpeditionSlot): number[] | null {
      const chance = getQuickstartChance(slot)
      if (chance === null) return null
      const n = slot.requiredRoles.length
      const totalPct = Math.round(chance * 100)
      const base = Math.floor(totalPct / n)
      const remainder = totalPct - base * n
      return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0))
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
    /** Role accent color (same palette as everywhere else in the app). */
    function getRoleColor(role: ChampionRole): string {
      return ROLE_BY_KEY[role]?.color ?? '#e8c040'
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
      activeCollapsed,
      availableCollapsed,
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
      getQuickstartChance,
      chanceTone,
      getCrewShares,
      getProgress,
      getTimeRemaining,
      getChampionImage,
      getRoleColor,
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
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* ── Status strip (fixed — only the body below scrolls) ───── */
.ec-status-strip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #16100a;
  border-bottom: 2px solid #5c3310;
}
.ec-stat {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 14px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid #3e200a;
}
.ec-stat-ico { color: rgba(200, 144, 64, 0.6); flex-shrink: 0; }
.ec-stat-text { display: flex; flex-direction: column; gap: 1px; }
.ec-stat-value {
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ec-stat-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
  line-height: 1;
}
.ec-stat--full { border-color: #5c3310; background: rgba(200, 144, 64, 0.1); }
.ec-stat--full .ec-stat-value { color: #e8c040; }
.ec-stat--live { border-color: rgba(100, 220, 180, 0.35); background: rgba(100, 220, 180, 0.06); }
.ec-stat--live .ec-stat-value { color: #a0f0d0; }
.ec-stat--live .ec-stat-ico { color: rgba(100, 220, 180, 0.6); }

/* ── Admin Button ─────────────────────────────────────────── */
.ec-admin-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 6px 12px;
  background: #1c1008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(200, 144, 64, 0.55);
  font-size: 11px;
  font-weight: 800;
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

/* ── Body — the panel's only scroll area ──────────────────── */
.ec-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 14px 14px 12px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.ec-body::-webkit-scrollbar {
  width: 4px;
}
.ec-body::-webkit-scrollbar-track {
  background: #111;
}
.ec-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* ── Section ──────────────────────────────────────────────── */
.ec-section { display: flex; flex-direction: column; gap: 11px; }

/* Section headlines — big glowing titles (no box, so they can't be mistaken
   for cards), color-coded with a gradient underline; click to collapse */
.ec-section-banner {
  --sec-c: #e8c040;
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 2px 2px 10px;
  cursor: pointer;
  user-select: none;
}
.ec-section-banner::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--sec-c), color-mix(in srgb, var(--sec-c) 35%, transparent) 55%, transparent);
}
.ec-section-banner--active { --sec-c: #64dcb4; }
.ec-section-banner--active .ec-banner-ico,
.ec-section-banner--active .ec-banner-title,
.ec-section-banner--active .ec-banner-chevron { color: #a0f0d0; }
.ec-section-banner--offers { --sec-c: #e8c040; }
.ec-section-banner--offers .ec-banner-ico,
.ec-section-banner--offers .ec-banner-title,
.ec-section-banner--offers .ec-banner-chevron { color: #e8c040; }
.ec-section-banner:hover .ec-banner-title {
  text-shadow: 0 0 18px color-mix(in srgb, var(--sec-c) 75%, transparent);
}
.ec-banner-chevron {
  font-size: 15px;
  line-height: 1;
  opacity: 0.8;
  transition: transform 0.2s;
  flex-shrink: 0;
}
.ec-banner-chevron--collapsed { transform: rotate(-90deg); }
.ec-banner-ico {
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--sec-c) 50%, transparent));
}
.ec-banner-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1;
  text-shadow: 0 0 12px color-mix(in srgb, var(--sec-c) 45%, transparent);
  transition: text-shadow 0.15s;
}
.ec-banner-count {
  font-size: 13px;
  font-weight: 700;
  color: rgba(230, 220, 196, 0.5);
  font-variant-numeric: tabular-nums;
  align-self: flex-end;
  padding-bottom: 2px;
}
.ec-banner-spacer { flex: 1; }

/* ── Bulk Action Buttons ──────────────────────────────────── */
.ec-bulk-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
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
.ec-active-list { display: flex; flex-direction: column; gap: 10px; }
.ec-active-card {
  position: relative;
  overflow: hidden;
  border: 1px solid;
  border-radius: 4px;
}
.ec-active-card--success { background: #0e1a0e; border-color: rgba(82, 184, 48, 0.3); }
.ec-active-card--failure { background: #1a0e0e; border-color: rgba(204, 96, 80, 0.3); }
.ec-active-card--running { background: #1a1008; border-color: rgba(92, 51, 16, 0.5); }

.ec-active-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.ec-active-accent--success { background: linear-gradient(to right, #2e7a1a, #52b830, #2e7a1a); opacity: 0.7; }
.ec-active-accent--failure { background: linear-gradient(to right, #a04030, #cc6050, #a04030); opacity: 0.7; }
.ec-active-accent--running { background: linear-gradient(to right, transparent, var(--exp-p, #e8c040), transparent); opacity: 0.5; }

.ec-active-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px 15px 12px;
}
.ec-active-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ec-active-name-wrap { display: flex; align-items: center; gap: 9px; min-width: 0; }
.ec-active-ico { color: #c89040; flex-shrink: 0; }
.ec-active-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-active-time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 800;
  color: rgba(200, 144, 64, 0.75);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.ec-active-time-ico { color: rgba(200, 144, 64, 0.5); }

/* Status badge */
.ec-status-badge {
  flex-shrink: 0;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid;
  border-radius: 4px;
}
.ec-status-badge--success { background: rgba(82, 184, 48, 0.12); border-color: rgba(82, 184, 48, 0.35); color: #52b830; }
.ec-status-badge--failure { background: rgba(204, 96, 80, 0.12); border-color: rgba(204, 96, 80, 0.35); color: #cc6050; }

/* Champion tags — same look as the quickstart preview rows */
.ec-champ-tags { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.ec-champ-tag {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #e8c040;
}
.ec-champ-img {
  width: 32px;
  height: 32px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.4);
  image-rendering: auto;
  flex-shrink: 0;
}

/* Reward + collect footer */
.ec-active-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ec-active-reward { display: flex; align-items: center; gap: 7px; }
.ec-active-reward-amount {
  font-size: 19px;
  font-weight: 800;
  color: #ffd060;
  font-variant-numeric: tabular-nums;
}
.ec-active-reward-amount--fail { color: #cc6050; }
.ec-active-reward-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(200, 144, 64, 0.55);
}
.ec-collect-btn {
  padding: 8px 24px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
  border-radius: 4px;
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
.ec-progress { display: flex; flex-direction: column; gap: 6px; }
.ec-progress-track {
  width: 100%;
  height: 12px;
  background: #111008;
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 4px;
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
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
}

/* ── Warning / Empty ──────────────────────────────────────── */
.ec-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1a0a08;
  border: 1px solid #cc6050;
  border-radius: 4px;
  color: #cc6050;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.ec-warning-ico { color: #e8c040; flex-shrink: 0; }
.ec-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 44px 0 40px;
  color: rgba(200, 144, 64, 0.35);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
}
.ec-empty-icon { font-size: 30px; opacity: 0.35; margin-bottom: 4px; }
.ec-empty-sub {
  font-size: 15px;
  font-weight: 800;
  color: rgba(200, 144, 64, 0.6);
  letter-spacing: 0.04em;
  text-transform: none;
  font-variant-numeric: tabular-nums;
}

/* ── Offer list (one large row per offer) ─────────────────── */
.ec-offer-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Available Card ───────────────────────────────────────── */
.ec-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(var(--exp-glow, 200,144,64), 0.035) 0%, #1a1008 38%);
  border: 1px solid color-mix(in srgb, var(--exp-d, #7a4e20) 55%, #241408);
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(62, 32, 10, 0.6);
  overflow: visible;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ec-card--available:hover {
  border-color: color-mix(in srgb, var(--exp-p, #e8c040) 75%, transparent);
  box-shadow: inset 0 0 0 1px rgba(62, 32, 10, 0.6), 0 0 14px rgba(var(--exp-glow, 232,192,64), 0.18);
}
.ec-card--available:hover .ec-card-ico {
  opacity: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))
    drop-shadow(0 0 12px rgba(var(--exp-glow, 200, 144, 64), 0.5));
  transform: scale(1.06);
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
  height: 2px;
  background: linear-gradient(to right, transparent, var(--exp-p, #e8c040) 30%, var(--exp-p, #e8c040) 70%, transparent);
  opacity: 0.45;
  flex-shrink: 0;
  border-radius: 2px 2px 0 0;
}

/* Tier badge — inline next to the name */
.ec-tier-badge {
  flex-shrink: 0;
  padding: 3px 9px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  border-radius: 4px;
  border: 1px solid;
  color: var(--exp-p, #e8c040);
  border-color: var(--exp-d, #c89040);
  background: rgba(var(--exp-glow, 200,144,64), 0.15);
}
.ec-tier-badge--epic { box-shadow: 0 0 8px rgba(var(--exp-glow, 232,192,64), 0.5); }

/* Card body — icon | info | quickstart */
.ec-card-body {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 15px;
  flex: 1;
}
/* Frameless icon — floats on the card with a soft glow in the expedition color */
.ec-card-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  background: radial-gradient(circle, rgba(var(--exp-glow, 200, 144, 64), 0.12) 0%, transparent 68%);
}
.ec-card-ico {
  opacity: 0.85;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))
    drop-shadow(0 0 6px rgba(var(--exp-glow, 200, 144, 64), 0.2));
  transition: filter 0.15s, transform 0.15s, opacity 0.15s;
}
.ec-card-info { display: flex; flex-direction: column; gap: 7px; flex: 1; min-width: 0; }
.ec-card-top { display: flex; align-items: center; gap: 9px; min-width: 0; }
.ec-card-name {
  font-size: 17px;
  font-weight: 700;
  color: color-mix(in srgb, var(--exp-p, #e8c040) 62%, #cfc2a4);
  letter-spacing: 0.02em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-card-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ec-meta-sep { color: rgba(200, 144, 64, 0.3); font-size: 13px; line-height: 1; }
.ec-card-reward { display: flex; align-items: center; gap: 5px; }
.ec-chime-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.ec-reward-amount { font-size: 16px; font-weight: 800; color: #ffd060; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.ec-reward-label {
  font-size: 10px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.55);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ec-card-duration {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.7);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
.ec-dur-ico { color: rgba(200, 144, 64, 0.55); flex-shrink: 0; }
.ec-card-roles { display: flex; align-items: center; gap: 4px; }
.ec-role-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  image-rendering: auto;
  flex-shrink: 0;
}
.ec-avail-timer {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--exp-p, #e8c040);
  letter-spacing: 0.03em;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
}
.ec-avail-timer--expiring { color: #cc6050; opacity: 1; font-weight: 800; }

/* Quickstart column */
.ec-card-side {
  flex-shrink: 0;
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}
.ec-qs-chance {
  text-align: center;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.ec-qs-chance--good { color: #52b830; }
.ec-qs-chance--mid { color: #e8c040; }
.ec-qs-chance--bad { color: #cc6050; }
.ec-qs-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px 22px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
  transition: box-shadow 0.18s, background 0.18s;
  white-space: nowrap;
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
  color: rgba(200, 144, 64, 0.25);
  cursor: not-allowed;
}

/* Auto-selected crew — always visible on the card */
.ec-card-crew {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
}
.ec-crew-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.ec-crew-img {
  width: 28px;
  height: 28px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.4);
  image-rendering: auto;
  flex-shrink: 0;
}
.ec-crew-img--role {
  padding: 5px;
  object-fit: contain;
  opacity: 0.6;
  border-style: dashed;
}
.ec-crew-name {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.ec-crew-name--missing { color: rgba(204, 96, 80, 0.7); font-style: italic; }
.ec-crew-share {
  font-size: 12px;
  font-weight: 800;
  color: #ffd060;
  font-variant-numeric: tabular-nums;
}

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
