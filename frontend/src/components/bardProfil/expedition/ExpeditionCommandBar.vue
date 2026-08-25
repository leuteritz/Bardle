<script setup lang="ts">
/**
 * Die Kopfleiste des Reiters — EIN durchgehendes Band, keine zwei Zeilen mehr.
 * Ihre Höhe ist GESETZT (`VOYAGE_COMMAND_BAR_H`): `.etc-bar` ist eine auto-Grid-
 * Zeile, was sie nimmt, nimmt sie der Bühne. Die Unterkante IST der Rangbalken.
 *
 * Drei Zonen aus einem Budget: Statussäule · Kartenspur · Aktionssäule.
 *
 * Der Schnitt ist ABLESUNG gegen HANDLUNG. Links steht, was der Spielstand sagt
 * — Rang, Fortschritt, was die nächste Stufe bringt, und die Zeit bis zum
 * nächsten Vertrag. Rechts steht nur, was man TUN kann: zwei Kacheln. Die Uhr
 * stand einmal rechts über den Knöpfen; sie gehört zur linken Frage und
 * deckelte dort nebenbei die Knopfhöhe.
 *
 * Die Spur dazwischen trägt eine Karte je EXPEDITION — was läuft, mit wem, und
 * was startbereit ist. Die Zahlen-Ablesungen davor („In field 2/3",
 * „Contracts 4/5") sind ersatzlos entfallen: beides zählt man an den Karten ab.
 *
 * Der Focus-Knopf ist gefallen — Leiste und Detailspalte haben je einen eigenen
 * Griff, er war nur die Ein-Klick-Abkürzung für beide zusammen, und Escape
 * steigt weiterhin aus, weil `chartFocus` im Reiter abgeleitet ist und kein
 * eigenes Flag. Der Dev-Spawn steht absolut in der Statussäule statt im Fluss:
 * sonst wäre die Reihe im Dev-Build 56 px breiter als beim Spieler.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import RpgNotifyBadge from '@/components/ui/RpgNotifyBadge.vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useNotifyBadgeCount } from '@/composables/ui/useNotifyBadges'
import { buildVoyageFleetCards } from '@/utils/game/voyageFleet'
import { formatMinuteClock, toRoman } from '@/utils/ui/format'
import {
  VOYAGE_COMMAND_BAR_H,
  VOYAGE_FLEET_ACT_H,
  VOYAGE_FLEET_ACT_W,
  VOYAGE_FLEET_ASIDE_W,
  VOYAGE_FLEET_BAND_GAP,
  VOYAGE_FLEET_BAND_PAD_X,
  VOYAGE_FLEET_RANK_W,
} from '@/config/constants'
import type { VoyageRailRow } from '@/types'
import ExpeditionFleetLane from './ExpeditionFleetLane.vue'

const props = defineProps<{
  now: number
  collectFlashing: boolean
  selectedKey: string | null
  rows: VoyageRailRow[]
}>()
const emit = defineEmits<{
  'collect-all': []
  'send-all': []
  open: [galaxy: number, pinKey: string | null]
}>()

const expeditionStore = useExpeditionStore()
const isDev = import.meta.env.DEV

const mainH = `${VOYAGE_COMMAND_BAR_H}px`
const rankW = `${VOYAGE_FLEET_RANK_W}px`
const asideW = `${VOYAGE_FLEET_ASIDE_W}px`
const bandPadX = `${VOYAGE_FLEET_BAND_PAD_X}px`
const bandGap = `${VOYAGE_FLEET_BAND_GAP}px`
const actW = `${VOYAGE_FLEET_ACT_W}px`
const actH = `${VOYAGE_FLEET_ACT_H}px`

const readyCount = useNotifyBadgeCount('expedition')

const rank = computed(() => expeditionStore.ledgerRank)
const nextRank = computed(() => expeditionStore.nextLedgerRank)

/** Fortschritt im LAUFENDEN Rangband, damit der Balken nie bei null neu ansetzt. */
const rankProgress = computed(() => {
  const next = nextRank.value
  if (!next) return 1
  const span = next.required - rank.value.required
  if (span <= 0) return 1
  return Math.min(1, (expeditionStore.ledgerCompleted - rank.value.required) / span)
})

/**
 * Was der nächste Rang aushändigt. Steht als Liste im Bild und NICHT nur im
 * `title` — es ist die einzige Stelle im Spiel, die es sagt, und hover-only wäre
 * sie für Tastatur unerreichbar.
 */
const nextRankRewards = computed(() => {
  const next = nextRank.value
  if (!next) return []
  const parts: string[] = []
  if (next.activeSlots > rank.value.activeSlots) {
    parts.push(`+${next.activeSlots - rank.value.activeSlots} field slot`)
  }
  if (next.offerSlots > rank.value.offerSlots) {
    parts.push(`+${next.offerSlots - rank.value.offerSlots} contract`)
  }
  const odds = Math.round((next.chanceBonus - rank.value.chanceBonus) * 100)
  if (odds > 0) parts.push(`+${odds}% odds`)
  return parts
})

