<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useMeepTreeStore } from '@/stores/meepTreeStore'
import { useExpeditionStore } from '@/stores/expeditionStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useBattleStore } from '@/stores/battleStore'
import { usePlanetShopStore, PLANET_ROLES } from '@/stores/planetShopStore'
import { useUiStore } from '@/stores/uiStore'
import { useActionToast } from '@/composables/useActionToast'
import { CHAMPION_ROLES } from '@/config/championRoles'
import {
  CHAMP_TOOLTIP_MAX_VISIBLE,
  ROLE_BY_KEY,
  STAR_PHASE_DATA,
  CHIMES_COST_ICON,
} from '@/config/constants'
import type { ChampionRole } from '@/types'

/* Shared body for every notify-badge hover tooltip (rendered inside the
   #tip slot of RpgBadgeTooltip). One component, one frame, one CSS block —
   the `kind` prop selects which content is shown. Interactive kinds
   (expedition/champions) close the surrounding tooltip via the `close` prop
   handed down from RpgBadgeTooltip's #tip slot. */
const props = defineProps<{
  kind: 'level' | 'expedition' | 'forge' | 'champions' | 'skill' | 'planet'
  /** close callback from RpgBadgeTooltip's #tip slot — lets interactive
      tooltips dismiss themselves after an action */
  close?: () => void
}>()

const gameStore = useGameStore()
const meepTree = useMeepTreeStore()
const expeditionStore = useExpeditionStore()
const solarStore = useSolarUpgradeStore()
const battleStore = useBattleStore()
const planetShopStore = usePlanetShopStore()
const uiStore = useUiStore()
const { showToast } = useActionToast()

/* ── level ──────────────────────────────────────────────────────────── */
const levelProgress = computed(() =>
  Math.max(0, Math.min(1, (gameStore.levelProgress ?? 0) / 100)),
)

/* ── expedition ─────────────────────────────────────────────────────── */
const readyExpeditions = computed(() =>
  expeditionStore.activeExpeditions.filter((e) => e.status !== 'active'),
)

function collectAll() {
  const ready = [...readyExpeditions.value]
  if (ready.length === 0) return
  for (const exp of ready) expeditionStore.collectExpedition(exp.id)
  showToast('Expedition rewards collected!')
  props.close?.()
}

/* ── forge ──────────────────────────────────────────────────────────── */
const nextPhase = computed(() => {
  if (solarStore.isCometState) return STAR_PHASE_DATA[0]
  return STAR_PHASE_DATA[solarStore.starPhase + 1] ?? null
})

/* ── champions ──────────────────────────────────────────────────────── */
const newChampions = computed(() =>
  battleStore.newlyUnlockedChampions.slice(0, CHAMP_TOOLTIP_MAX_VISIBLE),
)
const extraChampions = computed(() =>
  Math.max(0, battleStore.newlyUnlockedChampions.length - CHAMP_TOOLTIP_MAX_VISIBLE),
)

/* Game-wide role palette (ROLE_BY_KEY) — same colors as orbit, shop & roster. */
function roleOf(name: string) {
  return ROLE_BY_KEY[(CHAMPION_ROLES[name] ?? 'mid') as ChampionRole]
}

function pickChampion(name: string) {
  uiStore.requestOpenTeamTabWithSearch(name)
  props.close?.()
}

/* ── skill ──────────────────────────────────────────────────────────── */
const skillCount = computed(() => meepTree.buyableNodeCount)

/* ── planet ─────────────────────────────────────────────────────────── */
// Total level-ups affordable across all six slots (matches the header badge).
const planetLevelCount = computed(() => planetShopStore.affordableLevelCount)

interface PlanetUpgradeRow {
  id: string
  name: string
  color: string
  image: string
  level: number
  count: number
  nextCost: number
}

// One row per orbit slot that has at least one affordable level-up right now.
// Reactive: reads chimes + slots + phase via the store getters, so rows update
// (and vanish) live as the player buys from inside the tooltip.
const upgradeableSlots = computed<PlanetUpgradeRow[]>(() => {
  void gameStore.chimes // ensure re-eval when chimes change
  return planetShopStore.slots
    .filter((s) => s.purchased && !!s.role && planetShopStore.getMaxAffordableLevelCount(s.id) > 0)
    .map((s) => {
      const role = PLANET_ROLES[s.role!]
      return {
        id: s.id,
        name: role.name,
        color: role.color,
        image: role.image,
        level: s.level,
        count: planetShopStore.getMaxAffordableLevelCount(s.id),
        nextCost: planetShopStore.getPlanetLevelUpCost(s.id),
      }
    })
})

