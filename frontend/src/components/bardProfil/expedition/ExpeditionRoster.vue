<script setup lang="ts">
/**
 * Wer verfügbar ist und wie stark — der Fuss des Reiters.
 *
 * Expeditionen lesen Champion-Stats, „wen soll ich schicken" hat also eine
 * Antwort, die sich mit jedem Level ändert. Hier steht sie: der ganze Kader,
 * nach Expeditionsstärke sortiert, mit allem, was ihn gerade bindet.
 *
 * Ein Klick setzt in den offenen Vertrag. Das ist die andere Frage als die des
 * Sitz-Popovers: das beginnt beim SITZ („wer passt hierhin"), der Streifen
 * beim CHAMPION („ich will Ekko schicken"). Kein Drag — auf einem seitwärts
 * rollenden Streifen kämpfte die Ziehgeste ab dem ersten Pixel mit der
 * Rollgeste.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { getChampionRoles } from '@/config/champions/championData'
import { getOriginColor } from '@/config/champions/championOrigins'
import { gameNow } from '@/utils/game/gameClock'
import { VOYAGE_CREW_CHIP_H } from '@/config/constants'
import type { AvailableExpeditionSlot, ChampionRole } from '@/types'

const props = defineProps<{
  /** Der Vertrag, in den ein Klick setzt — oder null, dann ist der Streifen
   *  eine reine Ablesung. */
  offer: AvailableExpeditionSlot | null
}>()
const emit = defineEmits<{ assign: [string] }>()

const expeditionStore = useExpeditionStore()
const chartStore = useExpeditionChartStore()
const battleStore = useBattleStore()
const levelStore = useChampionLevelStore()

interface RosterEntry {
  name: string
  power: number
  level: number
  role: ChampionRole
  away: boolean
  /** Sitzt auf dem Sigil-Board — kämpft also und reist nicht. */
  seated: boolean
  /** Zehrung aus einer früheren Reise; darf mit, bringt aber weniger. */
  weary: boolean
  restsIn: string
  /** Sitzt bereits im offenen Vertrag. */
  here: boolean
}

const crewHere = computed(() =>
  props.offer ? expeditionStore.crewFor(props.offer).filter((c): c is string => !!c) : [],
)

const roster = computed<RosterEntry[]>(() => {
  const away = expeditionStore.championsOnExpedition
  const seated = battleStore.assignedChampions
  const seatedHere = crewHere.value
  const now = gameNow()
  return battleStore.ownedChampions
    .filter((c: string) => c !== 'Bard')
    .map((name: string) => {
      const until = chartStore.wearyUntil[name] ?? 0
      return {
        name,
        power: Math.round(expeditionStore.crewPowerOf([name])),
        level: levelStore.levelOf(name),
        role: (getChampionRoles(name)[0] ?? 'mid') as ChampionRole,
        away: away.includes(name),
        seated: seated.includes(name),
        weary: chartStore.isWeary(name),
        restsIn: until > now ? clock(until - now) : '',
        here: seatedHere.includes(name),
      }
    })
    // Bereit zuerst, dann die Müden, dann die Reisenden, zuletzt die Kämpfenden —
    // die Reihenfolge beantwortet „wen kann ich jetzt schicken" von links nach rechts.
    .sort((a, b) => {
      const rank = (r: RosterEntry) => (r.away ? 2 : r.seated ? 3 : r.weary ? 1 : 0)
      if (rank(a) !== rank(b)) return rank(a) - rank(b)
      return b.power - a.power
    })
})

const availableCount = computed(
  () => roster.value.filter((r) => !r.away && !r.seated && !r.weary).length,
)
const wearyCount = computed(() => roster.value.filter((r) => r.weary && !r.away && !r.seated).length)
const seatedCount = computed(() => roster.value.filter((r) => r.seated).length)
const allSeated = computed(
  () => roster.value.length > 0 && roster.value.every((r) => r.away || r.seated),
)

function clock(ms: number): string {
  const secs = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}

function championImage(name: string): string {
  return battleStore.getChampionImage(name, { size: 'sm' })
}
function roleImg(role: ChampionRole): string {
  return `/img/roles/${role === 'support' ? 'supp' : role}-128.png`
}

function bindable(r: RosterEntry): boolean {
  return !!props.offer && !r.away && !r.seated
}

function hint(r: RosterEntry): string {
  if (r.away) return `${r.name} — in the field`
  if (r.seated) return `${r.name} — on the board, cannot travel`
  if (!props.offer) return `${r.name} — Lv ${r.level}`
  if (r.here) return `${r.name} — seated, click to remove`
  if (r.weary) return `${r.name} — weary for ${r.restsIn}, click to seat anyway`
  return `${r.name} — click to seat`
}

function onPick(r: RosterEntry) {
  if (!bindable(r)) return
  emit('assign', r.name)
}
</script>