/** Der Rangname ist aus dem Bild gefallen — hier bleibt er lesbar. */
const rankTitle = computed(() => {
  const next = nextRank.value
  if (!next) {
    return `${rank.value.name} — highest rank reached, ${expeditionStore.ledgerCompleted} runs`
  }
  return (
    `${rank.value.name} — ${expeditionStore.ledgerCompleted} of ${next.required} runs ` +
    `toward Rank ${toRoman(next.tier)}: ${nextRankRewards.value.join(' · ')}`
  )
})

const timeUntilNextSpawn = computed(() => Math.max(0, expeditionStore.nextSpawnAt - props.now))
const offersFull = computed(
  () => expeditionStore.availableExpeditions.length >= expeditionStore.maxAvailableOffers,
)

const canSendAll = computed(
  () =>
    expeditionStore.canStartExpedition &&
    expeditionStore.availableExpeditions.some((o) => expeditionStore.crewFor(o).every((c) => !!c)),
)

/** ZEITFREI — die Uhr sieht nur die Karte, nie ihr Platz. */
const cards = computed(() =>
  buildVoyageFleetCards(
    props.rows,
    expeditionStore.availableExpeditions,
    expeditionStore.activeExpeditions,
    {
      projectedReward: expeditionStore.projectedRewardFor,
      seatsOf: (offer) => expeditionStore.crewFor(offer),
      offerOdds: expeditionStore.offerOddsFor,
    },
  ),
)
</script>

<template>
  <header class="ecb">
    <div class="ecb-main">
      <div class="ecb-rank">
        <div class="ecb-rank-body" role="group" :aria-label="rankTitle" :title="rankTitle">
          <!-- Zähler auf der Rangzeile, nicht darunter: das spart die Zeile, die
               die Uhr braucht. -->
          <span class="ecb-rank-head">
            <Icon :icon="rank.icon" width="28" height="28" class="ecb-rank-ico" />
            <span class="ecb-rank-name">Rank {{ toRoman(rank.tier) }}</span>
            <span v-if="nextRank" class="ecb-rank-goal">
              {{ expeditionStore.ledgerCompleted }}/{{ nextRank.required }}
            </span>
            <span v-else class="ecb-rank-goal">{{ expeditionStore.ledgerCompleted }}</span>
          </span>
          <!-- EINE umbrechende Zeile statt drei `nowrap`-Zeilen — der volle Satz
               bleibt im Bild, aber er kostet höchstens zwei Zeilen. -->
          <span class="ecb-rank-rewards">{{
            nextRank ? nextRankRewards.join(' · ') : 'max rank'
          }}</span>
        </div>

        <div class="ecb-next" :class="{ 'is-full': offersFull }">
          <Icon :icon="offersFull ? 'ph:scroll-fill' : 'lucide:timer'" class="ecb-next-ico" />
          <span class="ecb-next-body">
            <!-- Reservierte Zahlenbreite: sonst wandert die Zeile, sobald 1:40
                 auf 0:59 fällt. -->
            <span class="ecb-next-value">{{
              offersFull ? 'FULL' : formatMinuteClock(timeUntilNextSpawn)
            }}</span>
            <span class="ecb-next-label">Next contract</span>
          </span>
        </div>

        <!-- Absolut: `v-if` darf keine Zone umbauen, sonst sähe die Leiste im
             Dev-Build anders aus als beim Spieler. Rechte Ecke, weil der
             Rangtext linksbündig steht und die Spalte nie ganz füllt. -->
        <button
          v-if="isDev"
          class="ecb-admin"
          title="Force spawn expedition (dev)"
          aria-label="Force spawn expedition (dev)"
          @click.stop="expeditionStore.forceSpawn()"
        >
          <Icon icon="ph:lightning-fill" width="15" height="15" />
        </button>
      </div>

      <ExpeditionFleetLane
        :cards="cards"
        :selected-key="selectedKey"
        :now="now"
        @open="(galaxy, pinKey) => emit('open', galaxy, pinKey)"
      />

      <div class="ecb-aside">
        <div class="ecb-acts">
          <button
            class="ecb-act ecb-act--send"
            :class="{ 'is-muted': !canSendAll }"
            :disabled="!canSendAll"
            title="Send every crewed contract"
            aria-label="Send every crewed contract"
            @click.stop="emit('send-all')"
          >
            <Icon icon="ph:tent-fill" width="34" height="34" />
          </button>

          <button
            class="ecb-act ecb-act--collect"
            :class="{
              'is-ready': readyCount > 0,
              'is-flashing': collectFlashing,
              'is-muted': readyCount === 0,
            }"
            :disabled="readyCount === 0"
            title="Collect all completed expeditions"
            aria-label="Collect all completed expeditions"
            @click.stop="emit('collect-all')"
          >
            <Icon icon="ph:treasure-chest-fill" width="34" height="34" />
            <RpgNotifyBadge :count="readyCount" label="Expedition rewards ready" />
          </button>
        </div>
      </div>
    </div>

    <div class="ecb-progress">
      <div class="ecb-progress-fill" :style="{ transform: `scaleX(${rankProgress})` }" />
    </div>
  </header>
</template>