function levelUpOne(id: string) {
  planetShopStore.levelUpPlanet(id)
  // When the last affordable upgrade is spent the header badge unmounts, which
  // closes this tooltip automatically — no explicit close needed here.
}

function levelUpMax(id: string) {
  const n = planetShopStore.getMaxAffordableLevelCount(id)
  if (n > 0) planetShopStore.levelUpPlanetTimes(id, n)
}
</script>

<template>
  <div class="bt" :class="`bt--${kind}`">
    <!-- ══════════ LEVEL ══════════ -->
    <template v-if="kind === 'level'">
      <div class="bt__title">Next Level</div>
      <div class="lv-tt__body">
        <div class="lv-tt__row">
          <span class="lv-tt__current">{{
            gameStore.currentLevelChimes.toLocaleString('en-US')
          }}</span>
          <span class="lv-tt__sep">/</span>
          <span class="lv-tt__total">{{
            gameStore.totalChimesThisLevel.toLocaleString('en-US')
          }}</span>
          <span class="lv-tt__unit">Chimes</span>
        </div>
        <div class="lv-tt__bar-track">
          <div class="lv-tt__bar-fill" :style="{ width: `${levelProgress * 100}%` }" />
        </div>
      </div>
      <div class="bt__hint">{{ Math.round(levelProgress * 100) }} % to next level</div>
    </template>

    <!-- ══════════ EXPEDITION ══════════ -->
    <template v-else-if="kind === 'expedition'">
      <div class="bt__title">Expeditions Ready</div>
      <ul class="ex-tt__list">
        <li v-for="exp in readyExpeditions" :key="exp.id" class="ex-tt__item">
          <Icon
            :icon="exp.icon || 'game-icons:rolled-cloth'"
            width="24"
            height="24"
            class="ex-tt__ico"
          />
          <span class="ex-tt__name">{{ exp.name }}</span>
          <span
            class="ex-tt__status"
            :class="exp.status === 'success' ? 'ex-tt__status--ok' : 'ex-tt__status--fail'"
          >
            {{ exp.status === 'success' ? 'Success' : 'Failed' }}
          </span>
        </li>
      </ul>
      <button class="ex-tt__collect" @click.stop="collectAll">
        Collect
        <span class="ex-tt__collect-count">{{ readyExpeditions.length }}</span>
      </button>
    </template>

    <!-- ══════════ FORGE ══════════ -->
    <template v-else-if="kind === 'forge'">
      <div class="bt__title">Sun Evolution Ready</div>
      <div class="fg-tt__body">
        <span class="fg-tt__spark">✦</span>
        <div class="fg-tt__lines">
          <span v-if="nextPhase" class="fg-tt__next">
            Next phase:
            <strong :style="{ color: nextPhase.phasePrimary }">{{ nextPhase.name }}</strong>
          </span>
          <span v-else class="fg-tt__next">Your sun has reached its final phase</span>
        </div>
      </div>
      <div class="bt__hint">Open the Star Forge to evolve</div>
    </template>

    <!-- ══════════ CHAMPIONS ══════════ -->
    <template v-else-if="kind === 'champions'">
      <div class="bt__title">New Champions</div>
      <ul class="nc-tt__list">
        <li
          v-for="name in newChampions"
          :key="name"
          class="nc-tt__item"
          @click.stop="pickChampion(name)"
        >
          <img :src="battleStore.getChampionImage(name)" class="nc-tt__img" :alt="name" />
          <span class="nc-tt__name" :style="{ color: roleOf(name).color }">{{ name }}</span>
          <span
            class="nc-tt__role"
            :style="{ color: roleOf(name).color, borderColor: roleOf(name).color }"
            >{{ roleOf(name).short }}</span
          >
        </li>
        <li v-if="extraChampions > 0" class="nc-tt__item nc-tt__item--more">
          <span class="nc-tt__more-dots">…</span>
          <span class="nc-tt__more-count">+{{ extraChampions }} more</span>
        </li>
      </ul>
      <div class="bt__hint">Click a champion to open the shop</div>
    </template>

    <!-- ══════════ SKILL ══════════ -->
    <template v-else-if="kind === 'skill'">
      <div class="bt__title">Skill Ready</div>
      <div class="sk-tt__body">
        <img
          src="/img/BardAbilities/BardMeep-64.png"
          class="sk-tt__icon"
          alt=""
          aria-hidden="true"
        />
        <div class="sk-tt__lines">
          <span class="sk-tt__next">
            <strong>{{ skillCount }}</strong> skill{{ skillCount === 1 ? '' : 's' }} ready to learn
          </span>
          <span class="sk-tt__meeps">{{ $formatNumber(gameStore.meeps) }} Meeps available</span>
        </div>
      </div>
      <div class="bt__hint">Open the Skill Tree to learn</div>
    </template>

    <!-- ══════════ PLANET ══════════ -->
    <template v-else-if="kind === 'planet'">
      <div class="bt__title">Orbit Upgrades</div>
      <ul class="pu-tt__list">
        <li
          v-for="slot in upgradeableSlots"
          :key="slot.id"
          class="pu-tt__item"
          :style="{ '--rc': slot.color }"
        >
          <span class="pu-tt__frame">
            <img :src="slot.image" class="pu-tt__img" :alt="slot.name" />
          </span>
          <div class="pu-tt__meta">
            <span class="pu-tt__name">{{ slot.name }}</span>
            <span class="pu-tt__sub">
              <span class="pu-tt__lv">Lv {{ slot.level }}</span>
              <span class="pu-tt__cost">
                <Icon :icon="CHIMES_COST_ICON" width="12" height="12" class="pu-tt__cost-ico" />
                {{ $formatNumber(slot.nextCost) }}
              </span>
            </span>
          </div>
          <div class="pu-tt__actions">
            <button
              class="pu-tt__buy"
              :aria-label="`Level up ${slot.name}`"
              @click.stop="levelUpOne(slot.id)"
            >
              <Icon icon="game-icons:upgrade" width="14" height="14" />
              Level Up
            </button>
            <button
              v-if="slot.count > 1"
              class="pu-tt__max"
              :aria-label="`Level up ${slot.name} ${slot.count} times`"
              @click.stop="levelUpMax(slot.id)"
            >
              Max ×{{ slot.count }}
            </button>
          </div>
        </li>
      </ul>
      <div class="bt__hint">
        <strong class="pu-tt__hint-count">{{ planetLevelCount }}</strong>
        level-up{{ planetLevelCount === 1 ? '' : 's' }} affordable ·
        {{ $formatNumber(gameStore.chimes) }} Chimes
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── shared frame ───────────────────────────────────────────────────── */
.bt {
  padding: 8px 0 7px;
}