<template>
  <section class="ers-rail" :style="{ '--chip-h': `${VOYAGE_CREW_CHIP_H}px` }">
    <header class="ers-head">
      <Icon icon="game-icons:meeple-group" width="16" height="16" class="ers-head-ico" />
      <span class="ers-head-title">Crew</span>
      <span class="ers-head-count">{{ availableCount }} ready</span>
      <span v-if="wearyCount" class="ers-head-weary">{{ wearyCount }} resting</span>
      <span v-if="seatedCount" class="ers-head-seated">{{ seatedCount }} on the board</span>
      <span class="ers-head-hint">
        {{ offer ? 'click a name to seat them' : 'sorted by expedition strength' }}
      </span>
    </header>

    <div class="ers-list">
      <button
        v-for="r in roster"
        :key="r.name"
        class="ers-chip"
        :class="{
          'ers-chip--away': r.away,
          'ers-chip--seated': r.seated,
          'ers-chip--weary': r.weary && !r.away && !r.seated,
          'ers-chip--here': r.here,
          'ers-chip--bindable': bindable(r),
        }"
        :disabled="!bindable(r)"
        :title="hint(r)"
        :aria-label="hint(r)"
        @click="onPick(r)"
      >
        <img :src="championImage(r.name)" :alt="''" class="ers-img" />
        <img :src="roleImg(r.role)" :alt="r.role" class="ers-role" />
        <span class="ers-text">
          <span class="ers-name" :style="{ color: getOriginColor(r.name) }">{{ r.name }}</span>
          <span class="ers-sub">
            <span class="ers-power">{{ r.power }}</span>
            <span v-if="r.weary && !r.away && !r.seated" class="ers-rests">{{ r.restsIn }}</span>
          </span>
        </span>
        <Icon v-if="r.here" icon="ph:check-fat-fill" width="13" height="13" class="ers-mark" />
        <Icon v-else-if="r.away" icon="ph:tent-fill" width="13" height="13" class="ers-mark" />
        <Icon v-else-if="r.seated" icon="ph:shield-fill" width="13" height="13" class="ers-mark" />
        <Icon
          v-else-if="r.weary"
          icon="ph:moon-fill"
          width="13"
          height="13"
          class="ers-mark ers-mark--weary"
        />
      </button>

      <div v-if="!roster.length" class="ers-empty">No champions recruited yet</div>
      <div v-else-if="allSeated" class="ers-empty">
        Every champion you own is fighting or travelling — free a seat or recruit another
      </div>
    </div>
  </section>
</template>

<style scoped>
.ers-rail {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px 12px 8px;
  min-height: 0;
  background: #16100a;
  border-top: 2px solid #5c3310;
}
.ers-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-shrink: 0;
}
.ers-head-ico {
  color: #c89040;
  align-self: center;
  flex-shrink: 0;
}
.ers-head-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8c040;
}
.ers-head-count {
  font-size: 11px;
  font-weight: 700;
  color: rgba(160, 240, 208, 0.75);
  font-variant-numeric: tabular-nums;
}
.ers-head-weary {
  font-size: 11px;
  font-weight: 700;
  color: rgba(160, 176, 224, 0.7);
  font-variant-numeric: tabular-nums;
}
.ers-head-seated {
  font-size: 11px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.45);
  font-variant-numeric: tabular-nums;
}
.ers-head-hint {
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(200, 144, 64, 0.4);
}

.ers-list {
  display: flex;
  gap: 6px;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 3px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.ers-list::-webkit-scrollbar {
  height: 4px;
}
.ers-list::-webkit-scrollbar-track {
  background: #111;
}
.ers-list::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.ers-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: var(--chip-h);
  padding: 4px 9px 4px 4px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid #3e200a;
  border-left: 3px solid transparent;
  border-radius: 4px;
  cursor: default;
  transition:
    background 0.13s,
    border-color 0.13s;
}
.ers-chip--bindable {
  cursor: pointer;
}
.ers-chip--bindable:hover {
  background: rgba(200, 144, 64, 0.1);
  border-left-color: #c89040;
}
.ers-chip--here {
  border-color: rgba(232, 192, 64, 0.55);
  border-left-color: #e8c040;
  background: rgba(200, 144, 64, 0.14);
}
/* Statischer Graufilter, kein Dauerläufer — ein Zustand, keine Animation. */
.ers-chip--away {
  opacity: 0.42;
  filter: grayscale(55%);
}
/* Auf dem Board: leiser als „unterwegs", weil es kein Warten ist, sondern eine
   Entscheidung, die der Spieler jederzeit zurücknehmen kann. */
.ers-chip--seated {
  opacity: 0.45;
}
.ers-chip--weary {
  opacity: 0.78;
  border-color: rgba(120, 136, 184, 0.4);
}

.ers-img {
  width: 26px;
  height: 26px;
  object-fit: cover;
  object-position: center top;
  border-radius: 50%;
  border: 1px solid rgba(200, 144, 64, 0.4);
  flex-shrink: 0;
}
.ers-role {
  width: 14px;
  height: 14px;
  object-fit: contain;
  opacity: 0.65;
  flex-shrink: 0;
}
.ers-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  text-align: left;
}
.ers-name {
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ers-sub {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.ers-power {
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.ers-rests {
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: rgba(160, 176, 224, 0.8);
  font-variant-numeric: tabular-nums;
}
.ers-mark {
  color: rgba(200, 144, 64, 0.7);
  flex-shrink: 0;
}
.ers-mark--weary {
  color: rgba(160, 176, 224, 0.8);
}
.ers-chip--here .ers-mark {
  color: #e8c040;
}

.ers-empty {
  padding: 12px 6px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.4);
}
</style>