<style scoped>
.ecb {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1b120a 0%, #16100a 100%);
  border-bottom: 3px solid #5c3310;
}
/* Gesetzte Höhe, kein Padding-Ergebnis — die Aussenhöhe ist gebunden.
   KEIN overflow: die Notify-Plakette steht über der Buttonkante. */
.ecb-main {
  display: flex;
  align-items: center;
  gap: v-bind(bandGap);
  height: v-bind(mainH);
  padding: 0 v-bind(bandPadX);
}

/* ── Statussäule: Rang UND Uhr ──────────────────────────────── */
/* Volle Bandhöhe, damit der Dev-Knopf an ihrer Unterkante sitzt; der Inhalt
   bleibt darin senkrecht zentriert. Die Haarlinie rechts gliedert das Band —
   links die Ablesungen, rechts die Karten und die Handlungen. */
.ecb-rank {
  position: relative;
  flex: 0 0 v-bind(rankW);
  width: v-bind(rankW);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 9px;
  min-width: 0;
  padding-right: 12px;
  border-right: 1px solid #3e200a;
}
.ecb-rank-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}
.ecb-rank-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.ecb-rank-ico {
  flex-shrink: 0;
  color: #e8c040;
  filter: drop-shadow(0 0 10px rgba(232, 192, 64, 0.35));
}
.ecb-rank-name {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #e8c040;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.28);
}
/* Rechtsbündig auf DERSELBEN Zeile — als eigene Zeile kostete der Zähler die
   18 px, die die Uhr darunter braucht. */
.ecb-rank-goal {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: rgba(200, 144, 64, 0.68);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* EINE umbrechende Zeile, nicht drei `nowrap`-Zeilen: der schlimmste Satz
   („+1 field slot · +1 contract · +7% odds") bricht auf zwei um statt auf drei. */
.ecb-rank-rewards {
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  color: #7ad0a0;
  min-width: 0;
}

/* ── Die Uhr: die grösste Zahl der Säule ────────────────────── */
/* Sie läuft jede Sekunde, der Rang steht tagelang still. Kein eigener Kasten
   mehr — die Haarlinie darüber trennt genug. */
.ecb-next {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-top: 9px;
  border-top: 1px solid #3e200a;
}
.ecb-next-ico {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: rgba(200, 144, 64, 0.7);
}
.ecb-next.is-full .ecb-next-ico {
  color: #e8c040;
}
.ecb-next-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.ecb-next-value {
  /* Reserviert, damit die Zeile nicht wandert. */
  min-width: 5ch;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}
.ecb-next.is-full .ecb-next-value {
  color: #e8c040;
}
.ecb-next-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.42);
  white-space: nowrap;
}

/* Der Dev-Spawn. Absolut, damit `v-if` keine Zone umbaut. */
.ecb-admin {
  position: absolute;
  right: 12px;
  bottom: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(200, 144, 64, 0.55);
  background: transparent;
  border: 1px dashed #3e200a;
  border-radius: 4px;
  cursor: pointer;
}
.ecb-admin:hover {
  color: #e8c040;
  border-color: #5c3310;
}

/* ── Aktionssäule: nur Handlungen ───────────────────────────── */
/* Keine Stapelung mehr — die Uhr ist nach links gewandert, also steht hier nur
   eine Reihe, senkrecht zentriert. */
.ecb-aside {
  flex: 0 0 v-bind(asideW);
  width: v-bind(asideW);
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.ecb-acts {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ecb-act {
  position: relative;
  flex-shrink: 0;
  width: v-bind(actW);
  height: v-bind(actH);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  overflow: visible;
  transition:
    background 0.16s ease,
    opacity 0.16s ease;
}
.ecb-act:active {
  transform: scale(0.96);
}
.ecb-act:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: 2px;
}
.ecb-act.is-muted {
  opacity: 0.36;
  cursor: not-allowed;
}
.ecb-act--send {
  color: #f0dca0;
  background: linear-gradient(to bottom, #7a5c20, #5c3e10);
  border: 1px solid #c9a84c;
}
.ecb-act--send:not(.is-muted):hover {
  background: linear-gradient(to bottom, #8e6c26, #6c4a14);
}
.ecb-act--collect {
  color: #b8e8cc;
  background: linear-gradient(to bottom, #2a5c3a, #1a3c24);
  border: 1px solid #3e7a52;
}
.ecb-act--collect.is-ready {
  color: #d8fff0;
  background: linear-gradient(to bottom, #2e7a4e, #1e5433);
  border-color: #64dcb4;
}
.ecb-act--collect.is-flashing {
  animation: ecb-flash 0.55s ease;
}
@keyframes ecb-flash {
  0% {
    opacity: 1;
  }
  40% {
    opacity: 0.45;
  }
  100% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ecb-act--collect.is-flashing {
    animation: none;
  }
}

/* ── Rangbalken: die Unterkante der Leiste ──────────────────── */
.ecb-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 3px;
  overflow: hidden;
  pointer-events: none;
}
.ecb-progress-fill {
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #c89040 45%, #e8c060);
  transition: transform 0.45s ease;
}
</style>