.bt--level {
  min-width: 190px;
}

.bt--champions {
  min-width: 240px;
}

.bt__title {
  padding: 0 12px 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  border-bottom: 1px solid #3e200a;
}

/* skill badge uses a pink accent instead of gold */
.bt--skill .bt__title {
  color: #ec4899;
}

/* planet badge uses an emerald accent instead of gold */
.bt--planet .bt__title {
  color: #34d399;
}

.bt__hint {
  padding: 5px 12px 0;
  border-top: 1px solid #3e200a;
  font-size: 0.72rem;
  color: rgba(200, 200, 220, 0.45);
  letter-spacing: 0.03em;
}

/* ── level ──────────────────────────────────────────────────────────── */
.lv-tt__body {
  padding: 8px 12px 7px;
}

.lv-tt__row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.lv-tt__current {
  font-size: 0.9rem;
  font-weight: 900;
  color: #e8c040;
}

.lv-tt__sep {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.22);
}

.lv-tt__total {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.52);
}

.lv-tt__unit {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.3);
  margin-left: 3px;
}

.lv-tt__bar-track {
  height: 4px;
  background: rgba(255, 200, 80, 0.1);
  border-radius: 2px;
  margin-top: 7px;
  overflow: hidden;
}

.lv-tt__bar-fill {
  height: 100%;
  background: linear-gradient(to right, #c89040, #f0d060);
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(240, 208, 96, 0.5);
  transition: width 0.8s ease;
}

/* ── expedition ─────────────────────────────────────────────────────── */
.ex-tt__list {
  list-style: none;
  margin: 0;
  padding: 4px 0 2px;
}

.ex-tt__item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 12px;
}

.ex-tt__ico {
  flex-shrink: 0;
  color: #c9a0ff;
}

.ex-tt__name {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #e8e0cc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ex-tt__status {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
}

.ex-tt__status--ok {
  color: #6ec040;
  background: rgba(82, 184, 48, 0.12);
  border: 1px solid rgba(110, 192, 64, 0.4);
}

.ex-tt__status--fail {
  color: #cc6050;
  background: rgba(204, 96, 80, 0.1);
  border: 1px solid rgba(204, 96, 80, 0.4);
}

