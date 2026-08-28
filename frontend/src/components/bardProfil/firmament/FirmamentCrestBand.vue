<script setup lang="ts">
/**
 * Der Kopf des Firmaments: wo der Bard steht, wie weit bis zum Aufbruch, und
 * was die Reise bisher hergab.
 *
 * Drei Leitern und keine vierte. Universums-Rettung, Wayfinder und Codex sind
 * die einzigen, die "wie weit insgesamt" beantworten — Forge, Meep-Baum, Solar
 * und Rang stehen vollstaendig im Journey-Reiter, und sie hier zu wiederholen
 * waere die Doppelung, gegen die dieser Reiter geschrieben ist.
 *
 * Die Hoehe ist FEST und haengt per `v-bind` an ihrer Konstante — was das Band
 * nimmt, nimmt es der Karte.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useMissionStore } from '@/stores/progression/missionStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { getUniverse } from '@/config/progression/universes'
import { formatNumber } from '@/config/ui/numberFormat'
import { formatCompactDuration, formatShortDuration, toRoman } from '@/utils/ui/format'
import { MISSION_COUNT } from '@/config/progression/missions'
import { CHRONICLE_TOTAL_STAGES } from '@/config/progression/achievements'
import {
  FIRMAMENT_CREST_BAND_H,
  FIRMAMENT_CREST_ID_W,
  MS_PER_SECOND,
  UNIVERSE_DISC_CREST_PX,
} from '@/config/constants'
import UniverseDisc from './UniverseDisc.vue'
import type { FirmamentGate, FirmamentNode } from '@/utils/ui/firmamentLayout'

const props = defineProps<{ nodes: FirmamentNode[]; gates: FirmamentGate[] }>()

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const providenceStore = useProvidenceStore()
const missionStore = useMissionStore()
const achievementStore = useAchievementStore()

const universe = computed(() => getUniverse(gameStore.currentUniverse))
const progress = computed(() => gameStore.universeRescueProgress)

/** Die Uhr bis zum Aufbruch in SPIELsekunden — dieselbe Zeitrechnung wie CpS.
 *  Ohne Produktion gibt es keine Ankunft, dann steht ein Strich. */
const eta = computed(() => {
  const left = gameStore.chimesToUniverseRescue - gameStore.chimesForNextUniverse
  if (left <= 0) return 'ready'
  const cps = gameStore.chimesPerSecond
  return cps > 0 ? `~${formatShortDuration(left / cps)}` : '—'
})

/** Laeufe ohne Tor auf der Bahn: aus dem Archiv geschoben, oder ihre Galaxien
 *  stehen nicht mehr im Bestand. Das Band nennt sie, statt sie zu verschweigen. */
const untoldRuns = computed(() => Math.max(0, gameStore.universeRuns.length - props.gates.length))

const freedCount = computed(() => props.nodes.filter((n) => n.state === 'freed').length)

const bandH = `${FIRMAMENT_CREST_BAND_H}px`
const idW = `${FIRMAMENT_CREST_ID_W}px`
</script>

<template>
  <div class="fm-crest">
    <!-- Wappen: wo der Bard gerade steht. -->
    <div class="fm-crest-id">
      <span class="fm-crest-medal">
        <UniverseDisc
          :universe="gameStore.currentUniverse"
          state="current"
          :px="UNIVERSE_DISC_CREST_PX"
        />
        <span class="fm-crest-roman">{{ toRoman(gameStore.currentUniverse) }}</span>
      </span>
      <span class="fm-crest-name-box">
        <span class="fm-crest-kicker">
          Firmament · Universe {{ toRoman(gameStore.currentUniverse) }}
        </span>
        <span class="fm-crest-name">{{ universe.name }}</span>
        <span class="fm-crest-prov">
          <Icon icon="game-icons:eye-of-horus" width="13" height="13" />
          <span class="fm-crest-prov-text">
            {{ providenceStore.active?.name ?? 'no providence drawn' }}
          </span>
        </span>
      </span>
    </div>

    <!-- Die drei Leitern, die "wie weit insgesamt" beantworten. -->
    <div class="fm-crest-track">
      <div class="fm-crest-track-top">
        <span class="fm-crest-label">Rescue of the next universe</span>
        <span class="fm-crest-figures">
          <span class="fm-crest-num">{{ formatNumber(gameStore.chimesForNextUniverse) }}</span>
          / {{ formatNumber(gameStore.chimesToUniverseRescue) }}
          <span class="fm-crest-eta">· {{ eta }}</span>
        </span>
      </div>
      <div class="fm-crest-bar">
        <span class="fm-crest-bar-fill" :style="{ width: `${progress}%` }" />
      </div>
      <div class="fm-crest-ladders">
        <span class="fm-crest-ladder">
          <Icon icon="ph:compass-rose-fill" width="13" height="13" class="fm-ico-way" />
          Wayfinder
          <b>{{ missionStore.claimedCount }} / {{ MISSION_COUNT }}</b>
        </span>
        <span class="fm-crest-ladder">
          <Icon icon="game-icons:star-swirl" width="13" height="13" class="fm-ico-codex" />
          Codex
          <b>{{ achievementStore.unlockedStageCount }} / {{ CHRONICLE_TOTAL_STAGES }}</b>
        </span>
        <span class="fm-crest-ladder">
          <Icon icon="game-icons:portal" width="13" height="13" class="fm-ico-gate" />
          Departures
          <b>{{ gameStore.totalPrestiges }}</b>
          <i v-if="untoldRuns > 0" class="fm-crest-untold">· {{ untoldRuns }} unmarked</i>
        </span>
      </div>
    </div>

    <!-- Was die Reise hergab. -->
    <div class="fm-crest-stats">
      <div class="fm-crest-stat fm-crest-stat--s">
        <span class="fm-crest-stat-v fm-crest-stat-v--gold">{{ freedCount }}</span>
        <span class="fm-crest-stat-k">Galaxies</span>
      </div>
      <div class="fm-crest-stat fm-crest-stat--l">
        <span class="fm-crest-stat-v fm-crest-stat-v--gold">
          {{ galaxyStore.totalStarsRescued }}<span class="fm-crest-stat-sep"> / </span
          ><span class="fm-crest-stat-lost">{{ galaxyStore.totalStarsLost }}</span>
        </span>
        <span class="fm-crest-stat-k">Won / lost</span>
      </div>
      <div class="fm-crest-stat fm-crest-stat--s">
        <span class="fm-crest-stat-v fm-crest-stat-v--land">
          {{ galaxyStore.totalLandfallsCleared }}
        </span>
        <span class="fm-crest-stat-k">Landfalls</span>
      </div>
      <div class="fm-crest-stat fm-crest-stat--m">
        <span class="fm-crest-stat-v fm-crest-stat-v--time">
          {{ formatCompactDuration(gameStore.inGameTime * MS_PER_SECOND) }}
        </span>
        <span class="fm-crest-stat-k">In flight</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fm-crest {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  height: v-bind(bandH);
  display: flex;
  align-items: stretch;
  background: #16120a;
  border-bottom: 2px solid #3e200a;
}