.ex-tt__collect {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: calc(100% - 24px);
  margin: 6px 12px 3px;
  padding: 6px 10px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition:
    filter 0.12s,
    transform 0.12s;
}

.ex-tt__collect:hover {
  filter: brightness(1.12);
}

.ex-tt__collect:active {
  transform: scale(0.97);
}

.ex-tt__collect-count {
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 0.68rem;
  font-weight: 900;
  line-height: 1;
}

/* ── forge ──────────────────────────────────────────────────────────── */
.fg-tt__body {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}

.fg-tt__spark {
  font-size: 1.25rem;
  color: #f0d060;
  text-shadow: 0 0 8px rgba(240, 208, 96, 0.7);
  flex-shrink: 0;
}

.fg-tt__lines {
  min-width: 0;
}

.fg-tt__next {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e8e0cc;
}

/* ── champions ──────────────────────────────────────────────────────── */
.nc-tt__list {
  list-style: none;
  margin: 0;
  padding: 4px 0 2px;
}

.nc-tt__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.12s;
}

.nc-tt__item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.nc-tt__img {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  object-position: top;
  flex-shrink: 0;
  display: block;
}

.nc-tt__name {
  font-size: 1rem;
  font-weight: 700;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nc-tt__role {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  padding: 3px 5px;
  border: 1px solid;
  border-radius: 3px;
  opacity: 0.85;
}

.nc-tt__item--more {
  cursor: default;
  gap: 6px;
  padding: 5px 12px 6px;
  border-top: 1px solid #3e200a;
}

.nc-tt__item--more:hover {
  background: none;
}

.nc-tt__more-dots {
  font-size: 0.875rem;
  color: rgba(200, 200, 220, 0.35);
  font-style: italic;
}

.nc-tt__more-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(200, 200, 220, 0.45);
  letter-spacing: 0.03em;
}

/* ── skill ──────────────────────────────────────────────────────────── */
.sk-tt__body {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}

.sk-tt__icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 0 6px rgba(236, 72, 153, 0.55));
}

.sk-tt__lines {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sk-tt__next {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e8e0cc;
}

.sk-tt__next strong {
  color: #f9a8d4;
}

.sk-tt__meeps {
  font-size: 0.75rem;
  font-weight: 600;
  color: #e8c040;
}

/* ── planet — interactive orbit-upgrade list ────────────────────────── */
.bt--planet {
  min-width: 268px;
}

.pu-tt__list {
  list-style: none;
  margin: 0;
  padding: 4px 0 2px;
  display: flex;
  flex-direction: column;
}

.pu-tt__item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 12px;
}

.pu-tt__item + .pu-tt__item {
  border-top: 1px solid #221a10;
}

/* role-tinted planet medallion */
.pu-tt__frame {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: radial-gradient(circle at 50% 38%, #191712 0%, #0c0a06 100%);
  border: 1px solid var(--rc, #3a8040);
  border-radius: 4px;
  box-shadow: inset 0 0 6px color-mix(in srgb, var(--rc, #3a8040) 30%, transparent);
}

.pu-tt__img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--rc, #3a8040) 55%, transparent));
}

.pu-tt__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pu-tt__name {
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--rc, #e8e0cc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pu-tt__sub {
  display: flex;
  align-items: center;
  gap: 7px;
}

.pu-tt__lv {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #ffe9a8;
  background: linear-gradient(to bottom, #3a2a10, #241806);
  border: 1px solid #5c3310;
  border-radius: 3px;
  padding: 1px 5px;
  line-height: 1.4;
}

.pu-tt__cost {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #e8c040;
}

.pu-tt__cost-ico {
  color: #e8c040;
  flex-shrink: 0;
}

.pu-tt__actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
}

.pu-tt__buy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 9px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow:
    0 2px 5px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition:
    filter 0.12s,
    transform 0.12s;
}

.pu-tt__buy:hover {
  filter: brightness(1.12);
}

.pu-tt__buy:active {
  transform: scale(0.96);
}

.pu-tt__max {
  padding: 2px 6px;
  background: #16140e;
  border: 1px solid #3a8040;
  border-radius: 3px;
  color: #6ee7b7;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition:
    background 0.12s,
    filter 0.12s,
    transform 0.12s;
}

.pu-tt__max:hover {
  background: #1c2a18;
  filter: brightness(1.1);
}

.pu-tt__max:active {
  transform: scale(0.96);
}

.pu-tt__hint-count {
  color: #6ee7b7;
  font-weight: 900;
}
</style>