/* Wappen */
.fm-crest-id {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 v-bind(idW);
  min-width: 0;
  padding: 0 16px;
}

/* Dieselbe Scheibe wie in der Leiste, nur gross — das Heldenbild des Reiters.
   Kein Teller darunter: sie ist rund und braucht keinen Kasten. */
.fm-crest-medal {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.fm-crest-roman {
  position: absolute;
  right: -4px;
  bottom: -2px;
  padding: 1px 5px;
  font-size: 10.5px;
  font-weight: 900;
  color: #0c0a06;
  background: #c8b890;
  border-radius: 3px;
}

.fm-crest-name-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.fm-crest-kicker {
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a52;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-crest-name {
  font-size: clamp(17px, 1.15vw, 21px);
  line-height: 1.05;
  color: #f2ead2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-crest-prov {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 12px;
  color: #c9a8f0;
}

.fm-crest-prov-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Leitern */
.fm-crest-track {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 0 18px;
  border-left: 1px solid #2a1c0c;
}

.fm-crest-track-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.fm-crest-label {
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a52;
  white-space: nowrap;
}

.fm-crest-figures {
  font-size: 14px;
  color: #e8dcc0;
  white-space: nowrap;
}

.fm-crest-num {
  font-weight: 900;
  color: #e8c040;
}

.fm-crest-eta {
  color: #8a7a52;
}

.fm-crest-bar {
  position: relative;
  height: 10px;
  background: #100e08;
  border: 1px solid #3a2c14;
  border-radius: 3px;
  overflow: hidden;
}

/* Der Fuellstand wechselt einmal je Sekunde — eine Breite, kein Dauerlaeufer. */
.fm-crest-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(to bottom, #e8c060, #a87418);
}

.fm-crest-ladders {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: #9a9184;
  white-space: nowrap;
  overflow: hidden;
}

.fm-crest-ladder {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.fm-crest-ladder b {
  color: #e8dcc0;
  font-weight: 900;
}

.fm-crest-untold {
  font-style: normal;
  color: #7a6c50;
}

.fm-ico-way {
  color: #7ab8f0;
}

.fm-ico-codex {
  color: #f08030;
}

.fm-ico-gate {
  color: #9fe062;
}

/* Kennzahlen */
.fm-crest-stats {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  border-left: 1px solid #2a1c0c;
}

.fm-crest-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-right: 1px solid #241806;
}

.fm-crest-stat:last-child {
  border-right: none;
}

.fm-crest-stat--s {
  width: 88px;
}

.fm-crest-stat--m {
  width: 100px;
}

.fm-crest-stat--l {
  width: 124px;
}

.fm-crest-stat-v {
  font-size: clamp(18px, 1.25vw, 23px);
  line-height: 1;
  font-weight: 900;
  white-space: nowrap;
}

.fm-crest-stat-v--gold {
  color: #e8c040;
}

.fm-crest-stat-v--land {
  color: #68c0a8;
}

.fm-crest-stat-v--time {
  color: #ffd88a;
}

.fm-crest-stat-lost {
  color: #e08a7a;
}

.fm-crest-stat-sep {
  color: #5c4a30;
}

.fm-crest-stat-k {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7a52;
  white-space: nowrap;
}
</style>
